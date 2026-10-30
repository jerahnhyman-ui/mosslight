import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { groveLevel } from "./levels";
import { cloudGardenLevel } from "./cloud-garden";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (g: Game, input: GameInput = idle, count = 1) => {
  for (let i = 0; i < count; i++) g.update(1 / 120, input);
};

function earnFeather(game: Game) {
  const block = game.level.platforms.find(
    (tile) => tile.rewardPower === "feather",
  )!;
  const target = block.x + 10;
  for (let i = 0; i < 1000; i++) {
    const delta =
      target -
      game.player.x -
      (game.player.vx * Math.abs(game.player.vx)) / 3700;
    if (
      Math.abs(delta) < 3 &&
      Math.abs(game.player.vx) < 25 &&
      game.player.grounded
    )
      break;
    tick(game, { ...idle, left: delta < -3, right: delta > 3 });
  }
  tick(game, idle, 3);
  tick(game, { ...idle, jump: true, jumpPressed: true });
  for (let i = 0; i < 100 && !game.hasWindFeather; i++)
    tick(game, { ...idle, jump: true });
  expect(game.hasWindFeather).toBe(true);
  tick(game, idle, 100);
}

function onGroveFlower(withFeather: boolean) {
  const g = new Game(0, { level: groveLevel });
  if (withFeather) {
    earnFeather(g);
  }
  Object.assign(g.player, {
    x: 1340,
    y: 205 - g.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
  });
  tick(g, idle, 3);
  return g;
}

function flyTo(g: Game, target: number, feetY: number) {
  tick(g, idle, 3);
  const steer = () => {
    const p = g.player;
    const delta = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
    return { ...idle, left: delta < -3, right: delta > 3 };
  };
  tick(g, { ...steer(), jump: true, jumpPressed: true });
  for (let i = 0; i < 24; i++) tick(g, { ...steer(), jump: true });
  tick(g, steer());
  let landed = false;
  for (let i = 0; i < 900; i++) {
    tick(g, { ...steer(), jump: true });
    if (g.player.grounded && Math.abs(g.player.y + g.player.h - feetY) < 1) {
      landed = true;
      break;
    }
  }
  expect(
    landed,
    `reach cloud at y=${feetY}; got ${g.player.x}, ${g.player.y + g.player.h}`,
  ).toBe(true);
  for (let i = 0; i < 90; i++) tick(g, steer());
  expect(g.player.grounded).toBe(true);
  expect(g.liftRemaining).toBeCloseTo(1.2);
}

function flyToBridge(g: Game) {
  const bridge = g.platforms.find((p) => p.id === "cloud.cove.bridge")!;
  const steer = () => {
    const p = g.player;
    const target = bridge.x + bridge.w / 2 - p.w / 2;
    const delta = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
    return { ...idle, left: delta < -3, right: delta > 3 };
  };
  tick(g, idle, 3);
  tick(g, { ...steer(), jump: true, jumpPressed: true });
  tick(g, { ...steer(), jump: true }, 24);
  tick(g, steer());
  for (let i = 0; i < 900; i++) {
    tick(g, { ...steer(), jump: true });
    if (
      g.player.grounded &&
      Math.abs(g.player.y + g.player.h - bridge.y) < 1 &&
      g.player.x + g.player.w > bridge.x &&
      g.player.x < bridge.x + bridge.w
    ) {
      tick(g, idle, 100);
      expect(g.player.grounded).toBe(true);
      expect(g.liftRemaining).toBeCloseTo(1.2);
      return bridge;
    }
  }
  throw new Error(
    `Cannot reach drifting bridge: ${g.player.x}, ${g.player.y + g.player.h}`,
  );
}

describe("Cloudbloom Sanctuary", () => {
  it("requires feather flight to ascend from the grove and reaches the high portal with landing recharges", () => {
    const without = onGroveFlower(false);
    let highestFeet = 205;
    for (let i = 0; i < 150; i++) {
      tick(without, { ...idle, jump: true, jumpPressed: i === 0 });
      highestFeet = Math.min(highestFeet, without.player.y + without.player.h);
    }
    expect(highestFeet).toBeGreaterThan(50);
    const g = onGroveFlower(true);
    flyTo(g, 1350, 50);
    flyTo(g, 1490, -30);
    flyTo(g, 1580, -110);
    tick(g, idle, 50);
    expect(g.portalReady).toBe("cloud");
  });

  it("rides the sliding bridge to the cloudbird cove and returns", () => {
    const g = new Game(0, { level: cloudGardenLevel });
    tick(g, idle, 5);
    earnFeather(g);
    tick(g, { ...idle, right: true }, 50);
    tick(g, idle, 50);
    flyTo(g, 310, 340);
    flyTo(g, 550, 255);
    flyTo(g, 800, 340);
    flyTo(g, 1040, 255);
    flyTo(g, 1290, 340);
    flyTo(g, 1530, 255);
    const bridge = flyToBridge(g);
    for (let i = 0; i < 700 && bridge.x < 1900; i++) tick(g, idle);
    expect(bridge.x).toBeGreaterThanOrEqual(1900);
    flyTo(g, 2165, 35);
    expect(g.player.x + g.player.w).toBeGreaterThan(2160);
    expect(g.player.y).toBeLessThan(10);
    const returning = flyToBridge(g);
    for (let i = 0; i < 700 && returning.x > 1770; i++) tick(g, idle);
    expect(returning.x).toBeLessThanOrEqual(1770);
    flyTo(g, 1636, 430);
    expect(g.deaths).toBe(0);
  });

  it("has moving clouds rather than switch gates and a feather recovery before the crossing", () => {
    expect(cloudGardenLevel.mechanisms ?? []).toEqual([]);
    expect(cloudGardenLevel.gates ?? []).toEqual([]);
    expect(
      cloudGardenLevel.platforms.some(
        (p) => p.id === "cloud.cove.bridge" && p.motion,
      ),
    ).toBe(true);
    expect(
      cloudGardenLevel.platforms.some(
        (p) => p.kind === "ground" && p.x < 1900 && p.x + p.w > 1900,
      ),
    ).toBe(false);
    expect(
      cloudGardenLevel.platforms.some(
        (p) => p.rewardPower === "feather" && Math.abs(p.x - 1190) < 100,
      ),
    ).toBe(true);
  });
});
