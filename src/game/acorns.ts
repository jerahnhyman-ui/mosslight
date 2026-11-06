import type { Level } from "./levels";

/** Every main world hides this many acorns. */
export const ACORNS_PER_WORLD = 5;

/** Acorns sit on top of a world's highest, hardest-to-reach coins, spread
 * along the trail. Using real coin spots means every acorn is reachable by
 * the same route as the coin under it. */
export function acornSpots(level: Level): { x: number; y: number }[] {
  if (level.kind !== "world" || !level.contentId?.startsWith("world."))
    return [];
  const coins = level.coins;
  if (coins.length < ACORNS_PER_WORLD) return [];
  const spots: { x: number; y: number }[] = [];
  // One acorn per equal stretch of the trail: the highest coin in each.
  const span = Math.max(...coins.map((c) => c.x)) + 1;
  for (let i = 0; i < ACORNS_PER_WORLD; i++) {
    const from = (span * i) / ACORNS_PER_WORLD;
    const to = (span * (i + 1)) / ACORNS_PER_WORLD;
    const best = coins
      .filter((c) => c.x >= from && c.x < to)
      .sort((a, b) => a.y - b.y || a.x - b.x)[0];
    if (best) spots.push({ x: best.x, y: best.y });
  }
  // Fill any empty stretch with the next highest coins elsewhere.
  for (const coin of [...coins].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (spots.length >= ACORNS_PER_WORLD) break;
    if (!spots.some((s) => s.x === coin.x && s.y === coin.y))
      spots.push({ x: coin.x, y: coin.y });
  }
  return spots.sort((a, b) => a.x - b.x);
}
