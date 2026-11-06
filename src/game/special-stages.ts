import type { EnemyKind, Level, Platform } from "./levels";

// Two special timed stages, unlocked like the other challenge rooms by
// rescuing all three fireflies of their world:
// - Floodgate Dash (Tidewell Depths): outrun a flood rolling in behind you.
// - Leafboat River (Nightglow Woods): ride leaf boats downstream, jumping the
//   rocks that stand in the way.

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

/** A rock standing in the river: jump it from the boat. */
const rock = (id: string, x: number, height: number, w = 44): Platform => ({
  id: `moonpool.rock.river.${id}`,
  x,
  y: 400 - height,
  w,
  h: 660 - (400 - height),
  kind: "ground",
});
/** A leaf boat waiting at its dock. */
const boat = (id: string, x: number, until: number): Platform => ({
  id: `marsh.lily.boat.${id}`,
  x,
  y: 400,
  w: 220,
  h: 18,
  kind: "platform",
  cruise: { speed: 125, until },
});

export const floodgateDash: Level = {
  ...empty,
  id: 17,
  contentId: "challenge.tidewell-depths",
  name: "Floodgate Dash",
  subtitle: "The floodgate is open. Run!",
  kind: "challenge",
  challengeTime: 19,
  theme: "alpine",
  width: 3800,
  spawn: { x: 300, y: 392 },
  chase: { speed: 175, delay: 1.5, lead: 280 },
  platforms: [
    ground(0, 900),
    ledge(520, 350, 140),
    ground(1060, 520),
    { x: 1300, y: 408, w: 90, h: 22, kind: "mushroom" },
    ledge(1440, 250, 160),
    ground(1720, 600),
    ledge(1900, 340, 140),
    ground(2460, 360),
    ledge(2900, 360, 140),
    ground(3160, 640),
  ],
  coins: [
    ...row(560, 318, 3),
    ...row(930, 330, 3),
    ...row(1460, 218, 4),
    ...row(1920, 308, 3),
    ...row(2350, 330, 3),
    ...row(2920, 328, 3),
    ...row(3300, 392, 4),
  ],
  enemies: [bug("beetle", 2100, 2050, 2250), bug("hopper", 3400, 3350, 3500)],
  checkpoints: [{ x: 1760, y: 430 }],
  sections: [
    { x: 0, name: "The Floodgate" },
    { x: 1720, name: "Rushing Run" },
    { x: 3160, name: "High Ground" },
  ],
  tutorials: [
    {
      x: 300,
      text: "Gold target: 19 seconds. The flood is coming — keep running and don't look back!",
    },
  ],
  goal: { x: 3650, y: 430 },
};

export const leafboatRiver: Level = {
  ...empty,
  id: 18,
  contentId: "challenge.nightglow-woods",
  name: "Leafboat River",
  subtitle: "Ride the leaf boats downstream and hop the rocks.",
  kind: "challenge",
  challengeTime: 34,
  theme: "marsh",
  width: 4000,
  spawn: { x: 120, y: 392 },
  platforms: [
    ground(0, 300),
    boat("a", 300, 1480),
    rock("a1", 760, 60),
    rock("a2", 1150, 70),
    ground(1700, 200),
    boat("b", 1900, 3280),
    rock("b1", 2350, 60),
    rock("b2", 2750, 80),
    rock("b3", 3100, 60),
    ground(3500, 500),
  ],
  coins: [
    ...row(740, 300, 3),
    ...row(1130, 290, 3),
    ...row(1740, 392, 4),
    ...row(2330, 300, 3),
    ...row(2730, 280, 3),
    ...row(3080, 300, 3),
    ...row(3600, 392, 4),
  ],
  enemies: [],
  checkpoints: [{ x: 1760, y: 430 }],
  sections: [
    { x: 0, name: "Upper Dock" },
    { x: 1700, name: "Middle Bank" },
    { x: 3500, name: "Lower Dock" },
  ],
  tutorials: [
    {
      x: 120,
      text: "Gold target: 34 seconds. Step onto the boat, then jump the rocks as you float.",
    },
  ],
  goal: { x: 3850, y: 430 },
};
