import type { BossSpec, Rect } from "./levels";

export type BossState = Rect & {
  kind: BossSpec["kind"];
  name: string;
  health: number;
  maxHealth: number;
  phase: number;
  state: "dormant" | "warning" | "attack" | "recover" | "defeated";
  stateTime: number;
  facing: number;
  invulnerable: number;
  groundY: number;
  minX: number;
  maxX: number;
  attackElapsed: number;
  attackOriginX: number;
  attackTargetX: number;
  shotsFired: number;
  millState?: MillState;
  /** Highest entered phase, retained across Relaxed retries. */
  phaseCheckpoint?: number;
  millNextDirection?: number;
  /** Where the guardian starts; the salamander keeps to its island here. */
  homeX: number;
  /** Deterministic randomness: the same fight plays out the same way for
   * the same inputs, but attacks are not a fixed loop. */
  seed: number;
  /** Which attack this guardian chose for its current warning. */
  variant: string;
  /** Eased sideways speed, so starts and stops build up and skid. */
  speed: number;
  /** Seconds a hit (or a phase change) holds the guardian in a flinch. */
  stagger: number;
  /** Seconds of the rearing roar that marks a new phase. */
  fury: number;
  /** Seconds of dust after a skid or slam, for the renderer. */
  skid: number;
  /** How far the guardian likes to keep from Pip while it stalks. */
  stalk: number;
  /** One fake-out per attack at most. */
  feinted: boolean;
  /** A wall-impact shockwave waiting to roll out, and its direction. */
  pendingWave: number;
  pendingWaveDir: number;
};
export type MillState =
  | "settle"
  | "lowWarning"
  | "lowSweep"
  | "highWarning"
  | "highSweep"
  | "betweenSweeps"
  | "recover"
  | "transition";
export type BossHazard = Rect & {
  kind:
    | "web"
    | "gust"
    | "sweep"
    | "bubble"
    | "feather"
    | "icicle"
    | "fireball"
    | "shard"
    /** A harmless glowing mark where lightning will strike. */
    | "mark"
    | "bolt";
  vx: number;
  vy: number;
  remaining: number;
};

/** Gloomwing, the night owl (world 8's major boss): seconds it circles
 * before diving, how long its mark stays locked, and the dive itself. */
export const OWL_HOVER = 2;
export const OWL_LOCK = 0.6;
export const OWL_DIVE = 0.55;
/** Guardians of the snow, ice and fire worlds fight in their own arenas
 * and take five hits over three phases. */
export const arenaKind = (kind: BossSpec["kind"]) =>
  kind === "bear" || kind === "tortoise" || kind === "salamander";
/** Major guardians take six hits over three phases. */
export const majorKind = (kind: BossSpec["kind"]) =>
  kind === "millkeeper" ||
  kind === "heartwood" ||
  kind === "owl" ||
  kind === "ram";
/** Seconds the storm ram rears, while its lightning strikes, before it
 * charges. */
export const RAM_REAR = 0.55;
/** Longest a hermit crab scuttles before stopping to rest. */
export const CRAB_SCUTTLE = 1.4;
/** Seconds the crystal mole spends tunnelling, and how long its mark is
 * locked in place before it bursts up. */
export const MOLE_BURROW = 1.7;
export const MOLE_LOCK = 0.6;
/** Seconds the mole takes to burst out of the ground. */
export const MOLE_EMERGE = 0.3;
/** Seconds the spider spends in the air on a pounce. */
export const SPIDER_POUNCE = 0.9;
/** Seconds the marsh toad spends in the air on each leap. */
export const TOAD_LEAP = 1.05;

/** A small deterministic random number generator (0 ≤ n < 1). */
function rand(boss: BossState) {
  boss.seed = (Math.imul(boss.seed, 1664525) + 1013904223) >>> 0;
  return boss.seed / 4294967296;
}
/** Extra attacks each guardian mixes in from phase two (phase three adds
 * the last one listed for some). Phase one keeps the signature attack, so
 * every fight starts readable. */
const VARIANTS: Partial<Record<BossSpec["kind"], string[][]>> = {
  stag: [["main"], ["main", "stutter"], ["main", "stutter", "double"]],
  spider: [["main"], ["main", "pounce"], ["main", "pounce"]],
  toad: [["main"], ["main", "hop2"], ["main", "hop2"]],
  owl: [["main"], ["main", "feint"], ["main", "feint"]],
  bear: [["main"], ["main", "roll"], ["main", "roll"]],
  tortoise: [["main"], ["main", "volley"], ["main", "volley"]],
  salamander: [["main"], ["main", "fan"], ["main", "fan"]],
  ram: [["main"], ["main", "stutter"], ["main", "stutter"]],
};
/** Pick the next attack: never the same special attack twice running. */
function chooseVariant(boss: BossState) {
  const options = VARIANTS[boss.kind]?.[boss.phase - 1] ?? ["main"];
  const fresh = options.filter((v) => v === "main" || v !== boss.variant);
  boss.variant = fresh[Math.floor(rand(boss) * fresh.length)] ?? "main";
}
/** How far into the adventure each guardian is met: later guardians warn
 * for less time, rest for less time and move faster, so the fights get
 * harder world by world (0: worlds 1–3, up to 3: worlds 10–12). */
export const BOSS_TIER: Record<BossSpec["kind"], number> = {
  stag: 0,
  spider: 0,
  moth: 0,
  millkeeper: 1,
  heartwood: 1,
  toad: 1,
  mole: 1,
  crab: 2,
  owl: 2,
  bear: 2,
  tortoise: 3,
  salamander: 3,
  ram: 3,
};
const pace = (boss: BossState) => 1 + 0.06 * BOSS_TIER[boss.kind];

/** Guardians that walk the arena floor stalk Pip between attacks. */
const STALKERS = new Set<BossSpec["kind"]>(["stag", "spider", "bear", "ram"]);

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const approach = (n: number, target: number, amount: number) =>
  n < target ? Math.min(target, n + amount) : Math.max(target, n - amount);

export function createBoss(spec: BossSpec): BossState {
  const size =
    spec.kind === "stag"
      ? { w: 88, h: 62 }
      : spec.kind === "spider"
        ? { w: 78, h: 66 }
        : spec.kind === "millkeeper"
          ? { w: 104, h: 88 }
          : spec.kind === "heartwood"
            ? { w: 156, h: 100 }
            : spec.kind === "toad"
              ? { w: 96, h: 66 }
              : spec.kind === "mole"
                ? { w: 100, h: 64 }
                : spec.kind === "crab"
                  ? { w: 104, h: 56 }
                  : spec.kind === "owl"
                    ? { w: 120, h: 90 }
                    : spec.kind === "bear"
                      ? { w: 130, h: 100 }
                      : spec.kind === "tortoise"
                        ? { w: 112, h: 66 }
                        : spec.kind === "salamander"
                          ? { w: 120, h: 58 }
                          : spec.kind === "ram"
                            ? { w: 120, h: 72 }
                            : { w: 92, h: 64 };
  return {
    ...spec,
    ...size,
    y: spec.y - size.h,
    health: majorKind(spec.kind) ? 6 : arenaKind(spec.kind) ? 5 : 4,
    maxHealth: majorKind(spec.kind) ? 6 : arenaKind(spec.kind) ? 5 : 4,
    phase: 1,
    state: "dormant",
    stateTime: 0,
    facing: -1,
    invulnerable: 0,
    groundY: spec.y,
    attackElapsed: 0,
    attackOriginX: spec.x,
    attackTargetX: spec.x,
    shotsFired: 0,
    homeX: spec.x,
    seed: (Math.round(spec.x) * 2654435761 + spec.kind.length * 97) >>> 0,
    variant: "main",
    speed: 0,
    stagger: 0,
    fury: 0,
    skid: 0,
    stalk: 240,
    feinted: false,
    pendingWave: 0,
    pendingWaveDir: 0,
    ...(spec.kind === "millkeeper"
      ? {
          millState: "settle" as const,
          phaseCheckpoint: 1,
          millNextDirection: 0,
        }
      : {}),
    ...(spec.kind === "heartwood" || spec.kind === "owl" || spec.kind === "ram"
      ? { phaseCheckpoint: 1 }
      : {}),
  };
}

/** Rebuild transient encounter state; only the entered phase survives a Relaxed retry. */
export function retryBoss(
  spec: BossSpec,
  previous: BossState,
  relaxed: boolean,
): BossState {
  const boss = createBoss(spec);
  if (majorKind(boss.kind) && relaxed) {
    boss.phaseCheckpoint = previous.phaseCheckpoint ?? previous.phase;
    boss.phase = boss.phaseCheckpoint;
    boss.health = 8 - 2 * boss.phase;
  }
  return boss;
}

/** Apply exactly one hit, including clearing hazards before the caller handles damage. */
export function hitBoss(
  boss: BossState,
  player: Rect,
  hazards: BossHazard[],
  events: string[],
): boolean {
  if (
    boss.state === "dormant" ||
    boss.state === "defeated" ||
    boss.invulnerable > 0 ||
    boss.millState === "transition"
  )
    return false;
  boss.health--;
  boss.invulnerable = 1.35;
  hazards.length = 0;
  events.push("boss-hit");
  const phaseBefore = boss.phase;
  // A flinch: it is knocked back a little and reels for a moment.
  boss.stagger = 0.35;
  boss.speed = 0;
  boss.skid = 0.3;
  boss.x = clamp(
    boss.x + (player.x + player.w / 2 < boss.x + boss.w / 2 ? 14 : -14),
    boss.minX,
    boss.maxX,
  );
  if (boss.health <= 0) {
    boss.health = 0;
    boss.state = "defeated";
    boss.stateTime = 0;
    events.push("boss-defeat");
  } else if (boss.kind === "millkeeper") {
    const phase = Math.min(3, 1 + Math.floor((6 - boss.health) / 2));
    const crossed = phase !== boss.phase;
    boss.phase = phase;
    boss.phaseCheckpoint = Math.max(boss.phaseCheckpoint ?? 1, phase);
    setMillState(boss, crossed ? "transition" : "settle", crossed ? 1.5 : 1);
  } else {
    boss.phase =
      boss.kind === "heartwood" || boss.kind === "owl" || boss.kind === "ram"
        ? Math.min(3, 1 + Math.floor((boss.maxHealth - boss.health) / 2))
        : Math.min(
            3,
            1 +
              Math.floor(((boss.maxHealth - boss.health) * 3) / boss.maxHealth),
          );
    if (boss.kind === "heartwood" || boss.kind === "owl" || boss.kind === "ram")
      boss.phaseCheckpoint = Math.max(boss.phaseCheckpoint ?? 1, boss.phase);
    if (boss.phase > phaseBefore) {
      // A new phase: it rears up and roars before fighting on, faster.
      boss.stagger = 0.9;
      boss.fury = 0.9;
      events.push("boss-roar");
    }
    if (boss.kind === "bear") restoreBear(boss);
    warnBoss(boss, player, events, hazards);
  }
  return true;
}

function setMillState(boss: BossState, state: MillState, time: number) {
  boss.millState = state;
  boss.stateTime = time;
  boss.state =
    state === "recover"
      ? "recover"
      : state === "lowSweep" || state === "highSweep"
        ? "attack"
        : "warning";
}

function millWarning(
  boss: BossState,
  player: Rect,
  high: boolean,
  events: string[],
) {
  // Select the farther side once, then alternate on subsequent waves.
  boss.facing =
    boss.millNextDirection ||
    (player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1);
  boss.millNextDirection = -boss.facing;
  setMillState(boss, high ? "highWarning" : "lowWarning", high ? 2.8 : 1.4);
  events.push("boss-warning");
}

function spawnSweep(
  boss: BossState,
  player: Rect,
  hazards: BossHazard[],
  high: boolean,
  events: string[],
) {
  const wave: BossHazard = {
    kind: "sweep",
    x: boss.facing > 0 ? boss.minX : boss.maxX - 48,
    y: boss.groundY - (high ? 230 : 56),
    w: 48,
    h: high ? 150 : 56,
    // The sweep remains fully telegraphed, but moves faster in later phases.
    vx: boss.facing * (290 + (boss.phase - 1) * 40),
    vy: 0,
    remaining: 2.8,
  };
  if (
    player.x < wave.x + wave.w &&
    player.x + player.w > wave.x &&
    player.y < wave.y + wave.h &&
    player.y + player.h > wave.y
  ) {
    // Preserve the selected origin while repeating the complete warning.
    setMillState(boss, high ? "highWarning" : "lowWarning", high ? 2.8 : 1.4);
    events.push("boss-warning");
    return;
  }
  hazards.push(wave);
  setMillState(boss, high ? "highSweep" : "lowSweep", 2.8);
}

function stepMill(
  boss: BossState,
  dt: number,
  player: Rect,
  hazards: BossHazard[],
  events: string[],
) {
  if (boss.state === "dormant") {
    // The guardian protects the way forward even if Pip missed the feather.
    // Its recovery block is reachable from inside the arena, so approaching
    // without a feather cannot bypass the encounter or strand a retry.
    if (player.x >= boss.minX + 40) {
      events.push("boss-start");
      setMillState(boss, "settle", 1);
    }
    return;
  }
  boss.stateTime = Math.max(0, boss.stateTime - dt);
  if (boss.stateTime > 1e-9) return;
  switch (boss.millState) {
    case "settle":
    case "transition":
      millWarning(boss, player, boss.phase >= 2, events);
      break;
    case "lowWarning":
      spawnSweep(boss, player, hazards, false, events);
      break;
    case "highWarning":
      spawnSweep(boss, player, hazards, true, events);
      break;
    case "highSweep":
      hazards.length = 0;
      boss.facing = boss.millNextDirection || -boss.facing;
      boss.millNextDirection = -boss.facing;
      setMillState(boss, "betweenSweeps", 1.8);
      events.push("boss-warning");
      break;
    case "betweenSweeps":
      spawnSweep(boss, player, hazards, false, events);
      break;
    case "lowSweep":
      hazards.length = 0;
      setMillState(boss, "recover", 3);
      break;
    case "recover":
      millWarning(boss, player, boss.phase >= 2, events);
      break;
  }
}

/** Each phase begins with a visible warning and ends with a generous stomp window. */
export function warnBoss(
  boss: BossState,
  player: Rect,
  events: string[],
  hazards: BossHazard[] = [],
) {
  boss.state = "warning";
  boss.feinted = false;
  boss.speed = 0;
  chooseVariant(boss);
  boss.stalk = 200 + rand(boss) * 90;
  boss.stateTime =
    boss.kind === "heartwood"
      ? 1.4
      : boss.kind === "owl"
        ? OWL_HOVER - (boss.phase - 1) * 0.1
        : boss.kind === "mole"
          ? MOLE_BURROW - (boss.phase - 1) * 0.1
          : 1.15 - (boss.phase - 1) * 0.1;
  boss.facing = player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
  boss.attackOriginX = boss.x;
  // The toad marks the spot where Pip stands; the others charge a set
  // distance. Either way the target is shown for the whole warning.
  boss.attackTargetX = clamp(
    boss.kind === "toad" ||
      boss.kind === "mole" ||
      boss.kind === "owl" ||
      (boss.kind === "spider" && boss.variant === "pounce")
      ? player.x + player.w / 2 - boss.w / 2
      : boss.x + boss.facing * (320 + boss.phase * 30),
    boss.minX,
    boss.maxX,
  );
  if (boss.kind === "salamander") {
    // It surfaces on its own island, on the side away from Pip, and takes
    // a little longer under the lava so Pip can hop clear after a stomp.
    const away = player.x + player.w / 2 < boss.homeX + boss.w / 2 ? 1 : -1;
    boss.attackTargetX = clamp(boss.homeX + away * 70, boss.minX, boss.maxX);
    boss.stateTime += 0.4;
  }
  if (boss.kind === "tortoise") boss.stateTime = 1.0;
  if (boss.kind === "ram") {
    // It paws the ground and calls the storm: glowing marks show where
    // lightning will strike when it charges.
    boss.stateTime = 1.35 - (boss.phase - 1) * 0.1;
    const spots =
      boss.phase === 1 ? [0] : boss.phase === 2 ? [-150, 150] : [-220, 0, 220];
    for (const dx of spots)
      hazards.push({
        kind: "mark",
        x: clamp(
          player.x + player.w / 2 + dx - 16,
          boss.minX,
          boss.maxX + boss.w - 32,
        ),
        y: boss.groundY - 10,
        w: 32,
        h: 10,
        vx: 0,
        vy: 0,
        remaining: boss.stateTime + 0.05,
      });
  }
  boss.attackElapsed = 0;
  boss.shotsFired = 0;
  // Later guardians telegraph for a little less time.
  boss.stateTime *= 1 - 0.07 * BOSS_TIER[boss.kind];
  events.push("boss-warning");
}

function recover(boss: BossState) {
  boss.state = "recover";
  // Later phases leave a shorter, still readable opportunity to stomp.
  // Swimming is slower than running, so the underwater crab rests longer.
  boss.stateTime =
    boss.kind === "heartwood" || boss.kind === "owl" || boss.kind === "ram"
      ? 2.4 - (boss.phase - 1) * 0.2
      : boss.kind === "crab"
        ? 3.2 - (boss.phase - 1) * 0.2
        : // Reaching the salamander's island takes two hops over lava.
          boss.kind === "salamander"
          ? 3.2 - (boss.phase - 1) * 0.1
          : 2.2 - (boss.phase - 1) * 0.25;
  // Later guardians shake it off sooner (the salamander's island already
  // costs Pip the time of two lava hops).
  // The tortoise stops far away at a wall and the crab is fought swimming,
  // so those two keep their full rest and get harder through speed alone.
  if (
    boss.kind !== "salamander" &&
    boss.kind !== "tortoise" &&
    boss.kind !== "crab"
  )
    // Never so short that a guardian resting at the far wall is out of reach.
    boss.stateTime = Math.max(
      Math.min(boss.stateTime, 1.9),
      boss.stateTime - 0.1 * BOSS_TIER[boss.kind],
    );
  boss.y = boss.groundY - boss.h;
}

export function stepBoss(
  boss: BossState,
  dt: number,
  player: Rect,
  hazards: BossHazard[],
  events: string[],
  _options: { hasFeather?: boolean; flightActivated?: boolean } = {},
) {
  boss.invulnerable = Math.max(0, boss.invulnerable - dt);
  if (boss.invulnerable < 1e-9) boss.invulnerable = 0;
  if (boss.state === "defeated") return;
  if (boss.kind === "millkeeper")
    return stepMill(boss, dt, player, hazards, events);
  if (boss.state === "dormant") {
    if (player.x + player.w >= boss.minX) {
      events.push("boss-start");
      warnBoss(boss, player, events, hazards);
    }
    return;
  }
  boss.skid = Math.max(0, boss.skid - dt);
  boss.fury = Math.max(0, boss.fury - dt);
  if (boss.pendingWave > 0) {
    // The shockwave rolls out a beat after the impact, so Pip has time to
    // land from jumping the charge before hopping the wave.
    boss.pendingWave = Math.max(0, boss.pendingWave - dt);
    if (boss.pendingWave === 0)
      hazards.push({
        kind: "gust",
        x: boss.pendingWaveDir > 0 ? boss.x + boss.w - 24 : boss.x,
        y: boss.groundY - 24,
        w: 24,
        h: 24,
        vx: boss.pendingWaveDir * (170 + boss.phase * 25),
        vy: 0,
        remaining: 3.2,
      });
  }
  if (boss.stagger > 0) {
    // Reeling from a hit: everything else waits.
    boss.stagger = Math.max(0, boss.stagger - dt);
    return;
  }
  boss.stateTime = Math.max(0, boss.stateTime - dt);
  if (boss.stateTime < 1e-9) boss.stateTime = 0;
  const towardPlayer = player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
  if (boss.state === "warning") {
    if (boss.kind === "moth")
      boss.y = approach(boss.y, boss.groundY - boss.h - 90, 180 * dt);
    // Guardians keep moving while they telegraph. Each attack still starts
    // from wherever the guardian is when the warning ends.
    // The stag paws the ground, rocking in place, so its charge still reaches the wall.
    if (STALKERS.has(boss.kind) && boss.kind !== "bear") {
      // It stalks: closing in or backing off to its chosen distance, with
      // momentum, then steps back to wind up just before it attacks.
      const gap = Math.abs(player.x + player.w / 2 - (boss.x + boss.w / 2));
      const want =
        boss.stateTime < 0.28
          ? -towardPlayer * 70
          : gap > boss.stalk + 30
            ? towardPlayer * 95
            : gap < boss.stalk - 30
              ? -towardPlayer * 85
              : 0;
      boss.speed = approach(boss.speed, want, 420 * dt);
      roam(boss, dt, boss.speed);
      boss.facing = towardPlayer;
      // The charge or pounce aims from wherever it ends up.
      if (boss.kind !== "spider" || boss.variant !== "pounce")
        boss.attackTargetX = clamp(
          boss.x + boss.facing * (320 + boss.phase * 30),
          boss.minX,
          boss.maxX,
        );
      boss.attackOriginX = boss.x;
    } else if (boss.kind === "heartwood") roam(boss, dt, towardPlayer * 30);
    else if (boss.kind === "owl") {
      // It rises and circles above Pip; its mark follows, then locks.
      boss.y = approach(boss.y, boss.groundY - boss.h - 210, 260 * dt);
      if (boss.stateTime > OWL_LOCK) {
        boss.attackTargetX = approach(
          boss.attackTargetX,
          clamp(player.x + player.w / 2 - boss.w / 2, boss.minX, boss.maxX),
          190 * dt,
        );
        roam(boss, dt, Math.sign(boss.attackTargetX - boss.x) * 160);
      }
      boss.attackOriginX = boss.x;
      // From phase two, the moment its mark locks it shakes loose feathers
      // that fall beside the mark with the dive: both say "stay clear".
      if (
        boss.phase >= 2 &&
        boss.shotsFired === 0 &&
        boss.stateTime <= OWL_LOCK
      ) {
        const mark = boss.attackTargetX + boss.w / 2;
        const spread = boss.phase >= 3 ? [-130, -70, 70, 130] : [-80, 80];
        for (const dx of spread)
          hazards.push({
            kind: "feather",
            x: clamp(mark + dx - 10, boss.minX, boss.maxX + boss.w),
            y: boss.groundY - 200,
            w: 20,
            h: 30,
            vx: 0,
            vy: 300,
            remaining: 1.2,
          });
        boss.shotsFired++;
      }
    } else if (boss.kind === "bear") {
      if (boss.variant === "roll") boss.facing = towardPlayer;
      roam(boss, dt, Math.sin(boss.stateTime * 10) * 40);
    } else if (boss.kind === "tortoise") {
      // It tucks into its shell and spins up, facing Pip.
    } else if (boss.kind === "salamander") {
      // It sinks below the lava and swims to the side of its island away
      // from Pip, settling on that spot for the last moments.
      if (boss.stateTime > 0.5) {
        const away = player.x + player.w / 2 < boss.homeX + boss.w / 2 ? 1 : -1;
        boss.attackTargetX = clamp(
          boss.homeX + away * 70,
          boss.minX,
          boss.maxX,
        );
      }
      boss.y = approach(boss.y, boss.groundY + 10, 240 * dt);
      boss.x = approach(boss.x, boss.attackTargetX, 260 * dt);
    } else if (boss.kind === "crab")
      // It clacks its claws and sidles on the spot before scuttling.
      roam(boss, dt, Math.sin(boss.stateTime * 16) * 50);
    else if (boss.kind === "toad") {
      // The toad bobs side to side while crouched; its leap starts from
      // wherever it is. (The moth already rises to hover as it warns.)
      roam(boss, dt, Math.sin(boss.stateTime * 6) * 45);
      boss.attackOriginX = boss.x;
    } else if (boss.kind === "mole") {
      // The mole digs under the floor, out of reach, and tunnels toward Pip.
      // Its mark follows Pip at first, then locks for the last stretch so
      // there is always time to step away from the cracking spot.
      boss.y = approach(boss.y, boss.groundY + 6, 260 * dt);
      if (boss.stateTime > MOLE_LOCK)
        boss.attackTargetX = approach(
          boss.attackTargetX,
          clamp(player.x + player.w / 2 - boss.w / 2, boss.minX, boss.maxX),
          170 * dt,
        );
      boss.x = approach(boss.x, boss.attackTargetX, 300 * dt);
    }
    if (boss.stateTime > 0) return;
    boss.state = "attack";
    boss.stateTime =
      boss.kind === "stag"
        ? 3.2
        : boss.kind === "ram"
          ? RAM_REAR + 2.6
          : boss.kind === "spider"
            ? 1.55
            : boss.kind === "heartwood"
              ? 2.05
              : boss.kind === "toad"
                ? TOAD_LEAP
                : boss.kind === "owl"
                  ? OWL_DIVE
                  : boss.kind === "bear"
                    ? 2
                    : boss.kind === "tortoise"
                      ? 4
                      : boss.kind === "salamander"
                        ? 1.2
                        : boss.kind === "mole"
                          ? MOLE_EMERGE
                          : boss.kind === "crab"
                            ? CRAB_SCUTTLE
                            : 1.3;
    // Some chosen attacks run differently.
    if (boss.kind === "spider" && boss.variant === "pounce")
      boss.stateTime = SPIDER_POUNCE;
    if (boss.kind === "bear" && boss.variant === "roll") {
      // It curls into a ball, low enough to jump, and rolls at Pip.
      boss.stateTime = 3;
      boss.h = 70;
      boss.y = boss.groundY - boss.h;
    }
    if (boss.kind === "tortoise" && boss.variant === "volley")
      boss.stateTime = 1.5;
    boss.attackElapsed = 0;
    boss.speed = 0;
  }
  if (boss.state === "attack") {
    boss.attackElapsed += dt;
    if (boss.kind === "ram" && boss.shotsFired === 0) {
      // The marks become lightning bolts as the charge begins.
      boss.shotsFired = 1;
      for (const mark of hazards.filter((h) => h.kind === "mark"))
        hazards.push({
          kind: "bolt",
          x: mark.x + 2,
          y: boss.groundY - 470,
          w: 28,
          h: 470,
          vx: 0,
          vy: 0,
          remaining: 0.45,
        });
      for (const mark of hazards) if (mark.kind === "mark") mark.remaining = 0;
    }
    // The ram rears while its lightning strikes, then charges: one threat
    // at a time.
    if (boss.kind === "ram" && boss.attackElapsed < RAM_REAR) {
      // Rearing in place.
    } else if (boss.kind === "stag" || boss.kind === "ram") {
      const top =
        (boss.kind === "ram" ? 280 + boss.phase * 50 : 290 + boss.phase * 55) *
        pace(boss);
      const charging =
        boss.kind === "ram"
          ? boss.attackElapsed - RAM_REAR
          : boss.attackElapsed;
      // A stutter: it digs in partway, then bursts on again.
      const stutter =
        boss.variant === "stutter" && charging > 0.4 && charging < 0.85;
      boss.speed = approach(
        boss.speed,
        stutter ? 0 : top,
        (stutter ? 1400 : 1100) * dt,
      );
      if (stutter && !boss.feinted) {
        boss.feinted = true;
        boss.skid = 0.35;
        events.push("boss-skid");
      }
      boss.x += boss.facing * boss.speed * dt;
      if (boss.x <= boss.minX || boss.x >= boss.maxX) {
        boss.x = clamp(boss.x, boss.minX, boss.maxX);
        // The wall impact sends a low wave back into the arena, a beat
        // later. The charge and direction make the impact readable; a jump
        // clears the wave.
        boss.pendingWave = 0.4;
        boss.pendingWaveDir = -boss.facing;
        events.push("boss-slam");
        boss.skid = 0.4;
        // It rebounds a step off the wall.
        boss.x -= boss.facing * 12;
        if (boss.variant === "double" && boss.shotsFired === 0) {
          // Shaking it off, it turns and charges straight back.
          boss.shotsFired = 1;
          boss.facing *= -1;
          boss.speed = 0;
          boss.stagger = 0.4;
          boss.stateTime = Math.max(boss.stateTime, 3);
        } else recover(boss);
      }
    } else if (boss.kind === "spider" && boss.variant === "pounce") {
      // A high pounce onto the spot it marked.
      const fraction = clamp(boss.attackElapsed / SPIDER_POUNCE, 0, 1);
      boss.x =
        boss.attackOriginX +
        (boss.attackTargetX - boss.attackOriginX) * fraction;
      boss.y = boss.groundY - boss.h - Math.sin(fraction * Math.PI) * 150;
    } else if (boss.kind === "spider") {
      // It backs away while spitting web balls along the floor; jumping is
      // always a valid counter.
      roam(boss, dt, -boss.facing * (45 + boss.phase * 10));
      if (
        boss.shotsFired < boss.phase + 2 &&
        boss.attackElapsed >= 0.18 + boss.shotsFired * 0.27
      ) {
        hazards.push({
          kind: "web",
          x: boss.x + boss.w / 2 + boss.facing * (boss.w / 2 + 5) - 11,
          y: boss.groundY - 28,
          w: 22,
          h: 22,
          vx: boss.facing * (170 + boss.phase * 30),
          vy: 0,
          remaining: 4,
        });
        boss.shotsFired++;
      }
    } else if (boss.kind === "heartwood") {
      // It lumbers forward a little while it fires.
      roam(boss, dt, boss.facing * 18);
      // After the visible warning, the rooted guardian sends a volley of
      // ground-level thorn seeds. Later phases also send alternating seeds
      // toward the other side, so standing behind it is not a safe shortcut.
      if (
        boss.shotsFired < boss.phase + 2 &&
        boss.attackElapsed >= 0.24 + boss.shotsFired * 0.07
      ) {
        const direction =
          boss.phase > 1 && boss.shotsFired % 2 === 1
            ? -boss.facing
            : boss.facing;
        hazards.push({
          kind: "gust",
          x: boss.x + boss.w / 2 + direction * (boss.w / 2 + 8) - 12,
          y: boss.groundY - 22,
          w: 24,
          h: 22,
          vx: direction * (165 + boss.phase * 25),
          vy: 0,
          remaining: 4,
        });
        boss.shotsFired++;
      }
    } else if (boss.kind === "bear" && boss.variant === "roll") {
      boss.speed = approach(
        boss.speed,
        (300 + boss.phase * 30) * pace(boss),
        700 * dt,
      );
      boss.x += boss.facing * boss.speed * dt;
      if (boss.x <= boss.minX || boss.x >= boss.maxX) {
        boss.x = clamp(boss.x, boss.minX, boss.maxX) - boss.facing * 12;
        events.push("boss-slam");
        boss.skid = 0.4;
        restoreBear(boss);
        recover(boss);
      }
    } else if (boss.kind === "bear") {
      // A heavy ground slam: a shockwave each way, and icicles shaken loose
      // from the ceiling high above, falling where Pip and nearby stand.
      if (boss.shotsFired === 0 && boss.attackElapsed >= 0.45) {
        boss.shotsFired = 1;
        for (const direction of [-1, 1])
          hazards.push({
            kind: "gust",
            x: boss.x + boss.w / 2 + direction * (boss.w / 2 + 4) - 12,
            y: boss.groundY - 22,
            w: 24,
            h: 22,
            vx: direction * (170 + boss.phase * 20),
            vy: 0,
            remaining: 4,
          });
        // The first icicle falls a step from Pip, on the bear's side: stand
        // close and it lands on the bear. Later phases add more behind Pip,
        // away from the bear, so backing off needs care.
        const toward = player.x + player.w / 2 < boss.x + boss.w / 2 ? 1 : -1;
        const spots =
          boss.phase === 1
            ? [0]
            : boss.phase === 2
              ? [0, -150]
              : [0, -120, -240];
        for (const dx of spots)
          hazards.push({
            kind: "icicle",
            x: clamp(
              player.x + player.w / 2 + toward * (50 + dx) - 10,
              boss.minX,
              boss.maxX + boss.w,
            ),
            y: boss.groundY - 560,
            w: 20,
            h: 40,
            vx: 0,
            vy: 0,
            remaining: 3,
          });
      }
      // Grumble only goes dizzy when one of its own icicles lands on it.
      const bonk = hazards.find(
        (h) =>
          h.kind === "icicle" &&
          h.remaining > 0 &&
          h.x + h.w > boss.x - 20 &&
          h.x < boss.x + boss.w + 20 &&
          h.y + h.h >= boss.y,
      );
      if (bonk) {
        bonk.remaining = 0;
        events.push("boss-bonk");
        boss.skid = 0.4;
        recover(boss);
        boss.stateTime += 0.6;
        return;
      }
    } else if (boss.kind === "tortoise" && boss.variant === "volley") {
      // Braced in its shell, it flings ice shards along the floor, first one
      // way, then the other.
      if (
        boss.shotsFired < 3 &&
        boss.attackElapsed >= 0.25 + boss.shotsFired * 0.4
      ) {
        const direction = boss.shotsFired % 2 ? -boss.facing : boss.facing;
        hazards.push({
          kind: "shard",
          x: direction > 0 ? boss.x + boss.w + 2 : boss.x - 26,
          y: boss.groundY - 22,
          w: 24,
          h: 22,
          vx: direction * (210 + boss.phase * 20),
          vy: 0,
          remaining: 3,
        });
        boss.shotsFired++;
      }
    } else if (boss.kind === "tortoise") {
      // Spinning in its shell, it slides across the ice and rebounds off the
      // walls (more times each phase), chipping off a shard at each wall.
      boss.x += boss.facing * (330 + boss.phase * 40) * pace(boss) * dt;
      if (boss.x <= boss.minX || boss.x >= boss.maxX) {
        boss.x = clamp(boss.x, boss.minX, boss.maxX);
        boss.facing *= -1;
        boss.shotsFired++;
        hazards.push({
          kind: "shard",
          x: boss.facing > 0 ? boss.x + boss.w + 2 : boss.x - 26,
          y: boss.groundY - 22,
          w: 24,
          h: 22,
          vx: boss.facing * (200 + boss.phase * 20),
          vy: 0,
          remaining: 3,
        });
        if (boss.shotsFired > boss.phase) boss.stateTime = 0;
      }
    } else if (boss.kind === "salamander") {
      // It bursts up onto its island and spits arcing fireballs at Pip.
      boss.y = approach(boss.y, boss.groundY - boss.h, 500 * dt);
      if (
        boss.shotsFired < Math.min(3, boss.phase + 1) &&
        boss.attackElapsed >= 0.25 + boss.shotsFired * 0.22
      ) {
        const fromX = boss.x + boss.w / 2;
        // A fan sprays both ways at set spreads instead of aiming at Pip.
        const dx =
          boss.variant === "fan"
            ? [-420, 300, -220][boss.shotsFired % 3]! -
              (boss.shotsFired - (Math.min(3, boss.phase + 1) - 1) / 2) * 70
            : clamp(player.x + player.w / 2 - fromX, -620, 620);
        // Aim so the arc lands near Pip, spreading the later shots.
        const spread =
          (boss.shotsFired - (Math.min(3, boss.phase + 1) - 1) / 2) * 70;
        const flight = 1;
        hazards.push({
          kind: "fireball",
          x: fromX - 11,
          y: boss.groundY - boss.h - 10,
          w: 22,
          h: 22,
          vx: (dx + spread) / flight,
          vy: -(900 * flight) / 2 + (boss.h + 10) / flight,
          remaining: 2.4,
        });
        boss.shotsFired++;
      }
    } else if (
      boss.kind === "owl" &&
      boss.variant === "feint" &&
      !boss.feinted &&
      boss.attackElapsed > OWL_DIVE * 0.45
    ) {
      // A fake-out: it pulls up from the dive, circles once more and locks
      // a fresh mark before diving for real.
      boss.feinted = true;
      boss.state = "warning";
      boss.stateTime = OWL_LOCK + 0.35;
      boss.shotsFired = 1;
      events.push("boss-warning");
    } else if (boss.kind === "owl") {
      // A steep dive onto the locked mark.
      const fraction = clamp(boss.attackElapsed / OWL_DIVE, 0, 1);
      boss.x =
        boss.attackOriginX +
        (boss.attackTargetX - boss.attackOriginX) * fraction;
      boss.y = boss.groundY - boss.h - 210 * (1 - fraction * fraction);
    } else if (boss.kind === "crab") {
      // It scuttles sideways along the seabed, puffing bubbles that drift
      // up through the water. Swim around them; it tires at the wall.
      boss.x += boss.facing * (200 + boss.phase * 40) * pace(boss) * dt;
      if (
        boss.shotsFired < boss.phase + 2 &&
        boss.attackElapsed >= 0.15 + boss.shotsFired * 0.3
      ) {
        hazards.push({
          kind: "bubble",
          x: boss.x + boss.w / 2 - 11,
          y: boss.groundY - boss.h - 10,
          w: 22,
          h: 22,
          vx: -boss.facing * (25 + boss.phase * 10),
          vy: -85,
          remaining: 3.5,
        });
        boss.shotsFired++;
      }
      if (boss.x <= boss.minX || boss.x >= boss.maxX) {
        boss.x = clamp(boss.x, boss.minX, boss.maxX);
        boss.stateTime = 0;
      }
    } else if (boss.kind === "mole") {
      // It bursts up through the marked spot.
      boss.x = boss.attackTargetX;
      const fraction = clamp(boss.attackElapsed / MOLE_EMERGE, 0, 1);
      boss.y = boss.groundY + 6 - (boss.h + 6) * fraction;
    } else if (boss.kind === "toad") {
      // A high, readable leap onto the marked spot.
      const fraction = clamp(boss.attackElapsed / TOAD_LEAP, 0, 1);
      boss.x =
        boss.attackOriginX +
        (boss.attackTargetX - boss.attackOriginX) * fraction;
      boss.y = boss.groundY - boss.h - Math.sin(fraction * Math.PI) * 170;
    } else {
      // The moth swoops to its signalled side, then lands with its wings folded.
      const fraction = clamp(boss.attackElapsed / 1.3, 0, 1);
      boss.x =
        boss.attackOriginX +
        (boss.attackTargetX - boss.attackOriginX) * fraction;
      boss.y = boss.groundY - boss.h - 90 * (1 - fraction);
      if (
        boss.shotsFired < boss.phase + 2 &&
        boss.attackElapsed >= 0.2 + boss.shotsFired * 0.25
      ) {
        hazards.push({
          kind: "gust",
          x: boss.x + boss.w / 2 - 12,
          y: boss.groundY - 30,
          w: 24,
          h: 24,
          vx: -boss.facing * (155 + boss.phase * 25),
          vy: 0,
          remaining: 3.2,
        });
        boss.shotsFired++;
      }
    }
    if (boss.stateTime === 0 && boss.state === "attack") {
      if (
        boss.kind === "toad" ||
        boss.kind === "mole" ||
        boss.kind === "owl" ||
        (boss.kind === "spider" && boss.variant === "pounce")
      )
        toadSplash(boss, hazards);
      if (boss.kind === "toad" && boss.variant === "hop2" && !boss.feinted) {
        // A second, quicker hop toward where Pip is now, marked as it lands.
        boss.feinted = true;
        boss.attackOriginX = boss.x;
        boss.attackTargetX = clamp(
          boss.x +
            clamp(player.x + player.w / 2 - (boss.x + boss.w / 2), -260, 260),
          boss.minX,
          boss.maxX,
        );
        boss.state = "warning";
        boss.stateTime = 0.55;
      } else if (boss.kind === "bear" && boss.variant !== "roll") {
        // No icicle hit it: it shrugs off the slam and goes again.
        warnBoss(boss, player, events, hazards);
      } else {
        if (boss.kind === "bear") restoreBear(boss);
        // The tortoise's thrown shards shatter as it goes dizzy, so the
        // stomp window on slippery ice is never a dodge as well.
        if (boss.kind === "tortoise")
          for (const h of hazards) if (h.kind === "shard") h.remaining = 0;
        // Likewise the spider's webs snap once it is dizzy.
        if (boss.kind === "spider")
          for (const h of hazards) if (h.kind === "web") h.remaining = 0;
        recover(boss);
      }
    }
  } else if (boss.state === "recover") {
    // A dazed guardian staggers slowly away from Pip, so the stomp has to
    // be chased and aimed, but the opening stays generous and the next
    // attack never starts on top of Pip.
    // (The crab lies still on its shell.)
    const before = boss.x;
    // (The crab lies on its shell; the salamander basks where it surfaced.)
    if (boss.kind !== "crab" && boss.kind !== "salamander")
      roam(boss, dt, -towardPlayer * (22 + boss.phase * 8));
    // Arena guardians never stagger into a wall, so there is always room
    // to land beside them after a stomp.
    if (arenaKind(boss.kind)) {
      const lo = boss.minX + 100,
        hi = boss.maxX - 100;
      if (boss.x > hi && boss.x > before) boss.x = Math.max(before, hi);
      if (boss.x < lo && boss.x < before) boss.x = Math.min(before, lo);
    }
    // The salamander never staggers off its island into the lava.
    if (boss.kind === "salamander")
      boss.x = clamp(boss.x, boss.homeX - 80, boss.homeX + 80);
    if (boss.stateTime === 0) warnBoss(boss, player, events, hazards);
  }
}

/** Landing (or the mole bursting out) sends a low ripple or shard each way;
 * a jump clears it. Phase three adds a slower second pair, so a single hop
 * must be timed rather than mashed. */
function toadSplash(boss: BossState, hazards: BossHazard[]) {
  boss.x = boss.attackTargetX;
  const speeds = boss.phase >= 3 ? [175, 105] : [150 + boss.phase * 20];
  for (const speed of speeds)
    for (const direction of [-1, 1])
      hazards.push({
        kind: "gust",
        x: boss.x + boss.w / 2 + direction * (boss.w / 2 + 4) - 12,
        y: boss.groundY - 20,
        w: 24,
        h: 20,
        vx: direction * speed,
        vy: 0,
        remaining: 4,
      });
}

/** The bear uncurls from its roll. */
function restoreBear(boss: BossState) {
  if (boss.h === 100) return;
  boss.h = 100;
  boss.y = boss.groundY - boss.h;
}

/** Move a guardian sideways, staying inside its arena. */
function roam(boss: BossState, dt: number, speed: number) {
  boss.x = clamp(boss.x + speed * dt, boss.minX, boss.maxX);
}
