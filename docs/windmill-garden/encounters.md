# Windmill Garden encounters

> Historical design: the Mill Keeper is now a sub-boss before Briarheart, the
> Thorn King. The vane mechanic described below has been removed. See
> [the current guide](../WINDMILL_GARDEN.md) for both encounters.

Status: implemented encounter and activity contract. Automated input routes cover the guardian and Gold hoop completion. Numerical values remain initial tuning choices; human-playtest targets below are not measured results. Movement and feather behavior are defined in [flight.md](flight.md); world placement is defined in [world.md](world.md).

## What the existing game supports

The current `src/game/bosses.ts` has three guardian kinds, three health, and dormant/warning/attack/recover/defeated states. Each hit advances its phase; existing phases mostly increase attack intensity. `src/game/engine.ts` permits a descending stomp during recovery, safely bounces a stomp against armor, and permits star contact damage in any active state with a 1.35-second damage cooldown. A life loss recreates the whole boss in every mode. Relaxed mode preserves lives but currently does not preserve boss phases.

`src/main.ts` already displays phase, health dots, and a short boss instruction. Its instruction text is tied to the three existing kinds. Home Grove currently has no collectible coins, enemies, or activity portal; existing challenge medals are time based and indexed by world. The new activity therefore needs its own stable ID and score record, not a fourth entry accidentally passed through the old challenge completion path.

The fixed simulation runs at 120 Hz. Existing movement reaches 300 px/s, a held normal jump begins at -635 px/s, and small/big Pip are 28×38 / 40×56. The camera currently follows only X in a 960×540 logical viewport. These are source observations; the following timings and completion targets have not been measured.

## Bramblewing, the Mill Keeper

Bramblewing is a round wooden beetle carrying a four-petal windmill. In phase one its broad sails sweep the ground. In phase two a folded sail reveals a high feather-shaped vane that Pip must reach to stop the rotor. In phase three the damaged rotor alternates an overhead sweep and a ground sweep before revealing that vane. The player learns three different actions: jump a low obstacle, fly to a deliberate target, then release flight to find safe ground and relaunch.

Six successful hits complete the fight, two per phase. More health alone is not the difficulty increase: the second and third phases introduce a new condition for obtaining an ordinary stomp opening. No separate attack, interact, downward input, or third touch target is required.

### Arena and access

All coordinates below are local to the final 960 px room; the world author adds its room origin. The agreed world origin is 11,520 px. There is no vertical camera requirement.

| Object             | Local placement                    | Rule                                                                                                   |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Safe floor         | x=0–960, top y=470                 | Continuous solid ground; no pits or crumbling tiles                                                    |
| Checkpoint         | x=72, ground y=470                 | Before activation and before free replacement feather                                                  |
| Feather nest       | center x=112, y=430                | Grants an absent feather freely on every retry; no coins, charge refill exploit, or collectible reward |
| Activation line    | x=180                              | Activate only after the entire player is inside and the feather is equipped                            |
| Recharge pads      | x=280–420 and x=540–680, top y=390 | Permanent one-way platforms, 140 px wide; stable landing recharges normally                            |
| Guardian body      | x=428–532, top y=348, bottom y=470 | Fixed location; decorative blades do not enlarge contact damage bounds                                 |
| Raised vane        | center (480,185)                   | Visible radius 24; counter requires player center within radius 20                                     |
| Active play bounds | x=140–840                          | Explicit closed entry trellis and exit gate, not an unexplained invisible wall                         |
| Exit gate / goal   | x=850 / x=910                      | Gate opens on defeat; goal is safely reachable along the floor                                         |
| Canopy             | underside y=64                     | Visible foliage where a flight ceiling is required; use the flight specification's collision contract  |

Pin camera X to this room during the fight so both recharge pads, both wave origins, and the entire warning stay visible. Release the pin on defeat or leaving the run. The entry checkpoint remains outside the locked play bounds: a death releases the lock before respawn. A phase retry never spawns Pip under an active hazard.

The vane requires a modest flight extension from either pad. From a comfortable takeoff position on either pad to the vane is approximately 100–140 px; the vane's lowest accepted center is y=205. Even big Pip's center at an ordinary full-jump apex from y=390 is below that target, so an ordinary jump must not accidentally solve the vane. Validate this with both sizes and actual integration rather than relying solely on the ballistic estimate. The flight agent's proposed lift budget is 1.20 seconds; neither counter may require a perfect full-budget hold.

### Teaching before punishment

The preceding world room teaches the elevated vane interaction with the same feather symbol and silhouette. Place a harmless model windmill with a target at y=185 above a top-y=390 launch pad, horizontal offset 120–190 px, with continuous floor and no enemies. Copy: “Jump, release, then hold jump again to reach the feather vane.” A dotted arc links the pad, vane, and folded model sails. Touching the target folds those sails; it gives no reward, bounce, or charge. Missing it leaves it available. Stable landing replenishes charge so practice cannot exhaust a resource. This teaching belongs to the safe world route rather than a modal instruction during combat.

Inside the fight, every warning includes the same harmless outline before the real wave. Phase one copy is “Low sweep. Jump over it.” Phase three advances from “Move off the pad. Land below the high sweep.” to “Now jump over the low sweep.” The attack never begins without its full warning. Phase two is a low-pressure flight check: there are no wave hazards, the pads are safe, and an armored top contact bounces safely. Its repeatable open-vane window gives practice at no consumable cost; body-side contact still follows existing rules.

Do not introduce a compulsory tutorial pause or a skippable demonstration inside the fight. Every run uses the same simulation timings, preserving comparable Timed routes and allowing a carried star to remain useful. Tutorial seen/discovery flags may suppress repeated prose, never shorten warnings or alter the simulation. No extra touch action is needed to practice.

### State and damage contract

Use `phase = 1 + floor((6 - health) / 2)`, capped at 3 while active. Thus health 6/5 is phase one, 4/3 phase two, and 2/1 phase three. Do not reuse the existing “one hit equals one phase” formula for this guardian.

An explicit substate accompanies the existing coarse boss state: `settle`, `lowWarning`, `lowSweep`, `vaneWarning`, `vaneOpen`, `highWarning`, `highSweep`, `betweenSweeps`, `recover`, and `transition`. The guardian remains stationary; only sail animation and hazards change. Use elapsed fixed-step time, not wall-clock callbacks or unseeded randomness.

| Event                                                           | Result                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Descending stomp on body during recovery, damage cooldown clear | Remove one health, bounce Pip, clear hazards and close vane                                           |
| Descending stomp on armored body                                | Existing harmless bounce; no damage, no recharge                                                      |
| Other body or active-wave contact without protection            | Existing shrink/life-loss rules; no invented fractional damage                                        |
| Valid vane touch while open                                     | Close vane immediately, cancel hazards, enter recovery; the vane itself neither hurts nor bounces Pip |
| Recovery ends without a hit                                     | Repeat that phase's cycle; no health change or resource charge                                        |
| Accepted hit within same phase                                  | 1.00-second harmless settle, then next cycle; at most one ordinary hit per recovery                   |
| Accepted hit crosses phase boundary                             | 1.50-second harmless transition, save Relaxed phase entry, then new phase warning                     |
| Health reaches zero                                             | Defeated, clear hazards, release arena locks, open exit; no extra hit required                        |

There is never more than one damaging wave at once. A hit clears every wave before another collision can be applied. Recovery has an obvious motion change: all sails fold inward, the wooden back opens, a downward arrow appears, and the HUD reads “Sails folded. Land on its back.” Side contact still follows normal boss rules; decorative motion cannot turn an untelegraphed blade into a hitbox.

### Phase timing hypotheses

All wave rectangles are 48 px wide, moving across x=140–840 at 260 px/s and removed at the far boundary. A nominal 2.80-second sweep includes its exit. Select the wave origin once at warning start, from the side farther from Pip; show that origin and direction immediately, then never retarget mid-warning. Subsequent waves alternate origin. No wave appears intersecting Pip. A spawn overlap cancels that wave and restarts its full warning.

| Phase              | Ordered cycle                                                                                                                                        | Counter and failure recovery                                                                                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: Ground sails    | Low warning 1.40 s → low sweep 2.80 s → recovery 3.00 s                                                                                              | Wave spans y=414–470. A normal jump clears it; flight is optional. Survive, approach, stomp the stationary back. Missing the stomp repeats the same cycle.                                                                                                                                                                   |
| 2: Feather vane    | Vane warning 1.50 s → vane open up to 4.50 s → recovery 3.20 s if touched                                                                            | No damaging wave in this phase. The armored body remains a contact hazard. Jump from either pad, release, hold jump again, touch high vane, release and descend onto the back. Missing the vane gives 1.00 s calm, then retries; no recovery is granted by waiting alone.                                                    |
| 3: Crosswind sails | High warning 2.80 s → high sweep 2.80 s → calm 1.80 s with low-wave warning → low sweep 2.80 s → vane open up to 4.50 s → recovery 3.20 s if touched | High wave spans y=250–408: floor is safe, pads are not. Steer outward off the pad, release lift, descend into the nearest floor refuge, recharge, then jump the low wave. After that wave leaves, fly from a pad to the same vane and descend for the stomp. Missing the vane returns to the high warning after 1.00 s calm. |

Each cycle also starts with a 1.00-second harmless settle after a successful prior hit, unless a longer phase transition already supplied it. Timings do not accelerate after the first hit within a phase. After entry, give the same 1.00-second settle before the first warning.

The floor refuges are x=140–280 (140 px wide) and x=680–840 (160 px wide). Keep them free of props with collision. Release alone does not drop Pip through a one-way pad: the outward arrow explicitly cues steering off its outer edge, then landing below. The player uses the nearest refuge; crossing through the guardian is never required.

The high warning is deliberately long because the agreed feather glides after activation: releasing jump stops lift but does not necessarily create a fast fall. A player near the vane may need more than a second to reach safe ground. The 1.80-second gap before the low sweep includes a fully visible directional warning and permits the 0.20-second recharge. If the demonstrated descent from the highest legal position cannot finish within the high warning, increase this warning; do not silently strengthen downward gravity for the encounter.

These are design hypotheses: an unassisted clean fight should take approximately 70–105 seconds. A failed counter should usually cost another readable cycle rather than a life. Measure actual median duration and error distribution before choosing release values. Preserve six hits unless testing shows repetition remains after simplifying cycles; reducing to one hit per phase is a fallback accessibility option, not the default proposal.

### Warnings, accessibility, and controls

Warnings use silhouette, placement, motion, and text together: floor hatching plus upward arrow for low wave; overhead hatching plus an outward/downward arrow and safe-floor outlines for high wave; feather-shaped target plus dotted arc for vane. A repeating wind sound or one light haptic may supplement these, but neither carries unique information. Avoid flashes and rapidly rotating warning marks. Reduced-motion settings, if added, keep the same warning geometry and duration with a static arrow.

Use the existing HUD area and one short instruction at a time. Display “Phase 2 of 3 · 2 hits left in this phase” alongside six total health pips. Safe landing pads show a filling feather icon only while recharge is incomplete. The same controls apply to keyboard and gamepad. Normal jumping, releasing, pressing/holding jump anew, and steering are enough; no pause-menu action is part of combat.

### Feather, modes, and star interactions

- Feather is independent of size. Shrinking retains it. Life loss removes it and respawns Pip before the free nest; the trigger waits for reacquisition. A nest never refills an already-equipped feather while airborne. Stomps and guardian bounces do not refill charge.
- Classic and Timed start with the existing three-life rules. A life loss resets this guardian to six health and phase one; previously collected coins do not reappear. Zero lives ends the run as today. No boss retry grants coins, stars, diamonds, or lives.
- Relaxed retries preserve the highest entered phase in the current run. A death in phase two respawns before the arena with four health on the boss; a death in phase three restores two. Damage within a phase is not saved: dying at three health resumes at four. Both entry and exit locks release on death, waves and timers reset, and the initial warning is always replayed. This checkpoint is run-local; restarting the adventure or opening a fresh run starts phase one. It is not a general save-and-resume system.
- If a hit enters a new phase and a life-loss event would occur in the same fixed step, the accepted boss hit clears hazards first and establishes the phase checkpoint. Apply at most one player damage event in the step. Test this ordering explicitly.
- Keep the existing star promise: an active star prevents contact damage and touching the active guardian can damage it outside recovery, including a closed vane phase. Preserve the 1.35-second cooldown and existing powered-contact behavior. A protected player may legitimately bypass a phase's ordinary vane/attack cycle. The two 1.50-second phase transitions are noninteractive, clear hazards, show the new sail formation and phase number, and cannot take repeated damage; the next contact can hit after transition if the cooldown has elapsed. Within a phase, powered contact still obeys the original cooldown. Thus a sufficiently fresh carried star may defeat all six health, but cannot do so in one contact frame or without readable phase boundaries. Do not strip a carried star at the arena.
- Do not place a renewable star inside or at the boss checkpoint. A legitimately carried 10-second star is a powerful shortcut. The same fixed route and pickups are available in Classic and Timed; a faster star route is a valid time. Stars still expire with simulation time and are cleared on life loss.
- Timed retains the existing elapsed-time behavior: retries do not reset the run clock, pause/backgrounding freezes simulation, and death does not become a free timer reset. Record completion under the world's stable ID and selected mode. All encounters use the same timing on first and repeated visits; tutorial prose does not create a different simulation route. A layout/physics revision that changes comparability gets its own record revision.

### Tuning order and boss acceptance criteria

Adjust legibility first, then timing: increase warnings by 0.25 s, vane-open duration by 0.75 s, or recovery by 0.50 s before changing flight physics. If vane misses remain common, enlarge its accepted radius from 20 to 26 only after confirming both normal-jump sizes still require the intended feather action; lowering it blindly can remove that lesson. Relaxed may use +0.50 s warnings and +1.00 s vane/recovery windows; keep separate mode records. Classic and Timed use identical attack timing.

Implementation is acceptable when:

- All three phases have their specified distinct interaction, both ordinary hits must earn a fresh recovery, and no accepted hit can remove multiple health in one frame.
- Scripted fixed-step input traces can beat each phase with both sizes, no star, and initial feather charge at zero after a safe recharge. Trace feasibility precedes claims of phone usability.
- On a real phone, fresh players can identify low/high/vane warnings with sound and haptics off, without reading text while executing a precise flight input. Record at least five sessions including two people unfamiliar with the move; report successes, deaths by phase, and timing rather than labeling the targets “validated” from a designer run.
- The held ground-jump button never silently activates flight; the required release/fresh press works with either control layout and both touch-size extremes. No necessary target is hidden by thumbs or HUD at the smallest supported viewport.
- Dying at health 5/4/3/2/1 restores 6/4/4/2/2 respectively in Relaxed, and 6 in Classic/Timed. Missing feather and exhausted charge cannot lock the arena permanently.
- Every recovery offers a reachable stomp from the counter's actual ending position, including glide and a possible invulnerability bounce. High warning permits descent from the highest reachable arena point. These are measured physics assertions, not just the coordinate intentions above.
- A star can hit during a warning/closed-vane state, never more frequently than the inherited cooldown; armored ordinary stomps bounce safely; star protection does not add flight charge.
- Pause/resume, pointer cancellation, backgrounding, death during warning, and restart during transition leave no active hidden wave, locked respawn, duplicated reward, or stale input.

## Home Grove activity: Petal Post

Petal Post is one short flower-hoop flight course with eight small gardens in a row. The pleasure is placing Pip through a high hoop, releasing lift to pass through a lower hoop, and landing neatly to refill. It uses the exact adventure feather; there is no alternate vehicle or steering model.

### Entry and run rules

The first collected Wind Feather permanently unlocks `minigame.flower_hoops`; no world completion, firefly count, or payment is required. Before unlock, a flower arch in Home Grove's play area reads “Find a Wind Feather to open Petal Post.” After unlock, the nearby contextual panel offers “Fly Petal Post.” This is an ordinary menu button used while stationary, not an additional gameplay control. Reuse the Grove overlay/action area rather than overlapping the jump surface. Also list the unlocked activity in the journal.

Entering starts a separate activity scene, not a damage-enabled subsection of Home Grove. Pip is small and receives a full-charge borrowed feather every attempt. The activity never consumes the world's feather, lives, coins, or growth state; exiting returns to Home Grove. No enemies, pits, stars, diamonds, paid retries, or permanent stat bonuses appear. Floor catches mistakes. A short example arc and “Release to descend; land to refill” sign is visible at the start.

Countdown is 3–2–1, with movement disabled. Clear inputs at GO and require a fresh jump press. The run ends at the finish gate or after 60.00 seconds of active simulation. Intended typical duration is 30–50 seconds, to be measured. There is no forced wait for a clean early finish. Pausing freezes the clock; backgrounding pauses. A course reset yields zero reward unless a completed result already earned its one-time unlock.

### Concrete course

Course width is 7,200 px with continuous floor top y=470. Use the ordinary horizontal camera and visible canopy underside y=64. Repeat the following 900 px cell eight times, with distinct flower colors, numbered hoop labels, and alternating decorative planting; all colors also have distinct petal patterns. The terrain remains identical for reproducible scoring.

| Object in cell `i` | Placement, relative to `900 × i`    | Purpose                                   |
| ------------------ | ----------------------------------- | ----------------------------------------- |
| Launch pad         | x=100–260, top y=390, width 160     | Normal jump onto it, then stable recharge |
| High hoop A        | center (360,185), scoring radius 32 | Deliberate lift after the normal jump     |
| Low hoop B         | center (500,295), scoring radius 32 | Release lift and descend while steering   |
| Landing pad        | x=520–720, top y=390, width 200     | Safe refill and landing bonus             |
| Ground link        | x=720–900, top y=470                | Reset rhythm before the next cell         |

Spawn at player-left x=180 with feet on the first launch pad at y=390, visible above the largest directional controls during the countdown; finish gate at x=7,140. Hoops are non-solid markers; striking their flower rim never damages or stops Pip. The nominal inner-edge launch to nearest legal landing-center span is approximately 288 px for small Pip; this is a geometry estimate, not a measured flight trace. The actual descending path may land farther into the 200 px pad. The preliminary layout must be verified against the final glide and acceleration before art is fixed.

The descending hoop deliberately tests horizontal control: A to B is 140 px across and 110 px down. Armed glide capped at 180 px/s needs at least 0.61 seconds to descend that far, while full-right speed covers the horizontal gap in 0.47 seconds. Release lift and ease the movement thumb toward neutral, then steer into B; holding full right is not the intended clean route. Show a curved descending dotted guide and a short first-cell hint, “Ease your steering to line up the lower hoop.” Do not require simultaneous rapid taps or precision reversal. If real-phone traces find braking unreliable, move B and its landing pad together farther right and revise cell spacing before tightening medal scores.

Hoops can be collected in either order or revisited to correct a miss, but each stable hoop ID scores only once per attempt. An uncollected hoop remains visibly open; a collected one closes into a flat petal stamp. No compulsory ordering can leave all subsequent hoops inactive after a miss. A forward route line shows the next nearby uncollected hoop, without requiring interaction. Backtracking costs clock time; the camera follows normally.

### Scoring, medals, and retry

Use a swept center-crossing test against each hoop's vertical center plane, interpolating Y at the crossing. This prevents 120 Hz steps from skipping a hoop or awarding multiple overlap ticks. Either travel direction is eligible on the first valid crossing. Player center within 32 px vertically of hoop center earns the pass; within 12 px earns the centered bonus. Small form is fixed for consistent scoring. A high-speed edge clip is not a center pass.

| Event                                                     |                                      Points | Limit                                                        |
| --------------------------------------------------------- | ------------------------------------------: | ------------------------------------------------------------ |
| Valid hoop crossing                                       |                                         100 | 16 unique hoops = 1,600                                      |
| Centered crossing                                         |                                         +25 | Once for each hoop = 400                                     |
| Settle on corresponding landing pad after both cell hoops |                                         +50 | First continuous 0.20 s grounded landing for that cell = 400 |
| Finish-time bonus                                         | `clamp(floor((60 - elapsed) × 10), 0, 200)` | Only at finish, at most 200                                  |
| Maximum                                                   |                                       2,600 | No combo multiplier or repeat-touch points                   |

The landing bonus checks actual stable grounded support, not visual overlap, and only after both associated hoop IDs have been collected. Touching floor first does not permanently remove the opportunity: a player may retry at a time cost. Show a brief “Centered +25” or “Soft landing +50” text near the object, outside the input regions; keep the main HUD to time, score, and hoops `n/16`.

Initial medal thresholds:

- Bronze: at least 800 points at finish or timeout. An imperfect flight through half the hoops can earn the first reward.
- Silver: at least 1,750 points and reach the finish before timeout.
- Gold: at least 2,300 points, all 16 hoops, and finish in at most 45.00 seconds. This requires deliberate centered flight or landings in addition to reaching the exit.
- Below Bronze: show “Practice flight” with score and progress; never claim a medal was earned. The result still offers immediate retry.

Results show score, hoops, centered hoops, landing bonuses, time, medal, and personal best, with one primary “Fly again” action and secondary “Back to Grove.” Retry starts a fresh attempt with full charge and clear collected/landing sets. No confirmation dialog, walking back to the portal, or life deduction is needed. On timeout, freeze safely where Pip is and show results; do not play the life-loss treatment.

### Reward and persistence contract

The first Bronze-or-better result unlocks one purely decorative `cosmetic.pinwheel_garland` for Home Grove. It grants zero wallet coins and zero lifetime coins. Higher medals change the displayed activity badge; Gold adds a gold petal to the same garland, with no second currency grant. Replays improve records and give no spendable currency. This keeps free practice compatible with the existing shop economy and its 50-coins-per-life rule.

Store stable IDs, for example `minigames['minigame.flower_hoops']`, with `unlocked`, `bestScore`, `bestMedal`, `completed`, `bestFinishTime`, and a scoring/layout `revision`. `completed` means reaching the finish; Bronze on timeout may unlock the garland without setting `completed`. `bestFinishTime` only compares completed attempts. Maintain the best scored attempt's score breakdown/time as a single coherent record rather than composing incompatible maxima into a fictional run. Ties on score prefer a finish, then shorter elapsed time. Keep fastest finish separately if desired.

The ownership record for `cosmetic.pinwheel_garland` is a set/idempotent grant, shared across every adventure mode and activity entry path. Claim on the persisted result, not on opening the result screen. Persist the result and ownership together in the same save update; repeated processing uses the same ID and is a no-op. Reloading, replaying, double-clicking retry, or visiting via the journal cannot duplicate it. Adventure mode does not change this activity's physics or medal thresholds, so keep one standard activity record rather than labeling identical play as separate Classic/Relaxed/Timed scores. If assistance or altered physics is later added, key that variant separately. Existing world challenge medals and world completion counters stay independent.

### Activity tuning and acceptance

The course dimensions, 60-second limit, center tolerance, and medal thresholds are hypotheses. First verify that one flight charge reaches both hoops and the landing with steering corrections; then measure five novice and five practiced phone attempts across at least two viewport/control configurations. Report completion rate, median time, missed hoop IDs, and medal distribution. Initial targets are Bronze within three attempts for most novices, a practiced clean run in 30–45 seconds, and Gold from repeatable control rather than a single lucky pixel crossing. These targets are not test results.

If novice success is low, increase pass radius to 38 while preserving the centered radius, widen landing pads toward the flight segment, or extend timeout to 65 only if the user accepts leaving the requested 30–60-second activity envelope. Prefer the first two within this release. If Gold is too easy, tighten its centered/landing contribution through the score threshold before shrinking pass tolerance. Never change shared adventure flight physics solely to rebalance a medal. Bump scoring/layout revision whenever records cease to be comparable.

Acceptance requires:

- Eight cells, 16 real hoop triggers, one finish/timeout path, and immediate repeatable play exist; a menu mockup or static hoop art is insufficient.
- The full route is achievable with the shipped two-thumb controls and final feather/glide implementation, with no segment needing a recharge from a hoop, enemy, or bounce.
- Swept crossing, crossing in reverse, crossing twice, center/edge tolerance, deadline/finish on the same fixed step, and 0.20-second landing qualification produce deterministic scores. Resolve finish at `elapsed <= 60.00` before timeout; do not award a finish bonus after that boundary.
- Maximum legitimate score is 2,600; leaving/reentering a hoop or landing pad cannot increase it. No activity event increments wallet, lifetime coins, coins toward an extra life, rescued fireflies, or world completion.
- Bronze on timeout grants the cosmetic once; repeated finishes, reloads, portal/journal entry, and duplicate result handling do not duplicate rewards. A missing or old record migrates to safe empty values without modifying legacy challenge results.
- Pause, lost pointer capture, background/resume, retry while holding jump, and exiting mid-countdown restore usable controls and do not start with accidental flight.
- At minimum touch-control size and maximum touch-control size, active hoops and pad edges remain readable above the thumb regions. Colorblind, sound-off play retains every scoring and route clue.

## Implementation and asset boundary

This proposal adds one guardian kind and its explicit substate data, one vane trigger, low/high wave render variants, arena gates/camera pinning, a phase checkpoint policy, an activity scene/result route, hoop/landing scoring, and stable records/reward ownership. It does not require a vertical camera, online leaderboard, new touch action, procedural course generator, or external art service.

Build the guardian from the existing illustrated/canvas style: one wooden body, four reusable sail shapes, a folded/recover pose, and three warning symbols. Reuse flower primitives for two hoop states, pad refill marks, and one garland decoration. Audio can reuse wind, jump, checkpoint, and reward cues with volume/pitch changes; unique sounds are optional polish. None of these assets is a prerequisite dependency on paid or third-party packs. Preserve the three shipped guardians' existing health, behavior, star interaction, and UI wording through explicit per-kind handling.
