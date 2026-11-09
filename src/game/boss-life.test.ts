import { describe, expect, it } from "vitest";
import { createBoss, hitBoss, stepBoss, type BossHazard } from "./bosses";
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
