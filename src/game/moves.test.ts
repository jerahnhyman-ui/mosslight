import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import type { Level, Platform } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (g: Game, input: GameInput = idle, n = 1) => {
  for (let i = 0; i < n; i++) g.update(1 / 120, input);
};
function room(platforms: Platform[], extra: Partial<Level> = {}): Level {
  return {
    id: 92,
    name: "Moves test",
    subtitle: "",
    width: 3000,
    theme: "meadow",
    spawn: { x: 100, y: 392 },
    platforms: [
      { x: 0, y: 430, w: 3000, h: 230, kind: "ground" },
      ...platforms,
    ],
    coins: [],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: [],
    checkpoints: [],
    sections: [{ x: 0, name: "Test" }],
    goal: { x: 2900, y: 430 },
    ...extra,
  };
}
function jumpUp(g: Game, frames = 30) {
  tick(g, { ...idle, jump: true, jumpPressed: true });
  tick(g, { ...idle, jump: true }, frames);
}

describe("ground pound", () => {
  it("hangs briefly, then drops much faster than a fall", () => {
    const g = new Game(0, { level: room([]) });
    tick(g, idle, 20);
    jumpUp(g);
    tick(g, { ...idle, downPressed: true });
    expect(g.pound).toBe("hang");
    const y = g.player.y;
    tick(g, idle, 10);
    expect(Math.abs(g.player.y - y)).toBeLessThan(1);
    tick(g, idle, 8);
    expect(g.pound).toBe("drop");
    expect(g.player.vy).toBeGreaterThan(900);
    for (let i = 0; i < 200 && !g.player.grounded; i++) tick(g);
    expect(g.events).toContain("pound");
    expect(g.pound).toBe("none");
  });

  it("smashes through a cracked block from above", () => {
    const brick: Platform = {
      x: 80,
      y: 300,
      w: 100,
      h: 26,
      kind: "brick",
      rewardCoins: 4,
    };
    const g = new Game(0, {
      level: room([brick], { spawn: { x: 110, y: 262 } }),
    });
    tick(g, idle, 20);
    expect(g.player.y + g.player.h).toBeCloseTo(300, 0);
    jumpUp(g, 20);
    tick(g, { ...idle, downPressed: true });
    for (let i = 0; i < 200 && !g.events.includes("break"); i++) tick(g);
    expect(g.platforms.find((t) => t.kind === "brick")!.broken).toBe(true);
    expect(g.collectedCoins).toBe(4);
  });

  it("bounces much higher off a mushroom", () => {
    const peak = (pound: boolean) => {
      const g = new Game(0, {
        level: room([{ x: 60, y: 408, w: 120, h: 22, kind: "mushroom" }], {
          spawn: { x: 105, y: 200 },
        }),
      });
      tick(g, idle, 30);
      if (pound) tick(g, { ...idle, downPressed: true });
      let top = Infinity;
      let bounced = false;
      for (let i = 0; i < 400; i++) {
        tick(g);
        if (g.events.includes("bounce")) bounced = true;
        if (bounced) top = Math.min(top, g.player.y);
      }
      return top;
    };
    expect(peak(true)).toBeLessThan(peak(false) - 60);
  });

  it("squashes a bug right beside the landing", () => {
    const g = new Game(0, {
      level: room([], {
        enemies: [{ kind: "beetle", x: 150, y: 402, minX: 148, maxX: 152 }],
      }),
    });
    tick(g, idle, 20);
    jumpUp(g);
    tick(g, { ...idle, downPressed: true });
    for (let i = 0; i < 200 && !g.player.grounded; i++) tick(g);
    expect(g.enemies[0]!.alive).toBe(false);
    expect(g.deaths).toBe(0);
  });
});

describe("wall jump", () => {
  const wall: Platform = { x: 400, y: 100, w: 60, h: 330, kind: "ground" };
  it("slides down a wall slowly and kicks off it up and away", () => {
    const g = new Game(0, {
      level: room([wall], { spawn: { x: 330, y: 392 } }),
    });
    tick(g, idle, 10);
    jumpUp(g, 5);
    // Push into the wall while rising, then while falling.
    for (let i = 0; i < 60; i++) tick(g, { ...idle, right: true, jump: true });
    for (let i = 0; i < 60 && g.player.vy <= 0; i++)
      tick(g, { ...idle, right: true });
    tick(g, { ...idle, right: true }, 20);
    expect(g.player.vy).toBeLessThanOrEqual(120);
    expect(g.player.grounded).toBe(false);
    tick(g, { ...idle, right: true, jump: true, jumpPressed: true });
    expect(g.events).toContain("wall-jump");
    expect(g.player.vy).toBeLessThan(-500);
    expect(g.player.vx).toBeLessThan(-200);
    expect(g.player.facing).toBe(-1);
  });

  it("does not trigger on the ground or away from walls", () => {
    const g = new Game(0, { level: room([]) });
    tick(g, idle, 10);
    jumpUp(g, 10);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.events).not.toContain("wall-jump");
  });
});
