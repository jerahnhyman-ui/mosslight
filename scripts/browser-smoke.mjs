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
async function walkToMeadowX(page, targetX) {
  // Read the visible trail-progress indicator, rather than exposing game state.
  for (let frame = 0; frame < 200; frame++) {
    const x = (await trailProgress(page)) * 3290;
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
  throw new Error(
    `Could not reach meadow x=${targetX} using keyboard controls`,
  );
}
async function jumpToMeadowX(page, targetX) {
  await page.keyboard.down("Space");
  await walkToMeadowX(page, targetX);
  await page.clock.runFor(450);
  await page.keyboard.up("Space");
  await page.clock.runFor(64);
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
    .getByRole("button", { name: "Mute sound", exact: true })
    .click();
  await desktop.reload();
  await expect(
    desktop.getByRole("button", { name: "Enable sound", exact: true }),
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
    .getByRole("button", { name: "Restart trail", exact: true })
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
      furthestX = Math.max(furthestX, (await trailProgress(rules)) * 3290);
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
  await expect(stars.locator("#star-count")).toHaveText("1");
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
    .toBeLessThan(beforeTurn - 0.005);
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
    .toBeGreaterThan(beforeTurningBack + 0.005);
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
  await mobile.getByRole("button", { name: "Sound on", exact: true }).click();
  await expect(
    mobile.getByRole("button", { name: "Sound off", exact: true }),
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
