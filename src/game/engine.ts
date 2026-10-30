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
  hitBoss,
  retryBoss,
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
  jumpEdges?: boolean[];
};
export type Player = Rect & {
  form: "small" | "big";
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  invulnerable: number;
};
export type Collectible = {
  x: number;
  y: number;
  collected: boolean;
  fromRewardBlock?: boolean;
  /** A reserve diamond falls into the scene after Pip takes a hit. */
  reserveDrop?: { vy: number; pickupDelay: number; needsSeparation: boolean };
};
export type PlatformState = Platform & {
  baseX: number;
  baseY: number;
  previousX: number;
  previousY: number;
  broken: boolean;
  rewardUsed: boolean;
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
  /** A fourth-world finale is a separate encounter after the level guardian. */
  finalBossStarted = false;
  hazards: BossHazard[] = [];
  outfit: "leaf" | "berry" | "moon" | "cosmetic.bee_scarf" = "leaf";
  character: "pip" | "poppy" = "pip";
  groveDecorations: string[] = [];
  rescuedTotal = 0;
  /** Stable resident IDs copied between a trail and its secret detour. */
  rescuedCreatures: string[] = [];
  player!: Player;
  platforms!: PlatformState[];
  coins!: Collectible[];
  stars!: Collectible[];
  fireflies!: Collectible[];
  diamonds!: Collectible[];
  /** One extra diamond earned while already grown, carried between areas. */
  reserveDiamond = false;
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
  puzzleState = this.newPuzzleState();
  secretCompleted = false;
  portalReady: string | null = null;
  requestedPortal: string | null = null;
  minigame = this.newMinigame();
  private hiveTicks = 0;
  private airborneMin = Infinity;
  /** A jump launched from a pad must not toggle it again on landing. */
  private takeoffActuators = new Set<string>();
  /** Landing on a pad activates it; jumping away must not undo that. */
  private landedActuators = new Set<string>();
  private padTicks = new Map<string, number>();
  private portalBlocked = false;
  private portalTicks = 0;
  countdown = 0;
  hasWindFeather = false;
  liftRemaining = 0;
  liftActive = false;
  glideArmed = false;
  private liftTicks = 0;
  private stableTicks = 0;
  private jumpHeld = false;
  private inputHeld = false;
  private pendingEdges: boolean[] = [];
  private flightNeedsRelease = false;
  private accumulator = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpCanShorten = false;
  private hurtLock = 0;
  private blockedCarriers = new Set<PlatformState>();

  private newPuzzleState() {
    return {
      wind: "WEST" as "WEST" | "EAST",
      brake: "HELD" as "HELD" | "RELEASED",
      water: "LOW" as "LOW" | "HIGH",
      shutter: "HIVE" as "HIVE" | "BRIDGE",
      vaneGateOpen: false,
      sluiceGateOpen: false,
      lightGateOpen: false,
      workshopGateOpen: false,
      hiveDiscovered: false,
      flowers: { A: false, B: false, C: false },
    };
  }
  private newMinigame() {
    return {
      score: 0,
      hoops: new Set<string>(),
      centered: 0,
      pads: new Set<string>(),
      finished: false,
      complete: false,
      medal: "none" as "none" | "bronze" | "silver" | "gold",
    };
  }

  get checkpointActive() {
    return this.activeCheckpointIndex >= 0;
  }

  /** A pad activated by landing stays latched until the player steps away. */
  isActuatorLatched(id: string): boolean {
    return this.landedActuators.has(id);
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
    this.puzzleState = this.newPuzzleState();
    this.secretCompleted = false;
    this.portalReady = this.requestedPortal = null;
    this.minigame = this.newMinigame();
    this.countdown = this.level.kind === "minigame" ? 3 : 0;
    this.portalTicks = 0;
    this.hiveTicks = 0;
    this.airborneMin = Infinity;
    this.takeoffActuators.clear();
    this.landedActuators.clear();
    this.padTicks.clear();
    this.portalBlocked = false;
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
    this.finalBossStarted = false;
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
        rewardUsed: false,
        awakened: tile.kind !== "flower" && tile.kind !== "curled",
        crumbleRemaining: -1,
        respawnRemaining: 0,
      };
    });
    for (const gate of this.level.gates ?? [])
      this.platforms.push({
        ...gate,
        kind: "ground",
        baseX: gate.x,
        baseY: gate.y,
        previousX: gate.x,
        previousY: gate.y,
        broken: false,
        rewardUsed: false,
        awakened: true,
        crumbleRemaining: -1,
        respawnRemaining: 0,
      });
    const reed = this.platforms.find(
      (tile) => tile.id === "windmill.reed-screen",
    );
    if (reed) reed.broken = true;
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
    if (this.level.kind === "minigame") this.equipFeather();
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
    this.takeoffActuators.clear();
    this.landedActuators.clear();
    this.jumpCanShorten = false;
    this.hurtLock = 0;
    this.blockedCarriers.clear();
    this.hasWindFeather = false;
    this.liftTicks = 0;
    this.liftRemaining = 0;
    this.glideArmed = false;
    this.stableTicks = 0;
    this.clearInput();
    this.flightNeedsRelease = false;
  }

  clearInput() {
    this.pendingEdges = [];
    this.jumpBuffer = 0;
    this.liftActive = false;
    this.flightNeedsRelease = true;
    this.jumpHeld = false;
    this.inputHeld = false;
  }

  transferPlayerFrom(source: Game, anchor: { x: number; feetY: number }) {
    this.resize(source.player.form);
    this.outfit = source.outfit;
    this.character = source.character;
    this.groveDecorations = [...source.groveDecorations];
    this.rescuedTotal = source.rescuedTotal;
    this.rescuedCreatures = [...source.rescuedCreatures];
    Object.assign(this.player, {
      x: anchor.x,
      y: anchor.feetY - this.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
      invulnerable: 1.5,
    });
    this.lives = source.lives;
    if (source.deaths > this.deaths) this.resetRetryRewards();
    this.deaths = source.deaths;
    this.elapsed = source.elapsed;
    this.collectedCoins = source.collectedCoins;
    this.coinsTowardLife = source.coinsTowardLife;
    this.collectedStars = source.collectedStars;
    this.reserveDiamond = source.reserveDiamond;
    this.starPowerRemaining = source.starPowerRemaining;
    this.hasWindFeather = source.hasWindFeather;
    this.liftTicks = source.liftTicks;
    this.liftRemaining = this.liftTicks * STEP;
    this.stableTicks = 0;
    this.glideArmed = false;
    this.clearInput();
    this.portalBlocked = true;
  }

  private equipFeather() {
    this.hasWindFeather = true;
    this.liftTicks = 144;
    this.liftRemaining = 1.2;
    this.events.push("feather");
  }

  update(dt: number, input: GameInput) {
    this.events = [];
    if (
      this.state !== "playing" ||
      this.minigame.finished ||
      !Number.isFinite(dt) ||
      dt <= 0
    )
      return;
    this.accumulator += Math.min(dt, 0.1);
    if (input.jumpEdges) {
      this.pendingEdges.push(...input.jumpEdges);
    } else {
      if (input.jump !== this.inputHeld) this.pendingEdges.push(input.jump);
      else if (input.jumpPressed) this.pendingEdges.push(true);
    }
    this.inputHeld = input.jump;
    while (
      this.accumulator + 1e-10 >= STEP &&
      this.state === "playing" &&
      !this.minigame.finished
    ) {
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
    const previousCenterX = p.x + p.w / 2,
      previousCenterY = p.y + p.h / 2;
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - STEP);
      if (this.countdown < 1e-8) {
        this.countdown = 0;
        this.clearInput();
      }
      return;
    }
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
    this.rearmActuators();
    this.coyote = p.grounded ? COYOTE_TIME : Math.max(0, this.coyote - STEP);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - STEP);
    const direction = Number(input.right) - Number(input.left);
    const water = (this.level.waterZones ?? []).filter((zone) =>
      overlaps(p, zone),
    );
    const swimming = water.length > 0;
    if (this.hurtLock === 0) {
      let acceleration = p.grounded ? 3200 : 2600;
      if (direction === 0) acceleration = p.grounded ? 4200 : 1800;
      else if (p.vx * direction < 0) acceleration = p.grounded ? 4800 : 3600;
      p.vx = approach(
        p.vx,
        direction * (swimming ? 190 : MAX_SPEED),
        acceleration * STEP,
      );
      if (direction) p.facing = direction;
    }
    for (const edge of this.pendingEdges.splice(0)) {
      this.jumpHeld = edge;
      if (!edge) {
        this.liftActive = false;
        this.flightNeedsRelease = false;
      } else {
        if (this.portalReady && p.grounded && Math.abs(p.vx) <= 20) {
          this.requestedPortal = this.portalReady;
          this.portalReady = null;
          this.portalTicks = 0;
          this.portalBlocked = true;
          this.jumpBuffer = 0;
          this.events.push("portal");
          continue;
        }
        if (swimming) {
          if (p.grounded) this.activateOnTakeoff(input);
          this.jumpBuffer = 0;
          continue;
        }
        this.jumpBuffer = JUMP_BUFFER_TIME;
        if (p.grounded || this.coyote > 0)
          this.tryJump({ ...input, jump: input.jump });
        else if (
          input.jump &&
          this.hasWindFeather &&
          this.liftTicks > 0 &&
          !this.flightNeedsRelease &&
          this.hurtLock === 0
        ) {
          this.jumpBuffer = 0;
          this.glideArmed = true;
          this.liftActive = true;
          this.jumpCanShorten = false;
        }
      }
    }
    if (!input.jump && !this.jumpHeld) this.flightNeedsRelease = false;
    if (!swimming) this.tryJump(input);
    if (this.jumpCanShorten && !input.jump) {
      p.vy = Math.max(p.vy, SHORT_JUMP);
      this.jumpCanShorten = false;
    }
    if (p.vy >= 0) this.jumpCanShorten = false;
    if (swimming) {
      // Holding jump is a swim stroke. Releasing it lets Pip sink gently,
      // including onto puzzle handles. Bubbles add an upward current.
      this.liftActive = false;
      this.glideArmed = false;
      this.jumpCanShorten = false;
      const current =
        this.level.contentId === "secret.moonpool"
          ? this.puzzleState.water === "LOW"
            ? 0
            : water.reduce((total, zone) => {
                const flow = zone.currentY ?? 0;
                if (!flow) return total;
                // The selector sends the bubbles up on one side and down on
                // the other, so its effect can be read and used immediately.
                const reversed =
                  this.puzzleState.shutter === "BRIDGE"
                    ? zone.x < 1200
                    : zone.x >= 1200;
                return total + (reversed ? -flow : flow);
              }, 0)
          : Math.min(0, ...water.map((zone) => zone.currentY ?? 0));
      const target = (input.jump && this.hurtLock === 0 ? -160 : 115) + current;
      p.vy = approach(p.vy, target, 440 * STEP);
    } else if (
      this.liftActive &&
      input.jump &&
      this.liftTicks > 0 &&
      this.hurtLock === 0
    ) {
      if (p.vy < -170) p.vy = Math.min(-170, p.vy + GRAVITY * STEP);
      else p.vy = approach(Math.min(p.vy, 180), -170, 1200 * STEP);
      this.liftTicks--;
      this.liftRemaining = this.liftTicks * STEP;
      if (!this.liftTicks) {
        this.liftActive = false;
        this.flightNeedsRelease = true;
        this.events.push("feather-empty");
      }
    } else {
      p.vy = Math.min(900, p.vy + (p.vy < 0 ? GRAVITY : FALL_GRAVITY) * STEP);
      if (this.glideArmed && this.hurtLock === 0) p.vy = Math.min(p.vy, 180);
    }

    p.x += p.vx * STEP;
    this.resolveHorizontal(p.vx);
    p.x = Math.max(0, Math.min(this.level.width - p.w, p.x));
    if (this.boss && this.boss.state !== "defeated") {
      if (this.boss.kind === "millkeeper") {
        if (this.boss.state !== "dormant")
          p.x = Math.max(this.boss.minX, Math.min(this.boss.maxX - p.w, p.x));
      } else p.x = Math.min(p.x, this.boss.maxX + this.boss.w + 26 - p.w);
    }
    const oldBottom = p.y + p.h;
    if (!p.grounded) this.airborneMin = Math.min(this.airborneMin, oldBottom);
    const oldTop = p.y;
    p.y += p.vy * STEP;
    p.grounded = false;
    let rechargeSupport = false;
    for (const tile of this.platforms) {
      if (!active(tile) || this.blockedCarriers.has(tile) || !overlaps(p, tile))
        continue;
      const previousTop =
        tile.kind === "moving" ? Math.max(tile.previousY, tile.y) : tile.y;
      if (p.vy >= 0 && oldBottom <= previousTop + 1) {
        if (!p.grounded && this.airborneMin <= tile.y - 1)
          this.activateActuators(
            tile.y,
            this.landedActuators,
            this.takeoffActuators,
          );
        p.y = tile.y - p.h;
        p.vy = 0;
        p.grounded = true;
        rechargeSupport = tile.kind !== "mushroom" && tile.kind !== "crumble";
        if (tile.kind !== "mushroom") {
          this.liftActive = false;
          this.glideArmed = false;
        }
        this.jumpCanShorten = false;
        if (tile.kind === "mushroom") {
          p.vy = MUSHROOM_BOUNCE;
          p.grounded = false;
          this.coyote = 0;
          this.jumpBuffer = 0;
          this.cancelFlightForBounce();
          this.events.push("bounce");
        } else if (tile.kind === "crumble" && tile.crumbleRemaining < 0) {
          tile.crumbleRemaining = CRUMBLE_WARNING;
          this.events.push("crumble");
        }
      } else if (solid(tile) && p.vy < 0 && oldTop >= tile.y + tile.h - 1) {
        if (tile.rewardPower) {
          p.y = tile.y + tile.h;
          p.vy = 0;
          if (
            !tile.rewardUsed &&
            (tile.rewardPower !== "feather" || !this.hasWindFeather)
          ) {
            tile.rewardUsed = true;
            this.events.push("reward-block");
            if (tile.rewardPower === "diamond") {
              // Drop the diamond below the block. Growth waits until Pip has
              // enough headroom, so the solid block cannot consume the reward.
              this.diamonds.push({
                x: p.x + p.w / 2,
                y: tile.y + tile.h + 16,
                collected: false,
                fromRewardBlock: true,
              });
            } else if (tile.rewardPower === "feather") {
              this.equipFeather();
            } else {
              this.collectedStars++;
              this.starPowerRemaining = STAR_POWER_DURATION;
              this.events.push("star");
            }
          }
        } else if (tile.kind === "brick" && p.form === "big") {
          tile.broken = true;
          this.events.push("break");
          this.awardCoins(tile.rewardCoins ?? 0);
        } else {
          p.y = tile.y + tile.h;
          p.vy = 0;
        }
      }
    }
    if (p.grounded) {
      this.airborneMin = Infinity;
      this.takeoffActuators.clear();
      if (!swimming) this.tryJump(input);
    }
    if (p.grounded && rechargeSupport && this.hasWindFeather) {
      this.stableTicks++;
      if (this.stableTicks === 24 && this.liftTicks < 144) {
        this.liftTicks = 144;
        this.liftRemaining = 1.2;
        this.events.push("feather-refill");
      }
    } else this.stableTicks = 0;
    if (p.y > 660) return this.loseLife();
    this.updateExpansion(previousCenterX, previousCenterY);
    if (this.minigame.finished) return;

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
      if (diamond.collected) continue;
      if (diamond.reserveDrop) this.updateReserveDrop(diamond);
      const touching = overlaps(p, {
        x: diamond.x - 14,
        y: diamond.y - 16,
        w: 28,
        h: 32,
      });
      if (
        diamond.reserveDrop &&
        diamond.reserveDrop.pickupDelay === 0 &&
        (!touching || input.jumpPressed || input.jumpEdges?.includes(true))
      )
        diamond.reserveDrop.needsSeparation = false;
      if (
        (diamond.reserveDrop?.pickupDelay ?? 0) > 0 ||
        diamond.reserveDrop?.needsSeparation ||
        !touching
      )
        continue;
      if (p.form === "small") {
        if (this.grow()) {
          diamond.collected = true;
          this.events.push("grow");
        }
      } else if (!this.reserveDiamond) {
        this.reserveDiamond = true;
        diamond.collected = true;
        this.events.push("diamond-stored");
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
        this.cancelFlightForBounce();
      } else if (this.hurt(enemy)) return true;
    }
    if (this.updateBoss(oldBottom)) return true;
    // Keep the defeated subboss cleared while Pip walks to the next checkpoint.
    // Activate the finale only on its approach, leaving room to recover first.
    if (
      this.level.finalBoss &&
      !this.finalBossStarted &&
      this.boss?.state === "defeated" &&
      p.x + p.w >= this.level.finalBoss.minX - 200
    ) {
      this.finalBossStarted = true;
      this.boss = createBoss(this.level.finalBoss);
      this.hazards = [];
    }
    if (
      this.level.kind !== "grove" &&
      this.level.kind !== "secret" &&
      this.level.kind !== "minigame" &&
      (!this.level.finalBoss || this.finalBossStarted) &&
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

  private activateActuators(
    y: number,
    activated?: Set<string>,
    suppressed?: Set<string>,
  ) {
    const p = this.player;
    const q = this.puzzleState;
    for (const m of this.level.mechanisms ?? []) {
      const halfWidth = (m.w ?? 64) / 2;
      if (
        p.x >= m.x + halfWidth ||
        p.x + p.w <= m.x - halfWidth ||
        Math.abs(y - m.y) > 2 ||
        suppressed?.has(m.id)
      )
        continue;
      let feedback = "mechanism";
      switch (m.kind) {
        case "wind":
          q.wind = q.wind === "WEST" ? "EAST" : "WEST";
          break;
        case "brake":
          q.brake = q.brake === "HELD" ? "RELEASED" : "HELD";
          break;
        case "water":
          q.water = q.water === "LOW" ? "HIGH" : "LOW";
          break;
        case "shutter":
          q.shutter = q.shutter === "HIVE" ? "BRIDGE" : "HIVE";
          break;
        case "sluice":
          if (q.sluiceGateOpen) continue;
          if (q.water === "HIGH") {
            q.sluiceGateOpen = true;
            feedback = "mechanism-gate-open";
          } else feedback = "mechanism-needs-water";
          break;
        case "receiver":
          if (q.lightGateOpen) continue;
          if (q.water === "HIGH" && q.shutter === "BRIDGE") {
            q.lightGateOpen = true;
            feedback = "mechanism-gate-open";
          } else
            feedback =
              q.water === "HIGH"
                ? "mechanism-needs-light"
                : "mechanism-needs-water";
          break;
        case "flower":
          if (!m.flower || q.flowers[m.flower]) continue;
          q.flowers[m.flower] = true;
          break;
      }
      // Mark immediately so overlapping support tiles cannot trigger twice.
      // Completed flowers and gates are one-way: there is no state to toggle
      // back, so they must not show the instruction to rearm the pad.
      if (m.kind !== "flower" && feedback !== "mechanism-gate-open")
        activated?.add(m.id);
      suppressed?.add(m.id);
      this.events.push(feedback);
    }
    if (q.wind === "EAST" && q.brake === "RELEASED") q.vaneGateOpen = true;
  }

  private rearmActuators() {
    const p = this.player;
    for (const id of this.landedActuators) {
      const m = this.level.mechanisms?.find((candidate) => candidate.id === id);
      const halfWidth = (m?.w ?? 64) / 2;
      if (
        !m ||
        Math.abs(p.y + p.h - m.y) > 2 ||
        p.x >= m.x + halfWidth ||
        p.x + p.w <= m.x - halfWidth
      )
        this.landedActuators.delete(id);
    }
  }

  private activateOnTakeoff(input: GameInput) {
    // Preserve landing activations while the player jumps away, including a
    // vertical jump followed by steering. Walking off the pad rearms it.
    if (
      this.landedActuators.size &&
      !input.left &&
      !input.right &&
      Math.abs(this.player.vx) < 30
    )
      this.events.push("mechanism-rearm");
    for (const id of this.landedActuators) this.takeoffActuators.add(id);
    this.landedActuators.clear();
    if (!input.left && !input.right && Math.abs(this.player.vx) < 30)
      this.activateActuators(
        this.player.y + this.player.h,
        this.takeoffActuators,
        this.takeoffActuators,
      );
  }

  private updateExpansion(previousX: number, previousY: number) {
    const p = this.player,
      q = this.puzzleState;
    const cx = p.x + p.w / 2,
      cy = p.y + p.h / 2;
    for (const fountain of this.level.featherFountains ?? []) {
      if (
        !this.hasWindFeather &&
        p.grounded &&
        Math.abs(cx - fountain.x) < 35 &&
        Math.abs(p.y + p.h - fountain.y) < 3
      )
        this.equipFeather();
    }
    if (
      q.wind === "WEST" &&
      q.water === "LOW" &&
      q.shutter === "HIVE" &&
      this.level.contentId === "world.windmill-garden" &&
      cx >= 6720 &&
      cx < 7680
    ) {
      if (++this.hiveTicks >= 120 && !q.hiveDiscovered) {
        q.hiveDiscovered = true;
        this.events.push("hive-discovered");
      }
    } else this.hiveTicks = 0;
    const target = this.level.flightTarget;
    if (
      target &&
      this.glideArmed &&
      Math.hypot(cx - target.x, cy - target.y) <= Math.min(20, target.radius)
    )
      q.workshopGateOpen = true;
    for (const gate of this.level.gates ?? []) {
      const tile = this.platforms.find((t) => t.id === gate.id);
      if (!tile) continue;
      tile.broken =
        gate.condition === "vane"
          ? q.vaneGateOpen
          : gate.condition === "sluice"
            ? q.sluiceGateOpen
            : gate.condition === "light"
              ? q.lightGateOpen
              : gate.condition === "workshop"
                ? q.workshopGateOpen
                : q.flowers.A && q.flowers.B && q.flowers.C;
    }
    const reed = this.platforms.find((t) => t.id === "windmill.reed-screen");
    if (reed)
      reed.broken = q.water === "LOW" || (reed.broken && overlaps(p, reed));
    const portals = this.level.portals ?? [];
    const near = portals.find(
      (portal) =>
        p.grounded &&
        cx >= portal.x &&
        cx <= portal.x + portal.w &&
        Math.abs(p.y + p.h - portal.y) < 3 &&
        (!portal.requires ||
          (portal.requires === "discovery"
            ? q.hiveDiscovered
            : this.secretCompleted)),
    );
    if (!near) {
      this.portalBlocked = false;
      this.portalTicks = 0;
      this.portalReady = null;
    } else if (!this.portalBlocked && Math.abs(p.vx) <= 20) {
      this.portalTicks++;
      this.portalReady = this.portalTicks >= 42 ? near.target : null;
    } else {
      this.portalTicks = 0;
      this.portalReady = null;
    }
    if (
      this.level.kind === "secret" &&
      !this.secretCompleted &&
      overlaps(p, {
        x: this.level.goal.x,
        y: this.level.goal.y - 95,
        w: 60,
        h: 95,
      })
    ) {
      this.secretCompleted = true;
      this.events.push("secret-complete");
    }
    if (this.level.kind !== "minigame") return;
    for (const hoop of this.level.hoops ?? []) {
      if (
        this.minigame.hoops.has(hoop.id) ||
        (previousX - hoop.x) * (cx - hoop.x) > 0 ||
        previousX === cx
      )
        continue;
      const y =
        previousY +
        ((cy - previousY) * (hoop.x - previousX)) / (cx - previousX);
      if (Math.abs(y - hoop.y) <= 32) {
        this.minigame.hoops.add(hoop.id);
        this.minigame.score += 100;
        if (Math.abs(y - hoop.y) <= 12) {
          this.minigame.centered++;
          this.minigame.score += 25;
        }
        this.events.push("hoop");
      }
    }
    for (const pad of this.level.landingPads ?? []) {
      const count = (this.level.hoops ?? []).filter(
        (h) => h.cell === pad.cell && this.minigame.hoops.has(h.id),
      ).length;
      const settled =
        p.grounded &&
        Math.abs(p.y + p.h - pad.y) < 2 &&
        cx >= pad.x &&
        cx <= pad.x + pad.w &&
        count === 2;
      const ticks = settled ? (this.padTicks.get(pad.id) ?? 0) + 1 : 0;
      this.padTicks.set(pad.id, ticks);
      if (ticks >= 24 && !this.minigame.pads.has(pad.id)) {
        this.minigame.pads.add(pad.id);
        this.minigame.score += 50;
        this.events.push("soft-landing");
      }
    }
    if (cx >= this.level.goal.x && this.elapsed <= 60 + 1e-8)
      this.finishMinigame(true);
    else if (this.elapsed >= 60 - 1e-8) this.finishMinigame(false);
  }

  private finishMinigame(complete: boolean) {
    const m = this.minigame;
    if (!complete) this.elapsed = Math.min(this.elapsed, 60);
    m.finished = true;
    m.complete = complete;
    if (complete)
      m.score += Math.max(
        0,
        Math.min(200, Math.floor((60 - this.elapsed) * 10)),
      );
    m.medal =
      m.score >= 2300 && m.hoops.size === 16 && complete && this.elapsed <= 45
        ? "gold"
        : m.score >= 1750 && complete
          ? "silver"
          : m.score >= 800
            ? "bronze"
            : "none";
    this.player.vx = this.player.vy = 0;
    this.events.push("minigame-result");
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
    if (this.reserveDiamond) this.releaseReserveDiamond(source);
    p.invulnerable = 1.5;
    this.events.push("shrink");
    p.vx = p.x + p.w / 2 < source.x + source.w / 2 ? -300 : 300;
    p.vy = -290;
    p.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCanShorten = false;
    this.clearInput();
    this.hurtLock = 0.22;
    return false;
  }

  private updateBoss(oldBottom: number) {
    const boss = this.boss;
    if (!boss) return false;
    const p = this.player;
    const previousY = boss.y;
    stepBoss(boss, STEP, p, this.hazards, this.events, {
      hasFeather: this.hasWindFeather,
      flightActivated: this.glideArmed,
    });
    if (
      boss.state !== "dormant" &&
      boss.state !== "defeated" &&
      boss.millState !== "transition" &&
      overlaps(p, boss)
    ) {
      const stomp = p.vy > 0 && oldBottom <= previousY + 12;
      const powered = this.starPowerRemaining > 0;
      if ((stomp && boss.state === "recover") || powered) {
        hitBoss(boss, p, this.hazards, this.events);
        if (stomp || !powered) this.bounceOffBoss(boss);
      } else if (stomp) this.bounceOffBoss(boss);
      else if (this.hurt(boss)) return true;
    }
    for (const hazard of this.hazards) {
      hazard.remaining = Math.max(0, hazard.remaining - STEP);
      hazard.x += hazard.vx * STEP;
      hazard.y += hazard.vy * STEP;
      if (
        hazard.remaining <= 0 ||
        (hazard.kind === "sweep"
          ? hazard.x + hazard.w <= boss.minX || hazard.x >= boss.maxX
          : hazard.x < boss.minX - 30 || hazard.x > boss.maxX + boss.w + 30)
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
    return false;
  }

  private cancelFlightForBounce() {
    this.liftActive = false;
    this.flightNeedsRelease = true;
  }

  private bounceOffBoss(boss: BossState) {
    this.cancelFlightForBounce();
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
      if (tile.id === "cloud.wind.bridge") {
        tile.x = approach(
          tile.x,
          tile.baseX + (this.puzzleState.wind === "EAST" ? 240 : 0),
          140 * STEP,
        );
      } else if (tile.id === "windmill.lily") {
        tile.y = approach(
          tile.y,
          this.puzzleState.water === "HIGH" ? 330 : 450,
          150 * STEP,
        );
      } else if (tile.motion) {
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
    if (this.player.grounded) this.activateOnTakeoff(input);
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

  /** Release the reserve near a reachable landing, never directly into Pip. */
  private releaseReserveDiamond(source: Rect) {
    const p = this.player;
    this.reserveDiamond = false;
    const center = p.x + p.w / 2;
    // Put the pickup opposite the damage knockback, so Pip must go back for it.
    const direction = center < source.x + source.w / 2 ? 1 : -1;
    const ideal = center + direction * 90;
    // Keep the reward on Pip's side of any wall or closed gate. A full-height
    // gate must never strand it in a place Pip cannot reach.
    let left = 0,
      right = this.level.width;
    for (const wall of this.platforms) {
      if (
        !active(wall) ||
        !solid(wall) ||
        wall.y >= p.y + p.h ||
        wall.y + wall.h <= p.y
      )
        continue;
      if (wall.x >= center) right = Math.min(right, wall.x);
      else if (wall.x + wall.w <= center)
        left = Math.max(left, wall.x + wall.w);
    }
    // Boss arenas can clamp Pip without a visible terrain wall.
    if (this.boss && this.boss.state !== "defeated") {
      if (this.boss.kind === "millkeeper") {
        if (this.boss.state !== "dormant") {
          left = Math.max(left, this.boss.minX);
          right = Math.min(right, this.boss.maxX);
        }
      } else {
        right = Math.min(right, this.boss.maxX + this.boss.w + 26);
      }
    }
    const minimum = left + 14,
      maximum = right - 14;
    const desired = Math.max(minimum, Math.min(maximum, ideal));
    let x = center;
    let distance = Infinity;
    for (const tile of this.platforms) {
      if (
        !active(tile) ||
        tile.w < 28 ||
        tile.y < p.y + p.h - 12 ||
        tile.y > 650
      )
        continue;
      const start = Math.max(tile.x + 14, minimum);
      const end = Math.min(tile.x + tile.w - 14, maximum);
      if (start > end) continue;
      const candidate = Math.max(start, Math.min(end, desired));
      // Prefer the surface Pip is on over a lower floor across a gap.
      const d =
        Math.abs(candidate - desired) + Math.max(0, tile.y - (p.y + p.h)) * 2;
      if (d < distance && Math.abs(candidate - (p.x + p.w / 2)) <= 200) {
        distance = d;
        x = candidate;
      }
    }
    this.diamonds.push({
      x,
      // Release beside Pip, below any overhead ceiling. It then drops to
      // the nearby support instead of getting stranded on the roof.
      y: p.y + 6,
      collected: false,
      reserveDrop: { vy: 0, pickupDelay: 0.8, needsSeparation: true },
    });
    this.events.push("diamond-released");
  }

  private updateReserveDrop(diamond: Collectible) {
    const drop = diamond.reserveDrop!;
    drop.pickupDelay = Math.max(0, drop.pickupDelay - STEP);
    // A gem resting on a moving leaf or cloud rides along with it.
    const carrier = this.platforms.find(
      (tile) =>
        active(tile) &&
        Math.abs(diamond.y + 16 - tile.previousY) < 1 &&
        diamond.x + 14 > tile.previousX &&
        diamond.x - 14 < tile.previousX + tile.w &&
        (tile.x !== tile.previousX || tile.y !== tile.previousY),
    );
    if (carrier) {
      const carried = {
        x: diamond.x - 14 + carrier.x - carrier.previousX,
        y: diamond.y - 16 + carrier.y - carrier.previousY,
        w: 28,
        h: 32,
      };
      if (
        !this.platforms.some(
          (tile) =>
            tile !== carrier &&
            active(tile) &&
            solid(tile) &&
            overlaps(carried, tile),
        )
      ) {
        diamond.x = carried.x + 14;
        diamond.y = carried.y + 16;
      }
    }
    const oldBottom = diamond.y + 16;
    drop.vy = Math.min(500, drop.vy + 900 * STEP);
    let bottom = oldBottom + drop.vy * STEP;
    for (const tile of this.platforms) {
      if (
        !active(tile) ||
        diamond.x + 14 <= tile.x ||
        diamond.x - 14 >= tile.x + tile.w
      )
        continue;
      if (oldBottom <= tile.y && bottom >= tile.y)
        bottom = Math.min(bottom, tile.y);
    }
    if (bottom < oldBottom + drop.vy * STEP) drop.vy = 0;
    diamond.y = bottom - 16;
  }

  private loseLife() {
    if (this.level.kind === "grove") {
      // The grove returns Pip safely instead of charging a life. Reset
      // recoverable blocks as well, since spawn removes the feather.
      this.resetRetryRewards();
      this.spawn();
      this.events.push("grove-return");
      return true;
    }
    if (this.mode !== "relaxed") this.lives--;
    this.deaths++;
    this.starPowerRemaining = 0;
    this.events.push("life-lost");
    this.hazards = [];
    const retrySpec = this.finalBossStarted
      ? this.level.finalBoss
      : this.level.boss;
    if (this.boss && this.boss.state !== "defeated" && retrySpec)
      this.boss = retryBoss(retrySpec, this.boss, this.mode === "relaxed");
    this.resetRetryRewards();
    // Clouds must be available on retry. Broken coin caches stay broken so rewards
    // cannot be farmed, just as ordinary collected coins stay collected after death.
    for (const platform of this.platforms) {
      if (platform.id === "windmill.lily")
        platform.y = this.puzzleState.water === "HIGH" ? 330 : 450;
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

  private resetRetryRewards() {
    this.reserveDiamond = false;
    this.diamonds = this.diamonds.filter(
      (diamond) => !diamond.fromRewardBlock && !diamond.reserveDrop,
    );
    for (const diamond of this.diamonds) diamond.collected = false;
    for (const tile of this.platforms)
      if (tile.rewardPower === "diamond" || tile.rewardPower === "feather")
        tile.rewardUsed = false;
  }
}
