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
  MAGNET_DURATION,
  SPRING_DURATION,
  RING_BONUS,
} from "./game/engine";
import {
  levels,
  groveLevel,
  challengeLevels,
  beehiveLevel,
  flowerHoopsLevel,
  type Level,
} from "./game/levels";
import { AdventureSession, type SecretTarget } from "./game/session";
import { hideawayLevels, isHideawayTarget } from "./game/hideaways";
import { moonpoolLevel } from "./game/moonpool-level";
import { cloudGardenLevel } from "./game/cloud-garden";
import { skySecretLevels } from "./game/sky-secrets";
import { brambleKeep } from "./game/castles";
import {
  createFinaleRun,
  FINALES,
  finaleFor,
  thornKingLevel,
} from "./game/boss-level";
import { guardianArena } from "./game/guardian-replays";
import { GhostRecorder, loadGhost, saveGhost } from "./ghost";
import { Renderer } from "./game/renderer";
import { Controls } from "./controls";
import { AudioPlayer } from "./audio";
import { openMiniGame } from "./minigames";
import { CREATURES, FRIENDS } from "./game/creatures";
import {
  DEFAULT_CONTROLS,
  SHOP_ITEMS,
  RunCoinLedger,
  challengeUnlocked,
  ownsItem,
  purchaseItem,
  wearingItem,
  type ShopItem,
  recordGardenRun,
  recordAcorns,
  acornTotal,
  recordChallenge,
  rescuedTotal,
  type PlayMode,
  type TouchSettings,
  readSave,
  recordFireflies,
  writeSave as persistSave,
  worldUnlocked,
  discoverFeather,
  discoverBeehive,
  completeBeehive,
  recordHoops,
  EXPLORATION_SECRET_IDS,
  discoverSecret,
  completeSecret,
  rescueCreature,
  selectCharacter,
  selectHelper,
  recordGardenActivity,
  type ExplorationSecretId,
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
  // Sunseed: a seed with a sprouting leaf. (Named "diamond" in code.)
  diamond:
    '<path d="M12 7c5 2 7 8 0 15C5 15 7 9 12 7Z"/><path d="M12 7c1-3 4-5 7-4-1 3-4 5-7 4Z"/>',
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
type RunKind = "world" | "grove" | "challenge" | "secret" | "minigame" | "boss";
let runKind: RunKind = "world";
let coinLedger = new RunCoinLedger();
let session: AdventureSession | null = null;
let replaySecretLevel: Level | null = null;
let bossOrigin: Game | null = null;
let bossReplay = false;
/** The arena for a journal guardian rematch; null means the Thorn King. */
let replayArena: Level | null = null;
/** The major-boss arena for the current boss run (Thorn King by default). */
let bossArena: Level = thornKingLevel;
const seenTutorials = new Set<string>();
const modeName = (value: PlayMode) =>
  ({ classic: "Classic", relaxed: "Relaxed", timed: "Timed" })[value];
function dressGame(next: Game) {
  next.outfit = save.outfit;
  next.scarf = save.scarf;
  next.hat = save.hat;
  next.groveDecorations = [...save.decorations];
  next.rescuedTotal = rescuedTotal(save);
  next.rescuedCreatures = [...save.rescuedCreatures];
  next.character = save.selectedCharacter;
  next.helper = save.helper;
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
          ? { level: replaySecretLevel ?? beehiveLevel }
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
type Mode =
  | "title"
  | "playing"
  | "paused"
  | "tip"
  | "boss-intro"
  | "won"
  | "lost";
/** The tip shown on the paused tip card. */
let tipText = "";
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
    <div class="toolbar-actions"><button class="round-button sound-button" aria-label="Mute all sound" title="Sound"></button><button class="round-button help-button" aria-label="How to play" title="How to play">${icon("help")}</button><button class="round-button" id="pause-button" aria-label="Pause game" title="Pause (P)">${icon("pause")}</button><button class="round-button" id="menu-button" aria-label="Game menu" title="Worlds and settings">${icon("menu")}</button></div>
  </header>
  <div class="hud" hidden>
    <div class="collectibles"><span class="hud-pill coin-meter" title="50 coins = an extra life, up to 3"><span class="seed-symbol" aria-hidden="true"></span><b id="coin-count">00</b><span id="coin-total">/ 50</span></span><span class="hud-pill stars-pill fireflies-pill" title="Rescue three hidden fireflies to restore this world"><span class="firefly-symbol" aria-hidden="true">${icon("firefly")}</span><b id="star-count"><span id="firefly-count">0</span></b><span>/ 3</span></span><span class="hud-pill acorn-pill" hidden title="Five hidden acorns in this world"><span aria-hidden="true">🌰</span><b id="acorn-count">0</b><span>/ 5</span></span></div>
    <div class="power-state hud-pill" data-form="small" data-powered="false"><span id="player-form">Small</span><b id="star-power" hidden></b><b class="power-chip" id="magnet-chip" data-power="magnet" hidden></b><b class="power-chip" id="spring-chip" data-power="spring" hidden></b><b class="power-chip" id="shield-chip" data-power="shield" hidden>◍</b><canvas id="helper-chip" width="64" height="64" role="img" hidden></canvas><span id="feather-meter" hidden><span aria-hidden="true">➶</span><span class="feather-segments" aria-hidden="true">▰▰▰▰</span><small id="feather-label">Ready</small></span><span id="diamond-reserve" class="diamond-reserve" data-filled="false" role="img" aria-label="Reserve Sunseed: empty" title="Reserve Sunseed: empty">${icon("diamond")}<small aria-hidden="true">RESERVE</small></span></div>
    <div class="vitals"><span id="lives" aria-label="3 lives remaining">${icon("pip")}<span>× <b id="life-count">3</b></span><small>LIVES</small></span><span id="timer">00:00</span></div>
    <div class="trail-track" aria-label="Trail progress"><span></span></div>
    <div class="section-status"><span id="section-name"></span><span id="checkpoint-count"></span><span id="run-mode"></span></div>
  </div>
  <div class="boss-hud" id="boss-hud" hidden aria-label="Boss encounter"><div><strong id="boss-name"></strong><span id="boss-health"></span></div><p id="boss-instruction"></p></div>
  <div class="flight-activity-hud" id="activity-hud" hidden><strong id="activity-score">0 points</strong><span id="activity-hoops">0 / 16 hoops</span><b id="activity-clock">60s</b></div>
  <div class="portal-prompt" id="portal-prompt" hidden></div>
  <div class="grove-actions" id="grove-actions" hidden><button id="grove-shop-button">${icon("leaf")} Make it home</button><button id="grove-petal-button" hidden>✿ Petal Post</button><button id="grove-worlds-button">World map ${icon("arrow")}</button></div>
  <div id="overlay" class="game-overlay"></div>
  <div class="world-strip" id="world-strip" aria-label="Choose a world"></div>
  <div class="touch-controls" hidden>
    <div class="movement-control"><div class="touch-dpad" data-direction="0"><button data-control="left" data-direction="-1" aria-label="Move left" aria-pressed="false">${icon("left")}</button><span class="dpad-divider"></span><button data-control="right" data-direction="1" aria-label="Move right" aria-pressed="false">${icon("right")}</button></div><span class="control-caption">SLIDE TO MOVE</span></div>
    <div class="jump-control"><button class="touch-tongue" data-control="tongue" aria-label="Gulp's tongue" hidden><span>TONGUE</span></button><button class="touch-jump" data-control="jump" aria-label="Jump" aria-pressed="false">${icon("jump")}<span>JUMP</span></button><span class="control-caption">HOLD TO GO HIGHER</span></div>
  </div>
  <div class="checkpoint-toast" id="game-toast" role="status" hidden></div>
  <p id="save-status" role="status" hidden>Progress is kept for this session. Device storage is unavailable.</p>
  <p class="rotate-tip">↻ Turn sideways for a bigger adventure</p>
  <div class="keyboard-hint"><span><kbd>←</kbd><kbd>→</kbd> move</span><span><kbd>SPACE</kbd> jump</span><span><kbd>P</kbd> pause</span></div>
</main>
<dialog id="menu-dialog" aria-labelledby="menu-title"><button class="round-button menu-close" aria-label="Close game menu">${icon("close")}</button><p class="eyebrow">THE FIREFLY TRAILS</p><h2 id="menu-title">Choose your adventure.</h2><p class="dialog-description">Rescue fireflies. Bring the forest back to light.</p><div id="forest-map" aria-label="Forest world map"><svg class="map-trails map-desktop" viewBox="0 0 680 255" preserveAspectRatio="none" aria-hidden="true"><path class="map-route" d="M110 145Q210 10 340 100T570 145"/><path class="map-route-light" d="M110 145Q210 10 340 100T570 145"/></svg><svg class="map-trails map-mobile" viewBox="0 0 320 480" preserveAspectRatio="none" aria-hidden="true"><path class="map-route" d="M95 80C280 40 290 230 230 240S30 290 95 400"/><path class="map-route-light" d="M95 80C280 40 290 230 230 240S30 290 95 400"/></svg><div class="map-decoration" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div id="menu-worlds"></div></div><div class="forest-progress"><div><strong id="restoration-count"></strong><span id="journey-progress"></span></div><div class="restoration-track"><span></span></div><p id="restoration-caption"></p></div><div class="adventure-choices"><div class="mode-choice"><label for="play-mode">Adventure mode</label><select id="play-mode"><option value="classic">Classic · 3 lives</option><option value="relaxed">Relaxed · unlimited retries</option><option value="timed">Timed · race your best</option></select><small id="mode-description"></small></div><button class="grove-entry" id="visit-grove">${icon("leaf")}<span><strong>Visit your home grove</strong><small id="grove-summary"></small></span>${icon("arrow")}</button></div><div class="journal-list" id="journal-list"></div><div class="challenge-list" id="challenge-list"></div><div class="menu-settings"><button class="menu-sound"></button><button class="menu-controls">${icon("settings")} Settings</button><button class="menu-help">${icon("help")} How to play</button></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><button class="round-button dialog-close" aria-label="Close instructions">${icon("close")}</button><p class="eyebrow">MEET YOUR MOVES</p><h2 id="help-title">Little hero. Big leaps.</h2><div class="guide-grid"><div><span class="guide-symbol">↔</span><h3>Move & jump</h3><p>Slide your left thumb to steer. Tap jump for a short hop; hold for a higher leap. Keyboard: arrows or A/D, and Space. Gamepad: stick and A. Make the touch controls your own in Settings.</p></div><div><span class="guide-symbol diamond-guide">${icon("diamond")}</span><h3>Grow & discover</h3><p>Jump into a seed-marked block from below, then collect the golden Sunseed it releases to grow. Big Pip can break cracked blocks to discover coin caches. Collect another Sunseed while big to store one in the HUD. A hit releases it; catch it to grow again. A hit while small costs a life.</p></div><div><span class="guide-symbol gold">★</span><h3>Star power</h3><p>Jump into a star-marked block from below for ${STAR_POWER_DURATION} seconds of protection from bugs. Touch bugs to squash them while powered. Falling in a gap still costs a life.</p></div><div><span class="guide-symbol">${icon("firefly")}</span><h3>Rescue the light</h3><p>Find three hidden fireflies in each world. Every rescue is saved, even if you lose your lives. Their light restores the forest and welcomes residents to your playable home grove. Every world has a timed challenge room, unlocked by rescuing all three of its fireflies.</p></div><div><span class="guide-symbol coral">${icon("pip")}</span><h3>Make every life count</h3><p>Start with ${MAX_LIVES} lives. Every ${COINS_PER_LIFE} coins earns one life, up to ${MAX_LIVES}. A lost life returns small Pip to the latest checkpoint. Zero lives ends a Classic or Timed run. Relaxed mode gives unlimited checkpoint retries.</p></div><div><span class="guide-symbol">↑</span><h3>A living forest</h3><p>Mushrooms bounce, leaves carry you, and cloud bridges crumble after you land. Jump on beetles and grasshoppers to squash them. Charging beetles pause and flash before rushing—time your jump!</p></div><div><span class="guide-symbol">${icon("leaf")}</span><h3>Wake the garden</h3><p>Walk near sleeping flowers and curled leaves. Pip’s glow opens new footholds. Follow golden cracks, footprints, and moving grass to discover secrets.</p></div><div><span class="guide-symbol coral">${icon("pip")}</span><h3>Meet the guardians</h3><p>Watch each guardian’s warning and avoid the attack. When it rests, jump on its back. The first three guardian sub-bosses need four hits. At the end of Windmill Garden, Briarheart launches thorn seeds; jump over them, then stomp its glowing crown. A checkpoint awaits before the fight. In Reedwater Marsh, Gloam the Bog Toad shows where it will land; move away and jump its ripples.</p></div><div><span class="guide-symbol gold">${icon("leaf")}</span><h3>A home for your light</h3><p>Every collected coin is saved for outfits and grove decorations, even at full lives. Visit your home grove from the world map. Cosmetics never change Pip’s powers.</p></div><div><span class="guide-symbol">➶</span><h3>Take flight</h3><p>Jump into a feather-marked block from below to earn a Wind Feather. Jump, let go, then hold Jump again to rise. Let go to glide. Land briefly to refill. A lost life drops the feather; feather blocks can be used again after a retry.</p></div><div><span class="guide-symbol">☁</span><h3>Find the cloud garden</h3><p>Look above the Home Grove for soft cloud ledges. Use a Wind Feather to climb, and land on each ledge to recharge before flying higher.</p></div><div><span class="guide-symbol">≈</span><h3>Explore Moonpool</h3><p>Find the Moonpool entrance in the Home Grove. Hold Jump to swim up, release to sink, and steer left or right. Follow the rising bubbles, swim around the rocks, and explore the high cove.</p></div><div><span class="guide-symbol">✿</span><h3>Find hidden paths</h3><p>Ride moving platforms and follow the garden’s hidden routes. At a glowing portal, stand still and press Jump when its prompt appears. Discover the beehive to replay it from your journal.</p></div></div><button class="primary-button close-guide">Got it ${icon("arrow")}</button></dialog>
<dialog id="grove-dialog" aria-labelledby="grove-title"><button class="round-button" id="grove-close" aria-label="Close grove shop">${icon("close")}</button><p class="eyebrow">A LITTLE PLACE TO CALL HOME</p><h2 id="grove-title">Make the garden yours.</h2><p class="dialog-description">Your coins decorate the grove and dress Pip. Every rescue brings a new neighbor home.</p><div class="grove-wallet"><strong id="wallet-count"></strong><span id="lifetime-count"></span></div><div id="shop-items" class="shop-items"></div><p id="shop-status" role="status"></p><button class="primary-button" id="grove-done">Back to the grove ${icon("arrow")}</button></dialog>
<dialog id="settings-dialog" aria-labelledby="settings-title"><button class="round-button" id="settings-close" aria-label="Close settings">${icon("close")}</button><p class="eyebrow">PLAY YOUR WAY</p><h2 id="settings-title">Made for your thumbs.</h2><p class="dialog-description">Your choices stay saved. Controls fit safely within your screen.</p><div class="control-preview" aria-label="Touch control layout preview"><span class="preview-label">LAYOUT PREVIEW</span><div class="preview-pip">${icon("pip")}</div><div class="preview-controls"><span class="preview-dpad">${icon("left")}${icon("right")}</span><span class="preview-jump">${icon("jump")}</span></div></div><div class="control-settings"><label for="control-size"><span>Button size</span><select id="control-size"><option value="0.85">Compact</option><option value="1">Standard</option><option value="1.15">Large</option><option value="1.3">Extra large</option></select></label><label for="control-inset"><span>Move inward <output id="inset-value"></output></span><input id="control-inset" type="range" min="0" max="40" step="5" aria-label="Move controls inward" /></label><label for="control-height"><span>Move upward <output id="height-value"></output></span><input id="control-height" type="range" min="0" max="80" step="8" aria-label="Move controls upward" /></label><label class="switch-row" for="control-swap"><span>Jump on the left</span><input id="control-swap" type="checkbox" role="switch" /></label><button id="controls-reset" class="text-button">Reset control layout</button></div><div class="audio-settings"><label class="switch-row" for="sfx-toggle"><span>Sound effects</span><input id="sfx-toggle" type="checkbox" role="switch" /></label><label class="switch-row" for="music-toggle"><span>Music</span><input id="music-toggle" type="checkbox" role="switch" /></label><label class="switch-row" for="haptics-toggle"><span>Touch feedback<small>Gentle vibrations on supported devices</small></span><input id="haptics-toggle" type="checkbox" role="switch" /></label><label for="game-speed"><span>Game speed<small>Slower speeds give more time to react</small></span><select id="game-speed"><option value="1">Normal</option><option value="0.85">Gentle</option><option value="0.7">Slow</option></select></label><label class="switch-row" for="messages-toggle"><span>Game messages &amp; tips<small>Pop-up messages, and a pause card the first time each tip appears</small></span><input id="messages-toggle" type="checkbox" role="switch" /></label></div><button class="primary-button" id="settings-done">Done ${icon("arrow")}</button></dialog>
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
let activityOpen = false;
const characterChoice = document.createElement("div");
characterChoice.className = "mode-choice";
characterChoice.innerHTML = `<label for="character-choice">Play as</label><select id="character-choice"></select><small>Everyone has the same moves and abilities. Outfits, scarves and hats are Pip's and Poppy's.</small>`;
$(".adventure-choices").prepend(characterChoice);
const characterSelect = $<HTMLSelectElement>("#character-choice");
/** The name of whoever is being played. */
function heroName() {
  return (
    FRIENDS.find((f) => f.id === save.selectedCharacter)?.name ??
    (save.selectedCharacter === "poppy" ? "Poppy" : "Pip")
  );
}
function updateCharacterChoice() {
  characterSelect.innerHTML =
    `<option value="pip">Pip</option><option value="poppy">Poppy — garden sprite</option>` +
    FRIENDS.filter((f) => save.rescuedCreatures.includes(f.id))
      .map((f) => `<option value="${f.id}">${f.name} — rescued friend</option>`)
      .join("");
  characterSelect.value = save.selectedCharacter;
}
updateCharacterChoice();
characterSelect.addEventListener("change", () => {
  const friend = FRIENDS.find((f) => f.id === characterSelect.value);
  const choice = friend
    ? friend.id
    : characterSelect.value === "poppy"
      ? "poppy"
      : "pip";
  if (selectCharacter(save, choice)) {
    dressGame(game);
    writeSave(save);
  }
  updateCharacterChoice();
});
// Bring one rescued friend along for its small perk.
const helperChoice = document.createElement("div");
helperChoice.className = "mode-choice";
helperChoice.innerHTML = `<label for="helper-choice">Bring a friend</label><select id="helper-choice"></select><small id="helper-description"></small>`;
characterChoice.after(helperChoice);
const helperSelect = $<HTMLSelectElement>("#helper-choice");
function updateHelperChoice() {
  updateCharacterChoice();
  const home = FRIENDS.filter((f) => save.rescuedCreatures.includes(f.id));
  helperSelect.innerHTML =
    `<option value="">Nobody</option>` +
    home.map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
  helperSelect.value = save.helper ?? "";
  const friend = FRIENDS.find((f) => f.id === save.helper);
  $("#helper-description").textContent = friend
    ? `${friend.name}: ${friend.perk}`
    : home.length
      ? "Pick a rescued friend. Each one lends a small helping hand."
      : "Find forest friends in the worlds; they can come along and help.";
  const chip = $<HTMLCanvasElement>("#helper-chip");
  chip.hidden = !friend;
  if (friend) {
    renderer.friendPortrait(friend.kind, chip);
    chip.title = `${friend.name}: ${friend.perk}`;
    chip.setAttribute(
      "aria-label",
      `${friend.name} is helping. ${friend.perk}`,
    );
  }
}
helperSelect.addEventListener("change", () => {
  const friend = FRIENDS.find((f) => f.id === helperSelect.value);
  if (selectHelper(save, friend ? friend.id : null)) {
    dressGame(game);
    writeSave(save);
  }
  updateHelperChoice();
});
const activities = document.createElement("section");
activities.className = "journal-list";
activities.innerHTML = `<h3>Garden games</h3>
  <button type="button" class="challenge-entry" data-activity="matching"><span><strong>Garden Match</strong><small id="matching-record"></small></span><span>✿</span></button>
  <button type="button" class="challenge-entry" data-activity="falling"><span><strong>Seed Stack</strong><small id="falling-record"></small></span><span>▦</span></button>`;
$("#journal-list").before(activities);
function updateActivityRecords() {
  const match = save.minigames.gardenMatch.bestMoves;
  const score = save.minigames.seedStack.bestScore;
  $("#matching-record").textContent =
    match === null ? "Find the matching pairs" : `Best: ${match} turns`;
  $("#falling-record").textContent =
    score === null
      ? "Fit the falling pieces and clear rows"
      : `Best score: ${score}`;
}
updateActivityRecords();
activities.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-activity]",
  );
  if (!button || activityOpen) return;
  const kind = button.dataset.activity;
  if (kind !== "matching" && kind !== "falling") return;
  pause();
  controls.reset();
  menuDialog.close();
  activityOpen = true;
  openMiniGame(
    kind,
    () => {
      activityOpen = false;
      controls.reset();
      if (mode === "paused")
        overlay.querySelector<HTMLButtonElement>("button")?.focus();
      else canvas.focus({ preventScroll: true });
    },
    (result) => {
      if (recordGardenActivity(save, result)) {
        writeSave(save);
        updateActivityRecords();
      }
    },
  );
});
const controls = new Controls(
  $(".touch-dpad"),
  $(".touch-jump"),
  () =>
    mode === "playing" &&
    !dialog.open &&
    !menuDialog.open &&
    !settingsDialog.open &&
    !groveDialog.open &&
    !activityOpen,
  () => audio.unlock(),
  () => {
    if (
      dialog.open ||
      menuDialog.open ||
      settingsDialog.open ||
      groveDialog.open ||
      activityOpen
    )
      return;
    if (mode === "playing") pause();
    else if (mode === "paused") resume();
    else if (mode === "tip") continueFromTip();
  },
  $<HTMLButtonElement>(".touch-tongue"),
);
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

const worldArtColors = [
  ["#83e1ee", "#e1f6bf", "#62cfa3", "#1c9d78"],
  ["#6768bb", "#c9b5f2", "#9687cf", "#5463a0"],
  ["#76c9ed", "#daf5e9", "#9ecbcd", "#4f9faf"],
  ["#95dce8", "#fff0b3", "#a1cf64", "#5aa56a"],
  ["#8ec5c2", "#f7dcae", "#7fb08a", "#4f8a72"],
  ["#2f3360", "#7c6fb8", "#5b5a96", "#3f3f72"],
  ["#2b8fa3", "#9be3dc", "#3f9f9a", "#257a7f"],
  ["#1d2147", "#5b4f9a", "#3e3c78", "#2b2a5a"],
  ["#9fc9e8", "#f4f9fc", "#d6e6f2", "#a9c3da"],
  ["#2b4b7a", "#8fd3e0", "#9fdcf0", "#5f9fc4"],
  ["#4a1f24", "#d9683a", "#6b2d2a", "#3a2420"],
  ["#3a4458", "#8f9db5", "#56637a", "#2f3a4c"],
];
/** Each world's island on the map has its own little scene. */
const WORLD_MOTIFS: string[] = [
  // Sunlit Meadow: a big spotted mushroom among flowers.
  `<circle cx="186" cy="30" r="17" fill="#fff5b6"/><path d="M0 92Q60 60 120 88T240 84V130H0" fill="#7fcf86"/><rect x="104" y="72" width="16" height="30" rx="5" fill="#fff3dc"/><path d="M86 76Q112 40 138 76Z" fill="#e8705f"/><g fill="#fff3dc"><circle cx="104" cy="64" r="4"/><circle cx="121" cy="58" r="3.5"/><circle cx="128" cy="70" r="3"/></g><g fill="#ffd36b"><circle cx="50" cy="100" r="4"/><circle cx="182" cy="96" r="4"/></g><path d="M0 116Q80 106 160 116T240 114V130H0" fill="#3c9a5e"/>`,
  // Firefly Hollow: a hollow tree glowing with fireflies at dusk.
  `<path d="M0 98Q80 76 160 96T240 92V130H0" fill="#5f5aa0"/><path d="M98 112V58Q98 40 120 40Q142 40 142 58V112Z" fill="#6e4f3c"/><ellipse cx="120" cy="80" rx="9" ry="13" fill="#2c2142"/><circle cx="120" cy="34" r="30" fill="#4d7a5a"/><g fill="#fff3a0"><circle cx="70" cy="50" r="3"/><circle cx="168" cy="44" r="3"/><circle cx="150" cy="70" r="2.5"/><circle cx="84" cy="80" r="2.5"/><circle cx="120" cy="80" r="2"/></g>`,
  // Cloudtop Crossing: cloud bridges in the open sky.
  `<circle cx="186" cy="28" r="16" fill="#fff5b6"/><g fill="#fff"><ellipse cx="60" cy="80" rx="34" ry="12"/><ellipse cx="72" cy="72" rx="18" ry="12"/><ellipse cx="150" cy="62" rx="30" ry="10"/><ellipse cx="160" cy="55" rx="16" ry="10"/><ellipse cx="110" cy="104" rx="40" ry="12"/></g><path d="M40 82Q100 60 150 64" stroke="#ffd36b" stroke-width="3" stroke-dasharray="4 6" fill="none"/>`,
  // Windmill Garden: a windmill on its hill.
  `<circle cx="190" cy="28" r="15" fill="#fff5b6"/><path d="M0 100Q70 70 140 96T240 92V130H0" fill="#98c96a"/><path d="M110 98L116 46H130L136 98Z" fill="#f2e3c4"/><rect x="118" y="80" width="10" height="18" rx="3" fill="#a8743f"/><g transform="translate(123 48)" fill="#fff7e2" stroke="#a8743f" stroke-width="1.5"><rect x="-3" y="-34" width="6" height="34"/><rect x="-3" y="0" width="6" height="34" transform="rotate(90)"/><rect x="-3" y="0" width="6" height="34" transform="rotate(180)"/><rect x="-3" y="0" width="6" height="34" transform="rotate(270)"/></g><circle cx="123" cy="48" r="4" fill="#a8743f"/>`,
  // Reedwater Marsh: reeds and lily pads on misty water.
  `<rect y="84" width="240" height="46" fill="#5ea6a0"/><g fill="#6fb36e"><ellipse cx="70" cy="98" rx="18" ry="5"/><ellipse cx="140" cy="108" rx="20" ry="5"/><ellipse cx="190" cy="94" rx="14" ry="4"/></g><g stroke="#4f7a3f" stroke-width="3"><path d="M30 84V50M38 84V40M200 84V46M210 84V56"/></g><g fill="#8a5a3a"><rect x="27" y="44" width="6" height="12" rx="3"/><rect x="35" y="34" width="6" height="12" rx="3"/><rect x="197" y="40" width="6" height="12" rx="3"/></g><circle cx="140" cy="102" r="4" fill="#ff9db5"/>`,
  // Glimmerdeep Caverns: a cave mouth with glowing crystals.
  `<path d="M0 0H240V130H0Z" fill="#2f3360" opacity=".4"/><path d="M40 130V70Q120 0 200 70V130Z" fill="#1f2246"/><g fill="#9b8cf0"><path d="M90 130L100 88L110 130Z"/><path d="M108 130L120 74L132 130Z" fill="#c2b6ff"/><path d="M130 130L140 94L150 130Z"/></g><g fill="#e6defe"><circle cx="70" cy="40" r="2"/><circle cx="170" cy="36" r="2"/><circle cx="196" cy="60" r="1.5"/></g>`,
  // Tidewell Depths: under the waves, with coral and bubbles.
  `<rect width="240" height="130" fill="#2b8fa3" opacity=".55"/><path d="M0 26Q30 18 60 26T120 26T180 26T240 26" stroke="#bff3f5" stroke-width="3" fill="none"/><g fill="#ef8a8a"><path d="M60 130V100Q60 92 66 92V110Q72 96 76 104V130Z"/><path d="M170 130V96Q174 88 178 96V108Q184 94 188 102V130Z"/></g><g fill="none" stroke="#e6fbff" stroke-width="2"><circle cx="120" cy="80" r="5"/><circle cx="128" cy="62" r="3.5"/><circle cx="118" cy="46" r="2.5"/></g>`,
  // Nightglow Woods: a moon, an owl in the trees and a lantern.
  `<circle cx="184" cy="32" r="16" fill="#f4eecb"/><circle cx="191" cy="27" r="14" fill="#1d2147"/><path d="M0 104Q80 86 160 104T240 100V130H0" fill="#2b2a5a"/><g fill="#141633"><path d="M60 110V50L72 30L84 50V110Z"/><path d="M150 110V60L160 44L170 60V110Z"/></g><ellipse cx="120" cy="70" rx="14" ry="17" fill="#6a5a8a"/><g fill="#ffe08a"><circle cx="114" cy="66" r="4"/><circle cx="126" cy="66" r="4"/></g><rect x="200" y="84" width="8" height="22" fill="#3a3460"/><circle cx="204" cy="82" r="6" fill="#ffd36b"/>`,
  // Snowdrift Peaks: snowy peaks and falling snow.
  `<path d="M0 110L60 50L100 90L150 30L210 100L240 80V130H0Z" fill="#a9c3da"/><path d="M60 50L48 62L60 60L72 66ZM150 30L136 46L150 42L164 50Z" fill="#fff"/><g fill="#fff"><circle cx="30" cy="30" r="2.5"/><circle cx="96" cy="22" r="2"/><circle cx="200" cy="40" r="2.5"/><circle cx="120" cy="60" r="2"/></g><path d="M0 116Q120 104 240 116V130H0Z" fill="#f4f9fc"/>`,
  // Frostglass Lake: a frozen lake under the aurora.
  `<path d="M0 30Q60 10 120 34T240 26" stroke="#8cffc8" stroke-width="8" fill="none" opacity=".5"/><path d="M0 44Q70 24 140 46T240 40" stroke="#88c8ff" stroke-width="6" fill="none" opacity=".45"/><path d="M0 90Q120 80 240 90V130H0Z" fill="#bfeaf6"/><path d="M60 100L90 110L84 120M150 96L170 106L196 102" stroke="#7fb6d6" stroke-width="2" fill="none"/><path d="M0 92L30 70L60 92Z" fill="#5f9fc4"/><path d="M180 92L210 66L240 92Z" fill="#5f9fc4"/>`,
  // Ember Caldera: a smoking volcano over a lava river.
  `<path d="M40 110L100 44H140L200 110Z" fill="#6b2d2a"/><path d="M100 44Q120 56 140 44L134 60Q120 70 106 60Z" fill="#ff8a3d"/><g fill="#6b6060" opacity=".7"><circle cx="118" cy="30" r="10"/><circle cx="130" cy="18" r="8"/><circle cx="114" cy="10" r="6"/></g><path d="M0 112Q60 104 120 114T240 110V130H0Z" fill="#ff7a2f"/><path d="M0 120Q80 114 160 122T240 118V130H0Z" fill="#c2451c"/>`,
  // Thunderhead Heights: storm clouds, a lightning bolt and rain.
  `<g fill="#56637a"><ellipse cx="80" cy="34" rx="44" ry="18"/><ellipse cx="150" cy="30" rx="50" ry="20"/><ellipse cx="120" cy="22" rx="30" ry="16"/></g><path d="M126 46L112 74H124L110 104L140 66H128L138 46Z" fill="#ffe27a"/><g stroke="#c8d4e8" stroke-width="2" opacity=".7"><path d="M40 60L34 72M64 64L58 76M180 58L174 70M206 66L200 78"/></g><path d="M0 108L60 84L120 104L180 80L240 100V130H0Z" fill="#414b5e"/>`,
];
function worldArt(index: number) {
  const colors = worldArtColors[index]!;
  const motif = WORLD_MOTIFS[index];
  if (motif)
    return `<svg class="world-art" viewBox="0 0 240 130" aria-hidden="true"><defs><linearGradient id="sky-${index}" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><clipPath id="clip-${index}"><rect width="240" height="130" rx="16"/></clipPath></defs><g clip-path="url(#clip-${index})"><rect width="240" height="130" fill="url(#sky-${index})"/>${motif}</g></svg>`;
  return `<svg class="world-art" viewBox="0 0 240 130" aria-hidden="true"><defs><linearGradient id="sky-${index}" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="240" height="130" rx="16" fill="url(#sky-${index})"/><circle cx="181" cy="34" r="18" fill="#fff5b6"/><path d="M0 87Q40 16 90 88Q138 40 191 81Q224 58 240 78V130H0" fill="${colors[2]}"/><path d="M0 112Q66 62 123 110Q178 71 240 101V130H0" fill="${colors[3]}"/><path d="M0 119Q74 112 133 119T240 119V130H0" fill="#207357"/><g fill="#fff" opacity=".8"><ellipse cx="50" cy="34" rx="24" ry="8"/><ellipse cx="59" cy="28" rx="14" ry="10"/></g><path d="m113 78 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#ffdb73"/></svg>`;
}
function lockedHint(index: number) {
  if (index >= 8) return `Finish ${levels[index - 1]!.name} to open`;
  return index === 7
    ? "Finish Tidewell Depths to open"
    : index === 6
      ? "Finish Glimmerdeep Caverns to open"
      : index === 5
        ? "Finish Reedwater Marsh to open"
        : index === 4
          ? "Defeat the Thorn King to open"
          : "Beat the Meadow guardian to open";
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
/** Centre of each world's island inside the map, in map coordinates. */
function mapNodes() {
  const map = $("#menu-worlds").getBoundingClientRect();
  return [
    ...document.querySelectorAll<HTMLElement>(".menu-world .map-island"),
  ].map((island) => {
    const r = island.getBoundingClientRect();
    return {
      x: r.left - map.left + r.width / 2,
      y: r.top - map.top + r.height / 2,
    };
  });
}
/** A smooth curve through the points (Catmull-Rom as cubic Béziers). */
function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  let d = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!,
      p1 = points[i]!,
      p2 = points[i + 1]!,
      p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
/** Distance along the trail to each world, for Pip's walk. */
let mapNodeLengths: number[] = [];
let mapWalkerAt = -1;
let mapWalkFrame = 0;
const MAP_SEEN_KEY = "mosslight-map-opened";
/** Furthest world that is open, so the trail behind it can glow. */
const furthestOpen = () =>
  levels.reduce((last, _, i) => (worldUnlocked(save, i) ? i : last), 0);
/** Lay the worlds out along a winding trail that doubles back each row,
 * and draw the trail, the lit part already travelled, and each region. */
function layoutMapPath(revealFrom = -1) {
  const svg = document.querySelector<SVGSVGElement>("#menu-worlds .map-path");
  if (!svg) return;
  const map = $("#menu-worlds");
  const columns = map.clientWidth >= 620 ? 3 : 2;
  map.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  map.style.rowGap = columns === 2 ? "40px" : "28px";
  document
    .querySelectorAll<HTMLElement>("#menu-worlds .menu-world")
    .forEach((button, i) => {
      const row = Math.floor(i / columns),
        place = i % columns;
      button.style.gridRow = String(row + 1);
      button.style.gridColumn = String(
        (row % 2 ? columns - 1 - place : place) + 1,
      );
      // A gentle wave, so the trail never reads as a plain grid.
      button.style.translate = `0 ${(place % 2 ? 18 : -6) + (row % 2 ? 6 : 0)}px`;
    });
  svg.setAttribute("width", String(map.clientWidth));
  svg.setAttribute("height", String(map.clientHeight));
  const nodes = mapNodes();
  const open = furthestOpen();
  const trail = smoothPath(nodes);
  const lit = smoothPath(nodes.slice(0, open + 1));
  svg.innerHTML =
    nodes
      .map((n, i) => {
        const art = worldArtColors[i] ?? worldArtColors[0]!;
        return `<ellipse class="map-region ${worldUnlocked(save, i) ? "" : "locked"}" cx="${n.x.toFixed(0)}" cy="${(n.y + 14).toFixed(0)}" rx="${(map.clientWidth / columns / 2 + 6).toFixed(0)}" ry="92" fill="${art[1]}"/>`;
      })
      .join("") +
    `<path class="map-trail-shadow" d="${trail}"/><path class="map-trail" d="${trail}"/><path class="map-trail-lit" d="${lit}"/>`;
  const litPath = svg.querySelector<SVGPathElement>(".map-trail-lit")!;
  // Measure the distance along the trail to each world.
  const full = svg.querySelector<SVGPathElement>(".map-trail")!;
  const total = full.getTotalLength();
  mapNodeLengths = nodes.map(() => 0);
  const best = nodes.map(() => Infinity);
  for (let l = 0; l <= total; l += 3) {
    const pt = full.getPointAtLength(l);
    nodes.forEach((n, i) => {
      const d = (pt.x - n.x) ** 2 + (pt.y - n.y) ** 2;
      if (d < best[i]!) {
        best[i] = d;
        mapNodeLengths[i] = l;
      }
    });
  }
  if (revealFrom >= 0 && revealFrom < open) {
    // A newly opened world: the lit trail grows out to it.
    const from = mapNodeLengths[revealFrom] ?? 0,
      to = litPath.getTotalLength();
    litPath.style.strokeDasharray = `${to} ${to}`;
    litPath.style.strokeDashoffset = String(to - from);
    litPath.getBoundingClientRect();
    litPath.style.transition = "stroke-dashoffset 1.4s ease-in-out";
    litPath.style.strokeDashoffset = "0";
  }
  if (mapWalkerAt < 0 || revealFrom >= 0) {
    mapWalkerAt = revealFrom >= 0 ? revealFrom : selected;
  }
  moveMapWalker(mapWalkerAt, false);
}
/** Pip walks along the winding trail itself to the chosen world. */
function moveMapWalker(index: number, walk: boolean) {
  const walker = document.querySelector<HTMLElement>(
    "#menu-worlds .map-walker",
  );
  const trail = document.querySelector<SVGPathElement>(
    "#menu-worlds .map-trail",
  );
  const target = mapNodeLengths[index];
  if (!walker || !trail || target === undefined) return;
  cancelAnimationFrame(mapWalkFrame);
  // Pip follows the curve frame by frame, not a straight CSS slide.
  walker.style.transition = "none";
  const place = (length: number, facing: number) => {
    const pt = trail.getPointAtLength(length);
    walker.style.transform = `translate(${(pt.x - 18).toFixed(1)}px, ${(pt.y - 52).toFixed(1)}px)`;
    walker.style.setProperty("--facing", String(facing));
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const from = mapNodeLengths[mapWalkerAt] ?? target;
  mapWalkerAt = index;
  if (!walk || reduced || from === target) {
    walker.classList.remove("walking");
    place(target, 1);
    return;
  }
  const duration = Math.min(2.2, Math.abs(target - from) / 520 + 0.25);
  const facing = target > from ? 1 : -1;
  const begin = performance.now();
  walker.classList.add("walking");
  const step = (now: number) => {
    const t = Math.min(1, (now - begin) / (duration * 1000));
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    // The trail turns back and forth, so face the way Pip is going on screen.
    const here = from + (target - from) * eased;
    const ahead = trail.getPointAtLength(here + facing * 4).x;
    place(here, ahead >= trail.getPointAtLength(here).x ? 1 : -1);
    if (t < 1) mapWalkFrame = requestAnimationFrame(step);
    else walker.classList.remove("walking");
  };
  mapWalkFrame = requestAnimationFrame(step);
}
/** The first time the map opens after a world unlocks, the fog clears from
 * it, the lit trail grows out to it and Pip walks over. */
function celebrateUnlocks() {
  const open = furthestOpen();
  let seen = open;
  try {
    const stored = localStorage.getItem(MAP_SEEN_KEY);
    if (stored !== null) seen = Number(stored);
    localStorage.setItem(MAP_SEEN_KEY, String(open));
  } catch {
    return;
  }
  if (!(seen < open)) return;
  const button = document.querySelector<HTMLElement>(
    `[data-menu-world="${open}"]`,
  );
  button?.classList.add("unlocking");
  requestAnimationFrame(() => {
    layoutMapPath(seen);
    window.setTimeout(() => moveMapWalker(open, true), 500);
    button?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}
window.addEventListener("resize", () =>
  requestAnimationFrame(() => layoutMapPath()),
);
function updateWorlds() {
  $("#world-strip").innerHTML = levels
    .map(
      (level, i) =>
        `<button class="world-tab ${selected === i ? "selected" : ""}" data-world="${i}" ${worldUnlocked(save, i) ? "" : "disabled"} aria-pressed="${selected === i}"><span class="tab-number">${String(i + 1).padStart(2, "0")}</span><span><small>${!worldUnlocked(save, i) ? (i >= 8 ? `FINISH ${levels[i - 1]!.name.split(" ")[0]!.toUpperCase()}` : i === 7 ? "FINISH THE DEPTHS" : i === 6 ? "FINISH THE CAVES" : i === 5 ? "FINISH THE MARSH" : i === 4 ? "BEAT THE THORN KING" : "BEAT MEADOW TO OPEN") : selected === i ? "YOUR NEXT ADVENTURE" : "EXPLORE"}</small><strong>${level.name}</strong></span><span class="tab-stars" aria-label="${save.progress[i].fireflies.length} of 3 fireflies rescued">${fireflyMarks(save.progress[i].fireflies)}</span></button>`,
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
      return `<button class="menu-world ${selected === i ? "selected" : ""} ${light > 0 ? "restored" : ""}" data-menu-world="${i}" ${worldUnlocked(save, i) ? "" : "disabled"} data-light="${light}" style="--world-light:${light}" aria-label="${level.name}, ${progress.fireflies.length} of 3 fireflies rescued, ${completed ? "trail completed" : "explore trail"}"><span class="map-island">${worldArt(i)}<span class="map-node-number">${completed ? "✓" : String(i + 1).padStart(2, "0")}</span>${FINALES.find((f) => f.world === level.contentId)?.arena.castle ? `<span class="map-boss castle" title="Castle and major boss"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 18V8h2V5h2v3h2V5h2v3h2V5h2v3h2v10h-5v-4a2 2 0 0 0-4 0v4Z" fill="currentColor"/></svg></span>` : FINALES.some((f) => f.world === level.contentId) ? `<span class="map-boss" title="Boss level">♛</span>` : ""}${worldUnlocked(save, i) ? "" : `<span class="map-fog"></span>`}</span><span class="menu-world-info"><strong>${level.name}</strong><span>${!worldUnlocked(save, i) ? lockedHint(i) : completed ? "Trail completed" : ["Bouncing mushrooms", "Ride the leaves", "Brave the cloud bridges", "Take flight. Turn the garden.", "Hop the lily pads", "Explore the glowing caves", "Swim the deep lagoon", "Light the night lanterns", "Dodge the falling icicles", "Slide across the frozen lake", "Cross the lava", "Cross between the gusts"][i]}</span><span class="map-fireflies" aria-hidden="true">${fireflyMarks(progress.fireflies)}</span><small class="map-acorns" aria-label="${progress.acorns.length} of 5 acorns found">🌰 ${progress.acorns.length}/5</small><small class="world-best">${best}</small></span></button>`;
    })
    .join("");
  $("#menu-worlds").insertAdjacentHTML(
    "beforeend",
    `<svg class="map-path" aria-hidden="true"></svg><span class="map-walker" aria-hidden="true">${icon("pip")}</span>`,
  );
  requestAnimationFrame(() => layoutMapPath());
  // Pip walks the trail to whichever world is pointed at or focused.
  document
    .querySelectorAll<HTMLButtonElement>("[data-menu-world]")
    .forEach((button) => {
      const walk = () => moveMapWalker(Number(button.dataset.menuWorld), true);
      button.addEventListener("pointerenter", walk);
      button.addEventListener("focus", walk);
    });
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
    `${completed} / ${levels.length} trails completed`;
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
    `${rescuedTotal(save)} fireflies home · ${FRIENDS.filter((f) => save.rescuedCreatures.includes(f.id)).length} of ${FRIENDS.length} friends home · ${save.wallet} coins to spend`;
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
  // Every dedicated boss level after the Thorn King's has its own replay.
  // Every boss level after the Thorn King's has its own replay (a castle's
  // own door entry is part of its castle, so it is not listed).
  const finaleReplays = FINALES.filter(
    (f) =>
      f.world !== "world.windmill-garden" &&
      levels.some((l) => l.contentId === f.world),
  ).map((finale) => {
    const world = levels.findIndex((l) => l.contentId === finale.world);
    return {
      finale,
      world,
      unlocked: Object.values(save.progress[world]?.garden ?? {}).some(
        (record) => record.completed,
      ),
    };
  });
  const bossUnlocked =
    save.progress[3].adventureCompleted ||
    Object.values(save.progress[3].garden).some((record) => record.completed);
  const places: Record<ExplorationSecretId, { level: Level; hint: string }> = {
    "secret.moonpool": {
      level: moonpoolLevel,
      hint: "Look for a pool in the Home Grove.",
    },
    "secret.cloud-garden": {
      level: cloudGardenLevel,
      hint: "Follow the clouds above the Home Grove.",
    },
    "secret.sky-meadow": {
      level: skySecretLevels["sky-meadow"],
      hint: "Watch for petals high above Sunlit Meadow.",
    },
    "secret.sky-hollow": {
      level: skySecretLevels["sky-hollow"],
      hint: "Look above the branches in Firefly Hollow.",
    },
    "secret.sky-cloudtop": {
      level: skySecretLevels["sky-cloudtop"],
      hint: "Follow the high clouds in Cloudtop Crossing.",
    },
    "secret.hideaway-tansy": {
      level: hideawayLevels["hideaway-tansy"],
      hint: "A sleeping vine curls above a side ledge early in Sunlit Meadow.",
    },
    "secret.hideaway-brindle": {
      level: hideawayLevels["hideaway-brindle"],
      hint: "Something stirs above a high step early in Firefly Hollow.",
    },
    "secret.hideaway-sorrel": {
      level: hideawayLevels["hideaway-sorrel"],
      hint: "Climb past the widest ledge halfway through Windmill Garden.",
    },
    "secret.hideaway-rill": {
      level: hideawayLevels["hideaway-rill"],
      hint: "Look up from the middle stepping ledge in Reedwater Marsh.",
    },
    "secret.hideaway-wisp": {
      level: hideawayLevels["hideaway-wisp"],
      hint: "A vine sleeps above the crystal gallery in Glimmerdeep Caverns.",
    },
    "secret.hideaway-button": {
      level: hideawayLevels["hideaway-button"],
      hint: "Keep climbing above the last firefly perch in Nightglow Woods.",
    },
  };
  $("#journal-list").innerHTML =
    `<h3>Discovery journal</h3><button class="challenge-entry" id="journal-hive" ${hive.discovered ? "" : "disabled"}><span><strong>Lantern Beehive</strong><small>${hive.discovered ? (hive.completed ? "Bee Scarf earned · replay the secret" : "Secret discovered · explore three honeycomb rooms") : "Look high among the flowers in Windmill Garden"}</small></span><span>⌂</span></button>` +
    EXPLORATION_SECRET_IDS.map((id) => {
      const record = save.secrets.exploration[id];
      const place = places[id];
      return `<button type="button" class="challenge-entry" data-secret="${id}" ${record.discovered ? "" : "disabled"}><span><strong>${record.discovered ? place.level.name : "Undiscovered place"}</strong><small>${record.discovered ? (record.completed ? "Explored · visit again" : "Discovered · visit again") : place.hint}</small></span><span>☁</span></button>`;
    }).join("") +
    `<button class="challenge-entry" id="journal-hoops" ${save.unlocks.windFeatherDiscovered ? "" : "disabled"}><span><strong>Petal Post</strong><small>${save.unlocks.windFeatherDiscovered ? (hoops.best ? `${hoops.bestMedal === "none" ? "Practice" : hoops.bestMedal + " medal"} · best ${hoops.best.score} points` : "A little flight. Sixteen flower hoops.") : "Bump a feather block near a trail entrance"}</small></span><span>✿</span></button>` +
    `<button class="challenge-entry" id="journal-thorn-king" ${bossUnlocked ? "" : "disabled"}><span><strong>The Thorn King's Grove</strong><small>${bossUnlocked ? "Replay the major boss level" : "Finish Windmill Garden to unlock a replay"}</small></span><span>♛</span></button>` +
    finaleReplays
      .map(
        ({ finale, world, unlocked }, i) =>
          `<button class="challenge-entry" data-finale="${i}" ${unlocked ? "" : "disabled"}><span><strong>${finale.arena.name}</strong><small>${unlocked ? "Replay the boss level" : `Finish ${levels[world]?.name ?? "its world"} to unlock a replay`}</small></span><span>♛</span></button>`,
      )
      .join("") +
    `<h3>Guardian rematches</h3>` +
    levels
      .map((level, index) => {
        if (!level.boss) return "";
        const beaten = Object.values(save.progress[index]?.garden ?? {}).some(
          (record) => record.completed,
        );
        return `<button class="challenge-entry" data-guardian="${index}" ${beaten ? "" : "disabled"}><span><strong>${level.boss.name}</strong><small>${beaten ? `Rematch the ${level.name} guardian` : `Finish ${level.name} to unlock a rematch`}</small></span><span aria-hidden="true">${beaten ? "→" : "◇"}</span></button>`;
      })
      .join("");
  $("#journal-hive").addEventListener("click", replayBeehive);
  $("#journal-hoops").addEventListener("click", playPetalPost);
  document
    .querySelectorAll<HTMLButtonElement>("[data-guardian]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const index = Number(button.dataset.guardian);
        const arena = levels[index] && guardianArena(levels[index]);
        if (!arena || button.disabled) return;
        selected = index;
        bossReplay = true;
        replayArena = arena;
        bossOrigin = null;
        runKind = "boss";
        menuDialog.close();
        groveDialog.close();
        coinLedger = new RunCoinLedger();
        start();
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-finale]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const replay = finaleReplays[Number(button.dataset.finale)];
        if (!replay?.unlocked || button.disabled) return;
        selected = replay.world;
        bossReplay = true;
        replayArena = null;
        bossArena = replay.finale.arena;
        bossOrigin = null;
        runKind = "boss";
        menuDialog.close();
        groveDialog.close();
        coinLedger = new RunCoinLedger();
        start();
      }),
    );
  $("#journal-thorn-king").addEventListener("click", () => {
    if (!bossUnlocked) return;
    selected = 3;
    bossReplay = true;
    replayArena = null;
    bossArena = brambleKeep;
    bossOrigin = null;
    runKind = "boss";
    menuDialog.close();
    groveDialog.close();
    coinLedger = new RunCoinLedger();
    start();
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-secret]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.secret as ExplorationSecretId;
        if (!save.secrets.exploration[id]?.discovered) return;
        replaySecretLevel = places[id].level;
        session = null;
        runKind = "secret";
        menuDialog.close();
        groveDialog.close();
        start();
      });
    });
  $("#grove-petal-button").hidden = !save.unlocks.windFeatherDiscovered;
}
function replayBeehive() {
  if (!save.secrets.beehive.discovered) return;
  replaySecretLevel = null;
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
  if (session?.inSecret)
    changeScene(
      session.returnToWorld(),
      session.parent.level.kind === "grove" ? "grove" : "world",
    );
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
    `${save.lifetimeCoins} collected · ${rescuedTotal(save)} fireflies home · ${acornTotal(save)} acorns found`;
  const sections: { kind: ShopItem["kind"]; title: string; tag: string }[] = [
    { kind: "outfit", title: "Costumes", tag: "PIP’S WARDROBE" },
    { kind: "scarf", title: "Scarves", tag: "WEAR WITH ANY COSTUME" },
    { kind: "hat", title: "Hats", tag: "WEAR WITH ANY COSTUME" },
    { kind: "decoration", title: "Home grove", tag: "HOME GROVE" },
  ];
  const card = (item: ShopItem, tag: string) => {
    const owned = ownsItem(save, item);
    const locked =
      !owned && (Boolean(item.reward) || rescuedTotal(save) < item.fireflies);
    const affordable = save.wallet >= item.coins;
    const worn = wearingItem(save, item);
    // Scarves and hats can be taken off again; costumes and grove items stay.
    const removable = worn && (item.kind === "scarf" || item.kind === "hat");
    const label = owned
      ? worn
        ? removable
          ? "Take off"
          : item.kind === "outfit"
            ? "Wearing"
            : "In your grove"
        : item.kind === "outfit"
          ? "Wear outfit"
          : "Wear"
      : item.reward
        ? item.id === "cosmetic.bee_scarf"
          ? "Complete Lantern Beehive"
          : item.id === "cosmetic.acorn_cap"
            ? "Find 10 acorns"
            : item.id === "cosmetic.golden_leaf"
              ? "Find every acorn"
              : "Earn a Petal Post medal"
        : locked
          ? `${item.fireflies} fireflies needed`
          : `${item.coins} coins`;
    const preview =
      item.kind === "outfit"
        ? icon("pip")
        : item.kind === "scarf"
          ? `<svg viewBox="0 0 40 40"><path d="M6 14q14 6 28 0v6q-14 6-28 0z" fill="currentColor"/><path d="M22 18l3 16h-7z" fill="currentColor"/></svg>`
          : item.kind === "hat"
            ? `<svg viewBox="0 0 40 40"><path d="M8 28q12-26 24 0z" fill="currentColor"/><rect x="4" y="27" width="32" height="5" rx="2.5" fill="currentColor" opacity=".75"/></svg>`
            : item.id === "lanterns"
              ? icon("firefly")
              : item.id === "flowers"
                ? "✿"
                : "♧";
    return `<article class="shop-item ${worn && item.kind !== "decoration" ? "worn" : ""}" data-item="${item.id}"><div class="shop-preview ${item.kind}" data-cosmetic="${item.id}" aria-hidden="true">${preview}</div><div><small>${tag}</small><h3>${item.name}</h3><p>${item.description}</p><button data-buy="${item.id}" ${(worn && !removable) || (!owned && (locked || !affordable)) ? "disabled" : ""}>${label}</button>${!owned && !locked && !affordable ? `<span class="shop-shortfall">${item.coins - save.wallet} more coins</span>` : ""}</div></article>`;
  };
  $("#shop-items").innerHTML = sections
    .map(
      ({ kind, title, tag }) =>
        `<h3 class="shop-section">${title}</h3>` +
        SHOP_ITEMS.filter((item) => item.kind === kind)
          .map((item) => card(item, tag))
          .join(""),
    )
    .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = SHOP_ITEMS.find((item) => item.id === button.dataset.buy)!;
      const result = purchaseItem(save, item.id);
      if (result === "removed") {
        dressGame(game);
        writeSave(save);
        audio.unlock();
        audio.play("equip");
        $("#shop-status").textContent = `${item.name} taken off.`;
        renderShop();
        updateAdventureChoices();
      } else if (result === "purchased" || result === "equipped") {
        dressGame(game);
        writeSave(save);
        audio.unlock();
        audio.play(result === "purchased" ? "purchase" : "equip");
        $("#shop-status").textContent =
          item.kind === "decoration"
            ? `${item.name} added to your grove.`
            : `Pip is wearing ${item.name}.`;
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
  // The speaker button is a master mute: music and sound effects together.
  const anySound = audio.enabled || audio.musicEnabled;
  $(".sound-button").innerHTML = icon(anySound ? "sound" : "muted");
  $(".sound-button").setAttribute(
    "aria-label",
    anySound ? "Mute all sound" : "Turn sound on",
  );
  $(".sound-button").setAttribute("aria-pressed", String(anySound));
  $(".menu-sound").innerHTML =
    `${icon(anySound ? "sound" : "muted")} Sound ${anySound ? "on" : "off"}`;
  $<HTMLInputElement>("#sfx-toggle").checked = audio.enabled;
  $<HTMLInputElement>("#music-toggle").checked = audio.musicEnabled;
  $<HTMLInputElement>("#haptics-toggle").checked = audio.hapticsEnabled;
  $<HTMLInputElement>("#messages-toggle").checked = save.messages;
  $<HTMLSelectElement>("#game-speed").value = String(save.gameSpeed);
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
  if (runKind === "boss") {
    game = replayArena
      ? new Game(0, { level: replayArena, mode: save.playMode })
      : createFinaleRun(bossArena, save.playMode, bossOrigin ?? undefined);
    // Running out of lives in the boss level retries the arena, not the trail.
    game.lives = MAX_LIVES;
    dressGame(game);
    session = null;
    mode = "boss-intro";
    seenTutorials.clear();
    toastUntil = 0;
    controls.reset();
    game.clearInput();
    last = performance.now();
    updateUI();
    return;
  }
  if (runKind === "secret" && session?.inSecret)
    runKind = session.parent.level.kind === "grove" ? "grove" : "world";
  if (runKind === "world" && !worldUnlocked(save, selected)) return;
  if (runKind === "challenge" && !challengeUnlocked(save, selected)) return;
  game = createGame(selected);
  // Timed world runs race a ghost of the best run and record a new one.
  const timedWorld = runKind === "world" && game.mode === "timed";
  ghostRecorder = timedWorld ? new GhostRecorder() : null;
  game.ghost = timedWorld ? loadGhost(levels[selected]!.contentId!) : null;
  session =
    runKind === "world" || runKind === "grove"
      ? new AdventureSession(game)
      : null;
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
/** Leave a tip card. Keys and touches still held carry on, so a player who
 * was running keeps running instead of having to press again. */
function continueFromTip() {
  if (mode !== "tip") return;
  mode = "playing";
  game.clearInput();
  last = performance.now();
  updateUI();
  canvas.focus({ preventScroll: true });
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
let hitStopUntil = 0;
let ghostRecorder: GhostRecorder | null = null;
let nextChimeAt = 0;
/** A soft chime that quickens as Pip nears an unrescued firefly. */
function fireflyChime(now: number) {
  const p = game.player;
  let nearest = Infinity;
  for (const fly of game.fireflies) {
    if (fly.collected) continue;
    nearest = Math.min(
      nearest,
      Math.hypot(fly.x - (p.x + p.w / 2), fly.y - (p.y + p.h / 2)),
    );
  }
  if (nearest > 420) return;
  if (now < nextChimeAt) return;
  audio.play("firefly-near");
  nextChimeAt = now + 450 + (nearest / 420) * 1300;
}
function saveAcorns() {
  if (runKind !== "world") return;
  const indices = game.acorns.flatMap((a, i) => (a.collected ? [i] : []));
  const earned = recordAcorns(save, selected, indices);
  writeSave(save);
  updateWorlds();
  if (earned.length && save.messages) {
    const name =
      SHOP_ITEMS.find((item) => item.id === earned.at(-1))?.name ?? "outfit";
    $("#game-toast").innerHTML = `${icon("leaf")}<span></span>`;
    $("#game-toast span").textContent =
      `${name} unlocked! Wear it from the Home Grove.`;
    $("#game-toast").dataset.event = "reward";
    toastUntil = performance.now() + 3500;
  }
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
    } else if (runKind === "world" || (runKind === "boss" && !bossReplay)) {
      newBest = recordGardenRun(save, selected, game.mode, game.elapsed);
      // A new best Timed run becomes the ghost to race next time.
      if (
        newBest &&
        runKind === "world" &&
        game.mode === "timed" &&
        ghostRecorder
      )
        saveGhost(
          levels[selected]!.contentId!,
          ghostRecorder.finish(game.elapsed),
        );
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
    mode === "title" ||
    mode === "boss-intro" ||
    mode === "tip" ||
    mode === "won" ||
    mode === "lost";
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
    overlay.innerHTML = `<div class="title-content"><p class="eyebrow"><span class="eyebrow-dot"></span> THE SUNSEED TRAILS</p><h1>A little hero.<br><span>A wild adventure.</span></h1><p class="title-description">Find a Wind Feather. Take flight.<br>Bring the garden’s tiny lights back home.</p><button class="primary-button" id="start-button">${icon("play")}<span>Play ${game.level.name}</span></button><div class="title-footnote">${icon("firefly")} ${modeName(save.playMode)} · 3 fireflies · a garden guardian</div></div><div class="hero-callout"><span>Hey, I’m ${heroName()}!</span><svg viewBox="0 0 70 50" aria-hidden="true"><path d="M5 5q42-6 48 32m-12-7 13 10 7-15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>`;
    $("#start-button").addEventListener("click", start);
  } else if (mode === "boss-intro") {
    overlay.innerHTML = `<div class="result-panel"><p class="eyebrow">${replayArena ? "GUARDIAN REMATCH" : game.level.castle ? "CASTLE" : "BOSS LEVEL"}</p><h2>${game.level.name}</h2><p>${replayArena ? `${game.boss?.name ?? "The guardian"} waits ahead. Power blocks are ready before the fight.` : game.level.castle ? `${game.level.subtitle} A checkpoint waits at the guardian's door.` : `${game.boss?.name.split(",")[0] ?? "The guardian"} waits ahead. A checkpoint and power blocks are ready before the fight.`}</p><button class="primary-button" id="boss-start">${replayArena ? "Start the rematch" : game.level.castle ? "Enter the castle" : "Enter the arena"} ${icon("arrow")}</button><div class="panel-links"><button id="home-button">Choose a world</button></div></div>`;
    $("#boss-start").addEventListener("click", resume);
    $("#home-button").addEventListener("click", showMenu);
  } else if (mode === "tip") {
    overlay.innerHTML = `<div class="result-panel tip-card" role="dialog" aria-labelledby="tip-text"><span class="panel-badge">${icon("leaf")}</span><p class="eyebrow">HOW TO PLAY</p><p class="tip-text" id="tip-text"></p><button class="primary-button" id="tip-continue">Continue ${icon("arrow")}</button><p class="tip-footnote">Press Jump to continue. Turn messages off in Settings.</p></div>`;
    $("#tip-text").textContent = tipText;
    $("#tip-continue").addEventListener("click", continueFromTip);
    $<HTMLButtonElement>("#tip-continue").focus({ preventScroll: true });
  } else if (mode === "paused") {
    overlay.innerHTML = `<div class="result-panel"><span class="panel-badge">${icon("pause")}</span><p class="eyebrow">TAKE A BREATHER</p><h2>Adventure can wait.</h2><p>Ready when you are.</p><button class="primary-button" id="resume-button">${icon("play")} Keep exploring</button><div class="panel-links"><button id="restart-button">${runKind === "boss" ? "Restart boss level" : runKind === "grove" ? "Return to grove entrance" : runKind === "minigame" ? "Restart flight" : session?.inSecret ? "Restart whole adventure" : "Restart adventure"}</button><button id="home-button">Choose a world</button></div></div>`;
    $("#resume-button").addEventListener("click", resume);
    bindPanel();
    if (runKind === "secret") {
      const leave = document.createElement("button");
      leave.textContent = session?.inSecret
        ? `Return to ${session.parent.level.name}`
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
  } else if (mode === "won" && runKind === "boss" && bossReplay) {
    overlay.innerHTML = `<div class="result-panel"><p class="eyebrow">${replayArena ? "REMATCH WON" : "BOSS LEVEL COMPLETE"}</p><h2>${game.boss?.name.split(",")[0] ?? "The guardian"} rests.</h2><p>${game.boss?.name ?? "The guardian"} has been defeated again.</p><button class="primary-button" id="restart-button">${replayArena ? "Rematch again" : "Play boss level again"} ${icon("arrow")}</button><div class="panel-links"><button id="home-button">World map</button></div></div>`;
    bindPanel();
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
  requestAnimationFrame(() => {
    layoutMapPath();
    celebrateUnlocks();
  });
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
  // Mute silences everything; unmuting brings back both music and effects.
  const on = !(audio.enabled || audio.musicEnabled);
  audio.enabled = save.sound = on;
  audio.musicEnabled = save.music = on;
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
    mode === "tip" &&
    !event.repeat &&
    ["Space", "Enter", "ArrowUp", "KeyW"].includes(event.code)
  ) {
    event.preventDefault();
    continueFromTip();
    return;
  }
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
  // The tongue button appears only while riding Gulp.
  const tongue = $(".touch-tongue");
  if (tongue.hidden !== !game.riding) tongue.hidden = !game.riding;
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
  // Hidden acorns found in this world (saved as they are found).
  $(".acorn-pill").hidden = runKind !== "world";
  if (runKind === "world") {
    const acorns = save.progress[selected].acorns.length;
    setText("#acorn-count", String(acorns));
    $(".acorn-pill").setAttribute(
      "aria-label",
      `${acorns} of 5 hidden acorns found`,
    );
  }
  // Timed pickups appear only while they are active, each with its seconds.
  const chip = (id: string, glyph: string, seconds: number, name: string) => {
    const el = $(id);
    const shown = Math.ceil(seconds);
    if (el.hidden !== (shown === 0)) el.hidden = shown === 0;
    if (shown === 0) return;
    setText(id, `${glyph} ${shown}s`);
    el.dataset.expiring = String(shown <= 3);
    el.setAttribute("aria-label", `${name}: ${shown} seconds remaining`);
  };
  chip("#magnet-chip", "⊃", game.magnetRemaining, "Coin magnet");
  chip("#spring-chip", "⌇", game.springRemaining, "Spring shoes");
  const shield = $("#shield-chip");
  if (shield.hidden === game.shield) shield.hidden = !game.shield;
  shield.setAttribute("aria-label", "Bubble shield: ready");
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
            ? game.level.name
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
        : game.portalReady === "cloud"
          ? "Jump to enter Cloudbloom Sanctuary"
          : game.portalReady === "moonpool"
            ? "Jump to enter Moonpool Grotto"
            : game.portalReady.startsWith("sky-")
              ? "Jump to explore the secret sky path"
              : "Jump to return to the garden",
    );
  $(".power-state").hidden =
    runKind === "grove" && !game.hasWindFeather && !game.reserveDiamond;
  const reserve = $("#diamond-reserve");
  reserve.hidden = runKind === "minigame";
  reserve.dataset.filled = String(game.reserveDiamond);
  const reserveLabel = game.reserveDiamond
    ? "Reserve Sunseed: stored. It will drop when you shrink."
    : "Reserve Sunseed: empty. Collect a Sunseed while big to store it.";
  reserve.setAttribute("aria-label", reserveLabel);
  reserve.title = reserveLabel;
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
    const instruction =
      boss.kind === "bear"
        ? boss.state === "recover"
          ? "Bonk! Jump on Grumble while it's dizzy!"
          : boss.variant === "roll"
            ? "It's rolling — jump over it!"
            : "Stand close so its icicle falls on Grumble, then step back!"
        : boss.kind === "mole"
          ? boss.state === "recover"
            ? "It's out! Jump on Rumble while it's dizzy!"
            : boss.state === "warning"
              ? "Stand over the moving rubble, jump, then press Down to pound it out!"
              : "Too late — step back and jump the shards!"
          : boss.kind === "spider" && boss.state === "recover"
            ? boss.hanging
              ? "Silka is resting on its thread — jump up and bump it down!"
              : "It fell! Jump on Silka now!"
            : boss.kind === "tortoise"
              ? boss.state === "recover"
                ? "Its shell is too tough to stomp — jump, then press Down to pound it!"
                : "Jump over the spinning shell!"
              : boss.kind === "heartwood"
                ? boss.state === "recover"
                  ? "The crown is glowing — jump on top!"
                  : "Thorn seeds are coming — jump over them!"
                : boss.state === "warning"
                  ? boss.kind === "stag"
                    ? "A charge and ground wave are coming — get ready to jump!"
                    : boss.kind === "spider"
                      ? "Watch the web — keep moving!"
                      : "A gust is coming — find your footing!"
                  : boss.state === "recover"
                    ? boss.kind === "stag" &&
                      game.hazards.some((hazard) => hazard.kind === "gust")
                      ? "Jump over the wave, then land on the guardian!"
                      : "Now! Jump on the guardian’s back!"
                    : "Stay clear and wait for an opening";
    setText("#boss-instruction", instruction);
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
    size: Number(
      $<HTMLSelectElement>("#control-size").value,
    ) as TouchSettings["size"],
    inset: Number($<HTMLInputElement>("#control-inset").value),
    height: Number($<HTMLInputElement>("#control-height").value),
    swapped: $<HTMLInputElement>("#control-swap").checked,
    layout: 2,
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
$("#game-speed").addEventListener("change", () => {
  save.gameSpeed = Number(
    $<HTMLSelectElement>("#game-speed").value,
  ) as typeof save.gameSpeed;
  writeSave(save);
});
$("#messages-toggle").addEventListener("change", () => {
  save.messages = $<HTMLInputElement>("#messages-toggle").checked;
  if (!save.messages) toastUntil = 0;
  writeSave(save);
});
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
  // Game time runs at the chosen speed; records use game time, so a slower
  // speed never changes how a run is scored.
  let delta = ((now - last) / 1000) * save.gameSpeed;
  last = now;
  let input = controls.read();
  if (mode === "tip" && input.jumpPressed) continueFromTip();
  if (
    mode === "title" &&
    input.jumpPressed &&
    !dialog.open &&
    !menuDialog.open &&
    !settingsDialog.open &&
    !groveDialog.open &&
    !activityOpen
  ) {
    start();
    delta = 0;
    input = controls.read();
  }
  if (mode === "playing") {
    // A landed boss hit freezes the action for a few frames, for impact.
    if (now < hitStopUntil) delta = 0;
    game.update(delta, input);
    if (ghostRecorder && runKind === "world" && !session?.inSecret)
      ghostRecorder.sample(game.elapsed, game.player.x, game.player.y);
    if (game.events.includes("boss-hit") || game.events.includes("boss-defeat"))
      hitStopUntil = now + (reducedMotion ? 0 : 90);
    if (runKind === "world" && !session?.inSecret) fireflyChime(now);
    if (game.events.includes("acorn")) saveAcorns();
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
    if (
      game.level.contentId === beehiveLevel.contentId &&
      game.events.includes("secret-complete")
    )
      discoveryChanged = completeBeehive(save) || discoveryChanged;
    if (
      game.events.includes("secret-complete") &&
      EXPLORATION_SECRET_IDS.includes(
        game.level.contentId as ExplorationSecretId,
      )
    )
      discoveryChanged =
        completeSecret(save, game.level.contentId as ExplorationSecretId) ||
        discoveryChanged;
    let rescuedName: string | null = null;
    let rescuedHello = "Find your new friend in the Home Grove.";
    for (const creature of [...CREATURES, ...FRIENDS]) {
      if (
        creature.contentId !== game.level.contentId ||
        save.rescuedCreatures.includes(creature.id)
      )
        continue;
      const centerX = game.player.x + game.player.w / 2;
      const centerY = game.player.y + game.player.h / 2;
      if (
        Math.abs(centerX - creature.x) < 32 &&
        Math.abs(centerY - creature.y) < 34 &&
        rescueCreature(save, creature.id)
      ) {
        rescuedName =
          "name" in creature
            ? creature.name
            : creature.kind === "bird"
              ? "Cloud bird"
              : creature.kind === "frog"
                ? "Frog"
                : "Moth";
        if ("hello" in creature)
          rescuedHello = `${creature.hello} Now it lives in your Home Grove.`;
        discoveryChanged = true;
      }
    }
    if (discoveryChanged) {
      writeSave(save);
      updateJournal();
      updateHelperChoice();
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
      [
        "shrink",
        game.events.includes("diamond-released")
          ? "Reserve Sunseed released! Catch it to grow."
          : "Back to small · find a Sunseed!",
        "diamond",
      ],
      ["diamond-stored", "Sunseed stored for later!", "diamond"],
      [
        "feather",
        "Wind Feather! Jump, release, hold again to fly. Land to refill.",
        "leaf",
      ],
      ["extra-life", "+1 life!", "pip"],
      ["grow", "Big Pip! One hit protected", "diamond"],
      ["star", `Star power! ${STAR_POWER_DURATION} seconds`, "leaf"],
      [
        "magnet",
        `Coin magnet! Nearby coins fly to you for ${MAGNET_DURATION} seconds`,
        "leaf",
      ],
      ["magnet-end", "Coin magnet ended", "leaf"],
      ["shield", "Bubble shield! It pops instead of you getting hurt", "pip"],
      ["shield-pop", "Pop! The bubble shield kept you safe", "pip"],
      [
        "spring",
        `Spring shoes! Higher jumps for ${SPRING_DURATION} seconds`,
        "leaf",
      ],
      ["spring-end", "Spring shoes wore off", "leaf"],
      [
        "ring-start",
        "Coin ring! Catch every blue coin before time runs out",
        "leaf",
      ],
      ["ring-clear", `Every blue coin! +${RING_BONUS} bonus coins`, "leaf"],
      ["ring-fail", "Out of time. Touch the ring to try again", "leaf"],
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
      [
        "boss-defeat",
        game.boss?.kind === "heartwood"
          ? "Briarheart defeated · the garden is awake!"
          : "Guardian resting · the garden is awake!",
        "leaf",
      ],
      ["boss-hit", "A perfect opening!", "pip"],
      [
        "boss-armored",
        "The shell is too tough! Jump, then press Down (or drag down) to ground-pound it.",
        "pip",
      ],
      ["boss-bonk", "Bonk! Its own icicle dazed it — jump on it now!", "pip"],
      ["boss-knock", "The thread snapped! Jump on Silka now!", "pip"],
      ["boss-flushed", "You pounded Rumble out of its tunnel!", "pip"],
      ["boss-roar", "It's getting angry! New attacks ahead.", "pip"],
      ["boss-start", "Watch the warning. Jump when the guardian rests!", "pip"],
      ["awaken", "Your glow woke a new path!", "leaf"],
      ["enemy-break", "A beetle opened a secret route!", "diamond"],
      ["break", "A hidden coin cache!", "diamond"],
      ["star-end", "Star power ended", "leaf"],
      ["mount", "Gulp the frog! It snaps up bugs ahead of you.", "leaf"],
      ["dismount", "Gulp hopped off to keep you safe. Catch it again!", "leaf"],
      [
        "reward-full",
        "You already have a Wind Feather. Use it up, then bump this block again.",
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
        game.level.contentId === beehiveLevel.contentId
          ? "Bee Scarf earned! Return through the glowing flower."
          : "Secret explored! Stand in the glowing gate and press Jump to go back.",
        "leaf",
      ],
    ];
    const message: [string, string, keyof typeof paths] | undefined =
      rescuedName
        ? ["creature-rescue", `${rescuedName} rescued! ${rescuedHello}`, "leaf"]
        : messages.find(([event]) => game.events.includes(event));
    if (message && save.messages) {
      $("#game-toast").innerHTML =
        `${icon(message[2])}<span>${message[1]}</span>`;
      $("#game-toast").dataset.event = message[0];
      toastUntil = now + (message[0] === "feather" ? 4500 : 2300);
    }
    if (save.messages && !message && now > toastUntil) {
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
        const tipKey = `${game.level.contentId ?? game.level.id}:${tutorialIndex}`;
        seenTutorials.add(tipKey);
        if (runKind !== "minigame" && !save.tipsSeen.includes(tipKey)) {
          // The first time a tip appears, stop play and show it large.
          save.tipsSeen.push(tipKey);
          writeSave(save);
          tipText = game.level.tutorials![tutorialIndex].text;
          mode = "tip";
          game.clearInput();
          updateUI();
        }
        $("#game-toast").innerHTML = `${icon("leaf")}<span></span>`;
        $("#game-toast span").textContent =
          game.level.tutorials![tutorialIndex].text;
        $("#game-toast").dataset.event = "tutorial";
        toastUntil = now + 4500;
      }
    }
    updateHUD();
    const finale =
      (runKind === "world" || (runKind === "boss" && !replayArena)) &&
      !session?.inSecret
        ? finaleFor(game)
        : null;
    if (finale) {
      // Keep world rewards and firefly progress; victory belongs to the
      // separate boss level, not to the approach. A castle's door hands
      // over to its guardian's room the same way.
      if (runKind === "world") {
        saveRescuedFireflies();
        bossReplay = false;
      }
      bossOrigin = game;
      replayArena = null;
      bossArena = finale;
      const bossGame = createFinaleRun(finale, game.mode, game);
      session = null;
      changeScene(bossGame, "boss");
      mode = "boss-intro";
      updateUI();
    } else if (game.state !== "playing" || game.minigame.finished) finish();
    else if (
      session &&
      game.requestedPortal &&
      ((
        [
          "beehive",
          "cloud",
          "moonpool",
          "sky-meadow",
          "sky-hollow",
          "sky-cloudtop",
        ] as string[]
      ).includes(game.requestedPortal) ||
        isHideawayTarget(game.requestedPortal))
    ) {
      const next = session.enter(game.requestedPortal as SecretTarget);
      if (next !== game) {
        if (
          EXPLORATION_SECRET_IDS.includes(
            next.level.contentId as ExplorationSecretId,
          ) &&
          discoverSecret(save, next.level.contentId as ExplorationSecretId)
        ) {
          writeSave(save);
          updateJournal();
        }
        changeScene(next, "secret");
      }
    } else if (game.requestedPortal === "return") returnFromBeehive();
  }
  $(".checkpoint-toast").hidden = mode !== "playing" || now > toastUntil;
  audio.setMusic(
    game.level.theme === "cloud"
      ? "alpine"
      : game.level.theme === "grotto"
        ? "hive"
        : game.level.theme,
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
updateHelperChoice();
updateSound();
updateUI();
requestAnimationFrame(frame);
