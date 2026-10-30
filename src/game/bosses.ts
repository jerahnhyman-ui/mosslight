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
          ? { w: 104, h: 88 }
          : spec.kind === "heartwood"
            ? { w: 156, h: 100 }
            : { w: 92, h: 64 };
  return {
    ...spec,
    ...size,
    y: spec.y - size.h,
    health: spec.kind === "millkeeper" || spec.kind === "heartwood" ? 6 : 4,
    maxHealth: spec.kind === "millkeeper" || spec.kind === "heartwood" ? 6 : 4,
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
    ...(spec.kind === "heartwood" ? { phaseCheckpoint: 1 } : {}),
  };
}

/** Rebuild transient encounter state; only the entered phase survives a Relaxed retry. */
export function retryBoss(
  spec: BossSpec,
  previous: BossState,
  relaxed: boolean,
): BossState {
  const boss = createBoss(spec);
  if ((boss.kind === "millkeeper" || boss.kind === "heartwood") && relaxed) {
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
    boss.phase =
      boss.kind === "heartwood"
        ? Math.min(3, 1 + Math.floor((boss.maxHealth - boss.health) / 2))
        : Math.min(
            3,
            1 +
              Math.floor(((boss.maxHealth - boss.health) * 3) / boss.maxHealth),
          );
    if (boss.kind === "heartwood")
      boss.phaseCheckpoint = Math.max(boss.phaseCheckpoint ?? 1, boss.phase);
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
export function warnBoss(boss: BossState, player: Rect, events: string[]) {
  boss.state = "warning";
  boss.stateTime =
    boss.kind === "heartwood" ? 1.4 : 1.15 - (boss.phase - 1) * 0.1;
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
  // Later phases leave a shorter, still readable opportunity to stomp.
  boss.stateTime =
    boss.kind === "heartwood"
      ? 2.4 - (boss.phase - 1) * 0.2
      : 2.2 - (boss.phase - 1) * 0.25;
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
      boss.kind === "stag"
        ? 1.35
        : boss.kind === "spider"
          ? 1.55
          : boss.kind === "heartwood"
            ? 2.05
            : 1.3;
    boss.attackElapsed = 0;
  }
  if (boss.state === "attack") {
    boss.attackElapsed += dt;
    if (boss.kind === "stag") {
      boss.x += boss.facing * (290 + boss.phase * 55) * dt;
      if (boss.x <= boss.minX || boss.x >= boss.maxX) {
        boss.x = clamp(boss.x, boss.minX, boss.maxX);
        // The wall impact sends a low wave back into the arena. The charge
        // and direction make the impact readable; a jump clears the wave.
        hazards.push({
          kind: "gust",
          x: boss.facing > 0 ? boss.x : boss.x + boss.w - 24,
          y: boss.groundY - 24,
          w: 24,
          h: 24,
          vx: -boss.facing * (170 + boss.phase * 25),
          vy: 0,
          remaining: 3.2,
        });
        recover(boss);
      }
    } else if (boss.kind === "spider") {
      // Web balls travel along the floor; jumping is always a valid counter.
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
    if (boss.stateTime === 0) recover(boss);
  } else if (boss.state === "recover" && boss.stateTime === 0) {
    warnBoss(boss, player, events);
  }
}
