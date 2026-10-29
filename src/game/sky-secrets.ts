import type { Level, Platform } from "./levels";

export type SkySecretTarget = "sky-meadow" | "sky-hollow" | "sky-cloudtop";

const cloud = (id: string, x: number, y: number, w: number): Platform => ({
  id: `cloud.${id}`,
  x,
  y,
  w,
  h: 20,
  kind: "platform",
});

// Each trail's first cloud sits 155px above an existing high platform. A
// normal jump cannot reach it, but a feather-assisted jump can; each cloud
// is stable so Pip can land and recharge before making the next flight.
const routes: Record<
  string,
  {
    target: SkySecretTarget;
    ledges: Platform[];
    portalX: number;
    portalY: number;
    hintX: number;
    hintY: number;
  }
> = {
  "world.sunlit-meadow": {
    target: "sky-meadow",
    ledges: [
      cloud("sky-meadow.first", 3890, 50, 160),
      cloud("sky-meadow.second", 4050, -30, 160),
      cloud("sky-meadow.portal", 4130, -110, 200),
    ],
    portalX: 4160,
    portalY: -110,
    hintX: 3910,
    hintY: 175,
  },
  "world.firefly-hollow": {
    target: "sky-hollow",
    ledges: [
      cloud("sky-hollow.first", 4450, 70, 160),
      cloud("sky-hollow.second", 4310, -10, 160),
      cloud("sky-hollow.portal", 4250, -90, 160),
    ],
    portalX: 4280,
    portalY: -90,
    hintX: 4360,
    hintY: 195,
  },
  "world.cloudtop-crossing": {
    target: "sky-cloudtop",
    ledges: [
      cloud("sky-cloudtop.first", 4660, 55, 160),
      cloud("sky-cloudtop.second", 4740, -25, 160),
      cloud("sky-cloudtop.portal", 4860, -105, 180),
    ],
    portalX: 4890,
    portalY: -105,
    hintX: 4680,
    hintY: 180,
  },
};

/** Add an optional high entrance without disturbing the original trail route. */
export function withSkyRoute(level: Level): Level {
  const route = level.contentId && routes[level.contentId];
  if (!route) return level;
  return {
    ...level,
    platforms: [...level.platforms, ...route.ledges],
    portals: [
      ...(level.portals ?? []),
      {
        id: `portal.${route.target}`,
        x: route.portalX,
        y: route.portalY,
        w: 90,
        target: route.target,
      },
    ],
    clues: [
      ...(level.clues ?? []),
      {
        x: route.hintX,
        y: route.hintY,
        kind: "glow",
        text: "Follow the drifting petals above. A feather can lift you to a hidden sky path.",
      },
    ],
  };
}

const recover = (target: SkySecretTarget, x: number): Platform => ({
  id: `reward.secret.${target}.${x}`,
  kind: "brick",
  x,
  y: 300,
  w: 48,
  h: 32,
  rewardPower: "feather",
});

type SkyPuzzle = Pick<Level, "mechanisms" | "gates" | "tutorials">;
const puzzles: Record<SkySecretTarget, SkyPuzzle> = {
  "sky-meadow": {
    mechanisms: [
      { id: "sky.meadow.a", kind: "flower", flower: "A", x: 550, y: 255 },
      { id: "sky.meadow.b", kind: "flower", flower: "B", x: 1100, y: 255 },
      { id: "sky.meadow.c", kind: "flower", flower: "C", x: 1600, y: 255 },
    ],
    gates: [
      {
        id: "gate.sky-meadow",
        condition: "hive",
        x: 1850,
        y: -800,
        w: 24,
        h: 1460,
      },
    ],
    tutorials: [
      {
        x: 200,
        text: "Wake all three sky flowers by landing on them to open the way.",
      },
    ],
  },
  "sky-hollow": {
    mechanisms: [
      { id: "sky.hollow.wind", kind: "wind", x: 550, y: 255 },
      { id: "sky.hollow.brake", kind: "brake", x: 1100, y: 255 },
    ],
    gates: [
      {
        id: "gate.sky-hollow",
        condition: "vane",
        x: 1850,
        y: -800,
        w: 24,
        h: 1460,
      },
    ],
    tutorials: [
      {
        x: 200,
        text: "Land on the wind and brake handles to turn the sky gate.",
      },
    ],
  },
  "sky-cloudtop": {
    mechanisms: [
      { id: "sky.cloudtop.rain", kind: "water", x: 550, y: 255 },
      { id: "sky.cloudtop.sluice", kind: "sluice", x: 1100, y: 255 },
    ],
    gates: [
      {
        id: "gate.sky-cloudtop",
        condition: "sluice",
        x: 1850,
        y: -800,
        w: 24,
        h: 1460,
      },
    ],
    tutorials: [
      {
        x: 200,
        text: "Wake the rain handle, then land on the latch to open the cloud gate.",
      },
    ],
  },
};

function skySecret(
  target: SkySecretTarget,
  id: number,
  name: string,
  subtitle: string,
): Level {
  return {
    id,
    contentId: `secret.${target}`,
    name,
    subtitle,
    kind: "secret",
    theme: "cloud",
    width: 2300,
    spawn: { x: 80, y: 392 },
    platforms: [
      { x: 0, y: 430, w: 2300, h: 230, kind: "ground" },
      cloud(`${target}.approach.a`, 300, 340, 160),
      cloud(`${target}.switch.a`, 470, 255, 160),
      {
        ...cloud(`${target}.drift`, 740, 340, 160),
        motion: { axis: "x", range: 45, period: 4.5 },
      },
      cloud(`${target}.switch.b`, 1020, 255, 160),
      cloud(`${target}.approach.c`, 1280, 340, 160),
      cloud(`${target}.switch.c`, 1520, 255, 160),
      recover(target, 210),
      recover(target, 900),
    ],
    coins: [
      { x: 510, y: 220 },
      { x: 550, y: 220 },
      { x: 590, y: 220 },
      { x: 1060, y: 220 },
      { x: 1100, y: 220 },
      { x: 1140, y: 220 },
      { x: 1560, y: 220 },
      { x: 1600, y: 220 },
      { x: 1640, y: 220 },
    ],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: [
      { kind: "beetle", x: 690, y: 402, minX: 640, maxX: 730 },
      { kind: "hopper", x: 1460, y: 402, minX: 1410, maxX: 1500 },
    ],
    checkpoints: [
      { x: 80, y: 430 },
      { x: 900, y: 430 },
    ],
    sections: [
      { x: 0, name: "Cloud Landing" },
      { x: 850, name: "Sky Garden" },
      { x: 1900, name: "Hidden Clearing" },
    ],
    ...puzzles[target],
    portals: [
      {
        id: `${target}.return.entrance`,
        x: 100,
        y: 430,
        w: 80,
        target: "return",
      },
      {
        id: `${target}.return.exit`,
        x: 2160,
        y: 430,
        w: 90,
        target: "return",
        requires: "completion",
      },
    ],
    goal: { x: 2050, y: 430 },
  };
}

export const skySecretLevels: Record<SkySecretTarget, Level> = {
  "sky-meadow": skySecret(
    "sky-meadow",
    24,
    "Sunpetal Sky Garden",
    "Wake the sky flowers above the meadow.",
  ),
  "sky-hollow": skySecret(
    "sky-hollow",
    25,
    "Moonlit Cloud Garden",
    "Turn the wind above Firefly Hollow.",
  ),
  "sky-cloudtop": skySecret(
    "sky-cloudtop",
    26,
    "Raincloud Sanctuary",
    "Guide the rain above Cloudtop Crossing.",
  ),
};
