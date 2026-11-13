import { describe, expect, it } from "vitest";
import { FRIENDS } from "./creatures";
import { levels } from "./levels";
import {
  CREATURE_IDS,
  PLAYABLE_FRIEND_IDS,
  selectCharacter,
  rescueCreature,
  selectHelper,
  type Save,
} from "../storage";
import { Game } from "./engine";

describe("forest friends", () => {
  it("are six saved residents, one per world", () => {
    expect(FRIENDS).toHaveLength(6);
    expect(new Set(FRIENDS.map((f) => f.contentId)).size).toBe(6);
    for (const friend of FRIENDS) expect(CREATURE_IDS).toContain(friend.id);
  });

  it.each(FRIENDS.map((f) => [f.name, f] as const))(
    "%s waits on a fixed ledge an ordinary jump can reach",
    (_name, friend) => {
      const level = levels.find((l) => l.contentId === friend.contentId)!;
      expect(level, friend.contentId).toBeDefined();
      const solid = level.platforms.filter(
        (p) => (p.kind === "platform" || p.kind === "ground") && !p.motion,
      );
      // Standing on the ledge puts Pip's middle within reach of the friend.
      const ledge = solid.find(
        (p) =>
          friend.x > p.x + 20 &&
          friend.x < p.x + p.w - 20 &&
          Math.abs(p.y - 24 - friend.y) < 6,
      )!;
      expect(ledge, `${friend.name} has no ledge`).toBeDefined();
      // A lower step or the floor is close enough to jump up from.
      const step = solid.find(
        (p) =>
          p !== ledge &&
          p.y - ledge.y > 0 &&
          p.y - ledge.y <= 110 &&
          p.x < ledge.x + ledge.w + 110 &&
          p.x + p.w > ledge.x - 110,
      );
      expect(step, `${friend.name} cannot be reached`).toBeDefined();
      // Not sharing a perch with a firefly: it is its own little find.
      for (const f of level.fireflies)
        expect(
          Math.abs(f.x - friend.x) > 80 || Math.abs(f.y - friend.y) > 80,
        ).toBe(true);
      // Clear of every enemy patrol.
      for (const e of level.enemies)
        expect(
          friend.x < e.minX - 30 ||
            friend.x > e.maxX + 30 ||
            Math.abs(e.y - friend.y) > 60,
        ).toBe(true);
    },
  );
});

describe("bringing a friend along", () => {
  const apex = (helper: string | null) => {
    const g = new Game(0);
    g.helper = helper;
    const idle = { left: false, right: false, jump: false, jumpPressed: false };
    for (let i = 0; i < 30; i++) g.update(1 / 120, idle);
    const floor = g.player.y;
    let top = floor;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 120, { ...idle, jump: true, jumpPressed: i === 0 });
      top = Math.min(top, g.player.y);
    }
    return floor - top;
  };

  it("Sorrel adds a little height to every jump, and nothing else does", () => {
    const plain = apex(null);
    expect(apex("sorrel")).toBeGreaterThan(plain + 8);
    expect(apex("sorrel")).toBeLessThan(plain + 25);
    expect(apex("tansy")).toBeCloseTo(plain, 5);
  });

  it("Tansy draws in a coin from a short way off", () => {
    const pulled = (helper: string | null) => {
      const g = new Game(0);
      g.helper = helper;
      const p = g.player;
      const coin = g.coins[0]!;
      coin.move = undefined;
      coin.x = p.x + p.w / 2 + 60;
      coin.y = p.y + p.h / 2;
      const idle = {
        left: false,
        right: false,
        jump: false,
        jumpPressed: false,
      };
      for (let i = 0; i < 60; i++) g.update(1 / 120, idle);
      return coin.collected;
    };
    expect(pulled(null)).toBe(false);
    expect(pulled("tansy")).toBe(true);
  });

  it("only lets a rescued friend come along", () => {
    const save = { helper: null, rescuedCreatures: [] } as unknown as Save;
    expect(selectHelper(save, "wisp")).toBe(false);
    expect(save.helper).toBeNull();
    rescueCreature(save, "wisp");
    expect(selectHelper(save, "wisp")).toBe(true);
    expect(save.helper).toBe("wisp");
    expect(selectHelper(save, null)).toBe(true);
    expect(save.helper).toBeNull();
  });

  it("gives every friend its own perk line", () => {
    expect(new Set(FRIENDS.map((f) => f.perk)).size).toBe(FRIENDS.length);
  });
});

describe("playing as a friend", () => {
  it("needs the friend to be rescued first", () => {
    const save = {
      selectedCharacter: "pip",
      rescuedCreatures: [],
    } as unknown as Save;
    expect(selectCharacter(save, "button")).toBe(false);
    expect(save.selectedCharacter).toBe("pip");
    rescueCreature(save, "button");
    expect(selectCharacter(save, "button")).toBe(true);
    expect(save.selectedCharacter).toBe("button");
    expect(selectCharacter(save, "poppy")).toBe(true);
  });

  it("offers every forest friend, and they all play alike", () => {
    expect([...PLAYABLE_FRIEND_IDS].sort()).toEqual(
      FRIENDS.map((f) => f.id).sort(),
    );
    const run = (character: string) => {
      const g = new Game(0);
      g.character = character;
      const right = {
        left: false,
        right: true,
        jump: true,
        jumpPressed: false,
      };
      for (let i = 0; i < 240; i++)
        g.update(1 / 120, { ...right, jumpPressed: i === 20 });
      return [g.player.x, g.player.y, g.player.w, g.player.h];
    };
    expect(run("wisp")).toEqual(run("pip"));
  });
});
