'use strict';

/*
 * js/app/ops.js — selection ops + imperfection
 * Verbatim bodies from index.html:2410-2453 (only DI added)
 *
 * Signatures (store = createStore() instance, deps = plain bag):
 *   dupSelected(store, deps?) -> void
 *     deps: { deepClone?, uid? } — defaults import from ../lib/dom.js
 *     Body: selIds.map(elById) -> deepClone -> uid -> push after lastIdx -> selIds = copies
 *   deleteSelected(store, deps?) -> void
 *     deps: { caches?:{pc,fc,fxc} (Map with delete), edRef?:HTMLTextAreaElement, closeEd?:()=>void }
 *     Body: pc/fc/fxc.delete per id (if caches supplied) -> S.els filter -> selIds=[]
 *   applyImperfect(store, deps?) -> void
 *     deps: { imp?:{rot,pos,scale}, toast?, syncTextH?, clamp? }
 *     Reads store.S, store.selIds, store.elById, store.mutate; writes el.{rot,x,y,w,h,size}
 *     imp defaults {rot:4,pos:12,scale:2}; toast defaults to chrome toast; syncTextH defaults lib/text
 *
 * No store singleton import; no js/interaction imports; relative ESM with .js extensions.
 */

import { deepClone as _deepClone, uid as _uid, clamp as _clamp } from '../lib/dom.js';
import { syncTextH as _syncTextH } from '../lib/text.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}
function syncTextHWrap(el, mctx) { return _syncTextH(el, mctx || getMctx()); }

export function dupSelected(store, deps = {}) {
  const deepClone = deps.deepClone || _deepClone;
  const uid = deps.uid || _uid;
  const list = store.selIds.map(id => store.elById ? store.elById(id) : store.S.els.find(e => e.id === id)).filter(Boolean);
  if (!list.length) return;
  store.mutate(() => {
    const copies = list.map(el => {
      const c = deepClone(el);
      c.id = uid(); c.x += 26; c.y += 26;
      if (c.slot) c.slot = false;
      return c;
    });
    const lastIdx = store.S.els.indexOf(list[list.length - 1]);
    store.S.els.splice(lastIdx + 1, 0, ...copies);
    store.selIds = copies.map(c => c.id);
  });
}

export function deleteSelected(store, deps = {}) {
  const list = store.selIds.map(id => store.elById ? store.elById(id) : store.S.els.find(e => e.id === id)).filter(Boolean);
  if (!list.length) return;
  const editingId = deps.editingRef ? deps.editingRef.value : (store.editingId != null ? store.editingId : null);
  const edEl = deps.edRef || document.querySelector('#ed');
  if (editingId && store.selIds.includes(editingId)) {
    if (edEl) edEl.value = '';
    if (deps.closeEd) deps.closeEd();
    else if (edEl) edEl.style.display = 'none';
  }
  store.mutate(() => {
    const caches = deps.caches;
    if (caches) {
      list.forEach(el => {
        if (caches.pc) caches.pc.delete(el.id);
        if (caches.fc) caches.fc.delete(el.id);
        if (caches.fxc) caches.fxc.delete(el.id);
      });
    }
    store.S.els = store.S.els.filter(e => !store.selIds.includes(e.id));
    store.selIds = [];
  });
}

export function applyImperfect(store, deps = {}) {
  const imp = deps.imp || { rot: 4, pos: 12, scale: 2 };
  const clamp = deps.clamp || _clamp;
  const toast = deps.toast || ((msg, icon) => {
    // lazy import to avoid cycle; fallback to global toast if present
    if (typeof window !== 'undefined' && window.toast) window.toast(msg, icon);
  });
  const syncTextH = deps.syncTextH || syncTextHWrap;
  const targets = store.selIds.length
    ? store.selIds.map(id => store.elById ? store.elById(id) : store.S.els.find(e => e.id === id)).filter(Boolean)
    : store.S.els.filter(e => e.type !== 'fx' && e.visible && !e.locked);
  if (!targets.length) return;
  store.mutate(() => {
    targets.forEach(el => {
      el.rot = +(el.rot + (Math.random() * 2 - 1) * imp.rot).toFixed(1);
      el.x = Math.round(clamp(el.x + (Math.random() * 2 - 1) * imp.pos, 20, store.S.size.w - 20));
      el.y = Math.round(clamp(el.y + (Math.random() * 2 - 1) * imp.pos, 20, store.S.size.h - 20));
      const s = 1 + (Math.random() * 2 - 1) * imp.scale / 100;
      el.w = Math.round(Math.max(14, el.w * s));
      el.h = Math.round(Math.max(14, el.h * s));
      if (el.type === 'text') { el.size = Math.max(8, Math.round(el.size * s)); syncTextH(el); }
    });
  });
  if (toast) toast('Imperfection applied — undo if too much', 'wand-2');
}
