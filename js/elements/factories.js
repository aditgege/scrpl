'use strict';

import { uid, clamp } from '../lib/dom.js';
import { INK, FXDEF } from '../config/constants.js';

// Verbatim bodies from index.html:1874-1921 (only import wiring added)

export function defShadow(over) { return Object.assign({ on: true, color: '#26201A', blur: 30, x: 0, y: 12, a: 30 }, over || {}); }

export function baseEl(o) { return Object.assign({ id: uid(), type: 'photo', x: 0, y: 0, w: 300, h: 300, rot: 0, opacity: 1, visible: true, locked: false, slot: false, slotLabel: '', seed: (Math.random() * 1e6) | 0 }, o); }

export function photoEl(o) {
  return baseEl(Object.assign({
    type: 'photo', assetId: null, mask: 'none', pad: 0, maskColor: '#F7F2E7', radius: 0,
    pzoom: 1, px: 0, py: 0,
    filters: { bright: 100, contrast: 100, sepia: 0, grain: 0, fade: 0 },
    shadow: defShadow()
  }, o));
}

export function filmEl(o) {
  return baseEl(Object.assign({
    type: 'film', n: 3, orient: 'v', filmColor: '#211C16', gutter: 12, sprocket: true, tone: 25, grain: 16,
    frames: [null, null, null], shadow: defShadow({ blur: 36, a: 35 })
  }, o));
}

export function stickerEl(o) {
  return baseEl(Object.assign({ type: 'sticker', kind: 'star5', fill: '#B9552F', style: 'solid', shadow: defShadow({ blur: 12, a: 22 }) }, o));
}

export function paperEl(o) {
  return baseEl(Object.assign({
    type: 'paper', kind: (o && o.kind) || 'torn', fill: '#F1EADA', rot: 0,
    shadow: { on: false }
  }, o));
}

export function textEl(o) {
  return baseEl(Object.assign({
    type: 'text', text: 'Type something', font: 'Caveat', size: 64, weight: 600, color: INK,
    align: 'left', lh: 1.25, ls: 0, italic: false, upper: false, ink: 'plain', shadow: { on: false }
  }, o));
}

export function fxEl(o) {
  const kind = (o && o.kind) || 'grain';
  return baseEl(Object.assign({ type: 'fx', kind, amount: FXDEF[kind], color: '#FF9A3C', corner: 1, shadow: { on: false } }, o));
}

export function fitFilmH(el) {
  const v = el.orient !== 'h', n = el.n, g = el.gutter;
  const spw = el.sprocket ? clamp((v ? el.w : el.h) * 0.09, 14, 40) : 0;
  if (v) {
    const ww = el.w - 2 * (spw + g);
    const wh = ww * 1.18;
    el.h = n * wh + (n - 1) * g + 2 * g;
  }
}

export function jitterCenter(v, S) {
  // Parameterized: S ({size:{w,h}}) injected instead of global; caller passes store.S
  const W = S.size.w / 2, H = S.size.h / 2;
  return { x: W + (Math.random() * 2 - 1) * (v || 20), y: H + (Math.random() * 2 - 1) * (v || 20) };
}
