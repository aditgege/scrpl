'use strict';
import { noisePattern, tornPath } from '../lib/canvas.js';
import { hexA, rng } from '../lib/dom.js';

/* ---------- paper elements ---------- */
/* Draws a paper/scrap into the current ctx transform (centered at 0,0). */
export function drawPaper(x,el){
  const w=el.w,hh=el.h,fill=el.fill||'#F1EADA';
  switch(el.kind){
    case 'torn':
      tornPath(x,w,hh,el.seed||5);x.fillStyle=fill;x.fill();
      x.save();tornPath(x,w,hh,el.seed||5);x.clip();
      x.globalCompositeOperation='multiply';x.globalAlpha=.08;x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);
      x.restore();break;
    case 'tape':{
      const r=rng(el.seed||9),zw=Math.max(6,hh*0.2);
      x.save();
      x.beginPath();
      x.moveTo(-w/2,-hh/2);x.lineTo(w/2,-hh/2);
      const steps=4;
      for(let i=1;i<=steps;i++){const ty=-hh/2+hh*i/steps;x.lineTo(w/2+(i%2?zw*(0.5+r()*0.5):0),ty)}
      x.lineTo(-w/2,hh/2);
      for(let i=1;i<=steps;i++){const ty=hh/2-hh*i/steps;x.lineTo(-w/2-(i%2?zw*(0.5+r()*0.5):0),ty)}
      x.closePath();
      x.fillStyle=hexA(fill,0.62);x.fill();
      x.clip();
      x.strokeStyle='rgba(255,255,255,0.12)';x.lineWidth=hh*0.05;
      x.beginPath();x.moveTo(-w/2,-hh*0.16);x.lineTo(w/2,-hh*0.16);x.stroke();
      x.beginPath();x.moveTo(-w/2,hh*0.18);x.lineTo(w/2,hh*0.18);x.stroke();
      x.globalCompositeOperation='multiply';x.globalAlpha=.05;x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);
      x.restore();break;}
    case 'scrap':
      x.fillStyle=fill;x.fillRect(-w/2,-hh/2,w,hh);
      x.save();x.beginPath();x.rect(-w/2,-hh/2,w,hh);x.clip();
      x.globalCompositeOperation='multiply';x.globalAlpha=.08;x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);
      x.restore();
      x.strokeStyle='rgba(42,33,24,0.15)';x.lineWidth=1.5;x.strokeRect(-w/2,-hh/2,w,hh);break;
    case 'receipt':{
      const r=rng(el.seed||4),amp=Math.min(14,hh*0.035);
      x.beginPath();x.moveTo(-w/2,-hh/2);
      const steps=Math.max(6,Math.round(w/26));
      for(let i=1;i<=steps;i++){const tx=-w/2+w*i/steps;x.lineTo(tx,-hh/2+(i%2?amp*0.8:0))}
      x.lineTo(w/2,hh/2);
      for(let i=1;i<=steps;i++){const tx=w/2-w*i/steps;x.lineTo(tx,hh/2-(i%2?amp:0))}
      x.closePath();
      x.fillStyle=fill;x.fill();
      x.save();x.beginPath();x.rect(-w/2,-hh/2,w,hh);x.clip();
      x.globalCompositeOperation='multiply';x.globalAlpha=.06;x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);
      x.globalCompositeOperation='source-over';x.globalAlpha=1;
      x.fillStyle='rgba(42,33,24,0.45)';
      x.fillRect(-w/2+w*0.1,-hh/2+hh*0.08,w*0.8,3);
      x.fillStyle='rgba(42,33,24,0.22)';
      const rows=Math.floor(hh*0.62/(hh*0.055));
      for(let i=0;i<rows;i++){
        const y=-hh/2+hh*0.17+i*hh*0.055;
        const bw=w*(0.25+r()*0.55);
        x.fillRect(-w/2+w*0.1,y,bw,Math.max(2,hh*0.014));
      }
      x.fillStyle='rgba(160,60,40,0.5)';
      x.fillRect(-w/2+w*0.1,hh/2-hh*0.12,w*0.35,2.5);
      x.restore();break;}
    case 'postcard':{
      x.fillStyle=fill;x.fillRect(-w/2,-hh/2,w,hh);
      x.save();x.beginPath();x.rect(-w/2,-hh/2,w,hh);x.clip();
      x.globalCompositeOperation='multiply';x.globalAlpha=.07;x.fillStyle=noisePattern(x);x.fillRect(-w/2,-hh/2,w,hh);
      x.globalCompositeOperation='source-over';x.globalAlpha=1;
      x.strokeStyle='rgba(42,33,24,0.5)';x.lineWidth=2;x.strokeRect(-w/2+10,-hh/2+10,w-20,hh-20);
      x.lineWidth=1;x.strokeRect(-w/2+16,-hh/2+16,w-32,hh-32);
      x.fillStyle='rgba(42,33,24,0.6)';
      x.font=`600 ${Math.max(12,hh*0.045)}px "IBM Plex Mono"`;
      x.textAlign='center';x.fillText('POST CARD',0,-hh/2+hh*0.12);
      const sx=w/2-w*0.24,sy=-hh/2+hh*0.18,sw=w*0.16,sh=hh*0.2;
      x.setLineDash([5,4]);x.strokeStyle='rgba(42,33,24,0.5)';
      x.strokeRect(sx,sy,sw,sh);x.setLineDash([]);
      x.fillStyle='rgba(42,33,24,0.18)';
      for(let i=0;i<5;i++)x.fillRect(-w/2+w*0.08,-hh/2+hh*0.42+i*hh*0.07,w*0.5,Math.max(2,hh*0.012));
      for(let i=0;i<4;i++)x.fillRect(w/2-w*0.42,hh/2-hh*0.4+i*hh*0.07,w*0.34,Math.max(2,hh*0.012));
      x.restore();break;}
    default:drawPaper(x,{...el,kind:'scrap'});
  }
}
