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

describe("feather flight throughout the garden", () => {
  it.each([...levels, groveLevel])(
    "$name offers a feather on foot from a fresh start, then supports lift, glide, and recharge",
    (level) => {
      const game = new Game(0, { level });
      expect(game.hasWindFeather).toBe(false);
      // Use ordinary movement from the actual spawn; no unlocks or injected power.
      for (let frame = 0; frame < 180 && !game.hasWindFeather; frame++)
        tick(game, { ...idle, right: true });
      expect(game.hasWindFeather).toBe(true);
      expect(game.events).toContain("feather");
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
    "replaces a lost feather safely at every world checkpoint in %s mode",
    (mode) => {
      for (const level of levels) {
        for (const [index, checkpoint] of level.checkpoints.entries()) {
          const game = new Game(0, { level, mode });
          // A checkpoint retry fixture, not a claim of completing the route.
          expect(game.collectedCoins).toBe(0);
          game.activeCheckpointIndex = index;
          game.player.y = 800;
          tick(game);
          expect(game.deaths).toBe(1);
          expect(game.hasWindFeather).toBe(false);
          tick(game, idle, 4);
          const context = `${level.name}, checkpoint ${index + 1}, ${mode}`;
          expect(game.hasWindFeather, context).toBe(true);
          expect(game.liftRemaining, context).toBeCloseTo(1.2);
          expect(game.player.grounded, context).toBe(true);
          expect(game.player.y + game.player.h, context).toBeCloseTo(
            checkpoint.y,
          );
          expect(game.deaths, context).toBe(1);
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
