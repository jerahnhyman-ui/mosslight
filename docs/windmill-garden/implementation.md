# Terra implementation handoff

Status: design proposal; none of this expansion is implemented yet. Baseline: TestFlight build 16, main commit `01f7a098e2b7d6d8b4c3c4e8cacecdcd54e9217e`. Numeric targets are prototype hypotheses, not measured playtest results.

Read the [overview](README.md), [flight contract](flight.md), [world and puzzles](world.md), and [guardian and minigame](encounters.md) together. This document owns integration, persistence and release acceptance. The feature documents own geometry, control timing and encounter rules.

## Changes grounded in the current code

| Current area                                                                             | Required work                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/controls.ts`: held Jump plus a frame-level edge, touch/keyboard/gamepad aggregation | Preserve ordered aggregate input edges until a fixed simulation tick consumes them; keep existing simultaneous movement and jump.                                                    |
| `src/game/engine.ts`: 120 Hz simulation, growth, stars, lives, checkpoint respawn        | Add flight, solid puzzle mechanisms, deliberate portals, parent/secret sessions and guardian retry state. Preserve the existing six core rules.                                      |
| `src/game/levels.ts`: three indexed worlds, grove and three challenges                   | Introduce stable content IDs and authored room/mechanism definitions. Keep old content and IDs mapped explicitly during migration.                                                   |
| `src/game/bosses.ts`: existing three-hit guardians                                       | Add a distinct six-hit Mill Keeper encounter with its own phases. Do not change the old encounters merely to fit the new one.                                                        |
| `src/game/renderer.ts`: 960×540 viewport with horizontal camera                          | Add feather poses, charge feedback, visible canopy/shutters, puzzle machinery, hive, guardian and new grove residents. Keep required movement inside the existing readable viewport. |
| `src/main.ts`: three-world menus and fixed progress denominators                         | Drive menus, next-world navigation, locks, journal, activities and progress totals from a registry. Add context-sensitive portal guidance.                                           |
| `src/storage.ts`: v2 save, three-entry arrays and fixed cosmetic allowlists              | Add v3 stable records, validated migration, secret discovery and idempotent reward claims.                                                                                           |
| `src/audio.ts`: local music, effects and optional haptics                                | Add restrained lift/refill, mechanism, portal, hoop and guardian cues. Respect existing independent sound/music/haptics settings and pause behavior.                                 |

Do not add a generic physics engine, remote service, native plugin or vertical camera just for this expansion. Implement the authored wind mechanisms described in the world spec; atmospheric wind art does not imply an additional ambient force simulation.

## Content registry and unlocks

Use stable IDs rather than an array position as a saved identity. Final display names may change without resetting records. Existing content gets an explicit index-to-ID migration table.

| Content                              | Availability and records                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Meadow, Hollow and Cloudtop | Current availability and all historical records remain intact.                                                                                                                   |
| `world.windmill-garden`              | Opens after completing the Meadow guardian in any current garden mode. Older pre-guardian trail completion alone does not qualify. Show a locked map card with this requirement. |
| `secret.beehive`                     | Discovery persists immediately when its entrance puzzle succeeds. Journal replay becomes available even if the player subsequently loses the run. Completion is a separate flag. |
| `minigame.flower_hoops`              | First actual Wind Feather pickup permanently unlocks the Home Grove activity. The activity supplies its own feather; it does not grant a permanent movement upgrade elsewhere.   |
| Existing three challenge rooms       | Preserve current rescue gates, medals and times. A fourth world does not automatically create a fourth generic challenge.                                                        |

Windmill Garden adds three fireflies, bringing the world total to twelve. The beehive and hoop course award unique cosmetics, not additional fireflies. The grove can display twelve residents. Preserve the old nine residents and existing shop prices and rescue requirements.

Derive restoration totals from four world completions plus twelve fireflies (sixteen milestones). Old islands retain their restored appearance; the new island begins dim. Explain the added island rather than presenting the lower expanded percentage as lost progress. Count a world completion once across modes. Keep new minigame medals separate from world time records.

Beehive completion awards `cosmetic.bee_scarf`; first qualifying hoop medal awards `cosmetic.pinwheel_garland`. These are visual rewards with no movement or combat statistics. Bee Scarf is a new choice in the existing single-outfit wardrobe, stored with owned outfits. Pinwheel Garland is a grove decoration. The encounter and world documents specify their presentation.

## Save migration and reward transactions

Introduce `mosslight-save-v3` with `schemaVersion: 3`. Read a valid v3 snapshot first. Otherwise migrate valid v2, with v1 as the existing fallback. Validate known fields, bounds and IDs; write one complete new snapshot and leave the old keys intact. A malformed v3 must not prevent recovery from a valid older save. A storage failure must still allow session play and show the existing save-failure feedback, or a small new status message if none exists.

Suggested shape, not a mandatory class hierarchy:

```ts
interface ExpansionSave {
  schemaVersion: 3;
  settings: ExistingSettings;
  wallet: number;
  lifetimeCoins: number;
  ownedOutfits: string[];
  equippedOutfit: string;
  decorations: string[];
  worlds: Record<
    WorldId,
    {
      rescuedFireflies: string[];
      garden: Record<PlayMode, RunRecord>;
      historical: {
        original: LegacyTrailRecord;
        adventure: LegacyAdventureRecord;
      };
    }
  >;
  challenges: Record<ChallengeId, ChallengeRecord>;
  secrets: Record<SecretId, { discovered: boolean; completed: boolean }>;
  minigames: Record<MinigameId, HoopRecord>;
  unlocks: { windFeatherDiscovered: boolean };
  claimedRewards: string[];
  journal: { discoveredRooms: string[]; solvedPuzzles: string[] };
}
```

Map old world indices 0/1/2 to Meadow/Hollow/Cloudtop, old firefly indices to stable per-world collectible IDs, and old challenge indices to their existing named courses. Preserve legacy completion, stars, coins and time fields; do not reduce historical records to just a time. Copy validated settings, mode, wallet, lifetime coins, owned/equipped outfits, decorations, rescued fireflies and all mode/challenge records.

Only derive the new world's availability from an existing current Meadow guardian completion. Migration must not award a feather discovery, secret completion, medal, coins or cosmetic. Repeating migration must produce the same result without multiplying rewards.

Record a first-completion reward claim and its cosmetic ownership in the same serialized save update. Repeated completion, reentry, retries and reloads must not grant it twice. Extend validation allowlists before reading new cosmetic IDs. Preserve both older and new owned items; equip a safe owned default if an equipped ID is invalid. The hoop course never pays spendable coins or extra lives.

Journal entries remember discoveries and clues, not a live puzzle simulation. A new run starts its authored mechanisms fresh; a saved solved-puzzle entry does not silently open all future runs' gates.

## One run across the world and beehive

Introduce a small `RunSession` that survives replacing the active `Game` scene. It owns the parent content ID and mode, lives, cumulative deaths, total elapsed time, coin-to-life progress, cumulative earned coins, credited-coin watermark, claimed collectible IDs, checkpoint, per-room state and portal return anchor.

When entering the beehive:

1. Suspend the parent world's geometry, enemies and mechanism simulation; retain that runtime state for return.
2. Carry the current player form, feather ownership and remaining charge, star timer, lives and run coin progress into the secret. Do not clone rewards or restore an earlier healthier player on exit.
3. Continue the parent elapsed clock during secret gameplay. Pause remains excluded. A detour is a valid main-world run with a longer completion time. Only the active scene advances hazards, star time and other active timers.
4. Use the secret's local checkpoint while inside. A life loss follows the current mode and clears size/star/feather as normal; the safe spawn has a free feather fountain. Zero Classic/Timed lives ends the whole parent run. Relaxed retains retries.
5. On normal exit, return to the parent's safe anchor with the current resources and parent state. Previously claimed coins, stars and fireflies remain claimed. Diamonds follow the normal life-loss reset policy and may be collected again after a death.

The beehive completion bell records completion and its reward while leaving the scene playable. Do not enter the generic frozen `won` state before the player can reach its return pad. A compact reward toast suffices.

Journal replay creates an independent run with fresh initial lives and its own ledger; it cannot overwrite a main-world record or revive a lost parent run. The first release has no competing beehive time leaderboard or best-time record; elapsed display is optional. Completion and the cosmetic claim are permanent in either entry path.

Portals require the deliberate standstill-plus-fresh-jump interaction in the world spec. A running jump must not accidentally change scenes. Clear held input, queued edges, active lift and armed glide at a grounded transition; preserve charge and ownership. Place the player grounded at the safe anchor and use ordinary stable-ground recharge. Never carry a held Jump across scenes as a new action. The exit anchor is outside the entry trigger, preventing immediate reentry.

All normal world and secret coin sources use stable, namespaced claim IDs, including breakable caches. One monotonically increasing `RunSession.earnedCoins` feeds the existing wallet ledger. Do not reset the credited watermark when changing scenes. Death and portal travel cannot duplicate coins or the fifty-coin life award. Starting a genuinely new run can earn its coins again, as in build 16. Grove and hoop activity transitions pay no coins.

Checkpoint retries use authored safe spawn points. Preserve the current mechanism selections, solved gate latches, defeated normal enemies and already-claimed coins/fireflies as specified in the world document; restore moving supports to the endpoint for the retained selection and clear transient contacts/hazards. Do not restore an older puzzle snapshot or close a solved gate. Stars expire on life loss and diamonds become available again, matching the existing rules. Relaxed guardian phase checkpoints are transient to that run and mode; they are not permanent save unlocks.

## Implementation sequence

1. **Registry and saves.** Add content IDs, v3 migration and dynamic menu/progress counts. Keep all existing worlds playable and all current records readable.
2. **Flight prototype.** Implement input edges, lift, glide, recharge, damage and pause in a safe practice scene. Calibrate on real touch hardware before committing mandatory geometry.
3. **Reusable puzzle mechanisms.** Implement the world spec's actuators, visible gates, receivers and moving supports. Landing actuators respond to a landing edge, not every grounded tick. Verify wrong-order, reset and missing-object cases.
4. **World and secret.** Build the mapped rooms, branches, checkpoints and beehive. Add session/portal accounting and persistent discovery. Verify full routes through both scenes.
5. **Mill Keeper.** Implement the three distinct counters and retry rules. Prove each phase works with Small Pip, no star and the supplied feather.
6. **Hoop course and presentation.** Add unique hoop targets, finish/timeout scoring, medals, one-time decoration, journal, art and audio. Validate the score thresholds against playable traces.
7. **Integrated release.** Run gameplay, browser, migration and native preflight checks; then a native archive and TestFlight processing for the exact release commit. Follow [the release guide](../TESTFLIGHT.md).

Astra reviews the integrated route and encounter evidence against these rules; Terra implements, measures and fixes it. Update the design with measured tuning changes so it does not describe a different game. Merge and ship the integrated implementation only after its checks pass. This design-only branch does not require a new TestFlight build.

## Acceptance matrix

These are future implementation checks. They have not been executed by creating this design package.

| ID  | Required evidence                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01 | Actual touch short/long jump, deliberate upward flight, release to glide and landing refill; equivalent keyboard/gamepad behavior.                                                                           |
| F02 | Held ground Jump, buffered presses, zero-tick frames, catch-up ticks and overlapping input sources do not create unintended flight or repeat an edge. Replay tick-assigned traces at different render rates. |
| F03 | Ceiling contact, repeated pickup, stomps, bounces, growth and damage cannot grant fuel or unlimited lift. Every required retry has a free replacement feather.                                               |
| F04 | Solid roofs/shutters and guardian boundaries prevent unintended puzzle bypass with the full jump-plus-flight-plus-glide range. Growth never embeds Pip in solids.                                            |
| W01 | Normal input traces reach all required rooms, three fireflies, checkpoints, secret entrance, secret exit and journal replay. Human playtests assess pacing separately from simulation timing.                |
| W02 | Wrong puzzle order, death, reentry, lost movable objects and changed mechanisms cannot trap the player or duplicate rewards. The visible machinery matches its collision and state.                          |
| B01 | Each phase has a readable warning, safe counter and attack opening. Verify Small/Big, exhausted charge and no-star attempts. Star hits respect recovery and phase rules.                                     |
| B02 | Classic/Timed retry the full fight; Relaxed retries the phase with the complete safe setup restored. Phase progress does not leak across runs or modes.                                                      |
| M01 | Hoop timeout uses simulation time; pause freezes it. Each unique hoop scores once, medal thresholds are attainable, and repeated play grants no spendable coins or duplicate cosmetics.                      |
| S01 | v1/v2 migration preserves settings, money, cosmetics, rescues and every record category. Malformed saves are bounded, migration is idempotent, and storage failure is handled.                               |
| S02 | World → secret → world preserves current resources, claims and clock. Journal replay and the minigame cannot overwrite a parent record or reset its wallet credit watermark.                                 |
| U01 | Meter, warnings, clues, portals and tutorial text remain visible on small/large phones and iPad with maximum/swapped controls and safe areas. Shape/text supplement color.                                   |
| R01 | All six original rules and existing routes, saves, purchases, audio and input continue to work.                                                                                                              |
| D01 | Record physical device model, iOS version and build while checking two-thumb control, flight, guardian timing, haptics and sustained performance. Browser emulation does not satisfy this check.             |
| T01 | The exact release commit successfully archives in Xcode Cloud; its processed build is added to the intended Beta group and shows Testing after refresh.                                                      |

For this documentation phase, validate links, scope, numeric consistency and room/encounter contracts. Do not describe those checks as proof that the expansion plays correctly.
