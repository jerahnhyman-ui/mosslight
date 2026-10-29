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
        puzzle: { ...g.puzzleState },
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

  async function activate(x, y, predicate, label) {
    let descending = false;
    for (let n = 0; n < 2500; n++) {
      const p = await observed();
      if (predicate(p.puzzle)) {
        await input();
        return;
      }
      const dx = x - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
      if (p.y + p.h < y - 30) descending = true;
      if (p.y + p.h > y + 10 || p.grounded) descending = false;
      await input({ left: dx < -4, right: dx > 4, jump: !descending });
    }
    throw new Error(
      `Could not activate ${label}: ${JSON.stringify(await observed())}`,
    );
  }
  await activate(530, 390, (q) => q.water === "HIGH", "valve");
  await activate(1290, 370, (q) => q.shutter === "BRIDGE", "current selector");
  await activate(1730, 280, (q) => q.lightGateOpen, "cove receiver");
  async function swimTo(targetX) {
    for (let n = 0; n < 1600; n++) {
      const p = await observed();
      const dx = targetX - (p.x + p.w / 2) - (p.vx * Math.abs(p.vx)) / 6400;
      if (Math.abs(dx) < 5 && Math.abs(p.vx) < 30 && p.y > 190 && p.y < 260) {
        await input();
        return;
      }
      await input({ left: dx < -4, right: dx > 4, jump: p.y > 220 });
    }
    throw new Error(
      `Could not swim to ${targetX}: ${JSON.stringify(await observed())}`,
    );
  }
  await swimTo(2350);
  save = await stored();
  expect(save.rescuedCreatures).toContain("frog");
  expect(save.rescuedCreatures.filter((id) => id === "frog")).toHaveLength(1);
  await page.clock.runFor(1000);
  expect(
    (await stored()).rescuedCreatures.filter((id) => id === "frog"),
  ).toHaveLength(1);
  await swimTo(2210);
  await activate(2160, 370, (q) => q.sluiceGateOpen, "sluice");
  for (let n = 0; n < 300 && (await observed()).y < 325; n++) await input();
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
    "PASS Poppy selection and rendering, Grove→Moonpool discovery, cove puzzle, creature rescue, completion, reload and journal replay",
  );
} finally {
  await browser?.close();
  await server.close();
}
