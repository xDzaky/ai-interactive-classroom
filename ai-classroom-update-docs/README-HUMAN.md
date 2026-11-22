# Paket update P10–P12 (untuk kamu, bukan untuk agent)

## 1. Cara pasang (5 menit)
1. Salin isi folder `ai-plan/` paket ini ke folder `ai-plan/` di repo kamu (file `tasks/P10…`, `P11…`, `P12…` dan 2 file addendum).
2. Buka `ai-plan/TASKS-ADDENDUM.md`, tempel isinya di **akhir** `ai-plan/TASKS.md`.
3. Tempel bagian **A** dari `ai-plan/CONTRACTS-REFS-ADDENDUM.md` ke `ai-plan/CONTRACTS.md`, dan bagian **B** ke `ai-plan/REFERENCES.md`.
4. Commit, lalu pakai prompt di bagian 5.

## 2. Hasil analisis (jujur soal batasnya)
GitHub memblokir crawler saya untuk halaman commit, tree, dan file mentah. Jadi saya hanya membaca README, `CODEMAP.md`, screenshot kamu, dan deskripsimu. Saya **belum** membaca kode `WhiteboardCanvas` dan recognizer-nya. Karena itu task pertama tiap bagian (P10-T01, P11-T01) adalah audit kode dengan perintah grep terbatas, dan perbaikan baru dimulai setelah ada bukti.

**Zoom berat.** Dugaan penyebab, urut dari yang paling mungkin:
1. Zoom disimpan di state React, sehingga seluruh scene dirender ulang tiap event wheel atau pinch.
2. Grid kamu rapat. Di zoom 29% pada screenshot, kotaknya hanya sekitar 6 px. Kalau grid dibuat dari banyak node Konva, itu mahal.
3. Semua goresan dan bentuk "mendengarkan" event (hit graph), padahal hanya perlu saat alat Select aktif.
4. Overlay 3D memakai WebGL yang terus menggambar ulang dan ikut bergeser tiap zoom.
5. Screenshot-mu memakai mode dev Vite (StrictMode, tanpa minify), yang lebih lambat dari build produksi. Selalu ukur dengan `build` + `preview`.

P10-T01 dan T02 membuktikan mana yang benar lewat eksperimen. Perbaikan dilakukan hanya untuk yang terukur memberi ≥10% perbaikan.

**Auto-shape salah tebak.** Dari gejalanya (gambar A jadi bentuk B, sementara coretan bebas ikut berubah), recognizer sekarang kemungkinan besar selalu memilih satu bentuk terdekat tanpa skor keyakinan dan tanpa opsi menolak. Rencananya:
- Recognizer baru dengan skor keyakinan.
- Kalau ragu, coretan dibiarkan sebagai tinta, atau muncul chip saran "Jadikan segitiga?".
- Ada mode Otomatis / Tahan / Mati dan tombol "Kembalikan coretan".
- Ada korpus uji untuk mengukur akurasi.

## 3. Peta fitur demo iFLYTEK → proyekmu
Fitur yang saya anggap pasti hanya yang terlihat di screenshot. Ringkasan teks iFLYTEK yang kamu kirim ditulis AI dan tidak saya verifikasi.

| Yang terlihat di demo | Status sekarang | Task |
|---|---|---|
| Kubus transparan, rusuk putus-putus, titik sudut berlabel A–H | Viewer 3D dasar sudah ada | P11-T02, T04 |
| Pilih 3 titik → bidang irisan biru + sudut ("83°") | Belum ada | P11-T03, T05 |
| Ukur panjang dan sudut, diagonal ruang | Belum ada | P11-T06 |
| Jaring-jaring (lipat/buka) | Belum ada | P11-T09 |
| Gambar segitiga/persegi → jadi bangun ruang | Auto-shape 2D sudah ada tapi kurang akurat | P10-T09–T12, lalu P11-T08 |
| Gambar kubus tangan bebas → model 3D | Belum ada (sulit, opsional) | P11-T10 |
| Menu bulat "AI" + palet warna | Belum ada | P12-T01 |
| Toolbar melayang di bawah objek 3D | Belum ada | P12-T02 |
| Tulisan tangan `y = x²−3` → grafik | Belum ada (opsional, pakai LLM vision) | P12-T03 |
| Banyak orang menulis sekaligus, layar sentuh besar | Belum ada | P12-T04 |

Bagian dari daftar dataset yang kamu kirim yang berguna hanya SolidGeo (soal bangun ruang untuk menguji AI tutor). Dataset lain berupa gambar atau point cloud, tidak cocok untuk mengenali sketsa tangan, jadi tidak dipakai. Saya juga belum memverifikasi repo-repo di daftar itu.

## 4. Urutan kerja dan model
1. **P10-T01 → T08** (performa), model MID (Terra / Sonnet / DeepSeek). Mulai di sini, karena zoom berat mengganggu semua fitur lain.
2. **P10-T09 dan T12** pakai model HIGH. T10–T11 boleh MID.
3. **P11-T01 → T07**: T02, T03, dan T05 HIGH, sisanya MID. Lalu T08 (datar→ruang) dan T09 (jaring-jaring).
4. P11-T10 (sketsa → 3D) dan semua P12 hanya setelah yang di atas stabil.

## 5. Prompt siap pakai
Mulai / lanjut setelah limit:
```
Read /AGENTS.md and follow it exactly. Then read ai-plan/TASKS.md and execute the next eligible task.
P10–P12 are human-approved FIX/feature tasks (see the header of the task file).
State your tier first. Do not scan the repo. Stop after one task.
```
Review fase (model HIGH):
```
Read /AGENTS.md and ai-plan/REVIEW.md. Execute the P10-RV task (or the phase review I name).
Re-run every verify command and the perf/corpus gates. Fix issues in small commits and log each one.
```

## 6. Yang harus kamu kerjakan sendiri (agent tidak bisa)
- **Rekam sampel gambarmu** setelah P10-T10 selesai: buka `/whiteboard?record=<nama bentuk>` dan gambar sekitar 20 sampel per bentuk (lingkaran, elips, persegi, persegi panjang, segitiga, belah ketupat, segilima, segienam, bintang, garis). Gambar dengan perangkat yang akan dipakai sungguhan (pen/jari/mouse), termasuk gambar yang "jelek". Unduh JSON-nya dan taruh di `packages/sketch-core/fixtures/human/`. Ini yang membuat akurasi nyata, bukan hanya di data sintetis.
- Rekam 10 coretan bukan-bentuk (huruf S, angka 8, hati, spiral) dengan label `negatif`, supaya recognizer belajar menolak.
- Jalankan uji performa di laptop dan perangkat terlemah yang akan dipakai sekolah, lalu kirim angka `docs/perf/BASELINE.md` bila hasilnya aneh.
