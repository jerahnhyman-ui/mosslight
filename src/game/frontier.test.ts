import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import type { Level } from "./levels";
import { levels } from "./levels";
import {
  grumbleLevel,
  snowLevel,
  SNOW_FINAL_CHECKPOINT,
  SNOW_FINALE_X,
} from "./snow-level";
import {
  iceLevel,
  ICE_FINAL_CHECKPOINT,
  ICE_FINALE_X,
  shellshockLevel,
} from "./ice-level";
import {
  cinderLevel,
  volcanoLevel,
  VOLCANO_FINAL_CHECKPOINT,
  VOLCANO_FINALE_X,
} from "./volcano-level";
import { createFinaleRun, finaleFor } from "./boss-level";

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
const fresh = (level: Level) =>
  new Game(0, { level: { ...level, enemies: [] } });
const rescued = (g: Game) => g.fireflies.filter((f) => f.collected).length;

/** The sliding-ledge crossing shared by the gorge layouts. */
function slideAcross(g: Game, id: string, start: number, landX: number) {
  const lift = tile(g, id);
  walk(g, start);
  hopTo(g, id, () => lift.x <= start + 75 && leftward(lift));
  waitUntil(g, () => lift.x + lift.w >= start + 300, `${id} near the far side`);
  jump(g, landX, 430);
}
/** The rising ledge, rest ledge and sliding ledge shared by the lift runs. */
function liftRun(g: Game, prefix: string, second: string) {
  walk(g, 4380);
  const rise = tile(g, `${prefix}rise`);
  hopTo(g, rise.id!, () => rise.y >= 395);
  waitUntil(g, () => rise.y <= 310 && rise.y >= 285, "rising ledge");
  jump(g, 4760, 280);
  const glide = tile(g, `${prefix}${second}`);
  hopTo(g, glide.id!, () => glide.x <= 4840 && leftward(glide));
  waitUntil(g, () => glide.x + glide.w >= 5080, "sliding ledge");
  jump(g, 5240, 430);
}
const hops = (g: Game, route: readonly (readonly [number, number])[]) => {
  for (const [x, y] of route) jump(g, x, y);
};
const bridges = [
  [2510, 390],
  [2670, 370],
  [2830, 390],
  [2990, 370],
  [3180, 430],
] as const;
const crust = [
  [6710, 390],
  [6870, 370],
  [7030, 390],
  [7190, 370],
  [7380, 430],
] as const;

function snowRoute(g: Game) {
  slideAcross(g, "snow.lift.gorge", 1270, 1680);
  walk(g, 2380);
  hops(g, bridges);
  walk(g, 3240);
  bounceTo(g, 3345, 3520, 210);
  jump(g, 3735, 120);
  jump(g, 3850, 430);
  liftRun(g, "snow.lift.", "glide");
  walk(g, 5540);
  hops(g, [
    [5670, 340],
    [5870, 260],
    [6070, 180],
    [6250, 430],
  ]);
  slideAcross(g, "snow.lift.run", 6570, 6980);
  walk(g, 7850);
  hops(g, [
    [7970, 340],
    [8170, 260],
    [8370, 180],
    [8560, 430],
  ]);
}
function iceRoute(g: Game) {
  slideAcross(g, "ice.floe.crossing", 1270, 1680);
  walk(g, 2380);
  hops(g, bridges);
  walk(g, 3360);
  hops(g, [
    [3520, 340],
    [3720, 260],
    [3920, 180],
    [4100, 430],
  ]);
  liftRun(g, "ice.floe.", "glide");
  walk(g, 5440);
  bounceTo(g, 5545, 5720, 210);
  jump(g, 5935, 120);
  jump(g, 6100, 430);
  walk(g, 6580);
  hops(g, crust);
  walk(g, 7480);
  hops(g, [
    [7670, 340],
    [7870, 260],
    [8070, 180],
    [8250, 430],
  ]);
}
function volcanoRoute(g: Game, embers = false) {
  slideAcross(g, "volcano.lift.glide", 1270, 1680);
  walk(g, 2380);
  for (const [x, y, ember] of [
    [2530, 420, -1],
    [2730, 420, 0],
    [2930, 420, 1],
    [3150, 430, -1],
  ] as const) {
    if (embers && ember >= 0) {
      const sprite = g.enemies.filter((e) => e.kind === "ember")[ember]!;
      waitUntil(
        g,
        () => sprite.grounded && sprite.stateTime > 1.1,
        "ember back in the lava",
      );
    }
    jump(g, x, y);
  }
  walk(g, 3360);
  hops(g, [
    [3520, 340],
    [3720, 260],
    [3920, 180],
    [4100, 430],
  ]);
  liftRun(g, "volcano.lift.", "drift");
  walk(g, 5440);
  bounceTo(g, 5545, 5720, 210);
  jump(g, 5935, 120);
  jump(g, 6100, 430);
  walk(g, 6580);
  hops(g, crust);
  walk(g, 7860);
  hops(g, [
    [8030, 420],
    [8250, 430],
    [8370, 340],
    [8570, 260],
    [8770, 180],
    [8960, 430],
  ]);
}

const worlds = [
  {
    level: snowLevel,
    arena: grumbleLevel,
    route: snowRoute,
    checkpoint: SNOW_FINAL_CHECKPOINT,
    finale: SNOW_FINALE_X,
    theme: "snow",
  },
  {
    level: iceLevel,
    arena: shellshockLevel,
    route: iceRoute,
    checkpoint: ICE_FINAL_CHECKPOINT,
    finale: ICE_FINALE_X,
    theme: "ice",
  },
  {
    level: volcanoLevel,
    arena: cinderLevel,
    route: volcanoRoute,
    checkpoint: VOLCANO_FINAL_CHECKPOINT,
    finale: VOLCANO_FINALE_X,
    theme: "volcano",
  },
] as const;

describe.each(worlds)(
  "$level.name",
  ({ level, arena, route, checkpoint, finale, theme }) => {
    it("is a main world that hands over to its own boss level", () => {
      expect(levels.indexOf(level)).toBeGreaterThanOrEqual(8);
      expect(level.theme).toBe(theme);
      expect(level.boss).toBeUndefined();
      expect(checkpoint).toBeLessThan(finale);
      expect(level.checkpoints.at(-1)!.x).toBe(checkpoint);
      expect(arena.checkpoints[0]!.x).toBeLessThan(arena.boss!.minX);
      expect(arena.platforms.filter((p) => p.rewardPower)).toHaveLength(2);
    });

    it("can be crossed with ordinary jumps, rescuing all three fireflies", () => {
      const g = fresh(level);
      route(g);
      expect(rescued(g)).toBe(3);
      walk(g, finale + 20);
      expect(g.deaths).toBe(0);
      expect(finaleFor(g)).toBe(arena);
    });
  },
);

describe("Snowdrift Peaks icicles", () => {
  it("shake, then fall on a Pip who stands still, and regrow later", () => {
    const g = fresh(snowLevel);
    walk(g, 1000);
    expect(g.icicles[1]!.state).not.toBe("hang");
    for (let i = 0; i < 240 && !g.deaths; i++) step(g);
    expect(g.deaths).toBe(1);
  });
});

describe("Frostglass Lake ice", () => {
  it("keeps Pip sliding after they let go", () => {
    const g = fresh(iceLevel);
    walk(g, 650);
    for (let i = 0; i < 60; i++) step(g, { ...idle, right: true });
    const x = g.player.x;
    for (let i = 0; i < 30; i++) step(g);
    expect(g.player.x - x).toBeGreaterThan(60);
  });
});

describe("Ember Caldera embers", () => {
  it("can be passed by timing jumps for when they drop back in", () => {
    const g = new Game(0, {
      level: {
        ...volcanoLevel,
        enemies: volcanoLevel.enemies.filter((e) => e.kind === "ember"),
      },
    });
    volcanoRoute(g, true);
    expect(g.deaths).toBe(0);
  });
  it("can't be stomped", () => {
    const g = new Game(0, {
      level: {
        ...volcanoLevel,
        enemies: volcanoLevel.enemies.filter((e) => e.kind === "ember"),
      },
    });
    const sprite = g.enemies[0]!;
    g.player.x = sprite.x;
    g.player.y = sprite.y - g.player.h - 4;
    g.player.vy = 200;
    for (let i = 0; i < 30 && !g.deaths; i++) step(g);
    expect(sprite.alive).toBe(true);
  });
});

/** A boss bot: dodge ground waves by jumping, step away from anything
 * falling, and stomp the guardian while it is dazed. */
function fight(
  arena: Level,
  rest: number,
  gaps: [number, number][] = [],
  minX = 450,
  maxX = 2300,
) {
  const g = createFinaleRun(arena, "classic");
  const hits: number[] = [];
  const phases = new Set<number>();
  let previousJump = false;
  for (let frame = 0; frame < 120 * 300 && g.state === "playing"; frame++) {
    const b = g.boss!,
      p = g.player;
    phases.add(b.phase);
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    let target: number;
    if (b.state === "defeated") target = g.level.goal.x + 20;
    else if (
      b.state === "recover" &&
      b.stateTime * 300 > Math.abs(px - bx) - b.w / 2 + 40
    )
      target = bx;
    else if (
      rest > 0 &&
      !p.grounded &&
      px > gaps[1]![1] + 60 &&
      px < gaps[2]![0] - 60
    )
      // Bouncing off Cinder: land on the near side of the island first.
      target = gaps[1]![1] + 70;
    else if (rest > 0 && px > gaps[1]![1] && px < gaps[2]![0] && p.grounded)
      // Leaving the island: from its near edge, hop the stones home.
      target = px > gaps[1]![1] + 40 ? gaps[1]![1] + 30 : rest;
    else target = rest > 0 ? rest : px < bx ? bx - 300 : bx + 300;
    const charging =
      b.kind === "tortoise" &&
      b.state === "attack" &&
      Math.sign(px - bx) === b.facing;
    // Hold still and hop the spinning shell as it arrives.
    if (charging) target = px;
    const overGap = gaps.some(([a, z]) => px > a - 30 && px < z + 30);
    if (b.state !== "defeated" && (p.grounded || !overGap)) {
      // Where will each falling icicle or fireball land?
      // The stretch each one sweeps through at Pip's height.
      const landings: [number, number][] = [];
      for (const h of g.hazards) {
        if (h.kind !== "icicle" && h.kind !== "fireball") continue;
        let x = h.x + h.w / 2,
          y = h.y,
          vy = h.vy,
          from: number | null = null;
        for (let t = 0; t < 3 && y + h.h < 472; t += 1 / 120) {
          vy = Math.min(900, vy + 900 / 120);
          y += vy / 120;
          x += h.vx / 120;
          if (from === null && vy > 0 && y + h.h >= 428) from = x;
        }
        landings.push([Math.min(from ?? x, x), Math.max(from ?? x, x)]);
      }
      const lo = Math.max(minX, b.minX + 20),
        hi = Math.min(maxX, b.maxX + b.w + 6);
      const inGap = (x: number) =>
        gaps.some(([a, z]) => x > a - 20 && x < z + 20);
      const safe = (x: number) =>
        x >= lo &&
        x <= hi &&
        !inGap(x) &&
        landings.every(
          ([a, z]) =>
            (x < a - 28 || x > z + 28) &&
            // Never run through a landing spot ahead.
            !(
              (x - px) * ((a + z) / 2 - px) > 0 &&
              Math.abs((a + z) / 2 - px) < Math.abs(x - px) + 40
            ),
        );
      if (landings.length && !safe(target)) {
        const options = [0, -30, 30, -60, 60, -120, 120, -180, 180, -260, 260]
          .map((d) => px + d)
          .filter(safe)
          .sort((a, z) => Math.abs(a - target) - Math.abs(z - target));
        target = options[0] ?? px;
      }
      target = Math.max(lo, Math.min(hi, target));
    }
    const dx = target - px - (p.vx * Math.abs(p.vx)) / 3700;
    const incoming = g.hazards.some(
      (h) =>
        h.vy === 0 &&
        ((h.vx > 0 && h.x + h.w < p.x + 6 && p.x - (h.x + h.w) < 40) ||
          (h.vx < 0 && h.x > p.x + p.w - 6 && h.x - (p.x + p.w) < 40)),
    );
    const hop = charging && Math.abs(px - bx) - b.w / 2 - p.w / 2 < 60;
    const atGap = gaps.some(
      ([a, z]) =>
        (dx > 0 && px > a - 34 && px < a) || (dx < 0 && px < z + 34 && px > z),
    );
    const jump: boolean =
      ((b.state === "recover" && Math.abs(px - bx) < b.w / 2 + 40) ||
        incoming ||
        hop ||
        (atGap && p.grounded) ||
        !p.grounded) &&
      !(p.grounded && previousJump);
    g.update(1 / 120, {
      left: dx < -2,
      right: dx > 2,
      jump,
      jumpPressed: jump && !previousJump,
    });
    previousJump = jump;
    if (g.events.includes("boss-hit")) hits.push(g.boss!.health);
  }
  return { g, hits, phases };
}

describe("Dedicated boss levels", () => {
  it.each([
    ["Grumble", grumbleLevel, 0, []],
    ["Shellshock", shellshockLevel, 0, []],
    [
      "Cinder",
      cinderLevel,
      940,
      [
        [1000, 1050],
        [1140, 1190],
        [1610, 1660],
        [1750, 1800],
      ],
    ],
  ] as const)(
    "%s can be beaten: five hits over three phases",
    (_, arena, rest, gaps) => {
      const { g, hits, phases } = fight(
        arena,
        rest,
        gaps.map(([a, z]) => [a, z]),
      );
      expect(g.state, `hits: ${hits.join(", ")}, deaths ${g.deaths}`).toBe(
        "won",
      );
      expect(hits).toEqual([4, 3, 2, 1, 0]);
      expect(phases).toEqual(new Set([1, 2, 3]));
    },
  );
});
