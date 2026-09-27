'use strict';
import { noisePattern } from '../lib/canvas.js';
import { clamp, hexA, rng } from '../lib/dom.js';
import { FXDEF } from '../config/constants.js';

/* ---------- analog FX overlays ---------- */
const fxc=new Map();
/* fxBitmap caches a dust/scratch bitmap per el; deps-free (only seed/size).
   evicts when fxc.size>12 — threshold preserved verbatim. */
export function fxBitmap(el){
  const w=Math.max(4,Math.round(el.w)),hh=Math.max(4,Math.round(el.h));
  const key=[el.kind,el.seed||3,w,hh].join('|');
  let e=fxc.get(el.id);
  if(e&&e.key===key)return e.c;
  const c=document.createElement('canvas');c.width=w;c.height=hh;
  const x=c.getContext('2d');
  const r=rng(el.seed||3);
  if(el.kind==='dust'){
    const N=Math.round(w*hh/2400);
    for(let i=0;i<N;i++){
      const g=170+r()*70,a=0.2+r()*0.4;
      x.fillStyle=`rgba(${g|0},${g|0},${(g-8)|0},${a})`;
      x.beginPath();x.arc(r()*w,r()*hh,0.5+r()*2.1,0,7);x.fill();
    }
    const Hn=Math.max(3,Math.round(w*hh/90000));
    x.strokeStyle='rgba(235,228,210,0.30)';x.lineWidth=0.9;
    for(let i=0;i<Hn;i++){
      const px=r()*w,py=r()*hh,l=30+r()*90,a=r()*6.28;
      x.beginPath();x.moveTo(px,py);
      x.quadraticCurveTo(px+Math.cos(a+0.5)*l*0.5,py+Math.sin(a+0.5)*l*0.5,px+Math.cos(a)*l,py+Math.sin(a)*l);
      x.stroke();
    }
  }else if(el.kind==='scratch'){
    const K=3+Math.floor(r()*4);
    for(let i=0;i<K;i++){
      const x0=r()*w,slant=(r()*2-1)*w*0.08,lw=0.6+r()*1.3;
      x.strokeStyle=r()<0.7?'rgba(250,246,238,0.5)':'rgba(20,16,12,0.35)';
      x.lineWidth=lw;
      x.beginPath();x.moveTo(x0,-4);
      x.quadraticCurveTo(x0+slant*0.5,hh*0.5,x0+slant,hh+4);
      x.stroke();
    }
  }
  if(fxc.size>12)fxc.clear();
  fxc.set(el.id,{key,c});
  return c;
}
/* drawFx: overlays grain/dust/scratch/leak/vignette. amount defaults via FXDEF. */
export function drawFx(x,el){
  const a=clamp(el.amount==null?FXDEF[el.kind]:el.amount,0,100)/100;
  const w=el.w,hh=el.h;
  x.save();
  x.globalAlpha*=a;
  switch(el.kind){
    case 'grain':
      x.globalCompositeOperation='overlay';
      x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);break;
    case 'dust':
      x.drawImage(fxBitmap(el),-w/2,-hh/2,w,hh);break;
    case 'scratch':
      x.globalCompositeOperation='screen';
      x.drawImage(fxBitmap(el),-w/2,-hh/2,w,hh);break;
    case 'leak':{
      const pts=[[-w/2,-hh/2],[w/2,-hh/2],[w/2,hh/2],[-w/2,hh/2]];
      const p=pts[el.corner==null?1:el.corner];
      const R=Math.hypot(w,hh)*0.8;
      const g=x.createRadialGradient(p[0],p[1],0,p[0],p[1],R);
      g.addColorStop(0,hexA(el.color||'#FF9A3C',0.9));
      g.addColorStop(0.45,hexA(el.color||'#FF9A3C',0.28));
      g.addColorStop(1,hexA(el.color||'#FF9A3C',0));
      x.globalCompositeOperation='screen';
      x.fillStyle=g;x.fillRect(-w/2,-hh/2,w,hh);break;}
    case 'vignette':{
      const R=Math.hypot(w,hh)/2;
      const g=x.createRadialGradient(0,0,R*0.45,0,0,R*1.02);
      g.addColorStop(0,'rgba(0,0,0,0)');
      g.addColorStop(1,`rgba(10,7,4,${0.9})`);
      x.globalCompositeOperation='multiply';
      x.fillStyle=g;x.fillRect(-w/2,-hh/2,w,hh);break;}
  }
  x.restore();
}
