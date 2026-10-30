import { describe, expect, it } from "vitest";
import {
  createBoss,
  hitBoss,
  retryBoss,
  stepBoss,
  type BossHazard,
} from "./bosses";
import type { BossSpec, Rect } from "./levels";

const spec: BossSpec = {
  kind: "millkeeper",
  name: "Bramblewing",
  x: 428,
  y: 470,
  minX: 140,
  maxX: 840,
};
const player: Rect = { x: 300, y: 432, w: 28, h: 38 };
const target: Rect = { x: 466, y: 166, w: 28, h: 38 };
function setup() {
  const boss = createBoss(spec),
    hazards: BossHazard[] = [],
    events: string[] = [];
  const step = (
    dt: number,
    p = player,
    flightActivated = false,
    hasFeather = true,
  ) => stepBoss(boss, dt, p, hazards, events, { hasFeather, flightActivated });
  return { boss, hazards, events, step };
}

describe("Mill Keeper", () => {
  it("waits for entry, even without a feather, then warns before attacking", () => {
    const { boss, hazards, step } = setup();
    step(1, { ...player, x: 179 }, false, false);
    expect(boss.state).toBe("dormant");
    step(1, player, false, false);
    expect(boss.millState).toBe("settle");
    step(1);
    expect(boss.millState).toBe("lowWarning");
    step(1.39);
    expect(hazards).toHaveLength(0);
    step(0.01);
    expect(hazards[0]).toMatchObject({
      kind: "sweep",
      y: 414,
      h: 56,
      vx: -290,
    });
    step(2.8);
    expect(boss.millState).toBe("recover");
    expect(hazards).toHaveLength(0);
    step(3);
    expect(boss.millState).toBe("lowWarning");
  });
  it("requires deliberate flight at the vane and cannot gain recovery by waiting", () => {
    const { boss, hazards, events, step } = setup();
    step(1);
    hitBoss(boss, player, hazards, events);
    step(1.35);
    hitBoss(boss, player, hazards, events);
    expect(boss.phase).toBe(2);
    expect(boss.millState).toBe("transition");
    step(1.5);
    expect(boss.millState).toBe("vaneWarning");
    step(1.5);
    expect(boss.millState).toBe("vaneOpen");
    step(0.1, target, false);
    expect(boss.millState).toBe("vaneOpen");
    step(0.1, { ...target, x: target.x + 21 }, true);
    expect(boss.millState).toBe("vaneOpen");
    step(0.1, target, true);
    expect(boss.millState).toBe("recover");
    step(3.2);
    step(1.5);
    step(4.5);
    expect(boss.millState).toBe("settle");
  });
  it("plays high then low waves and saves only entered phases for Relaxed retries", () => {
    const { boss, hazards, events, step } = setup();
    step(1);
    for (let i = 0; i < 4; i++) {
      expect(hitBoss(boss, player, hazards, events)).toBe(true);
      step(i === 1 || i === 3 ? 1.5 : 1.35);
    }
    expect(boss.phase).toBe(3);
    expect(boss.millState).toBe("highWarning");
    step(2.8);
    expect(hazards[0]).toMatchObject({ y: 250, h: 158 });
    step(2.8);
    expect(boss.millState).toBe("betweenSweeps");
    expect(hazards).toHaveLength(0);
    step(1.8);
    expect(hazards[0]).toMatchObject({ y: 414, h: 56 });
    step(2.8);
    expect(boss.millState).toBe("vaneOpen");
    expect(retryBoss(spec, boss, true).health).toBe(2);
    expect(retryBoss(spec, boss, false).health).toBe(6);
  });
  it("enforces cooldown, clears waves immediately, and makes phase transitions noninteractive", () => {
    const { boss, hazards, events, step } = setup();
    step(1);
    hazards.push({
      kind: "sweep",
      x: 0,
      y: 0,
      w: 48,
      h: 56,
      vx: 260,
      vy: 0,
      remaining: 2,
    });
    expect(hitBoss(boss, player, hazards, events)).toBe(true);
    expect(hazards).toHaveLength(0);
    expect(hitBoss(boss, player, hazards, events)).toBe(false);
    step(1.35);
    expect(hitBoss(boss, player, hazards, events)).toBe(true);
    step(1.35);
    expect(hitBoss(boss, player, hazards, events)).toBe(false);
    step(0.15);
    expect(hitBoss(boss, player, hazards, events)).toBe(true);
    expect(retryBoss(spec, boss, true).health).toBe(4);
  });
  it("expires the 1.35 second contact cooldown on its exact fixed step", () => {
    const { boss, hazards, events, step } = setup();
    step(1);
    expect(hitBoss(boss, player, hazards, events)).toBe(true);
    for (let i = 0; i < 162; i++) step(1 / 120);
    expect(hitBoss(boss, player, hazards, events)).toBe(true);
  });
  it("restarts a full warning if a wave would spawn on the player", () => {
    const { boss, hazards, step } = setup();
    step(1);
    step(1);
    const origin = { x: 810, y: 432, w: 28, h: 38 };
    step(1.4, origin);
    expect(hazards).toHaveLength(0);
    expect(boss.millState).toBe("lowWarning");
    expect(boss.stateTime).toBe(1.4);
    step(1.4);
    expect(hazards).toHaveLength(1);
  });
  it.each([
    [5, 6],
    [4, 4],
    [3, 4],
    [2, 2],
    [1, 2],
  ])("retries from phase entry after health %i", (health, expected) => {
    const boss = createBoss(spec);
    boss.health = health;
    boss.phase = Math.min(3, 1 + Math.floor((6 - health) / 2));
    boss.phaseCheckpoint = boss.phase;
    expect(retryBoss(spec, boss, true).health).toBe(expected);
    expect(retryBoss(spec, boss, false).health).toBe(6);
  });
});
