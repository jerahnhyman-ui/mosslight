import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { moonpoolLevel } from "./moonpool-level";
import { cloudGardenLevel } from "./cloud-garden";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input: GameInput = idle, count = 1) => {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
};
function steer(game: Game, target: number): GameInput {
  const p = game.player;
  const delta = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
  return { ...idle, left: delta < -3, right: delta > 3 };
}
function flyTo(game: Game, target: number, feetY: number) {
  tick(game, idle, 3);
  tick(game, { ...steer(game, target), jump: true, jumpPressed: true });
  tick(game, { ...steer(game, target), jump: true }, 24);
  tick(game, steer(game, target));
  let landed = false;
  for (let i = 0; i < 900; i++) {
    tick(game, { ...steer(game, target), jump: true });
    if (
      game.player.grounded &&
      Math.abs(game.player.y + game.player.h - feetY) < 1
    ) {
      landed = true;
      break;
    }
  }
  expect(
    landed,
    `reach ${target}, ${feetY}: ${game.player.x}, ${game.player.y + game.player.h}`,
  ).toBe(true);
  tick(game, steer(game, target), 90);
  expect(game.player.grounded).toBe(true);
  expect(game.liftRemaining).toBeCloseTo(1.2);
}
function earnFeather(game: Game) {
  const block = game.level.platforms.find(
    (tile) => tile.rewardPower === "feather",
  )!;
  for (let i = 0; i < 1000; i++) {
    tick(game, steer(game, block.x + 10));
    if (
      Math.abs(game.player.x - block.x - 10) < 3 &&
      Math.abs(game.player.vx) < 25 &&
      game.player.grounded
    )
      break;
  }
  tick(game, idle, 3);
  tick(game, { ...idle, jump: true, jumpPressed: true });
  for (let i = 0; i < 100 && !game.hasWindFeather; i++)
    tick(game, { ...idle, jump: true });
  expect(game.hasWindFeather).toBe(true);
  tick(game, idle, 100);
}

describe("environmental puzzles", () => {
  it("keeps the chosen character and rescued residents across a detour", () => {
    const source = new Game(0, { level: cloudGardenLevel });
    const target = new Game(0, { level: moonpoolLevel });
    source.character = "poppy";
    source.rescuedCreatures = ["frog", "cloudbird"];
    target.transferPlayerFrom(source, { x: 80, feetY: 490 });
    expect(target.character).toBe("poppy");
    expect(target.rescuedCreatures).toEqual(["frog", "cloudbird"]);
    target.rescuedCreatures.push("moth");
    expect(source.rescuedCreatures).toEqual(["frog", "cloudbird"]);
  });

  it("redirects the two bubble currents in opposite directions", () => {
    const sample = (x: number, directed: boolean) => {
      const game = new Game(0, { level: moonpoolLevel });
      game.player.x = x;
      game.player.y = 270;
      game.player.grounded = false;
      game.puzzleState.water = "HIGH";
      game.puzzleState.shutter = directed ? "BRIDGE" : "HIVE";
      tick(game, idle, 35);
      return game.player.y;
    };
    expect(sample(770, false)).toBeLessThan(sample(770, true) - 25);
    expect(sample(1620, true)).toBeLessThan(sample(1620, false) - 25);
  });

  it("uses the switch to send the cloud bridge across and carries a rider", () => {
    const game = new Game(0, { level: cloudGardenLevel });
    const bridge = game.platforms.find(
      (tile) => tile.id === "cloud.wind.bridge",
    )!;
    expect(bridge).toBeDefined();
    expect(bridge.x).toBe(1680);
    // Land on the switch using the same jump available to the player.
    Object.assign(game.player, {
      x: 1636,
      y: 392,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    tick(game, idle, 3);
    tick(game, { ...idle, jump: true, jumpPressed: true });
    for (
      let frame = 0;
      frame < 240 && game.puzzleState.wind !== "EAST";
      frame++
    )
      tick(game, { ...idle, jump: true });
    expect(game.puzzleState.wind).toBe("EAST");
    // Put Pip on the bridge and verify actual rider motion, not just a flag.
    Object.assign(game.player, {
      x: bridge.x + 60,
      y: bridge.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    const offset = game.player.x - bridge.x;
    tick(game, idle, 240);
    expect(bridge.x).toBeCloseTo(1920);
    expect(game.player.grounded).toBe(true);
    expect(game.player.x - bridge.x).toBeCloseTo(offset, 3);
    game.puzzleState.wind = "WEST";
    tick(game, idle, 240);
    expect(bridge.x).toBeCloseTo(1680);
    expect(game.player.grounded).toBe(true);
  });

  it("flies from the sanctuary entrance to the high bird cove and safely returns", () => {
    const game = new Game(0, { level: cloudGardenLevel });
    tick(game, idle, 5);
    earnFeather(game);
    tick(game, { ...idle, right: true }, 50);
    tick(game, idle, 50);
    flyTo(game, 310, 340);
    flyTo(game, 550, 255);
    flyTo(game, 800, 340);
    flyTo(game, 1040, 255);
    flyTo(game, 1290, 340);
    flyTo(game, 1530, 255);
    expect(game.puzzleState.flowers).toEqual({ A: true, B: true, C: true });
    flyTo(game, 1636, 430);
    expect(game.puzzleState.wind).toBe("EAST");
    tick(game, idle, 240);
    expect(
      game.platforms.find((p) => p.id === "cloud.wind.bridge")!.x,
    ).toBeCloseTo(1920);
    flyTo(game, 1970, 120);
    flyTo(game, 2165, 35);
    expect(game.player.x).toBeGreaterThan(2130);
    expect(game.player.x + game.player.w).toBeGreaterThan(2180 - 20);
    expect(game.player.x).toBeLessThan(2200);
    expect(game.player.y).toBeLessThan(10);
    expect(game.player.y + game.player.h).toBeGreaterThan(10);
    flyTo(game, 1970, 120);
    flyTo(game, 1636, 430);
    expect(game.deaths).toBe(0);
  });

  it("lets Pip redirect the current and open the optional cove by landing on its controls", () => {
    const game = new Game(0, { level: moonpoolLevel });
    const door = game.platforms.find(
      (tile) => tile.id === "moonpool.cove-door",
    )!;
    expect(door.broken).toBe(false);
    const activate = (id: string, done: () => boolean) => {
      const m = game.level.mechanisms!.find((item) => item.id === id)!;
      let descending = false;
      for (let frame = 0; frame < 5000 && !done(); frame++) {
        const p = game.player;
        const dx = m.x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
        if (p.y + p.h < m.y - 30) descending = true;
        if (p.y + p.h > m.y + 10) descending = false;
        if (p.grounded) descending = false;
        tick(game, {
          ...idle,
          left: dx < -4,
          right: dx > 4,
          jump: !descending,
        });
      }
      expect(
        done(),
        `reach and activate ${id}: ${game.player.x}, ${game.player.y}`,
      ).toBe(true);
      tick(game, idle);
    };
    activate("moonpool.valve", () => game.puzzleState.water === "HIGH");
    expect(door.broken).toBe(false);
    activate(
      "moonpool.current-selector",
      () => game.puzzleState.shutter === "BRIDGE",
    );
    expect(door.broken).toBe(false);
    activate("moonpool.receiver", () => game.puzzleState.lightGateOpen);
    tick(game, idle);
    expect(door.broken).toBe(true);
    const swimTo = (targetX: number) => {
      for (let frame = 0; frame < 2400; frame++) {
        const p = game.player;
        const dx = targetX - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
        if (Math.abs(dx) < 5 && Math.abs(p.vx) < 30 && p.y > 190 && p.y < 260)
          return;
        tick(game, { ...idle, left: dx < -4, right: dx > 4, jump: p.y > 220 });
      }
      throw new Error(
        `Could not swim to ${targetX}: ${game.player.x}, ${game.player.y}`,
      );
    };
    swimTo(2350);
    expect(game.player.x).toBeLessThan(2370);
    expect(game.player.x + game.player.w).toBeGreaterThan(2330);
    expect(game.player.y).toBeLessThan(260);
    expect(game.player.y + game.player.h).toBeGreaterThan(240);
    swimTo(2210);
    expect(game.player.x + game.player.w).toBeLessThan(2260);
    expect(game.deaths).toBe(0);
  });
});
