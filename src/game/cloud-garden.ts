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

/** A secret garden above the grove, reached by riding its drifting clouds. */
export const cloudGardenLevel: Level = withRewardBlocks({
  id: 23,
  contentId: "secret.cloud-garden",
  name: "Cloudbloom Sanctuary",
  subtitle: "Ride the cloud paths into the sanctuary.",
  kind: "secret",
  theme: "cloud",
  width: 2500,
  spawn: { x: 70, y: 392 },
  platforms: [
    // A checkpointed approach leads to a short flight across the open sky.
    { x: 0, y: 430, w: 1800, h: 230, kind: "ground" },
    { x: 2050, y: 430, w: 450, h: 230, kind: "ground" },
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
    // The bridge drifts on its own toward the optional high cove.
    {
      ...cloud("cove.bridge", 1800, 120, 180),
      motion: { axis: "x", range: 120, period: 5 },
    },
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
    { kind: "charger", x: 2150, y: 402, minX: 2080, maxX: 2190 },
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
      text: "Follow the cloud steps into the sanctuary. Land to refill your feather.",
    },
    {
      x: 740,
      text: "Some clouds drift. Land and pause to recharge before flying on.",
    },
    {
      x: 1610,
      text: "Ride the drifting bridge to the high cove, or fly across to the sanctuary.",
    },
  ],
  goal: { x: 2250, y: 430 },
});
