import type { EnemyKind, Level, Platform } from "./levels";

// Short timed courses for worlds 4–6, unlocked by rescuing all three of that
// world's fireflies. Each uses its world's moving platforms in a compact
// run; gold targets leave room for a mistake or two.

const ground = (x: number, w: number): Platform => ({
  x,
  y: 430,
  w,
  h: 230,
  kind: "ground",
});
const ledge = (x: number, y: number, w: number): Platform => ({
  x,
  y,
  w,
  h: 20,
  kind: "platform",
});
const slider = (
  id: string,
  x: number,
  y: number,
  w: number,
  range: number,
  period: number,
  phase = 0,
): Platform => ({
  id,
  x,
  y,
  w,
  h: id.startsWith("windmill.sail.") || id.startsWith("cave.") ? 20 : 18,
  kind: "moving",
  motion: { axis: "x", range, period, phase },
});
const crumble = (id: string, x: number, y: number, w = 120): Platform => ({
  id,
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const bug = (kind: EnemyKind, x: number, minX: number, maxX: number) => ({
  kind,
  x,
  y: 402,
  minX,
  maxX,
});
const empty = {
  stars: [],
  diamonds: [],
  fireflies: [],
};

export const expansionChallenges: Level[] = [
  {
    ...empty,
    id: 14,
    contentId: "challenge.windmill-garden",
    name: "Sail-Skip Dash",
    subtitle: "Catch two sliding sails and race the wind to the flag.",
    kind: "challenge",
    challengeTime: 20,
    theme: "windmill",
    width: 2400,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 600),
      slider("windmill.sail.dash.a", 660, 390, 140, 60, 3.6),
      ground(900, 400),
      ledge(1000, 350, 140),
      slider("windmill.sail.dash.b", 1360, 360, 140, 70, 3.4),
      ground(1640, 760),
      ledge(1800, 340, 150),
      ledge(2020, 260, 150),
    ],
    coins: [
      ...row(300, 392, 4),
      ...row(680, 358, 3),
      ...row(1020, 318, 3),
      ...row(1380, 328, 3),
      ...row(1820, 308, 3),
      ...row(2040, 228, 4),
    ],
    enemies: [bug("hopper", 2120, 2060, 2200)],
    checkpoints: [{ x: 960, y: 430 }],
    sections: [
      { x: 0, name: "Gust Start" },
      { x: 900, name: "Sail Skip" },
      { x: 1640, name: "Pinwheel Finish" },
    ],
    tutorials: [
      {
        x: 95,
        text: "Gold target: 20 seconds. Time your hops onto the sliding sails.",
      },
    ],
    goal: { x: 2300, y: 430 },
  },
  {
    ...empty,
    id: 15,
    contentId: "challenge.reedwater-marsh",
    name: "Lily-Leap Relay",
    subtitle: "Hop the sinking pads, then ride the lilies home.",
    kind: "challenge",
    challengeTime: 24,
    theme: "marsh",
    width: 2500,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 500),
      crumble("marsh.sinkpad.relay.a", 550, 390),
      crumble("marsh.sinkpad.relay.b", 710, 370),
      crumble("marsh.sinkpad.relay.c", 870, 390),
      ground(1040, 360),
      slider("marsh.lily.relay.a", 1470, 390, 140, 60, 3.8),
      ledge(1720, 350, 100),
      slider("marsh.lily.relay.b", 1880, 380, 140, 60, 4, 1.5),
      ground(2130, 370),
    ],
    coins: [
      ...row(250, 392, 4),
      ...row(570, 358, 2),
      ...row(730, 338, 2),
      ...row(890, 358, 2),
      ...row(1490, 340, 3),
      ...row(1735, 318, 2),
      ...row(1900, 330, 3),
      ...row(2180, 392, 4),
    ],
    enemies: [bug("beetle", 2250, 2200, 2330)],
    checkpoints: [{ x: 1100, y: 430 }],
    sections: [
      { x: 0, name: "Sinking Start" },
      { x: 1040, name: "Lily Relay" },
      { x: 2130, name: "Reed Finish" },
    ],
    tutorials: [
      {
        x: 95,
        text: "Gold target: 24 seconds. Don't linger on the sinking pads.",
      },
    ],
    goal: { x: 2400, y: 430 },
  },
  {
    ...empty,
    id: 16,
    contentId: "challenge.glimmerdeep-caverns",
    name: "Crystal Rush",
    subtitle: "Switch crystals mid-chasm and outrun the cracks.",
    kind: "challenge",
    challengeTime: 18,
    theme: "cavern",
    width: 2500,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 500),
      slider("cave.lift.rush.a", 600, 390, 110, 80, 3.6),
      slider("cave.lift.rush.b", 870, 360, 110, 80, 3.6, Math.PI),
      ground(1150, 350),
      crumble("cave.crack.rush.a", 1550, 390),
      crumble("cave.crack.rush.b", 1710, 370),
      ground(1880, 620),
      ledge(2000, 340, 140),
    ],
    coins: [
      ...row(250, 392, 4),
      ...row(610, 358, 3),
      ...row(880, 328, 3),
      ...row(1250, 392, 3),
      ...row(1570, 358, 2),
      ...row(1730, 338, 2),
      ...row(2020, 308, 3),
    ],
    enemies: [bug("hopper", 2230, 2180, 2300)],
    checkpoints: [{ x: 1220, y: 430 }],
    sections: [
      { x: 0, name: "Crystal Gate" },
      { x: 1150, name: "Crack Run" },
      { x: 1880, name: "Glow Finish" },
    ],
    tutorials: [
      {
        x: 95,
        text: "Gold target: 18 seconds. Jump across when the crystals meet.",
      },
    ],
    goal: { x: 2400, y: 430 },
  },
];
