import { describe, expect, it } from "vitest";
import { Game, type GameInput } from "./engine";
import { levels, type Level } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (g: Game, input: GameInput = idle, count = 1) => {
  for (let i = 0; i < count; i++) g.update(1 / 120, input);
};
function walkTo(g: Game, target: number) {
  for (let i = 0; i < 1500; i++) {
    const p = g.player;
    const dx = target - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 3700;
    if (
      Math.abs(target - (p.x + p.w / 2)) < 3 &&
      Math.abs(p.vx) < 25 &&
      p.grounded
    )
      return;
    tick(g, { ...idle, left: dx < -2, right: dx > 2 });
  }
  throw new Error(`Could not approach switch at ${target}`);
}
function fixture(
  kind: "wind" | "sluice" | "flower" = "wind",
  water = false,
  diamond = false,
): Game {
  const base = levels[0]!;
  const level: Level = {
    ...base,
    width: 1000,
    spawn: { x: 100, y: 392 },
    platforms: [{ x: 0, y: 430, w: 1000, h: 230, kind: "ground" }],
    coins: [],
    diamonds: diamond ? [{ x: 140, y: 400 }] : [],
    stars: [],
    fireflies: [],
    enemies: [],
    checkpoints: [{ x: 100, y: 430 }],
    mechanisms: [
      {
        id: "switch",
        kind,
        x: 300,
        y: 430,
        ...(kind === "flower" && { flower: "A" as const }),
      },
    ],
    gates: [],
    boss: undefined,
    finalBoss: undefined,
    waterZones: water ? [{ x: 0, y: 0, w: 1000, h: 430 }] : [],
    goal: { x: 990, y: 430 },
  };
  const g = new Game(0, { level });
  tick(g, idle, 10);
  return g;
}

describe("switch interaction using real controls", () => {
  it("activates an intentional jump while grounded and does not toggle twice on landing", () => {
    const g = fixture();
    walkTo(g, 300);
    expect(g.puzzleState.wind).toBe("WEST");
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.wind).toBe("EAST");
    tick(g, { ...idle, jump: true }, 150);
    expect(g.player.grounded).toBe(true);
    expect(g.puzzleState.wind).toBe("EAST");
    tick(g, idle, 10);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.wind).toBe("WEST");
  });

  it("accepts the edge of the visible pad when Pip overlaps it", () => {
    const g = fixture();
    walkTo(g, 258);
    expect(g.player.x + g.player.w).toBeGreaterThan(268);
    expect(g.player.x + g.player.w / 2).toBeLessThan(268);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.wind).toBe("EAST");
  });

  it.each([false, true])(
    "does not undo a landed switch when jumping away (steering at takeoff: %s)",
    (steerAtTakeoff) => {
      const g = fixture();
      walkTo(g, 240);
      tick(g, { ...idle, jump: true, jumpPressed: true });
      for (let i = 0; i < 250 && !g.player.grounded; i++) {
        const dx = 300 - (g.player.x + g.player.w / 2);
        tick(g, { ...idle, right: dx > 2, left: dx < -2, jump: true });
      }
      expect(g.player.grounded).toBe(true);
      expect(g.puzzleState.wind).toBe("EAST");
      expect(g.isActuatorLatched("switch")).toBe(true);
      tick(g, idle, 5);
      tick(g, {
        ...idle,
        right: steerAtTakeoff,
        jump: true,
        jumpPressed: true,
      });
      expect(g.puzzleState.wind).toBe("EAST");
      // Phone players may press Jump first, then steer on the next frame.
      tick(g, { ...idle, right: true, jump: true }, 60);
      tick(g, idle, 120);
      expect(g.puzzleState.wind).toBe("EAST");
      expect(g.isActuatorLatched("switch")).toBe(false);
      walkTo(g, 300);
      tick(g, { ...idle, jump: true, jumpPressed: true });
      expect(g.puzzleState.wind).toBe("WEST");
    },
  );

  it("also accepts pad-edge contact when Pip is grown", () => {
    const g = fixture("wind", false, true);
    walkTo(g, 140);
    expect(g.player.form).toBe("big");
    walkTo(g, 258);
    expect(g.player.x + g.player.w).toBeGreaterThan(268);
    expect(g.player.x + g.player.w / 2).toBeLessThan(268);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.wind).toBe("EAST");
  });

  it.each(["flower", "sluice"] as const)(
    "does not prompt to reset a completed %s when jumping away",
    (kind) => {
      const g = fixture(kind);
      g.puzzleState.water = "HIGH";
      walkTo(g, 240);
      tick(g, { ...idle, jump: true, jumpPressed: true });
      for (let i = 0; i < 250 && !g.player.grounded; i++) {
        const dx = 300 - (g.player.x + g.player.w / 2);
        tick(g, { ...idle, right: dx > 2, left: dx < -2, jump: true });
      }
      expect(g.player.grounded).toBe(true);
      expect(
        kind === "flower"
          ? g.puzzleState.flowers.A
          : g.puzzleState.sluiceGateOpen,
      ).toBe(true);
      expect(g.isActuatorLatched("switch")).toBe(false);
      tick(g, idle, 5);
      tick(g, { ...idle, jump: true, jumpPressed: true });
      expect(g.events).not.toContain("mechanism-rearm");
    },
  );

  it("activates when swimming up and sinking onto a pad without repeated toggles", () => {
    const g = fixture("wind", true);
    walkTo(g, 300);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    tick(g, { ...idle, jump: true }, 99);
    tick(g, idle, 300);
    expect(g.player.grounded).toBe(true);
    expect(g.puzzleState.wind).toBe("EAST");
    tick(g, idle, 120);
    expect(g.puzzleState.wind).toBe("EAST");
  });

  it("reports a locked latch instead of pretending it opened", () => {
    const g = fixture("sluice");
    walkTo(g, 300);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.sluiceGateOpen).toBe(false);
    expect(g.events).toContain("mechanism-needs-water");
  });

  it("reports when a receiver has water but still needs the light", () => {
    const level: Level = {
      ...levels[0]!,
      width: 1000,
      spawn: { x: 100, y: 392 },
      platforms: [{ x: 0, y: 430, w: 1000, h: 230, kind: "ground" }],
      coins: [],
      diamonds: [],
      stars: [],
      fireflies: [],
      enemies: [],
      checkpoints: [{ x: 100, y: 430 }],
      mechanisms: [
        { id: "water", kind: "water", x: 220, y: 430 },
        { id: "receiver", kind: "receiver", x: 400, y: 430 },
      ],
      gates: [],
      boss: undefined,
      finalBoss: undefined,
      goal: { x: 990, y: 430 },
    };
    const g = new Game(0, { level });
    tick(g, idle, 10);
    walkTo(g, 220);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    tick(g, idle, 180);
    expect(g.puzzleState.water).toBe("HIGH");
    walkTo(g, 400);
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.lightGateOpen).toBe(false);
    expect(g.events).toContain("mechanism-needs-light");
  });

  it("activates the Windmill reeds control even when a shelf catches a normal jump", () => {
    const level: Level = {
      ...levels[3]!,
      spawn: { x: 5380, y: 452 },
      enemies: [],
      boss: undefined,
      finalBoss: undefined,
    };
    const g = new Game(3, { level });
    tick(g, idle, 10);
    walkTo(g, 5440);
    expect(g.puzzleState.water).toBe("LOW");
    tick(g, { ...idle, jump: true, jumpPressed: true });
    expect(g.puzzleState.water).toBe("HIGH");
    tick(g, { ...idle, jump: true }, 150);
    expect(g.puzzleState.water).toBe("HIGH");
  });
});
