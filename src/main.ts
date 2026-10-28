import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./style.css";
import {
  Game,
  COINS_PER_LIFE,
  MAX_LIVES,
  STAR_POWER_DURATION,
} from "./game/engine";
import { levels } from "./game/levels";
import { Renderer } from "./game/renderer";
import { Controls } from "./controls";
import { AudioPlayer } from "./audio";
import { readSave, writeSave } from "./storage";

const paths = {
  leaf: '<path d="M19 4C8 2 3 7 5 14c7 3 13-1 14-10ZM4 20 14 9"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  left: '<path d="m14 5-7 7 7 7"/>',
  right: '<path d="m10 5 7 7-7 7"/>',
  jump: '<path d="M12 20V4m-7 7 7-7 7 7"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sound:
    '<path d="m11 5-6 4H2v6h3l6 4ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4ZM16 9l6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/>',
  flag: '<path d="M5 21V3m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
  pip: '<path d="M12 7V4m0 1C7 5 7 1 7 1s5-1 5 4Zm1 0c0-4 5-4 5-4s0 4-5 4Z"/><rect x="4" y="7" width="16" height="15" rx="7"/><path d="M9 13v2m6-2v2m-5 3q2 2 4 0"/>',
  diamond: '<path d="m5 4-4 6 11 12 11-12-4-6ZM1 10h22M5 4l7 18 7-18M5 4h14"/>',
};
const icon = (name: keyof typeof paths) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const save = readSave();
const audio = new AudioPlayer();
audio.enabled = save.sound;
let selected = 0;
let game = new Game(0);
type Mode = "title" | "playing" | "paused" | "won" | "lost";
let mode: Mode = "title";
let toastUntil = 0;
let helpReturn: HTMLElement | null = null;

$("#app").innerHTML = `
<main class="game-app" id="play" data-mode="title" data-theme="meadow">
  <div class="scene-wrap"><canvas id="game" width="960" height="540" tabindex="0" aria-label="Mosslight platformer. Move with arrow keys or A and D. Hold Space to jump higher. P pauses."></canvas></div>
  <header class="topbar">
    <button class="brand" aria-label="Choose a world">${icon("leaf")}<span>Mosslight<span class="brand-dot">.</span></span></button>
    <div class="world-location"><span class="world-number">01</span><span id="world-label">Sunlit Meadow</span></div>
    <div class="toolbar-actions"><button class="round-button sound-button" aria-label="Mute sound" title="Sound"></button><button class="round-button help-button" aria-label="How to play" title="How to play">${icon("help")}</button><button class="round-button" id="pause-button" aria-label="Pause game" title="Pause (P)">${icon("pause")}</button><button class="round-button" id="menu-button" aria-label="Game menu" title="Worlds and settings">${icon("menu")}</button></div>
  </header>
  <div class="hud" hidden>
    <div class="collectibles"><span class="hud-pill coin-meter" title="50 coins = an extra life, up to 3"><span class="seed-symbol" aria-hidden="true"></span><b id="coin-count">00</b><span id="coin-total">/ 50</span></span><span class="hud-pill stars-pill" title="Stars give 10 seconds of star power"><span class="star-symbol" aria-hidden="true">★</span><b id="star-count">0</b><span>/ 3</span></span></div>
    <div class="power-state hud-pill" data-form="small" data-powered="false"><span id="player-form">Small</span><b id="star-power" hidden></b></div>
    <div class="vitals"><span id="lives" aria-label="3 lives remaining">${icon("pip")}<span>× <b id="life-count">3</b></span><small>LIVES</small></span><span id="timer">00:00</span></div>
    <div class="trail-track" aria-label="Trail progress"><span></span></div>
  </div>
  <div id="overlay" class="game-overlay"></div>
  <div class="world-strip" id="world-strip" aria-label="Choose a world"></div>
  <div class="touch-controls" hidden>
    <div class="movement-control"><div class="touch-dpad" data-direction="0"><button data-control="left" data-direction="-1" aria-label="Move left" aria-pressed="false">${icon("left")}</button><span class="dpad-divider"></span><button data-control="right" data-direction="1" aria-label="Move right" aria-pressed="false">${icon("right")}</button></div><span class="control-caption">SLIDE TO MOVE</span></div>
    <div class="jump-control"><button class="touch-jump" data-control="jump" aria-label="Jump" aria-pressed="false">${icon("jump")}<span>JUMP</span></button><span class="control-caption">HOLD TO GO HIGHER</span></div>
  </div>
  <div class="checkpoint-toast" id="game-toast" role="status" hidden></div>
  <p class="rotate-tip">↻ Turn sideways for a bigger adventure</p>
  <div class="keyboard-hint"><span><kbd>←</kbd><kbd>→</kbd> move</span><span><kbd>SPACE</kbd> jump</span><span><kbd>P</kbd> pause</span></div>
</main>
<dialog id="menu-dialog" aria-labelledby="menu-title"><button class="round-button menu-close" aria-label="Close game menu">${icon("close")}</button><p class="eyebrow">THE SUNSEED TRAILS</p><h2 id="menu-title">Choose your adventure.</h2><p class="dialog-description">Three little worlds. A whole lot to discover.</p><div id="menu-worlds"></div><div class="menu-settings"><button class="menu-sound"></button><button class="menu-help">${icon("help")} Controls</button><span id="journey-progress"></span></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><button class="round-button dialog-close" aria-label="Close instructions">${icon("close")}</button><p class="eyebrow">MEET YOUR MOVES</p><h2 id="help-title">Little hero. Big leaps.</h2><div class="guide-grid"><div><span class="guide-symbol">↔</span><h3>Move & jump</h3><p>Slide your left thumb to steer. Tap jump for a short hop; hold for a higher leap. Keyboard: arrows or A/D, and Space. Gamepad: stick and A.</p></div><div><span class="guide-symbol diamond-guide">${icon("diamond")}</span><h3>Diamonds make you big</h3><p>Start small. Collect a diamond to grow. A bug hit shrinks big Pip; a hit while small costs a life. Jump on bugs to squash them.</p></div><div><span class="guide-symbol gold">★</span><h3>Star power</h3><p>A star gives ${STAR_POWER_DURATION} seconds of protection from bugs. Touch bugs to squash them while powered. Falling in a gap still costs a life.</p></div><div><span class="guide-symbol coral">${icon("pip")}</span><h3>Make every life count</h3><p>Start each trail with ${MAX_LIVES} lives. Every ${COINS_PER_LIFE} coins earns one life, up to ${MAX_LIVES}. Lost a life? Return small to your checkpoint. Zero lives ends the run.</p></div></div><button class="primary-button close-guide">Got it ${icon("arrow")}</button></dialog>
`;
const app = $(".game-app");
const canvas = $<HTMLCanvasElement>("#game");
const renderer = new Renderer(canvas);
const overlay = $("#overlay");
const hud = $(".hud");
const dialog = $<HTMLDialogElement>("#help-dialog");
const menuDialog = $<HTMLDialogElement>("#menu-dialog");
const controls = new Controls(
  $(".touch-dpad"),
  $(".touch-jump"),
  () => mode === "playing" && !dialog.open && !menuDialog.open,
  () => audio.unlock(),
  () => {
    if (dialog.open || menuDialog.open) return;
    if (mode === "playing") pause();
    else if (mode === "paused") resume();
  },
);
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

function worldArt(index: number) {
  const colors = [
    ["#83e1ee", "#e1f6bf", "#62cfa3", "#1c9d78"],
    ["#6768bb", "#c9b5f2", "#9687cf", "#5463a0"],
    ["#76c9ed", "#daf5e9", "#9ecbcd", "#4f9faf"],
  ][index];
  return `<svg class="world-art" viewBox="0 0 240 130" aria-hidden="true"><defs><linearGradient id="sky-${index}" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="240" height="130" rx="16" fill="url(#sky-${index})"/><circle cx="181" cy="34" r="18" fill="#fff5b6"/><path d="M0 87Q40 16 90 88Q138 40 191 81Q224 58 240 78V130H0" fill="${colors[2]}"/><path d="M0 112Q66 62 123 110Q178 71 240 101V130H0" fill="${colors[3]}"/><path d="M0 119Q74 112 133 119T240 119V130H0" fill="#207357"/><g fill="#fff" opacity=".8"><ellipse cx="50" cy="34" rx="24" ry="8"/><ellipse cx="59" cy="28" rx="14" ry="10"/></g><path d="m113 78 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#ffdb73"/></svg>`;
}
function updateWorlds() {
  $("#world-strip").innerHTML = levels
    .map(
      (level, i) =>
        `<button class="world-tab ${selected === i ? "selected" : ""}" data-world="${i}" aria-pressed="${selected === i}"><span class="tab-number">0${i + 1}</span><span><small>${selected === i ? "YOUR NEXT ADVENTURE" : "EXPLORE"}</small><strong>${level.name}</strong></span><span class="tab-stars" aria-label="${save.progress[i].stars} stars">${[0, 1, 2].map((n) => `<i class="${n < save.progress[i].stars ? "earned" : ""}">★</i>`).join("")}</span></button>`,
    )
    .join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-world]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        chooseWorld(Number(button.dataset.world)),
      ),
    );
  $("#menu-worlds").innerHTML = levels
    .map(
      (level, i) =>
        `<button class="menu-world ${selected === i ? "selected" : ""}" data-menu-world="${i}">${worldArt(i)}<span class="menu-world-info"><small>WORLD 0${i + 1}</small><strong>${level.name}</strong><span>${save.progress[i].completed ? "Trail completed" : ["A bright beginning", "Follow the fireflies", "Head for the clouds"][i]} <b>${"★".repeat(save.progress[i].stars)}${"☆".repeat(3 - save.progress[i].stars)}</b></span></span>${icon("arrow")}</button>`,
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
  $("#journey-progress").textContent =
    `${save.progress.filter((item) => item.completed).length} / 3 trails complete`;
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
function chooseWorld(index: number) {
  selected = index;
  game = new Game(index);
  mode = "title";
  toastUntil = 0;
  controls.reset();
  updateWorlds();
  updateUI();
}
function start() {
  game = new Game(selected);
  mode = "playing";
  toastUntil = 0;
  controls.reset();
  audio.unlock();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function pause() {
  if (mode !== "playing") return;
  mode = "paused";
  controls.reset();
  updateUI();
}
function resume() {
  mode = "playing";
  controls.reset();
  audio.unlock();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function finish() {
  mode = game.state === "won" ? "won" : "lost";
  if (mode === "won") {
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
  }
  controls.reset();
  updateUI();
}
function updateUI() {
  app.dataset.mode = mode;
  app.dataset.theme = game.level.theme;
  $("#world-label").textContent = game.level.name;
  $(".world-number").textContent = `0${selected + 1}`;
  hud.hidden = mode === "title";
  $(".touch-controls").hidden = mode !== "playing";
  $("#world-strip").hidden = mode !== "title";
  $("#pause-button").hidden =
    mode === "title" || mode === "won" || mode === "lost";
  $("#pause-button").innerHTML = icon(mode === "paused" ? "play" : "pause");
  $("#pause-button").setAttribute(
    "aria-label",
    mode === "paused" ? "Resume game" : "Pause game",
  );
  overlay.hidden = mode === "playing";
  if (mode === "playing") {
    overlay.innerHTML = "";
    updateHUD();
    return;
  }
  if (mode === "title") {
    overlay.innerHTML = `<div class="title-content"><p class="eyebrow"><span class="eyebrow-dot"></span> THE SUNSEED TRAILS</p><h1>A little hero.<br><span>A wild adventure.</span></h1><p class="title-description">Big leaps. Hidden treasures.<br>A bright new world around every bend.</p><button class="primary-button" id="start-button">${icon("play")}<span>Play ${game.level.name}</span></button><div class="title-footnote"><span>★</span> Find all 3 hidden stars</div></div><div class="hero-callout"><span>Hey, I’m Pip!</span><svg viewBox="0 0 70 50" aria-hidden="true"><path d="M5 5q42-6 48 32m-12-7 13 10 7-15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>`;
    $("#start-button").addEventListener("click", start);
  } else if (mode === "paused") {
    overlay.innerHTML = `<div class="result-panel"><span class="panel-badge">${icon("pause")}</span><p class="eyebrow">TAKE A BREATHER</p><h2>Adventure can wait.</h2><p>Ready when you are.</p><button class="primary-button" id="resume-button">${icon("play")} Keep exploring</button><div class="panel-links"><button id="restart-button">Restart trail</button><button id="home-button">Choose a world</button></div></div>`;
    $("#resume-button").addEventListener("click", resume);
    bindPanel();
  } else if (mode === "won") {
    overlay.innerHTML = `<div class="result-panel"><div class="result-stars" aria-label="${game.collectedStars} of 3 stars">${[0, 1, 2].map((i) => `<span class="${i < game.collectedStars ? "earned" : ""}">★</span>`).join("")}</div><p class="eyebrow">TRAIL COMPLETE!</p><h2>You brought the sunshine.</h2><div class="result-stats"><span><b>${game.collectedCoins}</b>sunseeds</span><span><b>${formatTime(game.elapsed)}</b>trail time</span></div><button class="primary-button" id="next-button">${selected < 2 ? "Next adventure" : "Play again"} ${icon("arrow")}</button><div class="panel-links"><button id="restart-button">Replay trail</button><button id="home-button">Choose a world</button></div></div>`;
    $("#next-button").addEventListener("click", () => {
      chooseWorld((selected + 1) % levels.length);
      start();
    });
    bindPanel();
  } else {
    overlay.innerHTML = `<div class="result-panel"><span class="panel-badge">${icon("pip")}</span><p class="eyebrow">OUT OF LIVES</p><h2>You’ve got this, Pip.</h2><p>Try again with ${MAX_LIVES} lives and a fresh trail.</p><button class="primary-button" id="retry-button">Try again ${icon("arrow")}</button><div class="panel-links"><button id="home-button">Choose a world</button></div></div>`;
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
function showMenu() {
  pause();
  controls.reset();
  menuDialog.showModal();
}
function showHelp() {
  helpReturn = document.activeElement as HTMLElement;
  pause();
  controls.reset();
  dialog.showModal();
}
function hideHelp() {
  dialog.close();
  helpReturn?.focus({ preventScroll: true });
}
$("#menu-button").addEventListener("click", showMenu);
$(".brand").addEventListener("click", showMenu);
$(".menu-close").addEventListener("click", () => menuDialog.close());
$(".menu-help").addEventListener("click", () => {
  menuDialog.close();
  showHelp();
});
$(".help-button").addEventListener("click", showHelp);
$(".dialog-close").addEventListener("click", hideHelp);
$(".close-guide").addEventListener("click", hideHelp);
function toggleSound() {
  audio.enabled = !audio.enabled;
  save.sound = audio.enabled;
  writeSave(save);
  audio.unlock();
  if (audio.enabled) audio.play("coin");
  updateSound();
}
$(".sound-button").addEventListener("click", toggleSound);
$(".menu-sound").addEventListener("click", toggleSound);
$("#pause-button").addEventListener("click", () =>
  mode === "paused" ? resume() : pause(),
);
window.addEventListener("blur", () => {
  controls.reset();
  pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    controls.reset();
    pause();
  }
});
window.addEventListener("keydown", (event) => {
  if (
    event.code === "Enter" &&
    event.target === canvas &&
    (mode === "title" || mode === "lost")
  )
    start();
});
const setText = (selector: string, value: string) => {
  const el = $(selector);
  if (el.textContent !== value) el.textContent = value;
};
let lastLives = -1;
let lastCoinProgress = -1;
let lastPowerSeconds = -1;
function updateHUD() {
  setText("#coin-count", String(game.coinsTowardLife).padStart(2, "0"));
  setText("#coin-total", `/ ${COINS_PER_LIFE}`);
  if (lastCoinProgress !== game.coinsTowardLife) {
    lastCoinProgress = game.coinsTowardLife;
    $(".coin-meter").setAttribute(
      "aria-label",
      `${game.coinsTowardLife} of ${COINS_PER_LIFE} coins toward an extra life`,
    );
  }
  setText("#star-count", String(game.collectedStars));
  setText("#timer", formatTime(game.elapsed));
  setText("#player-form", game.player.form === "big" ? "Big" : "Small");
  $(".power-state").dataset.form = game.player.form;
  const powerSeconds = Math.ceil(game.starPowerRemaining);
  if (lastPowerSeconds !== powerSeconds) {
    lastPowerSeconds = powerSeconds;
    const power = $("#star-power");
    power.hidden = powerSeconds === 0;
    power.dataset.seconds = String(powerSeconds);
    power.textContent = `★ ${powerSeconds}s`;
    power.setAttribute(
      "aria-label",
      `Star power: ${powerSeconds} seconds remaining`,
    );
    $(".power-state").dataset.powered = String(powerSeconds > 0);
    $(".power-state").dataset.expiring = String(
      powerSeconds > 0 && powerSeconds <= 3,
    );
  }
  if (lastLives !== game.lives) {
    lastLives = game.lives;
    setText("#life-count", String(game.lives));
    $("#lives").setAttribute("aria-label", `${game.lives} lives remaining`);
  }
  $(".trail-track span").style.transform =
    `scaleX(${Math.max(0, Math.min(1, game.player.x / game.level.goal.x))})`;
}
let last = performance.now();
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
function frame(now: number) {
  const delta = (now - last) / 1000;
  last = now;
  const input = controls.read();
  if (mode === "title" && input.jumpPressed && !dialog.open && !menuDialog.open)
    start();
  if (mode === "playing") {
    game.update(delta, input);
    for (const event of game.events) {
      audio.play(event);
      if (event === "life-lost") controls.reset();
    }
    // Important events win over a collectible picked up in the same frame.
    const messages: [string, string, keyof typeof paths][] = [
      [
        "life-lost",
        `Life lost · ${game.lives} ${game.lives === 1 ? "life" : "lives"} left`,
        "pip",
      ],
      ["shrink", "Back to small · find a diamond!", "diamond"],
      ["extra-life", "+1 life!", "pip"],
      ["grow", "Big Pip! One hit protected", "diamond"],
      ["star", `Star power! ${STAR_POWER_DURATION} seconds`, "leaf"],
      ["checkpoint", "Checkpoint reached!", "flag"],
      ["star-end", "Star power ended", "leaf"],
    ];
    const message = messages.find(([event]) => game.events.includes(event));
    if (message) {
      $("#game-toast").innerHTML =
        `${icon(message[2])}<span>${message[1]}</span>`;
      $("#game-toast").dataset.event = message[0];
      toastUntil = now + 2300;
    }
    updateHUD();
    if (game.state !== "playing") finish();
  }
  $(".checkpoint-toast").hidden = mode !== "playing" || now > toastUntil;
  renderer.render(
    game,
    reducedMotion && mode !== "playing" ? 0 : now / 1000,
    mode === "title",
  );
  requestAnimationFrame(frame);
}
updateWorlds();
updateSound();
updateUI();
requestAnimationFrame(frame);
