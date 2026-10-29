import "./minigames.css";
import {
  FALLING_GOAL,
  FALLING_HEIGHT,
  FALLING_WIDTH,
  FallingGarden,
  GardenMatch,
  type ShapeName,
} from "./minigames/core";

export type MiniGameKind = "matching" | "falling";
export type MiniGameResult =
  | { kind: "matching"; moves: number }
  | { kind: "falling"; score: number; lines: number };

const shapeLabels: Record<ShapeName, string> = {
  leaf: "leaf",
  sun: "sun",
  branch: "branch",
  flower: "flower",
  berry: "berry",
  seed: "seed",
  moon: "moon",
};

/** Open one activity. The caller pauses the adventure and restores focus on close. */
export function openMiniGame(
  kind: MiniGameKind,
  onClose: () => void,
  onResult?: (result: MiniGameResult) => void,
): void {
  const dialog = document.createElement("dialog");
  dialog.className = "garden-activity";
  dialog.setAttribute("aria-labelledby", "garden-activity-title");
  const title = kind === "matching" ? "Garden Match" : "Seed Stack";
  dialog.innerHTML = `<div class="garden-activity-inner">
    <header class="garden-activity-header"><div><span class="garden-activity-eyebrow">GROVE GAMES</span><h2 id="garden-activity-title">${title}</h2></div><button type="button" class="garden-activity-close" aria-label="Close activity">×</button></header>
    <div class="garden-activity-body"></div>
  </div>`;
  document.body.append(dialog);
  const body = dialog.querySelector<HTMLElement>(".garden-activity-body")!;
  const closeButton = dialog.querySelector<HTMLButtonElement>(
    ".garden-activity-close",
  )!;
  let closed = false;
  let mismatchTimer: number | undefined;
  let tickTimer: number | undefined;
  let keyHandler: ((event: KeyboardEvent) => void) | undefined;

  const close = () => {
    if (closed) return;
    closed = true;
    if (mismatchTimer !== undefined) clearTimeout(mismatchTimer);
    if (tickTimer !== undefined) clearInterval(tickTimer);
    if (keyHandler) window.removeEventListener("keydown", keyHandler, true);
    if (dialog.open) dialog.close();
    dialog.remove();
    onClose();
  };
  closeButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  if (kind === "matching") {
    let game = new GardenMatch();
    let reported = false;
    body.innerHTML = `<div class="garden-match-layout"><div class="garden-match-info"><p>Find the six matching pairs hiding in the garden.</p><p class="garden-activity-status" role="status" aria-live="polite"></p><button type="button" class="garden-activity-restart">New game</button></div><div class="garden-match-cards" aria-label="Matching cards"></div></div>`;
    const cards = body.querySelector<HTMLElement>(".garden-match-cards")!;
    const status = body.querySelector<HTMLElement>(".garden-activity-status")!;
    const render = (focus?: number) => {
      status.textContent = game.complete
        ? `Garden matched! ${game.moves} ${game.moves === 1 ? "turn" : "turns"}.`
        : `${game.matched.size / 2} of 6 pairs · ${game.moves} ${game.moves === 1 ? "turn" : "turns"}`;
      cards.innerHTML = game.cards
        .map((value, index) => {
          const matched = game.matched.has(index);
          const shown = matched || game.open.includes(index);
          return `<button type="button" class="garden-match-card ${shown ? "is-shown" : ""} ${matched ? "is-matched" : ""}" data-card="${index}" aria-label="${matched ? "Matched " + value : shown ? "Showing " + value : "Hidden card " + (index + 1)}" ${matched ? "disabled" : ""}>${shown ? value : "✿"}</button>`;
        })
        .join("");
      if (focus !== undefined)
        cards
          .querySelector<HTMLButtonElement>(`[data-card="${focus}"]`)
          ?.focus();
    };
    cards.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-card]",
      );
      if (!button) return;
      const index = Number(button.dataset.card);
      const result = game.reveal(index);
      if (result === "ignored") return;
      render(result === "match" ? undefined : index);
      if (game.complete && !reported) {
        reported = true;
        onResult?.({ kind: "matching", moves: game.moves });
      }
      if (result === "mismatch")
        mismatchTimer = window.setTimeout(() => {
          game.hideMismatch();
          render(index);
        }, 850);
    });
    body
      .querySelector<HTMLButtonElement>(".garden-activity-restart")!
      .addEventListener("click", () => {
        if (mismatchTimer !== undefined) clearTimeout(mismatchTimer);
        game = new GardenMatch();
        reported = false;
        render();
      });
    render();
  } else {
    let game = new FallingGarden();
    let reported = false;
    let paused = false;
    let elapsed = 0;
    let lastTick = performance.now();
    body.innerHTML = `<div class="garden-stack-layout"><div class="garden-stack-board" role="img" aria-label="Falling-block board"></div><div class="garden-stack-side"><p>Make complete rows. Clear ${FALLING_GOAL} to grow the garden!</p><p class="garden-activity-status" role="status" aria-live="polite"></p><p class="garden-stack-next"></p><div class="garden-stack-controls" aria-label="Block controls"><button type="button" data-action="left" aria-label="Move left">←</button><button type="button" data-action="rotate" aria-label="Rotate">↻</button><button type="button" data-action="right" aria-label="Move right">→</button><button type="button" data-action="down" aria-label="Move down">↓</button><button type="button" data-action="drop" aria-label="Drop piece">Drop</button></div><div class="garden-stack-actions"><button type="button" data-action="pause">Pause</button><button type="button" data-action="restart">New game</button></div><small>Keyboard: arrows to move, ↑ or X to rotate, Space to drop.</small></div></div>`;
    const board = body.querySelector<HTMLElement>(".garden-stack-board")!;
    const status = body.querySelector<HTMLElement>(".garden-activity-status")!;
    const nextLabel = body.querySelector<HTMLElement>(".garden-stack-next")!;
    const pauseButton = body.querySelector<HTMLButtonElement>(
      '[data-action="pause"]',
    )!;
    const reportResult = () => {
      if (game.state === "playing" || reported) return;
      reported = true;
      onResult?.({ kind: "falling", score: game.score, lines: game.lines });
    };
    const render = () => {
      const active = new Map(
        game
          .cells()
          .filter(([, y]) => y >= 0)
          .map(([x, y]) => [y * FALLING_WIDTH + x, game.piece.name]),
      );
      const cells: string[] = [];
      for (let y = 0; y < FALLING_HEIGHT; y++)
        for (let x = 0; x < FALLING_WIDTH; x++) {
          const cell =
            game.grid[y]![x] ??
            (game.state === "playing"
              ? active.get(y * FALLING_WIDTH + x)
              : null);
          cells.push(
            `<span class="garden-stack-cell ${cell ? `cell-${cell}` : ""}"></span>`,
          );
        }
      board.innerHTML = cells.join("");
      board.setAttribute(
        "aria-label",
        `Falling-block board. ${game.lines} of ${FALLING_GOAL} rows cleared.`,
      );
      status.textContent =
        game.state === "won"
          ? `Garden grown! ${game.score} points.`
          : game.state === "lost"
            ? `The stack reached the top. ${game.score} points.`
            : paused
              ? `Paused · ${game.lines}/${FALLING_GOAL} rows · ${game.score} points`
              : `${game.lines}/${FALLING_GOAL} rows · ${game.score} points`;
      nextLabel.textContent =
        game.state === "playing"
          ? `Next: ${shapeLabels[game.next]}`
          : "Try a new game!";
      pauseButton.textContent = paused ? "Resume" : "Pause";
      pauseButton.disabled = game.state !== "playing";
    };
    const act = (action: string) => {
      if (action === "restart") {
        game = new FallingGarden();
        reported = false;
        paused = false;
        elapsed = 0;
        lastTick = performance.now();
      } else if (action === "pause" && game.state === "playing") {
        paused = !paused;
        elapsed = 0;
        lastTick = performance.now();
      } else if (!paused && game.state === "playing") {
        if (action === "left") game.move(-1);
        else if (action === "right") game.move(1);
        else if (action === "rotate") game.rotate();
        else if (action === "down") game.step();
        else if (action === "drop") game.drop();
      }
      render();
      reportResult();
    };
    body.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-action]",
      );
      if (button) act(button.dataset.action!);
    });
    keyHandler = (event) => {
      if (!dialog.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      const action: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowDown: "down",
        ArrowUp: "rotate",
        x: "rotate",
        X: "rotate",
        " ": "drop",
        p: "pause",
        P: "pause",
      };
      if (action[event.key]) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (
          !event.repeat ||
          !["rotate", "drop", "pause"].includes(action[event.key]!)
        )
          act(action[event.key]!);
      }
    };
    window.addEventListener("keydown", keyHandler, true);
    tickTimer = window.setInterval(() => {
      const now = performance.now();
      if (paused || document.hidden || game.state !== "playing") {
        lastTick = now;
        return;
      }
      elapsed += Math.min(250, now - lastTick);
      lastTick = now;
      const delay = Math.max(450, 1050 - game.lines * 50);
      if (elapsed >= delay) {
        elapsed = 0;
        game.step();
        render();
        reportResult();
      }
    }, 100);
    render();
  }
  dialog.showModal();
  closeButton.focus();
}
