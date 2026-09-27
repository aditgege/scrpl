'use strict';

export const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
export const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
export const uid=p=>(p||'E')+Math.random().toString(36).slice(2,9);
export const deepClone=o=>JSON.parse(JSON.stringify(o));
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const rad=d=>d*Math.PI/180;

export function hexA(hex,a){
  const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');
  if(!m)return `rgba(0,0,0,${a})`;
  const n=parseInt(m[1],16);
  return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;
}

export function rng(seed){
  let t=(seed||1)>>>0;
  return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296};
}

export const store={
  get(k,d=null){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
};
