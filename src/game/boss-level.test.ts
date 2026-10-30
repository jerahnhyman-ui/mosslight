import { describe, expect, it } from "vitest";
import { Game } from "./engine";
import {
  createThornKingRun,
  readyForThornKing,
  thornKingLevel,
} from "./boss-level";

const idle = { left: false, right: false, jump: false, jumpPressed: false };

describe("the Thorn King's boss level", () => {
  it("only opens after the fourth-world sub-boss, carrying the run into its own arena", () => {
    const trail = new Game(3);
    trail.character = "poppy";
    trail.lives = 2;
    trail.collectedCoins = 19;
    trail.coinsTowardLife = 19;
    trail.elapsed = 120;
    trail.player.x = 13020;
    expect(readyForThornKing(trail)).toBe(false);
    trail.boss!.state = "defeated";
    expect(readyForThornKing(trail)).toBe(true);
    const arena = createThornKingRun(trail.mode, trail);
    expect(arena.level).toBe(thornKingLevel);
    expect(arena.boss?.kind).toBe("heartwood");
    expect([
      arena.character,
      arena.lives,
      arena.collectedCoins,
      arena.coinsTowardLife,
      arena.elapsed,
    ]).toEqual(["poppy", 2, 19, 19, 120]);
    expect(arena.state).toBe("playing");
    expect(arena.activeCheckpointIndex).toBe(0);
    expect(readyForThornKing(arena)).toBe(false);
  });

  it("retries the standalone fight at its own checkpoint after a fall", () => {
    const arena = createThornKingRun("classic");
    arena.player.y = 700;
    arena.update(1 / 120, idle);
    expect(arena.lives).toBe(2);
    expect(arena.player.x).toBe(thornKingLevel.checkpoints[0].x);
    expect(arena.boss?.kind).toBe("heartwood");
    expect(arena.state).toBe("playing");
  });
});
