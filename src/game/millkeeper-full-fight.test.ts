import { describe, expect, it } from "vitest";
import { Game } from "./engine";
import { windmillLevel } from "./expansion-levels";

const origin = 11520;
function arena(big: boolean) {
  // Start at the authored checkpoint. The extra diamond prepares the big-form
  // variant without changing the actual arena or any encounter state.
  return {
    ...windmillLevel,
    spawn: { x: origin + 72, y: 432 },
    diamonds: big
      ? [...windmillLevel.diamonds, { x: origin + 120, y: 440 }]
      : windmillLevel.diamonds,
  };
}

describe("Mill Keeper full fight", () => {
  it.each([false, true])(
    "wins from the nest without a star (big=%s)",
    (big) => {
      const game = new Game(0, { level: arena(big) });
      // The actual retry checkpoint puts Pip under the feather block. Bump it
      // before entering the arena, using the same jump input as the player.
      for (let i = 0; i < 30; i++)
        game.update(1 / 120, {
          left: false,
          right: false,
          jump: false,
          jumpPressed: false,
        });
      for (let i = 0; i < 90; i++)
        game.update(1 / 120, {
          left: false,
          right: false,
          jump: i < 35,
          jumpPressed: i === 0,
        });
      expect(game.hasWindFeather).toBe(true);
      const hits: number[] = [];
      const phases = new Set<number>();
      let feather = false;
      let grew = false;
      let jumpKind = "",
        air = 0,
        wasGrounded = false,
        prevJump = false;
      for (
        let frame = 0;
        frame < 120 * 150 &&
        game.state === "playing" &&
        game.boss!.state !== "defeated";
        frame++
      ) {
        const p = game.player,
          b = game.boss!,
          center = p.x + p.w / 2 - origin,
          feet = p.y + p.h;
        phases.add(b.phase);
        feather ||= game.hasWindFeather;
        grew ||= p.form === "big";
        if (p.grounded && !wasGrounded) {
          jumpKind = "";
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
        let target = 350,
          jump = false;
        if (high) target = 210;
        if (onFloor && !high) target = 230;
        if (b.millState === "recover" && !onFloor) target = 480;
        if (b.millState === "vaneOpen" && !onFloor) target = 480;
        if (onFloor && !high && center >= 210 && center < 290 && !jumpKind) {
          jumpKind = "pad";
          air = 0;
        }
        if (onPad && b.millState === "recover" && !jumpKind) {
          jumpKind = "stomp";
          air = 0;
        }
        if (onPad && b.millState === "vaneOpen" && !jumpKind) {
          jumpKind = "vane";
          air = 0;
        }
        if (
          onFloor &&
          high &&
          b.millState === "betweenSweeps" &&
          b.facing > 0 &&
          b.stateTime <= 0.35 &&
          !jumpKind
        ) {
          // A left-origin wave starts near this refuge: use its visible
          // warning to jump before it arrives, rather than reacting at spawn.
          jumpKind = "dodge";
          air = 0;
        }
        if (onFloor && high && b.millState === "lowSweep" && !jumpKind) {
          const wave = game.hazards.find((h) => h.kind === "sweep");
          if (
            wave &&
            Math.abs(wave.x + 24 - origin - center) < 120 &&
            wave.vx * (center - (wave.x + 24 - origin)) > 0
          ) {
            jumpKind = "dodge";
            air = 0;
          }
        }
        if (jumpKind) {
          air++;
          if (jumpKind === "pad") {
            target = 350;
            jump = air <= 55;
          }
          if (jumpKind === "stomp") {
            target = 480;
            jump = air <= 55;
          }
          if (jumpKind === "dodge") {
            target = 210;
            jump = air <= 55;
          }
          if (jumpKind === "vane") {
            target = 480;
            jump = b.millState === "vaneOpen" && (air <= 30 || air >= 32);
          }
        }
        if (b.millState === "recover" && jumpKind === "vane") {
          jump = false;
          target = 480;
        }
        const dx =
          target -
          center -
          (p.vx * Math.abs(p.vx)) / (2 * (p.grounded ? 4200 : 1800));
        game.update(1 / 120, {
          left: dx < -3,
          right: dx > 3,
          jump,
          jumpPressed: jump && !prevJump,
        });
        prevJump = jump;
        if (game.events.includes("boss-hit")) {
          hits.push(game.boss!.health);
          jumpKind = "";
          air = 0;
        }
      }
      expect(game.boss!.state).toBe("defeated");
      expect(hits).toEqual([5, 4, 3, 2, 1, 0]);
      expect(game.deaths).toBe(0);
      expect(feather).toBe(true);
      expect(grew).toBe(big);
      expect(game.player.form).toBe(big ? "big" : "small");
      expect([...phases]).toEqual([1, 2, 3]);
      expect(game.collectedStars).toBe(0);
    },
  );
});
