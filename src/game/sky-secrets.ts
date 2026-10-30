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
    tutorials: [
      {
        x: 900,
        text: "Ride the petal clouds across. Land to refill your feather.",
      },
    ],
  },
  "sky-hollow": {
    tutorials: [
      {
        x: 900,
        text: "Follow the drifting moon clouds. Land between flights to recharge.",
      },
    ],
  },
  "sky-cloudtop": {
    tutorials: [
      {
        x: 900,
        text: "Ride the drifting clouds across the open sky. Land to recharge your feather.",
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
      { x: 0, y: 430, w: 1080, h: 230, kind: "ground" },
      { x: 1850, y: 430, w: 450, h: 230, kind: "ground" },
      cloud(`${target}.approach.a`, 300, 340, 160),
      cloud(`${target}.approach.b`, 470, 255, 160),
      {
        ...cloud(
          `${target}.drift.a`,
          1155,
          target === "sky-meadow" ? 330 : 350,
          130,
        ),
        motion: { axis: "x", range: 50, period: 4.5 },
      },
      {
        ...cloud(
          `${target}.drift.b`,
          1395,
          target === "sky-meadow" ? 265 : target === "sky-hollow" ? 270 : 285,
          130,
        ),
        motion: {
          axis: "x",
          range: target === "sky-hollow" ? 70 : 55,
          period: target === "sky-hollow" ? 4 : 5,
          phase: Math.PI,
        },
      },
      {
        ...cloud(
          `${target}.drift.c`,
          1640,
          target === "sky-meadow" ? 330 : 350,
          130,
        ),
        motion: { axis: "x", range: 50, period: 4.5, phase: Math.PI / 2 },
      },
      recover(target, 210),
      recover(target, 900),
    ],
    coins: [
      { x: 510, y: 220 },
      { x: 550, y: 220 },
      { x: 590, y: 220 },
      { x: 1220, y: 245 },
      { x: 1460, y: 180 },
      { x: 1705, y: 245 },
    ],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: [{ kind: "beetle", x: 690, y: 402, minX: 640, maxX: 730 }],
    checkpoints: [
      { x: 80, y: 430 },
      { x: 900, y: 430 },
    ],
    sections: [
      { x: 0, name: "Cloud Landing" },
      {
        x: 850,
        name: target === "sky-cloudtop" ? "Raincloud Crossing" : "Sky Garden",
      },
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
    "Follow petal clouds above the meadow.",
  ),
  "sky-hollow": skySecret(
    "sky-hollow",
    25,
    "Moonlit Cloud Garden",
    "Follow drifting moon clouds above Firefly Hollow.",
  ),
  "sky-cloudtop": skySecret(
    "sky-cloudtop",
    26,
    "Raincloud Sanctuary",
    "Ride the drifting clouds above Cloudtop Crossing.",
  ),
};
