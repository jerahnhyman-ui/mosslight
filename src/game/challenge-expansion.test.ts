import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { challengeLevels } from "./levels";
import { expansionChallenges } from "./challenge-expansion";

// Timed runs with ordinary input only, including the hopper or beetle on
// each finish stretch; each must beat its gold target.
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

const finish = (g: Game) => {
  for (let i = 0; i < 120 * 10 && g.state === "playing"; i++) {
    const p = g.player;
    // Jump the finish-line bug as it approaches.
    const bug = g.enemies.find((e) => e.alive && Math.abs(e.x - p.x) < 90);
    const jumpNow = !!bug && p.grounded;
    step(g, {
      ...steer(g, g.level.goal.x + 30),
      jump: jumpNow || !p.grounded,
      jumpPressed: jumpNow,
    });
  }
};
const routes: ((g: Game) => void)[] = [
  (g) => {
    walk(g, 575);
    const a = tile(g, "windmill.sail.dash.a");
    hopTo(g, a.id!, () => a.x <= 610 && leftward(a));
    waitUntil(g, () => a.x + a.w >= 850, "first sail near the bank");
    jump(g, 960, 430);
    walk(g, 1275);
    const b = tile(g, "windmill.sail.dash.b");
    hopTo(g, b.id!, () => b.x <= 1300 && leftward(b));
    waitUntil(g, () => b.x + b.w >= 1560, "second sail near the bank");
    jump(g, 1700, 430);
  },
  (g) => {
    walk(g, 480);
    for (const [x, y] of [
      [610, 390],
      [770, 370],
      [930, 390],
      [1100, 430],
    ] as const)
      jump(g, x, y);
    walk(g, 1380);
    const a = tile(g, "marsh.lily.relay.a");
    hopTo(g, a.id!, () => a.x <= 1420 && leftward(a));
    waitUntil(g, () => a.x + a.w >= 1660, "first lily near the stump");
    jump(g, 1770, 350);
    const b = tile(g, "marsh.lily.relay.b");
    hopTo(g, b.id!, () => b.x <= 1830 && leftward(b));
    waitUntil(g, () => b.x + b.w >= 2070, "second lily near the bank");
    jump(g, 2190, 430);
  },
  (g) => {
    walk(g, 480);
    const a = tile(g, "cave.lift.rush.a"),
      b = tile(g, "cave.lift.rush.b");
    hopTo(g, a.id!, () => a.x <= 530 && leftward(a));
    hopTo(g, b.id!, () => b.x - (a.x + a.w) <= 30);
    waitUntil(g, () => b.x + b.w >= 1050, "second crystal near the floor");
    jump(g, 1220, 430);
    walk(g, 1480);
    for (const [x, y] of [
      [1610, 390],
      [1770, 370],
      [1940, 430],
    ] as const)
      jump(g, x, y);
  },
];

describe("challenge rooms for worlds 4–6", () => {
  it("adds one room per later world, after the first three", () => {
    expect(challengeLevels.slice(3, 6)).toEqual(expansionChallenges);
    expect(expansionChallenges.map((l) => l.theme)).toEqual([
      "windmill",
      "marsh",
      "cavern",
    ]);
  });
  it.each(expansionChallenges.map((level, i) => ({ level, i })))(
    "finishes $level.name with normal input inside the gold target",
    ({ level, i }) => {
      const g = new Game(0, { level, mode: "timed" });
      routes[i]!(g);
      finish(g);
      expect(g.state).toBe("won");
      expect(g.deaths).toBe(0);
      expect(g.collectedCoins).toBeGreaterThan(8);
      expect(g.elapsed).toBeLessThanOrEqual(level.challengeTime!);
      if (process.env.REPORT_ROUTE_TIMES)
        console.info(
          `${level.name}: ${g.elapsed.toFixed(1)}s / gold ${level.challengeTime}s`,
        );
    },
  );
});
