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

Open the local URL Vite prints. Move with **← / →** or **A / D**; jump with
**Space**, **W**, or **↑**. Hold jump to go higher. **P / Esc** pauses. Touch
screens have movement and jump buttons; gamepad left stick/D-pad and A also
work. The toolbar menu provides worlds, sound, and instructions in landscape.

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

**Mosslight is connected to Xcode Cloud; a successful signed archive and
TestFlight upload still need verification.** See [the setup guide](docs/TESTFLIGHT.md)
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
The browser smoke suite exercises real keyboard and touch input, pause/restart,
collectibles, world switching, sound persistence, and landscape navigation.

GitHub Actions runs tests, builds the production bundle, and checks the native
project. Xcode Cloud runs the same unit tests and web build before resolving the
Capacitor Swift package and archiving. Device and signing validation must still
be performed through Xcode Cloud and TestFlight.

## Structure

- `src/game/engine.ts` — fixed-step simulation, collision, and game rules.
- `src/game/levels.ts` — three authored trails.
- `src/game/renderer.ts` — responsive pixel-art canvas and camera.
- `src/main.ts` — controls, menus, HUD, progress, and game loop.
- `src/audio.ts` / `src/storage.ts` — synthesized effects and local saves.
- `ios/App/` — native Xcode project and Xcode Cloud hooks.

The default bundle ID is `com.mountaineerapps.mosslight`; confirm ownership or
replace it before Apple registration. “Mosslight” and its characters/art are an
original project, with no Nintendo assets included.
