import type { Level } from "./levels";

/** A quiet swimming route: start the bubbles, then open the sluice. */
export const moonpoolLevel: Level = {
  id: 22,
  contentId: "secret.moonpool",
  name: "Moonpool Grotto",
  subtitle: "Swim through a garden beneath the water.",
  kind: "secret",
  theme: "grotto",
  width: 2880,
  spawn: { x: 80, y: 452 },
  platforms: [
    { x: 0, y: 490, w: 2880, h: 170, kind: "ground" },
    // Rising rock walls require Pip to swim above them. The surrounding
    // shelves and bubble streams give the player a clear route around each.
    { id: "moonpool.rock.1", x: 1050, y: 350, w: 58, h: 140, kind: "ground" },
    { id: "moonpool.rock.2", x: 1850, y: 320, w: 58, h: 170, kind: "ground" },
    { x: 440, y: 390, w: 180, h: 20, kind: "platform" },
    { x: 800, y: 315, w: 180, h: 20, kind: "platform" },
    { x: 1200, y: 370, w: 180, h: 20, kind: "platform" },
    { x: 1650, y: 280, w: 190, h: 20, kind: "platform" },
    { x: 2070, y: 370, w: 180, h: 20, kind: "platform" },
    { x: 2370, y: 300, w: 170, h: 20, kind: "platform" },
  ],
  waterZones: [
    { x: 220, y: 185, w: 2470, h: 305 },
    { x: 760, y: 200, w: 100, h: 290, currentY: -180 },
    { x: 1610, y: 190, w: 100, h: 300, currentY: -180 },
  ],
  coins: [
    { x: 350, y: 340 },
    { x: 385, y: 325 },
    { x: 420, y: 310 },
    { x: 870, y: 275 },
    { x: 905, y: 275 },
    { x: 940, y: 275 },
    { x: 1690, y: 240 },
    { x: 1725, y: 240 },
    { x: 1760, y: 240 },
    { x: 2400, y: 260 },
    { x: 2435, y: 260 },
    { x: 2470, y: 260 },
  ],
  stars: [],
  diamonds: [],
  fireflies: [],
  enemies: [],
  checkpoints: [
    { x: 80, y: 490 },
    { x: 1480, y: 490 },
  ],
  mechanisms: [
    { id: "moonpool.valve", kind: "water", x: 530, y: 390 },
    { id: "moonpool.sluice", kind: "sluice", x: 2160, y: 370 },
  ],
  gates: [
    {
      id: "moonpool.gate",
      condition: "sluice",
      x: 2600,
      y: -2000,
      w: 24,
      h: 2660,
    },
  ],
  portals: [
    { id: "moonpool.return.entry", x: 100, y: 490, w: 80, target: "return" },
    {
      id: "moonpool.return.exit",
      x: 2780,
      y: 490,
      w: 80,
      target: "return",
      requires: "completion",
    },
  ],
  sections: [
    { x: 0, name: "Moonpool Shore" },
    { x: 960, name: "Bubble Garden" },
    { x: 1920, name: "Shellflower Hollow" },
  ],
  tutorials: [
    { x: 230, text: "Hold Jump to swim up. Release to sink gently." },
    { x: 390, text: "Land on the valve to start the bubbles." },
    { x: 760, text: "Bubble currents carry you upward." },
    { x: 950, text: "Swim above the rocks to find a way through." },
    {
      x: 1920,
      text: "With bubbles flowing, land on the sluice latch to open the gate.",
    },
  ],
  goal: { x: 2740, y: 490 },
};
