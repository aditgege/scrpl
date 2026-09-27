'use strict';

/*
 * js/ui/scrlGallery.js — SCRL panorama gallery (ticket 04 + 05)
 * 5 totally different panorama templates: minimalis, majalah, film/disposable, kolase artistik, typography-bold
 * Varying N: 2,3,3,4,3 (each size.w === 1080*n)
 * Reuses factories from js/elements/factories.js, renderScene for thumbs, DI deps bag like gallery.js
 * Injects into existing #mTpl + #tplGrid — no second modal.
 * Apply path: ticket 05 mismatch dialog via confirmChoice (reuse #mConfirm with 3rd button).
 */

import { h, esc, deepClone, uid } from '../lib/dom.js';
import { paperEl, photoEl, textEl, stickerEl, fxEl, filmEl, fitFilmH } from '../elements/factories.js';
import { renderScene } from '../elements/render.js';
import { assets as assetsStore } from '../assets/manager.js';
import { BUILTIN } from './gallery.js';
import { SCRL_W_UNIT, SCRL_H, SCRL_N_MIN, SCRL_N_MAX } from '../config/scrl.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}

export const SCRL_BUILTIN = [
  {
    id: 'scrl-minimal',
    name: 'Minimal Pan',
    size: { w: 2160, h: 1350 },
    bg: { color: '#F7F2E7', texture: 'paper', grain: 6 },
    scrl: { n: 2 },
    els: () => [
      photoEl({ slot: true, slotLabel: 'PHOTO 1', mask: 'polaroid', pad: 30, x: 540, y: 640, w: 520, h: 620, rot: -1.5, shadow: { on: true, color: '#26201A', blur: 26, x: 0, y: 10, a: 34 } }),
      photoEl({ slot: true, slotLabel: 'PHOTO 2', mask: 'rounded', radius: 14, x: 1620, y: 640, w: 520, h: 620, rot: 1.5 }),
      textEl({ text: 'stillness.', font: 'Instrument Serif', size: 92, color: '#2A2118', align: 'center', x: 1080, y: 210, w: 1200, lh: 1.15, italic: true }),
      textEl({ text: 'slide 01 / 02  —  a quiet interval', font: 'IBM Plex Mono', size: 22, color: '#6E6759', align: 'center', x: 1080, y: 1190, w: 1000, weight: 500, ls: 4 }),
      fxEl({ kind: 'grain', amount: 14, x: 1080, y: 675, w: 2160, h: 1350 })
    ]
  },
  {
    id: 'scrl-editorial',
    name: 'Magazine Spread',
    size: { w: 3240, h: 1350 },
    bg: { color: '#EFE7D8', texture: 'paper', grain: 6 },
    scrl: { n: 3 },
    els: () => [
      paperEl({ kind: 'tape', x: 320, y: 210, w: 220, h: 68, fill: '#E8DFC8', rot: -7, seed: 12 }),
      photoEl({ slot: true, slotLabel: 'PHOTO 1', mask: 'polaroid', pad: 26, x: 540, y: 540, w: 480, h: 560, rot: -2.5 }),
      photoEl({ slot: true, slotLabel: 'PHOTO 2', mask: 'torn', pad: 16, x: 1620, y: 540, w: 620, h: 520, seed: 33, rot: 0.8 }),
      photoEl({ slot: true, slotLabel: 'PHOTO 3', mask: 'stamp', pad: 22, x: 2700, y: 540, w: 380, h: 400, seed: 77, rot: 3 }),
      textEl({ text: 'FIELD NOTES', font: 'Space Grotesk', size: 68, color: '#2A2118', align: 'center', x: 1620, y: 150, w: 1600, weight: 700, ls: 2 }),
      textEl({ slot: true, slotLabel: 'CAPTION', text: 'collected light, paper, and stray marks', font: 'Caveat', size: 46, color: '#4A3826', align: 'center', x: 1620, y: 1160, w: 2000, rot: -0.5 }),
      fxEl({ kind: 'grain', amount: 16, x: 1620, y: 675, w: 3240, h: 1350 }),
      fxEl({ kind: 'vignette', amount: 18, x: 1620, y: 675, w: 3240, h: 1350 })
    ]
  },
  {
    id: 'scrl-film',
    name: 'Film Strip Pan',
    size: { w: 3240, h: 1350 },
    bg: { color: '#1C1915', texture: 'plain', grain: 4 },
    scrl: { n: 3 },
    els: () => {
      const f1 = filmEl({ x: 700, y: 700, w: 340, n: 4, frames: [null, null, null, null], seed: 7 });
      const f2 = filmEl({ x: 1620, y: 700, w: 340, n: 4, frames: [null, null, null, null], seed: 11 });
      const f3 = filmEl({ x: 2540, y: 700, w: 340, n: 4, frames: [null, null, null, null], seed: 19 });
      [f1, f2, f3].forEach(f => { fitFilmH(f); if (f.h > 1200) { const k = 1200 / f.h; f.w = Math.round(f.w * k); f.h = Math.round(f.h * k); } });
      return [
        f1, f2, f3,
        textEl({ text: 'EXP · 2024 — SCRL ROLL 03', font: 'IBM Plex Mono', size: 26, color: '#C8BFA8', align: 'center', x: 1620, y: 130, w: 1800, weight: 500, ls: 4 }),
        textEl({ slot: true, slotLabel: 'NOTES', text: 'keep the light leaks', font: 'Caveat', size: 58, color: '#D8CDB4', align: 'center', x: 1620, y: 1270, w: 1200 }),
        stickerEl({ kind: 'star5', fill: '#C7522A', x: 520, y: 1180, w: 52, h: 52, rot: 14 }),
        stickerEl({ kind: 'sparkle', fill: '#D8CDB4', x: 2720, y: 240, w: 44, h: 44, rot: -8 }),
        fxEl({ kind: 'grain', amount: 34, x: 1620, y: 675, w: 3240, h: 1350 }),
        fxEl({ kind: 'dust', amount: 30, x: 1620, y: 675, w: 3240, h: 1350, seed: 88 })
      ];
    }
  },
  {
    id: 'scrl-collage',
    name: 'Collage Chaos',
    size: { w: 4320, h: 1350 },
    bg: { color: '#E9DCC3', texture: 'paper', grain: 10 },
    scrl: { n: 4 },
    els: () => [
      paperEl({ kind: 'torn', x: 600, y: 500, w: 680, h: 640, fill: '#F1EADA', rot: -3, seed: 31, shadow: { on: false } }),
      photoEl({ slot: true, slotLabel: 'PHOTO 1', mask: 'polaroid', pad: 26, x: 600, y: 500, w: 560, h: 600, rot: -4, shadow: { on: true, color: '#26201A', blur: 26, x: 0, y: 10, a: 34 } }),
      paperEl({ kind: 'tape', x: 340, y: 210, w: 240, h: 72, fill: '#E8DFC8', rot: -7, seed: 15 }),
      paperEl({ kind: 'tape', x: 880, y: 640, w: 230, h: 72, fill: '#D9C9A8', rot: 10, seed: 16 }),
      photoEl({ slot: true, slotLabel: 'PHOTO 2', mask: 'rounded', radius: 14, x: 1620, y: 500, w: 520, h: 500, rot: 5 }),
      photoEl({ slot: true, slotLabel: 'PHOTO 3', mask: 'torn', pad: 16, x: 2700, y: 820, w: 560, h: 540, seed: 63, rot: -2 }),
      photoEl({ slot: true, slotLabel: 'PHOTO 4', mask: 'stamp', pad: 22, x: 3780, y: 420, w: 320, h: 360, seed: 91, rot: 3 }),
      stickerEl({ kind: 'heart', fill: '#C25E5E', x: 800, y: 1100, w: 54, h: 54, rot: -10 }),
      stickerEl({ kind: 'star5', fill: '#C7522A', x: 2160, y: 280, w: 64, h: 64, rot: 14 }),
      stickerEl({ kind: 'flower', fill: '#D9A441', x: 3240, y: 1180, w: 70, h: 70, rot: 20 }),
      stickerEl({ kind: 'sparkle', fill: '#B9552F', x: 3860, y: 1080, w: 52, h: 52, rot: -8 }),
      textEl({ slot: true, slotLabel: 'CAPTION', text: 'keep it messy', font: 'Caveat', size: 64, color: '#4A3826', align: 'center', x: 1620, y: 1180, w: 800, rot: -1 }),
      textEl({ text: 'N° 07 — COLLECTED', font: 'IBM Plex Mono', size: 22, color: '#6E5A3E', align: 'left', x: 3680, y: 1160, w: 600, weight: 500, ls: 6 }),
      fxEl({ kind: 'grain', amount: 18, x: 2160, y: 675, w: 4320, h: 1350 }),
      fxEl({ kind: 'dust', amount: 22, x: 2160, y: 675, w: 4320, h: 1350, seed: 41 })
    ]
  },
  {
    id: 'scrl-type',
    name: 'Bold Type Pan',
    size: { w: 3240, h: 1350 },
    bg: { color: '#2B2620', texture: 'plain', grain: 4 },
    scrl: { n: 3 },
    els: () => [
      paperEl({ kind: 'torn', x: 1620, y: 820, w: 420, h: 420, fill: '#EFE7D8', rot: 1.5, seed: 33, shadow: { on: false } }),
      photoEl({ slot: true, slotLabel: 'PHOTO', mask: 'circle', pad: 14, x: 1620, y: 820, w: 340, h: 340, rot: 1, shadow: { on: true, color: '#0a0908', blur: 24, x: 0, y: 8, a: 30 } }),
      textEl({ text: 'TYPE', font: 'Space Grotesk', size: 170, color: '#F7F2E7', align: 'center', x: 540, y: 500, w: 900, weight: 700, ls: -2 }),
      textEl({ text: 'AS', font: 'Space Grotesk', size: 170, color: '#F7F2E7', align: 'center', x: 1620, y: 500, w: 900, weight: 700 }),
      textEl({ text: 'IMAGE', font: 'Space Grotesk', size: 170, color: '#F7F2E7', align: 'center', x: 2700, y: 500, w: 900, weight: 700, ls: -2 }),
      textEl({ text: '028 — BOLD TYPE STUDY', font: 'IBM Plex Mono', size: 26, color: '#C8BFA8', align: 'center', x: 1620, y: 150, w: 1600, weight: 500, ls: 4 }),
      textEl({ slot: true, slotLabel: 'SUB', text: 'letters that cross the seam', font: 'Caveat', size: 62, color: '#D8CDB4', align: 'center', x: 1620, y: 1180, w: 1400 }),
      stickerEl({ kind: 'dot', fill: '#C7522A', x: 900, y: 280, w: 48, h: 48, rot: 0 }),
      stickerEl({ kind: 'asterisk', fill: '#D8CDB4', x: 2400, y: 300, w: 56, h: 56, rot: 12 }),
      fxEl({ kind: 'grain', amount: 16, x: 1620, y: 675, w: 3240, h: 1350 }),
      fxEl({ kind: 'vignette', amount: 20, x: 1620, y: 675, w: 3240, h: 1350 })
    ]
  }
];

export function tplThumb(t, maxW = 220, deps = {}) {
  const { w, h } = t.size;
  const c = document.createElement('canvas');
  c.width = maxW; c.height = Math.max(2, Math.round(maxW * h / w));
  const x = c.getContext('2d');
  x.scale(c.width / w, c.height / h);
  const _renderScene = deps.renderScene || renderScene;
  const _a = deps.assets || assetsStore;
  const _mctx = deps.mctx || getMctx();
  const state = { size: t.size, bg: t.bg, els: t.els() };
  _renderScene(x, state, { editor: true }, { assets: _a, mctx: _mctx });
  return c;
}

export function hasContent(store) { return store.S.els.length > 0; }

export async function applyScrlTemplate(t, store, deps = {}) {
  const _confirmBox = deps.confirmBox;
  const _confirmChoice = deps.confirmChoice;
  const _toast = deps.toast;
  const _setCanvas = deps.setCanvas || (() => {});
  const _after = deps.after || (() => {});
  const _closeModal = deps.closeModal || ((id) => document.getElementById(id)?.classList.remove('open'));
  if (hasContent(store)) {
    if (!_confirmBox) return;
    const ok = await _confirmBox('Replace current collage?', `The “${t.name}” template replaces everything on the canvas.`, 'Apply');
    if (!ok) return;
  }
  const tplN = t.scrl && typeof t.scrl.n === 'number' ? t.scrl.n : Math.round(t.size.w / SCRL_W_UNIT) || 2;
  const curN = (() => {
    const sc = store.S && store.S.scrl;
    if (sc && typeof sc.n === 'number') return Math.max(1, Math.min(SCRL_N_MAX, Math.round(sc.n)));
    return Math.max(1, Math.min(SCRL_N_MAX, Math.round((store.S.size.w / SCRL_W_UNIT) || 1)));
  })();
  let targetN = tplN;
  let keepCurrentN = false;
  if (curN !== tplN) {
    if (_confirmChoice) {
      const choice = await _confirmChoice(
        `Template is ${tplN} slides — adjust canvas?`,
        `“${t.name}” is ${tplN} slides (${tplN * SCRL_W_UNIT}×${SCRL_H}). Canvas is ${curN} slide${curN === 1 ? '' : 's'}. Adjust to ${tplN} (recommended) or keep ${curN} and place content as-is — outer elements stay off-canvas until you reposition.`,
        `Adjust to ${tplN} slides`,
        `Keep ${curN} slide${curN === 1 ? '' : 's'}`
      );
      if (choice === false) return;
      if (choice === 'alt') { keepCurrentN = true; targetN = curN; }
      else targetN = tplN;
    } else if (_confirmBox) {
      const ok = await _confirmBox(
        `Adjust canvas to ${tplN} slides?`,
        `“${t.name}” is ${tplN} slides but canvas is ${curN}. Adjust to ${tplN}? Cancel keeps ${curN} slides.`,
        `Adjust to ${tplN}`
      );
      if (ok) targetN = tplN; else { keepCurrentN = true; targetN = curN; }
    }
  }
  store.mutate(() => {
    const cur = store.S.scrl || { n: targetN, guidesVisible: true };
    const vis = cur.guidesVisible !== false;
    store.S.scrl = { n: targetN, guidesVisible: vis };
    if (keepCurrentN) {
      if (targetN === 1) store.S.size = { w: 1080, h: SCRL_H };
      else store.S.size = { w: SCRL_W_UNIT * targetN, h: SCRL_H };
    } else {
      store.S.size = { w: SCRL_W_UNIT * targetN, h: SCRL_H };
    }
    store.S.bg = deepClone(t.bg);
    const els = t.els();
    els.forEach(e => { e.id = uid(); });
    store.S.els = els;
    store.selIds = [];
    if ('editingId' in store) store.editingId = null;
    const ed = document.querySelector('#ed');
    if (ed) { ed.style.display = 'none'; ed.value = ''; }
  });
  _setCanvas();
  _after();
  _closeModal('mTpl');
  if (_toast) {
    if (keepCurrentN) _toast(`SCRL template applied — kept ${targetN} slides (outer elements kept off-canvas)`, 'layout-template');
    else _toast(`SCRL template applied — ${targetN} slides`, 'layout-template');
  }
}

export function openScrlGallery(store, deps = {}) {
  const _h = deps.h || h;
  const _esc = deps.esc || esc;
  const _refreshIcons = deps.refreshIcons || (() => { if (window.lucide) try { lucide.createIcons(); } catch (e) {} });
  const _openModal = deps.openModal || ((id) => document.getElementById(id)?.classList.add('open'));
  const _closeModal = deps.closeModal || ((id) => document.getElementById(id)?.classList.remove('open'));
  const _confirmBox = deps.confirmBox;
  const _confirmChoice = deps.confirmChoice;
  const _toast = deps.toast;
  const _setCanvas = deps.setCanvas || (() => {});
  const _after = deps.after || (() => {});
  const _renderScene = deps.renderScene || renderScene;
  const _a = deps.assets || assetsStore;
  const _mctx = deps.mctx || getMctx();

  _openModal('mTpl');
  const grid = document.querySelector('#tplGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const scrlHead = _h(`<div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin:2px 0 6px;font:600 10px var(--mono);letter-spacing:.14em;color:#8a7a5a"><span>SCRL PANORAMA</span><span style="opacity:.55;font-weight:500;letter-spacing:.08em">— 5 templates · 1080×1350 × N · seamless</span></div>`);
  grid.appendChild(scrlHead);

  SCRL_BUILTIN.forEach(t => {
    const card = _h(`<div class="tcard"><div class="tthumb"></div><div class="tmeta"><span class="tname">${_esc(t.name)}</span><span class="tinfo">${t.size.w}×${t.size.h} · ${t.scrl.n} slides</span></div></div>`);
    card.querySelector('.tthumb').appendChild(tplThumb(t, 240, { renderScene: _renderScene, assets: _a, mctx: _mctx }));
    card.addEventListener('click', () => applyScrlTemplate(t, store, { confirmBox: _confirmBox, confirmChoice: _confirmChoice, toast: _toast, setCanvas: _setCanvas, after: _after, closeModal: _closeModal }));
    grid.appendChild(card);
  });

  const sep = _h(`<div style="grid-column:1/-1;height:1px;background:#efe7d8;margin:12px 0 8px"></div>`);
  grid.appendChild(sep);
  const singleHead = _h(`<div style="grid-column:1/-1;font:600 10px var(--mono);letter-spacing:.14em;color:#8a7a5a;margin-bottom:4px"><span>SINGLE</span><span style="opacity:.55;font-weight:500;margin-left:8px;letter-spacing:.08em">— 4 templates · editable</span></div>`);
  grid.appendChild(singleHead);

  const blank = _h(`<div class="tcard tblank" title="Blank canvas"><i data-lucide="plus"></i></div>`);
  blank.addEventListener('click', async () => {
    if (hasContent(store)) {
      if (!_confirmBox) return;
      const ok = await _confirmBox('Start blank?', 'This clears the canvas.', 'Start blank');
      if (!ok) return;
    }
    store.mutate(() => {
      store.S = { size: { ...store.S.size }, bg: { color: '#EFE7D8', texture: 'paper', grain: 6 }, els: [], scrl: store.S.scrl || { n: 1, guidesVisible: false } };
      store.selIds = [];
    });
    _closeModal('mTpl');
  });
  grid.appendChild(blank);

  BUILTIN.forEach(t => {
    const card = _h(`<div class="tcard"><div class="tthumb"></div><div class="tmeta"><span class="tname">${_esc(t.name)}</span><span class="tinfo">${t.size.w}×${t.size.h}</span></div></div>`);
    card.querySelector('.tthumb').appendChild(tplThumb(t, 200, { renderScene: _renderScene, assets: _a, mctx: _mctx }));
    card.addEventListener('click', async () => {
      if (hasContent(store)) {
        if (!_confirmBox) return;
        const ok = await _confirmBox('Replace current collage?', `The “${t.name}” template replaces everything on the canvas.`, 'Apply');
        if (!ok) return;
      }
      const prev = store.snapshot ? store.snapshot() : JSON.stringify(store.S);
      if (store.undoStack) { store.undoStack.push(prev); if (store.redoStack) store.redoStack.length = 0; }
      const nSingle = Math.round(t.size.w / SCRL_W_UNIT) || 1;
      const nextS = { size: { ...t.size }, bg: deepClone(t.bg), els: t.els() };
      nextS.els.forEach(e => e.id = uid());
      nextS.scrl = { n: nSingle, guidesVisible: nSingle >= SCRL_N_MIN };
      store.S = nextS;
      store.selIds = [];
      if ('editingId' in store) store.editingId = null;
      const ed = document.querySelector('#ed');
      if (ed) { ed.style.display = 'none'; ed.value = ''; }
      _setCanvas(); _after();
      _closeModal('mTpl');
      if (_toast) _toast('Template applied — fill the photo slots', 'layout-template');
    });
    grid.appendChild(card);
  });

  _refreshIcons();
}
