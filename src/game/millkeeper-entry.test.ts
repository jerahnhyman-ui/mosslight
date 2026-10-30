import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { windmillLevel } from "./expansion-levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

function step(game: Game, input: GameInput = idle, count = 1) {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
}

function newApproach() {
  // Start at the actual pre-boss checkpoint without the optional feather.
  const level = { ...windmillLevel, spawn: { x: 11592, y: 432 } };
  const game = new Game(3, { level });
  step(game, idle, 30);
  return game;
}

function enterWithoutFeather(game: Game) {
  expect(game.hasWindFeather).toBe(false);
  for (let i = 0; i < 400 && game.boss?.state === "dormant"; i++)
    step(game, { ...idle, right: true });
  expect(game.boss?.state).not.toBe("dormant");
  expect(game.hasWindFeather).toBe(false);
  expect(game.player.x).toBeLessThan(game.boss!.maxX);
}

function earnArenaFeather(game: Game) {
  const block = game.platforms.find(
    (tile) =>
      tile.rewardPower === "feather" &&
      tile.x >= game.boss!.minX &&
      tile.x < game.boss!.minX + 120,
  );
  expect(block).toBeDefined();
  const desiredX = block!.x + block!.w / 2 - game.player.w / 2;
  for (let i = 0; i < 400; i++) {
    const p = game.player;
    const delta = desiredX - p.x - (p.vx * Math.abs(p.vx)) / 3600;
    if (Math.abs(p.x - desiredX) < 5 && Math.abs(p.vx) < 40 && p.grounded)
      break;
    step(game, { ...idle, left: delta < -3, right: delta > 3 });
  }
  expect(game.player.grounded).toBe(true);
  for (let i = 0; i < 100 && !game.hasWindFeather; i++)
    step(game, { ...idle, jump: i < 35, jumpPressed: i === 0 });
  expect(game.hasWindFeather).toBe(true);
}

describe("Mill Keeper approach without a feather", () => {
  it("starts the guardian at the arena and permits an earned feather before the first attack", () => {
    const game = newApproach();
    enterWithoutFeather(game);
    earnArenaFeather(game);
    expect(game.deaths).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.boss?.state).not.toBe("defeated");
    expect(game.hazards).toHaveLength(0);
    expect(game.activeCheckpointIndex).toBe(
      windmillLevel.checkpoints.findIndex((point) => point.x === 11592),
    );
  });

  it("cannot bypass the guardian without a feather and can earn it after a real defeat", () => {
    const game = newApproach();
    enterWithoutFeather(game);
    const maxX = game.boss!.maxX - game.player.w;
    for (let i = 0; i < 1800 && game.deaths === 0; i++) {
      step(game, { ...idle, right: true });
      expect(game.player.x).toBeLessThanOrEqual(maxX + 0.01);
    }
    expect(game.deaths).toBe(1);
    expect(game.hasWindFeather).toBe(false);
    expect(game.player.x).toBe(11592);
    expect(game.activeCheckpointIndex).toBe(
      windmillLevel.checkpoints.findIndex((point) => point.x === 11592),
    );
    expect(game.boss?.state).toBe("dormant");
    step(game, idle, 30);
    enterWithoutFeather(game);
    earnArenaFeather(game);
    expect(game.deaths).toBe(1);
    expect(game.lives).toBe(2);
  });
});
