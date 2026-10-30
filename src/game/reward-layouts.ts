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
    ["feather", 11612, 340],
    ["diamond", 12700, 340],
    ["feather", 12860, 340],
    // Retry feather beside the Sail Run checkpoint, clear of the diamond
    // block to its left and the approach platform to its right.
    ["feather", 2016, 300],
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
