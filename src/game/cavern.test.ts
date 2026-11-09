import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";
import { fightBoss } from "./boss-bot";
import { CAVERN_FINAL_CHECKPOINT, cavernLevel } from "./cavern-level";
import {
  createBoss,
  flushMole,
  stepBoss,
  MOLE_BURROW,
  MOLE_LOCK,
  type BossHazard,
} from "./bosses";

// Routes use only directional and jump input; no player, tile or boss state
// is set to force a result.
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
const fresh = () =>
  new Game(0, { level: { ...cavernLevel, enemies: [], mounts: [] } });
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

function crossSteps(g: Game) {
  walk(g, 1270);
  const a = tile(g, "cave.lift.steps.a"),
    b = tile(g, "cave.lift.steps.b");
  hopTo(g, a.id!, () => a.x <= 1345 && leftward(a));
  hopTo(g, b.id!, () => b.x - (a.x + a.w) <= 30);
  waitUntil(g, () => b.x + b.w >= 1895, "steps crystal near the far floor");
  jump(g, 2080, 430);
}
function toEchoShaft(g: Game) {
  crossSteps(g);
  walk(g, 2490);
  const a = tile(g, "cave.lift.echo.a");
  hopTo(g, a.id!, () => a.y >= 385);
}
function toGlowcapGrove(g: Game) {
  toEchoShaft(g);
  const a = tile(g, "cave.lift.echo.a"),
    b = tile(g, "cave.lift.echo.b");
  hopTo(g, b.id!, () => Math.abs(a.y - b.y) < 20);
  waitUntil(g, () => b.y >= 360, "second echo crystal low");
  jump(g, 3090, 430);
}
function toGallery(g: Game) {
  toGlowcapGrove(g);
  walk(g, 4380);
  jump(g, 4510, 390);
  jump(g, 4655, 360);
  const shard = tile(g, "cave.lift.shard");
  hopTo(g, shard.id!, () => shard.x <= 4795 && leftward(shard));
  waitUntil(g, () => shard.x + shard.w >= 5010, "shard crystal near the crack");
  jump(g, 5140, 370);
  jump(g, 5272, 430);
}
function runTrail(g: Game) {
  toGallery(g);
  walk(g, 6380);
  const a = tile(g, "cave.lift.rumble.a"),
    b = tile(g, "cave.lift.rumble.b");
  hopTo(g, a.id!, () => a.x <= 6455 && leftward(a));
  hopTo(g, b.id!, () => b.x - (a.x + a.w) <= 30);
  waitUntil(g, () => b.x + b.w >= 6940, "rumble crystal near the far floor");
  jump(g, 7180, 430);
  walk(g, CAVERN_FINAL_CHECKPOINT + 20);
}

/** Stand over the tunnelling mole, pound it out of the ground, stomp it. */
function defeatRumble(g: Game) {
  const { hits, phases, events } = fightBoss(g, { seconds: 180 });
  expect(g.state, `Rumble fight hits: ${hits.join(", ")}`).toBe("won");
  expect(hits).toEqual([3, 2, 1, 0]);
  expect(phases).toEqual(new Set([1, 2, 3]));
  expect(events.has("boss-flushed")).toBe(true);
}
const rescued = (g: Game) => g.fireflies.filter((f) => f.collected).length;

describe("Glimmerdeep Caverns", () => {
  it("is the sixth world, with its own guardian and three fireflies", () => {
    expect(levels[5]).toBe(cavernLevel);
    expect(cavernLevel.theme).toBe("cavern");
    expect(cavernLevel.boss?.kind).toBe("mole");
    expect(cavernLevel.fireflies).toHaveLength(3);
    expect(cavernLevel.diamonds).toEqual([]);
    expect(cavernLevel.stars).toEqual([]);
    expect(
      cavernLevel.platforms
        .filter((t) => t.rewardPower)
        .map((t) => t.rewardPower)
        .sort(),
    ).toEqual(["diamond", "diamond", "feather", "shield", "star"]);
  });

  it("puts a checkpoint on solid floor before every chasm", () => {
    const floors = cavernLevel.platforms
      .filter((t) => t.kind === "ground")
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < floors.length - 1; i++) {
      const end = floors[i]!.x + floors[i]!.w;
      if (floors[i + 1]!.x <= end) continue;
      const nearest = cavernLevel.checkpoints
        .filter((c) => c.x >= floors[i]!.x && c.x < end)
        .at(-1);
      expect(nearest, `checkpoint before chasm at ${end}`).toBeDefined();
      expect(end - nearest!.x).toBeLessThanOrEqual(300);
    }
  });

  it("makes every chasm too wide to jump without a moving crystal", () => {
    const floors = cavernLevel.platforms
      .filter((t) => t.kind === "ground")
      .sort((a, b) => a.x - b.x);
    const chasms = floors.slice(1).flatMap((next, i) => {
      const end = floors[i]!.x + floors[i]!.w;
      return next.x > end ? [[end, next.x] as const] : [];
    });
    expect(chasms).toHaveLength(4);
    for (const [from, to] of chasms) {
      // An ordinary running jump covers about 250px.
      expect(to - from, `chasm ${from}-${to}`).toBeGreaterThanOrEqual(500);
      expect(
        cavernLevel.platforms.some(
          (t) => t.kind === "moving" && t.x > from - 100 && t.x < to,
        ),
        `moving crystal in chasm ${from}-${to}`,
      ).toBe(true);
    }
  });

  it("keeps checkpoints clear of enemy patrols", () => {
    for (const c of cavernLevel.checkpoints)
      for (const e of cavernLevel.enemies)
        expect(
          c.x + 28 < e.minX - 24 || c.x > e.maxX + 56,
          `checkpoint ${c.x} overlaps ${e.kind} patrol ${e.minX}-${e.maxX}`,
        ).toBe(true);
  });

  it("can be crossed with ordinary jumps, and Rumble pounded out of its tunnel", () => {
    const g = fresh();
    runTrail(g);
    expect(g.activeCheckpointIndex).toBe(cavernLevel.checkpoints.length - 1);
    defeatRumble(g);
    expect(g.deaths).toBe(0);
  });

  it("reaches the Bat Roost from the top of the echo crystal", () => {
    const g = fresh();
    toEchoShaft(g);
    const echo = tile(g, "cave.lift.echo.a");
    waitUntil(g, () => echo.y <= 264, "echo crystal at the top");
    jump(g, 2750, 150);
    expect(rescued(g)).toBe(1);
  });

  it("bounces off a glowcap to the Geode Hollow", () => {
    const g = fresh();
    toGlowcapGrove(g);
    walk(g, 3240);
    bounceTo(g, 3345, 3500, 210);
    jump(g, 3715, 130);
    expect(rescued(g)).toBe(1);
  });

  it("rides the gallery crystal to the hidden alcove", () => {
    const g = fresh();
    toGallery(g);
    walk(g, 5330);
    jump(g, 5375, 340);
    jump(g, 5595, 250);
    ride(
      g,
      "cave.lift.gallery",
      (t) => t.x <= 5712 && leftward(t),
      (t) => t.x + t.w >= 6020,
    );
    jump(g, 6150, 130);
    expect(rescued(g)).toBe(1);
  });
});

describe("Rumble, the Crystal Mole", () => {
  const spec = cavernLevel.boss!;
  it("tunnels out of reach, locks its mark, then bursts up with shards", () => {
    const boss = createBoss(spec);
    const hazards: BossHazard[] = [];
    const events: string[] = [];
    const player = { x: 8500, y: 392, w: 28, h: 38 };
    stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.state).toBe("warning");
    // A world-6 guardian warns a little quicker than the early ones.
    expect(boss.stateTime).toBeCloseTo(MOLE_BURROW * 0.93, 1);
    // Underground it cannot touch Pip.
    for (let i = 0; i < 60; i++)
      stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.y).toBeGreaterThan(boss.groundY);
    // Once locked, the mark no longer follows Pip.
    while (boss.stateTime > MOLE_LOCK - 0.05)
      stepBoss(boss, 1 / 120, player, hazards, events);
    const locked = boss.attackTargetX;
    player.x += 200;
    while (boss.state === "warning")
      stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.attackTargetX).toBe(locked);
    while (boss.state === "attack")
      stepBoss(boss, 1 / 120, player, hazards, events);
    // Nobody pounded it out: it never rests, and digs straight back in.
    expect(boss.state).toBe("warning");
    expect(boss.x).toBe(locked);
    expect(hazards).toHaveLength(2);
    for (const h of hazards) expect(h.h).toBeLessThanOrEqual(24);
  });

  it("is only dazed by a ground pound on the floor above its tunnel", () => {
    const boss = createBoss(spec);
    const events: string[] = [];
    const player = { x: 8500, y: 392, w: 28, h: 38 };
    stepBoss(boss, 1 / 120, player, [], events);
    for (let i = 0; i < 120; i++) stepBoss(boss, 1 / 120, player, [], events);
    // A pound far from the mound does nothing.
    expect(flushMole(boss, { ...player, x: boss.x + 300 }, events)).toBe(false);
    expect(flushMole(boss, { ...player, x: boss.x + 30 }, events)).toBe(true);
    expect(boss.state).toBe("recover");
    expect(boss.y + boss.h).toBe(boss.groundY);
    expect(events).toContain("boss-flushed");
  });
});
