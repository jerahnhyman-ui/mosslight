import { describe, expect, it } from "vitest";
import { Game, MOUNT_SIZE, TONGUE_REACH, type GameInput } from "./engine";
import type { EnemyKind, Level } from "./levels";
import { marshLevel } from "./marsh-level";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (g: Game, input = idle, n = 1) => {
  for (let i = 0; i < n; i++) g.update(1 / 120, input);
};
function meadow(
  enemies: { kind: EnemyKind; x: number }[] = [],
  floor = [{ x: 0, w: 2000 }],
): Level {
  return {
    id: 90,
    name: "Gulp test meadow",
    subtitle: "",
    width: 2000,
    theme: "meadow",
    spawn: { x: 100, y: 392 },
    platforms: floor.map((f) => ({ ...f, y: 430, h: 230, kind: "ground" })),
    coins: [],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: enemies.map((e) => ({
      ...e,
      y: 402,
      minX: e.x - 60,
      maxX: e.x + 60,
    })),
    checkpoints: [],
    sections: [{ x: 0, name: "Test" }],
    mounts: [{ x: 200, y: 430 }],
    goal: { x: 1900, y: 430 },
  };
}
function mountUp(g: Game) {
  for (let i = 0; i < 240 && !g.riding; i++) tick(g, { ...idle, right: true });
  expect(g.riding).not.toBeNull();
  tick(g, idle, 60);
}

describe("Gulp, the rideable tree frog", () => {
  it("waits in Reedwater Marsh and is ridden by walking into it", () => {
    expect(marshLevel.mounts).toHaveLength(1);
    const g = new Game(0, { level: meadow() });
    expect(g.mounts[0]!.state).toBe("waiting");
    mountUp(g);
    expect(g.events).not.toContain("life-lost");
    expect(g.mounts[0]!.state).toBe("ridden");
  });

  it("jumps higher while riding", () => {
    const peak = (ride: boolean) => {
      const g = new Game(0, { level: meadow() });
      if (ride) mountUp(g);
      const ground = g.player.y;
      let top = ground;
      tick(g, { ...idle, jump: true, jumpPressed: true });
      for (let i = 0; i < 120; i++) {
        tick(g, { ...idle, jump: true });
        top = Math.min(top, g.player.y);
      }
      return ground - top;
    };
    expect(peak(true)).toBeGreaterThan(peak(false) * 1.2);
  });

  it("snaps up a bug ahead with its tongue, without Pip touching it", () => {
    const g = new Game(0, { level: meadow([{ kind: "beetle", x: 700 }]) });
    mountUp(g);
    const bug = g.enemies[0]!;
    let gulped = false;
    for (let i = 0; i < 600 && bug.alive; i++) {
      tick(g, { ...idle, right: true });
      if (g.events.includes("gulp")) gulped = true;
    }
    expect(gulped).toBe(true);
    expect(bug.alive).toBe(false);
    const gap = bug.x - (g.player.x + g.player.w);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThanOrEqual(TONGUE_REACH);
    expect(g.deaths).toBe(0);
  });

  it("does not eat a bug behind Pip", () => {
    const g = new Game(0, { level: meadow([{ kind: "beetle", x: 40 }]) });
    mountUp(g);
    tick(g, { ...idle, right: true }, 30);
    expect(g.enemies[0]!.alive).toBe(true);
  });

  it("takes a hit for Pip: Pip falls off unhurt and Gulp hops away", () => {
    const g = new Game(0, { level: meadow() });
    mountUp(g);
    // Face away so the tongue cannot help, then back into a charging bug.
    tick(g, { ...idle, left: true }, 2);
    g.enemies.push({
      kind: "beetle",
      x: g.player.x + 4,
      y: 402,
      w: 32,
      h: 28,
      vx: 0,
      vy: 0,
      facing: -1,
      baseY: 402,
      grounded: true,
      state: "patrol",
      stateTime: 0,
      alive: true,
      squashed: 0,
      minX: g.player.x - 200,
      maxX: g.player.x + 200,
    });
    let dismounted = false;
    for (let i = 0; i < 10; i++) {
      tick(g);
      if (g.events.includes("dismount")) dismounted = true;
    }
    expect(dismounted).toBe(true);
    expect(g.riding).toBeNull();
    expect(g.lives).toBe(3);
    expect(g.player.form).toBe("small");
    expect(g.mounts[0]!.state).toBe("fleeing");
    tick(g, idle, 200);
    expect(g.mounts[0]!.state).toBe("waiting");
  });

  it("never hops into a gap while fleeing, and resets after a lost life", () => {
    const g = new Game(0, {
      level: meadow(
        [],
        [
          { x: 0, w: 300 },
          { x: 500, w: 1500 },
        ],
      ),
    });
    const frog = g.mounts[0]!;
    frog.state = "fleeing";
    frog.vx = 160;
    frog.timer = 2;
    tick(g, idle, 240);
    expect(frog.x + MOUNT_SIZE.w).toBeLessThanOrEqual(300);
    // Walk into the gap: losing a life sends Gulp home.
    for (let i = 0; i < 600 && !g.deaths; i++)
      tick(g, { ...idle, right: true });
    expect(g.deaths).toBe(1);
    expect(g.riding).toBeNull();
    expect(g.mounts[0]!.x).toBe(200);
    expect(g.mounts[0]!.state).toBe("waiting");
  });
});
