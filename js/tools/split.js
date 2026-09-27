'use strict';

// js/tools/split.js — pure detection + crop helper (no DOM/store)
// Port of spritelloom js/12-sources.js lines 126-219 (autoSlice + gridRegions)
// Detection only — no k-means/snap/quantize ported.
// ESM, explicit params, vanilla Canvas 2D. Stdlib only.

/**
 * Auto-slice: dominant perimeter color-or-transparent as background,
 * empty-row scan → per-band empty-col scan → rects min 2px, cap 256.
 * @param {ImageData} imageData
 * @param {{minSize?:number}} opts
 * @returns {{x:number,y:number,w:number,h:number}[]}
 */
export function autoSlice(imageData, opts = {}) {
  const minSize = Math.max(1, opts.minSize ?? 2);
  const { data, width: W, height: H } = imageData;
  if (!W || !H || !data) return [];
  const keyAt = (x, y) => {
    const i = (y * W + x) * 4;
    return data[i + 3] < 128 ? -1 : (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  };
  const counts = new Map();
  const bump = (x, y) => {
    const k = keyAt(x, y);
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  for (let x = 0; x < W; x++) { bump(x, 0); bump(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { bump(0, y); bump(W - 1, y); }
  let bg = -1; let bc = 0;
  counts.forEach((c, k) => { if (c > bc) { bc = c; bg = k; } });
  const rowEmpty = new Uint8Array(H);
  for (let y = 0; y < H; y++) {
    let e = true;
    for (let x = 0; x < W; x++) if (keyAt(x, y) !== bg) { e = false; break; }
    rowEmpty[y] = e ? 1 : 0;
  }
  const rects = [];
  let y = 0;
  while (y < H) {
    while (y < H && rowEmpty[y]) y++;
    if (y >= H) break;
    const y0 = y;
    while (y < H && !rowEmpty[y]) y++;
    const y1 = y;
    const colEmpty = new Uint8Array(W);
    for (let x = 0; x < W; x++) {
      let e = true;
      for (let yy = y0; yy < y1; yy++) if (keyAt(x, yy) !== bg) { e = false; break; }
      colEmpty[x] = e ? 1 : 0;
    }
    let x = 0;
    while (x < W) {
      while (x < W && colEmpty[x]) x++;
      if (x >= W) break;
      const x0 = x;
      while (x < W && !colEmpty[x]) x++;
      if (x - x0 >= minSize && y1 - y0 >= minSize) rects.push({ x: x0, y: y0, w: x - x0, h: y1 - y0 });
    }
  }
  return rects.slice(0, 256);
}

/**
 * Uniform grid split.
 * @param {number} W
 * @param {number} H
 * @param {number} cols
 * @param {number} rows
 * @returns {{x:number,y:number,w:number,h:number}[]}
 */
export function gridRegions(W, H, cols, rows) {
  const out = [];
  const cw = Math.floor(W / cols);
  const ch = Math.floor(H / rows);
  if (cw < 1 || ch < 1) return out;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * cw; const y = j * ch;
    out.push({ x, y, w: i === cols - 1 ? W - x : cw, h: j === rows - 1 ? H - y : ch });
  }
  return out;
}

/**
 * Unified pure entry.
 * @param {ImageData} imageData
 * @param {{mode?:'auto'|'grid', cols?:number, rows?:number, minSize?:number}} opts
 * @returns {{x:number,y:number,w:number,h:number}[]}
 */
export function detectRegions(imageData, opts = {}) {
  const mode = opts.mode === 'grid' ? 'grid' : 'auto';
  const minSize = Math.max(1, opts.minSize ?? 2);
  if (mode === 'grid') {
    const cols = Math.max(1, Math.min(64, Math.round(opts.cols ?? 1)));
    const rows = Math.max(1, Math.min(64, Math.round(opts.rows ?? 1)));
    const r = gridRegions(imageData.width, imageData.height, cols, rows);
    const filtered = r.filter(v => v.w >= minSize && v.h >= minSize);
    return filtered.slice(0, 256);
  }
  return autoSlice(imageData, { minSize });
}

/**
 * Crop helper — draws source rect of img/canvas onto new canvas.
 * @param {HTMLImageElement|HTMLCanvasElement} img
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @returns {HTMLCanvasElement}
 */
export function cropRegionToCanvas(img, rect) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(rect.w));
  cv.height = Math.max(1, Math.round(rect.h));
  const c = cv.getContext('2d');
  const sx = Math.max(0, Math.round(rect.x));
  const sy = Math.max(0, Math.round(rect.y));
  const sw = cv.width; const sh = cv.height;
  c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return cv;
}
