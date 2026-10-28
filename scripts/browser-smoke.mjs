import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

// Exercise production assets, including real inputs and small touch layouts.
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
try {
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Preview failed: ${serverOutput}`);
    try {
      if ((await fetch("http://127.0.0.1:4173")).ok) break;
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
  const errors = [];
  const captureErrors = (page) =>
    page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  captureErrors(page);
  await page.goto("http://127.0.0.1:4173");
  await expect(
    page.getByRole("heading", { name: "Adventure grows here." }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/mosslight-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mute sound" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Enable sound" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /How to play/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Let’s wander", exact: true }).click();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(650);
  await page.keyboard.down("Space");
  await page.waitForTimeout(150);
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowRight");
  await expect(page.locator("#coin-count")).not.toHaveText("00");
  await page.getByRole("button", { name: "Pause game" }).click();
  const pausedTime = await page.locator("#timer").textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator("#timer")).toHaveText(pausedTime);
  await page
    .getByRole("button", { name: "Choose a world", exact: true })
    .click();
  await page.locator('[data-menu-world="1"]').click();
  await expect(page.locator("#world-label")).toContainText("FIREFLY HOLLOW");
  await page.getByRole("button", { name: "Let’s wander", exact: true }).click();
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await expect(page.locator("#health")).toHaveAttribute(
    "aria-label",
    "3 hearts remaining",
  );
  await page.screenshot({
    path: "artifacts/mosslight-playing.png",
    fullPage: true,
  });
  console.log(
    "PASS desktop: start, movement/collectible, jump, pause, restart, help, world selection, saved audio preference",
  );

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  captureErrors(mobile);
  await mobile.goto("http://127.0.0.1:4173");
  await expect
    .poll(async () =>
      Math.abs(
        Number(await mobile.locator("#game").getAttribute("width")) - 720,
      ),
    )
    .toBeLessThanOrEqual(2);
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mobile.screenshot({
    path: "artifacts/mosslight-mobile.png",
    fullPage: true,
  });
  await mobile
    .getByRole("button", { name: "Let’s wander", exact: true })
    .click();
  await expect(
    mobile.getByRole("button", { name: "Move right", exact: true }),
  ).toBeVisible();
  const touchSession = await mobile.context().newCDPSession(mobile);
  const right = await mobile.locator('[data-control="right"]').boundingBox();
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: right.x + right.width / 2, y: right.y + right.height / 2 },
    ],
  });
  await mobile.waitForTimeout(650);
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(mobile.locator("#coin-count")).not.toHaveText("00");
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.getByRole("button", { name: "Game menu" }).click();
  await expect(
    mobile.getByRole("heading", { name: "Where shall we wander?" }),
  ).toBeVisible();
  await mobile.locator('[data-menu-world="2"]').click();
  await expect(mobile.locator("#world-label")).toContainText(
    "CLOUDTOP CROSSING",
  );
  await mobile.getByRole("button", { name: "Game menu" }).click();
  await mobile.getByRole("button", { name: "Sound on", exact: true }).click();
  await expect(
    mobile.getByRole("button", { name: "Sound off", exact: true }),
  ).toBeVisible();
  await mobile.locator(".menu-help").click();
  await expect(
    mobile.getByRole("heading", { name: "A few little pointers." }),
  ).toBeVisible();
  await mobile.getByRole("button", { name: "Close instructions" }).click();
  await mobile.screenshot({
    path: "artifacts/mosslight-landscape.png",
    fullPage: true,
  });
  console.log(
    "PASS touch: no horizontal overflow, uncropped canvas, movement/collectible, landscape world picker, sound, help",
  );
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
