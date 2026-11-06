import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { challengeLevels } from "./levels";
import { floodgateDash, leafboatRiver } from "./special-stages";

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

/** Run the flood course with ordinary jumps, without stopping. */
function runFlood(g: Game) {
  jump(g, 560, 350);
  jump(g, 860, 430);
  jump(g, 1120, 430);
  walk(g, 1550);
  jump(g, 1790, 430);
  walk(g, 2290);
  jump(g, 2520, 430);
  walk(g, 2800);
  jump(g, 2960, 360);
  jump(g, 3230, 430);
  finish(g);
}
/** Run right until the stage reports the finish. */
function finish(g: Game) {
  for (let i = 0; i < 1200 && g.state === "playing"; i++)
    step(g, { ...idle, right: true });
}
/** Ride a boat, jumping each rock as it comes near. */
function rideBoat(g: Game, id: string, rocks: number[], landX: number) {
  const b = tile(g, id);
  jump(g, b.x + 60, 400);
  for (const rockX of rocks) {
    // Stay near the front of the boat; hop when the rock is close.
    waitUntil(g, () => rockX - (g.player.x + g.player.w) < 26, `rock ${rockX}`);
    step(g, { ...steer(g, rockX + 80), jump: true, jumpPressed: true });
    for (let i = 0; i < 300; i++) {
      alive(g, `hopping rock ${rockX}`);
      const p = g.player;
      if (i > 10 && p.grounded) break;
      step(g, { ...steer(g, Math.max(rockX + 70, b.x + b.w / 2)), jump: true });
    }
    for (let i = 0; i < 20; i++) step(g, steer(g, b.x + b.w / 2));
  }
  waitUntil(g, () => b.x >= b.cruise!.until, "boat reaching the dock");
  jump(g, landX, 430);
}

describe("special stages", () => {
  it("are the challenge rooms for Tidewell Depths and Nightglow Woods", () => {
    expect(challengeLevels.slice(6, 8)).toEqual([floodgateDash, leafboatRiver]);
  });

  it("catches Pip if they stand still as the flood rolls in", () => {
    const g = new Game(0, { level: floodgateDash });
    for (let i = 0; i < 120 * 6 && !g.deaths; i++) step(g);
    expect(g.events.includes("caught") || g.deaths > 0).toBe(true);
    expect(g.deaths).toBe(1);
    // It restarts a fair distance behind Pip.
    expect(g.chaseX).toBeLessThan(g.player.x - 200);
  });

  it("can outrun the flood to the finish inside the gold target", () => {
    const g = new Game(0, {
      level: { ...floodgateDash, enemies: [] },
      mode: "timed",
    });
    runFlood(g);
    if (process.env.REPORT_ROUTE_TIMES)
      console.info(`flood ${g.elapsed.toFixed(1)}s`);
    expect(g.state).toBe("won");
    expect(g.deaths).toBe(0);
    expect(g.elapsed).toBeLessThanOrEqual(floodgateDash.challengeTime!);
  });

  it("only sends a boat off once Pip is aboard, and docks it again after a fall", () => {
    const g = new Game(0, { level: leafboatRiver });
    const b = tile(g, "marsh.lily.boat.a");
    for (let i = 0; i < 240; i++) step(g);
    expect(b.x).toBe(300);
    walk(g, 280);
    jump(g, 400, 400);
    for (let i = 0; i < 120; i++) step(g);
    expect(b.x).toBeGreaterThan(400);
    // Fall off into the river: the boat goes back to its dock.
    g.player.y = 800;
    step(g);
    expect(g.deaths).toBe(1);
    expect(b.x).toBe(300);
  });

  it("can ride both boats over the rocks to the lower dock in time", () => {
    const g = new Game(0, { level: leafboatRiver, mode: "timed" });
    walk(g, 280);
    rideBoat(g, "marsh.lily.boat.a", [760, 1150], 1780);
    walk(g, 1880);
    rideBoat(g, "marsh.lily.boat.b", [2350, 2750, 3100], 3580);
    finish(g);
    expect(g.state).toBe("won");
    expect(g.deaths).toBe(0);
    expect(g.elapsed).toBeLessThanOrEqual(leafboatRiver.challengeTime!);
    if (process.env.REPORT_ROUTE_TIMES)
      console.info(`river ${g.elapsed.toFixed(1)}s`);
  });
});
