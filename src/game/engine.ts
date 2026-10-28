import { levels, type Level, type Rect } from "./levels";

export type GameInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
};
export type Player = Rect & {
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
  minX: number;
  maxX: number;
};

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
  enemies!: Enemy[];
  state: "playing" | "won" | "lost" = "playing";
  health = 3;
  collectedCoins = 0;
  collectedStars = 0;
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
    this.health = 3;
    this.collectedCoins = 0;
    this.collectedStars = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.checkpointActive = false;
    this.events = [];
    this.accumulator = 0;
    this.coins = this.level.coins.map((c) => ({ ...c, collected: false }));
    this.stars = this.level.stars.map((c) => ({ ...c, collected: false }));
    this.enemies = this.level.enemies.map((e, i) => ({
      ...e,
      w: 32,
      h: 28,
      vx: i % 2 ? -56 : 56,
      alive: true,
    }));
    this.spawn();
  }

  private spawn() {
    const point = this.checkpointActive
      ? { x: this.level.checkpoint.x, y: this.level.checkpoint.y - 38 }
      : this.level.spawn;
    this.player = {
      ...point,
      w: 28,
      h: 38,
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
      this.tick(input);
      this.accumulator = Math.max(0, this.accumulator - STEP);
    }
  }

  private tick(input: GameInput) {
    const p = this.player;
    this.elapsed += STEP;
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

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * STEP;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
        enemy.vx *= -1;
      }
      if (!overlaps(p, enemy)) continue;
      if (p.vy > 0 && oldBottom <= enemy.y + 10) {
        enemy.alive = false;
        p.y = enemy.y - p.h;
        p.vy = -440;
        p.grounded = false;
        this.coyote = 0;
        this.jumpCanShorten = false;
        this.events.push("stomp");
      } else if (p.invulnerable <= 0) {
        this.damage(false);
        if (this.state !== "playing") return;
        p.vx = p.x + p.w / 2 < enemy.x + enemy.w / 2 ? -300 : 300;
        p.vy = -290;
        p.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.jumpCanShorten = false;
        this.hurtLock = 0.22;
      }
    }

    for (const coin of this.coins) {
      if (
        !coin.collected &&
        overlaps(p, { x: coin.x - 10, y: coin.y - 12, w: 20, h: 24 })
      ) {
        coin.collected = true;
        this.collectedCoins++;
        this.events.push("coin");
      }
    }
    for (const star of this.stars) {
      if (
        !star.collected &&
        overlaps(p, { x: star.x - 14, y: star.y - 14, w: 28, h: 28 })
      ) {
        star.collected = true;
        this.collectedStars++;
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
    if (p.y > 660) {
      this.damage(true);
      return;
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

  private damage(fall: boolean) {
    this.health--;
    this.events.push("hurt");
    if (fall) this.deaths++;
    if (this.health <= 0) {
      this.health = 0;
      this.state = "lost";
      this.events.push("lose");
      return;
    }
    if (fall) this.spawn();
    else this.player.invulnerable = 1.5;
  }
}
