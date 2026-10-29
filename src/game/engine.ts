import {
  levels,
  type EnemyKind,
  type Level,
  type Platform,
  type Rect,
} from "./levels";

import {
  createBoss,
  stepBoss,
  warnBoss,
  type BossState,
  type BossHazard,
} from "./bosses";
export type { BossState, BossHazard } from "./bosses";
export type RunMode = "classic" | "relaxed" | "timed";

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
export type PlatformState = Platform & {
  baseX: number;
  baseY: number;
  previousX: number;
  previousY: number;
  broken: boolean;
  awakened: boolean;
  crumbleRemaining: number;
  respawnRemaining: number;
};
export type Enemy = Rect & {
  kind: EnemyKind;
  vx: number;
  vy: number;
  facing: number;
  baseY: number;
  grounded: boolean;
  state: "patrol" | "windup" | "charge" | "recover";
  stateTime: number;
  alive: boolean;
  squashed: number;
  minX: number;
  maxX: number;
};

export const MAX_LIVES = 3;
export const COINS_PER_LIFE = 50;
export const STAR_POWER_DURATION = 10;
export const ENEMY_SQUASH_DURATION = 0.4;
export const CRUMBLE_WARNING = 0.8;
const SMALL_SIZE = { w: 28, h: 38 };
const BIG_SIZE = { w: 40, h: 56 };

const STEP = 1 / 120;
const GRAVITY = 1450;
const FALL_GRAVITY = 1850;
const JUMP = -635;
const SHORT_JUMP = -370;
const MUSHROOM_BOUNCE = -820;
const MAX_SPEED = 300;
const COYOTE_TIME = 0.12;
const JUMP_BUFFER_TIME = 0.16;
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const overlapsX = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x;
const active = (tile: PlatformState) =>
  tile.awakened && !tile.broken && tile.crumbleRemaining !== 0;
const solid = (tile: PlatformState) =>
  tile.kind === "ground" || tile.kind === "brick";
const approach = (value: number, target: number, amount: number) =>
  value < target
    ? Math.min(value + amount, target)
    : Math.max(value - amount, target);

/** A renderer-independent, fixed-step simulation. No wall clock or randomness. */
export class Game {
  readonly level: Level;
  readonly mode: RunMode;
  boss: BossState | null = null;
  hazards: BossHazard[] = [];
  outfit: "leaf" | "berry" | "moon" = "leaf";
  groveDecorations: string[] = [];
  rescuedTotal = 0;
  player!: Player;
  platforms!: PlatformState[];
  coins!: Collectible[];
  stars!: Collectible[];
  fireflies!: Collectible[];
  diamonds!: Collectible[];
  enemies!: Enemy[];
  state: "playing" | "won" | "lost" = "playing";
  lives = MAX_LIVES;
  collectedCoins = 0;
  coinsTowardLife = 0;
  collectedStars = 0;
  collectedFireflies = 0;
  starPowerRemaining = 0;
  elapsed = 0;
  deaths = 0;
  activeCheckpointIndex = -1;
  events: string[] = [];
  private accumulator = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpCanShorten = false;
  private hurtLock = 0;
  private blockedCarriers = new Set<PlatformState>();

  get checkpointActive() {
    return this.activeCheckpointIndex >= 0;
  }

  constructor(levelIndex = 0, options: { mode?: RunMode; level?: Level } = {}) {
    this.mode = options.mode ?? "classic";
    this.level =
      options.level ??
      levels[
        Math.max(
          0,
          Math.min(
            levels.length - 1,
            Math.floor(Number.isFinite(levelIndex) ? levelIndex : 0),
          ),
        )
      ]!;
    this.restart();
  }

  restart() {
    this.state = "playing";
    this.lives = MAX_LIVES;
    this.collectedCoins = 0;
    this.coinsTowardLife = 0;
    this.collectedStars = 0;
    this.collectedFireflies = 0;
    this.starPowerRemaining = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.activeCheckpointIndex = -1;
    this.events = [];
    this.accumulator = 0;
    this.boss = this.level.boss ? createBoss(this.level.boss) : null;
    this.hazards = [];
    this.platforms = this.level.platforms.map((tile) => {
      const offset = tile.motion
        ? Math.sin(tile.motion.phase ?? 0) * tile.motion.range
        : 0;
      const x = tile.x + (tile.motion?.axis === "x" ? offset : 0);
      const y = tile.y + (tile.motion?.axis === "y" ? offset : 0);
      return {
        ...tile,
        x,
        y,
        baseX: tile.x,
        baseY: tile.y,
        previousX: x,
        previousY: y,
        broken: false,
        awakened: tile.kind !== "flower" && tile.kind !== "curled",
        crumbleRemaining: -1,
        respawnRemaining: 0,
      };
    });
    this.coins = this.level.coins.map((c) => ({ ...c, collected: false }));
    this.stars = this.level.stars.map((c) => ({ ...c, collected: false }));
    this.fireflies = this.level.fireflies.map((c) => ({
      ...c,
      collected: false,
    }));
    this.diamonds = this.level.diamonds.map((c) => ({
      ...c,
      collected: false,
    }));
    this.enemies = this.level.enemies.map((e, i) => ({
      ...e,
      w: 32,
      h: 28,
      vx: i % 2 ? -56 : 56,
      vy: 0,
      facing: i % 2 ? -1 : 1,
      baseY: e.y,
      grounded: true,
      state: "patrol",
      stateTime: e.kind === "hopper" ? 0.65 + (i % 3) * 0.15 : 0,
      alive: true,
      squashed: 0,
    }));
    this.spawn();
  }

  private spawn() {
    const checkpoint = this.level.checkpoints[this.activeCheckpointIndex];
    const point = checkpoint
      ? { x: checkpoint.x, y: checkpoint.y - SMALL_SIZE.h }
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
    this.blockedCarriers.clear();
  }

  update(dt: number, input: GameInput) {
    this.events = [];
    if (this.state !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
    this.accumulator += Math.min(dt, 0.1);
    if (input.jumpPressed) this.jumpBuffer = JUMP_BUFFER_TIME;
    while (this.accumulator + 1e-10 >= STEP && this.state === "playing") {
      const lostLife = this.tick(input);
      this.accumulator = Math.max(0, this.accumulator - STEP);
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
    this.wakePlants();
    this.movePlatforms();
    this.coyote = p.grounded ? COYOTE_TIME : Math.max(0, this.coyote - STEP);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - STEP);
    const direction = Number(input.right) - Number(input.left);
    if (this.hurtLock === 0) {
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
    p.vy = Math.min(900, p.vy + (p.vy < 0 ? GRAVITY : FALL_GRAVITY) * STEP);

    p.x += p.vx * STEP;
    this.resolveHorizontal(p.vx);
    p.x = Math.max(0, Math.min(this.level.width - p.w, p.x));
    if (this.boss && this.boss.state !== "defeated")
      p.x = Math.min(p.x, this.boss.maxX + this.boss.w + 26 - p.w);
    const oldBottom = p.y + p.h;
    const oldTop = p.y;
    p.y += p.vy * STEP;
    p.grounded = false;
    for (const tile of this.platforms) {
      if (!active(tile) || this.blockedCarriers.has(tile) || !overlaps(p, tile))
        continue;
      const previousTop =
        tile.kind === "moving" ? Math.max(tile.previousY, tile.y) : tile.y;
      if (p.vy >= 0 && oldBottom <= previousTop + 1) {
        p.y = tile.y - p.h;
        p.vy = 0;
        p.grounded = true;
        this.jumpCanShorten = false;
        if (tile.kind === "mushroom") {
          p.vy = MUSHROOM_BOUNCE;
          p.grounded = false;
          this.coyote = 0;
          this.jumpBuffer = 0;
          this.events.push("bounce");
        } else if (tile.kind === "crumble" && tile.crumbleRemaining < 0) {
          tile.crumbleRemaining = CRUMBLE_WARNING;
          this.events.push("crumble");
        }
      } else if (solid(tile) && p.vy < 0 && oldTop >= tile.y + tile.h - 1) {
        if (tile.kind === "brick" && p.form === "big") {
          tile.broken = true;
          this.events.push("break");
          this.awardCoins(tile.rewardCoins ?? 0);
        } else {
          p.y = tile.y + tile.h;
          p.vy = 0;
        }
      }
    }
    if (p.grounded) this.tryJump(input);
    if (p.y > 660) return this.loseLife();

    for (const coin of this.coins) {
      if (
        !coin.collected &&
        overlaps(p, { x: coin.x - 10, y: coin.y - 12, w: 20, h: 24 })
      ) {
        coin.collected = true;
        this.awardCoins(1);
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
    // Power pickups resolve before contact; an enemy covering a star cannot steal it.
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
    for (const firefly of this.fireflies) {
      if (
        !firefly.collected &&
        overlaps(p, { x: firefly.x - 14, y: firefly.y - 16, w: 28, h: 32 })
      ) {
        firefly.collected = true;
        this.collectedFireflies++;
        this.events.push("firefly");
      }
    }
    for (
      let index = this.activeCheckpointIndex + 1;
      index < this.level.checkpoints.length;
      index++
    ) {
      const checkpoint = this.level.checkpoints[index]!;
      if (
        overlaps(p, {
          x: checkpoint.x - 10,
          y: checkpoint.y - 80,
          w: 40,
          h: 80,
        })
      ) {
        this.activeCheckpointIndex = index;
        this.events.push("checkpoint");
      }
    }

    for (const enemy of this.enemies) {
      enemy.squashed = Math.max(0, enemy.squashed - STEP);
      if (!enemy.alive) continue;
      const previousEnemyY = enemy.y;
      this.moveEnemy(enemy);
      if (!overlaps(p, enemy)) continue;
      if (this.starPowerRemaining > 0) {
        this.squash(enemy);
      } else if (p.vy > 0 && oldBottom <= previousEnemyY + 10) {
        this.squash(enemy);
        p.y = enemy.y - p.h;
        p.vy = -440;
        p.grounded = false;
        this.coyote = 0;
        this.jumpCanShorten = false;
      } else if (this.hurt(enemy)) return true;
    }
    if (this.updateBoss(oldBottom)) return true;
    if (
      this.level.kind !== "grove" &&
      (!this.boss || this.boss.state === "defeated") &&
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

  private wakePlants() {
    const p = this.player;
    for (const tile of this.platforms) {
      if (tile.awakened) continue;
      const nearestX = Math.max(
        tile.x,
        Math.min(tile.x + tile.w, p.x + p.w / 2),
      );
      const nearestY = Math.max(
        tile.y,
        Math.min(tile.y + tile.h, p.y + p.h / 2),
      );
      if (
        Math.hypot(nearestX - p.x - p.w / 2, nearestY - p.y - p.h / 2) <=
        (tile.wakeRadius ?? 150)
      ) {
        tile.awakened = true;
        this.events.push("awaken");
      }
    }
  }

  /** Returns true only when a life was lost and the frame must stop. */
  private hurt(source: Rect) {
    const p = this.player;
    if (
      p.invulnerable > 0 ||
      this.starPowerRemaining > 0 ||
      this.level.kind === "grove"
    )
      return false;
    if (p.form === "small") return this.loseLife();
    this.resize("small");
    p.invulnerable = 1.5;
    this.events.push("shrink");
    p.vx = p.x + p.w / 2 < source.x + source.w / 2 ? -300 : 300;
    p.vy = -290;
    p.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCanShorten = false;
    this.hurtLock = 0.22;
    return false;
  }

  private updateBoss(oldBottom: number) {
    const boss = this.boss;
    if (!boss) return false;
    const p = this.player;
    const previousY = boss.y;
    stepBoss(boss, STEP, p, this.hazards, this.events);
    for (const hazard of this.hazards) {
      hazard.remaining = Math.max(0, hazard.remaining - STEP);
      hazard.x += hazard.vx * STEP;
      hazard.y += hazard.vy * STEP;
      if (
        hazard.remaining <= 0 ||
        hazard.x < boss.minX - 30 ||
        hazard.x > boss.maxX + boss.w + 30
      ) {
        hazard.remaining = 0;
        continue;
      }
      if (overlaps(p, hazard)) {
        hazard.remaining = 0;
        if (this.hurt(hazard)) return true;
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.remaining > 0);
    if (
      boss.state === "dormant" ||
      boss.state === "defeated" ||
      !overlaps(p, boss)
    )
      return false;
    const stomp = p.vy > 0 && oldBottom <= previousY + 12;
    const powered = this.starPowerRemaining > 0;
    if ((stomp && boss.state === "recover") || powered) {
      if (boss.invulnerable <= 0) {
        boss.health--;
        boss.invulnerable = 1.35;
        this.hazards = [];
        this.events.push("boss-hit");
        if (boss.health <= 0) {
          boss.health = 0;
          boss.state = "defeated";
          boss.stateTime = 0;
          this.events.push("boss-defeat");
        } else {
          boss.phase = boss.maxHealth - boss.health + 1;
          warnBoss(boss, p, this.events);
        }
      }
      if (stomp || !powered) this.bounceOffBoss(boss);
    } else if (stomp) {
      // Armored phases safely bounce Pip away; the folded/panting recovery is the opening.
      this.bounceOffBoss(boss);
    } else if (this.hurt(boss)) return true;
    return false;
  }

  private bounceOffBoss(boss: BossState) {
    this.player.y = boss.y - this.player.h;
    this.player.vy = -490;
    this.player.grounded = false;
    this.coyote = 0;
    this.jumpCanShorten = false;
  }

  private movePlatforms() {
    const p = this.player;
    let rider: PlatformState | undefined;
    for (const tile of this.platforms) {
      if (
        active(tile) &&
        p.grounded &&
        overlapsX(p, tile) &&
        Math.abs(p.y + p.h - tile.y) < 1
      )
        rider = tile;
      tile.previousX = tile.x;
      tile.previousY = tile.y;
      if (tile.motion) {
        const offset =
          Math.sin(
            (this.elapsed / Math.max(0.1, tile.motion.period)) * Math.PI * 2 +
              (tile.motion.phase ?? 0),
          ) * tile.motion.range;
        tile.x = tile.baseX + (tile.motion.axis === "x" ? offset : 0);
        tile.y = tile.baseY + (tile.motion.axis === "y" ? offset : 0);
      }
      if (tile.kind !== "crumble") continue;
      if (tile.crumbleRemaining > 0) {
        tile.crumbleRemaining = Math.max(0, tile.crumbleRemaining - STEP);
        if (tile.crumbleRemaining < 1e-9) {
          tile.crumbleRemaining = 0;
          tile.respawnRemaining = 3;
        }
      } else if (tile.crumbleRemaining === 0) {
        tile.respawnRemaining = Math.max(0, tile.respawnRemaining - STEP);
        // Never materialize a cloud inside Pip. It can return once the space is clear.
        if (tile.respawnRemaining === 0 && !overlaps(p, tile))
          tile.crumbleRemaining = -1;
      }
    }
    for (const tile of this.blockedCarriers) {
      if (p.y >= tile.y + tile.h || p.y + p.h < tile.y - 2)
        this.blockedCarriers.delete(tile);
    }
    if (!rider || !active(rider)) return;
    const dx = rider.x - rider.previousX;
    const dy = rider.y - rider.previousY;
    if (!dx && !dy) return;
    p.x += dx;
    this.resolveHorizontal(dx);
    p.x = Math.max(0, Math.min(this.level.width - p.w, p.x));
    if (!overlapsX(p, rider)) {
      p.grounded = false;
      return;
    }
    const carried = { ...p, y: p.y + dy };
    // A leaf can pass under a ceiling; its rider must not be pushed into solid terrain.
    if (
      this.platforms.some(
        (tile) => active(tile) && solid(tile) && overlaps(carried, tile),
      )
    ) {
      p.grounded = false;
      this.blockedCarriers.add(rider);
      return;
    }
    p.y = carried.y;
  }

  private resolveHorizontal(vx: number) {
    const p = this.player;
    for (const tile of this.platforms) {
      if (!active(tile) || !solid(tile) || !overlaps(p, tile)) continue;
      if (vx > 0) p.x = tile.x - p.w;
      else if (vx < 0) p.x = tile.x + tile.w;
      p.vx = 0;
    }
  }

  private moveEnemy(enemy: Enemy) {
    enemy.stateTime = Math.max(0, enemy.stateTime - STEP);
    if (enemy.kind === "hopper") {
      if (enemy.grounded && enemy.stateTime === 0) {
        enemy.vy = -360;
        enemy.grounded = false;
      }
      enemy.vx = enemy.facing * (enemy.grounded ? 35 : 85);
      if (!enemy.grounded) {
        const oldBottom = enemy.y + enemy.h;
        enemy.vy += (enemy.vy < 0 ? GRAVITY : FALL_GRAVITY) * STEP;
        enemy.y += enemy.vy * STEP;
        const mushroom = this.platforms.find(
          (tile) =>
            tile.kind === "mushroom" &&
            active(tile) &&
            overlapsX(enemy, tile) &&
            enemy.vy > 0 &&
            oldBottom <= tile.y + 1 &&
            enemy.y + enemy.h >= tile.y,
        );
        if (mushroom) {
          enemy.y = mushroom.y - enemy.h;
          enemy.vy = -580;
          if (Math.abs(enemy.x - this.player.x) < 500)
            this.events.push("hopper-bounce");
        } else if (enemy.y >= enemy.baseY) {
          enemy.y = enemy.baseY;
          enemy.vy = 0;
          enemy.grounded = true;
          enemy.stateTime = 0.8;
        }
      }
    } else if (enemy.kind === "charger") {
      const dx = this.player.x + this.player.w / 2 - enemy.x - enemy.w / 2;
      const sameFloor =
        Math.abs(this.player.y + this.player.h - enemy.y - enemy.h) < 75;
      if (
        enemy.state === "patrol" &&
        enemy.stateTime === 0 &&
        Math.abs(dx) < 260 &&
        sameFloor
      ) {
        enemy.facing = dx >= 0 ? 1 : -1;
        enemy.state = "windup";
        enemy.stateTime = 0.6;
        this.events.push("charge");
      } else if (enemy.state === "windup" && enemy.stateTime === 0) {
        enemy.state = "charge";
        enemy.stateTime = 0.8;
      } else if (enemy.state === "charge" && enemy.stateTime === 0) {
        enemy.state = "recover";
        enemy.stateTime = 0.65;
      } else if (enemy.state === "recover" && enemy.stateTime === 0) {
        enemy.state = "patrol";
        enemy.stateTime = 0.6;
      }
      const speed =
        enemy.state === "charge" ? 240 : enemy.state === "patrol" ? 40 : 0;
      enemy.vx = speed ? enemy.facing * speed : 0;
    }
    enemy.x += enemy.vx * STEP;
    if (enemy.kind === "charger") {
      for (const tile of this.platforms) {
        if (!active(tile) || !solid(tile) || !overlaps(enemy, tile)) continue;
        if (
          enemy.state === "charge" &&
          tile.kind === "brick" &&
          tile.enemyBreakable
        ) {
          tile.broken = true;
          if (Math.abs(enemy.x - this.player.x) < 500)
            this.events.push("enemy-break");
          this.awardCoins(tile.rewardCoins ?? 0);
        } else {
          enemy.x = enemy.vx >= 0 ? tile.x - enemy.w : tile.x + tile.w;
          enemy.facing *= -1;
          enemy.vx = 0;
          enemy.state = "recover";
          enemy.stateTime = 0.65;
        }
      }
    }
    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
      if (
        (enemy.x <= enemy.minX && enemy.vx < 0) ||
        (enemy.x >= enemy.maxX && enemy.vx > 0)
      ) {
        enemy.facing = enemy.x <= enemy.minX ? 1 : -1;
        enemy.vx *= -1;
        if (enemy.kind === "charger" && enemy.state === "charge") {
          enemy.state = "recover";
          enemy.stateTime = 0.65;
          enemy.vx = 0;
        }
      }
    }
    if (enemy.vx) enemy.facing = Math.sign(enemy.vx);
  }

  private squash(enemy: Enemy) {
    enemy.alive = false;
    enemy.squashed = ENEMY_SQUASH_DURATION;
    enemy.vx = 0;
    enemy.vy = 0;
    this.events.push("stomp");
  }

  private awardCoins(count: number) {
    for (let i = 0; i < Math.max(0, Math.floor(count)); i++) {
      this.collectedCoins++;
      this.coinsTowardLife++;
      this.events.push("coin");
      if (this.coinsTowardLife === COINS_PER_LIFE) {
        this.coinsTowardLife = 0;
        if (this.lives < MAX_LIVES) {
          this.lives++;
          this.events.push("extra-life");
        }
      }
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
    if (
      grown.x < 0 ||
      grown.x + grown.w > this.level.width ||
      this.platforms.some(
        (tile) => active(tile) && solid(tile) && overlaps(grown, tile),
      )
    )
      return false;
    this.resize("big");
    return true;
  }

  private loseLife() {
    if (this.level.kind === "grove") {
      this.spawn();
      this.events.push("grove-return");
      return true;
    }
    if (this.mode !== "relaxed") this.lives--;
    this.deaths++;
    this.starPowerRemaining = 0;
    this.events.push("life-lost");
    this.hazards = [];
    if (this.boss && this.boss.state !== "defeated" && this.level.boss)
      this.boss = createBoss(this.level.boss);
    for (const diamond of this.diamonds) diamond.collected = false;
    // Clouds must be available on retry. Broken coin caches stay broken so rewards
    // cannot be farmed, just as ordinary collected coins stay collected after death.
    for (const platform of this.platforms) {
      if (platform.kind === "crumble") {
        platform.crumbleRemaining = -1;
        platform.respawnRemaining = 0;
      }
    }
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "lost";
      this.events.push("lose");
    } else this.spawn();
    return true;
  }
}
