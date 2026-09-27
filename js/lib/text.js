'use strict';

import { FONTS } from '../config/constants.js';

export function fontCss(name){const f=FONTS.find(f=>f.name===name);return f?f.css:'"Caveat"'}

export function fontStr(L){return `${L.italic?'italic ':''}${L.weight||400} ${L.size}px ${fontCss(L.font)}`}

// NOTE (deviation from inline source): wrapLines/syncTextH previously closed
// over a shared measurement context (mctx). It is now passed in explicitly to
// keep these functions pure and free of module-level/global state.
export function wrapLines(L,mctx){
  mctx.font=fontStr(L);
  try{mctx.letterSpacing=(L.ls||0)+'px'}catch(e){}
  const cap=s=>L.upper?s.toUpperCase():s;
  const out=[];
  String(L.text==null?'':L.text).split('\n').forEach(para=>{
    if(para===''){out.push('');return}
    let line='';
    para.split(' ').forEach(word=>{
      const t=line?line+' '+word:word;
      if(mctx.measureText(cap(t)).width<=L.w-2||!line)line=t;
      else{out.push(cap(line));line=word}
    });
    out.push(cap(line));
  });
  return out;
}

export function syncTextH(L,mctx){const lines=wrapLines(L,mctx);L.h=Math.max(L.size*1.05,lines.length*L.size*(L.lh||1.25))}
