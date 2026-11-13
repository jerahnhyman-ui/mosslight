/** Creatures found on the optional routes and welcomed into the Home Grove. */
export const CREATURES = [
  { id: "frog", kind: "frog", contentId: "secret.moonpool", x: 2350, y: 260 },
  {
    id: "cloudbird",
    kind: "bird",
    contentId: "secret.cloud-garden",
    x: 2180,
    y: 10,
  },
  { id: "moth", kind: "moth", contentId: "secret.sky-meadow", x: 1980, y: 405 },
] as const;

/** Forest friends waiting on a ledge in six of the worlds. Reaching one
 * brings it home to the grove for good. */
export const FRIENDS = [
  {
    id: "tansy",
    kind: "mouse",
    name: "Tansy",
    contentId: "world.sunlit-meadow",
    x: 2220,
    y: 241,
    homeX: 300,
    hello: "Tansy the mouse was gathering seeds when the lights went out.",
  },
  {
    id: "brindle",
    kind: "hedgehog",
    name: "Brindle",
    contentId: "world.firefly-hollow",
    x: 2700,
    y: 231,
    homeX: 660,
    hello: "Brindle the hedgehog had curled up in the leaves to wait for you.",
  },
  {
    id: "sorrel",
    kind: "rabbit",
    name: "Sorrel",
    contentId: "world.windmill-garden",
    x: 7540,
    y: 246,
    homeX: 1060,
    hello: "Sorrel the rabbit hopped too far from home and lost the path.",
  },
  {
    id: "rill",
    kind: "otter",
    name: "Rill",
    contentId: "world.reedwater-marsh",
    x: 4405,
    y: 256,
    homeX: 1220,
    hello: "Rill the otter kept one last glow-pebble safe above the marsh.",
  },
  {
    id: "wisp",
    kind: "bat",
    name: "Wisp",
    contentId: "world.glimmerdeep-caverns",
    x: 5595,
    y: 226,
    homeX: 1580,
    hello: "Wisp the bat was too shy to leave the dark cave alone.",
  },
  {
    id: "button",
    kind: "snail",
    name: "Button",
    contentId: "world.nightglow-woods",
    x: 7870,
    y: 236,
    homeX: 1740,
    hello: "Button the snail had been climbing these steps all night.",
  },
] as const;
export type FriendKind = (typeof FRIENDS)[number]["kind"];
