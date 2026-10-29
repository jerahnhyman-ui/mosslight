import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import {
  windmillLevel,
  flowerHoopsLevel,
  beehiveLevel,
} from "./expansion-levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input: GameInput = idle, n = 1) => {
  for (let i = 0; i < n; i++) game.update(1 / 120, input);
};

describe("wind feather and expansion simulation", () => {
  it("requires a fresh airborne press and spends finite charge, then recharges on stable ground", () => {
    const g = new Game(0, { level: windmillLevel });
    g.player.x = 170;
    tick(g, idle, 3);
    expect(g.hasWindFeather).toBe(true);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    tick(g, { ...idle, jump: true }, 30);
    expect(g.liftRemaining).toBeCloseTo(1.2);
    tick(g);
    tick(g, { ...idle, jump: true, jumpPressed: true }, 30);
    expect(g.glideArmed).toBe(true);
    expect(g.liftRemaining).toBeLessThan(1.2);
    tick(g, idle, 300);
    expect(g.player.grounded).toBe(true);
    expect(g.liftRemaining).toBeCloseTo(1.2);
  });

  it("keeps a zero-step press until the next simulation tick", () => {
    const g = new Game(0, { level: windmillLevel });
    tick(g, idle, 3);
    g.update(1 / 240, {
      ...idle,
      jump: true,
      jumpPressed: true,
      jumpEdges: [true],
    });
    g.update(1 / 240, {
      ...idle,
      jump: true,
      jumpPressed: false,
      jumpEdges: [],
    });
    expect(g.player.vy).toBeLessThan(0);
  });

  it("does not discover the hive at the world spawn", () => {
    const g = new Game(0, { level: windmillLevel });
    tick(g, idle, 160);
    expect(g.puzzleState.hiveDiscovered).toBe(false);
  });

  it("arms a portal only after a stationary wait and consumes a fresh jump", () => {
    const g = new Game(0, { level: beehiveLevel });
    g.player.x = 145;
    tick(g, idle, 3);
    tick(g, idle, 35);
    expect(g.portalReady).toBeNull();
    tick(g, idle, 10);
    expect(g.portalReady).toBe("return");
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.requestedPortal).toBe("return");
    expect(g.player.vy).toBe(0);
  });

  it("awards each swept hoop only once and times out without a world win", () => {
    const g = new Game(0, { level: flowerHoopsLevel });
    tick(g, idle, 360);
    const hoop = flowerHoopsLevel.hoops![0]!;
    g.player.x = hoop.x - g.player.w / 2 - 2;
    g.player.y = hoop.y - g.player.h / 2;
    g.player.vx = 300;
    tick(g, { ...idle, right: true });
    expect(g.minigame.score).toBe(125);
    g.player.x = hoop.x - g.player.w / 2 - 2;
    g.player.y = hoop.y - g.player.h / 2;
    g.player.vx = 300;
    tick(g, { ...idle, right: true });
    expect(g.minigame.score).toBe(125);
    tick(g, idle, 7200);
    expect(g.minigame.finished).toBe(true);
    expect(g.minigame.complete).toBe(false);
    expect(g.state).toBe("playing");
  });
});

// Isolated arena: the player can exercise the actual collision and power rules
// without route enemies, gates, checkpoints, or terrain obscuring the result.
function arena(options: { ceiling?: boolean; enemy?: boolean } = {}) {
  const level = {
    ...windmillLevel,
    width: 2000,
    spawn: { x: 100, y: 392 },
    platforms: [
      { x: 0, y: 430, w: 2000, h: 230, kind: "ground" as const },
      ...(options.ceiling
        ? [{ x: 0, y: 120, w: 2000, h: 32, kind: "ground" as const }]
        : []),
    ],
    featherFountains: [{ x: 114, y: 430 }],
    enemies: options.enemy
      ? [{ kind: "beetle" as const, x: 500, y: 402, minX: 500, maxX: 500 }]
      : [],
    coins: [],
    diamonds: [],
    stars: [],
    fireflies: [],
    checkpoints: [],
    gates: [],
    mechanisms: [],
    portals: [],
    boss: undefined,
    flightTarget: undefined,
    goal: { x: 1950, y: 430 },
  };
  const g = new Game(0, { level });
  tick(g, idle, 2);
  expect(g.hasWindFeather).toBe(true);
  return g;
}
function airborne(g: Game) {
  g.player.x = 100;
  g.player.y = 300;
  g.player.vy = 0;
  g.player.grounded = false;
  tick(g, idle, 16); // expire coyote time with Jump released
}
const press = { ...idle, jump: true, jumpPressed: true };
const hold = { ...idle, jump: true };

describe("flight invariants", () => {
  it("spends exactly 144 powered ticks and requires 24 stable landing ticks to refill", () => {
    const g = arena();
    airborne(g);
    tick(g, press);
    tick(g, hold, 142);
    expect(g.liftRemaining).toBeCloseTo(1 / 120, 9);
    tick(g, hold);
    expect(g.liftRemaining).toBe(0);
    tick(g, hold, 10);
    expect(g.liftRemaining).toBe(0);
    g.player.x = 100;
    g.player.y = 392;
    g.player.vy = 0;
    g.player.grounded = true;
    tick(g, idle, 23);
    expect(g.liftRemaining).toBe(0);
    tick(g);
    expect(g.liftRemaining).toBeCloseTo(1.2, 9);
  });

  it("spends lift against a ceiling and fountain overlap does not refill", () => {
    const g = arena({ ceiling: true });
    airborne(g);
    tick(g, press);
    tick(g, hold, 140);
    expect(g.player.y).toBeGreaterThanOrEqual(152);
    expect(g.liftRemaining).toBeCloseTo(3 / 120, 9);
    expect(g.hasWindFeather).toBe(true);
  });

  it("keeps fuel through a shrink and drops the feather when a life is lost", () => {
    const g = arena({ enemy: true });
    airborne(g);
    tick(g, press);
    tick(g, hold, 20);
    const fuel = g.liftRemaining;
    Object.assign(g.player, {
      x: 500,
      y: 374,
      w: 40,
      h: 56,
      form: "big",
      vx: 0,
      vy: 0,
      invulnerable: 0,
    });
    tick(g, idle);
    expect(g.player.form).toBe("small");
    expect(g.hasWindFeather).toBe(true);
    expect(g.liftRemaining).toBeCloseTo(fuel, 9);
    Object.assign(g.player, { x: 500, y: 392, vx: 0, vy: 0, invulnerable: 0 });
    tick(g, idle);
    expect(g.lives).toBe(2);
    expect(g.hasWindFeather).toBe(false);
    expect(g.liftRemaining).toBe(0);
  });

  it("a stomp cancels thrust without refilling fuel", () => {
    const g = arena({ enemy: true });
    airborne(g);
    tick(g, press);
    tick(g, hold, 20);
    const fuel = g.liftRemaining;
    Object.assign(g.player, {
      x: 500,
      y: 364,
      vy: 300,
      vx: 0,
      grounded: false,
    });
    for (let i = 0; i < 20 && g.enemies[0]!.alive; i++) tick(g, hold);
    expect(g.enemies[0]!.alive).toBe(false);
    expect(g.player.vy).toBeLessThan(0);
    expect(g.liftActive).toBe(false);
    expect(g.liftRemaining).toBeCloseTo(fuel - 1 / 120, 9);
  });

  it("cannot arm glide with empty charge after walking off a ledge", () => {
    const g = arena();
    airborne(g);
    tick(g, press);
    tick(g, hold, 143);
    expect(g.liftRemaining).toBe(0);
    // Land briefly to end the previous glide, then walk off before recharge.
    Object.assign(g.player, { x: 400, y: 392, vy: 0, grounded: true });
    tick(g, idle);
    Object.assign(g.player, { x: 400, y: 200, vy: 0, grounded: false });
    tick(g, idle, 16);
    tick(g, press);
    expect(g.glideArmed).toBe(false);
    expect(g.liftActive).toBe(false);
    tick(g, hold, 30);
    expect(g.player.vy).toBeGreaterThan(180);
  });

  it("pause clears active thrust while preserving fuel and requires a new release and press", () => {
    const g = arena();
    airborne(g);
    tick(g, press);
    tick(g, hold, 20);
    const fuel = g.liftRemaining;
    g.clearInput();
    tick(g, { ...hold, jumpEdges: [] }, 10);
    expect(g.liftActive).toBe(false);
    expect(g.liftRemaining).toBe(fuel);
    tick(g, { ...idle, jumpEdges: [false] });
    tick(g, { ...press, jumpEdges: [true] });
    expect(g.liftActive).toBe(true);
    expect(g.liftRemaining).toBeLessThan(fuel);
  });

  it("keeps the normal jump trace when a feather is equipped but unused", () => {
    const equipped = arena();
    const plain = new Game(0, {
      level: { ...equipped.level, featherFountains: [] },
    });
    tick(plain, idle, 2);
    tick(equipped, press);
    tick(plain, press);
    for (let i = 0; i < 100; i++) {
      const input = i < 20 ? hold : idle;
      tick(equipped, input);
      tick(plain, input);
      expect(equipped.player.y).toBeCloseTo(plain.player.y, 9);
      expect(equipped.player.vy).toBeCloseTo(plain.player.vy, 9);
    }
  });

  it("matches tick-assigned press and release traces at 30, 60 and 120 Hz", () => {
    const run = (rate: number) => {
      const g = arena();
      airborne(g);
      const steps = 120 / rate;
      for (const [ticks, jump, edges] of [
        [20, true, [true]],
        [12, false, [false]],
        [40, true, [true]],
        [20, false, [false]],
      ] as const) {
        for (let i = 0; i < ticks / steps; i++)
          g.update(1 / rate, {
            ...idle,
            jump,
            jumpPressed: i === 0 && jump,
            jumpEdges: i === 0 ? [...edges] : [],
          });
      }
      return [g.player.x, g.player.y, g.player.vy, g.liftRemaining];
    };
    const reference = run(120);
    for (const rate of [30, 60])
      run(rate).forEach((n, i) => expect(n).toBeCloseTo(reference[i]!, 9));
  });
});
