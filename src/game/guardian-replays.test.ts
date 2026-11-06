import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";
import { guardianArena } from "./guardian-replays";

const worlds = levels.filter((level) => level.boss);

describe("guardian rematch arenas", () => {
  it("offers a rematch for every world guardian", () => {
    expect(worlds.map((w) => w.boss!.kind)).toEqual([
      "stag",
      "spider",
      "moth",
      "toad",
      "mole",
      "crab",
    ]);
    expect(guardianArena(levels[3]!)).toBeNull(); // the Thorn King has its own
  });

  it.each(worlds.map((world) => ({ world, name: world.name })))(
    "gives $name's guardian a fair, sealed arena",
    ({ world }) => {
      const arena = guardianArena(world)!;
      const boss = arena.boss!;
      expect(boss.maxX - boss.minX).toBe(world.boss!.maxX - world.boss!.minX);
      // Safe ground, a checkpoint and both recovery blocks before the fight.
      expect(arena.checkpoints[0]!.x).toBeLessThan(boss.minX);
      for (const block of arena.platforms.filter((p) => p.rewardPower))
        expect(block.x + block.w).toBeLessThan(boss.minX);
      // The goal is out of reach until the guardian is beaten.
      const g = new Game(0, { level: arena });
      expect(arena.goal.x).toBeGreaterThan(boss.maxX + g.boss!.w + 26);
      expect(arena.platforms[0]!.w).toBeGreaterThan(arena.goal.x + 60);
      expect(arena.enemies).toEqual([]);
    },
  );

  it("can be won with ordinary input (stag rematch)", () => {
    const g = new Game(0, { level: guardianArena(levels[0]!)! });
    let previousJump = false;
    for (let frame = 0; frame < 120 * 90 && g.state === "playing"; frame++) {
      const b = g.boss!,
        p = g.player;
      let target =
        b.state === "defeated" ? g.level.goal.x + 30 : b.x + b.w / 2 - p.w / 2;
      if (b.state === "attack") target += b.facing * 120;
      const dx = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
      const jump = p.grounded || (!p.grounded && p.vy < 0);
      const input: GameInput = {
        left: dx < -2,
        right: dx > 2,
        jump,
        jumpPressed: jump && !previousJump,
      };
      previousJump = jump;
      g.update(1 / 120, input);
    }
    expect(g.state).toBe("won");
  });
});
