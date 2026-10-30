import { describe, expect, it } from "vitest";
import { Game } from "./engine";
import {
  createThornKingRun,
  readyForThornKing,
  thornKingLevel,
} from "./boss-level";

const idle = { left: false, right: false, jump: false, jumpPressed: false };

describe("the Thorn King's boss level", () => {
  it("opens at the end of the fourth-world trail and carries the run into its own arena", () => {
    const trail = new Game(3);
    trail.character = "poppy";
    trail.lives = 2;
    trail.collectedCoins = 19;
    trail.coinsTowardLife = 19;
    trail.elapsed = 120;
    trail.reserveDiamond = true;
    trail.player.x = 11859;
    expect(readyForThornKing(trail)).toBe(false);
    expect(trail.boss).toBeNull();
    trail.player.x = 11860;
    expect(readyForThornKing(trail)).toBe(true);
    trail.state = "lost";
    expect(readyForThornKing(trail)).toBe(false);
    trail.state = "playing";
    const otherWorld = new Game(0);
    otherWorld.player.x = 11860;
    expect(readyForThornKing(otherWorld)).toBe(false);
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
    expect(arena.reserveDiamond).toBe(true);
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
