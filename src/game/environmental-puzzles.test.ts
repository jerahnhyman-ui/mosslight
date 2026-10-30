import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { moonpoolLevel } from "./moonpool-level";
import { cloudGardenLevel } from "./cloud-garden";
import {
  levels,
  groveLevel,
  challengeLevels,
  beehiveLevel,
  flowerHoopsLevel,
} from "./levels";
import { skySecretLevels } from "./sky-secrets";
import { thornKingLevel } from "./boss-level";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, input: GameInput = idle, count = 1) => {
  for (let i = 0; i < count; i++) game.update(1 / 120, input);
};
describe("environmental traversal", () => {
  it("keeps all playable levels free of switch mechanisms and progress gates", () => {
    const playable = [
      ...levels,
      groveLevel,
      ...challengeLevels,
      beehiveLevel,
      flowerHoopsLevel,
      moonpoolLevel,
      cloudGardenLevel,
      ...Object.values(skySecretLevels),
      thornKingLevel,
    ];
    for (const level of playable) {
      expect(level.mechanisms ?? [], `${level.name} mechanisms`).toHaveLength(
        0,
      );
      expect(level.gates ?? [], `${level.name} progress gates`).toHaveLength(0);
      expect(
        level.flightTarget,
        `${level.name} flight target gate`,
      ).toBeUndefined();
    }
  });
  it("keeps the chosen character and rescued residents across a detour", () => {
    const source = new Game(0, { level: cloudGardenLevel });
    const target = new Game(0, { level: moonpoolLevel });
    source.character = "poppy";
    source.rescuedCreatures = ["frog", "cloudbird"];
    target.transferPlayerFrom(source, { x: 80, feetY: 490 });
    expect(target.character).toBe("poppy");
    expect(target.rescuedCreatures).toEqual(["frog", "cloudbird"]);
    target.rescuedCreatures.push("moth");
    expect(source.rescuedCreatures).toEqual(["frog", "cloudbird"]);
  });

  it("naturally carries Pip upward in both bubble streams", () => {
    for (const x of [770, 1620]) {
      const ordinary = new Game(0, { level: moonpoolLevel });
      const bubbles = new Game(0, { level: moonpoolLevel });
      for (const g of [ordinary, bubbles]) {
        g.player.y = 300;
        g.player.grounded = false;
      }
      ordinary.player.x = 600;
      bubbles.player.x = x;
      tick(ordinary, idle, 60);
      tick(bubbles, idle, 60);
      expect(bubbles.player.y).toBeLessThan(ordinary.player.y - 20);
    }
  });

  it("carries a rider on the naturally drifting cloud bridge", () => {
    const game = new Game(0, { level: cloudGardenLevel });
    const bridge = game.platforms.find(
      (tile) => tile.id === "cloud.cove.bridge",
    )!;
    expect(bridge?.motion).toBeDefined();
    Object.assign(game.player, {
      x: bridge.x + 60,
      y: bridge.y - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    const offset = game.player.x - bridge.x;
    let minX = bridge.x;
    let maxX = bridge.x;
    for (let frame = 0; frame < 600; frame++) {
      tick(game);
      minX = Math.min(minX, bridge.x);
      maxX = Math.max(maxX, bridge.x);
      expect(game.player.grounded).toBe(true);
      expect(game.player.x - bridge.x).toBeCloseTo(offset, 3);
    }
    expect(maxX - minX).toBeGreaterThan(200);
  });

  it("swims under the reef and visits the open frog cove", () => {
    const game = new Game(0, { level: moonpoolLevel });
    const swimTo = (x: number, y: number) => {
      for (let frame = 0; frame < 5000; frame++) {
        const p = game.player;
        const dx = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
        if (Math.abs(x - (p.x + p.w / 2)) < 16 && Math.abs(y - p.y) < 22)
          return;
        tick(game, { ...idle, left: dx < -4, right: dx > 4, jump: p.y > y });
        if (game.deaths) throw new Error(`Lost a life swimming to ${x}, ${y}`);
      }
      throw new Error(
        `Could not swim to ${x}, ${y}: ${game.player.x}, ${game.player.y}`,
      );
    };
    for (const [x, y] of [
      [900, 250],
      [1200, 260],
      [1290, 330],
      [1530, 330],
      [1750, 230],
      [2050, 230],
      [2190, 230],
      [2350, 240],
    ])
      swimTo(x!, y!);
    expect(game.player.x + game.player.w).toBeGreaterThan(2330);
    expect(game.player.x).toBeLessThan(2370);
    expect(game.player.y).toBeLessThan(260);
    expect(game.player.y + game.player.h).toBeGreaterThan(240);
    swimTo(2190, 230);
    expect(game.deaths).toBe(0);
  });
});
