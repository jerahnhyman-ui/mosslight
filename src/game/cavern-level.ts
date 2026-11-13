import { withHideawayRoute } from "./hideaways";
import type { EnemyKind, Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

// Glimmerdeep Caverns is the sixth world: a glowing crystal cave under the
// garden. Crossings use crystal ledges that slide or rise and fall, and
// cracked crystal bridges that shatter soon after Pip lands. Every crossing
// has a checkpoint on the solid floor before it. Three optional climbs lead
// to hidden perches, each with a firefly.

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
/** A crystal ledge that slides sideways or rides up and down. */
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
  id: `cave.lift.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "moving",
  motion: { axis, range, period, phase },
});
/** A cracked crystal ledge: it shatters a moment after landing, then regrows. */
const crack = (id: string, x: number, y: number, w = 120): Platform => ({
  id: `cave.crack.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
/** A glowcap: the cave's bouncing mushroom. */
const glowcap = (x: number, y = 408, w = 90): Platform => ({
  x,
  y,
  w,
  h: 22,
  kind: "mushroom",
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

/** The last solid stretch: a checkpoint, a recovery block, then the arena. */
export const CAVERN_FINAL_CHECKPOINT = 8150;
const ARENA = { minX: 8350, maxX: 9000 };

export const cavernLevel: Level = withHideawayRoute(
  withRewardBlocks({
    id: 6,
    contentId: "world.glimmerdeep-caverns",
    name: "Glimmerdeep Caverns",
    subtitle: "Light the crystal caves deep beneath the garden.",
    kind: "world",
    theme: "cavern",
    width: 9300,
    spawn: { x: 80, y: 392 },
    // Gulp waits near the entrance. Its flutter helps across the chasms.
    mounts: [{ x: 620, y: 430 }],
    platforms: [
      // Lantern Mouth: a calm entrance with two easy steps.
      ground(0, 1300),
      ledge(320, 350, 150),
      ledge(560, 300, 150),
      // Crystal Steps: a wide chasm crossed on two sliding crystals that
      // move in opposite directions. Hop across when they pass close.
      lift("steps.a", 1420, 390, 120, "x", 90, 4),
      lift("steps.b", 1700, 360, 120, "x", 90, 4, Math.PI),
      ground(2000, 520),
      ledge(2150, 350, 150),
      // Echo Shaft: two crystals rise and fall out of step. Change crystals
      // when they pass level, then ride the second to the far floor. From the
      // top of either ride, Pip can hop to a hidden roost between them.
      lift("echo.a", 2580, 330, 130, "y", 70, 5),
      lift("echo.b", 2790, 330, 120, "y", 80, 5, Math.PI),
      ledge(2720, 150, 60),
      // Glowcap Grove: a glowcap bounces Pip toward the Geode Hollow.
      ground(3020, 1380),
      glowcap(3300),
      ledge(3420, 210, 160),
      ledge(3640, 130, 150),
      // Shardfall Bridge: a cracked crystal, a small resting ledge, a sliding
      // crystal to catch, and one more cracked crystal before the far floor.
      crack("bridge.a", 4450, 390),
      ledge(4610, 360, 90),
      lift("shard", 4840, 330, 110, "x", 70, 3.6),
      crack("bridge.b", 5080, 370),
      ground(5250, 1150),
      ledge(5300, 340, 150),
      ledge(5520, 250, 150),
      // Crystal Gallery: a high sliding crystal reaches a hidden alcove.
      lift("gallery", 5800, 170, 130, "x", 100, 5.5),
      ledge(6080, 130, 140),
      // Rumbling Run: the widest chasm, on two quick crystals in opposite
      // directions, then the mole's tunnels.
      lift("rumble.a", 6520, 390, 110, "x", 80, 3.8),
      lift("rumble.b", 6760, 350, 110, "x", 80, 3.8, Math.PI),
      ground(7100, 2200),
    ],
    coins: [
      ...row(345, 318, 3),
      ...row(585, 268, 3),
      ...row(1430, 340, 3),
      ...row(1710, 310, 3),
      ...row(2170, 318, 3),
      ...row(2600, 290, 3),
      ...row(2810, 290, 3),
      ...row(2730, 118, 2),
      ...row(3330, 300, 2),
      ...row(3445, 178, 4),
      ...row(3665, 98, 3),
      ...row(4470, 358, 2),
      ...row(4625, 328, 2),
      ...row(4840, 298, 3),
      ...row(5100, 338, 2),
      ...row(5320, 308, 3),
      ...row(5540, 218, 3),
      ...row(5780, 138, 3),
      ...row(6530, 358, 3),
      ...row(6770, 318, 3),
      ...row(7150, 398, 4),
      ...row(7600, 398, 4),
      ...row(9100, 392, 4),
    ],
    stars: [],
    diamonds: [],
    fireflies: [
      { x: 2750, y: 115, id: "cavern.firefly.bat-roost" },
      { x: 3715, y: 95, id: "cavern.firefly.geode-hollow" },
      { x: 6150, y: 95, id: "cavern.firefly.crystal-gallery" },
    ],
    enemies: [
      bug("beetle", 900, 760, 1060),
      bug("hopper", 2230, 2160, 2300),
      bug("beetle", 3600, 3520, 3700),
      bug("charger", 4000, 3900, 4120),
      bug("hopper", 5650, 5600, 5800),
      bug("beetle", 5950, 5880, 6080),
      bug("charger", 7400, 7300, 7550),
      bug("hopper", 7800, 7720, 7950),
    ],
    checkpoints: [
      { x: 1150, y: 430 },
      { x: 2380, y: 430 },
      { x: 3080, y: 430 },
      { x: 4300, y: 430 },
      { x: 5310, y: 430 },
      { x: 6300, y: 430 },
      { x: 7200, y: 430 },
      { x: CAVERN_FINAL_CHECKPOINT, y: 430 },
    ],
    sections: [
      { x: 0, name: "Lantern Mouth" },
      { x: 1300, name: "Crystal Steps" },
      { x: 2520, name: "Echo Shaft" },
      { x: 3020, name: "Glowcap Grove" },
      { x: 4400, name: "Shardfall Bridge" },
      { x: 5250, name: "Crystal Gallery" },
      { x: 6400, name: "Rumbling Run" },
      { x: ARENA.minX - 60, name: "Rumble's Den" },
    ],
    clues: [
      {
        x: 2420,
        y: 405,
        kind: "glow",
        text: "Ride an echo crystal to the very top and look up.",
      },
      {
        x: 3200,
        y: 405,
        kind: "footprints",
        text: "The glowcap can bounce you higher than any jump.",
      },
      {
        x: 5480,
        y: 230,
        kind: "grass",
        text: "A sliding crystal leads to a quiet alcove.",
      },
    ],
    tutorials: [
      {
        x: 120,
        text: "Welcome to the caverns. The chasms are deep, so watch your footing.",
      },
      {
        x: 1150,
        text: "Two crystals slide past each other. Hop across when they meet.",
      },
      {
        x: 2380,
        text: "These crystals rise and fall out of step. Change over when they pass level.",
      },
      {
        x: 4300,
        text: "Cracked crystals shatter soon after you land. Rest on the ledge, then catch the sliding crystal.",
      },
      {
        x: CAVERN_FINAL_CHECKPOINT,
        text: "Rumble tunnels toward you. Stand over the moving rubble, jump and press Down to pound it out, then stomp it. Too slow? Step away and jump its shards.",
      },
    ],
    boss: {
      kind: "mole",
      name: "Rumble, the Crystal Mole",
      x: 8700,
      y: 430,
      minX: ARENA.minX,
      maxX: ARENA.maxX,
    },
    goal: { x: 9150, y: 430 },
  }),
);
