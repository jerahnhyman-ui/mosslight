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
import { acornSpots } from "./acorns";
/** Outfits Pip can wear; matches the save file's outfit ids. */
export type OutfitId =
  | "leaf"
  | "berry"
  | "moon"
  | "cosmetic.bee_scarf"
  | "cosmetic.acorn_cap"
  | "cosmetic.golden_leaf";
export type { BossState, BossHazard } from "./bosses";
export type RunMode = "classic" | "relaxed" | "timed";

export type GameInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpEdges?: boolean[];
  /** The action button (Gulp's tongue) was pressed this frame. */
  action?: boolean;
  /** Down was pressed this frame (ground pound in the air). */
  downPressed?: boolean;
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
  /** A boat that has started cruising. */
  cruising?: boolean;
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
  /** Horizontal speed of a hopper's current leap. */
  airSpeed?: number;
};

/** Gulp, the rideable tree frog. Riding it, Pip jumps a little higher and
 * Gulp snaps up bugs ahead with its tongue. A hit knocks Pip off instead of
 * hurting them, and Gulp hops away to wait where it lands. */
export type Mount = {
  x: number;
  /** Ground surface under the frog. */
  y: number;
  homeX: number;
  homeY: number;
  state: "waiting" | "ridden" | "fleeing";
  vx: number;
  timer: number;
  facing: number;
};
export const MOUNT_SIZE = { w: 52, h: 26 };
/** How far ahead Gulp's tongue reaches for a bug. */
export const TONGUE_REACH = 130;
const MOUNT_JUMP_BOOST = 1.12;

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
/** Speed multiplier while star power lasts. */
export const STAR_SPEED_BOOST = 1.4;
const COYOTE_TIME = 0.12;
/** Upward kick from one swim stroke, and the fastest a stroke can push. */
const SWIM_STROKE = -230;
const SWIM_STROKE_MAX = -260;
/** Ground pound: a short hang in the air, then a fast drop. */
const POUND_HANG = 0.12;
const POUND_SPEED = 950;
/** Wall jump: how long a wall counts after touching it, and the push. */
const WALL_GRACE = 0.06;
const WALL_SLIDE = 120;
const WALL_KICK = 300;
/** Gulp's flutter: how long Pip can hang in the air per jump. */
export const FLUTTER_TIME = 0.75;
/** How far a bug on Pip's floor notices and reacts to Pip. */
const ENEMY_SIGHT = 220;
/** Walking pace or slower lets Pip use a portal; a full run passes through. */
const PORTAL_MAX_SPEED = 90;
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
  mounts: Mount[] = [];
  /** A ghost of a previous best run to race (drawn only; never collides). */
  ghost: { step: number; time: number; xs: number[]; ys: number[] } | null =
    null;
  /** Icicles in this run. */
  icicles: {
    x: number;
    y: number;
    baseY: number;
    vy: number;
    state: "hang" | "shake" | "fall" | "gone";
    t: number;
  }[] = [];
  /** Whether Pip is standing on ice this step. */
  onIce = false;
  /** The chasing flood's front edge, and seconds since it was set. */
  chaseX = -Infinity;
  private chaseClock = 0;
  /** Lanterns in a night level, and whether each has been lit. */
  lanterns: { x: number; y: number; lit: boolean }[] = [];
  /** Hidden acorns in this run (sitting on top of high coins). */
  acorns: { x: number; y: number; collected: boolean }[] = [];
  /** Stomps in the current chain without touching the ground. */
  combo = 0;
  /** Where the last combo bonus was earned, and how big it was. */
  lastCombo: { x: number; y: number; count: number } | null = null;
  /** True while Pip is in water, and the fading timer of the last stroke. */
  swimming = false;
  swimStroke = 0;
  /** Ground pound state: hanging before the drop, or dropping. */
  pound: "none" | "hang" | "drop" = "none";
  private poundTimer = 0;
  /** Which side a wall touched Pip on (−1 left, 1 right) and for how long. */
  wallSide = 0;
  private wallTime = 0;
  private wallLock = 0;
  /** Seconds of Gulp's flutter used in this jump; and whether it is active. */
  flutterUsed = 0;
  fluttering = false;
  riding: Mount | null = null;
  /** Seconds left on the tongue animation, and where it is reaching. */
  tongue = 0;
  tongueTarget: { x: number; y: number } | null = null;
  private tongueCooldown = 0;
  /** A fourth-world finale is a separate encounter after the level guardian. */
  finalBossStarted = false;
  hazards: BossHazard[] = [];
  outfit: OutfitId = "leaf";
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
    this.acorns = acornSpots(this.level).map((a) => ({
      ...a,
      collected: false,
    }));
    this.combo = 0;
    this.icicles = (this.level.icicles ?? []).map((i) => ({
      x: i.x,
      y: i.y,
      baseY: i.y,
      vy: 0,
      state: "hang" as const,
      t: 0,
    }));
    this.lanterns = (this.level.lanterns ?? []).map((l) => ({
      x: l.x,
      y: l.y,
      lit: !!l.lit,
    }));
    this.stars = this.level.stars.map((c) => ({ ...c, collected: false }));
    this.fireflies = this.level.fireflies.map((c) => ({
      ...c,
      collected: false,
    }));
    this.diamonds = this.level.diamonds.map((c) => ({
      ...c,
      collected: false,
    }));
    this.resetMounts();
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
    // The flood restarts a fair distance behind wherever Pip begins.
    const chase = this.level.chase;
    this.chaseX = chase ? point.x - chase.lead : -Infinity;
    this.chaseClock = 0;
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
    this.swimming = swimming;
    this.swimStroke = Math.max(0, this.swimStroke - STEP);
    if (p.grounded) this.flutterUsed = 0;
    this.fluttering = false;
    if (this.hurtLock === 0) {
      let acceleration = p.grounded ? 3200 : 2600;
      if (direction === 0) acceleration = p.grounded ? 4200 : 1800;
      else if (p.vx * direction < 0) acceleration = p.grounded ? 4800 : 3600;
      // In water Pip builds speed with each kick and glides to a stop.
      if (swimming && !p.grounded) acceleration = direction ? 700 : 260;
      // Ice: slow to get going and slow to stop.
      if (p.grounded && this.onIce) acceleration = direction ? 900 : 160;
      // Just after a wall kick, the push carries Pip away from the wall.
      if (this.wallLock > 0) acceleration = 0;
      // Star power makes Pip noticeably faster as well as invincible.
      const starred = this.starPowerRemaining > 0;
      if (starred && direction) acceleration *= STAR_SPEED_BOOST;
      p.vx = approach(
        p.vx,
        direction *
          (swimming ? 190 : MAX_SPEED) *
          (starred ? STAR_SPEED_BOOST : 1),
        acceleration * STEP,
      );
      if (direction && this.wallLock === 0) p.facing = direction;
      if (this.pound !== "none") p.vx = 0;
    }
    this.wallLock = Math.max(0, this.wallLock - STEP);
    this.wallTime = Math.max(0, this.wallTime - STEP);
    // Ground pound: press Down in the air.
    if (
      input.downPressed &&
      !p.grounded &&
      !swimming &&
      this.pound === "none" &&
      this.hurtLock === 0
    ) {
      this.pound = "hang";
      this.poundTimer = POUND_HANG;
      this.liftActive = false;
      this.glideArmed = false;
      this.jumpCanShorten = false;
      this.events.push("pound-start");
    }
    for (const edge of this.pendingEdges.splice(0)) {
      this.jumpHeld = edge;
      if (!edge) {
        this.liftActive = false;
        this.flightNeedsRelease = false;
      } else {
        if (
          this.portalReady &&
          p.grounded &&
          Math.abs(p.vx) <= PORTAL_MAX_SPEED
        ) {
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
          if (this.hurtLock === 0) {
            // Each press is one swim stroke: a kick upward that fades.
            p.vy = Math.max(SWIM_STROKE_MAX, Math.min(p.vy, 60) + SWIM_STROKE);
            p.grounded = false;
            this.swimStroke = 0.32;
            this.events.push("swim-stroke");
          }
          continue;
        }
        if (
          !p.grounded &&
          this.coyote <= 0 &&
          this.wallTime > 0 &&
          this.pound === "none" &&
          this.hurtLock === 0
        ) {
          // Wall jump: kick off the wall Pip is touching.
          p.vy = JUMP * 0.95;
          p.vx = -this.wallSide * WALL_KICK;
          p.facing = -this.wallSide;
          this.wallLock = 0.16;
          this.wallTime = 0;
          this.jumpBuffer = 0;
          this.jumpCanShorten = true;
          this.events.push("wall-jump");
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
    if (this.pound !== "none" && swimming) this.pound = "none";
    if (this.pound !== "none") {
      if (this.pound === "hang") {
        p.vy = 0;
        this.poundTimer -= STEP;
        if (this.poundTimer <= 0) this.pound = "drop";
      } else p.vy = POUND_SPEED;
    } else if (swimming) {
      // Holding jump is a swim stroke. Releasing it lets Pip sink gently.
      // Bubble streams add a natural upward current in every water area.
      this.liftActive = false;
      this.glideArmed = false;
      this.jumpCanShorten = false;
      const current = water.reduce(
        (sum, zone) => sum + (zone.currentY ?? 0),
        0,
      );
      // Between strokes Pip drifts down; holding Jump only slows the sink.
      const target = (input.jump && this.hurtLock === 0 ? 35 : 150) + current;
      p.vy = approach(p.vy, target, 340 * STEP);
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
    } else if (
      this.riding &&
      input.jump &&
      !p.grounded &&
      p.vy > 0 &&
      this.flutterUsed < FLUTTER_TIME &&
      this.hurtLock === 0
    ) {
      // Gulp's flutter: kicking its legs, it slows the fall and lifts a
      // little, stretching a jump across a wider gap.
      if (this.flutterUsed === 0) this.events.push("flutter");
      this.flutterUsed += STEP;
      this.fluttering = true;
      p.vy = approach(p.vy, -70, 2600 * STEP);
    } else {
      p.vy = Math.min(900, p.vy + (p.vy < 0 ? GRAVITY : FALL_GRAVITY) * STEP);
      if (this.glideArmed && this.hurtLock === 0) p.vy = Math.min(p.vy, 180);
    }

    // Sliding down a wall while pushing into it is slower.
    if (
      this.wallTime > 0 &&
      !p.grounded &&
      this.pound === "none" &&
      direction === this.wallSide &&
      p.vy > WALL_SLIDE
    )
      p.vy = WALL_SLIDE;
    // A sideways current carries Pip along while swimming.
    const drift = swimming
      ? water.reduce((sum, zone) => sum + (zone.currentX ?? 0), 0)
      : 0;
    p.x += (p.vx + drift) * STEP;
    this.resolveHorizontal(p.vx + drift);
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
    this.onIce = false;
    let rechargeSupport = false;
    for (const tile of this.platforms) {
      if (!active(tile) || this.blockedCarriers.has(tile) || !overlaps(p, tile))
        continue;
      const previousTop =
        tile.kind === "moving" ? Math.max(tile.previousY, tile.y) : tile.y;
      if (p.vy >= 0 && oldBottom <= previousTop + 1) {
        if (
          this.pound === "drop" &&
          tile.kind === "brick" &&
          !tile.rewardPower
        ) {
          // A ground pound smashes straight through cracked blocks.
          tile.broken = true;
          this.events.push("break");
          this.awardCoins(tile.rewardCoins ?? 0);
          continue;
        }
        if (!p.grounded && this.airborneMin <= tile.y - 1)
          this.activateActuators(
            tile.y,
            this.landedActuators,
            this.takeoffActuators,
          );
        p.y = tile.y - p.h;
        p.vy = 0;
        p.grounded = true;
        this.onIce = !!tile.slippery;
        rechargeSupport = tile.kind !== "mushroom" && tile.kind !== "crumble";
        if (tile.kind !== "mushroom") {
          this.liftActive = false;
          this.glideArmed = false;
        }
        this.jumpCanShorten = false;
        const pounded = this.pound === "drop";
        if (pounded) {
          this.pound = "none";
          if (tile.kind !== "mushroom") {
            this.events.push("pound");
            this.poundShockwave(tile.y);
          }
        }
        if (tile.kind === "mushroom") {
          // A pound onto a mushroom launches Pip much higher.
          p.vy = MUSHROOM_BOUNCE * (pounded ? 1.3 : 1);
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
            tile.rewardPower === "feather" &&
            this.hasWindFeather
          ) {
            // Tell the player why nothing came out, rather than looking broken.
            this.events.push("reward-full");
          } else if (
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
    for (const acorn of this.acorns) {
      if (
        !acorn.collected &&
        overlaps(p, { x: acorn.x - 12, y: acorn.y - 14, w: 24, h: 28 })
      ) {
        acorn.collected = true;
        this.events.push("acorn");
      }
    }
    // The flood rolls in; being caught costs a life.
    const chase = this.level.chase;
    if (chase && this.state === "playing") {
      this.chaseClock += STEP;
      if (this.chaseClock > chase.delay) this.chaseX += chase.speed * STEP;
      if (p.x + p.w * 0.5 < this.chaseX) {
        this.events.push("caught");
        return this.loseLife();
      }
    }
    // Icicles shake when Pip passes beneath, then fall; they regrow later.
    for (const icicle of this.icicles) {
      const under = Math.abs(icicle.x - (p.x + p.w / 2)) < 70 && p.y > icicle.y;
      if (icicle.state === "hang" && under) {
        icicle.state = "shake";
        icicle.t = 0.45;
        this.events.push("icicle-shake");
      } else if (icicle.state === "shake") {
        icicle.t -= STEP;
        if (icicle.t <= 0) icicle.state = "fall";
      } else if (icicle.state === "fall") {
        icicle.vy = Math.min(900, icicle.vy + 1600 * STEP);
        icicle.y += icicle.vy * STEP;
        const box = { x: icicle.x - 8, y: icicle.y, w: 16, h: 36 };
        const landed =
          icicle.y > 660 ||
          this.platforms.some(
            (t) =>
              active(t) &&
              solid(t) &&
              overlaps(box, t) &&
              t.y > icicle.baseY + 10,
          );
        if (overlaps(p, box) && this.hurt(box)) return true;
        if (landed || overlaps(p, box)) {
          icicle.state = "gone";
          icicle.t = 4;
          this.events.push("icicle-break");
        }
      } else if (icicle.state === "gone") {
        icicle.t -= STEP;
        if (icicle.t <= 0 && !under) {
          icicle.state = "hang";
          icicle.y = icicle.baseY;
          icicle.vy = 0;
        }
      }
    }
    // A lantern lights for good as Pip passes it.
    for (const lantern of this.lanterns) {
      if (
        !lantern.lit &&
        Math.abs(lantern.x - (p.x + p.w / 2)) < 90 &&
        Math.abs(lantern.y - (p.y + p.h)) < 140
      ) {
        lantern.lit = true;
        this.events.push("lantern");
      }
    }
    // A stomp chain lasts until Pip touches the ground.
    if (p.grounded) this.combo = 0;
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

    this.updateMounts(input);
    for (const enemy of this.enemies) {
      enemy.squashed = Math.max(0, enemy.squashed - STEP);
      if (!enemy.alive) continue;
      const previousEnemyY = enemy.y;
      this.moveEnemy(enemy);
      if (!overlaps(p, enemy)) continue;
      if (this.starPowerRemaining > 0) {
        this.squash(enemy);
      } else if (enemy.kind === "ember") {
        // Too hot to stomp.
        if (this.hurt(enemy)) return true;
      } else if (p.vy > 0 && oldBottom <= previousEnemyY + 10) {
        this.squash(enemy);
        p.y = enemy.y - p.h;
        p.vy = -440;
        this.pound = "none";
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
    const hive = this.level.portals?.find(
      (portal) => portal.target === "beehive",
    );
    if (
      hive &&
      !q.hiveDiscovered &&
      cx >= hive.x - 154 &&
      cx <= hive.x + hive.w + 10 &&
      Math.abs(p.y + p.h - hive.y) <= 100
    ) {
      q.hiveDiscovered = true;
      this.events.push("hive-discovered");
    }
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
    } else if (!this.portalBlocked && Math.abs(p.vx) <= PORTAL_MAX_SPEED) {
      // A short pause inside the portal is enough. A resting thumb on the
      // touch pad still counts, but running straight through does not.
      this.portalTicks++;
      this.portalReady = this.portalTicks >= 12 ? near.target : null;
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
    if (this.riding) {
      // Gulp takes the hit: Pip tumbles off and Gulp hops away.
      const mount = this.riding;
      this.riding = null;
      const away =
        mount.x + MOUNT_SIZE.w / 2 < source.x + source.w / 2 ? -1 : 1;
      mount.state = "fleeing";
      mount.timer = 0.9;
      mount.vx = away * 160;
      mount.facing = away;
      p.invulnerable = 1.5;
      p.vy = -320;
      p.vx = -away * 120;
      p.grounded = false;
      this.hurtLock = 0.2;
      this.clearInput();
      this.events.push("dismount");
      return false;
    }
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
      // Circling overhead, the owl is out of reach: Pip passes beneath it.
      !(boss.kind === "owl" && boss.state === "warning") &&
      overlaps(p, boss)
    ) {
      const stomp = p.vy > 0 && oldBottom <= previousY + 12;
      const powered = this.starPowerRemaining > 0;
      if ((stomp && boss.state === "recover") || powered) {
        hitBoss(boss, p, this.hazards, this.events);
        if (stomp || !powered) this.bounceOffBoss(boss);
      } else if (stomp) this.bounceOffBoss(boss);
      // A dazed guardian wanders slowly but is harmless until it recovers.
      else if (boss.state !== "recover" && this.hurt(boss)) return true;
    }
    for (const hazard of this.hazards) {
      hazard.remaining = Math.max(0, hazard.remaining - STEP);
      // Fireballs arc under gravity; everything else flies straight.
      if (hazard.kind === "fireball" || hazard.kind === "icicle")
        hazard.vy = Math.min(900, hazard.vy + 900 * STEP);
      hazard.x += hazard.vx * STEP;
      hazard.y += hazard.vy * STEP;
      // Icicles shatter and fireballs splash when they reach the floor.
      if (
        (hazard.kind === "fireball" || hazard.kind === "icicle") &&
        hazard.vy > 0 &&
        hazard.y + hazard.h >= boss.groundY + 4
      ) {
        hazard.remaining = 0;
        this.events.push(
          hazard.kind === "icicle" ? "icicle-break" : "fireball-splash",
        );
      }
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
    this.pound = "none";
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
      if (tile.cruise && (tile.cruising || rider === tile)) {
        // A boat sets off once Pip is aboard and runs to its far dock.
        tile.cruising = true;
        tile.x = Math.min(tile.cruise.until, tile.x + tile.cruise.speed * STEP);
      }
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
      // A tall wall touched in the air can be kicked off.
      if (!p.grounded && vx !== 0 && tile.kind === "ground" && tile.h >= 60) {
        this.wallSide = Math.sign(vx);
        this.wallTime = WALL_GRACE;
      }
    }
  }

  private moveEnemy(enemy: Enemy) {
    enemy.stateTime = Math.max(0, enemy.stateTime - STEP);
    // Bugs notice Pip on their own floor and react, within their patrol.
    const p = this.player;
    const dx = p.x + p.w / 2 - enemy.x - enemy.w / 2;
    const center = p.x + p.w / 2;
    // Only react when Pip is within the bug's own ground, so it never stands
    // pressed against the end of its patrol.
    const onFloor = Math.abs(p.y + p.h - enemy.baseY - enemy.h) < 75;
    const sameFloor =
      onFloor && center > enemy.minX && center < enemy.maxX + enemy.w;
    const toward = dx >= 0 ? 1 : -1;
    if (enemy.kind === "ember") {
      // Leaps out of the lava, arcs, and drops back in; it waits below
      // the surface between leaps.
      if (enemy.grounded && enemy.stateTime === 0) {
        enemy.vy = -660;
        enemy.grounded = false;
      }
      enemy.vx = 0;
      if (!enemy.grounded) {
        enemy.vy += GRAVITY * STEP;
        enemy.y += enemy.vy * STEP;
        if (enemy.vy > 0 && enemy.y >= enemy.baseY + 40) {
          enemy.y = enemy.baseY + 40;
          enemy.vy = 0;
          enemy.grounded = true;
          enemy.stateTime = 1.6;
        }
      }
      return;
    }
    if (enemy.kind === "fish") {
      // A fish weaves up and down along a steady patrol, so its path can be
      // read and timed (or stomped by sinking onto it).
      enemy.stateTime += STEP * 2;
      enemy.vx = enemy.facing * 70;
      enemy.y = enemy.baseY + Math.sin(enemy.stateTime * 1.6) * 22;
    } else if (enemy.kind === "beetle") {
      // A beetle that spots Pip turns and scurries toward them.
      const alert = sameFloor && Math.abs(dx) < ENEMY_SIGHT;
      if (alert) enemy.facing = toward;
      enemy.vx = enemy.facing * (alert ? 95 : 56);
    } else if (enemy.kind === "hopper") {
      if (enemy.grounded && enemy.stateTime === 0) {
        // Near Pip, a hopper leaps at them; otherwise it hops along.
        const lunge = sameFloor && Math.abs(dx) < ENEMY_SIGHT;
        if (lunge) enemy.facing = toward;
        enemy.vy = lunge ? -430 : -360;
        enemy.airSpeed = lunge ? Math.min(150, Math.abs(dx) * 0.9 + 60) : 85;
        enemy.grounded = false;
      }
      enemy.vx = enemy.facing * (enemy.grounded ? 35 : (enemy.airSpeed ?? 85));
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
          // Alert hoppers rest only briefly between leaps.
          enemy.stateTime =
            sameFloor && Math.abs(dx) < ENEMY_SIGHT ? 0.45 : 0.8;
        }
      }
    } else if (enemy.kind === "charger") {
      // Chargers also spot Pip just beyond their patrol and rush the edge.
      if (
        enemy.state === "patrol" &&
        enemy.stateTime === 0 &&
        Math.abs(dx) < 260 &&
        onFloor
      ) {
        enemy.facing = toward;
        enemy.state = "windup";
        enemy.stateTime = 0.5;
        this.events.push("charge");
      } else if (enemy.state === "windup" && enemy.stateTime === 0) {
        enemy.state = "charge";
        enemy.stateTime = 0.8;
      } else if (enemy.state === "charge" && enemy.stateTime === 0) {
        enemy.state = "recover";
        enemy.stateTime = 0.4;
      } else if (enemy.state === "recover" && enemy.stateTime === 0) {
        enemy.state = "patrol";
        enemy.stateTime = 0.5;
        // Turn back toward Pip and stalk before the next charge.
        if (onFloor && Math.abs(dx) < ENEMY_SIGHT + 60) enemy.facing = toward;
      }
      enemy.vx =
        enemy.state === "charge"
          ? enemy.facing * 250
          : enemy.state === "patrol"
            ? enemy.facing * 60
            : enemy.state === "windup"
              ? // It paws backward while winding up, so it is never static.
                -enemy.facing * 28
              : // After a charge it staggers, slowly, before turning back.
                -enemy.facing * 22;
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
      if (enemy.kind === "charger" && enemy.state === "windup") {
        enemy.vx = 0;
      } else if (
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
    if (enemy.vx && !(enemy.kind === "charger" && enemy.state === "windup"))
      enemy.facing = Math.sign(enemy.vx);
  }

  /** A ground pound's landing squashes bugs right beside Pip. */
  private poundShockwave(floorY: number) {
    const p = this.player;
    const cx = p.x + p.w / 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x + e.w / 2 - cx) < 70 && Math.abs(e.y + e.h - floorY) < 8)
        this.squash(e);
    }
  }

  private resetMounts() {
    this.pound = "none";
    this.wallTime = 0;
    this.wallLock = 0;
    this.riding = null;
    this.tongue = 0;
    this.tongueTarget = null;
    this.tongueCooldown = 0;
    this.mounts = (this.level.mounts ?? []).map((m) => ({
      x: m.x,
      y: m.y,
      homeX: m.x,
      homeY: m.y,
      state: "waiting",
      vx: 0,
      timer: 0,
      facing: 1,
    }));
  }

  /** Ground under a point at a given surface height, for a fleeing frog. */
  private groundAt(x: number, y: number) {
    return this.platforms.some(
      (t) =>
        active(t) &&
        (t.kind === "ground" || t.kind === "platform") &&
        Math.abs(t.y - y) < 2 &&
        x >= t.x &&
        x <= t.x + t.w,
    );
  }

  private updateMounts(input: GameInput) {
    const p = this.player;
    this.tongue = Math.max(0, this.tongue - STEP);
    if (this.tongue === 0) this.tongueTarget = null;
    this.tongueCooldown = Math.max(0, this.tongueCooldown - STEP);
    for (const mount of this.mounts) {
      if (mount.state === "fleeing") {
        mount.timer = Math.max(0, mount.timer - STEP);
        const nextX = mount.x + mount.vx * STEP;
        // It hops away along solid ground and never over a gap.
        if (
          this.groundAt(nextX, mount.y) &&
          this.groundAt(nextX + MOUNT_SIZE.w, mount.y)
        )
          mount.x = nextX;
        if (mount.timer === 0) mount.state = "waiting";
      } else if (
        mount.state === "waiting" &&
        !this.riding &&
        p.invulnerable === 0 &&
        overlaps(p, {
          x: mount.x,
          y: mount.y - MOUNT_SIZE.h,
          w: MOUNT_SIZE.w,
          h: MOUNT_SIZE.h,
        })
      ) {
        this.riding = mount;
        mount.state = "ridden";
        this.events.push("mount");
      }
    }
    const ride = this.riding;
    if (!ride) return;
    ride.x = p.x + p.w / 2 - MOUNT_SIZE.w / 2;
    ride.y = p.y + p.h;
    ride.facing = p.facing;
    // The player shoots Gulp's tongue with the action button.
    if (!input.action || this.tongueCooldown > 0) return;
    const cx = p.x + p.w / 2;
    const mouthY = p.y + p.h - 14;
    const prey = this.enemies
      .filter((e) => {
        if (!e.alive) return false;
        const dx = e.x + e.w / 2 - cx;
        return (
          Math.sign(dx) === p.facing &&
          Math.abs(dx) <= TONGUE_REACH &&
          Math.abs(e.y + e.h / 2 - mouthY) < 55
        );
      })
      .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
    this.tongue = 0.22;
    this.tongueCooldown = 0.3;
    if (!prey) {
      // A miss still flicks the tongue out to its full reach.
      this.tongueTarget = { x: cx + p.facing * TONGUE_REACH, y: mouthY };
      this.events.push("tongue");
      return;
    }
    prey.alive = false;
    prey.squashed = ENEMY_SQUASH_DURATION;
    prey.vx = prey.vy = 0;
    this.tongueTarget = { x: prey.x + prey.w / 2, y: prey.y + prey.h / 2 };
    // Each swallowed bug is worth a coin.
    this.awardCoins(1);
    this.events.push("gulp");
  }

  private squash(enemy: Enemy) {
    enemy.alive = false;
    enemy.squashed = ENEMY_SQUASH_DURATION;
    enemy.vx = 0;
    enemy.vy = 0;
    this.events.push("stomp");
    // Chained stomps without landing pay a growing bonus (capped at 5).
    this.combo++;
    if (this.combo >= 2) {
      const bonus = Math.min(5, this.combo - 1);
      this.awardCoins(bonus);
      this.lastCombo = {
        x: enemy.x + enemy.w / 2,
        y: enemy.y,
        count: this.combo,
      };
      this.events.push(`combo-${Math.min(5, this.combo)}`);
    }
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
    this.player.vy =
      (input.jump ? JUMP : SHORT_JUMP) * (this.riding ? MOUNT_JUMP_BOOST : 1);
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
    this.resetMounts();
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
      if (platform.kind === "crumble") {
        platform.crumbleRemaining = -1;
        platform.respawnRemaining = 0;
      }
      // Boats go back to their docks.
      if (platform.cruise) {
        platform.x = platform.previousX = platform.baseX;
        platform.cruising = false;
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
