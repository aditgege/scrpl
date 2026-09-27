# Scrapbook — Analog Collage Editor

Editor kolase analog berbasis web (canvas 2D) untuk membuat kolase kertas, foto, stiker, dan tipografi bergaya *scrapbook*, plus mode **SCRL** untuk carousel Instagram seamless.

**Nol dependensi, nol build step.** Murni static ES modules + Canvas 2D.

---

## Cara pakai

### Menjalankan

Karena memakai ES modules, **tidak bisa** dibuka langsung lewat `file://`. Butuh static server:

```bash
# pilih salah satu
npx serve .
python -m http.server 8080
php -S localhost:8080
```

Lalu buka `http://localhost:8080` di browser (Chrome/Edge Desktop = target utama).

> Alternatif: `index.single.html` adalah bundel satu-file (JS+CSS inline). File itu bisa langsung dibuka double-click tanpa server — cocok untuk dibagikan/diarsipkan, tapi selalu edit di `index.html` + `js/` + `css/`.

### Alur kerja singkat

1. **Pilih template** — tombol `Templates` di topbar (5 gaya panorama SCRL), atau mulai dari kanvas kosong.
2. **Tambah elemen** dari panel kiri `Elements`: upload foto, split PNG, paper (torn/tape/scrap/receipt/postcard), stiker, teks, filmstrip, dan analog FX.
3. **Susun di kanvas** — drag untuk pindah, handle untuk resize/rotate, isi panel `Properties` untuk angka presisi.
4. **Potong & tempel** — tekan `C`, gambar seleksi (lasso/persegi/lingkaran/bintang/hat/torn), lalu `Cut`. Potongan mengikuti kursor; klik untuk menjatuhkannya, Shift-click untuk stamp, `Esc` untuk batal.
5. **Ekspor** — `Export` untuk satu gambar, atau `SCRL Export` untuk N slice carousel sekaligus.

### Yang bikin beda

- **Imperfection by design** — ada slider `Make It Imperfect` untuk memberi rotasi/geseran/skala acak pada elemen terpilih. Snap ke guide **mati secara default**; ketidaksempurnaan memang tujuan.
- **SCRL seamless carousel** — satu kanvas panorama lebar, dipotong presisi jadi 2–10 slide 1080×1350. Guide vertikal otomatis di setiap batas slide, dan elemen yang melintasi batas ditandai garis merah + toast *lintas batas*.
- **Guide tidak pernah ikut terekspor** — yang keluar hanya hasil akhirnya.

---

## Kontrol

### Mouse

| Aksi | Jalan |
|---|---|
| Pindah elemen | Drag pada elemen |
| Resize / rotate | Drag handle (hold `Shift` untuk rasio terkunci) |
| Pindah kanvas | Drag area kosong, atau `Space` + drag |
| Zoom | Scroll wheel, atau tombol `−` / `+` / `Fit` |
| Seleksi multi | `Shift` + klik |

### Keyboard

| Pintasan | Aksi |
|---|---|
| `C` | Toggle cut-out tool |
| `Ctrl/Cmd + X` | Cut potongan yang sedang diseleksi |
| `Ctrl/Cmd + C` | Copy potongan |
| `Ctrl/Cmd + V` | Paste potongan |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl/Cmd + D` | Duplicate seleksi |
| `Delete` / `Backspace` | Hapus seleksi |
| `↑ ↓ ← →` | Geser 2px (hold `Shift` = 20px) |
| `Space` (tahan) | Pan canvas |
| `Esc` | Batal tool / tutup panel |

---

## SCRL — cara kerja

1. Naikkan angka **SLIDES** di topbar (2–10). Kanvas melebar jadi `1080 × N` dan guide muncul otomatis.
2. Toggle `mata` untuk sembunyikan/tampilkan guide.
3. Desain bebas — elemen boleh melintasi batas slide. Kalau ada yang terpotong, muncul badge/garis merah + toast peringatan (non-blocking, tidak auto-snap).
4. **SCRL Export** → pilih format (PNG/JPG/WebP), skala (1×/2×), kualitas, opsional background transparan. Preview strip menampilkan semua slice sebelum download.
5. Klik **Download N slices** — file diunduh sekuensial sebagai `slug-01` … `slug-N` (tanpa ZIP, tanpa dependency).

Galeri template SCRL (5 gaya: minimalis, majalah, film/disposable, kolase artistik, typography-bold) terbuka lewat `Templates`.

---

## Struktur project

```
.
├── index.html              # markup app: topbar, library, stage, panel, modal
├── index.single.html       # bundel satu-file (hasil inlining, Portable via file://)
├── css/
│   └── styles.css          # seluruh styling (~18KB)
└── js/
    ├── main.js             # entry point: bootstrap + komposisi dependency
    ├── config/
    │   ├── constants.js    # SIZES, FONTS, PALETTE, MASKS, STICKERS, FXDEF
    │   └── scrl.js         # konstanta SCRL + generator guide
    ├── state/
    │   └── store.js        # satu sumber kebenaran: state, undo/redo, subscribe
    ├── lib/
    │   ├── dom.js          # $, $$, h, esc, uid, clamp, localStorage wrapper
    │   ├── canvas.js       # helper canvas 2D
    │   └── text.js         # font CSS, sync tinggi teks
    ├── elements/
    │   ├── factories.js    # pembuatan elemen
    │   ├── render.js       # renderScene — SATU-SATUNYA renderer
    │   ├── photo.js        # elemen foto + mask
    │   ├── paper.js        # torn / tape / scrap / receipt / postcard
    │   ├── text.js         # elemen teks
    │   ├── sticker.js      # stiker vektor
    │   ├── film.js         # filmstrip
    │   └── fx.js           # grain / dust / scratch / leak / vignette
    ├── interaction/
    │   ├── view.js         # canvas sizing, zoom, fit, render loop
    │   ├── pointer.js      # drag, resize, rotate, marquee
    │   ├── selection.js    # overlay seleksi + guide + handle
    │   └── text-editor.js  # editing teks in-place
    ├── tools/
    │   ├── cutout.js       # tool lasso/shape + clipboard
    │   └── split.js        # split PNG / sprite sheet
    ├── scrl/
    │   ├── slice.js        # slicing presisi
    │   ├── crossing.js     # deteksi elemen lintas batas guide
    │   └── video.js        # ekspor video panorama (Fase 3 — belum diaktifkan)
    ├── assets/
    │   └── manager.js      # cache aset (data URL / object URL)
    ├── app/
    │   └── ops.js          # duplicate, delete, imperfection
    └── ui/
        ├── chrome.js       # topbar, modal, keyboard, drag & drop, toast
        ├── library.js      # panel Elements
        ├── props.js        # panel Properties
        ├── layers.js       # daftar layer
        ├── gallery.js      # template bawaan (BUILTIN)
        ├── scrlGallery.js  # galeri template SCRL
        ├── export.js       # ekspor gambar tunggal
        └── scrlExport.js   # ekspor carousel N slice
```

### Konvensi arsitektur

- **Dependency injection, bukan global.** Semua cross-module communication lewat parameter `deps` — avoid UI↔render cycle.
- **`renderScene` adalah satu-satunya renderer.** Layar, preview, dan ekspor semua lewat fungsi yang sama, jadi yang diekspor selalu identik dengan yang dilihat.
- **`store` adalah satu sumber kebenaran.** Undo/redo berbasis snapshot JSON (stack dibatasi 60), dengan `subscribe()` untuk invalidate UI.
- **Nilai konstanta di `config/`.** Ubah ukuran kanvas, font, palet, atau aturan SCRL di sana — bukan di dalam modul UI.
- Komentar `// ponytail:` menandai solusi sementara yang masih ada upgrade path-nya (mis. deteksi crossing AABB → SAT).

---

## Format & batasan

- **Canvas:** preset di `SIZES` — 1:1, 4:5, 3:4, 2:3, 9:16, 5:4, 3:2, 16:9 (lebar 1080–1920).
- **SCRL:** portrait lock 1080×1350 per slice, N = 2–10.
- **Ekspor:** PNG (lossless, bisa transparan), JPG, WebP; skala 1× atau 2×; kualitas 40–100.
- **Performa:** slicing skala 2× pada N besar bisa berat — preview menampilkan estimasi megapixel dan memperingatkan di atas 30 MP.
- **Font & ikon:** dimuat dari Google Fonts dan jsDelivr (lucide icons) — butuh koneksi internet. Tanpa internet, layout tetap jalan tapi font fallback.

## Data & privasi

- Foto **tidak pernah diunggah ke server mana pun** — semua diproses di browser dan disimpan sebagai object/data URL di memori.
- **Belum ada autosave project.** Refresh = proyek hilang (kecuali nama project, yang disimpan di `localStorage` dengan key `sb_name`). Ekspor PNG/JPG kalau ingin menyimpan hasil.
- Modular worker (`js/scrl/video.js`) sudah ada tapi belum diaktifkan — video panorama adalah Fase 3.

---

## Referensi

- `.omo/SCRL-spec.md` — spec produk & teknis SCRL (carousel Instagram seamless)
- `.scratch/scrl/issues/` — breakdown ticket implementasi per fase
