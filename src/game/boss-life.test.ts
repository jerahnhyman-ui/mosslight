import { describe, expect, it } from "vitest";
import {
  createBoss,
  hitBoss,
  knockSpider,
  stepBoss,
  SPIDER_HANG,
  type BossHazard,
} from "./bosses";
import type { BossSpec } from "./levels";

const player = { x: 300, y: 392, w: 28, h: 38 };
const spec = (kind: BossSpec["kind"]): BossSpec => ({
  kind,
  name: "Test",
  x: 700,
  y: 430,
  minX: 200,
  maxX: 1000,
});

/** Run a guardian through many attacks in a phase, recording its choices. */
function choices(kind: BossSpec["kind"], phase: number) {
  const b = createBoss(spec(kind));
  b.phase = phase;
  const hazards: BossHazard[] = [];
  const events: string[] = [];
  const seen: string[] = [];
  for (let i = 0; i < 120 * 60; i++) {
    const before = b.state;
    stepBoss(b, 1 / 120, player, hazards, events);
    // A fresh warning (a second hop or a fake dive re-enters mid-attack).
    if (b.state === "warning" && before !== "warning" && !b.feinted)
      seen.push(b.variant);
    hazards.length = 0;
  }
  return seen;
}

describe("Living guardians", () => {
  it("open every fight with their signature attack only", () => {
    for (const kind of ["stag", "spider", "toad", "bear", "ram"] as const)
      expect(new Set(choices(kind, 1))).toEqual(new Set(["main"]));
  });

  it.each([
    "stag",
    "spider",
    "toad",
    "owl",
    "bear",
    "tortoise",
    "ram",
  ] as const)(
    "%s mixes in other attacks from phase two, never the same special twice running",
    (kind) => {
      const seen = choices(kind, 3);
      expect(new Set(seen).size).toBeGreaterThan(1);
      for (let i = 1; i < seen.length; i++)
        if (seen[i] !== "main") expect(seen[i]).not.toBe(seen[i - 1]);
    },
  );

  it("is deterministic: the same fight plays out the same way", () => {
    expect(choices("stag", 3)).toEqual(choices("stag", 3));
  });

  it("flinches when hit and roars into a new phase", () => {
    const b = createBoss(spec("stag"));
    const hazards: BossHazard[] = [];
    const events: string[] = [];
    stepBoss(b, 1 / 120, player, hazards, events);
    b.state = "recover";
    hitBoss(b, player, hazards, events);
    expect(b.stagger).toBeGreaterThan(0);
    const x = b.x;
    stepBoss(b, 1 / 120, player, hazards, events);
    expect(b.x).toBe(x);
    b.invulnerable = 0;
    b.state = "recover";
    events.length = 0;
    hitBoss(b, player, hazards, events);
    expect(b.phase).toBe(2);
    expect(events).toContain("boss-roar");
    expect(b.fury).toBeGreaterThan(0);
  });

  it("stalks Pip between attacks instead of rocking in place", () => {
    const b = createBoss(spec("stag"));
    const hazards: BossHazard[] = [];
    const events: string[] = [];
    stepBoss(b, 1 / 120, player, hazards, events);
    const start = b.x;
    for (let i = 0; i < 60; i++) stepBoss(b, 1 / 120, player, hazards, events);
    // 400px away from Pip, it closes in.
    expect(b.x).toBeLessThan(start - 20);
  });
});

describe("Guardian difficulty climbs through the worlds", () => {
  it("later guardians warn for less time, rest for less time and move faster", async () => {
    const { BOSS_TIER } = await import("./bosses");
    // Tiers never go down from one world to the next.
    const order = [
      "stag",
      "spider",
      "moth",
      "heartwood",
      "toad",
      "mole",
      "crab",
      "owl",
      "bear",
      "tortoise",
      "salamander",
      "ram",
    ] as const;
    for (let i = 1; i < order.length; i++)
      expect(BOSS_TIER[order[i]!]).toBeGreaterThanOrEqual(
        BOSS_TIER[order[i - 1]!],
      );
    expect(BOSS_TIER.ram).toBeGreaterThan(BOSS_TIER.stag);
    // Same kind of charger, first world against last: a shorter warning.
    const warning = (kind: BossSpec["kind"]) => {
      const b = createBoss(spec(kind));
      stepBoss(b, 1 / 120, player, [], []);
      return b.stateTime;
    };
    expect(warning("bear")).toBeLessThan(warning("stag"));
  });
});

describe("Guardians are beaten in different ways", () => {
  it("Grumble only goes dizzy when its own icicle lands on it", async () => {
    const { createFinaleRun } = await import("./boss-level");
    const { grumbleLevel } = await import("./snow-level");
    const idle = { left: false, right: false, jump: false, jumpPressed: false };
    // Far from the bear, its icicles miss it and it never rests.
    const far = createFinaleRun(grumbleLevel, "relaxed");
    let rested = false,
      bonked = false;
    for (let i = 0; i < 120 * 20; i++) {
      const b = far.boss!;
      const away = far.player.x + 14 < b.x - 330;
      far.update(1 / 120, {
        ...idle,
        right: b.state === "dormant" || away,
        left: !away && far.player.x + 14 > b.x - 300,
        jump: far.hazards.some(
          (h) => h.vy === 0 && Math.abs(h.x - far.player.x) < 70,
        ),
        jumpPressed: far.player.grounded,
      });
      if (b.state === "recover" && b.variant !== "roll") rested = true;
      if (far.events.includes("boss-bonk")) bonked = true;
    }
    expect(bonked).toBe(false);
    expect(rested).toBe(false);
  });

  it("Shellshock shrugs off a plain stomp and needs a ground pound", async () => {
    const { Game } = await import("./engine");
    const { shellshockLevel } = await import("./ice-level");
    const idle = { left: false, right: false, jump: false, jumpPressed: false };
    const drop = (pound: boolean) => {
      const g = new Game(0, { level: shellshockLevel });
      const b = g.boss!;
      g.player.x = b.minX + 10;
      g.update(1 / 120, idle);
      b.state = "recover";
      b.stateTime = 5;
      b.stagger = 0;
      g.player.x = b.x + b.w / 2 - g.player.w / 2;
      g.player.y = b.y - g.player.h - 90;
      g.player.vy = 0;
      g.player.grounded = false;
      const events: string[] = [];
      for (let i = 0; i < 90; i++) {
        g.update(1 / 120, { ...idle, downPressed: pound && i === 2 });
        events.push(...g.events);
      }
      return { events, health: b.health };
    };
    const stomp = drop(false);
    expect(stomp.events).toContain("boss-armored");
    expect(stomp.health).toBe(5);
    const pound = drop(true);
    expect(pound.events).toContain("boss-hit");
    expect(pound.health).toBe(4);
  });
});

describe("Silka's thread", () => {
  it("rests out of stomping reach until it is bumped down", () => {
    const b = createBoss(spec("spider"));
    const hazards: BossHazard[] = [];
    const events: string[] = [];
    for (let i = 0; i < 120 * 20 && b.state !== "recover"; i++)
      stepBoss(b, 1 / 120, player, hazards, events);
    expect(b.state).toBe("recover");
    expect(b.hanging).toBe(true);
    for (let i = 0; i < 120; i++) stepBoss(b, 1 / 120, player, hazards, events);
    // Higher than a plain jump can land on.
    expect(b.groundY - (b.y + b.h)).toBe(SPIDER_HANG);
    expect(b.groundY - b.y).toBeGreaterThan(145);
    expect(knockSpider(b, events)).toBe(true);
    expect(events).toContain("boss-knock");
    for (let i = 0; i < 60; i++) stepBoss(b, 1 / 120, player, hazards, events);
    expect(b.state).toBe("recover");
    expect(b.y + b.h).toBe(b.groundY);
    // A second bump does nothing: it is already down.
    expect(knockSpider(b, events)).toBe(false);
  });
});
