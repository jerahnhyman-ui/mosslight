import { describe, expect, it } from "vitest";
import { AdventureSession } from "./session";
import { Game } from "./engine";
import { windmillLevel, beehiveLevel } from "./expansion-levels";
import { RunCoinLedger, readSave } from "../storage";
import { groveLevel, levels } from "./levels";
import { cloudGardenLevel } from "./cloud-garden";
import { moonpoolLevel } from "./moonpool-level";
import { skySecretLevels } from "./sky-secrets";

// Fixture tests exercise the scene handoff directly; these are not full play routes.
function setup() {
  const parent = new Game(0, { level: windmillLevel, mode: "timed" });
  parent.puzzleState.hiveDiscovered = true;
  return { parent, session: new AdventureSession(parent) };
}
function pickup(game: Game, x: number, y: number) {
  game.player.x = x - game.player.w / 2;
  game.player.y = y - game.player.h / 2;
  game.player.vx = game.player.vy = 0;
  game.update(1 / 120, {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
  });
}

describe("AdventureSession scene handoffs", () => {
  it.each([
    [0, "sky-meadow"],
    [1, "sky-hollow"],
    [2, "sky-cloudtop"],
  ] as const)(
    "enters %s's hidden sky route and returns to its safe ledge",
    (worldIndex, target) => {
      const parent = new Game(worldIndex, { mode: "relaxed" });
      const session = new AdventureSession(parent);
      const portal = levels[worldIndex].portals!.find(
        (p) => p.target === target,
      )!;
      expect(portal).toBeDefined();
      parent.player.x = portal.x + portal.w / 2 - parent.player.w / 2;
      parent.player.y = portal.y - parent.player.h;
      parent.player.grounded = true;
      const neutral = {
        left: false,
        right: false,
        jump: false,
        jumpPressed: false,
      };
      for (let i = 0; i < 50; i++) parent.update(1 / 120, neutral);
      expect(parent.portalReady).toBe(target);
      parent.update(1 / 120, { ...neutral, jump: true, jumpPressed: true });
      expect(parent.requestedPortal).toBe(target);
      parent.collectedCoins = 17;
      const secret = session.enter(target);
      expect(secret.level).toBe(skySecretLevels[target]);
      expect(secret.collectedCoins).toBe(17);
      secret.collectedCoins = 20;
      expect(session.returnToWorld()).toBe(parent);
      expect(parent.collectedCoins).toBe(20);
      expect(parent.player.y + parent.player.h).toBe(portal.y);
      expect(
        parent.platforms.some(
          (p) =>
            !p.broken &&
            p.y === portal.y &&
            parent.player.x >= p.x &&
            parent.player.x + parent.player.w <= p.x + p.w,
        ),
      ).toBe(true);
      expect(session.enter(target)).toBe(secret);
    },
  );
  it.each([
    ["cloud", cloudGardenLevel],
    ["moonpool", moonpoolLevel],
  ] as const)(
    "enters %s from the grove through the real portal controls and returns safely",
    (target, level) => {
      const parent = new Game(0, { level: groveLevel, mode: "relaxed" });
      const session = new AdventureSession(parent);
      const portal = parent.level.portals!.find((p) => p.target === target)!;
      parent.player.x = portal.x + portal.w / 2 - parent.player.w / 2;
      parent.player.y = portal.y - parent.player.h;
      parent.player.grounded = true;
      for (let i = 0; i < 50; i++)
        parent.update(1 / 120, {
          left: false,
          right: false,
          jump: false,
          jumpPressed: false,
        });
      expect(parent.portalReady).toBe(target);
      parent.update(1 / 120, {
        left: false,
        right: false,
        jump: true,
        jumpPressed: true,
      });
      expect(parent.requestedPortal).toBe(target);
      parent.collectedCoins = 7;
      const detour = session.enter(target);
      expect(detour.level).toBe(level);
      expect(detour.collectedCoins).toBe(7);
      detour.collectedCoins = 9;
      expect(session.returnToWorld()).toBe(parent);
      expect(parent.collectedCoins).toBe(9);
      expect(parent.player.y + parent.player.h).toBe(portal.y);
      expect(
        parent.platforms.some(
          (p) =>
            !p.broken &&
            p.y === portal.y &&
            parent.player.x >= p.x &&
            parent.player.x + parent.player.w <= p.x + p.w,
        ),
      ).toBe(true);
      expect(session.enter(target)).toBe(detour);
    },
  );
  it("carries resources and clears motion/flight at safe entry and return anchors", () => {
    const { parent, session } = setup();
    const block = parent.platforms.find((p) => p.rewardPower === "feather")!;
    const ground = parent.platforms.find(
      (p) =>
        p.kind === "ground" &&
        p.y === 430 &&
        p.x <= block.x &&
        p.x + p.w >= block.x + block.w,
    )!;
    parent.player.x = block.x + (block.w - parent.player.w) / 2;
    parent.player.y = ground.y - parent.player.h;
    parent.player.grounded = true;
    parent.update(1 / 120, {
      left: false,
      right: false,
      jump: true,
      jumpPressed: true,
    });
    for (let i = 0; i < 90; i++)
      parent.update(1 / 120, {
        left: false,
        right: false,
        jump: true,
        jumpPressed: false,
      });
    expect(parent.hasWindFeather).toBe(true);
    parent.player.form = "big";
    parent.lives = 2;
    parent.deaths = 1;
    parent.elapsed = 47;
    parent.collectedCoins = 37;
    parent.coinsTowardLife = 37;
    parent.collectedStars = 2;
    parent.starPowerRemaining = 4;
    parent.liftActive = true;
    parent.glideArmed = true;
    parent.requestedPortal = "beehive";
    const secret = session.enterBeehive();
    expect(secret.level).toBe(beehiveLevel);
    expect(secret.player.form).toBe("big");
    expect([secret.player.x, secret.player.y + secret.player.h]).toEqual([
      beehiveLevel.spawn.x,
      beehiveLevel.spawn.y + 38,
    ]);
    expect(secret.player.grounded).toBe(true);
    expect([secret.player.vx, secret.player.vy]).toEqual([0, 0]);
    expect([
      secret.lives,
      secret.deaths,
      secret.elapsed,
      secret.collectedCoins,
      secret.coinsTowardLife,
      secret.collectedStars,
      secret.starPowerRemaining,
    ]).toEqual([2, 1, 47, 37, 37, 2, 4]);
    expect(secret.hasWindFeather).toBe(true);
    expect(secret.liftRemaining).toBe(parent.liftRemaining);
    expect(secret.liftActive).toBe(false);
    expect(secret.glideArmed).toBe(false);
    expect(parent.requestedPortal).toBeNull();
    secret.elapsed = 63;
    secret.collectedCoins = 42;
    secret.coinsTowardLife = 42;
    secret.starPowerRemaining = 1;
    secret.requestedPortal = "return";
    expect(session.returnToWorld()).toBe(parent);
    const portal = windmillLevel.portals![0];
    expect([parent.player.x, parent.player.y + parent.player.h]).toEqual([
      portal.x + portal.w + 26,
      portal.y,
    ]);
    expect([
      parent.elapsed,
      parent.collectedCoins,
      parent.coinsTowardLife,
      parent.starPowerRemaining,
    ]).toEqual([63, 42, 42, 1]);
    expect(secret.requestedPortal).toBeNull();
  });

  it("caches the secret and preserves claims while a single ledger credits cumulative coins", () => {
    const { parent, session } = setup();
    const save = readSave();
    const ledger = new RunCoinLedger();
    parent.collectedCoins = 3;
    expect(ledger.collect(save, parent.collectedCoins)).toBe(3);
    const secret = session.enterBeehive();
    const coin = secret.coins[0];
    pickup(secret, coin.x, coin.y);
    expect(coin.collected).toBe(true);
    expect(ledger.collect(save, secret.collectedCoins)).toBe(1);
    session.returnToWorld();
    expect(ledger.collect(save, parent.collectedCoins)).toBe(0);
    expect(session.enterBeehive()).toBe(secret);
    pickup(secret, coin.x, coin.y);
    expect(ledger.collect(save, secret.collectedCoins)).toBe(0);
    expect(save.wallet).toBe(4);
  });

  it("resets parent diamond blocks after a death in the secret and refuses to restore a lost run", () => {
    const { parent, session } = setup();
    const block = parent.platforms.find((p) => p.rewardPower === "diamond")!;
    block.rewardUsed = true;
    parent.diamonds.push({
      x: block.x,
      y: block.y,
      collected: true,
      fromRewardBlock: true,
    });
    const secret = session.enterBeehive();
    secret.deaths++;
    session.returnToWorld();
    expect(block.rewardUsed).toBe(false);
    expect(parent.diamonds.some((d) => d.fromRewardBlock)).toBe(false);
    session.enterBeehive();
    secret.state = "lost";
    expect(session.returnToWorld()).toBe(secret);
    expect(session.inSecret).toBe(true);
  });

  it("clears queued jump edges when revisiting a cached scene", () => {
    const { session } = setup();
    const secret = session.enterBeehive();
    // A sub-step queues a press without simulating it, as a render frame can.
    secret.update(1 / 1000, {
      left: false,
      right: false,
      jump: true,
      jumpPressed: true,
    });
    session.returnToWorld();
    session.enterBeehive();
    secret.update(1 / 120, {
      left: false,
      right: false,
      jump: false,
      jumpPressed: false,
    });
    expect(secret.player.grounded).toBe(true);
    expect(secret.player.vy).toBe(0);
  });

  it("requires discovery and a playing parent before entering", () => {
    const { parent, session } = setup();
    parent.puzzleState.hiveDiscovered = false;
    expect(session.enterBeehive()).toBe(parent);
    parent.puzzleState.hiveDiscovered = true;
    parent.state = "lost";
    expect(session.enterBeehive()).toBe(parent);
  });
});
