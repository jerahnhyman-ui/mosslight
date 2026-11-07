import { describe, expect, it } from "vitest";
import { Game } from "./engine";
import type { Level } from "./levels";
import {
  BELFRY_DOOR_X,
  BRAMBLE_DOOR_X,
  brambleKeep,
  CITADEL_DOOR_X,
  moonlitBelfry,
  stormCitadel,
} from "./castles";
import { createFinaleRun, finaleFor, thornKingLevel } from "./boss-level";
import { gloomwingLevel, nightglowLevel } from "./nightglow-level";
import { stormLevel, thunderhornLevel } from "./storm-level";
import { levels } from "./levels";
import { fightBoss } from "./boss-bot";
import {
  crossTraps,
  hopTo,
  hops,
  idle,
  jump,
  leftward,
  slideAcross,
  step,
  steer,
  tile,
  waitUntil,
  walk,
} from "./route-bot";

const fresh = (level: Level) =>
  new Game(0, { level: { ...level, enemies: [] } });
const chain = (edge: number) =>
  [
    [edge + 110, 390],
    [edge + 270, 370],
    [edge + 430, 390],
    [edge + 590, 370],
    [edge + 780, 430],
  ] as const;

/** Wait in place (leaning into any gust) for a calm long enough to jump. */
function galeHops(g: Game, from: number, route: [number, number][]) {
  let at = from;
  for (const [x, y] of route) {
    const zones = (g.level.windZones ?? []).filter(
      (z) => z.x < Math.max(at, x) + 60 && z.x + z.w > Math.min(at, x) - 60,
    );
    for (let i = 0; i < 120 * 12; i++) {
      const calm = zones.every((z) => {
        const t = g.windCycle(z);
        return t >= z.duration && z.period - t > 1.3;
      });
      if (calm && g.player.grounded && Math.abs(g.player.vx) < 40) break;
      step(g, steer(g, at));
    }
    jump(g, x, y);
    at = x;
  }
}

function brambleRoute(g: Game) {
  crossTraps(g, 880);
  hops(g, chain(900));
  // The high road over the wave of thorn beds.
  walk(g, 1740);
  hops(g, [
    [1960, 330],
    [2190, 290],
    [2430, 330],
    [2660, 430],
  ]);
  slideAcross(g, "castle.bramble.lift", 2670, 3080);
  crossTraps(g, 3700);
}
function belfryRoute(g: Game) {
  walk(g, 770);
  slideAcross(g, "castle.belfry.bell", 770, 1180);
  walk(g, 1880);
  hops(g, chain(1900));
  walk(g, 3480);
  const rise = tile(g, "castle.belfry.rise");
  hopTo(g, rise.id!, () => rise.y >= 395);
  waitUntil(g, () => rise.y <= 310 && rise.y >= 285, "rising bell");
  jump(g, 3860, 280);
  const glide = tile(g, "castle.belfry.glide");
  hopTo(g, glide.id!, () => glide.x <= 3940 && leftward(glide));
  waitUntil(g, () => glide.x + glide.w >= 4180, "sliding bell");
  jump(g, 4340, 430);
}
function citadelRoute(g: Game) {
  crossTraps(g, 980);
  galeHops(g, 980, [
    [1190, 380],
    [1410, 380],
    [1630, 380],
    [1850, 430],
  ]);
  crossTraps(g, 2780);
  hops(g, chain(2800));
  crossTraps(g, 4150);
}

const castles = [
  {
    world: levels[3]!,
    castle: brambleKeep,
    door: BRAMBLE_DOOR_X,
    arena: thornKingLevel,
    route: brambleRoute,
    style: "bramble",
  },
  {
    world: nightglowLevel,
    castle: moonlitBelfry,
    door: BELFRY_DOOR_X,
    arena: gloomwingLevel,
    route: belfryRoute,
    style: "belfry",
  },
  {
    world: stormLevel,
    castle: stormCitadel,
    door: CITADEL_DOOR_X,
    arena: thunderhornLevel,
    route: citadelRoute,
    style: "citadel",
  },
] as const;

describe.each(castles)(
  "$castle.name",
  ({ world, castle, door, arena, route, style }) => {
    it("sits between its world and the guardian's room, with a checkpoint at the door", () => {
      const g = new Game(0, { level: world });
      g.player.x = 1e6;
      expect(finaleFor(g)?.contentId).toBe(castle.contentId);
      expect(castle.castle).toBe(style);
      const last = castle.checkpoints.at(-1)!;
      expect(last.x).toBeLessThan(door);
      expect(door - last.x).toBeLessThan(200);
    });

    it("can be crossed with ordinary input to the guardian's door", () => {
      const g = fresh(castle);
      route(g);
      walk(g, door + 20);
      expect(g.deaths).toBe(0);
      expect(finaleFor(g)).toBe(arena);
    });
  },
);

describe("Castle traps", () => {
  it("thorns hurt only while they are up, and warn first", () => {
    const g = fresh(brambleKeep);
    const trap = brambleKeep.traps![0]!;
    // Stand on the thorn bed while it is down: no harm.
    while (g.trapCycle(trap) < trap.active + 0.05) step(g);
    g.player.x = trap.x + 20;
    for (let i = 0; i < 30; i++) step(g);
    expect(g.player.invulnerable).toBe(0);
    // Stay until it bursts: Pip is hurt.
    for (
      let i = 0;
      i < 120 * 3 && g.player.invulnerable === 0 && !g.deaths;
      i++
    )
      step(g);
    expect(g.player.invulnerable > 0 || g.deaths > 0).toBe(true);
  });

  it("lightning strikes only its marked spot", () => {
    const g = fresh(stormCitadel);
    const trap = stormCitadel.traps![0]!;
    // Just short of the mark (the wind here only pushes Pip further away).
    g.player.x = trap.x - 100;
    for (let i = 0; i < 120 * 4; i++) step(g, idle);
    expect(g.deaths).toBe(0);
    expect(g.player.invulnerable).toBe(0);
  });
});

describe("Castle guardians", () => {
  it.each([
    ["Gloomwing", gloomwingLevel],
    ["Thunderhorn", thunderhornLevel],
  ] as const)("%s can still be beaten after its castle", (_, arena) => {
    const g = createFinaleRun(arena, "classic");
    const { phases } = fightBoss(g);
    expect(g.state).toBe("won");
    expect(phases).toEqual(new Set([1, 2, 3]));
  });
});
