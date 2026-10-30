import { describe, expect, it } from "vitest";
import { Game, MAX_LIVES, type GameInput } from "./engine";
import type { Level, BossKind } from "./levels";

const idle: GameInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};
const tick = (game: Game, seconds: number, input = idle) => {
  for (let i = 0; i < seconds * 120; i++) game.update(1 / 120, input);
};
function arena(kind: BossKind = "stag"): Level {
  return {
    id: 10,
    name: "Boss test clearing",
    subtitle: "",
    width: 1500,
    theme: "meadow",
    spawn: { x: 90, y: 392 },
    platforms: [{ x: 0, y: 430, w: 1500, h: 200, kind: "ground" }],
    coins: [],
    stars: [],
    diamonds: [{ x: 140, y: 400 }],
    enemies: [],
    fireflies: [],
    checkpoints: [{ x: 160, y: 430 }],
    sections: [{ x: 0, name: "Clearing" }],
    boss: {
      kind,
      name: "Garden guardian",
      x: 650,
      y: 430,
      minX: 200,
      maxX: 1000,
    },
    goal: { x: 1300, y: 430 },
  };
}

// Uses ordinary movement and jump input, with no edits to physics or boss state.
function fight(game: Game) {
  const hits: number[] = [];
  let previousJump = false;
  for (let frame = 0; frame < 120 * 90; frame++) {
    const boss = game.boss!;
    if (boss.state === "defeated" || game.state === "lost") break;
    const p = game.player;
    let target = boss.x + boss.w / 2 - p.w / 2;
    if (boss.kind !== "spider" && boss.state === "attack")
      target += boss.facing * 120;
    const stoppingDistance = (p.vx * Math.abs(p.vx)) / (2 * 1850);
    const dx = target - p.x - stoppingDistance;
    const jumping = p.grounded || (!p.grounded && p.vy < 0);
    const input: GameInput = {
      left: dx < -2,
      right: dx > 2,
      jump: jumping,
      jumpPressed: jumping && !previousJump,
    };
    previousJump = jumping;
    game.update(1 / 120, input);
    if (game.events.includes("boss-hit")) hits.push(boss.health);
  }
  return hits;
}

describe("garden guardian fights", () => {
  for (const kind of ["stag", "spider", "moth"] as const) {
    it(`${kind} is beatable through normal movement and jumps`, () => {
      const game = new Game(0, { level: arena(kind) });
      const hits = fight(game);
      expect(game.boss!.state).toBe("defeated");
      expect(game.deaths).toBe(0);
      expect(hits).toEqual([3, 2, 1, 0]);
      expect(game.boss!.phase).toBe(3);
      expect(game.hazards).toEqual([]);
    });
  }

  for (const kind of ["stag", "spider", "moth"] as const) {
    it(`${kind} can also be defeated while small by reading its attack`, () => {
      const level = arena(kind);
      level.diamonds = [];
      const game = new Game(0, { level });
      let previousJump = false;
      for (let frame = 0; frame < 120 * 90; frame++) {
        const boss = game.boss!;
        if (game.state !== "playing" || boss.state === "defeated") break;
        const p = game.player;
        let target = boss.x + (boss.w - p.w) / 2;
        let jump = p.grounded;
        if (kind === "moth") {
          if (boss.state === "warning" || boss.state === "attack")
            target = boss.attackTargetX - 140;
          jump = p.grounded && boss.state === "recover";
        } else if (kind === "stag" && boss.state === "attack")
          target += boss.facing * 120;
        const delta = target - p.x - (p.vx * Math.abs(p.vx)) / (2 * 1850);
        const heldJump = jump || (!p.grounded && p.vy < 0);
        game.update(1 / 120, {
          left: delta < -2,
          right: delta > 2,
          jump: heldJump,
          jumpPressed: heldJump && !previousJump,
        });
        previousJump = heldJump;
      }
      expect(game.boss!.state).toBe("defeated");
      expect(game.player.form).toBe("small");
      expect(game.deaths).toBe(0);
      for (let frame = 0; frame < 120 * 10 && game.state === "playing"; frame++)
        game.update(1 / 120, { ...idle, right: true });
      expect(game.state).toBe("won");
    });
  }

  it("cannot finish by running or jumping past a live boss", () => {
    const game = new Game(0, { level: arena() });
    game.player.x = 1350;
    game.player.y = 392;
    game.update(1 / 120, idle);
    expect(game.state).toBe("playing");
    expect(game.player.x + game.player.w).toBeLessThan(game.level.goal.x);
  });

  it("telegraphs the attack before emitting damaging projectiles", () => {
    const game = new Game(0, { level: arena("spider") });
    game.player.x = 220;
    game.update(1 / 120, idle);
    expect(game.boss!.state).toBe("warning");
    expect(game.events).toContain("boss-start");
    tick(game, 0.9);
    expect(game.boss!.state).toBe("warning");
    expect(game.hazards).toHaveLength(0);
    tick(game, 0.5);
    expect(game.boss!.state).toBe("attack");
    expect(game.hazards.length).toBeGreaterThan(0);
  });

  it("a lost life restores the entire fight and clears hazards at the safe checkpoint", () => {
    const game = new Game(0, { level: arena("moth") });
    game.activeCheckpointIndex = 0;
    game.boss!.health = 1;
    game.boss!.phase = 3;
    game.boss!.state = "attack";
    game.hazards.push({
      kind: "gust",
      x: 300,
      y: 400,
      w: 20,
      h: 20,
      vx: 100,
      vy: 0,
      remaining: 2,
    });
    game.player.y = 670;
    game.update(1 / 120, idle);
    expect(game.lives).toBe(2);
    expect(game.player.x).toBe(160);
    expect(game.boss!.health).toBe(4);
    expect(game.boss!.phase).toBe(1);
    expect(game.boss!.state).toBe("dormant");
    expect(game.hazards).toEqual([]);
  });

  it("a star protects against boss contact but cannot remove all phases in one frame", () => {
    const game = new Game(0, { level: arena() });
    game.player.x = game.boss!.x;
    game.player.y = 392;
    game.starPowerRemaining = 10;
    game.update(0.1, idle);
    expect(game.boss!.health).toBe(3);
    expect(game.boss!.phase).toBe(1);
    expect(game.lives).toBe(3);
    expect(game.player.form).toBe("small");
  });
});

describe("light, relaxed play and the grove", () => {
  it("awakens nearby plants once, makes them standable, and remembers them through a death", () => {
    const level = arena();
    delete level.boss;
    level.platforms.push({
      x: 200,
      y: 330,
      w: 120,
      h: 20,
      kind: "flower",
      wakeRadius: 90,
    });
    const game = new Game(0, { level });
    expect(game.platforms[1].awakened).toBe(false);
    game.update(1 / 120, idle);
    expect(game.platforms[1].awakened).toBe(false);
    game.player.x = 210;
    game.player.y = 280;
    game.player.vy = 100;
    game.update(1 / 120, idle);
    expect(game.events).toContain("awaken");
    tick(game, 0.3);
    expect(game.player.grounded).toBe(true);
    expect(game.player.y + game.player.h).toBe(330);
    expect(game.events).not.toContain("awaken");
    game.player.y = 670;
    game.update(1 / 120, idle);
    expect(game.platforms[1].awakened).toBe(true);
    game.restart();
    expect(game.platforms[1].awakened).toBe(false);
  });

  it("relaxed mode permits unlimited checkpoint retries", () => {
    const game = new Game(0, { level: arena(), mode: "relaxed" });
    game.activeCheckpointIndex = 0;
    for (let i = 0; i < 8; i++) {
      game.player.y = 670;
      game.update(1 / 120, idle);
      expect(game.state).toBe("playing");
      expect(game.player.x).toBe(160);
      expect(game.lives).toBe(MAX_LIVES);
    }
    expect(game.deaths).toBe(8);
  });

  it.each(["stag", "spider", "moth"] as const)(
    "lets relaxed players retry the harder %s without losing a life",
    (kind) => {
      const game = new Game(0, { level: arena(kind), mode: "relaxed" });
      game.activeCheckpointIndex = 0;
      game.boss!.health = 1;
      game.boss!.phase = 3;
      game.boss!.state = "attack";
      game.player.y = 670;
      game.update(1 / 120, idle);
      expect(game.lives).toBe(MAX_LIVES);
      expect(game.player.x).toBe(160);
      expect(game.boss).toMatchObject({
        health: 4,
        phase: 1,
        state: "dormant",
      });
      expect(game.hazards).toEqual([]);
    },
  );

  it("timed mode retains the three-life rules", () => {
    const game = new Game(0, { level: arena(), mode: "timed" });
    for (let i = 0; i < 3; i++) {
      game.player.y = 670;
      game.update(1 / 120, idle);
    }
    expect(game.state).toBe("lost");
    expect(game.lives).toBe(0);
  });

  it("the home grove never costs a life and its exit does not finish a world", () => {
    const level = arena();
    level.kind = "grove";
    delete level.boss;
    const game = new Game(0, { level });
    game.player.x = 1310;
    game.update(1 / 120, idle);
    expect(game.state).toBe("playing");
    game.player.y = 670;
    game.update(1 / 120, idle);
    expect(game.lives).toBe(MAX_LIVES);
    expect(game.deaths).toBe(0);
    expect(game.events).toContain("grove-return");
  });
});

describe("bugs interact with the garden", () => {
  it("a charging beetle opens a marked barrier and awards its cache only once", () => {
    const level = arena();
    delete level.boss;
    level.platforms.push({
      x: 470,
      y: 390,
      w: 32,
      h: 40,
      kind: "brick",
      enemyBreakable: true,
      rewardCoins: 5,
    });
    level.enemies = [{ kind: "charger", x: 350, y: 402, minX: 300, maxX: 700 }];
    const game = new Game(0, { level });
    game.player.x = 600;
    tick(game, 1.4);
    expect(game.platforms[1].broken).toBe(true);
    expect(game.collectedCoins).toBe(5);
    game.player.y = 670;
    game.update(1 / 120, idle);
    expect(game.platforms[1].broken).toBe(true);
    expect(game.collectedCoins).toBe(5);
  });

  it("a hopper bounces off a mushroom instead of falling through it", () => {
    const level = arena();
    delete level.boss;
    level.platforms.push({ x: 250, y: 400, w: 250, h: 20, kind: "mushroom" });
    level.enemies = [{ kind: "hopper", x: 300, y: 402, minX: 250, maxX: 450 }];
    const game = new Game(0, { level });
    let bounced = false;
    for (let frame = 0; frame < 240; frame++) {
      game.update(1 / 120, idle);
      if (game.events.includes("hopper-bounce")) {
        bounced = true;
        expect(game.enemies[0].vy).toBeLessThan(-500);
        expect(game.enemies[0].y + game.enemies[0].h).toBe(400);
        break;
      }
    }
    expect(bounced).toBe(true);
  });
});
