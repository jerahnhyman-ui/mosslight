import type { Level } from "./levels";

/** A standalone arena for replaying a world's guardian from the journal.
 * It keeps the guardian's own arena width, with a retry checkpoint and a
 * Sunseed and feather block on the safe ground before the fight. */
export function guardianArena(world: Level): Level | null {
  const boss = world.boss;
  if (!boss) return null;
  const start = 500;
  const shift = start - boss.minX;
  const span = boss.maxX - boss.minX;
  const width = start + span + 600;
  return {
    id: 30 + world.id,
    contentId: `boss.replay.${world.contentId ?? world.id}`,
    name: `${boss.name.split(",")[0]}'s Arena`,
    subtitle: `A rematch with ${boss.name}.`,
    kind: "world",
    theme: world.theme,
    width,
    spawn: { x: 200, y: 392 },
    platforms: [
      { x: 0, y: 430, w: width, h: 230, kind: "ground" },
      {
        id: "replay.retry.diamond",
        x: 110,
        y: 300,
        w: 48,
        h: 32,
        kind: "brick",
        rewardPower: "diamond",
      },
      {
        id: "replay.retry.feather",
        x: 300,
        y: 300,
        w: 48,
        h: 32,
        kind: "brick",
        rewardPower: "feather",
      },
    ],
    coins: [],
    stars: [],
    diamonds: [],
    fireflies: [],
    enemies: [],
    checkpoints: [{ x: 200, y: 430 }],
    sections: [{ x: 0, name: `${boss.name.split(",")[0]}'s Arena` }],
    boss: {
      ...boss,
      x: boss.x + shift,
      y: 430,
      minX: boss.minX + shift,
      maxX: boss.maxX + shift,
    },
    goal: { x: start + span + 300, y: 430 },
  };
}
