# 05 — Ganti-N dan mismatch handling + undo

**What to build:** User ubah jumlah slide kapan pun tanpa kehilangan desain — elemen tetap di koordinat lama dan perubahan bisa di-undo. Saat template dengan N berbeda di-apply, user ditawari menyesuaikan N atau crop.

**Blocked by:** 01 — Panorama canvas + N selector + guides; 04 — Lima template panorama.

**Status:** ready-for-agent

- [ ] Ubah N menyimpan snapshot — undo mengembalikan N + elemen
- [ ] Elemen di luar viewport tetap ada di koordinat lama
- [ ] Apply template beda-N menawarkan dialog sesuaikan-N atau crop/pad
