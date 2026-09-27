'use strict';
import { createStore } from './state/store.js';
import { setCanvas, fitStage, tick, zoomCenter, wireWheel } from './interaction/view.js';
import { drawOverlay } from './interaction/selection.js';
import { createPointerRefs, wirePointer } from './interaction/pointer.js';
import { openTextEditor, placeEd, closeEd, wireTextEditor } from './interaction/text-editor.js';
import { createCutState, createPlacingRef, setCut, cancelCutSel, performCutCopy, pasteClip, startPlacing, stopPlacing } from './tools/cutout.js';
import { renderLayers } from './ui/layers.js';
import { rebuildProps, syncNums } from './ui/props.js';
import { wireLibrary } from './ui/library.js';
import { BUILTIN } from './ui/gallery.js';
import { openScrlGallery } from './ui/scrlGallery.js';
// BUILTIN kept for init default (Scrapbook single, ticket 01); gallery UI now via openScrlGallery
import { openExport, doExport } from './ui/export.js';
import { openScrlExport, doScrlExport } from './ui/scrlExport.js';
import { wireModals, wireTopbar, wireDnd, wireKeyboard, refreshIcons, toast, openModal, closeModal, confirmBox, confirmChoice, openSheet, closeSheet, closeLib } from './ui/chrome.js';
import { dupSelected, deleteSelected, applyImperfect } from './app/ops.js';
import { SIZES } from './config/constants.js';
import { SCRL_W_UNIT, SCRL_H, SCRL_N_MIN, SCRL_N_MAX, scrlSize, scrlGuides } from './config/scrl.js';
import { crossedGuidesForEls } from './scrl/crossing.js';
// ponytail: crossing uses AABB (conservative at ~45°); upgrade to SAT if needed. Text h assumed synced via syncTextH/mctx already.
// EXTENSION POINT: export strip (ticket 02 / js/ui/scrlExport.js) can reuse elCrossesGuides / crossedGuidesForEls from ./scrl/crossing.js
import { $, $$, h, esc, uid, deepClone, clamp, store as lsStore } from './lib/dom.js';
import { syncTextH, fontCss } from './lib/text.js';
import { renderScene } from './elements/render.js';
import { assets } from './assets/manager.js';

// canvases
const cv = $('#cv');
const ov = $('#ov');
const ed = $('#ed');
const stage = $('#stage');
const cx = cv.getContext('2d');
const ox = ov.getContext('2d');
const mctx = document.createElement('canvas').getContext('2d');

// shared mutable refs (DI)
const cutRef = createCutState();
const placingRef = createPlacingRef();
const pointerRefs = createPointerRefs();
const handleGeomRef = { value: null };
const snapOnRef = { value: false };
const spaceDownRef = { value: false };
const pendingMaskRef = { value: null };
const fillingRef = { value: null };
const fillingFrameRef = { value: null };
const imp = { rot: 4, pos: 12, scale: 2 };

// view deps (store injected later)
const viewDeps = {
  store: null,
  dom: { cv, ov, stage, ed, cx, ox },
  fx: {
    renderScene,
    assets,
    mctx,
    drawOverlay: (deps) => {
      const st = viewDeps.store;
      if (!st) return drawOverlay({ store: st, dom: { ov, ox, cv, stage }, placingRef, cutRef, handleGeomRef, assets });
      const scrl = st.S && st.S.scrl;
      const n = scrl && typeof scrl.n === 'number' ? scrl.n : Math.round((st.S.size.w / SCRL_W_UNIT) || 1);
      const visible = scrl ? scrl.guidesVisible !== false : false;
      const derived = (visible && n >= SCRL_N_MIN) ? scrlGuides(n) : { v: [], h: [] };
      const transient = st.guides || { v: [], h: [] };
      const mergedV = [...derived.v];
      for (const g of transient.v) if (!mergedV.includes(g)) mergedV.push(g);
      const mergedH = [...derived.h, ...transient.h];
      // ticket 03 — lintas-batas: red lines for crossed slide guides (non-blocking, distinct from dashed ACC)
      // EXTENSION POINT: export strip (ticket 02) can reuse elCrossesGuides / crossedGuidesForEls for per-slice badges
      // ponytail: crossing uses AABB (elBboxXRange) — conservative at ~45°; upgrade to SAT if needed. Text h assumed synced via syncTextH/mctx already.
      const crossedV = (n >= SCRL_N_MIN && derived.v.length && st.S && Array.isArray(st.S.els))
        ? crossedGuidesForEls(st.S.els, derived.v)
        : [];
      return drawOverlay({ store: st, dom: { ov, ox, cv, stage }, placingRef, cutRef, handleGeomRef, assets, guidesRef: { v: mergedV, h: mergedH }, crossedGuides: crossedV });
    },
    placeEd: (deps) => placeEd({ store: viewDeps.store, dom: { ed, cv, ov, stage }, fx: { fontCss, syncTextH }, mctx })
  }
};

function invalidate() {
  if (viewDeps.store) viewDeps.store.invalidate();
  else if (typeof store !== 'undefined' && store && store.invalidate) store.invalidate();
}

const layersDeps = {
  $, $$, h, esc,
  refreshIcons,
  rebuildProps: (s, d) => rebuildProps(s, d || propsDeps),
  invalidate,
  openTextEditor: (el) => openTextEditor({ store, dom: { ed, cv, ov, stage }, fx: { syncTextH, fontCss }, mctx }, el)
};

const propsDeps = {
  refreshIcons,
  invalidate,
  rebuildProps: (s, d) => rebuildProps(s, d || propsDeps),
  renderLayers: (s, d) => renderLayers(s, d || layersDeps),
  syncNums: () => syncNums(store),
  dupSelected: () => dupSelected(store),
  deleteSelected: () => deleteSelected(store),
  applyImperfect: () => applyImperfect(store, { imp, toast }),
  setCanvas: () => setCanvas(viewDeps),
  fitStage: () => fitStage(viewDeps),
  startPlacing: (clip) => startPlacing({ store, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }, clip),
  fillingRef,
  fillingFrameRef
};

let syncScrlUI = () => {};
let getScrlN = () => 1;
let setScrlN = () => {};

function after() {
  rebuildProps(store, propsDeps);
  renderLayers(store, layersDeps);
  invalidate();
  store.updateHistoryBtns();
  syncScrlUI();
}

const store = createStore({
  ed,
  onAfter: after,
  onSetCanvas: () => setCanvas(viewDeps),
  onUpdateHistoryBtns: (ul, rl) => {
    const u = $('#btnUndo'), r = $('#btnRedo');
    if (u) u.disabled = !ul;
    if (r) r.disabled = !rl;
  }
});
viewDeps.store = store;

// ---- SCRL lintas-batas drag-end toast (nice-to-have, no pointer.js touch) ----
// ponytail: uses AABB; text h assumed synced via syncTextH/mctx already.
let _scrlPrevDrag = null;
let _scrlPrevCrossKey = (() => {
  const sc = store.S && store.S.scrl;
  const n0 = sc && typeof sc.n === 'number' ? Math.round(sc.n) : Math.round((store.S.size.w / SCRL_W_UNIT) || 1);
  if (n0 < SCRL_N_MIN) return '';
  return crossedGuidesForEls(store.S.els, scrlGuides(n0).v).join(',');
})();
store.subscribe((state) => {
  const curDrag = state.drag;
  if (_scrlPrevDrag && !curDrag) {
    const sc = state.S && state.S.scrl;
    const n = sc && typeof sc.n === 'number' ? Math.round(sc.n) : Math.round((state.S.size.w / SCRL_W_UNIT) || 1);
    if (n >= SCRL_N_MIN && sc && sc.guidesVisible !== false) {
      const guides = scrlGuides(n);
      const crossed = crossedGuidesForEls(state.S.els, guides.v);
      const key = crossed.join(',');
      if (crossed.length && key !== _scrlPrevCrossKey) toast('lintas batas \u2014 elemen terpotong di batas slide', 'alert-triangle');
      _scrlPrevCrossKey = key;
    } else _scrlPrevCrossKey = '';
  } else if (!curDrag) {
    const sc2 = state.S && state.S.scrl;
    const n2 = sc2 && typeof sc2.n === 'number' ? Math.round(sc2.n) : Math.round((state.S.size.w / SCRL_W_UNIT) || 1);
    _scrlPrevCrossKey = n2 >= SCRL_N_MIN ? crossedGuidesForEls(state.S.els, scrlGuides(n2).v).join(',') : '';
  }
  _scrlPrevDrag = curDrag;
});

// ---- SCRL helpers (DI, no globals) ----
getScrlN = () => {
  const sc = store.S && store.S.scrl;
  if (sc && typeof sc.n === 'number') return Math.max(1, Math.min(SCRL_N_MAX, Math.round(sc.n)));
  const w = store.S && store.S.size ? store.S.size.w : SCRL_W_UNIT;
  return Math.max(1, Math.min(SCRL_N_MAX, Math.round(w / SCRL_W_UNIT) || 1));
};
syncScrlUI = () => {
  const n = getScrlN();
  const inp = document.getElementById('scrlNVal');
  if (inp) inp.value = String(n);
  const minus = document.getElementById('scrlMinus');
  const plus = document.getElementById('scrlPlus');
  if (minus) minus.disabled = n <= 1;
  if (plus) plus.disabled = n >= SCRL_N_MAX;
  const btnG = document.getElementById('btnGuides');
  if (btnG) {
    const sc = store.S && store.S.scrl;
    const vis = sc ? sc.guidesVisible !== false : n >= SCRL_N_MIN;
    const on = vis && n >= SCRL_N_MIN;
    btnG.classList.toggle('on', on);
    btnG.disabled = n < SCRL_N_MIN;
    btnG.title = on ? 'Hide guides' : 'Show guides';
    const icon = btnG.querySelector('i');
    if (icon) icon.setAttribute('data-lucide', on ? 'eye' : 'eye-off');
  }
  refreshIcons();
};
setScrlN = (n) => {
  const nn = Math.max(1, Math.min(SCRL_N_MAX, Math.round(n) || 1));
  if (nn === getScrlN()) return;
  store.mutate(() => {
    const cur = store.S.scrl || { n: getScrlN(), guidesVisible: true };
    const vis = cur.guidesVisible !== false;
    store.S.scrl = { n: nn, guidesVisible: vis };
    if (nn === 1) store.S.size = { ...SIZES.portrait };
    else store.S.size = scrlSize(nn);
  });
  setCanvas(viewDeps);
  rebuildProps(store, propsDeps);
  renderLayers(store, layersDeps);
  invalidate();
  syncScrlUI();
};

function preloadFonts() {
  if (!document.fonts) return;
  ['600 64px "Caveat"','400 64px "Special Elite"','400 64px "Instrument Serif"','500 64px "IBM Plex Mono"','600 64px "Space Grotesk"','700 64px "Playfair Display"','400 64px "DM Serif Display"','400 64px "Bebas Neue"','400 64px "Libre Baskerville"','600 64px "Archivo"','400 64px "Italiana"','800 64px "Inter Tight"','400 64px "Anton"','400 64px "Archivo Black"']
    .forEach(f => document.fonts.load(f).catch(()=>{}));
  document.fonts.ready.then(()=> invalidate()).catch(()=>{});
}

function wireScrlControls() {
  const minus = document.getElementById('scrlMinus');
  const plus = document.getElementById('scrlPlus');
  const guidesBtn = document.getElementById('btnGuides');
  if (minus && !minus._scrlWired) {
    minus._scrlWired = true;
    minus.addEventListener('click', () => setScrlN(getScrlN() - 1));
  }
  if (plus && !plus._scrlWired) {
    plus._scrlWired = true;
    plus.addEventListener('click', () => setScrlN(getScrlN() + 1));
  }
  if (guidesBtn && !guidesBtn._scrlWired) {
    guidesBtn._scrlWired = true;
    guidesBtn.addEventListener('click', () => {
      const cur = store.S.scrl || { n: getScrlN(), guidesVisible: true };
      const n = typeof cur.n === 'number' ? cur.n : getScrlN();
      if (n < SCRL_N_MIN) return;
      store.mutate(() => {
        const c = store.S.scrl || { n, guidesVisible: true };
        store.S.scrl = { n: c.n, guidesVisible: !(c.guidesVisible !== false) };
      });
      invalidate();
      syncScrlUI();
    });
  }
}

// ---- SCRL-export (ticket 02, isolated: separate modal #mScrlExport, preview strip, sequential download) ----
function syncScrlExportUI() {
  const n = getScrlN();
  const btnScrl = document.getElementById('btnScrlExport');
  if (btnScrl) btnScrl.style.display = n >= SCRL_N_MIN ? '' : 'none';
  const entry = document.getElementById('scrlExportEntry');
  if (entry) entry.style.display = n >= SCRL_N_MIN ? '' : 'none';
  const entryN = document.getElementById('scrlEntryN');
  if (entryN) entryN.textContent = String(n);
}
const _origSyncScrlUI_scrlExport = syncScrlUI;
syncScrlUI = () => { _origSyncScrlUI_scrlExport(); syncScrlExportUI(); };
function wireScrlExport() {
  const deps = { renderScene, assets, mctx, openModal, closeModal, toast, refreshIcons, getScrlN };
  const btnTop = document.getElementById('btnScrlExport');
  if (btnTop && !btnTop._scrlWired) {
    btnTop._scrlWired = true;
    btnTop.addEventListener('click', () => openScrlExport(store, deps));
  }
  const btnInside = document.getElementById('btnOpenScrlExport');
  if (btnInside && !btnInside._scrlWired) {
    btnInside._scrlWired = true;
    btnInside.addEventListener('click', () => { closeModal('mExport'); openScrlExport(store, deps); });
  }
  const go = document.getElementById('scrlGo');
  if (go && !go._scrlWired) {
    go._scrlWired = true;
    go.addEventListener('click', () => doScrlExport(store, deps));
  }
  syncScrlExportUI();
  refreshIcons();
}
// ---- end SCRL-export ----

function init() {
  $('#projName').value = lsStore.get('sb_name') || 'Untitled collage';
  try {
    const t = BUILTIN[2];
    store.S = { size: { ...t.size }, bg: deepClone(t.bg), els: t.els() };
    store.S.els.forEach(e => e.id = uid());
  } catch (err) {
    store.S = { size: { ...SIZES.portrait }, bg: { color: '#EFE7D8', texture: 'paper', grain: 6 }, els: [] };
  }
  // SCRL: deliberate deviation — default single 1080x1350, N=1, guides hidden
  {
    const w = store.S.size.w;
    const derivedN = Math.round(w / SCRL_W_UNIT) || 1;
    const n = Math.max(1, Math.min(SCRL_N_MAX, derivedN));
    store.S.scrl = { n, guidesVisible: n >= SCRL_N_MIN };
  }
  setCanvas(viewDeps);
  wireScrlControls();
  wireScrlExport();
  syncScrlUI();
  after();
  new ResizeObserver(() => fitStage(viewDeps)).observe(stage);
  window.addEventListener('resize', () => fitStage(viewDeps));
  preloadFonts();
  requestAnimationFrame(() => tick(viewDeps));
  refreshIcons();
}

// wiring
wireModals();
wireWheel(viewDeps);
wireTextEditor({ store, dom: { ed, cv, ov, stage }, fx: { syncTextH, fontCss }, mctx, ui: { rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } });

wirePointer({
  store,
  dom: { cv, ov, stage, ed },
  cutRef,
  placingRef,
  refs: pointerRefs,
  ui: {
    rebuildProps: () => rebuildProps(store, propsDeps),
    renderLayers: () => renderLayers(store, layersDeps),
    invalidate,
    closeSheet,
    openSheet,
    closeLib,
    syncNums: () => syncNums(store),
    syncTextH: (el) => syncTextH(el, mctx),
    openTextEditor: (el) => openTextEditor({ store, dom: { ed, cv, ov, stage }, fx: { syncTextH, fontCss }, mctx }, el)
  },
  flags: { snapOn: snapOnRef, spaceDown: spaceDownRef, handleGeomRef }
});

wireLibrary(store, {
  rebuildProps: (s,d) => rebuildProps(s, d || propsDeps),
  renderLayers: (s,d) => renderLayers(s, d || layersDeps),
  invalidate,
  refreshIcons,
  toast,
  openSheet,
  closeSheet,
  closeLib,
  openModal,
  closeModal,
  openTextEditor: (el) => openTextEditor({ store, dom: { ed, cv, ov, stage }, fx: { syncTextH, fontCss }, mctx }, el),
  syncTextH: (el) => syncTextH(el, mctx),
  setCut: (on) => setCut({ store, cutRef, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), closeEd: () => closeEd({ store, dom: { ed } }), closeSheet, invalidate } }, on),
  pasteClip: () => pasteClip({ store, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }),
  fillingRef,
  fillingFrameRef,
  pendingMaskRef,
  cutRef: { value: cutRef },
  cutOnRef: { get value(){ return cutRef.on; } },
  cancelCutSel: () => cancelCutSel({ store, cutRef, ui: { invalidate } }),
  performCutCopy: (isCut) => performCutCopy({ store, cutRef, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }, isCut),
  stopPlacing: (silent) => stopPlacing({ store, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }, silent)
});

wireTopbar(store, {
  toast,
  openTplGallery: (s) => openScrlGallery(s, { h, esc, refreshIcons, toast, openModal, closeModal, confirmBox, confirmChoice, renderScene, assets, mctx, setCanvas: () => setCanvas(viewDeps), after }),
  openExport: (s,d) => openExport(s, { openModal, renderScene, assets, mctx }),
  doExport: (s,d) => doExport(s, { renderScene, assets, mctx, toast, closeModal }),
  applyImperfect: (s) => applyImperfect(s, { imp, toast }),
  undo: () => store.undo(),
  redo: () => store.redo(),
  setCanvas: () => setCanvas(viewDeps),
  fitStage: () => fitStage(viewDeps),
  zoomCenter: (f) => zoomCenter(viewDeps, f),
  snapRef: snapOnRef,
  impRef: imp,
  storeLs: lsStore
});

wireDnd(store, {
  newPhotoFromFiles: async (files, mask, at, s, d) => {
    const { newPhotoFromFiles } = await import('./ui/library.js');
    return newPhotoFromFiles(files, mask, at, s, { ...d, rebuildProps: () => rebuildProps(s, propsDeps), renderLayers: () => renderLayers(s, layersDeps), invalidate, openSheet });
  },
  toCanvas: (e) => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height };
  }
});

wireKeyboard(store, {
  closeSheet, closeLib,
  rebuildProps: (s,d) => rebuildProps(s, d || propsDeps),
  renderLayers: (s,d) => renderLayers(s, d || layersDeps),
  invalidate,
  syncNums: () => syncNums(store),
  beginGesture: () => store.beginGesture(),
  commitHistory: () => store.commitHistory(),
  dupSelected: () => dupSelected(store),
  deleteSelected: () => deleteSelected(store),
  setCut: (on) => setCut({ store, cutRef, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), closeEd: () => closeEd({ store, dom: { ed } }), closeSheet, invalidate } }, on),
  cancelCutSel: () => cancelCutSel({ store, cutRef, ui: { invalidate } }),
  performCutCopy: (isCut) => performCutCopy({ store, cutRef, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }, isCut),
  pasteClip: () => pasteClip({ store, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }),
  stopPlacing: (silent) => stopPlacing({ store, placingRef, dom: { ov }, ui: { toast, rebuildProps: () => rebuildProps(store, propsDeps), renderLayers: () => renderLayers(store, layersDeps), invalidate } }, silent),
  undo: () => store.undo(),
  redo: () => store.redo(),
  cutRef: { value: cutRef },
  placingRef: { value: placingRef.placing },
  clipboardRef: { value: placingRef.clipboard },
  editingRef: { value: store.editingId },
  edEl: ed,
  dragRef: { get value(){ return store.drag; } },
  spaceRef: spaceDownRef,
  ovEl: ov
});

init();
