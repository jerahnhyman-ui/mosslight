import { describe, expect, it } from "vitest";
import {
  createBoss,
  hitBoss,
  retryBoss,
  stepBoss,
  type BossHazard,
} from "./bosses";
import { Game } from "./engine";
import type { BossSpec, Level, Rect } from "./levels";

const spec: BossSpec = {
  kind: "heartwood",
  name: "Briarheart, the Thorn King",
  x: 650,
  y: 430,
  minX: 200,
  maxX: 1000,
};
const player: Rect = { x: 380, y: 392, w: 28, h: 38 };

function volley(phase: number) {
  const boss = createBoss(spec);
  boss.phase = phase;
  boss.health = 8 - phase * 2;
  const hazards: BossHazard[] = [],
    events: string[] = [];
  stepBoss(boss, 1 / 120, player, hazards, events);
  expect(boss.state).toBe("warning");
  expect(events).toContain("boss-warning");
  for (let i = 0; i < 120; i++)
    stepBoss(boss, 1 / 120, player, hazards, events);
  expect(boss.state).toBe("warning");
  expect(hazards).toHaveLength(0);
  for (let i = 0; i < 500 && boss.state !== "recover"; i++)
    stepBoss(boss, 1 / 120, player, hazards, events);
  expect(boss.state).toBe("recover");
  return { boss, hazards, events };
}

describe("Briarheart major guardian", () => {
  it("warns before attack and adds faster, two-sided thorn volleys in later phases", () => {
    const first = volley(1),
      last = volley(3);
    expect(first.hazards).toHaveLength(3);
    expect(last.hazards).toHaveLength(5);
    expect(last.hazards.some((h) => h.vx > 0)).toBe(true);
    expect(last.hazards.some((h) => h.vx < 0)).toBe(true);
    expect(Math.abs(last.hazards[0]!.vx)).toBeGreaterThan(
      Math.abs(first.hazards[0]!.vx),
    );
    expect(last.boss.stateTime).toBeLessThan(first.boss.stateTime);
  });

  it("retains only entered phases on Relaxed retries and resets Classic fights", () => {
    const boss = createBoss(spec),
      hazards: BossHazard[] = [],
      events: string[] = [];
    boss.state = "recover";
    for (let i = 0; i < 4; i++) {
      boss.invulnerable = 0;
      expect(hitBoss(boss, player, hazards, events)).toBe(true);
    }
    expect(boss.phase).toBe(3);
    expect(retryBoss(spec, boss, true)).toMatchObject({ phase: 3, health: 2 });
    expect(retryBoss(spec, boss, false)).toMatchObject({ phase: 1, health: 6 });
  });

  it("can be defeated by small Pip using ordinary movement and jumps", () => {
    const level: Level = {
      id: 90,
      name: "Briarheart test",
      subtitle: "",
      width: 1500,
      theme: "meadow",
      spawn: { x: 90, y: 392 },
      platforms: [{ x: 0, y: 430, w: 1500, h: 200, kind: "ground" }],
      coins: [],
      stars: [],
      diamonds: [],
      enemies: [],
      fireflies: [],
      checkpoints: [{ x: 160, y: 430 }],
      sections: [{ x: 0, name: "Clearing" }],
      boss: spec,
      goal: { x: 1300, y: 430 },
    };
    const game = new Game(0, { level });
    const hits: number[] = [],
      phases = new Set<number>();
    for (
      let frame = 0;
      frame < 120 * 120 && game.state === "playing";
      frame++
    ) {
      const b = game.boss!,
        p = game.player;
      phases.add(b.phase);
      const target =
        b.state === "defeated"
          ? game.level.goal.x
          : b.state === "recover"
            ? b.x + (b.w - p.w) / 2
            : b.x - 110;
      const dx = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
      const incoming = game.hazards.some(
        (h) => h.vx < 0 && h.x > p.x && h.x - (p.x + p.w) < 45,
      );
      const jump = b.state === "recover" || incoming || !p.grounded;
      game.update(1 / 120, {
        left: dx < -2,
        right: dx > 2,
        jump,
        jumpPressed: jump && p.grounded,
      });
      if (game.events.includes("boss-hit")) hits.push(game.boss!.health);
    }
    expect(game.state, `Briarheart fight hits: ${hits.join(", ")}`).toBe("won");
    expect(game.player.form).toBe("small");
    expect(hits).toEqual([5, 4, 3, 2, 1, 0]);
    expect(phases).toEqual(new Set([1, 2, 3]));
  });
});

describe("subboss difficulty", () => {
  it("telegraphs the stag charge, then sends a jumpable wave back from the wall", () => {
    const boss = createBoss({ ...spec, kind: "stag" });
    const hazards: BossHazard[] = [],
      events: string[] = [];
    stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.state).toBe("warning");
    for (let i = 0; i < 120; i++)
      stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.state).toBe("warning");
    expect(hazards).toHaveLength(0);
    for (let i = 0; i < 350 && boss.state !== "recover"; i++)
      stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.state).toBe("recover");
    expect(hazards).toHaveLength(1);
    expect(hazards[0]).toMatchObject({
      kind: "gust",
      y: boss.groundY - 24,
      h: 24,
    });
    expect(hazards[0]!.vx).toBeGreaterThan(0);
  });

  it.each(["spider", "moth"] as const)(
    "%s warns clearly and sends larger, faster volleys in later phases",
    (kind) => {
      function attack(phase: number) {
        const b = createBoss({ ...spec, kind });
        b.phase = phase;
        const hazards: BossHazard[] = [],
          events: string[] = [];
        stepBoss(b, 1 / 120, player, hazards, events);
        for (let i = 0; i < 100; i++)
          stepBoss(b, 1 / 120, player, hazards, events);
        expect(b.state).toBe("warning");
        expect(hazards).toHaveLength(0);
        for (let i = 0; i < 500 && b.state !== "recover"; i++)
          stepBoss(b, 1 / 120, player, hazards, events);
        expect(b.state).toBe("recover");
        return { boss: b, hazards };
      }
      const first = attack(1),
        last = attack(3);
      expect(first.hazards).toHaveLength(3);
      expect(last.hazards).toHaveLength(5);
      expect(Math.abs(last.hazards[0]!.vx)).toBeGreaterThan(
        Math.abs(first.hazards[0]!.vx),
      );
      expect(last.boss.stateTime).toBeLessThan(first.boss.stateTime);
    },
  );
});
