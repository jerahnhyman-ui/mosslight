import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels, type Level } from "./levels";
import { createBoss } from "./bosses";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input = idle, count = 1) => {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
};
function fixture() {
  const level: Level = {
    ...levels[0],
    width: 1000,
    spawn: { x: 200, y: 392 },
    platforms: [{ x: 0, y: 430, w: 1000, h: 230, kind: "ground" }],
    coins: [],
    diamonds: [],
    stars: [],
    fireflies: [],
    enemies: [],
    checkpoints: [{ x: 200, y: 430 }],
    mechanisms: [],
    gates: [],
    boss: undefined,
    finalBoss: undefined,
    goal: { x: 990, y: 430 },
  };
  const game = new Game(0, { level });
  tick(game, idle, 3);
  return game;
}
function collectAtPlayer(game: Game) {
  game.diamonds.push({
    x: game.player.x + game.player.w / 2,
    y: game.player.y + game.player.h / 2,
    collected: false,
  });
  tick(game);
}
function getHit(game: Game, enemyOffset = 0) {
  const p = game.player;
  game.enemies.push({
    kind: "beetle",
    x: p.x + enemyOffset,
    y: p.y + p.h - 28,
    w: 32,
    h: 28,
    vx: 0,
    vy: 0,
    facing: 1,
    baseY: p.y + p.h - 28,
    grounded: true,
    state: "patrol",
    stateTime: 0,
    alive: true,
    squashed: 0,
    minX: p.x + enemyOffset - 1,
    maxX: p.x + enemyOffset + 1,
  });
  tick(game);
  game.enemies = [];
}

describe("reserve diamond", () => {
  it("requires a second diamond while big, and leaves further diamonds when full", () => {
    const game = fixture();
    expect(game.reserveDiamond).toBe(false);
    collectAtPlayer(game);
    expect(game.player.form).toBe("big");
    expect(game.reserveDiamond).toBe(false);
    collectAtPlayer(game);
    expect(game.reserveDiamond).toBe(true);
    expect(game.diamonds.at(-1)?.collected).toBe(true);
    collectAtPlayer(game);
    expect(game.diamonds.at(-1)?.collected).toBe(false);
  });

  it("releases a falling diamond on shrink that must be reached to grow again", () => {
    const game = fixture();
    collectAtPlayer(game);
    collectAtPlayer(game);
    getHit(game);
    expect(game.player.form).toBe("small");
    expect(game.reserveDiamond).toBe(false);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    expect(drop).toBeDefined();
    const startY = drop.y;
    tick(game, idle, 100);
    expect(drop.y).toBeGreaterThan(startY);
    expect(game.player.form).toBe("small");
    expect(drop.collected).toBe(false);
    for (let i = 0; i < 400 && !drop.collected; i++) {
      const dx = drop.x - (game.player.x + game.player.w / 2);
      tick(game, { ...idle, right: dx > 3, left: dx < -3 });
    }
    expect(drop.collected).toBe(true);
    expect(game.player.form).toBe("big");
    expect(game.reserveDiamond).toBe(false);
  });

  it("carries a held reserve into another area and clears both held and released diamonds on life loss", () => {
    const source = fixture();
    collectAtPlayer(source);
    collectAtPlayer(source);
    const target = fixture();
    target.transferPlayerFrom(source, { x: 200, feetY: 430 });
    expect(target.reserveDiamond).toBe(true);
    target.player.invulnerable = 0;
    getHit(target);
    expect(target.diamonds.some((d) => d.reserveDrop)).toBe(true);
    target.player.y = 700;
    tick(target);
    expect(target.deaths).toBe(1);
    expect(target.reserveDiamond).toBe(false);
    expect(target.diamonds.some((d) => d.reserveDrop)).toBe(false);
    const held = fixture();
    collectAtPlayer(held);
    collectAtPlayer(held);
    held.player.y = 700;
    tick(held);
    expect(held.reserveDiamond).toBe(false);
  });

  it("does not automatically collect a drop pinned beside Pip at the edge", () => {
    const game = fixture();
    collectAtPlayer(game);
    collectAtPlayer(game);
    game.player.x = 0;
    getHit(game);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    expect(drop.x).toBeGreaterThanOrEqual(14);
    for (let i = 0; i < 180; i++) {
      // Simulate standing against the wall, directly below the released gem.
      game.player.x = 0;
      game.player.vx = 0;
      tick(game);
    }
    expect(game.player.form).toBe("small");
    expect(drop.collected).toBe(false);
    // Step away and deliberately return for it.
    tick(game, { ...idle, right: true }, 100);
    for (let i = 0; i < 180 && !drop.collected; i++)
      tick(game, { ...idle, left: true });
    expect(drop.collected).toBe(true);
    expect(game.player.form).toBe("big");
  });

  it("drops onto reachable ground when the desired side is a gap", () => {
    const base = fixture().level;
    const game = new Game(0, {
      level: {
        ...base,
        platforms: [
          { x: 0, y: 430, w: 270, h: 230, kind: "ground" },
          { x: 520, y: 430, w: 480, h: 230, kind: "ground" },
        ],
      },
    });
    tick(game, idle, 3);
    collectAtPlayer(game);
    collectAtPlayer(game);
    game.player.x = 230;
    getHit(game, 20);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    expect(drop.x).toBeLessThanOrEqual(256);
    tick(game, idle, 120);
    expect(drop.y).toBeCloseTo(414);
    expect(game.deaths).toBe(0);
    for (let i = 0; i < 180 && !drop.collected; i++)
      tick(game, { ...idle, right: true });
    expect(drop.collected).toBe(true);
    expect(game.player.form).toBe("big");
  });

  it("allows a deliberate jump to reclaim an overlapping drop in a tight space", () => {
    const game = fixture();
    collectAtPlayer(game);
    collectAtPlayer(game);
    game.player.x = 0;
    getHit(game);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    for (let i = 0; i < 180; i++) {
      game.player.x = 8;
      game.player.vx = 0;
      tick(game);
    }
    expect(drop.collected).toBe(false);
    tick(game, { ...idle, jump: true, jumpPressed: true });
    expect(drop.collected).toBe(true);
    expect(game.player.form).toBe("big");
  });

  it("keeps the drop on Pip's side of a closed wall", () => {
    const base = fixture().level;
    const game = new Game(0, {
      level: {
        ...base,
        platforms: [
          ...base.platforms,
          { x: 300, y: 0, w: 24, h: 430, kind: "ground" },
        ],
      },
    });
    tick(game, idle, 3);
    collectAtPlayer(game);
    collectAtPlayer(game);
    game.player.x = 230;
    getHit(game, 20);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    expect(drop.x + 14).toBeLessThanOrEqual(300);
    tick(game, idle, 120);
    for (let i = 0; i < 180 && !drop.collected; i++)
      tick(game, { ...idle, right: true });
    expect(drop.collected).toBe(true);
    expect(game.player.form).toBe("big");
  });

  it("carries a resting drop with a moving platform", () => {
    const base = fixture().level;
    const game = new Game(0, {
      level: {
        ...base,
        platforms: [
          ...base.platforms,
          {
            id: "test.moving",
            x: 200,
            y: 350,
            w: 180,
            h: 20,
            kind: "platform",
            motion: { axis: "x", range: 45, period: 4 },
          },
        ],
      },
    });
    Object.assign(game.player, { x: 250, y: 312, grounded: true });
    tick(game, idle, 3);
    collectAtPlayer(game);
    collectAtPlayer(game);
    getHit(game);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    const carrier = game.platforms.find((p) => p.id === "test.moving")!;
    tick(game, idle, 30);
    expect(drop.y + 16).toBeCloseTo(carrier.y);
    const offset = drop.x - carrier.x;
    tick(game, idle, 35);
    expect(drop.x - carrier.x).toBeCloseTo(offset, 4);
    expect(drop.y + 16).toBeCloseTo(carrier.y);
  });

  it("keeps a drop within an active boss arena's movement limit", () => {
    const game = fixture();
    collectAtPlayer(game);
    collectAtPlayer(game);
    game.boss = createBoss({
      kind: "stag",
      name: "Test guardian",
      x: 20,
      y: 430,
      minX: 0,
      maxX: 260,
    });
    game.boss.state = "warning";
    game.boss.stateTime = 30;
    const arenaRight = game.boss.maxX + game.boss.w + 26;
    game.player.x = arenaRight - game.player.w;
    getHit(game, 20);
    const drop = game.diamonds.find((d) => d.reserveDrop)!;
    expect(drop.x + 14).toBeLessThanOrEqual(arenaRight);
  });
});
