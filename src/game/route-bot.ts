import type { Game, GameInput } from "./engine";

// Test helpers that drive Pip through a level with ordinary directional and
// jump input only, the way a player would. They never edit the game.

export const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

export const step = (g: Game, input: GameInput = idle) =>
  g.update(1 / 120, input);
export function steer(g: Game, x: number): GameInput {
  const p = g.player;
  const delta = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / (2 * 1850);
  return { ...idle, left: delta < -2, right: delta > 2 };
}
export function alive(g: Game, what: string) {
  if (g.state !== "playing" || g.deaths)
    throw new Error(
      `${what}: state ${g.state}, deaths ${g.deaths}, at ${g.player.x.toFixed(1)},${(g.player.y + g.player.h).toFixed(1)}`,
    );
}
export function walk(g: Game, x: number, y = 430) {
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
export function jump(g: Game, x: number, y: number) {
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
export function bounceTo(g: Game, mushroom: number, x: number, y: number) {
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
export const tile = (g: Game, id: string) =>
  g.platforms.find((t) => t.id === id)!;
export function waitUntil(g: Game, done: () => boolean, what: string) {
  for (let i = 0; i < 120 * 12; i++) {
    alive(g, what);
    if (done()) return;
    step(g);
  }
  throw new Error(`timed out waiting: ${what}`);
}
type Tile = Game["platforms"][number];
/** Wait for a moving crystal, board it, then ride until it is placed to leave. */
export function ride(
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
export const leftward = (t: Tile) => t.x - t.previousX < 0;
/** Hop onto a moving crystal once `ready` says it is placed for the jump. */
export function hopTo(g: Game, id: string, ready: () => boolean) {
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

/** Wait for a sliding ledge at a gorge edge, ride it across and jump off. */
export function slideAcross(g: Game, id: string, start: number, landX: number) {
  const lift = tile(g, id);
  walk(g, start);
  hopTo(g, id, () => lift.x <= start + 75 && leftward(lift));
  waitUntil(g, () => lift.x + lift.w >= start + 300, `${id} near the far side`);
  jump(g, landX, 430);
}
export const hops = (
  g: Game,
  route: readonly (readonly [number, number])[],
) => {
  for (const [x, y] of route) jump(g, x, y);
};
/** Cross a run of castle traps one at a time, waiting between them for a
 * safe gap in each one's beat. */
export function crossTraps(g: Game, to: number) {
  const traps = [...(g.level.traps ?? [])]
    .filter((t) => t.x > g.player.x && t.x < to)
    .sort((a, z) => a.x - z.x);
  for (const [i, trap] of traps.entries()) {
    const next = traps[i + 1];
    const after = next
      ? Math.min(trap.x + trap.w + (next.x - trap.x - trap.w) / 2, next.x - 40)
      : Math.min(trap.x + trap.w + 70, to);
    walk(g, Math.max(g.player.x + g.player.w / 2, trap.x - 40));
    const need = (after - (trap.x - 40)) / 260 + 0.25;
    waitUntil(
      g,
      () => {
        const t = g.trapCycle(trap);
        return t >= trap.active && trap.period - t > need;
      },
      `a gap in the trap at ${trap.x}`,
    );
    walk(g, after);
  }
  walk(g, to);
}
