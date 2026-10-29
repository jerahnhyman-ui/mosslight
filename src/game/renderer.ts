import {
  CRUMBLE_WARNING,
  ENEMY_SQUASH_DURATION,
  STAR_POWER_DURATION,
  type Game,
} from "./engine";
import type { Rect } from "./levels";

type Theme = "meadow" | "dusk" | "alpine";
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
const palettes: Record<Theme, Palette> = {
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
  cameraX = 0;
  private previousTime = 0;
  private previousGame: Game | null = null;
  private previousElapsed = -1;
  private previousGrounded = false;
  private previousCoins: boolean[] = [];
  private previousStars: boolean[] = [];
  private previousDiamonds: boolean[] = [];
  private previousFireflies: boolean[] = [];
  private previousBroken: boolean[] = [];
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
    this.resize();
  }

  /** The world stays 960×540; only the backing store follows display density. */
  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(
      1,
      Math.min(1920, Math.round((bounds.width || WIDTH) * dpr)),
    );
    const height = Math.max(
      1,
      Math.min(1080, Math.round((bounds.height || HEIGHT) * dpr)),
    );
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.pixelRatio = dpr;
    this.needsResize = false;
  }

  render(game: Game, time: number, titleMode = false, restoration = 0) {
    if (
      this.needsResize ||
      this.pixelRatio !== Math.min(window.devicePixelRatio || 1, 2)
    )
      this.resize();
    const c = this.ctx;
    c.setTransform(
      this.canvas.width / WIDTH,
      0,
      0,
      this.canvas.height / HEIGHT,
      0,
      0,
    );
    const p = palettes[game.level.theme];
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
      this.cameraLead = WIDTH * 0.15 * game.player.facing;
    } else if (respawned) {
      this.particles = [];
      this.landing = 0;
      this.formChange = 0;
      this.previousForm = game.player.form;
      this.previousGrounded = false;
      this.cameraLead = WIDTH * 0.15 * game.player.facing;
    }
    // Ease the lookahead separately from the camera. Turning reveals the path
    // behind Pip without abruptly dragging the whole world across the screen.
    const wantedLead = WIDTH * 0.15 * game.player.facing;
    this.cameraLead +=
      (wantedLead - this.cameraLead) * (1 - Math.exp(-3.5 * dt));
    const target = titleMode
      ? 0
      : Math.max(
          0,
          Math.min(
            game.level.width - WIDTH,
            game.player.x - WIDTH * 0.5 + this.cameraLead,
          ),
        );
    if (
      newGame ||
      respawned ||
      titleMode ||
      Math.abs(target - this.cameraX) > 760
    )
      this.cameraX = target;
    else this.cameraX += (target - this.cameraX) * (1 - Math.exp(-9 * dt));
    const camera = this.cameraX;
    const titleFloor = game.level.platforms.find(
      (platform) =>
        platform.kind === "ground" && platform.x + platform.w >= 775,
    );
    const titleX = Math.max(730, (titleFloor?.x ?? 0) + 50);
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
    c.translate(-camera, 0);

    // The trees sit on actual ground sections; no scenery suggests a floor over a pit.
    for (const platform of game.platforms) {
      if (platform.kind !== "ground") continue;
      for (let i = 0; i < Math.floor(platform.w / 330); i++) {
        const x = platform.x + 205 + i * 330;
        if (x > camera - 160 && x < camera + WIDTH + 160) {
          if (!titleMode || x > 500) this.tree(x, platform.y, p, x, time);
        }
      }
    }
    if (!titleMode) {
      this.gardenLandmarks(game, time);
      this.homeGrove(game, time);
      this.sectionLandmarks(game, time, p);
      this.treasuryRooms(game, time);
    }
    if (titleMode) this.tree(titleX + 45, 430, p, 19, time, 1.2);
    for (const platform of game.platforms) {
      if (
        platform.broken ||
        (platform.kind === "crumble" && platform.crumbleRemaining === 0)
      )
        continue;
      if (
        platform.x + platform.w < camera - 30 ||
        platform.x > camera + WIDTH + 30
      )
        continue;
      if (titleMode && platform.kind !== "ground") continue;
      this.platform(platform, p, time);
    }
    if (!titleMode) {
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
        this.portal(game.level.goal.x, game.level.goal.y, p, time);
        this.sealedGoal(game);
      }
      this.secretClues(game, time);
      if (game.boss && game.boss.state !== "defeated") {
        const gateX = game.boss.maxX + game.boss.w + 26;
        if (this.visible(gateX, 40)) {
          this.rounded(
            gateX - 5,
            0,
            10,
            game.boss.groundY,
            4,
            "rgba(211,238,153,.22)",
          );
          this.line(
            [
              [gateX, 0],
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
      );
      c.restore();
      if (game.starPowerRemaining > 0)
        this.starAura(center, feet, size, game.starPowerRemaining, time, true);
    } else {
      this.hero(titleX, 431, 0, 0, 1, true, time, 0, 2.9);
      this.firefly(
        titleX + 96 + Math.sin(time * 0.8) * 18,
        267 + Math.cos(time) * 11,
        time,
        1.3,
      );
    }
    this.drawParticles(dt);
    c.restore();

    // Sparse drifting lights provide movement without veiling the collision surfaces.
    for (let i = 0; i < (game.level.theme === "dusk" ? 20 : 8); i++) {
      const x =
        ((((hash(i + 40) * 1100 + time * (3 + hash(i) * 5) - camera * 0.12) %
          1100) +
          1100) %
          1100) -
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
      c.fillRect(0, 0, 650, HEIGHT);
    }
  }

  private visible(x: number, margin: number) {
    return x > this.cameraX - margin && x < this.cameraX + WIDTH + margin;
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
    const sky = c.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, p.sky);
    sky.addColorStop(0.8, p.horizon);
    sky.addColorStop(1, p.middle);
    c.fillStyle = sky;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    if (theme === "dusk") {
      for (let i = 0; i < 35; i++) {
        const x = (hash(i + 300) * 1100 - camera * 0.025 + 1100) % 1100;
        const y = 28 + hash(i + 320) * 205;
        c.globalAlpha = 0.3 + hash(i + 41) * 0.5;
        this.ellipse(x, y, i % 4 ? 1.2 : 2.2, i % 4 ? 1.2 : 2.2, "#fff6dc");
      }
      c.globalAlpha = 1;
    }
    const sunX = 757 - camera * 0.025;
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
    for (let i = 0; i < 5; i++) {
      const x = ((i * 249 + time * 3 - camera * 0.065 + 1450) % 1450) - 160;
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
        i <= Math.floor(shift / spacing) + 4;
        i++
      ) {
        const x = i * spacing - shift;
        const top = 209 + layer * 60 + hash(i + layer * 31) * 42;
        c.beginPath();
        c.moveTo(x - 100, HEIGHT);
        if (theme === "alpine" && layer === 0) {
          c.lineTo(x + 82, top - 68);
          c.quadraticCurveTo(x + 97, top - 90, x + 111, top - 65);
          c.lineTo(x + 330, HEIGHT);
        } else {
          c.bezierCurveTo(x - 95, top + 90, x + 5, top - 20, x + 116, top);
          c.bezierCurveTo(
            x + 222,
            top + 5,
            x + 260,
            top + 160,
            x + 400,
            HEIGHT,
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
    for (let i = -1; i < 13; i++) {
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
    for (let i = 0; i < 9; i++)
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
    const glow = c.createRadialGradient(720, 100, 12, 720, 100, 370);
    glow.addColorStop(0, `rgba(255,245,183,${0.18 * restoration})`);
    glow.addColorStop(1, "rgba(255,245,183,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, WIDTH, 380);
    for (let i = 0; i < Math.round(restoration * 24); i++) {
      const x =
        ((((hash(i + 600) * 1120 - camera * 0.15 + time * 5) % 1120) + 1120) %
          1120) -
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
      if (r.x + r.w < this.cameraX - 80 || r.x > this.cameraX + WIDTH + 80)
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

  private homeGrove(game: Game, time: number) {
    if (game.level.kind !== "grove") return;
    const c = this.ctx;
    const total = Math.max(0, Math.min(9, game.rescuedTotal));
    const span = Math.min(1500, game.level.width - 430);
    for (let i = 0; i < 9; i++) {
      const x = 270 + (i * span) / 9;
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
      c.fillText(`${total} / 9 lights home`, 130, 324);
    }
    c.restore();
  }

  private bossCreature(game: Game, time: number) {
    const b = game.boss;
    if (!b || !this.visible(b.x + b.w / 2, b.w + 60)) return;
    const c = this.ctx;
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

  private bossHazards(game: Game, time: number) {
    const c = this.ctx;
    for (const r of game.hazards) {
      if (!this.visible(r.x, r.w + 20)) continue;
      const cx = r.x + r.w / 2,
        cy = r.y + r.h / 2;
      if (r.kind === "web") {
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
      if (room.x + room.w < this.cameraX || room.x > this.cameraX + WIDTH)
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
        Math.ceil((this.cameraX + WIDTH - x + 25) / 58),
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
    outfit: "leaf" | "berry" | "moon" = "leaf",
    danger = false,
  ) {
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
      outfit === "berry"
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
