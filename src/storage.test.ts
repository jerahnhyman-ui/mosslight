import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONTROLS,
  worldUnlocked,
  discoverFeather,
  discoverBeehive,
  completeBeehive,
  recordHoops,
  RunCoinLedger,
  SHOP_ITEMS,
  challengeUnlocked,
  ownsItem,
  purchaseItem,
  recordGardenRun,
  recordChallenge,
  rescuedTotal,
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
      garden: {
        classic: { completed: false, bestTime: null },
        relaxed: { completed: false, bestTime: null },
        timed: { completed: false, bestTime: null },
      },
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
      "mosslight-save-v2",
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
    expect(save.progress).toHaveLength(4);
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
    expect(writeSave(save)).toBe(false);
    expect(save.progress[0].fireflies).toEqual([1]);
  });
});

describe("living garden progression", () => {
  it("migrates build 15 saves without relabeling past trail records as boss victories", () => {
    items.set(
      "mosslight-save-v2",
      JSON.stringify({
        sound: false,
        music: true,
        controls: { size: 1.15, inset: 10, height: 20, swapped: true },
        progress: [
          {
            completed: true,
            bestTime: 20,
            adventureCompleted: true,
            adventureBestTime: 72,
            fireflies: [0, 2],
            coins: 180,
          },
        ],
      }),
    );
    const save = readSave();
    expect(save.progress[0].adventureCompleted).toBe(true);
    expect(save.progress[0].adventureBestTime).toBe(72);
    expect(save.progress[0].fireflies).toEqual([0, 2]);
    expect(
      Object.values(save.progress[0].garden).every(
        (record) => !record.completed && record.bestTime === null,
      ),
    ).toBe(true);
    expect(save.wallet).toBe(0);
    expect(save.lifetimeCoins).toBe(0);
    expect(save.outfit).toBe("leaf");
    expect(save.challenges.every((record) => !record.completed)).toBe(true);
    writeSave(save);
    expect(readSave()).toEqual(save);
  });

  it("credits each collected coin exactly once during frames and checkpoint retries", () => {
    const save = readSave();
    const ledger = new RunCoinLedger();
    expect(ledger.collect(save, 3)).toBe(3);
    expect(ledger.collect(save, 3)).toBe(0);
    expect(ledger.collect(save, 2)).toBe(0);
    expect(ledger.collect(save, 0)).toBe(0);
    expect(ledger.collect(save, 5)).toBe(2);
    expect(ledger.collect(save, NaN)).toBe(0);
    expect(ledger.collect(save, Infinity)).toBe(0);
    expect(save.wallet).toBe(5);
    expect(save.lifetimeCoins).toBe(5);
    writeSave(save);
    const reloaded = readSave();
    expect(reloaded.wallet).toBe(5);
    // A separate replay can earn new coins, independently of a prior run.
    new RunCoinLedger().collect(reloaded, 2);
    expect(reloaded.wallet).toBe(7);
  });

  it("requires rescues and earned coins, charges once and equips only owned outfits", () => {
    const save = readSave();
    new RunCoinLedger().collect(save, 120);
    expect(purchaseItem(save, "berry")).toBe("locked");
    expect(save.wallet).toBe(120);
    recordFireflies(save.progress[0], [0, 1, 2]);
    expect(purchaseItem(save, "berry")).toBe("purchased");
    expect(save.wallet).toBe(20);
    expect(save.lifetimeCoins).toBe(120);
    expect(save.outfit).toBe("berry");
    expect(purchaseItem(save, "berry")).toBe("equipped");
    expect(save.wallet).toBe(20);
    expect(save.outfits).toEqual(["leaf", "berry"]);
    expect(purchaseItem(save, "lanterns")).toBe("unaffordable");
    expect(purchaseItem(save, "leaf")).toBe("equipped");
    expect(save.outfit).toBe("leaf");
    expect(purchaseItem(save, "other")).toBe("invalid");
    writeSave(save);
    expect(readSave()).toEqual(save);
  });

  it("keeps decorations permanent and lifetime earnings intact after purchases", () => {
    const save = readSave();
    new RunCoinLedger().collect(save, 400);
    recordFireflies(save.progress[0], [0, 1, 2]);
    recordFireflies(save.progress[1], [0, 1, 2]);
    expect(rescuedTotal(save)).toBe(6);
    for (const id of ["lanterns", "flowers", "fountain"])
      expect(purchaseItem(save, id)).toBe("purchased");
    expect(save.wallet).toBe(75);
    expect(save.lifetimeCoins).toBe(400);
    expect(purchaseItem(save, "fountain")).toBe("equipped");
    expect(save.wallet).toBe(75);
    writeSave(save);
    const later = readSave();
    expect(later.decorations).toEqual(["lanterns", "flowers", "fountain"]);
    expect(
      SHOP_ITEMS.filter(
        (item) => item.kind === "decoration" && !item.reward,
      ).every((item) => ownsItem(later, item)),
    ).toBe(true);
  });

  it("records each adventure mode independently and leaves historical times intact", () => {
    const save = readSave();
    save.progress[0].adventureBestTime = 45;
    save.progress[0].adventureCompleted = true;
    expect(recordGardenRun(save, 0, "relaxed", 101)).toBe(true);
    expect(recordGardenRun(save, 0, "classic", 130)).toBe(true);
    expect(recordGardenRun(save, 0, "timed", 90)).toBe(true);
    expect(recordGardenRun(save, 0, "classic", 140)).toBe(false);
    expect(recordGardenRun(save, 0, "classic", 110)).toBe(true);
    expect(recordGardenRun(save, 0, "timed", NaN)).toBe(false);
    expect(save.progress[0].garden).toEqual({
      classic: { completed: true, bestTime: 110 },
      relaxed: { completed: true, bestTime: 101 },
      timed: { completed: true, bestTime: 90 },
    });
    expect(save.progress[0].adventureBestTime).toBe(45);
    expect(save.progress[1].garden.classic.completed).toBe(false);
    writeSave(save);
    expect(readSave()).toEqual(save);
  });

  it("unlocks the correct challenge and improves medals without erasing better runs", () => {
    const save = readSave();
    expect(challengeUnlocked(save, 0)).toBe(false);
    expect(recordChallenge(save, 0, 12, 20)).toBe(false);
    recordFireflies(save.progress[0], [0, 1]);
    expect(challengeUnlocked(save, 0)).toBe(false);
    recordFireflies(save.progress[0], [2]);
    expect(challengeUnlocked(save, 0)).toBe(true);
    expect(challengeUnlocked(save, 1)).toBe(false);
    expect(recordChallenge(save, 0, 40, 20)).toBe(true);
    expect(save.challenges[0].medal).toBe("bronze");
    expect(recordChallenge(save, 0, 28, 20)).toBe(true);
    expect(save.challenges[0].medal).toBe("silver");
    expect(recordChallenge(save, 0, 18, 20)).toBe(true);
    expect(save.challenges[0].medal).toBe("gold");
    expect(recordChallenge(save, 0, 50, 20)).toBe(false);
    expect(save.challenges[0].bestTime).toBe(18);
    expect(save.challenges[0].medal).toBe("gold");
    expect(save.progress[0].garden.timed.completed).toBe(false);
    writeSave(save);
    expect(readSave()).toEqual(save);
  });

  it("sanitizes malformed currency, ownership and completion data", () => {
    items.set(
      "mosslight-save-v2",
      JSON.stringify({
        wallet: 900,
        lifetimeCoins: 51.8,
        playMode: "invincible",
        outfit: "moon",
        outfits: ["berry", "berry", "unknown"],
        decorations: ["flowers", "flowers", "hacked"],
        challenges: [{ completed: true, bestTime: -2, medal: "platinum" }],
        progress: [
          {
            garden: {
              classic: { completed: false, bestTime: 1 },
              relaxed: { completed: true, bestTime: -3 },
            },
          },
        ],
      }),
    );
    const save = readSave();
    expect(save.wallet).toBe(51);
    expect(save.lifetimeCoins).toBe(51);
    expect(save.playMode).toBe("classic");
    expect(save.outfits).toEqual(["leaf", "berry"]);
    expect(save.outfit).toBe("leaf");
    expect(save.decorations).toEqual(["flowers"]);
    expect(save.progress[0].garden.classic).toEqual({
      completed: false,
      bestTime: null,
    });
    expect(save.progress[0].garden.relaxed.bestTime).toBeNull();
    expect(save.challenges[0].medal).toBe("bronze");
  });
});

describe("windmill save migration and rewards", () => {
  it("migrates v2 records into stable keyed v3 without granting expansion rewards", () => {
    items.set(
      "mosslight-save-v2",
      JSON.stringify({
        sound: false,
        music: true,
        controls: { size: 1.15, inset: 8, height: 6, swapped: true },
        wallet: 20,
        lifetimeCoins: 100,
        outfits: ["berry"],
        outfit: "berry",
        decorations: ["flowers"],
        challenges: [{ completed: true, bestTime: 18, medal: "gold" }],
        progress: [
          {
            completed: true,
            stars: 3,
            coins: 91,
            bestTime: 20,
            adventureCompleted: true,
            adventureBestTime: 60,
            fireflies: [0, 2],
            garden: { relaxed: { completed: true, bestTime: 100 } },
          },
        ],
      }),
    );
    const save = readSave();
    expect(items.has(SAVE_KEY)).toBe(true);
    expect(worldUnlocked(save, 3)).toBe(true);
    expect(save.unlocks.windFeatherDiscovered).toBe(false);
    expect(save.secrets.beehive.completed).toBe(false);
    expect(save.claimedRewards).toEqual([]);
    writeSave(save);
    const snapshot = JSON.parse(items.get(SAVE_KEY)!);
    expect(snapshot.schemaVersion).toBe(3);
    expect(snapshot.progress).toBeUndefined();
    expect(snapshot.worlds["world.sunlit-meadow"].rescuedFireflies).toEqual([
      "world.sunlit-meadow.firefly.0",
      "world.sunlit-meadow.firefly.2",
    ]);
    expect(snapshot.challenges["challenge.sunlit-meadow"].medal).toBe("gold");
    expect(readSave()).toEqual(save);
    expect(items.has("mosslight-save-v2")).toBe(true);
  });
  it("falls back to valid older saves after malformed v3 and does not unlock from legacy completion", () => {
    items.set(SAVE_KEY, JSON.stringify({ schemaVersion: 3, worlds: {} }));
    items.set(
      "mosslight-save-v2",
      JSON.stringify({
        progress: [
          { completed: true, adventureCompleted: true, fireflies: [1] },
        ],
      }),
    );
    const save = readSave();
    expect(save.progress[0].fireflies).toEqual([1]);
    expect(worldUnlocked(save, 3)).toBe(false);
    writeSave(save);
    expect(readSave()).toEqual(save);
  });
  it("persists discoveries, twelve rescues, and idempotent bee and hoop rewards", () => {
    const save = readSave();
    for (const world of save.progress) recordFireflies(world, [0, 1, 2]);
    expect(rescuedTotal(save)).toBe(12);
    expect(challengeUnlocked(save, 3)).toBe(false);
    expect(purchaseItem(save, "cosmetic.bee_scarf")).toBe("locked");
    expect(purchaseItem(save, "cosmetic.pinwheel_garland")).toBe("locked");
    expect(discoverBeehive(save)).toBe(true);
    expect(discoverBeehive(save)).toBe(false);
    expect(completeBeehive(save)).toBe(true);
    expect(completeBeehive(save)).toBe(false);
    const timeout = {
      score: 800,
      hoops: 8,
      centered: 0,
      landings: 0,
      elapsed: 60,
      finished: false,
    };
    expect(recordHoops(save, timeout)).toBe(false);
    expect(discoverFeather(save)).toBe(true);
    expect(recordHoops(save, timeout)).toBe(true);
    expect(recordHoops(save, timeout)).toBe(false);
    expect(save.minigames.flowerHoops.completed).toBe(false);
    expect(save.minigames.flowerHoops.bestMedal).toBe("bronze");
    expect(save.outfits.filter((x) => x === "cosmetic.bee_scarf")).toHaveLength(
      1,
    );
    expect(
      save.decorations.filter((x) => x === "cosmetic.pinwheel_garland"),
    ).toHaveLength(1);
    expect(save.wallet).toBe(0);
    writeSave(save);
    expect(readSave()).toEqual(save);
  });
  it("keeps a coherent best attempt and separately tracks medals and fastest finish", () => {
    const save = readSave();
    discoverFeather(save);
    const best = {
      score: 2400,
      hoops: 16,
      centered: 12,
      landings: 4,
      elapsed: 44,
      finished: true,
    };
    expect(recordHoops(save, best)).toBe(true);
    expect(
      recordHoops(save, {
        score: 2000,
        hoops: 14,
        centered: 4,
        landings: 3,
        elapsed: 35,
        finished: true,
      }),
    ).toBe(false);
    expect(save.minigames.flowerHoops.best).toEqual(best);
    expect(save.minigames.flowerHoops.bestFinishTime).toBe(35);
    expect(save.minigames.flowerHoops.bestMedal).toBe("gold");
    expect(recordHoops(save, { ...best, score: 2601 })).toBe(false);
    writeSave(save);
    expect(readSave()).toEqual(save);
  });
});
