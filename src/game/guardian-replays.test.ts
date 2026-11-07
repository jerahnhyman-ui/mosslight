import { fightBoss } from "./boss-bot";
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
    fightBoss(g, { seconds: 120 });
    for (let i = 0; i < 120 * 10 && g.state === "playing"; i++)
      g.update(1 / 120, {
        left: false,
        right: true,
        jump: false,
        jumpPressed: false,
      });
    expect(g.state).toBe("won");
  });
});
