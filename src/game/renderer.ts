import {
  MOUNT_SIZE,
  CRUMBLE_WARNING,
  ENEMY_SQUASH_DURATION,
  type Game,
  type OutfitId,
} from "./engine";
import type { Rect } from "./levels";
import { CREATURES, FRIENDS, type FriendKind } from "./creatures";
import { ghostAt } from "../ghost";

type Theme =
  | "meadow"
  | "dusk"
  | "alpine"
  | "windmill"
  | "hive"
  | "grotto"
  | "cloud"
  | "marsh"
  | "cavern"
  | "snow"
  | "ice"
  | "volcano"
  | "storm";
type Palette = {
  sky: string;
  horizon: string;
  sun: string;
  far: string;
  middle: string;
  near: string;
  leaf: string;
  leafLight: string;
  leafShade: string;
  trunk: string;
  grass: string;
  grassLight: string;
  soil: string;
  soilShade: string;
  rock: string;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  duration: number;
  size: number;
  color: string;
};
const WIDTH = 960;
const HEIGHT = 540;
// The Thorn King's grove is a distinct encounter, with a warmer, deeper
// palette than the bright Windmill Garden that leads to it.
const thornGrovePalette: Palette = {
  sky: "#405d56",
  horizon: "#d6bd83",
  sun: "#ffdda0",
  far: "#7d9980",
  middle: "#618577",
  near: "#4e7667",
  leaf: "#477e58",
  leafLight: "#97bc72",
  leafShade: "#345e4c",
  trunk: "#80604c",
  grass: "#94b96c",
  grassLight: "#d6df98",
  soil: "#ba9068",
  soilShade: "#84614d",
  rock: "#ddc297",
};
const palettes: Record<Theme, Palette> = {
  storm: {
    sky: "#47526a",
    horizon: "#9aa6bb",
    sun: "#dfe6f2",
    far: "#5d6a82",
    middle: "#4e5a70",
    near: "#414b5e",
    leaf: "#4f7a64",
    leafLight: "#87b39a",
    leafShade: "#3a5c4b",
    trunk: "#4d4a48",
    grass: "#7f9a86",
    grassLight: "#b1c7b6",
    soil: "#5b6170",
    soilShade: "#434856",
    rock: "#8e97a8",
  },
  snow: {
    sky: "#9fc9e8",
    horizon: "#eef6fb",
    sun: "#fffbe6",
    far: "#d6e6f2",
    middle: "#bcd3e6",
    near: "#9fbcd6",
    leaf: "#4f8f7a",
    leafLight: "#a9d6c4",
    leafShade: "#356d5e",
    trunk: "#6f5e52",
    grass: "#f4f8fb",
    grassLight: "#ffffff",
    soil: "#a9b9c9",
    soilShade: "#7f93a8",
    rock: "#d5e0ea",
  },
  ice: {
    sky: "#2b4b7a",
    horizon: "#8fd3e0",
    sun: "#e6fbff",
    far: "#5a86b0",
    middle: "#4a77a3",
    near: "#3d6a95",
    leaf: "#5fa6b8",
    leafLight: "#c6f1f7",
    leafShade: "#3d7a8c",
    trunk: "#5d6f86",
    grass: "#bff0f7",
    grassLight: "#f0feff",
    soil: "#7fb6d6",
    soilShade: "#4f86ab",
    rock: "#d6f4fb",
  },
  volcano: {
    sky: "#4a1f24",
    horizon: "#d9683a",
    sun: "#ffcf7a",
    far: "#6b2d2a",
    middle: "#5a2422",
    near: "#46201f",
    leaf: "#6f7d3a",
    leafLight: "#b9c06a",
    leafShade: "#4b5428",
    trunk: "#3d2a22",
    grass: "#7a5a4a",
    grassLight: "#b58a6a",
    soil: "#5a3a30",
    soilShade: "#3a2420",
    rock: "#8a5a48",
  },
  cavern: {
    sky: "#232646",
    horizon: "#4a4479",
    sun: "#b9a8ff",
    far: "#34365f",
    middle: "#3f416f",
    near: "#4b4e82",
    leaf: "#4f9a8c",
    leafLight: "#9fe6cf",
    leafShade: "#346a66",
    trunk: "#5a4f6e",
    grass: "#5fae9c",
    grassLight: "#b0f1d9",
    soil: "#64587a",
    soilShade: "#443b58",
    rock: "#9a8cbc",
  },
  marsh: {
    sky: "#8cc6c4",
    horizon: "#f6dcae",
    sun: "#ffe7a6",
    far: "#a9cdb8",
    middle: "#83b59c",
    near: "#5f9a80",
    leaf: "#3f8a68",
    leafLight: "#93c97f",
    leafShade: "#2f6e57",
    trunk: "#7a6248",
    grass: "#78b465",
    grassLight: "#cfe596",
    soil: "#9a7c5a",
    soilShade: "#6f5a45",
    rock: "#c2ad86",
  },
  grotto: {
    sky: "#123f58",
    horizon: "#4ca5a9",
    sun: "#b5f4de",
    far: "#215e70",
    middle: "#286f79",
    near: "#387e7c",
    leaf: "#459d85",
    leafLight: "#a4e8bf",
    leafShade: "#286e70",
    trunk: "#548176",
    grass: "#78bba5",
    grassLight: "#b6e8ca",
    soil: "#688d88",
    soilShade: "#3b666a",
    rock: "#a6c5b5",
  },
  cloud: {
    sky: "#70c9e9",
    horizon: "#e8f8f1",
    sun: "#fff6bf",
    far: "#d2eced",
    middle: "#badde3",
    near: "#9dced6",
    leaf: "#5eaa89",
    leafLight: "#b6e3a7",
    leafShade: "#478b80",
    trunk: "#8fa8a2",
    grass: "#a9d8b0",
    grassLight: "#e9f8d2",
    soil: "#d2e5e2",
    soilShade: "#accfd2",
    rock: "#f4fcf6",
  },
  windmill: {
    sky: "#81d9e7",
    horizon: "#f6efb8",
    sun: "#fff1a0",
    far: "#b8dfb2",
    middle: "#8bce98",
    near: "#67b67d",
    leaf: "#328e5e",
    leafLight: "#88cf78",
    leafShade: "#28724e",
    trunk: "#a36e47",
    grass: "#7ac45b",
    grassLight: "#daf08a",
    soil: "#d7a36b",
    soilShade: "#a96e47",
    rock: "#f0c88a",
  },
  hive: {
    sky: "#e9b65f",
    horizon: "#ffe5a1",
    sun: "#fff3b1",
    far: "#dfad67",
    middle: "#c8955f",
    near: "#b77f50",
    leaf: "#9a7845",
    leafLight: "#d5ac59",
    leafShade: "#805b3c",
    trunk: "#9b6441",
    grass: "#d5ab55",
    grassLight: "#ffdf83",
    soil: "#d49a5a",
    soilShade: "#a36a43",
    rock: "#f3cd80",
  },
  meadow: {
    sky: "#73d9e9",
    horizon: "#e7f8c9",
    sun: "#fff3a0",
    far: "#9bdec4",
    middle: "#68c8a5",
    near: "#40a985",
    leaf: "#269d67",
    leafLight: "#62cd7c",
    leafShade: "#177253",
    trunk: "#966542",
    grass: "#63bf53",
    grassLight: "#c2ee78",
    soil: "#d59a62",
    soilShade: "#aa714e",
    rock: "#e7bb82",
  },
  dusk: {
    sky: "#6265af",
    horizon: "#e4b7d6",
    sun: "#fff2c4",
    far: "#a299ce",
    middle: "#777eb6",
    near: "#556997",
    leaf: "#507f9d",
    leafLight: "#79b4b8",
    leafShade: "#355a7c",
    trunk: "#6a526e",
    grass: "#70b6a3",
    grassLight: "#c5e6bc",
    soil: "#b087a2",
    soilShade: "#7d647f",
    rock: "#c5a8bc",
  },
  alpine: {
    sky: "#72ccec",
    horizon: "#e7f8e8",
    sun: "#fff5b8",
    far: "#b3dfeb",
    middle: "#8cc8da",
    near: "#60afbc",
    leaf: "#37988a",
    leafLight: "#77cbb1",
    leafShade: "#24776f",
    trunk: "#6e817a",
    grass: "#81c5a0",
    grassLight: "#e7f8c4",
    soil: "#9caeaa",
    soilShade: "#718d93",
    rock: "#c8d9ca",
  },
};
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Resolution-independent cartoon artwork, drawn locally for offline play. */
/** Grown (big) Pip's proportions: overall scale relative to a plain
 * scale-up, how much wider and taller the body and legs are drawn, and how
 * far the head rides up to sit on the taller body. */
const GROWN = { all: 0.8, wide: 1.15, tall: 1.55, neck: -13 };
/** New costumes: body, highlight and scarf colours. */
const COSTUMES: Record<string, [string, string, string]> = {
  "cosmetic.frost_coat": ["#8ccbe0", "#d4f1fa", "#ffffff"],
  "cosmetic.ember_coat": ["#d9603a", "#ffb071", "#ffd36b"],
  "cosmetic.coral_coat": ["#ef8a8a", "#ffc2b0", "#6fd0c8"],
  "cosmetic.dusk_coat": ["#6b67a8", "#aaa0dd", "#ffd98a"],
};
/** Scarves: colour and pattern accent. */
const SCARVES: Record<string, [string, string]> = {
  "scarf.cozy_red": ["#d9473f", "#d9473f"],
  "scarf.candy_stripe": ["#ff8fb1", "#ffffff"],
  "scarf.starry": ["#2f3d7a", "#ffe38a"],
  "scarf.snowflake": ["#f4f8fb", "#7fb6d6"],
};
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  viewportWidth = WIDTH;
  viewportHeight = HEIGHT;
  cameraX = 0;
  cameraY = 0;
  private shake = 0;
  /** The scarf and hat on the hero being drawn. */
  private wornScarf: string | null = null;
  private wornHat: string | null = null;
  private popups: {
    x: number;
    y: number;
    text: string;
    color: string;
    size: number;
    life: number;
  }[] = [];
  private bossBanner: { name: string; life: number } | null = null;
  private previousTime = 0;
  private previousGame: Game | null = null;
  private previousElapsed = -1;
  private previousGrounded = false;
  private previousCoins: boolean[] = [];
  private previousStars: boolean[] = [];
  private previousDiamonds: boolean[] = [];
  private previousFireflies: boolean[] = [];
  private previousBroken: boolean[] = [];
  private previousRewardUsed: boolean[] = [];
  private previousAwakened: boolean[] = [];
  private previousBossHealth = 3;
  private escapeCelebration = 0;
  private previousCollapsed: boolean[] = [];
  private previousEnemies: boolean[] = [];
  private previousForm: "small" | "big" = "small";
  private previousDeaths = 0;
  private formChange = 0;
  private growing = false;
  private particles: Particle[] = [];
  private landing = 0;
  private needsResize = true;
  private framingChanged = true;
  private baseCameraY = 0;
  private pixelRatio = 0;
  private cameraLead = WIDTH * 0.15;
  private bouncePulse = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context)
      throw new Error("Your device could not create the game canvas.");
    this.ctx = context;
    new ResizeObserver(() => {
      this.needsResize = true;
    }).observe(canvas);
    window.addEventListener("resize", () => {
      this.needsResize = true;
    });
    this.resize();
  }

  /** Keep one uniform world scale; wider screens reveal more of the trail. */
  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = bounds.width || WIDTH;
    const cssHeight = bounds.height || HEIGHT;
    const style = getComputedStyle(this.canvas);
    const inset = (name: string) =>
      Math.max(0, parseFloat(style.getPropertyValue(name)) || 0);
    const safeTop = inset("--scene-safe-top");
    const safeBottom =
      inset("--scene-safe-bottom") + inset("--scene-thumb-strip");
    const worldScale = Math.max(1, cssHeight - safeTop - safeBottom) / HEIGHT;
    this.viewportWidth = cssWidth / worldScale;
    this.viewportHeight = cssHeight / worldScale;
    this.baseCameraY = -safeTop / worldScale;
    const backingScale = Math.min(dpr, 1920 / cssWidth, 1080 / cssHeight);
    const width = Math.max(1, Math.round(cssWidth * backingScale));
    const height = Math.max(1, Math.round(cssHeight * backingScale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(
      width / this.viewportWidth,
      0,
      0,
      height / this.viewportHeight,
      0,
      0,
    );
    this.ctx.imageSmoothingEnabled = true;
    this.pixelRatio = dpr;
    this.needsResize = false;
    this.framingChanged = true;
    this.canvas.dataset.viewportWidth = String(this.viewportWidth);
    this.canvas.dataset.viewportHeight = String(this.viewportHeight);
  }

  render(game: Game, time: number, titleMode = false, restoration = 0) {
    this.wornScarf = game.scarf;
    this.wornHat = game.hat;
    if (
      this.needsResize ||
      this.pixelRatio !== Math.min(window.devicePixelRatio || 1, 2)
    )
      this.resize();
    const reframed = this.framingChanged;
    this.framingChanged = false;
    const c = this.ctx;
    c.setTransform(
      this.canvas.width / this.viewportWidth,
      0,
      0,
      this.canvas.height / this.viewportHeight,
      0,
      0,
    );
    const thornGrove = game.level.contentId === "boss.thorn-king";
    const p = thornGrove ? thornGrovePalette : palettes[game.level.theme];
    const dt = Math.max(0, Math.min(time - this.previousTime, 0.05));
    this.previousTime = time;
    const newGame =
      this.previousGame !== game || game.elapsed < this.previousElapsed;
    const respawned = !newGame && game.deaths !== this.previousDeaths;
    if (newGame) {
      this.previousGame = game;
      this.previousElapsed = -1;
      this.previousGrounded = false;
      this.previousCoins = game.coins.map((coin) => coin.collected);
      this.previousStars = game.stars.map((star) => star.collected);
      this.previousDiamonds = game.diamonds.map((diamond) => diamond.collected);
      this.previousFireflies = game.fireflies.map(
        (firefly) => firefly.collected,
      );
      this.previousBroken = game.platforms.map((platform) => platform.broken);
      this.previousRewardUsed = game.platforms.map(
        (platform) => platform.rewardUsed,
      );
      this.previousAwakened = game.platforms.map(
        (platform) => platform.awakened,
      );
      this.previousBossHealth = game.boss?.health ?? 3;
      this.escapeCelebration = 0;
      this.previousCollapsed = game.platforms.map(
        (platform) => platform.crumbleRemaining === 0,
      );
      this.previousEnemies = game.enemies.map((enemy) => enemy.alive);
      this.previousForm = game.player.form;
      this.previousDeaths = game.deaths;
      this.particles = [];
      this.landing = 0;
      this.formChange = 0;
      this.bouncePulse = 0;
      this.cameraLead = this.viewportWidth * 0.15 * game.player.facing;
    } else if (respawned) {
      this.particles = [];
      this.landing = 0;
      this.formChange = 0;
      this.previousForm = game.player.form;
      this.previousGrounded = false;
      this.cameraLead = this.viewportWidth * 0.15 * game.player.facing;
    }
    // Ease the lookahead separately from the camera. Turning reveals the path
    // behind Pip without abruptly dragging the whole world across the screen.
    const wantedLead = this.viewportWidth * 0.15 * game.player.facing;
    if (reframed) this.cameraLead = wantedLead;
    this.cameraLead +=
      (wantedLead - this.cameraLead) * (1 - Math.exp(-3.5 * dt));
    const millArena =
      game.boss?.kind === "millkeeper" &&
      game.boss.state !== "dormant" &&
      game.boss.state !== "defeated";
    // The Mill Keeper is no longer at the end of the world: its separate
    // finale arena lies beyond it. Anchor to this encounter's right edge.
    const millFrameEnd = millArena ? game.boss!.maxX + 120 : 0;
    const target = titleMode
      ? 0
      : millArena && this.viewportWidth >= WIDTH
        ? Math.max(0, millFrameEnd - this.viewportWidth)
        : Math.max(
            millArena ? millFrameEnd - WIDTH : 0,
            Math.min(
              game.level.width - this.viewportWidth,
              game.player.x - this.viewportWidth * 0.5 + this.cameraLead,
            ),
          );
    if (
      newGame ||
      respawned ||
      titleMode ||
      reframed ||
      Math.abs(target - this.cameraX) > this.viewportWidth * 0.8
    )
      this.cameraX = target;
    else this.cameraX += (target - this.cameraX) * (1 - Math.exp(-9 * dt));
    // Follow Pip through the open skies of the trails, grove, and new areas,
    // while preserving the authored framing of enclosed challenge courses.
    const followFlight =
      game.hasWindFeather &&
      (game.level.kind === "grove" ||
        game.boss?.kind === "heartwood" ||
        game.level.theme === "cloud" ||
        game.level.theme === "grotto" ||
        game.level.contentId === "world.sunlit-meadow" ||
        game.level.contentId === "world.firefly-hollow" ||
        game.level.contentId === "world.cloudtop-crossing");
    const targetY =
      !titleMode && followFlight
        ? this.baseCameraY + Math.min(0, game.player.y - HEIGHT * 0.36)
        : this.baseCameraY;
    if (newGame || respawned || titleMode || reframed || !followFlight)
      this.cameraY = targetY;
    else {
      this.cameraY += (targetY - this.cameraY) * (1 - Math.exp(-8 * dt));
      // A fast mushroom launch must not outrun the eased camera into the HUD.
      this.cameraY = Math.min(
        this.cameraY,
        this.baseCameraY + game.player.y - 90,
        this.baseCameraY,
      );
      if (
        Math.abs(this.cameraY - this.baseCameraY) < 0.1 &&
        targetY === this.baseCameraY
      )
        this.cameraY = this.baseCameraY;
    }
    this.canvas.dataset.cameraX = String(this.cameraX);
    this.canvas.dataset.cameraY = String(this.cameraY);
    const camera = this.cameraX;
    const preferredTitleX = this.viewportWidth * 0.76;
    let titleX = preferredTitleX;
    let titleGround = 430;
    if (titleMode) {
      let nearest = Infinity;
      for (const platform of game.level.platforms) {
        if (
          platform.kind !== "ground" ||
          platform.id?.startsWith("trellis.") ||
          platform.id?.startsWith("gate.")
        )
          continue;
        // Choose safe ground within the visible screen, even when the preferred
        // title position falls over a gap or the next bank is offscreen.
        const left = Math.max(platform.x + 60, 60);
        const right = Math.min(
          platform.x + platform.w - 60,
          this.viewportWidth - 60,
        );
        if (left > right) continue;
        const candidate = Math.max(left, Math.min(right, preferredTitleX));
        const distance = Math.abs(candidate - preferredTitleX);
        if (distance < nearest) {
          nearest = distance;
          titleX = candidate;
          titleGround = platform.y;
        }
      }
    }
    this.landing = Math.max(0, this.landing - dt);
    this.formChange = Math.max(0, this.formChange - dt);
    this.bouncePulse = Math.max(0, this.bouncePulse - dt);
    this.escapeCelebration = Math.max(0, this.escapeCelebration - dt);
    if (!titleMode && game.elapsed !== this.previousElapsed)
      this.feedback(game);
    this.previousDeaths = game.deaths;
    this.previousElapsed = game.elapsed;
    this.background(p, game.level.theme, time, camera);
    if (game.level.castle) this.castleWalls(game.level.castle, time, camera);
    this.restoredLight(Math.max(0, Math.min(1, restoration)), time, camera);
    c.save();
    c.translate(-camera, -this.cameraY);
    if (this.shake > 0 && !titleMode) {
      // A short screen shake on big impacts.
      const m = this.shake * 18;
      c.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    this.shake = Math.max(0, this.shake - dt);
    if (game.level.theme === "marsh") this.marshWater(camera, time);
    if (game.level.lava)
      this.lavaPool(camera, time, (game.level.checkpoints[0]?.y ?? 430) + 30);

    // The trees sit on actual ground sections; no scenery suggests a floor over a pit.
    for (const platform of game.platforms) {
      if (
        game.level.theme === "hive" ||
        game.level.theme === "grotto" ||
        game.level.theme === "cloud" ||
        game.level.theme === "cavern" ||
        game.level.theme === "ice" ||
        game.level.theme === "volcano" ||
        !!game.level.castle ||
        thornGrove
      )
        continue;
      if (
        platform.kind !== "ground" ||
        platform.id?.startsWith("trellis.") ||
        platform.id?.startsWith("gate.")
      )
        continue;
      for (let i = 0; i < Math.floor(platform.w / 330); i++) {
        const x = platform.x + 205 + i * 330;
        if (x > camera - 160 && x < camera + this.viewportWidth + 160) {
          if (!titleMode || x > 500) this.tree(x, platform.y, p, x, time);
        }
      }
    }
    if (!titleMode && game.level.theme === "grotto")
      this.grottoWater(game, time);
    if (!titleMode) {
      this.gardenLandmarks(game, time);
      this.homeGrove(game, time);
      this.groveApproachScenery(game, time);
      this.sectionLandmarks(game, time, p);
      this.treasuryRooms(game, time);
      if (thornGrove) this.thornGroveScenery(game, time);
      else this.expansionScenery(game, time);
      this.skyWayfinding(game, time);
    }
    if (titleMode) this.tree(titleX + 45, titleGround, p, 19, time, 1.2);
    for (const platform of game.platforms) {
      if (
        platform.broken ||
        (platform.kind === "crumble" && platform.crumbleRemaining === 0)
      )
        continue;
      if (
        platform.x + platform.w < camera - 30 ||
        platform.x > camera + this.viewportWidth + 30
      )
        continue;
      if (titleMode && platform.kind !== "ground") continue;
      this.platform(platform, p, time);
    }
    if (!titleMode) {
      this.rewardGuide(game);
      game.level.checkpoints.forEach((checkpoint, index) => {
        if (this.visible(checkpoint.x, 60))
          this.checkpoint(
            checkpoint.x,
            checkpoint.y,
            index <= game.activeCheckpointIndex,
            time,
            p,
            index + 1,
          );
      });
      if (game.level.kind !== "grove" && this.visible(game.level.goal.x, 90)) {
        if (game.level.kind === "secret" && game.level.theme !== "cloud")
          this.hiveBell(
            game.level.goal.x,
            game.level.goal.y,
            game.secretCompleted,
            time,
          );
        else {
          this.portal(game.level.goal.x, game.level.goal.y, p, time);
          this.sealedGoal(game);
        }
      }
      this.secretClues(game, time);
      this.expansionObjects(game, time);
      if (game.boss && game.boss.state !== "defeated") {
        const gates =
          game.boss.kind === "millkeeper"
            ? game.boss.state === "dormant"
              ? []
              : [game.boss.minX, game.boss.maxX]
            : [game.boss.maxX + game.boss.w + 26];
        for (const gateX of gates) {
          if (this.visible(gateX, 40)) {
            const gateTop = Math.min(0, this.cameraY);
            this.rounded(
              gateX - 5,
              gateTop,
              10,
              game.boss.groundY - gateTop,
              4,
              "rgba(211,238,153,.22)",
            );
            this.line(
              [
                [gateX, gateTop],
                [gateX, game.boss.groundY],
              ],
              "rgba(190,226,138,.65)",
              2,
            );
            for (let i = 0; i < 8; i++)
              this.ellipse(
                gateX,
                (i * 57 + time * 14) % game.boss.groundY,
                3,
                4,
                "#e9f8b4",
              );
            this.line(
              [
                [gateX, game.boss.groundY],
                [gateX - 6, game.boss.groundY - 37],
                [gateX, game.boss.groundY - 79],
              ],
              "#62996a",
              8,
            );
            for (let i = 0; i < 4; i++)
              this.leaf(
                gateX - 3,
                game.boss.groundY - 12 - i * 17,
                16,
                i % 2 ? 0.9 : -0.9,
                i % 2 ? "#9ac57c" : "#7eb377",
              );
          }
        }
      }
      // A hidden acorn sits on top of its coin and is drawn in its place.
      const hidden = new Set(
        game.acorns.filter((a) => !a.collected).map((a) => `${a.x},${a.y}`),
      );
      game.coins.forEach((coin, i) => {
        if (
          !coin.collected &&
          !hidden.has(`${coin.baseX ?? coin.x},${coin.baseY ?? coin.y}`) &&
          this.visible(coin.x, 24)
        )
          this.coin(coin.x, coin.y, time, i);
      });
      for (const ring of game.coinRings) this.coinRing(ring, time);
      this.windStreaks(game, time);
      for (const trap of game.level.traps ?? []) this.trapArt(game, trap, time);
      if (game.level.chase && Number.isFinite(game.chaseX))
        this.floodWall(game.chaseX, time);
      for (const lantern of game.lanterns)
        if (this.visible(lantern.x, 60))
          this.lanternPost(lantern.x, lantern.y, lantern.lit, time);
      for (const icicle of game.icicles)
        if (icicle.state !== "gone" && this.visible(icicle.x, 30))
          if (game.level.castle === "belfry")
            this.shingleArt(icicle.x, icicle.y, icicle.state === "shake", time);
          else
            this.icicleArt(icicle.x, icicle.y, icicle.state === "shake", time);
      game.acorns.forEach((acorn, i) => {
        if (!acorn.collected && this.visible(acorn.x, 30))
          this.acorn(acorn.x, acorn.y, time, i);
      });
      game.stars.forEach((star, i) => {
        if (!star.collected && this.visible(star.x, 30))
          this.star(star.x, star.y, time, i);
      });
      game.diamonds.forEach((diamond, i) => {
        if (!diamond.collected && this.visible(diamond.x, 30))
          this.diamond(diamond.x, diamond.y, time, i);
      });
      game.fireflies.forEach((firefly, index) => {
        if (!firefly.collected && this.visible(firefly.x, 40))
          this.rescueFirefly(firefly.x, firefly.y, time, index);
      });
      this.secretCreatures(game, time);
      for (const enemy of game.enemies) {
        if ((enemy.alive || enemy.squashed > 0) && this.visible(enemy.x, 40))
          this.bug(enemy, time, enemy.alive ? 0 : enemy.squashed);
      }
      this.bossCreature(game, time);
      this.bossHazards(game, time);
      for (const mount of game.mounts)
        if (mount !== game.riding && this.visible(mount.x, 80))
          this.gulpFrog(
            mount.x + MOUNT_SIZE.w / 2,
            mount.y,
            mount.facing,
            time,
            mount.state === "fleeing",
          );
      if (game.ghost) {
        // The ghost of the best Timed run: a pale, see-through Pip.
        const ghost = ghostAt(game.ghost, game.elapsed);
        if (ghost && !ghost.done && this.visible(ghost.x, 60)) {
          c.save();
          c.globalAlpha = 0.32;
          this.hero(
            ghost.x + 14,
            ghost.y + 38,
            0,
            0,
            1,
            true,
            time,
            0,
            1,
            "normal",
            "moon",
            false,
            "none",
            game.character,
          );
          c.restore();
        }
      }
      const player = game.player;
      const center = player.x + player.w / 2;
      // Riding Gulp, Pip sits up on its back; it hops as it runs.
      const hop =
        game.riding && player.grounded && Math.abs(player.vx) > 30
          ? Math.abs(Math.sin(time * 12)) * 5
          : 0;
      const feet = player.y + player.h - (game.riding ? 26 + hop : 0);
      if (game.riding) {
        if (game.tongueTarget) {
          const mouthX = center + player.facing * 24;
          const mouthY = player.y + player.h - 14;
          this.line(
            [
              [mouthX, mouthY],
              [game.tongueTarget.x, game.tongueTarget.y],
            ],
            "#e8708a",
            5,
          );
          this.ellipse(
            game.tongueTarget.x,
            game.tongueTarget.y,
            6,
            6,
            "#f28fa3",
          );
        }
        this.gulpFrog(
          center,
          player.y + player.h - hop,
          player.facing,
          time,
          false,
          1.45,
          game.fluttering,
        );
      }
      const size = player.h / 38;
      if (game.starPowerRemaining <= 0) {
        const glow = c.createRadialGradient(
          center,
          feet - 23 * size,
          3,
          center,
          feet - 23 * size,
          45 * size,
        );
        glow.addColorStop(0, "rgba(255,241,173,.14)");
        glow.addColorStop(1, "rgba(255,241,173,0)");
        this.ellipse(center, feet - 23 * size, 45 * size, 45 * size, glow);
      }
      if (game.starPowerRemaining > 0)
        this.starAura(center, feet, size, game.starPowerRemaining, time, false);
      if (this.formChange > 0)
        this.transformation(center, feet, size, this.growing, this.formChange);
      c.save();
      // Damage grace is visually distinct from star power and never hides Pip.
      if (player.invulnerable > 0 && game.starPowerRemaining <= 0)
        c.globalAlpha = 0.55 + (Math.sin(time * 9) + 1) * 0.18;
      if (game.pound === "drop") {
        // Speed lines streak above a ground pound.
        for (const dx of [-10, 0, 10])
          this.line(
            [
              [center + dx, feet - 48 * size],
              [center + dx, feet - 80 * size],
            ],
            "rgba(255,255,240,.7)",
            2.5,
          );
      }
      if (game.swimming && !player.grounded) {
        // Swimming: Pip leans into the stroke, legs kicking behind, and
        // straightens up as each kick fades.
        const pivotY = feet - 19 * size;
        const lean =
          player.facing *
          (0.25 + Math.min(1, Math.abs(player.vx) / 190) * 0.45) *
          (Math.abs(player.vx) > 20 ? 1 : 0.4);
        const kick = game.swimStroke / 0.32;
        c.translate(center, pivotY);
        c.rotate(lean - player.facing * kick * 0.25);
        c.translate(-center, -pivotY);
        for (const side of [-1, 1]) {
          const swing = Math.sin(time * 9 + side) * 5 + kick * 10 * side;
          this.leaf(
            center - player.facing * 12,
            feet - 6 + side * 4,
            11 * size,
            Math.PI / 2 + player.facing * (0.9 + swing * 0.05),
            "#6fcf86",
          );
        }
      }
      // While flying (rising or gliding), small feather wings sit behind
      // Pip, so they are drawn first.
      if (
        game.hasWindFeather &&
        !player.grounded &&
        (game.glideArmed || game.liftActive)
      )
        this.glideWings(center, feet, size, player.facing || 1, time);
      this.hero(
        center,
        feet,
        player.vx,
        player.vy,
        player.facing,
        player.grounded,
        time,
        this.landing,
        size,
        game.state === "won" || this.escapeCelebration > 0
          ? "won"
          : game.state === "lost"
            ? "lost"
            : player.invulnerable > 1.1
              ? "hurt"
              : "normal",
        game.outfit,
        game.enemies.some(
          (e) =>
            e.alive &&
            Math.abs(e.x - player.x) < 135 &&
            Math.abs(e.y - player.y) < 85,
        ) ||
          !!(
            game.boss &&
            game.boss.state !== "defeated" &&
            Math.abs(game.boss.x - player.x) < 220
          ),
        game.hasWindFeather
          ? game.liftActive
            ? "lift"
            : game.glideArmed && !player.grounded
              ? "glide"
              : "ready"
          : "none",
        game.character,
      );
      c.restore();
      if (game.starPowerRemaining > 0)
        this.starAura(center, feet, size, game.starPowerRemaining, time, true);
      this.powerEffects(game, center, feet, size, time);
      if (game.level.dark && !titleMode) this.nightDarkness(game, time);
      this.worldOverlays(game, dt);
    } else {
      this.hero(
        titleX,
        titleGround + 1,
        0,
        0,
        1,
        true,
        time,
        0,
        2.9,
        "normal",
        game.outfit,
        false,
        "none",
        game.character,
      );
      this.firefly(
        titleX + 96 + Math.sin(time * 0.8) * 18,
        titleGround - 163 + Math.cos(time) * 11,
        time,
        1.3,
      );
    }
    this.drawParticles(dt);
    c.restore();

    // Sparse drifting lights provide movement without veiling the collision surfaces.
    const lightSpan = this.viewportWidth + 140;
    const lightCount = Math.ceil(
      (game.level.theme === "dusk" ? 20 : 8) * (this.viewportWidth / WIDTH),
    );
    for (let i = 0; i < lightCount; i++) {
      const x =
        ((((hash(i + 40) * lightSpan +
          time * (3 + hash(i) * 5) -
          camera * 0.12) %
          lightSpan) +
          lightSpan) %
          lightSpan) -
        60;
      const y = 125 + hash(i + 91) * 230 + Math.sin(time * 0.7 + i) * 9;
      c.globalAlpha = 0.3 + (Math.sin(time * 1.4 + i) + 1) * 0.15;
      this.ellipse(x, y, 2.3, 2.3, "#fff6b3");
    }
    c.globalAlpha = 1;
    if (titleMode) {
      const wash = c.createLinearGradient(0, 0, 650, 0);
      wash.addColorStop(0, "rgba(239,255,227,.52)");
      wash.addColorStop(0.65, "rgba(239,255,227,.18)");
      wash.addColorStop(1, "rgba(239,255,227,0)");
      c.fillStyle = wash;
      c.fillRect(0, 0, 650, this.viewportHeight);
    }
  }

  private visible(x: number, margin: number) {
    return (
      x > this.cameraX - margin &&
      x < this.cameraX + this.viewportWidth + margin
    );
  }

  private ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string | CanvasGradient,
    outline?: string,
    lineWidth = 2,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    if (outline) {
      c.strokeStyle = outline;
      c.lineWidth = lineWidth;
      c.stroke();
    }
  }

  private rounded(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string,
    outline?: string,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = color;
    c.fill();
    if (outline) {
      c.strokeStyle = outline;
      c.lineWidth = 2;
      c.stroke();
    }
  }

  private line(points: number[][], color: string, width: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0][0], points[0][1]);
    for (const point of points.slice(1)) c.lineTo(point[0], point[1]);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
  }

  private leaf(
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: string,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(
      -size * 0.8,
      -size * 0.3,
      -size * 0.6,
      -size,
      0,
      -size * 1.35,
    );
    c.bezierCurveTo(size * 0.8, -size, size * 0.75, -size * 0.25, 0, 0);
    c.fillStyle = color;
    c.fill();
    c.restore();
  }

  private background(p: Palette, theme: Theme, time: number, camera: number) {
    const c = this.ctx;
    const sky = c.createLinearGradient(0, 0, 0, this.viewportHeight);
    sky.addColorStop(0, p.sky);
    sky.addColorStop(0.8, p.horizon);
    sky.addColorStop(1, p.middle);
    c.fillStyle = sky;
    c.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    if (theme === "grotto") {
      // Soft shafts and distant rock shelves keep the water legible without
      // suggesting solid surfaces where no collision exists.
      for (let i = 0; i < Math.ceil(this.viewportWidth / 240) + 1; i++) {
        const x = i * 240 - ((camera * 0.08) % 240);
        c.fillStyle = "rgba(189,255,229,.045)";
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 75, 0);
        c.lineTo(x - 90, this.viewportHeight);
        c.lineTo(x - 165, this.viewportHeight);
        c.closePath();
        c.fill();
        this.ellipse(
          x + 85,
          this.viewportHeight + 30,
          160,
          120,
          "rgba(9,52,65,.25)",
        );
      }
      return;
    }
    if (theme === "storm") {
      this.stormBackdrop(p, time, camera);
      return;
    }
    if (theme === "snow" || theme === "ice" || theme === "volcano") {
      this.extraBackdrop(theme, p, time, camera);
      return;
    }
    if (theme === "cavern") {
      this.cavernBackdrop(camera, time);
      return;
    }
    if (theme === "cloud") {
      for (let i = -1; i < Math.ceil(this.viewportWidth / 230) + 2; i++) {
        const x = i * 230 - ((camera * 0.08) % 230);
        this.cloud(x, 145 + hash(i + 40) * 180, 1.5 + hash(i + 21), "#ffffff");
      }
      this.ellipse(this.viewportWidth * 0.77, 90, 40, 40, p.sun);
      return;
    }
    if (theme === "dusk") {
      const span = this.viewportWidth + 140;
      for (let i = 0; i < Math.ceil((35 * this.viewportWidth) / WIDTH); i++) {
        const x = (hash(i + 300) * span - camera * 0.025 + span) % span;
        const y = 28 + hash(i + 320) * 205;
        c.globalAlpha = 0.3 + hash(i + 41) * 0.5;
        this.ellipse(x, y, i % 4 ? 1.2 : 2.2, i % 4 ? 1.2 : 2.2, "#fff6dc");
      }
      c.globalAlpha = 1;
    }
    const sunX = this.viewportWidth * 0.79 - camera * 0.025;
    this.ellipse(sunX, 97, 72, 72, "rgba(255,246,177,.13)");
    this.ellipse(sunX, 97, 55, 55, "rgba(255,246,177,.17)");
    this.ellipse(sunX, 97, 39, 39, p.sun);
    if (theme === "dusk") this.ellipse(sunX + 17, 83, 33, 33, p.sky);
    else {
      this.ellipse(sunX - 12, 85, 11, 16, "rgba(255,255,255,.3)");
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + 0.1;
        this.line(
          [
            [sunX + Math.cos(angle) * 47, 97 + Math.sin(angle) * 47],
            [sunX + Math.cos(angle) * 54, 97 + Math.sin(angle) * 54],
          ],
          "rgba(255,248,196,.7)",
          3,
        );
      }
    }
    const cloudCount = Math.ceil((this.viewportWidth + 320) / 249);
    const cloudSpan = cloudCount * 249;
    for (let i = 0; i < cloudCount; i++) {
      const x =
        ((i * 249 + time * 3 - camera * 0.065 + cloudSpan) % cloudSpan) - 160;
      this.cloud(
        x,
        57 + hash(i + 9) * 110,
        0.58 + hash(i + 17) * 0.55,
        theme === "dusk" ? "#d9cbe4" : "#ffffff",
      );
    }
    for (let layer = 0; layer < 3; layer++) {
      const parallax = 0.1 + layer * 0.12;
      const spacing = 360 - layer * 35;
      const shift = camera * parallax;
      const color = layer === 0 ? p.far : layer === 1 ? p.middle : p.near;
      for (
        let i = Math.floor(shift / spacing) - 1;
        i <=
        Math.floor(shift / spacing) +
          Math.ceil(this.viewportWidth / spacing) +
          1;
        i++
      ) {
        const x = i * spacing - shift;
        const top = 209 + layer * 60 + hash(i + layer * 31) * 42;
        c.beginPath();
        c.moveTo(x - 100, this.viewportHeight);
        if (theme === "alpine" && layer === 0) {
          c.lineTo(x + 82, top - 68);
          c.quadraticCurveTo(x + 97, top - 90, x + 111, top - 65);
          c.lineTo(x + 330, this.viewportHeight);
        } else {
          c.bezierCurveTo(x - 95, top + 90, x + 5, top - 20, x + 116, top);
          c.bezierCurveTo(
            x + 222,
            top + 5,
            x + 260,
            top + 160,
            x + 400,
            this.viewportHeight,
          );
        }
        c.closePath();
        c.fillStyle = color;
        c.fill();
        if (theme === "alpine" && layer === 0) {
          c.beginPath();
          c.moveTo(x + 45, top - 4);
          c.lineTo(x + 82, top - 68);
          c.quadraticCurveTo(x + 97, top - 90, x + 111, top - 65);
          c.lineTo(x + 166, top + 4);
          c.lineTo(x + 127, top - 12);
          c.lineTo(x + 103, top + 7);
          c.lineTo(x + 80, top - 19);
          c.closePath();
          c.fillStyle = "#edf9ed";
          c.fill();
        }
        if (layer === 1) {
          c.globalAlpha = 0.16;
          for (let j = 0; j < 5; j++)
            this.ellipse(
              x + 24 + j * 43,
              top + 62 + hash(i + j) * 43,
              14,
              26,
              "#fffadc",
            );
          c.globalAlpha = 1;
        }
      }
    }
    // Small, distant evergreens stay in the background color family.
    for (let i = -1; i < Math.ceil(this.viewportWidth / 100) + 2; i++) {
      const x = i * 100 - ((camera * 0.37) % 100);
      const y = 348 + hash(i + 76) * 35;
      const h = 33 + hash(i + 6) * 30;
      c.globalAlpha = 0.4;
      this.rounded(x + 12, y, 5, h + 25, 2, p.near);
      this.ellipse(x + 14, y + 17, 21, h * 0.6, p.middle);
      this.ellipse(x + 14, y + 5, 15, h * 0.45, p.middle);
    }
    c.globalAlpha = 1;
  }

  private grottoWater(game: Game, time: number) {
    for (const zone of game.level.waterZones ?? []) {
      if (
        zone.x + zone.w < this.cameraX ||
        zone.x > this.cameraX + this.viewportWidth
      )
        continue;
      const c = this.ctx;
      c.save();
      c.beginPath();
      c.rect(zone.x, zone.y, zone.w, zone.h);
      c.clip();
      if (zone.currentX) {
        // Streaks drift in the current's direction; no extra tint.
        for (let i = 0; i < Math.max(6, Math.floor(zone.w / 70)); i++) {
          const span = zone.w + 80;
          const along =
            (time * zone.currentX * 0.8 + hash(i + 7) * span) % span;
          const x = zone.x + ((along + span) % span) - 40;
          const y = zone.y + 20 + hash(i + 91) * (zone.h - 40);
          this.line(
            [
              [x, y],
              [x + Math.sign(zone.currentX) * 28, y],
            ],
            "rgba(220,255,250,.35)",
            2,
          );
        }
      } else if (!zone.currentY) {
        c.fillStyle = "rgba(43, 183, 189, .22)";
        c.fillRect(zone.x, zone.y, zone.w, zone.h);
        this.line(
          [
            [zone.x, zone.y + 2],
            [zone.x + zone.w, zone.y + 2],
          ],
          "rgba(202,255,240,.65)",
          3,
        );
        for (let i = 0; i < Math.ceil(zone.w / 90); i++) {
          const x = zone.x + i * 90 + Math.sin(time * 1.3 + i) * 5;
          this.ellipse(x, zone.y + 5, 23, 2, "rgba(231,255,248,.45)");
        }
      } else {
        // The bubble currents rise continuously, just like the water force.
        const rises = zone.currentY < 0;
        for (let i = 0; i < Math.max(5, Math.floor(zone.w / 15)); i++) {
          const x = zone.x + 6 + hash(i + zone.x) * Math.max(1, zone.w - 12);
          const phase = (time * 38 + hash(i + 57) * zone.h) % zone.h;
          const y = rises ? zone.y + zone.h - phase : zone.y + phase;
          this.ellipse(
            x + Math.sin(time * 2 + i) * 4,
            y,
            2 + hash(i) * 3,
            3 + hash(i) * 4,
            "rgba(202,255,245,.65)",
          );
        }
      }
      c.restore();
    }
  }

  private cloud(x: number, y: number, scale: number, color: string) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.globalAlpha = 0.75;
    c.beginPath();
    c.moveTo(0, 25);
    c.bezierCurveTo(-5, 9, 14, 1, 25, 9);
    c.bezierCurveTo(29, -22, 70, -25, 79, 2);
    c.bezierCurveTo(94, -9, 113, 4, 111, 18);
    c.bezierCurveTo(144, 13, 149, 41, 126, 43);
    c.lineTo(12, 43);
    c.bezierCurveTo(-12, 43, -13, 29, 0, 25);
    c.fillStyle = color;
    c.fill();
    c.restore();
  }

  private tree(
    x: number,
    ground: number,
    p: Palette,
    seed: number,
    time: number,
    scale = 1,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(x, ground);
    c.scale(scale, scale);
    const h = 192 + hash(seed + 9) * 42;
    c.beginPath();
    c.moveTo(-18, 0);
    c.quadraticCurveTo(-7, -h * 0.32, -13, -h * 0.76);
    c.lineTo(9, -h * 0.82);
    c.quadraticCurveTo(3, -h * 0.3, 23, 0);
    c.closePath();
    c.fillStyle = p.trunk;
    c.fill();
    this.line(
      [
        [-3, -20],
        [0, -h * 0.57],
        [-36, -h * 0.75],
      ],
      "rgba(64,58,35,.2)",
      5,
    );
    this.line(
      [
        [3, -h * 0.4],
        [39, -h * 0.71],
      ],
      p.trunk,
      12,
    );
    const sway = Math.sin(time * 0.55 + seed) * 2;
    c.translate(sway, -h);
    const clusters = [
      [-48, 17, 45, 45],
      [6, -6, 54, 55],
      [55, 23, 45, 44],
      [-17, 45, 60, 42],
      [43, 53, 48, 32],
    ];
    for (const [cx, cy, rx, ry] of clusters)
      this.ellipse(cx, cy + 8, rx, ry, p.leafShade);
    for (const [cx, cy, rx, ry] of clusters)
      this.ellipse(cx - 3, cy - 4, rx, ry, p.leaf);
    for (let i = 0; i < 5; i++) {
      const [cx, cy, rx] = clusters[i];
      this.ellipse(cx - rx * 0.24, cy - 21, rx * 0.56, 18, p.leafLight);
    }
    c.globalAlpha = 0.65;
    for (let i = 0; i < 12; i++)
      this.leaf(
        -60 + hash(seed + i) * 130,
        18 + hash(i + 4) * 55,
        5,
        i * 0.8,
        p.leafLight,
      );
    c.globalAlpha = 1;
    c.restore();
  }

  private restoredLight(restoration: number, time: number, camera: number) {
    if (restoration <= 0) return;
    const c = this.ctx;
    c.save();
    // A recovered forest grows warmer and fills with tiny lights; the terrain
    // stays high contrast at every progress level.
    const glowX = this.viewportWidth * 0.75;
    const glow = c.createRadialGradient(glowX, 100, 12, glowX, 100, 370);
    glow.addColorStop(0, `rgba(255,245,183,${0.18 * restoration})`);
    glow.addColorStop(1, "rgba(255,245,183,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, this.viewportWidth, 380);
    const span = this.viewportWidth + 160;
    for (
      let i = 0;
      i < Math.round(restoration * 24 * (this.viewportWidth / WIDTH));
      i++
    ) {
      const x =
        ((((hash(i + 600) * span - camera * 0.15 + time * 5) % span) + span) %
          span) -
        80;
      const y = 145 + hash(i + 690) * 220 + Math.sin(time + i) * 5;
      this.ellipse(x, y, 5, 5, "rgba(214,255,182,.12)");
      this.ellipse(x, y, 1.5, 1.5, "#ecffb8");
    }
    c.restore();
  }

  /** Garden objects sit behind their authored collision platforms. */
  private gardenLandmarks(game: Game, time: number) {
    const c = this.ctx;
    for (const r of game.level.landmarks ?? []) {
      if (
        r.x + r.w < this.cameraX - 80 ||
        r.x > this.cameraX + this.viewportWidth + 80
      )
        continue;
      c.save();
      const x = r.x,
        y = r.y,
        w = r.w,
        h = r.h;
      if (r.kind === "watering-can") {
        // A broad enamel body and curved handle are readable from several screens away.
        c.strokeStyle = "#448b8d";
        c.lineWidth = 16;
        c.beginPath();
        c.ellipse(
          x + w * 0.74,
          y + h * 0.45,
          w * 0.23,
          h * 0.33,
          -0.25,
          0,
          Math.PI * 2,
        );
        c.stroke();
        c.beginPath();
        c.moveTo(x + w * 0.25, y + h * 0.7);
        c.lineTo(x - w * 0.08, y + h * 0.22);
        c.lineTo(x - w * 0.19, y + h * 0.29);
        c.lineTo(x + w * 0.1, y + h * 0.9);
        c.closePath();
        c.fillStyle = "#64b2b1";
        c.fill();
        this.rounded(
          x + w * 0.1,
          y + h * 0.12,
          w * 0.6,
          h * 0.88,
          24,
          "#70bdb7",
          "#3c8184",
        );
        this.ellipse(
          x + w * 0.4,
          y + h * 0.12,
          w * 0.3,
          14,
          "#9fd4c0",
          "#3c8184",
        );
        this.ellipse(x + w * 0.4, y + h * 0.12, w * 0.2, 8, "#3e8184");
        this.rounded(
          x + w * 0.18,
          y + h * 0.28,
          w * 0.07,
          h * 0.5,
          10,
          "#a3d8c8",
        );
        this.ellipse(
          x - w * 0.14,
          y + h * 0.25,
          w * 0.1,
          15,
          "#aad7c7",
          "#448b8d",
        );
        for (let i = 0; i < 5; i++)
          this.ellipse(
            x - w * 0.2 + i * w * 0.03,
            y + h * 0.25,
            2,
            2,
            "#508b8b",
          );
        this.leaf(x + w * 0.5, y + h * 0.7, 32, 0.5, "#b4e1c4");
      } else if (r.kind === "flowerpot") {
        c.beginPath();
        c.moveTo(x + 8, y + 18);
        c.lineTo(x + w - 8, y + 18);
        c.lineTo(x + w * 0.83, y + h);
        c.lineTo(x + w * 0.17, y + h);
        c.closePath();
        c.fillStyle = "#d99778";
        c.fill();
        c.strokeStyle = "#a56859";
        c.lineWidth = 3;
        c.stroke();
        this.rounded(x, y, w, 29, 8, "#f1b58d", "#a56859");
        this.line(
          [
            [x + w * 0.22, y + 43],
            [x + w * 0.3, y + h - 16],
          ],
          "#efb18b",
          12,
        );
        this.line(
          [
            [x + w * 0.65, y + 40],
            [x + w * 0.54, y + h * 0.5],
            [x + w * 0.63, y + h * 0.63],
          ],
          "#b87961",
          3,
        );
        this.ellipse(x + w * 0.5, y + 10, w * 0.38, 5, "#916d54");
      } else if (r.kind === "log") {
        this.rounded(x, y, w, h, Math.min(h * 0.45, 60), "#aa8058", "#735e44");
        for (let row = 0; row < 4; row++) {
          const yy = y + 15 + (row * (h - 25)) / 4;
          this.line(
            [
              [x + 25, yy],
              [x + w * 0.42, yy + 6],
              [x + w - 25, yy - 3],
            ],
            row % 2 ? "#bb9164" : "#8a6e4b",
            4,
          );
        }
        this.ellipse(
          x + w - 18,
          y + h * 0.5,
          18,
          h * 0.43,
          "#ddbc83",
          "#8a6e4b",
          3,
        );
        for (let ring = 1; ring < 4; ring++) {
          c.beginPath();
          c.ellipse(
            x + w - 18,
            y + h * 0.5,
            ring * 4,
            h * 0.1 * ring,
            0,
            0,
            Math.PI * 2,
          );
          c.strokeStyle = "#bb955f";
          c.lineWidth = 2;
          c.stroke();
        }
        for (let i = 0; i < 7; i++)
          this.leaf(
            x + 35 + (i * (w - 65)) / 7,
            y + 12,
            14,
            -0.6 + i * 0.3,
            "#73a96a",
          );
      } else if (r.kind === "web") {
        const cx = x + w / 2,
          cy = y + h / 2;
        c.strokeStyle = "rgba(235,245,237,.65)";
        c.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          this.line(
            [
              [cx, cy],
              [cx + (Math.cos(a) * w) / 2, cy + (Math.sin(a) * h) / 2],
            ],
            "rgba(235,245,237,.55)",
            2,
          );
        }
        for (let ring = 1; ring < 5; ring++) {
          c.beginPath();
          for (let i = 0; i <= 8; i++) {
            const a = (i * Math.PI) / 4;
            const xx = cx + (Math.cos(a) * w * ring) / 10;
            const yy = cy + (Math.sin(a) * h * ring) / 10;
            if (!i) c.moveTo(xx, yy);
            else c.lineTo(xx, yy);
          }
          c.stroke();
        }
        this.ellipse(cx + w * 0.21, cy - h * 0.2, 3, 4, "#e6fff2");
      } else {
        // Water stays below the playable ledges; highlights never suggest a solid floor.
        this.rounded(x, y - 18, w, h + 18, 14, "#83c9d1");
        for (let i = 0; i < 12; i++) {
          const xx = x + ((i * 87 + time * 28) % Math.max(1, w - 30));
          const yy = y - 12 + (i % 3) * Math.max(4, h / 4);
          this.line(
            [
              [xx, yy],
              [xx + 23, yy],
            ],
            "#c1eddf",
            2,
          );
        }
      }
      c.restore();
    }
  }

  private wakingPlant(r: Game["platforms"][number], time: number) {
    const c = this.ctx;
    const cx = r.x + r.w / 2;
    const floor = Math.max(r.y + 40, 430);
    this.line(
      [
        [cx, floor],
        [cx - 7, (r.y + floor) / 2],
        [cx, r.y + 12],
      ],
      "#4d9666",
      6,
    );
    this.leaf(cx - 3, r.y + (floor - r.y) * 0.5, 24, -0.9, "#82bd6b");
    this.leaf(cx, r.y + (floor - r.y) * 0.7, 21, 0.9, "#69a964");
    if (!r.awakened) {
      if (r.kind === "curled") {
        c.beginPath();
        for (let i = 0; i < 70; i++) {
          const a = i * 0.12,
            radius = 2 + i * 0.24;
          const x = cx + Math.cos(a) * radius,
            y = r.y + 23 + Math.sin(a) * radius;
          if (!i) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.lineWidth = 9;
        c.strokeStyle = "#87b77b";
        c.stroke();
      } else {
        this.ellipse(cx, r.y + 24, 14, 22, "#c8adc2", "#967d9b");
        this.leaf(cx, r.y + 45, 20, -0.5, "#7aaa72");
        this.leaf(cx, r.y + 45, 20, 0.5, "#9bc087");
      }
      // Sleeping buds have no horizontal rim, matching their inactive collision state.
      this.ellipse(cx + Math.sin(time * 1.2) * 14, r.y - 5, 2, 2, "#fff0a9");
      return;
    }
    if (r.kind === "curled") {
      c.beginPath();
      c.moveTo(r.x, r.y + 3);
      c.quadraticCurveTo(cx, r.y + 40, r.x + r.w, r.y + 3);
      c.closePath();
      c.fillStyle = "#75bc72";
      c.fill();
      for (let i = 1; i < 5; i++)
        this.line(
          [
            [r.x + (i * r.w) / 5, r.y + 5],
            [cx, r.y + 20],
          ],
          "#4f9d62",
          2,
        );
      this.rounded(r.x, r.y, r.w, Math.min(8, r.h), 4, "#c2e797", "#569e65");
    } else {
      for (let i = 0; i < 7; i++)
        this.ellipse(
          r.x + 10 + ((r.w - 20) * i) / 6,
          r.y + 12,
          r.w / 10,
          13,
          i % 2 ? "#f3b7d3" : "#ffd3df",
          "#c98eac",
          1,
        );
      this.rounded(r.x, r.y, r.w, Math.min(8, r.h), 4, "#fff1b0", "#c9a564");
      this.ellipse(cx, r.y + 9, r.w * 0.21, 6, "#f1c76a");
    }
    for (let i = 0; i < 3; i++)
      this.ellipse(
        cx + Math.sin(time + i * 2) * r.w * 0.5,
        r.y + 25 + Math.cos(time + i * 2) * 8,
        1.7,
        1.7,
        "#fff6bf",
      );
  }

  private secretClues(game: Game, time: number) {
    const c = this.ctx;
    for (const clue of game.level.clues ?? []) {
      if (!this.visible(clue.x, 60)) continue;
      const distance = Math.hypot(
        game.player.x + game.player.w / 2 - clue.x,
        game.player.y + game.player.h / 2 - clue.y,
      );
      const near = Math.max(0, 1 - distance / 180);
      c.save();
      if (clue.kind === "footprints") {
        c.globalAlpha = 0.12 + near * 0.78;
        for (let i = 0; i < 6; i++) {
          this.ellipse(
            clue.x - 24 + i * 9,
            clue.y + (i % 2 ? 3 : -3),
            3.5,
            1.8,
            "#fff7b1",
          );
        }
      } else if (clue.kind === "glow") {
        this.ellipse(
          clue.x,
          clue.y,
          16 + near * 10,
          22,
          `rgba(255,228,148,${0.09 + near * 0.16})`,
        );
        this.line(
          [
            [clue.x - 4, clue.y - 13],
            [clue.x + 3, clue.y - 3],
            [clue.x - 2, clue.y + 6],
            [clue.x + 5, clue.y + 13],
          ],
          "#ffe89c",
          2.5,
        );
      } else {
        for (let i = 0; i < 5; i++) {
          this.line(
            [
              [clue.x - 12 + i * 6, clue.y + 8],
              [
                clue.x - 15 + i * 7 + Math.sin(time * 3 + i) * (2 + near * 3),
                clue.y - 8 - (i % 2) * 5,
              ],
            ],
            "#88bc6b",
            3,
          );
        }
        this.ellipse(clue.x + 8, clue.y - 9, 2, 2, "#ffe99d");
      }
      if (near > 0.65 && clue.text) {
        c.font = "600 11px 'DM Sans', sans-serif";
        const width = Math.min(230, c.measureText(clue.text).width + 20);
        this.rounded(
          clue.x - width / 2,
          clue.y - 48,
          width,
          24,
          8,
          "#fff7dded",
        );
        c.fillStyle = "#456b54";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(clue.text, clue.x, clue.y - 36, width - 16);
      }
      c.restore();
    }
  }

  /** A non-interactive sign teaches the block gesture before the first reward. */
  private rewardGuide(game: Game) {
    if (
      game.level.contentId !== "world.sunlit-meadow" ||
      !this.visible(235, 120)
    )
      return;
    const c = this.ctx;
    this.line(
      [
        [235, 430],
        [235, 362],
      ],
      "#8d7550",
      5,
    );
    this.rounded(177, 326, 116, 40, 9, "#fff4cb", "#9b895e");
    this.rounded(183, 333, 24, 24, 5, "#c0e8cd", "#719e84");
    c.save();
    c.fillStyle = "#426d55";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 18px sans-serif";
    c.fillText("↑", 195, 345);
    c.font = "bold 11px 'DM Sans', sans-serif";
    c.fillText("BUMP", 247, 339);
    c.fillText("BLOCKS", 247, 353);
    c.restore();
  }

  /** Petals make a high optional route visible without marking a solid path. */
  private skyWayfinding(game: Game, time: number) {
    for (const tile of game.platforms) {
      if (!tile.id?.startsWith("cloud.sky-") || !tile.id.endsWith(".first"))
        continue;
      const x = tile.x + tile.w / 2;
      if (!this.visible(x, 180)) continue;
      for (let i = 0; i < 7; i++) {
        const y = tile.y + 48 + i * 34;
        const sway = Math.sin(time * 1.4 + i * 1.3) * 9;
        this.ellipse(x + sway + (i % 2 ? 14 : -14), y, 3, 5, "#fff3bb");
      }
    }
  }

  private creature(
    kind: "frog" | "bird" | "moth",
    x: number,
    y: number,
    time: number,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(
      x,
      y + Math.sin(time * 2 + x * 0.01) * (kind === "frog" ? 1 : 3),
    );
    this.ellipse(0, 0, 27, 25, "rgba(255,246,190,.18)");
    if (kind === "frog") {
      this.ellipse(-11, 10, 8, 4, "#78bd80", "#477e64");
      this.ellipse(11, 10, 8, 4, "#78bd80", "#477e64");
      this.ellipse(0, 2, 17, 12, "#9bd99a", "#477e64");
      this.ellipse(-10, -8, 6, 6, "#b9e9ad", "#477e64");
      this.ellipse(10, -8, 6, 6, "#b9e9ad", "#477e64");
      this.ellipse(-10, -8, 2, 2, "#31554c");
      this.ellipse(10, -8, 2, 2, "#31554c");
      this.line(
        [
          [-4, 5],
          [0, 7],
          [4, 5],
        ],
        "#477e64",
        1.5,
      );
    } else if (kind === "bird") {
      this.ellipse(-13, -1, 10, 7, "#a8d7ed", "#6095b1");
      this.ellipse(0, 0, 16, 12, "#c6ebf5", "#6095b1");
      this.ellipse(5, -3, 2, 2, "#416a69");
      this.line(
        [
          [15, 0],
          [20, 2],
          [15, 4],
        ],
        "#e9ab66",
        3,
      );
      this.ellipse(-5, 4, 8, 5, "#8bc9e3");
    } else {
      this.ellipse(-12, -3, 10, 14, "#e7b8d7", "#a477a1");
      this.ellipse(12, -3, 10, 14, "#e7b8d7", "#a477a1");
      this.ellipse(0, 1, 7, 13, "#fff0bb", "#a477a1");
      this.ellipse(-3, -2, 1.7, 2, "#624e67");
      this.ellipse(3, -2, 1.7, 2, "#624e67");
      this.line(
        [
          [-3, -10],
          [-8, -16],
        ],
        "#a477a1",
        2,
      );
      this.line(
        [
          [3, -10],
          [8, -16],
        ],
        "#a477a1",
        2,
      );
    }
    c.restore();
  }

  private secretCreatures(game: Game, time: number) {
    for (const creature of CREATURES) {
      if (
        creature.contentId === game.level.contentId &&
        !game.rescuedCreatures.includes(creature.id) &&
        this.visible(creature.x, 45)
      )
        this.creature(creature.kind, creature.x, creature.y, time);
    }
    for (const friend of FRIENDS) {
      if (
        friend.contentId === game.level.contentId &&
        !game.rescuedCreatures.includes(friend.id) &&
        this.visible(friend.x, 60)
      ) {
        // A soft glow marks a friend still waiting to be found.
        this.ellipse(friend.x, friend.y, 34, 32, "rgba(255,246,190,.22)");
        this.friend(friend.kind, friend.x, friend.y, time);
      }
    }
  }

  /** One of the six forest friends, about 48px tall, feet at y + 22. */
  private friend(kind: FriendKind, x: number, y: number, time: number) {
    const c = this.ctx;
    const bob = Math.sin(time * 2.2 + x * 0.01);
    c.save();
    c.translate(x, y + (kind === "bat" ? bob * 4 : 0));
    const eyes = (ex: number, ey: number, gap: number, r = 2.6) => {
      for (const side of [-1, 1]) {
        this.ellipse(ex + side * gap, ey, r, r * 1.15, "#2f3b36");
        this.ellipse(ex + side * gap + 0.8, ey - 1, r * 0.35, r * 0.35, "#fff");
      }
    };
    const smile = (sx: number, sy: number, color: string) =>
      this.line(
        [
          [sx - 3, sy],
          [sx, sy + 2.5],
          [sx + 3, sy],
        ],
        color,
        1.6,
      );
    if (kind !== "bat") this.ellipse(0, 23, 17, 3.5, "rgba(38,60,53,.18)");
    if (kind === "mouse") {
      const brown = "#c9925e",
        edge = "#8a5f3d";
      // Tail, body, big ears, and a leaf hood.
      this.line(
        [
          [-10, 16],
          [-22, 18],
          [-24, 8],
        ],
        "#e9a9a0",
        2.5,
      );
      this.ellipse(0, 12, 11, 11, brown, edge);
      this.ellipse(0, 14, 6.5, 7, "#f6e3c4");
      for (const side of [-1, 1]) {
        this.ellipse(side * 13, -8, 8, 9, brown, edge);
        this.ellipse(side * 13, -8, 5, 6, "#f1b3a8");
      }
      this.ellipse(0, -3, 12, 11, brown, edge);
      this.leaf(0, -7, 15, 0.25 + bob * 0.03, "#6fae5c");
      this.ellipse(0, 1, 7, 5, "#f6e3c4");
      eyes(0, -3, 5);
      this.ellipse(0, 1, 1.4, 1.1, "#8a5f3d");
      smile(0, 3, edge);
      // A glowing seed held up high.
      this.line(
        [
          [9, 9],
          [19, -12 + bob],
        ],
        brown,
        3.5,
      );
      this.ellipse(20, -16 + bob, 7, 7, "rgba(255,236,150,.4)");
      this.ellipse(20, -16 + bob, 3, 4.2, "#ffd95e", "#d9a233", 1);
    } else if (kind === "bat") {
      const lilac = "#b99ad8",
        edge = "#8667a8";
      const flap = Math.sin(time * 7) * 5;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(side * 6, 2);
        c.quadraticCurveTo(side * 18, -14 - flap, side * 30, -4 - flap);
        c.quadraticCurveTo(side * 25, 2, side * 24, 8);
        c.quadraticCurveTo(side * 18, 4, side * 15, 10);
        c.quadraticCurveTo(side * 11, 6, side * 6, 10);
        c.closePath();
        c.fillStyle = lilac;
        c.fill();
        c.strokeStyle = edge;
        c.lineWidth = 1.5;
        c.stroke();
        this.ellipse(side * 22, 2 - flap * 0.4, 1.2, 1.2, "#ffe9b0");
        this.ellipse(side * 17, 4 - flap * 0.3, 1, 1, "#ffe9b0");
        // Tall ears.
        c.beginPath();
        c.moveTo(side * 3, -10);
        c.quadraticCurveTo(side * 7, -26, side * 12, -22);
        c.quadraticCurveTo(side * 12, -13, side * 9, -7);
        c.closePath();
        c.fillStyle = lilac;
        c.fill();
        c.stroke();
      }
      this.ellipse(0, 10, 7, 9, "#9fd0cf", edge, 1.5);
      this.ellipse(0, 4, 8, 5, "#fbf3ea");
      this.ellipse(0, -4, 10.5, 9.5, "#fbf3ea", "#cdb9c9", 1.5);
      eyes(0, -4, 4.5);
      this.ellipse(-7, -1, 2, 1.3, "rgba(240,160,170,.6)");
      this.ellipse(7, -1, 2, 1.3, "rgba(240,160,170,.6)");
      smile(0, -1, edge);
    } else if (kind === "hedgehog") {
      // A coat of autumn leaves instead of spines.
      const leaves = ["#6fae5c", "#e3b545", "#8cc06a", "#d99a3c", "#5d9a54"];
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1.02 + (i / 8) * 0.96);
        this.leaf(
          Math.cos(a) * 9,
          2 + Math.sin(a) * 7,
          13,
          a + Math.PI / 2 + Math.sin(time * 1.5 + i) * 0.04,
          leaves[i % leaves.length]!,
        );
      }
      this.ellipse(0, 9, 14, 13, "#8a6a4c", "#5f4835");
      this.ellipse(0, 11, 11, 11, "#f3dfbd");
      for (const side of [-1, 1])
        this.ellipse(side * 10, -1, 3.5, 3.5, "#d9b18a", "#8a6a4c", 1.2);
      eyes(0, 4, 4.5);
      this.ellipse(0, 8, 1.8, 1.4, "#6b4a38");
      smile(0, 10, "#6b4a38");
      for (const side of [-1, 1]) {
        this.ellipse(side * 5, 15, 2.5, 2, "#d9b18a");
        this.ellipse(side * 6, 22, 4, 2, "#b08a66");
      }
      // A tiny mushroom tucked in the leaves.
      this.rounded(9, -15, 3, 6, 1.5, "#f3e6cf");
      this.ellipse(10.5, -16, 5, 3, "#d9744a", "#a9522f", 1);
    } else if (kind === "otter") {
      const teal = "#5d9a98",
        edge = "#3f6f73";
      // A flat paddle tail, then the upright body.
      c.save();
      c.translate(-10, 16);
      c.rotate(-0.25);
      this.ellipse(-8, 2, 10, 5, teal, edge);
      c.restore();
      this.ellipse(0, 10, 10, 13, teal, edge);
      this.ellipse(1, 12, 6, 9, "#f4ead2");
      for (const side of [-1, 1]) {
        this.ellipse(side * 6, 22, 4.5, 2, teal, edge, 1.2);
        this.ellipse(side * 9, -13, 2.6, 2.6, teal, edge, 1.2);
      }
      this.ellipse(0, -7, 11, 9.5, teal, edge);
      this.ellipse(0, -3, 7, 5, "#f4ead2");
      eyes(0, -8, 4.5);
      this.ellipse(0, -5, 1.8, 1.3, "#2f3b36");
      smile(0, -2.5, edge);
      // A glow-pebble held in both paws.
      this.ellipse(4, 8 + bob * 0.5, 7, 7, "rgba(255,236,150,.35)");
      this.ellipse(4, 8 + bob * 0.5, 3, 3.6, "#ffe9a3", "#d9b45a", 1);
      this.ellipse(-1, 9, 2.6, 2, teal, edge, 1);
      this.ellipse(8, 10, 2.6, 2, teal, edge, 1);
    } else if (kind === "snail") {
      const body = "#f2c764",
        edge = "#c8923a";
      // Soft body, eye stalks, and a mossy shell with a glowing spiral.
      c.beginPath();
      c.moveTo(-20, 22);
      c.quadraticCurveTo(-4, 14, 12, 16);
      c.quadraticCurveTo(13, 4, 18, 2);
      c.quadraticCurveTo(25, 4, 23, 14);
      c.quadraticCurveTo(22, 21, 26, 22);
      c.closePath();
      c.fillStyle = body;
      c.fill();
      c.strokeStyle = edge;
      c.lineWidth = 1.5;
      c.stroke();
      for (const side of [-1, 1]) {
        const tip = 19 + side * 4 + bob * 0.6;
        this.line(
          [
            [19 + side * 2, 3],
            [tip, -8],
          ],
          body,
          2.5,
        );
        this.ellipse(tip, -10, 3, 3, "#fff", edge, 1);
        this.ellipse(tip + 0.5, -10, 1.4, 1.4, "#2f3b36");
      }
      smile(19, 10, edge);
      this.ellipse(-4, 5, 16, 15, "#8fb46e", "#5e8650");
      this.ellipse(-4, 5, 11, 10, "#a5c482");
      const glow = 0.5 + Math.sin(time * 3) * 0.2;
      this.ellipse(-4, 6, 6, 5.5, `rgba(255,232,140,${glow})`);
      this.ellipse(-4, 6, 2.2, 2.2, "#fff3b8");
      // A sprout growing from a pinch of soil on top.
      this.ellipse(-4, -10, 6, 2.5, "#7a5a40");
      this.leaf(-4, -11, 6, -0.6 + bob * 0.05, "#7cc061");
      this.leaf(-4, -11, 6, 0.6 + bob * 0.05, "#7cc061");
    } else {
      const brown = "#b9774d",
        edge = "#83502f";
      // Sorrel: one ear up, one flopped; a fluffy tail; a green bandana.
      this.ellipse(-12, 15, 5, 5, "#f6e3c4");
      c.save();
      c.translate(-4, -12);
      c.rotate(-0.15 + bob * 0.03);
      this.ellipse(0, -11, 4.5, 12, brown, edge);
      this.ellipse(0, -11, 2.2, 8.5, "#f1b3a8");
      c.restore();
      c.save();
      c.translate(6, -13);
      c.rotate(1.15);
      this.ellipse(0, -9, 4.5, 11, brown, edge);
      c.restore();
      this.ellipse(0, 12, 10.5, 11, brown, edge);
      this.ellipse(1, 14, 5.5, 7, "#f6e3c4");
      for (const side of [-1, 1])
        this.ellipse(side * 6.5, 22, 5.5, 2.2, "#f6e3c4", edge, 1.2);
      this.ellipse(0, -5, 11, 10, brown, edge);
      this.ellipse(0, -1, 6.5, 4.5, "#f6e3c4");
      eyes(0, -6, 4.8);
      this.ellipse(0, -2.5, 1.6, 1.2, "#e08c8c");
      smile(0, -0.5, edge);
      c.beginPath();
      c.moveTo(-9, 3);
      c.lineTo(9, 3);
      c.lineTo(3, 12);
      c.closePath();
      c.fillStyle = "#6fae5c";
      c.fill();
      this.ellipse(2, 6.5, 1.6, 1.6, "#e9d86a");
    }
    c.restore();
  }

  private homeGrove(game: Game, time: number) {
    if (game.level.kind !== "grove") return;
    const c = this.ctx;
    const total = Math.max(0, Math.min(12, game.rescuedTotal));
    const span = Math.min(1500, game.level.width - 430);
    for (let i = 0; i < 12; i++) {
      const x = 270 + (i * span) / 12;
      if (!this.visible(x, 90)) continue;
      const lit = i < total;
      const y = 430;
      const bob = Math.sin(time * 1.5 + i * 2) * 4;
      this.rounded(
        x - 25,
        y - 47,
        50,
        47,
        16,
        lit ? "#b8c88a" : "#9fab91",
        "#6f8a68",
      );
      this.ellipse(x, y - 47, 35, 14, lit ? "#d6b57c" : "#a3a58a", "#7f8a68");
      for (let stripe = 0; stripe < 4; stripe++)
        this.line(
          [
            [x - 20 + stripe * 13, y - 54],
            [x - 19 + stripe * 13, y - 44],
          ],
          "#a58d67",
          2,
        );
      this.rounded(x - 8, y - 25, 16, 25, 8, lit ? "#fff0a0" : "#688774");
      if (lit) {
        this.ellipse(x, y - 18, 26, 26, "rgba(255,235,143,.17)");
        this.firefly(x + Math.sin(time + i) * 18, y - 73 + bob, time + i, 0.85);
      }
      this.leaf(x + 4, y - 60, 11, 0.5, lit ? "#7ca760" : "#8b9f7a");
    }
    if (
      game.groveDecorations.includes("pinwheel_garland") ||
      game.groveDecorations.includes("cosmetic.pinwheel_garland")
    ) {
      const start = 220,
        end = Math.min(game.level.width - 150, 1450);
      this.line(
        [
          [start, 270],
          [(start + end) / 2, 310],
          [end, 270],
        ],
        "#a67d55",
        3,
      );
      for (let i = 0; i < 9; i++) {
        const x = start + ((end - start) * i) / 8;
        if (!this.visible(x, 30)) continue;
        const y = 270 + 40 * (1 - Math.abs(i - 4) / 4);
        c.save();
        c.translate(x, y);
        c.rotate(time * 0.8 + i);
        for (let j = 0; j < 4; j++) {
          c.rotate(Math.PI / 2);
          this.ellipse(0, -9, 5, 9, j % 2 ? "#f4ab99" : "#ffe18c");
        }
        this.ellipse(0, 0, 3, 3, "#ad8056");
        c.restore();
      }
    }
    if (game.groveDecorations.includes("lanterns")) {
      for (let i = 0; i < 5; i++) {
        const x = 205 + i * Math.min(370, game.level.width / 5);
        if (!this.visible(x, 50)) continue;
        this.line(
          [
            [x, 430],
            [x, 270],
            [x + 29, 267],
            [x + 29, 286],
          ],
          "#78976b",
          5,
        );
        this.rounded(x + 18, 286, 23, 32, 9, "#fff0ac", "#ac9764");
        this.ellipse(x + 29, 302, 31, 35, "rgba(255,234,142,.12)");
        this.firefly(x + 29, 300, time, 0.45);
      }
    }
    if (game.groveDecorations.includes("flowers")) {
      for (let i = 0; i < 24; i++) {
        const x = 180 + (i * (game.level.width - 350)) / 24;
        if (!this.visible(x, 24)) continue;
        const yy = 423 - (i % 3) * 9;
        this.line(
          [
            [x, 430],
            [x, yy - 20],
          ],
          "#6fa168",
          2.5,
        );
        for (let j = 0; j < 5; j++) {
          const a = (j * Math.PI * 2) / 5;
          this.ellipse(
            x + Math.cos(a) * 7,
            yy - 20 + Math.sin(a) * 7,
            5,
            5,
            i % 2 ? "#ebabc5" : "#ffe8a1",
          );
        }
        this.ellipse(x, yy - 20, 4, 4, "#b48d57");
      }
    }
    if (game.groveDecorations.includes("fountain")) {
      const x = game.level.width - 130;
      if (this.visible(x, 95)) {
        this.ellipse(x, 424, 63, 15, "#8badac", "#5e9396");
        this.ellipse(x, 420, 55, 10, "#b2e1d6");
        this.rounded(x - 9, 366, 18, 55, 7, "#a0b9a9");
        this.ellipse(x, 366, 34, 8, "#bbd1b6", "#819f90");
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.moveTo(x, 365);
          c.quadraticCurveTo(
            x - 40 + i * 20,
            305 - Math.sin(time * 2 + i) * 3,
            x - 45 + i * 22,
            414,
          );
          c.strokeStyle = "#cff7e5";
          c.lineWidth = 2;
          c.stroke();
        }
      }
    }
    c.save();
    c.font = "700 14px 'DM Sans', sans-serif";
    c.textAlign = "center";
    if (this.visible(130, 120)) {
      this.rounded(47, 300, 166, 38, 10, "#fff3ce", "#86a67b");
      c.fillStyle = "#496e54";
      c.fillText(`${total} / 12 lights home`, 130, 324);
    }
    c.restore();
    const creatureHomes = [500, 880, 1420];
    CREATURES.forEach((creature, index) => {
      const x = creatureHomes[index];
      if (game.rescuedCreatures.includes(creature.id) && this.visible(x, 45))
        this.creature(creature.kind, x, 410, time);
    });
    for (const friend of FRIENDS)
      if (
        game.rescuedCreatures.includes(friend.id) &&
        this.visible(friend.homeX, 60)
      )
        this.friend(
          friend.kind,
          friend.homeX,
          // Wisp flutters above the grass; everyone else stands on it.
          friend.kind === "bat" ? 372 : 408,
          time,
        );
  }

  private hiveBell(x: number, y: number, completed: boolean, time: number) {
    const cx = x + 30;
    this.line(
      [
        [cx, y - 120],
        [cx, y - 98],
      ],
      "#967047",
      4,
    );
    this.ellipse(
      cx,
      y - 72,
      23,
      28,
      completed ? "#f5d98e" : "#ffdf76",
      "#ae7b44",
    );
    this.rounded(cx - 26, y - 57, 52, 9, 4, "#c38c4e");
    this.ellipse(cx, y - 46, 6, 6, "#9c6c41");
    if (!completed)
      this.ellipse(
        cx,
        y - 72,
        37 + Math.sin(time * 3) * 3,
        37,
        "rgba(255,243,158,.2)",
      );
  }

  private thornGroveScenery(game: Game, time: number) {
    const boss = game.boss;
    if (!boss) return;
    const c = this.ctx;
    const center = (boss.minX + boss.maxX) / 2;
    const ground = boss.groundY;

    // A dim, round opening and two ancient trees frame the arena without
    // covering the crown, the seed warnings, or the real platforms.
    this.ellipse(center, ground - 238, 360, 232, "rgba(247,216,153,.16)");
    this.ellipse(center, ground - 238, 300, 192, "rgba(255,236,176,.1)");
    c.save();
    c.lineCap = "round";
    for (const side of [-1, 1]) {
      const x = center + side * 560;
      c.strokeStyle = "rgba(60,85,66,.5)";
      c.lineWidth = 72;
      c.beginPath();
      c.moveTo(x + side * 28, ground + 10);
      c.bezierCurveTo(
        x - side * 35,
        ground - 115,
        x - side * 25,
        95,
        x + side * 8,
        -35,
      );
      c.stroke();
      c.lineWidth = 34;
      c.beginPath();
      c.moveTo(x - side * 5, 160);
      c.bezierCurveTo(
        x - side * 100,
        100,
        center + side * 210,
        66,
        center + side * 65,
        60,
      );
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const leafX = center + side * (160 + i * 92);
        this.ellipse(leafX, 42 + (i % 2) * 16, 70, 38, "rgba(51,92,65,.52)");
      }
    }
    c.restore();
    for (let i = 0; i < 8; i++) {
      const x = center - 360 + i * 102;
      const y =
        ground - 260 + Math.sin(time * 0.9 + i * 2.1) * 12 + (i % 3) * 32;
      this.ellipse(x, y, 3, 3, "rgba(255,234,155,.55)");
    }
  }

  private expansionScenery(game: Game, time: number) {
    if (game.level.theme !== "windmill" && game.level.theme !== "hive") return;
    if (game.level.castle) return;
    const c = this.ctx;
    if (game.level.theme === "hive") {
      // Honeycomb is background only; collision remains visible in the foreground.
      c.save();
      c.globalAlpha = 0.22;
      c.strokeStyle = "#fff0af";
      c.lineWidth = 3;
      for (
        let x = Math.floor(this.cameraX / 80) * 80 - 80;
        x < this.cameraX + this.viewportWidth + 80;
        x += 80
      )
        for (let y = 90; y < 430; y += 70) {
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const px = x + Math.cos(a) * 39;
            const py = y + (Math.floor(x / 80) % 2) * 35 + Math.sin(a) * 39;
            if (!i) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.closePath();
          c.stroke();
        }
      c.restore();
    } else {
      // Each distant mill has a different silhouette. They remain pale and
      // behind the real terrain so no background roof looks like a platform.
      for (
        let x = Math.floor(this.cameraX / 1000) * 1000 + 650;
        x < this.cameraX + this.viewportWidth + 400;
        x += 1000
      ) {
        // The last stretch leads into the grove; keep retired windmills out
        // of its background as well as out of the playable encounter.
        if (game.level.contentId === "world.windmill-garden" && x >= 9600)
          continue;
        const variant = Math.abs(Math.round((x - 650) / 1000)) % 3;
        const width = [68, 80, 56][variant];
        const top = [288, 310, 265][variant];
        c.save();
        c.globalAlpha = 0.74;
        this.rounded(x - width / 2, top, width, 420 - top, 15, "#e9cd93");
        this.ellipse(x, top, width / 2 + 1, 14, "#be8d61");
        this.rounded(x - 10, top + 35, 20, 25, 8, "#a9d8bf", "#b58a5d");
        this.line(
          [
            [x, top + 36],
            [x, top + 58],
          ],
          "#fff0c1",
          2,
        );
        this.rounded(x - 11, 379, 22, 42, 10, "#b88b65");
        c.save();
        c.translate(x, top - 20);
        c.rotate(time * (variant === 1 ? -0.19 : 0.25));
        for (let i = 0; i < 4; i++) {
          c.rotate(Math.PI / 2);
          this.rounded(-8, -74, 16, 64, 7, "#fff0c7", "#bd9865");
          this.line(
            [
              [-4, -64],
              [4, -51],
              [-4, -38],
              [4, -25],
            ],
            "#d8ba80",
            1.5,
          );
        }
        this.ellipse(0, 0, 9, 9, "#c38c55");
        c.restore();
        c.restore();
      }
    }
  }

  /** A leafy backdrop and a simple arrow lead toward the final grove. */
  private groveApproachScenery(game: Game, time: number) {
    if (game.level.contentId !== "world.windmill-garden") return;
    const c = this.ctx;
    const groveX = 11780;
    if (this.visible(groveX, 300)) {
      // The branches are backdrop only: they add no gate or collision.
      c.save();
      c.globalAlpha = 0.34;
      c.strokeStyle = "#7c9f70";
      c.lineWidth = 34;
      c.lineCap = "round";
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(groveX + side * 182, 470);
        c.bezierCurveTo(
          groveX + side * 160,
          300,
          groveX + side * 124,
          185,
          groveX,
          150,
        );
        c.stroke();
        for (let i = 0; i < 4; i++)
          this.ellipse(
            groveX + side * (42 + i * 50),
            162 + (i % 2) * 18,
            45,
            25,
            i % 2 ? "#a2c986" : "#b9d694",
          );
      }
      c.restore();
      for (let i = 0; i < 5; i++)
        this.ellipse(
          groveX - 105 + i * 53,
          225 + (i % 3) * 28 + Math.sin(time * 1.3 + i) * 5,
          3,
          3,
          "rgba(255,239,176,.65)",
        );
    }
    const signX = 11365;
    if (!this.visible(signX, 100)) return;
    // The arrow is only a backdrop: it has no collision or interaction.
    this.line(
      [
        [signX, 430],
        [signX, 338],
      ],
      "#a97c50",
      6,
    );
    this.rounded(signX - 28, 337, 70, 35, 8, "#fff0c7", "#a77950");
    this.line(
      [
        [signX - 14, 354],
        [signX + 23, 354],
        [signX + 14, 346],
      ],
      "#4f8660",
      4,
    );
    this.line(
      [
        [signX + 23, 354],
        [signX + 14, 362],
      ],
      "#4f8660",
      4,
    );
  }

  private expansionObjects(game: Game, time: number) {
    const c = this.ctx;
    const state = game.puzzleState;
    for (const fountain of game.level.featherFountains ?? []) {
      if (!this.visible(fountain.x, 60)) continue;
      const { x, y } = fountain;
      this.ellipse(x, y - 3, 28, 7, "#8bbcb0", "#578b7d");
      this.ellipse(x, y - 7, 24, 5, "#c9f3df");
      this.line(
        [
          [x, y - 8],
          [x, y - 39],
        ],
        "#8ccbbd",
        5,
      );
      this.ellipse(x, y - 39, 19, 5, "#d8f6df", "#75ae9e");
      c.save();
      c.translate(x, y - 50 + Math.sin(time * 3) * 3);
      c.rotate(-0.35);
      this.leaf(0, 0, 20, 0, "#f3fff2");
      this.line(
        [
          [0, 0],
          [0, -24],
        ],
        "#70bdb0",
        2,
      );
      c.restore();
      this.ellipse(x, y - 66, 25, 25, "rgba(227,255,241,.22)");
    }
    const open: Record<string, boolean> = {
      vane: state.vaneGateOpen,
      sluice: state.sluiceGateOpen,
      light: state.lightGateOpen,
      workshop: state.workshopGateOpen,
      hive: state.flowers.A && state.flowers.B && state.flowers.C,
    };
    for (const gate of game.level.gates ?? []) {
      if (!this.visible(gate.x, gate.w + 30)) continue;
      const gateBody =
        game.level.theme === "cloud"
          ? "#abcfd1"
          : game.level.theme === "grotto"
            ? "#608c85"
            : "#ad8151";
      const gateBorder =
        game.level.theme === "cloud"
          ? "#799fa9"
          : game.level.theme === "grotto"
            ? "#3f716d"
            : "#75553c";
      const gateBands =
        game.level.theme === "cloud"
          ? "#e6f8eb"
          : game.level.theme === "grotto"
            ? "#b7e6cc"
            : "#e4be7b";
      if (open[gate.condition]) {
        this.rounded(gate.x, gate.y, gate.w, 8, 4, gateBody);
      } else {
        this.rounded(gate.x, gate.y, gate.w, gate.h, 5, gateBody, gateBorder);
        for (let y = gate.y + 18; y < gate.y + gate.h; y += 38)
          this.line(
            [
              [gate.x + 3, y],
              [gate.x + gate.w - 3, y],
            ],
            gateBands,
            4,
          );
      }
    }
    for (const portal of game.level.portals ?? []) {
      if (!this.visible(portal.x, 100)) continue;
      const isSky = portal.target.startsWith("sky-");
      if (isSky) {
        this.ellipse(
          portal.x + portal.w / 2,
          portal.y - 36,
          portal.w * 0.8,
          48,
          "rgba(255,247,190,.20)",
        );
      }
      const ready =
        !portal.requires ||
        (portal.requires === "discovery"
          ? state.hiveDiscovered
          : game.secretCompleted);
      this.rounded(
        portal.x,
        portal.y - 67,
        portal.w,
        67,
        24,
        ready ? "#8b623d" : "#b58d5a",
        "#775439",
      );
      this.rounded(
        portal.x + 7,
        portal.y - 58,
        portal.w - 14,
        58,
        20,
        ready ? "#ffdc7b" : "#c3a277",
      );
      this.ellipse(
        portal.x + portal.w / 2,
        portal.y - 35,
        12,
        16,
        ready ? "#fff3b4" : "#987b58",
      );
      c.save();
      c.font = "bold 12px sans-serif";
      c.textAlign = "center";
      c.fillStyle = "#684b38";
      c.fillText(
        portal.target === "return"
          ? "BACK"
          : isSky
            ? "SKY"
            : portal.target === "cloud"
              ? "CLOUD"
              : portal.target === "moonpool"
                ? "MOONPOOL"
                : "HIVE",
        portal.x + portal.w / 2,
        portal.y - 12,
      );
      c.restore();
    }
    if (
      game.level.flightTarget &&
      this.visible(game.level.flightTarget.x, 50)
    ) {
      const t = game.level.flightTarget;
      this.flowerRing(t.x, t.y, t.radius, "#ffdf76", time);
    }
    for (const hoop of game.level.hoops ?? []) {
      if (this.visible(hoop.x, 70))
        this.flowerRing(
          hoop.x,
          hoop.y,
          32,
          game.minigame.hoops.has(hoop.id) ? "#c6e5a7" : "#ffcf82",
          time,
        );
    }
    for (const pad of game.level.landingPads ?? []) {
      if (!this.visible(pad.x, pad.w + 20)) continue;
      this.rounded(
        pad.x,
        pad.y - 7,
        pad.w,
        9,
        5,
        game.minigame.pads.has(pad.id) ? "#b8d99b" : "#ffdb82",
        "#a77d53",
      );
      for (let x = pad.x + 15; x < pad.x + pad.w; x += 30)
        this.ellipse(x, pad.y - 3, 4, 3, "#fff5ca");
    }
  }

  private flowerRing(
    x: number,
    y: number,
    radius: number,
    color: string,
    time: number,
  ) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = color;
    c.lineWidth = 7;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.sin(time * 2) * 0.03;
      this.ellipse(
        x + Math.cos(a) * radius,
        y + Math.sin(a) * radius,
        5,
        5,
        i % 2 ? "#fff3bb" : "#f4a9b5",
      );
    }
    c.restore();
  }

  /** Floating text (combo bonuses, acorns) and the guardian's name card. */
  private worldOverlays(game: Game, dt: number) {
    const c = this.ctx;
    for (const pop of this.popups) {
      pop.life -= dt;
      pop.y -= 40 * dt;
    }
    this.popups = this.popups.filter((pop) => pop.life > 0);
    c.save();
    c.textAlign = "center";
    for (const pop of this.popups) {
      c.globalAlpha = Math.min(1, pop.life / 0.4);
      c.font = `800 ${pop.size}px 'DM Sans', sans-serif`;
      c.lineWidth = 4;
      c.strokeStyle = "rgba(40,60,40,.55)";
      c.strokeText(pop.text, pop.x, pop.y);
      c.fillStyle = pop.color;
      c.fillText(pop.text, pop.x, pop.y);
    }
    c.restore();
    const banner = this.bossBanner;
    if (!banner) return;
    banner.life -= dt;
    if (banner.life <= 0) {
      this.bossBanner = null;
      return;
    }
    // Slides in, holds, and fades: the guardian's name across the screen.
    const t = 2.4 - banner.life;
    const alpha = Math.min(1, t / 0.25, banner.life / 0.4);
    const x = this.cameraX + this.viewportWidth / 2;
    const y =
      this.cameraY +
      this.viewportHeight * 0.3 -
      (1 - Math.min(1, t / 0.25)) * 20;
    c.save();
    c.globalAlpha = alpha;
    c.font = "800 34px 'DM Sans', sans-serif";
    const [title, ...rest] = banner.name.split(", ");
    const width = Math.max(260, c.measureText(title!).width + 80);
    this.rounded(
      x - width / 2,
      y - 48,
      width,
      92,
      22,
      "rgba(255,248,224,.94)",
      "#c99a4a",
    );
    c.textAlign = "center";
    c.fillStyle = "#7a3f2a";
    c.fillText(title!, x, y);
    if (rest.length) {
      c.font = "700 16px 'DM Sans', sans-serif";
      c.fillStyle = "#9a6a3a";
      c.fillText(rest.join(", "), x, y + 26);
    }
    c.restore();
  }

  /** The chasing flood: a churning wall of water rolling in from the left. */
  private floodWall(front: number, time: number) {
    const left = this.cameraX - 40;
    if (front < left) return;
    const c = this.ctx;
    const top = this.cameraY - 20;
    const bottom = this.cameraY + this.viewportHeight + 20;
    const water = c.createLinearGradient(front - 200, 0, front, 0);
    water.addColorStop(0, "rgba(40,120,150,.92)");
    water.addColorStop(1, "rgba(90,180,200,.85)");
    c.fillStyle = water;
    c.beginPath();
    c.moveTo(left, top);
    for (let y = top; y <= bottom; y += 20)
      c.lineTo(front + Math.sin(time * 6 + y * 0.05) * 10, y);
    c.lineTo(left, bottom);
    c.closePath();
    c.fill();
    // Foam along the leading edge.
    for (let y = top; y <= bottom; y += 26)
      this.ellipse(
        front + Math.sin(time * 6 + y * 0.05) * 10,
        y,
        10 + Math.sin(time * 9 + y) * 3,
        8,
        "rgba(235,252,255,.85)",
      );
  }

  private darkCanvas: HTMLCanvasElement | null = null;
  /** Night: everything is dark except circles of light around Pip, lit
   * lanterns and fireflies. Drawn over the scene in screen space. */
  private nightDarkness(game: Game, time: number) {
    const c = this.ctx;
    const w = this.canvas.width,
      h = this.canvas.height;
    if (!this.darkCanvas) this.darkCanvas = document.createElement("canvas");
    const dark = this.darkCanvas;
    if (dark.width !== w || dark.height !== h) {
      dark.width = w;
      dark.height = h;
    }
    const d = dark.getContext("2d")!;
    const k = w / this.viewportWidth;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, w, h);
    d.fillStyle = "rgba(8,10,32,0.86)";
    d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = "destination-out";
    const light = (x: number, y: number, r: number, strength = 1) => {
      const sx = (x - this.cameraX) * k,
        sy = (y - this.cameraY) * k,
        sr = r * k;
      const g = d.createRadialGradient(sx, sy, sr * 0.15, sx, sy, sr);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(0.6, `rgba(0,0,0,${strength * 0.75})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g;
      d.beginPath();
      d.arc(sx, sy, sr, 0, Math.PI * 2);
      d.fill();
    };
    const p = game.player;
    const flicker = Math.sin(time * 7) * 4;
    light(p.x + p.w / 2, p.y + p.h / 2, 200 + flicker);
    for (const l of game.lanterns)
      light(l.x, l.y - 60, l.lit ? 260 : 46, l.lit ? 1 : 0.7);
    for (const f of game.fireflies) if (!f.collected) light(f.x, f.y, 70, 0.8);
    for (const a of game.acorns) if (!a.collected) light(a.x, a.y, 28, 0.6);
    if (game.boss && game.boss.state !== "defeated")
      light(game.boss.x + game.boss.w / 2, game.boss.y + 20, 90, 0.6);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(dark, 0, 0);
    c.restore();
  }

  /** A garden lantern on a post: dim until lit, then warm and glowing. */
  private lanternPost(x: number, ground: number, lit: boolean, time: number) {
    const c = this.ctx;
    this.line(
      [
        [x, ground],
        [x, ground - 70],
        [x + 12, ground - 78],
      ],
      "#5a4a3a",
      4,
    );
    const glow = lit ? 0.75 + Math.sin(time * 5 + x) * 0.1 : 0.25;
    if (lit)
      this.ellipse(
        x + 12,
        ground - 62,
        26,
        26,
        `rgba(255,214,120,${glow * 0.35})`,
      );
    this.rounded(
      x + 3,
      ground - 76,
      18,
      24,
      6,
      lit ? "#ffd47a" : "#6a6680",
      "#4a3a30",
    );
    this.ellipse(x + 12, ground - 64, 4, 6, lit ? "#fff6cf" : "#8e8aa6");
    c.save();
    c.restore();
  }

  /** A hidden acorn: glossy brown with a little cap and a glint. */
  private acorn(x: number, y: number, time: number, index: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y + Math.sin(time * 2.3 + index) * 3);
    c.rotate(Math.sin(time * 1.7 + index) * 0.12);
    this.ellipse(0, 2, 18, 18, "rgba(255,220,140,.22)");
    this.ellipse(0, 4, 9, 11, "#b9773a", "#6e4422", 2);
    this.ellipse(-3, 1, 2.5, 4, "rgba(255,230,190,.6)");
    this.rounded(-11, -9, 22, 9, 4, "#7a5230", "#4e321c");
    for (let i = -8; i <= 8; i += 4) this.ellipse(i, -6, 1.6, 1.6, "#9c6d42");
    this.line(
      [
        [0, -9],
        [2, -14],
      ],
      "#4e321c",
      2,
    );
    c.restore();
  }

  private bossCreature(game: Game, time: number) {
    const b = game.boss;
    if (!b || !this.visible(b.x + b.w / 2, b.w + 60)) return;
    const c = this.ctx;
    // No authored level uses the retired Mill Keeper encounter.
    if (b.kind === "millkeeper") return;
    if (b.kind === "heartwood") {
      this.heartwoodGuardian(game, time);
      return;
    }
    const defeated = b.state === "defeated";
    const warning = b.state === "warning";
    const recovering = b.state === "recover";
    const cx = b.x + b.w / 2,
      feet = b.y + b.h;
    if (defeated) {
      this.ellipse(cx, feet - 6, b.w * 0.45, 9, "rgba(255,241,173,.4)");
      for (let i = 0; i < 3; i++)
        this.firefly(
          cx + Math.sin(time + i * 2) * 26,
          feet - 25 - i * 17,
          time,
          0.65,
        );
      return;
    }
    this.ellipse(cx, b.groundY - 1, b.w * 0.46, 5, "rgba(38,60,53,.2)");
    // The spider's silk thread, whenever it is off the floor to rest.
    if (b.kind === "spider" && recovering && feet < b.groundY - 4)
      this.line(
        [
          [cx, b.y + 8],
          [cx, b.y - 520],
        ],
        "rgba(240,244,255,.85)",
        2,
      );
    if (warning) {
      const direction = b.facing;
      const start = cx + direction * b.w * 0.55;
      const end =
        b.kind === "spider"
          ? start + direction * 170
          : b.attackTargetX + b.w / 2;
      c.save();
      c.globalAlpha = 0.8 + Math.sin(time * 7) * 0.08;
      this.line(
        [
          [start, b.groundY - 5],
          [end, b.groundY - 5],
        ],
        "#c97050",
        6,
      );
      this.line(
        [
          [end - direction * 13, b.groundY - 14],
          [end, b.groundY - 5],
          [end - direction * 13, b.groundY + 3],
        ],
        "#c97050",
        4,
      );
      for (let i = 1; i <= 3; i++) {
        const marker = start + ((end - start) * i) / 4;
        this.line(
          [
            [marker - direction * 6, b.groundY - 11],
            [marker, b.groundY - 5],
            [marker - direction * 6, b.groundY + 1],
          ],
          "#fff1c0",
          2.5,
        );
      }
      if (b.kind === "moth") {
        c.setLineDash([5, 9]);
        this.line(
          [
            [cx, b.y + b.h / 2],
            [end, b.groundY - b.h / 2],
          ],
          "#b4d4ee",
          3,
        );
        c.setLineDash([]);
        this.ellipse(end, b.groundY - 4, b.w / 2, 7, "rgba(177,207,234,.3)");
      }
      c.restore();
      // A burrowed mole shows its warning above the floor, not inside it.
      const bubbleY = b.kind === "mole" ? Math.min(b.y, b.groundY - 70) : b.y;
      this.rounded(cx - 12, bubbleY - 41, 24, 29, 9, "#fff0ba", "#be7652");
      c.save();
      c.font = "800 21px 'DM Sans', sans-serif";
      c.textAlign = "center";
      c.fillStyle = "#a35b44";
      c.fillText("!", cx, bubbleY - 19);
      c.restore();
    }
    if (recovering) {
      this.ellipse(cx, b.y - 5, b.w * 0.36, 5, "rgba(255,248,176,.65)");
      for (let i = 0; i < 3; i++) {
        const a = time * 3 + (i * Math.PI * 2) / 3;
        this.starPath(cx + Math.cos(a) * 25, b.y - 21 + Math.sin(a) * 5, 5);
        c.fillStyle = "#ffe18b";
        c.fill();
      }
    }
    if (b.kind === "mole" && b.y + b.h > b.groundY + 1) {
      // Burrowing: a moving mound of rubble, with crystals poking through,
      // and a crack where it will burst up.
      const mx = cx;
      this.ellipse(mx, b.groundY + 2, 42, 14, "#5b4f6c", "#3c3350", 2);
      for (let i = 0; i < 3; i++)
        this.ellipse(
          mx - 24 + i * 22 + Math.sin(time * 20 + i) * 2,
          b.groundY - 6 - (i % 2) * 4,
          7,
          5,
          "#7d6f92",
        );
      const tx = b.attackTargetX + b.w / 2;
      const shake = Math.sin(time * 30) * 1.5;
      c.save();
      c.strokeStyle = "#f5e3a6";
      c.lineWidth = 3;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(tx - 30 + shake, b.groundY);
      c.lineTo(tx - 12, b.groundY - 5);
      c.lineTo(tx + 4, b.groundY + 1);
      c.lineTo(tx + 18, b.groundY - 6);
      c.lineTo(tx + 32 + shake, b.groundY);
      c.stroke();
      c.restore();
    }
    if (b.kind === "salamander" && b.y + b.h > b.groundY + 1) {
      // Under the island: glowing bubbles rise where it will surface.
      const tx = b.attackTargetX + b.w / 2;
      for (let i = 0; i < 4; i++) {
        const bob = (time * 2 + i * 0.25) % 1;
        this.ellipse(
          tx - 36 + i * 24,
          b.groundY - 4 - bob * 14,
          5 - bob * 3,
          5 - bob * 3,
          `rgba(255,150,60,${0.8 - bob * 0.6})`,
        );
      }
      this.ellipse(tx, b.groundY - 1, 48, 6, "rgba(255,120,40,.45)");
    }
    c.save();
    if (b.kind === "mole" || b.kind === "salamander") {
      // Hide whatever part of the guardian is still under the floor.
      c.beginPath();
      c.rect(b.x - 200, b.groundY - 600, b.w + 400, 600);
      c.clip();
    }
    if (b.skid > 0)
      // Dust kicked up by a skid, a slam or a flinch.
      for (let i = 0; i < 4; i++) {
        const k = 1 - b.skid / 0.4;
        this.ellipse(
          cx - b.facing * (b.w / 2 + 6 + i * 12 + k * 18),
          feet - 6 - i * 3 - k * 8,
          9 + k * 6,
          6 + k * 4,
          `rgba(235,228,210,${0.55 * (b.skid / 0.4)})`,
        );
      }
    if (b.fury > 0) {
      // A new phase: a red flare as it rears up and roars.
      const glow = Math.sin((b.fury / 0.9) * Math.PI);
      this.ellipse(
        cx,
        feet - b.h / 2,
        b.w * 0.85,
        b.h * 0.85,
        `rgba(255,90,70,${0.3 * glow})`,
      );
    }
    c.translate(cx, feet);
    c.scale(b.facing < 0 ? -1 : 1, 1);
    // Body language: a flinch shakes it back, a roar rears it up, a wind-up
    // crouches it, and the first moment of an attack stretches it forward.
    if (b.stagger > 0) {
      c.translate(Math.sin(time * 70) * 3 - 4, 0);
      c.rotate(-0.08);
    }
    if (b.fury > 0) c.rotate(-0.16 * Math.sin((b.fury / 0.9) * Math.PI));
    if (warning && b.stateTime < 0.28 && b.kind !== "owl" && b.kind !== "moth")
      c.scale(1.08, 0.9);
    else if (b.state === "attack" && b.attackElapsed < 0.15)
      c.scale(0.94, 1.07);
    c.scale(b.w / 82, b.h / 58);
    if (b.invulnerable > 0) c.globalAlpha = 0.65 + Math.sin(time * 16) * 0.15;
    const stride = Math.sin(time * (b.state === "attack" ? 25 : 9)) * 3;
    const shell =
      b.phase === 3 ? "#b56d72" : b.phase === 2 ? "#bf895a" : "#809c70";
    if (b.kind === "stag") {
      for (let i = 0; i < 3; i++)
        this.line(
          [
            [-27 + i * 23, -17],
            [-33 + i * 23, -5 + (i % 2 ? stride : -stride)],
            [-23 + i * 23, -2],
          ],
          "#526b51",
          5,
        );
      this.ellipse(-4, -30, 34, 25, shell, "#4f6b52", 3);
      this.ellipse(-13, -39, 17, 9, "#bed39b");
      this.line(
        [
          [-2, -52],
          [3, -12],
        ],
        "#536f52",
        3,
      );
      this.ellipse(25, -23, 16, 20, "#849867", "#4f6b52", 2);
      this.line(
        [
          [31, -34],
          [47, -46],
          [44, -55],
        ],
        "#ddbc7d",
        6,
      );
      this.line(
        [
          [33, -27],
          [53, -29],
          [57, -39],
        ],
        "#ddbc7d",
        6,
      );
      this.line(
        [
          [47, -46],
          [53, -47],
        ],
        "#ddbc7d",
        4,
      );
    } else if (b.kind === "spider") {
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++) {
          this.line(
            [
              [side * 18, -24 - i * 3],
              [side * (37 + i * 3), -38 + i * 9],
              [side * (35 + i * 5), -4 + (i % 2 ? stride : -stride)],
            ],
            "#715782",
            4,
          );
        }
      this.ellipse(-4, -34, 29, 23, "#b99bc4", "#725784", 3);
      this.ellipse(-10, -41, 13, 7, "#d7c5dc");
      this.ellipse(22, -23, 18, 18, "#9b7bac", "#725784", 2);
      for (let i = 0; i < 3; i++)
        this.ellipse(-15 + i * 13, -30, 4, 4, "#eee0c6");
      this.line(
        [
          [27, -9],
          [26, -3],
        ],
        "#fff0d5",
        3,
      );
      this.line(
        [
          [35, -12],
          [36, -6],
        ],
        "#fff0d5",
        3,
      );
    } else if (b.kind === "ram") {
      const charge = b.state === "attack";
      const lean = charge ? 6 : 0;
      // A storm ram: grey storm-cloud fleece, curled horns crackling with
      // light, and stamping hooves.
      for (const fx of [-24, -10, 12, 26])
        this.rounded(
          fx - 3,
          -18 + (charge ? Math.sin(time * 30 + fx) * 3 : 0),
          7,
          18,
          3,
          "#3e4250",
        );
      for (const [dx, dy, r] of [
        [-22, -34, 18],
        [-4, -40, 20],
        [14, -34, 18],
        [-12, -24, 18],
        [8, -24, 18],
      ] as const)
        this.ellipse(dx, dy, r, r * 0.9, "#c9ced9", "#7d8496", 2);
      this.ellipse(32 + lean, -32, 13, 11, "#5a5f6e", "#3e4250", 2);
      c.save();
      c.strokeStyle = "#e8d48a";
      c.lineWidth = 5;
      c.lineCap = "round";
      c.beginPath();
      c.arc(28 + lean, -40, 9, Math.PI * 1.1, Math.PI * 2.4);
      c.stroke();
      if (warning || charge) {
        c.strokeStyle = `rgba(255,245,170,${0.5 + Math.sin(time * 25) * 0.4})`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(22 + lean, -52);
        c.lineTo(28 + lean, -60);
        c.lineTo(26 + lean, -55);
        c.lineTo(34 + lean, -64);
        c.stroke();
      }
      c.restore();
      this.ellipse(38 + lean, -34, 3, 3.5, "#fff4d4");
      this.ellipse(39 + lean, -34, 1.5, 2.2, "#283040");
    } else if (
      b.kind === "bear" &&
      b.state === "attack" &&
      b.variant === "roll"
    ) {
      // Curled into a rolling snowball.
      c.save();
      c.scale(82 / b.w, 58 / b.h);
      c.translate(0, -35);
      c.rotate(time * 14);
      this.ellipse(0, 0, 35, 35, "#f4f8fb", "#9fb2c4", 3);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        this.ellipse(Math.cos(a) * 20, Math.sin(a) * 20, 6, 4, "#d6e2ec");
      }
      this.line(
        [
          [-30, 8],
          [30, -8],
        ],
        "#d9534f",
        6,
      );
      c.restore();
    } else if (b.kind === "bear") {
      const rear = warning ? Math.abs(Math.sin(time * 6)) * 6 : 0;
      // A big white bear with a scarf, rearing as it winds up a slam.
      for (const fx of [-22, 18])
        this.ellipse(fx, -6, 12, 8, "#e8eef4", "#9fb2c4", 2);
      this.ellipse(-4, -30 - rear, 36, 28, "#f4f8fb", "#9fb2c4", 3);
      this.ellipse(22, -50 - rear, 18, 16, "#f4f8fb", "#9fb2c4", 3);
      for (const ex of [10, 30])
        this.ellipse(ex, -64 - rear, 6, 6, "#f4f8fb", "#9fb2c4", 2);
      this.ellipse(34, -48 - rear, 5, 4, "#3a3a44");
      this.line(
        [
          [-16, -42 - rear],
          [20, -40 - rear],
        ],
        shell === "#809c70" ? "#d9534f" : shell,
        6,
      );
    } else if (b.kind === "tortoise") {
      const spin = b.state === "attack" ? time * 20 : 0;
      // A frosty tortoise; when it spins, only its shell shows.
      if (b.state !== "attack" && !warning) {
        for (const fx of [-24, 20])
          this.ellipse(fx, -6, 9, 7, "#7fb8a0", "#4f8470", 2);
        this.ellipse(34, -20, 12, 10, "#8fcab0", "#4f8470", 2);
      }
      c.save();
      c.translate(0, -26);
      c.rotate(spin);
      this.ellipse(0, 0, 38, 24, "#cdeef7", "#6aa9c4", 3);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        this.ellipse(Math.cos(a) * 18, Math.sin(a) * 10, 7, 5, "#9fd6e8");
      }
      c.restore();
    } else if (b.kind === "salamander") {
      // A molten salamander: dark basalt skin with glowing cracks.
      const glow = 0.6 + Math.sin(time * 5) * 0.2;
      this.ellipse(-30, -10, 16, 6, "#3a1e18", "#1e0f0c", 2);
      this.ellipse(0, -22, 40, 16, "#4a2620", "#1e0f0c", 3);
      this.ellipse(36, -26, 16, 12, "#4a2620", "#1e0f0c", 2);
      for (let i = 0; i < 4; i++)
        this.line(
          [
            [-26 + i * 14, -30],
            [-20 + i * 14, -18],
          ],
          `rgba(255,140,50,${glow})`,
          3,
        );
      this.line(
        [
          [-40, -16],
          [-58, -8],
          [-66, -14],
        ],
        "#4a2620",
        6,
      );
    } else if (b.kind === "owl") {
      const flap =
        b.state === "warning"
          ? Math.sin(time * 14) * 0.5
          : recovering
            ? -0.2
            : 0.15;
      for (const side of [-1, 1]) {
        c.save();
        c.translate(side * 18, -40);
        c.rotate(side * (0.4 + flap));
        this.ellipse(side * 22, 0, 26, 12, "#5b4b7a", "#352a4e", 2);
        for (let i = 0; i < 3; i++)
          this.ellipse(side * (34 + i * 6), 6 + i * 3, 6, 4, "#7a69a0");
        c.restore();
      }
      this.ellipse(
        0,
        -30,
        30,
        30,
        shell === "#809c70" ? "#6e5d92" : shell,
        "#352a4e",
        3,
      );
      this.ellipse(4, -22, 18, 18, "#c9bfdc");
      // Ear tufts and a sharp little beak.
      for (const ex of [-12, 14])
        this.line(
          [
            [ex - 4, -54],
            [ex, -66],
            [ex + 4, -54],
          ],
          "#352a4e",
          3,
        );
      for (const ex of [-6, 16]) {
        this.ellipse(ex, -40, 8, 8, "#fff0b8", "#352a4e", 1.5);
        if (!recovering) this.ellipse(ex + 1, -40, 3.5, 4, "#2a2240");
      }
      this.line(
        [
          [3, -36],
          [6, -30],
          [9, -36],
        ],
        "#e4a24b",
        3,
      );
      for (const fx of [-8, 8])
        this.line(
          [
            [fx, -2],
            [fx, 4],
          ],
          "#e4a24b",
          3,
        );
    } else if (b.kind === "crab") {
      const flipped = recovering;
      if (flipped) {
        // Tired, it rolls onto its shell with legs waving: stomp now.
        c.translate(0, -26);
        c.rotate(Math.PI);
        c.translate(0, 26);
      }
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++)
          this.line(
            [
              [side * (10 + i * 8), -10],
              [side * (24 + i * 7), -2 + (i % 2 ? stride : -stride)],
            ],
            "#c4553d",
            3.5,
          );
      // A spiral shell on its back, then the body and two big claws.
      this.ellipse(-8, -34, 26, 22, shell, "#6a4a3a", 3);
      c.strokeStyle = "rgba(255,240,210,.6)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(-8, -34, 12, 0.2, Math.PI * 1.6);
      c.stroke();
      this.ellipse(6, -16, 26, 12, "#e2674a", "#9b3a2a", 2);
      const snap = warning ? Math.abs(Math.sin(time * 18)) * 0.5 : 0.15;
      for (const [x0, y0] of [
        [30, -24],
        [-22, -22],
      ] as const) {
        c.save();
        c.translate(x0, y0);
        c.rotate(-snap);
        this.ellipse(0, -4, 10, 7, "#ee7a58", "#9b3a2a", 2);
        c.restore();
        c.save();
        c.translate(x0, y0);
        c.rotate(snap);
        this.ellipse(0, 4, 9, 5, "#ee7a58", "#9b3a2a", 2);
        c.restore();
      }
    } else if (b.kind === "mole") {
      const crystal =
        b.phase === 3 ? "#f28f9c" : b.phase === 2 ? "#e2a3dc" : "#aa9cf2";
      // Big digging claws.
      for (const [x0, y0] of [
        [22, -8],
        [-20, -6],
      ] as const)
        for (let i = 0; i < 3; i++)
          this.line(
            [
              [x0 + i * 4, y0],
              [x0 + i * 4 + 4, y0 + 7 + (i % 2 ? stride : -stride) * 0.5],
            ],
            "#e7d9c0",
            2.5,
          );
      this.ellipse(-2, -25, 37, 26, "#6b5c72", "#3f3448", 3);
      this.ellipse(8, -15, 20, 11, "#9b8996");
      // Crystals grow from its back and change colour as it tires.
      for (const [x0, h, wid] of [
        [-22, 22, 7],
        [-8, 28, 8],
        [6, 20, 6],
      ] as const) {
        c.beginPath();
        c.moveTo(x0 - wid, -44);
        c.lineTo(x0, -44 - h);
        c.lineTo(x0 + wid, -44);
        c.closePath();
        c.fillStyle = crystal;
        c.fill();
        c.strokeStyle = "rgba(255,255,255,.6)";
        c.lineWidth = 1.2;
        c.stroke();
      }
      this.ellipse(36, -24, 7, 6, "#f4a7b6", "#b0606f", 1.5);
      for (const dy of [-3, 2])
        this.line(
          [
            [38, -24 + dy],
            [50, -27 + dy * 2],
          ],
          "#d9cfc4",
          1.2,
        );
    } else if (b.kind === "toad") {
      const airborne = b.state === "attack";
      const crouch = warning ? 4 + Math.sin(time * 14) * 1.5 : 0;
      const legs = airborne ? 10 : 0;
      // Back legs fold under while resting and stretch out mid-leap.
      for (const side of [-1, 1]) {
        this.ellipse(
          -22 - legs,
          -10 + legs * 0.4,
          17,
          9,
          side < 0 ? "#5f8f4c" : "#6f9f58",
          "#3f6a39",
          2,
        );
      }
      this.ellipse(22, -6 + legs * 0.3, 8, 5, "#6f9f58", "#3f6a39", 2);
      this.ellipse(0, -24 + crouch, 38, 22 - crouch * 0.4, shell, "#3f6a39", 3);
      this.ellipse(6, -14 + crouch, 24, 10, "#e3e0a2");
      for (let i = 0; i < 3; i++)
        this.ellipse(-18 + i * 11, -34 + crouch, 4, 3, "rgba(63,106,57,.45)");
      this.ellipse(22, -40 + crouch, 11, 11, shell, "#3f6a39", 2);
      this.line(
        [
          [12, -18 + crouch],
          [24, -16 + crouch],
          [34, -21 + crouch],
        ],
        "#3f6a39",
        2.5,
      );
    } else {
      const flutter =
        b.state === "attack"
          ? Math.sin(time * 18) * 0.12
          : Math.sin(time * 7) * 0.08;
      for (const side of [-1, 1]) {
        c.save();
        c.rotate(side * flutter);
        this.ellipse(side * 26, -36, 26, 29, "#9daddb", "#5e709f", 3);
        this.ellipse(side * 26, -17, 19, 16, "#c9bddf", "#7a7daa", 2);
        this.ellipse(side * 30, -39, 11, 13, "#ebd7aa");
        this.ellipse(side * 30, -39, 5, 6, "#737da9");
        c.restore();
      }
      this.ellipse(0, -28, 12, 25, "#ddd7ad", "#8a8f88", 2);
      this.ellipse(1, -46, 14, 12, "#e9e3ba", "#8a8f88", 2);
      this.line(
        [
          [-5, -54],
          [-10, -66],
          [-17, -69],
        ],
        "#7b8396",
        3,
      );
      this.line(
        [
          [6, -54],
          [12, -66],
          [19, -69],
        ],
        "#7b8396",
        3,
      );
    }
    const eyeX =
        b.kind === "moth"
          ? 0
          : b.kind === "toad"
            ? 22
            : b.kind === "mole"
              ? 22
              : b.kind === "crab"
                ? 16
                : b.kind === "owl"
                  ? 200
                  : b.kind === "bear"
                    ? 200
                    : b.kind === "tortoise"
                      ? 34
                      : b.kind === "salamander"
                        ? 38
                        : 27,
      eyeY =
        b.kind === "moth"
          ? -47
          : b.kind === "toad"
            ? -41
            : b.kind === "mole"
              ? -34
              : b.kind === "crab"
                ? -26
                : -26;
    if (
      b.kind === "owl" ||
      b.kind === "bear" ||
      b.kind === "ram" ||
      (b.kind === "tortoise" && (warning || b.state === "attack"))
    ) {
      // The owl and bear draw their own eyes; the spinning tortoise has
      // pulled its head into its shell.
    } else if (recovering) {
      this.line(
        [
          [eyeX - 4, eyeY],
          [eyeX + 1, eyeY + 2],
          [eyeX + 6, eyeY - 1],
        ],
        "#3f4359",
        2.5,
      );
    } else {
      this.ellipse(eyeX, eyeY, 6, 8, "#fff4d4");
      this.ellipse(eyeX + 2, eyeY + 1, 2.5, 4, "#394858");
      if (warning || b.state === "attack")
        this.line(
          [
            [eyeX - 5, eyeY - 9],
            [eyeX + 7, eyeY - 5],
          ],
          "#42505b",
          3,
        );
    }
    c.restore();
  }

  private heartwoodGuardian(game: Game, time: number) {
    const b = game.boss!;
    const c = this.ctx;
    const cx = b.x + b.w / 2;
    const feet = b.y + b.h;
    if (b.state === "defeated") {
      this.ellipse(cx, feet - 7, b.w * 0.52, 12, "rgba(255,238,149,.5)");
      for (let i = 0; i < 5; i++)
        this.firefly(
          cx + Math.sin(time + i * 1.7) * 50,
          feet - 20 - i * 18,
          time,
          0.7,
        );
      return;
    }
    const warning = b.state === "warning";
    const attack = b.state === "attack";
    const recovering = b.state === "recover";
    if (warning) {
      const direction = b.facing < 0 ? -1 : 1;
      const start = cx + direction * b.w * 0.55;
      const end = b.attackTargetX + b.w / 2;
      c.save();
      c.setLineDash([12, 8]);
      this.line(
        [
          [start, b.groundY - 7],
          [end, b.groundY - 7],
        ],
        "#d27655",
        5,
      );
      if (b.phase > 1) {
        const otherStart = cx - direction * b.w * 0.55;
        const otherEnd = Math.max(
          b.minX,
          Math.min(b.maxX + b.w, cx - direction * 360),
        );
        this.line(
          [
            [otherStart, b.groundY - 7],
            [otherEnd, b.groundY - 7],
          ],
          "#d27655",
          5,
        );
      }
      c.setLineDash([]);
      this.rounded(cx - 16, b.y - 36, 32, 28, 9, "#fff0ba", "#be7652");
      c.fillStyle = "#a35b44";
      c.font = "800 20px 'DM Sans', sans-serif";
      c.textAlign = "center";
      c.fillText("!", cx, b.y - 15);
      c.restore();
    }
    this.ellipse(cx, feet - 2, b.w * 0.5, 8, "rgba(38,60,53,.2)");
    c.save();
    c.translate(cx, b.y);
    c.scale(b.w / 156, b.h / 100);
    if (b.invulnerable > 0) c.globalAlpha = 0.7 + Math.sin(time * 16) * 0.2;
    const sway = attack ? Math.sin(time * 18) * 3 : Math.sin(time * 3) * 1.5;
    const bark =
      b.phase >= 3 ? "#986051" : b.phase === 2 ? "#a97b50" : "#806745";
    const leaf =
      b.phase >= 3 ? "#b66c67" : b.phase === 2 ? "#bf9d5a" : "#5f9c60";
    // Broad roots remain inside the real hitbox; the flat crown sits at the
    // collision top so the highlighted landing point matches the stomp target.
    this.line(
      [
        [-38, 68],
        [-59, 88],
        [-72, 98],
      ],
      "#614d3a",
      10,
    );
    this.line(
      [
        [38, 68],
        [59, 88],
        [72, 98],
      ],
      "#614d3a",
      10,
    );
    this.line(
      [
        [-44, 43],
        [-66, 25 + sway],
        [-72, 13 + sway],
      ],
      "#614d3a",
      7,
    );
    this.line(
      [
        [44, 43],
        [66, 25 - sway],
        [72, 13 - sway],
      ],
      "#614d3a",
      7,
    );
    this.rounded(-52, 19, 104, 78, 24, bark, "#4e4737");
    this.rounded(-43, 28, 86, 59, 20, "rgba(241,201,135,.2)");
    for (const x of [-29, -15, 15, 29])
      this.line(
        [
          [x, 39],
          [x - 3, 72],
        ],
        "rgba(67,56,43,.38)",
        2,
      );
    this.ellipse(-39, 20, 25, 17, leaf, "#456c4c", 2);
    this.ellipse(39, 20, 25, 17, leaf, "#456c4c", 2);
    this.ellipse(0, 16, 41, 16, leaf, "#456c4c", 2);
    this.line(
      [
        [-27, 2],
        [27, 2],
      ],
      recovering ? "#fff2a5" : "#b3df9a",
      recovering ? 5 : 3,
    );
    this.ellipse(-20, 53, 9, 10, "#fff3cf");
    this.ellipse(20, 53, 9, 10, "#fff3cf");
    this.ellipse(-18, 54, 3, 5, "#334c43");
    this.ellipse(22, 54, 3, 5, "#334c43");
    if (warning || attack) {
      this.line(
        [
          [-31, 40],
          [-13, 45],
        ],
        "#554335",
        3,
      );
      this.line(
        [
          [31, 40],
          [13, 45],
        ],
        "#554335",
        3,
      );
    }
    this.line(
      [
        [-9, 71],
        [0, recovering ? 75 : 68],
        [9, 71],
      ],
      "#584238",
      3,
    );
    this.ellipse(0, 83, 7, 5, "#e3c08d");
    if (recovering) {
      this.ellipse(0, 2, 37, 7, "rgba(255,243,150,.55)");
      for (let i = 0; i < 3; i++) {
        this.starPath(-25 + i * 25, 3 + Math.sin(time * 5 + i) * 2, 4);
        c.fillStyle = "#fff5a6";
        c.fill();
      }
    }
    c.restore();
  }

  private bossHazards(game: Game, time: number) {
    const c = this.ctx;
    for (const r of game.hazards) {
      if (!this.visible(r.x, r.w + 20)) continue;
      const cx = r.x + r.w / 2,
        cy = r.y + r.h / 2;
      if (r.kind === "sweep") {
        this.rounded(r.x, r.y, r.w, r.h, 16, "rgba(235,146,91,.72)", "#b8704d");
        for (let y = r.y + 12; y < r.y + r.h; y += 23)
          this.line(
            [
              [r.x + 8, y],
              [r.x + r.w - 8, y],
            ],
            "#ffe4a3",
            3,
          );
      } else if (r.kind === "mark") {
        // A crackling mark where lightning will strike.
        const pulse = 0.5 + Math.sin(time * 18) * 0.3;
        this.ellipse(
          cx,
          r.y + r.h - 2,
          r.w / 2 + 6,
          6,
          `rgba(255,230,120,${pulse})`,
        );
        this.ellipse(cx, r.y + r.h - 2, r.w / 2 - 4, 3, "#fff6c8");
      } else if (r.kind === "bolt") {
        c.save();
        c.fillStyle = "rgba(255,250,210,.35)";
        c.fillRect(r.x - 10, r.y, r.w + 20, r.h);
        c.strokeStyle = "#fffbe0";
        c.lineWidth = 5;
        c.lineJoin = "round";
        c.beginPath();
        let bx = cx;
        c.moveTo(bx, r.y);
        for (let yy = r.y; yy < r.y + r.h; yy += 40) {
          bx = cx + (hash(yy + Math.floor(time * 20)) - 0.5) * 22;
          c.lineTo(bx, yy + 40);
        }
        c.stroke();
        c.strokeStyle = "#ffe27a";
        c.lineWidth = 2;
        c.stroke();
        c.restore();
      } else if (r.kind === "icicle") {
        // A falling icicle, with its shadow marking where it will land.
        const ground = game.boss?.groundY ?? 470;
        this.ellipse(cx, ground - 2, 14, 4, "rgba(40,80,120,.35)");
        c.beginPath();
        c.moveTo(r.x, r.y);
        c.lineTo(r.x + r.w, r.y);
        c.lineTo(cx, r.y + r.h);
        c.closePath();
        c.fillStyle = "#dff6ff";
        c.fill();
        c.strokeStyle = "#8ccbe6";
        c.lineWidth = 1.5;
        c.stroke();
      } else if (r.kind === "fireball") {
        this.ellipse(cx, cy, r.w * 0.8, r.h * 0.8, "rgba(255,140,50,.35)");
        this.ellipse(cx, cy, r.w / 2, r.h / 2, "#ff7a2f", "#c2451c", 2);
        this.ellipse(cx - 3, cy - 3, 4, 4, "#ffe08a");
      } else if (r.kind === "shard") {
        c.beginPath();
        c.moveTo(r.x, r.y + r.h);
        c.lineTo(r.x + r.w / 2, r.y);
        c.lineTo(r.x + r.w, r.y + r.h);
        c.closePath();
        c.fillStyle = "#c9f0fb";
        c.fill();
        c.strokeStyle = "#6fb7d6";
        c.stroke();
      } else if (r.kind === "feather") {
        // A loose owl feather drifting down, swaying as it falls.
        c.save();
        c.translate(cx, cy);
        c.rotate(Math.sin(time * 4 + r.x) * 0.5);
        this.leaf(0, r.h / 2, r.h * 0.9, 0, "#b6a7d8");
        this.line(
          [
            [0, r.h / 2],
            [0, -r.h / 2],
          ],
          "#6e5d92",
          1.5,
        );
        c.restore();
      } else if (r.kind === "bubble") {
        // A big wobbling bubble with a bright highlight.
        const wobble = Math.sin(time * 6 + r.x * 0.1) * 1.5;
        this.ellipse(
          cx,
          cy,
          r.w / 2 + wobble,
          r.h / 2 - wobble,
          "rgba(205,250,245,.35)",
          "#e8fffb",
          2,
        );
        this.ellipse(cx - 4, cy - 4, 3.5, 2.5, "rgba(255,255,255,.85)");
      } else if (r.kind === "web") {
        this.ellipse(cx, cy, r.w / 2, r.h / 2, "#f5dce9", "#ad79a7", 2);
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI) / 3 + time * 2;
          this.line(
            [
              [cx - Math.cos(a) * r.w * 0.4, cy - Math.sin(a) * r.h * 0.4],
              [cx + Math.cos(a) * r.w * 0.4, cy + Math.sin(a) * r.h * 0.4],
            ],
            "#ba89b0",
            1.5,
          );
        }
      } else if (game.boss?.kind === "heartwood") {
        // Seed waves use their real collision rectangle; contrasting leaf and
        // thorn marks make them distinct from the earlier moth's gusts.
        c.save();
        c.translate(cx, cy);
        c.scale(r.vx < 0 ? -1 : 1, 1);
        this.ellipse(0, 0, r.w * 0.42, r.h * 0.42, "#b9874d", "#624934", 2);
        this.ellipse(-r.w * 0.1, -r.h * 0.1, r.w * 0.15, r.h * 0.16, "#e6c17c");
        this.line(
          [
            [-r.w * 0.18, r.h * 0.25],
            [r.w * 0.19, -r.h * 0.25],
          ],
          "#684d36",
          2,
        );
        this.line(
          [
            [r.w * 0.15, -r.h * 0.3],
            [r.w * 0.33, -r.h * 0.4],
          ],
          "#7fb773",
          3,
        );
        c.restore();
      } else {
        c.save();
        c.translate(cx, cy);
        c.scale(r.vx < 0 ? -1 : 1, 1);
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.moveTo(-r.w / 2, i * r.h * 0.3);
          c.quadraticCurveTo(
            r.w * 0.5,
            i * r.h * 0.3 - 7,
            r.w * 0.35,
            i * r.h * 0.3 + 3,
          );
          c.strokeStyle = i === 0 ? "#5c98bd" : "#b4e7f1";
          c.lineWidth = 3;
          c.stroke();
        }
        c.restore();
      }
    }
  }

  private sealedGoal(game: Game) {
    if (!game.boss || game.boss.state === "defeated") return;
    const { x, y } = game.level.goal;
    for (let i = 0; i < 3; i++)
      this.line(
        [
          [x - 1, y - 16 - i * 27],
          [x + 61, y - 29 - i * 27],
        ],
        "#608f69",
        7,
      );
    this.ellipse(x + 30, y - 51, 15, 18, "#e0c890", "#9f8b60", 2);
    this.ellipse(x + 30, y - 54, 4, 5, "#7d805c");
    this.line(
      [
        [x + 30, y - 51],
        [x + 30, y - 44],
      ],
      "#7d805c",
      3,
    );
  }

  private sectionLandmarks(game: Game, time: number, p: Palette) {
    const c = this.ctx;
    game.level.sections.forEach((section, index) => {
      const signX = section.x + (index === 0 ? 245 : 85);
      if (!this.visible(signX, 160)) return;
      const floor = game.platforms.find(
        (platform) =>
          platform.kind === "ground" &&
          platform.y > 100 &&
          signX >= platform.x + 10 &&
          signX + 100 < platform.x + platform.w,
      );
      if (!floor) return;
      const y = floor.y;
      c.save();
      c.globalAlpha = 0.95;
      const label = `${String(index + 1).padStart(2, "0")}  ${section.name}`;
      c.font = "700 13px 'DM Sans', sans-serif";
      const width = Math.min(192, c.measureText(label).width + 28);
      const pickups = [
        ...game.level.coins,
        ...game.level.stars,
        ...game.level.diamonds,
        ...game.level.fireflies,
      ];
      const top =
        [y - 92, y - 145, y - 192, y - 242, y - 56].find(
          (candidate) =>
            game.platforms.every(
              (tile) =>
                tile.kind === "ground" ||
                tile.x >= signX + width - 10 ||
                tile.x + tile.w <= signX - 10 ||
                tile.y >= candidate + 34 ||
                tile.y + tile.h <= candidate - 5,
            ) &&
            pickups.every(
              (pickup) =>
                pickup.x + 17 < signX - 10 ||
                pickup.x - 17 > signX + width - 10 ||
                pickup.y + 17 < candidate ||
                pickup.y - 17 > candidate + 30,
            ),
        ) ?? y - 56;
      this.rounded(signX + 41, top + 4, 8, y - top - 4, 3, p.trunk);
      this.rounded(signX - 10, top, width, 30, 8, "#fff3cf", p.trunk);
      c.fillStyle = "#355a48";
      c.textBaseline = "middle";
      c.fillText(label, signX + 3, top + 15, width - 22);
      this.leaf(
        signX + 45,
        top + 3,
        12,
        -0.65 + Math.sin(time + index) * 0.05,
        p.leafLight,
      );
      // Each biome has a recognizable landmark beside its trail signs.
      if (game.level.theme === "dusk") {
        this.line(
          [
            [signX - 35, y],
            [signX - 30, y - 135],
            [signX - 8, y - 140],
          ],
          p.trunk,
          5,
        );
        this.ellipse(signX - 9, y - 120, 19, 26, "rgba(197,255,222,.15)");
        this.rounded(signX - 19, y - 136, 20, 29, 8, "#bdeba7", "#578b7a");
        this.firefly(signX - 9, y - 122, time, 0.7);
      } else if (game.level.theme === "alpine") {
        this.line(
          [
            [signX - 28, y],
            [signX - 28, y - 150],
          ],
          "#82949e",
          5,
        );
        const flutter = Math.sin(time * 2 + index) * 5;
        c.beginPath();
        c.moveTo(signX - 28, y - 146);
        c.lineTo(signX + 8, y - 139 + flutter);
        c.lineTo(signX - 28, y - 127);
        c.closePath();
        c.fillStyle = "#ffae8a";
        c.fill();
      } else if (game.level.theme === "windmill") {
        // A small pennant and pinwheel mark a new stretch of the trail. They
        // are attached to the sign, not to the platforms Pip lands on.
        const poleX = signX - 26;
        this.line(
          [
            [poleX, y],
            [poleX, y - 143],
          ],
          "#a77950",
          5,
        );
        const flutter = Math.sin(time * 2 + index) * 4;
        c.beginPath();
        c.moveTo(poleX, y - 139);
        c.quadraticCurveTo(poleX + 24, y - 147 + flutter, poleX + 40, y - 133);
        c.lineTo(poleX + 25, y - 124 + flutter);
        c.lineTo(poleX, y - 129);
        c.closePath();
        c.fillStyle = ["#ed9e76", "#f6d482", "#9ad4bd"][index % 3];
        c.fill();
        if (section.x < 9600) {
          this.ellipse(poleX, y - 95, 13, 13, "#fff0bd", "#aa8056");
          this.line(
            [
              [poleX - 7, y - 95],
              [poleX + 7, y - 95],
            ],
            "#d9a75e",
            2,
          );
          this.line(
            [
              [poleX, y - 102],
              [poleX, y - 88],
            ],
            "#d9a75e",
            2,
          );
        }
      } else if (
        game.level.theme === "snow" ||
        game.level.theme === "ice" ||
        game.level.theme === "volcano"
      ) {
        // A little snowman, ice crystal, or glowing ember cairn.
        if (game.level.theme === "snow") {
          this.ellipse(signX - 26, y - 14, 15, 14, "#ffffff", "#b9c9d8", 2);
          this.ellipse(signX - 26, y - 38, 11, 10, "#ffffff", "#b9c9d8", 2);
          this.ellipse(signX - 22, y - 40, 2, 2, "#3a3a3a");
          this.ellipse(signX - 30, y - 40, 2, 2, "#3a3a3a");
          this.line(
            [
              [signX - 26, y - 36],
              [signX - 18, y - 35],
            ],
            "#e9873a",
            3,
          );
          this.line(
            [
              [signX - 38, y - 28],
              [signX - 15, y - 26],
            ],
            "#d9534f",
            4,
          );
        } else if (game.level.theme === "ice") {
          for (const [dx, h] of [
            [-34, 40],
            [-24, 58],
            [-14, 34],
          ] as const) {
            c.beginPath();
            c.moveTo(signX + dx - 7, y);
            c.lineTo(signX + dx, y - h);
            c.lineTo(signX + dx + 7, y);
            c.closePath();
            c.fillStyle = "rgba(214,246,252,.85)";
            c.fill();
            c.strokeStyle = "#7fc4dc";
            c.lineWidth = 1.5;
            c.stroke();
          }
        } else {
          for (let i = 0; i < 3; i++)
            this.ellipse(
              signX - 26,
              y - 8 - i * 14,
              16 - i * 3,
              8,
              "#3d2a22",
              "#241612",
              2,
            );
          this.ellipse(
            signX - 26,
            y - 50,
            7 + Math.sin(time * 6 + index) * 2,
            10,
            "#ffb347",
          );
          this.ellipse(signX - 26, y - 48, 4, 6, "#fff1a8");
        }
      } else if (game.level.theme === "cavern") {
        // A glowing crystal cluster marks each new stretch of the caves.
        const glow = 0.55 + Math.sin(time * 2 + index) * 0.15;
        this.ellipse(
          signX - 26,
          y - 30,
          26,
          26,
          `rgba(185,168,255,${glow * 0.35})`,
        );
        for (const [dx, h, wid, color] of [
          [-36, 46, 9, "#b9a8ff"],
          [-26, 64, 11, "#d9cdff"],
          [-15, 40, 8, "#8fe6d6"],
        ] as const) {
          c.beginPath();
          c.moveTo(signX + dx - wid, y);
          c.lineTo(signX + dx, y - h);
          c.lineTo(signX + dx + wid, y);
          c.closePath();
          c.fillStyle = color;
          c.fill();
          c.strokeStyle = "rgba(255,255,255,.5)";
          c.lineWidth = 1.2;
          c.stroke();
        }
      } else if (game.level.theme === "marsh") {
        // A clump of cattails marks each new stretch of the marsh.
        for (let stalk = 0; stalk < 3; stalk++) {
          const sx = signX - 36 + stalk * 9;
          const top = y - 118 + stalk * 14;
          const sway = Math.sin(time * 1.4 + index + stalk) * 3;
          this.line(
            [
              [sx, y],
              [sx + sway, top],
            ],
            "#5d8f55",
            3,
          );
          this.rounded(sx + sway - 4, top - 4, 8, 24, 4, "#8a5a3a");
          this.line(
            [
              [sx + sway, top - 4],
              [sx + sway, top - 12],
            ],
            "#5d8f55",
            2,
          );
        }
      } else {
        this.line(
          [
            [signX - 27, y],
            [signX - 23, y - 126],
          ],
          "#4a9961",
          6,
        );
        this.leaf(signX - 25, y - 55, 23, -1.1, "#84c866");
        this.leaf(signX - 25, y - 76, 20, 1.0, "#62ac63");
        for (let petal = 0; petal < 7; petal++) {
          const angle = (petal / 7) * Math.PI * 2;
          this.ellipse(
            signX - 23 + Math.cos(angle) * 14,
            y - 127 + Math.sin(angle) * 14,
            10,
            10,
            "#ffe49b",
          );
        }
        this.ellipse(signX - 23, y - 127, 11, 11, "#b7884b");
      }
      c.restore();
    });
  }

  private treasuryRooms(game: Game, time: number) {
    const c = this.ctx;
    for (const room of game.level.rooms ?? []) {
      if (
        room.x + room.w < this.cameraX ||
        room.x > this.cameraX + this.viewportWidth
      )
        continue;
      c.save();
      // This recessed backdrop sits behind the real walls and breakable entry.
      // It never draws a platform-shaped highlight outside their colliders.
      this.rounded(
        room.x + 12,
        room.y + 12,
        room.w - 24,
        room.h - 12,
        12,
        "#786a50",
      );
      this.rounded(
        room.x + 20,
        room.y + 20,
        room.w - 40,
        room.h - 20,
        10,
        "#a58a59",
      );
      for (let i = 0; i < Math.ceil(room.w / 32); i++) {
        const xx = room.x + 28 + i * 32;
        if (xx > room.x + room.w - 20) continue;
        this.line(
          [
            [xx, room.y + 22],
            [xx, room.y + room.h - 7],
          ],
          "rgba(83,65,43,.13)",
          2,
        );
      }
      const glow = c.createRadialGradient(
        room.x + room.w / 2,
        room.y + room.h * 0.6,
        4,
        room.x + room.w / 2,
        room.y + room.h * 0.6,
        room.w * 0.48,
      );
      glow.addColorStop(0, "rgba(255,230,136,.25)");
      glow.addColorStop(1, "rgba(255,230,136,0)");
      c.fillStyle = glow;
      c.fillRect(room.x + 20, room.y + 20, room.w - 40, room.h - 20);
      c.font = "700 13px 'DM Sans', sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      const width = Math.min(room.w - 70, c.measureText(room.name).width + 22);
      this.rounded(
        room.x + (room.w - width) / 2,
        room.y + 25,
        width,
        23,
        5,
        "#eed5a0",
      );
      c.fillStyle = "#675338";
      c.fillText(room.name, room.x + room.w / 2, room.y + 37, width - 12);
      for (const xx of [room.x + 37, room.x + room.w - 37]) {
        this.line(
          [
            [xx, room.y + 20],
            [xx, room.y + 45],
          ],
          "#684f35",
          2,
        );
        this.rounded(xx - 6, room.y + 43, 12, 17, 4, "#e9bf6f", "#866539");
        this.ellipse(
          xx,
          room.y + 51,
          3,
          6 + Math.sin(time * 2) * 0.5,
          "#fff1bd",
        );
      }
      c.restore();
    }
  }

  private platform(r: Game["platforms"][number], p: Palette, time: number) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    if (
      r.id?.startsWith("windmill.sail.") ||
      r.id?.startsWith("windmill.vane-sail") ||
      r.id?.startsWith("windmill.house-sail") ||
      r.id?.startsWith("windmill.workshop-sail")
    ) {
      // A canvas sail rides the wind. Its straight upper rim and ends match
      // the collision box, so Pip can see exactly where it is safe to land.
      this.rounded(x, y, w, h, 5, "#f7e7bb", "#a97648");
      c.save();
      c.beginPath();
      c.rect(x + 3, y + 3, w - 6, h - 6);
      c.clip();
      for (let xx = x + 16; xx < x + w; xx += 32) {
        this.line(
          [
            [xx, y + 3],
            [xx - 13, y + h - 3],
          ],
          "#d7b97c",
          2,
        );
      }
      c.restore();
      this.line(
        [
          [x + 2, y + 1],
          [x + w - 2, y + 1],
        ],
        "#fff8da",
        3,
      );
      this.line(
        [
          [x + 6, y + h - 2],
          [x + w - 6, y + h - 2],
        ],
        "#a97648",
        3,
      );
      for (const offset of [13, w - 13]) {
        this.ellipse(x + offset, y + h - 2, 3, 3, "#8e613e");
        this.line(
          [
            [x + offset, y + h],
            [x + offset, y + h + 8],
          ],
          "#c7a273",
          2,
        );
      }
      // The small chevrons point in the direction of actual movement. They
      // sit entirely within the collider and cannot be mistaken for ledges.
      if (r.motion?.axis === "x" && Math.abs(r.x - r.previousX) > 0.001) {
        const direction = Math.sign(r.x - r.previousX);
        const cy = y + h / 2;
        for (const offset of [w / 2 - 7, w / 2 + 7]) {
          const cx = x + offset;
          this.line(
            [
              [cx - direction * 3, cy - 3],
              [cx + direction * 2, cy],
              [cx - direction * 3, cy + 3],
            ],
            "#956b42",
            2,
          );
        }
      }
      return;
    }
    if (r.slippery && r.kind !== "crumble" && r.kind !== "moving") {
      // Ice: a glassy blue sheet with bright glints along the surface.
      this.rounded(x, y, w, h, 4, "#9fdcf0", "#5f9fc4");
      const glass = c.createLinearGradient(0, y, 0, y + Math.min(h, 80));
      glass.addColorStop(0, "rgba(255,255,255,.6)");
      glass.addColorStop(1, "rgba(160,220,240,0)");
      c.fillStyle = glass;
      c.fillRect(x + 2, y + 2, w - 4, Math.min(h, 80));
      this.line(
        [
          [x + 3, y + 2],
          [x + w - 3, y + 2],
        ],
        "#ffffff",
        3,
      );
      for (let xx = x + 30; xx < x + w - 10; xx += 90)
        this.line(
          [
            [xx, y + 8],
            [xx + 18, y + 4],
          ],
          "rgba(255,255,255,.8)",
          2,
        );
      return;
    }
    if (r.id?.startsWith("ice.floe.") || r.id?.startsWith("ice.crack.")) {
      // Ice floes and cracking ice share the cave's crystal-ledge look.
      this.crystalLedge(r, time);
      return;
    }
    if (r.id?.startsWith("cave.lift.") || r.id?.startsWith("cave.crack.")) {
      this.crystalLedge(r, time);
      return;
    }
    if (r.id?.startsWith("marsh.lily.") || r.id?.startsWith("marsh.sinkpad.")) {
      this.lilyPad(r, time);
      return;
    }
    if (
      r.id?.startsWith("windmill.drifting-lily") ||
      r.id?.startsWith("moonpool.drifting-ledge") ||
      r.id?.startsWith("beehive.drifting-ledge")
    ) {
      // Distinguish rideable surfaces from fixed terrain. The leaf's flat
      // top follows the moving collision box on every frame.
      this.movingLeaf(r, time);
      return;
    }
    if (r.id?.startsWith("moonpool.rock.")) {
      // Keep the visible sides and top aligned with the solid collision box.
      this.rounded(x, y, w, h, 3, "#527d7b", "#365f60");
      this.rounded(x + 4, y + 4, w - 8, h - 8, 3, "#658f8a");
      this.line(
        [
          [x + 2, y + 2],
          [x + w - 2, y + 2],
        ],
        "#aad0b7",
        4,
      );
      for (let yy = y + 28; yy < y + h - 12; yy += 45) {
        this.line(
          [
            [x + 7, yy],
            [x + w * 0.4, yy - 5],
            [x + w - 7, yy - 1],
          ],
          "#456e6b",
          2,
        );
        this.ellipse(x + w * 0.67, yy + 12, 5, 2.5, "#8fb5a3");
      }
      return;
    }
    if (r.id?.startsWith("cloud.")) {
      // The flat top is the collision surface; the rounded underside is
      // decorative, leaving no apparent solid ground beyond the collider.
      this.rounded(x, y, w, Math.max(8, h), 8, "#edf9f6");
      for (let i = 0; i < Math.ceil(w / 25); i++) {
        const cx = Math.min(x + w - 8, x + 10 + i * 25);
        this.ellipse(cx, y + Math.max(8, h) - 3, 11, 7, "#d2e9e9");
      }
      this.line(
        [
          [x + 2, y + 2],
          [x + w - 2, y + 2],
        ],
        "#ffffff",
        4,
      );
      if (w > 65) {
        for (let i = 0; i < Math.floor(w / 72); i++) {
          const xx = x + 22 + i * 72;
          this.ellipse(xx, y + 1, 7, 2, "#a9d9b4");
          this.ellipse(xx + 2, y - 3, 2, 2, "#ffd8df");
        }
      }
      return;
    }
    if (r.id?.startsWith("gate.")) return; // Gates are drawn from their live latch state.
    if (r.id?.startsWith("trellis.")) {
      this.rounded(x, y, w, h, 3, "#739b57");
      this.line(
        [
          [x, y + h - 3],
          [x + w, y + h - 3],
        ],
        "#c9dc82",
        5,
      );
      for (
        let xx = Math.max(x + 12, this.cameraX - 40);
        xx < Math.min(x + w, this.cameraX + this.viewportWidth + 40);
        xx += 55
      ) {
        this.leaf(xx, y + h, 14, -0.8, "#a5ca6d");
        this.leaf(xx + 15, y + h, 11, 0.8, "#d7e995");
      }
      return;
    }
    if (r.kind === "flower" || r.kind === "curled") {
      this.wakingPlant(r, time);
      return;
    }
    if (r.kind === "mushroom") {
      this.bounceMushroom(r, time);
      return;
    }
    if (r.kind === "moving" && r.id?.startsWith("castle.")) {
      // A castle lift: a stone slab (a bell yoke in the belfry) on chains.
      const belfry = r.id.startsWith("castle.belfry.");
      for (const cx of [r.x + 14, r.x + r.w - 14])
        this.line(
          [
            [cx, r.y - 260],
            [cx, r.y],
          ],
          "rgba(60,55,70,.6)",
          2,
        );
      this.rounded(
        r.x,
        r.y,
        r.w,
        r.h + 4,
        5,
        belfry ? "#b08a4a" : "#9aa0a8",
        belfry ? "#6e5426" : "#5d636c",
      );
      this.line(
        [
          [r.x + 6, r.y + 3],
          [r.x + r.w - 6, r.y + 3],
        ],
        "rgba(255,255,255,.35)",
        2,
      );
      return;
    }
    if (r.kind === "moving") {
      this.movingLeaf(r, time);
      return;
    }
    if (r.kind === "crumble" && r.id?.startsWith("castle.")) {
      this.castleStone(r, time);
      return;
    }
    if (r.kind === "crumble") {
      this.crumbleCloud(r, time);
      return;
    }
    if (r.kind === "brick") {
      if (r.rewardPower) {
        this.rewardBlock(r, time);
        return;
      }
      this.crackedBlock(r);
      return;
    }
    // The bright, straight upper edge is exactly the collision surface.
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    const soil = c.createLinearGradient(0, y, 0, y + Math.min(h, 100));
    soil.addColorStop(0, p.soil);
    soil.addColorStop(1, p.soilShade);
    c.fillStyle = soil;
    c.fillRect(x, y, w, h);
    if (h > 30) {
      this.line(
        [
          [x + 7, y + 16],
          [x + 7, y + h],
        ],
        "rgba(255,242,196,.2)",
        8,
      );
      this.line(
        [
          [x + w - 6, y + 14],
          [x + w - 6, y + h],
        ],
        "rgba(78,60,48,.18)",
        9,
      );
      const first = Math.max(0, Math.floor((this.cameraX - x - 25) / 58));
      const last = Math.min(
        Math.ceil(w / 58),
        Math.ceil((this.cameraX + this.viewportWidth - x + 25) / 58),
      );
      for (let i = first; i < last; i++) {
        for (let row = 0; row < 3; row++) {
          const xx = x + 25 + i * 58 + hash(i + row + x) * 22;
          const yy = y + 34 + row * 41 + hash(i + row * 3) * 16;
          this.rounded(
            xx,
            yy,
            12 + hash(i + x) * 15,
            7,
            3,
            row % 2 ? "rgba(65,55,52,.12)" : p.rock,
          );
        }
      }
      this.line(
        [
          [x, y + 24],
          [x + w, y + 24],
        ],
        "rgba(79,66,45,.1)",
        3,
      );
    }
    c.fillStyle = p.grass;
    c.fillRect(x, y, w, 10);
    c.fillStyle = p.grassLight;
    c.fillRect(x, y, w, 4);
    for (let i = 0; i < Math.ceil(w / 26); i++)
      this.ellipse(x + 10 + i * 26, y + 9, 15, 5, p.grass);
    c.restore();
    if (r.kind === "platform") {
      this.line(
        [
          [x + 5, y + h - 2],
          [x + w - 5, y + h - 2],
        ],
        p.soilShade,
        3,
      );
      // Small hanging roots make floating ledges feel like pieces of the world.
      for (let i = 0; i < Math.floor(w / 60); i++) {
        const xx = x + 24 + i * 60;
        this.line(
          [
            [xx, y + h],
            [xx + 3, y + h + 7],
            [xx + 8, y + h + 10],
          ],
          p.soilShade,
          2,
        );
      }
    }
    for (let i = 0; i < Math.floor(w / 66); i++) {
      const xx = x + 28 + i * 66;
      if (!this.visible(xx, 20)) continue;
      const sway = Math.sin(time * 1.5 + xx) * 1.5;
      this.line(
        [
          [xx - 4, y],
          [xx - 7 + sway, y - 7],
        ],
        p.grass,
        2,
      );
      this.line(
        [
          [xx, y],
          [xx + sway, y - 10],
        ],
        p.grass,
        2,
      );
      this.line(
        [
          [xx + 3, y],
          [xx + 7 + sway, y - 5],
        ],
        p.grass,
        2,
      );
      if (r.kind === "ground" && i % 3 === 1)
        this.flower(xx + 14, y, p, i + x, time);
    }
    if (r.kind === "ground") {
      for (let i = 0; i < Math.floor(w / 220); i++) {
        const xx = x + 120 + i * 220;
        if (this.visible(xx, 25)) this.mushroom(xx, y, p, i + x);
      }
    }
  }

  private bounceMushroom(r: Rect, time: number) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    const pulse =
      this.bouncePulse > 0
        ? Math.sin(this.bouncePulse * 24) * this.bouncePulse * 8
        : 0;
    // Decorative stem hangs below the solid cap. Its straight upper rim marks
    // the exact launch surface; the ornamental spots never imply a higher floor.
    this.rounded(
      x + w * 0.38,
      y + 10,
      w * 0.24,
      h + 18,
      8,
      "#fff0d3",
      "#be8c68",
    );
    this.ellipse(x + w / 2, y + h + 29, w * 0.32, 5, "rgba(43,83,56,.15)");
    c.save();
    c.beginPath();
    c.rect(x, y, w, Math.max(18, h));
    c.clip();
    this.rounded(x, y, w, Math.max(18, h + pulse), 9, "#e97472", "#ad505c");
    this.rounded(x + 3, y + 1, w - 6, 5, 3, "#ffb68e");
    for (let i = 0; i < Math.max(2, Math.floor(w / 26)); i++)
      this.ellipse(x + 13 + i * 25, y + 12, 6, 4, "#fff1d5");
    c.restore();
    const center = x + w / 2;
    const lift = Math.sin(time * 2) * 1.5;
    this.line(
      [
        [center - 6, y + 12 + lift],
        [center, y + 6 + lift],
        [center + 6, y + 12 + lift],
      ],
      "#fff7dc",
      2.5,
    );
  }

  /** A stormy ridge: rolling clouds, slanting rain and far lightning. */
  private stormBackdrop(p: Palette, time: number, camera: number) {
    const c = this.ctx;
    const w = this.viewportWidth,
      h = this.viewportHeight;
    // A far flash every few seconds lights the whole sky for a moment.
    const flash = Math.max(0, 1 - ((time % 6.3) - 5.9) * 4);
    if (time % 6.3 > 5.9) {
      c.fillStyle = `rgba(230,236,255,${0.25 * flash})`;
      c.fillRect(0, 0, w, h);
    }
    for (let layer = 0; layer < 3; layer++) {
      const parallax = 0.08 + layer * 0.12;
      const spacing = 360 - layer * 50;
      const shift = camera * parallax;
      const color = layer === 0 ? p.far : layer === 1 ? p.middle : p.near;
      for (
        let i = Math.floor(shift / spacing) - 1;
        i <= Math.floor(shift / spacing) + Math.ceil(w / spacing) + 1;
        i++
      ) {
        const x = i * spacing - shift;
        const peak = 210 + layer * 60 + hash(i + layer * 17) * 60;
        c.beginPath();
        c.moveTo(x - 160, h);
        c.lineTo(x - 20, peak + 30);
        c.lineTo(x + 40, peak);
        c.lineTo(x + 110, peak + 40);
        c.lineTo(x + 240, h);
        c.closePath();
        c.fillStyle = color;
        c.fill();
      }
    }
    // Heavy clouds drift across the top of the sky.
    for (let i = 0; i < 7; i++) {
      const x =
        ((((hash(i + 40) * (w + 400) - time * (14 + i * 3) - camera * 0.04) %
          (w + 400)) +
          w +
          400) %
          (w + 400)) -
        200;
      const y = 40 + hash(i + 60) * 90;
      for (const [dx, dy, r] of [
        [0, 0, 46],
        [44, -10, 38],
        [-42, 6, 34],
        [80, 8, 30],
      ] as const)
        this.ellipse(x + dx, y + dy, r * 1.4, r, "rgba(70,78,96,.75)");
    }
    // Slanting rain.
    c.strokeStyle = "rgba(200,212,232,.35)";
    c.lineWidth = 1.2;
    c.beginPath();
    const drops = Math.ceil((70 * w) / WIDTH);
    for (let i = 0; i < drops; i++) {
      const x =
        (hash(i + 700) * (w + 60) - camera * 0.2 + time * -90 + w * 9) %
        (w + 60);
      const y = (hash(i + 720) * h + time * 520) % h;
      c.moveTo(x, y);
      c.lineTo(x - 6, y + 16);
    }
    c.stroke();
  }

  /** Wind streaks: faint and flickering just before a gust, strong while
   * it blows. */
  private windStreaks(game: Game, time: number) {
    const c = this.ctx;
    for (const zone of game.level.windZones ?? []) {
      if (!this.visible(zone.x + zone.w / 2, zone.w / 2 + 40)) continue;
      const t = game.windCycle(zone);
      const blowing = t < zone.duration;
      const warning = !blowing && zone.period - t < 0.8;
      if (!blowing && !warning) continue;
      const alpha = blowing ? 0.85 : 0.45 + Math.sin(time * 30) * 0.2;
      c.save();
      c.strokeStyle = `rgba(235,242,255,${alpha})`;
      c.lineWidth = blowing ? 4 : 2.5;
      c.lineCap = "round";
      const dir = Math.sign(zone.speed) || -1;
      for (let i = 0; i < Math.ceil(zone.w / 35); i++) {
        const y = 150 + hash(i + zone.x) * 260;
        const travel =
          (time * 420 * dir + hash(i * 3 + zone.x) * zone.w) % zone.w;
        const x = zone.x + ((travel + zone.w) % zone.w);
        const len = blowing ? 80 : 40;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x - dir * len * 0.5, y - 5, x - dir * len, y);
        c.stroke();
      }
      c.restore();
    }
  }

  /** Backdrops for the snow, ice and fire worlds. */
  private extraBackdrop(
    theme: Theme,
    p: Palette,
    time: number,
    camera: number,
  ) {
    const c = this.ctx;
    const w = this.viewportWidth,
      h = this.viewportHeight;
    if (theme === "ice") {
      // A shimmering aurora across the night sky.
      for (let band = 0; band < 3; band++) {
        c.beginPath();
        for (let x = 0; x <= w; x += 20) {
          const y =
            80 + band * 30 + Math.sin(x * 0.006 + time * 0.4 + band) * 24;
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.strokeStyle = [
          "rgba(140,255,200,.22)",
          "rgba(120,200,255,.18)",
          "rgba(200,160,255,.14)",
        ][band]!;
        c.lineWidth = 26;
        c.stroke();
      }
    } else if (theme === "volcano") {
      this.ellipse(w * 0.78, 110, 60, 60, "rgba(255,170,80,.18)");
    } else {
      this.ellipse(w * 0.78, 95, 38, 38, p.sun);
    }
    // Three layers of peaks: snowy, icy spires, or volcanic cones.
    for (let layer = 0; layer < 3; layer++) {
      const parallax = 0.1 + layer * 0.12;
      const spacing = 340 - layer * 40;
      const shift = camera * parallax;
      const color = layer === 0 ? p.far : layer === 1 ? p.middle : p.near;
      for (
        let i = Math.floor(shift / spacing) - 1;
        i <= Math.floor(shift / spacing) + Math.ceil(w / spacing) + 1;
        i++
      ) {
        const x = i * spacing - shift;
        const peak = 200 + layer * 55 + hash(i + layer * 31) * 50;
        c.beginPath();
        c.moveTo(x - 140, h);
        c.lineTo(x + 40, peak);
        c.lineTo(x + 220, h);
        c.closePath();
        c.fillStyle = color;
        c.fill();
        if (theme !== "volcano" && layer < 2) {
          // Snowy caps.
          c.beginPath();
          c.moveTo(x + 40, peak);
          c.lineTo(x + 8, peak + 46);
          c.lineTo(x + 28, peak + 38);
          c.lineTo(x + 44, peak + 52);
          c.lineTo(x + 72, peak + 46);
          c.closePath();
          c.fillStyle = theme === "ice" ? "#d9f5fb" : "#ffffff";
          c.fill();
        } else if (theme === "volcano" && layer === 0) {
          this.ellipse(x + 40, peak + 4, 14, 6, "rgba(255,150,60,.6)");
        }
      }
    }
    // Falling snow, drifting ice glints, or rising embers.
    const count = Math.ceil((40 * w) / WIDTH);
    for (let i = 0; i < count; i++) {
      const speed = 20 + hash(i + 7) * 30;
      const fall = theme === "volcano" ? -speed : speed;
      const x =
        (hash(i + 500) * (w + 100) +
          Math.sin(time * 0.8 + i) * 20 -
          camera * 0.05 +
          w * 8) %
        (w + 100);
      const y = (((hash(i + 520) * h + time * fall) % h) + h) % h;
      const size = 1.2 + hash(i + 540) * 2;
      this.ellipse(
        x,
        y,
        size,
        size,
        theme === "volcano"
          ? "rgba(255,170,80,.7)"
          : theme === "ice"
            ? "rgba(220,250,255,.6)"
            : "rgba(255,255,255,.9)",
      );
    }
  }

  /** Lava fills the gaps of the fire world, glowing and bubbling. */
  private lavaPool(camera: number, time: number, surface: number) {
    const c = this.ctx;
    const left = camera - 40,
      right = camera + this.viewportWidth + 40;
    const lava = c.createLinearGradient(0, surface, 0, 660);
    lava.addColorStop(0, "#ffb347");
    lava.addColorStop(0.3, "#ff6a2b");
    lava.addColorStop(1, "#8a1f12");
    c.fillStyle = lava;
    c.fillRect(left, surface, right - left, 700 - surface);
    for (let xx = Math.floor(left / 70) * 70; xx < right; xx += 70) {
      const bob = Math.sin(time * 2 + xx * 0.07) * 4;
      this.ellipse(xx + 20, surface + 4 + bob, 12, 4, "rgba(255,230,140,.6)");
    }
  }

  /** An icicle hanging, shaking before it falls, or falling. */
  /** Castle walls behind the trail: each castle has its own stone, windows
   * and decorations. Drawn in screen space with slow parallax. */
  private castleWalls(
    style: "bramble" | "belfry" | "citadel",
    time: number,
    camera: number,
  ) {
    const c = this.ctx;
    const w = this.viewportWidth,
      h = this.viewportHeight;
    const stone =
      style === "bramble"
        ? ["#6f7d6a", "#5d6a58", "#86937f"]
        : style === "belfry"
          ? ["#3d3651", "#302a42", "#51496a"]
          : ["#5e6676", "#4c5363", "#727b8c"];
    const shift = (camera * 0.45) % 240;
    const top = 120;
    c.fillStyle = stone[0]!;
    c.fillRect(0, top, w, h - top);
    // Courses of stone blocks.
    c.strokeStyle = stone[1]!;
    c.lineWidth = 2;
    for (let y = top; y < h; y += 34) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
      const offset = ((y - top) / 34) % 2 ? 60 : 0;
      for (let x = -shift + offset - 120; x < w; x += 120) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 34);
        c.stroke();
      }
    }
    // Battlements along the top.
    for (let x = -shift - 240; x < w + 60; x += 60) {
      c.fillStyle = stone[0]!;
      c.fillRect(x, top - 30, 34, 32);
      c.fillStyle = stone[2]!;
      c.fillRect(x, top - 30, 34, 5);
    }
    // Windows (and per-castle details) every 240px.
    for (let x = -shift - 240; x < w + 240; x += 240) {
      const wx = x + 100;
      c.save();
      c.beginPath();
      c.moveTo(wx - 22, 330);
      c.lineTo(wx - 22, 230);
      c.arc(wx, 230, 22, Math.PI, 0);
      c.lineTo(wx + 22, 330);
      c.closePath();
      const flash = style === "citadel" && time % 6.3 > 5.9 ? 0.9 : 0;
      c.fillStyle =
        style === "bramble"
          ? "#2f3b30"
          : style === "belfry"
            ? "#c9d7ff"
            : `rgba(${180 + flash * 70},${190 + flash * 60},${215 + flash * 40},1)`;
      c.fill();
      c.strokeStyle = stone[2]!;
      c.lineWidth = 4;
      c.stroke();
      c.restore();
      if (style === "belfry") {
        // Moonlight through the arch, and a bell hanging in the next bay.
        c.fillStyle = "rgba(200,215,255,.12)";
        c.beginPath();
        c.moveTo(wx - 22, 260);
        c.lineTo(wx + 22, 260);
        c.lineTo(wx + 90, 430);
        c.lineTo(wx + 10, 430);
        c.closePath();
        c.fill();
        const swing = Math.sin(time * 1.4 + x * 0.01) * 0.18;
        c.save();
        c.translate(wx + 120, 150);
        c.rotate(swing);
        this.line(
          [
            [0, 0],
            [0, 40],
          ],
          "#2a2438",
          3,
        );
        c.beginPath();
        c.moveTo(-16, 70);
        c.quadraticCurveTo(-14, 40, 0, 38);
        c.quadraticCurveTo(14, 40, 16, 70);
        c.closePath();
        c.fillStyle = "#b08a4a";
        c.fill();
        c.restore();
      } else if (style === "bramble") {
        // Thorny vines creep over the wall, and a red banner hangs.
        c.strokeStyle = "#3f5a33";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(wx + 60, 120);
        for (let y = 120; y < 430; y += 30)
          c.quadraticCurveTo(
            wx + 80,
            y + 15,
            wx + 60 + Math.sin(y) * 14,
            y + 30,
          );
        c.stroke();
        this.rounded(wx + 130, 150, 34, 90, 3, "#a8423f", "#7a2c2a");
        this.ellipse(wx + 147, 190, 9, 9, "#e9c46a");
      } else {
        // A storm flag snapping in the wind.
        this.line(
          [
            [wx + 130, 100],
            [wx + 130, 200],
          ],
          "#3a3f4a",
          3,
        );
        c.beginPath();
        c.moveTo(wx + 130, 104);
        for (let i = 0; i <= 4; i++)
          c.lineTo(wx + 130 - i * 12, 110 + Math.sin(time * 9 + i) * 5);
        c.lineTo(wx + 82, 128);
        c.lineTo(wx + 130, 126);
        c.closePath();
        c.fillStyle = "#e0b84a";
        c.fill();
      }
    }
  }

  /** Thorn beds and lightning marks: dormant, warning, then striking. */
  private trapArt(
    game: Game,
    trap: NonNullable<Game["level"]["traps"]>[number],
    time: number,
  ) {
    if (!this.visible(trap.x + trap.w / 2, trap.w / 2 + 40)) return;
    const c = this.ctx;
    const t = game.trapCycle(trap);
    const striking = t < trap.active;
    const warning = !striking && trap.period - t < 0.7;
    if (trap.kind === "geyser") {
      // A lava vent: it bubbles and glows, then bursts into a fire column.
      const cx = trap.x + trap.w / 2;
      this.ellipse(cx, trap.y - 2, trap.w / 2 + 6, 7, "#3a2420", "#1e100c", 2);
      this.ellipse(
        cx,
        trap.y - 3,
        trap.w / 2 - 2,
        4,
        striking ? "#ffd36b" : warning ? "#ff8a3d" : "#8a2f18",
      );
      if (warning)
        for (let i = 0; i < 3; i++) {
          const bob = (time * 3 + i * 0.33) % 1;
          this.ellipse(
            cx - 10 + i * 10,
            trap.y - 6 - bob * 26,
            4 - bob * 2,
            4 - bob * 2,
            `rgba(255,150,60,${0.8 - bob * 0.6})`,
          );
        }
      if (striking) {
        const grow = Math.min(1, t / 0.15);
        const top = trap.y - 230 * grow;
        const g = c.createLinearGradient(0, top, 0, trap.y);
        g.addColorStop(0, "rgba(255,240,170,.85)");
        g.addColorStop(0.4, "rgba(255,150,60,.9)");
        g.addColorStop(1, "rgba(220,60,30,.95)");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(trap.x, trap.y);
        for (let y = trap.y; y > top; y -= 20)
          c.lineTo(trap.x + Math.sin(y * 0.1 + time * 25) * 5, y);
        c.lineTo(cx, top - 12);
        for (let y = top; y < trap.y; y += 20)
          c.lineTo(trap.x + trap.w + Math.sin(y * 0.1 + time * 25 + 2) * 5, y);
        c.closePath();
        c.fill();
      }
      return;
    }
    if (trap.kind === "thorns") {
      // A bed of brambles that rustles, then bursts up into spikes.
      const rise = striking
        ? Math.min(1, t / 0.12)
        : warning
          ? 0.15 + Math.abs(Math.sin(time * 30)) * 0.1
          : 0.08;
      this.rounded(
        trap.x - 4,
        trap.y - 8,
        trap.w + 8,
        10,
        4,
        "#4c6b3a",
        "#2f4a26",
      );
      c.save();
      for (let x = trap.x + 6; x < trap.x + trap.w - 4; x += 14) {
        const height = 34 * rise * (0.8 + ((x * 7) % 5) / 20);
        c.beginPath();
        c.moveTo(x - 6, trap.y - 6);
        c.lineTo(x, trap.y - 6 - height);
        c.lineTo(x + 6, trap.y - 6);
        c.closePath();
        c.fillStyle = striking ? "#7a5232" : "#5d7a45";
        c.fill();
        c.strokeStyle = "#3a2a1a";
        c.lineWidth = 1.2;
        c.stroke();
      }
      if (warning)
        this.ellipse(
          trap.x + trap.w / 2,
          trap.y - 4,
          trap.w / 2 + 8,
          6,
          `rgba(255,120,80,${0.25 + Math.sin(time * 20) * 0.15})`,
        );
      c.restore();
    } else {
      const cx = trap.x + trap.w / 2;
      // A glowing mark on the flagstones; brighter as the strike nears.
      const glow = striking
        ? 0.9
        : warning
          ? 0.5 + Math.sin(time * 24) * 0.3
          : 0.18;
      this.ellipse(
        cx,
        trap.y - 3,
        trap.w / 2 + 6,
        6,
        `rgba(255,226,122,${glow})`,
      );
      if (striking) {
        c.save();
        c.fillStyle = "rgba(255,250,210,.35)";
        c.fillRect(trap.x - 8, trap.y - 520, trap.w + 16, 520);
        c.strokeStyle = "#fffbe0";
        c.lineWidth = 5;
        c.lineJoin = "round";
        c.beginPath();
        let bx = cx;
        c.moveTo(bx, trap.y - 520);
        for (let y = trap.y - 520; y < trap.y; y += 40) {
          bx = cx + (hash(y + Math.floor(time * 20)) - 0.5) * 22;
          c.lineTo(bx, y + 40);
        }
        c.stroke();
        c.strokeStyle = "#ffe27a";
        c.lineWidth = 2;
        c.stroke();
        c.restore();
      }
    }
  }

  /** A cracked castle stone (or rotten board in the belfry) that shakes,
   * then falls away, and settles back later. */
  private castleStone(r: Game["platforms"][number], time: number) {
    if (r.crumbleRemaining === 0) return;
    const c = this.ctx;
    const shaking = r.crumbleRemaining > 0;
    const dx = shaking ? Math.sin(time * 45) * 1.6 : 0;
    const board = r.id?.startsWith("castle.belfry.");
    c.save();
    c.translate(dx, 0);
    this.rounded(
      r.x,
      r.y,
      r.w,
      r.h + 6,
      4,
      board ? "#7a5a40" : "#8a8f86",
      board ? "#4d3626" : "#55594f",
    );
    c.strokeStyle = board ? "#4d3626" : "#4a4e45";
    c.lineWidth = 2;
    c.beginPath();
    if (board)
      for (let x = r.x + 30; x < r.x + r.w; x += 30) {
        c.moveTo(x, r.y + 2);
        c.lineTo(x, r.y + r.h + 4);
      }
    else {
      c.moveTo(r.x + r.w * 0.35, r.y);
      c.lineTo(r.x + r.w * 0.45, r.y + 10);
      c.lineTo(r.x + r.w * 0.38, r.y + r.h + 5);
      c.moveTo(r.x + r.w * 0.7, r.y);
      c.lineTo(r.x + r.w * 0.62, r.y + 12);
    }
    c.stroke();
    c.restore();
  }

  /** A loose roof shingle, for the belfry's rafters. */
  private shingleArt(x: number, y: number, shaking: boolean, time: number) {
    const c = this.ctx;
    const dx = shaking ? Math.sin(time * 50) * 2 : 0;
    c.save();
    c.translate(x + dx, y + 14);
    c.rotate(shaking ? Math.sin(time * 40) * 0.1 : 0.05);
    this.rounded(-12, -14, 24, 28, 3, "#6a5a6e", "#3d3346");
    this.line(
      [
        [-12, 0],
        [12, 0],
      ],
      "#4d4256",
      1.5,
    );
    c.restore();
  }

  private icicleArt(x: number, y: number, shaking: boolean, time: number) {
    const c = this.ctx;
    const dx = shaking ? Math.sin(time * 50) * 2 : 0;
    c.beginPath();
    c.moveTo(x - 8 + dx, y);
    c.lineTo(x + 8 + dx, y);
    c.lineTo(x + dx, y + 36);
    c.closePath();
    c.fillStyle = "#e6f8ff";
    c.fill();
    c.strokeStyle = "#86c3de";
    c.lineWidth = 1.5;
    c.stroke();
  }

  /** Cave walls, hanging stalactites and glowing crystals in the distance.
   * Nothing here looks like a surface Pip could stand on. */
  private cavernBackdrop(camera: number, time: number) {
    const c = this.ctx;
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    for (let layer = 0; layer < 2; layer++) {
      const parallax = 0.08 + layer * 0.12;
      const spacing = 150 - layer * 30;
      const shift = camera * parallax;
      const first = Math.floor(shift / spacing) - 1;
      for (let i = first; i <= first + Math.ceil(w / spacing) + 2; i++) {
        const x = i * spacing - shift;
        const length = 60 + hash(i * 3 + layer * 17) * (110 - layer * 30);
        c.beginPath();
        c.moveTo(x - 26, 0);
        c.lineTo(x, length);
        c.lineTo(x + 26, 0);
        c.closePath();
        c.fillStyle = layer ? "#2c2f55" : "#272a4c";
        c.fill();
        // Distant crystal clusters glow softly on the far wall.
        if (hash(i + layer * 50) > 0.55) {
          const cy = h * (0.45 + hash(i * 7 + layer) * 0.25);
          const pulse = 0.35 + Math.sin(time * 1.5 + i) * 0.15;
          this.ellipse(x + 40, cy, 34, 34, `rgba(170,150,255,${pulse * 0.35})`);
          for (let k = 0; k < 3; k++) {
            c.beginPath();
            c.moveTo(x + 30 + k * 10, cy + 14);
            c.lineTo(x + 34 + k * 10, cy - 10 - k * 6);
            c.lineTo(x + 38 + k * 10, cy + 14);
            c.closePath();
            c.fillStyle = layer
              ? `rgba(196,182,255,${0.45 + pulse})`
              : `rgba(140,230,214,${0.35 + pulse})`;
            c.fill();
          }
        }
      }
    }
    // Floating motes of light drift slowly.
    for (let i = 0; i < Math.ceil((30 * w) / WIDTH); i++) {
      const x = (hash(i + 400) * (w + 100) - camera * 0.04 + w * 4) % (w + 100);
      const y = (hash(i + 420) * h * 0.8 + Math.sin(time * 0.6 + i) * 8) % h;
      c.globalAlpha = 0.3 + hash(i + 440) * 0.5;
      this.ellipse(x, y, 1.6, 1.6, "#e8deff");
    }
    c.globalAlpha = 1;
  }

  /** Crystal ledges: sliding or rising ones are violet; cracked ones turn
   * pale and split during their warning before they shatter. */
  private crystalLedge(r: Game["platforms"][number], time: number) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    const cracked = r.kind === "crumble";
    const warning = cracked && r.crumbleRemaining > 0;
    const urgency = warning
      ? 1 - Math.min(1, r.crumbleRemaining / CRUMBLE_WARNING)
      : 0;
    c.save();
    c.translate(warning ? Math.sin(time * 33) * urgency * 2 : 0, 0);
    const top = warning ? "#f2e4ff" : cracked ? "#c5b6ef" : "#a996f0";
    const base = warning ? "#b49ad8" : cracked ? "#7e6fb2" : "#5f4fb0";
    this.rounded(x, y, w, h, 4, base, "#3b2f75");
    this.rounded(x + 2, y + 1, w - 4, 8, 3, top);
    // Facets under the flat top, as crystal points.
    for (let xx = x + 10; xx < x + w - 6; xx += 22) {
      c.beginPath();
      c.moveTo(xx - 8, y + h);
      c.lineTo(xx, y + h + 9);
      c.lineTo(xx + 8, y + h);
      c.closePath();
      c.fillStyle = base;
      c.fill();
    }
    this.line(
      [
        [x + 4, y + 1.5],
        [x + w - 4, y + 1.5],
      ],
      "rgba(255,255,255,.85)",
      2,
    );
    if (cracked)
      for (let i = 1; i < 4; i++) {
        const xx = x + (w * i) / 4;
        this.line(
          [
            [xx, y + 2],
            [xx - 5, y + 9],
            [xx + 2, y + h - 2 + urgency * 6],
          ],
          warning ? "#5b3f8f" : "rgba(59,47,117,.5)",
          1.5 + urgency,
        );
      }
    if (!cracked) {
      // A soft glow shows which crystals carry you.
      c.globalAlpha = 0.25 + Math.sin(time * 3 + x) * 0.1;
      this.ellipse(x + w / 2, y + h / 2, w * 0.6, 16, "#bfaeff");
      c.globalAlpha = 1;
    }
    c.restore();
  }

  /** Gulp, the garden tree frog Pip can ride. Drawn standing on `feet`. */
  private gulpFrog(
    cx: number,
    feet: number,
    facing: number,
    time: number,
    startled: boolean,
    scale = 1.3,
    fluttering = false,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(cx, feet);
    c.scale(facing < 0 ? -scale : scale, scale);
    if (fluttering) {
      // Legs pedal fast under it during a flutter.
      for (const side of [-1, 1]) {
        const kick = Math.sin(time * 40 + side) * 6;
        this.line(
          [
            [side * 8, -4],
            [side * 12 + kick, 6],
            [side * 18 + kick, 8],
          ],
          "#3f9a52",
          4,
        );
      }
    }
    const bob = startled
      ? Math.abs(Math.sin(time * 18)) * -6
      : Math.sin(time * 3) * 0.8;
    c.translate(0, bob);
    this.ellipse(0, 0, 24, 4, "rgba(30,60,40,.2)");
    // Back legs, body, pale belly and a leafy crest.
    this.ellipse(-16, -6, 11, 7, "#3f9a52", "#2a6b3a", 1.5);
    this.ellipse(14, -4, 6, 4, "#3f9a52", "#2a6b3a", 1.5);
    this.ellipse(0, -13, 25, 13, "#56b866", "#2a6b3a", 2);
    this.ellipse(6, -8, 15, 6, "#d9efb0");
    this.leaf(-8, -24, 9, -1.2, "#8fd86f");
    // Big friendly eyes on top of the head.
    for (const ex of [12, 22]) {
      this.ellipse(ex, -24, 6, 6, "#56b866", "#2a6b3a", 1.5);
      this.ellipse(ex + 1, -24, 3.5, 3.5, "#fffbe8");
      this.ellipse(ex + 2, -24, 1.8, 2.2, "#2b3a32");
    }
    this.line(
      [
        [14, -11],
        [22, -10],
        [28, -13],
      ],
      "#2a6b3a",
      1.6,
    );
    this.ellipse(18, -12, 3, 2, "rgba(242,143,163,.6)");
    c.restore();
  }

  /** Open marsh water: drawn beneath the banks, so only real gaps show it. */
  private marshWater(camera: number, time: number) {
    const c = this.ctx;
    const left = camera - 40;
    const right = camera + this.viewportWidth + 40;
    const surface = 452;
    const water = c.createLinearGradient(0, surface, 0, 660);
    water.addColorStop(0, "#5fa6a0");
    water.addColorStop(1, "#2f6763");
    c.fillStyle = water;
    c.fillRect(left, surface, right - left, 700 - surface);
    for (let xx = Math.floor(left / 90) * 90; xx < right; xx += 90) {
      const drift = Math.sin(time * 1.3 + xx * 0.05) * 6;
      this.line(
        [
          [xx + drift, surface + 9],
          [xx + 34 + drift, surface + 9],
        ],
        "rgba(222,247,233,.45)",
        2,
      );
    }
    this.line(
      [
        [left, surface],
        [right, surface],
      ],
      "rgba(214,244,226,.7)",
      3,
    );
  }

  /** Lily pads: sliding pads and sinking pads share a look; sinking pads
   * turn amber and wobble during their warning before they slip under. */
  private lilyPad(r: Game["platforms"][number], time: number) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    const sinking = r.kind === "crumble";
    const warning = sinking && r.crumbleRemaining > 0;
    const urgency = warning
      ? 1 - Math.min(1, r.crumbleRemaining / CRUMBLE_WARNING)
      : 0;
    const wobble = warning ? Math.sin(time * 31) * urgency * 2 : 0;
    c.save();
    c.translate(wobble, urgency * 4);
    const fill = warning ? "#c9c46b" : sinking ? "#7fbf7a" : "#5fb889";
    const edge = warning ? "#8a7d3e" : sinking ? "#4c8a58" : "#2f7a63";
    this.rounded(x, y, w, h, h / 2, fill, edge);
    // A notch marks the pad as a lily without changing its flat top.
    c.beginPath();
    c.moveTo(x + w / 2, y + h / 2);
    c.lineTo(x + w / 2 - 9, y + h);
    c.lineTo(x + w / 2 + 9, y + h);
    c.closePath();
    c.fillStyle = "#4f948c";
    c.fill();
    this.line(
      [
        [x + 6, y + 2],
        [x + w - 6, y + 2],
      ],
      warning ? "#f1e6a1" : "#c8efb2",
      3,
    );
    for (let i = 1; i < 4; i++) {
      const xx = x + (w * i) / 4;
      this.line(
        [
          [x + w / 2, y + h / 2],
          [xx, y + 4],
        ],
        sinking ? "rgba(52,110,70,.35)" : "rgba(40,110,84,.35)",
        1.5,
      );
    }
    if (!sinking) this.ellipse(x + w - 22, y + 5, 7, 4, "#f6b6c6");
    c.restore();
    // Ripples show the pad is afloat.
    this.ellipse(
      x + w / 2,
      y + h + 4,
      w * 0.55 + Math.sin(time * 2 + x) * 4,
      4,
      "rgba(214,244,226,.25)",
    );
  }

  private movingLeaf(r: Rect, time: number) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    c.save();
    c.beginPath();
    c.moveTo(x, y + 2);
    c.lineTo(x + w, y + 2);
    c.quadraticCurveTo(x + w * 0.73, y + h + 10, x + w / 2, y + h + 5);
    c.quadraticCurveTo(x + w * 0.18, y + h + 9, x, y + 2);
    c.closePath();
    c.fillStyle = "#62be94";
    c.fill();
    c.strokeStyle = "#347c72";
    c.lineWidth = 2;
    c.stroke();
    this.line(
      [
        [x + 3, y + 1],
        [x + w - 3, y + 1],
      ],
      "#c2edac",
      4,
    );
    this.line(
      [
        [x + 12, y + 7],
        [x + w - 12, y + 7],
      ],
      "#3e947c",
      2,
    );
    for (let i = 1; i < 5; i++) {
      const xx = x + (w * i) / 5;
      this.line(
        [
          [xx, y + 7],
          [xx - 7, y + h - 1],
        ],
        "#a2dbab",
        1.5,
      );
    }
    this.line(
      [
        [x + w / 2, y + h + 3],
        [x + w / 2 + Math.sin(time * 2) * 4, y + h + 17],
      ],
      "#4a947a",
      2,
    );
    c.restore();
  }

  private crumbleCloud(r: Game["platforms"][number], time: number) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    const warning = r.crumbleRemaining > 0;
    const urgency = warning
      ? 1 - Math.min(1, r.crumbleRemaining / CRUMBLE_WARNING)
      : 0;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h + 22);
    c.clip();
    this.rounded(
      x,
      y,
      w,
      h,
      10,
      warning ? "#ffe6bc" : "#f2fcff",
      warning ? "#c6986a" : "#9fcbd6",
    );
    for (let i = 0; i < Math.ceil(w / 25); i++)
      this.ellipse(
        x + 12 + i * 25,
        y + h - 3,
        16,
        10,
        warning ? "#ffe6bc" : "#f2fcff",
      );
    this.line(
      [
        [x + 5, y + 2],
        [x + w - 5, y + 2],
      ],
      warning ? "#ffcb84" : "#ffffff",
      4,
    );
    if (warning) {
      const offset = Math.sin(time * 37) * urgency * 2;
      for (let i = 0; i < 3; i++) {
        const xx = x + (w * (i + 1)) / 4 + offset;
        this.line(
          [
            [xx, y + 3],
            [xx - 4, y + 9],
            [xx + 2, y + 14 + urgency * 6],
          ],
          "#cb996e",
          1.5 + urgency,
        );
      }
      c.fillStyle = "#dc9d61";
      c.fillRect(x + 7, y + h - 4, (w - 14) * (1 - urgency), 2);
    }
    c.restore();
  }

  private rewardBlock(r: Game["platforms"][number], time: number) {
    const c = this.ctx;
    const { x, y, w, h, rewardPower, rewardUsed } = r;
    const colors = {
      diamond: { face: "#f0a463", edge: "#9a5a34", glyph: "#fff1c9" },
      feather: { face: "#a6d786", edge: "#568457", glyph: "#fff8d6" },
      star: { face: "#f9cf68", edge: "#a6793e", glyph: "#fff8ce" },
      magnet: { face: "#e98a8a", edge: "#9c4646", glyph: "#fff1f1" },
      shield: { face: "#8fc7ee", edge: "#3f7aa8", glyph: "#f2faff" },
      spring: { face: "#b8e070", edge: "#5f8a32", glyph: "#fbffe8" },
    } as const;
    if (!rewardPower) return;
    const tone = colors[rewardPower];
    const face = rewardUsed ? "#a9a399" : tone.face;
    const edge = rewardUsed ? "#77796f" : tone.edge;
    this.rounded(x, y, w, h, 6, face, edge);
    this.rounded(
      x + 4,
      y + 3,
      w - 8,
      h - 8,
      4,
      rewardUsed ? "#bdb9ae" : "rgba(255,255,255,.25)",
    );
    c.save();
    c.translate(x + w / 2, y + h / 2 - 1);
    c.fillStyle = rewardUsed ? "#8b8980" : tone.glyph;
    c.strokeStyle = rewardUsed ? "#7c8074" : tone.edge;
    c.lineWidth = 1.5;
    c.lineJoin = "round";
    if (rewardPower === "star") {
      this.starPath(0, 0, 10);
      c.fill();
      c.stroke();
    } else if (rewardPower === "magnet") {
      // A horseshoe magnet.
      c.lineWidth = 5;
      c.lineCap = "butt";
      c.strokeStyle = rewardUsed ? "#8b8980" : tone.glyph;
      c.beginPath();
      c.arc(0, -1, 6.5, Math.PI, 0, true);
      c.lineTo(6.5, 7);
      c.moveTo(-6.5, -1);
      c.lineTo(-6.5, 7);
      c.stroke();
      if (!rewardUsed) {
        this.rounded(-9, 5, 5, 4, 1, "#d8dde4");
        this.rounded(4, 5, 5, 4, 1, "#d8dde4");
      }
    } else if (rewardPower === "shield") {
      this.ellipse(
        0,
        0,
        10,
        10,
        rewardUsed ? "#8b8980" : "rgba(242,250,255,.85)",
        edge,
        1.5,
      );
      this.ellipse(-3, -4, 3, 2, "#ffffff");
    } else if (rewardPower === "spring") {
      // A coiled spring.
      c.lineWidth = 2.4;
      c.strokeStyle = rewardUsed ? "#8b8980" : tone.glyph;
      c.beginPath();
      for (let i = 0; i <= 4; i++) {
        const yy = 8 - i * 4;
        c.moveTo(-7, yy);
        c.lineTo(7, yy - 2);
      }
      c.stroke();
    } else if (rewardPower === "diamond") {
      // A Sunseed glyph: a seed with a small leaf.
      c.beginPath();
      c.moveTo(0, -7);
      c.bezierCurveTo(7, -4, 8, 4, 0, 10);
      c.bezierCurveTo(-8, 4, -7, -4, 0, -7);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(0, -7);
      c.quadraticCurveTo(6, -12, 9, -9);
      c.quadraticCurveTo(5, -6, 0, -7);
      c.fillStyle = rewardUsed ? "#8b8980" : "#bfe58f";
      c.fill();
    } else {
      c.rotate(0.65);
      c.beginPath();
      c.moveTo(0, 10);
      c.bezierCurveTo(-10, 2, -8, -8, 0, -11);
      c.bezierCurveTo(8, -8, 10, 2, 0, 10);
      c.fill();
      c.stroke();
      this.line(
        [
          [0, -8],
          [0, 10],
        ],
        edge,
        1.3,
      );
    }
    c.restore();
    if (!rewardUsed) {
      // A small upward chevron on the underside hints where Pip should bump.
      this.line(
        [
          [x + w / 2 - 5, y + h - 3],
          [x + w / 2, y + h - 7],
          [x + w / 2 + 5, y + h - 3],
        ],
        edge,
        1.5,
      );
      const glow = 0.4 + 0.3 * Math.sin(time * 2 + x);
      this.ellipse(x + 7, y + 6, 2, 2, `rgba(255,255,255,${glow})`);
    }
  }

  private crackedBlock(
    r: Rect & { rewardCoins?: number; enemyBreakable?: boolean },
  ) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    this.rounded(x, y, w, h, 5, "#d7a36c", "#8e6849");
    this.rounded(x + 3, y + 3, w - 6, Math.max(3, h * 0.28), 3, "#efc58e");
    this.line(
      [
        [x + w * 0.52, y + 1],
        [x + w * 0.43, y + h * 0.32],
        [x + w * 0.59, y + h * 0.54],
        [x + w * 0.41, y + h],
      ],
      "#8d654d",
      2.5,
    );
    this.line(
      [
        [x + 2, y + h * 0.57],
        [x + w * 0.34, y + h * 0.57],
      ],
      "#b17d54",
      2,
    );
    this.line(
      [
        [x + w * 0.66, y + h * 0.57],
        [x + w - 2, y + h * 0.57],
      ],
      "#b17d54",
      2,
    );
    if (r.enemyBreakable) {
      for (let i = 0; i < 3; i++)
        this.line(
          [
            [x + w * 0.67 + i * 4, y + h * 0.25],
            [x + w * 0.61 + i * 4, y + h * 0.7],
          ],
          "#9c6449",
          2,
        );
    }
    if ((r.rewardCoins ?? 0) > 0 && w >= 30 && h >= 24) {
      this.ellipse(x + w * 0.24, y + h * 0.42, 5, 7, "#ffdf8c", "#b18448", 1);
      c.fillStyle = "#9a7342";
      c.fillRect(x + w * 0.24 - 0.7, y + h * 0.42 - 4, 1.4, 8);
    }
  }

  private flower(x: number, y: number, p: Palette, seed: number, time: number) {
    const sway = Math.sin(time * 1.3 + seed) * 2;
    this.line(
      [
        [x, y],
        [x + sway, y - 13],
      ],
      p.leafShade,
      2,
    );
    this.leaf(x, y - 4, 5, 1, p.grass);
    const color = hash(seed) > 0.5 ? "#fff8da" : "#ffab9b";
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI * 2) / 5;
      this.ellipse(
        x + sway + Math.cos(a) * 3,
        y - 15 + Math.sin(a) * 3,
        3,
        3,
        color,
      );
    }
    this.ellipse(x + sway, y - 15, 2.3, 2.3, "#efb73f");
  }

  private mushroom(x: number, y: number, p: Palette, seed: number) {
    this.rounded(x - 3, y - 11, 6, 11, 3, "#fff2d1");
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y - 10, 12, 10, 0, Math.PI, 0);
    c.quadraticCurveTo(x + 12, y - 5, x, y - 6);
    c.quadraticCurveTo(x - 12, y - 5, x - 12, y - 10);
    c.fillStyle = hash(seed) > 0.45 ? "#ed8c74" : p.leafLight;
    c.fill();
    this.ellipse(x - 4, y - 14, 3, 2, "#fff2d1");
    this.ellipse(x + 5, y - 11, 2, 1.5, "#fff2d1");
  }

  /** A shield bubble, magnet glow and spring sparkle around the hero. */
  private powerEffects(
    game: Game,
    center: number,
    feet: number,
    size: number,
    time: number,
  ) {
    const c = this.ctx;
    const cy = feet - 26 * size;
    if (game.magnetRemaining > 0) {
      const fading = game.magnetRemaining < 2 && Math.sin(time * 20) > 0;
      if (!fading) {
        c.save();
        c.strokeStyle = "rgba(233,120,120,.45)";
        c.lineWidth = 2;
        c.setLineDash([6, 8]);
        c.lineDashOffset = -time * 40;
        c.beginPath();
        c.arc(center, cy, 60 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }
    if (game.shield) {
      const g = c.createRadialGradient(
        center - 8,
        cy - 10,
        4,
        center,
        cy,
        40 * size,
      );
      g.addColorStop(0, "rgba(255,255,255,.25)");
      g.addColorStop(0.75, "rgba(143,199,238,.18)");
      g.addColorStop(1, "rgba(143,199,238,.5)");
      this.ellipse(
        center,
        cy,
        34 * size,
        38 * size,
        g as unknown as string,
        "rgba(120,180,230,.7)",
        2,
      );
      this.ellipse(
        center - 12 * size,
        cy - 16 * size,
        6,
        4,
        "rgba(255,255,255,.8)",
      );
    }
    if (game.springRemaining > 0) {
      const fading = game.springRemaining < 2 && Math.sin(time * 20) > 0;
      if (!fading)
        for (const dx of [-9, 9]) {
          this.ellipse(
            center + dx * size,
            feet - 2,
            6,
            3,
            "#b8e070",
            "#5f8a32",
            1.2,
          );
          this.ellipse(
            center + dx * size,
            feet + 3 + Math.sin(time * 12 + dx) * 2,
            2,
            2,
            "rgba(255,255,200,.8)",
          );
        }
    }
  }

  /** A timed coin ring and, while it runs, its blue coins and timer. */
  private coinRing(ring: Game["coinRings"][number], time: number) {
    const c = this.ctx;
    if (ring.state === "active")
      ring.coins.forEach((coin, i) => {
        if (coin.collected || !this.visible(coin.x, 24)) return;
        const bob = Math.sin(time * 4 + i * 0.6) * 2.5;
        this.ellipse(coin.x, coin.y + bob, 13, 15, "rgba(140,210,255,.22)");
        this.ellipse(
          coin.x,
          coin.y + 1 + bob,
          8,
          11,
          "#3f86c6",
          "#2c6aa3",
          1.5,
        );
        this.ellipse(coin.x, coin.y - 1 + bob, 7, 10, "#7cc4f5");
        this.ellipse(coin.x - 1.5, coin.y - 3 + bob, 4, 6, "#c8ecff");
      });
    if (ring.state === "done" || !this.visible(ring.x, 40)) return;
    const pulse = ring.state === "ready" ? Math.sin(time * 3) * 2 : 0;
    c.save();
    c.globalAlpha = ring.state === "cooldown" ? 0.35 : 1;
    c.lineWidth = 6;
    c.strokeStyle = "#5fb3ee";
    c.beginPath();
    c.ellipse(ring.x, ring.y, 16 + pulse, 26 + pulse, 0, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = "#e6f6ff";
    c.stroke();
    if (ring.state === "active") {
      // The timer drains around the ring.
      c.lineWidth = 5;
      c.strokeStyle = "#ffd96a";
      c.beginPath();
      c.arc(
        ring.x,
        ring.y - 44,
        10,
        -Math.PI / 2,
        -Math.PI / 2 + (ring.remaining / ring.time) * Math.PI * 2,
      );
      c.stroke();
    }
    c.restore();
  }

  private coin(x: number, y: number, time: number, index: number) {
    const c = this.ctx;
    const bob = Math.sin(time * 2.8 + index * 0.65) * 2.5;
    c.save();
    c.translate(x, y + bob);
    const width = 6.5 + Math.abs(Math.cos(time * 2 + index * 0.5)) * 2.5;
    this.ellipse(0, 0, 13, 15, "rgba(255,237,137,.18)");
    this.ellipse(0, 1, width, 11, "#cb8c2b", "#b9822b", 1.5);
    this.ellipse(0, -1, width - 0.7, 10, "#ffd360");
    this.ellipse(-1.5, -3, (width - 2) * 0.65, 6, "#ffe99d");
    this.leaf(0, -5, 5, 0.45, "#fff5c5");
    this.line(
      [
        [0, -3],
        [0, 4],
      ],
      "#dc9d37",
      1.5,
    );
    c.restore();
  }

  private starPath(x: number, y: number, radius: number) {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius * 0.48;
      if (i === 0) c.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      else c.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    c.closePath();
    c.lineJoin = "round";
  }

  private star(x: number, y: number, time: number, index: number) {
    const c = this.ctx;
    const bob = Math.sin(time * 2 + index) * 3;
    this.ellipse(x, y + bob, 25, 25, "rgba(255,230,133,.15)");
    this.ellipse(x, y + bob, 19, 19, "rgba(255,230,133,.19)");
    this.starPath(x, y + bob + 2, 17);
    c.fillStyle = "#bc802a";
    c.fill();
    this.starPath(x, y + bob, 17);
    c.fillStyle = "#ffe47b";
    c.fill();
    c.strokeStyle = "#e7b345";
    c.lineWidth = 1.6;
    c.stroke();
    this.line(
      [
        [x - 5, y - 2 + bob],
        [x - 1, y - 9 + bob],
      ],
      "#fff7c8",
      3,
    );
    const blink = Math.sin(time * 2 + index);
    if (blink > 0) {
      this.line(
        [
          [x + 21, y - 20],
          [x + 21, y - 12],
        ],
        "#fffce2",
        2,
      );
      this.line(
        [
          [x + 17, y - 16],
          [x + 25, y - 16],
        ],
        "#fffce2",
        2,
      );
    }
  }

  /** The Sunseed: a glowing golden seed with a fresh leaf. Collecting one
   * makes Pip grow. (Code and saves still call it a "diamond".) */
  private diamond(x: number, y: number, time: number, index: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y + Math.sin(time * 2.1 + index) * 3);
    const pulse = 0.5 + 0.5 * Math.sin(time * 3 + index);
    this.ellipse(0, 2, 24, 25, `rgba(255,214,110,${0.14 + pulse * 0.08})`);
    this.ellipse(0, 2, 18, 19, "rgba(255,240,190,.22)");
    // Seed body: a plump teardrop, darker toward the base.
    c.beginPath();
    c.moveTo(0, -12);
    c.bezierCurveTo(11, -8, 14, 6, 0, 16);
    c.bezierCurveTo(-14, 6, -11, -8, 0, -12);
    const body = c.createLinearGradient(0, -12, 0, 16);
    // Warm amber, so a Sunseed never reads as one of the gold coins.
    body.addColorStop(0, "#ffd48a");
    body.addColorStop(0.5, "#f0913f");
    body.addColorStop(1, "#c2602a");
    c.fillStyle = body;
    c.fill();
    c.lineWidth = 1.6;
    c.strokeStyle = "#a9652f";
    c.stroke();
    // A soft highlight and a seam make it read as a seed, not a coin.
    this.ellipse(-4, -3, 3, 6, "rgba(255,255,235,.7)");
    this.line(
      [
        [0, -10],
        [1.5, 3],
        [0, 14],
      ],
      "rgba(169,101,47,.55)",
      1.3,
    );
    // The sprout on top echoes Pip's own leaf.
    const sway = Math.sin(time * 2.6 + index) * 0.15;
    this.line(
      [
        [0, -11],
        [1, -16],
      ],
      "#4f9a4c",
      2,
    );
    this.leaf(1, -16, 9, -0.9 + sway, "#7fd06a");
    this.leaf(1, -16, 7, 0.9 + sway, "#5fb85a");
    c.restore();
  }
  private starAura(
    x: number,
    feet: number,
    size: number,
    remaining: number,
    time: number,
    foreground: boolean,
  ) {
    const c = this.ctx;
    const urgent = remaining < 3;
    const centerY = feet - 29 * size;
    const fade = Math.min(1, remaining / 0.65);
    c.save();
    c.globalAlpha = fade;
    if (!foreground) {
      // A pulsing glow around Pip's body, not a shield outline. It beats
      // faster in the last few seconds.
      const pulse = 0.5 + 0.5 * Math.sin(time * (urgent ? 11 : 5));
      const radius = (38 + pulse * 9) * size;
      const glow = c.createRadialGradient(
        x,
        centerY,
        4 * size,
        x,
        centerY,
        radius,
      );
      glow.addColorStop(0, `rgba(255,252,190,${0.5 + pulse * 0.2})`);
      glow.addColorStop(
        0.55,
        urgent
          ? `rgba(255,170,90,${0.3 + pulse * 0.15})`
          : `rgba(255,226,110,${0.28 + pulse * 0.15})`,
      );
      glow.addColorStop(1, "rgba(255,242,155,0)");
      this.ellipse(x, centerY, radius, radius, glow);
      // Short, jagged sparks crackle out from the body and re-form a few
      // times a second, like static electricity.
      const frame = Math.floor(time * 14);
      c.save();
      c.lineCap = "round";
      c.lineJoin = "round";
      c.shadowColor = urgent ? "#ffb15c" : "#fff3a0";
      c.shadowBlur = 8;
      for (let i = 0; i < 5; i++) {
        const seed = frame * 7 + i * 13;
        if (hash(seed) < 0.25) continue; // some sparks blink out
        const angle = (i / 5) * Math.PI * 2 + hash(seed + 1) * 0.9;
        const inner = 15 * size;
        const outer = (27 + hash(seed + 2) * 11) * size;
        const points: [number, number][] = [];
        for (let k = 0; k <= 3; k++) {
          const r = inner + ((outer - inner) * k) / 3;
          const bend =
            k === 0 || k === 3 ? 0 : (hash(seed + 3 + k) - 0.5) * 0.7;
          points.push([
            x + Math.cos(angle + bend) * r,
            centerY + Math.sin(angle + bend) * r * 1.2,
          ]);
        }
        this.line(points, urgent ? "#ffc27a" : "#fffbd2", 2.2 * size);
      }
      c.restore();
    }
    const colors = urgent
      ? ["#ffd580", "#ffb16d", "#fff2bd"]
      : ["#fff19b", "#a4f5eb", "#e9b4f4"];
    for (let i = 0; i < 3; i++) {
      const angle = time * 2.2 + (i / 3) * Math.PI * 2;
      const depth = Math.sin(angle);
      if (depth >= 0 !== foreground) continue;
      const sx = x + Math.cos(angle) * 31 * size;
      const sy = centerY + depth * 24 * size;
      this.starPath(sx, sy, (4.5 + (depth + 1) * 0.7) * Math.sqrt(size));
      c.fillStyle = colors[i];
      c.fill();
      c.lineWidth = 1;
      c.strokeStyle = "#fffbee";
      c.stroke();
      this.ellipse(
        sx - 5 * Math.cos(angle),
        sy - 4 * Math.sin(angle),
        1.4,
        1.4,
        "#fff9d8",
      );
    }
    c.restore();
  }

  private transformation(
    x: number,
    feet: number,
    size: number,
    growing: boolean,
    remaining: number,
  ) {
    const c = this.ctx;
    const progress = 1 - remaining / 0.55;
    c.save();
    c.globalAlpha = (1 - progress) * 0.75;
    c.strokeStyle = growing ? "#b8fbff" : "#ffbea2";
    c.lineWidth = 3 * (1 - progress) + 1;
    c.beginPath();
    c.ellipse(
      x,
      feet - 24 * size,
      (20 + progress * 24) * size,
      (28 + progress * 9) * size,
      0,
      0,
      Math.PI * 2,
    );
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const radius = (25 + progress * 22) * size;
      this.starPath(
        x + Math.cos(angle) * radius,
        feet - 25 * size + Math.sin(angle) * radius,
        (3 + (1 - progress) * 2) * Math.sqrt(size),
      );
      c.fillStyle = growing ? "#caffff" : "#ffd7b5";
      c.fill();
    }
    c.restore();
  }

  private bug(enemy: Game["enemies"][number], time: number, squashed = 0) {
    const c = this.ctx;
    c.save();
    c.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h);
    c.scale(enemy.facing < 0 ? -1 : 1, 1);
    if (squashed > 0) {
      c.globalAlpha = Math.min(1, squashed / (ENEMY_SQUASH_DURATION * 0.5));
      c.scale(1.24, 0.26);
    }
    if (enemy.kind === "hopper") {
      this.grasshopper(enemy, time, squashed);
      c.restore();
      return;
    }
    if (enemy.kind === "ember") {
      // A little fire sprite: a flickering flame with bright eyes.
      const flick = Math.sin(time * 18 + enemy.x) * 2;
      this.ellipse(0, -14, 16, 18, "rgba(255,160,60,.35)");
      c.beginPath();
      c.moveTo(0, -34 - flick);
      c.quadraticCurveTo(14, -18, 10, -4);
      c.quadraticCurveTo(0, 2, -10, -4);
      c.quadraticCurveTo(-14, -18, 0, -34 - flick);
      c.fillStyle = "#ff8a3d";
      c.fill();
      this.ellipse(0, -10, 7, 8, "#ffd36b");
      this.ellipse(-3, -14, 2, 2.5, "#3a1a10");
      this.ellipse(4, -14, 2, 2.5, "#3a1a10");
      c.restore();
      return;
    }
    if (enemy.kind === "fish") {
      // A round little minnow with a flicking tail, facing its direction.
      const flick = Math.sin(time * 14 + enemy.x * 0.05) * 0.35;
      c.save();
      c.translate(-16, -14);
      c.rotate(flick);
      c.beginPath();
      c.moveTo(4, 0);
      c.lineTo(-10, -9);
      c.lineTo(-10, 9);
      c.closePath();
      c.fillStyle = "#f2a15f";
      c.fill();
      c.restore();
      this.ellipse(0, -14, 17, 12, "#f7b968", "#b9683a", 2);
      this.ellipse(2, -9, 10, 4, "#ffe2b0");
      this.line(
        [
          [-4, -24],
          [2, -30],
          [8, -24],
        ],
        "#e88a4d",
        2.5,
      );
      this.ellipse(9, -17, 3.5, 3.5, "#fffbe8");
      this.ellipse(10, -17, 1.8, 2, "#2b3a32");
      c.restore();
      return;
    }
    const charging = enemy.kind === "charger";
    const warning = charging && enemy.state === "windup" && squashed === 0;
    const stride =
      squashed > 0
        ? 0
        : Math.sin(
            time * (enemy.state === "charge" ? 30 : 15) + enemy.x * 0.05,
          ) * 2;
    this.ellipse(0, -1, 18, 3, "rgba(36,65,53,.17)");
    if (warning) {
      // Windup has a static high-contrast tell plus a small pawing motion.
      this.ellipse(0, -14, 23, 17, "rgba(255,187,98,.22)");
      this.rounded(-4, -47, 8, 12, 3, "#fff2bd", "#ac6545");
      this.ellipse(0, -30, 2.5, 2.5, "#ac6545");
      c.translate(Math.sin(time * 24) * 0.7, 1.5);
    }
    if (charging && enemy.state === "charge" && squashed === 0) {
      for (let i = 0; i < 3; i++)
        this.line(
          [
            [-23 - i * 3, -6 - i * 7],
            [-34 - i * 4, -6 - i * 7],
          ],
          "rgba(239,164,111,.7)",
          2,
        );
    }
    for (let i = 0; i < 3; i++) {
      const x = -11 + i * 9;
      this.line(
        [
          [x, -8],
          [x - 3, -3 + (i % 2 ? stride : -stride)],
          [x + 2, -2],
        ],
        charging ? "#905d48" : "#635879",
        3,
      );
    }
    this.ellipse(
      -1,
      -13,
      15,
      11,
      charging ? "#db8a60" : "#967cc7",
      charging ? "#905b48" : "#62557f",
      2,
    );
    this.ellipse(-5, -17, 7, 4, charging ? "#ffc389" : "#c1a3e7");
    this.line(
      [
        [0, -22],
        [2, -6],
      ],
      charging ? "#a46a4d" : "#715e99",
      2,
    );
    this.ellipse(10, -11, 8, 8, charging ? "#ae7356" : "#75668f");
    this.line(
      [
        [12, -17],
        [15, -26],
      ],
      charging ? "#905b48" : "#62557f",
      2,
    );
    this.ellipse(15, -26, 2.5, 2.5, "#f3ba78");
    this.ellipse(11, -13, 3.3, 4.3, "#fff8de");
    this.ellipse(12.3, -12.5, 1.5, 2.4, "#453e59");
    if (warning || (charging && enemy.state === "charge"))
      this.line(
        [
          [8, -18],
          [15, -15],
        ],
        "#714c3f",
        2.5,
      );
    this.line(
      [
        [12, -7],
        [15, -8],
      ],
      "#453e59",
      1.5,
    );
    c.restore();
  }

  private grasshopper(
    enemy: Game["enemies"][number],
    time: number,
    squashed: number,
  ) {
    const tucked = !enemy.grounded && squashed === 0;
    const knee = tucked ? -14 : -4 + Math.sin(time * 8) * 1.5;
    this.ellipse(0, -1, 17, 3, "rgba(36,65,53,.16)");
    this.line(
      [
        [-8, -16],
        [-19, -21],
        [-16, knee],
        [-5, -2],
      ],
      "#3f7955",
      4,
    );
    this.line(
      [
        [2, -11],
        [7, tucked ? -4 : -1],
        [15, tucked ? -5 : -1],
      ],
      "#4e8d59",
      3,
    );
    this.ellipse(-3, -14, 14, 9, "#87bc62", "#3f7955", 2);
    this.ellipse(-6, -17, 9, 4, "#bedb87");
    this.line(
      [
        [-13, -12],
        [3, -13],
      ],
      "#64a45d",
      2,
    );
    this.ellipse(9, -16, 8, 10, "#a9ce72", "#3f7955", 1.5);
    this.ellipse(12, -18, 3.5, 4.2, "#fff5cf");
    this.ellipse(13, -17, 1.5, 2.5, "#375b43");
    this.line(
      [
        [7, -24],
        [6, -32],
        [1, -35],
      ],
      "#3f7955",
      1.5,
    );
    this.line(
      [
        [12, -24],
        [16, -31],
        [20, -32],
      ],
      "#3f7955",
      1.5,
    );
    this.ellipse(1, -35, 2, 2, "#edcf80");
    this.ellipse(20, -32, 2, 2, "#edcf80");
    this.line(
      [
        [12, -10],
        [16, -11],
      ],
      "#3f7955",
      1.5,
    );
  }

  private hero(
    x: number,
    y: number,
    vx: number,
    vy: number,
    facing: number,
    grounded: boolean,
    time: number,
    landing: number,
    size = 1,
    pose: "normal" | "hurt" | "won" | "lost" = "normal",
    outfit: OutfitId = "leaf",
    danger = false,
    flight: "none" | "ready" | "lift" | "glide" = "none",
    character: "pip" | "poppy" = "pip",
  ) {
    if (character === "poppy") {
      this.poppyHero(
        x,
        y,
        vx,
        vy,
        facing,
        grounded,
        time,
        landing,
        size,
        pose,
        outfit,
        danger,
        flight,
      );
      return;
    }
    const c = this.ctx;
    const running = grounded && Math.abs(vx) > 15;
    const outfitColor =
      outfit === "berry"
        ? "#b86c94"
        : outfit === "moon"
          ? "#829ac5"
          : outfit === "cosmetic.acorn_cap"
            ? "#a8743f"
            : outfit === "cosmetic.golden_leaf"
              ? "#e0ad3a"
              : (COSTUMES[outfit]?.[0] ?? "#69b86c");
    const outfitLight =
      outfit === "berry"
        ? "#e4a1b9"
        : outfit === "moon"
          ? "#c4d8ed"
          : outfit === "cosmetic.acorn_cap"
            ? "#d6a56a"
            : outfit === "cosmetic.golden_leaf"
              ? "#ffe28a"
              : (COSTUMES[outfit]?.[1] ?? "#8cce79");
    const costumeScarf =
      outfit === "cosmetic.bee_scarf"
        ? "#f2c552"
        : outfit === "cosmetic.golden_leaf"
          ? "#fff1b8"
          : outfit === "cosmetic.acorn_cap"
            ? "#6f9a4f"
            : outfit === "berry"
              ? "#e3b86a"
              : outfit === "moon"
                ? "#e6dba7"
                : (COSTUMES[outfit]?.[2] ?? "#eb745d");
    const scarf = this.scarfColor(costumeScarf);
    const stride = running ? Math.sin(time * 19) : 0;
    const celebration = pose === "won";
    const hurt = pose === "hurt" || pose === "lost";
    const bob = grounded
      ? running
        ? Math.abs(stride) * 1.2
        : Math.sin(time * 2.5) * 0.6
      : 0;
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    // Grown Pip is not a scaled-up small Pip: the head stays close to its
    // small size while the body and legs grow taller.
    const grown = size > 1.1;
    if (grown) c.scale(GROWN.all, GROWN.all);
    if (grounded) this.ellipse(0, -0.5, 17, 3, "rgba(28,80,50,.2)");
    c.scale(facing < 0 ? -1 : 1, 1);
    // Feet remain anchored while the torso leans into a run or recoils on a hit.
    c.rotate(hurt ? -0.06 : running ? Math.min(0.075, Math.abs(vx) / 4000) : 0);
    if (celebration) c.translate(0, -Math.abs(Math.sin(time * 5)) * 3);
    const squash =
      landing > 0 ? Math.sin((landing / 0.14) * Math.PI) * 0.09 : 0;
    const riseStretch =
      !grounded && vy < -180 ? Math.min(0.07, -vy / 10000) : 0;
    c.scale(1 + squash - riseStretch, 1 - squash + riseStretch);
    if (!grounded && vy > 260) {
      const flutter = 5 + Math.abs(Math.sin(time * 30)) * 8;
      this.ellipse(-17, -23, flutter, 7, "rgba(226,255,224,.72)", "#92c9a2", 1);
      this.ellipse(14, -23, flutter, 7, "rgba(226,255,224,.72)", "#92c9a2", 1);
    }
    // While flying, the Wind Feather shows as small wings (glideWings).
    c.save();
    if (grown) c.scale(GROWN.wide, GROWN.tall);
    // A streaming scarf makes direction and speed easy to read.
    c.beginPath();
    c.moveTo(-9, -26 + bob);
    c.quadraticCurveTo(
      -22,
      -26 + Math.sin(time * 8) * 2,
      -29 - Math.abs(vx) / 90,
      -18 + bob,
    );
    c.lineTo(-22, -17 + bob);
    c.lineTo(-24, -12 + bob);
    c.quadraticCurveTo(-14, -15, -7, -22);
    c.closePath();
    c.fillStyle = scarf;
    c.fill();
    this.scarfPattern(bob);
    if (outfit === "cosmetic.bee_scarf" && !this.wornScarf) {
      this.line(
        [
          [-16, -24],
          [-18, -18],
        ],
        "#66513b",
        3,
      );
      this.line(
        [
          [-23, -22],
          [-25, -17],
        ],
        "#66513b",
        3,
      );
    }
    // Satchel, arms, and boots remain behind the face and body.
    this.rounded(-18, -26 + bob, 9, 18, 4, "#bf874c", "#936b43");
    this.line(
      [
        [-12, -20 + bob],
        [
          -17,
          celebration
            ? -36 + Math.sin(time * 8) * 3
            : hurt
              ? -27
              : !grounded
                ? -26
                : -12 + stride * 3,
        ],
      ],
      "#398258",
      5,
    );
    this.rounded(
      -12 - stride * 4,
      !grounded && vy < 0 ? -10 : -7,
      11,
      7,
      3,
      "#386a53",
    );
    this.rounded(
      2 + stride * 4,
      !grounded && vy < 0 ? -13 : -7,
      11,
      7,
      3,
      "#386a53",
    );
    this.ellipse(0, -16 + bob, 12, 14, outfitColor, "#326d4b", 2);
    this.ellipse(2, -15 + bob, 7, 9, "#b8e6a0");
    this.line(
      [
        [11, -20 + bob],
        [
          15,
          celebration
            ? -40 + Math.sin(time * 8) * 3
            : hurt
              ? -28
              : !grounded
                ? -29
                : -12 - stride * 3,
        ],
      ],
      "#70ba69",
      5,
    );
    this.ellipse(
      15,
      celebration
        ? -39 + Math.sin(time * 8) * 3
        : hurt
          ? -27
          : !grounded
            ? -28
            : -11 - stride * 3,
      3.2,
      3.7,
      "#b8e6a0",
    );
    c.restore();
    if (grown) c.translate(0, GROWN.neck);
    // Cream face, leaf hood, and large eyes read well at phone scale.
    this.ellipse(0, -33 + bob, 16, 14, outfitColor, "#326d4b", 2);
    this.ellipse(2, -31 + bob, 12.5, 10.5, "#fff1c9");
    this.ellipse(-9, -36 + bob, 3.4, 7.3, outfitLight);
    const blink = hurt || Math.sin(time * 0.72) > 0.996;
    if (blink) {
      this.line(
        [
          [-5, -32 + bob],
          [-1, -32 + bob],
        ],
        "#285349",
        1.7,
      );
      this.line(
        [
          [5, -32 + bob],
          [9, -32 + bob],
        ],
        "#285349",
        1.7,
      );
    } else {
      this.ellipse(-3, -32 + bob, 2.7, 3.8, "#285349");
      this.ellipse(7, -32 + bob, 2.7, 3.8, "#285349");
      this.ellipse(-2.2, -33.5 + bob, 0.9, 1.1, "#ffffff");
      this.ellipse(7.8, -33.5 + bob, 0.9, 1.1, "#ffffff");
    }
    this.ellipse(-7.5, -27 + bob, 2.4, 1.4, "#f3b39a");
    this.ellipse(11, -27 + bob, 2.4, 1.4, "#f3b39a");
    c.beginPath();
    c.moveTo(1, -26 + bob);
    c.quadraticCurveTo(
      3,
      (hurt ? -29 : celebration ? -21.5 : -23.3) + bob,
      5.5,
      -26 + bob,
    );
    c.strokeStyle = "#7f7655";
    c.lineWidth = 1.3;
    c.lineCap = "round";
    c.stroke();
    this.rounded(
      -11,
      -23 + bob,
      24,
      5,
      2.5,
      outfit === "leaf" && !this.wornScarf ? "#ff9d76" : scarf,
    );
    this.ellipse(10, -21 + bob, 3, 3, scarf);
    const leafSway =
      Math.sin(time * (danger ? 9 : 4)) * (danger ? 0.08 : 0.13) + vx / 1800;
    const alertLift = danger ? 6 : 0;
    this.line(
      [
        [-1, -45 + bob],
        [1 + Math.sin(time * 4), -52 + bob - alertLift],
      ],
      "#326d4b",
      2.7,
    );
    this.leaf(
      1,
      -49 + bob - alertLift,
      11,
      -0.72 + leafSway,
      outfit === "leaf" ? "#8bcb62" : outfitLight,
    );
    this.leaf(
      1,
      -49 + bob - alertLift,
      10,
      1.07 + leafSway,
      outfit === "leaf" ? "#398c59" : outfitColor,
    );
    if (outfit === "berry") {
      for (let i = 0; i < 3; i++)
        this.ellipse(-7 + i * 4, -47 + bob, 3.2, 3.2, "#b94f76", "#8b456a", 1);
    } else if (outfit === "moon") {
      this.ellipse(-7, -43 + bob, 4, 4, "#fff0b3");
      this.ellipse(-5, -44 + bob, 3.3, 3.3, outfitColor);
    }
    this.hatArt(bob - (danger ? 3 : 0), time);
    // A slightly tucked pose communicates rising/falling without moving the feet origin.
    if (!grounded && vy < -100) {
      this.ellipse(-8, -3, 5, 3, "#386a53");
      this.ellipse(8, -5, 5, 3, "#386a53");
    }
    c.restore();
  }

  /** Poppy is a flower-crowned garden sprite with Pip's movement and collision box. */
  private poppyHero(
    x: number,
    y: number,
    vx: number,
    vy: number,
    facing: number,
    grounded: boolean,
    time: number,
    landing: number,
    size: number,
    pose: "normal" | "hurt" | "won" | "lost",
    outfit: OutfitId,
    danger: boolean,
    flight: "none" | "ready" | "lift" | "glide",
  ) {
    const c = this.ctx;
    const running = grounded && Math.abs(vx) > 15;
    const stride = running ? Math.sin(time * 19) : 0;
    const bob = grounded
      ? running
        ? Math.abs(stride) * 1.2
        : Math.sin(time * 2.5) * 0.6
      : 0;
    const hurt = pose === "hurt" || pose === "lost";
    const celebration = pose === "won";
    const outfitColor =
      outfit === "moon"
        ? "#829ac5"
        : outfit === "berry"
          ? "#a95e89"
          : (COSTUMES[outfit]?.[0] ?? "#d87892");
    const outfitLight =
      outfit === "moon"
        ? "#c4d8ed"
        : outfit === "berry"
          ? "#e4a1b9"
          : (COSTUMES[outfit]?.[1] ?? "#f4bdc1");
    const scarf = this.scarfColor(
      outfit === "cosmetic.bee_scarf"
        ? "#f2c552"
        : outfit === "moon"
          ? "#e6dba7"
          : (COSTUMES[outfit]?.[2] ?? "#e6bd72"),
    );
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    // Grown Pip is not a scaled-up small Pip: the head stays close to its
    // small size while the body and legs grow taller.
    const grown = size > 1.1;
    if (grown) c.scale(GROWN.all, GROWN.all);
    if (grounded) this.ellipse(0, -0.5, 17, 3, "rgba(28,80,50,.2)");
    c.scale(facing < 0 ? -1 : 1, 1);
    c.rotate(hurt ? -0.06 : running ? Math.min(0.075, Math.abs(vx) / 4000) : 0);
    if (celebration) c.translate(0, -Math.abs(Math.sin(time * 5)) * 3);
    const squash =
      landing > 0 ? Math.sin((landing / 0.14) * Math.PI) * 0.09 : 0;
    const rise = !grounded && vy < -180 ? Math.min(0.07, -vy / 10000) : 0;
    c.scale(1 + squash - rise, 1 - squash + rise);
    if (!grounded && vy > 260) {
      const flutter = 5 + Math.abs(Math.sin(time * 30)) * 8;
      this.ellipse(-17, -23, flutter, 7, "rgba(255,239,242,.72)", "#d79bab", 1);
      this.ellipse(14, -23, flutter, 7, "rgba(255,239,242,.72)", "#d79bab", 1);
    }
    // While flying, the Wind Feather shows as small wings (glideWings).
    c.save();
    if (grown) c.scale(GROWN.wide, GROWN.tall);
    // A little scarf and satchel mark her as Pip's fellow garden explorer.
    c.beginPath();
    c.moveTo(-9, -26 + bob);
    c.quadraticCurveTo(
      -22,
      -26 + Math.sin(time * 8) * 2,
      -29 - Math.abs(vx) / 90,
      -18 + bob,
    );
    c.lineTo(-22, -17 + bob);
    c.lineTo(-24, -12 + bob);
    c.quadraticCurveTo(-14, -15, -7, -22);
    c.closePath();
    c.fillStyle = scarf;
    c.fill();
    this.scarfPattern(bob);
    if (outfit === "cosmetic.bee_scarf" && !this.wornScarf) {
      this.line(
        [
          [-16, -24],
          [-18, -18],
        ],
        "#66513b",
        3,
      );
      this.line(
        [
          [-23, -22],
          [-25, -17],
        ],
        "#66513b",
        3,
      );
    }
    this.rounded(-18, -26 + bob, 9, 18, 4, "#bf874c", "#936b43");
    this.line(
      [
        [-12, -20 + bob],
        [
          -17,
          celebration
            ? -36 + Math.sin(time * 8) * 3
            : hurt
              ? -27
              : !grounded
                ? -26
                : -12 + stride * 3,
        ],
      ],
      "#a75e78",
      5,
    );
    this.rounded(
      -12 - stride * 4,
      !grounded && vy < 0 ? -10 : -7,
      11,
      7,
      3,
      "#775369",
    );
    this.rounded(
      2 + stride * 4,
      !grounded && vy < 0 ? -13 : -7,
      11,
      7,
      3,
      "#775369",
    );
    this.ellipse(0, -16 + bob, 12, 14, outfitColor, "#99566f", 2);
    this.ellipse(2, -15 + bob, 7, 9, outfitLight);
    this.line(
      [
        [11, -20 + bob],
        [
          15,
          celebration
            ? -40 + Math.sin(time * 8) * 3
            : hurt
              ? -28
              : !grounded
                ? -29
                : -12 - stride * 3,
        ],
      ],
      outfitColor,
      5,
    );
    this.ellipse(
      15,
      celebration
        ? -39 + Math.sin(time * 8) * 3
        : hurt
          ? -27
          : !grounded
            ? -28
            : -11 - stride * 3,
      3.2,
      3.7,
      "#ffe5c7",
    );
    // A petal hood and flower crown distinguish Poppy while keeping the sprite silhouette.
    c.restore();
    if (grown) c.translate(0, GROWN.neck);
    this.ellipse(0, -33 + bob, 16, 14, outfitColor, "#99566f", 2);
    this.ellipse(2, -31 + bob, 12.5, 10.5, "#fff1c9");
    this.ellipse(-9, -36 + bob, 3.4, 7.3, outfitLight);
    const blink = hurt || Math.sin(time * 0.72) > 0.996;
    if (blink) {
      this.line(
        [
          [-5, -32 + bob],
          [-1, -32 + bob],
        ],
        "#53464f",
        1.7,
      );
      this.line(
        [
          [5, -32 + bob],
          [9, -32 + bob],
        ],
        "#53464f",
        1.7,
      );
    } else {
      this.ellipse(-3, -32 + bob, 2.7, 3.8, "#53464f");
      this.ellipse(7, -32 + bob, 2.7, 3.8, "#53464f");
      this.ellipse(-2.2, -33.5 + bob, 0.9, 1.1, "#ffffff");
      this.ellipse(7.8, -33.5 + bob, 0.9, 1.1, "#ffffff");
    }
    this.ellipse(-7.5, -27 + bob, 2.4, 1.4, "#f3b39a");
    this.ellipse(11, -27 + bob, 2.4, 1.4, "#f3b39a");
    c.beginPath();
    c.moveTo(1, -26 + bob);
    c.quadraticCurveTo(
      3,
      (hurt ? -29 : celebration ? -21.5 : -23.3) + bob,
      5.5,
      -26 + bob,
    );
    c.strokeStyle = "#8f6d5b";
    c.lineWidth = 1.3;
    c.lineCap = "round";
    c.stroke();
    this.rounded(-11, -23 + bob, 24, 5, 2.5, scarf);
    this.ellipse(10, -21 + bob, 3, 3, scarf);
    if (outfit === "berry") {
      for (let i = 0; i < 3; i++)
        this.ellipse(-7 + i * 4, -47 + bob, 3.2, 3.2, "#b94f76", "#8b456a", 1);
    } else if (outfit === "moon") {
      this.ellipse(-7, -43 + bob, 4, 4, "#fff0b3");
      this.ellipse(-5, -44 + bob, 3.3, 3.3, outfitColor);
    }
    const sway = Math.sin(time * (danger ? 9 : 4)) * 1.1 + vx / 300;
    const crownBob = bob - (danger ? 6 : 0);
    this.line(
      [
        [0, -45 + bob],
        [sway, -51 + crownBob],
      ],
      "#5f9363",
      2.5,
    );
    this.leaf(sway, -49 + crownBob, 8, -0.95, "#78b86b");
    this.leaf(sway, -49 + crownBob, 7, 1.15, "#4f995f");
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      this.ellipse(
        sway + Math.cos(angle) * 4,
        -53 + crownBob + Math.sin(angle) * 4,
        3.4,
        3.4,
        "#ffd1dc",
        "#d787a0",
        0.7,
      );
    }
    this.ellipse(sway, -53 + crownBob, 2.5, 2.5, "#f4c65e");
    this.hatArt(bob - (danger ? 3 : 0), time);
    c.restore();
  }

  /** While flying, the Wind Feather shows as a pair of small feather
   * wings swept back from Pip's shoulders, behind the body. */
  private glideWings(
    center: number,
    feet: number,
    size: number,
    facing: number,
    time: number,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(center - facing * 6 * size, feet - 30 * size);
    c.scale(facing < 0 ? -1 : 1, 1);
    c.scale(size, size);
    const beat = Math.sin(time * 5) * 0.06;
    // Two feathers each side of the back, fanned up and backward.
    for (const [angle, length, color] of [
      [2.55 + beat, 26, "rgba(196,236,220,.95)"],
      [2.15 + beat, 30, "rgba(236,255,247,.97)"],
    ] as const) {
      c.save();
      c.rotate(angle);
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(5, length * 0.3, 5, length * 0.75, 0, length);
      c.bezierCurveTo(-5, length * 0.75, -5, length * 0.3, 0, 0);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = "#7cc7b6";
      c.lineWidth = 1.2;
      c.stroke();
      this.line(
        [
          [0, 2],
          [0, length - 3],
        ],
        "#8fd0bf",
        1,
      );
      c.restore();
    }
    c.restore();
  }

  /** The worn scarf's colour, or the costume's own scarf. */
  private scarfColor(costume: string) {
    return this.wornScarf ? (SCARVES[this.wornScarf]?.[0] ?? costume) : costume;
  }
  /** Stripes, stars or snowflakes on the worn scarf's tail. */
  private scarfPattern(bob: number) {
    const style = this.wornScarf;
    if (!style) return;
    const accent = SCARVES[style]?.[1] ?? "#ffffff";
    if (style === "scarf.candy_stripe")
      for (const x of [-12, -17, -22])
        this.line(
          [
            [x, -26 + bob],
            [x - 3, -16 + bob],
          ],
          accent,
          2.2,
        );
    else if (style === "scarf.starry" || style === "scarf.snowflake")
      for (const [x, y] of [
        [-13, -22],
        [-19, -19],
        [-23, -15],
      ] as const)
        this.ellipse(x, y + bob, 1.4, 1.4, accent);
  }
  /** The worn hat, drawn over the head in the hero's local frame. */
  private hatArt(bob: number, time: number) {
    const hat = this.wornHat;
    if (!hat) return;
    if (hat === "hat.snow_beanie") {
      this.ellipse(0, -44 + bob, 15, 10, "#5aa3d9", "#3d79a8", 1.5);
      this.rounded(-15, -45 + bob, 30, 6, 3, "#eef6fb", "#b9cfe0");
      this.ellipse(0, -55 + bob, 5, 5, "#ffffff", "#c9d8e4", 1);
    } else if (hat === "hat.flower_crown") {
      const blooms = ["#ff9db5", "#ffd86b", "#b6a6ff", "#ff9db5", "#ffd86b"];
      blooms.forEach((color, i) => {
        const bx = -12 + i * 6;
        const by = -45 + bob - (i === 2 ? 2 : i % 2 ? 1 : 0);
        this.ellipse(bx, by, 3.6, 3.6, color, "#ffffff", 0.8);
        this.ellipse(bx, by, 1.3, 1.3, "#fff6d8");
      });
    } else if (hat === "hat.explorer") {
      this.rounded(-10, -57 + bob, 20, 13, 5, "#d8b47a", "#8a6a3e");
      this.rounded(-10, -48 + bob, 20, 3, 1, "#7a4f2e");
      this.ellipse(0, -45 + bob, 21, 4, "#c9a36b", "#8a6a3e");
    } else if (hat === "hat.lantern_cap") {
      this.ellipse(0, -45 + bob, 14, 8, "#3e5f8a", "#2a4466", 1.5);
      this.ellipse(9, -42 + bob, 9, 3, "#2f4a6e");
      this.line(
        [
          [0, -52 + bob],
          [0, -57 + bob],
        ],
        "#2a4466",
        1.6,
      );
      const glow = 0.35 + Math.sin(time * 4) * 0.12;
      this.ellipse(0, -62 + bob, 9, 9, `rgba(255,220,120,${glow})`);
      this.rounded(-3, -66 + bob, 6, 8, 2, "#ffd36b", "#b8862f");
    }
  }

  private checkpoint(
    x: number,
    y: number,
    active: boolean,
    time: number,
    p: Palette,
    number: number,
  ) {
    const c = this.ctx;
    this.ellipse(x + 5, y, 21, 4, "rgba(40,80,60,.15)");
    this.rounded(x - 3, y - 69, 6, 69, 3, p.trunk);
    this.ellipse(x, y - 70, 5, 5, active ? "#ffe888" : "#e9c991");
    const wave = Math.sin(time * 3) * 3;
    c.beginPath();
    c.moveTo(x + 3, y - 64);
    c.bezierCurveTo(x + 12, y - 68, x + 25, y - 58 + wave, x + 36, y - 62);
    c.lineTo(x + 30, y - 49);
    c.lineTo(x + 36, y - 36);
    c.bezierCurveTo(x + 23, y - 31, x + 14, y - 41 + wave, x + 3, y - 37);
    c.closePath();
    c.fillStyle = active ? "#ffaf74" : "#f6e0ad";
    c.fill();
    c.save();
    c.font = "700 15px 'DM Sans', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = active ? "#fff7dc" : "#567c61";
    c.fillText(String(number), x + 18, y - 49);
    c.restore();
    if (active) {
      this.ellipse(
        x,
        y - 70,
        10 + Math.sin(time * 3) * 2,
        10 + Math.sin(time * 3) * 2,
        "rgba(255,238,154,.23)",
      );
      this.ellipse(x, y - 70, 3, 3, "#fff7c4");
    }
  }

  private portal(x: number, y: number, p: Palette, time: number) {
    const c = this.ctx;
    // The opening is centered on the actual 60px-wide goal trigger.
    const center = x + 30;
    this.ellipse(center, y - 3, 56, 8, "rgba(31,75,56,.19)");
    this.ellipse(center, y - 49, 52, 67, "rgba(255,234,151,.13)");
    c.beginPath();
    c.moveTo(x - 8, y);
    c.lineTo(x - 8, y - 64);
    c.bezierCurveTo(x - 8, y - 117, x + 68, y - 117, x + 68, y - 64);
    c.lineTo(x + 68, y);
    c.closePath();
    c.fillStyle = p.soilShade;
    c.fill();
    c.beginPath();
    c.moveTo(x + 2, y - 3);
    c.lineTo(x + 2, y - 63);
    c.bezierCurveTo(x + 2, y - 103, x + 58, y - 103, x + 58, y - 63);
    c.lineTo(x + 58, y - 3);
    c.closePath();
    const glow = c.createLinearGradient(0, y - 100, 0, y);
    glow.addColorStop(0, "#fff9b9");
    glow.addColorStop(0.5, "#ffe993");
    glow.addColorStop(1, "#f3bd65");
    c.fillStyle = glow;
    c.fill();
    this.rounded(x - 15, y - 8, 90, 10, 5, p.rock);
    this.line(
      [
        [x - 3, y - 15],
        [x - 3, y - 65],
      ],
      p.rock,
      8,
    );
    this.line(
      [
        [x + 63, y - 15],
        [x + 63, y - 65],
      ],
      p.rock,
      8,
    );
    this.leaf(x - 2, y - 79, 16, -0.4, p.leaf);
    this.leaf(x + 7, y - 91, 16, 0.8, p.leafLight);
    this.leaf(x + 48, y - 89, 15, -0.6, p.leaf);
    this.leaf(x + 64, y - 76, 15, 0.5, p.leafLight);
    this.star(center, y - 52, time, 4);
    for (let i = 0; i < 4; i++) {
      const yy = y - 9 - ((time * 17 + i * 21) % 80);
      this.ellipse(center - 16 + hash(i) * 32, yy, 1.6, 1.6, "#fffdf0");
    }
  }

  private firefly(x: number, y: number, time: number, scale: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    this.ellipse(0, 0, 15, 15, "rgba(255,240,161,.2)");
    const flutter = 3 + Math.abs(Math.sin(time * 30)) * 4;
    this.ellipse(-6, -4, 5, flutter, "rgba(255,255,240,.8)");
    this.ellipse(6, -4, 5, flutter, "rgba(255,255,240,.8)");
    this.ellipse(0, 1, 4.2, 5.5, "#ffdf6c");
    this.ellipse(-1, -1, 2, 2, "#fff6ba");
    c.restore();
  }

  private rescueFirefly(x: number, y: number, time: number, index: number) {
    const c = this.ctx;
    const bob = Math.sin(time * 2 + index * 1.7) * 3;
    c.save();
    c.translate(x, y + bob);
    const glow = c.createRadialGradient(0, 0, 3, 0, 0, 32);
    glow.addColorStop(0, "rgba(222,255,168,.55)");
    glow.addColorStop(1, "rgba(172,255,223,0)");
    this.ellipse(0, 0, 32, 32, glow);
    c.strokeStyle = "rgba(209,255,214,.72)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 22, -Math.PI * 0.8, Math.PI * 0.25);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 22, Math.PI * 0.45, Math.PI * 1.2);
    c.stroke();
    const flutter = 5 + Math.abs(Math.sin(time * 24 + index)) * 3;
    this.ellipse(-9, -5, 8, flutter, "#d9ffef", "#67bca1", 1);
    this.ellipse(9, -5, 8, flutter, "#d9ffef", "#67bca1", 1);
    this.ellipse(0, 5, 7, 9, "#d9f98a", "#6c9e60", 1.5);
    this.ellipse(0, -5, 6, 6, "#77b590", "#4d856b", 1);
    this.ellipse(-2, -6, 1.1, 1.6, "#254b45");
    this.ellipse(2, -6, 1.1, 1.6, "#254b45");
    this.ellipse(-1.5, 2, 3, 4, "#f6ffbf");
    this.line(
      [
        [-3, -10],
        [-6, -15],
      ],
      "#4d856b",
      1.5,
    );
    this.line(
      [
        [3, -10],
        [6, -15],
      ],
      "#4d856b",
      1.5,
    );
    c.restore();
  }

  private feedback(game: Game) {
    const pp = game.player;
    const combo = game.events.find((e) => e.startsWith("combo-"));
    if (combo && game.lastCombo) {
      const n = game.lastCombo.count;
      this.popups.push({
        x: game.lastCombo.x,
        y: game.lastCombo.y - 10,
        text: `×${n}  +${Math.min(5, n - 1)}`,
        color: n >= 5 ? "#ffcf4d" : "#fff3c2",
        size: 18 + Math.min(5, n) * 2,
        life: 0.9,
      });
      if (n >= 3) this.shake = Math.max(this.shake, 0.1);
    }
    if (game.events.includes("acorn"))
      this.popups.push({
        x: pp.x + pp.w / 2,
        y: pp.y - 12,
        text: "Acorn!",
        color: "#ffd9a0",
        size: 20,
        life: 1.1,
      });
    if (game.events.includes("pound")) {
      this.shake = Math.max(this.shake, 0.14);
      this.burst(pp.x + pp.w / 2, pp.y + pp.h, "#e9d9b8", 12, 110);
    }
    if (game.events.includes("wall-jump"))
      this.burst(
        pp.x + pp.w / 2 - pp.facing * 16,
        pp.y + pp.h / 2,
        "#f3ecd6",
        6,
        70,
      );
    if (game.events.includes("boss-hit")) this.shake = 0.22;
    if (game.events.includes("boss-slam"))
      this.shake = Math.max(this.shake, 0.16);
    if (game.events.includes("boss-roar"))
      this.shake = Math.max(this.shake, 0.35);
    if (game.events.includes("boss-defeat")) this.shake = 0.4;
    if (game.events.includes("boss-start") && game.boss)
      this.bossBanner = { name: game.boss.name, life: 2.4 };
    if (game.events.includes("swim-stroke")) {
      // A puff of bubbles trails from Pip's kicking feet.
      this.burst(
        pp.x + pp.w / 2 - pp.facing * 14,
        pp.y + pp.h - 4,
        "#e6fffb",
        7,
        60,
      );
    }
    if (game.events.includes("gulp"))
      this.burst(
        pp.x + pp.w / 2 + pp.facing * 40,
        pp.y + pp.h - 14,
        "#ffd27a",
        6,
        70,
      );
    game.coins.forEach((coin, i) => {
      if (coin.collected && !this.previousCoins[i])
        this.burst(coin.x, coin.y, "#ffda71", 7, 70);
      this.previousCoins[i] = coin.collected;
    });
    game.stars.forEach((star, i) => {
      if (star.collected && !this.previousStars[i])
        this.burst(star.x, star.y, "#ffe89a", 18, 120);
      this.previousStars[i] = star.collected;
    });
    game.diamonds.forEach((diamond, i) => {
      if (diamond.collected && !this.previousDiamonds[i]) {
        this.burst(diamond.x, diamond.y, "#67e8f2", 12, 105);
        this.burst(diamond.x, diamond.y, "#e1ffff", 7, 65);
      }
      this.previousDiamonds[i] = diamond.collected;
    });
    game.fireflies.forEach((firefly, i) => {
      if (firefly.collected && !this.previousFireflies[i]) {
        this.burst(firefly.x, firefly.y, "#d3f99a", 16, 115);
        this.burst(firefly.x, firefly.y, "#a3f6dc", 12, 70);
      }
      this.previousFireflies[i] = firefly.collected;
    });
    game.platforms.forEach((platform, i) => {
      if (
        platform.rewardPower &&
        platform.rewardUsed &&
        !this.previousRewardUsed[i]
      ) {
        const color =
          platform.rewardPower === "diamond"
            ? "#ffc46b"
            : platform.rewardPower === "star"
              ? "#ffe58a"
              : "#c9edac";
        this.burst(
          platform.x + platform.w / 2,
          platform.y + platform.h / 2,
          color,
          12,
          85,
        );
      }
      this.previousRewardUsed[i] = platform.rewardUsed;
      if (platform.awakened && !this.previousAwakened[i]) {
        this.burst(
          platform.x + platform.w / 2,
          platform.y + 7,
          "#fff0ad",
          17,
          80,
        );
        this.burst(
          platform.x + platform.w / 2,
          platform.y + 7,
          "#bceca5",
          9,
          60,
        );
      }
      this.previousAwakened[i] = platform.awakened;
      if (platform.broken && !this.previousBroken[i]) {
        this.burst(
          platform.x + platform.w / 2,
          platform.y + platform.h / 2,
          "#d9a777",
          15,
          135,
        );
        if ((platform.rewardCoins ?? 0) > 0)
          this.burst(
            platform.x + platform.w / 2,
            platform.y - 5,
            "#ffe48c",
            9,
            115,
          );
      }
      const collapsed =
        platform.kind === "crumble" && platform.crumbleRemaining === 0;
      if (collapsed && !this.previousCollapsed[i])
        this.burst(
          platform.x + platform.w / 2,
          platform.y + 6,
          "#f1faff",
          14,
          70,
        );
      this.previousBroken[i] = platform.broken;
      this.previousCollapsed[i] = collapsed;
    });
    game.enemies.forEach((enemy, i) => {
      if (!enemy.alive && this.previousEnemies[i])
        this.burst(
          enemy.x + enemy.w / 2,
          enemy.y + 12,
          enemy.kind === "hopper"
            ? "#c1dd8b"
            : enemy.kind === "charger"
              ? "#f6b780"
              : "#c3a9e4",
          10,
          90,
        );
      this.previousEnemies[i] = enemy.alive;
    });
    if (game.boss && game.boss.health < this.previousBossHealth) {
      this.burst(
        game.boss.x + game.boss.w / 2,
        game.boss.y + game.boss.h / 2,
        "#ffe0a0",
        game.boss.health === 0 ? 40 : 20,
        130,
      );
    }
    this.previousBossHealth = game.boss?.health ?? 3;
    const player = game.player;
    if (player.form !== this.previousForm) {
      this.formChange = 0.55;
      this.growing = player.form === "big";
      this.burst(
        player.x + player.w / 2,
        player.y + player.h / 2,
        this.growing ? "#a6f7fb" : "#ffb29a",
        18,
        110,
      );
      this.previousForm = player.form;
    }
    if (game.deaths !== this.previousDeaths && game.state === "playing")
      this.burst(
        player.x + player.w / 2,
        player.y + player.h / 2,
        "#e3f8d2",
        12,
        70,
      );
    if (player.grounded && !this.previousGrounded) {
      if (
        player.invulnerable > 0.2 &&
        player.invulnerable < 1 &&
        this.previousDeaths === game.deaths
      )
        this.escapeCelebration = 0.35;
      this.landing = 0.14;
      this.burst(
        player.x + player.w / 2,
        player.y + player.h,
        "#e4e8ba",
        6,
        35,
      );
    }
    if (game.events.includes("jump"))
      this.burst(
        player.x + player.w / 2,
        player.y + player.h,
        "#d7edb0",
        5,
        35,
      );
    if (game.events.includes("bounce")) {
      this.bouncePulse = 0.45;
      this.burst(
        player.x + player.w / 2,
        player.y + player.h,
        "#ffb8a4",
        12,
        100,
      );
    }
    if (game.events.includes("hurt"))
      this.burst(player.x + player.w / 2, player.y + 15, "#ff9a88", 10, 100);
    if (game.events.includes("checkpoint") && game.activeCheckpointIndex >= 0)
      this.burst(
        game.level.checkpoints[game.activeCheckpointIndex].x,
        game.level.checkpoints[game.activeCheckpointIndex].y - 60,
        "#ffe49a",
        15,
        90,
      );
    if (game.events.includes("win"))
      this.burst(
        game.level.goal.x + 30,
        game.level.goal.y - 65,
        "#ffe49a",
        32,
        170,
      );
    this.previousGrounded = player.grounded;
  }

  private burst(
    x: number,
    y: number,
    color: string,
    count: number,
    force: number,
  ) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = force * (0.5 + hash(i + x) * 0.5);
      const duration = 0.35 + hash(i + y) * 0.3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - force * 0.4,
        life: duration,
        duration,
        size: 1.8 + hash(i + x + y) * 2,
        color,
      });
    }
    if (this.particles.length > 90)
      this.particles.splice(0, this.particles.length - 90);
  }

  private drawParticles(dt: number) {
    const c = this.ctx;
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 170 * dt;
      c.globalAlpha = Math.max(0, particle.life / particle.duration);
      this.ellipse(
        particle.x,
        particle.y,
        particle.size,
        particle.size,
        particle.color,
      );
    }
    c.globalAlpha = 1;
  }
}
