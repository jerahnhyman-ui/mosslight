import { describe, expect, it } from "vitest";
import {
  Game,
  MAGNET_DURATION,
  RING_BONUS,
  SPRING_DURATION,
  type GameInput,
} from "./engine";
import type { Level, Platform } from "./levels";
import { snowLevel } from "./snow-level";
import { iceLevel } from "./ice-level";
import { volcanoLevel } from "./volcano-level";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const step = (g: Game, input: GameInput = idle) => g.update(1 / 120, input);
const run = (g: Game, frames: number, input: GameInput = idle) => {
  for (let i = 0; i < frames; i++) step(g, input);
};

/** A flat test field with one power block above the spawn. */
function field(
  power: Platform["rewardPower"],
  extra: Partial<Level> = {},
): Level {
  return {
    id: 90,
    contentId: "test.powers",
    name: "Power field",
    subtitle: "",
    kind: "world",
    theme: "meadow",
    width: 3000,
    spawn: { x: 200, y: 392 },
    platforms: [
      { x: 0, y: 430, w: 3000, h: 230, kind: "ground" },
      ...(power
        ? [
            {
              x: 196,
              y: 300,
              w: 48,
              h: 32,
              kind: "brick" as const,
              rewardPower: power,
            },
          ]
        : []),
    ],
    coins: [],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: [],
    checkpoints: [],
    sections: [{ x: 0, name: "Field" }],
    goal: { x: 2900, y: 430 },
    ...extra,
  };
}
/** Jump straight up into the block above and land again. */
function bump(g: Game) {
  step(g, { ...idle, jump: true, jumpPressed: true });
  for (let i = 0; i < 120; i++) step(g, { ...idle, jump: true });
  run(g, 60);
}

describe("Coin magnet", () => {
  it("pulls nearby coins in for a while, then wears off", () => {
    const g = new Game(0, {
      level: field("magnet", {
        coins: [
          { x: 340, y: 392 },
          { x: 360, y: 300 },
          { x: 900, y: 392 },
        ],
      }),
    });
    bump(g);
    expect(g.magnetRemaining).toBeGreaterThan(0);
    run(g, 120);
    expect(g.coins.slice(0, 2).every((c) => c.collected)).toBe(true);
    // Far coins stay put.
    expect(g.coins[2]!.collected).toBe(false);
    run(g, MAGNET_DURATION * 120);
    expect(g.magnetRemaining).toBe(0);
  });
});

describe("Bubble shield", () => {
  it("pops instead of Pip being hurt, once", () => {
    const g = new Game(0, {
      level: field("shield", {
        enemies: [{ kind: "beetle", x: 520, y: 402, minX: 500, maxX: 540 }],
      }),
    });
    bump(g);
    expect(g.shield).toBe(true);
    const form = g.player.form;
    let popped = false;
    for (let i = 0; i < 400 && !popped; i++) {
      step(g, { ...idle, right: true });
      popped = g.events.includes("shield-pop");
    }
    expect(popped).toBe(true);
    expect(g.shield).toBe(false);
    expect(g.player.form).toBe(form);
    expect(g.deaths).toBe(0);
  });
});

describe("Spring shoes", () => {
  it("make jumps clearly higher for a while", () => {
    const peak = (g: Game) => {
      const start = g.player.y;
      let top = start;
      step(g, { ...idle, jump: true, jumpPressed: true });
      for (let i = 0; i < 150; i++) {
        step(g, { ...idle, jump: true });
        top = Math.min(top, g.player.y);
      }
      run(g, 40);
      return start - top;
    };
    const plain = new Game(0, { level: field(undefined) });
    const normal = peak(plain);
    const g = new Game(0, { level: field("spring") });
    bump(g);
    expect(g.springRemaining).toBeGreaterThan(SPRING_DURATION - 3);
    g.player.x = 600;
    run(g, 30);
    expect(peak(g)).toBeGreaterThan(normal * 1.3);
  });
});

describe("Moving coins", () => {
  it("bob around their place and can still be collected", () => {
    const g = new Game(0, {
      level: field(undefined, {
        coins: [{ x: 600, y: 392, move: { axis: "x", range: 40, period: 2 } }],
      }),
    });
    const xs = new Set<number>();
    for (let i = 0; i < 240; i++) {
      step(g);
      xs.add(Math.round(g.coins[0]!.x));
    }
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(60);
    for (let i = 0; i < 600 && !g.coins[0]!.collected; i++)
      step(g, { ...idle, right: g.player.x < 600 });
    expect(g.coins[0]!.collected).toBe(true);
  });
});

describe("Coin rings", () => {
  const ringField = (time: number) =>
    field(undefined, {
      coinRings: [
        {
          x: 300,
          y: 395,
          time,
          coins: [0, 1, 2, 3, 4].map((i) => ({ x: 380 + i * 60, y: 392 })),
        },
      ],
    });
  it("releases blue coins and pays a bonus for catching them all in time", () => {
    const g = new Game(0, { level: ringField(4) });
    const before = g.collectedCoins;
    let cleared = false;
    for (let i = 0; i < 600 && !cleared; i++) {
      step(g, { ...idle, right: true });
      cleared = g.events.includes("ring-clear");
    }
    expect(cleared).toBe(true);
    expect(g.collectedCoins - before).toBe(5 + RING_BONUS);
    expect(g.coinRings[0]!.state).toBe("done");
  });
  it("resets when time runs out, and never pays a blue coin twice", () => {
    const g = new Game(0, { level: ringField(1.8) });
    // Start the ring, grab two coins, then stop and let time run out.
    for (let i = 0; i < 600 && g.player.x < 420; i++)
      step(g, { ...idle, right: true });
    run(g, 2 * 120);
    expect(g.coinRings[0]!.state).not.toBe("done");
    const paid = g.collectedCoins;
    expect(paid).toBeGreaterThan(0);
    // Step back before the ring while it recovers, then try again.
    g.player.x = 150;
    for (let i = 0; i < 600 && g.coinRings[0]!.state !== "ready"; i++) step(g);
    let cleared = false;
    for (let i = 0; i < 600 && !cleared; i++) {
      step(g, { ...idle, right: true });
      cleared = g.events.includes("ring-clear");
    }
    expect(cleared).toBe(true);
    expect(g.collectedCoins).toBe(5 + RING_BONUS);
  });
});

describe("New pickups in the worlds", () => {
  it.each([
    ["Snowdrift Peaks", snowLevel, "magnet"],
    ["Frostglass Lake", iceLevel, "spring"],
    ["Ember Caldera", volcanoLevel, "shield"],
  ] as const)("%s has a %s block and a coin ring", (_, level, power) => {
    expect(
      level.platforms.filter((p) => p.rewardPower === power),
    ).toHaveLength(1);
    expect(level.coinRings).toHaveLength(1);
    expect(level.coins.some((c) => c.move)).toBe(true);
  });
});
