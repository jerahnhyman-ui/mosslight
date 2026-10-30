import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels, groveLevel, challengeLevels, type Level } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input: GameInput = idle) =>
  game.update(1 / 120, input);
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
/** Earn a reward with the same underside jump a player uses. */
function bumpReward(game: Game, blockX: number) {
  const block = game.platforms.find(
    (tile) => tile.rewardPower === "diamond" && tile.x === blockX,
  );
  expect(block).toBeDefined();
  walkTo(game, block!.x + block!.w / 2 - game.player.w / 2, 430);
  tick(game, { ...idle, jump: true, jumpPressed: true });
  for (let n = 0; n < 150; n++) tick(game, { ...idle, jump: true });
  expect(block!.rewardUsed).toBe(true);
  expect(game.player.form).toBe("big");
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

/** Read the fight and use only the same directional/jump input available to players. */
function defeatBossAndFinish(game: Game) {
  const phases = new Set<number>();
  const events = new Set<string>();
  for (let frame = 0; frame < 120 * 90 && game.state === "playing"; frame++) {
    const boss = game.boss!;
    const p = game.player;
    phases.add(boss.phase);
    let target =
      boss.state === "defeated"
        ? game.level.goal.x
        : boss.x + (boss.w - p.w) / 2;
    let shouldJump = boss.state !== "defeated";
    if (boss.kind === "stag" && boss.state === "attack")
      target += boss.facing * 120;
    if (boss.kind === "moth" && boss.state !== "defeated") {
      if (boss.state === "warning" || boss.state === "attack")
        target = boss.attackTargetX - 140;
      shouldJump = boss.state === "recover";
    }
    tick(game, {
      ...steer(game, target),
      jump: true,
      jumpPressed: p.grounded && shouldJump,
    });
    for (const event of game.events) events.add(event);
  }
  expect(
    game.state,
    `${game.level.name}: complete the fight and reach the finish`,
  ).toBe("won");
  expect(game.boss?.health).toBe(0);
  expect(phases).toEqual(new Set([1, 2, 3]));
  expect(events.has("boss-warning")).toBe(true);
  expect(events.has("boss-hit")).toBe(true);
  expect(events.has("boss-defeat")).toBe(true);
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

const extensions: RouteStep[][] = [
  [
    [3630, 3970, 205, 3740],
    [null, 4400, 430],
    [4425, 4675, 430],
    [null, 4970, 430],
    [4970, 5090, 340],
    [5150, 5330, 255],
    [null, 5450, 430],
    [5460, 5700, 430],
    [5650, 5820, 340],
    [5860, 6070, 255],
    [6120, 6310, 180],
    [null, 6580, 430],
    [6600, 6870, 430],
    [6940, 7320, 205, 7050],
    [null, 7670, 430],
    [7670, 7920, 430],
    [7900, 8070, 340],
    [null, 8390, 430],
    [8430, 8600, 295],
    [null, 8810, 430],
    [8820, 9080, 430],
    [9050, 9210, 340],
    [9250, 9430, 255],
    [9480, 9660, 185],
    [null, 9870, 430],
    [9880, 10140, 430],
    [10200, 10580, 210, 10310],
    [null, 10990, 430],
    [null, 11040, 430],
  ],
  [
    [null, 4500, 430],
    [4500, 4740, 430],
    [4720, 4870, 340],
    [4920, 5100, "moving"],
    [5100, 5360, 205],
    [null, 5750, 430],
    [5760, 6020, 430],
    [5980, 6130, 340],
    [6190, 6380, 255],
    [6430, 6620, 180],
    [null, 6860, 430],
    [6880, 7140, 430],
    [null, 7400, 430],
    [7410, 7570, 340],
    [7630, 7810, "moving"],
    [7810, 8040, 215],
    [null, 8150, 430],
    [8150, 8400, 430],
    [8370, 8530, 340],
    [8590, 8780, "moving"],
    [8780, 9020, 205],
    [null, 9340, 430],
    [9350, 9610, 430],
    [9590, 9750, 340],
    [9810, 10000, 255],
    [10050, 10250, 175],
    [null, 10510, 430],
    [10520, 10780, 430],
    [10810, 10980, 340],
    [11030, 11220, "moving"],
    [11220, 11500, 205],
    [null, 11850, 295],
    [11850, 12070, 345],
    [null, 12240, 430],
  ],
  [
    [4110, 4260, 340],
    [4310, 4490, 275],
    [4540, 4730, 210],
    [null, 4920, 430],
    [4920, 5190, 430],
    [5170, 5320, 340],
    [5370, 5560, 270],
    [5610, 5820, 200],
    [null, 6280, 430],
    [6280, 6560, 430],
    [6540, 6690, 340],
    [6750, 6940, 255],
    [6990, 7190, 175],
    [null, 7500, 430],
    [7500, 7780, 430],
    [null, 8030, 430],
    [8050, 8200, 340],
    [8250, 8440, 270],
    [8490, 8690, 205],
    [null, 8800, 430],
    [8800, 9080, 430],
    [9060, 9210, 340],
    [9270, 9460, 270],
    [9510, 9720, 195],
    [null, 10060, 430],
    [10060, 10340, 430],
    [10320, 10470, 340],
    [10530, 10720, 255],
    [10770, 10970, 175],
    [null, 11320, 430],
    [11320, 11600, 430],
    [11580, 11740, 340],
    [11800, 11980, 265],
    [12030, 12240, 190],
    [12300, 12530, 255],
    [12580, 12790, 320],
    [12840, 13080, 345],
    [null, 13440, 430],
  ],
];

describe("Long authored adventures", () => {
  it.each(levels.slice(0, 3))(
    "finishes $name and rescues every firefly through real controls",
    (level) => {
      const game = new Game(level.id - 1);
      for (let n = 0; n < 12; n++) tick(game);
      for (const [takeoff, target, y, via] of [
        ...openingRoutes[level.id - 1]!,
        ...extensions[level.id - 1]!,
      ]) {
        if (takeoff === null) walkTo(game, target, y);
        else jumpTo(game, takeoff, target, y, via);
        if (level.id === 1 && target === 1800) bumpReward(game, 1750);
        if (level.id === 1 && target === 4675) bumpReward(game, 4690);
        if (level.id === 2 && target === 3590) bumpReward(game, 3510);
        if (level.id === 3 && target === 1990) bumpReward(game, 1920);
      }
      const lastCheckpoint = level.checkpoints.at(-1)!;
      walkTo(game, lastCheckpoint.x, lastCheckpoint.y);
      defeatBossAndFinish(game);
      expect(
        game.platforms.some(
          (tile) =>
            (tile.kind === "flower" || tile.kind === "curled") && tile.awakened,
        ),
      ).toBe(true);
      expect(game.collectedFireflies).toBe(3);
      expect(game.deaths).toBe(0);
      expect(game.activeCheckpointIndex).toBe(level.checkpoints.length - 1);
      expect(game.elapsed).toBeGreaterThan(45);
      if (process.env.REPORT_ROUTE_TIMES)
        console.info(
          `${level.name}: ${game.elapsed.toFixed(1)}s, ${game.collectedCoins} coins, ${game.collectedStars} power stars`,
        );
    },
  );

  it("lets big Pip break into the Acorn Treasury, collect its coins, and exit", () => {
    const game = new Game(0);
    for (let n = 0; n < 12; n++) tick(game);
    const approach: RouteStep[] = [
      ...openingRoutes[0]!,
      ...extensions[0]!.slice(0, 3),
    ];
    for (const [takeoff, target, y, via] of approach) {
      if (takeoff === null) walkTo(game, target, y);
      else jumpTo(game, takeoff, target, y, via);
    }
    bumpReward(game, 4690);
    walkTo(game, 4870, 430);
    expect(game.player.form).toBe("big");
    const entry = game.platforms.find(
      (t) => t.x === 4840 && t.kind === "brick",
    )!;
    const before = game.collectedCoins;
    expect(entry.broken).toBe(false);
    jumpTo(game, 4870, 4970, 318);
    expect(entry.broken).toBe(true);
    expect(game.collectedCoins).toBeGreaterThanOrEqual(before + 12);
    expect(
      game.coins.some(
        (c) => c.y === 282 && c.x >= 4780 && c.x <= 4980 && c.collected,
      ),
    ).toBe(true);
    walkTo(game, 5090, 340);
    walkTo(game, 5210, 430);
    expect(game.deaths).toBe(0);
    expect(game.player.form).toBe("big");
  });

  it("lets an authored hopper trigger the mushroom beside the canopy route", () => {
    const game = new Game(0);
    for (let n = 0; n < 12; n++) tick(game);
    for (const [takeoff, target, y, via] of [
      ...openingRoutes[0]!,
      ...extensions[0]!.slice(0, 1),
    ]) {
      if (takeoff === null) walkTo(game, target, y);
      else jumpTo(game, takeoff, target, y, via);
    }
    let bounced = false;
    for (let n = 0; n < 120 * 12 && !bounced; n++) {
      tick(game);
      bounced = game.events.includes("hopper-bounce");
    }
    expect(bounced).toBe(true);
    expect(
      game.enemies.some(
        (enemy) => enemy.kind === "hopper" && enemy.alive && enemy.vy < -400,
      ),
    ).toBe(true);
    expect(game.deaths).toBe(0);
  });

  it("uses a living charging beetle to open the authored orchard shortcut", () => {
    const game = new Game(0);
    const gate = game.platforms.find((tile) => tile.enemyBreakable)!;
    expect(gate.broken).toBe(false);
    for (let n = 0; n < 12; n++) tick(game);
    for (const [takeoff, target, y, via] of [
      ...openingRoutes[0]!,
      ...extensions[0]!.slice(0, 14),
    ]) {
      if (takeoff === null) walkTo(game, target, y);
      else jumpTo(game, takeoff, target, y, via);
    }
    const beetle = game.enemies.find(
      (enemy) => enemy.kind === "charger" && enemy.minX === 7310,
    )!;
    expect(beetle.alive).toBe(true);
    walkTo(game, 7670, 430);
    walkTo(game, 7600, 430);
    for (let n = 0; n < 120 * 8 && !gate.broken; n++) tick(game);
    expect(gate.broken).toBe(true);
    expect(beetle.alive).toBe(true);
    expect(game.deaths).toBe(0);
    expect(game.coins.some((coin) => coin.x === 7615 && coin.collected)).toBe(
      true,
    );
  });

  it.each(levels.slice(0, 3))(
    "keeps $name long, readable, and recoverable",
    (level) => {
      expect(level.width).toBeGreaterThanOrEqual(
        [3460, 3740, 4070][level.id - 1]! * 3,
      );
      expect(level.fireflies).toHaveLength(3);
      expect(level.sections.length).toBeGreaterThanOrEqual(4);
      expect(level.checkpoints.length).toBeGreaterThanOrEqual(3);
      const grounds = level.platforms.filter((p) => p.kind === "ground");
      for (const [i, g] of grounds.entries()) {
        if (i) {
          const previousEdge = grounds[i - 1]!.x + grounds[i - 1]!.w;
          let supportedUntil = previousEdge;
          // Long setpiece gaps need an authored platform bridge. The complete
          // input route above also demonstrates the vertical jumps are reachable.
          const bridge = level.platforms
            .filter(
              (tile) =>
                tile.kind !== "ground" &&
                tile.x + tile.w > previousEdge &&
                tile.x < g.x,
            )
            .sort((a, b) => a.x - b.x);
          for (const tile of bridge) {
            if (tile.x - supportedUntil <= 180)
              supportedUntil = Math.max(supportedUntil, tile.x + tile.w);
          }
          expect(
            g.x - supportedUntil,
            `${level.name}: every gap has a reachable landing`,
          ).toBeLessThanOrEqual(180);
        }
      }
      for (const cp of level.checkpoints) {
        expect(
          grounds.some(
            (p) => cp.x >= p.x + 40 && cp.x + 80 < p.x + p.w && cp.y === p.y,
          ),
        ).toBe(true);
        expect(
          level.enemies.some((e) => cp.x + 40 >= e.minX && cp.x <= e.maxX + 32),
        ).toBe(false);
      }
      expect(level.diamonds, `${level.name}: no loose diamonds`).toHaveLength(
        0,
      );
      const diamondBlocks = level.platforms.filter(
        (p) => p.rewardPower === "diamond",
      );
      expect(
        diamondBlocks.length,
        `${level.name}: scarce diamond blocks`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        diamondBlocks.length,
        `${level.name}: scarce diamond blocks`,
      ).toBeLessThanOrEqual(3);
      for (const enemy of level.enemies) {
        expect(
          grounds.some(
            (p) =>
              enemy.minX >= p.x &&
              enemy.maxX + 32 <= p.x + p.w &&
              enemy.y + 28 === p.y,
          ),
        ).toBe(true);
      }
      for (const p of level.platforms.filter((p) => p.kind === "moving")) {
        const m = p.motion!;
        expect(m.period).toBeGreaterThan(0);
        expect(p.y - (m.axis === "y" ? m.range : 0)).toBeGreaterThan(80);
        expect(p.y + p.h + (m.axis === "y" ? m.range : 0)).toBeLessThan(430);
      }
    },
  );
});

describe("Living garden level safety", () => {
  it("gives the first three worlds distinct guardians and safe recovery points", () => {
    expect(levels.map((level) => level.boss?.kind)).toEqual([
      "stag",
      "spider",
      "moth",
      undefined,
    ]);
    for (const level of levels.slice(0, 3)) {
      const boss = level.boss!;
      const checkpoint = level.checkpoints.at(-1)!;
      expect(checkpoint.x).toBeLessThan(boss.minX);
      expect(boss.minX - checkpoint.x).toBeLessThanOrEqual(500);
      expect(level.goal.x).toBeGreaterThan(boss.maxX);
      const floor = level.platforms
        .filter((tile) => tile.kind === "ground" && tile.y === boss.y)
        .sort((a, b) => a.x - b.x);
      let safeUntil = checkpoint.x;
      for (const tile of floor) {
        if (tile.x <= safeUntil && tile.x + tile.w > safeUntil)
          safeUntil = tile.x + tile.w;
      }
      expect(
        safeUntil,
        `${level.name}: uninterrupted arena floor`,
      ).toBeGreaterThan(level.goal.x + 60);
      expect(
        level.platforms.some(
          (block) =>
            block.rewardPower === "diamond" &&
            block.x >= checkpoint.x - 150 &&
            block.x < boss.minX,
        ),
      ).toBe(true);
      expect(
        level.enemies.some(
          (enemy) =>
            enemy.maxX + 32 > checkpoint.x && enemy.minX < level.goal.x,
        ),
      ).toBe(false);
    }
  });

  it.each(levels.slice(0, 3))(
    "places discoverable light routes and landmarks in $name",
    (level) => {
      const plants = level.platforms.filter(
        (tile) => tile.kind === "flower" || tile.kind === "curled",
      );
      expect(plants.length).toBeGreaterThanOrEqual(2);
      expect(level.clues?.length).toBeGreaterThanOrEqual(3);
      expect(level.landmarks?.length).toBeGreaterThanOrEqual(2);
      for (const plant of plants) {
        expect(plant.wakeRadius).toBeGreaterThan(0);
        expect(plant.y).toBeGreaterThan(70);
        expect(plant.x).toBeGreaterThanOrEqual(0);
        expect(plant.x + plant.w).toBeLessThanOrEqual(level.width);
      }
      for (const clue of level.clues ?? []) {
        expect(clue.x).toBeGreaterThanOrEqual(0);
        expect(clue.x).toBeLessThan(level.width);
        expect(clue.text.length).toBeGreaterThan(8);
      }
    },
  );

  it("provides a safe playable home and three separate challenge rooms", () => {
    expect(groveLevel.kind).toBe("grove");
    expect(groveLevel.enemies).toHaveLength(0);
    expect(groveLevel.boss).toBeUndefined();
    expect(groveLevel.coins).toHaveLength(0);
    expect(challengeLevels).toHaveLength(3);
    expect(new Set(challengeLevels.map((level) => level.name)).size).toBe(3);
    for (const level of challengeLevels) {
      expect(level.kind).toBe("challenge");
      expect(level.challengeTime).toBeGreaterThan(0);
      expect(level.goal.x).toBeGreaterThan(level.spawn.x + 500);
      expect(level.goal.x + 60).toBeLessThan(level.width);
      expect(level.fireflies).toHaveLength(0);
    }
  });
});

const challengeRoutes: RouteStep[][] = [
  [
    [160, 310, 340],
    [350, 530, 265],
    [null, 650, 430],
    [650, 960, 205, 730],
    [null, 1210, 295],
    [1230, 1360, 430],
    [1360, 1690, 205, 1450],
    [null, 1850, 430],
    [1840, 1970, 310],
    [null, 2190, 430],
  ],
  [
    [140, 290, 340],
    [340, 510, "moving"],
    [510, 760, 205],
    [780, 940, "moving"],
    [970, 1225, 340],
    [1270, 1470, "moving"],
    [1470, 1720, 205],
    [1770, 1960, "moving"],
    [2010, 2250, 340],
    [null, 2410, 430],
  ],
  [
    [150, 300, 340],
    [350, 550, 275],
    [600, 780, 340],
    [null, 1300, 340],
    [1300, 1540, 340],
    [1580, 1790, 265],
    [1840, 2045, 195],
    [null, 2280, 310],
    [null, 2510, 430],
  ],
];
describe("Playable rewards", () => {
  it.each(challengeLevels.map((level, index) => ({ level, index })))(
    "finishes $level.name using normal input within the gold target",
    ({ level, index }) => {
      const game = new Game(index, { level, mode: "timed" });
      for (let n = 0; n < 12; n++) tick(game);
      for (const [takeoff, target, y, via] of challengeRoutes[index]!) {
        if (takeoff === null) walkTo(game, target, y);
        else jumpTo(game, takeoff, target, y, via);
      }
      expect(game.state).toBe("won");
      expect(game.deaths).toBe(0);
      expect(game.collectedCoins).toBeGreaterThan(10);
      expect(game.elapsed).toBeLessThanOrEqual(level.challengeTime!);
      if (process.env.REPORT_ROUTE_TIMES)
        console.info(
          `${level.name}: ${game.elapsed.toFixed(1)}s / gold ${level.challengeTime}s`,
        );
    },
  );

  it("lets Pip explore the home grove without ending the run or farming coins", () => {
    const game = new Game(0, { level: groveLevel });
    for (let n = 0; n < 12; n++) tick(game);
    walkTo(game, 1810, 430);
    for (let n = 0; n < 120; n++) tick(game, { ...idle, right: true });
    expect(game.state).toBe("playing");
    expect(game.deaths).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.collectedCoins).toBe(0);
    expect(
      game.platforms.some((tile) => tile.kind === "flower" && tile.awakened),
    ).toBe(true);
  });
});
