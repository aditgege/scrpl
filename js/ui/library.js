'use strict';

/*
 * js/ui/library.js — library panel + add-element actions
 * Verbatim bodies from index.html:1923-2002 (add elements) + 2639-2690 (library wiring)
 *
 * Choice: keep add-element actions in this file (no js/ui/add.js). A separate add.js
 * would split fileInput handling from the add* helpers for little benefit; co-location
 * keeps pendingMask/filling refs and wireLibrary together. If add* grows, split to
 * js/ui/add.js and re-export from here.
 *
 * Signatures (store = createStore() instance, deps = plain bag, no globals):
 *   refreshIcons() -> void                              — pure (lucide global)
 *   addEl(store, el, deps) -> el                        — deps: { rebuildProps?, renderLayers?, invalidate? }
 *   newPhotoFromFiles(files, mask, at, store, deps) -> Promise<void>
 *     deps: { addAsset?, fileToAsset?, rebuildProps?, renderLayers?, invalidate?, openSheet?, closeLib? }
 *   addFilm(store, deps) -> void                        — deps: { invalidate?, toast? }
 *   addSticker(kind, store, deps) -> void
 *   addPaper(kind, store, deps) -> void
 *   addText(font, store, deps) -> void                  — deps: { syncTextH?, openTextEditor? }
 *   addFx(kind, store, deps) -> void
 *   wireLibrary(store, deps) -> void
 *     deps: {
 *       rebuildProps, renderLayers, invalidate, refreshIcons, toast, openSheet, closeSheet, closeLib,
 *       openTextEditor?, syncTextH?, setCut?, pasteClip?, startPlacing?, drawStickerShape?, INK?,
 *       fillingRef:{value}, fillingFrameRef:{value:{id,i}}, pendingMaskRef:{value}, fileInputSelector?:string
 *     }
 *   No store singleton import; no js/interaction imports; constants/factories imported directly.
 *   Relative ESM imports with .js extensions. HTML template strings byte-identical.
 */

import { clamp, uid } from '../lib/dom.js';
import { INK, PADDEF, STICKERS } from '../config/constants.js';
import { photoEl, filmEl, stickerEl, paperEl, textEl, fxEl, fitFilmH, jitterCenter } from '../elements/factories.js';
import { addAsset, fileToAsset } from '../assets/manager.js';
import { drawStickerShape } from '../elements/sticker.js';
import { syncTextH as _syncTextH } from '../lib/text.js';
import { detectRegions, cropRegionToCanvas } from '../tools/split.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}
function syncTextHWrap(el) { return _syncTextH(el, getMctx()); }

export function refreshIcons() { if (window.lucide) try { lucide.createIcons(); } catch (e) {} }

export function addEl(store, el, deps = {}) {
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  store.mutate(() => { store.S.els.push(el); });
  store.selIds = [el.id];
  // NOTE: store.mutate above already ran after() = rebuildProps + renderLayers +
  // invalidate with the correct deps bags. Do NOT call rebuild/render here with
  // wireLibrary deps (they lack $/$$/h/esc and throw in renderLayers).
  _invalidate();
  return el;
}

export async function newPhotoFromFiles(files, mask, at, store, deps = {}) {
  const _openSheet = deps.openSheet;
  const loaded = await Promise.all(files.filter(f => f.type.startsWith('image/')).map(f => new Promise(r => {
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => r({ im, src: rd.result }); im.onerror = () => r(null); im.src = rd.result; };
    rd.onerror = () => r(null); rd.readAsDataURL(f);
  })));
  const valid = loaded.filter(Boolean);
  if (!valid.length) return;
  const W = store.S.size.w, H = store.S.size.h;
  const m = mask || 'none';
  store.mutate(() => {
    valid.forEach((v, i) => {
      const id = addAsset(v.im, v.src);
      const ar = v.im.naturalWidth / v.im.naturalHeight;
      let w = Math.min(W * 0.55, 940), hh = w / ar;
      if (hh > H * 0.72) { hh = H * 0.72; w = hh * ar; }
      const c = at || jitterCenter(24, store.S);
      store.S.els.push(photoEl({
        assetId: id, mask: m, pad: PADDEF[m] || 0,
        x: clamp(c.x + i * 28, w / 2, W - w / 2), y: clamp(c.y + i * 28, hh / 2, H - hh / 2), w, h: hh
      }));
      store.selIds = [store.S.els[store.S.els.length - 1].id];
    });
  });
  if (_openSheet) _openSheet();
}

export function addFilm(store, deps = {}) {
  const _invalidate = deps.invalidate;
  const _toast = deps.toast;
  const W = store.S.size.w, H = store.S.size.h;
  const el = filmEl({ x: W / 2, y: H / 2, w: Math.round(W * 0.34), frames: [null, null, null] });
  fitFilmH(el);
  if (el.h > H * 0.94) { const k = H * 0.94 / el.h; el.w = Math.round(el.w * k); el.h = Math.round(el.h * k); }
  addEl(store, el, deps);
  if (_toast) _toast('Filmstrip added — double-click a frame to fill it', 'film');
}

export function addSticker(kind, store, deps = {}) {
  const c = jitterCenter(60, store.S);
  const s = 46 + Math.random() * 44;
  addEl(store, stickerEl({ kind, x: c.x, y: c.y, w: s, h: s, rot: (Math.random() * 2 - 1) * 12 }), deps);
}

export function addPaper(kind, store, deps = {}) {
  const c = jitterCenter(40, store.S);
  let el;
  if (kind === 'tape') {
    el = paperEl({ kind, x: c.x, y: c.y, w: 250, h: 76, fill: '#E8DFC8', rot: (Math.random() * 2 - 1) * 9 });
  } else if (kind === 'receipt') {
    el = paperEl({ kind, x: c.x, y: c.y, w: 290, h: 400, fill: '#F6F2E8', rot: (Math.random() * 2 - 1) * 3 });
  } else if (kind === 'postcard') {
    el = paperEl({ kind, x: c.x, y: c.y, w: 470, h: 330, fill: '#F1EADA', rot: (Math.random() * 2 - 1) * 2 });
  } else if (kind === 'scrap') {
    el = paperEl({ kind, x: c.x, y: c.y, w: 380, h: 300, rot: (Math.random() * 2 - 1) * 4 });
  } else {
    el = paperEl({ kind: 'torn', x: c.x, y: c.y, w: 560, h: 470, rot: (Math.random() * 2 - 1) * 3 });
  }
  addEl(store, el, deps);
}

export function addText(font, store, deps = {}) {
  const W = store.S.size.w, H = store.S.size.h;
  const el = textEl({
    font: font || 'Caveat',
    x: W / 2, y: H / 2 + (Math.random() * 2 - 1) * 30,
    w: Math.min(720, W * 0.72),
    text: font === 'Special Elite' ? 'typewriter notes' : 'handwritten note'
  });
  if (font === 'Special Elite') { el.size = 44; el.weight = 400; }
  syncTextHWrap(el);
  addEl(store, el, deps);
  if (deps.openTextEditor) deps.openTextEditor(el);
}

export function addFx(kind, store, deps = {}) {
  const el = fxEl({ kind, x: store.S.size.w / 2, y: store.S.size.h / 2, w: store.S.size.w, h: store.S.size.h, seed: (Math.random() * 1e6) | 0 });
  addEl(store, el, deps);
}

// --- Split tray helpers — single-place + holding tray (ponytail: in-memory canvases; upgrade to IndexedDB if needed) ---
function toCanvasPt(e) {
  const cvEl = document.getElementById('cv');
  if (!cvEl) return null;
  const r = cvEl.getBoundingClientRect();
  const sx = cvEl.width / r.width, sy = cvEl.height / r.height;
  return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
}

// --- Split PNG helpers (pure spread + async split) ---
function loadImageFromFile(file) {
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => res({ im, src: rd.result });
      im.onerror = () => rej(new Error('image load failed'));
      im.src = rd.result;
    };
    rd.onerror = () => rej(new Error('read failed'));
    rd.readAsDataURL(file);
  });
}

function imageDataFromImage(im) {
  const w = im.naturalWidth || im.width;
  const h = im.naturalHeight || im.height;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(im, 0, 0);
  return { cv, imageData: c.getImageData(0, 0, w, h), w, h };
}

// tray single-place sizing — same as newPhotoFromFiles single (max 0.55W×0.72H)
function traySingleSize(cv, store) {
  const W = store.S.size.w, H = store.S.size.h;
  const ar = (cv.width / cv.height) || 1;
  let w = Math.min(W * 0.55, 940), h = w / ar;
  if (h > H * 0.72) { h = H * 0.72; w = h * ar; }
  return { w, h };
}
function placeSingleFromTray(trayItem, atPt, store, deps) {
  if (!trayItem) return;
  const sz = traySingleSize(trayItem.cv, store);
  const W = store.S.size.w, H = store.S.size.h;
  let x, y;
  if (atPt) { x = clamp(atPt.x, sz.w / 2 + 4, W - sz.w / 2 - 4); y = clamp(atPt.y, sz.h / 2 + 4, H - sz.h / 2 - 4); }
  else { const c = jitterCenter(24, store.S); x = clamp(c.x, sz.w / 2 + 4, W - sz.w / 2 - 4); y = clamp(c.y, sz.h / 2 + 4, H - sz.h / 2 - 4); }
  const aid = addAsset(trayItem.cv, trayItem.src);
  // single undo step; sel after mutate via after() invalidation pattern — keep sel inside mutate so after() sees it if it reads S/sel
  store.mutate(() => {
    const el = photoEl({ assetId: aid, mask: 'none', pad: 0, x, y, w: sz.w, h: sz.h });
    store.S.els.push(el);
    store.selIds = [el.id];
  });
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  _invalidate();
  if (deps.openSheet) deps.openSheet();
}

// shared spread layout + single mutate — ponytail: uses N>6 shrink + sqrt grid; upgrade to packing if needed
function placeSplitCrops(selected, store, deps, skipped) {
  if (!selected.length) return;
  const _toast = deps.toast;
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  const _openSheet = deps.openSheet;
  const W = store.S.size.w, H = store.S.size.h;
  const N = selected.length;
  const sizes = selected.map(c => {
    const ar = (c.cv.width / c.cv.height) || 1;
    let w = Math.min(W * 0.55, 940), hh = w / ar;
    if (hh > H * 0.72) { hh = H * 0.72; w = hh * ar; }
    if (N > 6) { const s = N > 16 ? 0.52 : N > 9 ? 0.62 : 0.74; w *= s; hh *= s; }
    return { w, h: hh };
  });
  const gap = 28;
  const colsG = Math.ceil(Math.sqrt(N));
  const rowsG = Math.ceil(N / colsG);
  const maxW = Math.max(...sizes.map(s => s.w));
  const maxH = Math.max(...sizes.map(s => s.h));
  let strideX = maxW + gap;
  let strideY = maxH + gap;
  const totalW = colsG * strideX - gap;
  const totalH = rowsG * strideY - gap;
  if (totalW > W * 0.92) strideX = (W * 0.92 + gap) / colsG;
  if (totalH > H * 0.88) strideY = (H * 0.88 + gap) / rowsG;
  const startX = W / 2 - (colsG - 1) * strideX / 2;
  const startY = H / 2 - (rowsG - 1) * strideY / 2;
  const placedIds = [];
  const prepared = selected.map((c, i) => ({ id: addAsset(c.cv, c.src), size: sizes[i] }));
  store.mutate(() => {
    prepared.forEach((p, i) => {
      const col = i % colsG, row = Math.floor(i / colsG);
      const sz = p.size;
      let x = startX + col * strideX;
      let y = startY + row * strideY;
      x = clamp(x, sz.w / 2 + 8, W - sz.w / 2 - 8);
      y = clamp(y, sz.h / 2 + 8, H - sz.h / 2 - 8);
      x += (Math.random() * 2 - 1) * 6;
      y += (Math.random() * 2 - 1) * 6;
      x = clamp(x, sz.w / 2 + 4, W - sz.w / 2 - 4);
      y = clamp(y, sz.h / 2 + 4, H - sz.h / 2 - 4);
      const el = photoEl({ assetId: p.id, mask: 'none', pad: 0, x, y, w: sz.w, h: sz.h });
      store.S.els.push(el);
      placedIds.push(el.id);
    });
  });
  store.selIds = [...placedIds];
  // NOTE: store.mutate above already ran after() = rebuildProps + renderLayers +
  // invalidate with the correct deps bags. Do NOT call _rebuildProps/_renderLayers
  // here with wireLibrary deps (they lack $/$$/h/esc and throw in renderLayers).
  _invalidate();
  if (_openSheet) _openSheet();
  const skippedMsg = skipped > 0 ? `, ${skipped} skipped as too small` : '';
  if (_toast) _toast(`Split into ${N} assets${skippedMsg}`, 'grid-2x2');
}

export function wireLibrary(store, deps = {}) {
  const _rebuildProps = deps.rebuildProps;
  const _renderLayers = deps.renderLayers;
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  const _toast = deps.toast;
  const _closeLib = deps.closeLib;
  const _openSheet = deps.openSheet;
  const _refreshIcons = deps.refreshIcons || refreshIcons;
  const _openModal = deps.openModal || ((id) => { const el = document.getElementById(id); if (el) el.classList.add('open'); });
  const _closeModal = deps.closeModal || ((id) => { const el = document.getElementById(id); if (el) el.classList.remove('open'); });
  const fillingRef = deps.fillingRef || { value: null };
  const fillingFrameRef = deps.fillingFrameRef || { value: null };
  const pendingMaskRef = deps.pendingMaskRef || { value: null };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // split state — pending crops are in-memory canvases, not yet in assets Map
  let splitMode = 'auto';
  let splitCols = 4;
  let splitRows = 4;
  let splitPending = []; // {cv, src, w, h, checked}
  let splitSmallSkipped = 0;
  let splitAwaitingFile = false;
  // tray — in-memory canvases, NOT in assets Map until placement (preserves undo)
  let splitTray = []; // {id, cv, src, w, h}

  function renderSplitTray() {
    const wrap = document.getElementById('splitTrayWrap');
    const grid = document.getElementById('splitTrayGrid');
    const cnt = document.getElementById('splitTrayCount');
    if (!wrap || !grid) return;
    if (!splitTray.length) { wrap.style.display = 'none'; if (cnt) cnt.textContent = ''; grid.innerHTML = ''; return; }
    wrap.style.display = '';
    if (cnt) cnt.textContent = `${splitTray.length}`;
    grid.innerHTML = '';
    splitTray.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'lb';
      card.style.cssText = 'position:relative;padding:4px;gap:4px;align-items:stretch;overflow:hidden;cursor:grab';
      card.title = 'Drag to canvas or click to place at center';
      const thumbId = `trayThumb-${item.id}`;
      card.innerHTML = `<button type="button" data-tray-x="${idx}" aria-label="Discard" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink);display:grid;place-items:center;cursor:pointer;z-index:1;line-height:1"><i data-lucide="x" style="width:11px;height:11px"></i></button><img id="${thumbId}" draggable="true" data-tray-idx="${idx}" src="${item.src}" alt="tray ${idx + 1}" style="width:100%;max-height:86px;object-fit:contain;display:block;border-radius:6px;background:#E9E4D6;border:1px solid var(--line);cursor:grab"><span style="font:600 10px var(--mono);color:var(--ink2);text-align:center;display:block">${item.w}×${item.h}</span>`;
      // click to place at center (ignore ×)
      card.addEventListener('click', e => {
        if (e.target.closest('[data-tray-x]')) return;
        // drag already handled via dragstart; click places at center
        const ref = splitTray[idx];
        if (!ref) return;
        placeSingleFromTray(ref, null, store, deps);
      });
      // discard per item
      const xBtn = card.querySelector('[data-tray-x]');
      if (xBtn) xBtn.addEventListener('click', e => {
        e.stopPropagation();
        const i = parseInt(e.currentTarget.dataset.trayX, 10);
        if (Number.isNaN(i) || !splitTray[i]) return;
        splitTray.splice(i, 1);
        renderSplitTray();
        if (_refreshIcons) _refreshIcons();
      });
      // draggable thumb
      const img = card.querySelector('[data-tray-idx]');
      if (img) {
        img.addEventListener('dragstart', e => {
          try { e.dataTransfer.setData('application/x-split-tray', String(idx)); } catch (_) {}
          try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) {}
          e.dataTransfer.effectAllowed = 'copy';
          // use thumbnail as drag image
          if (e.dataTransfer.setDragImage) try { e.dataTransfer.setDragImage(img, 20, 20); } catch (_) {}
        });
      }
      grid.appendChild(card);
    });
    if (_refreshIcons) _refreshIcons();
  }

  function clearSplitPending() {
    splitPending = [];
    splitSmallSkipped = 0;
    const grid = document.getElementById('splitResultsGrid');
    if (grid) grid.innerHTML = '';
  }
  function showSplitOptions() {
    const ov = document.getElementById('splitOptionsView');
    const rv = document.getElementById('splitResultsView');
    const fo = document.getElementById('splitFootOptions');
    const fr = document.getElementById('splitFootResults');
    if (ov) ov.style.display = '';
    if (rv) rv.style.display = 'none';
    if (fo) fo.style.display = '';
    if (fr) fr.style.display = 'none';
  }
  function showSplitResults() {
    const ov = document.getElementById('splitOptionsView');
    const rv = document.getElementById('splitResultsView');
    const fo = document.getElementById('splitFootOptions');
    const fr = document.getElementById('splitFootResults');
    if (ov) ov.style.display = 'none';
    if (rv) rv.style.display = '';
    if (fo) fo.style.display = 'none';
    if (fr) fr.style.display = 'flex';
    syncSplitPlaceBtn();
    if (_refreshIcons) _refreshIcons();
  }
  function syncSplitPlaceBtn() {
    const btn = document.getElementById('splitPlaceBtn');
    const hint = document.getElementById('splitResultsHint');
    const n = splitPending.filter(c => c.checked).length;
    if (btn) { btn.textContent = `Add checked to tray (${n})`; btn.disabled = n === 0; }
    if (hint) hint.textContent = splitPending.length ? `${splitPending.length} assets detected — ${n} selected` : '';
  }
  function renderSplitResults() {
    const grid = document.getElementById('splitResultsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    splitPending.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'tcard';
      card.style.cssText = 'padding:6px;display:flex;flex-direction:column;gap:6px;cursor:default;transform:none';
      card.style.transform = 'none';
      const id = `splitChk${i}`;
      // checkbox + label + thumbnail
      card.innerHTML = `<label for="${id}" style="display:flex;align-items:center;gap:6px;font:600 11px var(--mono);cursor:pointer;user-select:none"><input type="checkbox" id="${id}" data-split-idx="${i}" ${item.checked ? 'checked' : ''} style="accent-color:var(--acc);width:14px;height:14px;flex:none"><span>${item.w}×${item.h}</span><span style="margin-left:auto;font:400 10px var(--mono);color:var(--ink2)">#${i + 1}</span></label><div style="background:#E9E4D6;border:1px solid var(--line);border-radius:6px;display:grid;place-items:center;padding:6px;min-height:88px;overflow:hidden"><img data-split-thumb="${i}" src="${item.src}" alt="crop ${i + 1}" style="max-width:100%;max-height:88px;display:block;border-radius:4px;image-rendering:auto"></div>`;
      grid.appendChild(card);
    });
    // wire checkboxes (delegated after injection)
    grid.querySelectorAll('input[data-split-idx]').forEach(cb => {
      cb.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.splitIdx, 10);
        if (Number.isNaN(idx) || !splitPending[idx]) return;
        splitPending[idx].checked = e.target.checked;
        syncSplitPlaceBtn();
      });
    });
    // clicking card toggles checkbox (except direct checkbox click already handled,
    // and except clicks inside the <label> which natively toggles once —
    // handling those too would double-toggle back to no net change)
    grid.querySelectorAll('.tcard').forEach((card, idx) => {
      card.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT' || e.target.closest('label')) return;
        const cb = card.querySelector('input[data-split-idx]');
        if (!cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    syncSplitPlaceBtn();
    if (_refreshIcons) _refreshIcons();
  }

  const fileInput = document.querySelector('#fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', async e => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) {
        if (splitAwaitingFile) {
          splitAwaitingFile = false;
          const btn = document.getElementById('splitPickBtn');
          if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="upload"></i>Pick PNG'; if (_refreshIcons) _refreshIcons(); }
        }
        return;
      }
      if (fillingFrameRef.value) {
        splitAwaitingFile = false;
        const { id, i } = fillingFrameRef.value; fillingFrameRef.value = null;
        const el = store.elById ? store.elById(id) : store.S.els.find(x => x.id === id);
        if (el) {
          try {
            const aid = await fileToAsset(files[0]);
            store.mutate(() => { el.frames[i] = aid; });
            if (_toast) _toast('Frame ' + (i + 1) + ' filled', 'film');
          } catch (err) { if (_toast) _toast('Could not load that image', 'triangle-alert'); }
        }
        if (files.length > 1) await newPhotoFromFiles(files.slice(1), null, null, store, deps);
        return;
      }
      if (fillingRef.value) {
        splitAwaitingFile = false;
        const id = fillingRef.value; fillingRef.value = null;
        const el = store.elById ? store.elById(id) : store.S.els.find(x => x.id === id);
        if (el && files[0]) {
          try {
            const aid = await fileToAsset(files[0]);
            store.mutate(() => { el.assetId = aid; });
            if (_toast) _toast(el.slot ? 'Slot filled' : 'Photo replaced', 'image');
          } catch (err) { if (_toast) _toast('Could not load that image', 'triangle-alert'); }
        }
        if (files.length > 1) await newPhotoFromFiles(files.slice(1), null, null, store, deps);
        return;
      }
      if (splitAwaitingFile) {
        splitAwaitingFile = false;
        const cfg = { mode: splitMode, cols: splitCols, rows: splitRows };
        const pickBtn = document.getElementById('splitPickBtn');
        if (pickBtn) { pickBtn.disabled = true; pickBtn.textContent = 'Detecting…'; }
        _openModal('mSplit');
        try {
          const minSize = 2;
          let loaded;
          try { loaded = await loadImageFromFile(files[0]); } catch (err) { if (_toast) _toast('Could not load that image', 'triangle-alert'); showSplitOptions(); return; }
          const { imageData, w: iw, h: ih } = imageDataFromImage(loaded.im);
          const opts = { mode: cfg.mode || 'auto', cols: cfg.cols || 4, rows: cfg.rows || 4, minSize };
          let rects;
          try { rects = detectRegions(imageData, opts); } catch (err) { rects = []; }
          let rawCount = rects.length;
          try { rawCount = detectRegions(imageData, { ...opts, minSize: 1 }).length; } catch (err) {}
          const smallSkipped = Math.max(0, rawCount - rects.length);
          if (!rects || rects.length <= 1) {
            const msg = !rects || rects.length === 0 ? 'No separate assets detected — placed as single photo' : 'Only 1 asset detected — placed as single photo';
            _closeModal('mSplit');
            clearSplitPending();
            showSplitOptions();
            await newPhotoFromFiles([files[0]], null, null, store, deps);
            if (_toast) _toast(msg, 'image');
            if (files.length > 1) await newPhotoFromFiles(files.slice(1), null, null, store, deps);
            return;
          }
          // build pending canvases (defer addAsset)
          const pending = [];
          let cropFailed = 0;
          for (const r of rects) {
            const rr = { x: Math.max(0, Math.min(iw - 1, Math.round(r.x))), y: Math.max(0, Math.min(ih - 1, Math.round(r.y))), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) };
            if (rr.x + rr.w > iw) rr.w = iw - rr.x;
            if (rr.y + rr.h > ih) rr.h = ih - rr.y;
            if (rr.w < minSize || rr.h < minSize) continue;
            try {
              const cv = cropRegionToCanvas(loaded.im, rr);
              const src = cv.toDataURL('image/png');
              pending.push({ cv, src, w: cv.width, h: cv.height, checked: true });
            } catch (err) { cropFailed++; }
          }
          const totalSmallSkipped = smallSkipped + Math.max(0, cropFailed) + Math.max(0, rects.length - pending.length - cropFailed);
          if (!pending.length) {
            _closeModal('mSplit');
            clearSplitPending();
            showSplitOptions();
            await newPhotoFromFiles([files[0]], null, null, store, deps);
            if (_toast) _toast('No valid crops — placed as single photo', 'image');
            if (files.length > 1) await newPhotoFromFiles(files.slice(1), null, null, store, deps);
            return;
          }
          if (pending.length <= 1) {
            _closeModal('mSplit');
            clearSplitPending();
            showSplitOptions();
            await newPhotoFromFiles([files[0]], null, null, store, deps);
            const extra = totalSmallSkipped ? `, ${totalSmallSkipped} skipped as too small` : '';
            if (_toast) _toast(`Only 1 valid asset — placed as single photo${extra}`, 'image');
            if (files.length > 1) await newPhotoFromFiles(files.slice(1), null, null, store, deps);
            return;
          }
          // success: show management panel
          splitPending = pending;
          splitSmallSkipped = totalSmallSkipped;
          renderSplitResults();
          showSplitResults();
          if (files.length > 1) {
            // stash remainder? For now place extra files as photos after results? Simpler: toast and ignore until placed
            // keep them as pending extra? Just place them immediately alongside panel (no undo coupling)
            // defer: store remainder to place after Place button? Simpler: place now (separate mutate)
            await newPhotoFromFiles(files.slice(1), null, null, store, deps);
          }
        } catch (err) {
          if (_toast) _toast('Split failed — please try another image', 'triangle-alert');
          showSplitOptions();
        } finally {
          if (pickBtn) { pickBtn.disabled = false; pickBtn.innerHTML = '<i data-lucide="upload"></i>Pick PNG'; if (_refreshIcons) _refreshIcons(); }
        }
        return;
      }
      const m = pendingMaskRef.value; pendingMaskRef.value = null;
      await newPhotoFromFiles(files, m, null, store, deps);
    });
  }

  const libPhoto = $('#libPhoto');
  if (libPhoto) libPhoto.addEventListener('click', () => { pendingMaskRef.value = null; splitAwaitingFile = false; const fi = $('#fileInput'); if (fi) fi.click(); if (_closeLib) _closeLib(); });

  // Split PNG entry
  const libSplit = $('#libSplit');
  if (libSplit) libSplit.addEventListener('click', () => {
    showSplitOptions();
    _openModal('mSplit');
    if (_refreshIcons) _refreshIcons();
    // sync UI
    const seg = document.getElementById('splitModeSeg');
    if (seg) [...seg.querySelectorAll('button')].forEach(b => b.classList.toggle('on', b.dataset.v === splitMode));
    const gridOpts = document.getElementById('splitGridOpts');
    if (gridOpts) gridOpts.style.display = splitMode === 'grid' ? '' : 'none';
    const cv = document.getElementById('splitColsV'); if (cv) cv.textContent = String(splitCols);
    const rv = document.getElementById('splitRowsV'); if (rv) rv.textContent = String(splitRows);
    const ci = document.getElementById('splitCols'); if (ci) ci.value = String(splitCols);
    const ri = document.getElementById('splitRows'); if (ri) ri.value = String(splitRows);
    if (_closeLib) _closeLib();
  });

  // split modal wiring
  const splitModeSeg = document.getElementById('splitModeSeg');
  if (splitModeSeg) splitModeSeg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    splitMode = b.dataset.v === 'grid' ? 'grid' : 'auto';
    splitModeSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === splitMode));
    const gridOpts = document.getElementById('splitGridOpts');
    if (gridOpts) gridOpts.style.display = splitMode === 'grid' ? '' : 'none';
  }));
  const splitColsEl = document.getElementById('splitCols');
  if (splitColsEl) splitColsEl.addEventListener('input', e => {
    splitCols = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
    const v = document.getElementById('splitColsV'); if (v) v.textContent = String(splitCols);
  });
  const splitRowsEl = document.getElementById('splitRows');
  if (splitRowsEl) splitRowsEl.addEventListener('input', e => {
    splitRows = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
    const v = document.getElementById('splitRowsV'); if (v) v.textContent = String(splitRows);
  });
  const splitPickBtn = document.getElementById('splitPickBtn');
  if (splitPickBtn) splitPickBtn.addEventListener('click', () => {
    splitAwaitingFile = true;
    const fi = document.getElementById('fileInput');
    if (fi) { fi.value = ''; fi.click(); }
  });

  // results panel wiring
  const splitSelectAll = document.getElementById('splitSelectAll');
  if (splitSelectAll) splitSelectAll.addEventListener('click', () => {
    splitPending.forEach(c => c.checked = true);
    const grid = document.getElementById('splitResultsGrid');
    if (grid) grid.querySelectorAll('input[data-split-idx]').forEach(cb => cb.checked = true);
    syncSplitPlaceBtn();
  });
  const splitSelectNone = document.getElementById('splitSelectNone');
  if (splitSelectNone) splitSelectNone.addEventListener('click', () => {
    splitPending.forEach(c => c.checked = false);
    const grid = document.getElementById('splitResultsGrid');
    if (grid) grid.querySelectorAll('input[data-split-idx]').forEach(cb => cb.checked = false);
    syncSplitPlaceBtn();
  });
  const splitBackBtn = document.getElementById('splitBackBtn');
  if (splitBackBtn) splitBackBtn.addEventListener('click', () => { showSplitOptions(); });
  const splitPlaceBtn = document.getElementById('splitPlaceBtn');
  if (splitPlaceBtn) splitPlaceBtn.addEventListener('click', () => {
    const selected = splitPending.filter(c => c.checked);
    if (!selected.length) { if (_toast) _toast('Select at least one asset', 'triangle-alert'); return; }
    const adds = selected.map(c => ({ id: uid('t'), cv: c.cv, src: c.src, w: c.w, h: c.h }));
    splitTray.push(...adds);
    clearSplitPending();
    showSplitOptions();
    _closeModal('mSplit');
    renderSplitTray();
    if (_toast) _toast(`${splitTray.length} assets in tray`, 'grid-2x2');
  });

  // discard pending on modal close without placing — catch backdrop / x / Esc
  const mSplit = document.getElementById('mSplit');
  function resetSplitPickBtn() {
    const btn = document.getElementById('splitPickBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="upload"></i>Pick PNG'; if (_refreshIcons) _refreshIcons(); }
  }
  if (mSplit) {
    mSplit.querySelectorAll('.mclose').forEach(b => b.addEventListener('click', () => {
      splitAwaitingFile = false;
      clearSplitPending();
      showSplitOptions();
      resetSplitPickBtn();
    }));
    mSplit.addEventListener('pointerdown', e => {
      if (e.target !== mSplit) return;
      splitAwaitingFile = false;
      clearSplitPending();
      showSplitOptions();
      resetSplitPickBtn();
    });
  }
  // Esc via global wireModals/wireKeyboard also closes modal; observe class removal to cleanup
  if (mSplit && window.MutationObserver) {
    const mo = new MutationObserver(() => {
      if (!mSplit.classList.contains('open')) {
        // any close (Esc, backdrop, programmatic) — reset awaiting + button, discard pending if dismissed
        if (splitAwaitingFile) splitAwaitingFile = false;
        // if pending still there and results were shown, it was dismissed without Place
        const rv = document.getElementById('splitResultsView');
        if (splitPending.length && rv && rv.style.display !== 'none') {
          clearSplitPending();
          showSplitOptions();
        }
        resetSplitPickBtn();
      }
    });
    mo.observe(mSplit, { attributes: true, attributeFilter: ['class'] });
  }

  // tray: Clear-all + stage drop (minimal seam — library-owned, does NOT break file-drop wireDnd)
  const splitTrayClear = document.getElementById('splitTrayClear');
  if (splitTrayClear) splitTrayClear.addEventListener('click', () => { splitTray.length = 0; renderSplitTray(); });
  // initial (in case tray prefilled by HMR)
  renderSplitTray();
  // stage drop for tray drag — reuse toCanvas helper; file-drop path in chrome.js wireDnd returns early when no image files (tray drag has 0 files), so no conflict
  const _stageEl = document.getElementById('stage');
  if (_stageEl) {
    _stageEl.addEventListener('dragover', e => {
      const dt = e.dataTransfer;
      if (!dt) return;
      const types = dt.types ? [...dt.types] : [];
      if (types.includes('application/x-split-tray')) {
        e.preventDefault();
        try { dt.dropEffect = 'copy'; } catch (_) {}
        _stageEl.classList.add('drag');
      }
    });
    _stageEl.addEventListener('dragleave', e => {
      if (e.target === _stageEl) {
        // keep chrome.js wireDnd dragleave logic separate; just ensure we clear if tray drag left stage entirely
        const dt = e.dataTransfer;
        const types = dt && dt.types ? [...dt.types] : [];
        if (types.includes('application/x-split-tray')) _stageEl.classList.remove('drag');
      }
    });
    _stageEl.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (!dt) return;
      let idxStr = '';
      try { idxStr = dt.getData('application/x-split-tray'); } catch (_) {}
      if (!idxStr) {
        // fallback plain text index if browser stripped custom type
        const types = dt.types ? [...dt.types] : [];
        if (!types.includes('application/x-split-tray') && !types.includes('text/plain')) return;
        try { idxStr = dt.getData('text/plain'); } catch (_) {}
        // only handle text/plain if it looks like a small int and we actually have a tray (avoid hijacking real text drops)
        if (!/^\d+$/.test(idxStr)) return;
        if (!splitTray.length) return;
        // heuristic: if files present this is a file drop, not tray
        if (dt.files && dt.files.length) return;
      }
      const idx = parseInt(idxStr, 10);
      if (Number.isNaN(idx) || !splitTray[idx]) return;
      e.preventDefault();
      e.stopPropagation();
      _stageEl.classList.remove('drag');
      const pt = toCanvasPt(e);
      placeSingleFromTray(splitTray[idx], pt, store, deps);
    });
  }

  $$('#libFrames .lb').forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.m;
    const one = store.single ? store.single() : (store.selIds.length === 1 ? store.S.els.find(e => e.id === store.selIds[0]) : null);
    if (one && one.type === 'photo') {
      store.mutate(() => { one.mask = m; one.pad = PADDEF[m] || 0; });
      if (_rebuildProps) _rebuildProps(store, deps);
      if (_toast) _toast('Frame applied', 'frame');
    } else {
      pendingMaskRef.value = m;
      const fi = $('#fileInput'); if (fi) fi.click();
      if (_closeLib) _closeLib();
    }
  }));

  const libFilm = $('#libFilm');
  if (libFilm) libFilm.addEventListener('click', () => { addFilm(store, deps); if (_closeLib) _closeLib(); });

  $$('#libPaper .lb').forEach(b => b.addEventListener('click', () => { addPaper(b.dataset.k, store, deps); if (_closeLib) _closeLib(); }));
  $$('#libFx .lb').forEach(b => b.addEventListener('click', () => { addFx(b.dataset.k, store, deps); if (_closeLib) _closeLib(); }));

  const libTextHand = $('#libTextHand');
  if (libTextHand) libTextHand.addEventListener('click', () => addText('Caveat', store, deps));
  const libTextType = $('#libTextType');
  if (libTextType) libTextType.addEventListener('click', () => addText('Special Elite', store, deps));

  const libCut = $('#libCut');
  if (libCut) libCut.addEventListener('click', () => { if (deps.setCut) deps.setCut(true); if (_closeLib) _closeLib(); });
  const libPaste = $('#libPaste');
  if (libPaste) libPaste.addEventListener('click', () => { if (deps.pasteClip) deps.pasteClip(); if (_closeLib) _closeLib(); });

  (function buildStickers() {
    const box = $('#libStickers');
    if (!box) return;
    // avoid double-build if wireLibrary called twice
    if (box.dataset.built === '1') return;
    box.dataset.built = '1';
    STICKERS.forEach(k => {
      const b = document.createElement('button');
      b.className = 'lb';
      const c = document.createElement('canvas');
      c.width = c.height = 34;
      const x = c.getContext('2d');
      x.translate(17, 17);
      if (deps.drawStickerShape) deps.drawStickerShape(x, k, 26, 26, INK, 'solid');
      else drawStickerShape(x, k, 26, 26, INK, 'solid');
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', `<span>${k}</span>`);
      b.addEventListener('click', () => { addSticker(k, store, deps); if (_closeLib) _closeLib(); });
      box.appendChild(b);
    });
  })();

  const libClose = $('#libClose');
  if (libClose && _closeLib) libClose.addEventListener('click', _closeLib);

  // cut-out tool bar wiring (keep here to preserve original grouping; no interaction import)
  const btnCut = $('#btnCut');
  if (btnCut && deps.setCut) btnCut.addEventListener('click', () => deps.setCut(!deps.cutOnRef || !deps.cutOnRef.value ? true : !deps.cutOnRef.value));
  // callers that need precise cut toggle should pass setCut that reads cutOnRef
  const cutExit = $('#cutExit');
  if (cutExit && deps.setCut) cutExit.addEventListener('click', () => deps.setCut(false));
  const cutCancel = $('#cutCancel');
  if (cutCancel && deps.cancelCutSel) cutCancel.addEventListener('click', deps.cancelCutSel);
  const cutDo = $('#cutDo');
  if (cutDo && deps.performCutCopy) cutDo.addEventListener('click', () => deps.performCutCopy(true));
  const copyDo = $('#copyDo');
  if (copyDo && deps.performCutCopy) copyDo.addEventListener('click', () => deps.performCutCopy(false));
  $$('#cutShapes .sbtn').forEach(b => b.addEventListener('click', () => {
    if (deps.cutRef) deps.cutRef.value.shape = b.dataset.v;
    if (deps.cancelCutSel) deps.cancelCutSel();
  }));

  // place-mode bar wiring
  const placeDone = $('#placeDone');
  if (placeDone && deps.stopPlacing) placeDone.addEventListener('click', () => deps.stopPlacing(false));

  // mobile toolbar — byte-identical to index.html:2693-2711
  $$('#mobar .mbtn').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'photo') { pendingMaskRef.value = null; splitAwaitingFile = false; const fi = $('#fileInput'); if (fi) fi.click(); return; }
    if (act === 'cut') { if (deps.setCut) deps.setCut(!deps.cutOnRef || !deps.cutOnRef.value ? true : !deps.cutOnRef.value); return; }
    if (act === 'text') { addText('Caveat', store, deps); return; }
    if (act === 'film') { addFilm(store, deps); return; }
    const wasOn = b.classList.contains('on');
    $$('#mobar .mbtn').forEach(x => x.classList.remove('on'));
    if (deps.closeSheet) deps.closeSheet();
    if (wasOn) { if (_closeLib) _closeLib(); return; }
    b.classList.add('on');
    document.body.classList.add('lib');
    const sec = { stickers: 'Stickers', paper: 'Paper', fx: 'Analog' }[act];
    if (sec) {
      const head = [...$$('#lib .libsec')].find(s => s.textContent.includes(sec));
      if (head) head.scrollIntoView({ block: 'start' });
    }
  }));
}
