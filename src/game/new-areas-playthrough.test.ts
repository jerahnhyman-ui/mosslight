import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { groveLevel } from "./levels";
import { AdventureSession } from "./session";
import { cloudGardenLevel } from "./cloud-garden";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (g: Game, input: GameInput = idle) => g.update(1 / 120, input);
const center = (g: Game) => g.player.x + g.player.w / 2;

function approach(g: Game, x: number, limit = 1500) {
  for (let n = 0; n < limit; n++) {
    const delta = x - center(g);
    if (Math.abs(delta) < 8 && Math.abs(g.player.vx) < 10) return;
    tick(g, { ...idle, right: delta > 8, left: delta < -8 });
  }
  throw new Error(
    `Could not reach ${x}: at ${center(g)} feet ${g.player.y + g.player.h}`,
  );
}

function earnFeather(g: Game) {
  const block = g.level.platforms.find(
    (tile) => tile.rewardPower === "feather",
  )!;
  expect(block).toBeDefined();
  approach(g, block.x + block.w / 2);
  tick(g, { ...idle, jump: true, jumpPressed: true });
  for (let n = 0; n < 100 && !g.hasWindFeather; n++)
    tick(g, { ...idle, jump: true });
  expect(g.hasWindFeather).toBe(true);
  for (let n = 0; n < 100; n++) tick(g);
}

function enterPortal(g: Game, target: string) {
  for (let n = 0; n < 90 && g.portalReady !== target; n++) tick(g);
  expect(g.portalReady).toBe(target);
  tick(g, { ...idle, jump: true, jumpPressed: true });
  expect(g.requestedPortal).toBe(target);
}

describe("new secret area playthrough", () => {
  it("flies to all three cloud flowers, opens the sanctuary and returns", () => {
    const g = new Game(0, { level: cloudGardenLevel });
    for (let n = 0; n < 10; n++) tick(g);
    earnFeather(g);
    for (const flower of g.level.mechanisms!) {
      approach(g, flower.x - 25);
      for (let n = 0; n < 300 && !g.player.grounded; n++) tick(g);
      for (let n = 0; n < 30; n++) tick(g);
      tick(g, { ...idle, jump: true, jumpPressed: true });
      for (let n = 0; n < 20; n++) tick(g, { ...idle, jump: true });
      tick(g);
      tick(g, { ...idle, jump: true, jumpPressed: true });
      for (let n = 0; n < 140 && g.player.y + g.player.h > flower.y - 8; n++)
        tick(g, { ...idle, jump: true });
      expect(g.player.y + g.player.h, flower.id).toBeLessThan(flower.y);
      for (let n = 0; n < 500 && !g.puzzleState.flowers[flower.flower!]; n++) {
        const delta = flower.x - center(g);
        tick(g, { ...idle, right: delta > 8, left: delta < -8 });
      }
      expect(g.puzzleState.flowers[flower.flower!], flower.id).toBe(true);
    }
    approach(g, 2420);
    expect(g.secretCompleted).toBe(true);
    enterPortal(g, "return");
  });

  it("does not let feather flight bypass the closed Moonpool gate", () => {
    const grove = new Game(0, { level: groveLevel });
    const session = new AdventureSession(grove);
    earnFeather(grove);
    approach(grove, 830);
    enterPortal(grove, "moonpool");
    const g = session.enter("moonpool");
    // Swim above both new rock walls without touching the puzzle switches.
    for (let n = 0; n < 2500 && center(g) < 2490; n++)
      tick(g, { ...idle, jump: true, right: true });
    expect(center(g)).toBeGreaterThanOrEqual(2490);
    for (let n = 0; n < 500 && g.player.y + g.player.h > 185; n++)
      tick(g, { ...idle, jump: true });
    tick(g);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    for (let n = 0; n < 150; n++) tick(g, { ...idle, jump: true, right: true });
    expect(g.puzzleState.sluiceGateOpen).toBe(false);
    expect(g.player.x + g.player.w).toBeLessThanOrEqual(2600.001);
  });

  it("enters Moonpool, tries the latch before its valve, solves the water puzzle and returns", () => {
    const grove = new Game(0, { level: groveLevel });
    const session = new AdventureSession(grove);
    earnFeather(grove);
    approach(grove, 830);
    expect(grove.hasWindFeather).toBe(true);
    enterPortal(grove, "moonpool");
    const g = session.enter("moonpool");
    expect(g.level.contentId).toBe("secret.moonpool");

    const valve = g.level.mechanisms!.find((m) => m.kind === "water")!;
    const latch = g.level.mechanisms!.find((m) => m.kind === "sluice")!;
    for (const mechanism of [latch, valve, latch]) {
      // Ascend in water before steering over each shelf; release to land.
      for (
        let n = 0;
        n < 800 && g.player.y + g.player.h >= mechanism.y - 5;
        n++
      )
        tick(g, { ...idle, jump: true });
      expect(g.player.y + g.player.h).toBeLessThan(mechanism.y);
      for (let n = 0; n < 2500 && Math.abs(center(g) - mechanism.x) > 8; n++) {
        const delta = mechanism.x - center(g);
        tick(g, { ...idle, jump: true, right: delta > 8, left: delta < -8 });
      }
      for (
        let n = 0;
        n < 600 &&
        !(
          g.player.grounded &&
          Math.abs(g.player.y + g.player.h - mechanism.y) < 2
        );
        n++
      ) {
        const delta = mechanism.x - center(g);
        tick(g, { ...idle, right: delta > 8, left: delta < -8 });
      }
      expect(g.player.y + g.player.h, mechanism.id).toBeCloseTo(mechanism.y);
      if (mechanism === valve) {
        expect(g.puzzleState.water).toBe("HIGH");
        // Exercise a checkpoint retry after the valve is set. The reset must
        // retain puzzle progress so the latch can still be reached and opened.
        g.player.y = 800;
        tick(g);
        expect(g.deaths).toBe(1);
        expect(g.puzzleState.water).toBe("HIGH");
      } else
        expect(g.puzzleState.sluiceGateOpen).toBe(
          g.puzzleState.water === "HIGH",
        );
    }
    approach(g, 2790);
    expect(g.secretCompleted).toBe(true);
    enterPortal(g, "return");
    expect(session.returnToWorld()).toBe(grove);
    expect(grove.deaths).toBe(1);
  });
});
