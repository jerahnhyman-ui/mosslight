import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { build } from "vite";
import { chromium } from "@playwright/test";

/** Test actual activity dialogs and touch-sized controls on several screens. */
export async function checkGardenActivities(browser) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const entry = fileURLToPath(
    new URL("../.activity-check.ts", import.meta.url),
  );
  const module = fileURLToPath(new URL("../src/minigames.ts", import.meta.url));
  const source = `import { openMiniGame } from ${JSON.stringify(module)}; window.activityResults = []; window.openActivity = (kind) => openMiniGame(kind, () => document.body.dataset.closed = "yes", result => window.activityResults.push(result));`;
  const result = await build({
    configFile: false,
    root,
    logLevel: "silent",
    plugins: [
      {
        name: "activity-check",
        resolveId: (id) => (id === entry ? entry : undefined),
        load: (id) => (id === entry ? source : undefined),
      },
    ],
    build: {
      write: false,
      lib: { entry, formats: ["iife"], name: "GardenActivityCheck" },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (part) => part.output,
  );
  const js = outputs.find((item) => item.type === "chunk");
  if (!js) throw new Error("Mini-game browser fixture did not build");
  const css = outputs
    .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
    .map((item) => item.source)
    .join("\n");
  for (const [width, height] of [
    [844, 390],
    [568, 320],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: true,
    });
    try {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setContent(
        "<style>html,body{margin:0;font-family:sans-serif}button{font-family:inherit}</style>",
      );
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: js.code });
      await page.evaluate(() => {
        Math.random = () => 0.999;
        window.openActivity("matching");
      });
      if ((await page.locator(".garden-match-card").count()) !== 12)
        throw new Error("Matching cards missing");
      await page.locator(".garden-match-card").nth(0).click();
      if (
        !(await page
          .locator(".garden-match-card")
          .nth(0)
          .evaluate((element) => element.classList.contains("is-shown")))
      )
        throw new Error("Card did not reveal");
      // The fixed shuffle leaves the pairs at 0/6, 1/7, and so on.
      await page.locator('[data-card="6"]').click();
      for (let i = 1; i < 6; i++) {
        await page.locator(`[data-card="${i}"]`).click();
        await page.locator(`[data-card="${i + 6}"]`).click();
      }
      const matchResults = await page.evaluate(() => window.activityResults);
      if (
        matchResults.length !== 1 ||
        matchResults[0].kind !== "matching" ||
        matchResults[0].moves !== 6
      )
        throw new Error("Matching completion was not reported exactly once");
      await page.locator(".garden-activity-close").click();
      if ((await page.locator("dialog").count()) !== 0)
        throw new Error("Matching dialog did not close");
      await page.evaluate(() => window.openActivity("falling"));
      if ((await page.locator(".garden-stack-cell").count()) !== 160)
        throw new Error("Falling-block board missing");
      const drop = page.locator('[data-action="drop"]');
      const box = await drop.boundingBox();
      if (
        !box ||
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > width ||
        box.y + box.height > height
      )
        throw new Error(`Drop control outside viewport ${width}×${height}`);
      await drop.click();
      if (
        !(await page.locator(".garden-activity-status").textContent()).includes(
          "points",
        )
      )
        throw new Error("Stack score missing");
      await page.locator('[data-action="pause"]').click();
      if (
        !(await page.locator(".garden-activity-status").textContent()).includes(
          "Paused",
        )
      )
        throw new Error("Stack pause failed");
      await page.locator('[data-action="restart"]').click();
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Space");
      for (let i = 0; i < 50; i++) {
        if ((await page.evaluate(() => window.activityResults.length)) > 1)
          break;
        await drop.click();
      }
      const results = await page.evaluate(() => window.activityResults);
      if (
        results.length !== 2 ||
        results[1].kind !== "falling" ||
        !Number.isFinite(results[1].score) ||
        !Number.isFinite(results[1].lines)
      )
        throw new Error(
          "Falling-game completion was not reported exactly once",
        );
      await drop.click();
      if ((await page.evaluate(() => window.activityResults.length)) !== 2)
        throw new Error("Falling-game result reported more than once");
      await page.keyboard.press("Escape");
      if (
        (await page.locator("dialog").count()) !== 0 ||
        (await page.locator("body").getAttribute("data-closed")) !== "yes"
      )
        throw new Error("Stack dialog did not close cleanly");
      if (errors.length) throw new Error(errors.join("; "));
      console.log(
        `PASS Garden Match and Seed Stack: ${width}×${height}, touch controls and keyboard`,
      );
    } finally {
      await page.close();
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox"],
  });
  try {
    await checkGardenActivities(browser);
  } finally {
    await browser.close();
  }
}
