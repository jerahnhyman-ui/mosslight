import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// Only this isolated development server exposes the active Game. Fixtures move
// Pip to real world blocks, position one existing enemy and skip to the boss
// approach. All block hits, diamond pickups, the collision, and the boss-stage
// transition go through normal game updates and browser keyboard controls.
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 4185,
    strictPort: true,
    hmr: false,
    watch: { ignored: ["**/*"] },
  },
  plugins: [
    {
      name: "reserve-diamond-smoke-observer",
      enforce: "post",
      transform(code, id) {
        if (id.endsWith("/src/game/renderer.ts")) {
          return `${code}\nconst __reserveDraw = Renderer.prototype.diamond;\nRenderer.prototype.diamond = function(x, y, time, index) { (globalThis.__reserveDraws ||= {})[index] = { x, y }; return __reserveDraw.apply(this, arguments); };\n`;
        }
        if (!id.endsWith("/src/main.ts")) return;
        return `${code}\nglobalThis.__reserveSmokeProbe = () => ({game, mode, runKind});\n`;
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
  await page.goto("http://127.0.0.1:4185");
  await page.evaluate(async () => {
    const { readSave, writeSave } = await import("/src/storage.ts");
    const save = readSave();
    save.progress[0].garden.classic.completed = true;
    writeSave(save);
  });
  await page.reload();
  await page.locator('[data-world="3"]').click();
  await page.locator("#start-button").click();
  await page.clock.runFor(100);
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "data-filled",
    "false",
  );
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "aria-label",
    /empty/,
  );
  await page.evaluate(() => {
    const { game } = globalThis.__reserveSmokeProbe();
    game.__enemyFixture = game.enemies[0];
    game.enemies = [];
  });
  async function placeUnderBlock(x) {
    await page.evaluate((x) => {
      const { game } = globalThis.__reserveSmokeProbe();
      const block = game.platforms.find(
        (p) => p.x === x && p.rewardPower === "diamond",
      );
      if (!block) throw new Error(`Diamond block missing at ${x}`);
      const ground = game.platforms.find(
        (p) =>
          p.kind === "ground" &&
          p.x <= x &&
          p.x + p.w >= x + block.w &&
          p.y === block.y + 130,
      );
      if (!ground) throw new Error(`Missing ground beneath ${x}`);
      Object.assign(game.player, {
        x: x + 10,
        y: ground.y - game.player.h,
        vx: 0,
        vy: 0,
        grounded: true,
        invulnerable: 0,
      });
    }, x);
    await page.clock.runFor(100);
    await page.keyboard.down("Space");
    await page.clock.runFor(600);
    await page.keyboard.up("Space");
    await page.clock.runFor(600);
  }
  await placeUnderBlock(1960);
  const recovery = await page.evaluate(() => {
    const { game, mode } = globalThis.__reserveSmokeProbe();
    return {
      mode,
      player: game.player,
      drops: game.diamonds.filter((d) => d.reserveDrop),
    };
  });
  expect(recovery.player.form, JSON.stringify(recovery)).toBe("big");
  await placeUnderBlock(7740);
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "data-filled",
    "true",
  );
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "aria-label",
    /stored/,
  );
  expect(
    await page.evaluate(
      () => globalThis.__reserveSmokeProbe().game.reserveDiamond,
    ),
  ).toBe(true);
  // Let an actual enemy collision release the stored power-up.
  await page.evaluate(() => {
    const { game } = globalThis.__reserveSmokeProbe();
    const enemy = game.__enemyFixture;
    const x = game.player.x + 25;
    Object.assign(enemy, {
      x,
      y: 402,
      baseY: 402,
      minX: x - 50,
      maxX: x + 50,
      alive: true,
      grounded: true,
      state: "patrol",
      vx: 0,
      vy: 0,
    });
    game.player.invulnerable = 0;
    game.enemies = [enemy];
  });
  await page.clock.runFor(100);
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "data-filled",
    "false",
  );
  let hit = await page.evaluate(() => {
    const { game } = globalThis.__reserveSmokeProbe();
    const index = game.diamonds.findIndex((d) => d.reserveDrop && !d.collected);
    const drop = game.diamonds[index];
    return {
      form: game.player.form,
      drop: drop && { x: drop.x, y: drop.y },
      drawn: globalThis.__reserveDraws?.[index],
      lives: game.lives,
    };
  });
  expect(hit.form).toBe("small");
  expect(hit.drop).toBeTruthy();
  expect(hit.drawn?.x).toBe(hit.drop.x);
  expect(hit.lives).toBe(3);
  await page.evaluate(() => {
    globalThis.__reserveSmokeProbe().game.enemies = [];
  });
  await page.clock.runFor(1400);
  for (let i = 0; i < 120; i++) {
    const state = await page.evaluate(() => {
      const { game } = globalThis.__reserveSmokeProbe();
      const drop = game.diamonds.find((d) => d.reserveDrop && !d.collected);
      return {
        form: game.player.form,
        x: game.player.x,
        w: game.player.w,
        dropX: drop?.x,
      };
    });
    if (state.form === "big") break;
    if (state.dropX == null)
      throw new Error("Reserve drop disappeared before pickup");
    if (Math.abs(state.dropX - state.x - state.w / 2) < 18) {
      await page.keyboard.down("Space");
      await page.clock.runFor(450);
      await page.keyboard.up("Space");
      await page.clock.runFor(150);
      continue;
    }
    const direction =
      state.dropX < state.x + state.w / 2 ? "ArrowLeft" : "ArrowRight";
    await page.keyboard.down(direction);
    await page.clock.runFor(48);
    await page.keyboard.up(direction);
  }
  const regained = await page.evaluate(() => {
    const { game, mode } = globalThis.__reserveSmokeProbe();
    return {
      mode,
      player: game.player,
      drops: game.diamonds.filter((d) => d.reserveDrop),
    };
  });
  expect(regained.player.form, JSON.stringify(regained)).toBe("big");
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "data-filled",
    "false",
  );
  // Re-arm the same authored block solely as a fixture to earn another reserve,
  // then use the actual fourth-world-to-boss scene transition.
  await page.evaluate(() => {
    const { game } = globalThis.__reserveSmokeProbe();
    game.platforms.find(
      (p) => p.x === 7740 && p.rewardPower === "diamond",
    ).rewardUsed = false;
  });
  await placeUnderBlock(7740);
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "data-filled",
    "true",
  );
  await page.evaluate(() => {
    const { game } = globalThis.__reserveSmokeProbe();
    game.boss.state = "defeated";
    Object.assign(game.player, {
      x: 12998,
      y: 470 - game.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
  });
  await page.keyboard.down("ArrowRight");
  await page.clock.runFor(500);
  await page.keyboard.up("ArrowRight");
  await expect(page.locator(".game-app")).toHaveAttribute(
    "data-mode",
    "boss-intro",
  );
  expect(
    await page.evaluate(
      () => globalThis.__reserveSmokeProbe().game.reserveDiamond,
    ),
  ).toBe(true);
  await page.locator("#boss-start").click();
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "data-filled",
    "true",
  );
  await expect(page.locator("#diamond-reserve")).toHaveAttribute(
    "aria-label",
    /stored/,
  );
  expect(errors).toEqual([]);
  console.log(
    "PASS real block pickups, stored HUD, enemy hit, falling-diamond retrieval, and reserve transfer to boss stage",
  );
} finally {
  await browser?.close();
  await server.close();
}
