# Mosslight

An original side-scrolling platformer for iPhone, iPad, and the browser.
Guide Pip or Poppy through Sunlit Meadow, Firefly Hollow, Cloudtop Crossing, and Windmill Garden:
collect golden coins, grow with diamonds, power up with stars, rescue hidden
fireflies, and bring light back to the forest. Four extended trails include
multiple checkpoints, optional routes, light-activated plants, and three-phase
guardian encounters. Return rescued fireflies to a playable home grove and
decorate it with earned coins. All art, music, and sound are generated locally.

## Play and develop

Use Node 22 or newer.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. In landscape, the game fills the display edge to edge and shows more of the world on wider screens, with proportional artwork and controls inside the safe areas. A trail picker sits on the title screen; worlds, sound, and instructions are in the game menu.
Move with **← / →** or **A / D**; jump with **Space**, **W**, or **↑**.
Tap jump for a short hop, or hold it for a higher leap. **P / Esc** pauses.
On touch screens, slide your left thumb across the direction pad without lifting,
and use your right thumb to jump. Both touches work at the same time. A gamepad's
left stick/D-pad and A also work; Start pauses and resumes.

Movement uses quick acceleration and braking, midair steering, a small grace
period after leaving a ledge, and buffered jumps just before landing. Controls
can be resized, repositioned, and swapped for either hand in the game menu.
Choose **Play as** in the game menu to switch between Pip and Poppy. They share
the same moves and abilities, and the choice is saved on the device. The camera
looks in the direction the selected friend is traveling. The cartoon artwork is
drawn locally at the screen's pixel density, with distinct garden and beehive palettes,
animated characters, and collectible/landing effects.

## Explore the longer trails

- **Sunlit Meadow** introduces bouncing mushrooms and optional upper paths.
- **Firefly Hollow** adds moving leaf platforms and climbing routes.
- **Cloudtop Crossing** features cloud bridges that warn before crumbling and
  return after a short delay.
- **Windmill Garden** opens after beating the Meadow guardian. Put feather flight to work, follow three firefly branches, and discover a separate beehive level.
- **Hidden sky gardens** sit above Sunlit Meadow, Firefly Hollow, and Cloudtop
  Crossing. Look for drifting petals, earn a Wind Feather, and land on the
  cloud ledges to recharge. Stand still at a glowing SKY portal, then press
  Jump when prompted. Each garden has its own cloud route and a return portal.
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
- Pip's glow wakes flowers and curled leaves into platforms. Environmental
  clues suggest optional routes around giant garden landmarks.
- Charging beetles break marked barriers, and hoppers bounce on mushrooms.
- The first three worlds end with a stag beetle, spider, or storm moth guardian.
  In Windmill Garden, the Mill Keeper is a sub-boss before the final encounter
  with Briarheart, the Thorn King. Watch warnings, avoid attacks, and stomp
  during recovery. Checkpoints and recovery power blocks precede the arenas.

## Home grove, rewards, and modes

Visit the safe, playable home grove from the menu. Rescued fireflies become
residents; a frog, cloud bird, and moth can also be found in optional areas
and welcomed home. Earned coins buy optional outfits and decorations. Coins count
toward both the run's extra-life counter and a persistent cosmetic wallet;
purchases never change movement or combat strength. Rescue all three fireflies
in each of the original three worlds to unlock its separate challenge room and earn time medals.

The Home Grove also leads to two optional places. Enter Moonpool Grotto from
the grove floor and hold Jump to swim upward; release it to sink. Bubble
currents help you explore the water and find an optional cove. Above the grove,
a Wind Feather can reach a hidden stairway of clouds. Land on each cloud to
recharge and discover Cloudbloom Sanctuary and its optional perch. Stand still
at a portal and press Jump when prompted; each area has a way back to the grove.

The **Discovery journal** in the game menu gives hints for undiscovered places.
Discovering a place saves it to the journal; once found, select it there to
visit again. The journal also records when a secret has been explored. Rescued
creatures remain in the grove across visits and reloads.

The game menu's **Garden games** offers two optional activities:

- **Garden Match:** turn over cards to find six matching pairs.
- **Seed Stack:** move and rotate falling pieces to complete rows; clear eight
  rows to grow the garden. Use the on-screen controls or the arrow keys, ↑ or X
  to rotate, and Space to drop.

Opening a garden game pauses an active adventure. Close it to return to the
paused game, then resume when ready. The best completed matching game and the
best Seed Stack score and row count are saved on the device.

Choose **Classic** for the three-life rules, **Relaxed** for unlimited checkpoint
retries, or **Timed** for a separately recorded three-life run. The mode applies
when starting a new run. Each mode has separate completion and time records;
challenge medals and historical trail records are separate as well.

See [the living garden guide](docs/LIVING_GARDEN.md) for the content and release
acceptance criteria, including the physical-device playtest.

The [Windmill Garden guide](docs/WINDMILL_GARDEN.md) explains flight, garden machinery,
the secret beehive, the Mill Keeper, Briarheart, and Petal Post. Finding a feather
unlocks the flight minigame; discovering the beehive unlocks journal replay.
Both activities award visual rewards. The [design package](docs/windmill-garden/README.md)
records their controls, geometry and implementation contracts.

Music, sound effects, and haptics have separate settings. Each world has an
original looping score, with separate grove and guardian themes and a musical
change during star power. Music pauses with gameplay. Haptics use the native
iOS plugin when supported.

## Lives and power-ups

- In Classic and Timed modes, start each trail small with **3 lives**. Falling into a gap always costs one
  life, including while big or using star power.
- **Earn power-ups by bumping marked blocks from below.** Either friend, small or big, can
  both hit these blocks. Feather and star blocks grant their powers when hit;
  diamond blocks release a diamond to collect.
- **Wind Feathers let Pip fly in every world.** Bump a feather-marked block on the opening path; the Home Grove has one for practice too. Jump, release, then hold Jump again to rise. Release to glide and land to refill. The camera follows high flights. Shrinking retains the feather; losing a life drops it and makes feather blocks available again. Challenge rooms keep their original jumping rules.
- **Diamonds make Pip big.** Bump a diamond-marked block and collect its diamond. A bug hit then shrinks Pip without taking a life.
  A hit while small costs a life. A brief grace period after shrinking or
  respawning prevents one collision from counting as several hits.
- **Every 50 coins earns one life, up to 3.** The counter rolls over at 50 even
  when lives are full. Coins stay collected after a death, so the same coins
  cannot be collected repeatedly for extra lives.
- **Land on a bug to squash it** and bounce upward. Squashed bugs no longer hurt.
- **Stars give 10 seconds of star power:** bump a star-marked block to activate it.
  Bugs cannot hurt Pip and touching them squashes them. Another star refreshes the timer. Pausing freezes the timer;
  falling still costs a life.
- Losing a life returns small Pip to the checkpoint, or the start if no checkpoint
  is active, and clears star power. Diamond and feather blocks reset after a lost
  life; spent star blocks stay spent for the run.
  Zero lives ends a Classic or Timed run. Relaxed mode keeps checkpoint retries
  available. Restarting or choosing another trail starts fresh.

Fireflies, discovered and explored secrets, rescued creatures, character choice,
completion records, best times, and settings are saved on the device.
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
- `src/game/bosses.ts` — telegraphed guardian attacks and recovery phases.
- `src/game/levels.ts` — authored worlds, secret routes, grove, and challenges.
- `src/game/expansion-levels.ts` — Windmill Garden, Lantern Beehive, and Petal Post.
- `src/game/moonpool-level.ts` and `src/game/cloud-garden.ts` — the optional grotto and cloud sanctuary.
- `src/game/sky-secrets.ts` and `src/game/creatures.ts` — hidden sky gardens and rescued residents.
- `src/minigames.ts` and `src/minigames/core.ts` — Garden Match and Seed Stack.
- `src/game/session.ts` — resource continuity across world/secret transitions.
- `src/game/renderer.ts` — crisp cartoon canvas, camera, and animated effects.
- `src/main.ts` — menus, HUD, progress, and game loop.
- `src/controls.ts` — touch capture/dragging, keyboard, and gamepad input.
- `src/audio.ts` / `src/storage.ts` — synthesized effects and local saves.
- `ios/App/` — native Xcode project and Xcode Cloud hooks.

The default bundle ID is `com.mountaineerapps.mosslight`; confirm ownership or
replace it before Apple registration. “Mosslight” and its characters/art are an
original project, with no Nintendo assets included.
