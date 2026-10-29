import { describe, expect, it } from "vitest";
import {
  Game,
  COINS_PER_LIFE,
  MAX_LIVES,
  STAR_POWER_DURATION,
  type GameInput,
} from "./engine";
import { levels, type Level, type Platform, type EnemyKind } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
function advance(game: Game, seconds: number, input: GameInput = idle) {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    game.update(1 / 120, input);
}

function collectDiamond(game: Game, index = 0) {
  const diamond = game.diamonds[index]!;
  game.player.x = diamond.x - game.player.w / 2;
  game.player.y = 430 - game.player.h;
  game.player.vx = game.player.vy = 0;
  game.update(1 / 120, idle);
}

function collectStar(game: Game, index = 0) {
  const star = game.stars[index]!;
  game.player.x = star.x - game.player.w / 2;
  game.player.y = star.y - game.player.h / 2;
  game.player.vx = game.player.vy = 0;
  game.update(1 / 120, idle);
}

function touchEnemy(game: Game, index = 0, dt = 1 / 120) {
  const enemy = game.enemies[index]!;
  game.player.x = enemy.x;
  game.player.y = enemy.y + enemy.h - game.player.h;
  game.player.vx = game.player.vy = 0;
  game.update(dt, idle);
}

// Coin clusters isolate threshold behavior from route hazards while exercising
// the same collision/collection path used by ordinary level coins.
function collectCoins(game: Game, count: number) {
  game.player.x = 95;
  game.player.y = 430 - game.player.h;
  game.player.vx = game.player.vy = 0;
  game.coins = Array.from({ length: count }, () => ({
    x: 109,
    y: 400,
    collected: false,
  }));
  game.update(1 / 120, idle);
}

// These integration routes send the same four controls as the UI. In particular,
// they never edit the player, collectibles, enemy state, or physics constants.
function steer(game: Game, targetX: number): GameInput {
  const p = game.player;
  const stoppingDistance = (p.vx * Math.abs(p.vx)) / (2 * 1850);
  const delta = targetX - p.x - stoppingDistance;
  return { ...idle, left: delta < -2, right: delta > 2 };
}

function walkTo(game: Game, x: number, groundY: number) {
  for (let frame = 0; frame < 1200; frame++) {
    if (game.state === "won") return;
    if (game.state === "lost")
      throw new Error(`Lost walking to ${x}, ${groundY}`);
    const p = game.player;
    if (
      Math.abs(p.x - x) < 5 &&
      Math.abs(p.vx) < 40 &&
      p.grounded &&
      Math.abs(p.y + p.h - groundY) < 1
    )
      return;
    game.update(1 / 120, steer(game, x));
  }
  throw new Error(
    `Could not walk to ${x}, ${groundY}; at ${game.player.x}, ${game.player.y}`,
  );
}

function jumpTo(
  game: Game,
  takeoffX: number,
  targetX: number,
  groundY: number,
) {
  const supportY = game.player.y + game.player.h;
  walkTo(game, takeoffX, supportY);
  game.update(1 / 120, {
    ...steer(game, targetX),
    jump: true,
    jumpPressed: true,
  });
  for (let frame = 0; frame < 300; frame++) {
    if (game.state === "won") return;
    if (game.state === "lost")
      throw new Error(`Lost jumping to ${targetX}, ${groundY}`);
    const p = game.player;
    if (
      frame > 12 &&
      p.grounded &&
      Math.abs(p.y + p.h - groundY) < 1 &&
      Math.abs(p.x - targetX) < 12
    )
      return;
    game.update(1 / 120, { ...steer(game, targetX), jump: true });
  }
  throw new Error(
    `Could not jump from ${takeoffX} to ${targetX}, ${groundY}; at ${game.player.x}, ${game.player.y}`,
  );
}

type RouteStep = [takeoffX: number | null, targetX: number, landingY: number];
const routes: RouteStep[][] = [
  [
    [230, 386, 340],
    [445, 616, 265],
    [null, 750, 430],
    [775, 1000, 430],
    [1020, 1186, 340],
    [1255, 1431, 265],
    [null, 1555, 430],
    [1575, 1800, 430],
    [1810, 1966, 340],
    [2025, 2201, 265],
    [null, 2380, 430],
    [2405, 2630, 430],
    [2650, 2801, 345],
    [2855, 3045, 300],
    [null, 3300, 430],
  ],
  [
    [140, 286, 340],
    [335, 501, 265],
    [null, 590, 430],
    [585, 810, 430],
    [750, 901, 340],
    [955, 1146, 255],
    [null, 1315, 430],
    [1335, 1560, 430],
    [1490, 1641, 340],
    [1695, 1891, 260],
    [null, 2070, 430],
    [2085, 2310, 430],
    [2270, 2431, 340],
    [2495, 2686, 255],
    [null, 2810, 430],
    [2825, 3050, 430],
    [2980, 3121, 340],
    [3165, 3356, 270],
    [null, 3590, 430],
  ],
  [
    [140, 281, 340],
    [325, 481, 255],
    [525, 750, 430],
    [710, 856, 335],
    [905, 1096, 250],
    [null, 1250, 430],
    [1265, 1490, 430],
    [1450, 1551, 340],
    [1595, 1796, 255],
    [null, 1990, 430],
    [2005, 2230, 430],
    [2190, 2331, 340],
    [2375, 2566, 255],
    [null, 2730, 430],
    [2745, 2970, 430],
    [2910, 3051, 340],
    [3095, 3296, 255],
    [null, 3390, 430],
    [3370, 3521, 320],
    [null, 3620, 430],
    [3620, 3845, 430],
    [null, 3910, 430],
  ],
];

describe("Mosslight simulation", () => {
  it.each(levels.slice(0, 3))(
    "traverses the opening of $name with real controls and rescues its first firefly",
    (level) => {
      const game = new Game(level.id - 1);
      advance(game, 0.1);
      for (const [takeoff, target, y] of routes[level.id - 1]!) {
        if (takeoff === null) walkTo(game, target, y);
        else jumpTo(game, takeoff, target, y);
      }
      expect(game.state).toBe("playing");
      expect(game.collectedFireflies).toBe(1);
      expect(game.lives).toBeGreaterThan(0);
      expect(game.deaths).toBe(0);
      expect(game.checkpointActive).toBe(true);
    },
  );
  it("lands on the ground and uses a short hop when jump is released", () => {
    const held = new Game();
    advance(held, 0.1);
    expect(held.player.grounded).toBe(true);
    expect(held.player.y).toBe(392);
    held.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    advance(held, 0.3, { ...idle, jump: true });
    const short = new Game();
    advance(short, 0.1);
    short.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    advance(short, 0.3);
    expect(held.player.y).toBeLessThan(short.player.y - 50);
    advance(held, 1);
    expect(held.player.y).toBe(392);
  });

  it("accelerates promptly and stops within half a body width after release", () => {
    const game = new Game();
    advance(game, 0.1);
    advance(game, 0.1, { ...idle, right: true });
    expect(game.player.vx).toBeGreaterThanOrEqual(280);
    const releasedAt = game.player.x;
    advance(game, 0.1);
    expect(game.player.vx).toBe(0);
    expect(game.player.x - releasedAt).toBeLessThan(game.player.w / 2);
  });

  it("turns back within a short thumb reversal instead of continuing to slide", () => {
    const game = new Game();
    advance(game, 0.1);
    advance(game, 0.25, { ...idle, right: true });
    advance(game, 0.075, { ...idle, left: true });
    expect(game.player.facing).toBe(-1);
    expect(game.player.vx).toBeLessThan(0);
  });

  it("lets the player correct horizontal direction while rising", () => {
    const game = new Game();
    advance(game, 0.1);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    advance(game, 0.12, { ...idle, right: true, jump: true });
    expect(game.player.vx).toBeGreaterThan(250);
    advance(game, 0.1, { ...idle, left: true, jump: true });
    expect(game.player.vx).toBeLessThan(0);
    expect(game.player.vy).toBeLessThan(0);
  });

  it("gives a quick jump tap enough height to clear a beetle", () => {
    const game = new Game();
    advance(game, 0.1);
    const groundY = game.player.y;
    let top = groundY;
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    for (let i = 0; i < 120; i++) {
      top = Math.min(top, game.player.y);
      game.update(1 / 120, idle);
    }
    expect(groundY - top).toBeGreaterThan(44);
    expect(groundY - top).toBeLessThan(75);
    expect(game.player.grounded).toBe(true);
  });

  it("permits a jump just after leaving a ledge", () => {
    const game = new Game();
    game.player.x = 809;
    advance(game, 0.01);
    advance(game, 0.06, { ...idle, right: true });
    expect(game.player.grounded).toBe(false);
    game.update(1 / 120, {
      ...idle,
      right: true,
      jump: true,
      jumpPressed: true,
    });
    expect(game.events).toContain("jump");
    expect(game.player.vy).toBeLessThan(-500);
  });

  it("buffers a jump pressed just before landing", () => {
    const game = new Game();
    game.player.y = 380;
    game.player.vy = 100;
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    expect(game.events).not.toContain("jump");
    let jumped = false;
    for (let frame = 0; frame < 15; frame++) {
      game.update(1 / 120, { ...idle, jump: true });
      jumped ||= game.events.includes("jump");
    }
    expect(jumped).toBe(true);
    expect(game.player.vy).toBeLessThan(-500);
  });

  it("uses a released buffered tap on the landing tick exactly once", () => {
    const game = new Game();
    game.player.y = 386;
    game.player.vy = 180;
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    let jumps = 0;
    let landedBeforeJump = false;
    for (let i = 0; i < 120; i++) {
      game.update(1 / 120, idle);
      if (game.events.includes("jump")) {
        jumps++;
        expect(game.player.y).toBe(392);
        expect(game.player.vy).toBeLessThan(-300);
        expect(game.player.grounded).toBe(false);
      }
      if (jumps === 0 && game.player.grounded) landedBeforeJump = true;
    }
    expect(landedBeforeJump).toBe(false);
    expect(jumps).toBe(1);
    expect(game.player.grounded).toBe(true);
  });

  it("does not turn a held jump into automatic jumps after landing", () => {
    const game = new Game();
    advance(game, 0.1);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    let jumps = game.events.filter((event) => event === "jump").length;
    for (let i = 0; i < 150; i++) {
      game.update(1 / 120, { ...idle, jump: true });
      jumps += game.events.filter((event) => event === "jump").length;
    }
    expect(jumps).toBe(1);
    expect(game.player.grounded).toBe(true);
  });

  it("does not allow an air jump after the ledge grace period expires", () => {
    const game = new Game();
    game.player.x = 809;
    advance(game, 0.01);
    advance(game, 0.2, { ...idle, right: true });
    expect(game.player.grounded).toBe(false);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    expect(game.events).not.toContain("jump");
    expect(game.player.vy).toBeGreaterThan(0);
  });

  it("collects a seed and star only once", () => {
    const game = new Game();
    game.player.x = game.coins[0]!.x - 14;
    game.player.y = game.coins[0]!.y - 19;
    game.update(1 / 60, idle);
    expect(game.collectedCoins).toBe(1);
    advance(game, 0.1);
    expect(game.collectedCoins).toBe(1);
    game.player.x = game.stars[0]!.x - 14;
    game.player.y = game.stars[0]!.y - 19;
    game.update(1 / 60, idle);
    expect(game.collectedStars).toBe(1);
  });

  it("bounces off an enemy when descending and takes damage on its side", () => {
    const game = new Game();
    const enemy = game.enemies[0]!;
    game.player.x = enemy.x;
    game.player.y = enemy.y - game.player.h - 1;
    game.player.vy = 200;
    game.update(1 / 60, { ...idle, jump: true });
    expect(enemy.alive).toBe(false);
    expect(game.player.vy).toBeLessThan(0);
    expect(game.lives).toBe(3);
    const next = game.enemies[1]!;
    game.player.x = next.x;
    game.player.y = next.y;
    game.player.vy = 0;
    game.update(1 / 60, idle);
    expect(game.lives).toBe(2);
    expect(game.player.invulnerable).toBeGreaterThan(1);
    game.update(1 / 60, idle);
    expect(game.lives).toBe(2);
  });

  it("keeps an automatic beetle bounce useful without holding jump", () => {
    const bounceHeights = [false, true].map((jump) => {
      const game = new Game();
      const enemy = game.enemies[0]!;
      game.player.x = enemy.x;
      game.player.y = enemy.y - game.player.h - 1;
      game.player.vy = 200;
      game.update(1 / 120, { ...idle, jump });
      expect(game.events).toContain("stomp");
      const startY = game.player.y;
      let top = startY;
      for (let i = 0; i < 60; i++) {
        game.update(1 / 120, { ...idle, jump });
        top = Math.min(top, game.player.y);
      }
      return startY - top;
    });
    expect(bounceHeights[0]).toBeGreaterThan(50);
    expect(bounceHeights[0]).toBeCloseTo(bounceHeights[1]!, 8);
  });

  it("does not reuse grounded jump permission during damage knockback", () => {
    const game = new Game();
    advance(game, 0.1);
    game.player.x = game.diamonds[0]!.x - game.player.w / 2;
    game.update(1 / 120, idle);
    expect(game.player.form).toBe("big");
    game.player.x = game.enemies[0]!.x;
    game.update(1 / 120, idle);
    expect(game.events).toContain("shrink");
    expect(game.player.grounded).toBe(false);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    expect(game.events).not.toContain("jump");
    expect(game.player.vy).toBeLessThan(0);
    expect(game.player.vy).toBeGreaterThan(-350);
  });

  it("respawns at an activated checkpoint, keeps collectibles, and ends at zero lives", () => {
    const game = new Game();
    game.player.x = game.level.checkpoints[0]!.x;
    game.update(1 / 60, idle);
    expect(game.checkpointActive).toBe(true);
    game.collectedCoins = 4;
    game.player.y = 700;
    game.update(1 / 60, idle);
    expect(game.lives).toBe(2);
    expect(game.deaths).toBe(1);
    expect(game.player.x).toBe(game.level.checkpoints[0]!.x);
    expect(game.collectedCoins).toBe(4);
    for (let i = 0; i < 2; i++) {
      game.player.y = 700;
      game.update(1 / 60, idle);
    }
    expect(game.state).toBe("lost");
    expect(game.lives).toBe(0);
    game.restart();
    expect(game.state).toBe("playing");
    expect(game.lives).toBe(3);
    expect(game.checkpointActive).toBe(false);
    expect(game.collectedCoins).toBe(0);
  });

  it("wins at an unguarded exit and freezes the completed run", () => {
    const game = new Game(0, { level: { ...levels[0], boss: undefined } });
    game.player.x = game.level.goal.x;
    game.update(1 / 60, idle);
    expect(game.state).toBe("won");
    expect(game.events).toContain("win");
    const elapsed = game.elapsed;
    advance(game, 2, { ...idle, right: true });
    expect(game.elapsed).toBe(elapsed);
  });

  it("grows from a diamond with a larger collision body and fixed feet/center", () => {
    const game = new Game();
    const diamond = game.diamonds[0]!;
    expect(game.player.form).toBe("small");
    expect([game.player.w, game.player.h]).toEqual([28, 38]);
    collectDiamond(game);
    expect(game.player.form).toBe("big");
    expect([game.player.w, game.player.h]).toEqual([40, 56]);
    expect(game.player.x + game.player.w / 2).toBe(diamond.x);
    expect(game.player.y + game.player.h).toBe(430);
    expect(diamond.collected).toBe(true);
    expect(game.events).toContain("grow");
    advance(game, 0.1);
    expect(game.events).not.toContain("grow");
  });

  it("leaves a diamond available while big", () => {
    const game = new Game();
    collectDiamond(game);
    collectDiamond(game, 1);
    expect(game.player.form).toBe("big");
    expect(game.diamonds[1]!.collected).toBe(false);
    expect(game.events).not.toContain("grow");
  });

  it("defers growth beside a solid wall, then grows when there is room", () => {
    const game = new Game();
    // The small body fits in the gap beside the ground that starts at x=930.
    // A centered 40px body would extend into that solid ground wall.
    game.player.x = 898;
    game.player.y = 442;
    game.diamonds = [{ x: 912, y: 461, collected: false }];
    game.update(1 / 120, idle);
    expect(game.player.form).toBe("small");
    expect(game.diamonds[0]!.collected).toBe(false);
    game.player.x -= 12;
    game.update(1 / 120, idle);
    expect(game.player.form).toBe("big");
    expect(game.player.x + game.player.w).toBeLessThanOrEqual(930);
    expect(game.diamonds[0]!.collected).toBe(true);
  });

  it("defers growth at the world edge without consuming the diamond", () => {
    const game = new Game();
    game.player.x = 0;
    game.diamonds = [{ x: 14, y: 400, collected: false }];
    game.update(1 / 120, idle);
    expect(game.player.form).toBe("small");
    expect(game.diamonds[0]!.collected).toBe(false);
    game.player.x = 7;
    game.update(1 / 120, idle);
    expect(game.player.form).toBe("big");
    expect(game.player.x).toBeGreaterThanOrEqual(0);
  });

  it("defers growth under a solid ceiling but allows one-way ledges", () => {
    const original = levels[0]!;
    // A separate level fixture keeps the real level data untouched.
    levels.push({
      ...original,
      platforms: [
        ...original.platforms,
        { x: 140, y: 365, w: 60, h: 20, kind: "brick" },
      ],
    });
    const game = new Game(levels.length - 1);
    levels.pop();
    collectDiamond(game);
    expect(game.player.form).toBe("small");
    expect(game.diamonds[0]!.collected).toBe(false);
    game.platforms.at(-1)!.kind = "platform";
    game.update(1 / 120, idle);
    expect(game.player.form).toBe("big");
    expect(game.player.y + game.player.h).toBe(430);
  });

  it("shrinks on a big side hit and protects against consecutive contacts", () => {
    const game = new Game();
    collectDiamond(game);
    const enemy = game.enemies[0]!;
    game.enemies.push({ ...enemy });
    touchEnemy(game, 0, 0.1);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.deaths).toBe(0);
    expect(game.player.form).toBe("small");
    expect([game.player.w, game.player.h]).toEqual([28, 38]);
    expect(game.player.invulnerable).toBeGreaterThan(1.3);
    expect(game.events.filter((event) => event === "shrink")).toHaveLength(1);
    expect(game.events).not.toContain("life-lost");
    touchEnemy(game);
    expect(game.lives).toBe(MAX_LIVES);
    expect(enemy.alive).toBe(true);
    game.player.x = 95;
    game.player.y = 392;
    advance(game, 1.6);
    touchEnemy(game);
    expect(game.lives).toBe(2);
    expect(game.deaths).toBe(1);
  });

  it("respawns on a small side hit without applying stale movement or hits", () => {
    const game = new Game();
    const oldPlayer = game.player;
    game.enemies.push({ ...game.enemies[0]! });
    touchEnemy(game, 0, 0.1);
    expect(game.player).not.toBe(oldPlayer);
    expect(game.lives).toBe(2);
    expect(game.deaths).toBe(1);
    expect(game.player.form).toBe("small");
    expect(game.player.x).toBe(game.level.spawn.x);
    expect(game.player.y).toBe(game.level.spawn.y);
    expect(game.player.vx).toBe(0);
    expect(game.player.vy).toBe(0);
    expect(game.player.invulnerable).toBe(1.5);
    expect(game.events.filter((event) => event === "life-lost")).toHaveLength(
      1,
    );
    expect(game.events).not.toContain("lose");
  });

  it.each(["small", "big", "star", "grace"] as const)(
    "loses exactly one life to a gap with %s protection and resets powerups",
    (protection) => {
      const game = new Game();
      if (protection === "big" || protection === "star") collectDiamond(game);
      if (protection === "star") collectStar(game);
      if (protection === "grace") game.player.invulnerable = 1.5;
      game.player.y = 700;
      game.update(0.1, { ...idle, right: true, jump: true, jumpPressed: true });
      expect(game.lives).toBe(2);
      expect(game.deaths).toBe(1);
      expect(game.player.form).toBe("small");
      expect(game.starPowerRemaining).toBe(0);
      expect(game.player.invulnerable).toBe(1.5);
      expect(game.player.x).toBe(game.level.spawn.x);
      expect(game.events.filter((event) => event === "life-lost")).toHaveLength(
        1,
      );
      expect(game.diamonds.every((diamond) => !diamond.collected)).toBe(true);
    },
  );

  it("restores diamonds after death but preserves consumed coins and stars", () => {
    const game = new Game();
    collectCoins(game, 7);
    collectDiamond(game);
    collectStar(game);
    const usedCoins = game.coins.filter((coin) => coin.collected).length;
    const usedStars = game.stars.filter((star) => star.collected).length;
    game.player.y = 700;
    game.update(1 / 120, idle);
    expect(game.collectedCoins).toBe(7);
    expect(game.coinsTowardLife).toBe(7);
    expect(game.collectedStars).toBe(1);
    expect(game.coins.filter((coin) => coin.collected)).toHaveLength(usedCoins);
    expect(game.stars.filter((star) => star.collected)).toHaveLength(usedStars);
    expect(game.diamonds[0]!.collected).toBe(false);
    collectDiamond(game);
    expect(game.player.form).toBe("big");
    expect(game.events).toContain("grow");
  });

  it("awards a life exactly at 50 coins and retains the total count", () => {
    const game = new Game();
    game.player.y = 700;
    game.update(1 / 120, idle);
    collectCoins(game, COINS_PER_LIFE - 1);
    expect(game.lives).toBe(2);
    expect(game.coinsTowardLife).toBe(49);
    expect(game.events).not.toContain("extra-life");
    collectCoins(game, 1);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.coinsTowardLife).toBe(0);
    expect(game.collectedCoins).toBe(COINS_PER_LIFE);
    expect(game.events.filter((event) => event === "extra-life")).toHaveLength(
      1,
    );
    advance(game, 0.1);
    expect(game.collectedCoins).toBe(COINS_PER_LIFE);
    expect(game.events).not.toContain("extra-life");
  });

  it("spends coin thresholds at the life cap instead of banking lives", () => {
    const game = new Game();
    collectCoins(game, COINS_PER_LIFE * 2 + 3);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.coinsTowardLife).toBe(3);
    expect(game.collectedCoins).toBe(103);
    expect(game.events).not.toContain("extra-life");
    game.player.y = 700;
    game.update(1 / 120, idle);
    collectCoins(game, 46);
    expect(game.lives).toBe(2);
    expect(game.coinsTowardLife).toBe(49);
    collectCoins(game, 1);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.coinsTowardLife).toBe(0);
    expect(game.collectedCoins).toBe(150);
  });

  it("grants star power immediately, refreshes it, and expires once", () => {
    const game = new Game();
    collectStar(game);
    expect(game.starPowerRemaining).toBe(STAR_POWER_DURATION);
    game.player.x = 95;
    game.player.y = 392;
    advance(game, 4);
    expect(game.starPowerRemaining).toBeCloseTo(6, 8);
    collectStar(game, 1);
    expect(game.starPowerRemaining).toBe(STAR_POWER_DURATION);
    expect(game.collectedStars).toBe(2);
    game.player.x = 95;
    game.player.y = 392;
    let expirations = 0;
    for (let i = 0; i < (STAR_POWER_DURATION + 1) * 120; i++) {
      game.update(1 / 120, idle);
      if (game.events.includes("star-end")) expirations++;
    }
    expect(game.starPowerRemaining).toBe(0);
    expect(expirations).toBe(1);
    touchEnemy(game);
    expect(game.lives).toBe(2);
  });

  it("uses a same-tick star pickup to squash a touching enemy safely", () => {
    const game = new Game();
    const enemy = game.enemies[0]!;
    game.stars = [{ x: enemy.x + 14, y: 410, collected: false }];
    touchEnemy(game);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.deaths).toBe(0);
    expect(game.starPowerRemaining).toBe(STAR_POWER_DURATION);
    expect(enemy.alive).toBe(false);
    expect(enemy.squashed).toBeGreaterThan(0);
    expect(game.events).toContain("star");
    expect(game.events).toContain("stomp");
    expect(game.events).not.toContain("life-lost");
  });

  it("uses a same-tick diamond pickup to absorb a touching enemy's hit", () => {
    const game = new Game();
    game.diamonds = [{ x: game.enemies[0]!.x + 14, y: 400, collected: false }];
    touchEnemy(game);
    expect(game.events).toContain("grow");
    expect(game.events).toContain("shrink");
    expect(game.events).not.toContain("life-lost");
    expect(game.player.form).toBe("small");
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.diamonds[0]!.collected).toBe(true);
  });

  it("keeps a checkpoint reached on the same tick as a fatal enemy hit", () => {
    const game = new Game();
    const x = game.level.checkpoints[0]!.x;
    game.enemies = [{ ...game.enemies[0]!, x, minX: x, maxX: x, vx: 0 }];
    touchEnemy(game);
    expect(game.events).toContain("checkpoint");
    expect(game.events).toContain("life-lost");
    expect(game.checkpointActive).toBe(true);
    expect(game.player.x).toBe(x);
    expect(game.lives).toBe(2);
  });

  it("squashes every contacted enemy while powered without shrinking", () => {
    const game = new Game();
    collectDiamond(game);
    collectStar(game);
    game.enemies.push({ ...game.enemies[0]! });
    touchEnemy(game);
    expect(game.player.form).toBe("big");
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.enemies[0]!.alive).toBe(false);
    expect(game.enemies.at(-1)!.alive).toBe(false);
    expect(game.events.filter((event) => event === "stomp")).toHaveLength(2);
  });

  it("removes a stomped enemy from collisions while its squash animation fades", () => {
    const game = new Game();
    const enemy = game.enemies[0]!;
    game.player.x = enemy.x;
    game.player.y = enemy.y - game.player.h - 1;
    game.player.vy = 200;
    game.update(1 / 120, idle);
    expect(enemy.alive).toBe(false);
    expect(enemy.squashed).toBeGreaterThan(0.3);
    expect(game.player.vy).toBeLessThan(0);
    touchEnemy(game);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.events).not.toContain("stomp");
    advance(game, 0.5);
    expect(enemy.squashed).toBe(0);
    expect(enemy.alive).toBe(false);
  });

  it("ends on the last life and resets all run state when restarted", () => {
    const game = new Game();
    collectCoins(game, 12);
    for (let i = 0; i < MAX_LIVES; i++) {
      game.player.y = 700;
      game.update(0.1, idle);
    }
    expect(game.lives).toBe(0);
    expect(game.deaths).toBe(MAX_LIVES);
    expect(game.state).toBe("lost");
    expect(game.events).toEqual(["life-lost", "lose"]);
    advance(game, 1);
    expect(game.deaths).toBe(MAX_LIVES);
    game.restart();
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.deaths).toBe(0);
    expect(game.collectedCoins).toBe(0);
    expect(game.coinsTowardLife).toBe(0);
    expect(game.collectedStars).toBe(0);
    expect(game.starPowerRemaining).toBe(0);
    expect(game.player.form).toBe("small");
    expect(
      game.enemies.every((enemy) => enemy.alive && enemy.squashed === 0),
    ).toBe(true);
    expect(game.diamonds.every((diamond) => !diamond.collected)).toBe(true);
  });

  it.each(levels.slice(0, 3))(
    "$name has reachable growth before enemies and after respawn",
    (level) => {
      const game = new Game(level.id - 1);
      advance(game, 0.1);
      walkTo(game, level.diamonds[0]!.x, 430);
      expect(game.player.form).toBe("big");
      expect(game.deaths).toBe(0);
      expect(level.diamonds[0]!.x).toBeLessThan(level.enemies[0]!.minX);
      game.player.x = level.checkpoints[0]!.x;
      game.player.y = 430 - game.player.h;
      game.player.vx = game.player.vy = 0;
      game.update(1 / 120, idle);
      expect(game.checkpointActive).toBe(true);
      game.player.y = 700;
      game.update(1 / 120, idle);
      expect(game.player.form).toBe("small");
      expect(game.player.x).toBe(level.checkpoints[0]!.x);
      walkTo(game, level.diamonds[1]!.x, 430);
      expect(game.player.form).toBe("big");
      expect(game.lives).toBe(2);
      expect(game.diamonds[1]!.collected).toBe(true);
    },
  );

  it("produces the same result at 30 Hz and 120 Hz", () => {
    const a = new Game();
    const b = new Game();
    const input = { ...idle, right: true };
    for (let i = 0; i < 15; i++) a.update(1 / 30, input);
    advance(b, 0.5, input);
    expect(a.player.x).toBeCloseTo(b.player.x, 8);
    expect(a.player.y).toBeCloseTo(b.player.y, 8);
  });

  it.each(levels.slice(0, 3))(
    "$name has jumpable gaps or reachable bridge routes and three firefly secrets",
    (level) => {
      expect(level.fireflies).toHaveLength(3);
      const ground = level.platforms.filter((p) => p.kind === "ground");
      for (let i = 1; i < ground.length; i++) {
        const left = ground[i - 1]!;
        const right = ground[i]!;
        if (right.x - left.x - left.w <= 180) continue;
        // Wider crossings need an actual ascending approach and bridge. A route
        // graph checks conservative jump height/span; full input routes below
        // additionally exercise the timing of the crumbling surface.
        const supports = level.platforms.filter(
          (p) =>
            p.kind !== "brick" &&
            p.kind !== "moving" &&
            p.x >= left.x &&
            p.x <= right.x &&
            p.y <= 430,
        );
        const reached = new Set<Platform>([left]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const from of reached) {
            for (const to of supports) {
              if (reached.has(to) || to.x < from.x) continue;
              const gap = Math.max(0, to.x - from.x - from.w);
              const rise = from.y - to.y;
              if (rise <= 135 && gap <= (rise > 80 ? 100 : 180)) {
                reached.add(to);
                changed = true;
              }
            }
          }
        }
        expect(
          reached.has(right),
          `Unbridged gap at ${left.x + left.w}..${right.x}`,
        ).toBe(true);
      }
      expect(
        ground.some(
          (p) => level.goal.x >= p.x && level.goal.x + 60 <= p.x + p.w,
        ),
      ).toBe(true);
    },
  );
});

// Focused feature arenas exercise the shipped physics without relying on the
// authored route timing. Full adventures are covered separately in route tests.
function arena(overrides: Partial<Level> = {}) {
  const original = levels[0]!;
  levels.push({
    ...original,
    width: 2000,
    spawn: { x: 95, y: 392 },
    platforms: [{ x: 0, y: 430, w: 2000, h: 200, kind: "ground" }],
    enemies: [],
    coins: [],
    stars: [],
    fireflies: [],
    diamonds: [],
    checkpoints: [],
    goal: { x: 1900, y: 430 },
    ...overrides,
  });
  const game = new Game(levels.length - 1);
  levels.pop();
  return game;
}

const floor: Platform = { x: 0, y: 430, w: 2000, h: 200, kind: "ground" };
const enemySpawn = (kind: EnemyKind, x = 500) => ({
  kind,
  x,
  y: 402,
  minX: x - 100,
  maxX: x + 100,
});

describe("Long-adventure mechanics", () => {
  it("advances checkpoints in order and never sends a backtracking player backward", () => {
    const game = arena({
      checkpoints: [
        { x: 250, y: 430 },
        { x: 600, y: 430 },
      ],
    });
    advance(game, 0.1);
    walkTo(game, 250, 430);
    expect(game.activeCheckpointIndex).toBe(0);
    walkTo(game, 600, 430);
    expect(game.activeCheckpointIndex).toBe(1);
    walkTo(game, 250, 430);
    expect(game.activeCheckpointIndex).toBe(1);
    expect(game.events).not.toContain("checkpoint");
    game.player.y = 700;
    game.update(1 / 120, idle);
    expect(game.player.x).toBe(600);
    expect(game.lives).toBe(2);
    game.restart();
    expect(game.activeCheckpointIndex).toBe(-1);
  });

  it.each(levels.slice(0, 3))(
    "$name respawns safely at every checkpoint and restores nearby diamonds after death",
    (level) => {
      for (const [index, checkpoint] of level.checkpoints.entries()) {
        const game = new Game(level.id - 1);
        game.player.x = checkpoint.x;
        game.player.y = checkpoint.y - game.player.h;
        game.update(1 / 120, idle);
        expect(game.activeCheckpointIndex).toBe(index);
        game.player.y = 700;
        game.update(1 / 120, idle);
        expect(game.player.x).toBe(checkpoint.x);
        const diamond = game.diamonds.find(
          (item) => item.x > checkpoint.x && item.x < checkpoint.x + 150,
        );
        expect(game.player.form).toBe("small");
        if (diamond) {
          walkTo(game, diamond.x, checkpoint.y);
          expect(game.player.form).toBe("big");
        }
        expect(game.deaths).toBe(1);
        expect(game.lives).toBe(2);
      }
    },
  );

  it("keeps firefly rescues through a lost life without granting star power or duplicate rescues", () => {
    const game = arena({ fireflies: [{ x: 109, y: 400 }] });
    game.update(1 / 120, idle);
    expect(game.events).toContain("firefly");
    expect(game.collectedFireflies).toBe(1);
    expect(game.collectedStars).toBe(0);
    expect(game.starPowerRemaining).toBe(0);
    game.player.y = 700;
    game.update(1 / 120, idle);
    advance(game, 0.2);
    expect(game.fireflies[0]!.collected).toBe(true);
    expect(game.collectedFireflies).toBe(1);
    expect(game.events).not.toContain("firefly");
    game.restart();
    expect(game.collectedFireflies).toBe(0);
    expect(game.fireflies[0]!.collected).toBe(false);
  });

  it("makes power stars independent of permanent exploration rewards", () => {
    const game = arena({
      stars: [{ x: 109, y: 400 }],
      fireflies: [{ x: 300, y: 400 }],
    });
    game.update(1 / 120, idle);
    expect(game.collectedFireflies).toBe(0);
    expect(game.starPowerRemaining).toBe(STAR_POWER_DURATION);
    expect(game.events).toContain("star");
  });

  it("launches from mushrooms equally with a released or held jump", () => {
    const heights = [false, true].map((jump) => {
      const game = arena({
        platforms: [floor, { x: 80, y: 400, w: 100, h: 25, kind: "mushroom" }],
      });
      game.player.y = 360;
      game.player.vy = 200;
      game.update(1 / 60, { ...idle, jump });
      expect(game.events).toContain("bounce");
      expect(game.player.vy).toBeLessThan(-780);
      expect(game.player.grounded).toBe(false);
      let top = game.player.y;
      for (let i = 0; i < 100; i++) {
        game.update(1 / 120, { ...idle, jump });
        top = Math.min(top, game.player.y);
      }
      expect(game.deaths).toBe(0);
      return 400 - 38 - top;
    });
    expect(heights[0]).toBeGreaterThan(220);
    expect(heights[0]).toBeCloseTo(heights[1]!, 8);
  });

  it.each(["x", "y"] as const)(
    "carries a standing player smoothly with a moving leaf on the %s axis",
    (axis) => {
      const game = arena({
        platforms: [
          floor,
          {
            x: 80,
            y: 330,
            w: 140,
            h: 20,
            kind: "moving",
            motion: { axis, range: 60, period: 3 },
          },
        ],
      });
      game.player.y = 292;
      game.player.grounded = true;
      const startX = game.player.x;
      const startY = game.player.y;
      advance(game, 0.35);
      const leaf = game.platforms[1]!;
      expect(game.player.x - startX).toBeCloseTo(leaf.x - leaf.baseX, 6);
      expect(game.player.y - startY).toBeCloseTo(leaf.y - leaf.baseY, 6);
      expect(game.player.y + game.player.h).toBeCloseTo(leaf.y, 6);
      expect(game.player.grounded).toBe(true);
    },
  );

  it("does not keep carrying the player after they walk off a leaf", () => {
    const game = arena({
      platforms: [
        floor,
        {
          x: 80,
          y: 330,
          w: 100,
          h: 20,
          kind: "moving",
          motion: { axis: "x", range: 20, period: 3 },
        },
      ],
    });
    game.player.y = 292;
    game.player.grounded = true;
    advance(game, 0.7, { ...idle, right: true });
    expect(game.player.x).toBeGreaterThan(game.platforms[1]!.x + 100);
    advance(game, 0.6);
    expect(game.player.y + game.player.h).toBe(430);
    expect(game.deaths).toBe(0);
  });

  it("stops a leaf rider at a solid side wall without clipping or teleporting", () => {
    const wall: Platform = { x: 180, y: 260, w: 20, h: 80, kind: "brick" };
    const game = arena({
      platforms: [
        floor,
        wall,
        {
          x: 100,
          y: 340,
          w: 120,
          h: 20,
          kind: "moving",
          motion: { axis: "x", range: 80, period: 2 },
        },
      ],
    });
    game.player.x = 145;
    game.player.y = 302;
    game.player.grounded = true;
    for (let frame = 0; frame < 50; frame++) {
      const previousX = game.player.x;
      game.update(1 / 120, idle);
      expect(game.player.x + game.player.w).toBeLessThanOrEqual(wall.x + 1e-6);
      expect(Math.abs(game.player.x - previousX)).toBeLessThan(3);
    }
    expect(game.deaths).toBe(0);
  });

  it("lets an upward leaf pass under a blocked rider without pushing them into a ceiling", () => {
    const ceiling: Platform = { x: 70, y: 220, w: 180, h: 30, kind: "brick" };
    const game = arena({
      platforms: [
        floor,
        ceiling,
        {
          x: 80,
          y: 330,
          w: 140,
          h: 20,
          kind: "moving",
          motion: { axis: "y", range: 80, period: 3, phase: Math.PI },
        },
      ],
    });
    game.player.y = 292;
    game.player.grounded = true;
    let detached = false;
    for (let frame = 0; frame < 180; frame++) {
      const previousY = game.player.y;
      game.update(1 / 120, idle);
      expect(game.player.y).toBeGreaterThanOrEqual(
        ceiling.y + ceiling.h - 1e-6,
      );
      expect(Math.abs(game.player.y - previousY)).toBeLessThan(8);
      if (!game.player.grounded) detached = true;
    }
    expect(detached).toBe(true);
    expect(game.deaths).toBe(0);
  });

  it("warns before a cloud collapses, then returns it after the space is clear", () => {
    const game = arena({
      platforms: [floor, { x: 80, y: 330, w: 130, h: 20, kind: "crumble" }],
    });
    game.player.y = 291;
    game.player.vy = 150;
    game.update(1 / 60, idle);
    const cloud = game.platforms[1]!;
    expect(game.events).toContain("crumble");
    expect(cloud.crumbleRemaining).toBeGreaterThan(0.7);
    advance(game, 0.6);
    expect(game.player.grounded).toBe(true);
    expect(cloud.crumbleRemaining).toBeGreaterThan(0);
    advance(game, 0.3);
    expect(cloud.crumbleRemaining).toBe(0);
    expect(game.player.y + game.player.h).toBeGreaterThan(330);
    advance(game, 3.2);
    expect(cloud.crumbleRemaining).toBe(-1);
    expect(game.player.y + game.player.h).toBe(430);
  });

  it("restores collapsing clouds when a life is lost so the retry route remains usable", () => {
    const game = arena({
      platforms: [floor, { x: 80, y: 330, w: 130, h: 20, kind: "crumble" }],
    });
    game.platforms[1]!.crumbleRemaining = 0;
    game.platforms[1]!.respawnRemaining = 2;
    game.player.y = 700;
    game.update(1 / 120, idle);
    expect(game.platforms[1]!.crumbleRemaining).toBe(-1);
    expect(game.platforms[1]!.respawnRemaining).toBe(0);
  });

  it("a small Pip bumps a cracked block without breaking it", () => {
    const game = arena({
      platforms: [
        floor,
        { x: 80, y: 320, w: 100, h: 24, kind: "brick", rewardCoins: 10 },
      ],
    });
    advance(game, 0.1);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    for (let i = 0; i < 60; i++) {
      game.update(1 / 120, { ...idle, jump: true });
      expect(game.player.y).toBeGreaterThanOrEqual(344);
    }
    expect(game.platforms[1]!.broken).toBe(false);
    expect(game.collectedCoins).toBe(0);
  });

  it("big Pip breaks blocks from below and a coin cache uses the normal capped life threshold exactly once", () => {
    const game = arena({
      diamonds: [{ x: 109, y: 400 }],
      platforms: [
        floor,
        { x: 80, y: 320, w: 100, h: 24, kind: "brick", rewardCoins: 5 },
      ],
    });
    game.player.y = 700;
    game.update(1 / 120, idle);
    collectCoins(game, 49);
    expect(game.player.form).toBe("big");
    expect(game.lives).toBe(2);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    advance(game, 0.12, { ...idle, jump: true });
    expect(game.platforms[1]!.broken).toBe(true);
    expect(game.collectedCoins).toBe(54);
    expect(game.coinsTowardLife).toBe(4);
    expect(game.lives).toBe(3);
    advance(game, 1);
    expect(game.collectedCoins).toBe(54);
    game.player.y = 700;
    game.update(1 / 120, idle);
    expect(game.platforms[1]!.broken).toBe(true);
    advance(game, 0.1);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    advance(game, 1, { ...idle, jump: true });
    expect(game.collectedCoins).toBe(54);
    expect(game.lives).toBe(2);
    game.restart();
    expect(game.platforms[1]!.broken).toBe(false);
    expect(game.collectedCoins).toBe(0);
  });

  it("makes a hopper leave and land on its patrol ground with a readable rest between hops", () => {
    const game = arena({ enemies: [enemySpawn("hopper")] });
    const hopper = game.enemies[0]!;
    advance(game, 0.4);
    expect(hopper.grounded).toBe(true);
    advance(game, 0.3);
    expect(hopper.grounded).toBe(false);
    expect(hopper.y).toBeLessThan(hopper.baseY);
    expect(hopper.vy).toBeLessThan(0);
    advance(game, 0.7);
    expect(hopper.grounded).toBe(true);
    expect(hopper.y).toBe(hopper.baseY);
    expect(hopper.stateTime).toBeGreaterThan(0);
  });

  it("gives a charger a stationary warning before its fast run and recovery", () => {
    const game = arena({
      enemies: [{ ...enemySpawn("charger", 350), minX: 250, maxX: 700 }],
    });
    game.player.x = 130;
    game.update(1 / 120, idle);
    const charger = game.enemies[0]!;
    expect(charger.state).toBe("windup");
    expect(game.events).toContain("charge");
    expect(charger.vx).toBe(0);
    const x = charger.x;
    advance(game, 0.4);
    expect(charger.x).toBe(x);
    advance(game, 0.25);
    expect(charger.state).toBe("charge");
    expect(charger.vx).toBe(-240);
    expect(charger.x).toBeLessThan(x);
    advance(game, 0.5);
    expect(charger.x).toBeGreaterThanOrEqual(charger.minX);
    expect(charger.state).toBe("recover");
    expect(charger.vx).toBe(0);
    expect(game.deaths).toBe(0);
  });

  it.each(["beetle", "hopper", "charger"] as const)(
    "squashes %s from above and bounces Pip",
    (kind) => {
      const game = arena({ enemies: [enemySpawn(kind)] });
      const enemy = game.enemies[0]!;
      game.player.x = enemy.x;
      game.player.y = enemy.y - game.player.h - 1;
      game.player.vy = 240;
      game.update(1 / 60, idle);
      expect(enemy.alive).toBe(false);
      expect(game.events).toContain("stomp");
      expect(game.player.vy).toBeLessThan(0);
      expect(game.lives).toBe(3);
    },
  );

  it.each(["beetle", "hopper", "charger"] as const)(
    "star power defeats %s on side contact",
    (kind) => {
      const game = arena({
        enemies: [enemySpawn(kind)],
        stars: [{ x: 109, y: 400 }],
      });
      game.update(1 / 120, idle);
      touchEnemy(game);
      expect(game.enemies[0]!.alive).toBe(false);
      expect(game.lives).toBe(3);
    },
  );

  it("does not turn an ascending player's side contact with a hopping bug into a stomp", () => {
    const game = arena({ enemies: [enemySpawn("hopper")] });
    const enemy = game.enemies[0]!;
    enemy.grounded = false;
    enemy.y = 365;
    enemy.vy = -300;
    game.player.x = enemy.x;
    game.player.y = 340;
    game.player.vy = -100;
    game.update(1 / 120, idle);
    expect(enemy.alive).toBe(true);
    expect(game.events).not.toContain("stomp");
    expect(game.lives).toBe(2);
  });

  it("runs moving terrain and enemy AI consistently at low and high frame rates", () => {
    const setup: Partial<Level> = {
      platforms: [
        floor,
        {
          x: 80,
          y: 330,
          w: 140,
          h: 20,
          kind: "moving",
          motion: { axis: "x", range: 60, period: 3 },
        },
      ],
      enemies: [enemySpawn("hopper", 600), enemySpawn("charger", 900)],
    };
    const a = arena(setup);
    const b = arena(setup);
    for (const game of [a, b]) {
      game.player.y = 292;
      game.player.grounded = true;
    }
    for (let i = 0; i < 30; i++) a.update(1 / 15, idle);
    advance(b, 2);
    expect(a.player.x).toBeCloseTo(b.player.x, 8);
    expect(a.platforms[1]!.x).toBeCloseTo(b.platforms[1]!.x, 8);
    expect(a.enemies[0]!.x).toBeCloseTo(b.enemies[0]!.x, 8);
    expect(a.enemies[0]!.y).toBeCloseTo(b.enemies[0]!.y, 8);
  });
});
