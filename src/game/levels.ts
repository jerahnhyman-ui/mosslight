export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Platform = Rect & {
  kind:
    | "ground"
    | "platform"
    | "brick"
    | "mushroom"
    | "moving"
    | "crumble"
    | "flower"
    | "curled";
  motion?: { axis: "x" | "y"; range: number; period: number; phase?: number };
  rewardCoins?: number;
  wakeRadius?: number;
  enemyBreakable?: boolean;
};
export type EnemyKind = "beetle" | "hopper" | "charger";
export type EnemySpawn = {
  kind: EnemyKind;
  x: number;
  y: number;
  minX: number;
  maxX: number;
};

export type BossKind = "stag" | "spider" | "moth";
export type BossSpec = {
  kind: BossKind;
  name: string;
  x: number;
  /** Ground surface, not the top of the boss. */
  y: number;
  minX: number;
  maxX: number;
};
export type Landmark = Rect & {
  kind: "watering-can" | "flowerpot" | "log" | "web" | "stream";
  name: string;
};
export type Clue = {
  x: number;
  y: number;
  kind: "glow" | "footprints" | "grass";
  text: string;
};

export interface Level {
  id: number;
  name: string;
  subtitle: string;
  width: number;
  theme: "meadow" | "dusk" | "alpine";
  spawn: { x: number; y: number };
  platforms: Platform[];
  coins: { x: number; y: number }[];
  stars: { x: number; y: number }[];
  diamonds: { x: number; y: number }[];
  enemies: EnemySpawn[];
  checkpoints: { x: number; y: number }[];
  sections: { x: number; name: string }[];
  fireflies: { x: number; y: number }[];
  rooms?: (Rect & { name: string })[];
  goal: { x: number; y: number };
  kind?: "world" | "grove" | "challenge";
  /** Gold-medal target in seconds for an optional challenge room. */
  challengeTime?: number;
  boss?: BossSpec;
  landmarks?: Landmark[];
  clues?: Clue[];
  tutorials?: { x: number; text: string }[];
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
const wakingPlant = (
  x: number,
  y: number,
  w: number,
  kind: "flower" | "curled" = "flower",
  wakeRadius = 210,
): Platform => ({ x, y, w, h: 20, kind, wakeRadius });
const row = (x: number, y: number, count: number, gap = 35) =>
  Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y }));
const arc = (x: number, y: number, count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    x: x + i * 32,
    y: y - Math.sin((i / (count - 1)) * Math.PI) * 45,
  }));
const bug = (
  x: number,
  minX: number,
  maxX: number,
  kind: EnemyKind = "beetle",
): EnemySpawn => ({
  kind,
  x,
  y: 402,
  minX,
  maxX,
});

const beginnings = [
  {
    id: 1,
    name: "Sunlit Meadow",
    subtitle: "Every adventure starts with a little leap.",
    theme: "meadow" as const,
    width: 3460,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 810),
      ground(930, 680),
      ground(1740, 700),
      ground(2570, 890),
      ledge(320, 340, 160),
      ledge(560, 265, 140),
      wakingPlant(1110, 340, 180),
      wakingPlant(1370, 265, 150, "curled"),
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
    diamonds: [
      { x: 170, y: 400 },
      { x: 1860, y: 400 },
    ],
    enemies: [
      bug(610, 520, 735),
      bug(1200, 1040, 1390),
      bug(2110, 1880, 2310),
      bug(2900, 2710, 3070),
    ],
    checkpoints: [{ x: 1810, y: 430 }],
    goal: { x: 3290, y: 430 },
  },
  {
    id: 2,
    name: "Firefly Hollow",
    subtitle: "Follow the glow into the blue.",
    theme: "dusk" as const,
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
    diamonds: [
      { x: 170, y: 400 },
      { x: 1620, y: 400 },
    ],
    enemies: [
      bug(430, 370, 550),
      bug(970, 820, 1260),
      bug(1900, 1730, 2040),
      bug(2590, 2350, 2790),
      bug(3350, 3160, 3450),
    ],
    checkpoints: [{ x: 1570, y: 430 }],
    goal: { x: 3570, y: 430 },
  },
  {
    id: 3,
    name: "Cloudtop Crossing",
    subtitle: "A small sprout. A sky full of possibility.",
    theme: "alpine" as const,
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
    diamonds: [
      { x: 170, y: 400 },
      { x: 2290, y: 400 },
    ],
    enemies: [
      bug(420, 365, 500),
      bug(1000, 780, 1220),
      bug(1770, 1540, 1970),
      bug(2480, 2310, 2700),
      bug(3170, 3010, 3370),
      bug(3660, 3490, 3770),
    ],
    checkpoints: [{ x: 2240, y: 430 }],
    goal: { x: 3900, y: 430 },
  },
];

const mushroom = (x: number, y: number, w = 90): Platform => ({
  x,
  y,
  w,
  h: 22,
  kind: "mushroom",
});
const movingLeaf = (
  x: number,
  y: number,
  w: number,
  axis: "x" | "y",
  range: number,
  period: number,
): Platform => ({
  x,
  y,
  w,
  h: 18,
  kind: "moving",
  motion: { axis, range, period },
});
const cloud = (x: number, y: number, w = 130): Platform => ({
  x,
  y,
  w,
  h: 20,
  kind: "crumble",
});
const cache = (x: number, y = 318, rewardCoins = 12): Platform => ({
  x,
  y,
  w: 100,
  h: 26,
  kind: "brick",
  rewardCoins,
});

/** Authored extensions: each new stretch introduces, practices, then combines
 * its world's terrain. Lower paths stay readable; secret routes ask for climbs.
 * The first meadow clearing preserves the control tutorial's familiar spacing.
 */
const trails: Level[] = [
  {
    ...beginnings[0]!,
    width: 11200,
    subtitle:
      "Follow the brook, bounce through the canopy, and light the meadow.",
    sections: [
      { x: 0, name: "Dewdrop Clearing" },
      { x: 1740, name: "Brookside Steps" },
      { x: 3460, name: "Mushroom Grove" },
      { x: 5640, name: "Sunflower Canopy" },
      { x: 7860, name: "Beetle Orchard" },
      { x: 10080, name: "Sunseed Sanctuary" },
    ],
    kind: "world",
    rooms: [
      { x: 4740, y: 190, w: 300, h: 154, name: "Acorn Treasury" },
      { x: 7540, y: 340, w: 160, h: 90, name: "Beetle's Shortcut" },
    ],
    landmarks: [
      {
        x: 320,
        y: 340,
        w: 380,
        h: 90,
        kind: "watering-can",
        name: "The Gardener's Can",
      },
      {
        x: 1740,
        y: 430,
        w: 700,
        h: 110,
        kind: "stream",
        name: "Dewdrop Brook",
      },
      { x: 4740, y: 190, w: 300, h: 154, kind: "log", name: "Acorn Treasury" },
      {
        x: 5740,
        y: 340,
        w: 190,
        h: 90,
        kind: "flowerpot",
        name: "Sunflower Steps",
      },
      {
        x: 9360,
        y: 255,
        w: 420,
        h: 175,
        kind: "flowerpot",
        name: "The Potter's Shelf",
      },
    ],
    clues: [
      {
        x: 1260,
        y: 405,
        kind: "footprints",
        text: "Little lights climb the waking leaves.",
      },
      {
        x: 4840,
        y: 318,
        kind: "glow",
        text: "Golden light leaks from the cracked log.",
      },
      {
        x: 6000,
        y: 405,
        kind: "grass",
        text: "A rustle above the sunflower canopy.",
      },
      {
        x: 7540,
        y: 352,
        kind: "glow",
        text: "A beetle's charge can open this door.",
      },
      {
        x: 9400,
        y: 402,
        kind: "footprints",
        text: "Follow the trail up the potter's shelf.",
      },
    ],
    tutorials: [
      { x: 90, text: "Tap for a short hop. Hold jump to leap higher." },
      {
        x: 1030,
        text: "Your glow wakes flowers and uncurls leaves. Move close to reveal the way.",
      },
      {
        x: 3500,
        text: "Land on a mushroom and ride its bounce into the canopy.",
      },
      {
        x: 4670,
        text: "Big Pip can break cracked blocks from below. Follow the golden light.",
      },
      {
        x: 7190,
        text: "A charging beetle flashes before it rushes. Its charge can smash cracked doors.",
      },
      {
        x: 10090,
        text: "A quiet clearing. Collect a diamond before the guardian's gate.",
      },
    ],
    platforms: [
      ...beginnings[0]!.platforms,
      ground(3460, 1000),
      ground(4600, 900),
      ground(5640, 1000),
      ground(6800, 900),
      ground(7860, 1000),
      ground(9020, 900),
      ground(10080, 1120),
      // A safe bounce lesson has solid earth beneath the whole launch.
      mushroom(3710, 350),
      wakingPlant(3880, 205, 210, "flower", 260),
      ledge(4180, 285, 170),
      // Cracked caches sit over safe ground and have room for big Pip below.
      cache(4840),
      ledge(4760, 318, 80),
      ledge(4940, 318, 80),
      ledge(4760, 190, 260),
      { x: 4740, y: 190, w: 20, h: 154, kind: "brick" },
      { x: 5020, y: 190, w: 20, h: 55, kind: "brick" },
      ledge(5020, 340, 180),
      ledge(5260, 255, 170),
      // The high canopy route hides the second firefly and a coin balcony.
      wakingPlant(5740, 340, 190),
      wakingPlant(5990, 255, 180, "curled"),
      wakingPlant(6240, 180, 200),
      mushroom(7020, 350),
      ledge(7220, 205, 220),
      ledge(7520, 290, 140),
      // This optional low doorway can be opened by luring the charging beetle.
      {
        x: 7540,
        y: 340,
        w: 26,
        h: 90,
        kind: "brick",
        enemyBreakable: true,
        rewardCoins: 8,
      },
      mushroom(4250, 410, 70),
      ledge(7990, 340, 180),
      cache(8310),
      ledge(8520, 295, 180),
      ledge(9140, 340, 170),
      ledge(9360, 255, 170),
      ledge(9590, 185, 190),
      // Final bounce is optional; the low route offers a last coin recovery.
      mushroom(10280, 350),
      ledge(10470, 210, 240),
      ledge(10800, 310, 180),
    ],
    coins: [
      ...beginnings[0]!.coins,
      ...row(3500, 392, 5),
      ...row(3900, 173, 5),
      ...row(4200, 253, 4),
      ...arc(4430, 345),
      ...row(4640, 392, 5),
      ...row(4780, 282, 6, 40),
      ...row(5040, 308, 4),
      ...row(5280, 223, 4),
      ...arc(5470, 345),
      ...row(5760, 308, 5),
      ...row(6010, 223, 4),
      ...row(6270, 148, 4),
      ...arc(6610, 345),
      ...row(6850, 392, 4),
      ...row(7250, 173, 5),
      ...row(7590, 392, 3, 25),
      ...arc(7670, 345),
      ...row(8010, 308, 4),
      ...row(8540, 263, 4),
      ...arc(8830, 345),
      ...row(9160, 308, 4),
      ...row(9380, 223, 4),
      ...row(9620, 153, 4),
      ...arc(9890, 345),
      ...row(10120, 392, 4),
      ...row(10500, 178, 5),
      ...row(10820, 278, 4),
      ...row(10930, 392, 4),
    ],
    stars: [
      { x: 630, y: 220 },
      { x: 2890, y: 310 },
      { x: 8020, y: 300 },
      { x: 10200, y: 392 },
    ],
    fireflies: [
      { x: 1445, y: 220 },
      { x: 6330, y: 145 },
      { x: 9680, y: 150 },
    ],
    diamonds: [
      ...beginnings[0]!.diamonds,
      { x: 3530, y: 400 },
      { x: 4750, y: 400 },
      { x: 6950, y: 400 },
      { x: 9170, y: 400 },
      { x: 10150, y: 400 },
    ],
    enemies: [
      ...beginnings[0]!.enemies,
      bug(4120, 4040, 4320, "hopper"),
      bug(5310, 5180, 5410),
      bug(6090, 5940, 6400, "hopper"),
      bug(7410, 7310, 7560, "charger"),
      bug(8250, 8160, 8390),
      bug(8580, 8470, 8720, "charger"),
      bug(9690, 9550, 9800, "hopper"),
      bug(10570, 10490, 10740, "charger"),
    ],
    checkpoints: [
      { x: 1810, y: 430 },
      { x: 4680, y: 430 },
      { x: 6880, y: 430 },
      { x: 9100, y: 430 },
    ],
    goal: { x: 11030, y: 430 },
  },
  {
    ...beginnings[1]!,
    width: 12400,
    subtitle: "Ride drifting leaves past lantern pools to wake the hollow.",
    kind: "world",
    landmarks: [
      { x: 840, y: 340, w: 410, h: 90, kind: "log", name: "The Hollow Log" },
      { x: 3860, y: 345, w: 630, h: 85, kind: "stream", name: "Lantern Pool" },
      {
        x: 5280,
        y: 205,
        w: 200,
        h: 225,
        kind: "flowerpot",
        name: "Moonflower Pot",
      },
      { x: 6300, y: 180, w: 460, h: 250, kind: "web", name: "Silken Canopy" },
      {
        x: 10160,
        y: 175,
        w: 220,
        h: 255,
        kind: "log",
        name: "Glowbug Lookout",
      },
    ],
    clues: [
      {
        x: 1730,
        y: 405,
        kind: "footprints",
        text: "Tiny glowing tracks climb the fern stairs.",
      },
      {
        x: 5560,
        y: 318,
        kind: "glow",
        text: "A warm glimmer beneath the bark.",
      },
      {
        x: 6430,
        y: 300,
        kind: "grass",
        text: "Something glows above the silk.",
      },
      {
        x: 10020,
        y: 405,
        kind: "footprints",
        text: "A firefly waits in the old lookout.",
      },
    ],
    tutorials: [
      {
        x: 95,
        text: "Three hidden fireflies are waiting in the hollow. Their rescue is saved immediately.",
      },
      {
        x: 3760,
        text: "Wake the curled leaf, then ride the drifting canopy. Safe earth lies below.",
      },
      {
        x: 6020,
        text: "The upper flowers lead toward a hidden glow. The lower path keeps moving.",
      },
      {
        x: 10800,
        text: "Follow the lanterns to a safe clearing before the web guardian.",
      },
    ],
    sections: [
      { x: 0, name: "Lantern Path" },
      { x: 2260, name: "Fern Stairway" },
      { x: 3740, name: "Drifting Leaves" },
      { x: 5960, name: "Moonlit Canopy" },
      { x: 8340, name: "Glowbug Grotto" },
      { x: 10720, name: "Heart of the Hollow" },
    ],
    platforms: [
      ...beginnings[1]!.platforms,
      ground(3740, 800),
      ground(4680, 1120),
      ground(5960, 960),
      ground(7080, 1100),
      ground(8340, 1050),
      ground(9550, 1010),
      ground(10720, 1680),
      // First leaf rides over solid ground; falling off is a safe lesson.
      wakingPlant(3860, 345, 160, "curled"),
      movingLeaf(4100, 290, 180, "x", 65, 4),
      ledge(4320, 225, 170),
      ledge(4800, 340, 170),
      movingLeaf(5040, 280, 180, "y", 45, 5),
      ledge(5280, 205, 200),
      cache(5560),
      // Ascending fixed shelves offer a patient route alongside the elevators.
      wakingPlant(6060, 340, 180),
      wakingPlant(6300, 255, 180, "curled"),
      ledge(6540, 180, 220),
      movingLeaf(6400, 320, 150, "x", 70, 4.8),
      cache(7280),
      ledge(7500, 340, 180),
      movingLeaf(7750, 275, 180, "y", 40, 4.2),
      ledge(7970, 215, 170),
      ledge(8460, 340, 180),
      movingLeaf(8700, 280, 190, "x", 60, 4.8),
      ledge(8940, 205, 190),
      cache(9230),
      ledge(9680, 340, 180),
      ledge(9920, 255, 180),
      ledge(10160, 175, 220),
      movingLeaf(10060, 340, 150, "x", 55, 4.5),
      ledge(10900, 340, 180),
      movingLeaf(11150, 270, 190, "y", 45, 4.5),
      ledge(11410, 205, 220),
      ledge(11720, 295, 190),
      ledge(12000, 345, 170),
    ],
    coins: [
      ...beginnings[1]!.coins,
      ...row(3880, 313, 4),
      ...row(4340, 193, 4),
      ...arc(4510, 345),
      ...row(4820, 308, 4),
      ...row(5310, 173, 5),
      ...row(5610, 392, 4),
      ...arc(5770, 345),
      ...row(6080, 308, 4),
      ...row(6320, 223, 4),
      ...row(6570, 148, 5),
      ...arc(6890, 345),
      ...row(7130, 392, 4),
      ...row(7520, 308, 4),
      ...row(7990, 183, 4),
      ...arc(8150, 345),
      ...row(8480, 308, 4),
      ...row(8960, 173, 4),
      ...arc(9360, 345),
      ...row(9700, 308, 4),
      ...row(9940, 223, 4),
      ...row(10190, 143, 5),
      ...arc(10530, 345),
      ...row(10780, 392, 4),
      ...row(10920, 308, 4),
      ...row(11440, 173, 5),
      ...row(11740, 263, 4),
      ...row(12020, 313, 4),
      ...row(12160, 392, 4),
    ],
    stars: [
      { x: 1160, y: 210 },
      { x: 3340, y: 235 },
      { x: 6020, y: 392 },
      { x: 8470, y: 300 },
      { x: 10920, y: 300 },
    ],
    fireflies: [
      { x: 1905, y: 215 },
      { x: 6640, y: 145 },
      { x: 10270, y: 140 },
    ],
    diamonds: [
      ...beginnings[1]!.diamonds,
      { x: 3820, y: 400 },
      { x: 4800, y: 400 },
      { x: 7220, y: 400 },
      { x: 9700, y: 400 },
      { x: 10800, y: 400 },
    ],
    enemies: [
      ...beginnings[1]!.enemies,
      bug(4250, 4160, 4400, "hopper"),
      bug(5540, 5430, 5680, "charger"),
      bug(6500, 6380, 6740, "hopper"),
      bug(7690, 7570, 7850, "charger"),
      bug(8040, 7950, 8090),
      bug(8960, 8840, 9100, "hopper"),
      bug(10200, 10060, 10420, "charger"),
      bug(11490, 11320, 11660, "hopper"),
      bug(12010, 11860, 12110, "charger"),
    ],
    checkpoints: [
      { x: 1570, y: 430 },
      { x: 4750, y: 430 },
      { x: 7160, y: 430 },
      { x: 9630, y: 430 },
    ],
    goal: { x: 12230, y: 430 },
  },
  {
    ...beginnings[2]!,
    width: 13600,
    subtitle: "Cross the cloud bridges and bring the last light home.",
    kind: "world",
    landmarks: [
      {
        x: 230,
        y: 340,
        w: 330,
        h: 90,
        kind: "flowerpot",
        name: "The Rooftop Garden",
      },
      {
        x: 4190,
        y: 340,
        w: 640,
        h: 90,
        kind: "web",
        name: "The Sky Spinner's Bridge",
      },
      {
        x: 7100,
        y: 175,
        w: 220,
        h: 255,
        kind: "watering-can",
        name: "Silver Summit",
      },
      {
        x: 9630,
        y: 195,
        w: 200,
        h: 235,
        kind: "flowerpot",
        name: "Windflower Tower",
      },
      { x: 10880, y: 175, w: 220, h: 255, kind: "web", name: "The Last Light" },
    ],
    clues: [
      {
        x: 2380,
        y: 405,
        kind: "footprints",
        text: "A little light sheltered above the wind.",
      },
      {
        x: 6890,
        y: 300,
        kind: "grass",
        text: "Follow the petals toward Silver Summit.",
      },
      {
        x: 9890,
        y: 318,
        kind: "glow",
        text: "The old cloud cache still gleams.",
      },
      {
        x: 10720,
        y: 405,
        kind: "footprints",
        text: "The last firefly waits above the clouds.",
      },
    ],
    tutorials: [
      {
        x: 95,
        text: "Watch the coin arcs: they trace safe jumps across the sky.",
      },
      {
        x: 4120,
        text: "Clouds tremble before they disappear. Keep moving; they return after a moment.",
      },
      {
        x: 6510,
        text: "Even here, your light can wake a flower. Follow the climbing petals.",
      },
      {
        x: 11580,
        text: "A final clearing before the storm. Your next checkpoint waits beyond the bridge.",
      },
    ],
    sections: [
      { x: 0, name: "Skyward Steps" },
      { x: 2180, name: "Windflower Ridge" },
      { x: 4070, name: "Cloudbridge Crossing" },
      { x: 6500, name: "Silver Summit" },
      { x: 9020, name: "Thunderbug Pass" },
      { x: 11540, name: "Sunrise Sanctuary" },
    ],
    platforms: [
      ...beginnings[2]!.platforms,
      ground(4070, 900),
      ground(5130, 1200),
      ground(6500, 1050),
      ground(7720, 1130),
      ground(9020, 1090),
      ground(10280, 1090),
      ground(11540, 830),
      // The final bridge is a real crossing: the high route is visible before
      // the ground opens, with a generous landing bank beyond the clouds.
      ground(12700, 900),
      // Safe first cloud teaches its warning/recovery before any gap crossing.
      ledge(4190, 340, 160),
      cloud(4410, 275, 170),
      ledge(4650, 210, 180),
      cloud(4950, 390, 170),
      ledge(5250, 340, 170),
      cloud(5480, 270, 180),
      ledge(5730, 200, 210),
      cache(6060),
      cloud(6310, 390, 190),
      wakingPlant(6620, 340, 180),
      wakingPlant(6860, 255, 180, "curled"),
      ledge(7100, 175, 220),
      cloud(6790, 365, 130),
      cloud(7530, 390, 190),
      cache(7910),
      ledge(8130, 340, 170),
      cloud(8360, 270, 180),
      ledge(8610, 205, 170),
      cloud(8830, 390, 190),
      ledge(9140, 340, 170),
      cloud(9380, 270, 180),
      ledge(9630, 195, 200),
      cache(9890),
      cloud(10090, 390, 190),
      ledge(10400, 340, 180),
      ledge(10640, 255, 180),
      ledge(10880, 175, 220),
      cloud(11350, 390, 190),
      ledge(11660, 340, 180),
      cloud(11900, 265, 180),
      ledge(12150, 190, 220),
      cloud(12345, 255, 140),
      cloud(12450, 255, 170),
      cloud(12580, 255, 140),
      ledge(12700, 320, 190),
      ledge(13000, 345, 180),
    ],
    coins: [
      ...beginnings[2]!.coins,
      ...row(4210, 308, 4),
      ...row(4430, 243, 4),
      ...row(4670, 178, 4),
      ...arc(4940, 340),
      ...row(5270, 308, 4),
      ...row(5500, 238, 4),
      ...row(5760, 168, 5),
      ...row(6110, 392, 4),
      ...arc(6300, 340),
      ...row(6640, 308, 4),
      ...row(6880, 223, 4),
      ...row(7130, 143, 5),
      ...arc(7520, 340),
      ...row(7780, 392, 4),
      ...row(8150, 308, 4),
      ...row(8380, 238, 4),
      ...row(8630, 173, 4),
      ...arc(8820, 340),
      ...row(9160, 308, 4),
      ...row(9400, 238, 4),
      ...row(9660, 163, 4),
      ...arc(10080, 340),
      ...row(10420, 308, 4),
      ...row(10660, 223, 4),
      ...row(10910, 143, 5),
      ...arc(11340, 340),
      ...row(11680, 308, 4),
      ...row(11920, 233, 4),
      ...row(12180, 158, 5),
      ...row(12365, 223, 10, 35),
      ...row(12720, 288, 4),
      ...row(13020, 313, 4),
      ...row(13220, 392, 5),
    ],
    stars: [
      { x: 1110, y: 205 },
      { x: 3310, y: 210 },
      { x: 6550, y: 392 },
      { x: 9160, y: 300 },
      { x: 11700, y: 300 },
    ],
    fireflies: [
      { x: 2580, y: 210 },
      { x: 7210, y: 140 },
      { x: 10990, y: 140 },
    ],
    diamonds: [
      ...beginnings[2]!.diamonds,
      { x: 4150, y: 400 },
      { x: 5280, y: 400 },
      { x: 7860, y: 400 },
      { x: 10420, y: 400 },
      { x: 11620, y: 400 },
    ],
    enemies: [
      ...beginnings[2]!.enemies,
      bug(4620, 4500, 4800, "hopper"),
      bug(5970, 5830, 6180, "charger"),
      bug(7070, 6960, 7360, "hopper"),
      bug(8430, 8290, 8670, "charger"),
      bug(9720, 9570, 9880, "hopper"),
      bug(11010, 10860, 11210, "charger"),
      bug(12210, 12050, 12330, "hopper"),
      bug(12860, 12710, 13020, "charger"),
    ],
    checkpoints: [
      { x: 2240, y: 430 },
      { x: 5220, y: 430 },
      { x: 7800, y: 430 },
      { x: 10360, y: 430 },
    ],
    goal: { x: 13430, y: 430 },
  },
];

const guardians: {
  kind: BossKind;
  name: string;
  section: string;
  hint: string;
}[] = [
  {
    kind: "stag",
    name: "Bramble, the Stag Beetle",
    section: "Bramble's Gate",
    hint: "Bramble flashes before charging. Dodge the rush, then jump on its head while it rests.",
  },
  {
    kind: "spider",
    name: "Silka, the Web Weaver",
    section: "The Silken Gate",
    hint: "Jump over Silka's webs. When the weaving stops, land on its head.",
  },
  {
    kind: "moth",
    name: "Nimbus, the Storm Moth",
    section: "Eye of the Storm",
    hint: "Nimbus warns before sweeping past. Avoid the gusts, then stomp when it lands.",
  },
];

/** Each trail ends with a quiet recovery clearing and a roomy, level arena.
 * Old firefly IDs and their routes remain stable for existing saved rescues.
 */
export const levels: Level[] = trails.map((trail, index) => {
  const guardian = guardians[index]!;
  const checkpointX = trail.goal.x - 70;
  return {
    ...trail,
    width: trail.width + 1100,
    sections: [
      ...trail.sections,
      { x: trail.width + 100, name: guardian.section },
    ],
    platforms: [...trail.platforms, ground(trail.width, 1100)],
    checkpoints: [...trail.checkpoints, { x: checkpointX, y: 430 }],
    diamonds: [...trail.diamonds, { x: checkpointX + 55, y: 400 }],
    coins: [...trail.coins, ...row(trail.width + 900, 392, 4)],
    boss: {
      kind: guardian.kind,
      name: guardian.name,
      x: trail.width + 540,
      y: 430,
      minX: trail.width + 100,
      maxX: trail.width + 730,
    },
    tutorials: [
      ...(trail.tutorials ?? []),
      { x: checkpointX, text: guardian.hint },
    ],
    goal: { x: trail.width + 940, y: 430 },
  };
});

/** A real, safe platforming space: all residents and purchased furnishings are
 * drawn here, while the clear floor makes exploring comfortable on a phone.
 * Coins are earned on the trails rather than by repeatedly entering the grove.
 */
export const groveLevel: Level = {
  id: 0,
  name: "The Home Grove",
  subtitle: "Every little light has a place to call home.",
  kind: "grove",
  theme: "meadow",
  width: 1900,
  spawn: { x: 110, y: 392 },
  platforms: [
    ground(0, 1900),
    wakingPlant(310, 340, 150),
    wakingPlant(530, 265, 160, "curled"),
    ledge(790, 340, 160),
    mushroom(1060, 350, 100),
    wakingPlant(1240, 205, 190, "flower", 270),
    ledge(1530, 310, 180),
  ],
  landmarks: [
    {
      x: 310,
      y: 340,
      w: 150,
      h: 90,
      kind: "flowerpot",
      name: "Pip's Windowsill",
    },
    { x: 790, y: 340, w: 160, h: 90, kind: "log", name: "The Welcome Log" },
    {
      x: 1530,
      y: 310,
      w: 180,
      h: 120,
      kind: "watering-can",
      name: "The Garden Keeper",
    },
  ],
  clues: [
    {
      x: 510,
      y: 405,
      kind: "footprints",
      text: "Every rescued firefly makes this grove brighter.",
    },
  ],
  tutorials: [
    {
      x: 110,
      text: "Welcome home. Explore the grove, or open the Grove shop to choose outfits and decorations.",
    },
    {
      x: 1010,
      text: "Practice your mushroom bounce here. The soft garden floor always catches you.",
    },
  ],
  coins: [],
  stars: [],
  diamonds: [],
  fireflies: [],
  enemies: [],
  checkpoints: [],
  sections: [
    { x: 0, name: "Firefly Homes" },
    { x: 970, name: "The Play Garden" },
  ],
  goal: { x: 1840, y: 430 },
};

/** Compact mastery courses unlocked by rescuing a world's three fireflies.
 * Gold times allow comfortable mistakes; every completion earns bronze.
 */
export const challengeLevels: Level[] = [
  {
    id: 11,
    name: "Petal-Hop Sprint",
    subtitle: "Wake the flowers, ride the mushroom, and follow the golden arc.",
    kind: "challenge",
    challengeTime: 18,
    theme: "meadow",
    width: 2300,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 860),
      ground(1010, 1290),
      wakingPlant(250, 340, 150),
      wakingPlant(470, 265, 160, "curled"),
      mushroom(700, 350, 90),
      wakingPlant(880, 205, 180, "flower", 270),
      ledge(1130, 295, 160),
      mushroom(1420, 350, 90),
      wakingPlant(1600, 205, 200, "flower", 270),
      ledge(1900, 310, 160),
    ],
    coins: [
      ...row(270, 308, 4),
      ...row(490, 233, 4),
      ...arc(760, 235, 5),
      ...row(900, 173, 4),
      ...row(1150, 263, 4),
      ...arc(1480, 235, 5),
      ...row(1630, 173, 5),
      ...row(1920, 278, 4),
      ...row(2110, 392, 3),
    ],
    stars: [],
    diamonds: [
      { x: 165, y: 400 },
      { x: 1245, y: 400 },
    ],
    enemies: [bug(1310, 1295, 1390, "hopper")],
    checkpoints: [{ x: 1220, y: 430 }],
    sections: [
      { x: 0, name: "Wake & Climb" },
      { x: 680, name: "The Petal Leap" },
      { x: 1220, name: "Bounce & Glide" },
    ],
    fireflies: [],
    landmarks: [
      {
        x: 470,
        y: 265,
        w: 160,
        h: 165,
        kind: "flowerpot",
        name: "The Sprint Pot",
      },
    ],
    tutorials: [
      {
        x: 95,
        text: "Gold target: 18 seconds. Follow the petals for coins, or find your own fast route.",
      },
    ],
    goal: { x: 2180, y: 430 },
  },
  {
    id: 12,
    name: "Lantern-Leaf Relay",
    subtitle: "Cross the stream on drifting leaves and light the far bank.",
    kind: "challenge",
    challengeTime: 20,
    theme: "dusk",
    width: 2500,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 760),
      ground(1040, 1460),
      wakingPlant(230, 340, 150, "curled"),
      movingLeaf(450, 280, 180, "y", 35, 4),
      ledge(690, 205, 170),
      movingLeaf(860, 340, 170, "x", 45, 3.6),
      ledge(1160, 340, 170),
      movingLeaf(1400, 275, 180, "y", 40, 4.2),
      ledge(1650, 205, 180),
      movingLeaf(1880, 290, 190, "x", 55, 4),
      ledge(2180, 340, 170),
    ],
    coins: [
      ...row(250, 308, 4),
      ...row(710, 173, 4),
      ...arc(790, 285, 6),
      ...row(1180, 308, 4),
      ...row(1670, 173, 4),
      ...row(2200, 308, 4),
      ...row(2360, 392, 3),
    ],
    stars: [{ x: 1690, y: 155 }],
    diamonds: [
      { x: 165, y: 400 },
      { x: 1125, y: 400 },
    ],
    enemies: [bug(2030, 1980, 2120, "charger")],
    checkpoints: [{ x: 1080, y: 430 }],
    sections: [
      { x: 0, name: "The Leaf Lift" },
      { x: 740, name: "Lantern Stream" },
      { x: 1080, name: "Canopy Relay" },
    ],
    fireflies: [],
    landmarks: [
      {
        x: 760,
        y: 430,
        w: 280,
        h: 110,
        kind: "stream",
        name: "Lantern Stream",
      },
    ],
    tutorials: [
      {
        x: 95,
        text: "Gold target: 20 seconds. The drifting leaf carries you over the stream.",
      },
    ],
    goal: { x: 2400, y: 430 },
  },
  {
    id: 13,
    name: "Cloudbreak Dash",
    subtitle: "Keep moving as the cloud bridge melts behind your footsteps.",
    kind: "challenge",
    challengeTime: 22,
    theme: "alpine",
    width: 2600,
    spawn: { x: 95, y: 392 },
    platforms: [
      ground(0, 720),
      ground(1360, 1240),
      ledge(240, 340, 160),
      cloud(470, 275, 180),
      cloud(700, 340, 190),
      cloud(860, 340, 190),
      cloud(1020, 340, 190),
      cloud(1180, 340, 190),
      wakingPlant(1470, 340, 170),
      cloud(1710, 265, 180),
      ledge(1950, 195, 200),
      cloud(2220, 310, 180),
    ],
    coins: [
      ...row(260, 308, 4),
      ...row(490, 243, 4),
      ...row(735, 308, 17, 35),
      ...row(1490, 308, 4),
      ...row(1730, 233, 4),
      ...row(1980, 163, 5),
      ...row(2240, 278, 4),
      ...row(2440, 392, 3),
    ],
    stars: [{ x: 2020, y: 145 }],
    diamonds: [
      { x: 165, y: 400 },
      { x: 1425, y: 400 },
    ],
    enemies: [bug(1770, 1680, 1870, "hopper")],
    checkpoints: [{ x: 1390, y: 430 }],
    sections: [
      { x: 0, name: "A Moment to Breathe" },
      { x: 690, name: "The Melting Bridge" },
      { x: 1390, name: "The Last Leap" },
    ],
    fireflies: [],
    landmarks: [
      {
        x: 1950,
        y: 195,
        w: 200,
        h: 235,
        kind: "flowerpot",
        name: "The Sky Garden",
      },
    ],
    tutorials: [
      {
        x: 95,
        text: "Gold target: 22 seconds. Clouds tremble, then vanish. Cross the bridge without stopping.",
      },
    ],
    goal: { x: 2500, y: 430 },
  },
];
