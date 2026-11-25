// Sunny Side Diner — the menu, the pantry and the week's rhythm.
//
// Everything the rest of the game needs to know about food and days lives here:
// the ingredients a plate can hold, the recipes customers order, what the grill
// and the fryer do to raw food, and how each of the five days of service gets
// busier than the one before.

// The canvas is one fixed stage; render.js scales it to the window.
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 800;

// Ingredients, keyed by the short id the whole game uses. `kind` says how an
// item reaches the plate: stacked straight from its bin, cooked on the grill
// first, fried first, or poured as a drink beside the stack. `layer` is how
// many pixels of height one layer adds to a drawn burger stack.
export const INGREDIENTS = {
  bunBottom: { name: 'Bottom Bun', kind: 'stack', layer: 14, key: '1' },
  patty: { name: 'Patty', kind: 'grill', layer: 13, key: '2' },
  cheese: { name: 'Cheese', kind: 'stack', layer: 6, key: '3' },
  lettuce: { name: 'Lettuce', kind: 'stack', layer: 8, key: '4' },
  tomato: { name: 'Tomato', kind: 'stack', layer: 9, key: '5' },
  onion: { name: 'Onion', kind: 'stack', layer: 7, key: '6' },
  bunTop: { name: 'Top Bun', kind: 'stack', layer: 16, key: '7' },
  fries: { name: 'Fries', kind: 'fryer', layer: 0, key: '8' },
  drink: { name: 'Soda', kind: 'drink', layer: 0, key: '9' },
};

// The order the bins stand on the counter, left to right.
export const BIN_ORDER = [
  'bunBottom', 'patty', 'cheese', 'lettuce', 'tomato', 'onion', 'bunTop', 'fries', 'drink',
];

// Recipes customers can order. `stack` is the exact layer order a plate must
// match, bottom first. Fries and soda are extras on the tray, never layers.
export const RECIPES = {
  classic: { name: 'Classic Stack', stack: ['bunBottom', 'patty', 'bunTop'], price: 8 },
  cheese: { name: 'Cheese Stack', stack: ['bunBottom', 'patty', 'cheese', 'bunTop'], price: 10 },
  garden: { name: 'Garden Stack', stack: ['bunBottom', 'patty', 'lettuce', 'tomato', 'bunTop'], price: 12 },
  onion: { name: 'Onion Crunch', stack: ['bunBottom', 'patty', 'onion', 'cheese', 'bunTop'], price: 13 },
  deluxe: { name: 'Sunny Deluxe', stack: ['bunBottom', 'patty', 'cheese', 'lettuce', 'tomato', 'bunTop'], price: 15 },
  double: { name: 'Double Trouble', stack: ['bunBottom', 'patty', 'cheese', 'patty', 'bunTop'], price: 16 },
  tower: { name: 'The Tower', stack: ['bunBottom', 'patty', 'cheese', 'patty', 'cheese', 'lettuce', 'tomato', 'bunTop'], price: 20 },
};

export const FRIES_PRICE = 4;
export const DRINK_PRICE = 3;

// Cooking times in seconds. A patty is raw, then perfect, then burnt: the
// window between perfect and burnt is the grill cook's whole game.
export const GRILL_COOK_SECONDS = 4.2;
export const GRILL_BURN_SECONDS = 8.5;
export const FRYER_COOK_SECONDS = 3.4;
export const GRILL_SLOTS = 2;

// How long a customer waits before walking out, in seconds, before the day
// modifier is applied. Tips shrink with the patience that is left.
export const PATIENCE_SECONDS = 62;

// Five days of service. Each day: which recipes are on the menu, how often a
// new customer arrives, how fast patience drains, the coin goal for the day,
// and the chance an order adds fries or a soda.
export const DAYS = [
  {
    label: 'Day 1 · First Service',
    news: 'The Classic and Cheese Stacks are on. Grill patties until golden — do not let them burn.',
    recipes: ['classic', 'cheese'],
    spawnEvery: [7.5, 11],
    patienceScale: 1.0,
    goal: 60,
    friesChance: 0.25,
    drinkChance: 0,
    length: 110,
  },
  {
    label: 'Day 2 · Garden Day',
    news: 'New recipe: the Garden Stack. Soda joins the menu — pour it straight onto the tray.',
    recipes: ['classic', 'cheese', 'garden'],
    spawnEvery: [6.5, 10],
    patienceScale: 0.94,
    goal: 95,
    friesChance: 0.3,
    drinkChance: 0.3,
    length: 115,
  },
  {
    label: 'Day 3 · Crunch Time',
    news: 'New recipe: the Onion Crunch. The lunch crowd has found you — keep the grill ahead of the rush.',
    recipes: ['classic', 'cheese', 'garden', 'onion'],
    spawnEvery: [5.5, 9],
    patienceScale: 0.88,
    goal: 135,
    friesChance: 0.35,
    drinkChance: 0.35,
    length: 120,
  },
  {
    label: 'Day 4 · Double Shift',
    news: 'New recipes: the Sunny Deluxe and the Double Trouble. Two patties means the grill never rests.',
    recipes: ['classic', 'cheese', 'garden', 'onion', 'deluxe', 'double'],
    spawnEvery: [4.8, 8],
    patienceScale: 0.82,
    goal: 185,
    friesChance: 0.4,
    drinkChance: 0.4,
    length: 125,
  },
  {
    label: 'Day 5 · The Tower',
    news: 'New recipe: The Tower, eight layers tall. Everything is on, everyone is hungry, nobody is patient.',
    recipes: ['classic', 'cheese', 'garden', 'onion', 'deluxe', 'double', 'tower'],
    spawnEvery: [4.2, 7],
    patienceScale: 0.76,
    goal: 250,
    friesChance: 0.45,
    drinkChance: 0.45,
    length: 130,
  },
];

export const SEATS = 4; // stools at the counter
export const STARTING_HEARTS = 5; // walk-outs the diner can survive in a day
export const COMBO_STEP = 0.12; // each clean serve adds this to the pay multiplier
export const COMBO_CAP = 2.0; // the multiplier never passes double
