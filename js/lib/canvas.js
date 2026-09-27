'use strict';

import { ACC } from '../config/constants.js';
import { clamp, rng } from './dom.js';

export function rrPath(ctx,x,y,w,h,r){
  r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();
  if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return}
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

let noiseCanvas=null;
export function getNoiseCanvas(){
  if(noiseCanvas)return noiseCanvas;
  const n=document.createElement('canvas');n.width=n.height=140;
  const nc=n.getContext('2d');
  const d=nc.createImageData(140,140);
  for(let i=0;i<d.data.length;i+=4){
    const v=110+(Math.random()*90|0);
    d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;
  }
  nc.putImageData(d,0,0);
  noiseCanvas=n;return n;
}

export function noisePattern(x){
  const p=x.createPattern(getNoiseCanvas(),'repeat');
  try{if(p.setTransform&&window.DOMMatrix)p.setTransform(new DOMMatrix([1.35,0,0,1.35,0,0]))}catch(e){}
  return p;
}

export function tornPath(x,w,h,seed,rag){
  const r=rng(seed||1);
  rag=rag==null?clamp(Math.min(w,h)*0.06,5,24):rag;
  const pts=[],step=clamp(Math.min(w,h)/5,16,64);
  const edge=(x0,y0,x1,y1)=>{
    const len=Math.hypot(x1-x0,y1-y0),n=Math.max(2,Math.round(len/step));
    const nx=-(y1-y0)/len,ny=(x1-x0)/len;
    for(let i=0;i<n;i++){const t=i/n,o=(r()*2-1)*rag;pts.push({x:x0+(x1-x0)*t+nx*o,y:y0+(y1-y0)*t+ny*o})}
  };
  edge(-w/2,-h/2,w/2,-h/2);edge(w/2,-h/2,w/2,h/2);edge(w/2,h/2,-w/2,h/2);edge(-w/2,h/2,-w/2,-h/2);
  x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();
}

export function blobPath(x,w,h,seed){
  const r=rng(seed||2),n=22,pts=[];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,k=0.8+0.38*r();
    pts.push({x:Math.cos(a)*w/2*k,y:Math.sin(a)*h/2*k});
  }
  x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();
}

export function coverDraw(x,img,rx,ry,rw,rh,zoom,ox,oy){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const s=Math.max(rw/iw,rh/ih)*(zoom||1);
  const dw=iw*s,dh=ih*s;
  x.drawImage(img,rx+(rw-dw)/2+(ox||0)*rw,ry+(rh-dh)/2+(oy||0)*rh,dw,dh);
}

export function slotPlaceholder(x,rx,ry,rw,rh,el){
  x.save();
  x.fillStyle='rgba(199,82,42,0.05)';x.fillRect(rx,ry,rw,rh);
  x.setLineDash([Math.max(8,rw*0.04),Math.max(6,rw*0.03)]);
  x.lineWidth=2;x.strokeStyle=ACC;rrPath(x,rx,ry,rw,rh,8);x.stroke();
  x.setLineDash([]);
  const fs=clamp(Math.min(rw,rh)*0.09,13,40);
  x.fillStyle=ACC;x.textAlign='center';x.textBaseline='middle';
  x.font=`600 ${fs}px "IBM Plex Mono"`;
  x.fillText((el.slotLabel||'FILL').toUpperCase(),rx+rw/2,ry+rh/2-fs*0.1);
  x.font=`500 ${fs*0.55}px "IBM Plex Mono"`;
  x.globalAlpha*=0.7;
  x.fillText('double-click',rx+rw/2,ry+rh/2+fs*0.75);
  x.restore();
}
