'use strict';
/**
 * text-editor.js — inline text editing (index.html:1730-1779)
 *
 * No globals: functions that used S/selIds/view/editingId/ed/cx store/canvas refs receive them via deps.
 *
 * deps shape:
 *  {
 *    store: Return of createStore() — needs .editingId, .selIds, .view, .invalidate, .elById, .beginGesture, .commitHistory
 *    dom:   { ed, cv, ov, stage }  // textarea element
 *    fx:    { syncTextH?: (el,mctx)=>void, fontCss?: (name)=>string, placeEdDeps?: any }
 *    mctx:  offscreen measurement context (optional; fallback creates one)
 *    view:  alias for store.view (read scale) — alternatively deps.store.view
 *  }
 *
 * Signatures (verbatim bodies except deps wiring):
 *  openTextEditor(deps, el)
 *  placeEd(deps)
 *  closeEd(deps)
 *  wireTextEditor(deps) — attaches ed input/blur/keydown handlers (call once)
 */

import { clamp } from '../lib/dom.js';
import { fontCss as defaultFontCss, syncTextH as defaultSyncTextH } from '../lib/text.js';
import { ACC } from '../config/constants.js';

let _mctx=null;
function getMctx(deps){
  if(deps && deps.mctx) return deps.mctx;
  if(_mctx) return _mctx;
  const c=document.createElement('canvas');
  _mctx=c.getContext('2d');
  return _mctx;
}

export function openTextEditor(deps, el){
  const store=deps.store;
  const dom=deps.dom || {};
  const ed=dom.ed || deps.ed;
  if(!ed) return;
  if(store.editingId) closeEd(deps);
  store.editingId=el.id;
  store.selIds=[el.id];
  if(store.beginGesture) store.beginGesture();
  ed.value=el.text;
  placeEd(deps);ed.style.display='block';
  ed.focus();ed.select();
  const ui=deps.ui || {};
  if(ui.rebuildProps) ui.rebuildProps();
  if(ui.renderLayers) ui.renderLayers();
  if(ui.invalidate) ui.invalidate(); else if(store.invalidate) store.invalidate();
}

export function placeEd(deps){
  const store=deps.store;
  const dom=deps.dom || {};
  const ed=dom.ed || deps.ed;
  if(!ed) return;
  const editingId=store.editingId;
  const el=store.elById(editingId);
  const view=store.view || deps.view;
  if(!el||el.type!=='text'){ed.style.display='none';return}
  const s=view.scale;
  const fontCss=(deps.fx && deps.fx.fontCss) || defaultFontCss;
  ed.style.display='block';
  ed.style.left=((el.x-el.w/2)*s)+'px';
  ed.style.top=((el.y-el.h/2)*s)+'px';
  ed.style.width=(el.w*s)+'px';
  ed.style.height=(el.h*s)+'px';
  ed.style.transform=`rotate(${el.rot||0}deg)`;
  ed.style.fontFamily=fontCss(el.font);
  ed.style.fontSize=Math.max(14,el.size*s)+'px';
  ed.style.fontWeight=el.weight||400;
  ed.style.fontStyle=el.italic?'italic':'normal';
  ed.style.lineHeight=el.lh||1.25;
  ed.style.letterSpacing=((el.ls||0)*s)+'px';
  ed.style.textAlign=el.align||'left';
  ed.style.color=el.color;
  ed.style.caretColor=ACC;
}

export function closeEd(deps){
  const store=deps.store;
  const dom=deps.dom || {};
  const ed=dom.ed || deps.ed;
  if(!ed) return;
  if(!store.editingId) return;
  const editingId=store.editingId;
  const el=store.elById(editingId);
  const mctx=getMctx(deps);
  const syncTextH=(deps.fx && deps.fx.syncTextH) || defaultSyncTextH;
  if(el&&el.type==='text'){el.text=ed.value;syncTextH(el,mctx)}
  store.editingId=null;
  ed.style.display='none';ed.value='';
  if(store.commitHistory) store.commitHistory();
  const ui=deps.ui || {};
  if(ui.invalidate) ui.invalidate(); else if(store.invalidate) store.invalidate();
}

export function wireTextEditor(deps){
  const store=deps.store;
  const dom=deps.dom || {};
  const ed=dom.ed || deps.ed;
  if(!ed || ed._textWired) return;
  ed._textWired=true;
  const mctx=getMctx(deps);
  const syncTextH=(deps.fx && deps.fx.syncTextH) || defaultSyncTextH;
  const viewRef=store ? store.view : deps.view;
  ed.addEventListener('input',()=>{
    const el=store.elById(store.editingId);if(!el)return;
    el.text=ed.value;syncTextH(el,mctx);
    ed.style.height=(el.h*(viewRef?viewRef.scale:1))+'px';
    store.gestureDirty=true;
    const ui=deps.ui || {};
    if(ui.invalidate) ui.invalidate(); else if(store.invalidate) store.invalidate();
  });
  ed.addEventListener('blur',()=>closeEd(deps));
  ed.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ed.blur()}
    e.stopPropagation();
  });
}
