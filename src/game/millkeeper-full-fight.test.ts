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
      // Walk from the real checkpoint to the arena's feather block. The
      // guardian can awaken without a feather, but flight must still be earned.
      for (let i = 0; i < 30; i++)
        game.update(1 / 120, {
          left: false,
          right: false,
          jump: false,
          jumpPressed: false,
        });
      expect(game.hasWindFeather).toBe(false);
      for (let i = 0; i < 180 && game.boss!.state === "dormant"; i++)
        game.update(1 / 120, {
          left: false,
          right: true,
          jump: false,
          jumpPressed: false,
        });
      expect(game.boss!.state).not.toBe("dormant");
      expect(game.hasWindFeather).toBe(false);
      for (let i = 0; i < 120 && game.player.x > origin + 150; i++)
        game.update(1 / 120, {
          left: true,
          right: false,
          jump: false,
          jumpPressed: false,
        });
      for (let i = 0; i < 20; i++)
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
      expect(
        game.boss!.state,
        `health=${game.boss!.health}, phase=${game.boss!.phase}, mill=${game.boss!.millState}, player=${game.player.x},${game.player.y}, deaths=${game.deaths}, hits=${hits.join(",")}`,
      ).toBe("defeated");
      expect(hits).toEqual([5, 4, 3, 2, 1, 0]);
      expect(game.deaths).toBe(0);
      expect(feather).toBe(true);
      expect(grew).toBe(big);
      expect(game.player.form).toBe(big ? "big" : "small");
      expect([...phases]).toEqual([1, 2, 3]);
      expect(game.collectedStars).toBe(0);
      const nextCheckpoint = game.level.checkpoints.findIndex(
        (cp) => cp.x === 12800,
      );
      expect(nextCheckpoint).toBeGreaterThanOrEqual(0);
      expect(game.activeCheckpointIndex).toBeLessThan(nextCheckpoint);
      for (
        let i = 0;
        i < 1000 && game.activeCheckpointIndex < nextCheckpoint;
        i++
      )
        game.update(1 / 120, {
          left: false,
          right: true,
          jump: false,
          jumpPressed: false,
        });
      expect(game.activeCheckpointIndex).toBe(nextCheckpoint);
      expect(game.deaths).toBe(0);
    },
  );
});
