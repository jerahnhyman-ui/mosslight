import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { windmillLevel } from "./expansion-levels";
import { moonpoolLevel } from "./moonpool-level";
import { cloudGardenLevel } from "./cloud-garden";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input: GameInput = idle) =>
  game.update(1 / 120, input);

describe("rebalanced encounters", () => {
  it("lets Pip choose the Windmill recovery diamond after a checkpoint retry before the boss starts", () => {
    const checkpointIndex = windmillLevel.checkpoints.reduce(
      (last, item, index) => (item.x < windmillLevel.boss!.minX ? index : last),
      -1,
    );
    const checkpoint = windmillLevel.checkpoints[checkpointIndex]!;
    const game = new Game(3, {
      level: {
        ...windmillLevel,
        spawn: { x: checkpoint.x, y: checkpoint.y - 38 },
      },
    });
    for (let i = 0; i < 8; i++) tick(game);
    expect(game.activeCheckpointIndex).toBe(checkpointIndex);
    expect(game.player.form).toBe("small");
    game.player.y = 700;
    tick(game);
    expect(game.deaths).toBe(1);
    const reward = windmillLevel.platforms.find(
      (tile) =>
        tile.rewardPower === "diamond" &&
        tile.x < checkpoint.x &&
        tile.x > checkpoint.x - 120,
    )!;
    expect(reward).toBeDefined();
    for (let i = 0; i < 90 && game.player.x > reward.x + 10; i++)
      tick(game, { ...idle, left: true });
    for (let i = 0; i < 20; i++) tick(game);
    tick(game, { ...idle, jump: true, jumpPressed: true });
    for (let i = 0; i < 180 && game.player.form !== "big"; i++)
      tick(game, { ...idle, jump: i < 50 });
    expect(game.player.form).toBe("big");
    expect(game.boss?.state).toBe("dormant");
    expect(game.player.x).toBeLessThan(checkpoint.x);
  });

  it("blocks a straight walk at the first underwater rock but lets Pip swim over it", () => {
    const game = new Game(0, { level: moonpoolLevel });
    const rock = moonpoolLevel.platforms.find(
      (p) => p.id === "moonpool.rock.1",
    )!;
    for (let i = 0; i < 1100; i++) tick(game, { ...idle, right: true });
    expect(game.player.x + game.player.w).toBeLessThanOrEqual(rock.x + 0.01);
    expect(game.player.x + game.player.w).toBeGreaterThan(rock.x - 5);
    for (let i = 0; i < 600 && game.player.x < rock.x + rock.w; i++)
      tick(game, { ...idle, jump: true, right: true });
    expect(game.player.x).toBeGreaterThanOrEqual(rock.x + rock.w);
    expect(game.deaths).toBe(0);
  });

  it("makes a straight run along the Cloudbloom floor hazardous while protecting the spawn", () => {
    const game = new Game(0, { level: cloudGardenLevel });
    for (let i = 0; i < 60; i++) tick(game);
    expect(game.deaths).toBe(0);
    for (let i = 0; i < 1200 && !game.deaths; i++)
      tick(game, { ...idle, right: true });
    expect(game.deaths).toBe(1);
    expect(game.activeCheckpointIndex).toBe(0);
    expect(game.player.x).toBe(cloudGardenLevel.checkpoints[0]!.x);
  });

  it("carries idle Pip through a full moving-cloud cycle and recharges flight", () => {
    const game = new Game(0, {
      level: {
        ...cloudGardenLevel,
        spawn: { x: 810, y: 302 },
        featherFountains: [{ x: 825, y: 340 }],
      },
    });
    const cloud = game.platforms.find((p) => p.id === "cloud.path.2")!;
    for (let i = 0; i < 12; i++) tick(game);
    expect(game.hasWindFeather).toBe(true);
    tick(game, { ...idle, jump: true, jumpPressed: true });
    for (let i = 0; i < 20; i++) tick(game, { ...idle, jump: true });
    tick(game);
    tick(game, { ...idle, jump: true, jumpPressed: true });
    for (let i = 0; i < 30; i++) tick(game, { ...idle, jump: true });
    expect(game.liftRemaining).toBeLessThan(1.2);
    for (let i = 0; i < 1200 && !game.player.grounded; i++) {
      const p = game.player;
      const target = cloud.x + cloud.w / 2 - p.w / 2;
      const delta = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
      tick(game, { ...idle, left: delta < -3, right: delta > 3 });
    }
    expect(game.player.grounded).toBe(true);
    expect(game.player.y + game.player.h).toBeCloseTo(cloud.y);
    for (let i = 0; i < 60; i++) tick(game);
    expect(game.liftRemaining).toBeCloseTo(1.2);
    const offset = game.player.x - cloud.x;
    let minX = cloud.x;
    let maxX = cloud.x;
    for (let i = 0; i < 540; i++) {
      tick(game);
      minX = Math.min(minX, cloud.x);
      maxX = Math.max(maxX, cloud.x);
      expect(game.player.grounded).toBe(true);
      expect(game.player.y + game.player.h).toBeCloseTo(cloud.y);
      expect(game.player.x - cloud.x).toBeCloseTo(offset, 3);
      expect(game.liftRemaining).toBeCloseTo(1.2);
    }
    expect(maxX - minX).toBeGreaterThan(80);
  });
});
