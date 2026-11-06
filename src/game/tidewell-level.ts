import type { Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Tidewell Depths is the seventh world, almost entirely underwater. Hold
// Jump to swim up and release to sink. Rock pillars rise from the seabed and
// reefs hang from above; bubble columns lift Pip, a current channel pushes
// back, and a sunken tunnel pulls down. The water has no pits, so every
// checkpoint sits on the seabed before a new challenge.

const SEABED = 490;
const SURFACE = 150;
/** A rock rising from the seabed to `top`. */
const pillar = (id: string, x: number, top: number, w = 60): Platform => ({
  id: `moonpool.rock.tide.${id}`,
  x,
  y: top,
  w,
  h: SEABED - top,
  kind: "ground",
});
/** A reef hanging from the surface down to `bottom`. */
const reef = (id: string, x: number, bottom: number, w = 80): Platform => ({
  id: `moonpool.rock.tide.${id}`,
  x,
  y: SURFACE,
  w,
  h: bottom - SURFACE,
  kind: "ground",
});
const slab = (id: string, x: number, y: number, w: number, h: number) => ({
  id: `moonpool.rock.tide.${id}`,
  x,
  y,
  w,
  h,
  kind: "ground" as const,
});
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const fish = (x: number, y: number, minX: number, maxX: number) => ({
  kind: "fish" as const,
  x,
  y,
  minX,
  maxX,
});

export const TIDEWELL_FINAL_CHECKPOINT = 5450;
const ARENA = { minX: 5600, maxX: 6150 };

export const tidewellLevel: Level = withRewardBlocks({
  id: 7,
  contentId: "world.tidewell-depths",
  name: "Tidewell Depths",
  subtitle: "Swim the deep lagoon and light its sunken gardens.",
  kind: "world",
  theme: "grotto",
  width: 6400,
  spawn: { x: 80, y: SEABED - 38 },
  platforms: [
    { x: 0, y: SEABED, w: 6400, h: 170, kind: "ground" },
    // Kelp Garden: swim over rising rocks and under hanging reefs.
    pillar("kelp.a", 700, 330),
    reef("kelp.b", 950, 350),
    pillar("kelp.c", 1200, 290),
    reef("kelp.d", 1450, 375),
    // Current Channel: the water pushes back; a bubble column lifts Pip
    // over the tallest rock.
    pillar("channel.a", 2300, 240, 70),
    // Sunken Garden: a long slab with a tunnel beneath and a hidden cove on
    // top, reached through a gap in the slab.
    slab("sunken.left", 3300, 220, 300, 80),
    slab("sunken.right", 3690, 220, 310, 80),
    // Coral Maze: rocks and a reef in quick succession; a low shelf hides a
    // firefly beneath it.
    pillar("maze.a", 4500, 360),
    reef("maze.b", 4700, 350),
    pillar("maze.c", 4900, 330),
    { x: 5150, y: 400, w: 200, h: 20, kind: "platform" },
  ],
  waterZones: [
    { x: 220, y: SURFACE, w: 6180, h: SEABED - SURFACE },
    // Bubble columns lift Pip.
    { x: 1100, y: SURFACE, w: 80, h: SEABED - SURFACE, currentY: -150 },
    { x: 2190, y: SURFACE, w: 90, h: SEABED - SURFACE, currentY: -200 },
    { x: 4815, y: SURFACE, w: 70, h: SEABED - SURFACE, currentY: -170 },
    // The channel pushes back toward the start.
    { x: 1800, y: SURFACE, w: 1100, h: SEABED - SURFACE, currentX: -80 },
    // The sunken tunnel pulls down toward the seabed.
    { x: 3300, y: 300, w: 700, h: SEABED - 300, currentY: 80 },
  ],
  coins: [
    ...row(400, 430, 4),
    ...row(700, 290, 3, 25),
    ...row(960, 420, 3),
    ...row(1210, 250, 3, 25),
    ...row(1455, 420, 3),
    ...row(2000, 330, 4),
    ...row(2310, 200, 3, 25),
    ...row(2600, 380, 4),
    ...row(3420, 400, 5),
    ...row(3740, 400, 5),
    ...row(4510, 320, 3, 25),
    ...row(4710, 420, 3),
    ...row(4910, 290, 3, 25),
    ...row(6250, 450, 3),
  ],
  stars: [],
  diamonds: [],
  fireflies: [
    { x: 3350, y: 182, id: "tidewell.firefly.shell-cove" },
    { x: 5000, y: 175, id: "tidewell.firefly.surface-light" },
    { x: 5250, y: 455, id: "tidewell.firefly.under-shelf" },
  ],
  enemies: [
    fish(1050, 420, 990, 1150),
    fish(1330, 230, 1270, 1420),
    fish(2650, 360, 2450, 2800),
    fish(3500, 420, 3330, 3580),
    fish(4600, 270, 4565, 4640),
    fish(5050, 380, 4980, 5120),
  ],
  checkpoints: [
    { x: 560, y: SEABED },
    { x: 1650, y: SEABED },
    { x: 3050, y: SEABED },
    { x: 4250, y: SEABED },
    { x: TIDEWELL_FINAL_CHECKPOINT, y: SEABED },
  ],
  sections: [
    { x: 0, name: "Tidepool Shore" },
    { x: 600, name: "Kelp Garden" },
    { x: 1800, name: "Current Channel" },
    { x: 3000, name: "Sunken Garden" },
    { x: 4300, name: "Coral Maze" },
    { x: ARENA.minX - 60, name: "Pinch's Burrow" },
  ],
  clues: [
    {
      x: 3620,
      y: 300,
      kind: "glow",
      text: "A gap in the stone leads to a quiet cove above.",
    },
    {
      x: 4850,
      y: 460,
      kind: "grass",
      text: "Ride the bubbles all the way to the surface light.",
    },
    {
      x: 5130,
      y: 460,
      kind: "footprints",
      text: "Something glimmers beneath the coral shelf.",
    },
  ],
  tutorials: [
    { x: 160, text: "Hold Jump to swim up. Let go to sink." },
    { x: 1650, text: "The current pushes back. Keep swimming forward." },
    {
      x: 3050,
      text: "The tunnel pulls you down. Swim above the fish as you pass.",
    },
    {
      x: TIDEWELL_FINAL_CHECKPOINT,
      text: "Pinch scuttles and puffs bubbles. Swim clear, then sink onto its shell when it flips over.",
    },
  ],
  boss: {
    kind: "crab",
    name: "Pinch, the Hermit Crab",
    x: 5950,
    y: SEABED,
    minX: ARENA.minX,
    maxX: ARENA.maxX,
  },
  goal: { x: 6300, y: SEABED },
});
