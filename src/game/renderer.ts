import type { Game } from "./engine";

type Theme = "meadow" | "dusk" | "alpine";
type Palette = {
  sky: string;
  horizon: string;
  sun: string;
  cloud: string;
  far: string;
  middle: string;
  hill: string;
  leaf: string;
  leafLight: string;
  leafShade: string;
  trunk: string;
  grass: string;
  grassLight: string;
  soil: string;
  soilShade: string;
  stone: string;
};
const palettes: Record<Theme, Palette> = {
  meadow: {
    sky: "#dcecd4",
    horizon: "#f4edcc",
    sun: "#fff9ce",
    cloud: "#fffce8",
    far: "#c4d5b6",
    middle: "#a5c39f",
    hill: "#83ad86",
    leaf: "#4f8760",
    leafLight: "#6d9b64",
    leafShade: "#376d54",
    trunk: "#536c4a",
    grass: "#78a75b",
    grassLight: "#bfd882",
    soil: "#a79163",
    soilShade: "#8c7d58",
    stone: "#9cae86",
  },
  dusk: {
    sky: "#9b9bb3",
    horizon: "#efd4bf",
    sun: "#fbeac6",
    cloud: "#d4c2c8",
    far: "#aaa4b5",
    middle: "#888da5",
    hill: "#6f7c91",
    leaf: "#4e686e",
    leafLight: "#6f8b87",
    leafShade: "#3c525f",
    trunk: "#4b5261",
    grass: "#7f9a7d",
    grassLight: "#bdc596",
    soil: "#918478",
    soilShade: "#746c6a",
    stone: "#a7a69a",
  },
  alpine: {
    sky: "#c9e1e1",
    horizon: "#f1f0d8",
    sun: "#fff8d6",
    cloud: "#f9f9e8",
    far: "#b4cbd0",
    middle: "#91b8bd",
    hill: "#729f9e",
    leaf: "#527d76",
    leafLight: "#7c9f81",
    leafShade: "#3c6864",
    trunk: "#596b61",
    grass: "#8bad86",
    grassLight: "#e0e8c1",
    soil: "#9c9e88",
    soilShade: "#7e877c",
    stone: "#adb9a8",
  },
};
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Crisp, locally drawn art. No image loads are required, including on an offline device. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  cameraX = 0;
  private previousTime = 0;
  private previousLevel = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context)
      throw new Error("Your device could not create the game canvas.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    const ratio =
      clientWidth > 0 && clientHeight > 0 ? clientWidth / clientHeight : 16 / 9;
    const width = Math.max(240, Math.min(960, Math.round(540 * ratio)));
    if (this.canvas.width !== width) {
      this.canvas.width = width;
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  render(game: Game, time: number, titleMode = false) {
    this.resize();
    const c = this.ctx;
    const p = palettes[game.level.theme];
    const dt = Math.max(0, Math.min(time - this.previousTime, 0.05));
    this.previousTime = time;
    const visibleWidth = this.canvas.width;
    const target = titleMode
      ? 0
      : Math.max(
          0,
          Math.min(
            game.level.width - visibleWidth,
            game.player.x - visibleWidth * 0.34,
          ),
        );
    if (
      titleMode ||
      this.previousLevel !== game.level.id ||
      Math.abs(target - this.cameraX) > 850
    )
      this.cameraX = target;
    else this.cameraX += (target - this.cameraX) * (1 - Math.exp(-8 * dt));
    this.previousLevel = game.level.id;
    const camera = Math.round(this.cameraX);
    this.background(p, game.level.theme, time, camera);
    c.save();
    c.translate(-camera, 0);
    // Tree placement is deterministic, so the forest does not shuffle on a retry.
    for (let i = -1; i < Math.ceil(game.level.width / 640) + 1; i++) {
      const x = 790 + i * 640;
      if (titleMode && i === -1) continue;
      if (x > camera - 230 && x < camera + 1200) this.tree(x, 430, p, i, time);
    }
    for (const platform of game.level.platforms) {
      if (platform.x + platform.w < camera - 40 || platform.x > camera + 1000)
        continue;
      this.platform(platform, p, game.level.theme);
    }
    this.checkpoint(
      game.level.checkpoint.x,
      game.level.checkpoint.y,
      game.checkpointActive,
      time,
      p,
    );
    this.portal(game.level.goal.x, game.level.goal.y, p, time);
    for (let i = 0; i < game.coins.length; i++) {
      const coin = game.coins[i];
      if (!coin.collected && coin.x > camera - 20 && coin.x < camera + 980)
        this.coin(coin.x, coin.y, time, i);
    }
    for (let i = 0; i < game.stars.length; i++) {
      const star = game.stars[i];
      if (!star.collected && star.x > camera - 30 && star.x < camera + 990)
        this.star(star.x, star.y, time, i);
    }
    for (const enemy of game.enemies) {
      if (enemy.alive && enemy.x > camera - 40 && enemy.x < camera + 1000)
        this.beetle(enemy.x, enemy.y, enemy.w, enemy.h, time, enemy.vx);
    }
    this.hero(game, time);
    c.restore();
    // Drifting motes sit between the player and the foreground, without obscuring hazards.
    for (let i = 0; i < 22; i++) {
      const x =
        ((((hash(i + 40) * 1100 + time * (3 + hash(i) * 5) - camera * 0.15) %
          1100) +
          1100) %
          1100) -
        70;
      const y = 105 + hash(i + 91) * 290 + Math.sin(time * 0.7 + i) * 7;
      c.globalAlpha = 0.2 + (Math.sin(time * 1.5 + i) + 1) * 0.14;
      this.rect(x, y, 3, 3, "#fffbd0");
    }
    c.globalAlpha = 1;
    if (titleMode) {
      // A gentle wash makes the native HTML title readable while preserving the scene.
      const wash = c.createLinearGradient(0, 0, 670, 0);
      wash.addColorStop(0, "rgba(232,239,211,0.30)");
      wash.addColorStop(1, "rgba(232,239,211,0)");
      c.fillStyle = wash;
      c.fillRect(0, 0, 960, 540);
    }
  }

  private rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
  }
  private polygon(points: number[][], color: string) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) =>
      i
        ? c.lineTo(Math.round(x), Math.round(y))
        : c.moveTo(Math.round(x), Math.round(y)),
    );
    c.closePath();
    c.fill();
  }

  private background(p: Palette, theme: Theme, time: number, camera: number) {
    const c = this.ctx;
    const sky = c.createLinearGradient(0, 0, 0, 470);
    sky.addColorStop(0, p.sky);
    sky.addColorStop(1, p.horizon);
    c.fillStyle = sky;
    c.fillRect(0, 0, 960, 540);
    const sx = 727 - camera * 0.025;
    c.globalAlpha = 0.25;
    this.rect(sx - 46, 58, 92, 92, p.sun);
    this.rect(sx - 58, 70, 116, 68, p.sun);
    c.globalAlpha = 0.7;
    this.rect(sx - 29, 66, 58, 70, p.sun);
    this.rect(sx - 36, 73, 72, 56, p.sun);
    c.globalAlpha = 1;
    this.rect(sx - 23, 73, 46, 56, p.sun);
    this.rect(sx - 29, 79, 58, 44, p.sun);
    c.globalAlpha = 0.13;
    this.polygon(
      [
        [sx - 15, 130],
        [sx + 17, 130],
        [sx + 260, 480],
        [sx + 90, 480],
      ],
      p.sun,
    );
    this.polygon(
      [
        [sx - 34, 120],
        [sx - 20, 140],
        [sx - 130, 490],
        [sx - 240, 490],
      ],
      p.sun,
    );
    c.globalAlpha = 1;
    for (let i = -1; i < 6; i++) {
      const cx =
        ((((i * 267 + time * 3 - camera * 0.06) % 1300) + 1300) % 1300) - 170;
      const cy = 49 + hash(i + 10) * 112;
      this.cloud(cx, cy, 0.65 + hash(i) * 0.7, p.cloud);
    }
    // Each silhouette uses stair-step edges to keep the visual language pixel-like.
    for (let layer = 0; layer < 3; layer++) {
      const spacing = layer === 0 ? 370 : 300;
      const shift = camera * (0.08 + layer * 0.09);
      for (
        let i = Math.floor(shift / spacing) - 1;
        i < Math.floor(shift / spacing) + 6;
        i++
      ) {
        const x = i * spacing - shift;
        const top = 185 + layer * 43 + hash(i + layer * 100) * 45;
        const col = layer === 0 ? p.far : layer === 1 ? p.middle : p.hill;
        this.polygon(
          [
            [x - 120, 480],
            [x - 120, top + 127],
            [x - 88, top + 127],
            [x - 88, top + 84],
            [x - 50, top + 84],
            [x - 50, top + 48],
            [x - 10, top + 48],
            [x - 10, top + 24],
            [x + 27, top + 24],
            [x + 27, top],
            [x + 91, top],
            [x + 91, top + 20],
            [x + 126, top + 20],
            [x + 126, top + 49],
            [x + 164, top + 49],
            [x + 164, top + 82],
            [x + 202, top + 82],
            [x + 202, top + 117],
            [x + 235, top + 117],
            [x + 235, 480],
          ],
          col,
        );
        if (theme === "alpine" && layer === 0) {
          this.polygon(
            [
              [x - 10, top + 48],
              [x - 10, top + 24],
              [x + 27, top + 24],
              [x + 27, top],
              [x + 91, top],
              [x + 91, top + 20],
              [x + 126, top + 20],
              [x + 126, top + 49],
              [x + 100, top + 49],
              [x + 100, top + 38],
              [x + 66, top + 38],
              [x + 66, top + 61],
              [x + 39, top + 61],
              [x + 39, top + 45],
            ],
            "#e5eddb",
          );
        }
      }
    }
    // Far woodland adds scale without competing with collision surfaces.
    c.globalAlpha = 0.45;
    for (let i = -1; i < 13; i++) {
      const x = i * 112 - ((camera * 0.32) % 112);
      const y = 290 + hash(i + 60) * 66;
      this.rect(x + 19, y, 7, 140, p.leafShade);
      this.rect(x - 1, y + 16, 47, 50, p.leaf);
      this.rect(x + 7, y, 31, 76, p.leaf);
      this.rect(x - 10, y + 36, 66, 27, p.leaf);
    }
    c.globalAlpha = 1;
    // Low haze softens the distant tree line.
    const haze = c.createLinearGradient(0, 340, 0, 430);
    haze.addColorStop(0, "rgba(245,238,204,0)");
    haze.addColorStop(
      1,
      theme === "dusk" ? "rgba(215,190,175,.20)" : "rgba(234,239,204,.32)",
    );
    c.fillStyle = haze;
    c.fillRect(0, 340, 960, 110);
  }

  private cloud(x: number, y: number, scale: number, color: string) {
    const c = this.ctx;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale, scale);
    c.globalAlpha = 0.52;
    this.rect(0, 16, 100, 15, color);
    this.rect(14, 8, 68, 30, color);
    this.rect(30, 0, 30, 38, color);
    this.rect(75, 22, 45, 9, color);
    c.restore();
  }

  private tree(x: number, y: number, p: Palette, index: number, time: number) {
    const c = this.ctx;
    const height = 224 + hash(index + 9) * 36;
    const top = Math.round(y - height);
    this.rect(x - 13, top + 41, 28, height - 41, p.trunk);
    this.rect(x - 7, top + 54, 10, height - 56, p.leafShade);
    this.polygon(
      [
        [x - 13, y - 11],
        [x - 28, y],
        [x + 27, y],
        [x + 14, y - 20],
      ],
      p.trunk,
    );
    this.polygon(
      [
        [x - 8, top + 132],
        [x - 63, top + 91],
        [x - 55, top + 78],
        [x + 6, top + 111],
      ],
      p.trunk,
    );
    this.polygon(
      [
        [x + 9, top + 112],
        [x + 67, top + 67],
        [x + 73, top + 83],
        [x + 12, top + 144],
      ],
      p.trunk,
    );
    // Square-edged leaf clusters form an unmistakable canopy silhouette.
    const clusters = [
      [-73, 34, 91, 70],
      [-23, -8, 92, 100],
      [37, 33, 91, 73],
      [-108, 75, 70, 61],
      [-40, 65, 110, 72],
      [61, 80, 81, 52],
    ];
    for (let i = 0; i < clusters.length; i++) {
      const [ox, oy, w, h] = clusters[i];
      const xx = x + ox,
        yy = top + oy;
      this.rect(xx + 10, yy, w - 20, h, p.leafShade);
      this.rect(xx, yy + 13, w, h - 26, p.leafShade);
      this.rect(xx + 10, yy - 6, w - 20, h - 15, p.leaf);
      this.rect(xx + 1, yy + 8, w - 2, h - 40, p.leaf);
      this.rect(xx + 19, yy - 8, w - 38, 13, p.leafLight);
      this.rect(xx + 8, yy + 3, 20, 8, p.leafLight);
      for (let j = 0; j < 7; j++) {
        this.rect(
          xx + 12 + hash(i * 9 + j) * Math.max(1, w - 24),
          yy + 8 + hash(j + index * 3) * Math.max(1, h - 30),
          6 + hash(j + 10) * 8,
          3,
          j % 2 ? p.leafLight : p.leafShade,
        );
      }
    }
    // A curling vine and a few sunlit, drifting leaves.
    this.rect(x + 81, top + 111, 3, 37, p.leafShade);
    this.rect(x + 73, top + 138, 8, 4, p.leaf);
    this.rect(x + 84, top + 125, 7, 4, p.leaf);
    c.globalAlpha = 0.6;
    this.rect(
      x - 85 + Math.sin(time * 0.35 + index) * 15,
      top + 126 + ((time * 6 + index * 13) % 100),
      5,
      3,
      p.grassLight,
    );
    c.globalAlpha = 1;
  }

  private platform(
    r: { x: number; y: number; w: number; h: number; kind: string },
    p: Palette,
    theme: Theme,
  ) {
    const c = this.ctx;
    const { x, y, w, h } = r;
    if (r.kind === "brick") {
      this.rect(x, y, w, h, p.stone);
      this.rect(x, y, w, 4, p.grassLight);
      for (let row = 0; row < Math.ceil(h / 20); row++) {
        this.rect(x, y + row * 20 + 17, w, 3, p.soilShade);
        for (let col = 0; col < Math.ceil(w / 30); col++) {
          const xx = x + col * 30 + (row % 2) * 15;
          if (xx + 2 < x + w)
            this.rect(
              xx,
              y + row * 20,
              2,
              Math.min(20, h - row * 20),
              p.soilShade,
            );
        }
      }
      return;
    }
    this.rect(x, y + 8, w, h - 8, p.soil);
    this.rect(x, y + Math.min(31, h - 5), w, Math.max(0, h - 31), p.soilShade);
    c.save();
    c.beginPath();
    c.rect(x, y + 12, w, Math.max(0, h - 12));
    c.clip();
    for (let i = 0; i < Math.ceil(w / 18); i++) {
      const xx = x + i * 18;
      this.rect(xx, y + 14, 8, 7, p.soilShade);
      if (i % 3 === 0) this.rect(xx + 5, y + 26, 5, 15, p.soil);
      for (let j = 0; j < Math.ceil(h / 32); j++) {
        const yy = y + 30 + j * 32 + hash(i * 13 + j + x) * 18;
        this.rect(
          xx + hash(i + j + 9) * 12,
          yy,
          5,
          3,
          hash(i + j + x) > 0.5 ? p.soil : p.stone,
        );
      }
    }
    c.restore();
    this.rect(x, y, w, 9, p.grass);
    this.rect(x, y, w, 3, p.grassLight);
    for (let i = 0; i < Math.ceil(w / 16); i++) {
      const xx = x + i * 16;
      this.rect(xx, y + 6, Math.min(8, w - i * 16), 4, p.grass);
      if (i % 3 === 0 && i * 16 + 8 < w) {
        this.rect(xx + 5, y - 5, 2, 5, p.grass);
        this.rect(xx + 2, y - 3, 2, 3, p.grassLight);
      }
    }
    if (r.kind === "ground") {
      for (let i = 0; i < Math.floor(w / 85); i++) {
        const xx = x + 25 + i * 85 + hash(i + x) * 20;
        if (hash(i + x + 4) > 0.38) this.flower(xx, y, hash(i + x), p);
        else this.mushroom(xx, y, theme);
      }
      // Small clusters of fern fronds sit firmly behind the playable grass line.
      for (let i = 0; i < Math.floor(w / 190); i++) {
        const xx = x + 62 + i * 190;
        this.rect(xx, y - 12, 3, 12, p.leafShade);
        this.rect(xx - 6, y - 10, 6, 3, p.grass);
        this.rect(xx + 3, y - 15, 6, 3, p.grass);
        this.rect(xx - 10, y - 16, 7, 3, p.grass);
        this.rect(xx + 6, y - 20, 7, 3, p.grass);
      }
    }
  }

  private flower(x: number, y: number, seed: number, p: Palette) {
    this.rect(x, y - 12, 2, 12, p.leafShade);
    this.rect(x + 2, y - 6, 5, 2, p.grass);
    const col = seed > 0.7 ? "#f0cf76" : "#f5e6c3";
    this.rect(x - 3, y - 15, 8, 4, col);
    this.rect(x - 1, y - 17, 4, 8, col);
    this.rect(x, y - 14, 2, 2, "#cfa85d");
  }
  private mushroom(x: number, y: number, theme: Theme) {
    this.rect(x, y - 8, 4, 8, "#ebe4bd");
    this.rect(x - 5, y - 13, 14, 6, theme === "dusk" ? "#b493b1" : "#c39165");
    this.rect(x - 2, y - 16, 8, 4, theme === "dusk" ? "#ceb5c8" : "#ddb37c");
    this.rect(x - 2, y - 12, 3, 2, "#f1e5bb");
  }

  private coin(x: number, y: number, time: number, index: number) {
    const bob = Math.sin(time * 2.4 + index * 0.75) * 3;
    const width = 5 + Math.abs(Math.cos(time * 2 + index * 0.6)) * 8;
    const c = this.ctx;
    c.globalAlpha = 0.12;
    this.rect(x - 13, y - 13 + bob, 26, 26, "#fff1a1");
    c.globalAlpha = 1;
    this.rect(x - width / 2, y - 8 + bob, width, 16, "#b88c38");
    this.rect(
      x - width / 2 + 1,
      y - 10 + bob,
      Math.max(2, width - 2),
      18,
      "#e9bf5f",
    );
    this.rect(
      x - width / 2 + 2,
      y - 7 + bob,
      Math.max(2, width - 5),
      12,
      "#ffe5a0",
    );
    this.rect(x + width / 2 - 3, y - 5 + bob, 2, 8, "#d2a346");
  }

  private star(x: number, y: number, time: number, index: number) {
    const bob = Math.sin(time * 2 + index) * 4;
    const c = this.ctx;
    c.globalAlpha = 0.1 + Math.sin(time * 2) * 0.04;
    this.rect(x - 22, y - 22 + bob, 44, 44, "#fff5b5");
    c.globalAlpha = 1;
    const star = [
      [0, -15],
      [5, -5],
      [15, -5],
      [8, 3],
      [10, 13],
      [0, 8],
      [-10, 13],
      [-8, 3],
      [-15, -5],
      [-5, -5],
    ];
    this.polygon(
      star.map(([xx, yy]) => [xx + x + 2, yy + y + bob + 2]),
      "#ba8c42",
    );
    this.polygon(
      star.map(([xx, yy]) => [xx + x, yy + y + bob]),
      "#f3d785",
    );
    this.rect(x - 2, y - 7 + bob, 3, 10, "#fff4bf");
    const sparkle = (time * 1.3 + index) % 2;
    if (sparkle < 1) {
      this.rect(x + 20, y - 18, 2, 6, "#fff9dc");
      this.rect(x + 18, y - 16, 6, 2, "#fff9dc");
    }
  }

  private beetle(
    x: number,
    y: number,
    w: number,
    h: number,
    time: number,
    vx: number,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(Math.round(x + w / 2), Math.round(y + h));
    const s = w / 30;
    c.scale(vx < 0 ? -s : s, h / 24);
    const step = Math.sin(time * 14 + x * 0.1) > 0 ? 2 : 0;
    this.rect(-12, -4 - step, 5, 4 + step, "#4a5259");
    this.rect(6, -4 + step, 5, 4 - step, "#4a5259");
    this.rect(-15, -16, 28, 12, "#665f7c");
    this.rect(-10, -22, 19, 18, "#827b98");
    this.rect(-7, -23, 12, 5, "#9a91a8");
    this.rect(-14, -14, 25, 2, "#b0a0b6");
    this.rect(6, -17, 5, 5, "#f8efd6");
    this.rect(9, -16, 2, 3, "#3a4651");
    this.rect(10, -8, 6, 3, "#615b70");
    this.rect(6, -26, 2, 5, "#6a657c");
    this.rect(8, -27, 3, 2, "#dfbd78");
    c.restore();
  }

  private hero(game: Game, time: number) {
    const a = game.player;
    if (a.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
    const c = this.ctx;
    c.save();
    c.translate(Math.round(a.x + a.w / 2), Math.round(a.y + a.h));
    c.scale(a.facing < 0 ? -1 : 1, 1);
    const run = a.grounded && Math.abs(a.vx) > 15;
    const step = run ? Math.sin(time * 18) : 0;
    // Tiny shadow anchors the character without hiding the collision silhouette.
    if (a.grounded) {
      c.globalAlpha = 0.15;
      this.rect(-14, -1, 28, 3, "#274338");
      c.globalAlpha = 1;
    }
    this.rect(-9, -5, 7, 5, "#31574a");
    this.rect(3, -5, 7, 5, "#31574a");
    if (run) {
      this.rect(-10, -4, 7, Math.max(1, 5 + step * 3), "#31574a");
      this.rect(4, -4, 7, Math.max(1, 5 - step * 3), "#31574a");
    }
    // Amber satchel, moss body, and a bright leaf cap create an original silhouette.
    this.rect(-15, -23, 8, 16, "#b58b51");
    this.rect(-15, -22, 4, 9, "#ddae66");
    this.rect(-10, -22, 22, 17, "#74a878");
    this.rect(-8, -22, 16, 16, "#a4ce8e");
    this.rect(-11, -33, 24, 15, "#b9db9b");
    this.rect(-14, -29, 29, 10, "#b9db9b");
    this.rect(-9, -36, 17, 7, "#91bc7a");
    this.rect(-12, -32, 25, 4, "#92bc7b");
    this.rect(-4, -40, 3, 6, "#517a4d");
    this.rect(-1, -42, 9, 4, "#6b9b58");
    this.rect(1, -43, 5, 2, "#94b965");
    this.rect(0, -28, 3, 5, "#31594a");
    this.rect(9, -28, 3, 5, "#31594a");
    this.rect(0, -28, 1, 1, "#fff6d4");
    this.rect(9, -28, 1, 1, "#fff6d4");
    this.rect(5, -21, 4, 2, "#6e9d69");
    this.rect(-11, -18, 24, 5, "#e4b45f");
    this.rect(-15, -18, 5, 9, "#e9bf6c");
    this.rect(-20, -18 + (run ? step * 2 : 0), 8, 4, "#e9bf6c");
    this.rect(11, -15 + (run ? -step * 3 : 0), 4, 8, "#7bab7a");
    c.restore();
  }

  private checkpoint(
    x: number,
    y: number,
    active: boolean,
    time: number,
    p: Palette,
  ) {
    this.rect(x - 5, y - 51, 5, 51, p.trunk);
    this.rect(x - 8, y - 3, 12, 3, p.leafShade);
    this.rect(x - 7, y - 56, 9, 7, active ? "#ffe3a0" : "#b7bb8c");
    const col = active ? "#e3ad61" : "#bd9a70";
    this.polygon(
      [
        [x, y - 50],
        [x + 27, y - 47 + Math.sin(time * 3) * 2],
        [x + 22, y - 37],
        [x + 27, y - 27],
        [x, y - 29],
      ],
      col,
    );
    this.rect(x + 7, y - 44, 4, 10, "#fff0bf");
    this.rect(x + 4, y - 41, 10, 4, "#fff0bf");
    if (active) {
      const c = this.ctx;
      c.globalAlpha = 0.12;
      this.rect(x - 14, y - 64, 28, 28, "#ffec99");
      c.globalAlpha = 1;
    }
  }

  private portal(x: number, y: number, p: Palette, time: number) {
    const c = this.ctx;
    c.globalAlpha = 0.15;
    this.rect(x - 28, y - 104, 56, 99, "#fff5b4");
    this.rect(x - 36, y - 92, 72, 75, "#fff5b4");
    c.globalAlpha = 1;
    this.rect(x - 42, y - 6, 84, 6, p.soilShade);
    this.rect(x - 37, y - 13, 74, 7, p.stone);
    this.rect(x - 33, y - 83, 13, 70, p.stone);
    this.rect(x + 20, y - 83, 13, 70, p.stone);
    this.rect(x - 26, y - 98, 52, 15, p.stone);
    this.rect(x - 17, y - 108, 34, 10, p.stone);
    this.rect(x - 33, y - 83, 5, 65, "#7c9274");
    this.rect(x + 20, y - 83, 5, 65, "#7c9274");
    this.rect(x - 21, y - 88, 42, 4, p.grassLight);
    this.rect(x - 17, y - 103, 34, 4, p.grassLight);
    for (let i = 0; i < 5; i++) {
      this.rect(x - 33, y - 26 - i * 13, 13, 2, "#81917a");
      this.rect(x + 20, y - 26 - i * 13, 13, 2, "#81917a");
    }
    c.globalAlpha = 0.52 + Math.sin(time * 2) * 0.08;
    this.rect(x - 17, y - 82, 34, 65, "#f4e6a1");
    c.globalAlpha = 1;
    this.star(x, y - 55, time, 10);
    this.rect(x - 36, y - 16, 18, 4, p.grass);
    this.rect(x + 19, y - 84, 17, 4, p.grass);
    this.rect(x + 27, y - 81, 4, 16, p.grass);
    this.rect(x - 17, y - 111, 17, 4, p.grass);
  }
}
