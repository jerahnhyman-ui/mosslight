import { describe, expect, it } from "vitest";
import { Game, type GameInput, type RunMode } from "./engine";
import { levels, groveLevel, challengeLevels } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
function tick(game: Game, input = idle, count = 1) {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
}

function steer(game: Game, targetX: number): GameInput {
  const p = game.player;
  const stop = (p.vx * Math.abs(p.vx)) / (2 * 1850);
  const delta = targetX - p.x - stop;
  return { ...idle, left: delta < -2, right: delta > 2 };
}
function supported(game: Game, y: number | "moving") {
  const p = game.player;
  if (!p.grounded) return false;
  return typeof y === "number"
    ? Math.abs(p.y + p.h - y) < 1
    : game.platforms.some(
        (t) =>
          t.kind === "moving" &&
          p.x < t.x + t.w &&
          p.x + p.w > t.x &&
          Math.abs(p.y + p.h - t.y) < 1,
      );
}
function walkTo(game: Game, x: number, y: number | "moving") {
  for (let n = 0; n < 1800; n++) {
    if (game.state === "won") return;
    if (game.deaths)
      throw new Error(
        `Death walking to ${x}; player ${game.player.x}, ${game.player.y}`,
      );
    if (
      Math.abs(game.player.x - x) < 5 &&
      Math.abs(game.player.vx) < 40 &&
      supported(game, y)
    )
      return;
    tick(game, steer(game, x));
  }
  throw new Error(
    `Cannot walk to ${x}, ${y}; at ${game.player.x}, ${game.player.y + game.player.h}`,
  );
}
function jumpTo(
  game: Game,
  takeoff: number,
  target: number,
  y: number | "moving",
  viaMushroom?: number,
) {
  const support = supported(game, "moving")
    ? "moving"
    : game.player.y + game.player.h;
  walkTo(game, takeoff, support);
  let bounced = viaMushroom === undefined;
  tick(game, {
    ...steer(game, viaMushroom ?? target),
    jump: true,
    jumpPressed: true,
  });
  for (let n = 0; n < 600; n++) {
    if (game.events.includes("bounce")) bounced = true;
    if (game.state === "won") return;
    if (game.deaths)
      throw new Error(
        `Death jumping ${takeoff}→${target}; player ${game.player.x}, ${game.player.y}`,
      );
    if (
      n > 12 &&
      bounced &&
      Math.abs(game.player.x - target) < 12 &&
      supported(game, y)
    )
      return;
    tick(game, { ...steer(game, bounced ? target : viaMushroom!), jump: true });
  }
  throw new Error(
    `Cannot jump ${takeoff}→${target}, ${y}; at ${game.player.x}, ${game.player.y + game.player.h}`,
  );
}

type RouteStep = [
  takeoff: number | null,
  target: number,
  landingY: number | "moving",
  mushroomX?: number,
];
const openingRoutes: RouteStep[][] = [
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

describe("feather flight throughout the garden", () => {
  it.each([...levels, groveLevel])(
    "$name offers a feather on foot from a fresh start, then supports lift, glide, and recharge",
    (level) => {
      const game = new Game(0, { level });
      expect(game.hasWindFeather).toBe(false);
      const feather = level.platforms.find(
        (tile) => tile.rewardPower === "feather",
      )!;
      expect(feather).toBeDefined();
      // Travel from the real spawn using ordinary directional and jump inputs.
      const worldIndex = levels.indexOf(level);
      const route =
        worldIndex === 0
          ? openingRoutes[0]!.slice(0, 7)
          : worldIndex === 1
            ? ([
                ...openingRoutes[1]!.slice(0, 16),
                [3100, 3121, 340],
                ...openingRoutes[1]!.slice(17),
              ] as RouteStep[])
            : worldIndex === 2
              ? ([
                  ...openingRoutes[2]!.slice(0, 17),
                  [3296, 3521, 320],
                  ...openingRoutes[2]!.slice(19),
                ] as RouteStep[])
              : worldIndex === 3
                ? ([[650, 900, 430]] as RouteStep[])
                : [];
      for (const [takeoff, target, y, mushroom] of route) {
        if (takeoff === null) walkTo(game, target, y);
        else jumpTo(game, takeoff, target, y, mushroom);
      }
      const groundY = 430;
      walkTo(game, feather.x + 10, groundY);
      tick(game, { ...idle, jump: true, jumpPressed: true });
      for (let frame = 0; frame < 80 && !game.hasWindFeather; frame++)
        tick(game, { ...idle, jump: true });
      expect(game.hasWindFeather).toBe(true);
      expect(game.events).toContain("feather");
      tick(game, idle, 100);
      walkTo(game, feather.x + (worldIndex === 1 ? 70 : -60), groundY);
      expect(game.deaths).toBe(0);
      tick(game, idle, 24);
      tick(game, { ...idle, jump: true, jumpPressed: true });
      tick(game, { ...idle, jump: true }, 30);
      expect(game.liftActive).toBe(false);
      expect(game.liftRemaining).toBeCloseTo(1.2);
      tick(game);
      const takeoffY = game.player.y;
      tick(game, { ...idle, jump: true, jumpPressed: true });
      tick(game, { ...idle, jump: true }, 60);
      expect(game.liftActive).toBe(true);
      expect(game.player.y).toBeLessThan(takeoffY - 60);
      expect(game.liftRemaining).toBeLessThan(1.2);
      tick(game);
      expect(game.glideArmed).toBe(true);
      expect(game.liftActive).toBe(false);
      tick(game, idle, 360);
      expect(game.player.grounded).toBe(true);
      expect(game.liftRemaining).toBeCloseTo(1.2);
      expect(game.deaths).toBe(0);
    },
  );

  it.each(["classic", "relaxed", "timed"] satisfies RunMode[])(
    "keeps checkpoint retries safe without granting an automatic feather in %s mode",
    (mode) => {
      for (const level of levels) {
        for (const [index, checkpoint] of level.checkpoints.entries()) {
          const game = new Game(0, { level, mode });
          game.activeCheckpointIndex = index;
          game.player.y = 800;
          tick(game);
          expect(game.deaths).toBe(1);
          expect(game.hasWindFeather).toBe(false);
          tick(game, idle, 4);
          const context = `${level.name}, checkpoint ${index + 1}, ${mode}`;
          expect(game.hasWindFeather, context).toBe(false);
          expect(game.player.grounded, context).toBe(true);
          expect(game.player.y + game.player.h, context).toBeCloseTo(
            checkpoint.y,
          );
          expect(game.lives, context).toBe(mode === "relaxed" ? 3 : 2);
        }
      }
    },
  );

  it("keeps the three timed challenge courses free of feather power", () => {
    for (const level of challengeLevels) {
      expect(level.featherFountains ?? []).toHaveLength(0);
      const game = new Game(0, { level, mode: "timed" });
      tick(game, idle, 30);
      expect(game.hasWindFeather).toBe(false);
    }
  });
});
