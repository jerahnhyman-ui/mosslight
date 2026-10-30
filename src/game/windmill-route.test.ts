import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { createThornKingRun, readyForThornKing } from "./boss-level";
import { beehiveLevel, flowerHoopsLevel } from "./levels";
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
  const base = 11520,
    hits: number[] = [];
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
      center = p.x + p.w / 2 - base,
      feet = p.y + p.h;
    if (p.grounded && !wasGrounded) {
      kind = "";
      air = 0;
    }
    wasGrounded = p.grounded;
    const onPad = p.grounded && Math.abs(feet - 390) < 2;
    const onFloor = p.grounded && Math.abs(feet - 470) < 2;
    const high =
      b.phase === 3 &&
      [
        "transition",
        "highWarning",
        "highSweep",
        "betweenSweeps",
        "lowSweep",
      ].includes(b.millState!);
    const body = b.x + b.w / 2 - base;
    let target = 350,
      jump = false;
    if (high) target = 210;
    if (onFloor && !high) target = 230;
    if ((b.millState === "recover" || b.millState === "vaneOpen") && !onFloor)
      target = body;
    if (onFloor && !high && center >= 210 && center < 290 && !kind) {
      kind = "pad";
      air = 0;
    }
    if (onPad && b.millState === "recover" && !kind) {
      kind = "stomp";
      air = 0;
    }
    if (onPad && b.millState === "vaneOpen" && !kind) {
      kind = "vane";
      air = 0;
    }
    if (
      onFloor &&
      high &&
      b.millState === "betweenSweeps" &&
      b.facing > 0 &&
      b.stateTime <= 0.35 &&
      !kind
    ) {
      kind = "dodge";
      air = 0;
    }
    if (onFloor && high && b.millState === "lowSweep" && !kind) {
      const wave = g.hazards.find((h) => h.kind === "sweep");
      if (
        wave &&
        Math.abs(wave.x + 24 - base - center) < 120 &&
        wave.vx * (center - (wave.x + 24 - base)) > 0
      ) {
        kind = "dodge";
        air = 0;
      }
    }
    if (kind) {
      air++;
      if (kind === "pad") {
        target = 350;
        jump = air <= 55;
      }
      if (kind === "stomp") {
        target = body;
        jump = air <= 55;
      }
      if (kind === "dodge") {
        target = 210;
        jump = air <= 55;
      }
      if (kind === "vane") {
        target = body;
        jump = b.millState === "vaneOpen" && (air <= 30 || air >= 32);
      }
    }
    if (b.millState === "recover" && kind === "vane") {
      jump = false;
      target = body;
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
  jump(g, 520, 270, false, true);
  expect(g.puzzleState.flowers.A).toBe(true);
  jump(g, 830, 330, true);
  jump(g, 1440, 330, true);
  jump(g, 1440, 330, false, true);
  expect(g.puzzleState.flowers.B).toBe(true);
  jump(g, 1800, 350, true);
  walk(g, 2040, 430);
  jump(g, 2180, 350);
  jump(g, 2440, 270);
  jump(g, 2440, 270, false, true);
  expect(g.puzzleState.flowers.C).toBe(true);
  walk(g, 2750, 430);
  expect(g.secretCompleted).toBe(true);
}

describe("Windmill Garden real-input routes", () => {
  it("returns a fallen player to the sail checkpoint with a recoverable feather", () => {
    const g = new Game(3);
    settle(g);
    walk(g, 1184, 430);
    jump(g, 1184, 430);
    jump(g, 1600, 310, true);
    walk(g, 1750, 310);
    walk(g, 2000, 430);
    expect(g.activeCheckpointIndex).toBe(1);
    // Walking straight at the crossing is not a bypass; a fall returns to
    // the checkpoint and removes the feather as in ordinary play.
    for (let i = 0; i < 900 && g.deaths === 0; i++)
      step(g, { ...idle, right: true });
    expect(g.deaths).toBe(1);
    expect(g.hasWindFeather).toBe(false);
    settle(g);
    walk(g, 2040, 430);
    jump(g, 2040, 430);
    expect(g.hasWindFeather).toBe(true);
    walk(g, 2120, 430);
    jump(g, 2180, 350);
    jump(g, 2420, 350);
    jump(g, 2700, 270, true);
    expect(g.deaths).toBe(1);
  });

  it("completes the world, hive detour, all fireflies and guardian using only inputs", () => {
    const g = new Game(3);
    settle(g);
    walk(g, 1184, 430);
    jump(g, 1184, 430);
    expect(g.hasWindFeather).toBe(true);
    walk(g, 1250, 430);
    jump(g, 1600, 310, true);
    walk(g, 1750, 310);
    walk(g, 2000, 430);
    walk(g, 2120, 430);
    jump(g, 2180, 350);
    jump(g, 2420, 350);
    jump(g, 2700, 270, true);
    jump(g, 3350, 250, true);
    walk(g, 3390, 250);
    expect(g.collectedFireflies).toBe(1);
    walk(g, 3800, 430);
    walk(g, 4000, 430);
    jump(g, 4000, 430, false, true);
    expect(g.puzzleState.water).toBe("HIGH");
    walk(g, 4180, 490);
    jump(g, 4470, 330, true);
    jump(g, 4640, 270);
    jump(g, 4640, 270, false, true);
    expect(g.puzzleState.sluiceGateOpen).toBe(true);
    jump(g, 4960, 330, true);
    jump(g, 5300, 330, true);
    jump(g, 5570, 350, true);
    walk(g, 5760, 430);
    walk(g, 5440, 490);
    expect(g.puzzleState.water).toBe("LOW");
    walk(g, 5220, 490);
    expect(g.collectedFireflies).toBe(2);
    walk(g, 5390, 490);
    jump(g, 5570, 350, true);
    walk(g, 5760, 430);
    walk(g, 5940, 430);
    jump(g, 5940, 430, false, true);
    expect(g.puzzleState.water).toBe("HIGH");
    walk(g, 6100, 430);
    jump(g, 6100, 430, false, true);
    expect(g.puzzleState.shutter).toBe("BRIDGE");
    jump(g, 5980, 350);
    jump(g, 6260, 270, true);
    jump(g, 6260, 270, false, true);
    expect(g.puzzleState.lightGateOpen).toBe(true);
    walk(g, 6800, 430);
    walk(g, 6880, 430);
    jump(g, 6880, 430, false, true);
    // Step off and return to make a second deliberate switch activation.
    walk(g, 6800, 430);
    walk(g, 6880, 430);
    jump(g, 6880, 430, false, true);
    expect(g.puzzleState.wind).toBe("WEST");
    walk(g, 7040, 430);
    jump(g, 7040, 430, false, true);
    walk(g, 7200, 430);
    jump(g, 7200, 430, false, true);
    settle(g, 150);
    expect(g.puzzleState.hiveDiscovered).toBe(true);
    jump(g, 7310, 350);
    jump(g, 7500, 270);
    settle(g, 50);
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
    walk(g, 7900, 430);
    jump(g, 7920, 350);
    jump(g, 8150, 270);
    jump(g, 8560, 230, true);
    jump(g, 8750, 230, true);
    jump(g, 9140, 250, true);
    expect(g.collectedFireflies).toBe(3);
    walk(g, 9510, 430);
    walk(g, 9780, 430);
    jump(g, 9900, 390);
    jump(g, 10080, 430, true);
    expect(g.puzzleState.workshopGateOpen).toBe(true);
    // Jump over the late charger and hopper rather than relying on the old
    // floor diamonds to absorb hits on the way to the Mill Keeper.
    jump(g, 10300, 390);
    walk(g, 10530, 430);
    jump(g, 10820, 430);
    walk(g, 11690, 470);
    defeatMill(g);
    walk(g, 12460, 470);
    expect(g.state).toBe("playing");
    walk(g, 12800, 470);
    expect(g.activeCheckpointIndex).toBe(g.level.checkpoints.length - 1);
    walk(g, 13040, 470);
    expect(readyForThornKing(g)).toBe(true);
    const arena = createThornKingRun(g.mode, g);
    expect(arena.lives).toBe(g.lives);
    expect(arena.collectedCoins).toBe(g.collectedCoins);
    expect(arena.character).toBe(g.character);
    expect(arena.activeCheckpointIndex).toBe(0);
    defeatHeartwoodAndFinish(arena);
    expect(arena.deaths).toBe(0);
  });
  it("lights all three hive flowers and reaches the exit on real inputs", () => {
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
