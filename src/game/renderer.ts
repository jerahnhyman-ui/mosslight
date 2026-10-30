import {
  CRUMBLE_WARNING,
  ENEMY_SQUASH_DURATION,
  STAR_POWER_DURATION,
  type Game,
} from "./engine";
import type { Rect } from "./levels";
import { CREATURES } from "./creatures";

type Theme =
  | "meadow"
  | "dusk"
  | "alpine"
  | "windmill"
  | "hive"
  | "grotto"
  | "cloud";
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
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  viewportWidth = WIDTH;
  viewportHeight = HEIGHT;
  cameraX = 0;
  cameraY = 0;
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
    const safeBottom = inset("--scene-safe-bottom");
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
    this.restoredLight(Math.max(0, Math.min(1, restoration)), time, camera);
    c.save();
    c.translate(-camera, -this.cameraY);

    // The trees sit on actual ground sections; no scenery suggests a floor over a pit.
    for (const platform of game.platforms) {
      if (
        game.level.theme === "hive" ||
        game.level.theme === "grotto" ||
        game.level.theme === "cloud" ||
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
      this.millApproachScenery(game, time);
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
      game.coins.forEach((coin, i) => {
        if (!coin.collected && this.visible(coin.x, 24))
          this.coin(coin.x, coin.y, time, i);
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
      const player = game.player;
      const center = player.x + player.w / 2;
      const feet = player.y + player.h;
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
      if (!zone.currentY) {
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

  /** A recognizable destination and a simple arrow lead into the mill. */
  private millApproachScenery(game: Game, time: number) {
    if (game.level.contentId !== "world.windmill-garden") return;
    const c = this.ctx;
    const millX = 11780;
    if (this.visible(millX, 260)) {
      // This is distant scenery, drawn before the solid platforms and boss.
      c.save();
      c.globalAlpha = 0.45;
      this.rounded(millX - 96, 224, 192, 246, 30, "#eed4a1");
      this.ellipse(millX, 224, 98, 32, "#c99d70");
      this.rounded(millX - 24, 302, 48, 64, 16, "#b5d9bb");
      this.rounded(millX - 22, 406, 44, 66, 18, "#b58b66");
      c.save();
      c.translate(millX, 205);
      c.rotate(time * 0.16);
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2);
        this.rounded(-13, -140, 26, 120, 10, "#fff0c7", "#c79c6e");
        this.line(
          [
            [0, -127],
            [0, -29],
          ],
          "#d7bb87",
          3,
        );
      }
      this.ellipse(0, 0, 15, 15, "#b17b54");
      c.restore();
      c.restore();
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

  private bossCreature(game: Game, time: number) {
    const b = game.boss;
    if (!b || !this.visible(b.x + b.w / 2, b.w + 60)) return;
    const c = this.ctx;
    if (b.kind === "millkeeper") {
      this.millKeeper(game, time);
      return;
    }
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
      this.rounded(cx - 12, b.y - 41, 24, 29, 9, "#fff0ba", "#be7652");
      c.save();
      c.font = "800 21px 'DM Sans', sans-serif";
      c.textAlign = "center";
      c.fillStyle = "#a35b44";
      c.fillText("!", cx, b.y - 19);
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
    c.save();
    c.translate(cx, feet);
    c.scale(b.facing < 0 ? -1 : 1, 1);
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
    const eyeX = b.kind === "moth" ? 0 : 27,
      eyeY = b.kind === "moth" ? -47 : -26;
    if (recovering) {
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

  private millKeeper(game: Game, time: number) {
    const b = game.boss!;
    const c = this.ctx;
    const x = b.x + b.w / 2,
      y = b.y + b.h;
    if (b.state === "defeated") {
      this.ellipse(x, y - 8, 55, 12, "rgba(255,239,152,.5)");
      for (let i = 0; i < 3; i++)
        this.firefly(
          x + Math.sin(time + i * 2) * 28,
          y - 30 - i * 18,
          time,
          0.7,
        );
      return;
    }
    const warning =
      b.millState === "lowWarning" || b.millState === "highWarning";
    const recovering = b.millState === "recover";
    if (warning) {
      const high = b.millState === "highWarning";
      const yy = b.groundY - (high ? 230 : 56);
      const height = high ? 150 : 56;
      c.save();
      c.fillStyle = "rgba(226,138,98,.09)";
      c.fillRect(b.minX, yy, b.maxX + b.w - b.minX, height);
      c.setLineDash([12, 8]);
      this.line(
        [
          [b.minX, yy],
          [b.maxX + b.w, yy],
        ],
        "#e28a62",
        4,
      );
      this.line(
        [
          [b.minX, yy + height],
          [b.maxX + b.w, yy + height],
        ],
        "#e28a62",
        4,
      );
      c.restore();
      this.rounded(x - 18, b.y - 38, 36, 30, 10, "#fff2bb", "#bd7850");
      c.save();
      c.font = "bold 18px sans-serif";
      c.textAlign = "center";
      c.fillStyle = "#9a573c";
      c.fillText(high ? "↓" : "↑", x, b.y - 16);
      c.restore();
    }
    c.save();
    c.translate(x, y);
    c.scale(1, b.h / 115);
    c.translate(-x, -y);
    this.ellipse(x, y, 56, 8, "rgba(77,65,43,.2)");
    this.rounded(x - 44, y - 115, 88, 112, 27, "#c88c57", "#82583e");
    this.rounded(x - 36, y - 104, 72, 92, 20, "#e7b87b", "#a66f48");
    for (let i = 0; i < 4; i++)
      this.line(
        [
          [x - 31 + i * 20, y - 93],
          [x - 31 + i * 20, y - 20],
        ],
        "#d19a63",
        2,
      );
    c.save();
    c.translate(x, y - 78);
    c.rotate(recovering ? 0.25 : time * (warning ? 2.5 : 0.8));
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      this.rounded(-9, -66, 18, 58, 7, "#ffe49a", "#a7784c");
      this.line(
        [
          [0, -58],
          [0, -15],
        ],
        "#e6bb77",
        2,
      );
    }
    this.ellipse(0, 0, 11, 11, "#a96e48", "#80553e");
    c.restore();
    this.ellipse(x - 14, y - 43, 5, 7, "#fff5d5");
    this.ellipse(x + 14, y - 43, 5, 7, "#fff5d5");
    this.ellipse(x - 13, y - 42, 2, 3, "#45564b");
    this.ellipse(x + 15, y - 42, 2, 3, "#45564b");
    this.line(
      [
        [x - 5, y - 28],
        [x, y - 25],
        [x + 5, y - 28],
      ],
      "#80553e",
      2,
    );
    c.restore();
    if (recovering) {
      // This highlight sits on the boss's actual collision top, so the
      // visible landing point is exactly where a stomp can connect.
      this.rounded(x - 37, b.y - 6, 74, 12, 6, "#fff3a8", "#c38750");
      this.line(
        [
          [x, b.y - 31],
          [x, b.y - 10],
          [x - 7, b.y - 17],
        ],
        "#246747",
        4,
      );
      this.line(
        [
          [x, b.y - 10],
          [x + 7, b.y - 17],
        ],
        "#246747",
        4,
      );
      for (let i = 0; i < 3; i++) {
        this.starPath(
          x - 25 + i * 25,
          b.y - 12 + Math.sin(time * 5 + i) * 2,
          4,
        );
        c.fillStyle = "#fff5a6";
        c.fill();
      }
    }
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
      // The HUD already names the boss arena. Leaving out this ground sign
      // keeps the checkpoint and feather-block cue clear at the mill entrance.
      if (
        game.level.contentId === "world.windmill-garden" &&
        section.x >= 11520 &&
        section.x < 12500
      )
        return;
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
    if (r.kind === "moving") {
      this.movingLeaf(r, time);
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
      diamond: { face: "#69dbe4", edge: "#287d91", glyph: "#eaffff" },
      feather: { face: "#a6d786", edge: "#568457", glyph: "#fff8d6" },
      star: { face: "#f9cf68", edge: "#a6793e", glyph: "#fff8ce" },
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
    } else if (rewardPower === "diamond") {
      c.beginPath();
      c.moveTo(-9, -4);
      c.lineTo(-5, -9);
      c.lineTo(5, -9);
      c.lineTo(9, -4);
      c.lineTo(0, 9);
      c.closePath();
      c.fill();
      c.stroke();
      this.line(
        [
          [-8, -4],
          [8, -4],
        ],
        edge,
        1,
      );
      this.line(
        [
          [0, -8],
          [0, 8],
        ],
        edge,
        1,
      );
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

  private diamond(x: number, y: number, time: number, index: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y + Math.sin(time * 2.1 + index) * 3);
    this.ellipse(0, 1, 23, 24, "rgba(132,248,255,.16)");
    this.ellipse(0, 1, 18, 19, "rgba(226,255,253,.22)");
    const facet = (points: number[][], color: string) => {
      c.beginPath();
      c.moveTo(points[0][0], points[0][1]);
      for (const point of points.slice(1)) c.lineTo(point[0], point[1]);
      c.closePath();
      c.fillStyle = color;
      c.fill();
    };
    facet(
      [
        [-10, -11],
        [10, -11],
        [16, -3],
        [0, 17],
        [-16, -3],
      ],
      "#1d9fbf",
    );
    facet(
      [
        [-10, -11],
        [0, -11],
        [-6, -3],
        [-16, -3],
      ],
      "#b2fbff",
    );
    facet(
      [
        [0, -11],
        [10, -11],
        [16, -3],
        [6, -3],
      ],
      "#65e5f3",
    );
    facet(
      [
        [0, -11],
        [6, -3],
        [-6, -3],
      ],
      "#e5ffff",
    );
    facet(
      [
        [-16, -3],
        [-6, -3],
        [0, 17],
      ],
      "#18b7db",
    );
    facet(
      [
        [-6, -3],
        [6, -3],
        [0, 17],
      ],
      "#7af3fa",
    );
    facet(
      [
        [6, -3],
        [16, -3],
        [0, 17],
      ],
      "#29d0e6",
    );
    this.line(
      [
        [-10, -11],
        [10, -11],
        [16, -3],
        [0, 17],
        [-16, -3],
        [-10, -11],
      ],
      "#168baf",
      1.4,
    );
    this.line(
      [
        [-14, -3],
        [14, -3],
      ],
      "rgba(239,255,255,.75)",
      1.2,
    );
    this.line(
      [
        [-9, -8],
        [-12, -4],
      ],
      "#ffffff",
      2,
    );
    // A quiet glint keeps the facets legible without flashing the whole pickup.
    const glint = 0.5 + (Math.sin(time * 2.2 + index) + 1) * 0.25;
    c.globalAlpha = glint;
    this.line(
      [
        [17, -17],
        [17, -9],
      ],
      "#f5ffff",
      1.7,
    );
    this.line(
      [
        [13, -13],
        [21, -13],
      ],
      "#f5ffff",
      1.7,
    );
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
      const radius = (44 + Math.sin(time * 3) * 1.5) * size;
      const glow = c.createRadialGradient(
        x,
        centerY,
        7 * size,
        x,
        centerY,
        radius,
      );
      glow.addColorStop(0, "rgba(255,250,158,.35)");
      glow.addColorStop(
        0.65,
        urgent ? "rgba(255,178,94,.28)" : "rgba(255,223,106,.25)",
      );
      glow.addColorStop(1, "rgba(255,242,155,0)");
      this.ellipse(x, centerY, radius, radius, glow);
      c.lineWidth = 1.8;
      c.strokeStyle = "rgba(255,255,226,.28)";
      c.beginPath();
      c.ellipse(x, centerY, 31 * size, 40 * size, 0, 0, Math.PI * 2);
      c.stroke();
      // The continuous draining halo communicates expiry without a strobe.
      c.strokeStyle = urgent ? "#ffb165" : "#fff4a5";
      c.lineWidth = urgent ? 2.5 : 2;
      c.lineCap = "round";
      c.beginPath();
      c.ellipse(
        x,
        centerY,
        31 * size,
        40 * size,
        0,
        -Math.PI / 2,
        -Math.PI / 2 +
          Math.PI * 2 * Math.min(1, remaining / STAR_POWER_DURATION),
      );
      c.stroke();
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
    outfit: "leaf" | "berry" | "moon" | "cosmetic.bee_scarf" = "leaf",
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
          : "#69b86c";
    const outfitLight =
      outfit === "berry"
        ? "#e4a1b9"
        : outfit === "moon"
          ? "#c4d8ed"
          : "#8cce79";
    const scarf =
      outfit === "cosmetic.bee_scarf"
        ? "#f2c552"
        : outfit === "berry"
          ? "#e3b86a"
          : outfit === "moon"
            ? "#e6dba7"
            : "#eb745d";
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
    if (flight !== "none") {
      // The feather is anchored to Pip's satchel; lift and glide spread it differently.
      c.save();
      c.translate(-15, -25 + bob);
      c.rotate(
        flight === "lift"
          ? -0.8 + Math.sin(time * 18) * 0.15
          : flight === "glide"
            ? -1.35
            : -0.35,
      );
      this.leaf(0, 0, flight === "glide" ? 24 : 19, 0, "#e9fff4");
      this.line(
        [
          [0, 0],
          [0, -23],
        ],
        "#6bbdb3",
        2,
      );
      c.restore();
      if (flight === "lift") {
        for (let i = 0; i < 3; i++)
          this.line(
            [
              [-21 - i * 4, -5 + i * 7],
              [-25 - i * 4, 2 + i * 7],
            ],
            "rgba(225,255,246,.8)",
            2,
          );
      }
    }
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
    if (outfit === "cosmetic.bee_scarf") {
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
      outfit === "leaf" ? "#ff9d76" : scarf,
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
    outfit: "leaf" | "berry" | "moon" | "cosmetic.bee_scarf",
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
          : "#d87892";
    const outfitLight =
      outfit === "moon"
        ? "#c4d8ed"
        : outfit === "berry"
          ? "#e4a1b9"
          : "#f4bdc1";
    const scarf =
      outfit === "cosmetic.bee_scarf"
        ? "#f2c552"
        : outfit === "moon"
          ? "#e6dba7"
          : "#e6bd72";
    c.save();
    c.translate(x, y);
    c.scale(size, size);
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
    if (flight !== "none") {
      c.save();
      c.translate(-15, -25 + bob);
      c.rotate(
        flight === "lift"
          ? -0.8 + Math.sin(time * 18) * 0.15
          : flight === "glide"
            ? -1.35
            : -0.35,
      );
      this.leaf(0, 0, flight === "glide" ? 24 : 19, 0, "#e9fff4");
      this.line(
        [
          [0, 0],
          [0, -23],
        ],
        "#6bbdb3",
        2,
      );
      c.restore();
      if (flight === "lift") {
        for (let i = 0; i < 3; i++)
          this.line(
            [
              [-21 - i * 4, -5 + i * 7],
              [-25 - i * 4, 2 + i * 7],
            ],
            "rgba(225,255,246,.8)",
            2,
          );
      }
    }
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
    if (outfit === "cosmetic.bee_scarf") {
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
    c.restore();
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
            ? "#80eaf3"
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
