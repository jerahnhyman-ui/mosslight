export type PlayMode = "classic" | "relaxed" | "timed";
export type Outfit = "leaf" | "berry" | "moon" | "cosmetic.bee_scarf";
export type Decoration =
  | "lanterns"
  | "flowers"
  | "fountain"
  | "cosmetic.pinwheel_garland";
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
  reward?: boolean;
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
  {
    id: "cosmetic.bee_scarf",
    kind: "outfit",
    name: "Bee Scarf",
    description: "A gift from the beehive.",
    coins: 0,
    fireflies: 0,
    reward: true,
  },
  {
    id: "cosmetic.pinwheel_garland",
    kind: "decoration",
    name: "Pinwheel Garland",
    description: "A prize for Petal Post flights.",
    coins: 0,
    fireflies: 0,
    reward: true,
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
export interface HoopResult {
  score: number;
  hoops: number;
  centered: number;
  landings: number;
  elapsed: number;
  finished: boolean;
}
export type HoopMedal = "none" | "bronze" | "silver" | "gold";
export interface HoopRecord {
  revision: 1;
  best: HoopResult | null;
  bestMedal: HoopMedal;
  completed: boolean;
  bestFinishTime: number | null;
}

/** Stable content IDs are independent of world indices and survive updates. */
export const EXPLORATION_SECRET_IDS = [
  "secret.moonpool",
  "secret.cloud-garden",
  "secret.sky-meadow",
  "secret.sky-hollow",
  "secret.sky-cloudtop",
] as const;
export type ExplorationSecretId = (typeof EXPLORATION_SECRET_IDS)[number];
export type SecretRecord = { discovered: boolean; completed: boolean };
export const CREATURE_IDS = ["frog", "cloudbird", "moth"] as const;
export type CreatureId = (typeof CREATURE_IDS)[number];
export type CharacterId = "pip" | "poppy";
export type GardenActivityResult =
  | { kind: "matching"; moves: number }
  | { kind: "falling"; score: number; lines: number };
const emptyExploration = (): Record<ExplorationSecretId, SecretRecord> =>
  Object.fromEntries(
    EXPLORATION_SECRET_IDS.map((id) => [
      id,
      { discovered: false, completed: false },
    ]),
  ) as Record<ExplorationSecretId, SecretRecord>;

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
  selectedCharacter: CharacterId;
  decorations: Decoration[];
  challenges: ChallengeRecord[];
  unlocks: { windFeatherDiscovered: boolean };
  secrets: {
    beehive: SecretRecord;
    exploration: Record<ExplorationSecretId, SecretRecord>;
  };
  rescuedCreatures: CreatureId[];
  minigames: {
    flowerHoops: HoopRecord;
    gardenMatch: { bestMoves: number | null };
    seedStack: { bestScore: number | null; bestLines: number | null };
  };
  claimedRewards: string[];
}
export const DEFAULT_CONTROLS: TouchSettings = {
  size: 1,
  inset: 0,
  height: 0,
  swapped: false,
};
export const SAVE_KEY = "mosslight-save-v3";
export const WORLD_IDS = [
  "world.sunlit-meadow",
  "world.firefly-hollow",
  "world.cloudtop-crossing",
  "world.windmill-garden",
] as const;
export const CHALLENGE_IDS = [
  "challenge.sunlit-meadow",
  "challenge.firefly-hollow",
  "challenge.cloudtop-crossing",
] as const;
const emptyHoops = (): HoopRecord => ({
  revision: 1,
  best: null,
  bestMedal: "none",
  completed: false,
  bestFinishTime: null,
});
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
  selectedCharacter: "pip",
  decorations: [],
  challenges: Array.from({ length: 3 }, () => ({
    ...emptyRecord(),
    medal: "none",
  })),
  unlocks: { windFeatherDiscovered: false },
  secrets: {
    beehive: { discovered: false, completed: false },
    exploration: emptyExploration(),
  },
  rescuedCreatures: [],
  minigames: {
    flowerHoops: emptyHoops(),
    gardenMatch: { bestMoves: null },
    seedStack: { bestScore: null, bestLines: null },
  },
  claimedRewards: [],
  progress: Array.from({ length: 4 }, () => ({
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
    // A corrupt newer snapshot must not hide a usable older one.
    let raw: any = null;
    let version = 0;
    for (const [key, candidateVersion] of [
      [SAVE_KEY, 3],
      ["mosslight-save-v2", 2],
      ["mosslight-save-v1", 1],
    ] as const) {
      try {
        const text = localStorage.getItem(key);
        if (!text) continue;
        const candidate = JSON.parse(text);
        if (candidateVersion === 3) {
          if (
            !candidate ||
            candidate.schemaVersion !== 3 ||
            !candidate.worlds ||
            typeof candidate.worlds !== "object" ||
            Array.isArray(candidate.worlds)
          )
            continue;
          const worlds = WORLD_IDS.map((id) => candidate.worlds[id]);
          if (
            !worlds.every(
              (world) =>
                world && typeof world === "object" && !Array.isArray(world),
            )
          )
            continue;
          raw = {
            ...candidate,
            progress: worlds.map((world, i) => ({
              ...world,
              fireflies: Array.isArray(world.rescuedFireflies)
                ? world.rescuedFireflies.map((id: string) =>
                    typeof id === "string" &&
                    id.startsWith(`${WORLD_IDS[i]}.firefly.`)
                      ? Number(id.slice(`${WORLD_IDS[i]}.firefly.`.length))
                      : -1,
                  )
                : [],
            })),
            challenges: CHALLENGE_IDS.map((id) => candidate.challenges?.[id]),
          };
        } else {
          if (!candidate || !Array.isArray(candidate.progress)) continue;
          raw = candidate;
        }
        version = candidateVersion;
        break;
      } catch {
        /* Try the previous generation. */
      }
    }
    if (!raw) return defaults;
    defaults.sound = raw.sound !== false;
    // Respect a muted older installation when introducing music for the first time.
    defaults.music =
      typeof raw.music === "boolean" ? raw.music : defaults.sound;
    defaults.haptics = raw.haptics !== false;
    defaults.playMode = ["classic", "relaxed", "timed"].includes(raw.playMode)
      ? raw.playMode
      : "classic";
    defaults.lifetimeCoins = integer(raw.lifetimeCoins);
    defaults.wallet = Math.min(integer(raw.wallet), defaults.lifetimeCoins);
    defaults.outfits = [
      "leaf",
      ...(["berry", "moon", "cosmetic.bee_scarf"] as Outfit[]).filter(
        (id) => Array.isArray(raw.outfits) && raw.outfits.includes(id),
      ),
    ];
    defaults.outfit = defaults.outfits.includes(raw.outfit)
      ? raw.outfit
      : "leaf";
    defaults.selectedCharacter =
      raw.selectedCharacter === "poppy" ? "poppy" : "pip";
    defaults.decorations = (
      [
        "lanterns",
        "flowers",
        "fountain",
        "cosmetic.pinwheel_garland",
      ] as Decoration[]
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
    if (raw.controls && typeof raw.controls === "object") {
      defaults.controls = {
        size: [0.85, 1, 1.15].includes(raw.controls.size)
          ? raw.controls.size
          : 1,
        inset: distance(raw.controls.inset),
        height: distance(raw.controls.height),
        swapped: raw.controls.swapped === true,
      };
    }
    if (version === 3) {
      defaults.unlocks.windFeatherDiscovered =
        raw.unlocks?.windFeatherDiscovered === true;
      defaults.secrets.beehive.completed =
        raw.secrets?.["secret.beehive"]?.completed === true;
      defaults.secrets.beehive.discovered =
        raw.secrets?.["secret.beehive"]?.discovered === true ||
        defaults.secrets.beehive.completed;
      for (const id of EXPLORATION_SECRET_IDS) {
        const completed = raw.secrets?.[id]?.completed === true;
        defaults.secrets.exploration[id] = {
          discovered: raw.secrets?.[id]?.discovered === true || completed,
          completed,
        };
      }
      defaults.rescuedCreatures = CREATURE_IDS.filter(
        (id) =>
          Array.isArray(raw.rescuedCreatures) &&
          raw.rescuedCreatures.includes(id),
      );
      defaults.claimedRewards = [
        "cosmetic.bee_scarf",
        "cosmetic.pinwheel_garland",
      ].filter(
        (id) =>
          Array.isArray(raw.claimedRewards) && raw.claimedRewards.includes(id),
      );
      const hoops = raw.minigames?.["minigame.flower_hoops"];
      if (hoops?.revision === 1) {
        const best = sanitizeHoopResult(hoops.best);
        defaults.minigames.flowerHoops = {
          revision: 1,
          best,
          bestMedal: ["none", "bronze", "silver", "gold"].includes(
            hoops.bestMedal,
          )
            ? hoops.bestMedal
            : "none",
          completed: hoops.completed === true,
          bestFinishTime:
            hoops.completed === true ? validTime(hoops.bestFinishTime) : null,
        };
      }
      const match = raw.minigames?.["minigame.garden_match"];
      if (Number.isSafeInteger(match?.bestMoves) && match.bestMoves >= 6)
        defaults.minigames.gardenMatch.bestMoves = match.bestMoves;
      const stack = raw.minigames?.["minigame.seed_stack"];
      if (Number.isSafeInteger(stack?.bestScore) && stack.bestScore >= 0)
        defaults.minigames.seedStack.bestScore = stack.bestScore;
      if (Number.isSafeInteger(stack?.bestLines) && stack.bestLines >= 0)
        defaults.minigames.seedStack.bestLines = stack.bestLines;
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
        adventureCompleted: p.adventureCompleted === true,
        adventureBestTime: validTime(p.adventureBestTime),
        fireflies: rescuedIndices(p.fireflies),
        garden: {
          classic: readRecord(p.garden?.classic),
          relaxed: readRecord(p.garden?.relaxed),
          timed: readRecord(p.garden?.timed),
        },
      };
    });
    if (version < 3) writeSave(defaults);
  } catch {
    /* Storage can be disabled; the game still works. */
  }
  return defaults;
}
export function writeSave(save: Save) {
  try {
    const { progress, challenges, secrets, minigames, ...common } = save;
    const worlds = Object.fromEntries(
      WORLD_IDS.map((id, i) => {
        const { fireflies, ...world } = progress[i];
        return [
          id,
          {
            ...world,
            rescuedFireflies: rescuedIndices(fireflies).map(
              (index) => `${id}.firefly.${index}`,
            ),
          },
        ];
      }),
    );
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...common,
        schemaVersion: 3,
        worlds,
        challenges: Object.fromEntries(
          CHALLENGE_IDS.map((id, i) => [id, challenges[i]]),
        ),
        secrets: {
          "secret.beehive": secrets.beehive,
          ...Object.fromEntries(
            EXPLORATION_SECRET_IDS.map((id) => [id, secrets.exploration[id]]),
          ),
        },
        minigames: {
          "minigame.flower_hoops": minigames.flowerHoops,
          "minigame.garden_match": minigames.gardenMatch,
          "minigame.seed_stack": minigames.seedStack,
        },
      }),
    );
    return true;
  } catch {
    /* Session-only progress. */
    return false;
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
  if (item.reward || rescuedTotal(save) < item.fireflies) return "locked";
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
  return (
    world >= 0 && world < 3 && save.progress[world]?.fireflies.length === 3
  );
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

/** Windmill Garden opens only after the current Meadow guardian, not a legacy trail. */
export function worldUnlocked(save: Save, index: number): boolean {
  return (
    index >= 0 &&
    index < 4 &&
    (index !== 3 ||
      Object.values(save.progress[0].garden).some((record) => record.completed))
  );
}
export function discoverFeather(save: Save): boolean {
  if (save.unlocks.windFeatherDiscovered) return false;
  save.unlocks.windFeatherDiscovered = true;
  return true;
}
export function discoverBeehive(save: Save): boolean {
  if (save.secrets.beehive.discovered) return false;
  save.secrets.beehive.discovered = true;
  return true;
}

/** Returns true only when the journal changes; completing implies discovery. */
export function discoverSecret(save: Save, id: ExplorationSecretId): boolean {
  const record = save.secrets.exploration[id];
  if (record.discovered) return false;
  record.discovered = true;
  return true;
}

export function completeSecret(save: Save, id: ExplorationSecretId): boolean {
  const record = save.secrets.exploration[id];
  const first = !record.completed;
  record.discovered = true;
  record.completed = true;
  return first;
}

/** A rescued creature is a permanent, idempotent Home Grove resident. */
export function rescueCreature(save: Save, id: CreatureId): boolean {
  if (save.rescuedCreatures.includes(id)) return false;
  save.rescuedCreatures.push(id);
  save.rescuedCreatures.sort(
    (a, b) => CREATURE_IDS.indexOf(a) - CREATURE_IDS.indexOf(b),
  );
  return true;
}

/** Character choice is cosmetic; both friends share the same movement rules. */
export function selectCharacter(save: Save, id: CharacterId): boolean {
  if (save.selectedCharacter === id) return false;
  save.selectedCharacter = id;
  return true;
}

/** Record separate replay goals: fewer turns for matching, higher score and rows for stacking. */
export function recordGardenActivity(
  save: Save,
  result: GardenActivityResult,
): boolean {
  if (result.kind === "matching") {
    if (!Number.isSafeInteger(result.moves) || result.moves < 6) return false;
    const old = save.minigames.gardenMatch.bestMoves;
    if (old !== null && old <= result.moves) return false;
    save.minigames.gardenMatch.bestMoves = result.moves;
    return true;
  }
  if (
    !Number.isSafeInteger(result.score) ||
    result.score < 0 ||
    !Number.isSafeInteger(result.lines) ||
    result.lines < 0
  )
    return false;
  const record = save.minigames.seedStack;
  const scoreBetter =
    record.bestScore === null || result.score > record.bestScore;
  const linesBetter =
    record.bestLines === null || result.lines > record.bestLines;
  if (scoreBetter) record.bestScore = result.score;
  if (linesBetter) record.bestLines = result.lines;
  return scoreBetter || linesBetter;
}

export function completeBeehive(save: Save): boolean {
  const first = !save.secrets.beehive.completed;
  save.secrets.beehive.discovered = true;
  save.secrets.beehive.completed = true;
  if (!save.outfits.includes("cosmetic.bee_scarf"))
    save.outfits.push("cosmetic.bee_scarf");
  if (!save.claimedRewards.includes("cosmetic.bee_scarf"))
    save.claimedRewards.push("cosmetic.bee_scarf");
  return first;
}
function sanitizeHoopResult(value: any): HoopResult | null {
  if (
    !value ||
    typeof value !== "object" ||
    !Number.isInteger(value.score) ||
    value.score < 0 ||
    value.score > 2600 ||
    !Number.isInteger(value.hoops) ||
    value.hoops < 0 ||
    value.hoops > 16 ||
    !Number.isInteger(value.centered) ||
    value.centered < 0 ||
    value.centered > value.hoops ||
    !Number.isInteger(value.landings) ||
    value.landings < 0 ||
    value.landings > 8 ||
    typeof value.elapsed !== "number" ||
    !Number.isFinite(value.elapsed) ||
    value.elapsed < 0 ||
    value.elapsed > 60 ||
    typeof value.finished !== "boolean"
  )
    return null;
  return {
    score: value.score,
    hoops: value.hoops,
    centered: value.centered,
    landings: value.landings,
    elapsed: value.elapsed,
    finished: value.finished,
  };
}
export function hoopMedal(result: HoopResult): HoopMedal {
  if (
    result.score >= 2300 &&
    result.hoops === 16 &&
    result.finished &&
    result.elapsed <= 45
  )
    return "gold";
  if (result.score >= 1750 && result.finished) return "silver";
  return result.score >= 800 ? "bronze" : "none";
}
export function recordHoops(save: Save, input: HoopResult): boolean {
  const result = sanitizeHoopResult(input);
  if (!result || !save.unlocks.windFeatherDiscovered) return false;
  const record = save.minigames.flowerHoops;
  const best = record.best;
  const improved =
    !best ||
    result.score > best.score ||
    (result.score === best.score &&
      ((result.finished && !best.finished) ||
        (result.finished === best.finished && result.elapsed < best.elapsed)));
  if (improved) record.best = result;
  const medal = hoopMedal(result);
  const ranks: HoopMedal[] = ["none", "bronze", "silver", "gold"];
  if (ranks.indexOf(medal) > ranks.indexOf(record.bestMedal))
    record.bestMedal = medal;
  if (result.finished) {
    record.completed = true;
    if (
      validTime(result.elapsed) !== null &&
      (record.bestFinishTime === null || result.elapsed < record.bestFinishTime)
    )
      record.bestFinishTime = result.elapsed;
  }
  if (medal !== "none") {
    if (!save.decorations.includes("cosmetic.pinwheel_garland"))
      save.decorations.push("cosmetic.pinwheel_garland");
    if (!save.claimedRewards.includes("cosmetic.pinwheel_garland"))
      save.claimedRewards.push("cosmetic.pinwheel_garland");
  }
  return improved;
}
