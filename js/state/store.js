'use strict';

import { SIZES } from '../config/constants.js';
import { $ } from '../lib/dom.js';

// Parameterized globals (injection avoids UI/render cycles):
// - onAfter: () => void — replaces after() [rebuildProps+renderLayers+invalidate] (default: no-op, subscribe() notifies UI instead)
// - onSetCanvas: () => void — replaces setCanvas() (canvas resize; caller provides or subscribe handles)
// - onUpdateHistoryBtns: () => void — replaces direct DOM update; if omitted, fallback queries #btnUndo/#btnRedo via `../lib/dom.js:$`
// - _ed: {style,value} — editor textarea; applySnap clears it. If omitted, DOM clear skipped (caller handles via subscribe)
// Caller (main.js) will compose: createStore({ onAfter: () => { rebuildProps(); renderLayers(); invalidate(); }, onSetCanvas: setCanvas })
// ponytail: no persistence; add when needed via store subscription syncing to localStorage.

export function createStore(opts = {}) {
  const onAfter = opts.onAfter || null;
  const onSetCanvas = opts.onSetCanvas || null;
  const onUpdateHistoryBtns = opts.onUpdateHistoryBtns || null;
  const _ed = opts.ed || null; // optional textarea element

  let S = { size: { ...SIZES.portrait }, bg: { color: '#EFE7D8', texture: 'paper', grain: 6 }, els: [] };
  let selIds = [];
  let view = { zoom: 1, scale: 1 };
  let undoStack = [], redoStack = [], gestureSnap = null, gestureDirty = false;
  // secondary state kept for applySnap/mutate parity with index.html:485-510
  let editingId = null;
  let drag = null;
  let guides = { v: [], h: [] };
  let needs = true;

  const subs = new Set();
  function notify() { for (const fn of subs) try { fn(getState()); } catch (_) {} }

  function getState() { return { S, selIds, view, undoStack, redoStack, gestureSnap, gestureDirty, editingId, drag, guides, needs }; }
  function setState(patch) {
    if ('S' in patch) S = patch.S;
    if ('selIds' in patch) selIds = patch.selIds;
    if ('view' in patch) view = patch.view;
    if ('undoStack' in patch) undoStack = patch.undoStack;
    if ('redoStack' in patch) redoStack = patch.redoStack;
    if ('gestureSnap' in patch) gestureSnap = patch.gestureSnap;
    if ('gestureDirty' in patch) gestureDirty = patch.gestureDirty;
    if ('editingId' in patch) editingId = patch.editingId;
    if ('drag' in patch) drag = patch.drag;
    if ('guides' in patch) guides = patch.guides;
    if ('needs' in patch) needs = patch.needs;
    notify();
  }
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

  function elById(id) { return S.els.find(e => e.id === id); }
  function single() { return selIds.length === 1 ? elById(selIds[0]) : null; }
  function invalidate() { needs = true; notify(); }

  // verbatim from index.html:1782
  function snapshot() { return JSON.stringify(S); }
  function beginGesture() { gestureSnap = snapshot(); gestureDirty = false; }
  function updateHistoryBtns() {
    if (onUpdateHistoryBtns) { onUpdateHistoryBtns(undoStack.length, redoStack.length); return; }
    if (typeof document === 'undefined') return;
    const u = $('#btnUndo'), r = $('#btnRedo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }
  function _after() { if (onAfter) onAfter(); notify(); }
  function _setCanvas() { if (onSetCanvas) onSetCanvas(); }
  function commitHistory() {
    if (gestureSnap != null && gestureDirty) {
      undoStack.push(gestureSnap);
      if (undoStack.length > 60) undoStack.shift();
      redoStack.length = 0;
    }
    gestureSnap = null; gestureDirty = false; updateHistoryBtns();
  }
  function mutate(fn) {
    undoStack.push(snapshot());
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
    try { fn(); } finally { _after(); }
    updateHistoryBtns();
  }
  function applySnap(s) {
    S = JSON.parse(s);
    selIds = selIds.filter(id => elById(id));
    editingId = null;
    if (_ed) { _ed.style.display = 'none'; _ed.value = ''; }
    drag = null; guides = { v: [], h: [] };
    _setCanvas(); _after();
  }
  function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); applySnap(undoStack.pop()); }
  function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); applySnap(redoStack.pop()); }

  // expose live bindings via getters so destructured refs stay fresh if caller keeps store object
  return {
    // state (live via getters/setters)
    get S() { return S; }, set S(v) { S = v; notify(); },
    get selIds() { return selIds; }, set selIds(v) { selIds = v; notify(); },
    get view() { return view; }, set view(v) { view = v; notify(); },
    get undoStack() { return undoStack; },
    get redoStack() { return redoStack; },
    get gestureSnap() { return gestureSnap; }, set gestureSnap(v) { gestureSnap = v; },
    get gestureDirty() { return gestureDirty; }, set gestureDirty(v) { gestureDirty = v; },
    get editingId() { return editingId; }, set editingId(v) { editingId = v; },
    get drag() { return drag; }, set drag(v) { drag = v; },
    get guides() { return guides; }, set guides(v) { guides = v; },
    get needs() { return needs; }, set needs(v) { needs = v; },
    // core API
    getState, setState, subscribe,
    elById, single, invalidate,
    snapshot, beginGesture, commitHistory, mutate, applySnap, undo, redo, updateHistoryBtns,
  };
}

// named re-exports for callers that prefer singleton-style import (main.js will call createStore once)
export const storeHelp = { createStore };
