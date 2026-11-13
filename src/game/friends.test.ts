import { describe, expect, it } from "vitest";
import { FRIENDS } from "./creatures";
import { levels } from "./levels";
import { CREATURE_IDS } from "../storage";

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
