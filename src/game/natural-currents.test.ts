import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { moonpoolLevel } from "./moonpool-level";
import { windmillLevel } from "./expansion-levels";
import { cloudGardenLevel } from "./cloud-garden";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
function tick(game: Game, input = idle, count = 1) {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
}

describe("natural environmental movement", () => {
  it.each([770, 1620])(
    "the bubble stream at %s lifts Pip without switches",
    (x) => {
      const game = new Game(0, { level: moonpoolLevel });
      Object.assign(game.player, { x, y: 250, vx: 0, vy: 0, grounded: false });
      const startY = game.player.y;
      tick(game, idle, 80);
      expect(game.player.y).toBeLessThan(startY - 10);
    },
  );

  it("discovers the beehive when Pip approaches its elevated entrance", () => {
    const game = new Game(0, { level: windmillLevel });
    const portal = game.level.portals!.find((p) => p.target === "beehive")!;
    expect(portal).toBeDefined();
    // Passing underneath the entrance should not reveal an off-screen secret.
    Object.assign(game.player, {
      x: portal.x - 70,
      y: 430 - game.player.h,
      vx: 0,
      vy: 0,
      grounded: false,
    });
    tick(game, idle, 2);
    expect(game.puzzleState.hiveDiscovered).toBe(false);
    Object.assign(game.player, {
      x: portal.x - 70,
      y: portal.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: false,
    });
    tick(game, idle, 2);
    expect(game.puzzleState.hiveDiscovered).toBe(true);
  });
});

it.each(["clover", "meadow", "lily", "millstream", "sunpetal", "windward"])(
  "carries Pip on the %s sliding sail through a full cycle",
  (name) => {
    const game = new Game(0, { level: windmillLevel });
    game.enemies = [];
    const lily = game.platforms.find((p) => p.id === `windmill.sail.${name}`)!;
    expect(lily?.motion?.axis).toBe("x");
    Object.assign(game.player, {
      x: lily.x + 65,
      y: lily.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    const startX = lily.x;
    const offset = game.player.x - lily.x;
    let greatestLeft = 0;
    let greatestRight = 0;
    const frames = Math.ceil(lily.motion!.period * 120);
    for (let i = 0; i < frames; i++) {
      tick(game);
      greatestLeft = Math.min(greatestLeft, lily.x - startX);
      greatestRight = Math.max(greatestRight, lily.x - startX);
      expect(game.player.y + game.player.h).toBeCloseTo(lily.y, 2);
      expect(game.player.x - lily.x).toBeCloseTo(offset, 2);
      expect(game.player.grounded).toBe(true);
    }
    expect(greatestLeft).toBeLessThan(-40);
    expect(greatestRight).toBeGreaterThan(40);
  },
);

it("carries Pip along the autonomous cloud bridge in both directions", () => {
  const game = new Game(0, { level: cloudGardenLevel });
  game.enemies = [];
  const bridge = game.platforms.find((p) => p.id === "cloud.cove.bridge")!;
  expect(bridge?.motion?.axis).toBe("x");
  Object.assign(game.player, {
    x: bridge.x + 80,
    y: bridge.y - game.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
  });
  const startX = bridge.x;
  let left = 0;
  let right = 0;
  for (let i = 0; i < 600; i++) {
    tick(game);
    left = Math.min(left, bridge.x - startX);
    right = Math.max(right, bridge.x - startX);
    expect(game.player.x - bridge.x).toBeCloseTo(80, 2);
    expect(game.player.grounded).toBe(true);
  }
  expect(left).toBeLessThan(-100);
  expect(right).toBeGreaterThan(100);
});
