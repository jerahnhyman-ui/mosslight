import { Game, type RunMode } from "./engine";
import type { Level } from "./levels";

/** The fourth world's major guardian has its own arena and retry checkpoint. */
export const thornKingLevel: Level = {
  id: 27,
  contentId: "boss.thorn-king",
  name: "The Thorn King's Grove",
  subtitle: "Face Briarheart, the Thorn King.",
  kind: "world",
  theme: "windmill",
  width: 2580,
  spawn: { x: 200, y: 432 },
  platforms: [
    { x: 0, y: 470, w: 2580, h: 190, kind: "ground" },
    {
      id: "thorn.retry.diamond",
      x: 110,
      y: 340,
      w: 48,
      h: 32,
      kind: "brick",
      rewardPower: "diamond",
    },
    {
      id: "thorn.retry.feather",
      x: 280,
      y: 340,
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
  checkpoints: [{ x: 200, y: 470 }],
  sections: [{ x: 0, name: "Thorn King’s Grove" }],
  tutorials: [
    {
      x: 200,
      text: "Briarheart waits ahead. Bump the blocks to prepare for the fight.",
    },
  ],
  boss: {
    kind: "heartwood",
    name: "Briarheart, the Thorn King",
    x: 1300,
    y: 470,
    minX: 980,
    maxX: 2000,
  },
  goal: { x: 2480, y: 470 },
};

/** The world remains unfinished until the standalone major boss is beaten. */
export function readyForThornKing(game: Game): boolean {
  return (
    game.level.contentId === "world.windmill-garden" &&
    game.state === "playing" &&
    game.player.x >= 11860
  );
}

/** Carry the world run into its own encounter without resetting the economy. */
export function createThornKingRun(mode: RunMode, source?: Game): Game {
  const arena = new Game(0, { level: thornKingLevel, mode });
  if (source) arena.transferPlayerFrom(source, { x: 200, feetY: 470 });
  arena.activeCheckpointIndex = 0;
  return arena;
}
