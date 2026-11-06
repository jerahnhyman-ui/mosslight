import type { Level, Platform } from "./levels";

type Power = NonNullable<Platform["rewardPower"]>;
type Placement = readonly [Power, number, number];

// Positions are the blocks' upper-left corners. Each sits above a reachable
// surface, so Pip must choose to jump into it from underneath for its reward.
const layouts: Record<string, readonly Placement[]> = {
  "world.sunlit-meadow": [
    ["feather", 1480, 300],
    ["diamond", 1750, 300],
    ["star", 3480, 300],
    ["diamond", 4690, 300],
    ["feather", 6860, 300],
    ["diamond", 11110, 300],
    ["feather", 11210, 300],
  ],
  "world.firefly-hollow": [
    ["diamond", 3510, 300],
    ["feather", 3600, 300],
    ["feather", 5240, 300],
    ["diamond", 7200, 300],
    ["star", 9160, 300],
    ["diamond", 12310, 300],
    ["feather", 12410, 300],
  ],
  "world.cloudtop-crossing": [
    ["diamond", 1920, 300],
    ["feather", 3860, 300],
    ["star", 3960, 300],
    ["feather", 5580, 300],
    ["diamond", 7840, 300],
    ["diamond", 13500, 300],
    ["feather", 13610, 300],
  ],
  "world.windmill-garden": [
    ["feather", 1160, 300],
    ["diamond", 1960, 300],
    ["star", 2960, 300],
    ["feather", 5792, 300],
    ["diamond", 7740, 300],
    ["diamond", 11530, 340],
    // The Mill Keeper seals the arena on entry; keep this block inside the
    // boundary so a player can still earn the feather during the fight.
    ["feather", 11660, 340],
    ["diamond", 12700, 340],
    ["feather", 12860, 340],
    // Retry feather beside the Sail Run checkpoint, clear of the diamond
    // block to its left and the approach platform to its right.
    ["feather", 2016, 300],
  ],
  "world.reedwater-marsh": [
    ["feather", 200, 300],
    ["diamond", 1060, 300],
    ["star", 3900, 300],
    ["diamond", 7700, 300],
    // Recovery diamond on the guardian's bank, after the last checkpoint.
    ["diamond", 10620, 300],
  ],
  "world.glimmerdeep-caverns": [
    ["feather", 200, 300],
    ["diamond", 2060, 300],
    ["star", 3190, 300],
    ["diamond", 5460, 300],
    // Recovery Sunseed on the mole's floor, after the last checkpoint.
    ["diamond", 8210, 300],
  ],
  // Underwater worlds have no feather: flight does not work while swimming.
  "world.tidewell-depths": [
    ["diamond", 120, 360],
    // Recovery Sunseed on the seabed after the last checkpoint.
    ["diamond", 5480, 360],
  ],
  "world.nightglow-woods": [
    ["feather", 200, 300],
    ["diamond", 1800, 300],
    ["star", 3400, 300],
    ["diamond", 5350, 300],
    // Recovery Sunseed before Gloomwing's gate.
    ["diamond", 8500, 300],
  ],
  "world.snowdrift-peaks": [
    ["feather", 200, 300],
    ["diamond", 1800, 300],
    ["star", 4300, 300],
    ["magnet", 2150, 300],
    ["diamond", 5300, 300],
    // Recovery Sunseed before Grumble's gate.
    ["diamond", 8700, 300],
  ],
  "world.frostglass-lake": [
    ["feather", 200, 300],
    ["diamond", 2000, 300],
    ["star", 3200, 300],
    ["spring", 4250, 300],
    ["diamond", 5300, 300],
    // Recovery Sunseed before Shellshock's gate.
    ["diamond", 8500, 300],
  ],
  "world.ember-caldera": [
    ["feather", 200, 300],
    ["diamond", 1800, 300],
    ["star", 3200, 300],
    ["shield", 4250, 300],
    ["diamond", 5300, 300],
    // Recovery Sunseed before Cinder's gate.
    ["diamond", 8820, 300],
  ],
  "world.thunderhead-heights": [
    ["feather", 200, 300],
    ["diamond", 1800, 300],
    ["spring", 2150, 300],
    ["star", 4300, 300],
    ["diamond", 5300, 300],
    // Recovery Sunseed before Thunderhorn's gate.
    ["diamond", 8700, 300],
  ],
  grove: [["feather", 260, 300]],
  "secret.beehive": [
    ["feather", 150, 300],
    ["feather", 1972, 300],
  ],
  "secret.cloud-garden": [
    ["feather", 180, 300],
    ["feather", 1170, 300],
  ],
  "challenge.sunlit-meadow": [["diamond", 1080, 300]],
  "challenge.firefly-hollow": [
    ["diamond", 1060, 300],
    ["star", 1670, 300],
  ],
  "challenge.cloudtop-crossing": [
    ["diamond", 1370, 300],
    ["star", 2000, 300],
  ],
};

/** Replace ambient powers with intentionally earned head-knocker rewards. */
export function withRewardBlocks(level: Level): Level {
  const key = level.kind === "grove" ? "grove" : level.contentId;
  const rewards = key ? layouts[key] : undefined;
  if (!rewards) return level;
  return {
    ...level,
    diamonds: [],
    stars: [],
    featherFountains: [],
    platforms: [
      ...level.platforms,
      ...rewards.map(
        ([rewardPower, x, y], index): Platform => ({
          id: `reward.${key}.${index}`,
          kind: "brick",
          x,
          y,
          w: 48,
          h: 32,
          rewardPower,
        }),
      ),
    ],
  };
}
