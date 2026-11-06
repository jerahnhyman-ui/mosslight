import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Frostglass Lake is the tenth world: a frozen lake under the aurora. Glassy
// ice is slippery, so Pip slides when they stop pressing; every stretch of
// ice ends in firm snow well before a gap, so a slide never carries Pip off
// an edge. Drifting ice floes and cracking ice cross the open water, and
// the trail ends at Shellshock's Rink, a dedicated boss level.

const ground = (x: number, w: number, y = 430): Platform => ({
  x,
  y,
  w,
  h: 660 - y,
  kind: "ground",
});
/** Glassy lake ice: slippery underfoot. */
const ice = (x: number, w: number, y = 430): Platform => ({
  ...ground(x, w, y),
  slippery: true,
});
const ledge = (x: number, y: number, w: number): Platform => ({
  x,
  y,
  w,
  h: 20,
  kind: "platform",
});
/** A drifting ice floe. */
const floe = (
  id: string,
  x: number,
  y: number,
  w: number,
  axis: "x" | "y",
  range: number,
  period: number,
  phase = 0,
): Platform => ({
  id: `ice.floe.${id}`,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period, phase },
});
/** Thin ice: it cracks soon after Pip lands, then freezes over again. */
const thin = (id: string, x: number, y: number, w = 120): Platform => ({
  id: `ice.crack.${id}`,
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

/** Reaching here hands the run to Shellshock's Rink. */
export const ICE_FINALE_X = 8800;
export const ICE_FINAL_CHECKPOINT = 8650;

export const iceLevel: Level = withRewardBlocks({
  id: 10,
  contentId: "world.frostglass-lake",
  name: "Frostglass Lake",
  subtitle: "Slide across the frozen lake under the aurora.",
  kind: "world",
  theme: "ice",
  width: 9200,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Frozen Shore: firm snow, then the first slippery ice.
    ground(0, 700),
    ice(700, 400),
    ground(1100, 200),
    // Floe Crossing: a drifting floe over open water.
    floe("crossing", 1390, 390, 130, "x", 60, 4.2),
    ground(1600, 200),
    ice(1800, 350),
    ground(2150, 250),
    // Thin Ice: four cracking panes.
    thin("a", 2450, 390),
    thin("b", 2610, 370),
    thin("c", 2770, 390),
    thin("d", 2930, 370),
    // Frost Spire: a climb to a firefly above the ice.
    ground(3100, 300),
    ice(3400, 600),
    ground(4000, 400),
    ledge(3450, 340, 140),
    ledge(3650, 260, 140),
    ledge(3850, 180, 140),
    // Aurora Floes: a rising floe, a rest, then a drifting floe.
    floe("rise", 4500, 340, 120, "y", 70, 4.6),
    ledge(4700, 280, 120),
    floe("glide", 4900, 300, 120, "x", 70, 4.4, Math.PI / 2),
    // Snowbank Hollow: a snow mushroom bounces to a hidden ledge.
    ground(5200, 450),
    { x: 5500, y: 408, w: 90, h: 22, kind: "mushroom" },
    ledge(5640, 210, 160),
    ledge(5860, 120, 150),
    ice(5650, 700),
    ground(6350, 250),
    // Cracking Channel: more thin ice over the deepest water.
    thin("e", 6650, 390),
    thin("f", 6810, 370),
    thin("g", 6970, 390),
    thin("h", 7130, 370),
    // Glacier Steps: firm footing, a climb, then the rink gate.
    ground(7300, 200),
    ice(7500, 600),
    ground(8100, 1100),
    ledge(7600, 340, 140),
    ledge(7800, 260, 140),
    ledge(8000, 180, 140),
  ],
  coins: [
    ...row(760, 392, 5, 60),
    ...row(1410, 340, 3),
    ...row(1860, 392, 4, 60),
    ...row(2470, 358, 2),
    ...row(2630, 338, 2),
    ...row(2790, 358, 2),
    ...row(2950, 338, 2),
    ...row(3470, 308, 3),
    ...row(3670, 228, 3),
    ...row(3870, 148, 3),
    ...row(4520, 300, 3),
    ...row(4720, 248, 3),
    ...row(4920, 268, 3),
    ...row(5530, 300, 2),
    ...row(5660, 178, 4),
    ...row(6670, 358, 2),
    ...row(6830, 338, 2),
    ...row(6990, 358, 2),
    ...row(7150, 338, 2),
    ...row(7620, 308, 3),
    ...row(7820, 228, 3),
    ...row(8020, 148, 3),
  ],
  stars: [],
  diamonds: [],
  fireflies: [
    { x: 3920, y: 145, id: "ice.firefly.frost-spire" },
    { x: 5930, y: 85, id: "ice.firefly.snowbank" },
    { x: 8070, y: 145, id: "ice.firefly.glacier" },
  ],
  enemies: [
    bug("beetle", 450, 380, 600),
    bug("hopper", 1950, 1850, 2050),
    bug("beetle", 3600, 3500, 3750),
    bug("charger", 4120, 4050, 4200),
    bug("hopper", 6000, 5900, 6150),
    bug("charger", 7800, 7650, 7950),
    bug("beetle", 8350, 8250, 8450),
  ],
  checkpoints: [
    { x: 1150, y: 430 },
    { x: 1650, y: 430 },
    { x: 2300, y: 430 },
    { x: 3200, y: 430 },
    { x: 4300, y: 430 },
    { x: 5300, y: 430 },
    { x: 6450, y: 430 },
    { x: 7360, y: 430 },
    { x: ICE_FINAL_CHECKPOINT, y: 430 },
  ],
  sections: [
    { x: 0, name: "Frozen Shore" },
    { x: 1300, name: "Floe Crossing" },
    { x: 2400, name: "Thin Ice" },
    { x: 3100, name: "Frost Spire" },
    { x: 4400, name: "Aurora Floes" },
    { x: 5200, name: "Snowbank Hollow" },
    { x: 6600, name: "Cracking Channel" },
    { x: 7300, name: "Glacier Steps" },
    { x: 8400, name: "Shellshock's Gate" },
  ],
  clues: [
    {
      x: 3300,
      y: 405,
      kind: "glow",
      text: "A light glimmers at the top of the frost spire.",
    },
    {
      x: 5440,
      y: 405,
      kind: "footprints",
      text: "The snow mushroom bounces higher than any jump.",
    },
    {
      x: 7560,
      y: 405,
      kind: "grass",
      text: "Climb the glacier steps toward one more glow.",
    },
  ],
  tutorials: [
    {
      x: 120,
      text: "The lake is frozen. On shiny ice you keep sliding after you let go, so ease off early.",
    },
    { x: 2300, text: "Thin ice cracks soon after you land. Keep hopping!" },
    {
      x: ICE_FINAL_CHECKPOINT,
      text: "Shellshock's Rink is ahead. Grab what you need before the gate.",
    },
  ],
  // The app hands the run to Shellshock's Rink before this point.
  goal: { x: 9200, y: 430 },
});

/** World 10's dedicated boss level: an ice rink with firm snow at each end. */
export const shellshockLevel: Level = {
  id: 30,
  contentId: "boss.shellshock",
  name: "Shellshock's Rink",
  subtitle: "Face Shellshock, the Frost Tortoise.",
  kind: "world",
  theme: "ice",
  width: 2580,
  spawn: { x: 200, y: 432 },
  platforms: [
    { x: 0, y: 470, w: 900, h: 190, kind: "ground" },
    { x: 900, y: 470, w: 1150, h: 190, kind: "ground", slippery: true },
    { x: 2050, y: 470, w: 530, h: 190, kind: "ground" },
    {
      id: "shellshock.retry.diamond",
      x: 110,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "diamond",
    },
    {
      id: "shellshock.retry.feather",
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
  sections: [{ x: 0, name: "Shellshock's Rink" }],
  tutorials: [
    {
      x: 200,
      text: "Shellshock spins across the ice and bounces off the walls. Jump over it, then stomp it while it's dizzy.",
    },
  ],
  boss: {
    kind: "tortoise",
    name: "Shellshock, the Frost Tortoise",
    x: 1400,
    y: 470,
    minX: 980,
    maxX: 1900,
  },
  goal: { x: 2480, y: 470 },
};
