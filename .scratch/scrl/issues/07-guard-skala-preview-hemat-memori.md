# 07 — Guard skala dan preview hemat memori

**What to build:** Panorama 10 slide tetap ringan di Chrome Windows — preview selalu downscale ke lebar viewport (full-res hanya saat export), dengan batas scale cerdas dan estimasi ukuran sebelum export.

**Blocked by:** 01 — Panorama canvas + N selector + guides; 02 — Slice export presisi + preview strip.

**Status:** ready-for-agent

- [ ] Preview canvas downscale ke viewport, full-res hanya saat export/idle
- [ ] Scale=2 dibatasi saat N besar, dengan estimasi megapiksel + peringatan
- [ ] Export N=10 scale=1 selesai tanpa jank berlebihan
