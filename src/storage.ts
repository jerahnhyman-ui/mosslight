export interface Progress {
  completed: boolean;
  stars: number;
  coins: number;
  bestTime: number | null;
}
export interface Save {
  sound: boolean;
  progress: Progress[];
}
const blank = (): Save => ({
  sound: true,
  progress: Array.from({ length: 3 }, () => ({
    completed: false,
    stars: 0,
    coins: 0,
    bestTime: null,
  })),
});
export function readSave(): Save {
  const defaults = blank();
  try {
    const raw = JSON.parse(localStorage.getItem("mosslight-save-v1") || "null");
    if (!raw || !Array.isArray(raw.progress)) return defaults;
    defaults.sound = raw.sound !== false;
    defaults.progress = defaults.progress.map((fallback, i) => {
      const p = raw.progress[i];
      if (!p || typeof p !== "object") return fallback;
      return {
        completed: p.completed === true,
        stars: Number.isFinite(p.stars) ? Math.max(0, Math.min(3, p.stars)) : 0,
        coins: Number.isFinite(p.coins) ? Math.max(0, p.coins) : 0,
        bestTime:
          Number.isFinite(p.bestTime) && p.bestTime > 0 ? p.bestTime : null,
      };
    });
  } catch {
    /* Storage can be disabled; the game still works. */
  }
  return defaults;
}
export function writeSave(save: Save) {
  try {
    localStorage.setItem("mosslight-save-v1", JSON.stringify(save));
  } catch {
    /* Session-only progress. */
  }
}
