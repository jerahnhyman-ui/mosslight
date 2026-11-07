import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Ember Caldera is the eleventh world: a volcano with lava in every gap.
// Ember sprites leap out of the lava on a steady beat and are too hot to
// stomp, so time each jump for when they've dropped back in. Basalt
// stepping stones and crumbling rock cross the lava, and the trail ends at
// Cinder's Crater, a dedicated boss level.

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
  id: `volcano.lift.${id}`,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period, phase },
});
/** A basalt column standing in the lava. */
const stone = (x: number, w = 100, y = 420): Platform => ({
  x,
  y,
  w,
  h: 660 - y,
  kind: "ground",
});
/** Cooling rock: it crumbles soon after Pip lands, then hardens again. */
const basalt = (id: string, x: number, y: number, w = 120): Platform => ({
  id: `volcano.basalt.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
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
/** An ember sprite waiting in the lava between two stones. */
const ember = (x: number) => bug("ember", x, x, x);

/** Reaching here hands the run to Cinder's Crater. */
export const VOLCANO_FINALE_X = 9000;
export const VOLCANO_FINAL_CHECKPOINT = 8900;

export const volcanoLevel: Level = withRewardBlocks({
  id: 11,
  contentId: "world.ember-caldera",
  name: "Ember Caldera",
  subtitle: "Cross the lava and climb the smoking caldera.",
  kind: "world",
  theme: "volcano",
  lava: true,
  traps: [
    {
      kind: "geyser",
      x: 5450,
      w: 50,
      y: 430,
      period: 2.8,
      active: 0.8,
      phase: 0,
    },
    {
      kind: "geyser",
      x: 5650,
      w: 50,
      y: 430,
      period: 2.8,
      active: 0.8,
      phase: 0.7,
    },
    {
      kind: "geyser",
      x: 5850,
      w: 50,
      y: 430,
      period: 2.8,
      active: 0.8,
      phase: 1.4,
    },
    {
      kind: "geyser",
      x: 6050,
      w: 50,
      y: 430,
      period: 2.8,
      active: 0.8,
      phase: 2.1,
    },
  ],
  width: 9400,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Ashfall Trail: a warm, easy start.
    ground(0, 1300),
    ledge(340, 350, 150),
    ledge(580, 300, 150),
    // Magma Glide: a sliding slab over the first lava gap.
    lift("glide", 1390, 390, 130, "x", 60, 4.2),
    ground(1600, 800),
    // Ember Stones: basalt columns with ember sprites leaping between.
    stone(2480),
    stone(2680),
    stone(2880),
    // Smoke Spire: a climb to a firefly above the ash.
    ground(3080, 1320),
    ledge(3450, 340, 140),
    ledge(3650, 260, 140),
    ledge(3850, 180, 140),
    // Vent Lifts: a rising slab, a rest, then a sliding slab.
    lift("rise", 4500, 340, 120, "y", 70, 4.6),
    ledge(4700, 280, 120),
    lift("drift", 4900, 300, 120, "x", 70, 4.4, Math.PI / 2),
    // Geyser Field: lava vents burst into fire on a rolling beat; a high
    // road of ledges sits between them, out of reach of the flames.
    ground(5200, 1400),
    ledge(5520, 330, 100),
    ledge(5730, 250, 100),
    ledge(5905, 170, 100),
    // Cooling Crust: crumbling rock over the widest lava.
    basalt("a", 6650, 390),
    basalt("b", 6810, 370),
    basalt("c", 6970, 390),
    basalt("d", 7130, 370),
    // Caldera Rim: a last climb, then the crater gate.
    ground(7300, 600),
    stone(7980),
    ground(8180, 1220),
    ledge(8300, 340, 140),
    ledge(8500, 260, 140),
    ledge(8700, 180, 140),
  ],
  coins: [
    ...row(365, 318, 3),
    ...row(605, 268, 3),
    ...bobbing(row(1410, 340, 3), "x", 40, 2.4),
    ...row(2500, 388, 2),
    ...row(2700, 388, 2),
    ...row(2900, 388, 2),
    ...row(3470, 308, 3),
    ...row(3670, 228, 3),
    ...row(3870, 148, 3),
    ...bobbing(row(4520, 300, 3), "y", 18, 1.8),
    ...row(4720, 248, 3),
    ...row(4920, 268, 3),
    ...row(5540, 298, 2),
    ...row(5750, 218, 2),
    ...row(5925, 138, 2),
    ...row(6670, 358, 2),
    ...row(6830, 338, 2),
    ...row(6990, 358, 2),
    ...row(7150, 338, 2),
    ...row(8000, 388, 2),
    ...row(8320, 308, 3),
    ...row(8520, 228, 3),
    ...row(8720, 148, 3),
  ],
  stars: [],
  diamonds: [],
  coinRings: [
    {
      x: 5280,
      y: 395,
      time: 6,
      coins: [...row(5330, 392, 4, 40), ...row(5620, 392, 15, 60)],
    },
  ],
  fireflies: [
    { x: 3920, y: 145, id: "volcano.firefly.smoke-spire" },
    { x: 5955, y: 135, id: "volcano.firefly.fumarole" },
    { x: 8770, y: 145, id: "volcano.firefly.caldera-rim" },
  ],
  enemies: [
    bug("beetle", 900, 760, 1060),
    bug("charger", 2000, 1900, 2150),
    ember(2615),
    ember(2815),
    bug("hopper", 3320, 3250, 3400),
    bug("beetle", 4100, 4000, 4200),
    bug("hopper", 6300, 6250, 6380),
    bug("charger", 7550, 7450, 7700),
    ember(7925),
    ember(8115),
  ],
  checkpoints: [
    { x: 1150, y: 430 },
    { x: 1700, y: 430 },
    { x: 2300, y: 430 },
    { x: 3150, y: 430 },
    { x: 4300, y: 430 },
    { x: 5300, y: 430 },
    { x: 6500, y: 430 },
    { x: 7360, y: 430 },
    { x: VOLCANO_FINAL_CHECKPOINT, y: 430 },
  ],
  sections: [
    { x: 0, name: "Ashfall Trail" },
    { x: 1300, name: "Magma Glide" },
    { x: 2400, name: "Ember Stones" },
    { x: 3080, name: "Smoke Spire" },
    { x: 4400, name: "Vent Lifts" },
    { x: 5200, name: "Geyser Field" },
    { x: 6600, name: "Cooling Crust" },
    { x: 7300, name: "Caldera Rim" },
    { x: 8900, name: "Cinder's Gate" },
  ],
  clues: [
    {
      x: 3300,
      y: 405,
      kind: "glow",
      text: "Something glimmers at the top of the smoke spire.",
    },
    {
      x: 5440,
      y: 405,
      kind: "footprints",
      text: "Lava vents bubble before they burst. Cross the high road between the flames.",
    },
    {
      x: 8250,
      y: 405,
      kind: "grass",
      text: "Climb the caldera rim toward one more glow.",
    },
  ],
  tutorials: [
    {
      x: 120,
      text: "Welcome to the volcano. Lava fills every gap, so watch your footing.",
    },
    {
      x: 2300,
      text: "Ember sprites leap from the lava and are too hot to stomp. Jump after they drop back in.",
    },
    {
      x: VOLCANO_FINAL_CHECKPOINT,
      text: "Cinder's Crater is ahead. Grab what you need before the gate.",
    },
  ],
  // The app hands the run to Cinder's Crater before this point.
  goal: { x: 9400, y: 430 },
});

/** World 11's dedicated boss level: a lava crater with an island at its
 * heart. Cinder surfaces on the island; Pip hops over to stomp it. */
export const cinderLevel: Level = {
  id: 31,
  contentId: "boss.cinder",
  name: "Cinder's Crater",
  subtitle: "Face Cinder, the Magma Salamander.",
  kind: "world",
  theme: "volcano",
  lava: true,
  width: 2580,
  spawn: { x: 200, y: 432 },
  platforms: [
    { x: 0, y: 470, w: 1000, h: 190, kind: "ground" },
    // Stepping stones across the lava to the island and back.
    { x: 1050, y: 450, w: 90, h: 210, kind: "ground" },
    { x: 1190, y: 470, w: 420, h: 190, kind: "ground" },
    { x: 1660, y: 450, w: 90, h: 210, kind: "ground" },
    { x: 1800, y: 470, w: 780, h: 190, kind: "ground" },
    {
      id: "cinder.retry.diamond",
      x: 110,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "diamond",
    },
    {
      id: "cinder.retry.feather",
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
  sections: [{ x: 0, name: "Cinder's Crater" }],
  tutorials: [
    {
      x: 200,
      text: "Cinder spits fireballs from its island. Dodge them, then hop the stones and stomp it while it rests.",
    },
  ],
  boss: {
    kind: "salamander",
    name: "Cinder, the Magma Salamander",
    x: 1340,
    y: 470,
    minX: 700,
    maxX: 1900,
  },
  goal: { x: 2480, y: 470 },
};
