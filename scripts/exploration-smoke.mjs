import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// An isolated dev-only probe exposes the active Game for observation; every
// action below still goes through real browser keyboard controls and main.ts.
// Nothing in this plugin is bundled or shipped with Mosslight.
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 4182,
    strictPort: true,
    hmr: false,
    watch: { ignored: ["**/*"] },
  },
  plugins: [
    {
      name: "exploration-smoke-observer",
      enforce: "post",
      transform(code, id) {
        if (id.endsWith("/src/game/renderer.ts")) {
          return `${code}\nconst __observedPoppy = Renderer.prototype.poppyHero;\nRenderer.prototype.poppyHero = function(...args) { globalThis.__poppyDraws = (globalThis.__poppyDraws || 0) + 1; return __observedPoppy.apply(this, args); };\n`;
        }
        if (!id.endsWith("/src/game/engine.ts")) return;
        return `${code}\nconst __observedUpdate = Game.prototype.update;\nGame.prototype.update = function(...args) { globalThis.__explorationGame = this; return __observedUpdate.apply(this, args); };\n`;
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
  await page.goto("http://127.0.0.1:4182");
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await page.locator("#character-choice").selectOption("poppy");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("mosslight-save-v3")).selectedCharacter,
    ),
  ).toBe("poppy");
  await page.locator("#visit-grove").click();
  await page.clock.runFor(100);
  await expect(page.locator("#world-label")).toHaveText("The Home Grove");
  expect(
    await page.evaluate(() => globalThis.__explorationGame.character),
  ).toBe("poppy");
  expect(
    await page.evaluate(() => globalThis.__poppyDraws || 0),
  ).toBeGreaterThan(0);
  const observed = () =>
    page.evaluate(() => {
      const g = globalThis.__explorationGame;
      const p = g.player;
      return {
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        vx: p.vx,
        grounded: p.grounded,
        contentId: g.level.contentId,
        portalReady: g.portalReady,
        complete: g.secretCompleted,
        deaths: g.deaths,
      };
    });
  const held = new Set();
  async function input({ left = false, right = false, jump = false } = {}) {
    for (const [key, on] of [
      ["ArrowLeft", left],
      ["ArrowRight", right],
      ["Space", jump],
    ]) {
      if (on && !held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
      }
      if (!on && held.has(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
    }
    await page.clock.runFor(32);
  }
  async function approach(target, limit = 1600) {
    for (let n = 0; n < limit; n++) {
      const p = await observed();
      const dx = target - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
      if (Math.abs(dx) < 5 && Math.abs(p.vx) < 18) {
        await input();
        return;
      }
      await input({ left: dx < -4, right: dx > 4 });
    }
    throw new Error(
      `Could not walk to ${target}: ${JSON.stringify(await observed())}`,
    );
  }
  async function portal(target) {
    await input();
    for (let n = 0; n < 80; n++) {
      if ((await observed()).portalReady === target) break;
      await input();
    }
    expect((await observed()).portalReady).toBe(target);
    await input({ jump: true });
    await input();
    await page.clock.runFor(100);
  }
  const stored = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("mosslight-save-v3") || "null"),
    );
  await approach(830);
  await portal("moonpool");
  await expect(page.locator("#world-label")).toHaveText("Moonpool Grotto");
  let save = await stored();
  expect(save.secrets["secret.moonpool"].discovered).toBe(true);
  expect(save.secrets["secret.moonpool"].completed).toBe(false);

  async function swimTo(targetX, targetY) {
    for (let n = 0; n < 2500; n++) {
      const p = await observed();
      const dx = targetX - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
      if (
        Math.abs(targetX - (p.x + p.w / 2)) < 16 &&
        Math.abs(targetY - p.y) < 22
      ) {
        await input();
        return;
      }
      await input({ left: dx < -4, right: dx > 4, jump: p.y > targetY });
    }
    throw new Error(
      `Could not swim to ${targetX}, ${targetY}: ${JSON.stringify(await observed())}`,
    );
  }
  // Follow the first rising rock, sink beneath the hanging reef, and swim to the open cove.
  for (const [x, y] of [
    [900, 250],
    [1200, 260],
    [1290, 330],
    [1530, 330],
    [1750, 230],
    [2050, 230],
    [2190, 230],
    [2350, 240],
  ])
    await swimTo(x, y);
  save = await stored();
  expect(save.rescuedCreatures).toContain("frog");
  expect(save.rescuedCreatures.filter((id) => id === "frog")).toHaveLength(1);
  await page.clock.runFor(1000);
  expect(
    (await stored()).rescuedCreatures.filter((id) => id === "frog"),
  ).toHaveLength(1);
  for (const [x, y] of [
    [2190, 230],
    [2180, 330],
    [2560, 330],
    [2700, 280],
  ])
    await swimTo(x, y);
  for (let n = 0; n < 600 && !(await observed()).complete; n++)
    await input({ right: true });
  expect((await observed()).complete).toBe(true);
  await approach(2790);
  save = await stored();
  expect(save.secrets["secret.moonpool"].completed).toBe(true);
  await portal("return");
  await expect(page.locator("#world-label")).toHaveText("The Home Grove");
  await page.reload();
  await page.getByRole("button", { name: "Game menu", exact: true }).click();
  await expect(page.locator("#character-choice")).toHaveValue("poppy");
  const replay = page.locator('[data-secret="secret.moonpool"]');
  await expect(replay).toBeEnabled();
  await expect(replay).toContainText("Moonpool Grotto");
  await expect(replay).toContainText("Explored");
  await replay.click();
  await page.clock.runFor(100);
  await expect(page.locator("#world-label")).toHaveText("Moonpool Grotto");
  expect(
    await page.evaluate(() => globalThis.__explorationGame.character),
  ).toBe("poppy");
  expect(
    await page.evaluate(() => globalThis.__poppyDraws || 0),
  ).toBeGreaterThan(0);
  save = await stored();
  expect(save.rescuedCreatures).toContain("frog");
  expect(errors).toEqual([]);
  console.log(
    "PASS Poppy selection and rendering, Grove→Moonpool discovery, reef traversal, creature rescue, completion, reload and journal replay",
  );
} finally {
  await browser?.close();
  await server.close();
}
