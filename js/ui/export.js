'use strict';

/*
 * js/ui/export.js — export panel
 * Verbatim from index.html:2567-2612 (only DI added)
 *
 * Signatures (store = createStore() instance, deps = plain bag):
 *   slug(s) -> string                                    — pure
 *   download(blob, name) -> void                         — pure DOM
 *   openExport(store, deps) -> void
 *     deps: { openModal, renderScene, assets, mctx }
 *     Reads store.S, writes #exPrev, #exS1, #exS2, #exFmt, #exQRow
 *   doExport(store, deps) -> Promise<void>
 *     deps: { renderScene, assets, mctx, downloadFn?, toast?, closeModal?, slug? }
 *     Reads #exFmt, #exScale, #exQ, #exTrans, #projName, store.S
 *     Export scales/quality logic byte-identical.
 *
 * No store singleton import; no js/interaction imports.
 * Relative ESM imports with .js extensions.
 */

import { renderScene } from '../elements/render.js';
import { assets as _assets } from '../assets/manager.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}

export function slug(s) { return (s || 'collage').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'collage'; }

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

export function openExport(store, deps = {}) {
  const _openModal = deps.openModal || ((id) => document.getElementById(id).classList.add('open'));
  const _renderScene = deps.renderScene || renderScene;
  const _assets = deps.assets || _assets;
  const _mctx = deps.mctx || getMctx();
  const prev = document.querySelector('#exPrev');
  if (prev) prev.innerHTML = '';
  const maxW = 280;
  const c = document.createElement('canvas');
  c.width = maxW; c.height = Math.round(maxW * store.S.size.h / store.S.size.w);
  const x = c.getContext('2d');
  x.scale(maxW / store.S.size.w, c.height / store.S.size.h);
  _renderScene(x, store.S, {}, { assets: _assets, mctx: _mctx });
  if (prev) prev.appendChild(c);
  const s1 = document.querySelector('#exS1');
  if (s1) s1.textContent = `${store.S.size.w} × ${store.S.size.h}`;
  const s2 = document.querySelector('#exS2');
  if (s2) s2.textContent = `${store.S.size.w * 2} × ${store.S.size.h * 2}`;
  const fmtEl = document.querySelector('#exFmt');
  const fmt = fmtEl ? fmtEl.value : 'png';
  const qRow = document.querySelector('#exQRow');
  if (qRow) qRow.style.display = fmt === 'png' ? 'none' : '';
  _openModal('mExport');
}

export async function doExport(store, deps = {}) {
  const _renderScene = deps.renderScene || renderScene;
  const _assets = deps.assets || _assets;
  const _mctx = deps.mctx || getMctx();
  const _download = deps.download || download;
  const _slug = deps.slug || slug;
  const _toast = deps.toast;
  const _closeModal = deps.closeModal || ((id) => document.getElementById(id).classList.remove('open'));
  const fmtEl = document.querySelector('#exFmt');
  const fmt = fmtEl ? fmtEl.value : 'png';
  const scaleEl = document.querySelector('#exScale');
  const scale = parseInt(scaleEl ? scaleEl.value : '1', 10) || 1;
  const qEl = document.querySelector('#exQ');
  const q = (parseInt(qEl ? qEl.value : '90', 10) || 90) / 100;
  const transEl = document.querySelector('#exTrans');
  const trans = transEl && transEl.checked && fmt === 'png';
  const c = document.createElement('canvas');
  c.width = store.S.size.w * scale; c.height = store.S.size.h * scale;
  const x = c.getContext('2d');
  x.scale(scale, scale);
  _renderScene(x, store.S, { transparent: trans }, { assets: _assets, mctx: _mctx });
  const mime = fmt === 'jpg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
  let blob = await new Promise(r => c.toBlob(r, mime, q));
  let ext = fmt;
  if (!blob || (fmt !== 'png' && blob.type !== mime)) {
    blob = await new Promise(r => c.toBlob(r, 'image/png'));
    ext = 'png';
  }
  if (!blob) { if (_toast) _toast('Export failed in this browser', 'triangle-alert'); return; }
  const projEl = document.querySelector('#projName');
  _download(blob, `${_slug(projEl ? projEl.value : '')}.${ext}`);
  _closeModal('mExport');
  if (_toast) _toast('Collage exported', 'download');
}
