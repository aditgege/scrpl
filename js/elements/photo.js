'use strict';
import { rrPath, noisePattern, tornPath, blobPath, coverDraw, slotPlaceholder } from '../lib/canvas.js';

/* ---------- photo bitmap (frame + mask + filters, cached) ---------- */
/* Signatures (deps injection — no store import, avoids cycles):
   - photoKey(el, ed): el=element, ed=editor flag (shows placeholder when missing img)
   - photoBitmap(el, ed, deps): deps={assets} where assets is Map<id,{src,img}>
     Module-local `pc` Map caches per-el canvas; evicts when pc.size>30. */
const pc=new Map();
export function photoKey(el,ed){return [el.assetId,el.mask,Math.round(el.w),Math.round(el.h),el.pad||0,el.maskColor,el.radius||0,el.seed||0,el.pzoom||1,el.px||0,el.py||0,JSON.stringify(el.filters||{}),el.slot?el.slotLabel:'',ed?1:0].join('|')}
export function photoBitmap(el,ed,deps){
  const assets=deps.assets;
  const w=Math.max(4,Math.round(el.w)),hh=Math.max(4,Math.round(el.h));
  const key=photoKey(el,ed);
  let e=pc.get(el.id);
  if(e&&e.key===key)return e.c;
  const c=document.createElement('canvas');c.width=w;c.height=hh;
  const x=c.getContext('2d');
  x.translate(w/2,hh/2);
  const img=el.assetId&&assets.get(el.assetId)?assets.get(el.assetId).img:null;
  const F=Object.assign({bright:100,contrast:100,sepia:0,grain:0,fade:0},el.filters);
  const pad=el.pad||0,col=el.maskColor||'#F7F2E7';
  const photo=(rx,ry,rw,rh)=>{
    if(!img){if(ed)slotPlaceholder(x,rx,ry,rw,rh,el);return}
    x.save();
    x.filter=`brightness(${F.bright}%) contrast(${F.contrast}%) sepia(${F.sepia}%)`;
    coverDraw(x,img,rx,ry,rw,rh,el.pzoom||1,el.px||0,el.py||0);
    x.filter='none';
    if(F.grain){
      x.globalCompositeOperation='overlay';x.globalAlpha=F.grain/100*0.5;
      x.fillStyle=noisePattern(x);x.fillRect(rx,ry,rw,rh);
      x.globalAlpha=1;x.globalCompositeOperation='source-over';
    }
    if(F.fade){
      const m=Math.min(rw,rh);
      const g=x.createRadialGradient(rx+rw/2,ry+rh/2,m*0.32,rx+rw/2,ry+rh/2,m*0.78);
      g.addColorStop(0,'rgba(240,230,208,0)');
      g.addColorStop(1,`rgba(240,230,208,${F.fade/100*0.85})`);
      x.fillStyle=g;x.fillRect(rx,ry,rw,rh);
    }
    x.restore();
  };
  const win=(build,rx,ry,rw,rh)=>{x.save();x.beginPath();build();x.clip();photo(rx,ry,rw,rh);x.restore()};
  const paperNoise=()=>{x.save();x.globalCompositeOperation='multiply';x.globalAlpha=.07;x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);x.restore()};

  switch(el.mask){
    case 'rounded':
      win(()=>rrPath(x,-w/2,-hh/2,w,hh,el.radius||w*0.06),-w/2,-hh/2,w,hh);break;
    case 'circle':
      x.fillStyle=col;x.beginPath();x.ellipse(0,0,w/2+pad,hh/2+pad,0,0,7);x.fill();
      x.save();x.beginPath();x.ellipse(0,0,w/2+pad,hh/2+pad,0,0,7);x.clip();paperNoise();x.restore();
      win(()=>{x.beginPath();x.ellipse(0,0,w/2,hh/2,0,0,7)},-w/2,-hh/2,w,hh);break;
    case 'organic':
      blobPath(x,w+pad*2,hh+pad*2,el.seed||3);x.fillStyle=col;x.fill();
      x.save();blobPath(x,w+pad*2,hh+pad*2,el.seed||3);x.clip();paperNoise();x.restore();
      win(()=>blobPath(x,w,hh,(el.seed||3)+13),-w/2,-hh/2,w,hh);break;
    case 'torn':
      tornPath(x,w+pad*2,hh+pad*2,el.seed||5);x.fillStyle=col;x.fill();
      x.save();tornPath(x,w+pad*2,hh+pad*2,el.seed||5);x.clip();paperNoise();x.restore();
      win(()=>tornPath(x,Math.max(20,w-pad*2),Math.max(20,hh-pad*2),(el.seed||5)+7),-w/2+pad,-hh/2+pad,w-pad*2,hh-pad*2);break;
    case 'polaroid':{
      x.fillStyle=col;x.fillRect(-w/2,-hh/2,w,hh);
      x.save();x.beginPath();x.rect(-w/2,-hh/2,w,hh);x.clip();paperNoise();x.restore();
      const bw=Math.max(10,pad),by=bw*3.4;
      win(()=>{x.beginPath();x.rect(-w/2+bw,-hh/2+bw,w-2*bw,hh-bw-by)},-w/2+bw,-hh/2+bw,w-2*bw,hh-bw-by);
      x.strokeStyle='rgba(42,33,24,0.10)';x.lineWidth=1.5;
      x.strokeRect(-w/2+bw+3,-hh/2+bw+3,w-2*bw-6,hh-bw-by-6);
      break;}
    case 'stamp':{
      x.fillStyle=col;x.fillRect(-w/2,-hh/2,w,hh);
      const ins=Math.max(8,pad*1.35);
      win(()=>{x.beginPath();x.rect(-w/2+ins,-hh/2+ins,w-2*ins,hh-2*ins)},-w/2+ins,-hh/2+ins,w-2*ins,hh-2*ins);
      x.strokeStyle='rgba(42,33,24,0.16)';x.lineWidth=1.5;
      x.strokeRect(-w/2+ins-4,-hh/2+ins-4,w-2*ins+8,hh-2*ins+8);
      const r=Math.max(3,pad*0.42),step=r*2.5;
      x.save();x.globalCompositeOperation='destination-out';x.fillStyle='#000';
      for(let px=-w/2+r;px<w/2-r;px+=step){
        x.beginPath();x.arc(px,-hh/2,r,0,7);x.fill();
        x.beginPath();x.arc(px,hh/2,r,0,7);x.fill();
      }
      for(let py=-hh/2+r;py<hh/2-r;py+=step){
        x.beginPath();x.arc(-w/2,py,r,0,7);x.fill();
        x.beginPath();x.arc(w/2,py,r,0,7);x.fill();
      }
      x.restore();
      break;}
    case 'film':{
      x.fillStyle=col||'#211C16';x.fillRect(-w/2,-hh/2,w,hh);
      const ix=Math.max(8,pad*0.9),iy=Math.max(10,pad*1.5);
      win(()=>{x.beginPath();x.rect(-w/2+ix,-hh/2+iy,w-2*ix,hh-2*iy)},-w/2+ix,-hh/2+iy,w-2*ix,hh-2*iy);
      const r=Math.max(3,pad*0.38),step=pad*1.15,hy=hh/2-pad*0.55;
      x.save();x.globalCompositeOperation='destination-out';x.fillStyle='#000';
      for(let px=-w/2+pad*0.7;px<w/2-pad*0.5;px+=step){
        x.beginPath();x.arc(px,-hy,r,0,7);x.fill();
        x.beginPath();x.arc(px,hy,r,0,7);x.fill();
      }
      x.restore();
      break;}
    default:
      win(()=>rrPath(x,-w/2,-hh/2,w,hh,el.radius||0),-w/2,-hh/2,w,hh);
  }
  if(pc.size>30)pc.clear();
  pc.set(el.id,{key,c});
  return c;
}