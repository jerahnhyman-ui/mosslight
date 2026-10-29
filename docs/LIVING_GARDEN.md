# The living garden

Mosslight follows Pip and Poppy, two playable garden sprites waking an enormous garden with light. Both use the same movement and abilities.
The game uses movement, jumping, exploration, and readable enemy behavior; new
interactions do not require another touch button.

## Adventure content

- Three extended worlds with distinct terrain, optional upper routes, quiet
  clearings, discoverable secrets, and checkpoints before the final encounters.
- Flowers and curled leaves wake when Pip approaches. Light and footprints
  reveal routes without changing the meaning of diamonds or power stars.
- Recognizable garden landmarks anchor the routes: watering cans, flowerpots,
  webs, fallen logs, and streams.
- Mushroom climbs, moving-leaf rides, and collapsing cloud bridges combine
  familiar movement into authored sequences.
- Charging beetles can break marked barriers, and hoppers can bounce on
  mushrooms. These interactions also reward observing enemies.
- Each world ends with a three-phase guardian: Meadow's stag beetle, Hollow's
  spider, and Cloudtop's moth. Attacks have visible warnings and recovery
  windows. The exit opens after the guardian is defeated.

## A home for the light

The home grove is a safe, playable space. Rescued fireflies become its residents,
alongside a frog, cloud bird, and moth discovered in optional areas. The
Discovery journal saves secret places and their completion, and allows a return
visit after discovery. Garden Match and Seed Stack are optional menu activities
with their own saved best results.
Cosmetic outfits and decorations provide lasting rewards for exploration.
Collected coins contribute to a persistent wallet even when Pip already has
three lives. Purchases affect appearance, not movement or combat strength.
Rescuing all three fireflies in a world unlocks its optional challenge room.

Classic mode retains the three-life rules. Relaxed mode allows unlimited
checkpoint retries. Timed runs and challenge records provide replay goals.
Completion and time records for these modes are kept separate from one another
and from the earlier versions of the trails. Existing saves retain their
fireflies, settings, and historical records.

## Release acceptance

Automated validation must exercise the six original gameplay rules, real-input
world and guardian routes, light-activated platforms, enemy interactions,
checkpoint recovery, and challenge routes. Storage tests cover migration,
coin crediting, purchases, unlocks, and mode-specific records. Browser tests
cover playable navigation, touch input, settings, and phone layouts.

The native archive and the exact processed TestFlight build must be verified
separately. A successful web build alone is not release confirmation.

### Physical-device playtest

These checks require an actual iPhone or iPad and are not established by browser
emulation or an Xcode Cloud archive:

- Move and jump together with both thumbs, including slides and quick reversals.
- Play each guardian without a keyboard; check warning visibility and recovery
  timing with the controls covering the bottom corners.
- Visit the grove, make a cosmetic purchase, equip it, and return to a trail.
- Pause and background the app during a fight; verify input, music, timers, and
  haptics resume correctly.
- Check camera motion and readability on a small iPhone, both landscape
  orientations, and iPad. Confirm that notches and the home indicator do not
  obscure controls or vital information.
- Complete a longer session and check frame pacing, heat, battery use, and
  comfort. Record the device model, iOS version, and TestFlight build number.

Physical-device results must be recorded as observed, never inferred from an
automated pass.
