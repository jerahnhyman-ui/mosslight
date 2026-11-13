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

/** Forest friends, each waiting at the far end of its own hidden level
 * (see hideaways.ts). Reaching one brings it home to the grove for good. */
export const FRIENDS = [
  {
    id: "tansy",
    perk: "Nearby coins drift to you.",
    kind: "mouse",
    name: "Tansy",
    contentId: "secret.hideaway-tansy",
    x: 2930,
    y: 406,
    homeX: 300,
    hello: "Tansy the mouse was gathering seeds when the lights went out.",
  },
  {
    id: "brindle",
    perk: "Stay safe a little longer after a bump.",
    kind: "hedgehog",
    name: "Brindle",
    contentId: "secret.hideaway-brindle",
    x: 3330,
    y: 406,
    homeX: 660,
    hello: "Brindle the hedgehog had curled up in the leaves to wait for you.",
  },
  {
    id: "sorrel",
    perk: "Jump a little higher.",
    kind: "rabbit",
    name: "Sorrel",
    contentId: "secret.hideaway-sorrel",
    x: 3230,
    y: 406,
    homeX: 1060,
    hello: "Sorrel the rabbit hopped too far from home and lost the path.",
  },
  {
    id: "rill",
    perk: "Swim with stronger kicks.",
    kind: "otter",
    name: "Rill",
    contentId: "secret.hideaway-rill",
    x: 3030,
    y: 406,
    homeX: 1220,
    hello: "Rill the otter kept one last glow-pebble safe above the marsh.",
  },
  {
    id: "wisp",
    perk: "Star power lasts longer.",
    kind: "bat",
    name: "Wisp",
    contentId: "secret.hideaway-wisp",
    x: 3010,
    y: 406,
    homeX: 1580,
    hello: "Wisp the bat was too shy to leave the dark cave alone.",
  },
  {
    id: "button",
    perk: "Crumbling platforms hold a little longer.",
    kind: "snail",
    name: "Button",
    contentId: "secret.hideaway-button",
    x: 3630,
    y: 406,
    homeX: 1740,
    hello: "Button the snail had been climbing these steps all night.",
  },
] as const;
export type FriendKind = (typeof FRIENDS)[number]["kind"];
