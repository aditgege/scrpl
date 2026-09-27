'use strict';
import { rrPath, noisePattern, tornPath, blobPath, coverDraw, slotPlaceholder } from '../lib/canvas.js';
import { clamp, hexA, rad, rng } from '../lib/dom.js';
import { photoBitmap } from './photo.js';
import { filmBitmap } from './film.js';
import { drawStickerShape } from './sticker.js';
import { drawPaper } from './paper.js';
import { drawTextEl } from './text.js';
import { drawFx } from './fx.js';

/* ---------- background & scene ---------- */
/* drawBackground(x, W, H, state): state={bg, size} where bg={color,texture,grain}
   In the inline version S was closed over; here it is passed via `state`. */
let _bgCache=null,_bgCacheKey=null;
function _bgKey(W,H,S){return W+'x'+H+'|'+(S.bg.color||'')+'|'+(S.bg.texture||'paper')+'|'+(S.bg.grain||0)}
function _drawBackgroundFull(x,W,H,S){
  x.fillStyle=S.bg.color||'#EFE7D8';x.fillRect(0,0,W,H);
  const t=S.bg.texture||'paper';
  x.save();
  x.beginPath();x.rect(0,0,W,H);x.clip();
  const n=noisePattern(x);
  if(t==='paper'){
    x.globalCompositeOperation='multiply';x.globalAlpha=.06;x.fillStyle=n;x.fillRect(0,0,W,H);
    const r=rng(7);
    x.globalAlpha=.05;x.strokeStyle='#5C4A33';x.lineWidth=1;
    const c=Math.round(W*H/16000);
    for(let i=0;i<c;i++){
      const px=r()*W,py=r()*H,a=r()*6.28,l=8+r()*26;
      x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke();
    }
  }else if(t==='kraft'){
    x.globalCompositeOperation='multiply';x.globalAlpha=.12;x.fillStyle=n;x.fillRect(0,0,W,H);
    const r=rng(11);
    for(let i=0;i<7;i++){
      const gx=r()*W,gy=r()*H,gr=120+r()*220;
      const g=x.createRadialGradient(gx,gy,0,gx,gy,gr);
      g.addColorStop(0,'rgba(110,80,44,0.06)');g.addColorStop(1,'rgba(110,80,44,0)');
      x.fillStyle=g;x.fillRect(0,0,W,H);
    }
  }else if(t==='dots'){
    x.fillStyle='rgba(60,45,30,0.10)';
    for(let py=14;py<H;py+=26)for(let px=14;px<W;px+=26){x.beginPath();x.arc(px,py,1.4,0,7);x.fill()}
  }else if(t==='grid'){
    x.strokeStyle='rgba(60,45,30,0.12)';x.lineWidth=1;
    for(let px=0;px<=W;px+=54){x.beginPath();x.moveTo(px,0);x.lineTo(px,H);x.stroke()}
    for(let py=0;py<=H;py+=54){x.beginPath();x.moveTo(0,py);x.lineTo(W,py);x.stroke()}
  }
  const gr=clamp(S.bg.grain||0,0,100);
  if(gr>0){
    x.globalCompositeOperation='overlay';x.globalAlpha=gr/100*.3;
    x.fillStyle=n;x.fillRect(0,0,W,H);
  }
  x.restore();
}
export function drawBackground(x,W,H,state){
  if(!state||!state.bg) return _drawBackgroundFull(x,W,H,state||{bg:{}});
  const k=_bgKey(W,H,state);
  if(_bgCache&&_bgCacheKey===k&&_bgCache.width===W&&_bgCache.height===H){x.drawImage(_bgCache,0,0);return}
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const cx=c.getContext('2d');
  if(!cx) return _drawBackgroundFull(x,W,H,state);
  _drawBackgroundFull(cx,W,H,state);
  _bgCache=c;_bgCacheKey=k;
  x.drawImage(c,0,0);
}
/* drawElement(x, el, o, deps): o={editor}, deps={assets, mctx}
   `editor` flag mirrors the inline `o.editor` (placeholder vs blank).
   `assets` and `mctx` are injected so this module imports no store. */
export function drawElement(x,el,o={},deps){
  const assets=deps && deps.assets;
  const mctx=deps && deps.mctx;
  const preview=(o&&o.preview)||(deps&&deps.preview);
  x.save();
  x.translate(el.x,el.y);x.rotate(rad(el.rot||0));
  x.globalAlpha=clamp(el.opacity==null?1:el.opacity,0,1);
  const sh=el.shadow;
  if(sh&&sh.on&&!preview){
    x.shadowColor=hexA(sh.color||'#26201A',clamp((sh.a==null?30:sh.a)/100,0,1));
    x.shadowBlur=sh.blur||0;x.shadowOffsetX=sh.x||0;x.shadowOffsetY=sh.y||0;
  }
  switch(el.type){
    case 'photo':{const b=photoBitmap(el,o.editor,{assets});x.drawImage(b,-el.w/2,-el.h/2,el.w,el.h);break}
    case 'film':{const b=filmBitmap(el,o.editor,{assets});x.drawImage(b,-el.w/2,-el.h/2,el.w,el.h);break}
    case 'snippet':{
      const a=el.assetId&&assets.get(el.assetId);
      if(a&&a.img)x.drawImage(a.img,-el.w/2,-el.h/2,el.w,el.h);
      break;}
    case 'sticker':drawStickerShape(x,el.kind,el.w,el.h,el.fill,el.style);break;
    case 'paper':drawPaper(x,el);break;
    case 'text':drawTextEl(x,el,{mctx});break;
    case 'fx':drawFx(x,el);break;
  }
  x.restore();
}
/* renderScene(x, state, o, deps): o={transparent, skip:{id:1}, editor}, deps={assets, mctx}
   Composes drawBackground + drawElement over state.els. Keeps the globs
   (S, assets, mctx) as params so callers do `renderScene(cx, S, {editor:true}, {assets,mctx})`. */
export function renderScene(x,state,o={},deps){
  const S=state;
  const W=S.size.w,H=S.size.h;
  const preview=(o&&o.preview)||(deps&&deps.preview);
  x.save();
  x.clearRect(0,0,W,H);
  if(!o.transparent){
    if(preview){x.fillStyle=S.bg.color||'#EFE7D8';x.fillRect(0,0,W,H)}
    else drawBackground(x,W,H,S);
  }
  for(const el of S.els){
    if(!el.visible)continue;
    if(o.skip&&o.skip[el.id])continue;
    if(preview&&el.type==='fx')continue;
    drawElement(x,el,o,deps);
  }
  x.restore();
}
