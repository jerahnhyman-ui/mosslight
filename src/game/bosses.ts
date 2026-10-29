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
};
export type MillState =
  | "settle"
  | "lowWarning"
  | "lowSweep"
  | "vaneWarning"
  | "vaneOpen"
  | "highWarning"
  | "highSweep"
  | "betweenSweeps"
  | "recover"
  | "transition";
export type BossHazard = Rect & {
  kind: "web" | "gust" | "sweep";
  vx: number;
  vy: number;
  remaining: number;
};

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
          ? { w: 104, h: 122 }
          : { w: 92, h: 64 };
  return {
    ...spec,
    ...size,
    y: spec.y - size.h,
    health: spec.kind === "millkeeper" ? 6 : 3,
    maxHealth: spec.kind === "millkeeper" ? 6 : 3,
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
    ...(spec.kind === "millkeeper"
      ? {
          millState: "settle" as const,
          phaseCheckpoint: 1,
          millNextDirection: 0,
        }
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
  if (boss.kind === "millkeeper" && relaxed) {
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
    boss.phase = boss.maxHealth - boss.health + 1;
    warnBoss(boss, player, events);
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
    y: boss.groundY - (high ? 220 : 56),
    w: 48,
    h: high ? 158 : 56,
    vx: boss.facing * 260,
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
  options: { hasFeather?: boolean; flightActivated?: boolean },
) {
  if (boss.state === "dormant") {
    if (options.hasFeather && player.x >= boss.minX + 40) {
      events.push("boss-start");
      setMillState(boss, "settle", 1);
    }
    return;
  }
  if (boss.millState === "vaneOpen" && options.flightActivated) {
    const dx = player.x + player.w / 2 - (boss.x + boss.w / 2);
    const dy = player.y + player.h / 2 - (boss.groundY - 285);
    if (dx * dx + dy * dy <= 20 * 20) {
      hazards.length = 0;
      setMillState(boss, "recover", 3.2);
      return;
    }
  }
  boss.stateTime = Math.max(0, boss.stateTime - dt);
  if (boss.stateTime > 1e-9) return;
  switch (boss.millState) {
    case "settle":
    case "transition":
      if (boss.phase === 2) {
        setMillState(boss, "vaneWarning", 1.5);
        events.push("boss-warning");
      } else millWarning(boss, player, boss.phase === 3, events);
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
      setMillState(
        boss,
        boss.phase === 1 ? "recover" : "vaneOpen",
        boss.phase === 1 ? 3 : 4.5,
      );
      break;
    case "vaneWarning":
      setMillState(boss, "vaneOpen", 4.5);
      break;
    case "vaneOpen":
      setMillState(boss, "settle", 1);
      break;
    case "recover":
      if (boss.phase === 2) {
        setMillState(boss, "vaneWarning", 1.5);
        events.push("boss-warning");
      } else millWarning(boss, player, boss.phase === 3, events);
      break;
  }
}

/** Each phase begins with a visible warning and ends with a generous stomp window. */
export function warnBoss(boss: BossState, player: Rect, events: string[]) {
  boss.state = "warning";
  boss.stateTime = 1.15 - (boss.phase - 1) * 0.1;
  boss.facing = player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
  boss.attackOriginX = boss.x;
  boss.attackTargetX = clamp(
    boss.x + boss.facing * (320 + boss.phase * 30),
    boss.minX,
    boss.maxX,
  );
  boss.attackElapsed = 0;
  boss.shotsFired = 0;
  events.push("boss-warning");
}

function recover(boss: BossState) {
  boss.state = "recover";
  boss.stateTime = 2.4;
  boss.y = boss.groundY - boss.h;
}

export function stepBoss(
  boss: BossState,
  dt: number,
  player: Rect,
  hazards: BossHazard[],
  events: string[],
  options: { hasFeather?: boolean; flightActivated?: boolean } = {},
) {
  boss.invulnerable = Math.max(0, boss.invulnerable - dt);
  if (boss.invulnerable < 1e-9) boss.invulnerable = 0;
  if (boss.state === "defeated") return;
  if (boss.kind === "millkeeper")
    return stepMill(boss, dt, player, hazards, events, options);
  if (boss.state === "dormant") {
    if (player.x + player.w >= boss.minX) {
      events.push("boss-start");
      warnBoss(boss, player, events);
    }
    return;
  }
  boss.stateTime = Math.max(0, boss.stateTime - dt);
  if (boss.stateTime < 1e-9) boss.stateTime = 0;
  if (boss.state === "warning") {
    if (boss.kind === "moth")
      boss.y = approach(boss.y, boss.groundY - boss.h - 90, 180 * dt);
    if (boss.stateTime > 0) return;
    boss.state = "attack";
    boss.stateTime =
      boss.kind === "stag" ? 1.35 : boss.kind === "spider" ? 1.55 : 1.3;
    boss.attackElapsed = 0;
  }
  if (boss.state === "attack") {
    boss.attackElapsed += dt;
    if (boss.kind === "stag") {
      boss.x += boss.facing * (245 + boss.phase * 35) * dt;
      if (boss.x <= boss.minX || boss.x >= boss.maxX) {
        boss.x = clamp(boss.x, boss.minX, boss.maxX);
        recover(boss);
      }
    } else if (boss.kind === "spider") {
      // Web balls travel along the floor; jumping is always a valid counter.
      if (
        boss.shotsFired < boss.phase &&
        boss.attackElapsed >= 0.18 + boss.shotsFired * 0.4
      ) {
        hazards.push({
          kind: "web",
          x: boss.x + boss.w / 2 + boss.facing * (boss.w / 2 + 5) - 11,
          y: boss.groundY - 28,
          w: 22,
          h: 22,
          vx: boss.facing * (145 + boss.phase * 20),
          vy: 0,
          remaining: 4,
        });
        boss.shotsFired++;
      }
    } else {
      // The moth swoops to its signalled side, then lands with its wings folded.
      const fraction = clamp(boss.attackElapsed / 1.3, 0, 1);
      boss.x =
        boss.attackOriginX +
        (boss.attackTargetX - boss.attackOriginX) * fraction;
      boss.y = boss.groundY - boss.h - 90 * (1 - fraction);
      if (
        boss.shotsFired < boss.phase &&
        boss.attackElapsed >= 0.28 + boss.shotsFired * 0.28
      ) {
        hazards.push({
          kind: "gust",
          x: boss.x + boss.w / 2 - 12,
          y: boss.groundY - 30,
          w: 24,
          h: 24,
          vx: -boss.facing * (130 + boss.phase * 15),
          vy: 0,
          remaining: 3.2,
        });
        boss.shotsFired++;
      }
    }
    if (boss.stateTime === 0) recover(boss);
  } else if (boss.state === "recover" && boss.stateTime === 0) {
    warnBoss(boss, player, events);
  }
}
