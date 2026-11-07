import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";
import {
  gloomwingLevel,
  nightglowLevel,
  NIGHTGLOW_FINAL_CHECKPOINT,
  NIGHTGLOW_FINALE_X,
} from "./nightglow-level";
import { createFinaleRun, finaleFor } from "./boss-level";
import { fightBoss } from "./boss-bot";
import { moonlitBelfry } from "./castles";

// Real directional and jump input only.
const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const step = (g: Game, input: GameInput = idle) => g.update(1 / 120, input);
function steer(g: Game, x: number): GameInput {
  const p = g.player;
  const delta = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / (2 * 1850);
  return { ...idle, left: delta < -2, right: delta > 2 };
}
function alive(g: Game, what: string) {
  if (g.state !== "playing" || g.deaths)
    throw new Error(
      `${what}: state ${g.state}, deaths ${g.deaths}, at ${g.player.x.toFixed(1)},${(g.player.y + g.player.h).toFixed(1)}`,
    );
}
function walk(g: Game, x: number, y = 430) {
  for (let i = 0; i < 2400; i++) {
    const p = g.player;
    alive(g, `walk ${x}`);
    if (
      Math.abs(p.x + p.w / 2 - x) < 6 &&
      Math.abs(p.vx) < 35 &&
      p.grounded &&
      Math.abs(p.y + p.h - y) < 2
    )
      return;
    step(g, steer(g, x));
  }
  throw new Error(`walk ${x}: stuck at ${g.player.x.toFixed(1)}`);
}
function jump(g: Game, x: number, y: number) {
  step(g, { ...steer(g, x), jump: true, jumpPressed: true });
  for (let i = 0; i < 600; i++) {
    const p = g.player;
    alive(g, `jump ${x},${y}`);
    if (
      i > 12 &&
      p.grounded &&
      Math.abs(p.x + p.w / 2 - x) < 14 &&
      Math.abs(p.y + p.h - y) < 2
    ) {
      for (let n = 0; n < 30; n++) step(g);
      return;
    }
    step(g, { ...steer(g, x), jump: true });
  }
  throw new Error(`jump ${x},${y}: at ${g.player.x.toFixed(1)}`);
}
function bounceTo(g: Game, mushroom: number, x: number, y: number) {
  let bounced = false;
  step(g, { ...steer(g, mushroom), jump: true, jumpPressed: true });
  for (let i = 0; i < 600; i++) {
    alive(g, `bounce to ${x}`);
    if (g.events.includes("bounce")) bounced = true;
    const p = g.player;
    if (bounced && p.grounded && Math.abs(p.y + p.h - y) < 2) return;
    step(g, { ...steer(g, bounced ? x : mushroom), jump: true });
  }
  throw new Error(`bounce to ${x},${y}: at ${g.player.x.toFixed(1)}`);
}
const tile = (g: Game, id: string) => g.platforms.find((t) => t.id === id)!;
function waitUntil(g: Game, done: () => boolean, what: string) {
  for (let i = 0; i < 120 * 12; i++) {
    alive(g, what);
    if (done()) return;
    step(g);
  }
  throw new Error(`timed out waiting: ${what}`);
}
type Tile = Game["platforms"][number];
/** Wait for a moving crystal, board it, then ride until it is placed to leave. */
function ride(
  g: Game,
  id: string,
  ready: (t: Tile) => boolean,
  leave: (t: Tile) => boolean,
) {
  const pad = tile(g, id);
  waitUntil(g, () => ready(pad), `${id} ready`);
  step(g, { ...steer(g, pad.x + pad.w / 2), jump: true, jumpPressed: true });
  for (let i = 0; ; i++) {
    alive(g, `boarding ${id}`);
    const p = g.player;
    if (
      i > 12 &&
      p.grounded &&
      p.x + p.w > pad.x &&
      p.x < pad.x + pad.w &&
      Math.abs(p.y + p.h - pad.y) < 2
    )
      break;
    if (i > 600) throw new Error(`could not board ${id}`);
    step(g, { ...steer(g, pad.x + pad.w / 2), jump: true });
  }
  waitUntil(g, () => leave(pad), `${id} in place`);
}
const leftward = (t: Tile) => t.x - t.previousX < 0;
/** Hop onto a moving crystal once `ready` says it is placed for the jump. */
function hopTo(g: Game, id: string, ready: () => boolean) {
  const pad = tile(g, id);
  waitUntil(g, ready, `${id} ready`);
  step(g, { ...steer(g, pad.x + pad.w / 2), jump: true, jumpPressed: true });
  for (let i = 0; ; i++) {
    alive(g, `hop to ${id}`);
    const p = g.player;
    if (
      i > 12 &&
      p.grounded &&
      p.x + p.w > pad.x &&
      p.x < pad.x + pad.w &&
      Math.abs(p.y + p.h - pad.y) < 2
    )
      return;
    if (i > 600) throw new Error(`could not reach ${id}`);
    step(g, { ...steer(g, pad.x + pad.w / 2), jump: true });
  }
}

const fresh = () => new Game(0, { level: { ...nightglowLevel, enemies: [] } });
const rescued = (g: Game) => g.fireflies.filter((f) => f.collected).length;

function toMothHollow(g: Game) {
  walk(g, 1270);
  const steps = tile(g, "night.lift.steps");
  hopTo(g, steps.id!, () => steps.x <= 1345 && leftward(steps));
  waitUntil(g, () => steps.x + steps.w >= 1570, "branch near the far side");
  jump(g, 1680, 430);
  walk(g, 2380);
  jump(g, 2500, 370);
  jump(g, 2730, 320);
}
function toWisps(g: Game) {
  toMothHollow(g);
  jump(g, 2910, 360);
  jump(g, 3110, 330);
  jump(g, 3280, 430);
  walk(g, 4380);
}
function toGrove(g: Game) {
  toWisps(g);
  const rise = tile(g, "night.lift.rise");
  hopTo(g, rise.id!, () => rise.y >= 395);
  waitUntil(
    g,
    () => rise.y <= 310 && rise.y >= 285,
    "rising branch at the ledge",
  );
  jump(g, 4760, 280);
  const glide = tile(g, "night.lift.glide");
  hopTo(g, glide.id!, () => glide.x <= 4840 && leftward(glide));
  waitUntil(
    g,
    () => glide.x + glide.w >= 5080,
    "sliding branch near the floor",
  );
  jump(g, 5240, 430);
}
function toLastLantern(g: Game) {
  toGrove(g);
  walk(g, 6580);
  for (const [x, y] of [
    [6710, 390],
    [6870, 370],
    [7030, 390],
    [7190, 370],
    [7380, 430],
  ] as const)
    jump(g, x, y);
}

describe("Nightglow Woods", () => {
  it("is the eighth world: a dark night trail that hands over to Gloomwing", () => {
    expect(levels[7]).toBe(nightglowLevel);
    expect(nightglowLevel.dark).toBe(true);
    expect(nightglowLevel.boss).toBeUndefined();
    expect(gloomwingLevel.boss?.kind).toBe("owl");
    // A fair checkpoint before the major boss, and recovery blocks there.
    expect(NIGHTGLOW_FINAL_CHECKPOINT).toBeLessThan(NIGHTGLOW_FINALE_X);
    expect(gloomwingLevel.checkpoints[0]!.x).toBeLessThan(
      gloomwingLevel.boss!.minX,
    );
    expect(gloomwingLevel.platforms.filter((p) => p.rewardPower)).toHaveLength(
      2,
    );
  });

  it("lights each lantern as Pip passes, and keeps it lit after a lost life", () => {
    const g = fresh();
    walk(g, 1270);
    expect(g.lanterns[1]!.lit).toBe(true);
    expect(g.lanterns[2]!.lit).toBe(false);
    g.player.y = 800;
    g.update(1 / 120, idle);
    expect(g.deaths).toBe(1);
    expect(g.lanterns[1]!.lit).toBe(true);
  });

  it("can be crossed with ordinary jumps and hands over to the arena", () => {
    const g = fresh();
    toLastLantern(g);
    walk(g, NIGHTGLOW_FINALE_X + 20);
    expect(g.deaths).toBe(0);
    // The trail hands over to the Moonlit Belfry, which leads to Gloomwing.
    expect(finaleFor(g)).toBe(moonlitBelfry);
  });

  it("hides fireflies on the Moth perch, the Glowroot branch and the last treetop", () => {
    const g = fresh();
    toMothHollow(g);
    jump(g, 2650, 220);
    expect(rescued(g)).toBe(1);
    jump(g, 2730, 320);
    jump(g, 2910, 360);
    jump(g, 3110, 330);
    jump(g, 3280, 430);
    walk(g, 4380);
    const rise = tile(g, "night.lift.rise");
    hopTo(g, rise.id!, () => rise.y >= 395);
    waitUntil(g, () => rise.y <= 310 && rise.y >= 285, "rising branch");
    jump(g, 4760, 280);
    const glide = tile(g, "night.lift.glide");
    hopTo(g, glide.id!, () => glide.x <= 4840 && leftward(glide));
    waitUntil(g, () => glide.x + glide.w >= 5080, "sliding branch");
    jump(g, 5240, 430);
    // Night blooms open in Pip's light and make the climb.
    walk(g, 5440);
    jump(g, 5635, 340);
    jump(g, 5860, 255);
    jump(g, 6095, 175);
    expect(rescued(g)).toBe(2);
    jump(g, 6260, 430);
    walk(g, 6580);
    for (const [x, y] of [
      [6710, 390],
      [6870, 370],
      [7030, 390],
      [7190, 370],
      [7380, 430],
    ] as const)
      jump(g, x, y);
    walk(g, 7540);
    jump(g, 7670, 340);
    jump(g, 7870, 260);
    jump(g, 8070, 180);
    expect(rescued(g)).toBe(3);
  });
});

describe("Gloomwing, the Night Owl", () => {
  it("can be beaten in its arena: six hits over three phases", () => {
    const g = createFinaleRun(gloomwingLevel, "classic");
    // It now mixes in fake dives, so the shared bot reads it.
    const { hits, phases } = fightBoss(g, {
      trace: process.env.DBG ? (snap) => console.log("DEATH", snap) : undefined,
    });
    expect(g.state, `Gloomwing hits: ${hits.join(", ")}`).toBe("won");
    expect(hits).toEqual([5, 4, 3, 2, 1, 0]);
    expect(phases).toEqual(new Set([1, 2, 3]));
  });
});
