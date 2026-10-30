import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
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
    name: "Mill Keeper arena",
    subtitle: "",
    width: 960,
    theme: "windmill",
    spawn: { x: 200, y: 432 },
    platforms: [{ x: 0, y: 470, w: 960, h: 200, kind: "ground" }],
    coins: [],
    stars: [],
    diamonds: big ? [{ x: 214, y: 450 }] : [],
    enemies: [],
    fireflies: [],
    checkpoints: [],
    sections: [],
    boss: {
      kind: "millkeeper",
      name: "Mill Keeper",
      x: 428,
      y: 470,
      minX: 140,
      maxX: 840,
    },
    goal: { x: 910, y: 470 },
  };
}
function step(game: Game, input = idle) {
  game.update(1 / 120, input);
}

describe("Mill Keeper ordinary movement", () => {
  it.each([false, true])(
    "lets %s form stand safely beneath a high sweep without a feather",
    (big) => {
      const game = new Game(0, { level: arena(big) });
      for (let i = 0; i < 30; i++) step(game);
      expect(game.player.form).toBe(big ? "big" : "small");
      expect(game.hasWindFeather).toBe(false);
      Object.assign(game.boss!, {
        phase: 2,
        state: "warning",
        millState: "highWarning",
        stateTime: 1 / 120,
        facing: -1,
      });
      let passedPlayer = false;
      for (let i = 0; i < 360; i++) {
        step(game);
        const wave = game.hazards.find((h) => h.kind === "sweep");
        if (
          wave &&
          wave.x < game.player.x + game.player.w &&
          wave.x + wave.w > game.player.x
        )
          passedPlayer = true;
        if (game.boss!.millState === "betweenSweeps") break;
      }
      expect(passedPlayer).toBe(true);
      expect(game.deaths).toBe(0);
      expect(game.player.form).toBe(big ? "big" : "small");
      expect(game.boss!.millState).toBe("betweenSweeps");
    },
  );

  it.each([false, true])(
    "lets %s form jump a low sweep using a single ordinary jump",
    (big) => {
      const game = new Game(0, { level: arena(big) });
      for (let i = 0; i < 30; i++) step(game);
      Object.assign(game.boss!, {
        phase: 1,
        state: "warning",
        millState: "lowWarning",
        stateTime: 1 / 120,
        facing: -1,
      });
      let jumped = false,
        airborne = 0;
      for (let i = 0; i < 360; i++) {
        const wave = game.hazards.find((h) => h.kind === "sweep");
        if (!jumped && wave && wave.x - (game.player.x + game.player.w) < 95) {
          jumped = true;
          airborne = 1;
          step(game, { ...idle, jump: true, jumpPressed: true });
        } else if (airborne) {
          airborne++;
          step(game, { ...idle, jump: airborne <= 55 });
        } else step(game);
        if (game.boss!.millState === "recover") break;
      }
      expect(jumped).toBe(true);
      expect(game.deaths).toBe(0);
      expect(game.player.form).toBe(big ? "big" : "small");
      expect(game.hasWindFeather).toBe(false);
      expect(game.boss!.millState).toBe("recover");
    },
  );
});
