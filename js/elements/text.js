'use strict';
import { fontStr, wrapLines } from '../lib/text.js';

/* ---------- text ---------- */
/* Draws wrapped text for el into ctx (centered at 0,0 via drawElement).
   deps={mctx} — mctx is a shared offscreen 2d ctx used by wrapLines for
   measuring; passed in rather than closed over so the module stays stateless
   and cycle-free. */
export function drawTextEl(x,el,deps){
  const mctx=deps.mctx;
  const lines=wrapLines(el,mctx);
  x.font=fontStr(el);
  try{x.letterSpacing=(el.ls||0)+'px'}catch(e){}
  x.textAlign=el.align||'left';x.textBaseline='alphabetic';
  const ax=el.align==='center'?0:(el.align==='right'?el.w/2:-el.w/2);
  const put=()=>{lines.forEach((ln,i)=>{x.fillText(ln,ax,-el.h/2+el.size*(el.lh||1.25)*i+el.size*0.82)})};
  const ink=el.ink||'plain';
  if(ink==='stamp'){
    x.save();
    x.globalCompositeOperation='multiply';x.globalAlpha*=0.85;x.fillStyle=el.color;put();
    x.translate(el.size*0.03,el.size*0.025);x.globalAlpha*=0.4;put();
    x.restore();
  }else if(ink==='faded'){
    x.save();x.globalCompositeOperation='multiply';x.globalAlpha*=0.72;x.fillStyle=el.color;put();x.restore();
  }else{x.fillStyle=el.color;put()}
}
