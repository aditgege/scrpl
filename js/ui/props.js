'use strict';

/*
 * js/ui/props.js — properties panel
 * Verbatim from index.html:2036-2408 (only DI added)
 *
 * Signatures (store = createStore() instance, deps = plain bag):
 *   adjRow(label,id,min,max,v) -> string
 *   shadowHTML(el,n) -> string
 *   commonHTML(el,n) -> string
 *   multiHTML(store) -> string                 — reads store.selIds.length
 *   propsHTML(el) -> string                    — reads MASKS/STICKERS/FONTS
 *   bgHTML(store) -> string                    — reads store.S, PALETTE, SIZES
 *   rebuildProps(store, deps) -> void
 *     deps: { bindProps?, bindBgProps?, syncNums?, dupSelected?, deleteSelected?, applyImperfect?, refreshIcons?, invalidate? }
 *   seg(id, fn) -> void                        — fn(value:string)
 *   syncNums(store) -> void                    — reads store.single()/store.S
 *   bindCommon(el, store, deps) -> void
 *     deps: { invalidate?, dupSelected?, deleteSelected? }
 *   bindProps(el, store, deps) -> void
 *     deps: { invalidate?, rebuildProps?, renderLayers?, startPlacing?, fillingRef?:{value}, fillingFrameRef?:{value} }
 *   bindBgProps(store, deps) -> void
 *     deps: { invalidate?, applyImperfect?, setCanvas?, fitStage? }
 *
 * No store singleton import; no js/interaction imports; constants imported directly.
 * Relative ESM imports with .js extensions.
 */

import { esc, clamp } from '../lib/dom.js';
import { MASKS, PALETTE, SIZES, FONTS, STICKERS, FXDEF, PADDEF } from '../config/constants.js';
import { SCRL_W_UNIT, SCRL_N_MIN, scrlGuides } from '../config/scrl.js';
import { elCrossesGuides } from '../scrl/crossing.js';
import { fitFilmH } from '../elements/factories.js';
import { syncTextH as _syncTextH } from '../lib/text.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}
function syncTextHWrap(el) { return _syncTextH(el, getMctx()); }

export function adjRow(label, id, min, max, v) { return `<div class="f"><span>${label} <b id="${id}V">${v}</b></span><input type="range" id="${id}" min="${min}" max="${max}" value="${v}"></div>`; }

export function shadowHTML(el, n) {
  const sh = Object.assign({ on: false, color: '#26201A', blur: 30, x: 0, y: 12, a: 30 }, el.shadow || {});
  return `
  <div class="sec-head"><span>${n} · Shadow</span></div>
  <label class="checkrow"><input type="checkbox" id="sdwOn" ${sh.on ? 'checked' : ''}><span>Cast a paper shadow</span></label>
  ${sh.on ? `
  <label class="f" style="margin-top:6px"><span>Color</span><input type="color" id="sdwC" value="${/^#[0-9a-f]{6}$/i.test(sh.color) ? sh.color : '#26201A'}"></label>
  ${adjRow('Opacity', 'sdwA', 0, 100, sh.a)}
  ${adjRow('Blur', 'sdwBl', 0, 120, sh.blur)}
  ${adjRow('Offset X', 'sdwX', -100, 100, sh.x)}
  ${adjRow('Offset Y', 'sdwY', -100, 100, sh.y)}` : ''}`;
}

export function commonHTML(el, n) {
  return `
  <div class="sec-head"><span>01 · ${el.type === 'snippet' ? 'cut-out' : el.type}</span><span class="sh-r">${el.locked ? 'locked' : ''}</span></div>
  <div class="grid2">
    <label class="f"><span>X</span><input type="number" id="nX" step="1" value="${Math.round(el.x)}"></label>
    <label class="f"><span>Y</span><input type="number" id="nY" step="1" value="${Math.round(el.y)}"></label>
    <label class="f"><span>W</span><input type="number" id="nW" step="1" value="${Math.round(el.w)}"></label>
    <label class="f"><span>H</span><input type="number" id="nH" step="1" value="${Math.round(el.h)}" ${el.type === 'text' ? 'disabled title="Height follows the text"' : ''}></label>
  </div>
  <div class="grid2" style="margin-top:10px;margin-bottom:10px">
    <label class="f"><span>Angle °</span><input type="number" id="nR" step="0.5" value="${(Math.round(el.rot * 10) / 10) || 0}"></label>
    <label class="f"><span>Opacity %</span><input type="number" id="nO" step="1" min="0" max="100" value="${Math.round((el.opacity == null ? 1 : el.opacity) * 100)}"></label>
  </div>
  ${shadowHTML(el, n)}
  <div class="sec-head"><span>Arrange</span></div>
  <div class="btnrow">
    <button class="btn sm" id="aFront"><i data-lucide="chevrons-up"></i>Front</button>
    <button class="btn sm" id="aBack"><i data-lucide="chevrons-down"></i>Back</button>
    <button class="btn sm" id="aDup"><i data-lucide="copy"></i>Duplicate</button>
    <button class="btn sm danger" id="aDel"><i data-lucide="trash-2"></i>Delete</button>
  </div>`;
}

export function multiHTML(store) {
  const n = store ? store.selIds.length : 0;
  return `
  <div class="sec-head"><span>${n} elements selected</span></div>
  <p class="hint" style="margin-bottom:10px">Drag moves all · Shift-click to add or remove from the selection.</p>
  <div class="btnrow">
    <button class="btn sm acc" id="mImp"><i data-lucide="wand-2"></i>Imperfect these</button>
    <button class="btn sm" id="mDup"><i data-lucide="copy"></i>Duplicate</button>
    <button class="btn sm danger" id="mDel"><i data-lucide="trash-2"></i>Delete</button>
  </div>`;
}

export function propsHTML(el) {
  let t = '';
  if (el.type === 'photo') {
    const F = Object.assign({ bright: 100, contrast: 100, sepia: 0, grain: 0, fade: 0 }, el.filters);
    t = `
    <div class="sec-head"><span>02 · Image</span></div>
    <button class="btn sm acc block" id="imFill"><i data-lucide="${el.assetId ? 'refresh-cw' : 'image'}"></i>${el.assetId ? 'Replace photo' : 'Fill slot with photo'}</button>
    <label class="f" style="margin-top:10px"><span>Frame / mask</span>
      <select id="imMask">${MASKS.map(m => `<option value="${m}" ${el.mask === m ? 'selected' : ''}>${m[0].toUpperCase() + m.slice(1)}</option>`).join('')}</select></label>
    ${el.mask !== 'none' && el.mask !== 'rounded' ? `<label class="f"><span>Frame thickness</span><input type="range" id="imPad" min="0" max="80" value="${el.pad || 0}"></label>` : ''}
    ${el.mask === 'polaroid' || el.mask === 'stamp' || el.mask === 'torn' || el.mask === 'film' || el.mask === 'circle' || el.mask === 'organic' ? `<label class="f"><span>Frame color</span><input type="color" id="imMaskC" value="${/^#[0-9a-f]{6}$/i.test(el.maskColor) ? el.maskColor : '#F7F2E7'}"></label>` : ''}
    ${el.mask === 'none' || el.mask === 'rounded' ? `<div class="f"><span>Corner radius</span><input type="range" id="imRad" min="0" max="300" value="${el.radius || 0}"></div>` : ''}
    <div class="sec-head"><span>03 · Photo inside frame</span></div>
    ${adjRow('Zoom', 'imPz', 100, 260, Math.round((el.pzoom || 1) * 100))}
    ${adjRow('Pan X', 'imPx', -40, 40, Math.round((el.px || 0) * 100))}
    ${adjRow('Pan Y', 'imPy', -40, 40, Math.round((el.py || 0) * 100))}
    <button class="btn sm block" id="imReseed" style="margin-top:2px"><i data-lucide="shuffle"></i>Reshuffle torn edge</button>
    <div class="sec-head"><span>04 · Treatment</span></div>
    <div class="miniseg" id="imPreset" style="margin-bottom:10px">
      <button data-v="normal" class="${!F.sepia && !F.grain ? 'on' : ''}">NORMAL</button>
      <button data-v="vintage" class="${F.sepia >= 30 ? 'on' : ''}">VINTAGE</button>
      <button data-v="film" class="${F.grain >= 25 && !F.sepia ? 'on' : ''}">FILM</button>
    </div>
    ${adjRow('Brightness', 'imB', 60, 150, F.bright)}
    ${adjRow('Contrast', 'imC', 60, 150, F.contrast)}
    ${adjRow('Sepia', 'imSe', 0, 100, F.sepia)}
    ${adjRow('Grain', 'imGr', 0, 100, F.grain)}
    ${adjRow('Faded edges', 'imFd', 0, 100, F.fade)}
    <div class="sec-head"><span>05 · Template slot</span></div>
    <label class="checkrow"><input type="checkbox" id="slotC" ${el.slot ? 'checked' : ''}><span>Mark as fillable slot</span></label>
    <label class="f"><span>Slot label</span><input type="text" id="slotL" placeholder="PHOTO · STAMP · LOGO" value="${esc(el.slotLabel || '')}"></label>`;
  } else if (el.type === 'film') {
    t = `
    <div class="sec-head"><span>02 · Strip</span></div>
    <div class="f"><span>Frames</span>
      <div class="stepper">
        <button type="button" id="fmMinus">−</button>
        <input type="number" id="fmN" min="2" max="8" value="${el.n}">
        <button type="button" id="fmPlus">+</button>
      </div></div>
    <div class="f"><span>Direction</span><div class="miniseg" id="fmOr">
      <button data-v="v" class="${el.orient !== 'h' ? 'on' : ''}">VERTICAL</button>
      <button data-v="h" class="${el.orient === 'h' ? 'on' : ''}">HORIZONTAL</button>
    </div></div>
    <label class="f"><span>Film color</span><input type="color" id="fmC" value="${/^#[0-9a-f]{6}$/i.test(el.filmColor) ? el.filmColor : '#211C16'}"></label>
    ${adjRow('Gutter', 'fmG', 4, 40, el.gutter == null ? 12 : el.gutter)}
    ${adjRow('Warm tone', 'fmT', 0, 100, el.tone == null ? 25 : el.tone)}
    ${adjRow('Strip grain', 'fmGr', 0, 100, el.grain == null ? 16 : el.grain)}
    <label class="checkrow"><input type="checkbox" id="fmSp" ${el.sprocket ? 'checked' : ''}><span>Sprocket holes</span></label>
    <div class="sec-head"><span>03 · Frames</span><span class="sh-r">DOUBLE-CLICK TO FILL</span></div>
    ${(el.frames || []).map((f, i) => `
      <div class="btnrow" style="margin-bottom:6px">
        <button class="btn sm ${f ? '' : 'acc'}" data-fi="${i}" id="fmFill${i}"><i data-lucide="${f ? 'refresh-cw' : 'image'}"></i>Frame ${i + 1}</button>
        ${f ? `<button class="btn sm danger" data-fi="${i}" id="fmClr${i}"><i data-lucide="x"></i></button>` : ''}
      </div>`).join('')}`;
  } else if (el.type === 'snippet') {
    t = `
    <div class="sec-head"><span>02 · Cut-out piece</span></div>
    <p class="hint">A piece lifted from the canvas. Drag, rotate, layer and duplicate it like any sticker.</p>
    <button class="btn sm acc block" id="snMore" style="margin-top:8px"><i data-lucide="clipboard-paste"></i>Place more copies</button>`;
  } else if (el.type === 'sticker') {
    t = `
    <div class="sec-head"><span>02 · Sticker</span></div>
    <div class="f"><span>Kind</span><div class="miniseg" id="stKind" style="overflow-x:auto">
      ${STICKERS.map(k => `<button data-v="${k}" class="${el.kind === k ? 'on' : ''}" style="min-width:52px">${k.toUpperCase()}</button>`).join('')}
    </div></div>
    <label class="f" style="margin-top:10px"><span>Color</span><input type="color" id="stC" value="${/^#[0-9a-f]{6}$/i.test(el.fill) ? el.fill : '#B9552F'}"></label>
    <div class="f"><span>Style</span><div class="miniseg" id="stStyle">
      <button data-v="solid" class="${el.style !== 'outline' ? 'on' : ''}">SOLID</button>
      <button data-v="outline" class="${el.style === 'outline' ? 'on' : ''}">OUTLINE</button>
    </div></div>`;
  } else if (el.type === 'paper') {
    t = `
    <div class="sec-head"><span>02 · Paper</span></div>
    <label class="f"><span>Paper color</span><input type="color" id="ppC" value="${/^#[0-9a-f]{6}$/i.test(el.fill) ? el.fill : '#F1EADA'}"></label>
    <button class="btn sm block" id="ppReseed" style="margin-top:2px"><i data-lucide="shuffle"></i>Reshuffle edges</button>`;
  } else if (el.type === 'text') {
    const fonts = FONTS.map(f => `<option ${el.font === f.name ? 'selected' : ''}>${f.name}</option>`).join('');
    t = `
    <div class="sec-head"><span>02 · Text</span></div>
    <label class="f"><span>Content</span><textarea id="tT" rows="3">${esc(el.text)}</textarea></label>
    <label class="f"><span>Font</span><select id="tF">${fonts}</select></label>
    <div class="grid2">
      <label class="f"><span>Size</span><input type="number" id="tSz" min="8" step="1" value="${el.size}"></label>
      <label class="f"><span>Weight</span><select id="tW">${[400, 500, 600, 700].map(w => `<option ${el.weight == w ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
    </div>
    <div class="grid2" style="margin-top:10px">
      <label class="f"><span>Color</span><input type="color" id="tC" value="${el.color}"></label>
      <label class="f"><span>Wrap width</span><input type="number" id="tWd" min="40" value="${Math.round(el.w)}"></label>
    </div>
    <div class="grid2" style="margin-top:10px">
      <label class="f"><span>Letter spacing</span><input type="number" id="tLs" step="0.5" value="${el.ls || 0}"></label>
      <label class="f"><span>Line height</span><input type="number" id="tLh" step="0.05" min="0.6" value="${el.lh}"></label>
    </div>
    <div class="f" style="margin-top:10px"><span>Align</span><div class="miniseg" id="tAl">
      <button data-v="left" class="${el.align === 'left' ? 'on' : ''}"><i data-lucide="align-left"></i></button>
      <button data-v="center" class="${el.align === 'center' ? 'on' : ''}"><i data-lucide="align-center"></i></button>
      <button data-v="right" class="${el.align === 'right' ? 'on' : ''}"><i data-lucide="align-right"></i></button>
    </div></div>
    <div class="f" style="margin-top:10px"><span>Ink</span><div class="miniseg" id="tInk">
      <button data-v="plain" class="${el.ink === 'plain' ? 'on' : ''}">PLAIN</button>
      <button data-v="stamp" class="${el.ink === 'stamp' ? 'on' : ''}">STAMP</button>
      <button data-v="faded" class="${el.ink === 'faded' ? 'on' : ''}">FADED</button>
    </div></div>
    <label class="checkrow" style="margin-top:8px"><input type="checkbox" id="tUp" ${el.upper ? 'checked' : ''}><span>UPPERCASE</span></label>`;
  } else if (el.type === 'fx') {
    t = `
    <div class="sec-head"><span>02 · Effect</span><span class="sh-r">${el.kind.toUpperCase()}</span></div>
    ${adjRow('Amount', 'fxA', 0, 100, el.amount == null ? FXDEF[el.kind] : el.amount)}
    ${el.kind === 'leak' ? `
    <label class="f"><span>Leak color</span><input type="color" id="fxC" value="${/^#[0-9a-f]{6}$/i.test(el.color) ? el.color : '#FF9A3C'}"></label>
    <label class="f"><span>Corner</span><select id="fxCorner">
      <option value="0" ${el.corner === 0 ? 'selected' : ''}>Top left</option>
      <option value="1" ${el.corner == null || el.corner === 1 ? 'selected' : ''}>Top right</option>
      <option value="2" ${el.corner === 2 ? 'selected' : ''}>Bottom right</option>
      <option value="3" ${el.corner === 3 ? 'selected' : ''}>Bottom left</option>
    </select></label>` : ''}
    ${(el.kind === 'dust' || el.kind === 'scratch') ? `<button class="btn sm block" id="fxReseed" style="margin-top:4px"><i data-lucide="shuffle"></i>Reshuffle</button>` : ''}
    <p class="hint">Overlay effects sit on top of the stack — reorder them in the Layers list to control depth.</p>`;
  }
  const shadowN = el.type === 'photo' ? 5 : (el.type === 'film' ? 4 : 3);
  return commonHTML(el, shadowN) + t;
}

export function bgHTML(store) {
  const S = store.S;
  const sw = PALETTE.map(c => `<button class="sw ${S.bg.color === c ? 'on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('');
  return `
  <div class="sec-head"><span>01 · Background</span></div>
  <div class="f"><span>Color</span><div class="swatches">${sw}
    <label class="sw custom" title="Custom color"><input type="color" id="bgCustom" value="${/^#[0-9a-f]{6}$/i.test(S.bg.color) ? S.bg.color : '#EFE7D8'}"><i data-lucide="plus"></i></label>
  </div></div>
  <label class="f" style="margin-top:10px"><span>Texture</span><select id="bgTex">
    <option value="plain" ${S.bg.texture === 'plain' ? 'selected' : ''}>Plain</option>
    <option value="paper" ${!S.bg.texture || S.bg.texture === 'paper' ? 'selected' : ''}>Paper</option>
    <option value="kraft" ${S.bg.texture === 'kraft' ? 'selected' : ''}>Kraft</option>
    <option value="dots" ${S.bg.texture === 'dots' ? 'selected' : ''}>Dotted</option>
    <option value="grid" ${S.bg.texture === 'grid' ? 'selected' : ''}>Grid</option>
  </select></label>
  <div class="f"><span>Grain</span><input type="range" id="bgGrain" min="0" max="100" value="${S.bg.grain || 0}"></div>
  <div class="sec-head"><span>02 · Canvas</span></div>
  <div class="f"><span>Ratio</span><div class="ratiogrid" id="ratioGrid">
    ${Object.entries(SIZES).map(([k, d]) => `<button data-k="${k}" class="${S.size.w === d.w && S.size.h === d.h ? 'on' : ''}">${d.label}<small>${d.w}×${d.h}</small></button>`).join('')}
  </div></div>
  <p class="hint" style="margin-top:8px">Current: <b>${S.size.w} × ${S.size.h} px</b> · switching ratio rescales the composition.</p>
  <div class="sec-head"><span>03 · Quick actions</span></div>
  <button class="btn sm block acc" id="bgImp"><i data-lucide="wand-2"></i>Make everything imperfect</button>`;
}

function scrlCrossBadgeHTML(el, store) {
  if (!el || !store || !store.S) return '';
  const sc = store.S.scrl;
  const n = sc && typeof sc.n === 'number' ? Math.round(sc.n) : Math.round((store.S.size.w / SCRL_W_UNIT) || 1);
  if (n < SCRL_N_MIN) return '';
  const guides = scrlGuides(n);
  if (!guides.v.length) return '';
  // ponytail: crossing uses AABB (conservative at ~45°); text h assumed synced via syncTextH
  if (!elCrossesGuides(el, guides.v)) return '';
  return `<div style="display:flex;align-items:center;gap:8px;background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:8px;padding:8px 10px;margin-bottom:12px;font:600 11px var(--ui)"><i data-lucide="alert-triangle" style="width:14px;height:14px;flex:none"></i><span>lintas batas — elemen terpotong di batas slide</span></div>`;
}

export function rebuildProps(store, deps = {}) {
  const box = document.querySelector('#props');
  if (!box) return;
  const selIds = store.selIds;
  const _refreshIcons = deps.refreshIcons || (() => { if (window.lucide) try { lucide.createIcons(); } catch (e) {} });
  const _bindProps = deps.bindProps || bindProps;
  const _bindBgProps = deps.bindBgProps || bindBgProps;
  const _syncNums = deps.syncNums || syncNums;
  if (selIds.length > 1) {
    // lintas-batas badge for multi: if any selected crosses, show warning (non-blocking)
    let multiBadge = '';
    try {
      const sc = store.S && store.S.scrl;
      const n = sc && typeof sc.n === 'number' ? Math.round(sc.n) : Math.round((store.S.size.w / SCRL_W_UNIT) || 1);
      if (n >= SCRL_N_MIN) {
        const guides = scrlGuides(n);
        const els = selIds.map(id => store.elById ? store.elById(id) : store.S.els.find(e => e.id === id)).filter(Boolean);
        const any = els.some(e => elCrossesGuides(e, guides.v));
        if (any) multiBadge = `<div style="display:flex;align-items:center;gap:8px;background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:8px;padding:8px 10px;margin-bottom:12px;font:600 11px var(--ui)"><i data-lucide="alert-triangle" style="width:14px;height:14px;flex:none"></i><span>lintas batas — salah satu elemen terpotong</span></div>`;
      }
    } catch (_) {}
    box.innerHTML = multiBadge + multiHTML(store);
    const mImp = document.getElementById('mImp');
    if (mImp && deps.applyImperfect) mImp.addEventListener('click', deps.applyImperfect);
    const mDup = document.getElementById('mDup');
    if (mDup && deps.dupSelected) mDup.addEventListener('click', deps.dupSelected);
    const mDel = document.getElementById('mDel');
    if (mDel && deps.deleteSelected) mDel.addEventListener('click', deps.deleteSelected);
    _refreshIcons();
    return;
  }
  const el = store.single ? store.single() : (selIds.length === 1 ? store.S.els.find(e => e.id === selIds[0]) : null);
  const badge = scrlCrossBadgeHTML(el, store);
  box.innerHTML = el ? (badge + propsHTML(el)) : bgHTML(store);
  if (el) _bindProps(el, store, deps); else _bindBgProps(store, deps);
  if (el) _syncNums(store);
  _refreshIcons();
}

export function seg(id, fn) {
  const el = document.getElementById(id); if (!el) return;
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); fn(b.dataset.v);
  }));
}

export function syncNums(store) {
  const el = store.single ? store.single() : (store.selIds.length === 1 ? store.S.els.find(e => e.id === store.selIds[0]) : null);
  if (!el) return;
  const map = { nX: el.x, nY: el.y, nW: el.w, nH: el.h, nR: el.rot || 0 };
  for (const id in map) {
    const inp = document.getElementById(id);
    if (inp && document.activeElement !== inp) inp.value = Math.round(map[id] * 10) / 10;
  }
}

export function bindCommon(el, store, deps = {}) {
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  const g = id => document.getElementById(id);
  const num = (id, fn) => { const inp = g(id); if (inp) inp.addEventListener('input', e => { const v = parseFloat(e.target.value); if (isNaN(v)) return; fn(v); _invalidate(); }); };
  num('nX', v => el.x = v); num('nY', v => el.y = v);
  num('nW', v => { el.w = Math.max(8, v); if (el.type === 'text') syncTextHWrap(el); if (el.type === 'film') fitFilmH(el); });
  num('nH', v => { el.h = Math.max(8, v); });
  num('nR', v => el.rot = v);
  const o = g('nO');
  if (o) o.addEventListener('input', e => { el.opacity = clamp(parseFloat(e.target.value), 0, 100) / 100; _invalidate(); });
  const sw = g('sdwOn');
  if (sw) sw.addEventListener('change', e => { store.mutate(() => { el.shadow = Object.assign({ on: false, color: '#26201A', blur: 30, x: 0, y: 12, a: 30 }, el.shadow, { on: e.target.checked }); }); });
  const sc = g('sdwC');
  if (sc) sc.addEventListener('input', e => { el.shadow = el.shadow || {}; el.shadow.color = e.target.value; _invalidate(); });
  ;['A', 'Bl', 'X', 'Y'].forEach((k, i) => {
    const inp = g('sdw' + k);
    if (inp) inp.addEventListener('input', e => {
      el.shadow = el.shadow || {};
      const key = ['a', 'blur', 'x', 'y'][i];
      el.shadow[key] = parseFloat(e.target.value) || 0;
      const v = g('sdw' + k + 'V'); if (v) v.textContent = e.target.value;
      _invalidate();
    });
  });
  const a = g('aFront'); if (a) a.addEventListener('click', () => store.mutate(() => { const i = store.S.els.indexOf(el); store.S.els.splice(i, 1); store.S.els.push(el); }));
  const b = g('aBack'); if (b) b.addEventListener('click', () => store.mutate(() => { const i = store.S.els.indexOf(el); store.S.els.splice(i, 1); store.S.els.unshift(el); }));
  const d = g('aDup'); if (d && deps.dupSelected) d.addEventListener('click', deps.dupSelected);
  const del = g('aDel'); if (del && deps.deleteSelected) del.addEventListener('click', deps.deleteSelected);
}

export function bindProps(el, store, deps = {}) {
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  const _rebuildProps = deps.rebuildProps || rebuildProps;
  const g = id => document.getElementById(id);
  bindCommon(el, store, deps);
  const on = (id, ev, fn) => { const inp = g(id); if (inp) inp.addEventListener(ev, fn); };
  if (el.type === 'photo') {
    on('imFill', 'click', () => { if (deps.fillingRef) deps.fillingRef.value = el.id; const fi = document.querySelector('#fileInput'); if (fi) fi.click(); });
    on('imMask', 'change', e => { store.mutate(() => { el.mask = e.target.value; el.pad = PADDEF[el.mask] || 0; }); _rebuildProps(store, deps); });
    on('imPad', 'input', e => { el.pad = +e.target.value; _invalidate(); });
    on('imMaskC', 'input', e => { el.maskColor = e.target.value; _invalidate(); });
    on('imRad', 'input', e => { el.radius = +e.target.value; _invalidate(); });
    const adj = (id, k, scale) => on(id, 'input', e => {
      const v = parseFloat(e.target.value);
      el[k] = scale ? v / scale : v;
      const lb = g(id + 'V'); if (lb) lb.textContent = e.target.value;
      _invalidate();
    });
    adj('imPz', 'pzoom', 100); adj('imPx', 'px', 100); adj('imPy', 'py', 100);
    adj('imB', 'filters.bright'); adj('imC', 'filters.contrast'); adj('imSe', 'filters.sepia');
    adj('imGr', 'filters.grain'); adj('imFd', 'filters.fade');
    document.querySelectorAll('#imPreset button').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v;
      el.filters = el.filters || {};
      const F = el.filters;
      if (v === 'normal') { F.bright = 100; F.contrast = 100; F.sepia = 0; F.grain = 0; F.fade = 0; }
      else if (v === 'vintage') { F.bright = 104; F.contrast = 92; F.sepia = 42; F.grain = 22; F.fade = 34; }
      else { F.bright = 98; F.contrast = 106; F.sepia = 8; F.grain = 32; F.fade = 18; }
      _rebuildProps(store, deps); _invalidate();
    }));
    on('imReseed', 'click', () => { store.mutate(() => { el.seed = (Math.random() * 1e6) | 0; }); });
    on('slotC', 'change', e => { el.slot = e.target.checked; if (deps.renderLayers) deps.renderLayers(store, deps); _invalidate(); });
    on('slotL', 'input', e => { el.slotLabel = e.target.value; _invalidate(); });
  }
  if (el.type === 'film') {
    const setN = n => {
      n = clamp(Math.round(n) || el.n, 2, 8);
      if (n === el.n) return;
      store.mutate(() => {
        el.n = n;
        el.frames = Array.from({ length: n }, (_, i) => (el.frames || [])[i] || null);
        fitFilmH(el);
      });
      _rebuildProps(store, deps);
    };
    on('fmMinus', 'click', () => setN(el.n - 1));
    on('fmPlus', 'click', () => setN(el.n + 1));
    on('fmN', 'change', e => setN(parseInt(e.target.value)));
    seg('fmOr', v => { store.mutate(() => { el.orient = v; fitFilmH(el); }); _invalidate(); });
    on('fmC', 'input', e => { el.filmColor = e.target.value; _invalidate(); });
    const adj2 = (id, k) => on(id, 'input', e => { el[k] = parseFloat(e.target.value); const lb = g(id + 'V'); if (lb) lb.textContent = e.target.value; _invalidate(); });
    adj2('fmG', 'gutter'); adj2('fmT', 'tone'); adj2('fmGr', 'grain');
    on('fmSp', 'change', e => { store.mutate(() => { el.sprocket = e.target.checked; }); });
    ;(el.frames || []).forEach((f, i) => {
      const fill = g('fmFill' + i);
      if (fill) fill.addEventListener('click', () => { if (deps.fillingFrameRef) deps.fillingFrameRef.value = { id: el.id, i }; const fi = document.querySelector('#fileInput'); if (fi) fi.click(); });
      const clr = g('fmClr' + i);
      if (clr) clr.addEventListener('click', () => { store.mutate(() => { el.frames[i] = null; }); _rebuildProps(store, deps); });
    });
  }
  if (el.type === 'snippet') {
    on('snMore', 'click', () => {
      if (deps.startPlacing) deps.startPlacing({ assetId: el.assetId, w: Math.round(el.w), h: Math.round(el.h) });
    });
  }
  if (el.type === 'sticker') {
    seg('stKind', v => { store.mutate(() => { el.kind = v; }); });
    on('stC', 'input', e => { el.fill = e.target.value; _invalidate(); });
    seg('stStyle', v => { store.mutate(() => { el.style = v; }); });
  }
  if (el.type === 'paper') {
    on('ppC', 'input', e => { el.fill = e.target.value; _invalidate(); });
    on('ppReseed', 'click', () => { store.mutate(() => { el.seed = (Math.random() * 1e6) | 0; }); });
  }
  if (el.type === 'text') {
    on('tT', 'input', e => { el.text = e.target.value; syncTextHWrap(el); _invalidate(); });
    on('tF', 'change', e => { store.mutate(() => { el.font = e.target.value; syncTextHWrap(el); }); });
    on('tSz', 'input', e => { const v = parseFloat(e.target.value); if (!isNaN(v)) el.size = Math.max(8, v); syncTextHWrap(el); _invalidate(); });
    on('tW', 'change', e => { el.weight = +e.target.value; _invalidate(); });
    on('tC', 'input', e => { el.color = e.target.value; _invalidate(); });
    on('tWd', 'input', e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 40) el.w = v; syncTextHWrap(el); _invalidate(); });
    on('tLs', 'input', e => { el.ls = parseFloat(e.target.value) || 0; _invalidate(); });
    on('tLh', 'input', e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0.6) el.lh = v; syncTextHWrap(el); _invalidate(); });
    seg('tAl', v => { el.align = v; _invalidate(); });
    seg('tInk', v => { store.mutate(() => { el.ink = v; }); });
    on('tUp', 'change', e => { el.upper = e.target.checked; syncTextHWrap(el); _invalidate(); });
  }
  if (el.type === 'fx') {
    on('fxA', 'input', e => { el.amount = parseFloat(e.target.value); const lb = g('fxAV'); if (lb) lb.textContent = e.target.value; _invalidate(); });
    on('fxC', 'input', e => { el.color = e.target.value; _invalidate(); });
    on('fxCorner', 'change', e => { store.mutate(() => { el.corner = +e.target.value; }); });
    on('fxReseed', 'click', () => { store.mutate(() => { el.seed = (Math.random() * 1e6) | 0; }); });
  }
}

export function bindBgProps(store, deps = {}) {
  const _invalidate = deps.invalidate || (() => { if (store.invalidate) store.invalidate(); });
  const g = id => document.getElementById(id);
  document.querySelectorAll('#props .sw[data-c]').forEach(b => b.addEventListener('click', () => {
    store.mutate(() => { store.S.bg.color = b.dataset.c; });
    const cc = g('bgCustom'); if (cc) cc.value = b.dataset.c;
  }));
  const bgCustom = g('bgCustom');
  if (bgCustom) bgCustom.addEventListener('input', e => {
    store.S.bg.color = e.target.value;
    document.querySelectorAll('#props .sw').forEach(x => x.classList.remove('on'));
    _invalidate();
  });
  const bgTex = g('bgTex');
  if (bgTex) bgTex.addEventListener('change', e => { store.mutate(() => { store.S.bg.texture = e.target.value; }); });
  const bgGrain = g('bgGrain');
  if (bgGrain) bgGrain.addEventListener('input', e => { store.S.bg.grain = +e.target.value; _invalidate(); });
  document.querySelectorAll('#ratioGrid button').forEach(b => b.addEventListener('click', () => {
    const n = SIZES[b.dataset.k];
    if (!n || (store.S.size.w === n.w && store.S.size.h === n.h)) return;
    const o = store.S.size;
    const rx = n.w / o.w, ry = n.h / o.h, rs = Math.min(rx, ry);
    store.mutate(() => {
      store.S.els.forEach(el => {
        el.x *= rx; el.y *= ry; el.w *= rs; el.h *= rs;
        if (el.type === 'text') { el.size *= rs; syncTextHWrap(el); }
      });
      store.S.size = { w: n.w, h: n.h };
    });
    if (deps.setCanvas) deps.setCanvas();
    if (deps.fitStage) deps.fitStage();
    rebuildProps(store, deps);
  }));
  const bgImp = g('bgImp');
  if (bgImp && deps.applyImperfect) bgImp.addEventListener('click', deps.applyImperfect);
}
