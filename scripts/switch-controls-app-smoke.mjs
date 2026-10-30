import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// Development-only observer: fixtures move Pip to authored switches, while
// actual keyboard or touch input performs all interactions through the app.
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 4187,
    strictPort: true,
    hmr: false,
    watch: { ignored: ["**/*"] },
  },
  plugins: [
    {
      name: "switch-controls-smoke-observer",
      enforce: "post",
      transform(code, id) {
        if (!id.endsWith("/src/main.ts")) return;
        return `${code}\nglobalThis.__switchSmokeProbe = () => ({game, mode, controls});\n`;
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
  const errors = [];
  async function newGame(touch) {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const start = new Date("2026-01-01T00:00:00Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(new Date(start.getTime() + 1000));
    await page.goto("http://127.0.0.1:4187");
    await page.evaluate(async () => {
      const { readSave, writeSave } = await import("/src/storage.ts");
      const save = readSave();
      save.progress[0].garden.classic.completed = true;
      writeSave(save);
    });
    await page.reload();
    await page.locator('[data-world="3"]').click();
    await page.locator("#start-button").click();
    await page.clock.runFor(200);
    await page.evaluate(() => {
      globalThis.__switchSmokeProbe().game.enemies = [];
    });
    const session = touch ? await context.newCDPSession(page) : null;
    const jump = touch
      ? await page.locator('[data-control="jump"]').boundingBox()
      : null;
    return { context, page, session, jump };
  }
  async function place(page, id, offset = 0) {
    await page.evaluate(
      ({ id, offset }) => {
        const { game, controls } = globalThis.__switchSmokeProbe();
        const m = game.level.mechanisms.find((m) => m.id === id);
        if (!m) throw new Error(`Missing switch ${id}`);
        controls.reset();
        game.clearInput();
        Object.assign(game.player, {
          x: m.x + offset - game.player.w / 2,
          y: m.y - game.player.h,
          vx: 0,
          vy: 0,
          grounded: true,
          invulnerable: 0,
        });
      },
      { id, offset },
    );
    await page.clock.runFor(80);
  }
  async function pressJump({ page, session, jump }, downMs = 100) {
    if (session) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: jump.x + jump.width / 2, y: jump.y + jump.height / 2, id: 2 },
        ],
      });
    } else await page.keyboard.down("Space");
    await page.clock.runFor(downMs);
    if (session) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else await page.keyboard.up("Space");
  }
  async function state(page) {
    return page.evaluate(() => {
      const { game } = globalThis.__switchSmokeProbe();
      return {
        water: game.puzzleState.water,
        open: game.puzzleState.sluiceGateOpen,
        grounded: game.player.grounded,
        x: game.player.x,
        y: game.player.y,
      };
    });
  }
  const keyboard = await newGame(false);
  // Walking onto a switch must not flip it without an intentional jump.
  await place(keyboard.page, "water.court", -90);
  await keyboard.page.keyboard.down("ArrowRight");
  await keyboard.page.clock.runFor(450);
  await keyboard.page.keyboard.up("ArrowRight");
  expect((await state(keyboard.page)).water).toBe("LOW");
  // A latch in the wrong state must tell the player why it did not open.
  await place(keyboard.page, "sluice.court");
  await pressJump(keyboard);
  await expect(keyboard.page.locator("#game-toast")).toHaveAttribute(
    "data-event",
    "mechanism-needs-water",
  );
  await keyboard.page.screenshot({
    path: "/tmp/mosslight-switch-latch-locked.png",
  });
  expect((await state(keyboard.page)).open).toBe(false);
  await keyboard.page.clock.runFor(1200);
  // The player's body overlaps the visible pad but its center is beyond the
  // old narrow center-only threshold; a real jump should still operate it.
  await place(keyboard.page, "water.court", 40);
  await pressJump(keyboard);
  expect((await state(keyboard.page)).water).toBe("HIGH");
  await keyboard.page.clock.runFor(1200);
  expect((await state(keyboard.page)).water).toBe("HIGH");
  await place(keyboard.page, "sluice.court");
  await pressJump(keyboard);
  await expect(keyboard.page.locator("#game-toast")).toHaveAttribute(
    "data-event",
    "mechanism-gate-open",
  );
  await keyboard.page.screenshot({
    path: "/tmp/mosslight-switch-latch-open.png",
  });
  expect((await state(keyboard.page)).open).toBe(true);
  await keyboard.context.close();

  const mobile = await newGame(true);
  // Reeds switch must have its own reachable support and respond to the same
  // real on-screen jump control as iPhone play.
  await place(mobile.page, "water.reeds");
  await pressJump(mobile);
  expect((await state(mobile.page)).water).toBe("HIGH");
  await mobile.page.clock.runFor(1200);
  expect((await state(mobile.page)).water).toBe("HIGH");
  await mobile.context.close();
  expect(errors).toEqual([]);
  console.log(
    "PASS keyboard edge-pad activation, failed and successful latch feedback, no double toggle, and touch-control reeds switch",
  );
} finally {
  await browser?.close();
  await server.close();
}
