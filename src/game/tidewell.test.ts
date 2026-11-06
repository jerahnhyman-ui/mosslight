import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";
import { TIDEWELL_FINAL_CHECKPOINT, tidewellLevel } from "./tidewell-level";
import { createBoss, stepBoss, type BossHazard } from "./bosses";

// Swims use only directional and jump input.
const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (g: Game, input: GameInput = idle) => g.update(1 / 120, input);
/** Swim until Pip's centre is near x and the top of Pip is near y. */
function swimTo(g: Game, x: number, y: number) {
  for (let frame = 0; frame < 6000; frame++) {
    const p = g.player;
    if (g.deaths || g.state !== "playing")
      throw new Error(
        `lost swimming to ${x},${y} at ${p.x.toFixed(0)},${p.y.toFixed(0)}`,
      );
    if (Math.abs(x - (p.x + p.w / 2)) < 16 && Math.abs(y - p.y) < 22) return;
    let delta = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
    let rise = p.y > y;
    // Like a player, back off and rise above a fish that is closing in.
    const fish = g.enemies.find(
      (e) =>
        e.alive &&
        Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 90 &&
        Math.abs(e.y - p.y) < 70,
    );
    if (fish) {
      // Pass over or under it; only hold back when it is level with Pip.
      rise = fish.y > p.y;
      if (Math.abs(fish.y - p.y) < 36)
        delta = p.x + p.w / 2 < fish.x + fish.w / 2 ? -10 : 10;
    }
    tick(g, { ...idle, left: delta < -4, right: delta > 4, jump: rise });
  }
  throw new Error(
    `could not swim to ${x},${y}: at ${g.player.x.toFixed(0)},${g.player.y.toFixed(0)}`,
  );
}
const route = (g: Game, points: readonly (readonly [number, number])[]) => {
  for (const [x, y] of points) swimTo(g, x, y);
};
const toTunnel = [
  [400, 420],
  [730, 250],
  [990, 420],
  [1230, 210],
  [1490, 430],
  [1650, 452],
  [2150, 330],
  [2335, 170],
  [2700, 445],
  [3050, 452],
  [3300, 305],
] as const;
const toMaze = [
  [3990, 305],
  [4250, 452],
] as const;
const toBoss = [
  [4530, 280],
  [4740, 420],
  [4930, 250],
  [5150, 250],
  [TIDEWELL_FINAL_CHECKPOINT, 452],
] as const;
const rescued = (g: Game) => g.fireflies.filter((f) => f.collected).length;

/** Keep clear of Pinch's scuttle and bubbles; sink onto it when it flips. */
function defeatPinch(g: Game) {
  const hits: number[] = [];
  const phases = new Set<number>();
  for (let frame = 0; frame < 120 * 240 && g.state === "playing"; frame++) {
    const b = g.boss!,
      p = g.player;
    phases.add(b.phase);
    const px = p.x + p.w / 2,
      bx = b.x + b.w / 2;
    let tx: number, ty: number;
    if (b.state === "defeated") {
      tx = g.level.goal.x + 30;
      ty = 452;
    } else if (b.state === "recover") {
      // Hover over the shell, then let go and sink onto it.
      tx = bx;
      ty = Math.abs(px - bx) < 20 ? 470 : b.y - 80;
    } else {
      // Stay high and on the far side from where it is heading.
      const side = px < bx ? -1 : 1;
      tx = bx + side * 230;
      if (tx < b.minX - 40) tx = bx + 230;
      if (tx > b.maxX + b.w + 20) tx = bx - 230;
      ty = 190;
    }
    const near = g.hazards.find(
      (h) => Math.abs(h.x + h.w / 2 - px) < 50 && Math.abs(h.y - p.y) < 70,
    );
    if (near) tx = px + (px < near.x + near.w / 2 ? -80 : 80);
    const delta = tx - px - (p.vx * Math.abs(p.vx)) / 6400;
    tick(g, {
      ...idle,
      left: delta < -4,
      right: delta > 4,
      jump: p.y > ty,
    });
    if (g.events.includes("boss-hit")) hits.push(g.boss!.health);
  }
  expect(g.state, `Pinch hits: ${hits.join(", ")}`).toBe("won");
  expect(hits).toEqual([3, 2, 1, 0]);
  expect(phases).toEqual(new Set([1, 2, 3]));
}

describe("Tidewell Depths", () => {
  it("is the seventh world: underwater, with its own guardian", () => {
    expect(levels[6]).toBe(tidewellLevel);
    expect(tidewellLevel.boss?.kind).toBe("crab");
    expect(tidewellLevel.fireflies).toHaveLength(3);
    const water = tidewellLevel.waterZones![0]!;
    // Everything after the shore is underwater.
    expect(water.x).toBeLessThan(300);
    expect(water.x + water.w).toBeGreaterThanOrEqual(tidewellLevel.goal.x);
    expect(tidewellLevel.waterZones!.some((z) => (z.currentX ?? 0) < 0)).toBe(
      true,
    );
    expect(tidewellLevel.waterZones!.some((z) => (z.currentY ?? 0) > 0)).toBe(
      true,
    );
    expect(tidewellLevel.enemies.every((e) => e.kind === "fish")).toBe(true);
  });

  it("keeps checkpoints clear of the fish", () => {
    for (const c of tidewellLevel.checkpoints)
      for (const e of tidewellLevel.enemies)
        expect(
          c.x + 28 < e.minX - 24 || c.x > e.maxX + 56,
          `checkpoint ${c.x} overlaps fish ${e.minX}-${e.maxX}`,
        ).toBe(true);
  });

  it("can be swum end to end past the fish, and Pinch defeated", () => {
    const g = new Game(0, { level: tidewellLevel });
    route(g, [...toTunnel, ...toMaze, ...toBoss]);
    expect(g.activeCheckpointIndex).toBe(tidewellLevel.checkpoints.length - 1);
    defeatPinch(g);
    expect(g.deaths).toBe(0);
  });

  it("finds all three hidden fireflies", () => {
    const g = new Game(0, { level: { ...tidewellLevel, enemies: [] } });
    route(g, toTunnel);
    // Up through the gap in the slab, then along the cove on top.
    route(g, [
      [3645, 305],
      [3645, 165],
      [3355, 160],
    ]);
    expect(rescued(g)).toBe(1);
    route(g, [[3645, 165], [3645, 320], ...toMaze, [4530, 280], [4740, 420]]);
    // Ride the bubble column to the surface light.
    route(g, [
      [4850, 300],
      [5000, 155],
    ]);
    expect(rescued(g)).toBe(2);
    // Then sink and slip beneath the coral shelf.
    route(g, [
      [5120, 300],
      [5120, 452],
      [5250, 452],
    ]);
    expect(rescued(g)).toBe(3);
  });
});

describe("Pinch, the Hermit Crab", () => {
  it("scuttles and puffs rising bubbles, then flips over to rest", () => {
    const boss = createBoss(tidewellLevel.boss!);
    const hazards: BossHazard[] = [];
    const player = { x: 5700, y: 300, w: 28, h: 38 };
    stepBoss(boss, 1 / 120, player, hazards, []);
    expect(boss.state).toBe("warning");
    while (boss.state === "warning")
      stepBoss(boss, 1 / 120, player, hazards, []);
    const start = boss.x;
    while (boss.state === "attack")
      stepBoss(boss, 1 / 120, player, hazards, []);
    expect(boss.state).toBe("recover");
    expect(Math.abs(boss.x - start)).toBeGreaterThan(100);
    expect(hazards.length).toBeGreaterThanOrEqual(3);
    for (const h of hazards) {
      expect(h.kind).toBe("bubble");
      expect(h.vy).toBeLessThan(0);
    }
  });
});
