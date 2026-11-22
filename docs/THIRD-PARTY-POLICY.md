# Kebijakan Pihak Ketiga & Lisensi (Third-Party & Licensing Policy)

Dokumen ini mendefinisikan batasan hukum dan arsitektur untuk penggunaan library pihak ketiga, inspirasi desain, dan studi perangkat lunak eksternal (termasuk GeoGebra dan platform matematika interaktif lainnya).

---

## 1. Aturan Dasar: Boleh vs Tidak Boleh

| Kategori | Boleh Dilakukan | Dilarang Keras |
|---|---|---|
| **Matematika & Algoritma** | Ide matematika, rumus geometri murni, dan algoritma yang ditulis ulang secara independen dalam TypeScript/Python. | Menyalin, meng-copy-paste, atau me-reverse-engineer/port langsung kode sumber berlisensi copyleft/non-komersial (misal EUPL/GPL/CC-BY-NC). |
| **Pola UX & Interaksi** | Mengadopsi pola umum antarmuka: algebra/objects panel, grouped toolbar with flyouts, mode presets (Menggambar, Grafik 2D, Geometri, Bangun Ruang), dan dialog panduan langkah interaktif (seperti Mathtalking). | Menyalin ikon khas, CSS, gambar, ilustrasi, suara, atau trade dress dari aplikasi pihak ketiga. |
| **Bahasa & Konten** | Menulis materi, soal, dan label UI asli dalam Bahasa Indonesia sesuai taksonomi Kurikulum Merdeka. | Mengimpor berkas bahasa/terjemahan atau lembar kerja (worksheet/materials) buatan pengguna pihak ketiga berlisensi non-komersial (NC). |
| **Library Pihak Ketiga** | Menggunakan library berlisensi permisif (**MIT, Apache 2.0, BSD-3-Clause, ISC**, atau dual-license LGPL/MIT komersial seperti JSXGraph). | Menambahkan library berlisensi AGPL, SSPL, atau non-komersial (CC-BY-NC) ke dalam bundle produksi. |

---

## 2. Keputusan Arsitektur: ADR-P13

- **Jalur yang Dipilih:** **Path C — Clean-Room + Permissive Libraries**
- **Dasar Pemilihan:** Proyek *AI Interactive Classroom* adalah produk proprietary untuk institusi pendidikan dan sekolah. Kode sumber harus 100% bebas dari copyleft contamination (EUPL/GPL) dan batasan non-komersial.
- **Engine Geometri Dinamis:** Mengadopsi library permisif (JSXGraph berlisensi MIT untuk 2D dynamic geometry) atau mesin internal mandiri.
- **Inspirasi UX:** Mengombinasikan model visualisasi GeoGebra dengan pendekatan *conversational interactive math* ala Mathtalking (asisten AI kelas interaktif yang mendampingi murid langkah demi langkah).

---

## 3. Prosedur Penambahan Library Baru

Sebelum menginstal paket baru dengan `pnpm add`:
1. **Verifikasi Lisensi:** Pastikan lisensi di `package.json` dan file `LICENSE` adalah MIT, Apache-2.0, BSD, atau ISC.
2. **Catat di DECISIONS:** Tulis entri `PROPOSED` di `ai-plan/DECISIONS.md`.
3. **Uji Guard:** Jalankan `pnpm check:third-party` untuk memastikan tidak ada pelanggaran nama/aset.
4. **Perbarui STACK.md:** Daftarkan paket beserta fungsi spesifiknya di `ai-plan/STACK.md`.

---

## 4. Penjaga Otomatis (Automated Guard)

Skrip `scripts/check-third-party.mjs` dijalankan secara otomatis pada setiap `verify` dan proses CI. Skrip akan menggagalkan build jika menemukan pengenal terlarang di dalam direktori `apps/`, `packages/`, atau `scripts/`.
