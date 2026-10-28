import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONTROLS,
  readSave,
  recordFireflies,
  SAVE_KEY,
  writeSave,
} from "./storage";

let items: Map<string, string>;
beforeEach(() => {
  items = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("adventure progress", () => {
  it("preserves previous trail achievements without claiming new secrets or comparable times", () => {
    items.set(
      "mosslight-save-v1",
      JSON.stringify({
        sound: false,
        progress: [{ completed: true, stars: 3, coins: 91, bestTime: 21.3 }],
      }),
    );
    const save = readSave();
    expect(save.progress[0]).toEqual({
      completed: true,
      stars: 3,
      coins: 91,
      bestTime: 21.3,
      adventureCompleted: false,
      adventureBestTime: null,
      fireflies: [],
    });
    expect(save.music).toBe(false);
    expect(save.sound).toBe(false);
    expect(save.controls).toEqual(DEFAULT_CONTROLS);
    writeSave(save);
    expect(readSave()).toEqual(save);
    expect(items.has("mosslight-save-v1")).toBe(true);
  });

  it("retains unique rescued fireflies across failed runs, reloads and repeated visits", () => {
    const save = readSave();
    expect(recordFireflies(save.progress[0], [0, 2])).toBe(true);
    writeSave(save);
    const later = readSave();
    expect(later.progress[0].adventureCompleted).toBe(false);
    expect(recordFireflies(later.progress[0], [2])).toBe(false);
    expect(recordFireflies(later.progress[0], [1, 1, 7, -1])).toBe(true);
    expect(later.progress[0].fireflies).toEqual([0, 1, 2]);
    expect(later.progress[1].fireflies).toEqual([]);
  });

  it("persists independent audio settings and accessible control preferences", () => {
    const save = readSave();
    save.sound = false;
    save.music = true;
    save.haptics = false;
    save.controls = { size: 1.15, inset: 30, height: 40, swapped: true };
    save.progress[1].adventureCompleted = true;
    save.progress[1].adventureBestTime = 108.7;
    writeSave(save);
    expect(readSave()).toEqual(save);
  });

  it("bounds malformed settings and never trusts secret counts as rescued IDs", () => {
    items.set(
      SAVE_KEY,
      JSON.stringify({
        controls: { size: 4, inset: -9, height: 500, swapped: "true" },
        progress: [
          { fireflies: [0, 0, 1.5, 2, 4, "1"], adventureBestTime: -1 },
        ],
      }),
    );
    const save = readSave();
    expect(save.controls).toEqual({
      size: 1,
      inset: 0,
      height: 40,
      swapped: false,
    });
    expect(save.progress[0].fireflies).toEqual([0, 2]);
    expect(save.progress[0].adventureBestTime).toBeNull();
    expect(save.progress).toHaveLength(3);
  });

  it("continues with session-only progress when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const save = readSave();
    recordFireflies(save.progress[0], [1]);
    expect(() => writeSave(save)).not.toThrow();
    expect(save.progress[0].fireflies).toEqual([1]);
  });
});
