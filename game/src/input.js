// Sunny Side Diner — turning pointers and keys into kitchen actions.
//
// This module knows where things are on the stage (it shares render.js's
// layout, so what is drawn is exactly what is clickable) and nothing about
// rules: every hit becomes a call on the actions object main.js hands it.
// Keys mirror the mouse: 1–9 press the ingredient bins in counter order,
// Enter serves the selected customer, U takes a layer back, T clears the
// plate, P pauses and M mutes.

import { BIN_ORDER, INGREDIENTS } from './config.js';
import { LAYOUT } from './render.js';

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function attachInput(canvas, actions) {
  const toStage = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  };

  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = toStage(event);
    actions.unlockAudio();

    // Header buttons work on every screen.
    if (inside(LAYOUT.muteButton, x, y)) return actions.toggleMute();
    if (inside(LAYOUT.pauseButton, x, y)) return actions.togglePause();

    const screen = actions.screen();
    if (screen === 'title') return actions.startGame();
    if (screen === 'intro') return actions.beginDay();
    if (screen === 'dayEnd') {
      if (inside(LAYOUT.nextButton, x, y)) return actions.nextDay();
      if (inside(LAYOUT.retryButton, x, y)) return actions.retryDay();
      return undefined;
    }
    if (screen === 'gameEnd') return actions.startGame();
    if (screen !== 'play' || actions.isPaused()) return undefined;

    // The counter: customers first (serve or select), then the stations,
    // then the plate tools, then the bins along the bottom.
    for (const rect of LAYOUT.customerRects()) {
      if (inside(rect, x, y)) return actions.clickCustomer(rect.seat);
    }
    LAYOUT.grillRects().forEach((rect, slot) => {
      if (inside(rect, x, y)) actions.clickGrill(slot);
    });
    if (inside(LAYOUT.fryerRect, x, y)) return actions.clickFryer();
    if (inside(LAYOUT.serveButton, x, y)) return actions.serveSelected();
    if (inside(LAYOUT.undoButton, x, y)) return actions.undo();
    if (inside(LAYOUT.trashButton, x, y)) return actions.trash();
    LAYOUT.binRects().forEach((rect, i) => {
      if (inside(rect, x, y)) actions.pressBin(BIN_ORDER[i]);
    });
    return undefined;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'm') return actions.toggleMute();
    if (key === 'p') return actions.togglePause();
    const screen = actions.screen();
    if (screen === 'title' && (key === 'enter' || key === ' ')) return actions.startGame();
    if (screen === 'intro' && (key === 'enter' || key === ' ')) return actions.beginDay();
    if (screen === 'gameEnd' && (key === 'enter' || key === ' ')) return actions.startGame();
    if (screen !== 'play' || actions.isPaused()) return undefined;
    if (key === 'enter') return actions.serveSelected();
    if (key === 'u') return actions.undo();
    if (key === 't') return actions.trash();
    for (const id of BIN_ORDER) {
      if (INGREDIENTS[id].key === key) return actions.pressBin(id);
    }
    return undefined;
  });
}
