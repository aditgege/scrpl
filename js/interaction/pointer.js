'use strict';
/**
 * pointer.js — pointer interaction (index.html:1454-1728)
 *
 * Handles: drag / select / handles (rotate/corner/edge) / pan / pinch-zoom / cut-out draw / placing drop / dblclick / contextmenu / global safety net.
 * Bodies verbatim except globals replaced by deps. Snap thresholds, handle geometry, cut math, zoom factors byte-identical.
 *
 * Deps convention — no globals. Call wirePointer once after dom/store are ready.
 *
 * wirePointer(deps) where deps = {
 *   store: Return of createStore()  // needs .S, .selIds, .view, .drag, .guides, .editingId, .needs
 *                                   //      + .elById(id), .single(), .beginGesture(), .commitHistory(), .mutate(), .invalidate()
 *   dom:   { cv: HTMLCanvasElement, ov: HTMLCanvasElement, stage: HTMLElement, ed: HTMLTextAreaElement }
 *   cutRef: object from createCutState()  // {on,shape,draw,done,pts,bbox,start,last,seed}
 *   placingRef: object from createPlacingRef() // {placing,placePt,placeArm,lastCanvasPt,clipboard}
 *   // optional (defaults created if omitted):
 *   refs: { ovPts?: Map, pinch?: {d0,z0}|null }  // mutable; if omitted a local Map/null is used and stored on deps.refs
 *   ui: {
 *     rebuildProps?: ()=>void, renderLayers?: ()=>void, invalidate?: ()=>void,
 *     closeSheet?: ()=>void, openSheet?: ()=>void, closeLib?: ()=>void,
 *     syncNums?: ()=>void, syncTextH?: (el)=>void, fitFilmH?: (el)=>void, filmRects?: (el)=>any[],
 *     openTextEditor?: (el)=>void, isMobile?: ()=>boolean,
 *     toast?: (msg,icon)=>void
 *   }
 *   // optional overrides for pure helpers (defaults import from selection/cutout):
 *   helpers?: {
 *     toCanvas?: (e)=>{x,y},  // if omitted a local one using dom.cv is used
 *     filmRects?: (el)=>any[]  // alias of ui.filmRects
 *   }
 *   // optional state flags (boolean refs so caller can share keyboard state):
 *   flags?: { snapOn?: {value:boolean}, spaceDown?: {value:boolean}, handleGeomRef?: {value:any} }
 * }
 *
 * Magic numbers: snap T=12/view.scale, handle thresholds g.rot.r*2/15*k, rr=max(g.size,13*k), corner rr, min sizes 12/6, clamp 0.03-40, rotate snap 15°, tolerance tol=60, pinch clamp 0.15-6.
 * Exports: wirePointer, createPointerRefs (helper to make ovPts/pinch refs)
 */

import { clamp } from '../lib/dom.js';
import { elAt as selElAt, hitHandle as selHitHandle, hitTest, toLocal, snapMove as selSnapMove } from './selection.js';
import { cancelCutSel as cutCancelCutSel, finishCutDraw as cutFinishCutDraw, stampAt as cutStampAt, stopPlacing as cutStopPlacing, updateCutbar as cutUpdateCutbar } from '../tools/cutout.js';

export function createPointerRefs(){
  return { ovPts: new Map(), pinch: null };
}

export function wirePointer(deps){
  const store=deps.store;
  const dom=deps.dom;
  const cv=dom.cv, ov=dom.ov, stage=dom.stage, ed=dom.ed;
  const cutRef=deps.cutRef;
  const placingRef=deps.placingRef;
  const ui=deps.ui || {};
  // refs
  if(!deps.refs) deps.refs={};
  const refs=deps.refs;
  if(!refs.ovPts) refs.ovPts=new Map();
  if(!('pinch' in refs)) refs.pinch=null;
  let pinch=refs.pinch;
  const ovPts=refs.ovPts;
  // optional boolean flag refs (object wrappers so caller can share)
  const flags=deps.flags || {};
  // C: cache canvas rect for drag duration + throttle syncNums (~100ms)
  let _dragRect=null;
  let _lastSync=0;
  function _cacheDragRect(){ try{ _dragRect=cv.getBoundingClientRect(); _lastSync=0; }catch(_){ _dragRect=null; } }
  function _syncThrottled(){
    const now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
    if(now-_lastSync>=100){ _lastSync=now; if(ui.syncNums) ui.syncNums(); }
  }
  function toCanvasLocal(d, e){
    const c=d.dom.cv;
    const r=(_dragRect&&store.drag)?_dragRect:c.getBoundingClientRect();
    return { x:(e.clientX-r.left)*c.width/r.width, y:(e.clientY-r.top)*c.height/r.height };
  }
  // helpers for endDrag/sync etc.
  function beginGesture(){ if(store.beginGesture) store.beginGesture(); }
  function syncNums(){ if(ui.syncNums) ui.syncNums(); }
  function syncTextHLocal(el){
    if(ui.syncTextH) return ui.syncTextH(el);
    try{
      const c=document.createElement('canvas');
      const mctx=c.getContext('2d');
    }catch(_){}
  }
  function fitFilmHLocal(el){ if(ui.fitFilmH) ui.fitFilmH(el); }
  function endDrag(){
    const hadDrag=store.drag;
    if(store.drag && store.commitHistory) store.commitHistory();
    store.drag=null;
    _dragRect=null;
    if(store.guides){ store.guides.v.length=0; store.guides.h.length=0; }
    const inv=ui.invalidate || store.invalidate?.bind(store);
    if(inv) inv();
    if(hadDrag && ui.syncNums) ui.syncNums();
    return hadDrag;
  }
  // helpers using selection module but adapted to deps shape
  function elAtLocal(p){ return selElAt({store}, p); }
  function hitHandleLocal(p){
    const hDeps={ store };
    if(flags.handleGeomRef) hDeps.handleGeomRef=flags.handleGeomRef;
    else if(flags.handleGeom !==undefined) hDeps.handleGeom=flags.handleGeom;
    return selHitHandle(hDeps, p);
  }
  function snapMoveLocal(list,nx,ny,el){
    return selSnapMove({store}, list, nx, ny, el);
  }

  // ---------- pointerdown on ov ----------
  ov.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    ovPts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ovPts.size===2){
      if(cutRef.draw) cutCancelCutSel({cutRef, store, ui, placingRef, dom});
      placingRef.placeArm=null;
      if(store.drag) endDrag();
      const pts=[...ovPts.values()];
      pinch={d0:Math.max(20,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),z0:store.view.zoom};
      refs.pinch=pinch;
      _cacheDragRect();
      return;
    }
    const spaceDown=(flags.spaceDown ? flags.spaceDown.value : false);
    if(spaceDown){
      store.drag={mode:'pan',pid:e.pointerId,sx:e.clientX,sy:e.clientY,sl:stage.scrollLeft,st:stage.scrollTop};
      _cacheDragRect();
      try{ov.setPointerCapture(e.pointerId)}catch(err){}
      return;
    }
    // placing mode: arm; release drops the piece
    if(placingRef.placing){
      if(ui.closeSheet) ui.closeSheet();
      placingRef.placeArm={id:e.pointerId};
      try{ov.setPointerCapture(e.pointerId)}catch(err){}
      return;
    }
    // cut-out tool: start a selection
    if(cutRef.on){
      if(ui.closeSheet) ui.closeSheet();
      const p=toCanvasLocal(deps,e);
      cutRef.draw=true;cutRef.done=false;cutRef.pts=[];cutRef.bbox=null;
      cutRef.start=p;cutRef.last=p;cutRef.seed=(Math.random()*1e6)|0;
      if(cutRef.shape==='lasso')cutRef.pts=[p];
      else cutRef.bbox={x:p.x,y:p.y,w:0,h:0};
      try{ov.setPointerCapture(e.pointerId)}catch(err){}
      cutUpdateCutbar({cutRef});
      const inv2=ui.invalidate || store.invalidate?.bind(store);
      if(inv2) inv2();
      return;
    }
    // normal selection / drag
    if(flags.tapSelect) flags.tapSelect.value=false; else if('tapSelect' in flags) flags.tapSelect.value=false;
    const p=toCanvasLocal(deps,e);
    placingRef.lastCanvasPt=p;
    const one=store.single ? store.single() : null;
    if(one&&!one.locked){
      const hh=hitHandleLocal(p);
      if(hh){
        beginGesture();
        try{ov.setPointerCapture(e.pointerId)}catch(err){}
        if(hh.type==='rotate')store.drag={mode:'rotate',pid:e.pointerId};
        else if(hh.type==='corner'){
          const l=toLocal(one,p.x,p.y);
          store.drag={mode:'corner',pid:e.pointerId,d0:Math.max(6,Math.hypot(l.x,l.y)),w0:one.w,h0:one.h,s0:one.size||0};
        }else{
          store.drag={mode:'edge',pid:e.pointerId,idx:hh.idx};
        }
        _cacheDragRect();
        return;
      }
    }
    let hit=elAtLocal(p);
    if(hit){
      if(e.shiftKey){
        const ids=store.selIds;
        store.selIds=ids.includes(hit.id)?ids.filter(i=>i!==hit.id):[...ids,hit.id];
        if(ui.rebuildProps) ui.rebuildProps();
        if(ui.renderLayers) ui.renderLayers();
        const inv=ui.invalidate || store.invalidate?.bind(store);
        if(inv) inv();
        return;
      }
      if(store.selIds.length===1&&store.selIds[0]===hit.id){
        const i=store.S.els.indexOf(hit);
        for(let j=i-1;j>=0;j--){
          const below=store.S.els[j];
          if(below.visible&&!below.locked&&below.type!=='fx'&&hitTest(below,p)){hit=below;break}
        }
      }
      store.selIds=[hit.id];
      if(ui.rebuildProps) ui.rebuildProps();
      if(ui.renderLayers) ui.renderLayers();
      if(flags.tapSelect) flags.tapSelect.value=true;
      if(!hit.locked){
        beginGesture();
        store.drag={mode:'move',pid:e.pointerId,items:store.selIds.map(id=>{const el=store.elById(id);return{id,ox:el.x-p.x,oy:el.y-p.y}})};
        _cacheDragRect();
        try{ov.setPointerCapture(e.pointerId)}catch(err){}
      }
      if(ui.openSheet) ui.openSheet();
    }else{
      store.selIds=[];
      if(ui.closeSheet) ui.closeSheet();
      if(ui.rebuildProps) ui.rebuildProps();
      if(ui.renderLayers) ui.renderLayers();
      store.drag={mode:'pan',pid:e.pointerId,sx:e.clientX,sy:e.clientY,sl:stage.scrollLeft,st:stage.scrollTop};
      _cacheDragRect();
      try{ov.setPointerCapture(e.pointerId)}catch(err){}
    }
    const inv3=ui.invalidate || store.invalidate?.bind(store);
    if(inv3) inv3();
  });

  // ---------- pointermove ----------
  ov.addEventListener('pointermove',e=>{
    if(ovPts.has(e.pointerId)) ovPts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&ovPts.size>=2){
      const pts=[...ovPts.values()];
      const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      store.view.zoom=clamp(pinch.z0*d/pinch.d0,0.15,6);
      {
        const S=store.S, view=store.view;
        const {w,h}=S.size;
        const fit=Math.max(0.02,Math.min((stage.clientWidth-64)/w,(stage.clientHeight-64)/h));
        view.scale=fit*view.zoom;
        const cw=Math.max(40,Math.round(w*view.scale)),ch=Math.max(40,Math.round(h*view.scale));
        cv.style.width=ov.style.width=cw+'px';
        cv.style.height=ov.style.height=ch+'px';
        const zv=document.querySelector('#zoomVal');
        if(zv) zv.textContent=Math.round(view.scale*100)+'%';
      }
      _cacheDragRect();
      const inv=ui.invalidate || store.invalidate?.bind(store);
      if(inv) inv();
      return;
    }
    // placing mode: ghost follows the pointer
    if(placingRef.placing){
      const p=toCanvasLocal(deps,e);
      placingRef.placePt=p;
      placingRef.lastCanvasPt=p;
      const inv=ui.invalidate || store.invalidate?.bind(store);
      if(inv) inv();
      return;
    }
    // cut-out tool: grow the selection while drawing
    if(cutRef.draw){
      const p=toCanvasLocal(deps,e);
      cutRef.last=p;
      placingRef.lastCanvasPt=p;
      if(cutRef.shape==='lasso'){
        const prev=cutRef.pts[cutRef.pts.length-1];
        if(!prev||Math.hypot(p.x-prev.x,p.y-prev.y)>2) cutRef.pts.push(p);
        if(cutRef.pts.length){
          let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
          for(const q of cutRef.pts){x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y)}
          cutRef.bbox={x:x0,y:y0,w:x1-x0,h:y1-y0};
        }
      }else{
        const s=cutRef.start||p;
        cutRef.bbox={x:Math.min(s.x,p.x),y:Math.min(s.y,p.y),w:Math.abs(p.x-s.x),h:Math.abs(p.y-s.y)};
      }
      cutUpdateCutbar({cutRef});
      const invC=ui.invalidate || store.invalidate?.bind(store);
      if(invC) invC();
      return;
    }
    if(!store.drag){
      const p=toCanvasLocal(deps,e),one=store.single?store.single():null;
      placingRef.lastCanvasPt=p;
      if(cutRef.on){ov.style.cursor='crosshair';return}
      if(one&&!one.locked){
        const hh=hitHandleLocal(p);
        if(hh){
          ov.style.cursor=hh.type==='rotate'?'grab':(hh.type==='corner'?['nwse','nesw','nwse','nesw'][hh.idx]+'-resize':['ns','ew','ns','ew'][hh.idx]+'-resize');
          return;
        }
      }
      const spaceDown2=(flags.spaceDown ? flags.spaceDown.value : false);
      ov.style.cursor=spaceDown2?'grab':(elAtLocal(p)?'move':'default');
      return;
    }
    if(store.drag.mode==='pan'){
      stage.scrollLeft=store.drag.sl-(e.clientX-store.drag.sx);
      stage.scrollTop=store.drag.st-(e.clientY-store.drag.sy);
      return;
    }
    const p=toCanvasLocal(deps,e);
    placingRef.lastCanvasPt=p;
    if(store.drag.mode==='move'){
      const list=store.drag.items.map(m=>store.elById(m.id)).filter(Boolean);
      if(!list.length){store.drag=null;_dragRect=null;return}
      let nx=p.x+store.drag.items[0].ox,ny=p.y+store.drag.items[0].oy;
      const lead=list[0];
      store.guides={v:[],h:[]};
      const effectiveSnapOn=(flags.snapOn ? flags.snapOn.value : false);
      if(effectiveSnapOn&&!e.shiftKey&&list.length===1){const s=snapMoveLocal(list,nx,ny,lead);nx=s.x;ny=s.y}
      const dx=Math.round(nx-lead.x),dy=Math.round(ny-lead.y);
      list.forEach(el=>{el.x+=dx;el.y+=dy});
      store.gestureDirty=true;
      const inv=ui.invalidate || store.invalidate?.bind(store);
      if(inv) inv();
      _syncThrottled();
    }else if(store.drag.mode==='corner'){
      const one2=store.single?store.single():null;if(!one2){store.drag=null;_dragRect=null;return}
      const l=toLocal(one2,p.x,p.y);
      const f=clamp(Math.hypot(l.x,l.y)/store.drag.d0,0.03,40);
      one2.w=Math.max(12,store.drag.w0*f);
      one2.h=Math.max(12,store.drag.h0*f);
      if(one2.type==='text'){syncTextHLocal(one2)}
      if(one2.type==='film')fitFilmHLocal(one2);
      store.gestureDirty=true;
      const inv=ui.invalidate || store.invalidate?.bind(store);
      if(inv) inv();
      _syncThrottled();
    }else if(store.drag.mode==='edge'){
      const one2=store.single?store.single():null;if(!one2){store.drag=null;_dragRect=null;return}
      const l=toLocal(one2,p.x,p.y);
      if(store.drag.idx===1||store.drag.idx===3){one2.w=clamp(Math.abs(l.x)*2,12,9000)}
      else if(one2.type!=='text'){one2.h=clamp(Math.abs(l.y)*2,12,9000)}
      if(one2.type==='text')syncTextHLocal(one2);
      if(one2.type==='film')fitFilmHLocal(one2);
      store.gestureDirty=true;
      const inv=ui.invalidate || store.invalidate?.bind(store);
      if(inv) inv();
      _syncThrottled();
    }else if(store.drag.mode==='rotate'){
      const one2=store.single?store.single():null;if(!one2){store.drag=null;_dragRect=null;return}
      let a=Math.atan2(p.y-one2.y,p.x-one2.x)*180/Math.PI+90;
      if(e.shiftKey)a=Math.round(a/15)*15;
      one2.rot=((a+180)%360+360)%360-180;
      store.gestureDirty=true;
      const inv=ui.invalidate || store.invalidate?.bind(store);
      if(inv) inv();
      _syncThrottled();
    }
  });

  // ---------- pointerup ----------
  ov.addEventListener('pointerup',e=>{
    ovPts.delete(e.pointerId);
    if(ovPts.size<2){ pinch=null; refs.pinch=null; _cacheDragRect(); }
    // placing: drop the piece where released; end unless Shift
    if(placingRef.placing){
      if(placingRef.placeArm&&placingRef.placeArm.id===e.pointerId){
        const p=toCanvasLocal(deps,e);
        const tol=60;
        const inside=p.x>=-tol&&p.x<=store.S.size.w+tol&&p.y>=-tol&&p.y<=store.S.size.h+tol;
        if(inside){
          cutStampAt({store, placingRef, dom, ui}, p);
          if(!e.shiftKey) cutStopPlacing({store, placingRef, dom, ui}, false);
        }
      }
      placingRef.placeArm=null;
      return;
    }
    if(cutRef.draw){
      cutFinishCutDraw({cutRef, store, ui, placingRef, dom});
      return;
    }
    endDrag();
  });

  ov.addEventListener('pointercancel',e=>{
    ovPts.delete(e.pointerId);
    if(ovPts.size<2){ pinch=null; refs.pinch=null; }
    placingRef.placeArm=null;
    if(placingRef.placing) return;
    if(cutRef.draw){ cutCancelCutSel({cutRef, store, ui, placingRef, dom}); return }
    endDrag();
  });

  ov.addEventListener('contextmenu',e=>{
    if(placingRef.placing){e.preventDefault(); cutStopPlacing({store, placingRef, dom, ui}, false)}
  });

  ov.addEventListener('dblclick',e=>{
    if(cutRef.on||placingRef.placing) return;
    const p=toCanvasLocal(deps,e);
    const el=elAtLocal(p);
    if(!el) return;
    if(el.type==='text'&&!el.locked){
      if(ui.openTextEditor) ui.openTextEditor(el);
      else if(deps.openTextEditor) deps.openTextEditor(el);
      return;
    }
    if(el.type==='film'){
      const l=toLocal(el,p.x,p.y);
      const rectsFn=ui.filmRects || deps.filmRects || (()=>[]);
      const rects=rectsFn(el);
      for(const rc of rects){
        if(l.x>=rc.x&&l.x<=rc.x+rc.w&&l.y>=rc.y&&l.y<=rc.y+rc.h){
          if(deps.refs) deps.refs.fillingFrame={id:el.id,i:rc.i};
          if(ui.fillingFrameRef) ui.fillingFrameRef.value={id:el.id,i:rc.i};
          const fi=document.querySelector('#fileInput');
          if(fi) fi.click();
          return;
        }
      }
      return;
    }
    if(el.type==='photo'){
      if(deps.refs) deps.refs.filling=el.id;
      if(ui.fillingRef) ui.fillingRef.value=el.id;
      const fi=document.querySelector('#fileInput');
      if(fi) fi.click();
    }
  });

  // stage pointerdown (deselect / close panels when clicking stage background)
  if(stage){
    stage.addEventListener('pointerdown',e=>{
      if(e.target===stage){
        if(document.body.classList.contains('lib')){ if(ui.closeLib) ui.closeLib(); return }
        if(document.body.classList.contains('sheet')){ if(ui.closeSheet) ui.closeSheet(); return }
        store.selIds=[]; if(ui.rebuildProps) ui.rebuildProps(); if(ui.renderLayers) ui.renderLayers();
        const inv=ui.invalidate || store.invalidate?.bind(store);
        if(inv) inv();
      }
    });
  }

  // ---------- global pointer safety net ----------
  const onGlobalUp=(e)=>{
    ovPts.delete(e.pointerId);
    if(store.drag&&store.drag.pid===e.pointerId) endDrag();
  };
  ['pointerup','pointercancel'].forEach(ev=>window.addEventListener(ev,onGlobalUp,true));
  window.addEventListener('blur',()=>{
    ovPts.clear();
    pinch=null; refs.pinch=null;
    placingRef.placeArm=null;
    if(store.drag) endDrag();
  });

  // return detach handle
  return ()=>{
    window.removeEventListener('pointerup',onGlobalUp,true);
    window.removeEventListener('pointercancel',onGlobalUp,true);
  };
}
