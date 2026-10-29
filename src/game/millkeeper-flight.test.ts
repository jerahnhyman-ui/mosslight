import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { hitBoss } from "./bosses";
import type { Level } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
function arena(big: boolean): Level {
  return {
    id: 99,
    name: "Flight arena",
    subtitle: "",
    width: 960,
    theme: "windmill",
    spawn: { x: 340, y: 352 },
    platforms: [
      { x: 0, y: 470, w: 960, h: 200, kind: "ground" },
      { x: 280, y: 390, w: 140, h: 18, kind: "platform" },
      { x: 540, y: 390, w: 140, h: 18, kind: "platform" },
    ],
    coins: [],
    stars: [],
    diamonds: big ? [{ x: 350, y: 370 }] : [],
    enemies: [],
    fireflies: [],
    checkpoints: [],
    featherFountains: [{ x: 354, y: 390 }],
    sections: [],
    boss: {
      kind: "millkeeper",
      name: "Bramblewing",
      x: 428,
      y: 470,
      minX: 140,
      maxX: 840,
    },
    goal: { x: 910, y: 470 },
  };
}
function tick(game: Game, n: number, input: GameInput = idle) {
  for (let i = 0; i < n; i++) game.update(1 / 120, input);
}

describe("Mill Keeper flight through game input", () => {
  it("lets the player steer off the pad into a floor refuge before the high sweep", () => {
    const game = new Game(0, { level: arena(false) });
    tick(game, 30);
    const boss = game.boss!;
    for (let i = 0; i < 4; i++) {
      expect(hitBoss(boss, game.player, game.hazards, game.events)).toBe(true);
      tick(game, i % 2 ? 181 : 166);
    }
    expect(boss.millState).toBe("highWarning");
    tick(game, 72, { ...idle, left: true });
    tick(game, 264);
    expect(game.player.x + game.player.w).toBeLessThan(280);
    expect(game.player.y + game.player.h).toBe(470);
    expect(game.deaths).toBe(0);
  });
  it.each([false, true])(
    "a held ordinary jump cannot reach vane height (big=%s)",
    (big) => {
      const game = new Game(0, { level: arena(big) });
      tick(game, 30);
      let highestCenter = Infinity;
      for (let i = 0; i < 90; i++) {
        tick(game, 1, { ...idle, jump: true, jumpPressed: i === 0 });
        highestCenter = Math.min(
          highestCenter,
          game.player.y + game.player.h / 2,
        );
      }
      expect(highestCenter).toBeGreaterThan(205);
      expect(game.glideArmed).toBe(false);
    },
  );
  it.each([false, true])(
    "reaches the open vane with deliberate flight (big=%s)",
    (big) => {
      const game = new Game(0, { level: arena(big) });
      tick(game, 30);
      expect(game.hasWindFeather).toBe(true);
      expect(game.player.form).toBe(big ? "big" : "small");
      const boss = game.boss!;
      hitBoss(boss, game.player, game.hazards, game.events);
      tick(game, 166);
      hitBoss(boss, game.player, game.hazards, game.events);
      tick(game, 360);
      expect(boss.millState).toBe("vaneOpen");
      tick(game, 30, { ...idle, right: true, jump: true, jumpPressed: true });
      tick(game, 1, { ...idle, right: true });
      for (let i = 0; i < 130 && boss.millState === "vaneOpen"; i++) {
        const dx =
          480 -
          (game.player.x + game.player.w / 2) -
          (game.player.vx * Math.abs(game.player.vx)) / (2 * 1800);
        tick(game, 1, {
          left: dx < -2,
          right: dx > 2,
          jump: true,
          jumpPressed: i === 0,
        });
      }
      expect(boss.millState).toBe("recover");
      expect(game.deaths).toBe(0);
    },
  );
});
