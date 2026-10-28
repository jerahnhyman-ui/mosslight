import { levels, type Level, type Rect } from "./levels";

export type GameInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
};
export type Player = Rect & {
  form: "small" | "big";
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  invulnerable: number;
};
export type Collectible = { x: number; y: number; collected: boolean };
export type Enemy = Rect & {
  vx: number;
  alive: boolean;
  squashed: number;
  minX: number;
  maxX: number;
};

export const MAX_LIVES = 3;
export const COINS_PER_LIFE = 50;
export const STAR_POWER_DURATION = 10;
export const ENEMY_SQUASH_DURATION = 0.4;
const SMALL_SIZE = { w: 28, h: 38 };
const BIG_SIZE = { w: 40, h: 56 };

const STEP = 1 / 120;
const GRAVITY = 1450;
const FALL_GRAVITY = 1850;
const JUMP = -635;
const SHORT_JUMP = -370;
const MAX_SPEED = 300;
const COYOTE_TIME = 0.12;
const JUMP_BUFFER_TIME = 0.16;
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const approach = (value: number, target: number, amount: number) =>
  value < target
    ? Math.min(value + amount, target)
    : Math.max(value - amount, target);

/** A renderer-independent, fixed-step simulation. No wall clock or randomness. */
export class Game {
  readonly level: Level;
  player!: Player;
  coins!: Collectible[];
  stars!: Collectible[];
  diamonds!: Collectible[];
  enemies!: Enemy[];
  state: "playing" | "won" | "lost" = "playing";
  lives = MAX_LIVES;
  collectedCoins = 0;
  coinsTowardLife = 0;
  collectedStars = 0;
  starPowerRemaining = 0;
  elapsed = 0;
  deaths = 0;
  checkpointActive = false;
  events: string[] = [];
  private accumulator = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpCanShorten = false;
  private hurtLock = 0;

  constructor(levelIndex = 0) {
    this.level =
      levels[Math.max(0, Math.min(levels.length - 1, Math.floor(levelIndex)))]!;
    this.restart();
  }

  restart() {
    this.state = "playing";
    this.lives = MAX_LIVES;
    this.collectedCoins = 0;
    this.coinsTowardLife = 0;
    this.collectedStars = 0;
    this.starPowerRemaining = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.checkpointActive = false;
    this.events = [];
    this.accumulator = 0;
    this.coins = this.level.coins.map((c) => ({ ...c, collected: false }));
    this.stars = this.level.stars.map((c) => ({ ...c, collected: false }));
    this.diamonds = this.level.diamonds.map((c) => ({
      ...c,
      collected: false,
    }));
    this.enemies = this.level.enemies.map((e, i) => ({
      ...e,
      w: 32,
      h: 28,
      vx: i % 2 ? -56 : 56,
      alive: true,
      squashed: 0,
    }));
    this.spawn();
  }

  private spawn() {
    const point = this.checkpointActive
      ? { x: this.level.checkpoint.x, y: this.level.checkpoint.y - 38 }
      : this.level.spawn;
    this.player = {
      ...point,
      ...SMALL_SIZE,
      form: "small",
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      invulnerable: this.deaths ? 1.5 : 0,
    };
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCanShorten = false;
    this.hurtLock = 0;
  }

  update(dt: number, input: GameInput) {
    this.events = [];
    if (this.state !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
    // Cap catch-up after tab suspension, retaining normal frame-rate independence.
    this.accumulator += Math.min(dt, 0.1);
    if (input.jumpPressed) this.jumpBuffer = JUMP_BUFFER_TIME;
    while (this.accumulator + 1e-10 >= STEP && this.state === "playing") {
      const lostLife = this.tick(input);
      this.accumulator = Math.max(0, this.accumulator - STEP);
      // A respawn is a boundary: don't apply the old frame's movement or
      // buffered jump to the new player, or resolve another hit in this update.
      if (lostLife) {
        this.accumulator = 0;
        break;
      }
    }
  }

  private tick(input: GameInput) {
    const p = this.player;
    this.elapsed += STEP;
    if (this.starPowerRemaining > 0) {
      this.starPowerRemaining = Math.max(0, this.starPowerRemaining - STEP);
      if (this.starPowerRemaining < 1e-9) {
        this.starPowerRemaining = 0;
        this.events.push("star-end");
      }
    }
    p.invulnerable = Math.max(0, p.invulnerable - STEP);
    this.hurtLock = Math.max(0, this.hurtLock - STEP);
    this.coyote = p.grounded ? COYOTE_TIME : Math.max(0, this.coyote - STEP);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - STEP);
    const direction = Number(input.right) - Number(input.left);
    if (this.hurtLock === 0) {
      // A thumb reversal should turn immediately, while releasing the pad should
      // stop the player predictably on a narrow ledge. Keep useful air control.
      let acceleration = p.grounded ? 3200 : 2600;
      if (direction === 0) acceleration = p.grounded ? 4200 : 1800;
      else if (p.vx * direction < 0) acceleration = p.grounded ? 4800 : 3600;
      p.vx = approach(p.vx, direction * MAX_SPEED, acceleration * STEP);
      if (direction) p.facing = direction;
    }
    this.tryJump(input);
    if (this.jumpCanShorten && !input.jump) {
      p.vy = Math.max(p.vy, SHORT_JUMP);
      this.jumpCanShorten = false;
    }
    if (p.vy >= 0) this.jumpCanShorten = false;
    // Preserve the reachable jump arc on ascent, then land with less float.
    p.vy = Math.min(900, p.vy + (p.vy < 0 ? GRAVITY : FALL_GRAVITY) * STEP);

    p.x += p.vx * STEP;
    for (const tile of this.level.platforms) {
      if (tile.kind === "platform" || !overlaps(p, tile)) continue;
      if (p.vx > 0) p.x = tile.x - p.w;
      else if (p.vx < 0) p.x = tile.x + tile.w;
      p.vx = 0;
    }
    p.x = Math.max(0, Math.min(this.level.width - p.w, p.x));
    const oldBottom = p.y + p.h;
    p.y += p.vy * STEP;
    p.grounded = false;
    for (const tile of this.level.platforms) {
      if (!overlaps(p, tile)) continue;
      if (p.vy >= 0 && oldBottom <= tile.y + 1) {
        p.y = tile.y - p.h;
        p.vy = 0;
        p.grounded = true;
        this.jumpCanShorten = false;
      } else if (tile.kind !== "platform" && p.vy < 0) {
        p.y = tile.y + tile.h;
        p.vy = 0;
      }
    }
    // Consume a buffered tap on the actual landing tick, including a tap that
    // has already been released. The buffer is consumed once, never auto-jumps.
    if (p.grounded) this.tryJump(input);

    // Power and grace never protect against a gap. Resolve the fall before
    // any pickups and leave this tick as soon as the player is replaced.
    if (p.y > 660) return this.loseLife();

    for (const coin of this.coins) {
      if (
        !coin.collected &&
        overlaps(p, { x: coin.x - 10, y: coin.y - 12, w: 20, h: 24 })
      ) {
        coin.collected = true;
        this.collectedCoins++;
        this.coinsTowardLife++;
        this.events.push("coin");
        if (this.coinsTowardLife === COINS_PER_LIFE) {
          this.coinsTowardLife = 0;
          // Spend the threshold even at the cap; there are no banked lives.
          if (this.lives < MAX_LIVES) {
            this.lives++;
            this.events.push("extra-life");
          }
        }
      }
    }
    for (const diamond of this.diamonds) {
      if (
        !diamond.collected &&
        p.form === "small" &&
        overlaps(p, { x: diamond.x - 14, y: diamond.y - 16, w: 28, h: 32 }) &&
        this.grow()
      ) {
        diamond.collected = true;
        this.events.push("grow");
      }
    }
    // Pickups take effect before enemy contact, so a star saves the player
    // even when the star and a beetle are touched in the same simulation tick.
    for (const star of this.stars) {
      if (
        !star.collected &&
        overlaps(p, { x: star.x - 14, y: star.y - 14, w: 28, h: 28 })
      ) {
        star.collected = true;
        this.collectedStars++;
        this.starPowerRemaining = STAR_POWER_DURATION;
        this.events.push("star");
      }
    }

    if (
      !this.checkpointActive &&
      overlaps(p, {
        x: this.level.checkpoint.x - 10,
        y: this.level.checkpoint.y - 80,
        w: 40,
        h: 80,
      })
    ) {
      this.checkpointActive = true;
      this.events.push("checkpoint");
    }

    for (const enemy of this.enemies) {
      enemy.squashed = Math.max(0, enemy.squashed - STEP);
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * STEP;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
        enemy.vx *= -1;
      }
      if (!overlaps(p, enemy)) continue;
      if (this.starPowerRemaining > 0) {
        enemy.alive = false;
        enemy.squashed = ENEMY_SQUASH_DURATION;
        this.events.push("stomp");
      } else if (p.vy > 0 && oldBottom <= enemy.y + 10) {
        enemy.alive = false;
        enemy.squashed = ENEMY_SQUASH_DURATION;
        p.y = enemy.y - p.h;
        p.vy = -440;
        p.grounded = false;
        this.coyote = 0;
        this.jumpCanShorten = false;
        this.events.push("stomp");
      } else if (p.invulnerable <= 0) {
        if (p.form === "small") return this.loseLife();
        this.resize("small");
        p.invulnerable = 1.5;
        this.events.push("shrink");
        p.vx = p.x + p.w / 2 < enemy.x + enemy.w / 2 ? -300 : 300;
        p.vy = -290;
        p.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.jumpCanShorten = false;
        this.hurtLock = 0.22;
      }
    }

    if (
      overlaps(p, {
        x: this.level.goal.x,
        y: this.level.goal.y - 95,
        w: 60,
        h: 95,
      })
    ) {
      this.state = "won";
      p.vx = 0;
      this.events.push("win");
    }
  }

  private tryJump(input: GameInput) {
    if (
      this.jumpBuffer <= 0 ||
      this.hurtLock > 0 ||
      (!this.player.grounded && this.coyote <= 0)
    )
      return;
    this.player.vy = input.jump ? JUMP : SHORT_JUMP;
    this.player.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCanShorten = input.jump;
    this.events.push("jump");
  }

  private resize(form: Player["form"]) {
    const p = this.player;
    const size = form === "big" ? BIG_SIZE : SMALL_SIZE;
    p.x += (p.w - size.w) / 2;
    p.y += p.h - size.h;
    Object.assign(p, size, { form });
  }

  private grow() {
    const p = this.player;
    const grown = {
      x: p.x + (p.w - BIG_SIZE.w) / 2,
      y: p.y + p.h - BIG_SIZE.h,
      ...BIG_SIZE,
    };
    // One-way ledges remain passable from below, including during growth.
    if (
      grown.x < 0 ||
      grown.x + grown.w > this.level.width ||
      this.level.platforms.some(
        (tile) => tile.kind !== "platform" && overlaps(grown, tile),
      )
    )
      return false;
    this.resize("big");
    return true;
  }

  private loseLife() {
    this.lives--;
    this.deaths++;
    this.starPowerRemaining = 0;
    this.events.push("life-lost");
    for (const diamond of this.diamonds) diamond.collected = false;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "lost";
      this.events.push("lose");
    } else {
      this.spawn();
    }
    return true;
  }
}
