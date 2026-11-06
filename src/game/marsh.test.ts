import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";
import { MARSH_FINAL_CHECKPOINT, marshLevel } from "./marsh-level";
import { createBoss, stepBoss, TOAD_LEAP, type BossHazard } from "./bosses";

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
/** Board a sliding pad near its closest point, then ride it to the far end. */
function ridePad(g: Game, id: string, boardAt: number, leaveAt: number) {
  const pad = tile(g, id);
  waitUntil(
    g,
    () => pad.x <= boardAt && pad.x - pad.previousX < 0,
    `${id} approaching`,
  );
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
  waitUntil(g, () => pad.x + pad.w >= leaveAt, `${id} reaching far side`);
}

/** Travel the main trail to the guardian's bank. */
function runTrail(g: Game) {
  walk(g, 1250);
  ridePad(g, "marsh.lily.ford", 1290, 1530);
  jump(g, 1660, 430);
  walk(g, 2200);
  for (const [x, y] of [
    [2330, 390],
    [2500, 370],
    [2670, 390],
    [2860, 430],
  ] as const)
    jump(g, x, y);
  walk(g, 5040);
  ridePad(g, "marsh.lily.drift.a", 5075, 5290);
  jump(g, 5380, 340);
  ridePad(g, "marsh.lily.drift.b", 5465, 5680);
  jump(g, 5790, 430);
  walk(g, 6700);
  for (const [x, y] of [
    [6830, 390],
    [6990, 370],
    [7150, 390],
    [7310, 370],
    [7470, 390],
    [7660, 430],
  ] as const)
    jump(g, x, y);
  walk(g, 8150, 490);
  jump(g, 8400, 430);
  walk(g, 9960);
  ridePad(g, "marsh.lily.reeds", 9990, 10225);
  jump(g, 10340, 430);
  walk(g, MARSH_FINAL_CHECKPOINT + 20);
}

/** Watch Gloam's landing marker, stay clear, hop ripples, stomp when it rests. */
function defeatGloam(g: Game) {
  const hits: number[] = [];
  const phases = new Set<number>();
  let previousJump = false;
  for (let frame = 0; frame < 120 * 180 && g.state === "playing"; frame++) {
    const b = g.boss!,
      p = g.player;
    phases.add(b.phase);
    const px = p.x + p.w / 2;
    const landing = b.attackTargetX + b.w / 2;
    const lo = b.minX + 20,
      hi = b.maxX + b.w;
    let target: number;
    if (b.state === "defeated") target = g.level.goal.x + 20;
    else if (b.state === "recover") target = b.x + b.w / 2;
    else {
      // Step well away from the marked landing spot, toward the roomier side.
      const left = landing - 230,
        right = landing + 230;
      target =
        left < lo ? right : right > hi ? left : px < landing ? left : right;
    }
    const dx = target - px - (p.vx * Math.abs(p.vx)) / 3700;
    const incoming = g.hazards.some(
      (h) =>
        (h.vx > 0 && h.x + h.w < p.x + 6 && p.x - (h.x + h.w) < 34) ||
        (h.vx < 0 && h.x > p.x + p.w - 6 && h.x - (p.x + p.w) < 34),
    );
    const jump: boolean =
      ((b.state === "recover" && Math.abs(px - (b.x + b.w / 2)) < 70) ||
        incoming ||
        !p.grounded) &&
      !(p.grounded && previousJump);
    step(g, {
      left: dx < -2,
      right: dx > 2,
      jump,
      jumpPressed: jump && !previousJump,
    });
    previousJump = jump;
    if (g.events.includes("boss-hit")) hits.push(g.boss!.health);
  }
  expect(g.state, `Gloam fight hits: ${hits.join(", ")}`).toBe("won");
  expect(hits).toEqual([3, 2, 1, 0]);
  expect(phases).toEqual(new Set([1, 2, 3]));
}

describe("Reedwater Marsh", () => {
  it("is the fifth world, with its own guardian and three fireflies", () => {
    expect(levels[4]).toBe(marshLevel);
    expect(marshLevel.kind).toBe("world");
    expect(marshLevel.boss?.kind).toBe("toad");
    expect(marshLevel.fireflies).toHaveLength(3);
    // Rewards come only from head-knocker blocks, and stay scarce.
    expect(marshLevel.diamonds).toEqual([]);
    expect(marshLevel.stars).toEqual([]);
    const rewards = marshLevel.platforms.filter((t) => t.rewardPower);
    expect(rewards.map((t) => t.rewardPower).sort()).toEqual([
      "diamond",
      "diamond",
      "diamond",
      "feather",
      "star",
    ]);
  });

  it("puts a checkpoint on the bank before every water crossing", () => {
    const banks = marshLevel.platforms
      .filter((t) => t.kind === "ground")
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < banks.length - 1; i++) {
      const end = banks[i]!.x + banks[i]!.w;
      if (banks[i + 1]!.x <= end) continue; // contiguous ground, no water
      const nearest = marshLevel.checkpoints
        .filter((c) => c.x >= banks[i]!.x && c.x < end)
        .at(-1);
      expect(nearest, `checkpoint before water at ${end}`).toBeDefined();
      expect(end - nearest!.x).toBeLessThanOrEqual(300);
    }
  });

  it("keeps checkpoints clear of enemy patrols", () => {
    for (const c of marshLevel.checkpoints)
      for (const e of marshLevel.enemies)
        expect(
          c.x + 28 < e.minX - 24 || c.x > e.maxX + 56,
          `checkpoint ${c.x} overlaps ${e.kind} patrol ${e.minX}-${e.maxX}`,
        ).toBe(true);
  });

  it("can be crossed with ordinary jumps, and Gloam defeated by stomping", () => {
    const g = new Game(0, { level: { ...marshLevel, enemies: [] } });
    runTrail(g);
    expect(g.activeCheckpointIndex).toBe(marshLevel.checkpoints.length - 1);
    defeatGloam(g);
    expect(g.deaths).toBe(0);
  });

  it("rescues the hidden Heron's Loft firefly with a mushroom bounce", () => {
    const g = new Game(0, { level: { ...marshLevel, enemies: [] } });
    walk(g, 1250);
    ridePad(g, "marsh.lily.ford", 1290, 1530);
    jump(g, 1660, 430);
    walk(g, 2200);
    for (const [x, y] of [
      [2330, 390],
      [2500, 370],
      [2670, 390],
      [2860, 430],
    ] as const)
      jump(g, x, y);
    walk(g, 3020);
    // Hop onto the mushroom; the bounce carries Pip up to the loft ledge.
    bounceTo(g, 3125, 3290, 210);
    expect(g.player.y + g.player.h).toBeCloseTo(210, 0);
    jump(g, 3510, 95);
    expect(g.fireflies.filter((f) => f.collected)).toHaveLength(1);
  });

  it("rescues the Glowworm and Kingfisher fireflies on optional climbs", () => {
    const g = new Game(0, { level: { ...marshLevel, enemies: [] } });
    walk(g, 1250);
    ridePad(g, "marsh.lily.ford", 1290, 1530);
    jump(g, 1660, 430);
    walk(g, 2200);
    for (const [x, y] of [
      [2330, 390],
      [2500, 370],
      [2670, 390],
      [2860, 430],
    ] as const)
      jump(g, x, y);
    walk(g, 5040);
    ridePad(g, "marsh.lily.drift.a", 5075, 5290);
    jump(g, 5380, 340);
    ridePad(g, "marsh.lily.drift.b", 5465, 5680);
    jump(g, 5790, 430);
    // Pip's glow wakes each flower as it approaches.
    walk(g, 5900);
    jump(g, 6020, 340);
    jump(g, 6250, 255);
    jump(g, 6480, 175);
    expect(g.fireflies.filter((f) => f.collected)).toHaveLength(1);
    jump(g, 6650, 430);
    walk(g, 6700);
    for (const [x, y] of [
      [6830, 390],
      [6990, 370],
      [7150, 390],
      [7310, 370],
      [7470, 390],
      [7660, 430],
    ] as const)
      jump(g, x, y);
    walk(g, 8150, 490);
    jump(g, 8400, 430);
    walk(g, 8700);
    jump(g, 8835, 340);
    jump(g, 9055, 250);
    // Board the high pad as it slides in, then hop to the perch.
    const pad = tile(g, "marsh.lily.perch");
    waitUntil(g, () => pad.x <= 9160 && pad.x - pad.previousX < 0, "perch pad");
    jump(g, 9200, 170);
    waitUntil(g, () => pad.x + pad.w >= 9500, "perch pad at far side");
    jump(g, 9630, 120);
    expect(g.fireflies.filter((f) => f.collected)).toHaveLength(2);
  });
});

describe("Gloam, the Bog Toad", () => {
  const spec = marshLevel.boss!;
  it("marks the player's position and only lands after a full warning", () => {
    const boss = createBoss(spec);
    const hazards: BossHazard[] = [];
    const events: string[] = [];
    const player = { x: 10900, y: 392, w: 28, h: 38 };
    stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.state).toBe("warning");
    expect(boss.attackTargetX + boss.w / 2).toBeCloseTo(10914, 0);
    expect(boss.stateTime).toBeGreaterThanOrEqual(1);
    let t = 0;
    while (boss.state === "warning") {
      stepBoss(boss, 1 / 120, player, hazards, events);
      t += 1 / 120;
    }
    expect(t).toBeGreaterThan(1);
    expect(boss.state).toBe("attack");
    // Mid-leap it is high above the floor.
    for (let i = 0; i < (TOAD_LEAP / 2) * 120; i++)
      stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.groundY - (boss.y + boss.h)).toBeGreaterThan(150);
    while (boss.state === "attack")
      stepBoss(boss, 1 / 120, player, hazards, events);
    expect(boss.state).toBe("recover");
    expect(boss.y + boss.h).toBe(boss.groundY);
    // Landing sends one low ripple each way, short enough to jump.
    expect(hazards).toHaveLength(2);
    expect(hazards.map((h) => Math.sign(h.vx)).sort()).toEqual([-1, 1]);
    for (const h of hazards) expect(h.h).toBeLessThanOrEqual(24);
  });

  it("adds a slower second ripple pair in its final phase", () => {
    const boss = createBoss(spec);
    boss.phase = 3;
    const hazards: BossHazard[] = [];
    const player = { x: 11000, y: 392, w: 28, h: 38 };
    boss.state = "attack";
    boss.stateTime = 1 / 240;
    stepBoss(boss, 1 / 120, player, hazards, []);
    expect(hazards).toHaveLength(4);
    expect(new Set(hazards.map((h) => Math.abs(h.vx))).size).toBe(2);
  });
});
