import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/space-mono/400.css";
import "./style.css";
import { Game } from "./game/engine";
import { levels } from "./game/levels";
import { Renderer } from "./game/renderer";
import { AudioPlayer } from "./audio";
import { readSave, writeSave } from "./storage";

const icons = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  sound:
    '<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6m0-6-6 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  leaf: '<path d="M19 4C8 2 3 7 5 14c7 3 13-1 14-10ZM4 20 14 9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
};
function icon(name: keyof typeof icons, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}
const seedIcon = '<span class="seed-icon" aria-hidden="true"></span>';
const starIcon = '<span class="star-icon" aria-hidden="true">✦</span>';
const save = readSave();
const audio = new AudioPlayer();
audio.enabled = save.sound;
const $ = <T extends HTMLElement = HTMLElement>(query: string) =>
  document.querySelector<T>(query)!;
let selected = 0;
let game = new Game(selected);
let mode: "title" | "playing" | "paused" | "won" | "lost" = "title";
let helpReturn: HTMLElement | null = null;
let lastOverlayMode = "";
let gamepadJump = false;
const input = { left: false, right: false, jump: false, jumpPressed: false };
const heldKeys = new Set<string>();
const touchHeld = new Map<number, string>();

$("#app").innerHTML = `
<div class="app-shell">
  <header class="header">
    <a class="brand" href="#" aria-label="Mosslight home"><img src="/icon.svg" alt="" /><span>mosslight<span class="brand-dot">.</span></span></a>
    <nav aria-label="Main navigation"><a class="nav-link active" href="#play">Play</a><a class="nav-link" href="#journey">The worlds</a><button class="nav-link help-button">How to play ${icon("arrow")}</button></nav>
    <div class="header-end"><span class="offline"><i></i> A little escape</span><button class="icon-button sound-button" aria-label="Mute sound" title="Toggle sound"></button></div>
  </header>
  <main>
    <section class="intro" aria-labelledby="page-title"><div><p class="eyebrow">SMALL HERO. WILD WORLD.</p><h1 id="page-title">Adventure grows here.</h1><p>A pocket-sized platformer with a little heart and a lot to explore.</p></div><div class="intro-badge"><span class="spark">✳</span><span>Take a breath.<br>Take a leap.</span></div></section>
    <section class="game-shell" id="play" aria-label="Mosslight platform game">
      <div class="game-toolbar"><div class="location"><span class="live-dot"></span><span id="world-label"></span><span class="location-divider">/</span><span class="world-sub">THE SUNSEED TRAIL</span></div><div class="toolbar-actions"><span class="best-label" id="best-label"></span><button class="icon-button" id="pause-button" aria-label="Pause game" title="Pause (P)">${icon("pause")}</button><button class="icon-button" id="menu-button" aria-label="Game menu" title="Worlds and settings">${icon("menu")}</button><button class="icon-button" id="fullscreen-button" aria-label="Enter full screen" title="Full screen">${icon("expand")}</button></div></div>
      <div class="game-viewport">
        <canvas id="game" width="960" height="540" tabindex="0" aria-label="Mosslight platformer. Move with arrow keys or A and D. Jump with Space, W or up. P pauses."></canvas>
        <div class="hud" hidden><div class="hud-left"><span class="hud-item">${seedIcon}<span id="coin-count">00</span><span class="hud-total" id="coin-total"></span></span><span class="hud-item">${starIcon}<span id="star-count">0</span><span class="hud-total">/ 3</span></span></div><div class="hud-right"><span id="health" aria-label="3 hearts">♥ ♥ ♥</span><span class="hud-time" id="timer">00:00</span></div></div>
        <div id="overlay" class="game-overlay"></div>
        <div class="touch-controls" hidden><div class="touch-dpad"><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button></div><button class="touch-jump" data-control="jump" aria-label="Jump">↑<span>JUMP</span></button></div>
        <span class="checkpoint-toast" role="status" hidden>⚑ A little place to begin again</span>
      </div>
      <div class="game-footer"><span><span class="footer-star">✧</span><span id="game-hint">Find the sunseeds. Follow your curiosity.</span></span><button class="help-button control-hint"><kbd>←</kbd><kbd>→</kbd><span>move</span><kbd>SPACE</kbd><span>jump</span><span class="help-circle">?</span></button></div>
    </section>
    <section class="journey" id="journey" aria-labelledby="journey-title"><div class="section-heading"><div><p class="eyebrow">ONE LITTLE HERO. THREE LITTLE WORLDS.</p><h2 id="journey-title">Choose your next wonder.</h2></div><span class="journey-progress" id="journey-progress">0 / 3 trails complete</span></div><div class="world-grid" id="world-grid"></div></section>
    <footer class="footer"><span>${icon("leaf")} A little joy, one jump at a time.</span><span>An original adventure by Mountaineer Apps<span class="footer-dot">·</span>v1.0</span></footer>
  </main>
</div>
<dialog id="help-dialog" aria-labelledby="help-title"><button class="icon-button dialog-close" aria-label="Close instructions">${icon("close")}</button><p class="eyebrow">YOUR POCKET FIELD GUIDE</p><h2 id="help-title">A few little pointers.</h2><p>Help Pip bring the light back. Gather sunseeds and find the glowing portal at the end of each trail.</p><div class="guide-grid"><div><span class="guide-symbol">↔</span><h3>Wander a little</h3><p>Use <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to move.</p></div><div><span class="guide-symbol">↑</span><h3>Take a leap</h3><p>Hold <kbd>SPACE</kbd>, <kbd>W</kbd> or <kbd>↑</kbd> for a higher jump.</p></div><div><span class="guide-symbol gold">✦</span><h3>Find the hidden light</h3><p>Collect three golden stars in every world. Jump on beetles to bounce.</p></div><div><span class="guide-symbol">⚑</span><h3>Make yourself at home</h3><p>Flags save your place during a run. You have three hearts to reach the portal.</p></div></div><p class="guide-note">On a touch screen, use the on-screen arrows and jump button. A connected gamepad works too. Press P or Esc to pause. Best scores stay on this device.</p><button class="primary-button close-guide">Let’s wander ${icon("arrow")}</button></dialog>
<dialog id="menu-dialog" aria-labelledby="menu-title"><button class="icon-button menu-close" aria-label="Close game menu">${icon("close")}</button><p class="eyebrow">A WORLD OF LITTLE POSSIBILITIES</p><h2 id="menu-title">Where shall we wander?</h2><div id="menu-worlds"></div><div class="menu-settings"><button class="menu-sound"></button><button class="menu-help">${icon("leaf")} How to play</button></div></dialog>
`;
const canvas = $<HTMLCanvasElement>("#game");
const renderer = new Renderer(canvas);
const overlay = $("#overlay");
const hud = $(".hud");
const dialog = $<HTMLDialogElement>("#help-dialog");
const menuDialog = $<HTMLDialogElement>("#menu-dialog");
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
function updateSound() {
  $(".sound-button").innerHTML = icon(audio.enabled ? "sound" : "muted");
  $(".sound-button").setAttribute(
    "aria-label",
    audio.enabled ? "Mute sound" : "Enable sound",
  );
  $(".sound-button").setAttribute("aria-pressed", String(audio.enabled));
  $(".menu-sound").innerHTML =
    `${icon(audio.enabled ? "sound" : "muted")} Sound ${audio.enabled ? "on" : "off"}`;
}
function worldArt(index: number) {
  const palettes = [
    ["#e1ebd5", "#b6cdb3", "#6a9680", "#e6bb60"],
    ["#e7dfe9", "#b2a7c1", "#726885", "#f2ca88"],
    ["#e4eaf0", "#bcced3", "#6e9498", "#ecbc64"],
  ];
  const [sky, far, near, sun] = palettes[index];
  return `<svg viewBox="0 0 180 110" class="world-art" role="img" aria-label="${["Green meadow with a golden sun", "Purple woodland under the moon", "Blue mountain peaks"][index]}"><rect width="180" height="110" fill="${sky}"/><circle cx="136" cy="30" r="15" fill="${sun}"/><path d="M0 79 22 56 42 62 68 27 103 65 128 52 180 81v29H0" fill="${far}"/><path d="M0 85 27 78 55 84 85 67 119 85 153 66 180 78v32H0" fill="${near}"/><path d="M0 98h180v12H0" fill="#365b4b"/><path d="M0 96h180v5H0" fill="#91af6f"/><path d="M25 79h8v17h-8zm-8-21h24v24H17zm5-10h15v14H22z" fill="${near}"/><path d="M109 83h12v15h-12zm2-4h8v5h-8z" fill="#d1e9a0"/><path d="M118 86h3v3h-3" fill="#25493e"/><path d="M145 84h4v5h-4zm-2 2h8v2h-8" fill="#f7d887"/>${index === 2 ? '<path d="m68 27-13 18 13-4 12 5z" fill="#f7f7ec"/>' : ""}</svg>`;
}
function updateWorlds() {
  $("#world-grid").innerHTML = levels
    .map((level, index) => {
      const p = save.progress[index];
      return `<button class="world-card ${selected === index ? "selected" : ""}" data-world="${index}" aria-pressed="${selected === index}">${worldArt(index)}<span class="world-info"><span class="world-kicker">WORLD 0${index + 1}<span class="world-status">${p.completed ? icon("check") : selected === index ? "SELECTED" : ""}</span></span><strong>${level.name}</strong><span class="world-description">${["A sunlit start to something good.", "A little magic after sundown.", "There’s wonder a little higher."][index]}</span><span class="world-stars" aria-label="${p.stars} of 3 stars collected">${[0, 1, 2].map((i) => `<span class="${p.stars > i ? "collected" : ""}">✦</span>`).join("")}<span class="world-action">${p.completed ? "Wander again" : selected === index ? "Ready to explore" : "Explore world"} ${icon("arrow")}</span></span></span></button>`;
    })
    .join("");
  $("#journey-progress").textContent =
    `${save.progress.filter((p) => p.completed).length} / 3 trails complete`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-world]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        chooseWorld(Number(button.dataset.world));
        $("#play").scrollIntoView({ behavior: "smooth", block: "center" });
      }),
    );
}
function showMenu() {
  if (mode === "playing") pause();
  $("#menu-worlds").innerHTML = levels
    .map(
      (level, i) =>
        `<button class="menu-world ${i === selected ? "selected" : ""}" data-menu-world="${i}">${worldArt(i)}<span><small>WORLD 0${i + 1}</small><strong>${level.name}</strong></span>${icon("arrow")}</button>`,
    )
    .join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-menu-world]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        menuDialog.close();
        chooseWorld(Number(button.dataset.menuWorld));
      }),
    );
  menuDialog.showModal();
}
function resetInput() {
  heldKeys.clear();
  touchHeld.clear();
  Object.assign(input, {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
  });
  gamepadJump = false;
}
function chooseWorld(index: number) {
  selected = index;
  game = new Game(index);
  mode = "title";
  resetInput();
  lastOverlayMode = "";
  updateWorlds();
  updateUI();
}
function start() {
  game = new Game(selected);
  mode = "playing";
  resetInput();
  audio.unlock();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function pause() {
  if (mode !== "playing") return;
  mode = "paused";
  resetInput();
  updateUI();
}
function resume() {
  mode = "playing";
  resetInput();
  audio.unlock();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function finish() {
  if (game.state === "won") {
    mode = "won";
    const previous = save.progress[selected];
    previous.completed = true;
    previous.stars = Math.max(previous.stars, game.collectedStars);
    previous.coins = Math.max(previous.coins, game.collectedCoins);
    previous.bestTime =
      previous.bestTime === null
        ? game.elapsed
        : Math.min(previous.bestTime, game.elapsed);
    writeSave(save);
    updateWorlds();
  } else mode = "lost";
  resetInput();
  updateUI();
}
function updateUI() {
  $("#world-label").textContent =
    `0${selected + 1}  ${game.level.name.toUpperCase()}`;
  const best = save.progress[selected].bestTime;
  $("#best-label").textContent =
    best === null ? "A NEW ADVENTURE" : `BEST ${formatTime(best)}`;
  hud.hidden = mode === "title";
  $(".touch-controls").hidden = mode !== "playing";
  $<HTMLButtonElement>("#pause-button").disabled =
    mode === "title" || mode === "won" || mode === "lost";
  $("#pause-button").setAttribute(
    "aria-label",
    mode === "paused" ? "Resume game" : "Pause game",
  );
  $("#game-hint").textContent =
    mode === "playing"
      ? "Hold jump a little longer to reach a little higher."
      : "Find the sunseeds. Follow your curiosity.";
  if (lastOverlayMode === mode) return;
  lastOverlayMode = mode;
  overlay.hidden = mode === "playing";
  overlay.className = `game-overlay ${mode === "title" ? "title-overlay" : "modal-overlay"}`;
  if (mode === "playing") {
    overlay.innerHTML = "";
    return;
  }
  if (mode === "title") {
    overlay.innerHTML = `<div class="title-content"><span class="adventure-tag"><span></span> YOUR NEXT LITTLE ADVENTURE</span><h2>Follow<br>the light<span>.</span></h2><p>A curious little sprout.<br>A world waiting to be discovered.</p><button class="primary-button" id="start-button">${save.progress[selected].completed ? "Wander again" : "Let’s wander"} ${icon("arrow")}</button><span class="title-note">No rush. Just a little wonder.</span></div><div class="meet-pip"><span>Meet Pip.</span><svg viewBox="0 0 80 45" aria-hidden="true"><path d="M70 5Q26 2 13 34m13-5-14 7-1-15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><div class="scene-label">${icon("leaf")} ${game.level.subtitle}</div>`;
    $("#start-button").addEventListener("click", start);
  } else if (mode === "paused") {
    overlay.innerHTML = `<div class="result-panel"><span class="result-symbol">☁</span><p class="eyebrow">A MOMENT TO BREATHE</p><h2>The world can wait.</h2><p>Your adventure will be right here.</p><button class="primary-button" id="resume-button">Keep wandering ${icon("arrow")}</button><div class="panel-links"><button id="restart-button">Start over</button><button id="home-button">Choose a world</button></div></div>`;
    $("#resume-button").addEventListener("click", resume);
    bindPanel();
  } else if (mode === "won") {
    overlay.innerHTML = `<div class="result-panel"><div class="result-stars" aria-label="${game.collectedStars} of 3 stars">${[0, 1, 2].map((i) => `<span class="${game.collectedStars > i ? "earned" : ""}">✦</span>`).join("")}</div><p class="eyebrow">A LITTLE LIGHT, RESTORED</p><h2>${selected === 2 ? "Look how far you’ve grown." : "Wonderfully wandered."}</h2><p>${game.level.name} is a little brighter because of you.</p><div class="result-stats"><span>${seedIcon}<b>${game.collectedCoins}</b> sunseeds</span><span><b>${formatTime(game.elapsed)}</b> trail time</span></div><button class="primary-button" id="next-button">${selected < 2 ? "On to the next wonder" : "Back to the beginning"} ${icon("arrow")}</button><div class="panel-links"><button id="restart-button">Explore again</button><button id="home-button">Choose a world</button></div></div>`;
    $("#next-button").addEventListener("click", () => {
      chooseWorld((selected + 1) % levels.length);
      start();
    });
    bindPanel();
  } else {
    overlay.innerHTML = `<div class="result-panel"><span class="result-symbol">☘</span><p class="eyebrow">EVERY SPROUT STARTS SOMEWHERE</p><h2>Another little leap?</h2><p>Some paths take a little practice.<br>There’s a whole world cheering you on.</p><button class="primary-button" id="retry-button">Try again ${icon("arrow")}</button><div class="panel-links"><button id="home-button">Choose a world</button></div></div>`;
    $("#retry-button").addEventListener("click", start);
    $("#home-button").addEventListener("click", showMenu);
  }
  if (mode !== "title")
    overlay.querySelector("button")?.focus({ preventScroll: true });
}
function bindPanel() {
  $("#restart-button").addEventListener("click", start);
  $("#home-button").addEventListener("click", showMenu);
}
function showHelp() {
  helpReturn = document.activeElement as HTMLElement;
  if (mode === "playing") pause();
  dialog.showModal();
}
function hideHelp() {
  dialog.close();
  helpReturn?.focus({ preventScroll: true });
}
$("#menu-button").addEventListener("click", showMenu);
$(".menu-close").addEventListener("click", () => menuDialog.close());
$(".menu-sound").addEventListener("click", () => $(".sound-button").click());
$(".menu-help").addEventListener("click", () => {
  menuDialog.close();
  showHelp();
});
$(".brand").addEventListener("click", (e) => {
  e.preventDefault();
  chooseWorld(selected);
});
$(".sound-button").addEventListener("click", () => {
  audio.enabled = !audio.enabled;
  save.sound = audio.enabled;
  writeSave(save);
  audio.unlock();
  if (audio.enabled) audio.play("coin");
  updateSound();
});
$("#pause-button").addEventListener("click", () =>
  mode === "paused" ? resume() : pause(),
);
document
  .querySelectorAll(".help-button")
  .forEach((button) => button.addEventListener("click", showHelp));
$(".dialog-close").addEventListener("click", hideHelp);
$(".close-guide").addEventListener("click", hideHelp);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      hideHelp();
  }
});
$("#fullscreen-button").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($("#play").requestFullscreen) await $("#play").requestFullscreen();
    else $("#play").classList.toggle("expanded");
  } catch {
    $("#play").classList.toggle("expanded");
  }
});
document.addEventListener("fullscreenchange", () => {
  $("#fullscreen-button").setAttribute(
    "aria-label",
    document.fullscreenElement ? "Exit full screen" : "Enter full screen",
  );
});
window.addEventListener("keydown", (event) => {
  if (
    dialog.open ||
    menuDialog.open ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  )
    return;
  if (
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "Space",
      "KeyA",
      "KeyD",
      "KeyW",
    ].includes(event.code)
  ) {
    if (mode !== "playing") return;
    event.preventDefault();
    if (
      !heldKeys.has(event.code) &&
      ["ArrowUp", "Space", "KeyW"].includes(event.code)
    )
      input.jumpPressed = true;
    heldKeys.add(event.code);
  }
  if (event.repeat) return;
  if (event.code === "KeyP" || event.code === "Escape") {
    event.preventDefault();
    if (mode === "playing") pause();
    else if (mode === "paused") resume();
  }
  if (event.code === "Enter" && event.target === canvas) {
    event.preventDefault();
    if (mode === "title" || mode === "lost") start();
  }
});
window.addEventListener("keyup", (event) => {
  heldKeys.delete(event.code);
});
window.addEventListener("blur", () => {
  resetInput();
  pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resetInput();
    pause();
  }
});
document
  .querySelectorAll<HTMLButtonElement>("[data-control]")
  .forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      const control = button.dataset.control!;
      touchHeld.set(event.pointerId, control);
      if (control === "jump") input.jumpPressed = true;
      button.classList.add("pressed");
      audio.unlock();
    });
    const release = (event: PointerEvent) => {
      touchHeld.delete(event.pointerId);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });
function readInput() {
  const touch = [...touchHeld.values()];
  const pad = navigator.getGamepads?.().find((p) => p !== null);
  const padJump = !!pad?.buttons[0]?.pressed;
  if (padJump && !gamepadJump) {
    input.jumpPressed = true;
    audio.unlock();
  }
  gamepadJump = padJump;
  input.left =
    heldKeys.has("ArrowLeft") ||
    heldKeys.has("KeyA") ||
    touch.includes("left") ||
    (pad?.axes[0] ?? 0) < -0.25 ||
    !!pad?.buttons[14]?.pressed;
  input.right =
    heldKeys.has("ArrowRight") ||
    heldKeys.has("KeyD") ||
    touch.includes("right") ||
    (pad?.axes[0] ?? 0) > 0.25 ||
    !!pad?.buttons[15]?.pressed;
  input.jump =
    heldKeys.has("Space") ||
    heldKeys.has("ArrowUp") ||
    heldKeys.has("KeyW") ||
    touch.includes("jump") ||
    padJump;
}
let last = performance.now();
let accumulator = 0;
let toastUntil = 0;
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
function frame(now: number) {
  const delta = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (mode === "playing") {
    readInput();
    accumulator += delta;
    while (accumulator >= 1 / 120) {
      game.update(1 / 120, input);
      input.jumpPressed = false;
      accumulator -= 1 / 120;
      for (const event of game.events) {
        audio.play(event);
        if (event === "checkpoint") toastUntil = now + 2800;
      }
      if (game.state !== "playing") {
        finish();
        break;
      }
    }
    $("#coin-count").textContent = String(game.collectedCoins).padStart(2, "0");
    $("#coin-total").textContent = `/ ${game.coins.length}`;
    $("#star-count").textContent = String(game.collectedStars);
    $("#health").innerHTML = Array.from(
      { length: 3 },
      (_, i) =>
        `<span class="${i < game.health ? "" : "empty-heart"}">♥</span>`,
    ).join(" ");
    $("#health").setAttribute("aria-label", `${game.health} hearts remaining`);
    $("#timer").textContent = formatTime(game.elapsed);
  } else accumulator = 0;
  $(".checkpoint-toast").hidden = mode !== "playing" || now > toastUntil;
  renderer.render(
    game,
    reducedMotion && mode !== "playing" ? 0 : now / 1000,
    mode === "title",
  );
  requestAnimationFrame(frame);
}
updateSound();
updateWorlds();
updateUI();
requestAnimationFrame(frame);
