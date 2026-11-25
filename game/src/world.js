// Sunny Side Diner — the state of one day of service and every rule that
// changes it: customers arriving with orders, patties on the grill, fries in
// the fryer, the plate being stacked, serving, tips, combos and walk-outs.
//
// This module never touches the page. render.js draws what is here, input.js
// calls the press* and collect* functions, and main.js advances tick(). That
// split is what lets the same rules be exercised headlessly in Node.

import {
  COMBO_CAP,
  COMBO_STEP,
  DAYS,
  DRINK_PRICE,
  FRIES_PRICE,
  FRYER_COOK_SECONDS,
  GRILL_BURN_SECONDS,
  GRILL_COOK_SECONDS,
  GRILL_SLOTS,
  INGREDIENTS,
  PATIENCE_SECONDS,
  RECIPES,
  SEATS,
  STARTING_HEARTS,
} from './config.js';

const SKIN_TONES = ['#f6c89f', '#e8a87c', '#c97b4a', '#8d5524', '#ffd9b3'];
const SHIRT_COLORS = ['#e4572e', '#2e86ab', '#5da85f', '#f2b134', '#8e6cc8', '#d1607a', '#3aa6a0'];
const HAIR_COLORS = ['#2b2118', '#5b3a1e', '#a9713a', '#d9d9d9', '#b3402a', '#3a3a3a'];

export function emptyPlate() {
  return { stack: [], fries: false, drink: false };
}

export function createWorld(dayIndex, rng) {
  const day = DAYS[dayIndex];
  const world = {
    dayIndex,
    day,
    rng,
    timeLeft: day.length,
    coins: 0,
    served: 0,
    lost: 0,
    hearts: STARTING_HEARTS,
    combo: 0,
    bestCombo: 0,
    customers: [],
    plate: emptyPlate(),
    grill: Array.from({ length: GRILL_SLOTS }, () => null),
    fryer: null,
    spawnIn: 0.8,
    floaters: [],
    events: [],
    over: false,
    won: false,
  };
  spawnCustomer(world);
  return world;
}

// One order: a recipe off today's menu, plus fries and a soda by chance.
export function makeOrder(world) {
  const recipeId = world.rng.pick(world.day.recipes);
  return {
    recipeId,
    fries: world.rng.chance(world.day.friesChance),
    drink: world.rng.chance(world.day.drinkChance),
  };
}

export function spawnCustomer(world) {
  const taken = new Set(world.customers.map((c) => c.seat));
  const free = [];
  for (let seat = 0; seat < SEATS; seat += 1) if (!taken.has(seat)) free.push(seat);
  if (free.length === 0) return null;
  const patienceMax = PATIENCE_SECONDS * world.day.patienceScale * world.rng.range(0.9, 1.1);
  const customer = {
    seat: world.rng.pick(free),
    order: makeOrder(world),
    patience: patienceMax,
    patienceMax,
    look: {
      skin: world.rng.pick(SKIN_TONES),
      shirt: world.rng.pick(SHIRT_COLORS),
      hair: world.rng.pick(HAIR_COLORS),
      hairStyle: world.rng.int(0, 2),
    },
    bob: world.rng.range(0, Math.PI * 2),
  };
  world.customers.push(customer);
  world.events.push('arrive');
  return customer;
}

// What a finished tray for this customer must look like, and what it pays
// before tip and combo.
export function orderPrice(order) {
  return RECIPES[order.recipeId].price + (order.fries ? FRIES_PRICE : 0) + (order.drink ? DRINK_PRICE : 0);
}

export function plateMatches(world, customer) {
  const wanted = RECIPES[customer.order.recipeId].stack;
  const stack = world.plate.stack;
  if (stack.length !== wanted.length) return false;
  for (let i = 0; i < wanted.length; i += 1) if (stack[i] !== wanted[i]) return false;
  return world.plate.fries === customer.order.fries && world.plate.drink === customer.order.drink;
}

// Pressing an ingredient bin. Stack items land on the plate at once; a patty
// goes on the grill and fries into the fryer instead, and a soda pours onto
// the tray. Anything impossible answers with an error event and no change.
export function pressIngredient(world, id) {
  const ingredient = INGREDIENTS[id];
  if (!ingredient || world.over) return;
  if (ingredient.kind === 'stack') {
    if (world.plate.stack.length >= 10) {
      world.events.push('error');
      return;
    }
    world.plate.stack.push(id);
    world.events.push('place');
  } else if (ingredient.kind === 'grill') {
    const slot = world.grill.indexOf(null);
    if (slot === -1) {
      world.events.push('error');
      return;
    }
    world.grill[slot] = { t: 0, dinged: false };
    world.events.push('sizzle');
  } else if (ingredient.kind === 'fryer') {
    if (world.fryer) {
      world.events.push('error');
      return;
    }
    world.fryer = { t: 0, dinged: false };
    world.events.push('sizzle');
  } else if (ingredient.kind === 'drink') {
    if (world.plate.drink) {
      world.events.push('error');
      return;
    }
    world.plate.drink = true;
    world.events.push('pour');
  }
}

export function pattyState(slot) {
  if (!slot) return 'empty';
  if (slot.t < GRILL_COOK_SECONDS) return 'raw';
  if (slot.t < GRILL_BURN_SECONDS) return 'perfect';
  return 'burnt';
}

// Clicking a grill slot: a perfect patty joins the plate, a burnt one goes in
// the bin, a raw one stays put with a buzz.
export function collectGrill(world, slotIndex) {
  const slot = world.grill[slotIndex];
  if (!slot || world.over) return;
  const state = pattyState(slot);
  if (state === 'raw') {
    world.events.push('error');
    return;
  }
  world.grill[slotIndex] = null;
  if (state === 'perfect') {
    world.plate.stack.push('patty');
    world.events.push('place');
  } else {
    world.events.push('trash');
  }
}

export function friesReady(world) {
  return Boolean(world.fryer) && world.fryer.t >= FRYER_COOK_SECONDS;
}

export function collectFryer(world) {
  if (!world.fryer || world.over) return;
  if (!friesReady(world)) {
    world.events.push('error');
    return;
  }
  world.fryer = null;
  world.plate.fries = true;
  world.events.push('place');
}

export function undoLayer(world) {
  if (world.plate.stack.length === 0) return;
  world.plate.stack.pop();
  world.events.push('pop');
}

export function trashPlate(world) {
  world.plate = emptyPlate();
  world.events.push('trash');
}

// Clicking a customer serves them the plate on the counter, if it is exactly
// what they ordered. A wrong tray is refused and breaks the combo.
export function tryServe(world, customer) {
  if (world.over) return false;
  if (!plateMatches(world, customer)) {
    world.combo = 0;
    world.events.push('error');
    return false;
  }
  const base = orderPrice(customer.order);
  const patienceLeft = Math.max(0, customer.patience / customer.patienceMax);
  const tip = Math.round(base * 0.6 * patienceLeft);
  const multiplier = Math.min(1 + world.combo * COMBO_STEP, COMBO_CAP);
  const paid = Math.round((base + tip) * multiplier);
  world.coins += paid;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.floaters.push({ seat: customer.seat, text: `+$${paid}`, life: 1.4, kind: 'coin' });
  world.customers = world.customers.filter((c) => c !== customer);
  world.plate = emptyPlate();
  world.events.push('serve');
  return true;
}

export function starsFor(world) {
  if (!world.won) return 0;
  if (world.coins >= world.day.goal * 1.6) return 3;
  if (world.coins >= world.day.goal * 1.25) return 2;
  return 1;
}

function endDay(world) {
  world.over = true;
  world.won = world.coins >= world.day.goal;
}

export function tick(world, dt) {
  if (world.over) return;
  world.timeLeft -= dt;
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    endDay(world);
    return;
  }

  for (const slot of world.grill) {
    if (!slot) continue;
    const before = pattyState(slot);
    slot.t += dt;
    const after = pattyState(slot);
    if (before !== 'perfect' && after === 'perfect' && !slot.dinged) {
      slot.dinged = true;
      world.events.push('ding');
    } else if (before !== 'burnt' && after === 'burnt') {
      world.events.push('burn');
    }
  }
  if (world.fryer) {
    const wasReady = friesReady(world);
    world.fryer.t += dt;
    if (!wasReady && friesReady(world) && !world.fryer.dinged) {
      world.fryer.dinged = true;
      world.events.push('ding');
    }
  }

  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    if (world.customers.length < SEATS) spawnCustomer(world);
    world.spawnIn = world.rng.range(world.day.spawnEvery[0], world.day.spawnEvery[1]);
  }

  const leaving = [];
  for (const customer of world.customers) {
    customer.patience -= dt;
    if (customer.patience <= 0) leaving.push(customer);
  }
  for (const customer of leaving) {
    world.customers = world.customers.filter((c) => c !== customer);
    world.lost += 1;
    world.hearts -= 1;
    world.combo = 0;
    world.floaters.push({ seat: customer.seat, text: 'walked out', life: 1.4, kind: 'lost' });
    world.events.push('leave');
    if (world.hearts <= 0) {
      endDay(world);
      return;
    }
  }

  for (const floater of world.floaters) floater.life -= dt;
  world.floaters = world.floaters.filter((f) => f.life > 0);
}
