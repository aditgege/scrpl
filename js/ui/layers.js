'use strict';

/*
 * js/ui/layers.js — layers panel
 * Verbatim bodies from index.html:1810-1871 (only DI added)
 *
 * DI signatures:
 *   iconFor(el) -> string                      — pure, no deps
 *   nameFor(el) -> string                      — pure, no deps
 *   renderLayers(store, deps)
 *     store: createStore() instance — reads store.S / store.selIds, calls store.mutate
 *     deps: {
 *       $: (s)=>Element, $$: (s)=>Element[], h: (html)=>Element, esc: (s)=>string,
 *       refreshIcons: ()=>void,
 *       rebuildProps: (store, deps)=>void,   // caller passes to avoid cycle
 *       invalidate: ()=>void,
 *       openTextEditor: (el)=>void
 *     }
 *   No store singleton import; no globals.
 */

export function iconFor(el) {
  return { photo: 'image', film: 'film', sticker: 'star', paper: 'sticky-note', text: 'type', fx: 'sparkles', snippet: 'scissors' }[el.type] || 'square';
}

export function nameFor(el) {
  if (el.name) return el.name;
  if (el.type === 'text') return (el.text || '').split('\n')[0].slice(0, 24) || 'Text';
  if (el.type === 'photo') return el.slot ? (el.slotLabel || 'Photo slot') : 'Photo';
  if (el.type === 'film') return 'Filmstrip';
  if (el.type === 'snippet') return 'Cut-out';
  if (el.type === 'sticker') return el.kind;
  if (el.type === 'paper') return el.kind;
  return el.kind;
}

export function renderLayers(store, deps) {
  const { $, $$, h, esc, refreshIcons, rebuildProps, invalidate, openTextEditor } = deps;
  const S = store.S;
  let selIds = store.selIds;
  const box = $('#layerList');
  box.innerHTML = '';
  $('#layerCount').textContent = S.els.length + (S.els.length === 1 ? ' layer' : ' layers');
  if (!S.els.length) { box.innerHTML = '<p class="hint">Nothing on the canvas yet — add pieces from the left.</p>'; return; }
  ;[...S.els].reverse().forEach((el, di) => {
    const ai = S.els.length - 1 - di;
    const row = h(`<div class="lrow ${store.selIds.includes(el.id) ? 'sel' : ''}" draggable="true">
      <span class="lic"><i data-lucide="${iconFor(el)}"></i></span>
      <span class="lname">${esc(nameFor(el))}</span>
      ${el.slot ? '<span class="chip">SLOT</span>' : ''}
      <button class="act" data-a="vis" title="Show / hide"><i data-lucide="${el.visible ? 'eye' : 'eye-off'}"></i></button>
      <button class="act" data-a="lock" title="Lock / unlock"><i data-lucide="${el.locked ? 'lock' : 'lock-open'}"></i></button>
    </div>`);
    row.addEventListener('click', e => {
      const a = e.target.closest('.act');
      if (a) {
        e.stopPropagation();
        store.mutate(() => { if (a.dataset.a === 'vis') el.visible = !el.visible; else el.locked = !el.locked; });
        return;
      }
      if (e.shiftKey) store.selIds = store.selIds.includes(el.id) ? store.selIds.filter(i => i !== el.id) : [...store.selIds, el.id];
      else store.selIds = [el.id];
      if (rebuildProps) rebuildProps(store, deps);
      renderLayers(store, deps);
      if (invalidate) invalidate();
    });
    row.addEventListener('dblclick', () => { if (el.type === 'text' && !el.locked && openTextEditor) openTextEditor(el); });
    row.addEventListener('dragstart', e => { row.dataset.di = ai; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); row.classList.add('dragging'); });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); $$('#layerList .lrow').forEach(r => r.classList.remove('da', 'db')); });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      const r = row.getBoundingClientRect(), before = e.clientY < r.top + r.height / 2;
      row.classList.toggle('da', before); row.classList.toggle('db', !before);
    });
    row.addEventListener('drop', e => {
      e.preventDefault();
      const from = parseInt(row.dataset.di == null ? -1 : row.dataset.di);
      if (isNaN(from) || from < 0 || from === ai) return;
      let ins = ai + (e.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2 ? 0 : 1);
      store.mutate(() => {
        const [m] = S.els.splice(from, 1);
        if (ins > from) ins--;
        S.els.splice(ins, 0, m);
      });
    });
    box.appendChild(row);
  });
  if (refreshIcons) refreshIcons();
}
