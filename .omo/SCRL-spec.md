# SCRL — Instagram Seamless Carousel Maker
## Spec Produk & Teknis (Grounded di Codebase Scrapbook Editor)

> **Lokasi repo:** `C:\FileAdit\Adit\editor` — static ES-module web app (`index.html` + `js/main.js`)
> **Tanggal:** 2026-09-09 | **Versi spec:** 0.2 | **Bahasa:** Indonesia
> **Grounding:** dibaca langsung sebelum tulis — `js/config/constants.js`, `js/ui/export.js` (100 baris), `js/ui/gallery.js` (BUILTIN + `applyBlank`/`applyTemplate`), `js/elements/render.js` (`renderScene` signature), `js/state/store.js` (`mutate`/`snapshot`/`createStore`)

---

## Changelog

### v0.2 — 2026-09-09 — Grill lock 7 keputusan
1. **Template MVP 5 panorama** (ganti 12) — 5 gaya totally different: minimalis, majalah, film/disposable, kolase artistik, typography-bold.
2. **Target device desktop Windows + Chrome primary** (ganti mobile-first iOS/Android) — layout existing sidebar + panel + topbar dipertahankan, ditambah N selector + guides toggle + export strip; materi bottom-sheet/safe-area/batas canvas iOS pindah ke Fase mobile (future); Chrome MediaRecorder konsisten jadi jalur video lebih sederhana saat fasenya tiba.
3. **Export tanpa ZIP di MVP** — download sekuensial `slug-01..slug-N` saja, zero-dependency tetap.
4. **Video panorama Fase 3** — MVP hanya photo slices; fallback frame PNG dicatat.
5. **Stock foto hapus stub** — MVP hanya upload lokal via `fileInput` + `assets` manager existing; proposal `stockStub.js` dihapus.
6. **Elemen lintas batas: warning non-blocking saja** — badge + garis guide merah tipis, tanpa auto-snap di MVP (snap opsional nanti).
7. **Portrait lock 1080×1350, N 2..10 reaffirmed** — sudah di spec, dikunci ulang.

### v0.1 — 2026-09-09 — Draft awal grounded di 5 modul inti

---

## 1. Ringkasan

SCRL adalah mode baru di dalam editor Scrapbook untuk membuat carousel Instagram yang seamless. User mendesain satu panorama panjang secara freeform, lalu sistem memotong presisi menjadi 2 sampai 10 slide 1080×1350 (portrait lock). MVP ekspor rangkaian PNG/JPG/WebP per slide (photo slices); video panorama pan horizontal adalah Fase 3.

Prinsip arsitektur: reuse maksimal. `renderScene` tetap jadi satu-satunya renderer, `store` tetap jadi satu sumber truth, `SIZES` tetap jadi registry ukuran. Yang baru hanya orkestrasi panorama, guides, dan slicing.

---

## 2. Tujuan

**Masalah:** Membuat carousel seamless butuh canvas panjang dengan guides, potong tanpa gap, dan preview lintas batas. Editor existing hanya single-image (`S.size` tunggal, export satu file).

**Tujuan produk:**
1. User bisa buat 2–10 slide seamless tanpa mikir koordinat.
2. Desain freeform tetap bebas (foto, teks, stiker, kertas, FX) lintas batas slide.
3. Ekspor presisi anti off-by-one plus preview sebelum download.
4. Jalan mulus di desktop Windows + Chrome sebagai primary (mobile Fase future).

**Bukan tujuan (di MVP):** editor kolaboratif, scheduling posting Instagram, auto-caption AI.

---

## 3. Persona

| Persona | Kebutuhan | Perangkat |
|---|---|---|
| **Kreator IG (utama)** — UMKM, desainer lepas, admin sosmed | Template banyak, tipografi cepat, ekspor langsung jadi 10 foto siap upload | Desktop Windows + Chrome (primary MVP) |
| **Template hunter** | Buka galeri, tap template, ganti foto dan teks, ekspor 1 menit | Desktop Windows + Chrome |
| **Power user desktop** | Drag presisi, layer banyak, butuh guides | Desktop Windows + Chrome |

---

## 4. User Stories

| ID | Cerita | Kriteria terima |
|---|---|---|
| US-01 | Sebagai kreator, saya atur jumlah slide 2–10 dan langsung lihat panorama memanjang | Slider/stepper N, canvas melebar ke `1080*N`, guides muncul tiap `1080` |
| US-02 | Sebagai kreator, saya pilih dari 5 template panorama yang totally different | Galeri SCRL 5 template (minimalis, majalah, film/disposable, kolase artistik, typography-bold), thumbnail panorama, tap apply ke N saat ini |
| US-03 | Sebagai kreator, saya tambah dan atur tipografi di area lintas slide | `textEl` reuse, font dari `FONTS`, editing inline, warning non-blocking jika teks terpotong di batas (badge + garis merah tipis, tanpa auto-snap) |
| US-04 | Sebagai kreator, saya pakai stiker, layer, dan foto upload lokal | `stickerEl`/`paperEl`/`photoEl` reuse, layer order tetap, foto via upload lokal `fileInput` + `assets` manager existing (tanpa stok remote/stub) |
| US-05 | Sebagai kreator, saya ekspor rangkaian foto presisi tanpa gap | N file `slug-01.png` ... `slug-10.png` (download sekuensial, tanpa ZIP), tiap 1080×1350, potong tanpa celah, cek off-by-one |
| US-06 | Sebagai kreator, saya ekspor video panorama sebagai alternatif (Fase 3) | Fase 3: video pan horizontal dari panorama via Chrome MediaRecorder (durasi/arah bisa atur); MVP hanya photo slices + fallback frame PNG dicatat |

> Keenam cerita di atas adalah 6 fitur kunci yang wajib tercakup. Pemetaan ke modul reuse vs baru ada di bagian 8 dan lampiran.

---

## 5. Scope MVP

**Masuk MVP:**
- Slide N = 2..10, default 3. Canvas panorama `W = 1080 * N`, `H = 1350` (basis `SIZES.portrait`, portrait lock 1080×1350 reaffirmed). Satu background memanjang (warna + texture + grain dari `drawBackground`).
- Guides batas slide: garis vertikal di `x = k * 1080` untuk `k = 1..N-1`, overlay non-destruktif, toggle tampil/sembunyi. Warning lintas batas non-blocking saja (badge + garis merah tipis); tanpa auto-snap di MVP (snap opsional Fase later).
- Semua elemen existing tetap (photo, paper, text, sticker, fx, film, snippet) dengan koordinat absolut terhadap panorama (0..W).
- Galeri template SCRL 5 template panorama totally different (reuse pola `BUILTIN`): minimalis, majalah, film/disposable, kolase artistik, typography-bold.
- Export slice presisi photo-only (detail di bagian 10) — download sekuensial `slug-01..slug-N`, tanpa ZIP (zero-dependency). Video panorama Fase 3.
- Target device desktop Windows + Chrome primary, reuse layout existing sidebar + panel + topbar ditambah N selector + guides toggle + export strip.

**Di luar MVP (non-goals, lihat bagian 6):** N > 10, tinggi variabel per slide, background per slide berbeda, filter per slide, integrasi langsung ke Instagram Graph API.

---

## 6. Non-Goals (Fase MVP tidak kerjakan)

- Upload atau publish langsung ke Instagram. SCRL hanya hasilkan file lokal.
- N lebih dari 10 atau di luar kelipatan 1080 lebar. Instagram carousel mentok 10, SCRL ikut batas platform.
- Background per slide atau tinggi berbeda per slide. Panorama satu background menjaga seamless.
- Stok foto remote/Unsplash/Pexels. MVP hanya upload lokal via `fileInput` + `assets` manager existing; tidak ada `stockStub.js` (reuse as-is).
- Export ZIP. MVP hanya download sekuensial `slug-01..slug-N` (tanpa ZIP, zero-dependency).
- Video panorama. MVP hanya photo slices; video Fase 3 (Chrome MediaRecorder konsisten, jalur lebih sederhana saat fasenya tiba).
- Auto-snap ke guides. MVP hanya warning non-blocking; snap opsional Fase later.
- Kolaborasi realtime atau cloud sync. `ponytail: no persistence` di `store.js` tetap berlaku sampai ada keputusan storage.
- Filter estetika baru di luar `FXDEF` dan `drawFx` existing.

---

## 7. IA & UX Desktop Primary (Windows + Chrome)

### 7.1 Informasi Arsitektur

```
Home / Mode Switcher [Scrapbook | SCRL]
 └ SCRL Editor (desktop Windows + Chrome primary)
    ├ Top bar: N selector (2–10), Guides toggle, Preview, Export (+ strip preview)
    ├ Layout existing dipertahankan: sidebar + panel + topbar
    │   └ Ditambah: N selector di topbar, guides toggle, export strip (N thumbnail)
    └ Canvas area: panorama scroll horizontal (Shift+wheel / drag background) + zoom
```

Mode SCRL adalah switch di level `store.S`, bukan app terpisah. Satu `index.html` tetap, navigasi hanya ganti `S.scrl` atau `S.mode`. Layout desktop existing tidak dirombak.

### 7.2 UX Desktop (MVP)

- **Canvas panorama:** scroll horizontal via Shift+wheel atau drag background. Zoom via Ctrl+wheel / kontrol zoom existing. Hit-test tetap di koordinat panorama.
- **N selector:** stepper/dropdown 2–10 di topbar, ubah `S.size.w = 1080*N` via `mutate`, guides refresh otomatis.
- **Guides UX:** garis putus tipis + label angka slide di atas canvas. Warning lintas batas non-blocking saja — badge + garis merah tipis di batas, tanpa auto-snap (snap opsional Fase later). Toast ringan "teks lintas batas" tanpa blokir.
- **Export strip:** strip preview N thumbnail di modal/panel export, tiap thumbnail slice downscale (lebar ~120px). User cek potongan sebelum download sekuensial.
- **Aksesibilitas:** kontras label guides, `aria-label` untuk kontrol N, semua shortcut existing (`undo`/`redo` via `store.undo`/`redo`) tetap.
- **Chrome MediaRecorder:** di Windows + Chrome konsisten, jadi jalur video Fase 3 lebih sederhana (tanpa fallback Safari); MVP tidak butuh video.

### 7.3 Fase Mobile (future, bukan MVP)

Materi mobile dipindah ke Fase future: bottom-sheet, `env(safe-area-inset-*)`, `100dvh`, touch Pointer Events + pinch/pan dua jari, downscale preview, tiling/OffscreenCanvas, dan batas canvas iOS (58 MB vs 233 MB di scale=2) tidak jadi constraint MVP. Detail tetap didokumentasikan di bagian 11 sebagai referensi Fase mobile.

---

## 8. Arsitektur — Reuse vs Baru

### 8.1 Yang di-reuse tanpa ubah

| Modul existing | Yang dipakai SCRL | Catatan grounding |
|---|---|---|
| `js/elements/render.js` — `renderScene(x, state, o, deps)` | Satu-satunya renderer panorama. `W = S.size.w`, `H = S.size.h`, loop `S.els` | Signature verified: `renderScene(x, state, o={}, deps)` dengan `o.transparent`/`o.skip`/`o.editor` |
| `js/state/store.js` — `createStore`, `S`, `mutate`, `snapshot`, `beginGesture`/`commitHistory`, `undoStack` | State panorama, history, seleksi. `S.size` jadi `1080*N × 1350` | `S = {size, bg, els}` verified, `mutate(fn)` push snapshot lalu `_after()` |
| `js/config/constants.js` — `SIZES`, `FONTS`, `PALETTE`, `MASKS`, `STICKERS`, `FXDEF` | `SIZES.portrait` (1080×1350) jadi basis SCRL. Tambah `SIZES.scrl_3` dst hanya sebagai helper, bukan ubah konstanta | `SIZES.portrait:{w:1080,h:1350}` verified |
| `js/ui/export.js` — `slug`, `download`, `doExport`/`openExport`, logika mime dan `toBlob` | Reuse `slug`/`download`/pemilihan mime. `doExport` jadi referensi untuk slice loop | Verified: `slug` normalisasi, `download` via object URL, mime `image/jpeg`/`image/webp`/`image/png` |
| `js/ui/gallery.js` — `BUILTIN`, `tplThumb`, `applyTemplate`, `applyBlank`, `hasContent` | Pola template SCRL ikut `BUILTIN` + `tplThumb` yang render via `renderScene` ke canvas kecil | Verified: `BUILTIN` 4 template, `els: () => [...]`, `applyTemplate` pakai `deepClone` + `uid()` |
| `js/elements/factories.js` — `paperEl`, `photoEl`, `textEl`, `stickerEl`, `fxEl`, `filmEl` | Semua elemen panorama tetap pakai factory sama | Import verified di `gallery.js` |
| `js/assets/manager.js` — `assets` | Cache image untuk render panorama | Di-inject via `deps.assets` |
| `js/lib/canvas.js` + `js/lib/dom.js` | `noisePattern`, `rrPath`, `clamp`, `uid`, `deepClone` | Tidak diubah |

### 8.2 Yang baru (minimal)

| File/usulan baru | Tugas | Kenapa tidak reuse |
|---|---|---|
| `js/scrl/constants.js` (atau `js/config/scrl.js`) | `SCRL_H = 1350`, `SCRL_W_UNIT = 1080`, `SCRL_N_MIN/MAX = 2/10`, helper `scrlSize(N)` | Konstanta SCRL terpisah agar `SIZES` tetap murni |
| `js/scrl/guides.js` | Hitung `guides.v = [1080,2160,...]`, render overlay, label; warning non-blocking lintas batas | Guides panorama tidak ada di editor single-image; snap helper opsional Fase later (bukan MVP) |
| `js/scrl/slice.js` | `slicePanorama(panoramaCanvas, N)` → `Canvas[]` atau `Blob[]`, potong tiap 1080 lebar tanpa gap | Export existing hanya satu canvas |
| `js/ui/scrlExport.js` | UI export SCRL: preview strip N, pilih format/scale/quality, loop `renderScene` sekali lalu slice, penamaan file sekuensial tanpa ZIP, progress | `export.js` single-file, SCRL butuh loop slice |
| `js/ui/scrlGallery.js` | Galeri template panorama 5 template totally different (filter `scrl:true`), `tplThumb` panorama dengan `maxW` adaptif | `gallery.js` BUILTIN square/portrait mix, perlu koleksi panorama |
| `js/scrl/video.js` | Fase 3: export video panorama pan horizontal via `canvas.captureStream` + `MediaRecorder` (Chrome konsisten) | Tidak ada di codebase; MVP hanya photo slices |
| `js/interaction/scrlViewport.js` | MVP: pan/zoom desktop (Shift+wheel/drag, clamp viewport); Fase mobile: pinch/two-finger + downscale preview | Interaksi existing untuk canvas tunggal |

> Aturan: tidak tambah dependensi baru. Semua di atas vanilla Canvas 2D + Pointer Events + MediaRecorder.

---

## 9. Data Model

### 9.1 State panorama

`store.S` tetap bentuk sama, hanya `size` yang memanjang:

```json
{
  "size": { "w": 3240, "h": 1350 },
  "bg": { "color": "#EFE7D8", "texture": "paper", "grain": 6 },
  "els": [
    { "id": "a1", "type": "photo", "x": 540, "y": 675, "w": 800, "h": 900 },
    { "id": "a2", "type": "text", "x": 1620, "y": 675, "w": 900, "text": "seamless" }
  ],
  "scrl": { "n": 3, "guidesVisible": true }
}
```
// `snapGuides` tidak ada di MVP (warning non-blocking saja); opsi snap Fase later.

- `W = 1080 * N`, `H = 1350` tetap. `N` disimpan di `S.scrl.n` untuk UI, tapi source of truth untuk render tetap `S.size.w`.
- `els[].x/y` absolut terhadap panorama (0..W). Tidak ada `slideIndex` per elemen, menjaga freeform lintas batas.
- `guides` di `store.guides` existing (`{v:[], h:[]}`) diisi `v = [1080,2160,...]` saat mode SCRL. Tidak perlu struktur baru jika reuse, tapi `S.scrl` lebih eksplisit untuk persist.
- `ponytail: persist scrl` — sinkron `S` ke `localStorage` via `store.subscribe` nanti, upgrade path sudah ada di komentar `store.js`.

### 9.2 Guides

```js
// derived, bukan disimpan permanen
function scrlGuides(N) {
  const v = [];
  for (let k = 1; k < N; k++) v.push(k * 1080);
  return { v, h: [] };
}
```

Render guides sebagai overlay di atas canvas (bukan bagian `renderScene`), agar tidak ikut ter-export.

### 9.3 Template SCRL

```js
// mirip BUILTIN di gallery.js
{ id:'scrl-sunset', name:'Sunset Strip', size:{w:3240,h:1350}, bg:{...}, scrl:{n:3}, els: () => [...] }
```

`size.w` harus `1080 * n`. Validasi saat load template: jika `size.w % 1080 !== 0`, tolak atau bulatkan ke N terdekat.

---

## 10. Spesifikasi Export

### 10.1 Export Slice Presisi (rangkaian foto)

**Tujuan:** N file tanpa gap, tanpa overlap, tanpa off-by-one.

**Langkah:**
1. Render panorama sekali ke canvas offscreen `pan` ukuran `W*scale × H*scale` via `renderScene(panCtx, S, {}, {assets,mctx})`. `scale` 1 atau 2 sesuai pilihan (reuse logika `#exScale` dari `export.js`).
2. Untuk tiap slide `i = 0..N-1`, buat canvas slice `1080*scale × 1350*scale`, lalu `sliceCtx.drawImage(pan, i*1080*scale, 0, 1080*scale, 1350*scale, 0, 0, 1080*scale, 1350*scale)`.
3. `toBlob` per slice dengan mime dan quality yang sama (`image/png` tanpa quality, `image/jpeg`/`image/webp` pakai `q` dari `#exQ`). Reuse fallback di `export.js`: jika `blob.type !== mime`, fallback ke `image/png`.
4. Download sekuensial `slug-01..slug-N` via `download()` satu per satu — tanpa ZIP (zero-dependency tetap).

**Presisi:**
- Semua koordinat slice pakai integer: `sx = i * 1080 * scale`, `sw = 1080 * scale`. Jangan pakai `Math.round(W/N)` yang bisa geser. `W` dijamin kelipatan 1080, jadi tidak ada sisa.
- Jangan pakai `scale` non-integer untuk slice. `scale` hanya 1 atau 2 (reuse `#exScale`). Jika butuh 3x, tetap integer.
- `drawImage` 9-argumen dengan source rect integer mencegah blur sub-pixel.
- Verifikasi: jumlahkan `sw` semua slice harus `W*scale` tepat. Test assert: `sum(sw) === pan.width`.

**Penamaan file:**
- `slug(projName)` reuse dari `export.js`. Pola: `${slug}-01.png` ... `${slug}-10.png` dengan zero-pad 2 digit sesuai N. Contoh: `sunset-strip-01.png`, `sunset-strip-02.png`.
- MVP hanya download sekuensial satu per satu via `download()` — tanpa ZIP (zero-dependency tetap). Tidak ada `jszip` di MVP.
- Urutan file harus `01..N` sesuai kiri ke kanan.

**Preview sebelum export:**
- Strip preview N thumbnail di modal export, tiap thumbnail adalah slice downscale (lebar 120px). User bisa cek potongan teks lintas batas sebelum download.
- Warning non-blocking saja jika ada elemen terpotong di batas (hitung bounding box vs `k*1080`): badge + garis merah tipis, tanpa auto-snap.

**Format & quality:**
- Reuse `#exFmt`, `#exQ`, `#exTrans` dari `export.js`. Transparan hanya untuk PNG.
- `scale=2` hasilkan 2160×2700 per slide (untuk kualitas cetak). Batas memori iOS jadi catatan Fase mobile, bukan blocker MVP desktop.

### 10.2 Video Panorama — Fase 3 (bukan MVP)

MVP hanya photo slices (bagian 10.1). Video panorama pan horizontal adalah Fase 3; Chrome di Windows primary konsisten untuk MediaRecorder jadi jalur lebih sederhana.

**Fase 3 (tanpa lib baru):** pan horizontal dari panorama.
- Buat canvas video `1080×1350`, `ctx.drawImage(pan, panX, 0, 1080, 1350, 0, 0, 1080, 1350)` per frame dengan `panX` bergerak 0 → `W-1080`.
- Rekam via `canvas.captureStream(fps)` + `MediaRecorder` (mime `video/webm;codecs=vp9` atau `video/mp4` jika tersedia). Durasi 6–12 detik, fps 30, easing linear.
- Fallback jika `captureStream` tidak ada: export sebagai urutan frame PNG (user gabung manual).

**Opsi upgrade (future):** `ffmpeg.wasm` untuk MP4 H.264 — tidak di MVP/Fase 3 awal karena ukuran wasm.

**Kontrol Fase 3:** durasi (6/9/12s), arah (kiri→kanan atau kanan→kiri), loop atau sekali jalan. Tidak ada audio.

---

## 11. Strategi Platform & Performa (Desktop Primary; Mobile Fase Future)

> MVP primary desktop Windows + Chrome. Materi mobile di bawah dipertahankan sebagai referensi Fase mobile (future), bukan constraint MVP.

### 11.1 Pointer & Interaksi (MVP: desktop; future: touch)

- MVP desktop: `pointerdown`/`pointermove`/`pointerup` + `setPointerCapture` tetap, hit-test panorama `panX = (clientX - rect.left)/zoom + viewport.x`. Zoom/pan via Ctrl+wheel / Shift+wheel / drag background.
- Fase mobile future: tambah `pointercancel`, `touch-action: none`, pinch dua jari `hypot(x2-x1,y2-y1)` clamp 0.2..3.0 — dipindah ke Fase mobile.

### 11.2 Safe-area & Layout (Fase mobile future)

- Fase mobile future: `env(safe-area-inset-*)`, bottom-sheet `max-height: calc(100dvh - env(...) - 56px)`, `100dvh` untuk address bar iOS. MVP desktop tetap pakai layout sidebar + panel + topbar existing.

### 11.3 Performa Canvas Besar (10 slide = 10800×1350)

- **Ukuran nyata:** 10800×1350 ×4 byte ≈ 58 MB bitmap. Di `scale=2` jadi 21600×2700 ≈ 233 MB — jangan render full di preview.
- **Strategi preview:** canvas tampil selalu downscale ke lebar viewport (misal 390px untuk iPhone). `renderScene` dipanggil dengan `ctx.scale(viewportScale, viewportScale)` bukan full-res. Full-res hanya saat export atau idle `requestIdleCallback`.
- **Tiling (ponytail):** jika 10 slide masih jank, render panorama sebagai 2–3 tile 3600px lalu composite. Upgrade path tanpa ubah API `renderScene`.
- **OffscreenCanvas:** jika tersedia (`OffscreenCanvas`), render panorama di worker untuk jaga 60fps. Fallback ke main thread.
- **Memory (catatan Fase mobile future):** Safari iOS limit ~16–32 MP; 10800×1350 = 14.6 MP aman di `scale=1`, `scale=2` 58 MP bisa gagal. MVP desktop Windows + Chrome tidak kena batas ini; limit dicatat untuk Fase mobile (saat itu batasi `scale=2` untuk N≤5).
- **Debounce render:** `invalidate()` + `requestAnimationFrame` seperti existing, tambah `ResizeObserver` untuk viewport.

---

## 12. API & Struktur File Baru yang Diusulkan

```
js/
 ├ config/
 │   ├ constants.js          # reuse SIZES.portrait sebagai basis (tidak ubah)
 │   └ scrl.js               # NEW: SCRL_N_MIN/MAX, SCRL_W_UNIT/H, scrlSize(N)
 ├ state/
 │   └ store.js              # reuse createStore, tambah S.scrl opsional
 ├ elements/
 │   └ render.js             # reuse renderScene tanpa ubah
 ├ scrl/                     # NEW folder
 │   ├ guides.js             # scrlGuides(N), hitTestGuide, overlay + warning non-blocking (snap opsional later)
 │   ├ slice.js              # slicePanorama(panCanvas, N, scale) -> Canvas[] (tanpa ZIP)
 │   └ video.js              # Fase 3: createPanoramaVideo(panCanvas, opts) -> Blob (Chrome MediaRecorder)
 ├ ui/
 │   ├ export.js             # reuse slug/download/doExport sebagai referensi
 │   ├ gallery.js            # reuse BUILTIN pattern
 │   ├ scrlExport.js         # NEW: openScrlExport, doScrlExport (sekuensial tanpa ZIP)
 │   └ scrlGallery.js        # NEW: openScrlGallery, SCRL_BUILTIN[5]
 └ interaction/
      └ scrlViewport.js       # NEW: viewport pan/zoom desktop (Fase mobile: pinch/two-finger)
```

**Kontrak fungsi baru (ringkas):**

```js
// js/config/scrl.js
export const SCRL_W_UNIT = 1080, SCRL_H = 1350, SCRL_N_MIN = 2, SCRL_N_MAX = 10;
export function scrlSize(n) { return { w: SCRL_W_UNIT * n, h: SCRL_H }; }

// js/scrl/guides.js
export function scrlGuides(n) // -> {v:number[], h:[]}
// snapToGuides opsional Fase later (bukan MVP): export function snapToGuides(x, guides, threshold=8) -> number

// js/scrl/slice.js
export async function slicePanorama(panCanvas, n, opts) // opts {scale,mime,quality} -> Blob[]

// js/ui/scrlExport.js
export function openScrlExport(store, deps) // deps {renderScene, assets, mctx, openModal}
export async function doScrlExport(store, deps) // deps {renderScene, assets, mctx, download, slug, toast}

// js/scrl/video.js — Fase 3 (Chrome MediaRecorder konsisten)
export async function exportPanoramaVideo(panCanvas, opts) // opts {duration, fps, direction} -> Blob
```

Semua fungsi baru pakai DI `deps` seperti `export.js` dan `gallery.js` (tidak import singleton).

**Upload lokal (reuse as-is, tanpa stub):**
- MVP hanya upload lokal via `fileInput` + `assets` manager existing (reuse as-is). Proposal `js/assets/stockStub.js` dihapus — tidak ada stok remote/stub di MVP.

---

## 13. Edge Cases

| Kasus | Dampak | Penanganan MVP |
|---|---|---|
| **Elemen lintas batas** (foto/teks melebar di `k*1080`) | Terpotong di dua slide, teks bisa terbelah huruf | Preview strip + warning non-blocking saja (badge + garis merah tipis di batas). Tanpa auto-snap di MVP; snap opsional Fase later |
| **Teks lintas batas** | Keterbacaan rusak | Hitung bounding box teks (`measureText` via `mctx`), jika `x - w/2 < k*1080 < x + w/2` tampilkan garis merah tipis + badge; saran pindah tanpa auto-snap |
| **Overlap antar-slide** (elemen besar menutup guide) | Seam terlihat tidak mulus | Guide selalu di atas elemen (overlay), bukan bagian render. Z-index overlay > canvas |
| **Slicing off-by-one** | Gap 1px atau overlap 1px antar slide, IG terlihat garis | Pakai integer `i*1080*scale`, verifikasi `sum === W*scale`, test pixel di batas (sampel kolom `1080-1` dan `1080`) |
| **Resolusi & scale** | `scale=2` di N=10 melebihi limit Safari, crash atau blank | Batasi `scale=2` untuk N≤5, N>5 paksa `scale=1`. Tampilkan estimasi MP dan warning |
| **Transparan + JPEG** | Background transparan jadi hitam di JPG | Reuse `trans` hanya untuk PNG, JPG/WebP paksa background solid |
| **Undo/redo ganti N** | `S.size.w` berubah, elemen di luar viewport | `mutate` simpan snapshot sebelum ubah N. `applySnap` filter `selIds`. Elemen tetap di koordinat lama, hanya viewport yang geser |
| **Template N mismatch** | Template 5 slide di-apply ke N=3 | Tawarkan: "Sesuaikan N ke 5?" atau crop/pad. Default sesuaikan N ke template |
| **Upload foto besar** | Memory bengkak, decode lambat | Reuse `assets` manager, downscale image ke max 2048 di sisi upload sebelum masuk panorama |
| **CORS taint** | `toBlob` gagal karena image cross-origin | Set `img.crossOrigin = "anonymous"` saat load, tolak stok foto tanpa CORS, fallback PNG |
| **Video MediaRecorder tidak ada** | Export video gagal di Safari lama | Fallback ke export frame PNG + pesan "gabung manual atau update browser" |
| **Zero-width/empty panorama** | N=0 atau N=1 tidak valid | Clamp N 2..10 di UI, disable tombol kurang di batas |

---

## 14. Metrik Sukses

| Metrik | Target MVP | Cara ukur |
|---|---|---|
| Export slice tanpa gap | 100% slice `sw === 1080*scale` tepat, 0 laporan garis | Assert otomatis + sampel pixel batas |
| Waktu export N=10, scale=1 | < 4 detik di Android mid-range, < 3 detik di iPhone 13+ | `performance.now()` di `doScrlExport` |
| Crash rate panorama 10 slide | 0 crash di iOS Safari 16+ dan Chrome Android 110+ | Uji manual + `try/catch` di `toBlob` |
| Template terpakai | ≥ 60% sesi SCRL pakai template | Event `template_applied` |
| Sesi mobile selesai | ≥ 50% export selesai di mobile (bukan desktop saja) | Event `scrl_export_completed` dengan `ua` |
| Kepuasan potong | < 5% laporan "teks terpotong" setelah warning ditambah | Feedback in-app |

**Kriteria konkret spec ini berhasil:** file ini ada, mencakup 6 fitur kunci, tiap fitur memetakan ke modul reuse vs baru dengan jelas (lihat lampiran).

---

## 15. Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|
| Canvas 10800×1350 ditambah `scale=2` melebihi limit GPU (catatan Fase mobile) | Sedang di MVP desktop | Blank export di iOS future | MVP desktop Windows+Chrome tidak kena batas; Fase mobile batasi scale + tiling ponytail |
| `renderScene` dipanggil terlalu sering (mis. scroll/zoom cepat) | Sedang | Jank, frame drop | Debounce `invalidate`, render preview low-res dulu |
| MediaRecorder mime tidak konsisten | Rendah di MVP (Chrome konsisten) | Video Fase 3 gagal | Fase 3 Chrome `MediaRecorder.isTypeSupported` konsisten; fallback frame PNG tetap dicatat |
| User bingung konsep panorama vs slide | Sedang | Salah taruh elemen | Onboarding 3 langkah + guides selalu terlihat + preview strip permanen |
| Template panorama butuh desain banyak | Rendah (MVP 5 template) | Launch tipis | MVP 5 gaya totally different (minimalis, majalah, film/disposable, kolase artistik, typography-bold); tambah via JSON tanpa rilis kode |
| Upload lokal gagal / file besar | Rendah (reuse `assets` manager) | Memory bengkak | Reuse `assets`, downscale ke max 2048 saat upload; tanpa stok remote |

---

## 16. Roadmap Fase

**Fase 0 — Grounding (selesai di spec ini)**
- Baca 5 modul inti, tulis spec ini, kunci keputusan reuse vs baru.

**Fase 1 — MVP Slice (2–3 minggu) — desktop Windows + Chrome**
- `js/config/scrl.js`, `js/scrl/guides.js`, `js/scrl/slice.js`, `js/ui/scrlExport.js`, `js/interaction/scrlViewport.js`
- N selector 2–10, guides overlay (tanpa snap), slice export presisi photo-only + preview strip, penamaan file zero-pad sekuensial tanpa ZIP
- Test off-by-one dan performa N=10 scale=1 di Windows + Chrome

**Fase 2 — Template & Tipografi (2 minggu)**
- `js/ui/scrlGallery.js` + 5 template panorama totally different (minimalis, majalah, film/disposable, kolase artistik, typography-bold)
- Warning lintas batas non-blocking untuk teks (tanpa snap)
- Upload lokal via `fileInput` + `assets` manager (tanpa stok remote/stub)

**Fase 3 — Video Panorama (1–2 minggu)**
- `js/scrl/video.js` via `captureStream` + `MediaRecorder` (Chrome konsisten, jalur lebih sederhana)
- Kontrol durasi/arah, fallback frame PNG

**Fase 4 — Polish & Scale (ongoing)**
- Tiling dan OffscreenCanvas jika perlu, persist `S.scrl` ke localStorage
- Template tambahan via JSON remote tanpa ubah kode
- Audit aksesibilitas dan Lighthouse desktop; Fase mobile (bottom-sheet/safe-area/pinch/batas canvas iOS) sebagai fase terpisah

---

## Lampiran A — Pemetaan 6 Fitur Kunci ke Modul Reuse vs Baru

| # | Fitur kunci | Reuse (existing) | Baru (SCRL) |
|---|---|---|---|
| 1 | Seamless carousel, freeform canvas 2–10 slide | `store.js` (`S.size`, `mutate`, `snapshot`), `constants.js` `SIZES.portrait` sebagai basis, `renderScene` | `js/config/scrl.js` (`scrlSize`), `js/scrl/guides.js`, `js/interaction/scrlViewport.js` |
| 2 | 5 template panorama totally different | `gallery.js` pola `BUILTIN`/`tplThumb`/`applyTemplate`/`hasContent`, `renderScene` untuk thumbnail | `js/ui/scrlGallery.js` + koleksi `SCRL_BUILTIN[5]` (minimalis, majalah, film/disposable, kolase artistik, typography-bold) |
| 3 | Teks/tipografi | `textEl` factory, `drawTextEl`, `FONTS`, `PALETTE`, `mctx` untuk measure | Warning non-blocking lintas batas di `scrlExport` preview (badge + garis merah tipis, tanpa snap) |
| 4 | Stiker/layer/foto upload lokal | `stickerEl`/`paperEl`/`photoEl`/`fxEl`/`filmEl`, `assets` manager + `fileInput` existing, `STICKERS`/`MASKS` | Tanpa `stockStub.js`; upload lokal reuse as-is |
| 5 | Ekspor rangkaian foto (MVP) + video Fase 3 | `export.js` `slug`/`download`/mime/quality/`toBlob` | MVP: `js/scrl/slice.js` + `js/ui/scrlExport.js` sekuensial tanpa ZIP; Fase 3: `js/scrl/video.js` (Chrome MediaRecorder) |
| 6 | Target desktop Windows + Chrome primary | `store.js` dan `renderScene` tetap | MVP: sidebar+panel+topbar existing + N selector + guides toggle + export strip; Fase mobile: pinch/safe-area/batas canvas iOS |

> Semua fitur di atas reuse modul inti tanpa ubah signature `renderScene(x,state,o,deps)` dan `createStore`. Yang baru hanya orkestrasi panorama di sekitarnya.

---

## Lampiran B — Checklist Validasi Sebelum Implementasi

- [ ] `S.size.w === 1080 * N` dan `S.size.h === 1350` selalu (portrait lock 1080×1350, N 2..10 reaffirmed)
- [ ] Guides di `x = k*1080` (k=1..N-1) sebagai overlay, tidak ikut export; warning lintas batas non-blocking (badge + garis merah tipis, tanpa snap)
- [ ] Slice pakai `drawImage` integer, verifikasi `sum(sw) === W*scale`
- [ ] Penamaan `slug-01.ext` zero-pad sekuensial `01..N` kiri→kanan, tanpa ZIP (zero-dependency)
- [ ] Preview strip N thumbnail tampil sebelum download sekuensial
- [ ] Desktop: pan/zoom panorama via Shift+wheel/drag/Ctrl+wheel; pinch/touch `touch-action: none` dipindah ke Fase mobile (future)
- [ ] Safe-area `env()` + bottom-sheet dipindah ke Fase mobile (future); MVP pakai sidebar+panel+topbar existing
- [ ] N=10 scale=1 jalan di Windows + Chrome primary (batas canvas iOS dicatat untuk Fase mobile)
- [ ] Video Fase 3: fallback frame PNG jika `MediaRecorder` tidak ada (Chrome konsisten di MVP)
- [ ] Upload lokal via `fileInput` + `assets` manager reuse as-is; tidak ada `stockStub.js` / klaim API key

---

*Spec ini adalah dokumen hidup. Perubahan setelah Fase 1 dicatat di bagian atas sebagai changelog.*
