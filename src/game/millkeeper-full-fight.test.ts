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
    "wins every phase with ordinary jumps, no feather or star (big=%s)",
    (big) => {
      const game = new Game(0, { level: arena(big) });
      // Start at the real checkpoint with no feather. The fight must remain
      // fully playable using movement and ordinary jump alone.
      for (let i = 0; i < 30; i++)
        game.update(1 / 120, {
          left: false,
          right: false,
          jump: false,
          jumpPressed: false,
        });
      expect(game.hasWindFeather).toBe(false);
      const hits: number[] = [];
      const phases = new Set<number>();
      let feather = false;
      let grew = false;
      const stompTakeoffs: number[] = [];
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
        const onFloor = p.grounded && Math.abs(feet - 470) < 2;
        let target = 250,
          jump = false;
        if (b.state === "recover" && onFloor && !jumpKind) {
          target = 385;
          if (Math.abs(center - 385) < 10 && Math.abs(p.vx) < 50) {
            jumpKind = "stomp";
            stompTakeoffs.push(feet);
          }
        }
        if (
          onFloor &&
          !jumpKind &&
          b.millState === "betweenSweeps" &&
          b.facing > 0 &&
          b.stateTime <= 0.35
        ) {
          jumpKind = "dodge";
        }
        if (onFloor && !jumpKind && b.millState === "lowSweep") {
          const wave = game.hazards.find((h) => h.kind === "sweep");
          if (
            wave &&
            Math.abs(wave.x + 24 - origin - center) < 120 &&
            wave.vx * (center - (wave.x + 24 - origin)) > 0
          )
            jumpKind = "dodge";
        }
        if (jumpKind) {
          air++;
          if (jumpKind === "stomp") {
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
      expect(stompTakeoffs).toEqual([470, 470, 470, 470, 470, 470]);
      expect(game.deaths).toBe(0);
      expect(feather).toBe(false);
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
