import { STORM_FINALE_X, thunderhornLevel } from "./storm-level";
import { grumbleLevel, SNOW_FINALE_X } from "./snow-level";
import { shellshockLevel, ICE_FINALE_X } from "./ice-level";
import { cinderLevel, VOLCANO_FINALE_X } from "./volcano-level";
import { Game, type RunMode } from "./engine";
import type { Level } from "./levels";
import { gloomwingLevel, NIGHTGLOW_FINALE_X } from "./nightglow-level";

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

/** Worlds whose trail hands over to a separate major-boss arena: every
 * fourth main world. Reaching `triggerX` carries the run into the arena. */
export const FINALES: { world: string; triggerX: number; arena: Level }[] = [
  { world: "world.windmill-garden", triggerX: 11860, arena: thornKingLevel },
];
export function registerFinale(world: string, triggerX: number, arena: Level) {
  if (!FINALES.some((f) => f.world === world))
    FINALES.push({ world, triggerX, arena });
}
/** The arena this run should move into now, if any. */
export function finaleFor(game: Game): Level | null {
  const finale = FINALES.find((f) => f.world === game.level.contentId);
  return finale && game.state === "playing" && game.player.x >= finale.triggerX
    ? finale.arena
    : null;
}
/** Carry a world run into its major-boss arena without resetting the economy. */
export function createFinaleRun(
  arena: Level,
  mode: RunMode,
  source?: Game,
): Game {
  const game = new Game(0, { level: arena, mode });
  const floor = arena.checkpoints[0]!;
  if (source) game.transferPlayerFrom(source, { x: floor.x, feetY: floor.y });
  game.activeCheckpointIndex = 0;
  return game;
}

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

registerFinale("world.nightglow-woods", NIGHTGLOW_FINALE_X, gloomwingLevel);
registerFinale("world.snowdrift-peaks", SNOW_FINALE_X, grumbleLevel);
registerFinale("world.frostglass-lake", ICE_FINALE_X, shellshockLevel);
registerFinale("world.ember-caldera", VOLCANO_FINALE_X, cinderLevel);
registerFinale("world.thunderhead-heights", STORM_FINALE_X, thunderhornLevel);
