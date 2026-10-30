import type { Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// All authored positions are cell-local; translating them here keeps the
// geometry aligned with the design's tables and avoids duplicated constants.
const floor = (cell: number, x: number, y: number, w: number): Platform => ({
  x: cell * 960 + x,
  y,
  w,
  h: 660 - y,
  kind: "ground",
});
const shelf = (cell: number, x: number, y: number, w: number): Platform => ({
  x: cell * 960 + x,
  y,
  w,
  h: 20,
  kind: "platform",
});
const roof = (cell: number): Platform => ({
  id: `trellis.${cell}`,
  x: cell * 960,
  y: 32,
  w: 960,
  h: 32,
  kind: "ground",
});
const pts = (cell: number, x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: cell * 960 + x + i * gap, y }));
// Each checkpoint is on solid ground immediately before a new challenge.
const cp = [
  { x: 220, y: 430 },
  { x: 1250, y: 430 },
  { x: 1992, y: 430 },
  { x: 3050, y: 430 },
  { x: 3912, y: 430 },
  { x: 5180, y: 430 },
  { x: 5832, y: 430 },
  { x: 6792, y: 430 },
  { x: 7445, y: 270 },
  { x: 7752, y: 430 },
  { x: 7900, y: 300 },
  { x: 8720, y: 430 },
  { x: 9672, y: 430 },
  { x: 11592, y: 470 },
  { x: 12800, y: 470 },
];

/** A broad moving sail, with its visible deck matching the collision surface. */
const sail = (
  id: string,
  cell: number,
  x: number,
  y: number,
  w: number,
  range: number,
  period: number,
): Platform => ({
  ...shelf(cell, x, y, w),
  id: `windmill.sail.${id}`,
  motion: { axis: "x", range, period },
});

// An entirely new fourth adventure: ground runs alternate with moving sail
// crossings and optional high routes. All gaps have a nearby checkpoint and
// are passable with ordinary jumping; the feather offers another route.
export const windmillLevel: Level = withRewardBlocks({
  id: 4,
  contentId: "world.windmill-garden",
  name: "Windmill Garden",
  subtitle: "Ride the wind through a wild garden of moving sails.",
  kind: "world",
  theme: "windmill",
  width: 15180,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Flowerbank: a calm entrance with a high path and room to learn.
    floor(0, 0, 430, 960),
    shelf(0, 300, 350, 160),
    shelf(0, 560, 300, 160),
    // Clover Crossing: a short moving bridge over the first gap.
    floor(1, 0, 430, 360),
    floor(1, 560, 430, 400),
    sail("clover", 1, 360, 380, 150, 55, 4.8),
    shelf(1, 700, 350, 160),
    // Sail Run: two adjacent traversable heights, with a longer lower gap.
    floor(2, 0, 430, 360),
    floor(2, 660, 430, 300),
    shelf(2, 200, 300, 120),
    sail("meadow", 2, 400, 350, 150, 65, 4.4),
    shelf(2, 670, 310, 170),
    // Bellflower Rise: the upper firefly route branches off the main trail.
    floor(3, 0, 430, 960),
    shelf(3, 220, 350, 160),
    shelf(3, 470, 250, 190),
    shelf(3, 730, 330, 160),
    // Lily Hollow: a low garden dip with an independently sliding leaf.
    floor(4, 0, 430, 250),
    floor(4, 250, 490, 450),
    floor(4, 700, 430, 260),
    shelf(4, 230, 360, 140),
    sail("lily", 4, 430, 380, 150, 60, 5.2),
    shelf(4, 690, 350, 170),
    // Fern Run: a ground route, with a hidden firefly near a lower fern.
    floor(5, 0, 430, 960),
    shelf(5, 260, 350, 160),
    shelf(5, 590, 300, 160),
    shelf(5, 800, 350, 160),
    // Millstream: an open-air moving sail over the widest gap.
    floor(6, 0, 430, 340),
    floor(6, 700, 430, 260),
    shelf(6, 160, 300, 120),
    sail("millstream", 6, 400, 350, 150, 75, 4.6),
    shelf(6, 700, 300, 160),
    // Honeybloom: climb visible ledges to the optional beehive entrance.
    floor(7, 0, 430, 960),
    shelf(7, 260, 350, 160),
    shelf(7, 480, 310, 150),
    shelf(7, 700, 270, 240),
    // Sunpetal Crossing: a second sliding sail with an enemy on the far side.
    floor(8, 0, 430, 290),
    floor(8, 600, 430, 360),
    shelf(8, 170, 300, 120),
    sail("sunpetal", 8, 340, 360, 150, 65, 4.1),
    shelf(8, 650, 350, 160),
    // High Canopy: the last firefly rewards the elevated route.
    floor(9, 0, 430, 960),
    shelf(9, 220, 350, 160),
    shelf(9, 420, 250, 190),
    shelf(9, 710, 320, 170),
    // The final trail leads directly to the windmill on solid ground. A
    // higher sliding sail is an optional route, not a required detour.
    floor(10, 0, 430, 960),
    shelf(10, 280, 350, 150),
    sail("windward", 10, 570, 300, 150, 55, 4.3),
    shelf(10, 820, 350, 140),
    // Keep the established boss arenas and safe fourth-world finale.
    floor(11, 0, 430, 820),
    floor(11, 820, 470, 140),
    floor(12, 0, 470, 960),
    floor(13, 0, 470, 2700),
    shelf(12, 280, 390, 140),
    shelf(12, 540, 390, 140),
  ],
  coins: [
    ...pts(0, 340, 318, 3),
    ...pts(0, 650, 398, 4),
    ...pts(1, 610, 398, 3),
    ...pts(2, 690, 278, 3),
    ...pts(3, 480, 218, 4),
    ...pts(4, 420, 458, 3),
    ...pts(5, 400, 398, 3),
    ...pts(6, 730, 268, 3),
    ...pts(7, 520, 278, 3),
    ...pts(8, 680, 318, 3),
    ...pts(9, 445, 218, 4),
    ...pts(10, 100, 398, 3),
    ...pts(10, 300, 318, 3),
    ...pts(10, 700, 398, 3),
    ...pts(11, 200, 398, 3),
    ...pts(11, 500, 398, 3),
  ],
  stars: [],
  diamonds: [],
  fireflies: [
    { x: 3390, y: 218, id: "windmill.firefly.rafters" },
    { x: 5455, y: 268, id: "windmill.firefly.reeds" },
    { x: 9140, y: 218, id: "windmill.firefly.canopy" },
  ],
  enemies: [
    { kind: "beetle", x: 780, y: 402, minX: 700, maxX: 860 },
    { kind: "hopper", x: 1760, y: 402, minX: 1700, maxX: 1830 },
    { kind: "beetle", x: 3260, y: 402, minX: 3170, maxX: 3350 },
    { kind: "hopper", x: 3650, y: 402, minX: 3570, maxX: 3720 },
    { kind: "charger", x: 5500, y: 402, minX: 5420, maxX: 5600 },
    { kind: "beetle", x: 8360, y: 402, minX: 8290, maxX: 8490 },
    { kind: "hopper", x: 8900, y: 402, minX: 8830, maxX: 8980 },
    { kind: "charger", x: 10100, y: 402, minX: 10000, maxX: 10150 },
    { kind: "hopper", x: 10830, y: 402, minX: 10760, maxX: 10900 },
  ],
  checkpoints: cp,
  portals: [
    {
      id: "portal.beehive",
      x: 7464,
      y: 270,
      w: 80,
      target: "beehive",
      requires: "discovery",
    },
  ],
  sections: [
    "Flowerbank",
    "Clover Crossing",
    "Sail Run",
    "Bellflower Rise",
    "Lily Hollow",
    "Fern Run",
    "Millstream",
    "Honeybloom",
    "Sunpetal Crossing",
    "High Canopy",
    "Millkeeper Trail",
    "Millkeeper Approach",
    "The Millkeeper",
  ]
    .map((name, i) => ({ x: i * 960, name }))
    .concat([
      { x: 12700, name: "Heartwood Approach" },
      { x: 13200, name: "The Thorn King's Grove" },
    ]),
  tutorials: [
    { x: 120, text: "Bump glowing blocks from below to earn a power." },
    {
      x: 1100,
      text: "Bump the feather block. Jump, let go, then hold Jump again to fly.",
    },
    { x: 1250, text: "Ride the sliding sail, then jump onto the far bank." },
    { x: 3000, text: "Explore the high leaves to find a hidden firefly." },
    { x: 5832, text: "Wait for the sail, then ride it across Millstream." },
    { x: 7200, text: "The high honeybloom path leads to a hidden beehive." },
    { x: 9672, text: "Follow the path right to the Mill Keeper." },
    {
      x: 11300,
      text: "The Mill Keeper awaits. Bump the feather block in the arena to fly.",
    },
    {
      x: 12800,
      text: "Briarheart waits ahead. Prepare for the final guardian.",
    },
  ],
  boss: {
    kind: "millkeeper",
    name: "The Millkeeper",
    x: 11948,
    y: 470,
    minX: 11660,
    maxX: 12360,
  },
  finalBoss: {
    kind: "heartwood",
    name: "Briarheart, the Thorn King",
    x: 13900,
    y: 470,
    minX: 13580,
    maxX: 14600,
  },
  goal: { x: 15080, y: 470 },
});

export const beehiveLevel: Level = withRewardBlocks({
  id: 20,
  contentId: "secret.beehive",
  name: "Lantern Beehive",
  subtitle: "Fly through the honeycomb and discover the hidden nursery.",
  kind: "secret",
  theme: "hive",
  width: 2880,
  spawn: { x: 80, y: 392 },
  platforms: [
    floor(0, 0, 430, 960),
    shelf(0, 200, 350, 180),
    shelf(0, 460, 270, 180),
    shelf(0, 760, 330, 200),
    floor(1, 0, 490, 300),
    floor(1, 500, 490, 460),
    shelf(1, 0, 330, 180),
    shelf(1, 400, 330, 200),
    shelf(1, 780, 350, 180),
    shelf(1, 600, 410, 180),
    shelf(1, 180, 430, 180),
    floor(2, 0, 430, 680),
    floor(2, 820, 430, 140),
    shelf(2, 180, 350, 180),
    shelf(2, 440, 270, 200),
    {
      id: "beehive.drifting-ledge",
      ...shelf(2, 680, 350, 140),
      motion: { axis: "x", range: 50, period: 4.5 },
    },
    ...Array.from({ length: 3 }, (_, i) => roof(i)),
  ],
  coins: [
    ...pts(0, 480, 238, 3),
    ...pts(1, 420, 298, 3),
    ...pts(2, 460, 238, 3),
    ...pts(1, 300, 458, 6),
  ],
  stars: [],
  diamonds: [],
  fireflies: [],
  enemies: [],
  checkpoints: [
    { x: 80, y: 430 },
    { x: 1992, y: 430 },
  ],
  featherFountains: [
    { x: 80, y: 430 },
    { x: 1420, y: 490 },
    { x: 1992, y: 430 },
  ],
  portals: [
    { id: "portal.return.entrance", x: 120, y: 430, w: 80, target: "return" },
    {
      id: "portal.return.exit",
      x: 2780,
      y: 430,
      w: 80,
      target: "return",
      requires: "completion",
    },
  ],
  sections: [
    { x: 0, name: "Pollen Foyer" },
    { x: 960, name: "Honeycomb Walk" },
    { x: 1920, name: "Lantern Nursery" },
  ],
  tutorials: [
    {
      x: 200,
      text: "Follow the high honeycomb ledges; land to refill your feather.",
    },
  ],
  goal: { x: 2750, y: 430 },
});

export const flowerHoopsLevel: Level = {
  id: 21,
  contentId: "minigame.flower_hoops",
  name: "Petal Post",
  subtitle: "Fly through the flowers and land softly.",
  kind: "minigame",
  theme: "windmill",
  width: 7200,
  spawn: { x: 180, y: 352 },
  platforms: [
    { x: 0, y: 470, w: 7200, h: 190, kind: "ground" },
    { id: "trellis.course", x: 0, y: 32, w: 7200, h: 32, kind: "ground" },
    ...Array.from({ length: 8 }, (_, i): Platform[] => [
      {
        id: `launch.${i}`,
        x: i * 900 + 100,
        y: 390,
        w: 160,
        h: 20,
        kind: "platform",
      },
      {
        id: `landing.${i}`,
        x: i * 900 + 520,
        y: 390,
        w: 200,
        h: 20,
        kind: "platform",
      },
    ]).flat(),
  ],
  hoops: Array.from({ length: 8 }, (_, i) => [
    { id: `hoop.${i}.a`, x: i * 900 + 360, y: 185, cell: i },
    { id: `hoop.${i}.b`, x: i * 900 + 500, y: 295, cell: i },
  ]).flat(),
  landingPads: Array.from({ length: 8 }, (_, i) => ({
    id: `landing.${i}`,
    x: i * 900 + 520,
    y: 390,
    w: 200,
    cell: i,
  })),
  coins: [],
  stars: [],
  diamonds: [],
  fireflies: [],
  enemies: [],
  checkpoints: [],
  sections: Array.from({ length: 8 }, (_, i) => ({
    x: i * 900,
    name: `Garden ${i + 1}`,
  })),
  tutorials: [
    {
      x: 40,
      text: "Release to descend; land to refill. Ease your steering to line up the lower hoop.",
    },
  ],
  goal: { x: 7140, y: 470 },
};
