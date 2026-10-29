import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels } from "./levels";
import { AdventureSession } from "./session";
import { skySecretLevels, type SkySecretTarget } from "./sky-secrets";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input = idle, count = 1) => {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
};
const steer = (game: Game, target: number): GameInput => {
  const p = game.player;
  const delta = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
  return { ...idle, left: delta < -3, right: delta > 3 };
};
function walkTo(game: Game, x: number, feetY: number) {
  for (let n = 0; n < 1800; n++) {
    if (game.deaths) throw new Error(`Death walking to ${x}`);
    if (
      Math.abs(game.player.x - x) < 5 &&
      Math.abs(game.player.vx) < 40 &&
      game.player.grounded &&
      Math.abs(game.player.y + game.player.h - feetY) < 1
    )
      return;
    tick(game, steer(game, x));
  }
  throw new Error(
    `Cannot walk to ${x}: ${game.player.x}, ${game.player.y + game.player.h}`,
  );
}
function jumpTo(
  game: Game,
  takeoff: number,
  target: number,
  feetY: number,
  mushroom?: number,
) {
  const support = game.player.y + game.player.h;
  walkTo(game, takeoff, support);
  let bounced = mushroom === undefined;
  tick(game, {
    ...steer(game, mushroom ?? target),
    jump: true,
    jumpPressed: true,
  });
  for (let n = 0; n < 600; n++) {
    if (game.events.includes("bounce")) bounced = true;
    if (game.deaths) throw new Error(`Death jumping ${takeoff} to ${target}`);
    if (
      n > 12 &&
      bounced &&
      Math.abs(game.player.x - target) < 12 &&
      game.player.grounded &&
      Math.abs(game.player.y + game.player.h - feetY) < 1
    )
      return;
    tick(game, { ...steer(game, bounced ? target : mushroom!), jump: true });
  }
  throw new Error(
    `Cannot jump ${takeoff} to ${target}: ${game.player.x}, ${game.player.y + game.player.h}`,
  );
}
function earnFeather(game: Game) {
  const block = game.level.platforms.find((p) => p.rewardPower === "feather")!;
  const ground = game.level.platforms.find(
    (p) =>
      p.kind === "ground" &&
      p.x <= block.x &&
      p.x + p.w >= block.x + block.w &&
      p.y === block.y + 130,
  )!;
  expect(ground).toBeDefined();
  Object.assign(game.player, {
    x: block.x + 10,
    y: ground.y - game.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
  });
  tick(game, idle, 3);
  tick(game, { ...idle, jump: true, jumpPressed: true });
  for (let n = 0; n < 100 && !game.hasWindFeather; n++)
    tick(game, { ...idle, jump: true });
  expect(game.hasWindFeather).toBe(true);
  tick(game, idle, 100);
}
function flyTo(game: Game, target: number, feetY: number) {
  tick(game, idle, 3);
  tick(game, { ...steer(game, target), jump: true, jumpPressed: true });
  for (let i = 0; i < 24; i++)
    tick(game, { ...steer(game, target), jump: true });
  tick(game, steer(game, target));
  let landed = false;
  for (let i = 0; i < 900; i++) {
    tick(game, { ...steer(game, target), jump: true });
    if (
      game.player.grounded &&
      Math.abs(game.player.y + game.player.h - feetY) < 1
    ) {
      landed = true;
      break;
    }
  }
  expect(
    landed,
    `land at ${target}, ${feetY}; actual ${game.player.x}, ${game.player.y + game.player.h}`,
  ).toBe(true);
  for (let i = 0; i < 90; i++) tick(game, steer(game, target));
  expect(game.player.grounded).toBe(true);
  expect(game.liftRemaining).toBeCloseTo(1.2);
}

describe("Hidden sky routes", () => {
  it.each([
    [0, 3940, 205, 50],
    [1, 4380, 225, 70],
    [2, 4700, 210, 55],
  ] as const)(
    "requires a feather to reach trail %s's first cloud",
    (index, x, departure, first) => {
      const game = new Game(index);
      game.enemies = [];
      Object.assign(game.player, {
        x,
        y: departure - game.player.h,
        vx: 0,
        vy: 0,
        grounded: true,
      });
      tick(game, idle, 15);
      let highestFeet: number = departure;
      for (let frame = 0; frame < 150; frame++) {
        tick(game, { ...idle, jump: true, jumpPressed: frame === 0 });
        highestFeet = Math.min(highestFeet, game.player.y + game.player.h);
      }
      expect(highestFeet).toBeGreaterThan(first);
    },
  );

  it("travels from a fresh Meadow through the feather block, flies to the secret, solves it and returns", () => {
    const parent = new Game(0);
    const session = new AdventureSession(parent);
    const opening = [
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
    ] as const;
    for (let i = 0; i < opening.length; i++) {
      if (i === 7) {
        const feather = parent.level.platforms.find(
          (p) => p.rewardPower === "feather",
        )!;
        walkTo(parent, feather.x + 10, 430);
        tick(parent, { ...idle, jump: true, jumpPressed: true });
        for (let n = 0; n < 100 && !parent.hasWindFeather; n++)
          tick(parent, { ...idle, jump: true });
        expect(parent.hasWindFeather).toBe(true);
        tick(parent, idle, 100);
        walkTo(parent, feather.x - 60, 430);
      }
      const [takeoff, target, y] = opening[i]!;
      if (takeoff === null) walkTo(parent, target, y);
      else jumpTo(parent, takeoff, target, y);
    }
    jumpTo(parent, 3630, 3970, 205, 3740);
    flyTo(parent, 3940, 50);
    flyTo(parent, 4100, -30);
    flyTo(parent, 4190, -110);
    tick(parent, idle, 50);
    expect(parent.portalReady).toBe("sky-meadow");
    tick(parent, { ...idle, jump: true, jumpPressed: true });
    expect(parent.requestedPortal).toBe("sky-meadow");
    const secret = session.enter("sky-meadow");
    expect(secret.level.contentId).toBe("secret.sky-meadow");
    expect(secret.hasWindFeather).toBe(true);
    flyTo(secret, 340, 340);
    flyTo(secret, 535, 255);
    flyTo(secret, 800, 340);
    flyTo(secret, 1085, 255);
    flyTo(secret, 1330, 340);
    flyTo(secret, 1585, 255);
    expect(secret.puzzleState.flowers).toEqual({ A: true, B: true, C: true });
    flyTo(secret, 1770, 430);
    walkTo(secret, 2050, 430);
    expect(secret.secretCompleted).toBe(true);
    walkTo(secret, 2190, 430);
    tick(secret, idle, 50);
    expect(secret.portalReady).toBe("return");
    tick(secret, { ...idle, jump: true, jumpPressed: true });
    expect(secret.requestedPortal).toBe("return");
    expect(session.returnToWorld()).toBe(parent);
    expect(parent.deaths).toBe(0);
  });
  it.each([
    [0, 4060, 205],
    [1, 4330, 225],
    [2, 4630, 210],
  ] as const)(
    "can reach the high departure platform from trail %s using flight",
    (index, x, height) => {
      const game = new Game(index);
      game.enemies = [];
      earnFeather(game);
      Object.assign(game.player, {
        x,
        y: 430 - game.player.h,
        vx: 0,
        vy: 0,
        grounded: true,
      });
      tick(game, idle, 15);
      flyTo(game, x, height);
    },
  );

  it.each([
    [
      0,
      "sky-meadow",
      3940,
      205,
      [
        [3940, 50],
        [4100, -30],
        [4190, -110],
      ],
    ],
    [
      1,
      "sky-hollow",
      4380,
      225,
      [
        [4475, 70],
        [4420, -10],
        [4300, -90],
      ],
    ],
    [
      2,
      "sky-cloudtop",
      4700,
      210,
      [
        [4700, 55],
        [4770, -25],
        [4920, -105],
      ],
    ],
  ] as const)(
    "reaches %s by feather, landing to recharge on every cloud",
    (index, target, anchorX, anchorY, ledges) => {
      const game = new Game(index);
      game.enemies = [];
      earnFeather(game);
      Object.assign(game.player, {
        x: anchorX,
        y: anchorY - game.player.h,
        vx: 0,
        vy: 0,
        grounded: true,
      });
      tick(game, idle, 15);
      expect(game.player.grounded).toBe(true);
      for (const [x, y] of ledges) flyTo(game, x, y);
      tick(game, idle, 50);
      expect(game.portalReady).toBe(target);
    },
  );

  it.each(
    Object.entries(skySecretLevels) as [
      SkySecretTarget,
      (typeof skySecretLevels)[SkySecretTarget],
    ][],
  )(
    "keeps %s gate shut until its own sky puzzle is solved",
    (target, level) => {
      const game = new Game(0, { level });
      game.enemies = [];
      earnFeather(game);
      const gate = () => game.platforms.find((p) => p.id === `gate.${target}`)!;
      expect(gate().broken).toBe(false);
      flyTo(game, 340, 340);
      flyTo(game, 535, 255);
      flyTo(game, 800, 340);
      flyTo(game, 1085, 255);
      if (target === "sky-meadow") {
        expect(gate().broken).toBe(false);
        flyTo(game, 1330, 340);
        flyTo(game, 1585, 255);
      }
      expect(gate().broken).toBe(true);
    },
  );

  it.each(
    Object.entries(skySecretLevels) as [
      SkySecretTarget,
      (typeof skySecretLevels)[SkySecretTarget],
    ][],
  )(
    "keeps %s feather recovery earned and reachable after a retry",
    (_target, level) => {
      expect(level.diamonds).toEqual([]);
      expect(level.stars).toEqual([]);
      expect(level.featherFountains ?? []).toEqual([]);
      const game = new Game(0, { level, mode: "relaxed" });
      earnFeather(game);
      game.activeCheckpointIndex = 1;
      game.player.y = 800;
      tick(game);
      expect(game.hasWindFeather).toBe(false);
      tick(game, idle, 3);
      tick(game, { ...idle, jump: true, jumpPressed: true });
      for (let n = 0; n < 100 && !game.hasWindFeather; n++)
        tick(game, { ...idle, jump: true });
      expect(game.hasWindFeather).toBe(true);
    },
  );
});
