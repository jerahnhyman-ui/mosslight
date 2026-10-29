import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { moonpoolLevel } from "./moonpool-level";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input: GameInput = idle, count = 1) => {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
};

describe("Moonpool Grotto", () => {
  it("lets Pip swim up, sink on release, and ride a bubble current", () => {
    const game = new Game(0, { level: moonpoolLevel });
    game.player.x = 300;
    game.player.y = 400;
    game.player.grounded = false;
    tick(game, { ...idle, jump: true }, 90);
    const risen = game.player.y;
    expect(risen).toBeLessThan(360);
    tick(game, idle, 150);
    expect(game.player.y).toBeGreaterThan(risen + 20);

    const ordinary = new Game(0, { level: moonpoolLevel });
    const bubbles = new Game(0, { level: moonpoolLevel });
    const inactive = new Game(0, { level: moonpoolLevel });
    for (const g of [ordinary, bubbles, inactive]) {
      g.player.y = 300;
      g.player.grounded = false;
    }
    ordinary.player.x = 600;
    bubbles.player.x = 770;
    inactive.player.x = 770;
    bubbles.puzzleState.water = "HIGH";
    tick(ordinary, idle, 60);
    tick(bubbles, idle, 60);
    tick(inactive, idle, 60);
    expect(inactive.player.y).toBeCloseTo(ordinary.player.y, 5);
    expect(bubbles.player.y).toBeLessThan(ordinary.player.y - 20);
  });

  it("preserves feather charge underwater and unlocks the exit with valve and sluice", () => {
    const game = new Game(0, { level: moonpoolLevel });
    const source = new Game(0, {
      level: { ...moonpoolLevel, featherFountains: [{ x: 95, y: 490 }] },
    });
    tick(source, idle, 40);
    expect(source.hasWindFeather).toBe(true);
    game.transferPlayerFrom(source, { x: 300, feetY: 438 });
    game.player.x = 300;
    game.player.y = 400;
    game.player.grounded = false;
    const charge = game.liftRemaining;
    tick(game, { ...idle, jump: true }, 100);
    expect(game.liftRemaining).toBe(charge);
    expect(game.liftActive).toBe(false);
    tick(game, idle, 1);
    game.transferPlayerFrom(source, { x: 80, feetY: 490 });

    const mechanisms = moonpoolLevel.mechanisms!;
    for (const mechanism of mechanisms) {
      let reached = false;
      let descending = false;
      for (let frame = 0; frame < 3600; frame++) {
        const p = game.player;
        const dx =
          mechanism.x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
        if (p.y + p.h < mechanism.y - 30) descending = true;
        if (p.y + p.h > mechanism.y + 10) descending = false;
        const swim = !descending;
        tick(game, { ...idle, left: dx < -4, right: dx > 4, jump: swim });
        if (
          mechanism.kind === "water"
            ? game.puzzleState.water === "HIGH"
            : game.puzzleState.sluiceGateOpen
        ) {
          reached = true;
          break;
        }
      }
      expect(reached, `could not reach ${mechanism.id}`).toBe(true);
      tick(game, idle, 1);
    }
    expect(
      game.platforms.find((tile) => tile.id === "moonpool.gate")?.broken,
    ).toBe(true);
    for (let frame = 0; frame < 1800 && !game.secretCompleted; frame++) {
      tick(game, { ...idle, right: true });
    }
    expect(game.secretCompleted).toBe(true);
    expect(game.deaths).toBe(0);
  });
});
