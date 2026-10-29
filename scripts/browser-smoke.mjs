import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

// Exercise the shipped bundle with real keyboard and browser touch events.
const server = spawn(
  "npm",
  ["run", "preview", "--", "--port", "4173", "--strictPort"],
  { stdio: "pipe", detached: process.platform !== "win32" },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});
let browser;
const errors = [];
const baseURL = "http://127.0.0.1:4173";
// Authored Meadow finish marker; browser routes read only visible HUD progress.
const MEADOW_GOAL_X = 12140;
const captureErrors = (page) =>
  page.on("pageerror", (error) => errors.push(error.message));
const screenshot = (page, name) =>
  page.screenshot({ path: `artifacts/overhaul-${name}.png`, fullPage: true });
async function checkLayout(page, label) {
  const dimensions = await page.evaluate(() => {
    const canvas = document.querySelector("#game");
    const box = canvas.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      canvas: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        backingWidth: canvas.width,
        backingHeight: canvas.height,
      },
      hud: [".coin-meter", ".stars-pill", ".power-state", ".vitals"]
        .map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return {
            selector,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter((rect) => rect.width > 0 && rect.height > 0),
      touchOverlays: ["#game-toast", ".touch-dpad", ".touch-jump"]
        .map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return {
            selector,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter((rect) => rect.width > 0 && rect.height > 0),
    };
  });
  expect(
    dimensions.document.width,
    `${label}: horizontal document overflow`,
  ).toBeLessThanOrEqual(dimensions.viewport.width + 1);
  expect(
    dimensions.document.height,
    `${label}: vertical document overflow`,
  ).toBeLessThanOrEqual(dimensions.viewport.height + 1);
  expect(
    Math.abs(dimensions.canvas.width / dimensions.canvas.height - 16 / 9),
    `${label}: canvas aspect ratio`,
  ).toBeLessThan(0.01);
  expect(
    dimensions.canvas.x,
    `${label}: canvas left edge`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    dimensions.canvas.x + dimensions.canvas.width,
    `${label}: canvas right edge`,
  ).toBeLessThanOrEqual(dimensions.viewport.width + 1);
  expect(
    dimensions.canvas.y,
    `${label}: canvas top edge`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    dimensions.canvas.y + dimensions.canvas.height,
    `${label}: canvas bottom edge`,
  ).toBeLessThanOrEqual(dimensions.viewport.height + 1);
  expect(
    dimensions.canvas.backingWidth,
    `${label}: sharp canvas backing`,
  ).toBeGreaterThanOrEqual(Math.floor(dimensions.canvas.width));
  for (const [index, box] of dimensions.hud.entries()) {
    expect(box.x, `${label}: ${box.selector} left edge`).toBeGreaterThanOrEqual(
      -1,
    );
    expect(
      box.x + box.width,
      `${label}: ${box.selector} right edge`,
    ).toBeLessThanOrEqual(dimensions.viewport.width + 1);
    for (const other of dimensions.hud.slice(index + 1)) {
      const horizontalOverlap =
        Math.min(box.x + box.width, other.x + other.width) -
        Math.max(box.x, other.x);
      const verticalOverlap =
        Math.min(box.y + box.height, other.y + other.height) -
        Math.max(box.y, other.y);
      expect(
        horizontalOverlap > 1 && verticalOverlap > 1,
        `${label}: ${box.selector} overlaps ${other.selector}`,
      ).toBe(false);
    }
  }
  const toast = dimensions.touchOverlays.find(
    (box) => box.selector === "#game-toast",
  );
  if (toast) {
    for (const control of dimensions.touchOverlays.filter(
      (box) => box !== toast,
    )) {
      const horizontalOverlap =
        Math.min(toast.x + toast.width, control.x + control.width) -
        Math.max(toast.x, control.x);
      const verticalOverlap =
        Math.min(toast.y + toast.height, control.y + control.height) -
        Math.max(toast.y, control.y);
      expect(
        horizontalOverlap > 1 && verticalOverlap > 1,
        `${label}: toast overlaps ${control.selector}`,
      ).toBe(false);
    }
  }
}
async function controlCenter(page, name, id) {
  const box = await page.locator(`[data-control="${name}"]`).boundingBox();
  expect(box, `${name} control visible`).not.toBeNull();
  expect(box.width, `${name} touch target width`).toBeGreaterThanOrEqual(44);
  expect(box.height, `${name} touch target height`).toBeGreaterThanOrEqual(44);
  return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function checkSpawnVisibility(page, label) {
  const position = await page.evaluate(() => {
    const canvas = document.querySelector("#game").getBoundingClientRect();
    const dpad = document.querySelector(".touch-dpad").getBoundingClientRect();
    // All trails spawn Pip at (95, 392), with feet at y=430. Include the
    // rendered character's outline, which is wider than the collision box.
    const heroLeft = canvas.left + (87 / 960) * canvas.width;
    const heroRight = canvas.left + (131 / 960) * canvas.width;
    return {
      overlapsHorizontally: heroLeft < dpad.right && heroRight > dpad.left,
      feet: canvas.top + (430 / 540) * canvas.height,
      controlTop: dpad.top,
    };
  });
  if (position.overlapsHorizontally) {
    expect(
      position.controlTop,
      `${label}: movement control must not cover Pip at the start`,
    ).toBeGreaterThanOrEqual(position.feet - 1);
  }
}
async function trailProgress(page) {
  return page
    .locator(".trail-track span")
    .evaluate((element) =>
      Number(element.style.transform.match(/scaleX\(([^)]+)\)/)[1]),
    );
}
async function neutralControls(page) {
  await expect(page.locator(".touch-dpad")).toHaveAttribute(
    "data-direction",
    "0",
  );
  for (const name of ["left", "right", "jump"]) {
    await expect(page.locator(`[data-control="${name}"]`)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.locator(`[data-control="${name}"]`)).not.toHaveClass(
      /pressed/,
    );
  }
}
async function openSettings(page) {
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await page.locator(".menu-controls").click();
  await expect(page.locator("#settings-dialog")).toBeVisible();
}
async function closeSettings(page) {
  await page.locator("#settings-close").click();
  if (await page.locator("#menu-dialog").isVisible())
    await page.locator(".menu-close").click();
}
async function setRange(page, selector, end) {
  await page.locator(selector).focus();
  await page.keyboard.press(end ? "End" : "Home");
}
async function settleLayout(page) {
  // The renderer updates its backing size on the next animation frame after
  // resize. Wait for that frame before judging the new viewport's sharpness.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}
async function checkControlBounds(page, label, safe = 0, bottomSafe = 0) {
  const viewport = page.viewportSize();
  for (const name of ["left", "right", "jump"]) {
    await controlCenter(page, name, 1);
    const box = await page.locator(`[data-control="${name}"]`).boundingBox();
    expect(box.x, `${label}: ${name} left safe area`).toBeGreaterThanOrEqual(
      safe,
    );
    expect(
      box.x + box.width,
      `${label}: ${name} right safe area`,
    ).toBeLessThanOrEqual(viewport.width - safe);
    expect(box.y, `${label}: ${name} top edge`).toBeGreaterThanOrEqual(0);
    expect(
      box.y + box.height,
      `${label}: ${name} bottom safe area`,
    ).toBeLessThanOrEqual(viewport.height - bottomSafe);
  }
  const pad = await page.locator(".touch-dpad").boundingBox();
  const jump = await page.locator(".touch-jump").boundingBox();
  const overlap =
    Math.min(pad.x + pad.width, jump.x + jump.width) - Math.max(pad.x, jump.x);
  expect(
    overlap,
    `${label}: the two thumb controls remain separate`,
  ).toBeLessThanOrEqual(0);
}
async function advanceUntil(
  page,
  condition,
  description,
  maxMilliseconds = 6000,
) {
  for (let elapsed = 0; elapsed < maxMilliseconds; elapsed += 64) {
    if (await condition()) return;
    await page.clock.runFor(64);
  }
  throw new Error(`Timed out waiting for ${description}`);
}
async function walkToX(page, targetX, goalX = MEADOW_GOAL_X) {
  // Read the visible trail-progress indicator, rather than exposing game state.
  for (let frame = 0; frame < 200; frame++) {
    const x = (await trailProgress(page)) * goalX;
    if (Math.abs(targetX - x) < 9) {
      await page.keyboard.up("ArrowLeft");
      await page.keyboard.up("ArrowRight");
      await page.clock.runFor(120);
      return;
    }
    const direction = targetX > x ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.up(
      direction === "ArrowRight" ? "ArrowLeft" : "ArrowRight",
    );
    await page.keyboard.down(direction);
    await page.clock.runFor(32);
  }
  throw new Error(`Could not reach x=${targetX} using keyboard controls`);
}
const walkToMeadowX = (page, targetX) => walkToX(page, targetX);
async function jumpToX(page, targetX, goalX = MEADOW_GOAL_X) {
  await page.keyboard.down("Space");
  await walkToX(page, targetX, goalX);
  await page.clock.runFor(450);
  await page.keyboard.up("Space");
  await page.clock.runFor(64);
}
const jumpToMeadowX = (page, targetX) => jumpToX(page, targetX);
async function readStoredSave(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("mosslight-save-v3") || "null"),
  );
}
async function checkStarPickupVisibility(page, label) {
  const overlaps = await page.evaluate(() => {
    const canvas = document.querySelector("#game").getBoundingClientRect();
    const toast = document.querySelector("#game-toast").getBoundingClientRect();
    // This real-keyboard route stops on the first upper ledge, feet at y=265.
    // The settled follow camera places Pip around x=356. Reserve an expanded
    // area for the full big sprite and its star aura, not just the hitbox.
    const hero = {
      left: canvas.left + (310 / 960) * canvas.width,
      right: canvas.left + (400 / 960) * canvas.width,
      top: canvas.top + (175 / 540) * canvas.height,
      bottom: canvas.top + (280 / 540) * canvas.height,
    };
    return (
      toast.left < hero.right &&
      toast.right > hero.left &&
      toast.top < hero.bottom &&
      toast.bottom > hero.top
    );
  });
  expect(
    overlaps,
    `${label}: star-power toast must not obscure Pip on the upper ledge`,
  ).toBe(false);
}
async function rulesPage(browser, audioNotes) {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  captureErrors(page);
  await page.exposeBinding("recordAudioNote", (_, value) =>
    audioNotes.push(value),
  );
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      const oscillator = original.apply(this, args);
      const setFrequency = oscillator.frequency.setValueAtTime.bind(
        oscillator.frequency,
      );
      oscillator.frequency.setValueAtTime = (frequency, at) => {
        void window.recordAudioNote(frequency);
        return setFrequency(frequency, at);
      };
      return oscillator;
    };
  });
  const startTime = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: startTime });
  await page.clock.pauseAt(new Date(startTime.getTime() + 1000));
  await page.goto(baseURL);
  await page.locator("#start-button").click();
  await page.clock.runFor(64);
  return page;
}
try {
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Preview failed: ${serverOutput}`);
    try {
      if ((await fetch(baseURL)).ok) break;
    } catch {}
    if (attempt > 100) throw new Error(`Preview timeout: ${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  mkdirSync("artifacts", { recursive: true });
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  captureErrors(desktop);
  await desktop.goto(baseURL);
  await expect(
    desktop.getByRole("heading", { name: "A little hero. A wild adventure." }),
  ).toBeVisible();
  await checkLayout(desktop, "desktop title");
  await screenshot(desktop, "desktop-title");
  await desktop
    .getByRole("button", { name: "Mute sound effects", exact: true })
    .click();
  await desktop.reload();
  await expect(
    desktop.getByRole("button", { name: "Enable sound effects", exact: true }),
  ).toBeVisible();
  await desktop
    .getByRole("button", { name: "How to play", exact: true })
    .click();
  await expect(
    desktop.getByRole("heading", { name: "Little hero. Big leaps." }),
  ).toBeVisible();
  await desktop.keyboard.press("Escape");
  await desktop.locator("#start-button").click();
  await expect(desktop.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "playing",
  );
  await desktop.keyboard.down("ArrowRight");
  await desktop.waitForTimeout(620);
  await desktop.keyboard.down("Space");
  await desktop.waitForTimeout(180);
  await desktop.keyboard.up("Space");
  await desktop.keyboard.up("ArrowRight");
  await expect(desktop.locator("#coin-count")).not.toHaveText("00");
  await screenshot(desktop, "desktop-gameplay");
  await desktop
    .getByRole("button", { name: "Pause game", exact: true })
    .click();
  await expect(desktop.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  const pausedTime = await desktop.locator("#timer").textContent();
  await desktop.waitForTimeout(1100);
  await expect(desktop.locator("#timer")).toHaveText(pausedTime);
  await desktop.locator("#home-button").click();
  await desktop.locator('[data-menu-world="1"]').click();
  await expect(desktop.locator("#world-label")).toHaveText("Firefly Hollow");
  await desktop.locator("#start-button").click();
  await desktop
    .getByRole("button", { name: "Pause game", exact: true })
    .click();
  await desktop
    .getByRole("button", { name: "Restart adventure", exact: true })
    .click();
  await expect(desktop.locator("#lives")).toHaveAttribute(
    "aria-label",
    "3 lives remaining",
  );
  await expect(desktop.locator("#coin-count")).toHaveText("00");
  await screenshot(desktop, "dusk-gameplay");
  console.log(
    "PASS desktop: keyboard movement/collection, jump, pause freezes timer, restart, world selection, help, persisted sound",
  );

  const lowFPS = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  captureErrors(lowFPS);
  // Slow the actual animation scheduler before the app starts. This catches
  // a UI-level dt cap that makes game time run slowly on low-frame-rate devices.
  await lowFPS.addInitScript(() => {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 1000 / 15);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await lowFPS.goto(baseURL);
  await lowFPS.locator("#start-button").click();
  const clockStart = Date.now();
  await lowFPS.waitForTimeout(4800);
  await lowFPS.getByRole("button", { name: "Pause game", exact: true }).click();
  const wallSeconds = (Date.now() - clockStart) / 1000;
  const [minutes, seconds] = (await lowFPS.locator("#timer").textContent())
    .split(":")
    .map(Number);
  const gameSeconds = minutes * 60 + seconds;
  expect(
    gameSeconds,
    "15fps game clock follows wall time",
  ).toBeGreaterThanOrEqual(wallSeconds - 1.1);
  expect(gameSeconds, "15fps game clock does not run fast").toBeLessThanOrEqual(
    wallSeconds + 0.2,
  );
  await lowFPS.close();
  console.log(
    "PASS low frame rate: game clock keeps pace at approximately 15fps",
  );

  const audioNotes = [];
  const rules = await rulesPage(browser, audioNotes);
  await expect(rules.locator("#player-form")).toHaveText("Small");
  await expect(rules.locator("#lives")).toHaveAttribute(
    "aria-label",
    "3 lives remaining",
  );
  await expect(rules.locator("#coin-count")).toHaveText("00");
  await expect(rules.locator("#coin-total")).toHaveText("/ 50");
  await expect(rules.locator("#star-power")).toBeHidden();
  await rules.screenshot({
    path: "artifacts/rules-small-phone.png",
    fullPage: true,
  });
  await walkToMeadowX(rules, 225);
  await expect(rules.locator("#player-form")).toHaveText("Big");
  await expect(rules.locator(".power-state")).toHaveAttribute(
    "data-form",
    "big",
  );
  await expect(rules.locator("#game-toast")).toHaveAttribute(
    "data-event",
    "grow",
  );
  await expect(rules.locator("#coin-count")).not.toHaveText("00");
  await checkLayout(rules, "phone big Pip HUD");
  await rules.screenshot({
    path: "artifacts/rules-diamond-growth.png",
    fullPage: true,
  });
  const earnedSave = await readStoredSave(rules);
  expect(
    earnedSave.wallet,
    "collected trail coins enter the permanent wallet at full lives",
  ).toBeGreaterThan(0);
  expect(earnedSave.lifetimeCoins).toBe(earnedSave.wallet);
  await rules.clock.runFor(500);
  expect(
    (await readStoredSave(rules)).wallet,
    "idle frames cannot award the same coin again",
  ).toBe(earnedSave.wallet);
  const growthNotes = [...audioNotes];
  expect(
    growthNotes,
    "collecting a diamond schedules its growth sound",
  ).toContain(550);
  const notesBeforeHit = audioNotes.length;
  await rules.keyboard.down("ArrowRight");
  await advanceUntil(
    rules,
    async () => (await rules.locator("#player-form").textContent()) === "Small",
    "enemy contact shrinking big Pip",
  );
  await rules.keyboard.up("ArrowRight");
  await expect(rules.locator("#lives")).toHaveAttribute(
    "aria-label",
    "3 lives remaining",
  );
  expect(
    audioNotes.slice(notesBeforeHit),
    "enemy contact schedules the shrink sound",
  ).toContain(220);
  await expect(rules.locator("#game-toast")).toHaveAttribute(
    "data-event",
    "shrink",
  );
  await checkLayout(rules, "phone shrink feedback");
  await rules.screenshot({
    path: "artifacts/rules-enemy-shrink.png",
    fullPage: true,
  });
  // Remain on solid ground while the patrolling bug comes back after hit immunity.
  await advanceUntil(
    rules,
    async () =>
      (await rules.locator("#lives").getAttribute("aria-label")) ===
      "2 lives remaining",
    "a subsequent small-form enemy hit losing a life",
    10000,
  );
  await expect(rules.locator("#player-form")).toHaveText("Small");
  expect(
    await trailProgress(rules),
    "losing a life respawns Pip near the start",
  ).toBeLessThan(0.05);
  await walkToMeadowX(rules, 225);
  await expect(rules.locator("#player-form")).toHaveText("Big");
  // The diamond must respawn too, so a lost life never leaves growth unavailable.
  await expect(rules.locator("#lives")).toHaveAttribute(
    "aria-label",
    "2 lives remaining",
  );
  let furthestX = 0;
  await rules.keyboard.down("ArrowRight");
  await advanceUntil(
    rules,
    async () => {
      furthestX = Math.max(
        furthestX,
        (await trailProgress(rules)) * MEADOW_GOAL_X,
      );
      return (
        (await rules.locator("#lives").getAttribute("aria-label")) ===
        "1 lives remaining"
      );
    },
    "walking off the first pit losing a life",
  );
  await rules.keyboard.up("ArrowRight");
  expect(
    furthestX,
    "Pip actually crossed the first pit edge before life loss",
  ).toBeGreaterThan(810);
  await expect(rules.locator("#player-form")).toHaveText("Small");
  expect(await trailProgress(rules)).toBeLessThan(0.05);
  await rules.close();

  const stars = await rulesPage(browser, audioNotes);
  await walkToMeadowX(stars, 230);
  await jumpToMeadowX(stars, 386);
  await walkToMeadowX(stars, 445);
  const notesBeforeStar = audioNotes.length;
  await jumpToMeadowX(stars, 616);
  await expect(stars.locator("#firefly-count")).toHaveText("0");
  // A power star must never count as a permanently rescued exploration firefly.
  await expect(stars.locator(".power-state")).toHaveAttribute(
    "data-powered",
    "true",
  );
  await expect(stars.locator("#star-power")).toBeVisible();
  await expect(stars.locator("#game-toast")).toHaveAttribute(
    "data-event",
    "star",
  );
  await checkLayout(stars, "phone star power HUD");
  await checkStarPickupVisibility(stars, "phone");
  expect(
    audioNotes.slice(notesBeforeStar),
    "collecting a star schedules its power sound",
  ).toContain(990);
  await stars.screenshot({
    path: "artifacts/rules-star-power.png",
    fullPage: true,
  });
  await stars.setViewportSize({ width: 568, height: 320 });
  await stars.evaluate(() => {
    const style = document.documentElement.style;
    style.setProperty("--safe-left", "44px");
    style.setProperty("--safe-right", "44px");
    style.setProperty("--safe-bottom", "21px");
  });
  await stars.clock.runFor(64);
  await checkLayout(
    stars,
    "small phone star power with notch and home indicator",
  );
  await checkStarPickupVisibility(stars, "small phone with safe areas");
  await stars.screenshot({
    path: "artifacts/rules-star-power-small-safe-area.png",
    fullPage: true,
  });
  await stars.getByRole("button", { name: "Pause game", exact: true }).click();
  const pausedPower = await stars
    .locator("#star-power")
    .getAttribute("data-seconds");
  await stars.clock.runFor(2500);
  await expect(stars.locator("#star-power")).toHaveAttribute(
    "data-seconds",
    pausedPower,
  );
  await stars
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await stars.clock.runFor(11000);
  await expect(stars.locator("#star-power")).toBeHidden();
  await expect(stars.locator(".power-state")).toHaveAttribute(
    "data-powered",
    "false",
  );
  await expect(stars.locator("#player-form")).toHaveText("Big");
  await expect(stars.locator("#lives")).toHaveAttribute(
    "aria-label",
    "3 lives remaining",
  );
  await stars.close();
  console.log(
    "PASS rules: diamond growth, enemy shrink, small-form life loss, diamond respawn, pit life loss, star countdown/pause/expiry, WebAudio effects",
  );

  const secretNotes = [];
  const secrets = await rulesPage(browser, secretNotes);
  await walkToMeadowX(secrets, 230);
  await jumpToMeadowX(secrets, 386);
  await walkToMeadowX(secrets, 445);
  await jumpToMeadowX(secrets, 616);
  await expect(secrets.locator("#firefly-count")).toHaveText("0");
  await walkToMeadowX(secrets, 750);
  await secrets.clock.runFor(400);
  await walkToMeadowX(secrets, 775);
  await jumpToMeadowX(secrets, 1000);
  await walkToMeadowX(secrets, 1020);
  await jumpToMeadowX(secrets, 1186);
  await walkToMeadowX(secrets, 1255);
  await jumpToMeadowX(secrets, 1431);
  await expect(secrets.locator("#firefly-count")).toHaveText("1");
  const rescued = await secrets.evaluate(
    () =>
      JSON.parse(localStorage.getItem("mosslight-save-v3")).worlds[
        "world.sunlit-meadow"
      ].rescuedFireflies,
  );
  expect(
    rescued,
    "the actual firefly pickup is saved before completing the trail",
  ).toEqual(["world.sunlit-meadow.firefly.0"]);
  await secrets.screenshot({
    path: "artifacts/adventure-firefly-rescue.png",
    fullPage: true,
  });
  // Traverse the original clearing, then use the extension's first mushroom.
  // These are ordinary keyboard controls and visible HUD/audio observations.
  for (const [takeoff, target] of [
    [null, 1555],
    [1575, 1800],
    [1810, 1966],
    [2025, 2201],
    [null, 2380],
    [2405, 2630],
    [2650, 2801],
    [2855, 3045],
    [null, 3300],
  ]) {
    if (takeoff === null) {
      await walkToMeadowX(secrets, target);
      await secrets.clock.runFor(450);
    } else {
      await walkToMeadowX(secrets, takeoff);
      await jumpToMeadowX(secrets, target);
    }
  }
  await walkToMeadowX(secrets, 3630);
  await expect(secrets.locator("#section-name")).toContainText(
    "Mushroom Grove",
  );
  await expect(secrets.locator("#checkpoint-count")).toContainText("1 / 5");
  const notesBeforeBounce = secretNotes.length;
  await secrets.keyboard.down("Space");
  await walkToMeadowX(secrets, 3740);
  await advanceUntil(
    secrets,
    async () => secretNotes.slice(notesBeforeBounce).includes(620),
    "landing on the mushroom produces its bounce sound",
    2000,
  );
  await walkToMeadowX(secrets, 3970);
  await secrets.clock.runFor(400);
  await secrets.keyboard.up("Space");
  await expect(secrets.locator("#lives")).toHaveAttribute(
    "aria-label",
    "3 lives remaining",
  );
  await secrets.screenshot({
    path: "artifacts/adventure-mushroom-grove.png",
    fullPage: true,
  });
  await secrets.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(secrets.locator("#forest-map")).toBeVisible();
  await expect(secrets.locator("#restoration-count")).toContainText("1");
  await secrets.screenshot({
    path: "artifacts/adventure-restored-world-map.png",
    fullPage: true,
  });
  await secrets.locator("#restoration-count").scrollIntoViewIfNeeded();
  await secrets.screenshot({
    path: "artifacts/adventure-map-progress.png",
    fullPage: true,
  });
  await secrets.reload();
  await secrets.locator("#start-button").click();
  await expect(secrets.locator("#firefly-count")).toHaveText("1");
  await secrets.close();
  console.log(
    "PASS adventure: power stars are separate, real firefly rescue persists, keyboard route reaches extended Mushroom Grove, bounce/checkpoint feedback, restored map and reloaded HUD agree",
  );

  const mobile = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  captureErrors(mobile);
  await mobile.goto(baseURL);
  await checkLayout(mobile, "phone landscape title");
  await screenshot(mobile, "phone-title");
  await mobile.locator("#start-button").tap();
  await expect(mobile.locator(".touch-controls")).toBeVisible();
  await checkSpawnVisibility(mobile, "phone landscape");
  const touchSession = await mobile.context().newCDPSession(mobile);
  const touch = (type, points = []) =>
    touchSession.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points,
    });
  const right = await controlCenter(mobile, "right", 1);
  const left = await controlCenter(mobile, "left", 1);
  const jump = await controlCenter(mobile, "jump", 2);
  await touch("touchStart", [right]);
  await expect(mobile.locator('[data-control="right"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await mobile.waitForTimeout(620);
  await expect(mobile.locator("#coin-count")).not.toHaveText("00");
  // Add a second finger without releasing movement, then change direction with the first.
  await touch("touchStart", [right, jump]);
  await expect(mobile.locator('[data-control="right"]')).toHaveClass(/pressed/);
  await expect(mobile.locator('[data-control="jump"]')).toHaveClass(/pressed/);
  await mobile.waitForTimeout(180);
  await screenshot(mobile, "phone-gameplay");
  const beforeTurn = await trailProgress(mobile);
  await touch("touchMove", [left, jump]);
  await expect(mobile.locator('[data-control="left"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(mobile.locator('[data-control="right"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(mobile.locator('[data-control="jump"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => trailProgress(mobile), {
      message:
        "sliding the same held thumb left reverses actual player progress",
      timeout: 1500,
    })
    .toBeLessThan(beforeTurn - 16 / MEADOW_GOAL_X);
  const beforeTurningBack = await trailProgress(mobile);
  await touch("touchMove", [right, jump]);
  await expect(mobile.locator('[data-control="right"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(mobile.locator('[data-control="left"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect
    .poll(() => trailProgress(mobile), {
      message: "sliding back right restores forward movement without lifting",
      timeout: 1500,
    })
    .toBeGreaterThan(beforeTurningBack + 16 / MEADOW_GOAL_X);
  await touch("touchCancel");
  await neutralControls(mobile);
  // The pause action must clear captured fingers before hiding the control surface.
  await touch("touchStart", [right, jump]);
  await expect(mobile.locator('[data-control="jump"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await mobile.getByRole("button", { name: "Pause game", exact: true }).click();
  await expect(mobile.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await neutralControls(mobile);
  await touch("touchEnd");
  await mobile
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await neutralControls(mobile);
  await mobile.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(
    mobile.getByRole("heading", { name: "Choose your adventure." }),
  ).toBeVisible();
  await mobile.locator('[data-menu-world="2"]').click();
  await expect(mobile.locator("#world-label")).toHaveText("Cloudtop Crossing");
  await mobile.getByRole("button", { name: "Game menu", exact: true }).click();
  await mobile.getByRole("button", { name: "Effects on", exact: true }).click();
  await expect(
    mobile.getByRole("button", { name: "Effects off", exact: true }),
  ).toBeVisible();
  await mobile.locator(".menu-help").click();
  await expect(
    mobile.getByRole("heading", { name: "Little hero. Big leaps." }),
  ).toBeVisible();
  await mobile
    .getByRole("button", { name: "Close instructions", exact: true })
    .click();
  await screenshot(mobile, "alpine-title");
  console.log(
    "PASS phone landscape: real movement/collection, simultaneous jump, same-finger directional sliding, cancellation and pause release, menu, worlds, sound, help",
  );

  const settings = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  captureErrors(settings);
  await settings.goto(baseURL);
  await openSettings(settings);
  await settings.locator("#control-size").selectOption("1.15");
  await setRange(settings, "#control-inset", true);
  await setRange(settings, "#control-height", true);
  await settings.locator("#control-swap").check();
  await settings.locator("#music-toggle").uncheck();
  await settings.locator("#haptics-toggle").uncheck();
  await settings.locator("#sfx-toggle").uncheck();
  await settings.locator("#settings-dialog").evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await settings.screenshot({
    path: "artifacts/adventure-control-settings.png",
    fullPage: true,
  });
  await closeSettings(settings);
  await settings.reload();
  await openSettings(settings);
  await expect(settings.locator("#control-size")).toHaveValue("1.15");
  await expect(settings.locator("#control-inset")).toHaveValue("40");
  await expect(settings.locator("#control-height")).toHaveValue("40");
  await expect(settings.locator("#control-swap")).toBeChecked();
  await expect(settings.locator("#music-toggle")).not.toBeChecked();
  await expect(settings.locator("#haptics-toggle")).not.toBeChecked();
  await expect(settings.locator("#sfx-toggle")).not.toBeChecked();
  await closeSettings(settings);
  await settings.locator("#start-button").click();
  const swappedPad = await settings.locator(".touch-dpad").boundingBox();
  const swappedJump = await settings.locator(".touch-jump").boundingBox();
  expect(
    swappedPad.x,
    "swapping moves the direction pad to the right",
  ).toBeGreaterThan(swappedJump.x);
  await checkControlBounds(settings, "customized landscape controls");
  await settings.screenshot({
    path: "artifacts/adventure-swapped-controls.png",
    fullPage: true,
  });
  for (const [width, height] of [
    [568, 320],
    [390, 844],
    [844, 390],
  ]) {
    await settings.setViewportSize({ width, height });
    await settings.evaluate(() => {
      const style = document.documentElement.style;
      style.setProperty("--safe-left", "44px");
      style.setProperty("--safe-right", "44px");
      style.setProperty("--safe-bottom", "21px");
    });
    await settleLayout(settings);
    await checkLayout(settings, `max customized controls ${width}x${height}`);
    await checkControlBounds(
      settings,
      `max customized controls ${width}x${height}`,
      44,
      21,
    );
  }
  await openSettings(settings);
  await settings.locator("#control-size").selectOption("0.85");
  await setRange(settings, "#control-inset", false);
  await setRange(settings, "#control-height", false);
  await settings.locator("#control-swap").uncheck();
  await closeSettings(settings);
  // Closing a settings dialog restores the prior paused state, never movement.
  if (
    await settings
      .getByRole("button", { name: "Keep exploring", exact: true })
      .isVisible()
  )
    await settings
      .getByRole("button", { name: "Keep exploring", exact: true })
      .click();
  await settings.setViewportSize({ width: 568, height: 320 });
  await settleLayout(settings);
  await checkControlBounds(settings, "smallest customized controls", 44, 21);
  await neutralControls(settings);
  await settings.close();
  console.log(
    "PASS settings: size, horizontal/vertical placement, swapped sides, independent sound/music/haptics persist and remain usable inside phone safe areas",
  );

  const music = await browser.newPage({
    viewport: { width: 844, height: 390 },
  });
  captureErrors(music);
  await music.addInitScript(() => {
    window.scheduledAudioNotes = 0;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      const oscillator = original.apply(this, args);
      const start = oscillator.start.bind(oscillator);
      oscillator.start = (...startArgs) => {
        window.scheduledAudioNotes++;
        return start(...startArgs);
      };
      return oscillator;
    };
  });
  await music.goto(baseURL);
  await music.locator("#start-button").click();
  await music.waitForTimeout(700);
  const firstNotes = await music.evaluate(() => window.scheduledAudioNotes);
  expect(
    firstNotes,
    "starting a trail starts original background music",
  ).toBeGreaterThan(0);
  await music.waitForTimeout(500);
  expect(
    await music.evaluate(() => window.scheduledAudioNotes),
    "music continues while idle in the level",
  ).toBeGreaterThan(firstNotes);
  await music.getByRole("button", { name: "Pause game", exact: true }).click();
  await music.waitForTimeout(300);
  const pausedNotes = await music.evaluate(() => window.scheduledAudioNotes);
  await music.waitForTimeout(500);
  expect(
    await music.evaluate(() => window.scheduledAudioNotes),
    "pause stops scheduling background music",
  ).toBe(pausedNotes);
  await music
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await music.waitForTimeout(400);
  expect(
    await music.evaluate(() => window.scheduledAudioNotes),
    "resume restarts music",
  ).toBeGreaterThan(pausedNotes);
  await openSettings(music);
  await music.locator("#music-toggle").uncheck();
  await closeSettings(music);
  if (
    await music
      .getByRole("button", { name: "Keep exploring", exact: true })
      .isVisible()
  )
    await music
      .getByRole("button", { name: "Keep exploring", exact: true })
      .click();
  await music.waitForTimeout(300);
  const mutedNotes = await music.evaluate(() => window.scheduledAudioNotes);
  await music.waitForTimeout(500);
  expect(
    await music.evaluate(() => window.scheduledAudioNotes),
    "music mute does not keep scheduling inaudible notes",
  ).toBe(mutedNotes);
  await music.keyboard.press("Space");
  await music.waitForTimeout(100);
  expect(
    await music.evaluate(() => window.scheduledAudioNotes),
    "jump effects still play with music disabled",
  ).toBeGreaterThan(mutedNotes);
  await music.close();
  console.log(
    "PASS music: original score starts after gesture, continues in play, pauses/resumes, and mutes independently of effects",
  );

  const garden = await rulesPage(browser, []);
  await garden.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(garden.locator("#journal-hive")).toBeDisabled();
  await expect(garden.locator("#journal-hoops")).toBeDisabled();
  for (const index of [0, 1, 2])
    await expect(garden.locator(`[data-challenge="${index}"]`)).toBeDisabled();
  await garden.locator("#visit-grove").click();
  await expect(garden.locator(".game-app")).toHaveAttribute(
    "data-run-kind",
    "grove",
  );
  await expect(garden.locator("#world-label")).toHaveText("The Home Grove");
  await garden.clock.runFor(64);
  const groveProgress = await trailProgress(garden);
  await garden.keyboard.down("ArrowRight");
  await garden.clock.runFor(1500);
  await garden.keyboard.up("ArrowRight");
  expect(
    await trailProgress(garden),
    "the home grove is playable with ordinary controls",
  ).toBeGreaterThan(groveProgress + 0.1);
  await garden.locator("#grove-shop-button").click();
  await expect(garden.locator("#grove-dialog")).toBeVisible();
  await expect(garden.locator("#wallet-count")).toHaveText("0 coins");
  await expect(garden.locator('[data-buy="berry"]')).toBeDisabled();
  await expect(garden.locator('[data-buy="moon"]')).toBeDisabled();
  await garden.locator("#grove-done").click();
  await expect(garden.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "playing",
  );
  // Restore an explicitly seeded earned-progress fixture to exercise unlocked
  // rewards. Actual pickup persistence is covered by the real route above.
  await garden.evaluate(() => {
    // A fresh installation may not have written a snapshot yet. This is an
    // intentional v2 migration fixture, not a simulated collectible pickup.
    const saved = { progress: [{ fireflies: [0, 1, 2] }, {}, {}] };
    saved.wallet = 500;
    saved.lifetimeCoins = 500;
    localStorage.removeItem("mosslight-save-v3");
    localStorage.setItem("mosslight-save-v2", JSON.stringify(saved));
  });
  await garden.reload();
  await garden.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(garden.locator('[data-challenge="0"]')).toBeEnabled();
  await expect(garden.locator('[data-challenge="1"]')).toBeDisabled();
  await garden.locator("#visit-grove").click();
  await garden.clock.runFor(64);
  await expect(garden.locator("#run-mode")).toContainText("3 neighbors home");
  await garden.locator("#grove-shop-button").click();
  await expect(garden.locator("#wallet-count")).toHaveText("500 coins");
  for (const item of ["berry", "lanterns", "flowers"])
    await garden.locator(`[data-buy="${item}"]`).click();
  await expect(garden.locator("#wallet-count")).toHaveText("225 coins");
  await expect(garden.locator('[data-buy="berry"]')).toHaveText("Wearing");
  await expect(garden.locator('[data-buy="lanterns"]')).toBeDisabled();
  await garden.locator('[data-buy="leaf"]').click();
  await garden.locator('[data-buy="berry"]').click();
  await expect(garden.locator("#wallet-count")).toHaveText("225 coins");
  await expect(garden.locator('[data-buy="moon"]')).toBeDisabled();
  const purchased = await readStoredSave(garden);
  expect(purchased.outfit).toBe("berry");
  expect(purchased.decorations).toEqual(["lanterns", "flowers"]);
  expect(purchased.lifetimeCoins).toBe(500);
  await garden.screenshot({
    path: "artifacts/garden-shop-acceptance.png",
    fullPage: true,
  });
  await garden.locator("#grove-done").click();
  await garden.clock.runFor(64);
  await checkLayout(garden, "landscape home grove");
  await garden.screenshot({
    path: "artifacts/garden-home-acceptance.png",
    fullPage: true,
  });
  await garden.setViewportSize({ width: 390, height: 844 });
  await garden.clock.runFor(64);
  await checkLayout(garden, "portrait home grove");
  await garden.locator("#grove-shop-button").click();
  await garden.screenshot({
    path: "artifacts/garden-shop-portrait-acceptance.png",
    fullPage: true,
  });
  await garden.locator("#grove-done").click();
  await garden.reload();
  expect((await readStoredSave(garden)).wallet).toBe(225);
  expect((await readStoredSave(garden)).outfit).toBe("berry");
  await garden.getByRole("button", { name: "Game menu", exact: true }).click();
  await garden.locator("#play-mode").selectOption("relaxed");
  await garden.locator('[data-menu-world="0"]').click();
  await garden.locator("#start-button").click();
  await garden.clock.runFor(64);
  await expect(garden.locator("#life-count")).toHaveText("∞");
  await expect(garden.locator("#run-mode")).toHaveText("Relaxed");
  await garden.reload();
  await garden.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(garden.locator("#play-mode")).toHaveValue("relaxed");
  await garden.locator("#play-mode").selectOption("timed");
  await garden.locator('[data-menu-world="0"]').click();
  await garden.locator("#start-button").click();
  await garden.clock.runFor(64);
  await expect(garden.locator("#run-mode")).toHaveText("Timed");
  await expect(garden.locator("#life-count")).toHaveText("3");
  await garden.getByRole("button", { name: "Game menu", exact: true }).click();
  await garden.locator('[data-challenge="0"]').click();
  await garden.setViewportSize({ width: 844, height: 390 });
  await garden.clock.runFor(64);
  await expect(garden.locator(".game-app")).toHaveAttribute(
    "data-run-kind",
    "challenge",
  );
  await expect(garden.locator("#world-label")).toHaveText("Petal-Hop Sprint");
  await expect(garden.locator("#run-mode")).toContainText("Gold 00:18");
  // Complete an optional room with ordinary keyboard input. The long authored
  // route tests separately exercise every raised platform and all three rooms.
  await walkToX(garden, 620, 2180);
  await garden.keyboard.down("Space");
  await walkToX(garden, 735, 2180);
  await garden.clock.runFor(380);
  await walkToX(garden, 1070, 2180);
  await garden.keyboard.up("Space");
  await garden.clock.runFor(500);
  await walkToX(garden, 1200, 2180);
  await jumpToX(garden, 1450, 2180);
  await garden.clock.runFor(400);
  await walkToX(garden, 1810, 2180);
  await garden.clock.runFor(500);
  await garden.keyboard.down("ArrowRight");
  await advanceUntil(
    garden,
    async () =>
      (await garden.locator(".game-app").getAttribute("data-mode")) === "won",
    "challenge finish",
    4000,
  );
  await garden.keyboard.up("ArrowRight");
  await expect(garden.locator(".challenge-medal")).toBeVisible();
  const challengeSave = await readStoredSave(garden);
  expect(challengeSave.challenges["challenge.sunlit-meadow"].completed).toBe(
    true,
  );
  expect(
    challengeSave.challenges["challenge.sunlit-meadow"].bestTime,
  ).toBeGreaterThan(0);
  expect(
    challengeSave.worlds["world.sunlit-meadow"].garden.timed.completed,
    "challenge records never overwrite world boss records",
  ).toBe(false);
  await garden.screenshot({
    path: "artifacts/garden-challenge-finish.png",
    fullPage: true,
  });
  await garden.close();
  console.log(
    "PASS living garden: real coin earning/no frame duplication, locked/unlocked challenges, playable grove, cosmetic purchases/equip/reload, persisted modes, actual-input challenge finish and separate records",
  );

  // Seed the prior Meadow completion only to open the new world. Feather
  // pickup, flying, and the activity unlock below use actual browser input.
  const windmill = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  captureErrors(windmill);
  await windmill.addInitScript(() => {
    localStorage.setItem(
      "mosslight-save-v2",
      JSON.stringify({
        progress: [
          { garden: { classic: { completed: true, bestTime: 80 } } },
          {},
          {},
        ],
      }),
    );
  });
  const windmillStart = new Date("2026-01-01T00:00:00Z");
  await windmill.clock.install({ time: windmillStart });
  await windmill.clock.pauseAt(new Date(windmillStart.getTime() + 1000));
  await windmill.goto(baseURL);
  await windmill
    .getByRole("button", { name: "Game menu", exact: true })
    .click();
  await expect(windmill.locator('[data-menu-world="3"]')).toBeEnabled();
  await windmill.locator('[data-menu-world="3"]').click();
  await expect(windmill.locator("#world-label")).toHaveText("Windmill Garden");
  await windmill.locator("#start-button").click();
  await windmill.clock.runFor(64);
  await windmill.keyboard.down("ArrowRight");
  await advanceUntil(
    windmill,
    async () => windmill.locator("#feather-meter").isVisible(),
    "feather pickup",
  );
  await windmill.keyboard.up("ArrowRight");
  await windmill.clock.runFor(200);
  await expect(windmill.locator("#feather-label")).toHaveText("Ready");
  await windmill.keyboard.down("Space");
  await windmill.clock.runFor(200);
  await windmill.keyboard.up("Space");
  await windmill.clock.runFor(50);
  await windmill.keyboard.down("Space");
  await windmill.clock.runFor(450);
  await windmill.keyboard.up("Space");
  await expect(windmill.locator(".feather-segments")).not.toHaveText("▰▰▰▰");
  await checkLayout(windmill, "Windmill Garden flight phone HUD");
  await screenshot(windmill, "windmill-flight-phone");
  expect((await readStoredSave(windmill)).unlocks.windFeatherDiscovered).toBe(
    true,
  );
  await windmill
    .getByRole("button", { name: "Game menu", exact: true })
    .click();
  await expect(windmill.locator("#journal-hoops")).toBeEnabled();
  await windmill.locator("#journal-hoops").click();
  await windmill.clock.runFor(3200);
  await expect(windmill.locator("#activity-hud")).toBeVisible();
  await expect(windmill.locator("#activity-hoops")).toHaveText("0 / 16 hoops");
  await checkLayout(windmill, "Petal Post phone HUD");
  await screenshot(windmill, "petal-post-phone");
  const courseTouch = await windmill.context().newCDPSession(windmill);
  const courseRight = await controlCenter(windmill, "right", 1);
  const courseJump = await controlCenter(windmill, "jump", 2);
  await courseTouch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [courseRight, courseJump],
  });
  await windmill.clock.runFor(450);
  await courseTouch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    await trailProgress(windmill),
    "two-thumb input moves through the activity",
  ).toBeGreaterThan(0.01);
  await windmill.clock.runFor(60000);
  await expect(windmill.locator("#petal-retry")).toBeVisible();
  await windmill.locator("#petal-retry").click();
  await windmill.clock.runFor(3200);
  await expect(windmill.locator("#activity-hoops")).toHaveText("0 / 16 hoops");
  await expect(windmill.locator("#activity-clock")).toHaveText(/60s|59s/);
  await neutralControls(windmill);
  await windmill.close();
  console.log(
    "PASS Windmill Garden: migrated unlock, keyboard feather pickup and lift, persistence, two-thumb Petal Post input, timeout and retry on phone viewport",
  );

  // This is deliberately a CSS fixture, not a simulated boss win. The engine
  // acceptance tests finish each real world and guardian using normal input.
  const bossLayout = await rulesPage(browser, []);
  for (const [width, height] of [
    [844, 390],
    [568, 320],
    [390, 844],
  ]) {
    await bossLayout.setViewportSize({ width, height });
    await bossLayout.clock.runFor(64);
    await bossLayout.evaluate(() => {
      const boss = document.querySelector("#boss-hud");
      boss.hidden = false;
      boss.dataset.state = "warning";
      document.querySelector("#boss-name").textContent =
        "Bramble, the Stag Beetle · Phase 3";
      document.querySelector("#boss-health").textContent = "●○○";
      document.querySelector("#boss-instruction").textContent =
        "A charge is coming — get ready to jump!";
    });
    const boxes = await bossLayout.evaluate(() => {
      const rect = (selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return {
        boss: rect("#boss-hud"),
        controls: [rect(".touch-dpad"), rect(".touch-jump")],
        section: rect(".section-status"),
      };
    });
    expect(boxes.boss.x).toBeGreaterThanOrEqual(0);
    expect(boxes.boss.x + boxes.boss.width).toBeLessThanOrEqual(width);
    expect(boxes.boss.y).toBeGreaterThanOrEqual(0);
    expect(boxes.boss.y + boxes.boss.height).toBeLessThanOrEqual(height);
    for (const other of [...boxes.controls, boxes.section]) {
      const overlapX =
        Math.min(boxes.boss.x + boxes.boss.width, other.x + other.width) -
        Math.max(boxes.boss.x, other.x);
      const overlapY =
        Math.min(boxes.boss.y + boxes.boss.height, other.y + other.height) -
        Math.max(boxes.boss.y, other.y);
      expect(
        overlapX > 1 && overlapY > 1,
        `boss HUD avoids controls/status at ${width}×${height}`,
      ).toBe(false);
    }
    await bossLayout.screenshot({
      path: `artifacts/garden-boss-layout-${width}.png`,
      fullPage: true,
    });
  }
  await bossLayout.close();
  console.log(
    "PASS boss HUD layout fixture: warnings and health fit landscape, small phone and portrait without covering controls/status",
  );

  for (const [label, width, height] of [
    ["small-phone", 568, 320],
    ["portrait", 390, 844],
    ["tablet", 1194, 834],
  ]) {
    await mobile.setViewportSize({ width, height });
    await mobile.reload();
    await expect(mobile.locator("#start-button")).toBeVisible();
    await checkLayout(mobile, `${label} title`);
    await screenshot(mobile, `${label}-title`);
    await mobile.locator("#start-button").tap();
    await checkLayout(mobile, `${label} gameplay`);
    await checkSpawnVisibility(mobile, label);
    for (const name of ["left", "right", "jump"]) {
      const point = await controlCenter(mobile, name, 1);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(width);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(height);
    }
    await screenshot(mobile, `${label}-gameplay`);
    await mobile.getByRole("button", { name: "Game menu", exact: true }).tap();
    await expect(mobile.locator("#menu-dialog")).toBeVisible();
    await mobile.locator('[data-menu-world="1"]').tap();
    await expect(mobile.locator("#world-label")).toHaveText("Firefly Hollow");
    console.log(
      `PASS ${label}: contained 16:9 canvas, no document overflow, touch target size, accessible world selection`,
    );
  }
  for (const [label, width, height] of [
    ["phone-safe-area", 844, 390],
    ["small-phone-safe-area", 568, 320],
  ]) {
    await mobile.setViewportSize({ width, height });
    await mobile.reload();
    await mobile.evaluate(() => {
      const style = document.documentElement.style;
      style.setProperty("--safe-left", "44px");
      style.setProperty("--safe-right", "44px");
      style.setProperty("--safe-bottom", "21px");
    });
    await mobile.locator("#start-button").tap();
    await checkLayout(mobile, label);
    await checkSpawnVisibility(mobile, label);
    for (const name of ["left", "right", "jump"]) {
      await controlCenter(mobile, name, 1);
      const box = await mobile
        .locator(`[data-control="${name}"]`)
        .boundingBox();
      expect(
        box.x,
        `${label}: ${name} clears the left notch`,
      ).toBeGreaterThanOrEqual(44);
      expect(
        box.x + box.width,
        `${label}: ${name} clears the right notch`,
      ).toBeLessThanOrEqual(width - 44);
      expect(
        box.y + box.height,
        `${label}: ${name} clears the home indicator`,
      ).toBeLessThanOrEqual(height - 21);
    }
    await screenshot(mobile, `${label}-gameplay`);
    console.log(
      `PASS ${label}: spawn visible, controls clear notch/home indicator, canvas contained`,
    );
  }
  expect(errors).toEqual([]);
  console.log("PASS no browser runtime errors");
} finally {
  await browser?.close();
  if (process.platform !== "win32" && server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  } else server.kill("SIGTERM");
  server.stdout.destroy();
  server.stderr.destroy();
}
