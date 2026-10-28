export interface Progress {
  /** Previous, shorter trail records stay available after the adventure update. */
  completed: boolean;
  stars: number;
  coins: number;
  bestTime: number | null;
  adventureCompleted: boolean;
  adventureBestTime: number | null;
  fireflies: number[];
}
export interface TouchSettings {
  size: 0.85 | 1 | 1.15;
  inset: number;
  height: number;
  swapped: boolean;
}
export interface Save {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  controls: TouchSettings;
  progress: Progress[];
}
export const DEFAULT_CONTROLS: TouchSettings = {
  size: 1,
  inset: 0,
  height: 0,
  swapped: false,
};
export const SAVE_KEY = "mosslight-save-v2";
const blank = (): Save => ({
  sound: true,
  music: true,
  haptics: true,
  controls: { ...DEFAULT_CONTROLS },
  progress: Array.from({ length: 3 }, () => ({
    completed: false,
    stars: 0,
    coins: 0,
    bestTime: null,
    adventureCompleted: false,
    adventureBestTime: null,
    fireflies: [],
  })),
});
const validTime = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
const distance = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(40, value)))
    : 0;
export function rescuedIndices(value: unknown): number[] {
  return Array.isArray(value)
    ? [
        ...new Set(value.filter((i) => Number.isInteger(i) && i >= 0 && i < 3)),
      ].sort()
    : [];
}
/** Merge IDs rather than counts so revisiting the same secret cannot restore extra light. */
export function recordFireflies(
  progress: Progress,
  indices: number[],
): boolean {
  const merged = rescuedIndices([...progress.fireflies, ...indices]);
  if (merged.length === progress.fireflies.length) return false;
  progress.fireflies = merged;
  return true;
}
export function readSave(): Save {
  const defaults = blank();
  try {
    const current = localStorage.getItem(SAVE_KEY);
    const raw = JSON.parse(
      current || localStorage.getItem("mosslight-save-v1") || "null",
    );
    if (!raw || !Array.isArray(raw.progress)) return defaults;
    const isCurrent = current !== null;
    defaults.sound = raw.sound !== false;
    // Respect a muted older installation when introducing music for the first time.
    defaults.music = isCurrent ? raw.music !== false : defaults.sound;
    defaults.haptics = raw.haptics !== false;
    if (isCurrent && raw.controls && typeof raw.controls === "object") {
      defaults.controls = {
        size: [0.85, 1, 1.15].includes(raw.controls.size)
          ? raw.controls.size
          : 1,
        inset: distance(raw.controls.inset),
        height: distance(raw.controls.height),
        swapped: raw.controls.swapped === true,
      };
    }
    defaults.progress = defaults.progress.map((fallback, i) => {
      const p = raw.progress[i];
      if (!p || typeof p !== "object") return fallback;
      return {
        completed: p.completed === true,
        stars: Number.isFinite(p.stars)
          ? Math.floor(Math.max(0, Math.min(3, p.stars)))
          : 0,
        coins: Number.isFinite(p.coins) ? Math.floor(Math.max(0, p.coins)) : 0,
        bestTime: validTime(p.bestTime),
        adventureCompleted: isCurrent && p.adventureCompleted === true,
        adventureBestTime: isCurrent ? validTime(p.adventureBestTime) : null,
        fireflies: isCurrent ? rescuedIndices(p.fireflies) : [],
      };
    });
  } catch {
    /* Storage can be disabled; the game still works. */
  }
  return defaults;
}
export function writeSave(save: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* Session-only progress. */
  }
}
