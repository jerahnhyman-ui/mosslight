import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GhostRecorder,
  ghostAt,
  loadGhost,
  saveGhost,
  GHOST_STEP,
} from "./ghost";

let items: Map<string, string>;
beforeEach(() => {
  items = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("ghost races", () => {
  it("records a run at a fixed rate and replays it smoothly", () => {
    const rec = new GhostRecorder();
    for (let t = 0; t <= 2; t += 1 / 120) rec.sample(t, t * 100, 400);
    const run = rec.finish(2);
    expect(run.step).toBe(GHOST_STEP);
    expect(run.xs.length).toBeGreaterThanOrEqual(20);
    const mid = ghostAt(run, 1.05)!;
    expect(Math.abs(mid.x - 105)).toBeLessThan(3);
    expect(mid.done).toBe(false);
    expect(ghostAt(run, 5)!.done).toBe(true);
  });

  it("keeps one best ghost per world and ignores bad data", () => {
    const rec = new GhostRecorder();
    rec.sample(0, 10, 20);
    rec.sample(0.2, 30, 40);
    saveGhost("world.sunlit-meadow", rec.finish(0.2));
    expect(loadGhost("world.sunlit-meadow")!.xs).toEqual([10, 30, 30]);
    expect(loadGhost("world.firefly-hollow")).toBeNull();
    items.set(
      "mosslight-ghosts-v1",
      JSON.stringify({ "world.x": { step: 0.1, xs: [1], ys: ["a"] } }),
    );
    expect(loadGhost("world.x")).toBeNull();
  });
});
