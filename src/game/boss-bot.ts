import type { Game, GameInput } from "./engine";

// A test bot that fights any guardian with ordinary directional and jump
// input only. It reads the fight the way a player would: it keeps clear of
// marked landing spots and falling hazards, hops low waves and charging
// guardians, and stomps a guardian while it rests. It never edits the game.

export type FightOptions = {
  /** Where to wait between openings (0: keep a distance from the guardian). */
  rest?: number;
  /** Lava or pit gaps to hop over, [start, end]; the second and third
   * gaps bound an island the guardian lives on. */
  gaps?: [number, number][];
  minX?: number;
  maxX?: number;
  seconds?: number;
  /** Called with a snapshot of the frame before each lost life. */
  trace?: (snapshot: string) => void;
  /** Called with a snapshot of every frame. */
  watch?: (snapshot: string, frame: number) => void;
};

export function fightBoss(g: Game, options: FightOptions = {}) {
  const { rest = 0, gaps = [], minX = 0, maxX = 1e9, seconds = 300 } = options;
  let deaths = g.deaths;
  const hits: number[] = [];
  const phases = new Set<number>();
  const events = new Set<string>();
  let previousJump = false;
  let previousBx = g.boss ? g.boss.x : 0;
  for (let frame = 0; frame < 120 * seconds && g.state === "playing"; frame++) {
    const b = g.boss!,
      p = g.player;
    phases.add(b.phase);
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const bvx = (b.x - previousBx) * 120;
    previousBx = b.x;
    let target: number;
    if (b.state === "defeated") target = g.level.goal.x + 20;
    else if (
      b.state === "recover" &&
      b.stateTime * 300 > Math.abs(px - bx) - b.w / 2 + 140
    )
      target = bx;
    else if (
      rest > 0 &&
      gaps.length > 2 &&
      !p.grounded &&
      px > gaps[1]![1] + 60 &&
      px < gaps[2]![0] - 60
    )
      // Bouncing off an island guardian: land on the near side first.
      target = gaps[1]![1] + 70;
    else if (
      rest > 0 &&
      gaps.length > 2 &&
      px > gaps[1]![1] &&
      px < gaps[2]![0] &&
      p.grounded
    )
      // Leaving the island: from its near edge, hop the stones home.
      target = px > gaps[1]![1] + 40 ? gaps[1]![1] + 30 : rest;
    else target = rest > 0 ? rest : px < bx ? bx - 300 : bx + 300;
    // A guardian rushing along the floor toward Pip: hold still and hop it.
    const charging =
      b.state === "attack" &&
      b.y + b.h > b.groundY - 4 &&
      Math.abs(bvx) > 60 &&
      Math.sign(px - bx) === Math.sign(bvx);
    if (charging) target = px;
    // A train of low webs or waves rolling in: run at it and clear the
    // whole train in one jump, as a player would.
    const train = g.hazards.filter(
      (h) =>
        h.vy === 0 &&
        h.vx !== 0 &&
        (h.kind === "web" || h.kind === "gust" || h.kind === "shard") &&
        Math.sign(px - (h.x + h.w / 2)) === Math.sign(h.vx) &&
        Math.abs(px - (h.x + h.w / 2)) < 340,
    );
    if ((train.length > 1 || (train.length && !p.grounded)) && !charging) {
      const toward = -Math.sign(train[0]!.vx);
      const far = Math.max(...train.map((h) => toward * (h.x + h.w / 2 - px)));
      target = px + toward * (far + 90);
    }
    const overGap = gaps.some(([a, z]) => px > a - 30 && px < z + 30);
    if (b.state !== "defeated" && (p.grounded || !overGap)) {
      // Every spot something will land on, as the stretch it sweeps at
      // Pip's height.
      // [from, to, seconds until it lands there]
      const landings: [number, number, number][] = [];
      // A guardian leaping or diving onto a marked spot.
      if (
        (b.state === "warning" || b.state === "attack") &&
        (b.kind === "toad" ||
          b.kind === "owl" ||
          b.kind === "mole" ||
          (b.kind === "spider" && b.variant === "pounce"))
      )
        landings.push([b.attackTargetX - 6, b.attackTargetX + b.w + 6, 0]);
      for (const h of g.hazards) {
        if (h.kind === "mark" || h.kind === "bolt") {
          landings.push([
            h.x + 4,
            h.x + h.w - 4,
            h.kind === "mark" ? h.remaining : 0,
          ]);
          continue;
        }
        if (
          h.kind !== "icicle" &&
          h.kind !== "fireball" &&
          h.kind !== "feather"
        )
          continue;
        let x = h.x + h.w / 2,
          y = h.y,
          vy = h.vy;
        let from: number | null = null;
        let when = 0;
        for (let t = 0; t < 3 && y + h.h < b.groundY + 2; t += 1 / 120) {
          when = t;
          if (h.kind !== "feather") vy = Math.min(900, vy + 900 / 120);
          y += vy / 120;
          x += h.vx / 120;
          if (from === null && vy > 0 && y + h.h >= b.groundY - 42) from = x;
        }
        landings.push([Math.min(from ?? x, x), Math.max(from ?? x, x), when]);
      }
      const lo = Math.min(px - 120, Math.max(minX, b.minX + 20)),
        hi = Math.min(maxX, b.maxX + b.w + 6);
      const inGap = (x: number) =>
        gaps.some(([a, z]) => x > a - 20 && x < z + 20);
      const safe = (x: number) =>
        x >= lo &&
        x <= hi &&
        !inGap(x) &&
        landings.every(
          ([a, z, when]) =>
            (x < a - 28 || x > z + 28) &&
            // Never run through a landing spot ahead, unless Pip will be
            // well past it before anything lands there.
            !(
              (x - px) * ((a + z) / 2 - px) > 0 &&
              Math.abs((a + z) / 2 - px) < Math.abs(x - px) + 40 &&
              (Math.abs((a + z) / 2 - px) + 60) / 280 + 0.1 > when
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
    // Don't run up behind a low wave travelling the same way.
    const heading = Math.sign(target - px);
    if (
      heading !== 0 &&
      g.hazards.some(
        (h) =>
          h.vy === 0 &&
          Math.sign(h.vx) === heading &&
          heading * (h.x + h.w / 2 - px) > 0 &&
          heading * (h.x + h.w / 2 - px) < 130,
      )
    )
      target = px;
    const dx = target - px - (p.vx * Math.abs(p.vx)) / 3700;
    const incoming = g.hazards.some(
      (h) =>
        h.vy === 0 &&
        h.kind !== "mark" &&
        h.kind !== "bolt" &&
        // Leave time to rise over it, given how fast the two are closing.
        ((h.vx > 0 &&
          h.x + h.w < p.x + 6 &&
          p.x - (h.x + h.w) < 30 + (h.vx - p.vx) * 0.11) ||
          (h.vx < 0 &&
            h.x > p.x + p.w - 6 &&
            h.x - (p.x + p.w) < 30 + (p.vx - h.vx) * 0.11)),
    );
    const gap = Math.abs(px - bx) - b.w / 2 - p.w / 2;
    const hop = charging && gap < Math.max(40, Math.abs(bvx) * 0.16);
    const atGap = gaps.some(
      ([a, z]) =>
        (dx > 0 && px > a - 34 && px < a) || (dx < 0 && px < z + 34 && px > z),
    );
    const jump: boolean =
      ((b.state === "recover" &&
        Math.abs(px - bx) < b.w / 2 + 40 &&
        // Hop any wave still rolling between Pip and the guardian first.
        !g.hazards.some(
          (h) =>
            h.vy === 0 &&
            h.vx !== 0 &&
            (h.x + h.w / 2 - px) * (bx - px) > 0 &&
            Math.abs(h.x + h.w / 2 - px) < Math.abs(bx - px),
        )) ||
        incoming ||
        hop ||
        (atGap && p.grounded) ||
        !p.grounded) &&
      !(p.grounded && previousJump);
    const input: GameInput = {
      left: dx < -2,
      right: dx > 2,
      jump,
      jumpPressed: jump && !previousJump,
    };
    const snapshot =
      options.trace || options.watch
        ? `${b.kind}/${b.variant} ${b.state} ph${b.phase} t${b.stateTime.toFixed(2)} px ${px.toFixed(0)} py ${(p.y + p.h).toFixed(0)} bx ${bx.toFixed(0)} bvx ${bvx.toFixed(0)} target ${target.toFixed(0)} hz ${g.hazards.map((h) => h.kind + Math.round(h.x)).join(",")}`
        : "";
    options.watch?.(`${snapshot} jump ${jump} vx ${p.vx.toFixed(0)}`, frame);
    g.update(1 / 120, input);
    if (options.trace && g.deaths > deaths) options.trace(snapshot);
    deaths = g.deaths;
    previousJump = jump;
    if (g.events.includes("boss-hit")) hits.push(g.boss!.health);
    for (const event of g.events) events.add(event);
  }
  return { hits, phases, events };
}
