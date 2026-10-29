import { Game } from "./engine";
import { beehiveLevel } from "./levels";

/** Keeps room state and one set of run resources across a world/secret detour. */
export class AdventureSession {
  readonly parent: Game;
  private secret: Game | null = null;
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
    if (this.inSecret || this.parent.state !== "playing") return this.active;
    const portal = this.parent.level.portals?.find(
      (p) => p.target === "beehive",
    );
    if (!portal || !this.parent.puzzleState.hiveDiscovered) return this.active;
    this.returnPoint = { x: portal.x + portal.w + 26, feetY: portal.y };
    this.secret ??= new Game(0, {
      level: beehiveLevel,
      mode: this.parent.mode,
    });
    this.secret.transferPlayerFrom(this.parent, {
      x: beehiveLevel.spawn.x,
      feetY: beehiveLevel.spawn.y + 38,
    });
    this.parent.requestedPortal = null;
    this.active = this.secret;
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
