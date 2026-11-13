import type { EnemyKind, Level, Platform } from "./levels";

// Each forest friend waits at the far end of its own hidden level. The way
// in is concealed in one world: above a side ledge, three sleeping vines only
// uncurl into footholds when Pip comes close, and they climb to a gate that
// sits out of sight above the screen.

export const HIDEAWAY_IDS = [
  "tansy",
  "brindle",
  "sorrel",
  "rill",
  "wisp",
  "button",
] as const;
export type HideawayId = (typeof HIDEAWAY_IDS)[number];
export type HideawayTarget = `hideaway-${HideawayId}`;
export const isHideawayTarget = (target: string): target is HideawayTarget =>
  (HIDEAWAY_IDS as readonly string[]).some((id) => target === `hideaway-${id}`);

/** The side ledge in each world that the hidden climb starts from. */
export const HIDEAWAY_ROUTES: Record<
  string,
  { friend: HideawayId; ledge: { x: number; y: number; w: number } }
> = {
  "world.sunlit-meadow": {
    friend: "tansy",
    ledge: { x: 2140, y: 265, w: 160 },
  },
  "world.firefly-hollow": {
    friend: "brindle",
    ledge: { x: 2620, y: 255, w: 160 },
  },
  "world.windmill-garden": {
    friend: "sorrel",
    ledge: { x: 7420, y: 270, w: 240 },
  },
  "world.reedwater-marsh": {
    friend: "rill",
    ledge: { x: 4320, y: 280, w: 170 },
  },
  "world.glimmerdeep-caverns": {
    friend: "wisp",
    ledge: { x: 5520, y: 250, w: 150 },
  },
  "world.nightglow-woods": {
    friend: "button",
    ledge: { x: 8000, y: 180, w: 140 },
  },
};

/** The three sleeping vines and the gate ledge above a route's side ledge. */
export function hideawayClimb(ledge: { x: number; y: number; w: number }) {
  const right = ledge.x + ledge.w;
  return {
    first: { x: right + 20, y: ledge.y - 90, w: 90 },
    second: { x: right - 120, y: ledge.y - 180, w: 90 },
    third: { x: right + 20, y: ledge.y - 270, w: 90 },
    // High enough to be off the top of the screen from the trail below.
    gate: { x: right - 150, y: ledge.y - 360, w: 140 },
  };
}

/** Add a world's hidden climb and gate without touching its trail. */
export function withHideawayRoute(level: Level): Level {
  const route = level.contentId && HIDEAWAY_ROUTES[level.contentId];
  if (!route) return level;
  const climb = hideawayClimb(route.ledge);
  const vine = (step: "first" | "second" | "third"): Platform => ({
    id: `hideaway.${route.friend}.${step}`,
    ...climb[step],
    h: 20,
    kind: "curled",
    // Only close by: standing on the ledge below wakes the first vine.
    wakeRadius: 120,
  });
  return {
    ...level,
    platforms: [
      ...level.platforms,
      vine("first"),
      vine("second"),
      vine("third"),
      {
        id: `hideaway.${route.friend}.gate`,
        ...climb.gate,
        h: 20,
        kind: "platform",
      },
    ],
    portals: [
      ...(level.portals ?? []),
      {
        id: `portal.hideaway-${route.friend}`,
        x: climb.gate.x + 25,
        y: climb.gate.y,
        w: 90,
        target: `hideaway-${route.friend}`,
      },
    ],
  };
}

const ground = (x: number, w: number, y = 430): Platform => ({
  x,
  y,
  w,
  h: 660 - y,
  kind: "ground",
});
const slider = (id: string, x: number): Platform => ({
  id,
  x,
  y: 390,
  w: 130,
  h: 18,
  kind: "moving",
  motion: { axis: "x", range: 60, period: 4.2, phase: 0 },
});
const crumble = (id: string, x: number, y: number): Platform => ({
  id,
  x,
  y,
  w: 120,
  h: 20,
  kind: "crumble",
});
/** Four crumbling stepping stones after a ledge edge at `edge`. */
const chain = (prefix: string, edge: number) => [
  crumble(`${prefix}.a`, edge + 50, 390),
  crumble(`${prefix}.b`, edge + 210, 370),
  crumble(`${prefix}.c`, edge + 370, 390),
  crumble(`${prefix}.d`, edge + 530, 370),
];
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const chainCoins = (edge: number) => [
  ...row(edge + 70, 358, 2),
  ...row(edge + 230, 338, 2),
  ...row(edge + 390, 358, 2),
  ...row(edge + 550, 338, 2),
];
const bug = (kind: EnemyKind, x: number, minX: number, maxX: number) => ({
  kind,
  x,
  y: 402,
  minX,
  maxX,
});
const thorns = (x: number, phase: number) => ({
  kind: "thorns" as const,
  x,
  w: 44,
  y: 430,
  period: 2.8,
  active: 0.8,
  phase,
});

type Layout = Pick<Level, "platforms" | "coins" | "enemies" | "width"> &
  Partial<Level> & { end: number };

/** Each hideaway is a short run built from its own mix of crossings. */
const layouts: Record<HideawayId, Layout> = {
  // Crumbling seed pods, then a drifting leaf.
  tansy: {
    width: 3200,
    end: 2600,
    theme: "meadow",
    name: "Seedling Burrow",
    subtitle: "Tansy is hiding past the seed pods.",
    platforms: [
      ground(0, 900),
      ...chain("hideaway.tansy.pod", 900),
      ground(1600, 700),
      slider("hideaway.tansy.leaf", 2390),
      ground(2600, 600),
    ],
    coins: [...row(340, 392, 8, 55), ...chainCoins(900), ...row(2410, 340, 3)],
    enemies: [bug("beetle", 1900, 1800, 2050)],
    checkpoints: [{ x: 1650, y: 430 }],
  },
  // Two runs of crumbling leaf piles with bramble thorns between them.
  brindle: {
    width: 3600,
    end: 3000,
    theme: "dusk",
    name: "Leafpile Hollow",
    subtitle: "Brindle is curled up beyond the brambles.",
    platforms: [
      ground(0, 700),
      ...chain("hideaway.brindle.pile.a", 700),
      ground(1400, 900),
      ...chain("hideaway.brindle.pile.b", 2300),
      ground(3000, 600),
    ],
    traps: [thorns(1700, 0), thorns(1900, 0.9), thorns(2100, 1.8)],
    coins: [
      ...row(300, 392, 6, 55),
      ...chainCoins(700),
      ...row(1780, 392, 2, 200),
      ...chainCoins(2300),
    ],
    enemies: [],
    checkpoints: [{ x: 1450, y: 430 }],
  },
  // A drifting kite, crumbling clover, then burrow mounds to hop.
  sorrel: {
    width: 3500,
    end: 2900,
    theme: "windmill",
    name: "Clover Warren",
    subtitle: "Sorrel hopped in here and lost the way out.",
    platforms: [
      ground(0, 800),
      slider("hideaway.sorrel.kite", 890),
      ground(1100, 700),
      ...chain("hideaway.sorrel.clover", 1800),
      ground(2500, 100),
      ground(2700, 100, 420),
      ground(2900, 600),
    ],
    coins: [
      ...row(300, 392, 7, 55),
      ...row(910, 340, 3),
      ...chainCoins(1800),
      ...row(2720, 388, 2),
    ],
    enemies: [bug("hopper", 1400, 1300, 1550)],
    checkpoints: [{ x: 1150, y: 430 }],
  },
  // Slippery wet stone, a drifting log, then thin lily pads.
  rill: {
    width: 3300,
    end: 2700,
    theme: "marsh",
    name: "Otter Holt",
    subtitle: "Rill is keeping the last glow-pebble safe.",
    platforms: [
      ground(0, 300),
      { ...ground(300, 500), slippery: true },
      ground(800, 100),
      slider("hideaway.rill.log", 990),
      ground(1200, 200),
      { ...ground(1400, 350), slippery: true },
      ground(1750, 250),
      ...chain("hideaway.rill.pad", 2000),
      ground(2700, 600),
    ],
    coins: [
      ...row(340, 392, 8, 55),
      ...row(1010, 340, 3),
      ...row(1440, 392, 6, 55),
      ...chainCoins(2000),
    ],
    enemies: [],
    checkpoints: [{ x: 1250, y: 430 }],
  },
  // A dark cave: stepping stones and cracked crystal, lit by lanterns.
  wisp: {
    width: 3400,
    end: 2680,
    theme: "cavern",
    dark: true,
    name: "Echo Roost",
    subtitle: "Wisp is too shy to leave the dark alone.",
    platforms: [
      ground(0, 700),
      ground(780, 100, 420),
      ground(980, 100, 420),
      ground(1180, 100, 420),
      ground(1380, 600),
      ...chain("hideaway.wisp.crystal", 1980),
      ground(2680, 720),
    ],
    lanterns: [
      { x: 260, y: 430, lit: true },
      { x: 640, y: 430 },
      { x: 1460, y: 430 },
      { x: 1900, y: 430 },
      { x: 2780, y: 430 },
    ],
    coins: [
      ...row(300, 392, 6, 60),
      ...row(800, 388, 2),
      ...row(1000, 388, 2),
      ...row(1200, 388, 2),
      ...chainCoins(1980),
    ],
    enemies: [bug("beetle", 1650, 1560, 1780)],
    checkpoints: [{ x: 1430, y: 430 }],
  },
  // Two drifting petals in a row, then crumbling dew drops.
  button: {
    width: 3900,
    end: 3300,
    theme: "dusk",
    name: "Dewdrop Spiral",
    subtitle: "Button has been climbing here all night.",
    platforms: [
      ground(0, 700),
      slider("hideaway.button.petal.a", 790),
      ground(1000, 700),
      {
        ...slider("hideaway.button.petal.b", 1790),
        motion: { axis: "x", range: 60, period: 4.2, phase: Math.PI / 2 },
      },
      ground(2000, 600),
      ...chain("hideaway.button.dew", 2600),
      ground(3300, 600),
    ],
    coins: [
      ...row(300, 392, 6, 55),
      ...row(810, 340, 3),
      ...row(1810, 340, 3),
      ...chainCoins(2600),
    ],
    enemies: [bug("hopper", 2300, 2200, 2450)],
    checkpoints: [
      { x: 1050, y: 430 },
      { x: 2050, y: 430 },
    ],
  },
};

/** Where the friend waits: on the last stretch of ground, before the gate. */
export const hideawayFriendSpot = (id: HideawayId) => ({
  x: layouts[id].end + 330,
  y: 406,
});

function hideaway(id: HideawayId, index: number): Level {
  const { end, ...layout } = layouts[id];
  return {
    stars: [],
    diamonds: [],
    fireflies: [],
    sections: [{ x: 0, name: layout.name ?? "Hideaway" }],
    name: "Hideaway",
    subtitle: "",
    theme: "meadow",
    checkpoints: [],
    ...layout,
    coins: [...layout.coins, ...row(end + 80, 392, 5, 45)],
    id: 40 + index,
    contentId: `secret.hideaway-${id}`,
    kind: "secret",
    spawn: { x: 80, y: 392 },
    tutorials: [
      {
        x: 80,
        text: "A hidden place! A lost friend is waiting at the far end.",
      },
    ],
    portals: [
      {
        id: `hideaway-${id}.return.entrance`,
        x: 100,
        y: 430,
        w: 80,
        target: "return",
      },
      {
        id: `hideaway-${id}.return.exit`,
        x: end + 440,
        y: 430,
        w: 100,
        target: "return",
        requires: "completion",
      },
    ],
    goal: { x: end + 460, y: 430 },
  };
}

export const hideawayLevels = Object.fromEntries(
  HIDEAWAY_IDS.map((id, index) => [`hideaway-${id}`, hideaway(id, index)]),
) as Record<HideawayTarget, Level>;
