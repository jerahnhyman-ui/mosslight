# Mosslight

An original, Mario-inspired side-scrolling platformer for iPhone, iPad, and the
browser. Guide Pip through Sunlit Meadow, Firefly Hollow, and Cloudtop Crossing:
collect golden coins, grow with diamonds, power up with stars, rescue hidden
fireflies, and bring light back to the forest. Three extended trails include
multiple checkpoints, optional routes, and distinct terrain. All art, music,
and sound are generated locally.

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
period after leaving a ledge, and buffered jumps just before landing. Controls
can be resized, repositioned, and swapped for either hand in the game menu.
The camera looks in the direction Pip is traveling. The cartoon artwork is
drawn locally at the screen's pixel density, with three distinct palettes,
animated characters, and collectible/landing effects.

## Explore the longer trails

- **Sunlit Meadow** introduces bouncing mushrooms and optional upper paths.
- **Firefly Hollow** adds moving leaf platforms and climbing routes.
- **Cloudtop Crossing** features cloud bridges that warn before crumbling and
  return after a short delay.
- Walking beetles, hopping grasshoppers, and charging beetles each have distinct
  movement. Charging beetles signal before rushing. Every bug can be squashed
  by landing on it; star power also squashes bugs on contact.
- Big Pip can break cracked blocks from below to uncover coin rewards. Those
  rewards cannot be collected repeatedly by losing lives.
- Each trail contains three hidden **fireflies**, separate from power stars.
  Fireflies are saved when rescued, including when the run ends in defeat.
  The world map lights up as fireflies are rescued and trails are completed.
- Multiple checkpoints keep longer journeys forgiving. Returning to an earlier
  flag never moves the respawn point backward.

Music, sound effects, and haptics have separate settings. Each world has an
original looping score, with a musical change during star power. Music pauses
with gameplay. Haptics use the native iOS plugin when supported.

## Lives and power-ups

- Start each trail small with **3 lives**. Falling into a gap always costs one
  life, including while big or using star power.
- **Diamonds make Pip big.** A bug hit then shrinks Pip without taking a life.
  A hit while small costs a life. A brief grace period after shrinking or
  respawning prevents one collision from counting as several hits.
- **Every 50 coins earns one life, up to 3.** The counter rolls over at 50 even
  when lives are full. Coins stay collected after a death, so the same coins
  cannot be collected repeatedly for extra lives.
- **Land on a bug to squash it** and bounce upward. Squashed bugs no longer hurt.
- **Stars give 10 seconds of star power:** bugs cannot hurt Pip and touching them
  squashes them. Another star refreshes the timer. Pausing freezes the timer;
  falling still costs a life.
- Losing a life returns small Pip to the checkpoint, or the start if no checkpoint
  is active, and clears star power. Diamonds return so Pip can grow again.
  Zero lives ends the run. Restarting or choosing another trail starts fresh.

Fireflies, completion records, best times, and settings are saved on the device.
Records from the earlier short trails are retained separately so their times
do not compete with the extended adventures.
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
npm test                  # Rules, terrain, enemies, saves, and playable full routes
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
- `src/game/levels.ts` — three extended authored trails and their secret routes.
- `src/game/renderer.ts` — crisp cartoon canvas, camera, and animated effects.
- `src/main.ts` — menus, HUD, progress, and game loop.
- `src/controls.ts` — touch capture/dragging, keyboard, and gamepad input.
- `src/audio.ts` / `src/storage.ts` — synthesized effects and local saves.
- `ios/App/` — native Xcode project and Xcode Cloud hooks.

The default bundle ID is `com.mountaineerapps.mosslight`; confirm ownership or
replace it before Apple registration. “Mosslight” and its characters/art are an
original project, with no Nintendo assets included.
