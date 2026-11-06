import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels, challengeLevels } from "./levels";
import { ACORNS_PER_WORLD, acornSpots } from "./acorns";
import type { Level } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

describe("hidden acorns", () => {
  it.each(levels.map((level) => ({ level, name: level.name })))(
    "hides five acorns on high coins along $name",
    ({ level }) => {
      const spots = acornSpots(level);
      expect(spots).toHaveLength(ACORNS_PER_WORLD);
      // Each acorn sits on a real coin, so it is reachable by that coin's route.
      for (const s of spots)
        expect(level.coins.some((c) => c.x === s.x && c.y === s.y)).toBe(true);
      expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBe(5);
      // Spread along the trail rather than bunched together.
      const xs = spots.map((s) => s.x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(
        level.width / 3,
      );
    },
  );

  it("only appears in main worlds", () => {
    for (const level of challengeLevels) expect(acornSpots(level)).toEqual([]);
  });

  it("is collected on touch, alongside the coin beneath it", () => {
    const level = levels[0]!;
    const spot = acornSpots(level)[0]!;
    const g = new Game(0, { level: { ...level, enemies: [] } });
    Object.assign(g.player, {
      x: spot.x - g.player.w / 2,
      y: spot.y - g.player.h / 2,
      vx: 0,
      vy: 0,
    });
    g.update(1 / 120, idle);
    expect(g.events).toContain("acorn");
    expect(g.acorns[0]!.collected).toBe(true);
  });
});

function arena(enemyXs: number[]): Level {
  return {
    id: 91,
    name: "Combo test",
    subtitle: "",
    width: 3000,
    theme: "meadow",
    spawn: { x: 100, y: 392 },
    platforms: [{ x: 0, y: 430, w: 3000, h: 230, kind: "ground" }],
    coins: [],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: enemyXs.map((x) => ({
      kind: "beetle",
      x,
      y: 402,
      minX: x - 2,
      maxX: x + 2,
    })),
    checkpoints: [],
    sections: [{ x: 0, name: "Test" }],
    goal: { x: 2900, y: 430 },
  };
}

describe("stomp combos", () => {
  it("pays a growing bonus for chained stomps, and resets on landing", () => {
    const g = new Game(0, { level: arena([600, 640, 680]) });
    const stompNext = (i: number) => {
      const e = g.enemies[i]!;
      Object.assign(g.player, {
        x: e.x + 2,
        y: e.y - g.player.h + 1,
        vx: 0,
        vy: 200,
        grounded: false,
      });
      g.update(1 / 120, idle);
    };
    stompNext(0);
    expect(g.combo).toBe(1);
    expect(g.collectedCoins).toBe(0);
    stompNext(1);
    expect(g.combo).toBe(2);
    expect(g.events).toContain("combo-2");
    expect(g.collectedCoins).toBe(1);
    stompNext(2);
    expect(g.events).toContain("combo-3");
    expect(g.collectedCoins).toBe(3);
    // Landing ends the chain.
    for (let i = 0; i < 200 && !g.player.grounded; i++) g.update(1 / 120, idle);
    g.update(1 / 120, idle);
    expect(g.combo).toBe(0);
  });
});
