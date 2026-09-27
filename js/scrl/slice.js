'use strict';
import { SCRL_W_UNIT, SCRL_H } from '../config/scrl.js';

/*
 * js/scrl/slice.js — panorama slicing presisi
 * spec 10.1: sx = i*1080*scale, sw = 1080*scale, 9-arg drawImage integer
 * ponytail: scale int 1|2 only; N 2..10
 */
export function slicePanorama(panCanvas, n, scale = 1) {
  const sc = Math.max(1, Math.round(scale) || 1);
  const nn = Math.max(1, Math.round(n) || 1);
  const sw = SCRL_W_UNIT * sc;
  const sh = SCRL_H * sc;
  const slices = [];
  let sum = 0;
  for (let i = 0; i < nn; i++) {
    const sx = i * SCRL_W_UNIT * sc;
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const x = c.getContext('2d');
    // 9-arg integer source rect, no gap/overlap
    x.drawImage(panCanvas, sx, 0, sw, sh, 0, 0, sw, sh);
    slices.push(c);
    sum += sw;
  }
  if (sum !== panCanvas.width) throw new Error(`slice width mismatch sum=${sum} pan=${panCanvas.width}`);
  return slices;
}
