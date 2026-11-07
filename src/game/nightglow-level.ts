import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Nightglow Woods is the eighth world: a forest at night. Pip's own glow
// lights a circle around them, and lanterns along the trail light up for
// good once Pip passes, marking each checkpoint and crossing. The trail ends
// at Gloomwing's Roost, a separate major-boss arena (every fourth world ends
// in one), with a checkpoint and recovery blocks before the fight.

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
  id: `night.lift.${id}`,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period, phase },
});
const crack = (x: number, y: number, w = 120): Platform => ({
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
/** A night bloom: it stays closed until Pip's light comes near. */
const bloom = (
  x: number,
  y: number,
  w: number,
  kind: "flower" | "curled" = "flower",
): Platform => ({ x, y, w, h: 20, kind, wakeRadius: 200 });
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const bug = (
  kind: EnemyKind,
  x: number,
  minX: number,
  maxX: number,
  y = 402,
) => ({ kind, x, y, minX, maxX });

/** Reaching here hands the run to Gloomwing's Roost. */
export const NIGHTGLOW_FINALE_X = 8800;
export const NIGHTGLOW_FINAL_CHECKPOINT = 8650;

export const nightglowLevel: Level = withRewardBlocks({
  id: 8,
  contentId: "world.nightglow-woods",
  name: "Nightglow Woods",
  subtitle: "Light the lanterns through the forest at night.",
  kind: "world",
  theme: "dusk",
  dark: true,
  width: 9200,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Lantern Path: a calm, lit start.
    ground(0, 1300),
    ledge(340, 350, 150),
    ledge(580, 300, 150),
    // Shadow Steps: a sliding branch across the first dark gap.
    lift("steps", 1390, 390, 130, "x", 60, 4.2),
    ground(1600, 800),
    // Moth Hollow: stepping ledges over a long drop; a high perch above.
    ledge(2450, 370, 120),
    ledge(2650, 320, 120),
    ledge(2600, 220, 100),
    ledge(2850, 360, 120),
    ledge(3050, 330, 120),
    ground(3200, 1200),
    // Wisp Lifts: a rising branch, a ledge, then a sliding branch.
    lift("rise", 4500, 340, 120, "y", 70, 4.6),
    ledge(4700, 280, 120),
    lift("glide", 4900, 300, 120, "x", 70, 4.4, Math.PI / 2),
    ground(5200, 1400),
    // Moonbloom Glade: night blooms open only in Pip's light, making a
    // climb to a hidden branch.
    bloom(5560, 340, 150),
    bloom(5780, 255, 160, "curled"),
    bloom(6010, 175, 170),
    // Last Lantern: crumbling stones over the final drop.
    crack(6650, 390),
    crack(6810, 370),
    crack(6970, 390),
    crack(7130, 370),
    ground(7300, 1900),
    ledge(7600, 340, 140),
    ledge(7800, 260, 140),
    ledge(8000, 180, 140),
  ],
  lanterns: [
    { x: 200, y: 430, lit: true },
    { x: 1250, y: 430 },
    { x: 1650, y: 430 },
    { x: 2320, y: 430 },
    { x: 3260, y: 430 },
    { x: 4330, y: 430 },
    { x: 5260, y: 430 },
    { x: 6540, y: 430 },
    { x: 7360, y: 430 },
    { x: NIGHTGLOW_FINAL_CHECKPOINT - 60, y: 430 },
  ],
  coins: [
    ...row(365, 318, 3),
    ...row(605, 268, 3),
    ...row(1410, 340, 3),
    ...row(2470, 338, 3),
    ...row(2670, 288, 3),
    ...row(2620, 188, 2),
    ...row(2870, 328, 3),
    ...row(3070, 298, 3),
    ...row(4520, 300, 3),
    ...row(4720, 248, 3),
    ...row(4920, 268, 3),
    ...row(5580, 308, 3),
    ...row(5800, 223, 4),
    ...row(6030, 143, 3),
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
    { x: 2650, y: 185, id: "nightglow.firefly.moth-perch" },
    { x: 6095, y: 140, id: "nightglow.firefly.glowroot" },
    { x: 8070, y: 145, id: "nightglow.firefly.last-lantern" },
  ],
  enemies: [
    bug("beetle", 900, 760, 1060),
    bug("hopper", 2000, 1900, 2150),
    bug("charger", 3700, 3600, 3850),
    bug("beetle", 4050, 3950, 4200),
    bug("hopper", 6100, 6000, 6250),
    bug("charger", 7700, 7600, 7850),
    bug("beetle", 8300, 8200, 8450),
  ],
  checkpoints: [
    { x: 1150, y: 430 },
    { x: 1700, y: 430 },
    { x: 2300, y: 430 },
    { x: 3300, y: 430 },
    { x: 4300, y: 430 },
    { x: 5300, y: 430 },
    { x: 6500, y: 430 },
    { x: 7400, y: 430 },
    { x: NIGHTGLOW_FINAL_CHECKPOINT, y: 430 },
  ],
  sections: [
    { x: 0, name: "Lantern Path" },
    { x: 1300, name: "Shadow Steps" },
    { x: 2400, name: "Moth Hollow" },
    { x: 4400, name: "Wisp Lifts" },
    { x: 5200, name: "Moonbloom Glade" },
    { x: 6600, name: "Last Lantern" },
    { x: 8400, name: "Gloomwing's Gate" },
  ],
  clues: [
    {
      x: 2560,
      y: 405,
      kind: "glow",
      text: "Something glimmers on a high branch in the dark.",
    },
    {
      x: 5440,
      y: 405,
      kind: "footprints",
      text: "Night blooms open in your light. Climb them toward a hidden branch.",
    },
    {
      x: 7560,
      y: 405,
      kind: "grass",
      text: "Climb toward the last light in the treetops.",
    },
  ],
  tutorials: [
    {
      x: 120,
      text: "It's night. Your glow lights the way, and lanterns stay lit once you pass.",
    },
    { x: 1150, text: "Watch the branch slide into your light, then hop on." },
    {
      x: NIGHTGLOW_FINAL_CHECKPOINT,
      text: "Gloomwing's Roost is ahead. Grab what you need before the gate.",
    },
  ],
  // The app hands the run to Gloomwing's Roost before this point, so the
  // trail itself never reports victory.
  goal: { x: 9200, y: 430 },
});

/** World 8's major boss has its own arena and retry checkpoint. */
export const gloomwingLevel: Level = {
  id: 28,
  contentId: "boss.gloomwing",
  name: "Gloomwing's Roost",
  subtitle: "Face Gloomwing, the Night Owl.",
  kind: "world",
  theme: "dusk",
  dark: true,
  width: 2580,
  spawn: { x: 200, y: 432 },
  platforms: [
    { x: 0, y: 470, w: 2580, h: 190, kind: "ground" },
    {
      id: "gloomwing.retry.diamond",
      x: 110,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "diamond",
    },
    {
      id: "gloomwing.retry.feather",
      x: 280,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "feather",
    },
  ],
  lanterns: [
    { x: 400, y: 470, lit: true },
    { x: 1000, y: 470, lit: true },
    { x: 1500, y: 470, lit: true },
    { x: 2000, y: 470, lit: true },
  ],
  coins: [],
  stars: [],
  diamonds: [],
  fireflies: [],
  enemies: [],
  checkpoints: [{ x: 200, y: 470 }],
  sections: [{ x: 0, name: "Gloomwing's Roost" }],
  tutorials: [
    {
      x: 200,
      text: "Gloomwing circles, marks a spot, then dives. Step clear, jump its feathers, and stomp it when it lands.",
    },
  ],
  boss: {
    kind: "owl",
    name: "Gloomwing, the Night Owl",
    x: 1300,
    y: 470,
    minX: 980,
    maxX: 1900,
  },
  goal: { x: 2480, y: 470 },
};
