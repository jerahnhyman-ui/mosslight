import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// Expose the actual active game only in this isolated development server.
// Fixtures jump to the final approach and end fights; transition, retry, save,
// and replay still run through main.ts and real browser controls. Combat is
// exercised separately by real-input engine tests. This probe is never shipped.
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 4184,
    strictPort: true,
    hmr: false,
    watch: { ignored: ["**/*"] },
  },
  plugins: [
    {
      name: "boss-stage-smoke-observer",
      enforce: "post",
      transform(code, id) {
        if (!id.endsWith("/src/main.ts")) return;
        return `${code}\nglobalThis.__bossStageProbe = () => ({game, mode, runKind, bossOrigin, bossReplay});\n`;
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("http://127.0.0.1:4184");
  // A returning player who has unlocked Windmill Garden but has not completed it.
  await page.evaluate(async () => {
    const { readSave, writeSave } = await import("/src/storage.ts");
    const save = readSave();
    save.progress[0].garden.classic.completed = true;
    save.selectedCharacter = "poppy";
    writeSave(save);
  });
  await page.reload();
  await page.locator('[data-world="3"]').click();
  await page.locator("#start-button").click();
  await page.clock.runFor(100);
  await expect(page.locator("#world-label")).toHaveText("Windmill Garden");
  // Simulate the already-defeated Mill Keeper and stand at the boss approach.
  await page.evaluate(() => {
    const { game } = globalThis.__bossStageProbe();
    if (game.level.contentId !== "world.windmill-garden")
      throw new Error("Expected Windmill Garden");
    game.boss.state = "defeated";
    Object.assign(game.player, {
      x: 12998,
      y: 432,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    game.lives = 2;
    game.hasWindFeather = true;
    game.collectedCoins = 12;
    game.fireflies[0].collected = true;
  });
  await page.keyboard.down("ArrowRight");
  await page.clock.runFor(500);
  await page.keyboard.up("ArrowRight");
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "boss-intro",
  );
  await expect(page.locator("#world-label")).toHaveText(
    "The Thorn King's Grove",
  );
  await expect(page.locator("#boss-start")).toBeVisible();
  let state = await page.evaluate(async () => {
    const { game, runKind } = globalThis.__bossStageProbe();
    const { readSave } = await import("/src/storage.ts");
    const save = readSave();
    return {
      kind: runKind,
      lives: game.lives,
      feather: game.hasWindFeather,
      character: game.character,
      coins: game.collectedCoins,
      fireflies: save.progress[3].fireflies,
      completed: save.progress[3].garden.classic.completed,
    };
  });
  expect(state).toMatchObject({
    kind: "boss",
    lives: 2,
    feather: true,
    character: "poppy",
    coins: 12,
    fireflies: [0],
    completed: false,
  });
  await page.locator("#boss-start").click();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "playing",
  );
  // A genuine pit death with one life left exercises the out-of-lives flow.
  await page.evaluate(() => {
    const { game } = globalThis.__bossStageProbe();
    game.lives = 1;
    Object.assign(game.player, {
      y: 900,
      vy: 100,
      grounded: false,
      invulnerable: 0,
    });
  });
  await page.clock.runFor(200);
  await expect(page.locator(".game-app")).toHaveAttribute("data-mode", "lost");
  await page.locator("#retry-button").click();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "boss-intro",
  );
  state = await page.evaluate(() => {
    const { game } = globalThis.__bossStageProbe();
    return {
      id: game.level.contentId,
      lives: game.lives,
      character: game.character,
    };
  });
  expect(state).toMatchObject({
    id: "boss.thorn-king",
    lives: 3,
    character: "poppy",
  });
  await page.locator("#boss-start").click();
  // Simulate a defeated Briarheart; walking to the real goal must save the
  // world completion and enable the boss replay after reloading the app.
  await page.evaluate(() => {
    const { game } = globalThis.__bossStageProbe();
    game.boss.state = "defeated";
    Object.assign(game.player, {
      x: 2475,
      y: 432,
      vx: 0,
      vy: 0,
      grounded: true,
    });
  });
  await page.clock.runFor(200);
  await expect(page.locator(".game-app")).toHaveAttribute("data-mode", "won");
  state = await page.evaluate(async () => {
    const { readSave } = await import("/src/storage.ts");
    return readSave().progress[3];
  });
  expect(state.garden.classic.completed).toBe(true);
  expect(state.fireflies).toEqual([0]);
  await page.reload();
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(page.locator("#journal-thorn-king")).toBeEnabled();
  await page.locator("#journal-thorn-king").click();
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "boss-intro",
  );
  await expect(page.locator("#world-label")).toHaveText(
    "The Thorn King's Grove",
  );
  const beforeReplay = await page.evaluate(async () => {
    const { readSave } = await import("/src/storage.ts");
    const save = readSave();
    return { progress: save.progress[3], wallet: save.wallet };
  });
  await page.locator("#boss-start").click();
  await page.evaluate(() => {
    const { game } = globalThis.__bossStageProbe();
    game.boss.state = "defeated";
    Object.assign(game.player, {
      x: 2475,
      y: 432,
      vx: 0,
      vy: 0,
      grounded: true,
    });
  });
  await page.clock.runFor(200);
  await expect(page.locator(".game-app")).toHaveAttribute("data-mode", "won");
  const afterReplay = await page.evaluate(async () => {
    const { readSave } = await import("/src/storage.ts");
    const save = readSave();
    return { progress: save.progress[3], wallet: save.wallet };
  });
  expect(afterReplay).toEqual(beforeReplay);
  expect(errors).toEqual([]);
  console.log(
    "PASS actual boss-stage transition, carried progress, loss/retry, completion persistence, and repeatable journal replay without duplicate rewards",
  );
} finally {
  await browser?.close();
  await server.close();
}
