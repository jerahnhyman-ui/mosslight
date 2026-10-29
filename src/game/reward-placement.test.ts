import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels, groveLevel, challengeLevels } from "./levels";
import { beehiveLevel } from "./expansion-levels";
import { cloudGardenLevel } from "./cloud-garden";
import { moonpoolLevel } from "./moonpool-level";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

describe("Authored reward blocks", () => {
  const locations = [
    ...levels,
    groveLevel,
    ...challengeLevels,
    beehiveLevel,
    cloudGardenLevel,
    moonpoolLevel,
  ];
  it.each(locations)(
    "keeps every $name block reachable from below",
    (level) => {
      for (const block of level.platforms.filter((p) => p.rewardPower)) {
        const floor = level.platforms.find(
          (p) =>
            p.kind === "ground" &&
            p.x <= block.x &&
            p.x + p.w >= block.x + block.w &&
            p.y === block.y + 130,
        );
        expect(floor, `${level.name}: footing below ${block.id}`).toBeDefined();
        const obstructing = level.platforms.filter(
          (p) =>
            p !== block &&
            p !== floor &&
            p.x < block.x + block.w &&
            p.x + p.w > block.x &&
            p.y < floor!.y &&
            p.y + p.h > block.y,
        );
        expect(
          obstructing,
          `${level.name}: clear jump for ${block.id}`,
        ).toEqual([]);
        const game = new Game(0, {
          level: {
            ...level,
            enemies: [],
            boss: undefined,
            finalBoss: undefined,
          },
        });
        Object.assign(game.player, {
          x: block.x + 10,
          y: floor!.y - game.player.h,
          vx: 0,
          vy: 0,
          grounded: true,
        });
        game.update(1 / 120, idle);
        game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
        for (let n = 0; n < 100; n++)
          game.update(1 / 120, { ...idle, jump: true });
        expect(
          game.platforms.find((p) => p.id === block.id)?.rewardUsed,
          `${level.name}: bump ${block.id} as small Pip`,
        ).toBe(true);
      }
    },
  );
  it("removes loose collectible powers from the authored levels", () => {
    for (const level of locations) {
      expect(level.diamonds, level.name).toEqual([]);
      expect(level.stars, level.name).toEqual([]);
      expect(level.featherFountains ?? [], level.name).toEqual([]);
    }
  });

  it.each(levels)("keeps $name guardian recovery available at its final checkpoint", (level) => {
    const cp = level.checkpoints.at(-1)!;
    for (const power of ["diamond", "feather"] as const) {
      const block = level.platforms.find(
        (p) => p.rewardPower === power && Math.abs(p.x + p.w / 2 - cp.x) <= 300,
      );
      expect(block, `${level.name}: ${power} near guardian checkpoint`).toBeDefined();
      const arena = level.finalBoss ?? level.boss;
      expect(block!.x + block!.w, `${level.name}: ${power} before the guardian`).toBeLessThan(arena!.minX - (level.finalBoss ? 200 : 0));
    }
  });
});
