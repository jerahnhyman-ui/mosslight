import type { EnemyKind, Level, Platform } from "./levels";

// Timed challenge rooms for worlds 9–12, unlocked like the others by
// rescuing all three of the world's fireflies. Each is a compact run built
// from its world's own hazard: icicles and snow bridges, slippery ice and
// floes, lava with ember sprites, and wind gusts. Gold targets leave room
// for a mistake or two.

const ground = (x: number, w: number, y = 430): Platform => ({
  x,
  y,
  w,
  h: 660 - y,
  kind: "ground",
});
const ice = (x: number, w: number): Platform => ({
  ...ground(x, w),
  slippery: true,
});
const ledge = (x: number, y: number, w: number): Platform => ({
  x,
  y,
  w,
  h: 20,
  kind: "platform",
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
const stone = (x: number): Platform => ground(x, 100, 420);
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const bug = (kind: EnemyKind, x: number, minX: number, maxX: number) => ({
  kind,
  x,
  y: 402,
  minX,
  maxX,
});
const empty = { stars: [], diamonds: [], fireflies: [] };
/** Four crumbling stepping stones after a ledge edge at `edge`. */
const chain = (prefix: string, edge: number) => [
  crumble(`${prefix}.a`, edge + 50, 390),
  crumble(`${prefix}.b`, edge + 210, 370),
  crumble(`${prefix}.c`, edge + 370, 390),
  crumble(`${prefix}.d`, edge + 530, 370),
];
const chainCoins = (edge: number) => [
  ...row(edge + 70, 358, 2),
  ...row(edge + 230, 338, 2),
  ...row(edge + 390, 358, 2),
  ...row(edge + 550, 338, 2),
];

export const icicleDash: Level = {
  ...empty,
  id: 19,
  contentId: "challenge.snowdrift-peaks",
  name: "Icicle Dash",
  subtitle: "Race under the icicles and over the snow bridges.",
  kind: "challenge",
  challengeTime: 17,
  theme: "snow",
  width: 3100,
  spawn: { x: 100, y: 392 },
  platforms: [
    ground(0, 900),
    {
      id: "snow.overhang.dash.a",
      x: 300,
      y: 180,
      w: 520,
      h: 20,
      kind: "platform",
    },
    ...chain("snow.bridge.dash", 900),
    ground(1600, 700),
    {
      id: "snow.overhang.dash.b",
      x: 1700,
      y: 180,
      w: 480,
      h: 20,
      kind: "platform",
    },
    slider("snow.lift.dash", 2390),
    ground(2600, 500),
  ],
  icicles: [
    ...[360, 470, 580, 690, 790].map((x) => ({ x, y: 200 })),
    ...[1760, 1870, 1980, 2090].map((x) => ({ x, y: 200 })),
  ],
  coins: [
    ...row(340, 392, 10, 50),
    ...chainCoins(900),
    ...row(1740, 392, 9, 50),
    ...row(2410, 340, 3),
    ...row(2700, 392, 4),
  ],
  enemies: [bug("hopper", 2800, 2760, 2880)],
  checkpoints: [{ x: 1650, y: 430 }],
  sections: [
    { x: 0, name: "Icicle Alley" },
    { x: 900, name: "Snow Bridges" },
    { x: 1600, name: "Frozen Gallery" },
  ],
  tutorials: [
    {
      x: 100,
      text: "Gold target: 17 seconds. Keep running: icicles fall behind a moving Pip.",
    },
  ],
  goal: { x: 2950, y: 430 },
};

export const floeHopper: Level = {
  ...empty,
  id: 20,
  contentId: "challenge.frostglass-lake",
  name: "Floe Hopper",
  subtitle: "Slide the ice, ride the floe and skip the thin ice.",
  kind: "challenge",
  challengeTime: 18,
  theme: "ice",
  width: 3300,
  spawn: { x: 100, y: 392 },
  platforms: [
    ground(0, 300),
    ice(300, 500),
    ground(800, 100),
    slider("ice.floe.hopper", 990),
    ground(1200, 200),
    ice(1400, 350),
    ground(1750, 250),
    ...chain("ice.crack.hopper", 2000),
    ground(2700, 600),
  ],
  coins: [
    ...row(340, 392, 8, 55),
    ...row(1010, 340, 3),
    ...row(1440, 392, 6, 55),
    ...chainCoins(2000),
    ...row(2800, 392, 4),
  ],
  enemies: [bug("beetle", 2950, 2900, 3050)],
  checkpoints: [{ x: 1250, y: 430 }],
  sections: [
    { x: 0, name: "Glassy Start" },
    { x: 900, name: "Floe Ferry" },
    { x: 2000, name: "Thin Ice Skip" },
  ],
  tutorials: [
    {
      x: 100,
      text: "Gold target: 18 seconds. Ease off early on the ice, then hop the floe.",
    },
  ],
  goal: { x: 3150, y: 430 },
};

export const emberGauntlet: Level = {
  ...empty,
  id: 21,
  contentId: "challenge.ember-caldera",
  name: "Ember Gauntlet",
  subtitle: "Time your hops past the ember sprites.",
  kind: "challenge",
  challengeTime: 20,
  theme: "volcano",
  lava: true,
  width: 3400,
  spawn: { x: 100, y: 392 },
  platforms: [
    ground(0, 700),
    stone(780),
    stone(980),
    stone(1180),
    ground(1380, 600),
    ...chain("volcano.basalt.gauntlet", 1980),
    ground(2680, 720),
  ],
  coins: [
    ...row(300, 392, 6, 60),
    ...row(800, 388, 2),
    ...row(1000, 388, 2),
    ...row(1200, 388, 2),
    ...row(1480, 392, 6, 60),
    ...chainCoins(1980),
    ...row(2800, 392, 4),
  ],
  enemies: [
    bug("ember", 914, 914, 914),
    bug("ember", 1114, 1114, 1114),
    bug("charger", 3050, 2980, 3150),
  ],
  checkpoints: [{ x: 1430, y: 430 }],
  sections: [
    { x: 0, name: "Ember Stones" },
    { x: 1380, name: "Cinder Path" },
    { x: 1980, name: "Crumbling Crust" },
  ],
  tutorials: [
    {
      x: 100,
      text: "Gold target: 20 seconds. Jump just after each ember drops back into the lava.",
    },
  ],
  goal: { x: 3250, y: 430 },
};

export const galeRun: Level = {
  ...empty,
  id: 22,
  contentId: "challenge.thunderhead-heights",
  name: "Gale Run",
  subtitle: "Cross the windy ledges in the calm between gusts.",
  kind: "challenge",
  challengeTime: 26,
  theme: "storm",
  width: 3200,
  spawn: { x: 100, y: 392 },
  platforms: [
    ground(0, 700),
    ledge(820, 380, 140),
    ledge(1040, 380, 140),
    ledge(1260, 380, 140),
    ground(1480, 820),
    slider("storm.lift.gale", 2390),
    ground(2600, 600),
  ],
  windZones: [{ x: 200, w: 1350, speed: -125, period: 3.6, duration: 1.4 }],

  coins: [
    ...row(260, 392, 8, 55),
    ...row(860, 348, 2),
    ...row(1080, 348, 2),
    ...row(1300, 348, 2),
    ...row(1600, 392, 10, 60),
    ...row(2410, 340, 3),
    ...row(2700, 392, 4),
  ],
  enemies: [bug("hopper", 1900, 1820, 2000)],
  checkpoints: [{ x: 1550, y: 430 }],
  sections: [
    { x: 0, name: "Gusty Start" },
    { x: 700, name: "Gale Ledges" },
    { x: 1480, name: "Windward Dash" },
  ],
  tutorials: [
    {
      x: 100,
      text: "Gold target: 26 seconds. Wind streaks warn of a gust; jump the ledges in the calm.",
    },
  ],
  goal: { x: 3050, y: 430 },
};

export const frontierChallenges = [
  icicleDash,
  floeHopper,
  emberGauntlet,
  galeRun,
];
