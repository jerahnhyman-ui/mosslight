# Wind Feather: flight contract

> Historical design note: feather fountain placement and pickup instructions
> below have been superseded by feather-marked power blocks, which Pip bumps
> from below. The current player instructions are in [the guide](../WINDMILL_GARDEN.md).

Flight contract for the implemented expansion. Numbers below remain initial tuning values, not physical-device playtest results. Route layout lives in [world.md](world.md); guardian and hoop rules live in [encounters.md](encounters.md).

## Intent and existing behavior

Pip jumps, releases Jump, then presses and holds Jump again to **rise under their own power**. Releasing that second hold opens a gentle glide; landing restores lift. This is a small flight ability with clear rest stops, not a replacement for the normal jump or a new button.

The current source establishes the integration constraints:

- `src/game/engine.ts`: deterministic 120 Hz simulation; horizontal maximum 300 px/s; normal jump −635 px/s, short jump −370; rising/falling gravity 1450/1850 px/s²; fall cap 900; coyote time 0.12 s and jump buffer 0.16 s. Positive y points down.
- `src/controls.ts`: keyboard, touch and gamepad combine into held Jump plus a frame-level `jumpPressed`. That is insufficient to preserve a release/repress that happens between two simulation ticks; flight needs the edge handling below.
- Damage currently shrinks Big Pip with 0.22 s movement lock and 1.5 s grace; damage to Small Pip loses a life. Growth preserves feet position and checks solid clearance. Stars last ten seconds. None of these values changes for the feather.
- `src/game/renderer.ts` scrolls only horizontally in a 960×540 logical viewport. Falling with player top y > 660 loses a life. The expansion does not introduce cameraY.

## Ownership, charge and presentation state

Store feather ownership independently of `player.form`: `hasWindFeather`, `liftRemaining` in seconds, `glideArmed`, `liftActive`, `stableGroundTime`, and the Jump edge/arming state. These are transient run state. Permanent `windFeatherDiscovered` records the first pickup and unlocks the Home Grove hoop activity; it does not automatically equip a new run. Feather plants on the opening path and at each world checkpoint supply the ability in all four worlds; the Home Grove also supplies one for practice. The three challenge rooms retain their original jumping rules.

The UI derives these states; a large new state-machine framework is unnecessary:

| State      | Behavior                                                  | Exit                                                     |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------- |
| No feather | Existing movement exactly                                 | Collect a feather                                        |
| Ready      | Charge available; normal jumps remain normal              | Deliberate airborne activation                           |
| Lifting    | Hold Jump to spend charge and rise                        | Release, empty charge, landing, hurt or forced bounce    |
| Gliding    | Normal rising gravity; descending speed capped at 180     | Fresh press with charge resumes lift; landing ends glide |
| Recharging | Continuous eligible grounded contact counts toward 0.20 s | Full charge at threshold; departure resets contact timer |

An equipped feather with zero charge still glides **if** glide was armed during this airtime. A player who leaves a platform with depleted charge cannot arm glide with an empty press; they must use the available safe landing to recharge. Do not turn every normal jump release into a glide.

## Inputs and exact activation rules

Keep Left, Right and Jump across touch, keyboard and gamepad. Tutorial copy: **“Jump. Let go. Hold Jump again to rise. Let go to glide. Land to refill.”** First pickup permits experimentation on a broad safe floor; the following crossing requires flight and catches missed attempts on a lower floor. The later Flight Workshop supplies the high flower target that a normal jump cannot reach, rehearsing the guardian vane before combat.

1. A press accepted by the existing grounded/coyote/buffered jump consumes that edge for the normal jump. Holding it never automatically starts flight at the apex.
2. After Jump has been observed released, a fresh press while airborne starts lift if a normal jump is not available, a feather is equipped, charge is positive, and hurt lock is zero. Walking off an edge works: after coyote time, a fresh press can start lift without a preceding ground jump. Inside coyote time the press remains a normal jump.
3. An accepted flight press clears any ground-jump buffer created by that same edge, sets `glideArmed`, disables normal jump-shortening for that flight episode, and spends lift only while Jump stays held. The same press cannot produce an automatic jump on landing.
4. Release stops lift. A fresh press can resume it with the remaining charge. It neither refills charge nor gives an upward impulse. Exhaustion while held does not reactivate after a landing; a release and a new press are still necessary.
5. Landing immediately ends active lift and glide, even before recharge finishes. If a press is ineligible for flight because charge is empty, retain the existing short ground-jump buffer; a landing within 0.16 s can use it. This allows familiar buffered jumps without granting a recharge.
6. A direct feather pickup while airborne does not activate anything from a button already held. Release and press again. Authored fountains sit on safe ground so this is an incidental case, not a required technique.

### Edges at 120 Hz

Normalize Jump as one aggregate boolean across all input sources. A second finger, another jump key, or gamepad A while keyboard Space remains held is not a release/repress. Keyboard repeat produces no new edge. Pointer cancellation is a release when no other source holds Jump.

Capture ordered changes of that aggregate state and keep them pending until the simulation actually executes a fixed tick. `Game.update()` may execute zero, one or several ticks; it must not lose a press on a zero-tick frame or reinterpret one press on every catch-up tick. Consume each pending edge once on the next tick, in order. A rapid release/repress must be visible even when the final held boolean is unchanged. Ground/coyote jump has priority when the tick processes a press; a later edge may not manufacture a second normal jump from the same grounding. Multiple sub-frame events need no wall-clock physics: they are quantized to the next simulation tick, as existing input is.

If an entire press/release occurs before that tick, its ground-jump buffer can still produce the existing short hop. It does not supply a held interval of lift; no charge, upward impulse or falling-speed reduction is awarded for an unheld flight tap. Do not replay edges after life loss, restart, menu transition or app backgrounding. Tests compare identical tick-assigned input traces; differently sampled human input is not claimed to have identical positions at every render rate.

## Initial physics and route envelope

| Parameter                         | Initial value                                          | Reason                                                          |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| Lift budget                       | 1.20 s / 144 ticks                                     | Enough for a deliberate rise and correction; finite per landing |
| Lift target vertical speed        | −170 px/s                                              | Clearly climbs instead of merely slowing a fall                 |
| Acceleration toward lift target   | 1200 px/s²                                             | Short, readable reversal after descending                       |
| Armed glide downward cap          | +180 px/s                                              | Time to steer to a landing; never hover                         |
| Recharge                          | 0.20 s / 24 consecutive eligible ticks                 | Visible landing confirmation, not a one-tick contact exploit    |
| Horizontal control                | Existing 300 maximum and existing acceleration/braking | No new steering skill required                                  |
| Required authored powered segment | ≤300 px horizontal; ≤140 px additional feet rise       | Conservative design target pending route tests                  |
| Required rest landing             | ≥140 px usable width                                   | Room for both forms and touch correction                        |

For each fixed tick with active lift, first cap any downward speed at +180 (the armed glide envelope), then approach −170 by `1200 * STEP`. When entering lift with a faster upward jump/bounce velocity, preserve that momentum: use ordinary rising gravity until it reaches −170, never make it more negative. Clamp at −170 on that crossing while lift remains active. Deduct one STEP of charge whenever lift is active, including while rising faster than its target or pressing into a ceiling. Gravity is not added a second time during the lift branch. Charge and recharge timing should use integer ticks internally if convenient to avoid endpoint drift.

Outside active lift, use existing rising/falling gravity and the ordinary jump-release shortening rule where still applicable. If glide is armed, cap positive vertical speed at +180; negative speed is unaffected. After charge empties, start this branch on the next tick. There is no automatic hover, updraft recharge, or free thrust from tapping.

From an airborne rest/apex, a complete lift should gain roughly 190 px in clear space. Activating from descent reverses into a real climb; the first armed glide cap prevents a late activation from requiring almost the whole budget merely to brake a 900 px/s fall. These estimates are checks on intent, not guarantees for every launch. Releasing before the end conserves the remaining charge for another rise during the same airtime.

**Glide changes the total route envelope.** Normal jump plus full lift and a glide back to the same low floor can travel approximately 1000 px at full horizontal speed. The 300 px figure is an authored comfortable powered segment, not a maximum jump range. Do not protect a puzzle, firefly sequence or boss trigger with gap length alone. Test direct high arcs and long glides across adjacent rooms; use visible gates and canopy geometry where sequence matters. The full route must work in Small and Big form with no speed-perfect takeoff or last-tick fuel usage.

## Landings, ceilings and other movement

Eligible recharge supports are active ground, ordinary platforms, intact bricks, moving platforms, and awakened flowers/curled leaves. They must still support the player's feet after collision resolution and the player must not immediately jump away. Continuous contact counts while walking along a stable floor or transferring seamlessly between touching eligible surfaces. A moving platform counts as grounded even though its world y changes.

Mushroom bounces, enemies, the guardian, crumble platforms, side/ceiling contact and airborne checkpoint triggers do not recharge. A safe landing for less than 24 ticks stops glide but preserves the remaining fuel; it does not reset a hidden free-activation allowance. Broken, asleep or blocked-carrier platforms cannot count as support. At 24 ticks restore the full 144 ticks once and play one quiet refill cue. Standing longer does not repeat the cue.

Mushrooms, enemy stomps and guardian bounces keep their current impulses. They cancel active lift and require a new release/press to resume it; they preserve ownership, remaining charge and the already-armed glide. Spend no fuel during the forced bounce unless the player deliberately reactivates lift. Growth preserves the existing collision/feet rules and does not alter fuel, lift acceleration, glide or horizontal speed.

Use ordinary solid collision for roof contact; set upward velocity to zero as today. Holding lift against a roof spends fuel, pushing downward afterward still follows collision physics, and contact never refills. Do not use a screen clamp or invisible death ceiling. The original trails and Home Grove use vertical camera follow for high feather flights; Windmill Garden and its activities keep their authored canopy and camera framing. Author visible solid canopy/trellis roofs where high launches or mushroom combinations could send Pip above the viewport. A useful roof underside is y64, with the foliage rendered at its collision edge. Open-sky sections must be verified against their actual highest launch/bounce, not just their floor height. Required targets should occupy the readable middle of the screen rather than the top HUD band.

## Damage, stars and the existing economy

- Big Pip taking an ordinary hit shrinks and keeps the feather and remaining charge. Cancel active lift, clear queued Jump edges and ground buffer, and honor the existing 0.22 s knockback lock. During that lock use existing knockback physics. Armed glide resumes afterward; renewed lift requires a release since the hit and a fresh press after the lock. No hit refills charge.
- Small Pip losing a life loses the feather. Clear lift, glide, charge, recharge timer and input state as part of `spawn()`/life-loss reset. Retry availability is supplied by a fountain, not by silently retaining the power.
- Stars coexist with both forms and feather. Keep ten-second duration, enemy contact defeat, existing guardian contact damage rules and fall vulnerability. Star pickup does not refill lift or extend its duration. A hit ignored by star/grace does not cancel flight.
- The Windmill Guardian must still accept the documented star interaction; flight contact itself is not an attack. Stomps still require descending motion and the existing contact direction test. Do not count rising through an enemy as a stomp.
- Preserve three lives, fifty coins per extra life, maximum three, diamond growth, saved coins and fireflies. Feather fountains grant no coins, lives, score or duplicate discovery rewards. No new consumable is purchased to solve required flight.

## Fountains, retry guarantees and persistence

A fountain is an inexhaustible visible feather source on safe ground. Enter its pickup area while grounded and missing the feather to equip it with a full budget; collection marks the permanent discovery flag once. While already equipped it supplies no instant refill: ordinary 0.20 s landing recharge applies. A fountain does not disappear permanently after pickup, and touching it in flight cannot top up charge. Its artwork can settle/dim while the player is equipped rather than suggesting another collectible reward.

Every required flight segment must be reachable from the active retry spawn on foot with no feather, or the checkpoint must have its own fountain before the launch. This includes the initial world spawn, guardian retry platform, beehive replay spawn and hoop start. Author checkpoint spawn feet on stable ground, overlap or immediately beside its fountain, without an enemy, expiring bridge, active projectile or one-way gate between them. Losing a life resets the fountain's availability naturally because ownership is now absent. No resource-count check may prevent retrying.

Classic and Timed retain existing life accounting; a run loss presents the existing restart flow. Relaxed retains unlimited checkpoint retries. Guardian phase checkpoint differences are specified in [encounters.md](encounters.md); each phase retry obeys the same Small/no-feather → safe fountain → full-charge contract. A short minigame reset supplies its borrowed full-charge feather at the safe start and clears its transient flight state. Returning to the map, grove or another independent run never carries charge or ownership between instances. The beehive is a side excursion within the same world run: the shared run session carries current form, feather ownership/charge, star time, lives and coins toward a life into and out of it. Suspend parent-room geometry while the main run clock continues; do not restore a pre-entry power snapshot on exit. Enter and leave on safe ground, clear movement/input edges, and require ordinary landing recharge rather than treating a portal as a refill. Discovery and applicable content records are permanent; the standard hoop activity has one record across adventure modes, while world records remain mode-specific. Active flight is not saved midair.

## Pause, backgrounding and resume

Pause freezes charge, flight, recharge progress, velocity, platforms, hazards, elapsed run time and guardian clocks together. Hidden-page and blur paths continue to auto-pause. Clear pending edges and physical input holds through the existing controls reset, without treating a still-held gamepad button as a fresh press. Freeze for minutes or hours with no resource decay.

On resume, clear `liftActive` and require release/new press for renewed lift; preserve charge and armed glide. The first resumed tick therefore follows normal rising gravity or armed glide until intentional input arrives. Do not recharge merely because the pause occurred over a platform. The resume action must reset the animation-frame time baseline so a background interval never produces a 0.1 s catch-up burst on the first resumed update. A small pre-pause simulation remainder may be preserved; do not simulate wall time spent paused. A platform jump held across pause is likewise not a new jump.

## HUD, camera and readability

Show a feather icon beside the existing Small/Big and star indicators, plus a compact four-segment charge meter. All segments empty means “Land to refill”; full means “Ready.” During powered flight show upward feather strokes; glide uses open wings/feather silhouette and no thrust strokes. Damage grace and star aura remain visually distinct. Convey depletion/refill with shape, text and one optional sound/haptic, not color or flashing alone. Announce pickup and first depletion/refill through the existing status region; do not emit per-tick screen-reader announcements.

The touch button remains Jump. When equipped its caption can read “JUMP · RELEASE · HOLD TO FLY”; the first safe lesson shows the full instruction. Keyboard/gamepad help receives the same rule. Put the tutorial before a safe practice target, let the user retry it without a life penalty, and leave the instruction available in Help.

Keep the current horizontal lookahead. At each launch, the intended rest platform, wind warning and next direction should be visible before commitment; avoid requiring a blind ascent or fall beneath touch controls. Canopy collision art must read as solid. Wind warnings require a static arrow/stripe silhouette and optional sound; reduced-motion mode removes swirls and bobbing, never the warning or platform outline. No camera shake is required for flight. Camera respawn snaps use the existing reset behavior.

## Exploit and regression acceptance

Terra should add focused simulation tests in the existing Vitest style and an input/browser check for cases the pure engine cannot reproduce. These are acceptance requirements, not results of this design phase.

1. Normal short/long jump, coyote and buffered landing traces match the pre-feather baseline when no feather is equipped **and** when equipped but never intentionally activated. Held ground Jump does not start lift.
2. At a safe airborne apex, full lift raises Pip by approximately 175–205 px before ordinary post-lift momentum; a controlled falling start reverses into negative vy and gains altitude. Flight is not implemented only as a descent cap. Small and Big share the same velocity trace.
3. Cumulative powered ticks never exceed 144 between valid refills. Twenty taps, ceiling holds, growth, star pickup, ignored damage, stomps, boss bounces, mushroom chains, checkpoint touches and fountain overlap cannot increase charge. After exhaustion and after holding against a roof, descent eventually continues.
4. Glide only arms through an intentional valid held activation, caps descent at 180, never drives vy negative, and terminates on landing. Depleted walk-off cannot activate a new glide. A high-to-low boss warning permits the actual gliding descent time plus recharge.
5. Landing for 23 ticks does not refill; 24 eligible ticks do. Crumble, mushroom, enemies, side walls and ceiling never refill. Safe moving/awakened platforms do. Jumping on the landing tick cannot claim that tick toward stable contact.
6. A release/repress queued between frames survives a zero-step update, is consumed once during catch-up, and produces no repeat on the next substep. Touch + keyboard overlap, gamepad-held resume, key repeat and pointer cancel obey aggregate edges. Replay the same tick input at 30/60/120 Hz render schedules with equal results; test a capped long frame separately without claiming elapsed wall time was simulated.
7. Shrink retains ownership/charge and respects knockback. Small-hit death clears feather and all pending input. Every world checkpoint, guardian phase retry, beehive entry and hoop retry provides a free replacement without crossing a required flight obstacle. Repeat each retry with zero currency and empty prior charge.
8. Pause during lift, glide, recharge and a boss warning; background the app; resume with Jump still held. No clock advances, refill, fresh activation or time burst occurs. Release/press restores intentional control.
9. Run required routes with both forms and touch-sized steering margins. Attempt a maximum-height long glide to bypass each puzzle gate and guardian trigger; collision/encounter conditions must reject required progression skips. Hoop order remains unrestricted: verify that gliding past an uncollected hoop grants no score, does not disable later hoops, and still allows a return pass. Open-sky high-platform and mushroom paths keep Pip readable; roof collision does not break a sequence.
10. Existing old-world tests continue to pass; stars, diamonds, coin ledger, three-life limits, checkpoints and saved fireflies remain unchanged. First pickup unlocks the hoop activity even if the following fall ends the run; replaying the fountain never duplicates a permanent reward.

Tune lift budget/target speed only after the rehearsal, required route, guardian vane and hoop course all have recorded playable traces. If the feel changes, revalidate their combined ascent-and-glide envelope together rather than stretching a single gap to fit an untested number.
