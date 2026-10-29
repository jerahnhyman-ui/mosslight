import { expect, it } from "vitest";
import { Game } from "./engine";
import { flowerHoopsLevel } from "./expansion-levels";

const right = { left: false, right: true, jump: false, jumpPressed: false };
it("freezes the activity on the first timeout tick even with frame catch-up", () => {
  const g = new Game(0, { level: flowerHoopsLevel });
  g.countdown = 0;
  g.elapsed = 59.99;
  g.update(0.1, right);
  expect(g.minigame.finished).toBe(true);
  expect(g.minigame.complete).toBe(false);
  expect(g.elapsed).toBe(60);
});
it("freezes the activity on reaching the finish, without running more catch-up ticks", () => {
  const g = new Game(0, { level: flowerHoopsLevel });
  g.countdown = 0;
  g.player.x = flowerHoopsLevel.goal.x - g.player.w / 2 + 1;
  g.update(0.1, right);
  expect(g.minigame.complete).toBe(true);
  expect(g.elapsed).toBeCloseTo(1 / 120);
  expect(g.events.filter((event) => event === "minigame-result")).toHaveLength(
    1,
  );
});
