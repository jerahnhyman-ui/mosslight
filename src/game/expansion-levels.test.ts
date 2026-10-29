import { describe, expect, it } from "vitest";
import {
  beehiveLevel,
  flowerHoopsLevel,
  levels,
  windmillLevel,
} from "./levels";

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
    expect(windmillLevel.coins).toHaveLength(57);
    expect(beehiveLevel.coins).toHaveLength(15);
    expect(windmillLevel.fireflies.map((f) => f.id)).toEqual([
      "windmill.firefly.rafters",
      "windmill.firefly.reeds",
      "windmill.firefly.canopy",
    ]);
    expect(beehiveLevel.fireflies).toHaveLength(0);
  });

  it("places earned feather recovery near critical checkpoints and keeps full-height progress gates", () => {
    for (const level of [windmillLevel, beehiveLevel]) {
      expect(level.featherFountains ?? []).toHaveLength(0);
      expect(level.diamonds).toHaveLength(0);
      expect(level.stars).toHaveLength(0);
      for (const gate of level.gates ?? [])
        expect([gate.y, gate.h]).toEqual([0, 660]);
    }
    for (const checkpoint of windmillLevel.checkpoints.slice(-2))
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
    expect(windmillLevel.gates?.map((g) => g.x)).toEqual([
      2820, 5700, 6660, 10500,
    ]);
    expect(windmillLevel.checkpoints).toEqual([
      { x: 220, y: 430 },
      { x: 1992, y: 430 },
      { x: 3912, y: 430 },
      { x: 5832, y: 430 },
      { x: 6792, y: 430 },
      { x: 7752, y: 430 },
      { x: 9672, y: 430 },
      { x: 11592, y: 470 },
      { x: 12800, y: 470 },
    ]);
  });

  it("keeps the first flight catcher and arena geometry intact", () => {
    const has = (x: number, y: number, w: number) =>
      windmillLevel.platforms.some((p) => p.x === x && p.y === y && p.w === w);
    expect(has(1340, 490, 420)).toBe(true);
    expect(has(1580, 310, 180)).toBe(true);
    expect(has(11520, 470, 960)).toBe(true);
    expect(has(11800, 390, 140)).toBe(true);
    expect(has(12060, 390, 140)).toBe(true);
    expect(windmillLevel.boss).toMatchObject({
      kind: "millkeeper",
      x: 11948,
      y: 470,
      minX: 11660,
      maxX: 12360,
    });
    expect(windmillLevel.finalBoss).toMatchObject({
      kind: "heartwood",
      x: 13900,
      y: 470,
    });
    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12])
      expect(windmillLevel.platforms).toContainEqual({
        id: `trellis.${i}`,
        x: i * 960,
        y: 32,
        w: 960,
        h: 32,
        kind: "ground",
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
