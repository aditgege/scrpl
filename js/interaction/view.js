'use strict';
/**
 * view.js — stage / render loop + zoom (index.html:1322-1366)
 *
 * No globals: every function that touched S/selIds/view/cv/ov/stage/ed/cx/ox/placeEd/drawOverlay/renderScene
 * receives them via `deps`.
 *
 * deps shape:
 *  {
 *    store: Return of createStore() — needs .S, .view, .editingId, .needs, .invalidate, .S.size
 *    dom:   { cv, ov, stage, ed, cx, ox }  // cv/ov canvases, stage scroll container, ed textarea, 2d contexts
 *    fx:    { drawOverlay: (deps)=>void, placeEd: (deps)=>void, renderScene: (x,state,o,deps)=>void, assets?:Map }
 *    ui:    { $? optional }
 *  }
 *
 * Signatures:
 *  setCanvas(deps)          — verbatim index.html:1323 (resize canvases + fitStage)
 *  fitStage(deps)           — verbatim 1324-1334
 *  invalidate(deps)         — sets store.needs=true
 *  tick(deps)               — rAF loop (caller does tick(deps) once)
 *  render(deps)             — renderScene + drawOverlay + placeEd
 *  zoomAt(deps, clientX, clientY, f)
 *  zoomCenter(deps, f)
 *  wireWheel(deps)          — attaches stage wheel → zoomAt (call once)
 *
 * Zoom factors kept byte-identical: clamp 0.15-6, fit min 0.02, wheel 1.12, canvas min 40.
 */

import { clamp } from '../lib/dom.js';
import { renderScene as defaultRenderScene } from '../elements/render.js';
import { assets as defaultAssets } from '../assets/manager.js';

function getRenderScene(deps){
  if(deps && deps.fx && deps.fx.renderScene) return deps.fx.renderScene;
  return defaultRenderScene;
}
function getAssets(deps){
  if(deps && deps.fx && deps.fx.assets) return deps.fx.assets;
  return defaultAssets;
}
function getMctx(deps){
  if(deps && deps.fx && deps.fx.mctx) return deps.fx.mctx;
  if(deps && deps.mctx) return deps.mctx;
  if(!getMctx._c){ try{ getMctx._c=document.createElement('canvas').getContext('2d'); }catch(_){} }
  return getMctx._c;
}

export function setCanvas(deps){
  const { store, dom } = deps;
  const { cv, ov } = dom;
  const S=store.S;
  // preview stays viewport-downscaled via CSS (style width/height = w*view.scale); backing is W×H but reused per frame — no per-frame 10800 allocation.
  // Full-res alloc only in scrlExport doScrlExport render-once path. ponytail: switch backing to cw/ch + ctx.scale if 10800×1350 *4 ≈58MB ever janks on target.
  cv.width=S.size.w;cv.height=S.size.h;ov.width=S.size.w;ov.height=S.size.h;fitStage(deps);
}

export function fitStage(deps){
  const { store, dom, fx } = deps;
  const { cv, ov, stage } = dom;
  const S=store.S;
  const view=store.view;
  const {w,h}=S.size;
  const fit=Math.max(0.02,Math.min((stage.clientWidth-64)/w,(stage.clientHeight-64)/h));
  view.scale=fit*view.zoom;
  const cw=Math.max(40,Math.round(w*view.scale)),ch=Math.max(40,Math.round(h*view.scale));
  cv.style.width=ov.style.width=cw+'px';
  cv.style.height=ov.style.height=ch+'px';
  const zoomVal=document.querySelector('#zoomVal');
  if(zoomVal) zoomVal.textContent=Math.round(view.scale*100)+'%';
  if(store.editingId && fx && fx.placeEd) fx.placeEd(deps);
  invalidate(deps);
}

export function invalidate(deps){
  const { store } = deps;
  store.needs=true;
  // also notify subscribers like store.invalidate()
  if(typeof store.invalidate==='function'){
    // avoid double-notify: directly set needs then rely on existing logic
    // store.invalidate already sets needs=true; we already set it above.
  }
}

export function tick(deps){
  const { store } = deps;
  if(store.needs){ store.needs=false; render(deps); }
  requestAnimationFrame(()=>tick(deps));
}

export function render(deps){
  const { store, dom, fx } = deps;
  const { cx } = dom;
  const renderScene=getRenderScene(deps);
  const assets=getAssets(deps);
  const editingId=store.editingId;
  const preview=!!store.drag;
  renderScene(cx, store.S, {editor:true,skip:editingId?{[editingId]:1}:null,preview}, {assets, mctx:getMctx(deps),preview});
  if(fx && fx.drawOverlay) fx.drawOverlay(deps);
  if(editingId && fx && fx.placeEd) fx.placeEd(deps);
}

export function zoomAt(deps, clientX, clientY, f){
  const { store, dom } = deps;
  const { cv, stage } = dom;
  const view=store.view;
  const r0=cv.getBoundingClientRect();
  if(r0.width<2)return;
  const p={x:(clientX-r0.left)*cv.width/r0.width,y:(clientY-r0.top)*cv.height/r0.height};
  view.zoom=clamp(view.zoom*f,0.15,6);
  fitStage(deps);
  const r1=cv.getBoundingClientRect();
  if(r1.width<2)return;
  const s=r1.width/cv.width;
  const cur={x:(clientX-r1.left)/s,y:(clientY-r1.top)/s};
  stage.scrollLeft+=(p.x-cur.x)*s;
  stage.scrollTop+=(p.y-cur.y)*s;
}

export function zoomCenter(deps, f){
  const { dom } = deps;
  const { stage } = dom;
  const r=stage.getBoundingClientRect();
  zoomAt(deps, r.left+r.width/2, r.top+r.height/2, f);
}

export function wireWheel(deps){
  const { dom } = deps;
  const { stage } = dom;
  if(!stage || stage._viewWheelWired) return;
  stage._viewWheelWired=true;
  stage.addEventListener('wheel',e=>{
    if(e.target && e.target.id==='ed')return;
    if(!(e.target.closest&&e.target.closest('#holder')))return;
    // SCRL: Shift+wheel → horizontal scroll (Chrome Windows), Ctrl+wheel → zoom
    if(e.shiftKey && !e.ctrlKey && !e.metaKey){
      if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
        e.preventDefault();
        stage.scrollLeft += e.deltaY;
      }
      return;
    }
    if(e.ctrlKey || e.metaKey){
      e.preventDefault();
      zoomAt(deps, e.clientX, e.clientY, e.deltaY<0?1.12:1/1.12);
      return;
    }
    e.preventDefault();
    zoomAt(deps, e.clientX, e.clientY, e.deltaY<0?1.12:1/1.12);
  },{passive:false});
}
