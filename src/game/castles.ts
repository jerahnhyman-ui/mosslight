import type { EnemyKind, Level, Platform } from "./levels";

// Castle levels for the major guardians of every fourth world. Each world's
// trail hands over to its castle, and each castle's door hands over to the
// guardian's own room, with a checkpoint right at the door. Every castle
// has its own feel:
// - Bramblethorn Keep (Thorn King): thorns burst from the floor on a beat.
// - Moonlit Belfry (Gloomwing): a dark belfry lit by lanterns, with bell
//   platforms that rise and slide, and loose roof shingles that fall.
// - Storm Citadel (Thunderhorn): gusts of wind and lightning that strikes
//   marked spots on a beat.

const ground = (x: number, w: number, y = 430): Platform => ({
  x,
  y,
  w,
  h: 660 - y,
  kind: "ground",
});
const ledge = (x: number, y: number, w: number): Platform => ({
  x,
  y,
  w,
  h: 20,
  kind: "platform",
});
const slider = (
  id: string,
  x: number,
  y: number,
  w: number,
  axis: "x" | "y",
  range: number,
  period: number,
  phase = 0,
): Platform => ({
  id,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period, phase },
});
const crumble = (id: string, x: number, y: number): Platform => ({
  id,
  x,
  y,
  w: 120,
  h: 20,
  kind: "crumble",
});
/** Four crumbling stones after a ledge edge at `edge`. */
const chain = (prefix: string, edge: number) => [
  crumble(`${prefix}.a`, edge + 50, 390),
  crumble(`${prefix}.b`, edge + 210, 370),
  crumble(`${prefix}.c`, edge + 370, 390),
  crumble(`${prefix}.d`, edge + 530, 370),
];
const chainCoins = (edge: number) =>
  [70, 230, 390, 550].flatMap((dx, i) => row(edge + dx, i % 2 ? 338 : 358, 2));
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const bug = (kind: EnemyKind, x: number, minX: number, maxX: number) => ({
  kind,
  x,
  y: 402,
  minX,
  maxX,
});
const thorns = (
  x: number,
  w: number,
  period = 2.6,
  active = 1.1,
  phase = 0,
) => ({
  kind: "thorns" as const,
  x,
  w,
  y: 430,
  period,
  active,
  phase,
});
const bolt = (x: number, period = 3, phase = 0) => ({
  kind: "lightning" as const,
  x,
  w: 44,
  y: 430,
  period,
  active: 0.4,
  phase,
});
const empty = { stars: [], diamonds: [], fireflies: [] };

/** Where each castle hands over to its guardian's room. */
export const BRAMBLE_DOOR_X = 4060;
export const BELFRY_DOOR_X = 4900;
export const CITADEL_DOOR_X = 4380;

export const brambleKeep: Level = {
  ...empty,
  id: 33,
  contentId: "castle.bramblethorn-keep",
  name: "Bramblethorn Keep",
  subtitle: "Thorns burst from the floor. Time your steps to the Thorn King.",
  kind: "world",
  theme: "windmill",
  castle: "bramble",
  width: 4300,
  spawn: { x: 120, y: 392 },
  platforms: [
    // Keep Gate: the first thorn beds, on a slow beat.
    ground(0, 900),
    // Bramble Bridge: crumbling stones over a moat.
    ...chain("castle.bramble.bridge", 900),
    // Thorn Hall: a wave of thorn beds, with a safe high road above.
    ground(1600, 1100),
    ledge(1880, 330, 160),
    ledge(2140, 290, 160),
    ledge(2400, 330, 160),
    // The Turning Tower: a sliding ledge across the courtyard.
    slider("castle.bramble.lift", 2790, 390, 130, "x", 60, 4.2),
    ground(3000, 1300),
    ledge(3250, 340, 140),
    ledge(3450, 260, 140),
  ],
  traps: [
    thorns(380, 90),
    thorns(620, 90, 2.6, 1.1, 1.3),
    thorns(1780, 90, 2.4, 1, 0),
    thorns(2020, 90, 2.4, 1, 0.8),
    thorns(2270, 90, 2.4, 1, 1.6),
    thorns(2520, 90, 2.4, 1, 0.4),
    thorns(3300, 220, 3, 1.3, 0.5),
  ],
  coins: [
    ...row(200, 392, 3),
    ...row(400, 330, 3),
    ...chainCoins(900),
    ...row(1900, 298, 4),
    ...row(2160, 258, 4),
    ...row(2420, 298, 4),
    ...row(2810, 340, 3),
    ...row(3270, 308, 3),
    ...row(3470, 228, 3),
  ],
  enemies: [
    bug("beetle", 760, 720, 840),
    bug("hopper", 2650, 2600, 2680),
    bug("charger", 3700, 3650, 3800),
  ],
  checkpoints: [
    { x: 120, y: 430 },
    { x: 1700, y: 430 },
    { x: 3060, y: 430 },
    { x: 3930, y: 430 },
  ],
  sections: [
    { x: 0, name: "Keep Gate" },
    { x: 900, name: "Bramble Bridge" },
    { x: 1600, name: "Thorn Hall" },
    { x: 2700, name: "The Turning Tower" },
    { x: 3900, name: "The Throne Door" },
  ],
  tutorials: [
    {
      x: 120,
      text: "Bramblethorn Keep. Thorns rustle and glow just before they burst from the floor.",
    },
    {
      x: 3930,
      text: "The Thorn King's door. This checkpoint holds if the fight goes badly.",
    },
  ],
  goal: { x: 4300, y: 430 },
};

export const moonlitBelfry: Level = {
  ...empty,
  id: 34,
  contentId: "castle.moonlit-belfry",
  name: "Moonlit Belfry",
  subtitle: "Climb through the dark belfry to Gloomwing's roost.",
  kind: "world",
  theme: "dusk",
  castle: "belfry",
  dark: true,
  width: 5100,
  spawn: { x: 120, y: 392 },
  platforms: [
    // Lantern Nave: loose shingles hang from the rafters.
    ground(0, 800),
    {
      id: "castle.belfry.rafter.a",
      x: 300,
      y: 180,
      w: 420,
      h: 20,
      kind: "platform",
    },
    // The Bell Rope: a swaying bell carries Pip across.
    slider("castle.belfry.bell", 890, 390, 130, "x", 60, 4.2),
    ground(1100, 800),
    ledge(1350, 340, 140),
    ledge(1550, 260, 140),
    // Rotten Boards: the floor gives way under Pip.
    ...chain("castle.belfry.boards", 1900),
    // The Long Gallery: more shingles above a long hall.
    ground(2600, 900),
    {
      id: "castle.belfry.rafter.b",
      x: 2800,
      y: 180,
      w: 460,
      h: 20,
      kind: "platform",
    },
    // The Bell Tower: a rising bell, a beam, and a sliding bell.
    slider("castle.belfry.rise", 3600, 340, 120, "y", 70, 4.6),
    ledge(3800, 280, 120),
    slider("castle.belfry.glide", 4000, 300, 120, "x", 70, 4.4, Math.PI / 2),
    ground(4300, 800),
  ],
  icicles: [
    ...[360, 470, 580, 660].map((x) => ({ x, y: 200 })),
    ...[2860, 2970, 3080, 3190].map((x) => ({ x, y: 200 })),
  ],
  lanterns: [
    { x: 160, y: 430, lit: true },
    { x: 1150, y: 430 },
    { x: 1820, y: 430 },
    { x: 2660, y: 430 },
    { x: 3420, y: 430 },
    { x: 4360, y: 430 },
    { x: 4700, y: 430 },
  ],
  coins: [
    ...row(250, 392, 3),
    ...row(910, 340, 3),
    ...row(1370, 308, 3),
    ...row(1570, 228, 3),
    ...chainCoins(1900),
    ...row(2700, 392, 4, 60),
    ...row(3620, 300, 3),
    ...row(3820, 248, 3),
    ...row(4020, 268, 3),
  ],
  enemies: [
    bug("hopper", 1700, 1650, 1820),
    bug("beetle", 3350, 3300, 3440),
    bug("charger", 4500, 4450, 4600),
  ],
  checkpoints: [
    { x: 120, y: 430 },
    { x: 1150, y: 430 },
    { x: 2660, y: 430 },
    { x: 4360, y: 430 },
    { x: 4760, y: 430 },
  ],
  sections: [
    { x: 0, name: "Lantern Nave" },
    { x: 800, name: "The Bell Rope" },
    { x: 1900, name: "Rotten Boards" },
    { x: 2600, name: "The Long Gallery" },
    { x: 3500, name: "The Bell Tower" },
    { x: 4700, name: "The Roost Door" },
  ],
  tutorials: [
    {
      x: 120,
      text: "The Moonlit Belfry. Loose shingles shake before they fall, so keep moving under the rafters.",
    },
    {
      x: 4760,
      text: "Gloomwing's door. This checkpoint holds if the fight goes badly.",
    },
  ],
  goal: { x: 5100, y: 430 },
};

export const stormCitadel: Level = {
  ...empty,
  id: 35,
  contentId: "castle.storm-citadel",
  name: "Storm Citadel",
  subtitle: "Brave the wind and the lightning to Thunderhorn's crag.",
  kind: "world",
  theme: "storm",
  castle: "citadel",
  width: 4600,
  spawn: { x: 120, y: 392 },
  platforms: [
    // Thunder Gate: lightning strikes the marked flagstones.
    ground(0, 1000),
    // Gale Bridge: solid ledges over a chasm, in the wind.
    ledge(1120, 380, 140),
    ledge(1340, 380, 140),
    ledge(1560, 380, 140),
    // Rampart Walk: a run of strikes in a rolling wave.
    ground(1780, 1020),
    // Shattered Stair: crumbling stones (no wind).
    ...chain("castle.citadel.stair", 2800),
    // The Crag Door.
    ground(3500, 1100),
  ],
  traps: [
    bolt(420, 3, 0),
    bolt(720, 3, 1.5),
    bolt(2000, 2.4, 0),
    bolt(2200, 2.4, 0.6),
    bolt(2400, 2.4, 1.2),
    bolt(2600, 2.4, 1.8),
    bolt(3750, 3, 0.4),
    bolt(3980, 3, 1.9),
  ],
  windZones: [
    { x: 200, w: 760, speed: -110, period: 4.4, duration: 1.5 },
    { x: 1060, w: 780, speed: -130, period: 4, duration: 1.8 },
  ],
  coins: [
    ...row(250, 392, 3),
    ...row(1160, 348, 2),
    ...row(1380, 348, 2),
    ...row(1600, 348, 2),
    ...row(1900, 392, 10, 80),
    ...chainCoins(2800),
    ...row(3600, 392, 4, 80),
  ],
  enemies: [bug("hopper", 3760, 3700, 3820), bug("charger", 4050, 3980, 4120)],
  checkpoints: [
    { x: 120, y: 430 },
    { x: 1850, y: 430 },
    { x: 3560, y: 430 },
    { x: 4250, y: 430 },
  ],
  sections: [
    { x: 0, name: "Thunder Gate" },
    { x: 1000, name: "Gale Bridge" },
    { x: 1780, name: "Rampart Walk" },
    { x: 2800, name: "Shattered Stair" },
    { x: 4200, name: "The Crag Door" },
  ],
  tutorials: [
    {
      x: 120,
      text: "The Storm Citadel. A glowing mark shows where lightning will strike next.",
    },
    {
      x: 4250,
      text: "Thunderhorn's door. This checkpoint holds if the fight goes badly.",
    },
  ],
  goal: { x: 4600, y: 430 },
};
