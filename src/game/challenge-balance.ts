import type { EnemyKind, EnemySpawn, Level } from "./levels";

// Extra patrols challenge the lower routes while the high routes offer a
// skillful alternative. Patrols remain on flat ground, away from retry flags
// and the quiet guardian approach. Later worlds use more charging beetles.
const patrol = (x: number, kind: EnemyKind): EnemySpawn => ({
  kind,
  x,
  y: 402,
  minX: x - 75,
  maxX: x + 75,
});

const extraPatrols: Record<string, EnemySpawn[]> = {
  "world.sunlit-meadow": [
    patrol(5800, "beetle"),
    patrol(8000, "hopper"),
    patrol(9400, "charger"),
  ],
  "world.firefly-hollow": [
    patrol(5100, "hopper"),
    patrol(8500, "charger"),
    patrol(11000, "hopper"),
  ],
  "world.cloudtop-crossing": [
    patrol(4300, "hopper"),
    patrol(6700, "charger"),
    patrol(9300, "charger"),
  ],
};

export function withTrailChallenges(level: Level): Level {
  const additions = level.contentId && extraPatrols[level.contentId];
  return additions
    ? { ...level, enemies: [...level.enemies, ...additions] }
    : level;
}
