# Catatan Analisis UX: GeoGebra & Mathtalking (Clean-Room Study)

Dokumen ini mendokumentasikan observasi arsitektur informasi, pola interaksi, dan alur pengalaman pengguna dari perangkat lunak matematika interaktif terkemuka (GeoGebra dan pendekatan conversational math learning ala Mathtalking) dengan kata-kata sendiri tanpa menyalin aset, CSS, maupun kode sumber.

---

## 1. Arsitektur Informasi (Information Architecture)

Pola tata letak standar yang terbukti efektif untuk pembelajaran matematika digital:

1. **Panel Objek / Aljabar (Left Sidebar / Drawer):**
   - Menampilkan daftar semua elemen di papan secara hierarkis:
     - Titik Bebas (Free Points): Koordinat dapat disunting langsung.
     - Garis & Segmen (Lines/Segments): Panjang, persamaan garis.
     - Bangun Datar (Polygons): Luas, keliling, sudut dalam.
     - Bangun Ruang (3D Solids): Titik sudut (A, B, C, ...), volume, luas permukaan, bidang irisan, status jaring-jaring.
     - Fungsi & Grafik: Persamaan matematika $f(x)$, turunan, titik potong sumbu.
   - Kontrol per baris:
     - Toggle visibilitas (ikon mata)
     - Tombol kunci (lock agar tidak tergeser murid)
     - Palet warna cepat
     - Tombol hapus

2. **Kanvas Utama (Center Interactive Viewport):**
   - Kanvas tak terbatas (infinite canvas) dengan koordinat grid kartesius atau grid isometrik.
   - Panning (geser) dan Zoom (cubit/scroll) instan tanpa lag.
   - Objek memiliki pegangan manipulasi langsung (manipulation handles) pada titik sudut (misal vertex A–H pada kubus).

3. **Toolbar Berkelompok (Grouped Toolbar with Flyouts):**
   - Mengelompokkan puluhan aksi menjadi 5–6 kelompok utama:
     - **Gambar:** Pena bebas, penyorot (highlighter), penghapus.
     - **Bentuk:** Persegi, persegi panjang, lingkaran, elips, segitiga, jajaran genjang, trapesium, belah ketupat, bintang.
     - **Geometri Konstruksi:** Titik, ruas garis, garis tegak lurus, garis sejajar, bagi sudut, lingkaran 3 titik, titik potong.
     - **Bangun Ruang (3D):** Kubus, balok, prisma segitiga, limas segiempat, tabung, kerucut, bola, bidang irisan, jaring-jaring animasi.
     - **Grafik & Analisis:** Plot fungsi $f(x)$, garis singgung, integral visual.
     - **Teks & Rumus:** MathLive LaTeX editor, teks catatan.

4. **Preset Mode Ruang Kerja (Workspace Mode Presets):**
   - Memungkinkan guru/siswa berganti konteks pembelajaran dengan 1 klik:
     - `Menggambar`: Papan tulis biasa dengan pena halus & auto-shape.
     - `Geometri Datar`: Fokus konstruksi titik, garis, sudut, dan pengukuran.
     - `Grafik 2D`: Sumbu koordinat $X-Y$, tabel nilai, plot fungsi.
     - `Bangun Ruang`: Kanvas 3D interaktif, irisan bidang, unfold jaring-jaring.

---

## 2. Model Pembelajaran Percakapan (Conversational Math ala Mathtalking)

Mathtalking memadukan **kanvas visual** dengan **pendampingan percakapan cerdas**:

1. **Asisten AI Terkontekstualisasi (Context-Aware AI Tutor):**
   - Murid tidak hanya membaca teks, melainkan dapat bertanya: *"Bagaimana cara menghitung panjang diagonal ruang kubus ABCD.EFGH ini?"*
   - Asisten AI merespons dengan:
     1. Penjelasan konsep dalam Bahasa Indonesia ramah siswa.
     2. Aksi langsung di papan: Menyorot segitiga siku-siku $BDH$ di dalam kubus.
     3. Langkah perhitungan bertahap menggunakan rumus Pythagoras 3D: $HB = \sqrt{s^2 + s^2 + s^2} = s\sqrt{3}$.
2. **Umpan Balik Instan (Interactive Feedback Loop):**
   - Ketika murid memotong kubus dengan bidang irisan atau menggeser slider jaring-jaring, asisten memberikan refleksi pertanyaan pemantik: *"Perhatikan bentuk penampang irisan kubus saat melewati 3 titik tengah rusuk: bangun datar apa yang terbentuk?"*

---

## 3. Hal yang Diadopsi vs Hal yang Dilarang

| Ide yang Diadopsi untuk AI Classroom | Dilarang (Tidak Boleh Diambil) |
|---|---|
| Panel pohon objek dengan toggle mata & lock | Ikon bawaan GeoGebra (kita pakai Lucide icons) |
| Toolbar berkelompok dengan flyout sub-alat | Gaya visual CSS khas & palet warna GeoGebra |
| Mode preset pembelajaran (Menggambar / Geometri / 3D) | Teks terjemahan resmi pihak ketiga |
| Dialog panduan langkah interaktif | Worksheet / material buatan pengguna berlisensi NC |
| Penamaan titik otomatis (A, B, C...) | Bundel web kompilasi atau asset biner |
