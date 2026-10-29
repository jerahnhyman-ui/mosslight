import { Game } from "./engine";
import { beehiveLevel } from "./levels";
import { cloudGardenLevel } from "./cloud-garden";
import { moonpoolLevel } from "./moonpool-level";

/** Keeps room state and one set of run resources across a world/secret detour. */
export class AdventureSession {
  readonly parent: Game;
  private secrets = new Map<string, Game>();
  private returnPoint: { x: number; feetY: number } | null = null;
  active: Game;

  constructor(parent: Game) {
    this.parent = parent;
    this.active = parent;
  }

  get inSecret() {
    return this.active !== this.parent;
  }

  enterBeehive(): Game {
    return this.enter("beehive");
  }

  enter(target: "beehive" | "cloud" | "moonpool"): Game {
    if (this.inSecret || this.parent.state !== "playing") return this.active;
    const portal = this.parent.level.portals?.find((p) => p.target === target);
    if (
      !portal ||
      (target === "beehive" && !this.parent.puzzleState.hiveDiscovered)
    )
      return this.active;
    const level =
      target === "beehive"
        ? beehiveLevel
        : target === "cloud"
          ? cloudGardenLevel
          : moonpoolLevel;
    this.returnPoint = {
      x:
        target === "beehive"
          ? portal.x + portal.w + 26
          : portal.x + portal.w / 2 - this.parent.player.w / 2,
      feetY: portal.y,
    };
    let secret = this.secrets.get(target);
    if (!secret) {
      secret = new Game(0, { level, mode: this.parent.mode });
      this.secrets.set(target, secret);
    }
    secret.transferPlayerFrom(this.parent, {
      x: level.spawn.x,
      feetY: level.spawn.y + 38,
    });
    this.parent.requestedPortal = null;
    this.active = secret;
    return this.active;
  }

  returnToWorld(): Game {
    if (!this.inSecret || !this.returnPoint || this.active.state !== "playing")
      return this.active;
    this.parent.transferPlayerFrom(this.active, this.returnPoint);
    this.active.requestedPortal = null;
    this.active = this.parent;
    return this.active;
  }
}
