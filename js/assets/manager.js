'use strict';

import { uid } from '../lib/dom.js';

// Verbatim from index.html:513-519 — Map keyed by uid('a'), values {src,img}
export const assets = new Map();

export function addAsset(img, src) { const id = uid('a'); assets.set(id, { src, img }); return id; }

export function fileToAsset(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => res(addAsset(im, r.result)); im.onerror = rej; im.src = r.result; };
    r.onerror = rej; r.readAsDataURL(file);
  });
}
