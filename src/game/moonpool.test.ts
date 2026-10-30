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

function swimTo(game: Game, x: number, y: number) {
  for (let frame = 0; frame < 5000; frame++) {
    const p = game.player;
    const delta = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
    if (Math.abs(x - (p.x + p.w / 2)) < 16 && Math.abs(y - p.y) < 22) return;
    tick(game, {
      ...idle,
      left: delta < -4,
      right: delta > 4,
      jump: p.y > y,
    });
    if (game.deaths) throw new Error(`Lost a life swimming to ${x}, ${y}`);
  }
  throw new Error(
    `Could not swim to ${x}, ${y}: ${game.player.x}, ${game.player.y}`,
  );
}

describe("Moonpool Grotto", () => {
  it("carries Pip safely on a sliding underwater ledge", () => {
    const game = new Game(0, { level: moonpoolLevel });
    const ledge = game.platforms.find(
      (p) => p.id === "moonpool.drifting-ledge.2",
    )!;
    Object.assign(game.player, {
      x: ledge.x + 50,
      y: ledge.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    tick(game, idle, 5);
    const offset = game.player.x - ledge.x;
    let minX = ledge.x;
    let maxX = ledge.x;
    for (let i = 0; i < 600; i++) {
      tick(game);
      minX = Math.min(minX, ledge.x);
      maxX = Math.max(maxX, ledge.x);
      expect(game.player.grounded).toBe(true);
      expect(game.player.y + game.player.h).toBeCloseTo(ledge.y);
      expect(game.player.x - ledge.x).toBeCloseTo(offset, 3);
    }
    expect(maxX - minX).toBeGreaterThan(80);
  });

  it("lets Pip swim up, sink on release, and ride naturally rising bubble currents", () => {
    const game = new Game(0, { level: moonpoolLevel });
    game.player.x = 300;
    game.player.y = 400;
    game.player.grounded = false;
    tick(game, { ...idle, jump: true }, 90);
    const risen = game.player.y;
    expect(risen).toBeLessThan(360);
    tick(game, idle, 150);
    expect(game.player.y).toBeGreaterThan(risen + 20);

    for (const x of [770, 1620]) {
      const ordinary = new Game(0, { level: moonpoolLevel });
      const bubbles = new Game(0, { level: moonpoolLevel });
      for (const g of [ordinary, bubbles]) {
        g.player.y = 300;
        g.player.grounded = false;
      }
      ordinary.player.x = 600;
      bubbles.player.x = x;
      tick(ordinary, idle, 60);
      tick(bubbles, idle, 60);
      expect(bubbles.player.y).toBeLessThan(ordinary.player.y - 20);
    }
  });

  it("preserves feather charge underwater and swims through the reefs and frog cove to the exit", () => {
    const source = new Game(0, {
      level: { ...moonpoolLevel, featherFountains: [{ x: 95, y: 490 }] },
    });
    tick(source, idle, 40);
    expect(source.hasWindFeather).toBe(true);
    const game = new Game(0, { level: moonpoolLevel });
    game.transferPlayerFrom(source, { x: 80, feetY: 490 });
    const charge = game.liftRemaining;
    expect(game.level.mechanisms ?? []).toHaveLength(0);
    expect(game.level.gates ?? []).toHaveLength(0);

    // Follow actual directional and swim input from the entrance. The first
    // rock must be crossed above, then the hanging reef below.
    swimTo(game, 900, 250);
    swimTo(game, 1200, 260);
    swimTo(game, 1290, 330);
    swimTo(game, 1530, 330);
    // The second rising rock leads to the open cove: touch the resident frog.
    swimTo(game, 1750, 230);
    swimTo(game, 2050, 230);
    swimTo(game, 2190, 230);
    swimTo(game, 2350, 240);
    expect(game.player.x + game.player.w).toBeGreaterThan(2330);
    expect(game.player.x).toBeLessThan(2370);
    expect(game.player.y).toBeLessThan(260);
    expect(game.player.y + game.player.h).toBeGreaterThan(240);
    // Leave through the same opening and swim over the final reef.
    swimTo(game, 2190, 230);
    swimTo(game, 2180, 330);
    swimTo(game, 2560, 330);
    swimTo(game, 2700, 280);
    for (let frame = 0; frame < 1000 && !game.secretCompleted; frame++)
      tick(game, { ...idle, right: true });
    expect(game.secretCompleted).toBe(true);
    expect(game.deaths).toBe(0);
    expect(game.liftRemaining).toBe(charge);
  });
});
