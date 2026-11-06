import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Reedwater Marsh is the fifth world. Its open water is a real hazard, so
// every crossing is either a sliding lily pad or a chain of sinking pads with
// short, ordinary jumps, and each crossing has a checkpoint on the bank before
// it. Two optional climbs lead to hidden perches above the main trail.

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
/** A sliding lily pad: its flat top is the collision surface. */
const lily = (
  id: string,
  x: number,
  y: number,
  w: number,
  range: number,
  period: number,
  phase = 0,
): Platform => ({
  id: `marsh.lily.${id}`,
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis: "x", range, period, phase },
});
/** A pad that sinks a moment after Pip lands and floats back up later. */
const sinkpad = (id: string, x: number, y: number, w = 120): Platform => ({
  id: `marsh.sinkpad.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
const mushroom = (x: number, y: number, w = 90): Platform => ({
  x,
  y,
  w,
  h: 22,
  kind: "mushroom",
});
const plant = (
  x: number,
  y: number,
  w: number,
  kind: "flower" | "curled" = "flower",
): Platform => ({ x, y, w, h: 20, kind, wakeRadius: 210 });
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const bug = (
  kind: EnemyKind,
  x: number,
  minX: number,
  maxX: number,
  y = 402,
) => ({
  kind,
  x,
  y,
  minX,
  maxX,
});

/** The trail's last bank: a checkpoint, a recovery block, then the arena. */
export const MARSH_FINAL_CHECKPOINT = 10560;
const ARENA = { minX: 10760, maxX: 11420 };

export const marshLevel: Level = withRewardBlocks({
  id: 5,
  contentId: "world.reedwater-marsh",
  name: "Reedwater Marsh",
  subtitle: "Hop the lily pads and bring light back to the misty marsh.",
  kind: "world",
  theme: "marsh",
  width: 11700,
  spawn: { x: 80, y: 392 },
  platforms: [
    // Mistgate Landing: a calm bank with two easy steps.
    ground(0, 1280),
    ledge(300, 350, 160),
    ledge(560, 300, 160),
    // Lilypad Ford: one sliding pad over the first channel.
    lily("ford", 1330, 390, 150, 60, 4.6),
    ground(1580, 640),
    // Sinking Shallows: keep hopping; each pad dips under after landing.
    sinkpad("shallows.a", 2270, 390),
    sinkpad("shallows.b", 2440, 370),
    sinkpad("shallows.c", 2610, 390),
    // Cattail Rise and Willow Run share one long bank. A mushroom at the
    // cattails launches Pip toward the hidden Heron's Loft.
    ground(2780, 1060),
    mushroom(3080, 408),
    ledge(3210, 210, 170),
    ledge(3430, 95, 160),
    ground(3840, 1220),
    ledge(4080, 350, 160),
    ledge(4320, 280, 170),
    ledge(4580, 350, 150),
    // Drift Channel: two sliding pads with a steady stump between them.
    lily("drift.a", 5110, 390, 140, 50, 4.2),
    ledge(5330, 340, 100),
    lily("drift.b", 5500, 380, 140, 50, 4.8, 1.6),
    // Glowworm Hollow: Pip's light wakes a climbing route.
    ground(5720, 1000),
    plant(5950, 340, 150),
    plant(6170, 255, 160, "curled"),
    plant(6400, 175, 170),
    // Sinkwater Bridge: the longest crossing, with five sinking pads.
    sinkpad("bridge.a", 6770, 390),
    sinkpad("bridge.b", 6930, 370),
    sinkpad("bridge.c", 7090, 390),
    sinkpad("bridge.d", 7250, 370),
    sinkpad("bridge.e", 7410, 390),
    // Frogspawn Pools: a shallow dip with hoppers and a ledge above it.
    ground(7580, 400),
    ground(7980, 360, 490),
    ledge(8080, 400, 140),
    // Kingfisher Reach: a high sliding pad leads to a hidden perch.
    ground(8340, 1640),
    ledge(8760, 340, 150),
    ledge(8980, 250, 150),
    lily("perch", 9260, 170, 140, 110, 5.5),
    ledge(9560, 120, 140),
    // Lantern Reeds: a final sliding pad, then the guardian's bank.
    lily("reeds", 10030, 390, 150, 55, 4.4),
    ground(10280, 1420),
  ],
  coins: [
    ...row(330, 318, 3),
    ...row(590, 268, 3),
    ...row(1350, 340, 4),
    ...row(2290, 358, 3),
    ...row(2460, 338, 3),
    ...row(2630, 358, 3),
    // A coin trail rises from the mushroom toward the hidden loft.
    ...row(3110, 300, 2),
    ...row(3240, 178, 4),
    ...row(3460, 63, 3),
    ...row(4100, 318, 4),
    ...row(4345, 248, 4),
    ...row(5130, 340, 3),
    ...row(5345, 308, 2),
    ...row(5520, 330, 3),
    ...row(5970, 308, 3),
    ...row(6190, 223, 4),
    ...row(6790, 358, 2),
    ...row(6950, 338, 2),
    ...row(7110, 358, 2),
    ...row(7270, 338, 2),
    ...row(7430, 358, 2),
    ...row(8000, 458, 4),
    ...row(8100, 368, 3),
    ...row(8780, 308, 3),
    ...row(9000, 218, 3),
    ...row(9240, 138, 3),
    ...row(10050, 340, 4),
    ...row(11500, 392, 4),
  ],
  stars: [],
  diamonds: [],
  fireflies: [
    { x: 3500, y: 60, id: "marsh.firefly.heron-loft" },
    { x: 6480, y: 140, id: "marsh.firefly.glowworm" },
    { x: 9620, y: 85, id: "marsh.firefly.kingfisher" },
  ],
  enemies: [
    bug("beetle", 700, 620, 900),
    bug("hopper", 1800, 1720, 1940),
    bug("beetle", 3600, 3520, 3760),
    bug("beetle", 4000, 3920, 4150),
    bug("hopper", 4450, 4380, 4560),
    bug("hopper", 6300, 6230, 6380),
    bug("hopper", 8160, 8020, 8300, 462),
    bug("charger", 8500, 8400, 8580),
    bug("charger", 9300, 9200, 9450),
    bug("beetle", 9850, 9760, 9950),
  ],
  checkpoints: [
    { x: 1180, y: 430 },
    { x: 2060, y: 430 },
    { x: 2960, y: 430 },
    { x: 4900, y: 430 },
    { x: 6620, y: 430 },
    { x: 7640, y: 430 },
    { x: 8700, y: 430 },
    { x: 9700, y: 430 },
    { x: MARSH_FINAL_CHECKPOINT, y: 430 },
  ],
  sections: [
    { x: 0, name: "Mistgate Landing" },
    { x: 1280, name: "Lilypad Ford" },
    { x: 2220, name: "Sinking Shallows" },
    { x: 2780, name: "Cattail Rise" },
    { x: 3840, name: "Willow Run" },
    { x: 5060, name: "Drift Channel" },
    { x: 5720, name: "Glowworm Hollow" },
    { x: 6720, name: "Sinkwater Bridge" },
    { x: 7580, name: "Frogspawn Pools" },
    { x: 8640, name: "Kingfisher Reach" },
    { x: 9980, name: "Lantern Reeds" },
    { x: ARENA.minX - 60, name: "Gloam's Pond" },
  ],
  clues: [
    {
      x: 3010,
      y: 405,
      kind: "footprints",
      text: "Something rustles in the reeds high above the mushroom.",
    },
    {
      x: 5900,
      y: 405,
      kind: "glow",
      text: "Sleeping flowers climb toward a soft green light.",
    },
    {
      x: 8930,
      y: 230,
      kind: "grass",
      text: "A drifting pad carries brave climbers to the kingfisher's perch.",
    },
  ],
  tutorials: [
    {
      x: 120,
      text: "Welcome to the marsh. The water is deep, so stick to the banks and pads.",
    },
    { x: 1180, text: "Wait for the lily pad to slide close, then hop aboard." },
    {
      x: 2060,
      text: "These pads sink soon after you land. Keep hopping to the far bank.",
    },
    { x: 4900, text: "Ride one pad, rest on the stump, then catch the next." },
    {
      x: 6620,
      text: "The longest bridge yet. Don't stop until you reach the bank.",
    },
    {
      x: MARSH_FINAL_CHECKPOINT,
      text: "Gloam marks where it will land. Move away, jump its ripples, then stomp while it rests.",
    },
  ],
  boss: {
    kind: "toad",
    name: "Gloam, the Bog Toad",
    x: 11200,
    y: 430,
    minX: ARENA.minX,
    maxX: ARENA.maxX,
  },
  goal: { x: 11580, y: 430 },
});
