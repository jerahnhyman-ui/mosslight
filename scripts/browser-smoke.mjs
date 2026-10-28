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
  await expect(desktop.locator("#health")).toHaveAttribute(
    "aria-label",
    "3 hearts remaining",
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
