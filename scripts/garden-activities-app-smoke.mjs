import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";

// Exercise the actual game menu and pause flow, not a mock activity launcher.
const root = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({
  root,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
const address = server.httpServer.address();
if (!address || typeof address === "string")
  throw new Error("No local test port");
const executablePath =
  process.env.CHROMIUM_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto(`http://127.0.0.1:${address.port}/`, {
    waitUntil: "networkidle",
  });
  await page.locator("#start-button").click();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "playing",
  );
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(page.locator("#menu-dialog")).toBeVisible();
  await page.locator('[data-activity="matching"]').click();
  await expect(page.locator(".garden-activity")).toBeVisible();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  for (let i = 0; i < 6; i++) {
    await page.locator(`[data-card="${i}"]`).click();
    await page.locator(`[data-card="${i + 6}"]`).click();
  }
  await expect(page.locator(".garden-activity-status")).toContainText(
    "Garden matched!",
  );
  const matchSave = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mosslight-save-v3")),
  );
  if (matchSave?.minigames?.["minigame.garden_match"]?.bestMoves !== 6)
    throw new Error("Matching best did not save after completing the activity");
  await page.locator(".garden-activity-close").click();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.locator("#resume-button").click();
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await page.locator('[data-activity="falling"]').click();
  await expect(page.locator(".garden-activity")).toBeVisible();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  for (let i = 0; i < 50; i++) {
    if (await page.locator('[data-action="pause"]').isDisabled()) break;
    await page.locator('[data-action="drop"]').click();
  }
  await expect(page.locator('[data-action="pause"]')).toBeDisabled();
  const finalSave = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mosslight-save-v3")),
  );
  const stack = finalSave?.minigames?.["minigame.seed_stack"];
  if (!Number.isFinite(stack?.bestScore) || !Number.isFinite(stack?.bestLines))
    throw new Error(
      "Seed Stack best did not save after completing the activity",
    );
  if (
    finalSave.wallet !== matchSave.wallet ||
    finalSave.lifetimeCoins !== matchSave.lifetimeCoins
  )
    throw new Error(
      "Activity results unexpectedly changed the player's coin balance",
    );
  await page.keyboard.press("Escape");
  await expect(page.locator(".garden-activity")).toHaveCount(0);
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#start-button").click();
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(page.locator("#matching-record")).toHaveText("Best: 6 turns");
  await expect(page.locator("#falling-record")).toHaveText(
    `Best score: ${stack.bestScore}`,
  );
  if (errors.length) throw new Error(errors.join("; "));
  console.log(
    "PASS actual game menu, completion, saved bests, pause, return and unchanged coin balance",
  );
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
