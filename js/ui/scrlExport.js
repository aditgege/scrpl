'use strict';
/*
 * js/ui/scrlExport.js — SCRL slice export with preview strip
 * DI deps: { renderScene, assets, mctx, openModal, closeModal, toast, refreshIcons, getScrlN, download, slug }
 * Reuses patterns from js/ui/export.js without changing it.
 */
import { renderScene as renderSceneDef } from '../elements/render.js';
import { assets as assetsDef } from '../assets/manager.js';
import { slicePanorama } from '../scrl/slice.js';
import { SCRL_W_UNIT, SCRL_H, SCRL_N_MIN, SCRL_N_MAX, SCRL_SCALE_GUARD_N, SCRL_MP_WARN, scrlMP } from '../config/scrl.js';
import { exportPanoramaVideo, canRecordVideo, getSupportedVideoMimeType, getVideoFileExt, VID_W, VID_H } from '../scrl/video.js';

let _mctx = null;
function getMctx() {
  if (_mctx) return _mctx;
  const c = document.createElement('canvas');
  _mctx = c.getContext('2d');
  return _mctx;
}

function buildPanCanvas(store, deps, scale, opts = {}) {
  const _renderScene = deps.renderScene || renderSceneDef;
  const _assets = deps.assets || assetsDef;
  const _mctx2 = deps.mctx || getMctx();
  const W = store.S.size.w, H = store.S.size.h;
  const sc = Math.max(1, Math.round(scale) || 1);
  const pan = document.createElement('canvas');
  pan.width = W * sc; pan.height = H * sc;
  const px = pan.getContext('2d');
  if (!px) throw new Error('Canvas 2D not available');
  if (sc !== 1) px.scale(sc, sc);
  _renderScene(px, store.S, { transparent: !!opts.transparent }, { assets: _assets, mctx: _mctx2 });
  return pan;
}

async function fallbackVideoFrames(panCanvas, opts, deps) {
  const _download = deps.download || download;
  const _slug = deps.slug || slug;
  const _toast = deps.toast;
  const duration = opts.duration === 9 ? 9 : opts.duration === 12 ? 12 : 6;
  const direction = opts.direction === 'rtl' ? 'rtl' : 'ltr';
  const baseEl = document.getElementById('projName');
  const base = _slug(baseEl ? baseEl.value : '');
  const maxPan = Math.max(0, panCanvas.width - VID_W);
  // fallback fps lowered to keep download count reasonable (8 fps -> ~48-96 PNGs)
  const fps = 8;
  const frameCount = Math.max(1, Math.round(duration * fps));
  if (_toast) _toast('Recording not supported — exporting PNG frames for manual assembly (' + frameCount + ' frames)', 'triangle-alert');
  for (let i = 0; i < frameCount; i++) {
    const p = frameCount === 1 ? 0 : i / (frameCount - 1);
    const panX = direction === 'rtl' ? maxPan * (1 - p) : maxPan * p;
    const sx = Math.max(0, Math.min(maxPan, Math.round(panX)));
    const c = document.createElement('canvas');
    c.width = VID_W; c.height = VID_H;
    const x = c.getContext('2d');
    x.drawImage(panCanvas, sx, 0, VID_W, VID_H, 0, 0, VID_W, VID_H);
    const blob = await new Promise(r => { try { c.toBlob(r, 'image/png'); } catch (e) { r(null); } });
    if (!blob) continue;
    const name = `${base}-frame-${String(i + 1).padStart(3, '0')}.png`;
    _download(blob, name);
    const prog = document.getElementById('scrlVidProg');
    if (prog) { prog.style.display = ''; prog.textContent = `Fallback frames ${i + 1}/${frameCount}`; }
    await new Promise(r => setTimeout(r, 90));
  }
  const prog2 = document.getElementById('scrlVidProg');
  if (prog2) prog2.textContent = `Exported ${frameCount} PNG frames — assemble manually`;
}

export function slug(s) { return (s || 'collage').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'collage'; }

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

function resolveN(store, deps) {
  if (deps.getScrlN) return deps.getScrlN();
  const sc = store.S && store.S.scrl;
  if (sc && typeof sc.n === 'number') return Math.max(1, Math.min(SCRL_N_MAX, Math.round(sc.n)));
  return Math.max(1, Math.min(SCRL_N_MAX, Math.round((store.S.size.w / SCRL_W_UNIT) || 1)));
}

function ensureVideoSection() {
  if (document.getElementById('scrlVidSec')) return;
  const hint = document.querySelector('#mScrlExport .mbody > p.hint');
  const anchor = hint || document.getElementById('scrlTrans') || document.getElementById('scrlQRow');
  if (!anchor) return;
  const sec = document.createElement('div');
  sec.id = 'scrlVidSec';
  sec.style.cssText = 'margin-top:14px;padding:12px;background:#F8F5EA;border:1px solid var(--line);border-radius:10px';
  sec.innerHTML = `
    <div style="font:600 10px var(--mono);letter-spacing:.12em;color:#8a8575;margin-bottom:8px">VIDEO PAN — 1080×1350</div>
    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
      <label class="f" style="flex:1;min-width:120px"><span>Duration</span>
        <select id="scrlVidDur"><option value="6">6s</option><option value="9">9s</option><option value="12">12s</option></select>
      </label>
      <label class="f" style="flex:1;min-width:120px"><span>Direction</span>
        <select id="scrlVidDir"><option value="ltr">Left → Right</option><option value="rtl">Right → Left</option></select>
      </label>
    </div>
    <button class="btn acc block" id="scrlVidGo" style="margin-top:10px"><i data-lucide="video"></i><span id="scrlVidGoLabel">Export video</span></button>
    <div id="scrlVidProg" class="hint" style="display:none;margin-top:6px;font:600 11px var(--mono)"></div>
    <div class="hint" style="margin-top:6px">No audio. Chrome desktop records via canvas capture; unsupported browsers download PNG frames for manual assembly.</div>`;
  // insert after the photo hint paragraph (or after anchor's parent)
  if (hint) hint.insertAdjacentElement('afterend', sec);
  else {
    const row = anchor.closest('label') || anchor;
    row.insertAdjacentElement('afterend', sec);
  }
}

function ensureModal() {
  // static #mScrlExport already in index.html; this creates it only if missing (e.g. tests)
  if (!document.getElementById('mScrlExport')) {
    const html = `
<div class="mback" id="mScrlExport"><div class="modal wide">
  <div class="mhead"><h3>SCRL Export</h3><span class="msub">SEAMLESS CAROUSEL — N SLICES</span><button class="ibtn dark mclose" data-m="mScrlExport"><i data-lucide="x"></i></button></div>
  <div class="mbody">
    <div id="scrlStrip" style="display:flex;gap:8px;overflow-x:auto;padding:12px;background:#E9E4D6;border-radius:10px;outline:1px solid var(--line);margin-bottom:14px;min-height:164px;align-items:flex-start"></div>
    <div id="scrlCount" class="hint" style="margin-bottom:10px"></div>
    <label class="f"><span>Format</span>
      <select id="scrlFmt">
        <option value="png">PNG — lossless</option>
        <option value="jpg">JPG — smaller file</option>
        <option value="webp">WebP — modern</option>
      </select></label>
    <label class="f"><span>Resolution</span>
      <select id="scrlScale">
        <option value="1">1× — <span id="scrlS1"></span></option>
        <option value="2">2× — <span id="scrlS2"></span></option>
      </select></label>
    <div id="scrlMP" class="hint" style="margin:6px 0 2px;font:600 11px var(--mono)"></div>
    <div id="scrlWarn" class="hint" style="margin-bottom:10px;color:#E5484D;display:none"></div>
    <label class="f" id="scrlQRow"><span>Quality <b id="scrlQV">90</b></span><input type="range" id="scrlQ" min="40" max="100" value="90"></label>
    <label class="checkrow"><input type="checkbox" id="scrlTrans"><span>Transparent background (PNG only)</span></label>
    <p class="hint">Guides are never exported. Each slice is exactly 1080×1350 (× scale).</p>
  </div>
  <div class="mfoot">
    <button class="btn mclose" data-m="mScrlExport">Cancel</button>
    <button class="btn acc" id="scrlGo"><i data-lucide="download"></i>Download N slices</button>
  </div>
</div></div>`;
    const tpl = document.createElement('div');
    tpl.innerHTML = html.trim();
    const root = tpl.firstElementChild;
    document.body.appendChild(root);
    root.querySelectorAll('.mclose').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.m; const el = document.getElementById(id); if (el) el.classList.remove('open');
    }));
    root.addEventListener('pointerdown', e => {
      if (e.target === root) root.classList.remove('open');
    });
  }
  // upgrade static index.html modal — inject MP/warn if missing (idempotent)
  const scrlScale = document.getElementById('scrlScale');
  if (scrlScale && !document.getElementById('scrlMP')) {
    const mp = document.createElement('div'); mp.id = 'scrlMP'; mp.className = 'hint'; mp.style.cssText = 'margin:6px 0 2px;font:600 11px var(--mono)';
    const warn = document.createElement('div'); warn.id = 'scrlWarn'; warn.className = 'hint'; warn.style.cssText = 'margin-bottom:10px;color:#E5484D;display:none';
    const row = scrlScale.closest('label'); if (row) { row.insertAdjacentElement('afterend', warn); row.insertAdjacentElement('afterend', mp); }
    else { scrlScale.insertAdjacentElement('afterend', warn); scrlScale.insertAdjacentElement('afterend', mp); }
  }
  ensureVideoSection();
}

function mpText(w,h,s){ return (scrlMP(w,h,s)).toFixed(1)+' MP'; }
function updateMpAndGuard(store){
  const n=resolveN(store,{});
  const W=store.S.size.w, H=store.S.size.h;
  const scaleEl=document.getElementById('scrlScale');
  const mpEl=document.getElementById('scrlMP');
  const warnEl=document.getElementById('scrlWarn');
  const opt2=scaleEl?scaleEl.querySelector('option[value="2"]'):null;
  if(opt2){
    const s2=document.getElementById('scrlS2');
    const label2=s2?'2× — '+s2.textContent:'2×';
    if(n>SCRL_SCALE_GUARD_N){
      opt2.disabled=true;
      opt2.textContent='2× — disabled for N>'+SCRL_SCALE_GUARD_N+' (memory)';
      if(scaleEl.value==='2') scaleEl.value='1';
    } else {
      opt2.disabled=false;
      opt2.textContent=label2;
    }
  }
  const curScale=parseInt(scaleEl?scaleEl.value:'1',10)||1;
  const mp=scrlMP(W,H,curScale);
  if(mpEl) mpEl.textContent=mpText(W,H,curScale)+' — '+(W*curScale)+'×'+(H*curScale);
  if(warnEl){
    if(mp>SCRL_MP_WARN){ warnEl.style.display=''; warnEl.textContent='⚠ Large export ('+mp.toFixed(1)+' MP > '+SCRL_MP_WARN+' MP) — may be heavy. Use 1× for large N.'; }
    else if(n>SCRL_SCALE_GUARD_N && curScale===2){ warnEl.style.display=''; warnEl.textContent='2× disabled for N>'+SCRL_SCALE_GUARD_N+' to avoid OOM.'; }
    else { warnEl.style.display='none'; warnEl.textContent=''; }
  }
}
function syncVideoDisabled(n){
  const dis = n < SCRL_N_MIN;
  const d = document.getElementById('scrlVidDur');
  const dir = document.getElementById('scrlVidDir');
  const go = document.getElementById('scrlVidGo');
  const sec = document.getElementById('scrlVidSec');
  if (d) d.disabled = dis;
  if (dir) dir.disabled = dis;
  if (go) go.disabled = dis;
  if (sec) { sec.style.opacity = dis ? '.55' : ''; sec.style.pointerEvents = dis ? 'none' : ''; sec.title = dis ? 'Set slides to 2–10 first' : ''; }
}

function wireModalControls(store) {
  const fmtEl = document.getElementById('scrlFmt');
  const qRow = document.getElementById('scrlQRow');
  const transEl = document.getElementById('scrlTrans');
  if (fmtEl && !fmtEl._scrlWired) {
    fmtEl._scrlWired = true;
    fmtEl.addEventListener('change', () => {
      if (qRow) qRow.style.display = fmtEl.value === 'png' ? 'none' : '';
      if (transEl) transEl.disabled = fmtEl.value !== 'png';
    });
  }
  const qEl = document.getElementById('scrlQ');
  if (qEl && !qEl._scrlWired) {
    qEl._scrlWired = true;
    qEl.addEventListener('input', e => { const v = document.getElementById('scrlQV'); if (v) v.textContent = e.target.value; });
  }
  const scaleEl=document.getElementById('scrlScale');
  if(scaleEl && !scaleEl._scrlWired){
    scaleEl._scrlWired=true;
    scaleEl.addEventListener('change', ()=>{ if(store) updateMpAndGuard(store); });
  }
}

export function openScrlExport(store, deps = {}) {
  const _renderScene = deps.renderScene || renderSceneDef;
  const _assets = deps.assets || assetsDef;
  const _mctx = deps.mctx || getMctx();
  const _openModal = deps.openModal || ((id) => { const el = document.getElementById(id); if (el) el.classList.add('open'); });
  const _refreshIcons = deps.refreshIcons || (() => { if (window.lucide) try { lucide.createIcons(); } catch (e) {} });
  const _toast = deps.toast;

  const n = resolveN(store, deps);
  if (n < SCRL_N_MIN) { if (_toast) _toast('Set slides to 2–10 first', 'triangle-alert'); return; }

  ensureModal();
  wireModalControls(store);

  const s1 = document.getElementById('scrlS1');
  if (s1) s1.textContent = `${SCRL_W_UNIT} × ${SCRL_H}`;
  const s2 = document.getElementById('scrlS2');
  if (s2) s2.textContent = `${SCRL_W_UNIT * 2} × ${SCRL_H * 2}`;
  const countEl = document.getElementById('scrlCount');
  if (countEl) countEl.textContent = `${n} slices — each 1080×1350`;
  updateMpAndGuard(store);
  const qRow = document.getElementById('scrlQRow');
  const fmtEl = document.getElementById('scrlFmt');
  const fmt = fmtEl ? fmtEl.value : 'png';
  if (qRow) qRow.style.display = fmt === 'png' ? 'none' : '';
  const transEl = document.getElementById('scrlTrans');
  if (transEl) transEl.disabled = fmt !== 'png';
  const qV = document.getElementById('scrlQV');
  const qEl = document.getElementById('scrlQ');
  if (qV && qEl) qV.textContent = qEl.value;

  const strip = document.getElementById('scrlStrip');
  if (strip) {
    strip.innerHTML = '';
    const thumbW = 120;
    const thumbH = Math.round(thumbW * SCRL_H / SCRL_W_UNIT);
    const panW = thumbW * n;
    const panH = thumbH;
    const pan = document.createElement('canvas');
    pan.width = panW; pan.height = panH;
    const px = pan.getContext('2d');
    const sx = panW / store.S.size.w;
    const sy = panH / store.S.size.h;
    px.save();
    px.scale(sx, sy);
    _renderScene(px, store.S, {}, { assets: _assets, mctx: _mctx });
    px.restore();
    for (let i = 0; i < n; i++) {
      const c = document.createElement('canvas');
      c.width = thumbW; c.height = thumbH;
      c.style.width = thumbW + 'px';
      c.style.height = thumbH + 'px';
      c.style.flex = 'none';
      c.style.borderRadius = '6px';
      c.style.outline = '1px solid var(--line)';
      c.title = `Slide ${i + 1}`;
      const cx = c.getContext('2d');
      const sx2 = i * thumbW;
      cx.drawImage(pan, sx2, 0, thumbW, thumbH, 0, 0, thumbW, thumbH);
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '4px';
      wrap.style.flex = 'none';
      const lab = document.createElement('div');
      lab.textContent = String(i + 1).padStart(2, '0');
      lab.style.font = '600 9px var(--mono)';
      lab.style.letterSpacing = '.08em';
      lab.style.color = 'var(--ink2)';
      wrap.appendChild(c);
      wrap.appendChild(lab);
      strip.appendChild(wrap);
    }
  }

  syncVideoDisabled(n);
  const vProg = document.getElementById('scrlVidProg');
  if (vProg) { vProg.style.display = 'none'; vProg.textContent = ''; }
  const vLabel = document.getElementById('scrlVidGoLabel');
  if (vLabel) vLabel.textContent = 'Export video';
  const vGo = document.getElementById('scrlVidGo');
  if (vGo) {
    vGo.disabled = n < SCRL_N_MIN;
    if (!vGo._scrlWired) {
      vGo._scrlWired = true;
      vGo.addEventListener('click', () => doScrlVideoExport(store, deps));
    }
  }
  if (n < SCRL_N_MIN) syncVideoDisabled(n);

  _openModal('mScrlExport');
  _refreshIcons();
}

export async function doScrlVideoExport(store, deps = {}) {
  const _download = deps.download || download;
  const _slug = deps.slug || slug;
  const _toast = deps.toast;
  const n = resolveN(store, deps);
  if (n < SCRL_N_MIN) { if (_toast) _toast('Set slides to 2–10 first', 'triangle-alert'); return; }
  const durEl = document.getElementById('scrlVidDur');
  const dirEl = document.getElementById('scrlVidDir');
  const duration = parseInt(durEl ? durEl.value : '6', 10) || 6;
  const direction = dirEl && dirEl.value === 'rtl' ? 'rtl' : 'ltr';
  const btn = document.getElementById('scrlVidGo');
  const label = document.getElementById('scrlVidGoLabel');
  const prog = document.getElementById('scrlVidProg');
  const origLabel = label ? label.textContent : '';
  try {
    if (btn) btn.disabled = true;
    if (prog) { prog.style.display = ''; prog.textContent = 'Rendering panorama…'; }
    // video panorama source always at 1x (scale guard ticket 07 — large N forces 1x)
    const pan = buildPanCanvas(store, deps, 1);
    if (pan.width <= VID_W) {
      if (_toast) _toast('Panorama too narrow for video (need N≥2)', 'triangle-alert');
      return;
    }
    const needFallback = !canRecordVideo();
    if (needFallback) {
      await fallbackVideoFrames(pan, { duration, direction }, deps);
      return;
    }
    if (prog) prog.textContent = 'Recording 0%';
    if (label) label.textContent = 'Recording… 0%';
    const onProgress = (p) => {
      const pct = Math.max(0, Math.min(100, Math.round((p || 0) * 100)));
      if (prog) prog.textContent = `Recording ${pct}%`;
      if (label) label.textContent = `Recording… ${pct}%`;
    };
    let blob;
    try {
      blob = await exportPanoramaVideo(pan, { duration, fps: 30, direction, onProgress });
    } catch (e) {
      // auto fallback to PNG sequence on recording failure — never fail silently
      if (_toast) _toast('Recording failed (' + (e && e.message ? e.message : 'unknown') + ') — exporting PNG frames instead', 'triangle-alert');
      await fallbackVideoFrames(pan, { duration, direction }, deps);
      return;
    }
    const mime = blob && blob.type ? blob.type : (getSupportedVideoMimeType() || 'video/webm');
    const ext = getVideoFileExt(mime);
    const projEl = document.getElementById('projName');
    const base = _slug(projEl ? projEl.value : '');
    const name = `${base}-pan-${duration}s-${direction}.${ext}`;
    _download(blob, name);
    if (prog) prog.textContent = `Exported video (${(blob.size / 1024 / 1024).toFixed(2)} MB)`;
    if (_toast) _toast('Video exported', 'video');
  } catch (err) {
    if (_toast) _toast('Video export failed: ' + (err && err.message ? err.message : 'unknown'), 'triangle-alert');
    else console.error(err);
  } finally {
    if (btn) btn.disabled = n < SCRL_N_MIN ? true : false;
    if (label) label.textContent = origLabel || 'Export video';
    // keep prog visible with final state; don't hide immediately
  }
}

export async function doScrlExport(store, deps = {}) {
  const _renderScene = deps.renderScene || renderSceneDef;
  const _assets = deps.assets || assetsDef;
  const _mctx = deps.mctx || getMctx();
  const _download = deps.download || download;
  const _slug = deps.slug || slug;
  const _toast = deps.toast;
  const _closeModal = deps.closeModal || ((id) => { const el = document.getElementById(id); if (el) el.classList.remove('open'); });

  const n = resolveN(store, deps);
  if (n < SCRL_N_MIN) { if (_toast) _toast('Set slides to 2–10 first', 'triangle-alert'); return; }

  const fmtEl = document.getElementById('scrlFmt');
  const fmt = fmtEl ? fmtEl.value : 'png';
  const scaleEl = document.getElementById('scrlScale');
  let scale = parseInt(scaleEl ? scaleEl.value : '1', 10) || 1;
  if(n>SCRL_SCALE_GUARD_N && scale===2){
    scale=1; if(scaleEl) scaleEl.value='1';
    if(_toast) _toast('Scale 2× disabled for N>'+SCRL_SCALE_GUARD_N+' — using 1×','triangle-alert');
  }
  const qEl = document.getElementById('scrlQ');
  const q = (parseInt(qEl ? qEl.value : '90', 10) || 90) / 100;
  const transEl = document.getElementById('scrlTrans');
  const trans = transEl && transEl.checked && fmt === 'png';

  // reuse shared offscreen panorama render (scale-guarded, same as video path uses)
  //ponytail: tiling/OffscreenCanvas if export OOMs at large MP; upgrade path spec 11.3
  try{
    const pan = buildPanCanvas(store, { renderScene: _renderScene, assets: _assets, mctx: _mctx }, scale, { transparent: trans });

    const slices = slicePanorama(pan, n, scale);

    const mime = fmt === 'jpg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
    const projEl = document.getElementById('projName');
    const base = _slug(projEl ? projEl.value : '');

    for (let i = 0; i < slices.length; i++) {
      const c = slices[i];
      let blob = await new Promise(r => { try{ c.toBlob(r, mime, q); }catch(e){ r(null); } });
      let ext = fmt;
      if (!blob || (fmt !== 'png' && blob.type !== mime)) {
        blob = await new Promise(r => { try{ c.toBlob(r, 'image/png'); }catch(e){ r(null); } });
        ext = 'png';
      }
      if (!blob) throw new Error('toBlob failed');
      const name = `${base}-${String(i + 1).padStart(2, '0')}.${ext}`;
      _download(blob, name);
      await new Promise(r => setTimeout(r, 120));
    }
    _closeModal('mScrlExport');
    if (_toast) _toast(`Exported ${n} slices`, 'download');
  }catch(err){
    if(_toast) _toast('Export failed: '+(err&&err.message?err.message:'unknown'),'triangle-alert');
    else console.error(err);
  }
}
