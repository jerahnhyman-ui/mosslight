import type { Level, Platform } from "./levels";
import { withRewardBlocks } from "./reward-layouts";

const cloud = (id: string, x: number, y: number, w: number): Platform => ({
  id: `cloud.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "platform",
});

// The first ledge is 155 pixels above the grove's flower: a normal jump
// cannot reach it, but a feather-assisted jump can. Each ledge recharges
// the feather, and the last one is wide enough for the return spawn.
export const cloudAscentPlatforms: Platform[] = [
  cloud("ascent.first", 1290, 50, 160),
  cloud("ascent.second", 1450, -30, 160),
  cloud("ascent.portal", 1530, -110, 200),
];

/** A gentle secret garden above the grove, with a three-flower sky puzzle. */
export const cloudGardenLevel: Level = withRewardBlocks({
  id: 23,
  contentId: "secret.cloud-garden",
  name: "Cloudbloom Sanctuary",
  subtitle: "Wake the three sky flowers and open the sanctuary.",
  kind: "secret",
  theme: "cloud",
  width: 2500,
  spawn: { x: 70, y: 392 },
  platforms: [
    // A forgiving lower path catches missed flights and keeps the puzzle fair.
    { x: 0, y: 430, w: 2500, h: 230, kind: "ground" },
    cloud("path.1", 270, 340, 170),
    cloud("flower.a", 480, 255, 170),
    {
      ...cloud("path.2", 760, 340, 170),
      motion: { axis: "x", range: 45, period: 4.5 },
    },
    cloud("flower.b", 970, 255, 170),
    {
      ...cloud("path.3", 1250, 340, 170),
      motion: { axis: "x", range: 45, period: 4.5, phase: Math.PI },
    },
    cloud("flower.c", 1460, 255, 170),
    cloud("path.4", 1730, 340, 170),
    // The wind switch carries this bridge toward the optional high cove.
    cloud("wind.bridge", 1680, 120, 180),
    cloud("wind.cove", 2110, 35, 160),
  ],
  coins: [
    { x: 510, y: 218 },
    { x: 550, y: 218 },
    { x: 590, y: 218 },
    { x: 1000, y: 218 },
    { x: 1040, y: 218 },
    { x: 1080, y: 218 },
    { x: 1490, y: 218 },
    { x: 1530, y: 218 },
    { x: 1570, y: 218 },
    { x: 2140, y: 4 },
    { x: 2180, y: 4 },
    { x: 2220, y: 4 },
  ],
  stars: [],
  diamonds: [],
  // Patrols make the lower catch path a route to navigate, while the cloud
  // tops remain safe places to land and recharge between short flights.
  enemies: [
    { kind: "beetle", x: 650, y: 402, minX: 610, maxX: 710 },
    { kind: "hopper", x: 1380, y: 402, minX: 1330, maxX: 1440 },
    { kind: "charger", x: 1880, y: 402, minX: 1800, maxX: 1970 },
  ],
  fireflies: [],
  checkpoints: [
    { x: 90, y: 430 },
    { x: 1190, y: 430 },
  ],
  featherFountains: [
    { x: 90, y: 430 },
    { x: 1190, y: 430 },
  ],
  mechanisms: [
    { id: "cloud.flower.a", kind: "flower", flower: "A", x: 565, y: 255 },
    { id: "cloud.flower.b", kind: "flower", flower: "B", x: 1055, y: 255 },
    { id: "cloud.flower.c", kind: "flower", flower: "C", x: 1545, y: 255 },
    { id: "cloud.wind-switch", kind: "wind", x: 1650, y: 430 },
  ],
  // Extend well above the flight ceiling and below the safety floor so the
  // sanctuary cannot be reached by going around the closed gate.
  gates: [
    { id: "gate.cloud", condition: "hive", x: 2110, y: -800, w: 24, h: 1460 },
  ],
  portals: [
    { id: "cloud.return.entrance", x: 110, y: 430, w: 80, target: "return" },
    {
      id: "cloud.return.exit",
      x: 2380,
      y: 430,
      w: 80,
      target: "return",
      requires: "completion",
    },
  ],
  sections: [
    { x: 0, name: "Cloud Landing" },
    { x: 850, name: "Skyflower Steps" },
    { x: 1900, name: "Cloudbloom Sanctuary" },
  ],
  tutorials: [
    {
      x: 200,
      text: "Land on all three sky flowers to open the sanctuary. Clouds recharge your feather.",
    },
    {
      x: 740,
      text: "Some clouds drift. Land and pause to recharge before flying on.",
    },
    {
      x: 1610,
      text: "Land on the wind flower to move a cloud bridge toward the high cove.",
    },
  ],
  goal: { x: 2250, y: 430 },
});
