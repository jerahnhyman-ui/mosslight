/** Ghost races: in Timed mode, Pip races a see-through replay of their own
 * best run of the same world. Only the best run per world is kept, sampled
 * ten times a second, in its own small storage key. */
export type GhostRun = {
  step: number;
  time: number;
  xs: number[];
  ys: number[];
};
const KEY = "mosslight-ghosts-v1";
export const GHOST_STEP = 0.1;
/** Longest run worth keeping (keeps storage small). */
const MAX_SAMPLES = 6000;

function readAll(): Record<string, GhostRun> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}
const valid = (run: unknown): run is GhostRun =>
  !!run &&
  typeof run === "object" &&
  Array.isArray((run as GhostRun).xs) &&
  Array.isArray((run as GhostRun).ys) &&
  (run as GhostRun).xs.length === (run as GhostRun).ys.length &&
  (run as GhostRun).xs.every((n) => Number.isFinite(n)) &&
  (run as GhostRun).ys.every((n) => Number.isFinite(n)) &&
  (run as GhostRun).step === GHOST_STEP;

export function loadGhost(worldId: string): GhostRun | null {
  const run = readAll()[worldId];
  return valid(run) ? run : null;
}
export function saveGhost(worldId: string, run: GhostRun) {
  if (!valid(run) || run.xs.length > MAX_SAMPLES) return;
  try {
    const all = readAll();
    all[worldId] = run;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* A full or blocked storage just skips the ghost. */
  }
}

/** Samples Pip's position at a fixed game-time rate during a run. */
export class GhostRecorder {
  xs: number[] = [];
  ys: number[] = [];
  sample(elapsed: number, x: number, y: number) {
    while (
      this.xs.length <= elapsed / GHOST_STEP &&
      this.xs.length < MAX_SAMPLES
    ) {
      this.xs.push(Math.round(x));
      this.ys.push(Math.round(y));
    }
  }
  finish(time: number): GhostRun {
    return { step: GHOST_STEP, time, xs: this.xs, ys: this.ys };
  }
}

/** Where the ghost is at a moment of the run, between samples. */
export function ghostAt(run: GhostRun, elapsed: number) {
  const f = elapsed / run.step;
  const i = Math.min(run.xs.length - 1, Math.floor(f));
  if (i < 0) return null;
  const j = Math.min(run.xs.length - 1, i + 1);
  const t = f - i;
  return {
    x: run.xs[i]! + (run.xs[j]! - run.xs[i]!) * t,
    y: run.ys[i]! + (run.ys[j]! - run.ys[i]!) * t,
    done: f >= run.xs.length - 1,
  };
}
