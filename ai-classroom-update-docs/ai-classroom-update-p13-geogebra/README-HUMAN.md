# Paket P13 — belajar dari GeoGebra secara legal (untuk kamu, bukan untuk agent)

## 1. Jawaban singkat
- **Apakah github.com/geogebra/geogebra source code web itu?** Sebagian. Itu mirror source code *aplikasi* GeoGebra (Graphing, Geometry, 3D, Classic), ditulis dalam Java dan dikompilasi ke web dengan GWT. Itu **bukan** source code situs geogebra.org (akun, hub materi `/math/...`, halaman kategori yang kamu tempel).
- **Boleh di-clone / di-REA lalu dipakai di proyekmu?** Tidak bebas. Ini ringkasan lisensinya (cek sendiri di https://www.geogebra.org/license, dan ini bukan nasihat hukum):
  - Kode sumber berlisensi **EUPL v1.2**. Turunannya boleh tanpa batasan non-komersial, tapi EUPL itu copyleft: karya turunan (termasuk hasil port Java → TypeScript) harus dirilis dengan EUPL atau lisensi yang kompatibel.
  - README proyekmu bertuliskan **Proprietary**. Menyalin atau mem-port kode GeoGebra bertabrakan dengan itu, kecuali kamu mengubah strategi lisensi.
  - Memakai kode bersama materi dan file bahasa GeoGebra sebagai satu produk tetap **hanya non-komersial**. Sekolah yang memungut biaya termasuk kategori komersial.
  - Ikon, gaya UI, terjemahan, dan materi pengguna (CC BY-NC-SA) tidak boleh diambil.
- **REA (membongkar bundel web)** tidak perlu, karena source-nya sudah publik, dan menambah risiko pelanggaran ketentuan layanan. Saya tidak merencanakannya.

## 2. Yang boleh kamu ambil
| Boleh | Tidak boleh |
|---|---|
| Ide, matematika, dan algoritma yang ditulis ulang dengan kata-katamu sendiri | Menyalin atau mem-port kode |
| Pola UX umum (panel objek, toolbar dikelompokkan, mode Graphing/Geometry/3D) | Ikon, CSS, ilustrasi, palet warna khasnya |
| Mempelajari perilaku lalu implementasi sendiri (*clean-room*) | Terjemahan/string bahasa GeoGebra |
| Embed aplikasi resminya untuk pilot non-komersial | Mengimpor materi GeoGebra ke aplikasimu |

## 3. Pilih satu jalur (task P13-T00, hanya kamu yang bisa memutuskan)
- **A. Embed GeoGebra resmi** untuk pilot non-komersial. Tidak ada kode GeoGebra di repo. Syaratnya online, dan harus dimatikan kalau nanti komersial.
- **B. Minta lisensi komersial** ke GeoGebra GmbH (kontak ada di halaman lisensi).
- **C. Clean-room + library permisif.** Pelajari perilakunya, tulis spesifikasi dengan kata sendiri, implementasi sendiri. Cocok untuk produk proprietary.
- **D. Jadikan proyekmu open source dengan EUPL** supaya boleh memakai kodenya langsung.

**Saran saya:** C untuk produksi, dan A hanya sebagai demo/pilot kalau perlu cepat. Jalur C memakai bagian yang sudah kamu bangun (P11: polyhedron, irisan, jaring-jaring). GeoGebra dipakai hanya sebagai referensi perilaku dan UX.

## 4. Alternatif yang saya temukan
**JSXGraph** untuk geometri 2D dinamis (titik, garis, lingkaran, konstruksi yang ikut berubah saat titik digeser). Situsnya menyatakan lisensi ganda LGPL dan MIT, termasuk untuk tujuan komersial. Ini bisa menggantikan pembuatan mesin konstruksi 2D dari nol. Task P13-T04 menguji kecocokannya sebelum diputuskan.

## 5. Isi paket
- `ai-plan/TASKS-ADDENDUM-P13.md` — tempel di akhir `ai-plan/TASKS.md`.
- `ai-plan/tasks/P13-geogebra-study-ux.md` — detail task: gerbang legal, clean-room (sesi pembaca dan sesi implementer terpisah, tanpa menyalin kode), studi UX menjadi design system sendiri, spike JSXGraph, embed opsional, redesign layout (panel objek, toolbar berkelompok, mode preset), pustaka template pelajaran (taksonomi Kurikulum Merdeka, konten asli).
- `scripts/check-third-party.mjs` — penjaga: CI gagal kalau kata "geogebra" atau kode terkait muncul di `apps/`, `packages/`, `scripts/` (kecuali folder embed yang diizinkan). Pasang lewat P13-T01.

## 6. Status repo-mu yang saya lihat
Commit P10-T11 (integrasi recognizer v2 dengan mode auto/hold/off dan chip saran) sudah masuk, jadi urutan berikutnya tetap P10-T12 (gerbang akurasi), lalu P11. P13 jangan didahulukan. Yang bisa jalan paralel hanya P13-T00 (keputusanmu) dan P13-T03 (studi UX).
