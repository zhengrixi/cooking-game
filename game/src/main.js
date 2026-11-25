// Sunny Side Diner — boot, the day-to-day flow, and the game loop.
//
// main.js owns the app state the other modules share: which screen is up, the
// current day's world, the selected customer, and the week's totals. It wires
// input.js's actions to world.js's rules, drains the world's sound events
// into audio.js, and draws with render.js once per animation frame. With a
// ?shot=<scene> query it instead stages the deterministic screenshot scene
// shots.js describes and holds it still.

import { DAYS, STAGE_HEIGHT, STAGE_WIDTH } from './config.js';
import { makeRng } from './random.js';
import {
  collectFryer,
  collectGrill,
  createWorld,
  plateMatches,
  pressIngredient,
  starsFor,
  tick,
  trashPlate,
  tryServe,
  undoLayer,
} from './world.js';
import { draw } from './render.js';
import { attachInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = STAGE_WIDTH;
canvas.height = STAGE_HEIGHT;
const status = document.getElementById('status');

const audio = createAudio();
const app = {
  screen: 'title',
  world: null,
  dayIndex: 0,
  selectedSeat: null,
  paused: false,
  muted: false,
  totals: { coins: 0, served: 0, lost: 0, stars: 0, bestCombo: 0 },
};

const params = new URLSearchParams(window.location.search);
const shotMode = params.has('shot');
if (shotMode) {
  stageShot(app, params.get('shot'), Number(params.get('seed') ?? 1));
}

function announce(message) {
  if (status) status.textContent = message;
}

function selectedCustomer() {
  if (!app.world) return null;
  return app.world.customers.find((c) => c.seat === app.selectedSeat) ?? null;
}

function selectNextCustomer() {
  const world = app.world;
  app.selectedSeat = world && world.customers.length ? world.customers[0].seat : null;
}

function beginDay() {
  const seed = (Date.now() % 2147483646) + app.dayIndex * 7919 + 1;
  app.world = createWorld(app.dayIndex, makeRng(seed));
  app.selectedSeat = app.world.customers[0]?.seat ?? null;
  app.paused = false;
  app.screen = 'play';
  announce(`${DAYS[app.dayIndex].label}. Goal: earn $${DAYS[app.dayIndex].goal}.`);
}

function finishDay() {
  const world = app.world;
  app.totals.coins += world.coins;
  app.totals.served += world.served;
  app.totals.lost += world.lost;
  app.totals.stars += starsFor(world);
  app.totals.bestCombo = Math.max(app.totals.bestCombo, world.bestCombo);
  app.screen = 'dayEnd';
  if (world.won) audio.play('fanfare');
  announce(world.won ? 'Day complete: goal reached.' : 'Day over: goal missed.');
}

const actions = {
  screen: () => app.screen,
  isPaused: () => app.paused,
  unlockAudio: () => audio.unlock(),
  toggleMute() {
    app.muted = audio.toggleMuted();
  },
  togglePause() {
    if (app.screen !== 'play') return;
    app.paused = !app.paused;
    audio.play('click');
  },
  startGame() {
    app.totals = { coins: 0, served: 0, lost: 0, stars: 0, bestCombo: 0 };
    app.dayIndex = 0;
    app.screen = 'intro';
    audio.play('click');
  },
  beginDay,
  nextDay() {
    if (app.dayIndex >= DAYS.length - 1) {
      app.screen = 'gameEnd';
    } else {
      app.dayIndex += 1;
      app.screen = 'intro';
    }
    audio.play('click');
  },
  retryDay() {
    app.screen = 'intro';
    audio.play('click');
  },
  clickCustomer(seat) {
    const world = app.world;
    const customer = world.customers.find((c) => c.seat === seat);
    if (!customer) return;
    if (plateMatches(world, customer)) {
      tryServe(world, customer);
      if (app.selectedSeat === seat) selectNextCustomer();
    } else {
      app.selectedSeat = seat;
      audio.play('click');
    }
  },
  serveSelected() {
    const customer = selectedCustomer();
    if (!customer) return;
    if (tryServe(app.world, customer)) selectNextCustomer();
  },
  clickGrill: (slot) => collectGrill(app.world, slot),
  clickFryer: () => collectFryer(app.world),
  pressBin: (id) => pressIngredient(app.world, id),
  undo: () => undoLayer(app.world),
  trash: () => trashPlate(app.world),
};

attachInput(canvas, actions);

let last = performance.now();
function frame(nowMs) {
  const now = nowMs / 1000;
  let dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  if (shotMode) dt = 0;
  if (app.screen === 'play' && !app.paused && app.world && !app.world.over) {
    tick(app.world, dt);
    for (const event of app.world.events) audio.play(event);
    app.world.events.length = 0;
    if (app.world.over) finishDay();
  }
  draw(ctx, app, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
