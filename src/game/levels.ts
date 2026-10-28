export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Level {
  id: number;
  name: string;
  subtitle: string;
  width: number;
  theme: "meadow" | "dusk" | "alpine";
  spawn: { x: number; y: number };
  platforms: (Rect & { kind: "ground" | "platform" | "brick" })[];
  coins: { x: number; y: number }[];
  stars: { x: number; y: number }[];
  enemies: { x: number; y: number; minX: number; maxX: number }[];
  checkpoint: { x: number; y: number };
  goal: { x: number; y: number };
}

const ground = (x: number, w: number): Level["platforms"][number] => ({
  x,
  y: 430,
  w,
  h: 200,
  kind: "ground",
});
const ledge = (
  x: number,
  y: number,
  w: number,
): Level["platforms"][number] => ({ x, y, w, h: 20, kind: "platform" });
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const arc = (x: number, y: number, count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    x: x + i * 32,
    y: y - Math.sin((i / (count - 1)) * Math.PI) * 45,
  }));
const bug = (x: number, minX: number, maxX: number) => ({
  x,
  y: 402,
  minX,
  maxX,
});

export const levels: Level[] = [
  {
    id: 1,
    name: "Sunlit Meadow",
    subtitle: "Every adventure starts with a little leap.",
    theme: "meadow",
    width: 3460,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 810),
      ground(930, 680),
      ground(1740, 700),
      ground(2570, 890),
      ledge(320, 340, 160),
      ledge(560, 265, 140),
      ledge(1110, 340, 180),
      ledge(1370, 265, 150),
      ledge(1900, 340, 160),
      ledge(2140, 265, 160),
      ledge(2740, 345, 150),
      ledge(2990, 300, 160),
    ],
    coins: [
      ...row(220, 392, 3),
      ...row(340, 308, 4),
      ...row(585, 233, 3),
      ...arc(780, 345),
      ...row(1125, 308, 5),
      ...row(1390, 233, 4),
      ...arc(1580, 345),
      ...row(1920, 308, 4),
      ...row(2160, 233, 4),
      ...arc(2410, 345),
      ...row(2760, 313, 4),
      ...row(3010, 268, 4),
      ...row(3200, 392, 3),
    ],
    stars: [
      { x: 630, y: 220 },
      { x: 1445, y: 220 },
      { x: 2215, y: 220 },
    ],
    enemies: [
      bug(610, 520, 735),
      bug(1200, 1040, 1390),
      bug(2110, 1850, 2310),
      bug(2900, 2710, 3070),
    ],
    checkpoint: { x: 1810, y: 430 },
    goal: { x: 3290, y: 430 },
  },
  {
    id: 2,
    name: "Firefly Hollow",
    subtitle: "Follow the glow into the blue.",
    theme: "dusk",
    width: 3740,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 620),
      ground(750, 620),
      ground(1500, 620),
      ground(2260, 600),
      ground(2990, 750),
      ledge(230, 340, 140),
      ledge(450, 265, 130),
      ledge(840, 340, 150),
      ledge(1080, 255, 170),
      ledge(1580, 340, 150),
      ledge(1820, 260, 180),
      ledge(2360, 340, 170),
      ledge(2620, 255, 160),
      ledge(3070, 340, 130),
      ledge(3290, 270, 160),
    ],
    coins: [
      ...row(245, 308, 4),
      ...row(470, 233, 3),
      ...arc(590, 345),
      ...row(860, 308, 4),
      ...row(1105, 223, 4),
      ...arc(1340, 345),
      ...row(1600, 308, 4),
      ...row(1840, 228, 5),
      ...arc(2090, 345),
      ...row(2380, 308, 4),
      ...row(2640, 223, 4),
      ...arc(2830, 345),
      ...row(3085, 308, 3),
      ...row(3310, 238, 4),
      ...row(3500, 392, 3),
    ],
    stars: [
      { x: 1160, y: 210 },
      { x: 1905, y: 215 },
      { x: 2700, y: 210 },
    ],
    enemies: [
      bug(430, 370, 550),
      bug(970, 820, 1260),
      bug(1900, 1730, 2040),
      bug(2590, 2350, 2790),
      bug(3350, 3160, 3450),
    ],
    checkpoint: { x: 1570, y: 430 },
    goal: { x: 3570, y: 430 },
  },
  {
    id: 3,
    name: "Cloudtop Crossing",
    subtitle: "A small sprout. A sky full of possibility.",
    theme: "alpine",
    width: 4070,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 560),
      ground(700, 600),
      ground(1440, 600),
      ground(2180, 600),
      ground(2920, 1150),
      ledge(230, 340, 130),
      ledge(430, 255, 130),
      ledge(800, 335, 140),
      ledge(1020, 250, 180),
      ledge(1500, 340, 130),
      ledge(1720, 255, 180),
      ledge(2280, 340, 130),
      ledge(2490, 255, 170),
      ledge(3000, 340, 130),
      ledge(3220, 255, 160),
      ledge(3460, 320, 150),
    ],
    coins: [
      ...row(245, 308, 3),
      ...row(445, 223, 3),
      ...arc(530, 340),
      ...row(820, 303, 3),
      ...row(1040, 218, 5),
      ...arc(1270, 340),
      ...row(1520, 308, 3),
      ...row(1740, 223, 4),
      ...arc(2010, 340),
      ...row(2300, 308, 3),
      ...row(2510, 223, 4),
      ...arc(2750, 340),
      ...row(3020, 308, 3),
      ...row(3240, 223, 4),
      ...row(3480, 288, 4),
      ...row(3700, 392, 4),
    ],
    stars: [
      { x: 1110, y: 205 },
      { x: 2580, y: 210 },
      { x: 3310, y: 210 },
    ],
    enemies: [
      bug(420, 365, 500),
      bug(1000, 780, 1220),
      bug(1770, 1540, 1970),
      bug(2480, 2310, 2700),
      bug(3170, 3010, 3370),
      bug(3660, 3490, 3770),
    ],
    checkpoint: { x: 2240, y: 430 },
    goal: { x: 3900, y: 430 },
  },
];
