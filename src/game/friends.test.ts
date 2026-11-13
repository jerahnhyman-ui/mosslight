import { describe, expect, it } from "vitest";
import { FRIENDS } from "./creatures";
import { levels, type Level } from "./levels";
import {
  HIDEAWAY_ROUTES,
  hideawayClimb,
  hideawayFriendSpot,
  hideawayLevels,
} from "./hideaways";
import {
  crossTraps,
  hops,
  idle,
  jump,
  slideAcross,
  step,
  tile,
  walk,
} from "./route-bot";
import {
  CREATURE_IDS,
  EXPLORATION_SECRET_IDS,
  PLAYABLE_FRIEND_IDS,
  selectCharacter,
  rescueCreature,
  selectHelper,
  type Save,
} from "../storage";
import { Game } from "./engine";

const bare = (level: Level) =>
  new Game(0, { level: { ...level, enemies: [] } });
function reachFriend(g: Game, id: string) {
  const friend = FRIENDS.find((f) => f.id === id)!;
  walk(g, friend.x);
  const p = g.player;
  expect(Math.abs(p.x + p.w / 2 - friend.x)).toBeLessThan(32);
  expect(Math.abs(p.y + p.h / 2 - friend.y)).toBeLessThan(34);
  // The way home opens once the far gate is reached.
  for (let i = 0; i < 120 * 6 && !g.secretCompleted; i++)
    step(g, { ...idle, right: true });
  expect(g.secretCompleted).toBe(true);
  expect(g.deaths).toBe(0);
}
const chainHops = (g: Game, edge: number, landX = edge + 780) =>
  hops(g, [
    [edge + 110, 390],
    [edge + 270, 370],
    [edge + 430, 390],
    [edge + 590, 370],
    [landX, 430],
  ]);

describe("forest friends", () => {
  it("are six saved residents, each in its own hidden level", () => {
    expect(FRIENDS).toHaveLength(6);
    for (const friend of FRIENDS) {
      expect(CREATURE_IDS).toContain(friend.id);
      const level = hideawayLevels[`hideaway-${friend.id}`];
      expect(friend.contentId).toBe(level.contentId);
      expect(EXPLORATION_SECRET_IDS).toContain(level.contentId);
      expect(hideawayFriendSpot(friend.id)).toEqual({
        x: friend.x,
        y: friend.y,
      });
      // Nobody waits in plain view on a world trail any more.
      expect(levels.some((l) => l.contentId === friend.contentId)).toBe(false);
    }
  });

  it.each(Object.entries(HIDEAWAY_ROUTES))(
    "%s hides a climb of sleeping vines to an out-of-sight gate",
    (contentId, route) => {
      const level = levels.find((l) => l.contentId === contentId)!;
      const climb = hideawayClimb(route.ledge);
      // The side ledge is part of the world, and the gate is above the
      // top of the screen for anyone on the trail floor.
      expect(
        level.platforms.some(
          (p) => p.x === route.ledge.x && p.y === route.ledge.y,
        ),
      ).toBe(true);
      expect(climb.gate.y).toBeLessThan(-70);
      const g = bare(level);
      const first = tile(g, `hideaway.${route.friend}.first`);
      const second = tile(g, `hideaway.${route.friend}.second`);
      // Asleep, the vines are not footholds at all.
      expect(first.awakened).toBe(false);
      expect(second.awakened).toBe(false);
      const p = g.player;
      p.x = route.ledge.x + route.ledge.w / 2;
      p.y = route.ledge.y - p.h;
      for (let i = 0; i < 40; i++) step(g);
      expect(p.grounded).toBe(true);
      jump(g, climb.first.x + 45, climb.first.y);
      jump(g, climb.second.x + 45, climb.second.y);
      jump(g, climb.third.x + 45, climb.third.y);
      jump(g, climb.gate.x + 70, climb.gate.y);
      for (let i = 0; i < 60; i++) step(g);
      expect(g.portalReady).toBe(`hideaway-${route.friend}`);
      expect(g.deaths).toBe(0);
    },
  );

  it("Seedling Burrow leads to Tansy", () => {
    const g = bare(hideawayLevels["hideaway-tansy"]);
    walk(g, 880);
    chainHops(g, 900);
    slideAcross(g, "hideaway.tansy.leaf", 2270, 2680);
    reachFriend(g, "tansy");
  });
  it("Leafpile Hollow leads to Brindle", () => {
    const g = bare(hideawayLevels["hideaway-brindle"]);
    walk(g, 680);
    chainHops(g, 700);
    crossTraps(g, 2200);
    walk(g, 2280);
    chainHops(g, 2300);
    reachFriend(g, "brindle");
  });
  it("Clover Warren leads to Sorrel", () => {
    const g = bare(hideawayLevels["hideaway-sorrel"]);
    slideAcross(g, "hideaway.sorrel.kite", 770, 1180);
    walk(g, 1780);
    chainHops(g, 1800, 2550);
    hops(g, [
      [2750, 420],
      [2950, 430],
    ]);
    reachFriend(g, "sorrel");
  });
  it("Otter Holt leads to Rill", () => {
    const g = bare(hideawayLevels["hideaway-rill"]);
    slideAcross(g, "hideaway.rill.log", 870, 1280);
    walk(g, 1980);
    chainHops(g, 2000);
    reachFriend(g, "rill");
  });
  it("Echo Roost leads to Wisp", () => {
    const g = bare(hideawayLevels["hideaway-wisp"]);
    walk(g, 680);
    hops(g, [
      [830, 420],
      [1030, 420],
      [1230, 420],
      [1450, 430],
    ]);
    walk(g, 1960);
    chainHops(g, 1980);
    reachFriend(g, "wisp");
  });
  it("Dewdrop Spiral leads to Button", () => {
    const g = bare(hideawayLevels["hideaway-button"]);
    slideAcross(g, "hideaway.button.petal.a", 670, 1080);
    slideAcross(g, "hideaway.button.petal.b", 1670, 2080);
    walk(g, 2580);
    chainHops(g, 2600);
    reachFriend(g, "button");
  });
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
