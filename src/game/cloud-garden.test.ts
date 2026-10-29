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

function onGroveFlower(withFeather: boolean) {
  const g = new Game(0, { level: groveLevel });
  if (withFeather) {
    g.player.x = 265;
    tick(g, idle, 4);
    expect(g.hasWindFeather).toBe(true);
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

  it("keeps the sanctuary gate closed until all three sky flowers are activated", () => {
    const g = new Game(0, { level: cloudGardenLevel });
    const gate = () => g.platforms.find((p) => p.id === "gate.cloud")!;
    tick(g);
    expect(gate().broken).toBe(false);
    Object.assign(g.player, {
      x: 2040,
      y: 430 - g.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    tick(g, { ...idle, right: true }, 120);
    expect(g.player.x + g.player.w).toBeLessThanOrEqual(2110.01);
    for (const [index, flower] of cloudGardenLevel.mechanisms!.entries()) {
      Object.assign(g.player, {
        x: flower.x - g.player.w / 2,
        y: flower.y - g.player.h - 35,
        vx: 0,
        vy: 80,
        grounded: false,
      });
      tick(g, idle, 60);
      if (index < 2) expect(gate().broken).toBe(false);
    }
    expect(g.puzzleState.flowers).toEqual({ A: true, B: true, C: true });
    expect(gate().broken).toBe(true);
    Object.assign(g.player, {
      x: 2040,
      y: 430 - g.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    tick(g, { ...idle, right: true }, 120);
    expect(g.player.x).toBeGreaterThan(2110);
  });

  it("can reach and activate the flowers by flying and landing on the cloud route", () => {
    const g = new Game(0, { level: cloudGardenLevel });
    tick(g, idle, 5);
    expect(g.hasWindFeather).toBe(true);
    tick(g, { ...idle, right: true }, 50);
    tick(g, idle, 50);
    flyTo(g, 310, 340);
    flyTo(g, 550, 255);
    expect(g.puzzleState.flowers.A).toBe(true);
    flyTo(g, 800, 340);
    flyTo(g, 1040, 255);
    expect(g.puzzleState.flowers.B).toBe(true);
    flyTo(g, 1290, 340);
    flyTo(g, 1530, 255);
    expect(g.puzzleState.flowers.C).toBe(true);
    expect(g.platforms.find((p) => p.id === "gate.cloud")!.broken).toBe(true);
  });
});
