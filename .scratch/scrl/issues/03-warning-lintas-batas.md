# 03 — Warning lintas-batas

**What to build:** Saat foto atau teks melintang di garis batas slide, user dapat peringatan visual non-blocking (badge di preview + garis merah tipis di editor) — user tetap bebas export karena potongan lintas batas kadang disengaja untuk efek artistik.

**Blocked by:** 01 — Panorama canvas + N selector + guides.

**Status:** ready-for-agent

- [ ] Elemen yang bounding box-nya memotong garis `k*1080` terdeteksi
- [ ] Badge peringatan tampil di preview strip + garis merah tipis di editor
- [ ] Warning tidak memblokir export, tanpa auto-snap di MVP
