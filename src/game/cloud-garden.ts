import type { Level, Platform } from "./levels";

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
export const cloudGardenLevel: Level = {
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
    cloud("path.2", 760, 340, 170),
    cloud("flower.b", 970, 255, 170),
    cloud("path.3", 1250, 340, 170),
    cloud("flower.c", 1460, 255, 170),
    cloud("path.4", 1730, 340, 170),
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
  ],
  stars: [],
  diamonds: [],
  enemies: [],
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
  ],
  goal: { x: 2250, y: 430 },
};
