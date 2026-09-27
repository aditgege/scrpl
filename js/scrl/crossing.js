'use strict';

/**
 * js/scrl/crossing.js — lintas-batas detection (ticket 03)
 * DI, ESM .js, vanilla, zero deps.
 * - elCrossesGuides(el, guidesV): true if element bbox straddles any guide x
 * - crossedGuidesForEls(els, guidesV): subset of guidesV that are crossed
 *
 * Rotation: approximated via AABB of rotated corners (same math as
 * elPoints in js/interaction/selection.js). ponytail: if tighter fit needed,
 * switch to SAT / exact rect-vs-line; AABB is conservative (may over-warn at
 * ~45°). Text height assumed already synced via syncTextH/mctx elsewhere —
 * bbox only check here.
 *
 * EXTENSION POINT: export strip (ticket 02 / js/ui/scrlExport.js) can reuse
 * elCrossesGuides / crossedGuidesForEls to badge individual slice previews.
 */

export function elBboxXRange(el) {
  if (!el || typeof el.x !== 'number' || typeof el.w !== 'number') return null;
  const hw = el.w / 2;
  if (!Number.isFinite(hw) || !Number.isFinite(el.x)) return null;
  const rot = el.rot || 0;
  if (!rot) return { min: el.x - hw, max: el.x + hw };
  const r = rot * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  const hh = (typeof el.h === 'number' ? el.h : el.w) / 2;
  const xs = [
    el.x + (-hw) * c - (-hh) * s,
    el.x + ( hw) * c - (-hh) * s,
    el.x + ( hw) * c - ( hh) * s,
    el.x + (-hw) * c - ( hh) * s,
  ];
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

export function elCrossedGuides(el, guidesV) {
  if (!el || !Array.isArray(guidesV) || !guidesV.length) return [];
  if (el.type === 'fx' || el.visible === false) return [];
  const range = elBboxXRange(el);
  if (!range) return [];
  const out = [];
  for (const g of guidesV) {
    if (typeof g !== 'number' || !Number.isFinite(g)) continue;
    // strict straddle: guide strictly inside bbox interior
    if (range.min < g && range.max > g) out.push(g);
  }
  return out;
}

export function elCrossesGuides(el, guidesV) {
  return elCrossedGuides(el, guidesV).length > 0;
}

export function crossedGuidesForEls(els, guidesV) {
  if (!Array.isArray(els) || !Array.isArray(guidesV) || !guidesV.length) return [];
  const set = new Set();
  for (const el of els) {
    const hits = elCrossedGuides(el, guidesV);
    for (const g of hits) set.add(g);
  }
  // keep numeric order
  return [...set].sort((a, b) => a - b);
}

// self-check (run with node --check or node -e)
// ponytail: keep minimal; add more cases when slicing upgrades.
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
  console.assert(elCrossesGuides({ x: 1070, w: 100, h: 100 }, [1080]) === true, 'straddle');
  console.assert(elCrossesGuides({ x: 500, w: 100, h: 100 }, [1080]) === false, 'no cross');
  console.assert(elCrossesGuides({ x: 1080, w: 0, h: 10 }, [1080]) === false, 'zero w');
}
