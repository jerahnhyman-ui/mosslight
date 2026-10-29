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
import {
  levels,
  groveLevel,
  challengeLevels,
  beehiveLevel,
  flowerHoopsLevel,
} from "./game/levels";
import { AdventureSession } from "./game/session";
import { Renderer } from "./game/renderer";
import { Controls } from "./controls";
import { AudioPlayer } from "./audio";
import {
  DEFAULT_CONTROLS,
  SHOP_ITEMS,
  RunCoinLedger,
  challengeUnlocked,
  ownsItem,
  purchaseItem,
  recordGardenRun,
  recordChallenge,
  rescuedTotal,
  type PlayMode,
  readSave,
  recordFireflies,
  writeSave as persistSave,
  worldUnlocked,
  discoverFeather,
  discoverBeehive,
  completeBeehive,
  recordHoops,
  type Save,
} from "./storage";

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
  firefly:
    '<ellipse cx="12" cy="15" rx="4" ry="6"/><path d="M9 11C1 3 1 16 8 16m7-5c8-8 8 5 1 5M9 5l3 4 3-4"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  diamond: '<path d="m5 4-4 6 11 12 11-12-4-6ZM1 10h22M5 4l7 18 7-18M5 4h14"/>',
};
const icon = (name: keyof typeof paths) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const save = readSave();
const audio = new AudioPlayer();
audio.enabled = save.sound;
audio.musicEnabled = save.music;
audio.hapticsEnabled = save.haptics;
let selected = 0;
type RunKind = "world" | "grove" | "challenge" | "secret" | "minigame";
let runKind: RunKind = "world";
let coinLedger = new RunCoinLedger();
let session: AdventureSession | null = null;
const seenTutorials = new Set<string>();
const modeName = (value: PlayMode) =>
  ({ classic: "Classic", relaxed: "Relaxed", timed: "Timed" })[value];
function dressGame(next: Game) {
  next.outfit = save.outfit;
  next.groveDecorations = [...save.decorations];
  next.rescuedTotal = rescuedTotal(save);
}
function createGame(index: number) {
  const next = new Game(index, {
    mode:
      runKind === "challenge" || runKind === "minigame"
        ? "timed"
        : runKind === "grove"
          ? "relaxed"
          : save.playMode,
    ...(runKind === "grove"
      ? { level: groveLevel }
      : runKind === "challenge"
        ? { level: challengeLevels[index] }
        : runKind === "secret"
          ? { level: beehiveLevel }
          : runKind === "minigame"
            ? { level: flowerHoopsLevel }
            : {}),
  });
  if (runKind === "world") {
    for (const id of save.progress[index].fireflies) {
      if (next.fireflies[id]) next.fireflies[id].collected = true;
    }
    next.collectedFireflies = next.fireflies.filter(
      (fly) => fly.collected,
    ).length;
  }
  dressGame(next);
  return next;
}
let game = createGame(0);
type Mode = "title" | "playing" | "paused" | "won" | "lost";
let mode: Mode = "title";
let toastUntil = 0;
let helpReturn: HTMLElement | null = null;
let newBest = false;
let restoredAtStart = 0;

$("#app").innerHTML = `
<main class="game-app" id="play" data-mode="title" data-theme="meadow">
  <div class="scene-wrap"><canvas id="game" width="960" height="540" tabindex="0" aria-label="Mosslight platformer. Move with arrow keys or A and D. Hold Space to jump higher. P pauses."></canvas></div>
  <header class="topbar">
    <button class="brand" aria-label="Choose a world">${icon("leaf")}<span>Mosslight<span class="brand-dot">.</span></span></button>
    <div class="world-location"><span class="world-number">01</span><span id="world-label">Sunlit Meadow</span></div>
    <div class="toolbar-actions"><button class="round-button sound-button" aria-label="Mute sound effects" title="Sound effects"></button><button class="round-button help-button" aria-label="How to play" title="How to play">${icon("help")}</button><button class="round-button" id="pause-button" aria-label="Pause game" title="Pause (P)">${icon("pause")}</button><button class="round-button" id="menu-button" aria-label="Game menu" title="Worlds and settings">${icon("menu")}</button></div>
  </header>
  <div class="hud" hidden>
    <div class="collectibles"><span class="hud-pill coin-meter" title="50 coins = an extra life, up to 3"><span class="seed-symbol" aria-hidden="true"></span><b id="coin-count">00</b><span id="coin-total">/ 50</span></span><span class="hud-pill stars-pill fireflies-pill" title="Rescue three hidden fireflies to restore this world"><span class="firefly-symbol" aria-hidden="true">${icon("firefly")}</span><b id="star-count"><span id="firefly-count">0</span></b><span>/ 3</span></span></div>
    <div class="power-state hud-pill" data-form="small" data-powered="false"><span id="player-form">Small</span><b id="star-power" hidden></b><span id="feather-meter" hidden><span aria-hidden="true">➶</span><span class="feather-segments" aria-hidden="true">▰▰▰▰</span><small id="feather-label">Ready</small></span></div>
    <div class="vitals"><span id="lives" aria-label="3 lives remaining">${icon("pip")}<span>× <b id="life-count">3</b></span><small>LIVES</small></span><span id="timer">00:00</span></div>
    <div class="trail-track" aria-label="Trail progress"><span></span></div>
    <div class="section-status"><span id="section-name"></span><span id="checkpoint-count"></span><span id="run-mode"></span></div>
  </div>
  <div class="boss-hud" id="boss-hud" hidden aria-label="Garden guardian"><div><strong id="boss-name"></strong><span id="boss-health"></span></div><p id="boss-instruction"></p></div>
  <div class="flight-activity-hud" id="activity-hud" hidden><strong id="activity-score">0 points</strong><span id="activity-hoops">0 / 16 hoops</span><b id="activity-clock">60s</b></div>
  <div class="portal-prompt" id="portal-prompt" hidden></div>
  <div class="grove-actions" id="grove-actions" hidden><button id="grove-shop-button">${icon("leaf")} Make it home</button><button id="grove-petal-button" hidden>✿ Petal Post</button><button id="grove-worlds-button">World map ${icon("arrow")}</button></div>
  <div id="overlay" class="game-overlay"></div>
  <div class="world-strip" id="world-strip" aria-label="Choose a world"></div>
  <div class="touch-controls" hidden>
    <div class="movement-control"><div class="touch-dpad" data-direction="0"><button data-control="left" data-direction="-1" aria-label="Move left" aria-pressed="false">${icon("left")}</button><span class="dpad-divider"></span><button data-control="right" data-direction="1" aria-label="Move right" aria-pressed="false">${icon("right")}</button></div><span class="control-caption">SLIDE TO MOVE</span></div>
    <div class="jump-control"><button class="touch-jump" data-control="jump" aria-label="Jump" aria-pressed="false">${icon("jump")}<span>JUMP</span></button><span class="control-caption">HOLD TO GO HIGHER</span></div>
  </div>
  <div class="checkpoint-toast" id="game-toast" role="status" hidden></div>
  <p id="save-status" role="status" hidden>Progress is kept for this session. Device storage is unavailable.</p>
  <p class="rotate-tip">↻ Turn sideways for a bigger adventure</p>
  <div class="keyboard-hint"><span><kbd>←</kbd><kbd>→</kbd> move</span><span><kbd>SPACE</kbd> jump</span><span><kbd>P</kbd> pause</span></div>
</main>
<dialog id="menu-dialog" aria-labelledby="menu-title"><button class="round-button menu-close" aria-label="Close game menu">${icon("close")}</button><p class="eyebrow">THE FIREFLY TRAILS</p><h2 id="menu-title">Choose your adventure.</h2><p class="dialog-description">Rescue fireflies. Bring the forest back to light.</p><div id="forest-map" aria-label="Forest world map"><svg class="map-trails map-desktop" viewBox="0 0 680 255" preserveAspectRatio="none" aria-hidden="true"><path class="map-route" d="M110 145Q210 10 340 100T570 145"/><path class="map-route-light" d="M110 145Q210 10 340 100T570 145"/></svg><svg class="map-trails map-mobile" viewBox="0 0 320 480" preserveAspectRatio="none" aria-hidden="true"><path class="map-route" d="M95 80C280 40 290 230 230 240S30 290 95 400"/><path class="map-route-light" d="M95 80C280 40 290 230 230 240S30 290 95 400"/></svg><div class="map-decoration" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div id="menu-worlds"></div></div><div class="forest-progress"><div><strong id="restoration-count"></strong><span id="journey-progress"></span></div><div class="restoration-track"><span></span></div><p id="restoration-caption"></p></div><div class="adventure-choices"><div class="mode-choice"><label for="play-mode">Adventure mode</label><select id="play-mode"><option value="classic">Classic · 3 lives</option><option value="relaxed">Relaxed · unlimited retries</option><option value="timed">Timed · race your best</option></select><small id="mode-description"></small></div><button class="grove-entry" id="visit-grove">${icon("leaf")}<span><strong>Visit your home grove</strong><small id="grove-summary"></small></span>${icon("arrow")}</button></div><div class="journal-list" id="journal-list"></div><div class="challenge-list" id="challenge-list"></div><div class="menu-settings"><button class="menu-sound"></button><button class="menu-controls">${icon("settings")} Settings</button><button class="menu-help">${icon("help")} How to play</button></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><button class="round-button dialog-close" aria-label="Close instructions">${icon("close")}</button><p class="eyebrow">MEET YOUR MOVES</p><h2 id="help-title">Little hero. Big leaps.</h2><div class="guide-grid"><div><span class="guide-symbol">↔</span><h3>Move & jump</h3><p>Slide your left thumb to steer. Tap jump for a short hop; hold for a higher leap. Keyboard: arrows or A/D, and Space. Gamepad: stick and A. Make the touch controls your own in Settings.</p></div><div><span class="guide-symbol diamond-guide">${icon("diamond")}</span><h3>Grow & discover</h3><p>Diamonds make Pip big. Bump cracked blocks from below to break them and discover coin caches. A bug hit shrinks big Pip; a hit while small costs a life.</p></div><div><span class="guide-symbol gold">★</span><h3>Star power</h3><p>Stars give ${STAR_POWER_DURATION} seconds of protection from bugs. Touch bugs to squash them while powered. Falling in a gap still costs a life.</p></div><div><span class="guide-symbol">${icon("firefly")}</span><h3>Rescue the light</h3><p>Find three hidden fireflies in each world. Every rescue is saved, even if you lose your lives. Their light restores the forest and welcomes residents to your playable home grove. The first three worlds each have a challenge room unlocked by rescuing all three fireflies.</p></div><div><span class="guide-symbol coral">${icon("pip")}</span><h3>Make every life count</h3><p>Start with ${MAX_LIVES} lives. Every ${COINS_PER_LIFE} coins earns one life, up to ${MAX_LIVES}. A lost life returns small Pip to the latest checkpoint. Zero lives ends a Classic or Timed run. Relaxed mode gives unlimited checkpoint retries.</p></div><div><span class="guide-symbol">↑</span><h3>A living forest</h3><p>Mushrooms bounce, leaves carry you, and cloud bridges crumble after you land. Jump on beetles and grasshoppers to squash them. Charging beetles pause and flash before rushing—time your jump!</p></div><div><span class="guide-symbol">${icon("leaf")}</span><h3>Wake the garden</h3><p>Walk near sleeping flowers and curled leaves. Pip’s glow opens new footholds. Follow golden cracks, footprints, and moving grass to discover secrets.</p></div><div><span class="guide-symbol coral">${icon("pip")}</span><h3>Meet the guardians</h3><p>Watch each guardian’s warning and avoid the attack. When it rests, jump on its back. The first three guardians need three hits. The Mill Keeper needs six: dodge low sweeps, fly to its high vane, and land below high sweeps. A checkpoint sits before every arena.</p></div><div><span class="guide-symbol gold">${icon("leaf")}</span><h3>A home for your light</h3><p>Every collected coin is saved for outfits and grove decorations, even at full lives. Visit your home grove from the world map. Cosmetics never change Pip’s powers.</p></div><div><span class="guide-symbol">➶</span><h3>Take flight</h3><p>Find a Wind Feather. Jump, let go, then hold Jump again to rise. Let go to glide. Land briefly to refill. A lost life drops the feather; a free plant grows beside each Windmill checkpoint.</p></div><div><span class="guide-symbol">✿</span><h3>Turn the garden</h3><p>Jump onto marked handles to change wind, water and light. Follow their symbols to open paths. At a glowing portal, stand still and press Jump when its prompt appears. Discover the beehive to replay it from your journal.</p></div></div><button class="primary-button close-guide">Got it ${icon("arrow")}</button></dialog>
<dialog id="grove-dialog" aria-labelledby="grove-title"><button class="round-button" id="grove-close" aria-label="Close grove shop">${icon("close")}</button><p class="eyebrow">A LITTLE PLACE TO CALL HOME</p><h2 id="grove-title">Make the garden yours.</h2><p class="dialog-description">Your coins decorate the grove and dress Pip. Every rescue brings a new neighbor home.</p><div class="grove-wallet"><strong id="wallet-count"></strong><span id="lifetime-count"></span></div><div id="shop-items" class="shop-items"></div><p id="shop-status" role="status"></p><button class="primary-button" id="grove-done">Back to the grove ${icon("arrow")}</button></dialog>
<dialog id="settings-dialog" aria-labelledby="settings-title"><button class="round-button" id="settings-close" aria-label="Close settings">${icon("close")}</button><p class="eyebrow">PLAY YOUR WAY</p><h2 id="settings-title">Made for your thumbs.</h2><p class="dialog-description">Your choices stay saved. Controls fit safely within your screen.</p><div class="control-preview" aria-label="Touch control layout preview"><span class="preview-label">LAYOUT PREVIEW</span><div class="preview-pip">${icon("pip")}</div><div class="preview-controls"><span class="preview-dpad">${icon("left")}${icon("right")}</span><span class="preview-jump">${icon("jump")}</span></div></div><div class="control-settings"><label for="control-size"><span>Button size</span><select id="control-size"><option value="0.85">Compact</option><option value="1">Standard</option><option value="1.15">Large</option></select></label><label for="control-inset"><span>Move inward <output id="inset-value"></output></span><input id="control-inset" type="range" min="0" max="40" step="5" aria-label="Move controls inward" /></label><label for="control-height"><span>Move upward <output id="height-value"></output></span><input id="control-height" type="range" min="0" max="40" step="5" aria-label="Move controls upward" /></label><label class="switch-row" for="control-swap"><span>Jump on the left</span><input id="control-swap" type="checkbox" role="switch" /></label><button id="controls-reset" class="text-button">Reset control layout</button></div><div class="audio-settings"><label class="switch-row" for="sfx-toggle"><span>Sound effects</span><input id="sfx-toggle" type="checkbox" role="switch" /></label><label class="switch-row" for="music-toggle"><span>Music</span><input id="music-toggle" type="checkbox" role="switch" /></label><label class="switch-row" for="haptics-toggle"><span>Touch feedback<small>Gentle vibrations on supported devices</small></span><input id="haptics-toggle" type="checkbox" role="switch" /></label></div><button class="primary-button" id="settings-done">Done ${icon("arrow")}</button></dialog>
`;
const app = $(".game-app");
const canvas = $<HTMLCanvasElement>("#game");
const renderer = new Renderer(canvas);
const overlay = $("#overlay");
const hud = $(".hud");
const dialog = $<HTMLDialogElement>("#help-dialog");
const menuDialog = $<HTMLDialogElement>("#menu-dialog");
const settingsDialog = $<HTMLDialogElement>("#settings-dialog");
const groveDialog = $<HTMLDialogElement>("#grove-dialog");
const controls = new Controls(
  $(".touch-dpad"),
  $(".touch-jump"),
  () =>
    mode === "playing" &&
    !dialog.open &&
    !menuDialog.open &&
    !settingsDialog.open &&
    !groveDialog.open,
  () => audio.unlock(),
  () => {
    if (
      dialog.open ||
      menuDialog.open ||
      settingsDialog.open ||
      groveDialog.open
    )
      return;
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
    ["#95dce8", "#fff0b3", "#a1cf64", "#5aa56a"],
  ][index];
  return `<svg class="world-art" viewBox="0 0 240 130" aria-hidden="true"><defs><linearGradient id="sky-${index}" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="240" height="130" rx="16" fill="url(#sky-${index})"/><circle cx="181" cy="34" r="18" fill="#fff5b6"/><path d="M0 87Q40 16 90 88Q138 40 191 81Q224 58 240 78V130H0" fill="${colors[2]}"/><path d="M0 112Q66 62 123 110Q178 71 240 101V130H0" fill="${colors[3]}"/><path d="M0 119Q74 112 133 119T240 119V130H0" fill="#207357"/><g fill="#fff" opacity=".8"><ellipse cx="50" cy="34" rx="24" ry="8"/><ellipse cx="59" cy="28" rx="14" ry="10"/></g><path d="m113 78 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#ffdb73"/></svg>`;
}
function fireflyMarks(indices: number[]) {
  return [0, 1, 2]
    .map(
      (i) =>
        `<i class="${indices.includes(i) ? "earned" : ""}">${icon("firefly")}</i>`,
    )
    .join("");
}
function forestRestoration() {
  return (
    save.progress.reduce(
      (total, p) =>
        total +
        p.fireflies.length +
        Number(
          p.adventureCompleted ||
            Object.values(p.garden).some((r) => r.completed),
        ),
      0,
    ) /
    (levels.length * 4)
  );
}
function updateWorlds() {
  $("#world-strip").innerHTML = levels
    .map(
      (level, i) =>
        `<button class="world-tab ${selected === i ? "selected" : ""}" data-world="${i}" ${worldUnlocked(save, i) ? "" : "disabled"} aria-pressed="${selected === i}"><span class="tab-number">0${i + 1}</span><span><small>${!worldUnlocked(save, i) ? "BEAT MEADOW TO OPEN" : selected === i ? "YOUR NEXT ADVENTURE" : "EXPLORE"}</small><strong>${level.name}</strong></span><span class="tab-stars" aria-label="${save.progress[i].fireflies.length} of 3 fireflies rescued">${fireflyMarks(save.progress[i].fireflies)}</span></button>`,
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
    .map((level, i) => {
      const progress = save.progress[i];
      const completed = Object.values(progress.garden).some((r) => r.completed);
      const light =
        (progress.fireflies.length +
          Number(completed || progress.adventureCompleted)) /
        4;
      const record = progress.garden[save.playMode];
      const best =
        record.bestTime !== null
          ? `${modeName(save.playMode)} best ${formatTime(record.bestTime)}`
          : progress.adventureBestTime !== null
            ? `Previous trail ${formatTime(progress.adventureBestTime)}`
            : progress.bestTime !== null
              ? `Original trail ${formatTime(progress.bestTime)}`
              : "Meet this world’s guardian";
      return `<button class="menu-world ${selected === i ? "selected" : ""} ${light > 0 ? "restored" : ""}" data-menu-world="${i}" ${worldUnlocked(save, i) ? "" : "disabled"} data-light="${light}" style="--world-light:${light}" aria-label="${level.name}, ${progress.fireflies.length} of 3 fireflies rescued, ${completed ? "guardian defeated" : "explore trail"}"><span class="map-island">${worldArt(i)}<span class="map-node-number">${completed ? "✓" : `0${i + 1}`}</span></span><span class="menu-world-info"><strong>${level.name}</strong><span>${!worldUnlocked(save, i) ? "Beat the Meadow guardian to open" : completed ? "Guardian defeated" : ["Bouncing mushrooms", "Ride the leaves", "Brave the cloud bridges", "Take flight. Turn the garden."][i]}</span><span class="map-fireflies" aria-hidden="true">${fireflyMarks(progress.fireflies)}</span><small class="world-best">${best}</small></span></button>`;
    })
    .join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-menu-world]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        menuDialog.close();
        chooseWorld(Number(button.dataset.menuWorld));
      }),
    );
  const rescued = save.progress.reduce(
    (total, p) => total + p.fireflies.length,
    0,
  );
  const completed = save.progress.filter((p) =>
    Object.values(p.garden).some((r) => r.completed),
  ).length;
  const restoration = forestRestoration();
  $("#restoration-count").textContent =
    `${rescued} / ${levels.length * 3} fireflies home`;
  $("#journey-progress").textContent =
    `${completed} / ${levels.length} guardians defeated`;
  $(".restoration-track span").style.width = `${restoration * 100}%`;
  $("#forest-map").style.setProperty("--restored", String(restoration));
  $("#forest-map").dataset.restored = String(restoration);
  $("#restoration-caption").textContent =
    restoration === 1
      ? "Every trail is glowing. You brought the forest home."
      : rescued
        ? "Your rescued fireflies are lighting the way. Keep exploring!"
        : "Four garden adventures. Twelve tiny lights waiting to come home.";
  updateAdventureChoices();
  updateJournal();
}
function updateAdventureChoices() {
  $<HTMLSelectElement>("#play-mode").value = save.playMode;
  $("#mode-description").textContent =
    save.playMode === "relaxed"
      ? "Unlimited checkpoint retries. Your relaxed records stay separate."
      : save.playMode === "timed"
        ? "Three lives. Beat your best full adventure time."
        : "Three lives, generous checkpoints, and your own pace.";
  $("#grove-summary").textContent =
    `${rescuedTotal(save)} fireflies home · ${save.wallet} coins to spend`;
  $("#challenge-list").innerHTML =
    `<h3>Firefly challenge rooms</h3>` +
    challengeLevels
      .map((level, index) => {
        const unlocked = challengeUnlocked(save, index);
        const record = save.challenges[index];
        return `<button class="challenge-entry" data-challenge="${index}" ${unlocked ? "" : "disabled"}><span><strong>${level.name}</strong><small>${unlocked ? (record.completed ? `${record.medal} medal · best ${formatTime(record.bestTime ?? 0)}` : `Gold target ${formatTime(level.challengeTime ?? 30)}`) : `Rescue all 3 fireflies in ${levels[index].name} (${save.progress[index].fireflies.length}/3)`}</small></span><span aria-hidden="true">${unlocked ? "→" : "◇"}</span></button>`;
      })
      .join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-challenge]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const index = Number(button.dataset.challenge);
        if (!challengeUnlocked(save, index)) return;
        selected = index;
        runKind = "challenge";
        menuDialog.close();
        start();
        audio.play("unlock");
      }),
    );
}
function updateJournal() {
  const hive = save.secrets.beehive;
  const hoops = save.minigames.flowerHoops;
  $("#journal-list").innerHTML =
    `<h3>Pip’s discovery journal</h3><button class="challenge-entry" id="journal-hive" ${hive.discovered ? "" : "disabled"}><span><strong>Lantern Beehive</strong><small>${hive.discovered ? (hive.completed ? "Bee Scarf earned · replay the secret" : "Secret discovered · explore three honeycomb rooms") : "Follow the pollen clue in Windmill Garden"}</small></span><span>⌂</span></button><button class="challenge-entry" id="journal-hoops" ${save.unlocks.windFeatherDiscovered ? "" : "disabled"}><span><strong>Petal Post</strong><small>${save.unlocks.windFeatherDiscovered ? (hoops.best ? `${hoops.bestMedal === "none" ? "Practice" : hoops.bestMedal + " medal"} · best ${hoops.best.score} points` : "A little flight. Sixteen flower hoops.") : "Find a Wind Feather to open this activity"}</small></span><span>✿</span></button>`;
  $("#journal-hive").addEventListener("click", replayBeehive);
  $("#journal-hoops").addEventListener("click", playPetalPost);
  $("#grove-petal-button").hidden = !save.unlocks.windFeatherDiscovered;
}
function replayBeehive() {
  if (!save.secrets.beehive.discovered) return;
  session = null;
  runKind = "secret";
  menuDialog.close();
  groveDialog.close();
  start();
}
function playPetalPost() {
  if (!save.unlocks.windFeatherDiscovered) return;
  session = null;
  runKind = "minigame";
  menuDialog.close();
  groveDialog.close();
  start();
}
function changeScene(next: Game, kind: RunKind) {
  game = next;
  runKind = kind;
  dressGame(game);
  controls.reset();
  game.clearInput();
  seenTutorials.clear();
  toastUntil = 0;
  last = performance.now();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function returnFromBeehive() {
  if (session?.inSecret) changeScene(session.returnToWorld(), "world");
  else visitGrove();
}
function writeSave(value: Save) {
  $("#save-status").hidden = persistSave(value);
}
function visitGrove() {
  session = null;
  menuDialog.close();
  groveDialog.close();
  runKind = "grove";
  start();
}
function renderShop() {
  $("#wallet-count").textContent = `${save.wallet} coins`;
  $("#lifetime-count").textContent =
    `${save.lifetimeCoins} collected · ${rescuedTotal(save)} fireflies home`;
  $("#shop-items").innerHTML = SHOP_ITEMS.map((item) => {
    const owned = ownsItem(save, item);
    const locked =
      !owned && (Boolean(item.reward) || rescuedTotal(save) < item.fireflies);
    const affordable = save.wallet >= item.coins;
    const equipped = item.kind === "outfit" ? save.outfit === item.id : owned;
    const label = owned
      ? equipped
        ? item.kind === "outfit"
          ? "Wearing"
          : "In your grove"
        : "Wear outfit"
      : item.reward
        ? item.id === "cosmetic.bee_scarf"
          ? "Complete Lantern Beehive"
          : "Earn a Petal Post medal"
        : locked
          ? `${item.fireflies} fireflies needed`
          : `${item.coins} coins`;
    return `<article class="shop-item" data-item="${item.id}"><div class="shop-preview ${item.kind}" data-cosmetic="${item.id}" aria-hidden="true">${item.kind === "outfit" ? icon("pip") : item.id === "lanterns" ? icon("firefly") : item.id === "flowers" ? "✿" : "♧"}</div><div><small>${item.kind === "outfit" ? "PIP’S WARDROBE" : "HOME GROVE"}</small><h3>${item.name}</h3><p>${item.description}</p><button data-buy="${item.id}" ${equipped || (!owned && (locked || !affordable)) ? "disabled" : ""}>${label}</button>${!owned && !locked && !affordable ? `<span class="shop-shortfall">${item.coins - save.wallet} more coins</span>` : ""}</div></article>`;
  }).join("");
  document.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = SHOP_ITEMS.find((item) => item.id === button.dataset.buy)!;
      const result = purchaseItem(save, item.id);
      if (result === "purchased" || result === "equipped") {
        dressGame(game);
        writeSave(save);
        audio.unlock();
        audio.play(result === "purchased" ? "purchase" : "equip");
        $("#shop-status").textContent =
          item.kind === "outfit"
            ? `Pip is wearing ${item.name}.`
            : `${item.name} added to your grove.`;
        renderShop();
        updateAdventureChoices();
      }
    }),
  );
}
function showShop() {
  pause();
  controls.reset();
  $("#shop-status").textContent = "";
  renderShop();
  groveDialog.showModal();
}
function closeShop() {
  groveDialog.close();
  if (runKind === "grove" && mode === "paused") resume();
}
$("#visit-grove").addEventListener("click", visitGrove);
$("#grove-petal-button").addEventListener("click", playPetalPost);
$("#grove-shop-button").addEventListener("click", showShop);
$("#grove-worlds-button").addEventListener("click", showMenu);
$("#grove-close").addEventListener("click", closeShop);
$("#grove-done").addEventListener("click", closeShop);
$("#play-mode").addEventListener("change", () => {
  save.playMode = $<HTMLSelectElement>("#play-mode").value as PlayMode;
  writeSave(save);
  chooseWorld(selected);
});
function updateSound() {
  $(".sound-button").innerHTML = icon(audio.enabled ? "sound" : "muted");
  $(".sound-button").setAttribute(
    "aria-label",
    audio.enabled ? "Mute sound effects" : "Enable sound effects",
  );
  $(".sound-button").setAttribute("aria-pressed", String(audio.enabled));
  $(".menu-sound").innerHTML =
    `${icon(audio.enabled ? "sound" : "muted")} Effects ${audio.enabled ? "on" : "off"}`;
  $<HTMLInputElement>("#sfx-toggle").checked = audio.enabled;
  $<HTMLInputElement>("#music-toggle").checked = audio.musicEnabled;
  $<HTMLInputElement>("#haptics-toggle").checked = audio.hapticsEnabled;
}
function chooseWorld(index: number) {
  if (!worldUnlocked(save, index)) return;
  session = null;
  selected = index;
  runKind = "world";
  game = createGame(index);
  mode = "title";
  toastUntil = 0;
  controls.reset();
  updateWorlds();
  updateUI();
}
function start() {
  if (runKind === "secret" && session?.inSecret) runKind = "world";
  if (runKind === "world" && !worldUnlocked(save, selected)) return;
  if (runKind === "challenge" && !challengeUnlocked(save, selected)) return;
  game = createGame(selected);
  session = runKind === "world" ? new AdventureSession(game) : null;
  coinLedger = new RunCoinLedger();
  seenTutorials.clear();
  mode = "playing";
  newBest = false;
  lastLives = -1;
  lastCoinProgress = -1;
  lastPowerSeconds = -1;
  restoredAtStart = save.progress[selected].fireflies.length;
  toastUntil = 0;
  controls.reset();
  game.clearInput();
  last = performance.now();
  audio.unlock();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function pause() {
  if (mode !== "playing") return;
  mode = "paused";
  controls.reset();
  game.clearInput();
  updateUI();
}
function resume() {
  mode = "playing";
  controls.reset();
  game.clearInput();
  last = performance.now();
  audio.unlock();
  updateUI();
  canvas.focus({ preventScroll: true });
}
function saveRescuedFireflies() {
  if (runKind !== "world") return;
  const indices = game.fireflies.flatMap((fly, i) =>
    fly.collected ? [i] : [],
  );
  if (recordFireflies(save.progress[selected], indices)) {
    dressGame(game);
    writeSave(save);
    updateWorlds();
  }
}
function finish() {
  if (runKind === "minigame") {
    const result = game.minigame;
    newBest = recordHoops(save, {
      score: result.score,
      hoops: result.hoops.size,
      centered: result.centered,
      landings: result.pads.size,
      elapsed: game.elapsed,
      finished: result.complete,
    });
    writeSave(save);
    updateJournal();
    mode = "won";
    controls.reset();
    updateUI();
    return;
  }
  saveRescuedFireflies();
  mode = game.state === "won" ? "won" : "lost";
  if (mode === "won") {
    if (runKind === "challenge") {
      newBest = recordChallenge(
        save,
        selected,
        game.elapsed,
        game.level.challengeTime ?? 30,
      );
    } else if (runKind === "world") {
      newBest = recordGardenRun(save, selected, game.mode, game.elapsed);
      save.progress[selected].coins = Math.max(
        save.progress[selected].coins,
        game.collectedCoins,
      );
    }
    writeSave(save);
    updateWorlds();
  }
  controls.reset();
  updateUI();
}
function updateUI() {
  app.dataset.mode = mode;
  app.dataset.theme = game.level.theme;
  app.dataset.runKind = runKind;
  $("#grove-actions").hidden = runKind !== "grove" || mode !== "playing";
  $("#boss-hud").hidden = true;
  $("#activity-hud").hidden = runKind !== "minigame" || mode !== "playing";
  $("#portal-prompt").hidden = true;
  $("#world-label").textContent = game.level.name;
  $(".world-number").textContent =
    runKind === "grove"
      ? "⌂"
      : runKind === "secret"
        ? "✿"
        : runKind === "minigame"
          ? "➶"
          : `0${selected + 1}`;
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
    overlay.innerHTML = `<div class="title-content"><p class="eyebrow"><span class="eyebrow-dot"></span> THE SUNSEED TRAILS</p><h1>A little hero.<br><span>A wild adventure.</span></h1><p class="title-description">Wake a sleeping garden.<br>Bring its tiny lights back home.</p><button class="primary-button" id="start-button">${icon("play")}<span>Play ${game.level.name}</span></button><div class="title-footnote">${icon("firefly")} ${modeName(save.playMode)} · 3 fireflies · a garden guardian</div></div><div class="hero-callout"><span>Hey, I’m Pip!</span><svg viewBox="0 0 70 50" aria-hidden="true"><path d="M5 5q42-6 48 32m-12-7 13 10 7-15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>`;
    $("#start-button").addEventListener("click", start);
  } else if (mode === "paused") {
    overlay.innerHTML = `<div class="result-panel"><span class="panel-badge">${icon("pause")}</span><p class="eyebrow">TAKE A BREATHER</p><h2>Adventure can wait.</h2><p>Ready when you are.</p><button class="primary-button" id="resume-button">${icon("play")} Keep exploring</button><div class="panel-links"><button id="restart-button">${runKind === "grove" ? "Return to grove entrance" : runKind === "minigame" ? "Restart flight" : session?.inSecret ? "Restart whole adventure" : "Restart adventure"}</button><button id="home-button">Choose a world</button></div></div>`;
    $("#resume-button").addEventListener("click", resume);
    bindPanel();
    if (runKind === "secret") {
      const leave = document.createElement("button");
      leave.textContent = session?.inSecret
        ? "Return to Windmill Garden"
        : "Back to Grove";
      leave.addEventListener("click", () => {
        mode = "playing";
        returnFromBeehive();
      });
      $(".panel-links").append(leave);
    }
  } else if (mode === "won" && runKind === "minigame") {
    const result = game.minigame;
    const record = save.minigames.flowerHoops;
    overlay.innerHTML = `<div class="result-panel petal-results"><span class="challenge-medal" data-medal="${result.medal}">✿</span><p class="eyebrow">${result.medal === "none" ? "PRACTICE FLIGHT" : result.medal.toUpperCase() + " MEDAL"}</p><h2>${result.complete ? "A lovely little flight." : "Every flight gets better."}</h2><p>${result.medal === "none" ? "Reach 800 points to earn your first medal." : "Your Pinwheel Garland is waiting in Home Grove."}</p><div class="result-stats"><span><b>${result.score}</b>${newBest ? "New best!" : "points"}</span><span><b>${result.hoops.size}/16</b>hoops</span><span><b>${formatTime(game.elapsed)}</b>${result.complete ? "finish time" : "time up"}</span></div><p>${result.centered} centered · ${result.pads.size} soft landings · best ${record.best?.score ?? 0}</p><button class="primary-button" id="petal-retry">Fly again ${icon("arrow")}</button><div class="panel-links"><button id="petal-grove">Back to Grove</button><button id="petal-menu">Discovery journal</button></div></div>`;
    $("#petal-retry").addEventListener("click", playPetalPost);
    $("#petal-grove").addEventListener("click", visitGrove);
    $("#petal-menu").addEventListener("click", showMenu);
  } else if (mode === "won") {
    const rescued = save.progress[selected].fireflies;
    const isChallenge = runKind === "challenge";
    const record = isChallenge
      ? save.challenges[selected]
      : save.progress[selected].garden[game.mode];
    const medal = save.challenges[selected]?.medal ?? "none";
    overlay.innerHTML = `<div class="result-panel"><div class="result-stars result-fireflies" aria-label="${isChallenge ? `${medal} challenge medal` : `${rescued.length} of 3 fireflies rescued`}">${isChallenge ? `<span class="challenge-medal" data-medal="${medal}">★</span>` : fireflyMarks(rescued)}</div><p class="eyebrow">${isChallenge ? `${medal.toUpperCase()} MEDAL` : `${modeName(game.mode).toUpperCase()} · GARDEN RESTORED`}</p><h2>${isChallenge ? "A little leap. A big finish." : "You woke the garden."}</h2><p class="result-light">${isChallenge ? `Gold target ${formatTime(game.level.challengeTime ?? 30)} · every finish earns a medal.` : rescued.length - restoredAtStart > 0 ? `${rescued.length - restoredAtStart} new fireflies found their way home.` : "The guardian is resting. The path is yours."}</p><div class="result-stats"><span><b>${game.collectedCoins}</b>coins saved</span><span><b>${formatTime(game.elapsed)}</b>${newBest ? "New personal best!" : "adventure time"}</span><span><b>${formatTime(record.bestTime ?? game.elapsed)}</b>${isChallenge ? "challenge best" : `${modeName(game.mode)} best`}</span></div><button class="primary-button" id="next-button">${isChallenge ? "Try for a faster time" : selected < levels.length - 1 ? "Next adventure" : "Visit home grove"} ${icon("arrow")}</button><div class="panel-links"><button id="restart-button">Play again</button><button id="home-button">World map</button></div></div>`;
    $("#next-button").addEventListener("click", () => {
      if (isChallenge) start();
      else if (selected === levels.length - 1) visitGrove();
      else {
        chooseWorld(selected + 1);
        start();
      }
    });
    bindPanel();
  } else {
    overlay.innerHTML = `<div class="result-panel"><span class="panel-badge">${icon("pip")}</span><p class="eyebrow">OUT OF LIVES</p><h2>You’ve got this, Pip.</h2><p>Try again with ${MAX_LIVES} lives. Your coins and rescued fireflies are safe at home.</p><button class="primary-button" id="retry-button">Try again ${icon("arrow")}</button><div class="panel-links"><button id="home-button">Choose a world</button></div></div>`;
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
  groveDialog.close();
  pause();
  controls.reset();
  updateWorlds();
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
$(".menu-controls").addEventListener("click", () => {
  menuDialog.close();
  pause();
  controls.reset();
  syncSettings();
  settingsDialog.showModal();
});
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
  audio.suspend();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    controls.reset();
    pause();
    audio.suspend();
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
  const rescued =
    runKind === "world"
      ? save.progress[selected].fireflies.length
      : rescuedTotal(save);
  $(".fireflies-pill").hidden = runKind !== "world";
  setText("#firefly-count", String(rescued));
  $(".fireflies-pill").setAttribute(
    "aria-label",
    `${rescued} of 3 hidden fireflies rescued`,
  );
  const sectionIndex = Math.max(
    0,
    game.level.sections.reduce(
      (index, section, i) => (game.player.x >= section.x ? i : index),
      0,
    ),
  );
  setText(
    "#section-name",
    `${sectionIndex + 1} / ${game.level.sections.length} · ${game.level.sections[sectionIndex].name}`,
  );
  setText(
    "#checkpoint-count",
    `${game.activeCheckpointIndex + 1} / ${game.level.checkpoints.length} checkpoints`,
  );
  setText(
    "#run-mode",
    runKind === "grove"
      ? `${rescuedTotal(save)} neighbors home`
      : runKind === "challenge"
        ? `Time Trial · Gold ${formatTime(game.level.challengeTime ?? 30)}`
        : runKind === "minigame"
          ? "Petal Post · one minute to fly"
          : runKind === "secret"
            ? "Lantern Beehive"
            : modeName(game.mode),
  );
  setText("#timer", formatTime(game.elapsed));
  $("#activity-hud").hidden = runKind !== "minigame" || mode !== "playing";
  if (runKind === "minigame") {
    setText("#activity-score", `${game.minigame.score} points`);
    setText("#activity-hoops", `${game.minigame.hoops.size} / 16 hoops`);
    setText(
      "#activity-clock",
      game.countdown > 0
        ? String(Math.ceil(game.countdown))
        : `${Math.max(0, Math.ceil(60 - game.elapsed))}s`,
    );
  }
  $(".coin-meter").hidden = runKind === "minigame" || runKind === "grove";
  $(".vitals").hidden = runKind === "minigame";
  $("#portal-prompt").hidden = !game.portalReady || mode !== "playing";
  if (game.portalReady)
    setText(
      "#portal-prompt",
      game.portalReady === "beehive"
        ? "Jump to enter Lantern Beehive"
        : "Jump to return to the garden",
    );
  $("#feather-meter").hidden = !game.hasWindFeather;
  if (game.hasWindFeather) {
    const charge = Math.max(
      0,
      Math.min(4, Math.ceil((game.liftRemaining / 1.2) * 4)),
    );
    setText(".feather-segments", "▰".repeat(charge) + "▱".repeat(4 - charge));
    setText(
      "#feather-label",
      game.liftActive
        ? "Rise"
        : game.glideArmed
          ? "Glide"
          : charge === 0
            ? "Land to refill"
            : "Ready",
    );
    $("#feather-meter").setAttribute(
      "aria-label",
      `Wind Feather: ${charge} of 4 charge segments`,
    );
  }
  setText(
    ".jump-control .control-caption",
    game.hasWindFeather ? "RELEASE · HOLD TO FLY" : "HOLD TO GO HIGHER",
  );
  const boss = game.boss;
  const bossVisible =
    !!boss &&
    boss.state !== "dormant" &&
    boss.state !== "defeated" &&
    mode === "playing";
  $("#boss-hud").hidden = !bossVisible;
  if (boss && bossVisible) {
    $("#boss-hud").dataset.state = boss.state;
    setText("#boss-name", `${boss.name} · Phase ${boss.phase}`);
    setText(
      "#boss-health",
      "●".repeat(boss.health) + "○".repeat(boss.maxHealth - boss.health),
    );
    $("#boss-health").setAttribute(
      "aria-label",
      `${boss.health} of ${boss.maxHealth} health`,
    );
    setText(
      "#boss-instruction",
      boss.kind === "millkeeper"
        ? boss.state === "recover"
          ? "Sails folded. Land on its back!"
          : boss.millState === "highWarning" || boss.millState === "highSweep"
            ? "Steer off the pad. Land below the high sweep."
            : boss.millState === "vaneOpen" || boss.millState === "vaneWarning"
              ? "Jump, release, hold again. Reach the feather vane!"
              : boss.millState === "transition"
                ? "The sails are changing. Find your footing."
                : "Low sweep. Jump over it!"
        : boss.state === "warning"
          ? boss.kind === "stag"
            ? "A charge is coming — get ready to jump!"
            : boss.kind === "spider"
              ? "Watch the web — keep moving!"
              : "A gust is coming — find your footing!"
          : boss.state === "recover"
            ? "Now! Jump on the guardian’s back!"
            : "Stay clear and wait for an opening",
    );
  }
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
    setText("#life-count", game.mode === "relaxed" ? "∞" : String(game.lives));
    $("#lives").setAttribute(
      "aria-label",
      game.mode === "relaxed"
        ? "Unlimited checkpoint retries"
        : `${game.lives} lives remaining`,
    );
  }
  $(".trail-track span").style.transform =
    `scaleX(${Math.max(0, Math.min(1, game.player.x / game.level.goal.x))})`;
}
function updateToastPlacement() {
  const status = $(".section-status").getBoundingClientRect();
  app.style.setProperty(
    "--section-bottom",
    `${Math.ceil(status.bottom - app.getBoundingClientRect().top + 8)}px`,
  );
  const pad = $(".touch-dpad").getBoundingClientRect();
  const jump = $(".touch-jump").getBoundingClientRect();
  if (!pad.width || !jump.width) return;
  // Use the actual button tops, including caption/gap layout and safe-area fitting.
  // A wrapped tutorial can be taller than ordinary feedback; its bottom must stay
  // above both controls regardless of the message height.
  app.style.setProperty(
    "--toast-control-clearance",
    `${Math.ceil(app.getBoundingClientRect().bottom - Math.min(pad.top, jump.top) + 12)}px`,
  );
  const left = pad.x < jump.x ? pad : jump;
  const right = pad.x < jump.x ? jump : pad;
  app.dataset.toastPosition =
    right.left - left.right < 180 ? "above" : "between";
}
const controlObserver = new ResizeObserver(updateToastPlacement);
controlObserver.observe(app);
controlObserver.observe($(".section-status"));
controlObserver.observe($(".touch-dpad"));
controlObserver.observe($(".touch-jump"));
function applyControlLayout() {
  const { size, inset, height, swapped } = save.controls;
  document.documentElement.style.setProperty("--control-scale", String(size));
  document.documentElement.style.setProperty("--control-inset", `${inset}px`);
  document.documentElement.style.setProperty("--control-height", `${height}px`);
  app.dataset.controlsSwapped = String(swapped);
  $(".control-preview").dataset.swapped = String(swapped);
  $("#inset-value").textContent = `${inset}px`;
  $("#height-value").textContent = `${height}px`;
  requestAnimationFrame(updateToastPlacement);
}
function syncSettings() {
  $<HTMLSelectElement>("#control-size").value = String(save.controls.size);
  $<HTMLInputElement>("#control-inset").value = String(save.controls.inset);
  $<HTMLInputElement>("#control-height").value = String(save.controls.height);
  $<HTMLInputElement>("#control-swap").checked = save.controls.swapped;
  applyControlLayout();
  updateSound();
}
function saveControlLayout() {
  controls.reset();
  save.controls = {
    size: Number($<HTMLSelectElement>("#control-size").value) as
      | 0.85
      | 1
      | 1.15,
    inset: Number($<HTMLInputElement>("#control-inset").value),
    height: Number($<HTMLInputElement>("#control-height").value),
    swapped: $<HTMLInputElement>("#control-swap").checked,
  };
  applyControlLayout();
  writeSave(save);
}
for (const selector of [
  "#control-size",
  "#control-inset",
  "#control-height",
  "#control-swap",
]) {
  $(selector).addEventListener("input", saveControlLayout);
}
$("#controls-reset").addEventListener("click", () => {
  save.controls = { ...DEFAULT_CONTROLS };
  controls.reset();
  syncSettings();
  writeSave(save);
});
for (const selector of ["#sfx-toggle", "#music-toggle", "#haptics-toggle"]) {
  $(selector).addEventListener("change", () => {
    audio.enabled = save.sound = $<HTMLInputElement>("#sfx-toggle").checked;
    audio.musicEnabled = save.music =
      $<HTMLInputElement>("#music-toggle").checked;
    audio.hapticsEnabled = save.haptics =
      $<HTMLInputElement>("#haptics-toggle").checked;
    audio.unlock();
    if (selector === "#haptics-toggle" && audio.hapticsEnabled)
      audio.play("checkpoint");
    writeSave(save);
    updateSound();
  });
}
function closeSettings() {
  settingsDialog.close();
  $("#menu-button").focus({ preventScroll: true });
}
$("#settings-close").addEventListener("click", closeSettings);
$("#settings-done").addEventListener("click", closeSettings);
let last = performance.now();
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
function frame(now: number) {
  let delta = (now - last) / 1000;
  last = now;
  let input = controls.read();
  if (
    mode === "title" &&
    input.jumpPressed &&
    !dialog.open &&
    !menuDialog.open &&
    !settingsDialog.open &&
    !groveDialog.open
  ) {
    start();
    delta = 0;
    input = controls.read();
  }
  if (mode === "playing") {
    game.update(delta, input);
    if (
      runKind !== "grove" &&
      runKind !== "minigame" &&
      coinLedger.collect(save, game.collectedCoins)
    )
      writeSave(save);
    if (game.events.includes("firefly")) saveRescuedFireflies();
    let discoveryChanged = false;
    if (runKind !== "minigame" && game.events.includes("feather"))
      discoveryChanged = discoverFeather(save) || discoveryChanged;
    if (game.events.includes("hive-discovered"))
      discoveryChanged = discoverBeehive(save) || discoveryChanged;
    if (game.events.includes("secret-complete"))
      discoveryChanged = completeBeehive(save) || discoveryChanged;
    if (discoveryChanged) {
      writeSave(save);
      updateJournal();
      dressGame(game);
    }
    for (const event of game.events) {
      audio.play(event);
      if (event === "life-lost") controls.reset();
    }
    // Important events win over a collectible picked up in the same frame.
    const messages: [string, string, keyof typeof paths][] = [
      [
        "life-lost",
        `Try again · ${game.mode === "relaxed" ? "unlimited checkpoint retries" : `${game.lives} ${game.lives === 1 ? "life" : "lives"} left`}`,
        "pip",
      ],
      ["shrink", "Back to small · find a diamond!", "diamond"],
      ["extra-life", "+1 life!", "pip"],
      ["grow", "Big Pip! One hit protected", "diamond"],
      ["star", `Star power! ${STAR_POWER_DURATION} seconds`, "leaf"],
      [
        "firefly",
        `Firefly rescued · ${save.progress[selected].fireflies.length} / 3 home`,
        "firefly",
      ],
      [
        "checkpoint",
        `Checkpoint ${game.activeCheckpointIndex + 1} reached!`,
        "flag",
      ],
      ["boss-defeat", "Guardian resting · the garden is awake!", "leaf"],
      ["boss-hit", "A perfect opening!", "pip"],
      ["boss-start", "Watch the warning. Jump when the guardian rests!", "pip"],
      ["awaken", "Your glow woke a new path!", "leaf"],
      ["enemy-break", "A beetle opened a secret route!", "diamond"],
      ["break", "A hidden coin cache!", "diamond"],
      ["star-end", "Star power ended", "leaf"],
      [
        "feather",
        "Wind Feather! Jump, release, then hold again to rise.",
        "leaf",
      ],
      ["feather-empty", "Lift used up. Glide to a landing to refill.", "leaf"],
      [
        "hive-discovered",
        "Lantern Beehive discovered! Saved in your journal.",
        "leaf",
      ],
      [
        "secret-complete",
        "Bee Scarf earned! Return through the glowing flower.",
        "leaf",
      ],
      ["mechanism", "Follow the wind, water and light.", "leaf"],
    ];
    const message = messages.find(([event]) => game.events.includes(event));
    if (message) {
      $("#game-toast").innerHTML =
        `${icon(message[2])}<span>${message[1]}</span>`;
      $("#game-toast").dataset.event = message[0];
      toastUntil = now + 2300;
    }
    if (!message && now > toastUntil) {
      const tutorialIndex =
        game.level.tutorials?.findIndex(
          (tip, index) =>
            !seenTutorials.has(
              `${game.level.contentId ?? game.level.id}:${index}`,
            ) &&
            game.player.x >= tip.x &&
            game.player.x < tip.x + 260,
        ) ?? -1;
      if (tutorialIndex >= 0) {
        seenTutorials.add(
          `${game.level.contentId ?? game.level.id}:${tutorialIndex}`,
        );
        $("#game-toast").innerHTML = `${icon("leaf")}<span></span>`;
        $("#game-toast span").textContent =
          game.level.tutorials![tutorialIndex].text;
        $("#game-toast").dataset.event = "tutorial";
        toastUntil = now + 4500;
      }
    }
    updateHUD();
    if (game.state !== "playing" || game.minigame.finished) finish();
    else if (game.requestedPortal === "beehive" && session)
      changeScene(session.enterBeehive(), "secret");
    else if (game.requestedPortal === "return") returnFromBeehive();
  }
  $(".checkpoint-toast").hidden = mode !== "playing" || now > toastUntil;
  audio.setMusic(
    game.level.theme,
    mode === "playing" &&
      !document.hidden &&
      !dialog.open &&
      !menuDialog.open &&
      !settingsDialog.open &&
      !groveDialog.open,
    game.starPowerRemaining > 0,
    runKind === "grove"
      ? "grove"
      : game.boss &&
          game.boss.state !== "dormant" &&
          game.boss.state !== "defeated"
        ? "boss"
        : "trail",
  );
  renderer.render(
    game,
    reducedMotion && mode !== "playing" ? 0 : now / 1000,
    mode === "title",
    forestRestoration(),
  );
  requestAnimationFrame(frame);
}
syncSettings();
updateWorlds();
updateSound();
updateUI();
requestAnimationFrame(frame);
