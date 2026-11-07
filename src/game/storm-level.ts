import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Thunderhead Heights is the twelfth world: a stormy mountain ridge. Gusts of
// wind blow back across parts of the trail on a steady beat, and streaks of
// wind warn just before each one; cross the windy gaps in the calm between
// gusts. Every gust zone sits over solid ledges, never over moving or
// crumbling ones. As every fourth world does, it ends at a separate
// major-boss level, Thunderhorn's Crag, with a checkpoint before the gate.

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
  id: `storm.lift.${id}`,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period, phase },
});
/** Storm-worn stone: it crumbles soon after Pip lands, then settles back. */
const loose = (id: string, x: number, y: number, w = 120): Platform => ({
  id: `storm.loose.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const bug = (
  kind: EnemyKind,
  x: number,
  minX: number,
  maxX: number,
  y = 402,
) => ({ kind, x, y, minX, maxX });
/** A headwind gust: it blows for `duration` seconds out of every `period`. */
const gust = (
  x: number,
  w: number,
  speed = -130,
  period = 4,
  duration = 1.8,
  phase = 0,
) => ({ x, w, speed, period, duration, phase });

/** Reaching here hands the run to Thunderhorn's Crag. */
export const STORM_FINALE_X = 9000;
export const STORM_FINAL_CHECKPOINT = 8850;

export const stormLevel: Level = withRewardBlocks({
  id: 12,
  contentId: "world.thunderhead-heights",
  name: "Thunderhead Heights",
  subtitle: "Brave the windy ridge and cross between the gusts.",
  kind: "world",
  theme: "storm",
  width: 9400,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Stormgate: a first, gentle gust on solid ground.
    ground(0, 1300),
    ledge(340, 350, 150),
    // Cloudbreak Glide: a sliding ledge over the first gorge (no wind).
    lift("gorge", 1390, 390, 130, "x", 60, 4.2),
    ground(1600, 800),
    // Gale Steps: three solid ledges over a chasm, in the wind.
    ledge(2520, 380, 140),
    ledge(2740, 380, 140),
    ledge(2960, 380, 140),
    // Thunder Loft: a mushroom launches Pip to a hidden loft.
    ground(3180, 1220),
    { x: 3400, y: 408, w: 90, h: 22, kind: "mushroom" },
    ledge(3540, 210, 160),
    ledge(3760, 120, 150),
    // Updraft Lifts: a rising ledge, a rest, then a sliding ledge.
    lift("rise", 4500, 340, 120, "y", 70, 4.6),
    ledge(4700, 280, 120),
    lift("glide", 4900, 300, 120, "x", 70, 4.4, Math.PI / 2),
    // Windy Stair: a climb to a firefly; gusts blow across the steps.
    ground(5200, 1400),
    ledge(5600, 340, 140),
    ledge(5800, 260, 140),
    ledge(6000, 180, 140),
    // Thunder Bridge: loose stones over the deepest drop (no wind).
    loose("a", 6650, 390),
    loose("b", 6810, 370),
    loose("c", 6970, 390),
    loose("d", 7130, 370),
    // Galeward Run: a long windy stretch, then a last climb to the gate.
    ground(7300, 2100),
    ledge(7950, 340, 140),
    ledge(8150, 260, 140),
    ledge(8350, 180, 140),
  ],
  windZones: [
    gust(500, 750, -95, 4.5, 1.6),
    gust(2330, 960, -115),
    gust(5560, 620, -95, 4.2, 1.6, 1),
    gust(7450, 450, -140, 4, 2),
  ],
  coinRings: [
    {
      x: 7420,
      y: 395,
      time: 4,
      coins: row(7480, 392, 8, 55),
    },
  ],
  coins: [
    ...row(365, 318, 3),
    ...row(700, 392, 5, 60),
    ...row(1410, 340, 3),
    ...row(2560, 348, 2),
    ...row(2780, 348, 2),
    ...row(3000, 348, 2),
    ...row(3430, 300, 2),
    ...row(3560, 178, 4),
    ...row(4520, 300, 3),
    ...row(4720, 248, 3),
    ...row(4920, 268, 3),
    ...row(5620, 308, 3),
    ...row(5820, 228, 3),
    ...row(6020, 148, 3),
    ...row(6670, 358, 2),
    ...row(6830, 338, 2),
    ...row(6990, 358, 2),
    ...row(7150, 338, 2),
    ...row(7970, 308, 3),
    ...row(8170, 228, 3),
    ...row(8370, 148, 3),
  ],
  stars: [],
  diamonds: [],
  fireflies: [
    { x: 3830, y: 85, id: "storm.firefly.thunder-loft" },
    { x: 6070, y: 145, id: "storm.firefly.windy-stair" },
    { x: 8420, y: 145, id: "storm.firefly.galeward" },
  ],
  enemies: [
    bug("beetle", 900, 800, 1050),
    bug("hopper", 2000, 1900, 2150),
    bug("charger", 3650, 3600, 3800),
    bug("beetle", 4150, 4050, 4250),
    bug("hopper", 5420, 5350, 5500),
    bug("charger", 6300, 6200, 6450),
    bug("beetle", 8000, 7900, 8100),
    bug("hopper", 8550, 8500, 8700),
  ],
  checkpoints: [
    { x: 1150, y: 430 },
    { x: 1700, y: 430 },
    { x: 2250, y: 430 },
    { x: 3250, y: 430 },
    { x: 4380, y: 430 },
    { x: 5250, y: 430 },
    { x: 6560, y: 430 },
    { x: 7360, y: 430 },
    { x: STORM_FINAL_CHECKPOINT, y: 430 },
  ],
  sections: [
    { x: 0, name: "Stormgate" },
    { x: 1300, name: "Cloudbreak Glide" },
    { x: 2400, name: "Gale Steps" },
    { x: 3180, name: "Thunder Loft" },
    { x: 4400, name: "Updraft Lifts" },
    { x: 5200, name: "Windy Stair" },
    { x: 6600, name: "Thunder Bridge" },
    { x: 7300, name: "Galeward Run" },
    { x: 8750, name: "Thunderhorn's Gate" },
  ],
  clues: [
    {
      x: 3340,
      y: 405,
      kind: "footprints",
      text: "Hoofprints lead up from the storm mushroom to a high loft.",
    },
    {
      x: 5540,
      y: 405,
      kind: "glow",
      text: "A light flickers at the top of the windy stair.",
    },
    {
      x: 7900,
      y: 405,
      kind: "grass",
      text: "Beyond the gale, the ledges climb toward one more glow.",
    },
  ],
  tutorials: [
    {
      x: 120,
      text: "A storm is blowing. When wind streaks appear, a gust is coming: it pushes you back.",
    },
    {
      x: 2250,
      text: "Wait for the gust to pass, then jump the gaps in the calm.",
    },
    {
      x: STORM_FINAL_CHECKPOINT,
      text: "Thunderhorn's Crag is ahead. Grab what you need before the gate.",
    },
  ],
  // The app hands the run to Thunderhorn's Crag before this point.
  goal: { x: 9400, y: 430 },
});

/** World 12's major boss has its own level and retry checkpoint. */
export const thunderhornLevel: Level = {
  id: 32,
  contentId: "boss.thunderhorn",
  name: "Thunderhorn's Crag",
  subtitle: "Face Thunderhorn, the Storm Ram.",
  kind: "world",
  theme: "storm",
  width: 2580,
  spawn: { x: 200, y: 432 },
  platforms: [
    { x: 0, y: 470, w: 2580, h: 190, kind: "ground" },
    {
      id: "thunderhorn.retry.diamond",
      x: 110,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "diamond",
    },
    {
      id: "thunderhorn.retry.feather",
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
  sections: [{ x: 0, name: "Thunderhorn's Crag" }],
  tutorials: [
    {
      x: 200,
      text: "Thunderhorn marks where lightning will strike, then charges. Step off the marks, jump over the ram, and stomp it when it's dazed.",
    },
  ],
  boss: {
    kind: "ram",
    name: "Thunderhorn, the Storm Ram",
    x: 1300,
    y: 470,
    minX: 980,
    maxX: 1900,
  },
  goal: { x: 2480, y: 470 },
};
