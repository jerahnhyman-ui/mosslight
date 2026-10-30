import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { windmillLevel } from "./expansion-levels";
import { createThornKingRun, readyForThornKing } from "./boss-level";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

const tick = (game: Game, input = idle, n = 1) => {
  for (let i = 0; i < n; i++) game.update(1 / 120, input);
};

describe("fourth-world finale", () => {
  it("reaches the separate major boss directly and retries its own checkpoint", () => {
    // Approach the arena from its real fourth-world checkpoint using input.
    const trail = new Game(3, {
      level: {
        ...windmillLevel,
        spawn: { x: 11592, y: 432 },
        enemies: [],
      },
    });
    tick(trail, idle, 30);
    expect(trail.boss).toBeNull();
    expect(readyForThornKing(trail)).toBe(false);
    for (let i = 0; i < 600 && !readyForThornKing(trail); i++)
      tick(trail, { ...idle, right: true });
    expect(readyForThornKing(trail)).toBe(true);
    expect(trail.state).toBe("playing");
    expect(trail.hasWindFeather).toBe(false);
    expect(trail.level.checkpoints[trail.activeCheckpointIndex]?.x).toBe(11592);
    const arena = createThornKingRun(trail.mode, trail);
    expect(arena.boss?.kind).toBe("heartwood");
    expect(arena.lives).toBe(trail.lives);
    expect(arena.hasWindFeather).toBe(false);
    arena.boss!.state = "attack";
    arena.player.y = 700;
    tick(arena);
    expect(arena.deaths).toBe(1);
    expect(arena.boss?.kind).toBe("heartwood");
    expect(arena.boss?.state).toBe("dormant");
    expect(arena.player.x).toBe(arena.level.checkpoints[0]!.x);
    expect(arena.state).toBe("playing");
  });

  it("does not mark the world won while walking the final approach", () => {
    const trail = new Game(3, {
      level: {
        ...windmillLevel,
        spawn: { x: 11592, y: 432 },
        enemies: [],
      },
    });
    tick(trail, idle, 30);
    for (let i = 0; i < 600 && !readyForThornKing(trail); i++)
      tick(trail, { ...idle, right: true });
    expect(readyForThornKing(trail)).toBe(true);
    expect(trail.state).toBe("playing");
    expect(trail.boss).toBeNull();
    expect(trail.finalBossStarted).toBe(false);
    // If the app's scene transfer were delayed or skipped, the trail itself
    // must still never award victory without defeating the major boss.
    tick(trail, { ...idle, right: true }, 2400);
    expect(trail.player.x + trail.player.w).toBeCloseTo(windmillLevel.width);
    expect(trail.state).toBe("playing");
  });
});
