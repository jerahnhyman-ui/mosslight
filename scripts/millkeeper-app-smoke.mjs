import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// The observer is injected only into this isolated Vite server. It positions
// Pip at the authored checkpoint and reads the live fight state; all combat
// input, HUD updates and retry behavior still run through the real app.
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 4186,
    strictPort: true,
    hmr: false,
    watch: { ignored: ["**/*"] },
  },
  plugins: [
    {
      name: "millkeeper-app-smoke-observer",
      enforce: "post",
      transform(code, id) {
        if (!id.endsWith("/src/main.ts")) return;
        return `${code}\nglobalThis.__millProbe = () => ({game, mode});\n`;
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
  page.on("pageerror", (error) => errors.push(error.message));
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("http://127.0.0.1:4186");
  await page.evaluate(async () => {
    const { readSave, writeSave } = await import("/src/storage.ts");
    const save = readSave();
    save.progress[0].garden.classic.completed = true;
    save.playMode = "classic";
    writeSave(save);
  });
  await page.reload();
  await page.locator('[data-world="3"]').click();
  await page.locator("#start-button").click();
  await page.clock.runFor(100);
  await page.evaluate(() => {
    const { game } = globalThis.__millProbe();
    const cp = game.level.checkpoints.findIndex((c) => c.x === 11592);
    if (cp < 0) throw new Error("Missing Mill Keeper checkpoint");
    game.activeCheckpointIndex = cp;
    Object.assign(game.player, {
      x: 11750,
      y: 432,
      vx: 0,
      vy: 0,
      grounded: true,
      invulnerable: 0,
    });
    game.hasWindFeather = false;
    game.starPowerRemaining = 0;
  });

  // Steer with actual keyboard events. A real jump from the arena floor must
  // damage the guardian; the fixture never modifies boss or damage state.
  const held = new Set();
  async function input(want) {
    for (const key of ["ArrowLeft", "ArrowRight", "Space"]) {
      const next = want.has(key),
        previous = held.has(key);
      if (next && !previous) await page.keyboard.down(key);
      if (!next && previous) await page.keyboard.up(key);
      if (next) held.add(key);
      else held.delete(key);
    }
  }
  const seen = new Set();
  let jumpKind = "",
    airFrames = 0,
    wasGrounded = false;
  let tookOffFromFloor = false,
    advanced = false;
  for (let frame = 0; frame < 4500 && !advanced; frame++) {
    const state = await page.evaluate(() => {
      const { game } = globalThis.__millProbe();
      const p = game.player,
        b = game.boss;
      return {
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        vx: p.vx,
        grounded: p.grounded,
        form: p.form,
        deaths: game.deaths,
        feather: game.hasWindFeather,
        state: b.state,
        mill: b.millState,
        stateTime: b.stateTime,
        facing: b.facing,
        health: b.health,
        phase: b.phase,
        hazards: game.hazards.map((h) => ({ kind: h.kind, x: h.x, vx: h.vx })),
      };
    });
    expect(state.deaths).toBe(0);
    expect(state.feather).toBe(false);
    expect(state.form).toBe("small");
    if (state.grounded && !wasGrounded) {
      jumpKind = "";
      airFrames = 0;
    }
    wasGrounded = state.grounded;
    const center = state.x + state.w / 2 - 11520;
    const onFloor = state.grounded && Math.abs(state.y + state.h - 470) < 2;
    let target = 250,
      jump = false;
    if (state.state === "recover") {
      if (!seen.has("recover")) {
        await expect(page.locator("#boss-instruction")).toContainText(
          "jump on top",
        );
        seen.add("recover");
      }
      if (onFloor && !jumpKind) {
        target = 385;
        if (Math.abs(center - 385) < 10 && Math.abs(state.vx) < 50) {
          jumpKind = "stomp";
          tookOffFromFloor = true;
        }
      }
    }
    if (["lowWarning", "lowSweep"].includes(state.mill) && !seen.has("low")) {
      await expect(page.locator("#boss-instruction")).toContainText(
        "low sweep",
      );
      seen.add("low");
    }
    if (
      ["highWarning", "highSweep"].includes(state.mill) &&
      !seen.has("high")
    ) {
      await expect(page.locator("#boss-instruction")).toContainText(
        "high sweep",
      );
      seen.add("high");
    }
    if (
      onFloor &&
      !jumpKind &&
      state.mill === "betweenSweeps" &&
      state.facing > 0 &&
      state.stateTime <= 0.35
    )
      jumpKind = "dodge";
    if (onFloor && !jumpKind && state.mill === "lowSweep") {
      const wave = state.hazards.find((h) => h.kind === "sweep");
      if (
        wave &&
        Math.abs(wave.x + 24 - 11520 - center) < 120 &&
        wave.vx * (center - (wave.x + 24 - 11520)) > 0
      )
        jumpKind = "dodge";
    }
    if (jumpKind) {
      airFrames++;
      target = jumpKind === "stomp" ? (airFrames < 13 ? 385 : 480) : 250;
      jump = airFrames <= 27;
    }
    const dx =
      target -
      center -
      (state.vx * Math.abs(state.vx)) / (2 * (state.grounded ? 4200 : 1800));
    const wanted = new Set();
    if (dx < -3) wanted.add("ArrowLeft");
    if (dx > 3) wanted.add("ArrowRight");
    if (jump) wanted.add("Space");
    await input(wanted);
    await page.clock.runFor(16);
    advanced = state.health <= 3 && seen.has("high");
  }
  await input(new Set());
  expect(tookOffFromFloor).toBe(true);
  expect(advanced).toBe(true);
  expect(seen.has("low")).toBe(true);
  expect(seen.has("high")).toBe(true);
  expect(seen.has("recover")).toBe(true);
  await expect(page.locator("#boss-instruction")).not.toContainText(
    /vane|feather|button/i,
  );
  await page.screenshot({ path: "/tmp/mosslight-millkeeper-app-smoke.png" });

  // Trigger a real life-loss path and ensure the authored checkpoint retries
  // the same no-feather encounter without a lost-progress softlock.
  await page.evaluate(() => {
    const { game } = globalThis.__millProbe();
    Object.assign(game.player, { y: 900, vy: 100, grounded: false });
  });
  await page.clock.runFor(150);
  const retry = await page.evaluate(() => {
    const { game } = globalThis.__millProbe();
    return {
      deaths: game.deaths,
      lives: game.lives,
      feather: game.hasWindFeather,
      x: game.player.x,
      health: game.boss.health,
      state: game.state,
    };
  });
  expect(retry).toMatchObject({
    deaths: 1,
    lives: 2,
    feather: false,
    state: "playing",
    health: 6,
  });
  expect(retry.x).toBeGreaterThanOrEqual(11550);
  expect(retry.x).toBeLessThan(11700);
  expect(errors).toEqual([]);
  console.log(
    "PASS Mill Keeper real app HUD, ground stomp without feather, and checkpoint retry",
  );
} finally {
  await browser?.close();
  await server.close();
}
