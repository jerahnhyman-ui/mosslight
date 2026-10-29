import type { GameInput } from "./game/engine";

type Direction = -1 | 0 | 1;
const movementKeys = new Map<string, Direction>([
  ["ArrowLeft", -1],
  ["KeyA", -1],
  ["ArrowRight", 1],
  ["KeyD", 1],
]);
const jumpKeys = new Set(["Space", "ArrowUp", "KeyW"]);

/** One captured movement surface lets a thumb change direction without lifting. */
export class Controls {
  private keys = new Set<string>();
  private movement = new Map<number, Direction>();
  private jumps = new Set<number>();
  private jumpEdges: boolean[] = [];
  private aggregateJump = false;
  private padJump = false;
  private padPause = false;

  constructor(
    private movementPad: HTMLElement,
    private jumpButton: HTMLButtonElement,
    private active: () => boolean,
    private unlock: () => void,
    private togglePause: () => void,
  ) {
    movementPad.addEventListener("pointerdown", (event) => {
      if (
        !this.active() ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      movementPad.setPointerCapture(event.pointerId);
      this.move(event);
      this.unlock();
    });
    movementPad.addEventListener("pointermove", (event) => {
      if (movementPad.hasPointerCapture(event.pointerId)) {
        event.preventDefault();
        this.move(event);
      }
    });
    const releaseMove = (event: PointerEvent) => {
      this.movement.delete(event.pointerId);
      this.paint();
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      movementPad.addEventListener(type, releaseMove as EventListener);

    jumpButton.addEventListener("pointerdown", (event) => {
      if (
        !this.active() ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      jumpButton.setPointerCapture(event.pointerId);
      this.jumps.add(event.pointerId);
      this.captureJump();
      this.paint();
      this.unlock();
    });
    const releaseJump = (event: PointerEvent) => {
      this.jumps.delete(event.pointerId);
      this.captureJump();
      this.paint();
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      jumpButton.addEventListener(type, releaseJump as EventListener);

    window.addEventListener("keydown", (event) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        document.querySelector("dialog[open]")
      )
        return;
      if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) {
        event.preventDefault();
        this.togglePause();
      }
      if (
        !this.active() ||
        (!movementKeys.has(event.code) && !jumpKeys.has(event.code))
      )
        return;
      event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      this.captureJump();
      this.unlock();
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      this.captureJump();
    });
    window.addEventListener("blur", () => this.reset());
  }

  private captureJump() {
    const held =
      this.jumps.size > 0 ||
      [...this.keys].some((key) => jumpKeys.has(key)) ||
      this.padJump;
    if (held !== this.aggregateJump) {
      this.aggregateJump = held;
      this.jumpEdges.push(held);
    }
  }

  private move(event: PointerEvent) {
    const rect = this.movementPad.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const outside =
      event.clientY < rect.top - 55 || event.clientY > rect.bottom + 55;
    const direction = outside || Math.abs(x) < 7 ? 0 : x < 0 ? -1 : 1;
    // The most recently moved finger owns the axis; releasing it restores the other.
    this.movement.delete(event.pointerId);
    this.movement.set(event.pointerId, direction);
    this.paint();
  }

  private paint() {
    const direction = [...this.movement.values()].at(-1) ?? 0;
    this.movementPad.dataset.direction = String(direction);
    for (const button of this.movementPad.querySelectorAll<HTMLButtonElement>(
      "button",
    )) {
      const pressed = Number(button.dataset.direction) === direction;
      button.setAttribute("aria-pressed", String(pressed));
      button.classList.toggle("pressed", pressed);
    }
    this.jumpButton.classList.toggle("pressed", this.jumps.size > 0);
    this.jumpButton.setAttribute("aria-pressed", String(this.jumps.size > 0));
  }

  reset() {
    const movementIDs = [...this.movement.keys()];
    const jumpIDs = [...this.jumps];
    this.keys.clear();
    this.movement.clear();
    this.jumps.clear();
    this.jumpEdges = [];
    // Sample even if rendering stopped while the page was hidden.
    const pad = navigator.getGamepads?.().find((item) => item?.connected);
    this.padJump = !!pad?.buttons[0]?.pressed;
    this.padPause = !!pad?.buttons[9]?.pressed;
    this.aggregateJump = this.padJump;
    // Preserve gamepad edge state: a held button must be released before retriggering.
    for (const id of movementIDs) {
      if (this.movementPad.hasPointerCapture(id))
        this.movementPad.releasePointerCapture(id);
    }
    for (const id of jumpIDs) {
      if (this.jumpButton.hasPointerCapture(id))
        this.jumpButton.releasePointerCapture(id);
    }
    this.paint();
  }

  read(): GameInput {
    const pad = navigator.getGamepads?.().find((item) => item?.connected);
    const padJump = !!pad?.buttons[0]?.pressed;
    const padPause = !!pad?.buttons[9]?.pressed;
    if (padJump && !this.padJump) this.unlock();
    this.padJump = padJump;
    this.captureJump();
    if (padPause && !this.padPause) this.togglePause();
    this.padPause = padPause;
    let direction: Direction = 0;
    const axis = pad?.axes[0] ?? 0;
    if (axis < -0.22 || pad?.buttons[14]?.pressed) direction = -1;
    if (axis > 0.22 || pad?.buttons[15]?.pressed) direction = 1;
    for (const key of this.keys) direction = movementKeys.get(key) ?? direction;
    if (this.movement.size) direction = [...this.movement.values()].at(-1)!;
    const result = {
      left: direction === -1,
      right: direction === 1,
      jump:
        this.jumps.size > 0 ||
        [...this.keys].some((key) => jumpKeys.has(key)) ||
        padJump,
      jumpPressed: this.jumpEdges.includes(true),
      jumpEdges: this.jumpEdges,
    };
    this.jumpEdges = [];
    return result;
  }
}
