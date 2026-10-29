# Windmill Garden expansion

This branch implements the flight expansion described in the [design package](windmill-garden/README.md). Native release status is verified separately in App Store Connect; the presence of these files alone does not establish TestFlight availability.

## Playing the expansion

Defeat the Sunlit Meadow guardian in any adventure mode to unlock Windmill Garden. Existing saves with a current Meadow guardian completion qualify immediately. The new world has twelve exploration rooms, a guardian arena, eight checkpoints and three fireflies.

Collect a Wind Feather, jump, release Jump, then press and hold Jump again to rise. Release to glide. A brief stable landing refills lift. Ordinary held jumps remain ordinary jumps. Shrinking retains the feather; losing a life drops it. Free feather plants are available at the new world's checkpoints and before required flight.

Jump onto marked handles to change wind, water, the mill brake and light routing. Follow the connecting pipes and symbols. Solved main-path gates stay open for the run. The pollen mural hints at the beehive entrance: west wind, low water, light toward the hive. Stand still on the revealed portal and press Jump when its prompt appears.

Lantern Beehive contains three rooms and three flower buttons. Completion awards the Bee Scarf outfit. Discovery permanently unlocks journal replay. While visiting from Windmill Garden, current lives, powers, coins and elapsed run time carry through the visit and return; leaving the secret never restores an older player state. Its completion bell leaves gameplay active so Pip can use the return portal.

Bramblewing, the Mill Keeper, takes six hits across three phases. Jump the low sweep; fly to the high vane to expose the back; then combine landing beneath a high sweep with jumping the next low sweep and reaching the vane. Relaxed retries the current phase. Classic and Timed retry the fight. Stars preserve their contact attack and protection.

Finding the first feather unlocks Petal Post in Home Grove and the journal. Start on the first launch pad, fly through sixteen hoops and settle on landing pads. Each hoop and landing scores once. A finish or sixty-second timeout ends the activity. Bronze begins at 800 points and awards the Pinwheel Garland once; Silver and Gold require a finish. Replays are free and never award spendable coins.

## Persistence and integration

- Saves migrate to `mosslight-save-v3`, with stable world/challenge/collectible keys. Older keys remain intact for recovery. Existing settings, wallet, cosmetics, rescues and all historical record categories are retained.
- The UI keeps a compatible in-memory progress array; serialized identities do not depend on its order.
- A shared adventure session retains the parent and secret scenes and transfers current run resources. Reentering the cached secret cannot duplicate coin claims. A single cumulative coin ledger credits the wallet throughout the detour.
- First discovery, completion and cosmetic ownership are persisted together. If storage is unavailable, a persistent status explains that progress is currently session-only.
- Journal replay and Petal Post use independent runs. They cannot replace parent-world records. Petal Post has one standard score record, separate from the original three challenge rooms.
- The grove supports twelve rescued residents, the Bee Scarf outfit and the Pinwheel Garland decoration. Cosmetics do not change gameplay statistics.

## Verification and release

The automated suite includes the original game rules and routes, migration/reward tests, flight/input checks, scene-switch fixtures, and complete input-driven routes. The new world route starts at the normal entrance, collects all three fireflies, solves the mechanisms, enters and completes the beehive, returns, completes the workshop, defeats the guardian and reaches the goal. Its controller uses the public directional/jump input and the same scene transition class as the UI. The Petal Post route earns Gold with all sixteen hoops and eight landings. Separate guardian routes win in both sizes without star power or deaths.

Browser coverage checks the built bundle, keyboard and simultaneous touch input, flight, activity timeout/retry, migrated unlocks, journal locks, persistent purchases, pause and adjustable phone controls. Renderer-only boss screenshots and seeded-unlock UI fixtures are distinguished from complete gameplay routes. HUD checks keep the vane and upper hoop targets visible. The initial Petal Post spawn was moved onto its first launch pad after phone-layout checks found the floor spawn obscured by the direction pad.

Run the release checks:

```sh
npm test
npm run test:browser
npm run ios:sync
npm run ios:check
```

Then follow [TestFlight release verification](TESTFLIGHT.md): merge the tested tree, verify the exact release commit's Xcode Cloud archive, wait for Apple processing, and confirm the new build in the existing Beta group shows Testing after refresh.

Physical iPhone/iPad flight feel, sustained device performance, native haptics and real-device audio/background behavior require a separate device playtest. Automated simulation, desktop Chromium touch emulation and an Xcode Cloud archive do not establish those results. Pacing and score thresholds should be tuned using device playtests; scripted simulation durations are not first-time player timings.
