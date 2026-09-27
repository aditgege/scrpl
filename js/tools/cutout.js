'use strict';
/**
 * cutout.js — Cut-out + placing system (index.html:1116-1320)
 *
 * Deps convention — no globals. Each exported function that required S/selIds/view/cut/placing/cv/ov etc
 * receives them via an explicit `deps` object (first param). Pure helper `selPath` keeps original (x,selObj) signature.
 *
 * deps shape (pass what you have; unused keys ignored):
 *  {
 *    store: Return of createStore() — { S, selIds, view, ... mutate, elById, single },
 *    placingRef: { placing, placePt, placeArm, lastCanvasPt, clipboard } — mutable container (object with those keys)
 *    cutRef: object from createCutState() — { on, shape, draw, done, pts, bbox, start, last, seed }
 *    dom: { cv, ov, stage, ed }  // canvases + overlay + textarea (optional; fallback to imported $ if omitted)
 *    ui: { toast, rebuildProps, renderLayers, closeSheet, openSheet, closeEd, invalidate, isMobile }
 *    assets: Map (optional; defaults to imported `assets` from manager.js)
 *    renderLib: { drawBackground, renderScene } (optional; defaults to ./render.js imports)
 *    factory: { baseEl, defShadow } (optional; defaults to ./factories.js)
 *  }
 *
 * Signatures:
 *  selPath(x, selObj) — pure
 *  createCutState() -> cut object
 *  createPlacingRef() -> placingRef object
 *  updatePlaceLbl(deps)
 *  startPlacing(deps, clip, pending)
 *  stopPlacing(deps, silent)
 *  stampAt(deps, p)  // p={x,y} canvas coords
 *  pasteClip(deps)
 *  setCut(deps, on)
 *  cancelCutSel(deps)
 *  updateCutbar(deps)
 *  finishCutDraw(deps)
 *  captureAsset(srcCanvas, b, selObj) — pure-ish (needs sticker/canvas helpers)
 *  performCutCopy(deps, isCut) — async
 */

import { $, $$, clamp } from '../lib/dom.js';
import { rrPath, tornPath } from '../lib/canvas.js';
import { stickerPath } from '../elements/sticker.js';
import { assets as defaultAssets, addAsset as defaultAddAsset } from '../assets/manager.js';
import { drawBackground as defaultDrawBackground, renderScene as defaultRenderScene } from '../elements/render.js';
import { baseEl as defaultBaseEl, defShadow as defaultDefShadow } from '../elements/factories.js';

// ---------- pure helpers (byte-identical) ----------
export function selPath(x, selObj){
  const b=selObj.bbox;
  if(!b)return;
  x.beginPath();
  if(selObj.shape==='lasso'){
    selObj.pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));
    x.closePath();
  }else if(selObj.shape==='rect'){
    rrPath(x,b.x,b.y,b.w,b.h,0);
  }else if(selObj.shape==='circle'){
    x.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2,b.h/2,0,0,7);
  }else if(selObj.shape==='star'||selObj.shape==='heart'){
    x.save();
    x.translate(b.x+b.w/2,b.y+b.h/2);
    stickerPath(x,selObj.shape==='star'?'star5':'heart',b.w,b.h);
    x.restore();
  }else if(selObj.shape==='torn'){
    x.save();
    x.translate(b.x+b.w/2,b.y+b.h/2);
    tornPath(x,b.w,b.h,selObj.seed||1);
    x.restore();
  }
}

export function createCutState(){
  return { on:false, shape:'lasso', draw:false, done:false, pts:[], bbox:null, start:null, last:null, seed:1 };
}

export function createPlacingRef(){
  return { placing:null, placePt:null, placeArm:null, lastCanvasPt:null, clipboard:null };
}

// internal: resolve deps with defaults
function getAssets(deps){ return (deps && deps.assets) || defaultAssets; }
function getAddAsset(deps){ return (deps && deps.addAsset) || defaultAddAsset; }
function getDrawBackground(deps){ return (deps && deps.renderLib && deps.renderLib.drawBackground) || defaultDrawBackground; }
function getRenderScene(deps){ return (deps && deps.renderLib && deps.renderLib.renderScene) || defaultRenderScene; }
function getBaseEl(deps){ return (deps && deps.factory && deps.factory.baseEl) || defaultBaseEl; }
function getDefShadow(deps){ return (deps && deps.factory && deps.factory.defShadow) || defaultDefShadow; }
function getMctx(deps){
  if(deps && deps.mctx) return deps.mctx;
  if(!getMctx._c){ try{ getMctx._c=document.createElement('canvas').getContext('2d'); }catch(_){} }
  return getMctx._c;
}

export async function captureAsset(srcCanvas,b,selObj){
  try{
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(b.w));c.height=Math.max(1,Math.round(b.h));
    const x=c.getContext('2d');
    x.save();
    x.translate(-b.x,-b.y);
    selPath(x,selObj);
    x.clip();
    x.drawImage(srcCanvas,0,0);
    x.restore();
    const src=c.toDataURL('image/png');
    const addAsset=getAddAsset({});
    return await new Promise(res=>{
      const im=new Image();
      im.onload=()=>res(addAsset(im,src));
      im.onerror=()=>res(null);
      im.src=src;
    });
  }catch(e){return null}
}

export async function performCutCopy(deps, isCut){
  const cut=deps.cutRef;
  const store=deps.store;
  const S=store.S;
  if(!cut.done||!cut.bbox)return;
  const b=cut.bbox;
  if(b.w<8||b.h<8){ cancelCutSel(deps); return }
  const sceneC=document.createElement('canvas');
  sceneC.width=S.size.w;sceneC.height=S.size.h;
  const renderScene=getRenderScene(deps);
  renderScene(sceneC.getContext('2d'),S,{},{ assets: getAssets(deps), mctx: getMctx(deps) });
  const assets=getAssets(deps);
  const addAsset=getAddAsset(deps);
  const asset=await captureAsset(sceneC,b,cut);
  if(!asset){ const toast=deps.ui && deps.ui.toast; if(toast) toast('Cut-out failed','triangle-alert'); return }
  const baseEl=getBaseEl(deps);
  const defShadow=getDefShadow(deps);
  const piece=baseEl({
    type:'snippet',assetId:asset,
    x:b.x+b.w/2,y:b.y+b.h/2,
    w:Math.round(b.w),h:Math.round(b.h),
    rot:0,
    shadow:defShadow({blur:34,x:2,y:14,a:38})
  });
  let patchEl=null;
  if(isCut){
    const bgC=document.createElement('canvas');
    bgC.width=S.size.w;bgC.height=S.size.h;
    const drawBackground=getDrawBackground(deps);
    drawBackground(bgC.getContext('2d'),S.size.w,S.size.h,S);
    const patchAsset=await captureAsset(bgC,b,cut);
    if(patchAsset){
      patchEl=baseEl({
        type:'snippet',assetId:patchAsset,name:'Cut hole',
        x:b.x+b.w/2,y:b.y+b.h/2,w:Math.round(b.w),h:Math.round(b.h),
        rot:0,opacity:1,shadow:{on:false}
      });
    }
  }
  if(patchEl) store.mutate(()=>{S.els.push(patchEl)});
  deps.placingRef.clipboard={assetId:asset,w:Math.round(b.w),h:Math.round(b.h)};
  cancelCutSel(deps);
  setCut(deps,false);
  startPlacing(deps, deps.placingRef.clipboard, piece);
}

// ---- placing ----
export function updatePlaceLbl(deps){
  const placing=deps.placingRef.placing;
  const $fn=(deps.dom && deps.dom.$) || $;
  const el=$fn('#placeLbl');
  if(!el)return;
  el.textContent=placing
    ?`Click to drop${placing.count?` · ${placing.count} placed`:''} · Shift-click for more`
    :'';
}

export function startPlacing(deps, clip, pending){
  if(!clip)return;
  const placingRef=deps.placingRef;
  const store=deps.store;
  const ov=(deps.dom && deps.dom.ov) || null;
  const ui=deps.ui || {};
  if(placingRef.placing) stopPlacing(deps,true);
  placingRef.placing={assetId:clip.assetId,w:clip.w,h:clip.h,pending:pending||null,lastId:null,count:0};
  placingRef.placePt=placingRef.lastCanvasPt?{...placingRef.lastCanvasPt}:null;
  placingRef.placeArm=null;
  store.selIds=[];
  if(ui.closeSheet) ui.closeSheet();
  if(ui.rebuildProps) ui.rebuildProps();
  if(ui.renderLayers) ui.renderLayers();
  document.body.classList.add('placemode');
  if(ov) ov.style.cursor='crosshair';
  updatePlaceLbl(deps);
  if(ui.invalidate) ui.invalidate(); else store.invalidate();
  const toast=ui.toast;
  if(toast) toast(pending
    ?'Piece lifted — click where you want it · Shift-click stamps more · Esc puts it back'
    :'Click where you want the copy · Shift-click stamps more · Esc cancels','clipboard-paste');
}

export function stopPlacing(deps, silent){
  const placingRef=deps.placingRef;
  const store=deps.store;
  const S=store.S;
  const ov=(deps.dom && deps.dom.ov) || null;
  const ui=deps.ui || {};
  if(!placingRef.placing)return;
  const lastId=placingRef.placing.lastId;
  const pending=placingRef.placing.pending;
  placingRef.placing=null;placingRef.placePt=null;placingRef.placeArm=null;
  document.body.classList.remove('placemode');
  if(ov) ov.style.cursor='default';
  let placedBack=false;
  if(pending){
    store.mutate(()=>{S.els.push(pending)});
    store.selIds=[pending.id];
    placedBack=true;
  }else if(lastId&&store.elById(lastId)){
    store.selIds=[lastId];
  }else{
    store.selIds=[];
  }
  if(ui.rebuildProps) ui.rebuildProps();
  if(ui.renderLayers) ui.renderLayers();
  if(store.selIds.length && ui.isMobile && ui.isMobile()){ if(ui.openSheet) ui.openSheet(); }
  if(ui.invalidate) ui.invalidate(); else store.invalidate();
  if(!silent){
    const toast=ui.toast;
    if(!toast) return;
    if(placedBack)toast('Put back where it was cut from','scissors');
    else if(lastId)toast('Placed — drag or arrow keys to adjust','check');
    else toast('Placing cancelled','x');
  }
}

export function stampAt(deps, p){
  const placingRef=deps.placingRef;
  const store=deps.store;
  const S=store.S;
  if(!placingRef.placing)return;
  let el;
  const baseEl=getBaseEl(deps);
  const defShadow=getDefShadow(deps);
  if(placingRef.placing.pending){
    el=placingRef.placing.pending;
    placingRef.placing.pending=null;
  }else{
    el=baseEl({
      type:'snippet',assetId:placingRef.placing.assetId,w:placingRef.placing.w,h:placingRef.placing.h,
      shadow:defShadow({blur:34,x:2,y:14,a:38})
    });
  }
  el.x=clamp(Math.round(p.x),24,S.size.w-24);
  el.y=clamp(Math.round(p.y),24,S.size.h-24);
  el.rot=+((Math.random()*2-1)*3).toFixed(1);
  placingRef.placing.lastId=el.id;
  placingRef.placing.count++;
  store.mutate(()=>{S.els.push(el)});
  updatePlaceLbl(deps);
}

export function pasteClip(deps){
  const placingRef=deps.placingRef;
  const ui=deps.ui || {};
  if(!placingRef.clipboard){ if(ui.toast) ui.toast('Nothing to paste yet — make a cut-out first','scissors'); return }
  startPlacing(deps, placingRef.clipboard);
}

export function setCut(deps, on){
  const cut=deps.cutRef;
  const ov=(deps.dom && deps.dom.ov) || null;
  const ui=deps.ui || {};
  const $fn=(deps.dom && deps.dom.$) || $;
  cut.on=on;
  document.body.classList.toggle('cutmode',on);
  const btn=$fn('#btnCut'); if(btn) btn.classList.toggle('on',on);
  if(on){
    stopPlacing(deps,true);
    if(ui.closeEd) ui.closeEd();
    if(ui.closeSheet) ui.closeSheet();
    deps.store.selIds=[];
    if(ui.rebuildProps) ui.rebuildProps();
    if(ui.renderLayers) ui.renderLayers();
    cancelCutSel(deps);
    if(ov) ov.style.cursor='crosshair';
  }else{
    cancelCutSel(deps);
    const placingRef=deps.placingRef;
    if(!placingRef.placing && ov) ov.style.cursor='default';
  }
}

export function cancelCutSel(deps){
  const cut=deps.cutRef;
  const ui=deps.ui || {};
  cut.draw=false;cut.done=false;cut.pts=[];cut.bbox=null;
  updateCutbar(deps);
  if(ui.invalidate) ui.invalidate(); else if(deps.store) deps.store.invalidate();
}

export function updateCutbar(deps){
  const cut=deps.cutRef;
  const $fn=(deps.dom && deps.dom.$) || $;
  const $$fn=(deps.dom && deps.dom.$$) || $$;
  const hint=$fn('#cutHint');
  if(hint) hint.textContent=cut.done?'Selection ready — cut or copy':(cut.draw?'Drawing…':'Drag on the canvas to select');
  const acts=$fn('#cutActs'); if(acts) acts.style.display=cut.done?'flex':'none';
  $$fn('#cutShapes .sbtn').forEach(b=>b.classList.toggle('on',b.dataset.v===cut.shape));
}

export function finishCutDraw(deps){
  const cut=deps.cutRef;
  const ui=deps.ui || {};
  cut.draw=false;
  if(cut.shape==='lasso'){
    if(cut.pts.length>=3){
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      cut.pts.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y)});
      cut.bbox={x:x0,y:y0,w:x1-x0,h:y1-y0};
    }
  }
  if(cut.bbox&&cut.bbox.w>=10&&cut.bbox.h>=10){
    cut.done=true;
    cut.seed=(Math.random()*1e6)|0;
  }else cancelCutSel(deps);
  updateCutbar(deps);
  if(ui.invalidate) ui.invalidate(); else if(deps.store) deps.store.invalidate();
}
