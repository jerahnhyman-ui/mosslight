import { describe, expect, it } from "vitest";
import {
  FALLING_GOAL,
  FALLING_HEIGHT,
  FALLING_WIDTH,
  FallingGarden,
  GardenMatch,
} from "./core";

describe("Garden Match", () => {
  it("shows pairs, holds mismatches, and wins when all six pairs are found", () => {
    const game = new GardenMatch(() => 0.25);
    const first = 0;
    const mismatch = game.cards.findIndex(
      (value) => value !== game.cards[first],
    );
    expect(game.reveal(first)).toBe("first");
    expect(game.reveal(first)).toBe("ignored");
    expect(game.reveal(mismatch)).toBe("mismatch");
    expect(game.reveal(3)).toBe("ignored");
    expect(game.open).toEqual([first, mismatch]);
    game.hideMismatch();
    expect(game.open).toEqual([]);
    const remaining = new Set(game.cards);
    for (const value of remaining) {
      const indexes = game.cards
        .map((v, i) => (v === value ? i : -1))
        .filter((i) => i >= 0);
      expect(indexes).toHaveLength(2);
      expect(game.reveal(indexes[0]!)).toBe("first");
      expect(game.reveal(indexes[1]!)).toBe("match");
    }
    expect(game.complete).toBe(true);
    expect(game.moves).toBe(7);
    expect(game.reveal(0)).toBe("ignored");
  });
});

describe("Seed Stack", () => {
  it("limits movement and rotation to the board and settles pieces on drop", () => {
    const game = new FallingGarden(() => 0.3);
    for (let i = 0; i < 15; i++) game.move(-1);
    expect(game.cells().every(([x]) => x >= 0 && x < FALLING_WIDTH)).toBe(true);
    game.rotate();
    expect(game.cells().every(([x]) => x >= 0 && x < FALLING_WIDTH)).toBe(true);
    game.drop();
    expect(game.grid.flat().filter(Boolean)).toHaveLength(4);
    expect(game.score).toBeGreaterThan(0);
    expect(game.state).toBe("playing");
  });

  it("clears a completed row, scores it, and wins at the goal", () => {
    const game = new FallingGarden(() => 0.2);
    game.lines = FALLING_GOAL - 1;
    game.grid[FALLING_HEIGHT - 1] = Array(FALLING_WIDTH).fill("flower");
    game.grid[FALLING_HEIGHT - 1]![4] = null;
    game.grid[FALLING_HEIGHT - 1]![5] = null;
    game.piece = { name: "sun", x: 4, y: FALLING_HEIGHT - 2, rotation: 0 };
    expect(game.step()).toBe(false);
    expect(game.lines).toBe(FALLING_GOAL);
    expect(game.state).toBe("won");
    expect(game.score).toBe(100);
    expect(game.grid).toHaveLength(FALLING_HEIGHT);
    expect(game.grid[FALLING_HEIGHT - 1]!.filter(Boolean)).toHaveLength(2);
  });

  it("ends when a new piece cannot enter an obstructed board", () => {
    const game = new FallingGarden(() => 0.2);
    game.grid[1]![4] = "flower";
    game.piece = { name: "sun", x: 0, y: FALLING_HEIGHT - 2, rotation: 0 };
    game.step();
    expect(game.state).toBe("lost");
    expect(game.move(1)).toBe(false);
  });
});
