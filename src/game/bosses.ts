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
};
export type BossHazard = Rect & {
  kind: "web" | "gust";
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
        : { w: 92, h: 64 };
  return {
    ...spec,
    ...size,
    y: spec.y - size.h,
    health: 3,
    maxHealth: 3,
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
  };
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
) {
  boss.invulnerable = Math.max(0, boss.invulnerable - dt);
  if (boss.state === "defeated") return;
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
