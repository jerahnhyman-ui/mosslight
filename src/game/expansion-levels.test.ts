import { describe, expect, it } from "vitest";
import {
  beehiveLevel,
  flowerHoopsLevel,
  levels,
  windmillLevel,
} from "./levels";
import { thornKingLevel } from "./boss-level";

describe("windmill expansion level definitions", () => {
  it("keeps content identities, world order, and collectible economy stable", () => {
    expect(levels[3]).toBe(windmillLevel);
    expect([windmillLevel.id, beehiveLevel.id, flowerHoopsLevel.id]).toEqual([
      4, 20, 21,
    ]);
    expect([
      windmillLevel.contentId,
      beehiveLevel.contentId,
      flowerHoopsLevel.contentId,
    ]).toEqual([
      "world.windmill-garden",
      "secret.beehive",
      "minigame.flower_hoops",
    ]);
    expect(windmillLevel.coins.length).toBeGreaterThan(0);
    expect(beehiveLevel.coins).toHaveLength(15);
    expect(windmillLevel.fireflies.map((f) => f.id)).toEqual([
      "windmill.firefly.rafters",
      "windmill.firefly.reeds",
      "windmill.firefly.canopy",
    ]);
    expect(beehiveLevel.fireflies).toHaveLength(0);
  });

  it("places earned feather recovery near the boss checkpoints without switch gates", () => {
    for (const level of [windmillLevel, beehiveLevel]) {
      expect(level.featherFountains ?? []).toHaveLength(0);
      expect(level.diamonds).toHaveLength(0);
      expect(level.stars).toHaveLength(0);
    }
    for (const checkpoint of windmillLevel.checkpoints.slice(-1))
      expect(
        windmillLevel.platforms.some(
          (p) =>
            p.rewardPower === "feather" && Math.abs(p.x - checkpoint.x) < 100,
        ),
      ).toBe(true);
    for (const checkpoint of beehiveLevel.checkpoints)
      expect(
        beehiveLevel.platforms.some(
          (p) =>
            p.rewardPower === "feather" && Math.abs(p.x - checkpoint.x) < 100,
        ),
      ).toBe(true);
    expect(windmillLevel.gates ?? []).toEqual([]);
    expect(windmillLevel.mechanisms ?? []).toEqual([]);
    expect(beehiveLevel.mechanisms ?? []).toEqual([]);
    expect(beehiveLevel.gates ?? []).toEqual([]);
    expect(
      windmillLevel.platforms.filter((p) => p.motion).length,
    ).toBeGreaterThan(1);
    expect(windmillLevel.checkpoints.length).toBeGreaterThanOrEqual(4);
    expect(
      windmillLevel.checkpoints.every(
        (point, index, points) => index === 0 || point.x > points[index - 1]!.x,
      ),
    ).toBe(true);
  });

  it("gives each checkpoint stable footing", () => {
    for (const point of windmillLevel.checkpoints) {
      expect(
        windmillLevel.platforms.some(
          (p) =>
            (p.kind === "ground" || p.kind === "platform") &&
            !p.motion &&
            p.y === point.y &&
            p.x <= point.x &&
            p.x + p.w >= point.x + 28,
        ),
        `checkpoint at ${point.x}, ${point.y} needs stable footing`,
      ).toBe(true);
    }
  });

  it("leads directly to the separate Thorn King encounter", () => {
    expect(windmillLevel.boss).toBeUndefined();
    expect(windmillLevel.finalBoss).toBeUndefined();
    expect(thornKingLevel.boss).toMatchObject({
      kind: "heartwood",
      x: 1300,
      y: 470,
    });
  });

  it("defines sixteen uniquely identified hoops and eight matching landing pads", () => {
    expect(flowerHoopsLevel.spawn).toEqual({ x: 180, y: 352 });
    expect(flowerHoopsLevel.hoops).toHaveLength(16);
    expect(new Set(flowerHoopsLevel.hoops?.map((h) => h.id)).size).toBe(16);
    expect(flowerHoopsLevel.landingPads).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(
        flowerHoopsLevel.hoops
          ?.filter((h) => h.cell === i)
          .map((h) => [h.x, h.y]),
      ).toEqual([
        [i * 900 + 360, 185],
        [i * 900 + 500, 295],
      ]);
      expect(flowerHoopsLevel.landingPads?.[i]).toMatchObject({
        x: i * 900 + 520,
        y: 390,
        w: 200,
        cell: i,
      });
    }
  });
});
