import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { windmillLevel } from "./expansion-levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, n = 1) => {
  for (let i = 0; i < n; i++) game.update(1 / 120, idle);
};

describe("fourth-world finale", () => {
  it("keeps the subboss defeated and retries the separate final encounter", () => {
    const game = new Game(3);
    const final = windmillLevel.finalBoss!;
    expect(final.kind).toBe("heartwood");
    expect(game.boss?.kind).toBe("millkeeper");
    expect(game.boss).not.toBeNull();
    game.boss!.state = "defeated";
    // Unit-level setup simulates reaching the second arena after winning the
    // first; the full-input test covers the fights and walk between them.
    Object.assign(game.player, {
      x: final.minX - 200 - game.player.w + 1,
      y: final.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    tick(game);
    expect(game.finalBossStarted).toBe(true);
    expect(game.boss?.kind).toBe("heartwood");
    expect(game.boss?.state).toBe("dormant");
    expect(game.state).toBe("playing");

    const retryCheckpoint = windmillLevel.checkpoints.findIndex(
      (checkpoint) =>
        checkpoint.x > windmillLevel.boss!.maxX && checkpoint.x < final.minX,
    );
    expect(retryCheckpoint).toBeGreaterThanOrEqual(0);
    game.activeCheckpointIndex = retryCheckpoint;
    game.boss!.state = "attack";
    game.player.y = 700;
    tick(game);
    expect(game.deaths).toBe(1);
    expect(game.boss?.kind).toBe("heartwood");
    expect(game.boss?.state).toBe("dormant");
    expect(game.finalBossStarted).toBe(true);
    expect(game.player.x).toBe(windmillLevel.checkpoints[retryCheckpoint]!.x);
  });

  it("does not finish the world after only the subboss is defeated", () => {
    const game = new Game(3);
    game.boss!.state = "defeated";
    Object.assign(game.player, {
      x: windmillLevel.goal.x,
      y: windmillLevel.goal.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    tick(game);
    expect(game.state).toBe("playing");
    expect(game.boss?.kind).toBe("heartwood");
    expect(game.finalBossStarted).toBe(true);
  });
});
