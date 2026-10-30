import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { createThornKingRun, readyForThornKing } from "./boss-level";
import { beehiveLevel, flowerHoopsLevel, windmillLevel } from "./levels";
import { AdventureSession } from "./session";

// These routes use only the public directional/jump input. They never set the
// player, collectible, puzzle, or boss state to force a result.
const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
function steer(g: Game, x: number): GameInput {
  const p = g.player;
  const delta = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / (2 * 1850);
  return { ...idle, left: delta < -2, right: delta > 2 };
}
function step(g: Game, input: GameInput = idle) {
  g.update(1 / 120, input);
}
function settle(g: Game, ticks = 30) {
  for (let i = 0; i < ticks; i++) step(g);
}
function walk(g: Game, x: number, y: number) {
  for (let i = 0; i < 1800; i++) {
    const p = g.player;
    if (g.minigame.finished || g.state === "won") return;
    if (g.state !== "playing")
      throw new Error(
        `state ${g.state} walking to ${x} at ${g.player.x.toFixed(1)},${g.player.y.toFixed(1)}, checkpoint ${g.activeCheckpointIndex}, deaths ${g.deaths}`,
      );
    if (
      Math.abs(p.x + p.w / 2 - x) < 6 &&
      Math.abs(p.vx) < 35 &&
      p.grounded &&
      Math.abs(p.y + p.h - y) < 2
    )
      return;
    step(g, steer(g, x));
  }
  throw new Error(
    `walk ${x},${y}: at ${g.player.x.toFixed(1)},${(g.player.y + g.player.h).toFixed(1)} state ${g.state}`,
  );
}
function jump(g: Game, x: number, y: number, lift = false, short = false) {
  step(g, { ...steer(g, x), jump: true, jumpPressed: true });
  for (let i = 0; i < 600; i++) {
    const p = g.player;
    if (g.minigame.finished || g.state === "won") return;
    if (g.state !== "playing")
      throw new Error(`state ${g.state} jumping to ${x}`);
    if (
      i > 12 &&
      p.grounded &&
      Math.abs(p.x + p.w / 2 - x) < 12 &&
      Math.abs(p.y + p.h - y) < 2
    ) {
      settle(g);
      return;
    }
    const held = lift ? i >= 35 && i < 170 : !short;
    step(g, { ...steer(g, x), jump: held });
  }
  throw new Error(
    `jump ${x},${y}: at ${g.player.x.toFixed(1)},${(g.player.y + g.player.h).toFixed(1)}; feather ${g.hasWindFeather}, lives ${g.lives}, deaths ${g.deaths}`,
  );
}

function defeatMill(g: Game) {
  const base = 11520;
  const hits: number[] = [];
  const stompTakeoffs: number[] = [];
  let kind = "",
    air = 0,
    wasGrounded = false,
    prevJump = false;
  for (
    let frame = 0;
    frame < 120 * 150 && g.state === "playing" && g.boss!.state !== "defeated";
    frame++
  ) {
    const p = g.player,
      b = g.boss!,
      center = p.x + p.w / 2 - base;
    const feet = p.y + p.h;
    if (p.grounded && !wasGrounded) {
      kind = "";
      air = 0;
    }
    wasGrounded = p.grounded;
    const onFloor = p.grounded && Math.abs(feet - 470) < 2;
    let target = 250,
      jump = false;
    if (b.state === "recover" && onFloor && !kind) {
      target = 385;
      if (Math.abs(center - 385) < 10 && Math.abs(p.vx) < 50) {
        kind = "stomp";
        stompTakeoffs.push(feet);
      }
    }
    if (
      onFloor &&
      !kind &&
      b.millState === "betweenSweeps" &&
      b.facing > 0 &&
      b.stateTime <= 0.35
    )
      kind = "dodge";
    if (onFloor && !kind && b.millState === "lowSweep") {
      const wave = g.hazards.find((h) => h.kind === "sweep");
      if (
        wave &&
        Math.abs(wave.x + 24 - base - center) < 120 &&
        wave.vx * (center - (wave.x + 24 - base)) > 0
      )
        kind = "dodge";
    }
    if (kind) {
      air++;
      if (kind === "stomp") {
        target = air < 26 ? 385 : 480;
        jump = air <= 55;
      } else {
        target = 250;
        jump = air <= 55;
      }
    }
    const dx =
      target -
      center -
      (p.vx * Math.abs(p.vx)) / (2 * (p.grounded ? 4200 : 1800));
    g.update(1 / 120, {
      left: dx < -3,
      right: dx > 3,
      jump,
      jumpPressed: jump && !prevJump,
    });
    prevJump = jump;
    if (g.events.includes("boss-hit")) {
      hits.push(g.boss!.health);
      kind = "";
      air = 0;
    }
  }
  expect(hits).toEqual([5, 4, 3, 2, 1, 0]);
  expect(stompTakeoffs).toEqual([470, 470, 470, 470, 470, 470]);
  expect(g.boss!.state).toBe("defeated");
}

/** Read Briarheart's warnings and dodge incoming seeds using player inputs. */
function defeatHeartwoodAndFinish(g: Game) {
  const hits: number[] = [];
  const phases = new Set<number>();
  for (let frame = 0; frame < 120 * 150 && g.state === "playing"; frame++) {
    const b = g.boss!,
      p = g.player;
    expect(b.kind).toBe("heartwood");
    phases.add(b.phase);
    const target =
      b.state === "defeated"
        ? g.level.goal.x
        : b.state === "recover"
          ? b.x + (b.w - p.w) / 2
          : b.x - 110;
    const dx = target - p.x - (p.vx * Math.abs(p.vx)) / 3700;
    const incoming = g.hazards.some(
      (h) => h.vx < 0 && h.x > p.x && h.x - (p.x + p.w) < 25,
    );
    const jump = b.state === "recover" || incoming || !p.grounded;
    step(g, {
      left: dx < -2,
      right: dx > 2,
      jump,
      jumpPressed: jump && p.grounded,
    });
    if (g.events.includes("boss-hit")) hits.push(g.boss!.health);
  }
  expect(g.state, `Briarheart fight hits: ${hits.join(", ")}`).toBe("won");
  expect(hits).toEqual([5, 4, 3, 2, 1, 0]);
  expect(phases).toEqual(new Set([1, 2, 3]));
}

function completeHive(g: Game) {
  if (!g.hasWindFeather) {
    walk(g, 174, 430);
    jump(g, 174, 430);
    expect(g.hasWindFeather).toBe(true);
    walk(g, 220, 430);
  }
  jump(g, 270, 350);
  jump(g, 520, 270);
  jump(g, 830, 330, true);
  jump(g, 1440, 330, true);
  jump(g, 1800, 350, true);
  walk(g, 2040, 430);
  jump(g, 2180, 350);
  jump(g, 2440, 270);
  jump(g, 2680, 350, true);
  jump(g, 2770, 430, true);
  expect(g.secretCompleted).toBe(true);
}

describe("Windmill Garden real-input routes", () => {
  it("keeps each checkpoint outside enemy patrols and safe while the player recovers", () => {
    for (const checkpoint of windmillLevel.checkpoints) {
      for (const enemy of windmillLevel.enemies) {
        expect(
          checkpoint.x + 28 < enemy.minX - 24 || checkpoint.x > enemy.maxX + 56,
          `${checkpoint.x} overlaps the ${enemy.kind} patrol`,
        ).toBe(true);
      }
      // Run actual enemy behavior with the authored positions; isolate the
      // checkpoint from the bosses so this measures ordinary respawn safety.
      const game = new Game(3, {
        level: {
          ...windmillLevel,
          spawn: { x: checkpoint.x, y: checkpoint.y - 38 },
          checkpoints: [checkpoint],
          boss: undefined,
          finalBoss: undefined,
        },
      });
      settle(game, 480);
      expect(game.deaths, `unsafe checkpoint at ${checkpoint.x}`).toBe(0);
      expect(game.player.form, `unsafe checkpoint at ${checkpoint.x}`).toBe(
        "small",
      );
    }
  });

  it.each([
    {
      name: "Clover Crossing",
      checkpoint: 1250,
      edge: 1300,
      route: (g: Game) => {
        walk(g, 1270, 430);
        jump(g, 1390, 380);
        jump(g, 1570, 430);
      },
    },
    {
      name: "Sail Run",
      checkpoint: 1992,
      edge: 2250,
      route: (g: Game) => {
        walk(g, 2250, 430);
        jump(g, 2410, 350);
        jump(g, 2660, 310);
      },
    },
    {
      name: "Millstream",
      checkpoint: 5832,
      edge: 6070,
      route: (g: Game) => {
        walk(g, 6070, 430);
        for (let i = 0; i < 600; i++) {
          if (
            g.platforms.find((p) => p.id === "windmill.sail.millstream")!.x <=
            6120
          )
            break;
          step(g);
        }
        jump(g, 6200, 350);
        jump(g, 6500, 430);
      },
    },
    {
      name: "Sunpetal Crossing",
      checkpoint: 7752,
      edge: 7930,
      route: (g: Game) => {
        walk(g, 7810, 430);
        jump(g, 7900, 300);
        jump(g, 8090, 360);
        jump(g, 8370, 350);
      },
    },
  ])(
    "retries $name after a fall without a feather",
    ({ checkpoint, edge, route }) => {
      const g = new Game(3, {
        level: {
          ...windmillLevel,
          spawn: { x: checkpoint, y: 392 },
          checkpoints: [{ x: checkpoint, y: 430 }],
          enemies: [],
          boss: undefined,
          finalBoss: undefined,
        },
      });
      settle(g);
      expect(g.hasWindFeather).toBe(false);
      walk(g, edge, 430);
      for (let i = 0; i < 900 && g.deaths === 0; i++)
        step(g, { ...idle, right: true });
      expect(g.deaths).toBe(1);
      expect(g.hasWindFeather).toBe(false);
      settle(g);
      route(g);
      expect(g.deaths).toBe(1);
      expect(g.state).toBe("playing");
    },
  );

  it("reaches and defeats the sub-boss from a fresh start without a feather", () => {
    const g = new Game(3);
    settle(g);
    walk(g, 680, 430);
    jump(g, 910, 430);
    walk(g, 1270, 430);
    jump(g, 1390, 380);
    jump(g, 1570, 430);
    jump(g, 1870, 430);
    walk(g, 2250, 430);
    jump(g, 2410, 350);
    jump(g, 2660, 310);
    walk(g, 3070, 430);
    jump(g, 3150, 350);
    walk(g, 3220, 350);
    jump(g, 3390, 250);
    jump(g, 3670, 330);
    walk(g, 4000, 430);
    jump(g, 4300, 490);
    walk(g, 4490, 490);
    jump(g, 4650, 430);
    walk(g, 5370, 430);
    jump(g, 5500, 300);
    jump(g, 5700, 350);
    walk(g, 6070, 430);
    for (let i = 0; i < 600; i++) {
      if (
        g.platforms.find((p) => p.id === "windmill.sail.millstream")!.x <= 6120
      )
        break;
      step(g);
    }
    jump(g, 6200, 350);
    jump(g, 6500, 430);
    walk(g, 7810, 430);
    jump(g, 7900, 300);
    jump(g, 8090, 360);
    for (let i = 0; i < 600 && g.player.x + g.player.w / 2 < 8115; i++) step(g);
    jump(g, 8350, 350);
    jump(g, 8800, 430);
    jump(g, 9000, 350);
    jump(g, 9140, 250);
    jump(g, 9500, 320);
    walk(g, 9950, 430);
    jump(g, 10080, 430);
    walk(g, 10680, 430);
    jump(g, 10950, 430);
    walk(g, 11560, 470);
    expect(g.hasWindFeather).toBe(false);
    expect(g.deaths).toBe(0);
    expect(g.boss?.kind).toBe("millkeeper");
    let largestStep = 0;
    for (let i = 0; i < 240 && g.boss?.state === "dormant"; i++) {
      const previousX = g.player.x;
      step(g, { ...idle, right: true });
      largestStep = Math.max(largestStep, Math.abs(g.player.x - previousX));
    }
    expect(g.boss?.state).not.toBe("dormant");
    expect(largestStep).toBeLessThan(8);
    expect(g.hasWindFeather).toBe(false);
    expect(g.level.checkpoints[g.activeCheckpointIndex]!.x).toBeLessThan(
      g.boss!.minX,
    );
    defeatMill(g);
    expect(g.hasWindFeather).toBe(false);
    expect(g.deaths).toBe(0);
  });

  it("keeps a usable upper checkpoint when returning from the beehive and falling", () => {
    const g = new Game(3, {
      level: {
        ...windmillLevel,
        spawn: { x: 6900, y: 392 },
        enemies: [],
        boss: undefined,
        finalBoss: undefined,
      },
    });
    settle(g);
    jump(g, 7050, 350);
    jump(g, 7260, 310);
    jump(g, 7500, 270);
    expect(g.activeCheckpointIndex).toBeGreaterThanOrEqual(
      g.level.checkpoints.findIndex((point) => point.x === 7445),
    );
    settle(g, 50);
    expect(g.portalReady).toBe("beehive");
    const session = new AdventureSession(g);
    const hive = session.enterBeehive();
    completeHive(hive);
    walk(hive, 2810, 430);
    settle(hive, 50);
    expect(hive.portalReady).toBe("return");
    step(hive, { ...idle, jump: true, jumpPressed: true });
    expect(session.returnToWorld()).toBe(g);
    walk(g, 7800, 300);
    jump(g, 7900, 300);
    expect(g.activeCheckpointIndex).toBe(
      g.level.checkpoints.findIndex((point) => point.x === 7900),
    );
    walk(g, 7940, 300);
    for (let i = 0; i < 600; i++) {
      if (g.platforms.find((p) => p.id === "windmill.sail.sunpetal")!.x >= 8060)
        break;
      step(g);
    }
    for (let i = 0; i < 120 && g.player.x <= 7970; i++)
      step(g, { ...idle, right: true });
    for (let i = 0; i < 300 && g.deaths === 0; i++) step(g);
    expect(g.deaths).toBe(1);
    expect(g.hasWindFeather).toBe(false);
    expect(g.player.x).toBeCloseTo(7900);
    expect(g.player.y + g.player.h).toBeCloseTo(300);
    settle(g);
    jump(g, 8090, 360);
    jump(g, 8370, 430);
    expect(g.deaths).toBe(1);
  });

  it("completes the rebuilt world, finds all fireflies and beehive, and defeats both bosses", () => {
    const g = new Game(3);
    settle(g);
    walk(g, 680, 430);
    jump(g, 910, 430);
    walk(g, 1184, 430);
    jump(g, 1184, 430);
    expect(g.hasWindFeather).toBe(true);
    walk(g, 1270, 430);
    jump(g, 1390, 380);
    jump(g, 1570, 430);
    jump(g, 1870, 430);
    walk(g, 2100, 430);
    walk(g, 2250, 430);
    jump(g, 2410, 350);
    jump(g, 2660, 310, true);
    walk(g, 2950, 430);
    walk(g, 3070, 430);
    jump(g, 3150, 350);
    jump(g, 3390, 250, true);
    expect(g.collectedFireflies).toBe(1);
    jump(g, 3670, 330);
    walk(g, 4000, 430);
    jump(g, 4300, 490);
    walk(g, 4490, 490);
    jump(g, 4650, 430);
    walk(g, 5000, 430);
    walk(g, 5220, 430);
    walk(g, 5370, 430);
    jump(g, 5500, 300);
    expect(g.collectedFireflies).toBe(2);
    jump(g, 5700, 350);
    walk(g, 6070, 430);
    jump(g, 6260, 350);
    jump(g, 6500, 300);
    walk(g, 6900, 430);
    jump(g, 7050, 350);
    jump(g, 7260, 310);
    jump(g, 7500, 270);
    settle(g, 50);
    expect(g.puzzleState.hiveDiscovered).toBe(true);
    expect(g.portalReady).toBe("beehive");
    step(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.requestedPortal).toBe("beehive");
    const session = new AdventureSession(g);
    const hive = session.enterBeehive();
    expect(session.inSecret).toBe(true);
    completeHive(hive);
    walk(hive, 2810, 430);
    settle(hive, 50);
    expect(hive.portalReady).toBe("return");
    step(hive, { ...idle, jump: true, jumpPressed: true });
    expect(hive.requestedPortal).toBe("return");
    expect(session.returnToWorld()).toBe(g);
    expect(session.inSecret).toBe(false);
    walk(g, 7800, 300);
    jump(g, 7900, 300);
    expect(g.activeCheckpointIndex).toBeGreaterThanOrEqual(
      g.level.checkpoints.findIndex((point) => point.x === 7900),
    );
    jump(g, 8090, 360);
    jump(g, 8370, 350, true);
    jump(g, 8800, 430);
    jump(g, 9000, 350);
    jump(g, 9140, 250, true);
    expect(g.collectedFireflies).toBe(3);
    jump(g, 9500, 320);
    walk(g, 9950, 430);
    jump(g, 10080, 430);
    walk(g, 10680, 430);
    jump(g, 10950, 430);
    walk(g, 11690, 470);
    defeatMill(g);
    walk(g, 13040, 470);
    expect(readyForThornKing(g)).toBe(true);
    const arena = createThornKingRun(g.mode, g);
    expect(arena.lives).toBe(g.lives);
    expect(arena.collectedCoins).toBe(g.collectedCoins);
    expect(arena.character).toBe(g.character);
    defeatHeartwoodAndFinish(arena);
    expect(arena.deaths).toBe(0);
  });
  it("crosses the beehive ledges and reaches the exit on real inputs", () => {
    const g = new Game(0, { level: beehiveLevel });
    settle(g);
    completeHive(g);
  });

  it("finishes all sixteen Petal Post hoops and eight soft landings with real inputs", () => {
    const g = new Game(0, { level: flowerHoopsLevel });
    settle(g, 400);
    for (let cell = 0; cell < 8; cell++) {
      const base = cell * 900;
      if (cell) walk(g, base - 50, 470);
      jump(g, base + 180, 390);
      step(g, { ...steer(g, base + 330), jump: true, jumpPressed: true });
      for (let i = 0; i < 360 && !g.minigame.hoops.has(`hoop.${cell}.a`); i++) {
        const p = g.player,
          cy = p.y + p.h / 2;
        step(g, { ...steer(g, base + (cy > 205 ? 310 : 380)), jump: i >= 35 });
      }
      expect(g.minigame.hoops.has(`hoop.${cell}.a`)).toBe(true);
      for (let i = 0; i < 360 && !g.minigame.hoops.has(`hoop.${cell}.b`); i++) {
        const p = g.player,
          cy = p.y + p.h / 2;
        step(g, steer(g, base + (cy < 265 ? 460 : 550)));
      }
      expect(g.minigame.hoops.has(`hoop.${cell}.b`)).toBe(true);
      walk(g, base + 600, 390);
      settle(g, 30);
      expect(g.minigame.pads.has(`landing.${cell}`)).toBe(true);
    }
    walk(g, 7160, 470);
    expect(g.minigame.complete).toBe(true);
    expect(g.minigame.hoops.size).toBe(16);
    expect(g.minigame.medal).toBe("gold");
  });
});
