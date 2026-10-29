import { describe, expect, it } from "vitest";
import { Game, STAR_POWER_DURATION, type GameInput } from "./engine";
import { levels, type Level } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
function tick(game: Game, input: GameInput = idle, frames = 1) {
  for (let i = 0; i < frames; i++) game.update(1 / 120, input);
}
function rewardGame(rewardPower: "diamond" | "feather" | "star") {
  const level: Level = {
    ...levels[0]!,
    width: 1200,
    spawn: { x: 110, y: 392 },
    platforms: [
      { x: 0, y: 430, w: 1100, h: 230, kind: "ground" },
      {
        id: "test.reward",
        x: 100,
        y: 320,
        w: 64,
        h: 25,
        kind: "brick",
        rewardPower,
      },
    ],
    featherFountains: [],
    diamonds: [],
    stars: [],
    coins: [],
    fireflies: [],
    enemies: [],
    checkpoints: [],
    boss: undefined,
    mechanisms: [],
    gates: [],
    portals: [],
    goal: { x: 1100, y: 430 },
  };
  const game = new Game(0, { level });
  tick(game, idle, 4);
  return game;
}
function bump(game: Game) {
  tick(game, idle, 4);
  tick(game, { ...idle, jump: true, jumpPressed: true });
  tick(game, { ...idle, jump: true }, 70);
  tick(game, idle, 50);
}
function block(game: Game) {
  return game.platforms.find((tile) => tile.id === "test.reward")!;
}

describe("head-knocker power blocks", () => {
  it("releases a diamond without consuming growth against its solid ceiling", () => {
    const game = rewardGame("diamond");
    bump(game);
    expect(block(game).rewardUsed).toBe(true);
    expect(block(game).broken).toBe(false);
    expect(game.player.form).toBe("big");
    expect(game.diamonds).toHaveLength(1);
    expect(game.diamonds[0]!.collected).toBe(true);
    bump(game);
    expect(game.diamonds).toHaveLength(1);
  });

  it("awards feather by head hit and does not waste a spare while already equipped", () => {
    const game = rewardGame("feather");
    bump(game);
    expect(game.hasWindFeather).toBe(true);
    expect(block(game).rewardUsed).toBe(true);
    block(game).rewardUsed = false;
    bump(game);
    expect(block(game).rewardUsed).toBe(false);
  });

  it("keeps a diamond released by big Pip available after shrinking", () => {
    const game = rewardGame("diamond");
    // Start big, then hit the block through normal jump input.
    Object.assign(game.player, { form: "big", w: 40, h: 56, y: 374 });
    bump(game);
    expect(game.player.form).toBe("big");
    expect(game.diamonds).toHaveLength(1);
    expect(game.diamonds[0]!.collected).toBe(false);
    // Simulate a shrink, then jump to recover the still-present diamond.
    Object.assign(game.player, { form: "small", w: 28, h: 38, y: 392 });
    bump(game);
    expect(game.player.form).toBe("big");
    expect(game.diamonds[0]!.collected).toBe(true);
  });

  it("awards one star per run and keeps it consumed after a retry", () => {
    const game = rewardGame("star");
    bump(game);
    expect(game.collectedStars).toBe(1);
    expect(game.starPowerRemaining).toBeGreaterThan(STAR_POWER_DURATION - 2);
    game.player.y = 700;
    tick(game);
    expect(game.deaths).toBe(1);
    expect(block(game).rewardUsed).toBe(true);
    tick(game, idle, 5);
    bump(game);
    expect(game.collectedStars).toBe(1);
  });

  it("reopens the grove's feather block after falling back to the entrance", () => {
    const fixture = rewardGame("feather");
    const game = new Game(0, { level: { ...fixture.level, kind: "grove" } });
    tick(game, idle, 4);
    bump(game);
    expect(game.hasWindFeather).toBe(true);
    game.player.y = 700;
    tick(game);
    expect(game.hasWindFeather).toBe(false);
    expect(block(game).rewardUsed).toBe(false);
    tick(game, idle, 5);
    bump(game);
    expect(game.hasWindFeather).toBe(true);
  });

  it.each(["diamond", "feather"] as const)(
    "reopens %s blocks on retry without duplicating released diamonds",
    (power) => {
      const game = rewardGame(power);
      bump(game);
      expect(block(game).rewardUsed).toBe(true);
      game.player.y = 700;
      tick(game);
      expect(game.deaths).toBe(1);
      expect(block(game).rewardUsed).toBe(false);
      expect(game.diamonds).toHaveLength(0);
      tick(game, idle, 5);
      bump(game);
      expect(block(game).rewardUsed).toBe(true);
      if (power === "diamond") {
        expect(game.diamonds).toHaveLength(1);
        expect(game.player.form).toBe("big");
      } else expect(game.hasWindFeather).toBe(true);
    },
  );
});
