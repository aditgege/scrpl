'use strict';

export const SCRL_W_UNIT = 1080;
export const SCRL_H = 1350;
export const SCRL_N_MIN = 2;
export const SCRL_N_MAX = 10;
export const SCRL_SCALE_GUARD_N = 5;
export const SCRL_MP_WARN = 30;
// ponytail: scale=2 tiling/OffscreenCanvas if export OOMs; upgrade path noted in spec 11.3
export function scrlMP(w, h, scale){ const s=Math.max(1,Math.round(scale)||1); return (w*s)*(h*s)/1e6; }

export function scrlSize(n) {
  const nn = Math.max(SCRL_N_MIN, Math.min(SCRL_N_MAX, Math.round(n) || SCRL_N_MIN));
  // ponytail: clamp 2..10, upgrade path N=1 single handled separately in main.js (don't call scrlSize for N=1)
  return { w: SCRL_W_UNIT * nn, h: SCRL_H };
}

// for N=1 (single) return no guides; for N>=2 return v at each 1080*k
export function scrlGuides(n) {
  const nn = Math.max(1, Math.min(SCRL_N_MAX, Math.round(n) || 1));
  const v = [];
  for (let k = 1; k < nn; k++) v.push(k * SCRL_W_UNIT);
  return { v, h: [] };
}
