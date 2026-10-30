import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { groveLevel } from "./levels";
import { AdventureSession } from "./session";

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
  it("enters Moonpool from the grove, swims the reef, retries, and returns", () => {
    const grove = new Game(0, { level: groveLevel });
    const session = new AdventureSession(grove);
    earnFeather(grove);
    approach(grove, 830);
    expect(grove.hasWindFeather).toBe(true);
    enterPortal(grove, "moonpool");
    const g = session.enter("moonpool");
    expect(g.level.contentId).toBe("secret.moonpool");
    expect(g.hasWindFeather).toBe(true);

    function swimTo(x: number, y: number) {
      for (let n = 0; n < 5000; n++) {
        const p = g.player;
        const dx = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
        if (Math.abs(x - center(g)) < 16 && Math.abs(y - p.y) < 22) return;
        tick(g, { ...idle, left: dx < -4, right: dx > 4, jump: p.y > y });
      }
      throw new Error(
        `Could not swim to ${x}, ${y}: ${g.player.x}, ${g.player.y}`,
      );
    }
    // Above the first rock and below the hanging reef, then hit the second checkpoint.
    for (const [x, y] of [
      [900, 250],
      [1200, 260],
      [1290, 330],
      [1530, 330],
    ])
      swimTo(x!, y!);
    for (let n = 0; n < 400 && g.activeCheckpointIndex !== 1; n++) tick(g);
    expect(g.activeCheckpointIndex).toBe(1);
    g.player.y = 800;
    tick(g);
    expect(g.deaths).toBe(1);
    // A retry starts at the checkpoint and the cove is reachable without a switch.
    for (const [x, y] of [
      [1750, 230],
      [2050, 230],
      [2190, 230],
      [2350, 240],
      [2190, 230],
      [2180, 330],
      [2560, 330],
      [2700, 280],
    ])
      swimTo(x!, y!);
    for (let n = 0; n < 1000 && !g.secretCompleted; n++)
      tick(g, { ...idle, right: true });
    expect(g.secretCompleted).toBe(true);
    approach(g, 2790);
    enterPortal(g, "return");
    expect(session.returnToWorld()).toBe(grove);
    expect(grove.deaths).toBe(1);
  });
});
