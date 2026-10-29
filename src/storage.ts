export type PlayMode = "classic" | "relaxed" | "timed";
export type Outfit = "leaf" | "berry" | "moon";
export type Decoration = "lanterns" | "flowers" | "fountain";
export interface RunRecord {
  completed: boolean;
  bestTime: number | null;
}
export interface ChallengeRecord extends RunRecord {
  medal: "none" | "bronze" | "silver" | "gold";
}
export interface ShopItem {
  id: Outfit | Decoration;
  kind: "outfit" | "decoration";
  name: string;
  description: string;
  coins: number;
  fireflies: number;
}
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "leaf",
    kind: "outfit",
    name: "Leaf Pip",
    description: "Pip’s familiar forest green.",
    coins: 0,
    fireflies: 0,
  },
  {
    id: "berry",
    kind: "outfit",
    name: "Berry Pip",
    description: "A bright berry cap for bold adventures.",
    coins: 100,
    fireflies: 3,
  },
  {
    id: "moon",
    kind: "outfit",
    name: "Moon Pip",
    description: "A silver-blue glow for the garden’s guardian.",
    coins: 200,
    fireflies: 6,
  },
  {
    id: "lanterns",
    kind: "decoration",
    name: "Firefly lanterns",
    description: "Warm lights welcome the rescued residents.",
    coins: 75,
    fireflies: 1,
  },
  {
    id: "flowers",
    kind: "decoration",
    name: "Wildflower beds",
    description: "Colorful blooms around your home grove.",
    coins: 100,
    fireflies: 3,
  },
  {
    id: "fountain",
    kind: "decoration",
    name: "Dewdrop fountain",
    description: "A sparkling place for tiny friends to gather.",
    coins: 150,
    fireflies: 6,
  },
];
const emptyRecord = (): RunRecord => ({ completed: false, bestTime: null });
const emptyGarden = (): Record<PlayMode, RunRecord> => ({
  classic: emptyRecord(),
  relaxed: emptyRecord(),
  timed: emptyRecord(),
});
export interface Progress {
  /** Previous, shorter trail records stay available after the adventure update. */
  completed: boolean;
  stars: number;
  coins: number;
  bestTime: number | null;
  adventureCompleted: boolean;
  adventureBestTime: number | null;
  fireflies: number[];
  garden: Record<PlayMode, RunRecord>;
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
  playMode: PlayMode;
  wallet: number;
  lifetimeCoins: number;
  outfits: Outfit[];
  outfit: Outfit;
  decorations: Decoration[];
  challenges: ChallengeRecord[];
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
  playMode: "classic",
  wallet: 0,
  lifetimeCoins: 0,
  outfits: ["leaf"],
  outfit: "leaf",
  decorations: [],
  challenges: Array.from({ length: 3 }, () => ({
    ...emptyRecord(),
    medal: "none",
  })),
  progress: Array.from({ length: 3 }, () => ({
    completed: false,
    stars: 0,
    coins: 0,
    bestTime: null,
    adventureCompleted: false,
    adventureBestTime: null,
    fireflies: [],
    garden: emptyGarden(),
  })),
});
const validTime = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
const integer = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : 0;
const readRecord = (value: unknown): RunRecord => {
  if (!value || typeof value !== "object") return emptyRecord();
  const raw = value as Partial<RunRecord>;
  const time = validTime(raw.bestTime);
  return {
    completed: raw.completed === true,
    bestTime: raw.completed === true ? time : null,
  };
};
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
    defaults.playMode = ["classic", "relaxed", "timed"].includes(raw.playMode)
      ? raw.playMode
      : "classic";
    defaults.lifetimeCoins = integer(raw.lifetimeCoins);
    defaults.wallet = Math.min(integer(raw.wallet), defaults.lifetimeCoins);
    defaults.outfits = [
      "leaf",
      ...(["berry", "moon"] as Outfit[]).filter(
        (id) => Array.isArray(raw.outfits) && raw.outfits.includes(id),
      ),
    ];
    defaults.outfit = defaults.outfits.includes(raw.outfit)
      ? raw.outfit
      : "leaf";
    defaults.decorations = (
      ["lanterns", "flowers", "fountain"] as Decoration[]
    ).filter(
      (id) => Array.isArray(raw.decorations) && raw.decorations.includes(id),
    );
    defaults.challenges = defaults.challenges.map((fallback, i) => {
      const item = Array.isArray(raw.challenges) ? raw.challenges[i] : null;
      if (!item || typeof item !== "object") return fallback;
      const record = readRecord(item);
      return {
        ...record,
        medal:
          record.completed && ["bronze", "silver", "gold"].includes(item.medal)
            ? item.medal
            : record.completed
              ? "bronze"
              : "none",
      };
    });
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
        garden: {
          classic: readRecord(p.garden?.classic),
          relaxed: readRecord(p.garden?.relaxed),
          timed: readRecord(p.garden?.timed),
        },
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

export function rescuedTotal(save: Save) {
  return save.progress.reduce((sum, p) => sum + p.fireflies.length, 0);
}
/** A fresh ledger belongs to one run, so frame repeats and checkpoint retries cannot mint coins. */
export class RunCoinLedger {
  private accounted = 0;
  collect(save: Save, total: number) {
    const safeTotal = integer(total);
    const earned = Math.max(0, safeTotal - this.accounted);
    this.accounted = Math.max(this.accounted, safeTotal);
    save.lifetimeCoins = integer(save.lifetimeCoins + earned);
    save.wallet = integer(save.wallet + earned);
    return earned;
  }
}
export function ownsItem(save: Save, item: ShopItem) {
  return item.kind === "outfit"
    ? save.outfits.includes(item.id as Outfit)
    : save.decorations.includes(item.id as Decoration);
}
export function purchaseItem(
  save: Save,
  id: string,
): "purchased" | "equipped" | "locked" | "unaffordable" | "invalid" {
  const item = SHOP_ITEMS.find((item) => item.id === id);
  if (!item) return "invalid";
  if (ownsItem(save, item)) {
    if (item.kind === "outfit") save.outfit = item.id as Outfit;
    return "equipped";
  }
  if (rescuedTotal(save) < item.fireflies) return "locked";
  if (save.wallet < item.coins) return "unaffordable";
  save.wallet -= item.coins;
  if (item.kind === "outfit") {
    save.outfits.push(item.id as Outfit);
    save.outfit = item.id as Outfit;
  } else save.decorations.push(item.id as Decoration);
  return "purchased";
}
export function recordGardenRun(
  save: Save,
  world: number,
  mode: PlayMode,
  seconds: number,
): boolean {
  const record = save.progress[world]?.garden[mode];
  if (!record || validTime(seconds) === null) return false;
  const improved = record.bestTime === null || seconds < record.bestTime;
  record.completed = true;
  if (improved) record.bestTime = seconds;
  return improved;
}
export function challengeUnlocked(save: Save, world: number) {
  return save.progress[world]?.fireflies.length === 3;
}
export function recordChallenge(
  save: Save,
  world: number,
  seconds: number,
  target: number,
): boolean {
  const record = save.challenges[world];
  if (
    !record ||
    !challengeUnlocked(save, world) ||
    validTime(seconds) === null ||
    validTime(target) === null
  )
    return false;
  const improved = record.bestTime === null || seconds < record.bestTime;
  record.completed = true;
  if (improved) record.bestTime = seconds;
  const best = record.bestTime!;
  record.medal =
    best <= target ? "gold" : best <= target * 1.5 ? "silver" : "bronze";
  return improved;
}
