// Sunny Side Diner — everything the player sees, drawn on one canvas.
//
// The stage is a fixed 1280x800 kitchen. This module owns the layout (input.js
// hit-tests against the same rectangles, so what is drawn is what is
// clickable) and every drawing routine: the room, the customers and their
// order tickets, the grill and fryer, the plate being stacked layer by layer,
// the ingredient bins, and the title, day-intro, results and pause screens.
// All food is drawn from shapes — there are no image files in the game.

import {
  BIN_ORDER,
  COMBO_CAP,
  COMBO_STEP,
  DAYS,
  FRYER_COOK_SECONDS,
  GRILL_BURN_SECONDS,
  GRILL_COOK_SECONDS,
  INGREDIENTS,
  RECIPES,
  SEATS,
} from './config.js';
import { friesReady, orderPrice, pattyState, starsFor } from './world.js';

export const seatX = (seat) => 170 + seat * 313;

export const LAYOUT = {
  pauseButton: { x: 1146, y: 9, w: 54, h: 34 },
  muteButton: { x: 1208, y: 9, w: 54, h: 34 },
  customerRects() {
    return Array.from({ length: SEATS }, (_, seat) => ({
      x: seatX(seat) - 92, y: 56, w: 184, h: 264, seat,
    }));
  },
  grillRects() {
    return [0, 1].map((i) => ({ x: 38 + i * 138, y: 404, w: 126, h: 98 }));
  },
  fryerRect: { x: 38, y: 566, w: 126, h: 98 },
  serveButton: { x: 988, y: 592, w: 256, h: 54 },
  undoButton: { x: 988, y: 654, w: 124, h: 38 },
  trashButton: { x: 1120, y: 654, w: 124, h: 38 },
  binRects() {
    return BIN_ORDER.map((_, i) => ({ x: 28 + i * 137, y: 696, w: 128, h: 92 }));
  },
  nextButton: { x: 688, y: 516, w: 224, h: 56 },
  retryButton: { x: 368, y: 516, w: 224, h: 56 },
};

const PLATE = { cx: 640, baseY: 648 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, { size = 16, color = '#2b2118', align = 'left', bold = false, font = "'Trebuchet MS', 'Segoe UI', sans-serif" } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700 ' : ''}${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function wrapText(ctx, value, x, y, maxWidth, lineHeight, options) {
  const words = value.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      text(ctx, line, x, yy, options);
      line = word;
      yy += lineHeight;
    } else {
      line = trial;
    }
  }
  if (line) text(ctx, line, x, yy, options);
  return yy;
}

// ---- food -----------------------------------------------------------------

// One burger layer, centred on cx with its bottom edge at baseY, drawn `w`
// wide. Returns the layer's height so stacks can accumulate.
export function drawLayer(ctx, id, cx, baseY, w) {
  const h = INGREDIENTS[id].layer * (w / 150);
  const top = baseY - h;
  ctx.save();
  if (id === 'bunBottom') {
    ctx.fillStyle = '#eda94f';
    roundRect(ctx, cx - w / 2, top, w, h + 4, 6);
    ctx.fill();
    ctx.fillStyle = '#d18f35';
    ctx.fillRect(cx - w / 2 + 4, baseY - 2, w - 8, 3);
  } else if (id === 'bunTop') {
    ctx.fillStyle = '#f2b25c';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, baseY);
    ctx.quadraticCurveTo(cx - w / 2, top - h * 0.5, cx, top - h * 0.4);
    ctx.quadraticCurveTo(cx + w / 2, top - h * 0.5, cx + w / 2, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fdf3d8';
    for (const [dx, dy] of [[-0.28, 0.35], [0, 0.15], [0.26, 0.4], [-0.12, 0.55], [0.14, 0.62]]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx * w, top + dy * h, 3.4, 2, dx * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = '#7c4a21';
    roundRect(ctx, cx - w / 2 - 3, top, w + 6, h + 2, h / 2);
    ctx.fill();
    ctx.fillStyle = '#5e3717';
    for (const dx of [-0.32, -0.1, 0.14, 0.34]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx * w, top + h * 0.55, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#ffb52e';
    ctx.save();
    ctx.translate(cx, top + h / 2);
    ctx.rotate(0.06);
    ctx.fillRect(-w / 2 - 5, -h / 2, w + 10, h);
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, h / 2);
    ctx.lineTo(-w * 0.12, h / 2 + 6);
    ctx.lineTo(-w * 0.04, h / 2);
    ctx.moveTo(w * 0.16, h / 2);
    ctx.lineTo(w * 0.24, h / 2 + 5);
    ctx.lineTo(w * 0.32, h / 2);
    ctx.fill();
    ctx.restore();
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#79c94f';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 - 4, top + h * 0.4);
    for (let i = 0; i <= 6; i += 1) {
      const px = cx - w / 2 - 4 + ((w + 8) / 6) * i;
      ctx.quadraticCurveTo(px - (w + 8) / 12, top + (i % 2 ? h * 1.05 : -h * 0.2), px, top + h * 0.4);
    }
    ctx.lineTo(cx + w / 2 + 4, baseY);
    ctx.lineTo(cx - w / 2 - 4, baseY);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#e23b2e';
    ctx.beginPath();
    ctx.ellipse(cx, top + h / 2, w / 2, h / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0685a';
    ctx.beginPath();
    ctx.ellipse(cx, top + h / 2, w / 3.4, h / 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'onion') {
    ctx.strokeStyle = '#cdb2dd';
    ctx.lineWidth = 2.4;
    for (const off of [-0.26, 0, 0.26]) {
      ctx.beginPath();
      ctx.ellipse(cx + off * w, top + h / 2, w * 0.13, h * 0.62, 0, Math.PI * 0.9, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  ctx.restore();
  return h;
}

export function drawStack(ctx, stack, cx, baseY, w) {
  let y = baseY;
  for (const id of stack) y -= drawLayer(ctx, id, cx, y, w);
  return y;
}

export function drawFries(ctx, cx, baseY, s = 1) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(s, s);
  ctx.fillStyle = '#f7c948';
  for (const [dx, tilt, len] of [[-13, -0.16, 40], [-6, -0.05, 48], [1, 0.03, 44], [8, 0.1, 49], [14, 0.2, 38]]) {
    ctx.save();
    ctx.rotate(tilt);
    ctx.fillRect(dx - 3, -len, 6, len);
    ctx.restore();
  }
  ctx.fillStyle = '#d93a2b';
  ctx.beginPath();
  ctx.moveTo(-19, -26);
  ctx.lineTo(19, -26);
  ctx.lineTo(14, 4);
  ctx.lineTo(-14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fdf3d8';
  ctx.beginPath();
  ctx.ellipse(0, -14, 6, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDrink(ctx, cx, baseY, s = 1) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(s, s);
  ctx.strokeStyle = '#d93a2b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(6, -52);
  ctx.lineTo(12, -30);
  ctx.stroke();
  ctx.fillStyle = '#fdfaf2';
  ctx.beginPath();
  ctx.moveTo(-15, -34);
  ctx.lineTo(15, -34);
  ctx.lineTo(11, 4);
  ctx.lineTo(-11, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c9b795';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#e4572e';
  ctx.fillRect(-13.4, -24, 26.8, 9);
  ctx.fillStyle = '#fdfaf2';
  ctx.fillRect(-16, -38, 32, 5);
  ctx.restore();
}

// ---- the room ---------------------------------------------------------------

function drawRoom(ctx) {
  const wall = ctx.createLinearGradient(0, 52, 0, 320);
  wall.addColorStop(0, '#f8e8c8');
  wall.addColorStop(1, '#f0d5a4');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 52, 1280, 268);
  // A window with a morning sky on the left wall.
  ctx.fillStyle = '#a8d4e6';
  roundRect(ctx, 26, 74, 150, 108, 8);
  ctx.fill();
  ctx.fillStyle = '#fdf3d8';
  ctx.beginPath();
  ctx.arc(56, 100, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a33';
  ctx.lineWidth = 5;
  roundRect(ctx, 26, 74, 150, 108, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(101, 74);
  ctx.lineTo(101, 182);
  ctx.stroke();
  // Menu board on the right wall.
  ctx.fillStyle = '#33413a';
  roundRect(ctx, 1082, 70, 172, 116, 8);
  ctx.fill();
  text(ctx, "TODAY'S MENU", 1168, 94, { size: 13, color: '#f7c948', align: 'center', bold: true });
  const menuLines = ['Classic Stack  $8', 'Cheese Stack  $10', 'Garden Stack  $12', 'Sunny Deluxe  $15', 'The Tower      $20'];
  menuLines.forEach((line, i) => text(ctx, line, 1168, 118 + i * 15, { size: 11.5, color: '#f3ead2', align: 'center' }));
  // Hanging lamps.
  for (const x of [330, 640, 950]) {
    ctx.strokeStyle = '#6b543a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 52);
    ctx.lineTo(x, 76);
    ctx.stroke();
    ctx.fillStyle = '#e4572e';
    ctx.beginPath();
    ctx.moveTo(x - 22, 96);
    ctx.quadraticCurveTo(x, 66, x + 22, 96);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(247, 201, 72, 0.25)';
    ctx.beginPath();
    ctx.arc(x, 100, 17, 0, Math.PI * 2);
    ctx.fill();
  }
  // The counter customers lean on.
  ctx.fillStyle = '#a06a3b';
  ctx.fillRect(0, 318, 1280, 16);
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, 334, 1280, 28);
  // The kitchen floor the player stands on.
  ctx.fillStyle = '#ddd6c6';
  ctx.fillRect(0, 362, 1280, 438);
  ctx.fillStyle = '#cfc7b4';
  for (let x = 0; x < 1280; x += 80) ctx.fillRect(x, 362, 2, 438);
  for (let y = 442; y < 800; y += 80) ctx.fillRect(0, y, 1280, 2);
}

function drawHeader(ctx, app, now) {
  ctx.fillStyle = '#26221e';
  ctx.fillRect(0, 0, 1280, 52);
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(30, 26, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f7c948';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + now * 0.2;
    ctx.beginPath();
    ctx.moveTo(30 + Math.cos(a) * 14, 26 + Math.sin(a) * 14);
    ctx.lineTo(30 + Math.cos(a) * 18, 26 + Math.sin(a) * 18);
    ctx.stroke();
  }
  text(ctx, 'SUNNY SIDE DINER', 56, 33, { size: 19, color: '#fdf3d8', bold: true, font: "Georgia, 'Times New Roman', serif" });
  const world = app.world;
  if (world) {
    text(ctx, world.day.label.split('·')[0].trim(), 300, 33, { size: 16, color: '#f7c948', bold: true });
    // Day timer.
    const frac = Math.max(0, world.timeLeft / world.day.length);
    ctx.fillStyle = '#45403a';
    roundRect(ctx, 420, 17, 300, 18, 9);
    ctx.fill();
    ctx.fillStyle = world.timeLeft < 15 ? '#e23b2e' : '#5da85f';
    if (frac > 0) {
      roundRect(ctx, 420, 17, 300 * frac, 18, 9);
      ctx.fill();
    }
    text(ctx, `${Math.ceil(world.timeLeft)}s`, 730, 33, { size: 15, color: '#fdf3d8', bold: true });
    // Coins against the goal.
    text(ctx, `$${world.coins}`, 806, 33, { size: 19, color: '#f7c948', bold: true });
    text(ctx, `/ $${world.day.goal}`, 806 + ctx.measureText(`$${world.coins}`).width + 22, 33, { size: 13, color: '#bdb2a0' });
    // Hearts.
    for (let i = 0; i < 5; i += 1) drawHeart(ctx, 936 + i * 24, 26, world.hearts > i);
    // Combo.
    if (world.combo >= 2) {
      const mult = Math.min(1 + world.combo * COMBO_STEP, COMBO_CAP).toFixed(2).replace(/0$/, '');
      text(ctx, `COMBO x${mult}`, 1138, 33, { size: 15, color: '#ff9d5c', bold: true, align: 'right' });
    }
  }
  // Pause and mute buttons.
  for (const [rect, kind] of [[LAYOUT.pauseButton, 'pause'], [LAYOUT.muteButton, 'mute']]) {
    ctx.fillStyle = '#3a352f';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7);
    ctx.fill();
    ctx.fillStyle = '#fdf3d8';
    if (kind === 'pause') {
      ctx.fillRect(rect.x + 17, rect.y + 9, 6, 16);
      ctx.fillRect(rect.x + 31, rect.y + 9, 6, 16);
    } else if (app.muted) {
      text(ctx, 'X', rect.x + rect.w / 2, rect.y + 24, { size: 16, color: '#e23b2e', align: 'center', bold: true });
    } else {
      ctx.beginPath();
      ctx.moveTo(rect.x + 14, rect.y + 13);
      ctx.lineTo(rect.x + 24, rect.y + 13);
      ctx.lineTo(rect.x + 34, rect.y + 6);
      ctx.lineTo(rect.x + 34, rect.y + 28);
      ctx.lineTo(rect.x + 24, rect.y + 21);
      ctx.lineTo(rect.x + 14, rect.y + 21);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawHeart(ctx, cx, cy, filled) {
  ctx.fillStyle = filled ? '#e23b2e' : '#5a544c';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 8);
  ctx.bezierCurveTo(cx - 13, cy - 3, cx - 7, cy - 13, cx, cy - 5);
  ctx.bezierCurveTo(cx + 7, cy - 13, cx + 13, cy - 3, cx, cy + 8);
  ctx.fill();
}

// ---- customers ---------------------------------------------------------------

function drawTicket(ctx, customer, selected, now) {
  const cx = seatX(customer.seat);
  const x = cx - 79;
  const y = 56;
  const urgent = customer.patience / customer.patienceMax < 0.25;
  ctx.save();
  if (urgent) ctx.shadowColor = `rgba(226, 59, 46, ${0.5 + 0.4 * Math.sin(now * 8)})`, ctx.shadowBlur = 14;
  ctx.fillStyle = '#fffaf0';
  roundRect(ctx, x, y, 158, 116, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = selected ? '#f2a007' : '#c9b795';
  ctx.lineWidth = selected ? 3.4 : 1.6;
  roundRect(ctx, x, y, 158, 116, 8);
  ctx.stroke();
  const recipe = RECIPES[customer.order.recipeId];
  text(ctx, recipe.name, cx, y + 19, { size: 13.5, align: 'center', bold: true });
  drawStack(ctx, recipe.stack, cx - 18, y + 104, 52);
  if (customer.order.fries) drawFries(ctx, cx + 44, y + 104, 0.62);
  if (customer.order.drink) drawDrink(ctx, cx + 62, y + 104, 0.62);
  text(ctx, `$${orderPrice(customer.order)}`, x + 148, y + 19, { size: 12.5, align: 'right', bold: true, color: '#8a5a33' });
  // Patience bar under the ticket.
  const frac = Math.max(0, customer.patience / customer.patienceMax);
  ctx.fillStyle = '#d8cdb4';
  roundRect(ctx, x, y + 120, 158, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#5da85f' : frac > 0.25 ? '#f2a007' : '#e23b2e';
  if (frac > 0) {
    roundRect(ctx, x, y + 120, 158 * frac, 8, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawCustomer(ctx, customer, now) {
  const cx = seatX(customer.seat);
  const bobY = Math.sin(now * 2 + customer.bob) * 2.2;
  const frac = customer.patience / customer.patienceMax;
  ctx.save();
  ctx.translate(0, bobY);
  // Body behind the counter.
  ctx.fillStyle = customer.look.shirt;
  roundRect(ctx, cx - 40, 252, 80, 74, 16);
  ctx.fill();
  // Head.
  ctx.fillStyle = customer.look.skin;
  ctx.beginPath();
  ctx.arc(cx, 216, 29, 0, Math.PI * 2);
  ctx.fill();
  // Hair by style.
  ctx.fillStyle = customer.look.hair;
  if (customer.look.hairStyle === 0) {
    ctx.beginPath();
    ctx.arc(cx, 208, 29, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(cx, 188, cx - 29, 208);
    ctx.fill();
  } else if (customer.look.hairStyle === 1) {
    roundRect(ctx, cx - 29, 186, 58, 14, 6);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, 184, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, 207, 29, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(cx, 192, cx - 29, 207);
    ctx.fill();
  }
  // Face: eyes and a mouth that follows the patience.
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(cx - 10, 216, 2.6, 0, Math.PI * 2);
  ctx.arc(cx + 10, 216, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (frac > 0.5) ctx.arc(cx, 226, 9, Math.PI * 0.15, Math.PI * 0.85);
  else if (frac > 0.25) {
    ctx.moveTo(cx - 7, 233);
    ctx.lineTo(cx + 7, 233);
  } else ctx.arc(cx, 240, 8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

// ---- stations and the plate ---------------------------------------------------

function drawStations(ctx, world, now) {
  // Grill panel.
  ctx.fillStyle = '#4a423a';
  roundRect(ctx, 24, 368, 280, 148, 10);
  ctx.fill();
  text(ctx, 'GRILL', 44, 394, { size: 15, color: '#fdf3d8', bold: true });
  text(ctx, 'golden = ready · black = burnt', 292, 394, { size: 11, color: '#bdb2a0', align: 'right' });
  LAYOUT.grillRects().forEach((rect, i) => {
    ctx.fillStyle = '#2b2622';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#5a544c';
    ctx.lineWidth = 2;
    for (let g = 1; g < 5; g += 1) {
      ctx.beginPath();
      ctx.moveTo(rect.x + 8, rect.y + g * 19);
      ctx.lineTo(rect.x + rect.w - 8, rect.y + g * 19);
      ctx.stroke();
    }
    const slot = world.grill[i];
    if (!slot) {
      text(ctx, 'empty', rect.x + rect.w / 2, rect.y + 56, { size: 12, color: '#7a7264', align: 'center' });
      return;
    }
    const state = pattyState(slot);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + 46;
    ctx.fillStyle = state === 'raw' ? '#c06a52' : state === 'perfect' ? '#7c4a21' : '#241a12';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 42, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'perfect') {
      ctx.strokeStyle = '#f7c948';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 46, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let s = 0; s < 2; s += 1) {
        const sx = cx - 14 + s * 26 + Math.sin(now * 3 + s * 2) * 3;
        ctx.beginPath();
        ctx.arc(sx, cy - 26 - ((now * 14 + s * 9) % 12), 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state === 'burnt') {
      ctx.fillStyle = 'rgba(90,90,90,0.55)';
      for (let s = 0; s < 3; s += 1) {
        const sx = cx - 18 + s * 18 + Math.sin(now * 2.4 + s * 1.7) * 4;
        ctx.beginPath();
        ctx.arc(sx, cy - 24 - ((now * 11 + s * 13) % 16), 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Cook progress bar.
    const frac = Math.min(1, slot.t / GRILL_BURN_SECONDS);
    ctx.fillStyle = '#17140f';
    ctx.fillRect(rect.x + 10, rect.y + rect.h - 14, rect.w - 20, 6);
    ctx.fillStyle = state === 'raw' ? '#c06a52' : state === 'perfect' ? '#f7c948' : '#e23b2e';
    ctx.fillRect(rect.x + 10, rect.y + rect.h - 14, (rect.w - 20) * frac, 6);
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(rect.x + 10 + (rect.w - 20) * (GRILL_COOK_SECONDS / GRILL_BURN_SECONDS), rect.y + rect.h - 16, 2, 10);
  });

  // Fryer panel.
  ctx.fillStyle = '#4a423a';
  roundRect(ctx, 24, 528, 280, 148, 10);
  ctx.fill();
  text(ctx, 'FRYER', 44, 554, { size: 15, color: '#fdf3d8', bold: true });
  const fr = LAYOUT.fryerRect;
  ctx.fillStyle = '#2b2622';
  roundRect(ctx, fr.x, fr.y, fr.w, fr.h, 8);
  ctx.fill();
  ctx.fillStyle = '#c98a2d';
  roundRect(ctx, fr.x + 10, fr.y + 34, fr.w - 20, fr.h - 44, 6);
  ctx.fill();
  if (!world.fryer) {
    text(ctx, 'empty', fr.x + fr.w / 2, fr.y + 26, { size: 12, color: '#7a7264', align: 'center' });
  } else if (friesReady(world)) {
    drawFries(ctx, fr.x + fr.w / 2, fr.y + 62, 0.9);
    text(ctx, 'READY', fr.x + fr.w / 2, fr.y + 24, { size: 13, color: '#f7c948', align: 'center', bold: true });
  } else {
    const frac = world.fryer.t / FRYER_COOK_SECONDS;
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(fr.x + 14, fr.y + 44, (fr.w - 28) * frac, 22);
    text(ctx, 'frying…', fr.x + fr.w / 2, fr.y + 24, { size: 12, color: '#bdb2a0', align: 'center' });
  }
  text(ctx, 'one basket:', 176, 600, { size: 11.5, color: '#bdb2a0' });
  text(ctx, 'click when golden', 176, 618, { size: 11.5, color: '#bdb2a0' });
}

function drawPlate(ctx, world) {
  // The tray and plate.
  ctx.fillStyle = '#b9b2a4';
  ctx.beginPath();
  ctx.ellipse(PLATE.cx, PLATE.baseY + 16, 215, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdfaf2';
  ctx.beginPath();
  ctx.ellipse(PLATE.cx, PLATE.baseY + 8, 118, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e2d2';
  ctx.beginPath();
  ctx.ellipse(PLATE.cx, PLATE.baseY + 8, 88, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  if (world.plate.stack.length === 0) {
    text(ctx, 'your plate is empty', PLATE.cx, PLATE.baseY - 66, { size: 14, color: '#8a8172', align: 'center' });
    text(ctx, 'click the bins below to build', PLATE.cx, PLATE.baseY - 44, { size: 12.5, color: '#a29885', align: 'center' });
  }
  drawStack(ctx, world.plate.stack, PLATE.cx, PLATE.baseY, 168);
  if (world.plate.fries) drawFries(ctx, PLATE.cx - 168, PLATE.baseY + 12, 1.05);
  if (world.plate.drink) drawDrink(ctx, PLATE.cx + 172, PLATE.baseY + 12, 1.05);
}

function drawGuide(ctx, app) {
  const x = 976;
  ctx.fillStyle = '#fffaf0';
  roundRect(ctx, x, 368, 280, 216, 10);
  ctx.fill();
  ctx.strokeStyle = '#c9b795';
  ctx.lineWidth = 1.6;
  roundRect(ctx, x, 368, 280, 216, 10);
  ctx.stroke();
  const world = app.world;
  const customer = world.customers.find((c) => c.seat === app.selectedSeat);
  if (!customer) {
    text(ctx, 'ORDER GUIDE', x + 18, 398, { size: 14, bold: true, color: '#8a5a33' });
    wrapText(ctx, 'Click a customer to pin their order here. Build the tray to match it exactly, then click the customer again to serve.', x + 18, 428, 244, 21, { size: 14, color: '#5a4a36' });
    return;
  }
  const recipe = RECIPES[customer.order.recipeId];
  text(ctx, recipe.name.toUpperCase(), x + 18, 398, { size: 14.5, bold: true, color: '#8a5a33' });
  let rowY = 422;
  recipe.stack.forEach((id, i) => {
    const mine = world.plate.stack[i];
    const state = mine === id ? 'done' : mine ? 'wrong' : 'todo';
    ctx.fillStyle = state === 'done' ? '#5da85f' : state === 'wrong' ? '#e23b2e' : '#d8cdb4';
    ctx.beginPath();
    ctx.arc(x + 26, rowY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, INGREDIENTS[id].name, x + 42, rowY, { size: 12.5, color: '#2b2118' });
    if (state === 'done') text(ctx, 'ok', x + 262, rowY, { size: 11.5, align: 'right', color: '#5da85f', bold: true });
    rowY += 16;
  });
  for (const [has, needs, label] of [[world.plate.fries, customer.order.fries, 'Fries'], [world.plate.drink, customer.order.drink, 'Soda']]) {
    if (!needs) continue;
    ctx.fillStyle = has ? '#5da85f' : '#d8cdb4';
    ctx.beginPath();
    ctx.arc(x + 26, rowY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, label, x + 42, rowY, { size: 12.5 });
    if (has) text(ctx, 'ok', x + 262, rowY, { size: 11.5, align: 'right', color: '#5da85f', bold: true });
    rowY += 16;
  }
  const frac = Math.max(0, customer.patience / customer.patienceMax);
  const tip = Math.round(orderPrice(customer.order) * 0.6 * frac);
  text(ctx, `pays $${orderPrice(customer.order)} + up to $${tip} tip`, x + 18, 578, { size: 12, color: '#8a5a33' });
}

function drawButtons(ctx, app) {
  const serve = LAYOUT.serveButton;
  const world = app.world;
  const customer = world.customers.find((c) => c.seat === app.selectedSeat);
  ctx.fillStyle = customer ? '#e4572e' : '#9a8f7d';
  roundRect(ctx, serve.x, serve.y, serve.w, serve.h, 10);
  ctx.fill();
  text(ctx, customer ? `SERVE ${RECIPES[customer.order.recipeId].name.toUpperCase()}` : 'SERVE (pick a customer)', serve.x + serve.w / 2, serve.y + 37, { size: 16, color: '#fff7e8', align: 'center', bold: true });
  for (const [rect, label] of [[LAYOUT.undoButton, 'UNDO LAYER'], [LAYOUT.trashButton, 'TRASH TRAY']]) {
    ctx.fillStyle = '#4a423a';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 9);
    ctx.fill();
    text(ctx, label, rect.x + rect.w / 2, rect.y + 25, { size: 12, color: '#fdf3d8', align: 'center', bold: true });
  }
}

function drawBins(ctx, world) {
  LAYOUT.binRects().forEach((rect, i) => {
    const id = BIN_ORDER[i];
    ctx.fillStyle = '#3a332c';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 9);
    ctx.fill();
    ctx.strokeStyle = '#57493a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 9);
    ctx.stroke();
    const cx = rect.x + rect.w / 2;
    if (id === 'fries') drawFries(ctx, cx, rect.y + 52, 0.8);
    else if (id === 'drink') drawDrink(ctx, cx, rect.y + 52, 0.8);
    else if (id === 'patty') {
      ctx.fillStyle = '#c06a52';
      ctx.beginPath();
      ctx.ellipse(cx, rect.y + 34, 34, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a34d38';
      ctx.beginPath();
      ctx.ellipse(cx, rect.y + 44, 34, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawLayer(ctx, id, cx, rect.y + 46, 74);
      if (id === 'bunBottom' || id === 'cheese' || id === 'lettuce') drawLayer(ctx, id, cx, rect.y + 34, 74);
    }
    text(ctx, INGREDIENTS[id].name, cx, rect.y + 72, { size: 12.5, color: '#fdf3d8', align: 'center', bold: true });
    if (id === 'patty') text(ctx, 'to grill', cx, rect.y + 86, { size: 10, color: '#bdb2a0', align: 'center' });
    if (id === 'fries') text(ctx, 'to fryer', cx, rect.y + 86, { size: 10, color: '#bdb2a0', align: 'center' });
    // Key badge.
    ctx.fillStyle = '#f7c948';
    roundRect(ctx, rect.x + 6, rect.y + 6, 17, 17, 4);
    ctx.fill();
    text(ctx, INGREDIENTS[id].key, rect.x + 14.5, rect.y + 19, { size: 11.5, color: '#26221e', align: 'center', bold: true });
  });
}

function drawFloaters(ctx, world) {
  for (const floater of world.floaters) {
    const age = 1.4 - floater.life;
    ctx.save();
    ctx.globalAlpha = Math.min(1, floater.life / 0.7);
    text(ctx, floater.text, seatX(floater.seat), 150 - age * 42, {
      size: 23, align: 'center', bold: true, color: floater.kind === 'coin' ? '#d18f35' : '#e23b2e',
    });
    ctx.restore();
  }
}

// ---- screens -------------------------------------------------------------------

function drawPlay(ctx, app, now) {
  drawRoom(ctx);
  drawHeader(ctx, app, now);
  const world = app.world;
  for (const customer of world.customers) {
    drawCustomer(ctx, customer, now);
    drawTicket(ctx, customer, customer.seat === app.selectedSeat, now);
  }
  drawStations(ctx, world, now);
  drawPlate(ctx, world);
  drawGuide(ctx, app);
  drawButtons(ctx, app);
  drawBins(ctx, world);
  drawFloaters(ctx, world);
  if (app.paused) {
    ctx.fillStyle = 'rgba(24, 20, 16, 0.62)';
    ctx.fillRect(0, 52, 1280, 748);
    text(ctx, 'PAUSED', 640, 400, { size: 54, color: '#fdf3d8', align: 'center', bold: true, font: "Georgia, 'Times New Roman', serif" });
    text(ctx, 'press P or the pause button to get back to the rush', 640, 444, { size: 17, color: '#f7c948', align: 'center' });
  }
}

function drawHeroBurger(ctx, cx, baseY) {
  ctx.fillStyle = '#fdfaf2';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 14, 170, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  drawStack(ctx, RECIPES.tower.stack, cx, baseY, 250);
  drawFries(ctx, cx - 215, baseY + 16, 1.5);
  drawDrink(ctx, cx + 218, baseY + 16, 1.5);
}

function drawTitle(ctx, app, now) {
  drawRoom(ctx);
  drawHeader(ctx, app, now);
  drawHeroBurger(ctx, 400, 560);
  text(ctx, 'SUNNY SIDE', 790, 250, { size: 76, color: '#c8452c', bold: true, font: "Georgia, 'Times New Roman', serif" });
  text(ctx, 'DINER', 790, 330, { size: 76, color: '#c8452c', bold: true, font: "Georgia, 'Times New Roman', serif" });
  text(ctx, 'a five-day cooking rush', 792, 392, { size: 22, color: '#8a5a33', font: "Georgia, 'Times New Roman', serif" });
  const lines = [
    'Build each order layer by layer, as the ticket says.',
    'Grill patties, fry fries: golden is ready, black is burnt.',
    'Serve fast for tips. Clean serves build your combo.',
    'Five walk-outs end the day. Hit the goal, earn stars.',
  ];
  lines.forEach((line, i) => text(ctx, line, 792, 428 + i * 30, { size: 16, color: '#4a3a28' }));
  ctx.fillStyle = '#e4572e';
  roundRect(ctx, 792, 580, 330, 62, 12);
  ctx.fill();
  text(ctx, 'CLICK TO OPEN THE DINER', 957, 619, { size: 19, color: '#fff7e8', align: 'center', bold: true });
  text(ctx, 'mouse or keys 1–9 · Enter serves · U undo · T trash · P pause', 792, 690, { size: 14, color: '#8a8172' });
}

function panel(ctx, w = 640, h = 420) {
  const x = 640 - w / 2;
  const y = 400 - h / 2;
  ctx.fillStyle = 'rgba(24, 20, 16, 0.55)';
  ctx.fillRect(0, 52, 1280, 748);
  ctx.fillStyle = '#fffaf0';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = '#c9b795';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
  return { x, y, w, h };
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.fillStyle = filled ? '#f7c948' : '#ddd3ba';
  ctx.strokeStyle = '#c79a1e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawIntro(ctx, app, now) {
  drawPlay(ctx, { ...app, paused: false }, now);
  const { x, y, w } = panel(ctx, 620, 380);
  const day = DAYS[app.dayIndex];
  text(ctx, day.label, 640, y + 66, { size: 32, align: 'center', bold: true, color: '#c8452c', font: "Georgia, 'Times New Roman', serif" });
  wrapText(ctx, day.news, x + 44, y + 116, w - 88, 26, { size: 17, color: '#4a3a28' });
  text(ctx, `Goal: earn $${day.goal} in ${day.length} seconds`, 640, y + 226, { size: 19, align: 'center', bold: true });
  text(ctx, 'On the menu: ' + day.recipes.map((id) => RECIPES[id].name).join(' · '), 640, y + 262, { size: 13.5, align: 'center', color: '#8a5a33' });
  ctx.fillStyle = '#e4572e';
  roundRect(ctx, 490, y + 292, 300, 54, 11);
  ctx.fill();
  text(ctx, 'START THE DAY', 640, y + 327, { size: 18, color: '#fff7e8', align: 'center', bold: true });
}

function drawDayEnd(ctx, app, now) {
  drawPlay(ctx, { ...app, paused: false }, now);
  const { y } = panel(ctx, 640, 430);
  const world = app.world;
  const stars = starsFor(world);
  text(ctx, world.won ? `${world.day.label.split('·')[0].trim()} — goal reached!` : `${world.day.label.split('·')[0].trim()} — goal missed`, 640, y + 64, { size: 30, align: 'center', bold: true, color: world.won ? '#3f7d3a' : '#c8452c', font: "Georgia, 'Times New Roman', serif" });
  for (let i = 0; i < 3; i += 1) drawStar(ctx, 576 + i * 64, y + 116, 26, stars > i);
  const rows = [
    ['Coins earned', `$${world.coins} of $${world.day.goal}`],
    ['Customers served', `${world.served}`],
    ['Walked out', `${world.lost}`],
    ['Best combo', `x${Math.min(1 + world.bestCombo * COMBO_STEP, COMBO_CAP).toFixed(2).replace(/0$/, '')} (${world.bestCombo} in a row)`],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, 420, y + 176 + i * 36, { size: 17, color: '#5a4a36' });
    text(ctx, value, 860, y + 176 + i * 36, { size: 17, align: 'right', bold: true });
  });
  const retry = LAYOUT.retryButton;
  ctx.fillStyle = '#4a423a';
  roundRect(ctx, retry.x, retry.y, retry.w, retry.h, 11);
  ctx.fill();
  text(ctx, 'RETRY DAY', retry.x + retry.w / 2, retry.y + 36, { size: 17, color: '#fdf3d8', align: 'center', bold: true });
  if (world.won) {
    const next = LAYOUT.nextButton;
    ctx.fillStyle = '#e4572e';
    roundRect(ctx, next.x, next.y, next.w, next.h, 11);
    ctx.fill();
    text(ctx, app.dayIndex === DAYS.length - 1 ? 'FINAL RESULTS' : 'NEXT DAY', next.x + next.w / 2, next.y + 36, { size: 17, color: '#fff7e8', align: 'center', bold: true });
  }
}

function drawGameEnd(ctx, app, now) {
  drawRoom(ctx);
  drawHeader(ctx, app, now);
  drawHeroBurger(ctx, 640, 330);
  const { y } = panel(ctx, 640, 400);
  text(ctx, 'WEEK COMPLETE!', 640, y + 70, { size: 36, align: 'center', bold: true, color: '#c8452c', font: "Georgia, 'Times New Roman', serif" });
  const totals = app.totals;
  const starFraction = totals.stars / (DAYS.length * 3);
  for (let i = 0; i < 3; i += 1) drawStar(ctx, 576 + i * 64, y + 122, 24, starFraction > (i + 0.5) / 3);
  const rows = [
    ['Total coins', `$${totals.coins}`],
    ['Stars earned', `${totals.stars} of ${DAYS.length * 3}`],
    ['Customers served', `${totals.served}`],
    ['Walked out', `${totals.lost}`],
    ['Best combo streak', `${totals.bestCombo}`],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, 430, y + 182 + i * 34, { size: 17, color: '#5a4a36' });
    text(ctx, value, 850, y + 182 + i * 34, { size: 17, align: 'right', bold: true });
  });
  ctx.fillStyle = '#e4572e';
  roundRect(ctx, 490, y + 338, 300, 52, 11);
  ctx.fill();
  text(ctx, 'PLAY AGAIN', 640, y + 372, { size: 18, color: '#fff7e8', align: 'center', bold: true });
}

export function draw(ctx, app, now) {
  ctx.clearRect(0, 0, 1280, 800);
  if (app.screen === 'title') drawTitle(ctx, app, now);
  else if (app.screen === 'intro') drawIntro(ctx, app, now);
  else if (app.screen === 'dayEnd') drawDayEnd(ctx, app, now);
  else if (app.screen === 'gameEnd') drawGameEnd(ctx, app, now);
  else drawPlay(ctx, app, now);
}
