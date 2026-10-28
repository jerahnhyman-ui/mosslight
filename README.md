# Mosslight

An original, Mario-inspired side-scrolling platformer for iPhone, iPad, and the
browser. Guide Pip through Sunlit Meadow, Firefly Hollow, and Cloudtop Crossing:
collect sunseeds, find three hidden stars per world, bounce on beetles, activate
checkpoints, and reach the sun portal. All art and sound are generated locally.

## Play and develop

Use Node 22 or newer.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. The game fills the screen, with a trail picker
on the title screen and worlds, sound, and instructions in the game menu.
Move with **← / →** or **A / D**; jump with **Space**, **W**, or **↑**.
Tap jump for a short hop, or hold it for a higher leap. **P / Esc** pauses.
On touch screens, slide your left thumb across the direction pad without lifting,
and use your right thumb to jump. Both touches work at the same time. A gamepad's
left stick/D-pad and A also work; Start pauses and resumes.

Movement uses quick acceleration and braking, midair steering, a small grace
period after leaving a ledge, and buffered jumps just before landing. The
cartoon artwork is drawn locally at the screen's pixel density, with three
distinct palettes, animated characters, and collectible/landing effects.

Best completion times, stars, and sound preference are saved on the device.
The game has no accounts, ads, analytics, remote assets, or backend requirement.

## iOS and TestFlight

The Capacitor shell targets iOS/iPadOS **16.4+**, supports both landscape
orientations, and bundles the game for offline use. Native builds require a Mac
or Xcode Cloud with Xcode **26+**.

```sh
npm run ios:sync
npm run ios:check
npm run ios:open
```

**Mosslight is connected to Xcode Cloud with internal TestFlight distribution
enabled.** Each update still needs a successful native archive and Apple's
processing before testing. See [the setup guide](docs/TESTFLIGHT.md)
for the Apple team, bundle identifier, repository authorization, and Archive →
TestFlight workflow steps. No Apple credentials should be committed to Git.

## Verification

```sh
npm test                  # Physics, damage, checkpoint, and all-star route tests
npm run build             # TypeScript and production build
npm run test:browser       # Desktop + mobile Chromium smoke tests
npm run ios:sync
npm run ios:check          # Native repository preflight; not an Xcode compilation
```

Browser tests use `/usr/bin/chromium` when installed, or Playwright's Chromium
(`npx playwright install chromium`). Set `CHROMIUM_PATH` to use another local
Chromium binary. Screenshots are written to the ignored `artifacts/` folder.
The browser smoke suite exercises real keyboard and simultaneous touch input,
thumb sliding, pause/restart, collectibles, world switching, sound persistence,
phone safe areas, portrait/tablet layouts, and game timing at 15 FPS.

GitHub Actions runs tests, builds the production bundle, and checks the native
project. Xcode Cloud runs the same unit tests and web build before resolving the
Capacitor Swift package and archiving. Device and signing validation must still
be performed through Xcode Cloud and TestFlight.

## Structure

- `src/game/engine.ts` — fixed-step simulation, collision, and game rules.
- `src/game/levels.ts` — three authored trails.
- `src/game/renderer.ts` — crisp cartoon canvas, camera, and animated effects.
- `src/main.ts` — menus, HUD, progress, and game loop.
- `src/controls.ts` — touch capture/dragging, keyboard, and gamepad input.
- `src/audio.ts` / `src/storage.ts` — synthesized effects and local saves.
- `ios/App/` — native Xcode project and Xcode Cloud hooks.

The default bundle ID is `com.mountaineerapps.mosslight`; confirm ownership or
replace it before Apple registration. “Mosslight” and its characters/art are an
original project, with no Nintendo assets included.
