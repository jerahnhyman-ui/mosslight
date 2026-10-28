import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";

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
  it.each(levels)(
    "completes $name and collects all stars using real controls",
    (level) => {
      const game = new Game(level.id - 1);
      advance(game, 0.1);
      for (const [takeoff, target, y] of routes[level.id - 1]!) {
        if (takeoff === null) walkTo(game, target, y);
        else jumpTo(game, takeoff, target, y);
      }
      expect(game.state).toBe("won");
      expect(game.collectedStars).toBe(3);
      expect(game.health).toBeGreaterThan(0);
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
    expect(game.health).toBe(3);
    const next = game.enemies[1]!;
    game.player.x = next.x;
    game.player.y = next.y;
    game.player.vy = 0;
    game.update(1 / 60, idle);
    expect(game.health).toBe(2);
    expect(game.player.invulnerable).toBeGreaterThan(1);
    game.update(1 / 60, idle);
    expect(game.health).toBe(2);
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
    game.player.x = game.enemies[0]!.x;
    game.update(1 / 120, idle);
    expect(game.events).toContain("hurt");
    expect(game.player.grounded).toBe(false);
    game.update(1 / 120, { ...idle, jump: true, jumpPressed: true });
    expect(game.events).not.toContain("jump");
    expect(game.player.vy).toBeLessThan(0);
    expect(game.player.vy).toBeGreaterThan(-350);
  });

  it("respawns at an activated checkpoint, keeps collectibles, and ends at zero hearts", () => {
    const game = new Game();
    game.player.x = game.level.checkpoint.x;
    game.update(1 / 60, idle);
    expect(game.checkpointActive).toBe(true);
    game.collectedCoins = 4;
    game.player.y = 700;
    game.update(1 / 60, idle);
    expect(game.health).toBe(2);
    expect(game.deaths).toBe(1);
    expect(game.player.x).toBe(game.level.checkpoint.x);
    expect(game.collectedCoins).toBe(4);
    for (let i = 0; i < 2; i++) {
      game.player.y = 700;
      game.update(1 / 60, idle);
    }
    expect(game.state).toBe("lost");
    expect(game.health).toBe(0);
    game.restart();
    expect(game.state).toBe("playing");
    expect(game.health).toBe(3);
    expect(game.checkpointActive).toBe(false);
    expect(game.collectedCoins).toBe(0);
  });

  it("wins at the exit and freezes the completed run", () => {
    const game = new Game();
    game.player.x = game.level.goal.x;
    game.update(1 / 60, idle);
    expect(game.state).toBe("won");
    expect(game.events).toContain("win");
    const elapsed = game.elapsed;
    advance(game, 2, { ...idle, right: true });
    expect(game.elapsed).toBe(elapsed);
  });

  it("produces the same result at 30 Hz and 120 Hz", () => {
    const a = new Game();
    const b = new Game();
    const input = { ...idle, right: true };
    for (let i = 0; i < 15; i++) a.update(1 / 30, input);
    advance(b, 0.5, input);
    expect(a.player.x).toBeCloseTo(b.player.x, 8);
    expect(a.player.y).toBeCloseTo(b.player.y, 8);
  });

  it.each(levels)(
    "$name has a reachable ground route and exactly three stars",
    (level) => {
      expect(level.stars).toHaveLength(3);
      const ground = level.platforms.filter((p) => p.kind === "ground");
      for (let i = 1; i < ground.length; i++) {
        expect(
          ground[i]!.x - ground[i - 1]!.x - ground[i - 1]!.w,
        ).toBeLessThanOrEqual(140);
      }
      expect(
        ground.some(
          (p) => level.goal.x >= p.x && level.goal.x + 60 <= p.x + p.w,
        ),
      ).toBe(true);
    },
  );
});
