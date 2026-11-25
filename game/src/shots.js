// Sunny Side Diner — staged scenes for the entry's screenshots.
//
// The screenshots in shots.json are real renders of this game in a browser,
// of scenes this module sets up deterministically from a seed: the title
// screen, a mid-service moment with a dish half stacked and a patty golden on
// the grill, a full rush with four customers and a burnt patty smoking, and a
// finished day's results. Open the game with ?shot=play&seed=7 (any of
// start, play, rush, end) and it holds that scene instead of starting a day.

import { createWorld } from './world.js';
import { makeRng } from './random.js';

const LOOKS = [
  { skin: '#f6c89f', shirt: '#e4572e', hair: '#2b2118', hairStyle: 0 },
  { skin: '#8d5524', shirt: '#2e86ab', hair: '#d9d9d9', hairStyle: 1 },
  { skin: '#ffd9b3', shirt: '#5da85f', hair: '#b3402a', hairStyle: 2 },
  { skin: '#c97b4a', shirt: '#f2b134', hair: '#3a3a3a', hairStyle: 0 },
];

function customer(seat, recipeId, fries, drink, patience, patienceMax, lookIndex, bob) {
  return {
    seat,
    order: { recipeId, fries, drink },
    patience,
    patienceMax,
    look: LOOKS[lookIndex],
    bob,
  };
}

function stagePlay(app, seed) {
  const world = createWorld(3, makeRng(seed)); // Day 4: the full menu is on.
  world.customers = [
    customer(0, 'cheese', true, false, 41, 55, 0, 1.0),
    customer(1, 'deluxe', false, true, 49, 58, 1, 2.4),
    customer(2, 'garden', false, false, 21, 52, 2, 4.0),
  ];
  // The Deluxe on the pass, half stacked: bun, patty, cheese, lettuce down,
  // tomato and the top bun still to go, and its soda already poured.
  world.plate = { stack: ['bunBottom', 'patty', 'cheese', 'lettuce'], fries: false, drink: true };
  world.grill = [{ t: 5.6, dinged: true }, { t: 1.8, dinged: false }]; // one golden, one raw
  world.fryer = { t: 9, dinged: true }; // a basket of fries, ready
  world.coins = 47;
  world.served = 5;
  world.combo = 3;
  world.timeLeft = 63;
  app.world = world;
  app.dayIndex = 3;
  app.selectedSeat = 1;
  app.screen = 'play';
}

function stageRush(app, seed) {
  const world = createWorld(4, makeRng(seed)); // Day 5: everything, at once.
  world.customers = [
    customer(0, 'tower', false, true, 30, 50, 3, 0.4),
    customer(1, 'double', true, false, 44, 54, 1, 1.8),
    customer(2, 'deluxe', true, true, 10, 56, 2, 3.1),
    customer(3, 'classic', false, false, 47, 52, 0, 5.2),
  ];
  world.plate = { stack: ['bunBottom', 'patty', 'cheese', 'patty'], fries: true, drink: false };
  world.grill = [{ t: 9.6, dinged: true }, { t: 5.2, dinged: true }]; // one burnt, one golden
  world.fryer = { t: 1.6, dinged: false };
  world.coins = 168;
  world.served = 12;
  world.lost = 1;
  world.hearts = 4;
  world.combo = 6;
  world.bestCombo = 6;
  world.timeLeft = 34;
  world.floaters = [{ seat: 3, text: '+$21', life: 1.15, kind: 'coin' }];
  app.world = world;
  app.dayIndex = 4;
  app.selectedSeat = 3;
  app.screen = 'play';
}

function stageEnd(app, seed) {
  const world = createWorld(1, makeRng(seed)); // Day 2, done and dusted.
  world.coins = 131; // past the $95 goal and its 1.25x line: two stars
  world.served = 11;
  world.lost = 1;
  world.bestCombo = 7;
  world.combo = 0;
  world.timeLeft = 0;
  world.over = true;
  world.won = true;
  app.world = world;
  app.dayIndex = 1;
  app.selectedSeat = null;
  app.screen = 'dayEnd';
}

export function stageShot(app, name, seed) {
  if (name === 'play') stagePlay(app, seed);
  else if (name === 'rush') stageRush(app, seed);
  else if (name === 'end') stageEnd(app, seed);
  else app.screen = 'title';
}
