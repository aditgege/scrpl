'use strict';
import { rrPath, noisePattern, coverDraw, slotPlaceholder } from '../lib/canvas.js';
import { clamp } from '../lib/dom.js';

/* ---------- filmstrip ---------- */
/* Signatures (deps injection — no store import, avoids cycles):
   - filmRects(el): pure; returns array of {x,y,w,h,i} frame rects for current orient/n/gutter
   - filmKey(el, ed): key string for cache miss check
   - filmBitmap(el, ed, deps): deps={assets}; assets is Map<id,{src,img}>
     Module-local `fc` Map; evicts when fc.size>14. */
export function filmRects(el){
  const v=el.orient!=='h',n=clamp(el.n||3,2,8),g=el.gutter==null?12:el.gutter;
  const spw=el.sprocket?clamp((v?el.w:el.h)*0.09,14,40):0;
  const arr=[];
  if(v){
    const wx=spw+g,ww=el.w-2*wx;
    const wh=(el.h-2*g-(n-1)*g)/n;
    if(ww>6&&wh>6)for(let i=0;i<n;i++)arr.push({x:-el.w/2+wx,y:-el.h/2+g+i*(wh+g),w:ww,h:wh,i});
  }else{
    const wy=spw+g,hh=el.h-2*wy;
    const ww=(el.w-2*g-(n-1)*g)/n;
    if(ww>6&&hh>6)for(let i=0;i<n;i++)arr.push({x:-el.w/2+g+i*(ww+g),y:-el.h/2+wy,w:ww,h:hh,i});
  }
  return arr;
}
const fc=new Map();
export function filmKey(el,ed){return [Math.round(el.w),Math.round(el.h),el.n,el.orient,el.filmColor,el.gutter,el.sprocket?1:0,el.tone||0,el.grain==null?16:el.grain,(el.frames||[]).join(','),ed?1:0].join('|')}
export function filmBitmap(el,ed,deps){
  const assets=deps.assets;
  const w=Math.max(20,Math.round(el.w)),hh=Math.max(20,Math.round(el.h));
  const key=filmKey(el,ed);
  let e=fc.get(el.id);
  if(e&&e.key===key)return e.c;
  const c=document.createElement('canvas');c.width=w;c.height=hh;
  const x=c.getContext('2d');
  x.translate(w/2,hh/2);
  x.fillStyle=el.filmColor||'#211C16';
  rrPath(x,-w/2,-hh/2,w,hh,6);x.fill();
  const v=el.orient!=='h';
  const rects=filmRects(el);
  const F={sepia:clamp(el.tone==null?25:el.tone,0,100)};
  rects.forEach(rc=>{
    x.save();
    x.fillStyle='rgba(0,0,0,0.30)';x.fillRect(rc.x,rc.y,rc.w,rc.h);
    const img=(el.frames&&el.frames[rc.i])?assets.get(el.frames[rc.i]):null;
    if(img&&img.img){
      x.beginPath();rrPath(x,rc.x,rc.y,rc.w,rc.h,2);x.clip();
      x.filter=`sepia(${F.sepia}%) brightness(96%)`;
      coverDraw(x,img.img,rc.x,rc.y,rc.w,rc.h,1,0,0);
      x.filter='none';
    }else if(ed){
      slotPlaceholder(x,rc.x+4,rc.y+4,rc.w-8,rc.h-8,{slotLabel:'FRAME '+(rc.i+1)});
    }
    x.restore();
  });
  const gr=el.grain==null?16:el.grain;
  if(gr>0){
    x.save();x.globalCompositeOperation='overlay';x.globalAlpha=gr/100*0.4;
    x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);x.restore();
  }
  if(el.sprocket){
    const spw=clamp((v?w:hh)*0.09,14,40),r=spw*0.3,step=spw*0.95;
    x.save();x.globalCompositeOperation='destination-out';x.fillStyle='#000';
    if(v){
      for(let py=-hh/2+spw*0.9;py<hh/2-spw*0.4;py+=step){
        x.beginPath();x.arc(-w/2+spw/2,py,r,0,7);x.fill();
        x.beginPath();x.arc(w/2-spw/2,py,r,0,7);x.fill();
      }
    }else{
      for(let px=-w/2+spw*0.9;px<w/2-spw*0.4;px+=step){
        x.beginPath();x.arc(px,-hh/2+spw/2,r,0,7);x.fill();
        x.beginPath();x.arc(px,hh/2-spw/2,r,0,7);x.fill();
      }
    }
    x.restore();
  }
  if(fc.size>14)fc.clear();
  fc.set(el.id,{key,c});
  return c;
}
