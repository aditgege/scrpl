'use strict';

/*
 * js/ui/gallery.js — templates gallery
 * Verbatim from index.html:2455-2565 (only DI added)
 *
 * Signatures (store = createStore() instance, deps = plain bag):
 *   tplThumb(t, maxW?, deps) -> HTMLCanvasElement
 *     t: { id, name, size:{w,h}, bg, els:()=>el[] }
 *     deps: { renderScene, assets, mctx } — renderScene(state, opts, deps)
 *   hasContent(store) -> boolean           — store.S.els.length>0
 *   openTplGallery(store, deps) -> void
 *     deps: {
 *       h, esc, refreshIcons, toast, openModal, closeModal, confirmBox,
 *       renderScene, assets, mctx, setCanvas, after, deepClone, SIZES,
 *       paperEl, photoEl, textEl, stickerEl, fxEl, filmEl, fitFilmH
 *     }
 *     Internals: BUILTIN (4 templates) copied byte-identical; applyTemplate/applyBlank close over store/deps.
 *
 * No store singleton import; no js/interaction imports; constants/factories imported directly.
 * Relative ESM imports with .js extensions. Template HTML strings byte-identical.
 */

import { h, esc, deepClone, uid } from '../lib/dom.js';
import { SIZES } from '../config/constants.js';
import { paperEl, photoEl, textEl, stickerEl, fxEl, filmEl, fitFilmH } from '../elements/factories.js';
import { renderScene } from '../elements/render.js';
import { assets as assetsStore } from '../assets/manager.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}

const BUILTIN = [
  { id: 't-postcard', name: 'Vintage Postcard', size: { w: 1080, h: 1080 },
    bg: { color: '#E9DCC3', texture: 'paper', grain: 10 },
    els: () => [
      paperEl({ kind: 'torn', x: 540, y: 520, w: 800, h: 660, fill: '#F1EADA', rot: -1.5, seed: 31, shadow: { on: false, color: '#26201A', blur: 26, x: 0, y: 10, a: 26 } }),
      photoEl({ slot: true, slotLabel: 'PHOTO', mask: 'torn', pad: 16, x: 540, y: 520, w: 740, h: 590, seed: 31, rot: -1.5 }),
      paperEl({ kind: 'tape', x: 280, y: 225, w: 250, h: 76, fill: '#E8DFC8', rot: -9, seed: 12 }),
      photoEl({ slot: true, slotLabel: 'STAMP', mask: 'stamp', pad: 22, x: 912, y: 212, w: 225, h: 255, rot: 3, seed: 44 }),
      textEl({ slot: true, slotLabel: 'MESSAGE', text: 'writing to you\nfrom a faraway summer', font: 'Caveat', size: 74, color: '#4A3826', align: 'center', x: 520, y: 955, w: 760, lh: 1.2, rot: -1 }),
      textEl({ text: 'POST MARKED · MDCCCLXXIV', font: 'IBM Plex Mono', size: 24, color: '#8A6B4A', align: 'center', x: 540, y: 120, w: 700, weight: 500 }),
      fxEl({ kind: 'grain', amount: 26, x: 540, y: 540, w: 1080, h: 1080 }),
      fxEl({ kind: 'vignette', amount: 24, x: 540, y: 540, w: 1080, h: 1080 })
    ] },
  { id: 't-film', name: 'Film Diary', size: { w: 1080, h: 1350 },
    bg: { color: '#1C1915', texture: 'plain', grain: 4 },
    els: () => {
      const f = filmEl({ x: 400, y: 700, w: 360, n: 4, frames: [null, null, null, null], seed: 7 });
      fitFilmH(f);
      if (f.h > 1200) { const k = 1200 / f.h; f.w = Math.round(f.w * k); f.h = Math.round(f.h * k); }
      return [
        f,
        textEl({ text: 'EXP · 1996 — ROLL 12', font: 'IBM Plex Mono', size: 28, color: '#C8BFA8', align: 'center', x: 540, y: 130, w: 800, weight: 500, ls: 4 }),
        textEl({ slot: true, slotLabel: 'NOTES', text: 'notes from the roll', font: 'Caveat', size: 66, color: '#D8CDB4', align: 'center', x: 540, y: 1270, w: 820 }),
        stickerEl({ kind: 'star5', fill: '#C7522A', x: 920, y: 220, w: 64, h: 64, rot: 14 }),
        stickerEl({ kind: 'sparkle', fill: '#D8CDB4', x: 170, y: 1180, w: 52, h: 52, rot: -8 }),
        fxEl({ kind: 'grain', amount: 34, x: 540, y: 675, w: 1080, h: 1350 }),
        fxEl({ kind: 'dust', amount: 36, x: 540, y: 675, w: 1080, h: 1350, seed: 88 })
      ];
    } },
  { id: 't-scrap', name: 'Scrapbook', size: { w: 1080, h: 1350 },
    bg: { color: '#EFE7D8', texture: 'paper', grain: 6 },
    els: () => [
      paperEl({ kind: 'torn', x: 345, y: 445, w: 620, h: 600, fill: '#E4D9C3', rot: -4, seed: 21, shadow: { on: false, color: '#26201A', blur: 24, x: 0, y: 10, a: 26 } }),
      photoEl({ slot: true, slotLabel: 'PHOTO 1', mask: 'polaroid', pad: 30, x: 450, y: 420, w: 500, h: 580, rot: -5, shadow: { on: true, color: '#26201A', blur: 26, x: 0, y: 10, a: 34 } }),
      photoEl({ slot: true, slotLabel: 'PHOTO 2', mask: 'rounded', radius: 14, x: 745, y: 845, w: 430, h: 440, rot: 6 }),
      paperEl({ kind: 'tape', x: 300, y: 200, w: 240, h: 74, fill: '#E8DFC8', rot: -7, seed: 15 }),
      paperEl({ kind: 'tape', x: 880, y: 640, w: 230, h: 72, fill: '#D9C9A8', rot: 10, seed: 16 }),
      stickerEl({ kind: 'sparkle', fill: '#B9552F', x: 920, y: 340, w: 58, h: 58, rot: 12 }),
      stickerEl({ kind: 'heart', fill: '#C25E5E', x: 180, y: 980, w: 54, h: 54, rot: -10 }),
      stickerEl({ kind: 'flower', fill: '#D9A441', x: 890, y: 1150, w: 70, h: 70, rot: 20 }),
      textEl({ slot: true, slotLabel: 'CAPTION', text: 'a day worth keeping', font: 'Caveat', size: 64, color: '#4A3826', align: 'center', x: 540, y: 1250, w: 760, rot: -1 }),
      fxEl({ kind: 'grain', amount: 18, x: 540, y: 675, w: 1080, h: 1350 })
    ] },
  { id: 't-memory', name: 'Memory Card', size: { w: 1080, h: 1080 },
    bg: { color: '#D9CBB0', texture: 'kraft', grain: 8 },
    els: () => [
      photoEl({ slot: true, slotLabel: 'PHOTO', mask: 'torn', pad: 20, x: 520, y: 545, w: 790, h: 750, seed: 61, rot: 1 }),
      photoEl({ slot: true, slotLabel: 'STAMP', mask: 'stamp', pad: 22, x: 905, y: 160, w: 215, h: 245, rot: 4, seed: 62 }),
      textEl({ slot: true, slotLabel: 'CAPTION', text: 'remember this place', font: 'Special Elite', size: 52, color: '#3A2E1F', align: 'center', x: 540, y: 975, w: 840 }),
      textEl({ text: 'N° 042', font: 'IBM Plex Mono', size: 24, color: '#6E5A3E', align: 'left', x: 200, y: 130, w: 300, weight: 500, ls: 6 }),
      fxEl({ kind: 'dust', amount: 28, x: 540, y: 540, w: 1080, h: 1080, seed: 41 }),
      fxEl({ kind: 'vignette', amount: 26, x: 540, y: 540, w: 1080, h: 1080 })
    ] }
];

export function tplThumb(t, maxW = 200, deps = {}) {
  const { w, h } = t.size;
  const c = document.createElement('canvas');
  c.width = maxW; c.height = Math.max(2, Math.round(maxW * h / w));
  const x = c.getContext('2d');
  x.scale(c.width / w, c.height / h);
  const _renderScene = deps.renderScene || renderScene;
  const _a = deps.assets || assetsStore;
  const _mctx = deps.mctx || getMctx();
  // verbatim: swap S, render, restore
  const state = { size: t.size, bg: t.bg, els: t.els() };
  _renderScene(x, state, { editor: true }, { assets: _a, mctx: _mctx });
  return c;
}

export function hasContent(store) { return store.S.els.length > 0; }

export function openTplGallery(store, deps = {}) {
  const _h = deps.h || h;
  const _esc = deps.esc || esc;
  const _refreshIcons = deps.refreshIcons || (() => { if (window.lucide) try { lucide.createIcons(); } catch (e) {} });
  const _openModal = deps.openModal || ((id) => document.getElementById(id).classList.add('open'));
  const _closeModal = deps.closeModal || ((id) => document.getElementById(id).classList.remove('open'));
  const _confirmBox = deps.confirmBox;
  const _toast = deps.toast;
  const _setCanvas = deps.setCanvas || (() => {});
  const _after = deps.after || (() => {});
  const _renderScene = deps.renderScene || renderScene;
  const _a2 = deps.assets || assetsStore;
  const _mctx2 = deps.mctx || getMctx();

  async function applyTemplate(t) {
    if (hasContent(store)) {
      if (!_confirmBox) return;
      const ok = await _confirmBox('Replace current collage?', `The “${t.name}” template replaces everything on the canvas.`, 'Apply');
      if (!ok) return;
    }
    const prev = store.snapshot ? store.snapshot() : JSON.stringify(store.S);
    if (store.undoStack) { store.undoStack.push(prev); if (store.redoStack) store.redoStack.length = 0; }
    const nextS = { size: { ...t.size }, bg: deepClone(t.bg), els: t.els() };
    nextS.els.forEach(e => e.id = uid());
    store.S = nextS;
    store.selIds = [];
    if ('editingId' in store) store.editingId = null;
    const ed = document.querySelector('#ed');
    if (ed) { ed.style.display = 'none'; ed.value = ''; }
    _setCanvas(); _after();
    _closeModal('mTpl');
    if (_toast) _toast('Template applied — fill the photo slots', 'layout-template');
  }

  async function applyBlank() {
    if (hasContent(store)) {
      if (!_confirmBox) return;
      const ok = await _confirmBox('Start blank?', 'This clears the canvas.', 'Start blank');
      if (!ok) return;
    }
    store.mutate(() => {
      store.S = { size: { ...store.S.size }, bg: { color: '#EFE7D8', texture: 'paper', grain: 6 }, els: [] };
      store.selIds = [];
    });
    _closeModal('mTpl');
  }

  _openModal('mTpl');
  const grid = document.querySelector('#tplGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const blank = _h(`<div class="tcard tblank" title="Blank canvas"><i data-lucide="plus"></i></div>`);
  blank.addEventListener('click', applyBlank);
  grid.appendChild(blank);
  BUILTIN.forEach(t => {
    const card = _h(`<div class="tcard">
      <div class="tthumb"></div>
      <div class="tmeta"><span class="tname">${_esc(t.name)}</span><span class="tinfo">${t.size.w}×${t.size.h}</span></div>
    </div>`);
    card.querySelector('.tthumb').appendChild(tplThumb(t, 200, { renderScene: _renderScene, assets: _a2, mctx: _mctx2 }));
    card.addEventListener('click', () => applyTemplate(t));
    grid.appendChild(card);
  });
  _refreshIcons();
}

export { BUILTIN };
