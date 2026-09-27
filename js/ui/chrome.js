'use strict';

/*
 * js/ui/chrome.js — modals, toasts, topbar, mobile sheets, drag&drop, keyboard
 * Verbatim bodies from index.html:503-507, 2614-2811 (only DI added)
 *
 * Signatures (store = createStore() instance, deps = plain bag):
 *   openModal(id) -> void
 *   closeModal(id) -> void
 *   confirmBox(title, body, okLabel?) -> Promise<boolean>
 *     Uses module-local confirmRes; callers await it. No store needed.
 *   toast(msg, icon?) -> void
 *   refreshIcons() -> void
 *   isMobile() -> boolean
 *   openSheet() -> void
 *   closeSheet() -> void
 *   closeLib() -> void
 *   wireModals() -> void                          — wires .mclose/.mback + confirm buttons (call once)
 *   wireTopbar(store, deps) -> void
 *     deps: {
 *       toast?, openTplGallery?, openExport?, doExport?,
 *       applyImperfect?, undo?, redo?, setCanvas?, fitStage?, zoomCenter?,
 *       snapRef?:{value:boolean}, impRef?:{rot,pos,scale}, spaceRef?:{value},
 *       storeLs?:{get,set} — wrapper around localStorage (lib/dom store)
 *     }
 *   wireDnd(store, deps) -> void
 *     deps: { newPhotoFromFiles?, toCanvas? }
 *   wireKeyboard(store, deps) -> void
 *     deps: {
 *       closeSheet?, closeLib?, openSheet?, isMobile?,
 *       rebuildProps?, renderLayers?, invalidate?, syncNums?,
 *       beginGesture?, commitHistory?, dupSelected?, deleteSelected?,
 *       applyImperfect?, setCut?, cancelCutSel?, performCutCopy?, pasteClip?, stopPlacing?,
 *       cutRef?:{value:{on,draw,done}}, placingRef?:{value}, clipboardRef?:{value},
 *       editingRef?:{value}, edRef?:HTMLElement, dragRef?:{value}, ovRef?:HTMLElement,
 *       undo?, redo?
 *     }
 *
 * No store singleton import; no js/interaction imports.
 * Relative ESM imports with .js extensions. HTML strings byte-identical.
 */

import { h, esc } from '../lib/dom.js';

let confirmRes = null;
let confirmMode = 'bool';

export function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
export function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

export function refreshIcons() { if (window.lucide) try { lucide.createIcons(); } catch (e) {} }

export function toast(msg, icon = 'check') {
  const t = h(`<div class="toast"><i data-lucide="${icon}"></i><span>${esc(msg)}</span></div>`);
  const box = document.querySelector('#toasts');
  if (!box) return;
  box.appendChild(t);
  refreshIcons();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2600);
}

export function confirmBox(title, body, okLabel = 'Continue') {
  const t = document.querySelector('#cTitle');
  const b = document.querySelector('#cBody');
  const ok = document.querySelector('#cOk');
  const alt = document.querySelector('#cAlt');
  if (t) t.textContent = title;
  if (b) b.textContent = body;
  if (ok) ok.textContent = okLabel;
  if (alt) alt.style.display = 'none';
  confirmMode = 'bool';
  openModal('mConfirm');
  return new Promise(r => { confirmRes = r; });
}

export function confirmChoice(title, body, okLabel = 'Continue', altLabel = null) {
  const t = document.querySelector('#cTitle');
  const b = document.querySelector('#cBody');
  const ok = document.querySelector('#cOk');
  const alt = document.querySelector('#cAlt');
  const cancel = document.querySelector('#cCancel');
  if (t) t.textContent = title;
  if (b) b.textContent = body;
  if (ok) ok.textContent = okLabel;
  if (alt) {
    if (altLabel) { alt.textContent = altLabel; alt.style.display = ''; }
    else alt.style.display = 'none';
  }
  if (cancel) cancel.style.display = '';
  confirmMode = 'choice';
  openModal('mConfirm');
  return new Promise(r => { confirmRes = r; });
}

export function wireModals() {
  document.querySelectorAll('.mclose').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.m)));
  document.querySelectorAll('.mback').forEach(b => b.addEventListener('pointerdown', e => {
    if (e.target !== b) return;
    if (b.id === 'mConfirm') { const c = document.querySelector('#cCancel'); if (c) c.click(); return; }
    closeModal(b.id);
  }));
  const cOk = document.querySelector('#cOk');
  if (cOk) cOk.addEventListener('click', () => {
    closeModal('mConfirm');
    if (confirmRes) {
      const r = confirmRes; confirmRes = null;
      const mode = confirmMode; confirmMode = 'bool';
      const alt = document.querySelector('#cAlt');
      if (alt) alt.style.display = 'none';
      r(mode === 'choice' ? 'ok' : true);
    }
  });
  const cAlt = document.querySelector('#cAlt');
  if (cAlt) cAlt.addEventListener('click', () => {
    closeModal('mConfirm');
    if (confirmRes) { const r = confirmRes; confirmRes = null; confirmMode = 'bool'; cAlt.style.display = 'none'; r('alt'); }
  });
  const cCancel = document.querySelector('#cCancel');
  if (cCancel) cCancel.addEventListener('click', () => {
    closeModal('mConfirm');
    if (confirmRes) {
      const r = confirmRes; confirmRes = null; confirmMode = 'bool';
      const alt = document.querySelector('#cAlt');
      if (alt) alt.style.display = 'none';
      r(false);
    }
  });
}

// mobile sheets — byte-identical to 503-507
const mqMobile = window.matchMedia ? window.matchMedia('(max-width:860px)') : null;
export function isMobile() { return !!(mqMobile && mqMobile.matches); }
export function openSheet() { if (isMobile()) document.body.classList.add('sheet'); }
export function closeSheet() { document.body.classList.remove('sheet'); }
export function closeLib() { document.body.classList.remove('lib'); document.querySelectorAll('#mobar .mbtn').forEach(b => b.classList.remove('on')); }
if (mqMobile && mqMobile.addEventListener) mqMobile.addEventListener('change', e => { if (!e.matches) { closeSheet(); closeLib(); } });

export function wireTopbar(store, deps = {}) {
  const _toast = deps.toast || toast;
  const _openTplGallery = deps.openTplGallery;
  const _openExport = deps.openExport;
  const _doExport = deps.doExport;
  const _applyImperfect = deps.applyImperfect;
  const _undo = deps.undo || (() => { if (store.undo) store.undo(); });
  const _redo = deps.redo || (() => { if (store.redo) store.redo(); });
  const _setCanvas = deps.setCanvas;
  const _fitStage = deps.fitStage;
  const _zoomCenter = deps.zoomCenter;
  const _storeLs = deps.storeLs;
  const snapRef = deps.snapRef || { value: false };
  const impRef = deps.impRef || { rot: 4, pos: 12, scale: 2 };

  const btnSnap = document.querySelector('#btnSnap');
  if (btnSnap) btnSnap.addEventListener('click', e => {
    snapRef.value = !snapRef.value;
    e.currentTarget.classList.toggle('on', snapRef.value);
    _toast(snapRef.value ? 'Snapping on — guides appear while dragging' : 'Snapping off — stay imperfect', 'magnet');
  });

  const btnImp = document.querySelector('#btnImp');
  if (btnImp) btnImp.addEventListener('click', e => {
    e.stopPropagation();
    const pop = document.querySelector('#impPop');
    if (pop) pop.classList.toggle('open');
  });

  const impGo = document.querySelector('#impGo');
  if (impGo) impGo.addEventListener('click', () => { if (_applyImperfect) _applyImperfect(store, deps); const pop = document.querySelector('#impPop'); if (pop) pop.classList.remove('open'); });

  ;[['impR', 'rot', '°'], ['impP', 'pos', 'px'], ['impS', 'scale', '%']].forEach(([id, k, unit]) => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener('input', e => {
      impRef[k] = parseFloat(e.target.value);
      const v = document.getElementById(id + 'V');
      if (v) v.textContent = e.target.value + unit;
    });
  });

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.impwrap')) { const pop = document.querySelector('#impPop'); if (pop) pop.classList.remove('open'); }
  }, true);

  const btnUndo = document.querySelector('#btnUndo');
  if (btnUndo) btnUndo.addEventListener('click', _undo);
  const btnRedo = document.querySelector('#btnRedo');
  if (btnRedo) btnRedo.addEventListener('click', _redo);
  const btnTpl = document.querySelector('#btnTpl');
  if (btnTpl && _openTplGallery) btnTpl.addEventListener('click', () => _openTplGallery(store, deps));
  const btnExport = document.querySelector('#btnExport');
  if (btnExport && _openExport) btnExport.addEventListener('click', () => _openExport(store, deps));
  const exGo = document.querySelector('#exGo');
  if (exGo && _doExport) exGo.addEventListener('click', () => _doExport(store, deps));
  const exFmt = document.querySelector('#exFmt');
  if (exFmt) exFmt.addEventListener('change', () => { const r = document.querySelector('#exQRow'); if (r) r.style.display = document.querySelector('#exFmt').value === 'png' ? 'none' : ''; });
  const exQ = document.querySelector('#exQ');
  if (exQ) exQ.addEventListener('input', e => { const v = document.querySelector('#exQV'); if (v) v.textContent = e.target.value; });
  const sheetClose = document.querySelector('#sheetClose');
  if (sheetClose) sheetClose.addEventListener('click', closeSheet);
  const zIn = document.querySelector('#zIn');
  if (zIn && _zoomCenter) zIn.addEventListener('click', () => _zoomCenter(1.25, store, deps));
  const zOut = document.querySelector('#zOut');
  if (zOut && _zoomCenter) zOut.addEventListener('click', () => _zoomCenter(1 / 1.25, store, deps));
  const zFit = document.querySelector('#zFit');
  if (zFit) zFit.addEventListener('click', () => { if (store.view) store.view.zoom = 1; if (_fitStage) _fitStage(); });
  const projName = document.querySelector('#projName');
  if (projName) projName.addEventListener('input', e => { if (_storeLs) _storeLs.set('sb_name', e.target.value); else try { localStorage.setItem('sb_name', e.target.value); } catch (_) {} });
}

export function wireDnd(store, deps = {}) {
  const _newPhotoFromFiles = deps.newPhotoFromFiles;
  const _toCanvas = deps.toCanvas;
  const stage = document.querySelector('#stage');
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
  if (!stage) return;
  stage.addEventListener('dragover', e => { e.preventDefault(); stage.classList.add('drag'); });
  stage.addEventListener('dragleave', e => { if (e.target === stage) stage.classList.remove('drag'); });
  stage.addEventListener('drop', async e => {
    e.preventDefault();
    stage.classList.remove('drag');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const p = _toCanvas ? _toCanvas(e) : null;
    if (_newPhotoFromFiles) await _newPhotoFromFiles(files, null, p, store, deps);
  });
}

export function wireKeyboard(store, deps = {}) {
  const _closeSheet = deps.closeSheet || closeSheet;
  const _closeLib = deps.closeLib || closeLib;
  const _rebuildProps = deps.rebuildProps;
  const _renderLayers = deps.renderLayers;
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  const _syncNums = deps.syncNums;
  const _beginGesture = deps.beginGesture || (() => { if (store.beginGesture) store.beginGesture(); });
  const _commitHistory = deps.commitHistory || (() => { if (store.commitHistory) store.commitHistory(); });
  const _dupSelected = deps.dupSelected;
  const _deleteSelected = deps.deleteSelected;
  const _setCut = deps.setCut;
  const _cancelCutSel = deps.cancelCutSel;
  const _performCutCopy = deps.performCutCopy;
  const _pasteClip = deps.pasteClip;
  const _stopPlacing = deps.stopPlacing;
  const _undo = deps.undo || (() => { if (store.undo) store.undo(); });
  const _redo = deps.redo || (() => { if (store.redo) store.redo(); });
  const cutRef = deps.cutRef || { value: { on: false, draw: false, done: false } };
  const placingRef = deps.placingRef || { value: null };
  const clipboardRef = deps.clipboardRef || { value: null };
  const editingRef = deps.editingRef || { value: null };
  const dragRef = deps.dragRef || { value: null };
  const spaceRef = deps.spaceRef || { value: false };
  const ovEl = deps.ovEl || document.querySelector('#ov');
  const edEl = deps.edEl || document.querySelector('#ed');

  document.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      spaceRef.value = false;
      const cutOn = cutRef.value ? cutRef.value.on : false;
      const placing = placingRef.value;
      if (!dragRef.value && !cutOn && !placing && ovEl) ovEl.style.cursor = 'default';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('.mback.open')];
      if (open.length) {
        const m = open[open.length - 1];
        if (m.id === 'mConfirm') { const c = document.querySelector('#cCancel'); if (c) c.click(); return; }
        closeModal(m.id); return;
      }
      if (document.body.classList.contains('lib')) { _closeLib(); return; }
      if (document.body.classList.contains('sheet')) { _closeSheet(); return; }
      if (placingRef.value) { if (_stopPlacing) _stopPlacing(false); return; }
      const cut = cutRef.value;
      if (cut && cut.on) {
        if (cut.draw || cut.done) { if (_cancelCutSel) _cancelCutSel(); }
        else if (_setCut) _setCut(false);
        return;
      }
      if (editingRef.value) { if (edEl) edEl.blur(); return; }
      store.selIds = [];
      if (_rebuildProps) _rebuildProps(store, deps);
      if (_renderLayers) _renderLayers(store, deps);
      _invalidate();
      return;
    }
    const typing = e.target.matches('input,textarea,select') || e.target.isContentEditable;
    if (typing) return;
    if (e.code === 'Space') {
      e.preventDefault(); spaceRef.value = true;
      const cutOn = cutRef.value ? cutRef.value.on : false;
      const placing = placingRef.value;
      if (!cutOn && !placing && ovEl) ovEl.style.cursor = 'grab';
      return;
    }
    const k = e.key.toLowerCase();
    const cut = cutRef.value;
    if ((e.ctrlKey || e.metaKey) && k === 'x' && cut && cut.done) { e.preventDefault(); if (_performCutCopy) _performCutCopy(true); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'c' && cut && cut.done) { e.preventDefault(); if (_performCutCopy) _performCutCopy(false); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'v' && clipboardRef.value) { e.preventDefault(); if (_pasteClip) _pasteClip(); return; }
    if (k === 'c' && !e.ctrlKey && !e.metaKey) { if (_setCut) _setCut(!cut.on); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? _redo() : _undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); _redo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); if (store.selIds.length && _dupSelected) _dupSelected(store, deps); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && store.selIds.length) { e.preventDefault(); if (_deleteSelected) _deleteSelected(store, deps); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && store.selIds.length) {
      const d = e.shiftKey ? 20 : 2;
      e.preventDefault();
      if (!store.gestureSnap) { _beginGesture(); if ('gestureDirty' in store) store.gestureDirty = true; }
      store.selIds.forEach(id => {
        const el = store.elById ? store.elById(id) : store.S.els.find(x => x.id === id);
        if (!el || el.locked) return;
        if (e.key === 'ArrowLeft') el.x -= d;
        if (e.key === 'ArrowRight') el.x += d;
        if (e.key === 'ArrowUp') el.y -= d;
        if (e.key === 'ArrowDown') el.y += d;
      });
      _invalidate(); if (_syncNums) _syncNums(store);
      clearTimeout(window.__nt);
      window.__nt = setTimeout(() => { _commitHistory(); }, 650);
    }
  });
}
