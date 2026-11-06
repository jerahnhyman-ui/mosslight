import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Snowdrift Peaks is the ninth world: a snowy mountain trail. Icicles hang
// from rocky overhangs and shake loose when Pip passes beneath, so keep
// moving. Snow bridges crumble a moment after landing, sliding ledges carry
// Pip over the wider gorges, and a hidden loft sits high above a snowcap
// mushroom. The trail ends at Grumble's Den, a dedicated boss level.

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
const lift = (
  id: string,
  x: number,
  y: number,
  w: number,
  axis: "x" | "y",
  range: number,
  period: number,
  phase = 0,
): Platform => ({
  id: `snow.lift.${id}`,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period, phase },
});
/** A snow bridge: it crumbles soon after Pip lands, then reforms. */
const snowBridge = (id: string, x: number, y: number, w = 120): Platform => ({
  id: `snow.bridge.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
/** A rocky overhang high above the trail, for icicles to hang from. */
const overhang = (x: number, w: number, y = 180): Platform => ({
  id: `snow.overhang.${x}`,
  x,
  y,
  w,
  h: 20,
  kind: "platform",
});
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
/** Coins that bob back and forth along one axis. */
const bobbing = (
  coins: { x: number; y: number }[],
  axis: "x" | "y",
  range: number,
  period: number,
) =>
  coins.map((c, i) => ({
    ...c,
    move: { axis, range, period, phase: i * 0.5 },
  }));
const bug = (
  kind: EnemyKind,
  x: number,
  minX: number,
  maxX: number,
  y = 402,
) => ({ kind, x, y, minX, maxX });

/** Reaching here hands the run to Grumble's Den. */
export const SNOW_FINALE_X = 9000;
export const SNOW_FINAL_CHECKPOINT = 8850;

export const snowLevel: Level = withRewardBlocks({
  id: 9,
  contentId: "world.snowdrift-peaks",
  name: "Snowdrift Peaks",
  subtitle: "Climb the snowy peaks, and mind the icicles.",
  kind: "world",
  theme: "snow",
  width: 9400,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Frosty Trailhead: easy steps, then the first icicles.
    ground(0, 1300),
    ledge(340, 350, 150),
    ledge(580, 300, 150),
    overhang(820, 300),
    // Gorge Glide: a sliding ledge over the first gorge.
    lift("gorge", 1390, 390, 130, "x", 60, 4.2),
    ground(1600, 800),
    // Snowbridge Span: four crumbling snow bridges.
    snowBridge("a", 2450, 390),
    snowBridge("b", 2610, 370),
    snowBridge("c", 2770, 390),
    snowBridge("d", 2930, 370),
    // Snowcap Loft: a mushroom launches Pip to a hidden loft; icicles
    // guard the trail beyond it.
    ground(3100, 1300),
    { x: 3300, y: 408, w: 90, h: 22, kind: "mushroom" },
    ledge(3440, 210, 160),
    ledge(3660, 120, 150),
    overhang(3900, 360),
    // Windy Lifts: a rising ledge, a rest, then a sliding ledge.
    lift("rise", 4500, 340, 120, "y", 70, 4.6),
    ledge(4700, 280, 120),
    lift("glide", 4900, 300, 120, "x", 70, 4.4, Math.PI / 2),
    // Summit Steps: a staircase to a firefly above the snowfield.
    ground(5200, 1400),
    ledge(5600, 340, 140),
    ledge(5800, 260, 140),
    ledge(6000, 180, 140),
    // Avalanche Run: another sliding ledge, then a long icicle gallery.
    lift("run", 6690, 390, 130, "x", 60, 4.2),
    ground(6900, 2500),
    overhang(7200, 420),
    ledge(7900, 340, 140),
    ledge(8100, 260, 140),
    ledge(8300, 180, 140),
  ],
  icicles: [
    { x: 880, y: 200 },
    { x: 1000, y: 200 },
    { x: 1090, y: 200 },
    { x: 3950, y: 200 },
    { x: 4060, y: 200 },
    { x: 4170, y: 200 },
    { x: 4230, y: 200 },
    { x: 7250, y: 200 },
    { x: 7360, y: 200 },
    { x: 7470, y: 200 },
    { x: 7580, y: 200 },
  ],
  coins: [
    ...row(365, 318, 3),
    ...row(605, 268, 3),
    ...bobbing(row(1410, 340, 3), "x", 40, 2.4),
    ...row(2470, 358, 2),
    ...row(2630, 338, 2),
    ...row(2790, 358, 2),
    ...row(2950, 338, 2),
    ...row(3330, 300, 2),
    ...row(3460, 178, 4),
    ...row(4520, 300, 3),
    ...row(4720, 248, 3),
    ...bobbing(row(4920, 268, 3), "y", 18, 1.8),
    ...row(5620, 308, 3),
    ...row(5820, 228, 3),
    ...row(6020, 148, 3),
    ...row(6710, 340, 3),
    ...row(7920, 308, 3),
    ...row(8120, 228, 3),
    ...row(8320, 148, 3),
  ],
  stars: [],
  diamonds: [],
  coinRings: [
    {
      x: 7020,
      y: 395,
      time: 5,
      coins: row(7080, 392, 13, 60),
    },
  ],
  fireflies: [
    { x: 3730, y: 85, id: "snow.firefly.snowcap-loft" },
    { x: 6070, y: 145, id: "snow.firefly.summit-steps" },
    { x: 8370, y: 145, id: "snow.firefly.icicle-gallery" },
  ],
  enemies: [
    bug("beetle", 700, 640, 760),
    bug("hopper", 2000, 1900, 2150),
    bug("charger", 3500, 3450, 3600),
    bug("beetle", 4100, 4020, 4250),
    bug("hopper", 5420, 5350, 5500),
    bug("charger", 6300, 6200, 6450),
    bug("beetle", 7700, 7650, 7800),
    bug("hopper", 8500, 8450, 8650),
  ],
  checkpoints: [
    { x: 1150, y: 430 },
    { x: 1700, y: 430 },
    { x: 2300, y: 430 },
    { x: 3150, y: 430 },
    { x: 4380, y: 430 },
    { x: 5250, y: 430 },
    { x: 6560, y: 430 },
    { x: 6950, y: 430 },
    { x: SNOW_FINAL_CHECKPOINT, y: 430 },
  ],
  sections: [
    { x: 0, name: "Frosty Trailhead" },
    { x: 1300, name: "Gorge Glide" },
    { x: 2400, name: "Snowbridge Span" },
    { x: 3100, name: "Snowcap Loft" },
    { x: 4400, name: "Windy Lifts" },
    { x: 5200, name: "Summit Steps" },
    { x: 6600, name: "Avalanche Run" },
    { x: 8700, name: "Grumble's Gate" },
  ],
  clues: [
    {
      x: 3240,
      y: 405,
      kind: "footprints",
      text: "Tracks lead up from the snowcap mushroom to somewhere high.",
    },
    {
      x: 5540,
      y: 405,
      kind: "glow",
      text: "A light twinkles at the top of the summit steps.",
    },
    {
      x: 7850,
      y: 405,
      kind: "grass",
      text: "Past the icicles, the ledges climb toward one more glow.",
    },
  ],
  tutorials: [
    {
      x: 120,
      text: "Welcome to the peaks. Icicles shake before they fall, so keep moving under them.",
    },
    {
      x: 2300,
      text: "Snow bridges crumble soon after you land. Keep hopping!",
    },
    {
      x: SNOW_FINAL_CHECKPOINT,
      text: "Grumble's Den is ahead. Grab what you need before the gate.",
    },
  ],
  // The app hands the run to Grumble's Den before this point.
  goal: { x: 9400, y: 430 },
});

/** World 9's dedicated boss level: a snowy den with a retry checkpoint. */
export const grumbleLevel: Level = {
  id: 29,
  contentId: "boss.grumble",
  name: "Grumble's Den",
  subtitle: "Face Grumble, the Snow Bear.",
  kind: "world",
  theme: "snow",
  width: 2580,
  spawn: { x: 200, y: 432 },
  platforms: [
    { x: 0, y: 470, w: 2580, h: 190, kind: "ground" },
    {
      id: "grumble.retry.diamond",
      x: 110,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "diamond",
    },
    {
      id: "grumble.retry.feather",
      x: 280,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "feather",
    },
  ],
  coins: [],
  stars: [],
  diamonds: [],
  fireflies: [],
  enemies: [],
  checkpoints: [{ x: 200, y: 470 }],
  sections: [{ x: 0, name: "Grumble's Den" }],
  tutorials: [
    {
      x: 200,
      text: "Grumble slams the snow: jump the shockwaves and step off the icicle shadows. Stomp it while it's dizzy.",
    },
  ],
  boss: {
    kind: "bear",
    name: "Grumble, the Snow Bear",
    x: 1300,
    y: 470,
    minX: 980,
    maxX: 1900,
  },
  goal: { x: 2480, y: 470 },
};
