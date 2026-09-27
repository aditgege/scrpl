'use strict';
/**
 * selection.js — selection geometry + overlay (index.html:1368-1497)
 *
 * Deps convention (no globals):
 *  - elPoints(el)                       pure, no deps
 *  - toCanvas(deps, e)                  deps={ dom:{cv} } -> {x,y} canvas coords
 *  - toLocal(el, wx, wy)                pure (uses rad)
 *  - hitTest(el, p)                     pure (uses toLocal)
 *  - elAt(deps, p)                      deps={ store } -> element or null
 *  - hitHandle(deps, p)                 deps={ store, dom, handleGeomRef } -> {type,idx}|null
 *  - snapMove(deps, list, nx, ny, el)   deps={ store } -> {x,y}
 *  - drawGhost(deps)                    deps={ store, dom:{ox}, placingRef, assets? } -> void
 *  - drawOverlay(deps)                  deps={ store, dom:{ov,ox}, placingRef, cutRef, guidesRef|store.guides, handleGeomRef, assets?, selPath? } -> void
 *
 * Notes:
 *  - view.scale accessed via store.view.scale; guides via store.guides
 *  - handleGeomRef is mutable { value: null|object }; if omitted, module-local handleGeom is used.
 *  - selPath imported from ../tools/cutout.js (no cycle: cutout does not import selection)
 *  - Thresholds / geometry kept byte-identical.
 */

import { rad } from '../lib/dom.js';
import { ACC, INK } from '../config/constants.js';
import { assets as defaultAssets } from '../assets/manager.js';
import { selPath } from '../tools/cutout.js';

let _handleGeom = null;
export function getHandleGeom(){ return _handleGeom; }

export function elPoints(el){
  const r=rad(el.rot||0),c=Math.cos(r),s=Math.sin(r);
  const P=(lx,ly)=>({x:el.x+lx*c-ly*s,y:el.y+lx*s+ly*c});
  const hw=el.w/2,hh=el.h/2;
  return{
    corners:[P(-hw,-hh),P(hw,-hh),P(hw,hh),P(-hw,hh)],
    edges:[P(0,-hh),P(hw,0),P(0,hh),P(-hw,0)],
    rot:P(0,-hh-(Math.max(26,el.h*0.08)))
  };
}

export function toCanvas(deps, e){
  const cv=(deps && deps.dom && deps.dom.cv) || (deps && deps.cv) || deps;
  // allow toCanvas(cv,e) overload
  if(cv && cv.getBoundingClientRect && !e){
    // called as toCanvas(e) with global cv fallback — not used in ESM, but keep error
    throw new Error('toCanvas requires deps with dom.cv');
  }
  const targetCv=(deps && deps.dom && deps.dom.cv) ? deps.dom.cv : (deps && deps.cv ? deps.cv : null);
  const ev=e || deps;
  const c=targetCv || (typeof cv!=='undefined' ? cv : null);
  if(!c || !c.getBoundingClientRect) throw new Error('toCanvas: missing cv');
  const r=c.getBoundingClientRect();
  return{x:(ev.clientX-r.left)*c.width/r.width,y:(ev.clientY-r.top)*c.height/r.height};
}
// overload helper for callers that pass (e) with deps captured via closure — keep original verbatim body available
export function toLocal(el,wx,wy){
  const r=rad(-(el.rot||0)),dx=wx-el.x,dy=wy-el.y;
  return{x:dx*Math.cos(r)-dy*Math.sin(r),y:dx*Math.sin(r)+dy*Math.cos(r)};
}

export function hitTest(el,p){
  const l=toLocal(el,p.x,p.y);
  return Math.abs(l.x)<=el.w/2&&Math.abs(l.y)<=el.h/2;
}

export function elAt(deps,p){
  const store=deps.store || deps;
  const S=store.S;
  for(let i=S.els.length-1;i>=0;i--){
    const el=S.els[i];
    if(!el.visible||el.locked)continue;
    if(el.type==='fx')continue;
    if(hitTest(el,p))return el;
  }
  return null;
}

export function hitHandle(deps,p){
  const store=deps.store || deps;
  const handleGeom=(deps.handleGeomRef ? deps.handleGeomRef.value : (deps.handleGeom !==undefined ? deps.handleGeom : _handleGeom));
  const one=store.single ? store.single() : (store.selIds && store.selIds.length===1 ? store.elById(store.selIds[0]) : null);
  if(!one||!handleGeom)return null;
  const g=handleGeom,k=1/store.view.scale;
  if(Math.hypot(p.x-g.rot.p.x,p.y-g.rot.p.y)<Math.max(g.rot.r*2,15*k))return{type:'rotate'};
  const rr=Math.max(g.size,13*k);
  for(let i=0;i<4;i++){const c=g.corners[i];if(Math.abs(p.x-c.x)<rr&&Math.abs(p.y-c.y)<rr)return{type:'corner',idx:i}}
  for(let i=0;i<4;i++){const c=g.edges[i];if(Math.hypot(p.x-c.x,p.y-c.y)<rr)return{type:'edge',idx:i}}
  return null;
}

export function snapMove(deps,list,nx,ny,el){
  const store=deps.store || deps;
  const S=store.S;
  const guides=(deps.guidesRef || store.guides);
  const view=store.view;
  const{w:W,h:H}=S.size,T=12/view.scale;
  const xs=[0,W/2,W],ys=[0,H/2,H];
  S.els.forEach(o=>{
    if(list.includes(o)||!o.visible||o.type==='fx')return;
    xs.push(o.x-o.w/2,o.x,o.x+o.w/2);
    ys.push(o.y-o.h/2,o.y,o.y+o.h/2);
  });
  let bx=null,by=null;
  [nx-el.w/2,nx,nx+el.w/2].forEach(a=>xs.forEach(b=>{const d=b-a;if(Math.abs(d)<T&&(!bx||Math.abs(d)<Math.abs(bx.d)))bx={d,b}}));
  [ny-el.h/2,ny,ny+el.h/2].forEach(a=>ys.forEach(b=>{const d=b-a;if(Math.abs(d)<T&&(!by||Math.abs(d)<Math.abs(by.d)))by={d,b}}));
  if(bx){nx+=bx.d;guides.v.push(bx.b)}
  if(by){ny+=by.d;guides.h.push(by.b)}
  return{x:nx,y:ny};
}

export function drawGhost(deps){
  const store=deps.store;
  const placingRef=deps.placingRef;
  const dom=deps.dom || deps;
  const ox=(dom && dom.ox) || deps.ox;
  const assets=(deps.assets) || defaultAssets;
  if(!placingRef || !placingRef.placing || !placingRef.placePt) return;
  const placing=placingRef.placing;
  const placePt=placingRef.placePt;
  if(!ox) return;
  const a=assets.get(placing.assetId);
  ox.save();
  ox.translate(placePt.x,placePt.y);
  ox.globalAlpha=.6;
  if(a&&a.img)ox.drawImage(a.img,-placing.w/2,-placing.h/2,placing.w,placing.h);
  ox.globalAlpha=1;
  ox.strokeStyle=ACC;
  ox.setLineDash([12,9]);
  ox.lineWidth=2;
  ox.strokeRect(-placing.w/2,-placing.h/2,placing.w,placing.h);
  ox.setLineDash([]);
  ox.restore();
}

export function drawOverlay(deps){
  const store=deps.store;
  const dom=deps.dom || {};
  const ox=(dom && dom.ox) || deps.ox;
  const ov=(dom && dom.ov) || deps.ov;
  const placingRef=deps.placingRef;
  const cutRef=deps.cutRef;
  const assets=(deps.assets)||defaultAssets;
  // guides may be store.guides or deps.guidesRef
  const guides=(deps.guidesRef || store.guides);
  let handleGeomRef=deps.handleGeomRef || null;
  // sync helper to write handleGeom
  function setHandle(v){
    _handleGeom=v;
    if(handleGeomRef) handleGeomRef.value=v;
    if('handleGeom' in deps) deps.handleGeom=v;
  }
  if(!ox || !ov) return;
  ox.clearRect(0,0,ov.width,ov.height);
  const k=1/store.view.scale;
  if(guides.v.length||guides.h.length){
    ox.save();ox.strokeStyle=ACC;ox.lineWidth=Math.max(1,k*1.2);ox.setLineDash([10*k,7*k]);
    guides.v.forEach(g=>{ox.beginPath();ox.moveTo(g,0);ox.lineTo(g,ov.height);ox.stroke()});
    guides.h.forEach(g=>{ox.beginPath();ox.moveTo(0,g);ox.lineTo(ov.width,g);ox.stroke()});
    ox.restore();
  }
  // SCRL ticket 03 — lintas-batas warning (thin solid red, distinct from dashed ACC)
  // EXTENSION POINT: export strip (ticket 02) can reuse elCrossesGuides/crossedGuidesForEls for per-slice badges
  {
    const crossed = deps.crossedGuides || deps.crossedV || deps.scrlCrossed || null;
    const list = Array.isArray(crossed) ? crossed : (crossed && Array.isArray(crossed.v) ? crossed.v : null);
    if(list && list.length){
      ox.save();
      ox.strokeStyle='#E5484D';
      ox.lineWidth=Math.max(1.2,1.5*k);
      ox.setLineDash([]);
      list.forEach(g=>{ox.beginPath();ox.moveTo(g,0);ox.lineTo(g,ov.height);ox.stroke()});
      ox.restore();
    }
  }
  if(cutRef && cutRef.on&&(cutRef.draw||cutRef.done)&&cutRef.bbox){
    ox.save();
    ox.fillStyle='rgba(199,82,42,0.10)';
    ox.strokeStyle=ACC;
    ox.lineWidth=Math.max(1.4,1.6*k);
    ox.setLineDash([12*k,8*k]);
    selPath(ox,cutRef);
    ox.fill();
    ox.stroke();
    ox.restore();
  }
  if(!store.selIds.length){setHandle(null);drawGhost(deps);return}
  const one=store.single ? store.single() : null;
  const boxes=store.selIds.map(id=>store.elById(id)).filter(Boolean);
  ox.save();
  boxes.forEach(el=>{
    if(!el)return;
    const p=elPoints(el);
    ox.lineWidth=Math.max(1.4,1.6*k);
    ox.strokeStyle=el.slot?ACC:INK;
    if(el.slot)ox.setLineDash([12*k,8*k]);
    ox.beginPath();
    p.corners.forEach((c,i)=>i?ox.lineTo(c.x,c.y):ox.moveTo(c.x,c.y));
    ox.closePath();ox.stroke();
    ox.setLineDash([]);
  });
  if(one){
    const p=elPoints(one);
    ox.beginPath();ox.moveTo(p.edges[0].x,p.edges[0].y);ox.lineTo(p.rot.x,p.rot.y);ox.stroke();
    ox.beginPath();ox.arc(p.rot.x,p.rot.y,7*k,0,7);
    ox.fillStyle='#F4F1EA';ox.fill();ox.stroke();
    const hs=Math.max(7,9*k);
    p.corners.forEach(c=>{ox.fillStyle='#F4F1EA';ox.fillRect(c.x-hs/2,c.y-hs/2,hs,hs);ox.strokeRect(c.x-hs/2,c.y-hs/2,hs,hs)});
    p.edges.forEach(c=>{
      ox.fillStyle='#F4F1EA';ox.beginPath();ox.arc(c.x,c.y,hs*0.62,0,7);ox.fill();ox.stroke();
    });
    const geom={corners:p.corners,edges:p.edges,rot:{p:p.rot,r:7*k},size:hs};
    setHandle(geom);
    if(one.slot){
      const lbl=(one.slotLabel||'slot').toUpperCase();
      ox.font=`600 ${Math.max(11,12*k)}px "IBM Plex Mono"`;
      const tw=ox.measureText(lbl).width;
      ox.fillStyle=ACC;ox.fillRect(p.corners[0].x,p.corners[0].y-28*k,tw+14*k,19*k);
      ox.fillStyle='#17120C';ox.textBaseline='middle';
      ox.fillText(lbl,p.corners[0].x+7*k,p.corners[0].y-28*k+10*k);
      ox.textBaseline='alphabetic';
    }
  }else setHandle(null);
  ox.restore();
  drawGhost(deps);
}
