# 02 — Slice export presisi + preview strip

**What to build:** User buka export SCRL, lihat strip preview berisi N thumbnail (satu per slide), lalu download rangkaian foto berurutan siap upload ke Instagram carousel — potongan presisi tanpa gap dan tanpa overlap.

**Blocked by:** 01 — Panorama canvas + N selector + guides.

**Status:** ready-for-agent

- [ ] Preview strip N thumbnail tampil sebelum download
- [ ] Tiap slice tepat 1080×1350 (dikalikan scale), jumlah lebar semua slice sama dengan lebar panorama
- [ ] Penamaan `slug-01.ext` … `slug-N.ext` (zero-pad, urut kiri→kanan)
- [ ] Download satu-per-satu, tanpa ZIP dan tanpa dependensi baru
