import { fileURLToPath } from "node:url";
import { build } from "vite";

/** Exercise the real Canvas renderer in an isolated page, without app test hooks.
 * High-altitude coordinates are renderer fixtures; gameplay routes are tested
 * separately through actual keyboard and touch input in browser-smoke.mjs.
 */
export async function checkFlightCamera(browser) {
  // Vite resolves library entries to absolute paths before calling plugins.
  // This is an in-memory entry identifier; no file is created at this path.
  const entry = fileURLToPath(
    new URL("../.flight-camera-check.ts", import.meta.url),
  );
  const source = (name) =>
    JSON.stringify(
      fileURLToPath(new URL(`../src/game/${name}.ts`, import.meta.url)),
    );
  const code = `
    import { Game } from ${source("engine")};
    import { Renderer } from ${source("renderer")};
    import { thornKingLevel } from ${source("boss-level")};
    import { levels, groveLevel, challengeLevels } from ${source("levels")};
    import { cloudGardenLevel } from ${source("cloud-garden")};
    import { moonpoolLevel } from ${source("moonpool-level")};

    const canvas = document.querySelector("canvas");
    const renderer = new Renderer(canvas);
    // Record the real hero draw without changing or replacing its rendering.
    const renderHero = renderer.hero.bind(renderer);
    let drawnHero = null;
    renderer.hero = (x, y, ...args) => {
      drawnHero = { x, y };
      return renderHero(x, y, ...args);
    };
    let now = 1;
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const draw = (game, title = false) => {
      now += 1 / 60;
      game.elapsed += 1 / 60;
      renderer.render(game, now, title);
    };
    window.runFlightCameraChecks = () => {
      const results = [];
      const bounds = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);
      const safeTop = parseFloat(style.getPropertyValue("--scene-safe-top")) || 0;
      const safeBottom = parseFloat(style.getPropertyValue("--scene-safe-bottom")) || 0;
      const scale = (bounds.height - safeTop - safeBottom) / 540;
      const baseline = -safeTop / scale;
      window.dispatchEvent(new Event("resize"));
      for (const level of [...levels.slice(0, 3), groveLevel, cloudGardenLevel, moonpoolLevel]) {
        const game = new Game(0, { level });
        game.hasWindFeather = true;
        draw(game);
        assert(Math.abs(renderer.cameraY - baseline) < 0.001, level.name + ": ordinary entrance framing");
        // A launch from a high branch can take Pip above the original viewport.
        for (let y = 190; y >= -260; y -= 10) {
          game.player.y = y;
          draw(game);
          const visibleY = game.player.y - renderer.cameraY;
          assert(visibleY >= 90 - baseline - 0.001, level.name + ": high-flight sprite above safe margin");
          assert(visibleY + game.player.h < renderer.viewportHeight, level.name + ": high-flight sprite below viewport");
        }
        assert(renderer.cameraY < baseline, level.name + ": high flight follows vertically");
        game.player.y = 430 - game.player.h;
        game.player.grounded = true;
        for (let frame = 0; frame < 120; frame++) draw(game);
        assert(Math.abs(renderer.cameraY - baseline) < 0.001, level.name + ": landing settles original framing");

        game.player.y = -180;
        draw(game);
        assert(renderer.cameraY < baseline, level.name + ": another launch follows");
        game.player.y = 430 - game.player.h;
        game.deaths++;
        draw(game);
        assert(Math.abs(renderer.cameraY - baseline) < 0.001, level.name + ": retry resets immediately");

        game.player.y = -180;
        draw(game);
        draw(game, true);
        assert(Math.abs(renderer.cameraY - baseline) < 0.001, level.name + ": title uses original framing");
        draw(new Game(0, { level }));
        assert(Math.abs(renderer.cameraY - baseline) < 0.001, level.name + ": a new adventure resets framing");
        results.push(level.name);
      }
      for (const level of [levels[3], ...challengeLevels]) {
        const game = new Game(0, { level });
        game.hasWindFeather = true;
        game.player.y = -180;
        draw(game);
        assert(Math.abs(renderer.cameraY - baseline) < 0.001, level.name + ": authored fixed framing preserved");
      }
      // The fourth world's guardian lives in its own separate arena. Its
      // warning and high-flight framing must stay visible on every viewport.
      const finale = new Game(3, { level: thornKingLevel });
      finale.boss.state = "warning";
      finale.player.x = finale.boss.minX;
      finale.hasWindFeather = true;
      draw(finale);
      const crownX = finale.boss.x + finale.boss.w / 2 - renderer.cameraX;
      assert(crownX >= 0 && crownX <= renderer.viewportWidth,
        "Final boss warning is off-screen when the encounter starts");
      finale.player.y = -180;
      draw(finale);
      assert(renderer.cameraY < baseline, "Final arena follows high feather flight");
      for (const level of levels) {
        drawnHero = null;
        draw(new Game(0, { level }), true);
        assert(drawnHero !== null, level.name + ": title actually draws Pip");
        assert(drawnHero.x - 60 >= 0 && drawnHero.x + 60 <= renderer.viewportWidth,
          level.name + ": title Pip stays fully inside the visible world span");
        assert(level.platforms.some((platform) =>
          platform.kind === "ground" &&
          !platform.id?.startsWith("trellis.") &&
          !platform.id?.startsWith("gate.") &&
          drawnHero.x - 60 >= platform.x &&
          drawnHero.x + 60 <= platform.x + platform.w &&
          Math.abs(drawnHero.y - (platform.y + 1)) < 0.001),
          level.name + ": title Pip stands on actual visible ground, not a gap");
      }
      const matrix = renderer.ctx.getTransform();
      const scaleX = matrix.a * bounds.width / canvas.width;
      const scaleY = matrix.d * bounds.height / canvas.height;
      assert(Math.abs(scaleX - scaleY) < 0.000001, "Actual canvas transform stretches artwork");
      assert(Math.abs(scaleX - scale) < 0.000001, "World scale does not respect usable screen height");
      assert(Math.abs(renderer.viewportWidth * scale - bounds.width) < 0.001, "Viewport width does not fill canvas");
      assert(Math.abs(renderer.viewportHeight * scale - bounds.height) < 0.001, "Viewport height does not fill canvas");
      assert(Number(canvas.dataset.viewportWidth) === renderer.viewportWidth, "Width projection metadata is stale after resize");
      assert(Number(canvas.dataset.viewportHeight) === renderer.viewportHeight, "Height projection metadata is stale after resize");
      assert(Number(canvas.dataset.cameraX) === renderer.cameraX, "Horizontal projection metadata is stale");
      assert(Number(canvas.dataset.cameraY) === renderer.cameraY, "Vertical projection metadata is stale");
      return { checked: results, width: bounds.width, height: bounds.height };
    };
  `;
  const result = await build({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    logLevel: "silent",
    plugins: [
      {
        name: "flight-camera-check",
        resolveId: (id) => (id === entry ? entry : undefined),
        load: (id) => (id === entry ? code : undefined),
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ["iife"], name: "MosslightFlightCameraCheck" },
    },
  });
  const chunk = (Array.isArray(result) ? result : [result])
    .flatMap((output) => output.output)
    .find((item) => item.type === "chunk");
  if (!chunk) throw new Error("Flight camera fixture did not build.");
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  try {
    await page.setContent(`
      <style>
        html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
        body { display: flex; align-items: center; justify-content: center; }
        canvas { display: block; width: 100vw; height: 100dvh; }
        @media (orientation: portrait) { canvas { width: 100vw; height: calc(100vw * 9 / 16); } }
      </style>
      <canvas width="960" height="540"></canvas>
    `);
    await page.addScriptTag({ content: chunk.code });
    for (const [width, height, safeTop, safeBottom] of [
      [960, 540, 0, 0],
      [844, 390, 0, 0],
      [932, 430, 0, 0],
      [568, 320, 0, 0],
      [1194, 834, 0, 0],
      [1024, 768, 0, 0],
      [844, 390, 12, 21],
      [932, 430, 0, 21],
      [390, 844, 0, 0],
      [844, 390, 0, 0],
    ]) {
      await page.setViewportSize({ width, height });
      const result = await page.evaluate(
        ({ safeTop, safeBottom }) => {
          const canvas = document.querySelector("canvas");
          canvas.style.setProperty("--scene-safe-top", `${safeTop}px`);
          canvas.style.setProperty("--scene-safe-bottom", `${safeBottom}px`);
          return window.runFlightCameraChecks();
        },
        { safeTop, safeBottom },
      );
      if (result?.checked.length !== 6)
        throw new Error("Flight camera checks did not complete.");
      const expectedHeight = width > height ? height : (width * 9) / 16;
      if (
        Math.abs(result.width - width) > 1 ||
        Math.abs(result.height - expectedHeight) > 1
      )
        throw new Error(
          `Renderer fixture did not fill expected ${width}×${height} scene.`,
        );
    }
    console.log(
      "PASS flight camera renderer fixture: uniform full-screen art, safe areas, rotation, high-flight visibility, landing/retry resets, fixed Windmill/challenge framing, visible grounded title Pip",
    );
  } finally {
    await page.close();
  }
}
