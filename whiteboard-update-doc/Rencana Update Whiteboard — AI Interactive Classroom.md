# Rencana Update Whiteboard — AI Interactive Classroom

Nov 22, 2026 · @tsmp

## Ringkasan eksekutif

Update berikutnya bukan membangun ulang papan tulis, melainkan menambah satu lapisan di atasnya: pilih objek, buka roda AI, ubah sketsa 2D menjadi 3D yang bisa diputar 360°. Itulah inti pengalaman iFLYTEK yang realistis direplikasi di browser.

- **Repo Anda jauh lebih maju dari kesan "setup awal".** README dan CODEMAP mencatat fase P00–P09 selesai: kanvas Konva, reducer event-sourced dengan undo/redo, penampil 3D, grafik fungsi, ruang kelas realtime, kuis, replay, PWA offline, serta RAG dan tutor AI. Angka tes (222 PHPUnit, 331 Vitest, 36 Pytest) adalah laporan agen; belum saya jalankan.
- **Yang belum ada adalah jembatan** antara papan tulis dan mesin matematika: seleksi objek yang matang, menu kontekstual, konversi sketsa ke solid, irisan bidang yang benar secara matematis, dan pengenalan tulisan tangan.
- **Dari 35 kemampuan di riset:** 13 bisa dibangun deterministik di browser, 14 butuh AI, 2 terikat perangkat keras, dan 6 sengaja ditunda karena risiko privasi atau ROI rendah.

Tiga keputusan terpenting:

1. Kerjakan P10 → P11 → P12 (seleksi, roda AI, sketsa ke 3D) sebelum fitur lain. Setelah tiga fase itu, demo "gambar persegi → klik kanan → Kubus → putar 360°" sudah bisa ditunjukkan.
2. Pertahankan arsitektur sekarang (event-sourcing + Reverb). Jangan pindah ke Yjs/Hocuspocus seperti saran dokumen riset.
3. Semua aksi baru wajib lewat event reducer, supaya undo, sinkronisasi kelas, dan replay tetap berfungsi.

## Kondisi project saat ini

Repo sudah berupa monorepo lengkap; yang kurang adalah lapisan interaksi objek dan jembatan ke mesin matematika.

| Area | Sudah ada (menurut README/CODEMAP) | Celah menuju target iFLYTEK |
| --- | --- | --- |
| Kanvas dan alat | Konva + perfect-freehand, 9 alat, snapping grid, zoom/pan, palm rejection, scene, ekspor PNG | Seleksi multi-objek, transformasi lanjutan, menu kontekstual |
| State papan | Reducer murni, 14 jenis event, undo/redo dengan inverse, replay dari snapshot | Event "transaksi" agar satu konversi = satu undo (perlu dicek) |
| Auto-shape | Terlihat di screenshot (chip "Jadikan Elips?", toast "Kembalikan coretan"); belum tercatat di CODEMAP | Baru bentuk 2D; belum dipetakan ke bangun ruang |
| Visual matematika | SolidViewer (R3F, 8 solid, label, clip plane, wireframe, slider), GraphViewer (Mafs), math-core AST aman, geometry-core + cermin Python | Poligon irisan yang sebenarnya, ukur sudut/jarak, jaring-jaring, animasi 2D→3D |
| Overlay visual | WhiteboardOverlay menaruh viz\_solid dan viz\_graph sebagai elemen DOM di atas Konva | Batas konteks WebGL, ekspor PNG, replay kamera 3D (perlu dicek) |
| Kelas realtime | Reverb, seq + idempotency + gap-fill, peran guru/siswa/presentasi, raise hand, kontroler HP | Sinkron kamera 3D dan seleksi sebagai event ephemeral |
| AI | FastAPI + LiteLLM, job async, RAG pgvector, tutor petunjuk-dulu, generator rencana/kuis | Tulisan tangan, perintah suara, "jelaskan objek ini" |
| Kualitas | CI 4 job, WCAG 2.2 AA, header keamanan, ekspor/hapus data | — |

**Batas analisis ini.**

- Saya membaca README, CODEMAP, dan PROGRESS-LOG. Halaman riwayat commit dan folder `packages` diblokir GitHub untuk akses otomatis, dan file sumber whiteboard (hook alat, kanvas) tidak bisa saya buka. Klaim "perlu dicek" di atas harus diverifikasi di kode.
- CODEMAP tidak memuat halaman `/whiteboard` ("Papan Tulis Pribadi"), tombol Bangun 3D/Grafik 2D, maupun auto-shape. Dokumen itu tertinggal dari kode yang sudah 124 commit; P10-T01 memperbaikinya.
- Sebagian besar file inti papan tulis berstatus LOCKED di CODEMAP, dengan aturan di AGENTS.md §5 yang belum saya baca. Mengubahnya butuh task tier HIGH dan ADR.

## Analisis mendalam riset iFLYTEK

Nilai inti Tongchuang bukan jumlah fiturnya, melainkan satu alur: tulis, dikenali, AI menawarkan aksi kontekstual, lalu objek menjadi interaktif. Sebagian besar dari 35 kemampuan hanya mendukung alur itu atau terikat perangkat keras.

**Tiga prinsip UX di balik alur itu**

1. Tanpa pindah mode: guru tetap menulis seperti biasa, AI muncul hanya saat relevan.
2. Konfirmasi ringan: sistem menawarkan, guru memutuskan. Chip "Jadikan Elips?" di UI Anda sudah memakai pola ini.
3. Hasil konversi tetap bisa dimanipulasi (putar, potong, pisah), bukan gambar mati.

**Klasifikasi 35 kemampuan**

| Kelompok | Jumlah | Nomor di daftar riset | Sikap |
| --- | --- | --- | --- |
| A. Deterministik di browser | 13 | 1–10, 13, 19, 34 | Bangun sebagai inti (P10–P13) |
| B. Butuh AI (LLM, vision, suara) | 14 | 11, 12, 14–17, 21, 22, 28–33 | Bangun bertahap, selalu dengan konfirmasi guru |
| C. Terikat perangkat keras | 2 | 18, 20 | Lewati: gestur jarak jauh dan kamera kelas |
| D. Ditunda (privasi atau ROI) | 6 | 23–27, 35 | Tunda; lihat bagian risiko |

**Divergensi antara saran riset dan stack yang sudah dipilih repo**

| Saran riset | Pilihan repo saat ini | Keputusan |
| --- | --- | --- |
| Yjs + Hocuspocus untuk sinkronisasi | Event-sourcing dengan seq, idempotency key, dan gap-fill lewat Reverb | Pertahankan. CRDT akan menggandakan mekanisme dan menyulitkan replay |
| Math.js dan GeoGebra | math-core (AST aman), Mafs, geometry-core | Pertahankan. Lisensi GeoGebra membatasi pemakaian komersial |
| Generative 3D (TripoSR, TRELLIS.2, Hunyuan3D) | Tidak dipakai; geometri deterministik | Pertahankan. Kubus dan kerucut butuh ukuran presisi, dan model generatif butuh GPU |
| React Konva, Three.js, MathLive | Sudah dipakai | Selaras |
| Tesseract.js untuk tulisan tangan | Belum ada | Ganti dengan pendekatan vision-LLM dulu (P14) |

Dua gagasan riset yang tetap dipakai penuh: sketch-to-3D bersifat hibrida (algoritma geometri untuk bentuk, AI untuk menafsirkan maksud, Three.js untuk render), dan 3D bukan keseluruhan produk.

**Catatan akurasi dokumen riset**

- Daftar 35 kemampuan adalah katalog analisis, bukan modul resmi iFLYTEK; dokumen riset sendiri menyebutnya begitu. Tiga item (2D Intelligent Folding, 3D Segmentation, 3D Unfolding) ada di rekap tetapi tidak punya uraian sendiri, jadi detailnya masih dugaan.
- Interpretasi tiga screenshot belum terkonfirmasi sebagai nama tool resmi.
- Tautan sumber membawa parameter utm\_source=chatgpt.com, tanda dokumen disusun dengan ChatGPT. Saya tidak membuka ulang halaman iFLYTEK, jadi tanggal (Oktober 2025, Juli 2026, Oktober 2026) dan klaim spesifik perlu diverifikasi sebelum dikutip di proposal.
- Tesseract.js dirancang untuk teks cetak; hasilnya buruk untuk tulisan tangan matematika.

## Dari screenshot menjadi desain UX

Kedua screenshot iFLYTEK menunjukkan satu pola: roda AI yang melayang dekat pena dan objek, bukan menu di tepi layar. UI Anda sudah punya benih pola itu, tetapi tersebar di tiga tempat.

**Yang terlihat di dua screenshot iFLYTEK** (nama tombol belum terkonfirmasi)

- Gambar pertama: segitiga hasil tulisan tangan, dengan roda melingkar di bawahnya. Pusatnya bertuliskan "AI", dikelilingi cincin titik warna dan satu busur tambahan, ditambah tiga tombol kecil di dasar.
- Gambar kedua: model dua bidang berlabel sudut 83°, bilah alat melayang di atasnya (satu tombol centang hijau), dan roda "Ai" yang disentuh dengan pena.

**Prinsip desain yang diambil**

1. Roda muncul di dekat objek atau pena, bukan di toolbar tetap.
2. Dua tingkat dalam satu gestur: pusat "AI" untuk aksi cerdas (ubah, jelaskan), cincin luar untuk gaya (warna, tebal).
3. Hasil aksi muncul di tempat objek sumber dan membawa anotasi pengukuran, seperti label 83°.
4. Aksi yang berisiko (ubah, hapus) memakai bilah konfirmasi, bukan langsung jadi.

**Temuan pada UI Anda** (screenshot localhost:5173/whiteboard)

- Toolbar kiri terpotong di bawah pada tinggi layar sekitar 768 px; ikon panah (alat pilih) hanya terlihat separuh. Beri scroll atau lipat per kelompok.
- Satu fitur punya dua pola notifikasi: chip di atas objek ("Jadikan Elips?") dan toast di kanan bawah ("Kembalikan coretan"). Satukan menjadi satu chip dekat objek dengan pilihan Ya, Batal, Kembalikan coretan.
- Alat pilih ada di dasar toolbar, padahal seleksi adalah pintu masuk semua aksi. Pindahkan ke posisi teratas dengan pintasan V.
- Tombol header "Bangun 3D" dan "Grafik 2D" tetap dipertahankan sebagai sisipan global; tambahkan jalur kontekstual dari objek terpilih yang memakai aksi yang sama.
- Jendela browser di screenshot tampak Floorp (berbasis Firefox). Firefox tidak menyediakan Web Speech Recognition, jadi perintah suara butuh cadangan di server (P15).

## Peta gap fitur

Dari 18 kelompok kemampuan di bawah, 3 sudah ada, 6 sebagian, 8 belum ada, dan 1 tidak berlaku. Status "Sebagian" dan "Ada" berasal dari README/CODEMAP dan perlu diverifikasi di kode.

| Kemampuan iFLYTEK | Status di repo | Aksi | Fase |
| --- | --- | --- | --- |
| Sinkron papan dan ruang kelas | Ada | Tambah jenis event baru dan allowlist di server | P10 |
| Seleksi objek dan transformasi | Sebagian | Multi-seleksi, marquee, hit-test goresan, Transformer, pintasan | P10 |
| Roda AI kontekstual | Belum | ActionRegistry dan komponen RadialMenu | P11 |
| Sketch recognition dan koreksi bentuk | Sebagian (auto-shape 2D) | Hasilkan deskriptor bentuk dengan skor keyakinan; satukan UX chip | P12 |
| 2D ke 3D | Belum (tombol Bangun 3D ada; perilakunya belum saya periksa) | Peta bentuk ke solid, objek 3D muncul di tempat sketsa | P12 |
| Rotasi 360° | Ada (OrbitControls) | Rotasi bebas, auto-rotate, preset tampak, simpan dan sinkron kamera | P12 |
| Animasi 2D ke 3D | Belum | Parameter waktu t untuk ekstrusi dan putar | P12 |
| Irisan bidang | Sebagian (clip plane) | Poligon penampang, ukuran, pilih 3 titik | P13 |
| Ukur sudut dan jarak (label 83°) | Belum | Anotasi terukur di geometry-core | P13 |
| Jaring-jaring: lipat dan buka | Belum | Deteksi jaring dari grid, animasi engsel | P13 |
| Pisah bagian (exploded view) | Belum | Mode exploded di SolidViewer | P13 |
| Grafik fungsi dinamis | Ada (Mafs + math-core) | Slider parameter, grafik dari rumus tulisan tangan | P14 |
| Tulisan tangan ke teks dan rumus | Belum | Vision-LLM dengan konfirmasi guru | P14 |
| Perintah suara dan pemahaman niat | Belum | Registry perintah, STT, parser niat | P15 |
| Jelaskan objek dan rantai soal | Sebagian (tutor, generator rencana/kuis) | Aksi "Jelaskan" di roda, problem-chain | P15 |
| Kata kunci dan rekomendasi sumber | Sebagian (RAG) | Kata kunci dari teks papan menjadi kueri RAG | P15 |
| Ringkasan dan micro-lesson | Sebagian (replay, snapshot) | Segmentasi event log dan ringkasan LLM | P16 |
| Hardware: kamera, speaker, papan optik | Tidak berlaku | Lewati | — |

## Desain teknis fitur inti

Empat bagian saling bergantung: seleksi menjadi pintu masuk, roda AI menjadi menunya, konversi sketsa ke 3D menjadi aksi paling bernilai, dan semuanya ditulis sebagai event reducer.

### 1. Seleksi objek (P10)

- Seleksi adalah state lokal per pengguna (daftar id objek), bukan bagian state papan. Hanya hasil akhirnya (geser, ubah ukuran, hapus) yang menjadi event.
- Cara memilih: klik, Shift+klik, dan marquee (seret di area kosong). Hit-test goresan memakai jarak ke garis tengah dengan toleransi dalam piksel layar dibagi zoom, bukan poligon tinta.
- Transformasi memakai Konva Transformer. Objek viz\_solid dan viz\_graph (elemen DOM) memakai kotak seleksi yang sama lewat konversi koordinat dunia ke layar.
- Pintasan: V (alat pilih), Delete, Ctrl+D (duplikat), Ctrl+A, panah (geser satu kotak grid), Esc.
- Opsional: seleksi guru tampil sebagai sorotan di layar siswa lewat event ephemeral.

### 2. Roda AI / menu radial (P11)

- Pemicu: klik kanan, tekan lama 500 ms (sentuh), tombol barrel pena (browser mengirimnya sebagai contextmenu), ikon "AI" di pojok kotak seleksi, dan Shift+F10 untuk keyboard.
- Isi roda dihitung fungsi murni `resolveActions(selection)` dari satu **ActionRegistry**. Tiap aksi = `{id, label, ikon, appliesTo(selection), run(ctx)}`. Registry yang sama melayani roda, chip auto-shape, tombol header, dan kelak perintah suara, sehingga logikanya tidak digandakan.
- Cincin luar selalu berisi gaya (warna, tebal, isi) dan hapus; pusat "AI" berisi aksi cerdas sesuai seleksi:

| Seleksi | Aksi di pusat "AI" |
| --- | --- |
| Persegi | Kubus, Balok, Prisma, Jaring-jaring |
| Persegi panjang | Balok, Prisma |
| Lingkaran | Bola, Tabung, Kerucut |
| Elips | Rapikan, Jadikan lingkaran |
| Segitiga | Limas, Kerucut (diputar), Prisma segitiga |
| Segi lima atau enam | Prisma, Limas |
| Teks atau rumus | Jelaskan, Gambar grafik (jika fungsi), Selesaikan bertahap |
| Objek 3D | Irisan, Pisah bagian, Ukur sudut, Reset tampak |
| Campuran | Kelompokkan, Duplikat, Kunci, Ke depan/belakang |

- Aksesibilitas (repo menargetkan WCAG 2.2 AA): `role="menu"`, roving tabindex, panah mengelilingi roda, Esc menutup dan mengembalikan fokus ke objek, label i18n Indonesia, hormati `prefers-reduced-motion`.
- Posisi: berpusat di titik pemicu dan digeser agar tidak keluar viewport; di layar sempit berubah menjadi bottom-sheet.

### 3. Sketsa ke 3D dan rotasi 360° (P12)

1. **Kenali bentuk.** Recognizer menghasilkan deskriptor `{kind, vertices, bbox, rotasi, confidence}`: simplifikasi poligon, hitung sudut, deteksi tertutup, fit lingkaran/elips. Ambang keyakinan menentukan apakah chip muncul.
2. **Petakan ke solid secara deterministik.** Bila ada lebih dari satu kandidat (lingkaran bisa bola, tabung, atau kerucut), roda menampilkan pilihan; sistem tidak menebak. Riset Anda sendiri mencatat bahwa bentuk datar tidak selalu menghasilkan satu bangun ruang.
3. **Tentukan ukuran.** Sisi atau jari-jari sketsa dikonversi lewat skala grid (misalnya satu kotak = 1 cm, dapat diubah) lalu dibulatkan. Tinggi awal = sisi terpendek, dapat diubah lewat handle atau slider. Label ukuran dan rumus volume/luas berasal dari geometry-core.
4. **Tulis sebagai satu transaksi.** Satu event `batch`: buat viz\_solid di posisi dan ukuran sketsa, simpan `sourceId`, sembunyikan sketsa asal. Satu Ctrl+Z mengembalikan sketsa. Jika reducer belum mendukung `batch` beserta inverse-nya, tambahkan lewat ADR, lengkap dengan allowlist server.
5. **Putar 360°.** Orbit tanpa batas azimut, pinch untuk zoom, tombol auto-rotate, preset tampak (depan, atas, samping, isometrik), dan Reset. Pose kamera disimpan ke properti objek saat pointer dilepas, bukan tiap frame, supaya snapshot dan replay tetap kecil. Selama menarik, kirim event ephemeral yang di-throttle agar siswa melihat putaran guru. Siswa memilih "ikut guru" atau "jelajahi sendiri" (toggle ikut-guru sudah ada di StudentView).
6. **Animasikan transisi.** Satu parameter waktu t dari 0 sampai 1: ekstrusi (persegi menjadi kubus), putar (segitiga siku-siku atau sama kaki menjadi kerucut), lipat (jaring-jaring menjadi kubus). Kontrol play, pause, dan scrub.
7. **Anotasi terukur.** Label sudut seperti 83° di screenshot iFLYTEK, panjang rusuk, dan diagonal ruang.

### 4. Irisan, pengukuran, dan jaring-jaring (P13)

- Irisan sebenarnya: representasi polihedron (simpul, rusuk, sisi) untuk kubus, balok, prisma, dan limas. Perpotongan bidang dengan tiap sisi menghasilkan poligon terurut beserta panjang sisi, luas, dan keliling. Tabung, kerucut, dan bola memakai rumus analitik (lingkaran atau elips). Clip plane yang ada sekarang hanya memotong tampilan, bukan menghitung penampang.
- Interaksi: pilih tiga titik (simpul, titik tengah rusuk, atau titik pada rusuk) untuk menentukan bidang, sesuai pola soal dimensi tiga di sekolah ("bidang melalui P, Q, R"). Bidang bisa digeser dan diputar dengan slider; penampang diwarnai.
- Pengukuran: jarak titik ke garis atau bidang, sudut antargaris dan antarbidang.
- Jaring-jaring: mulai dari kubus (11 jaring yang valid), lalu balok, prisma, dan limas. Deteksi dari susunan persegi pada grid, lipat lewat pohon sisi dengan rotasi engsel.
- Kontrak: tambahkan fixture ke tes bersama TS↔Python yang sudah ada (pola P08-T02).

### 5. Hal lintas bagian

- Setiap jenis event baru butuh lima hal: skema Zod di shared-types, reducer + inverse + tes, allowlist di RoomEventController + tes, entri CONTRACTS.md, dan bukti bahwa replay memutarnya.
- Dugaan dari CODEMAP, perlu dicek: setiap solid memakai satu konteks WebGL. Browser membatasi jumlah konteks aktif (belasan), jadi rencanakan satu Canvas bersama dengan banyak viewport, atau bekukan solid di luar layar menjadi gambar.
- Ekspor PNG sekarang mengekspor stage Konva, jadi overlay DOM kemungkinan tidak ikut. Tangkap kanvas WebGL dan gambar ke hasil ekspor.
- `useWeakDevice` sudah ada: pakai untuk menurunkan kualitas 3D dan mematikan auto-rotate.

## Roadmap P10–P16

&#91;embedded content: roadmap · 7 fase, 2 lane, 1 gate per fase\]

Lane A cukup untuk menunjukkan demo inti; lane B bergantung pada objek 3D hasil P12.

Penomoran melanjutkan P00–P09 di repo, sehingga tiap fase bisa langsung menjadi berkas `ai-plan/tasks/P1x-*.md` dan baris di TASKS.md. Ukuran bersifat relatif (S, M, L), bukan jam kerja.

### P10 — Seleksi dan transformasi

- T01 (S) Audit dan CODEMAP: dokumentasikan halaman /whiteboard, auto-shape, tombol Bangun 3D dan Grafik 2D; daftar file LOCKED yang perlu dibuka; verifikasi klaim "perlu dicek" di dokumen ini.
- T02 (M) Model seleksi: klik, Shift+klik, marquee, hit-test goresan, Transformer, pintasan. Pindahkan alat pilih ke atas toolbar dan perbaiki toolbar yang terpotong.
- T03 (M) Event transaksi `batch` dengan inverse, allowlist server, dan entri CONTRACTS.md.
- T04 (S) Event ephemeral untuk sorotan seleksi dan pose kamera (kamera wajib di P12).
- **Selesai bila** semua operasi seleksi bisa di-undo, tampil di replay, dan tersinkron ke siswa, dengan tes Vitest dan PHPUnit baru lulus.

### P11 — Roda AI

- T01 (M) ActionRegistry dan `resolveActions` dengan tes unit murni.
- T02 (L) Komponen RadialMenu: pemicu, posisi, bottom-sheet, aksesibilitas, i18n.
- T03 (S) Aksi gaya: warna, tebal, isi, duplikat, kunci, urutan, kelompok, hapus.
- T04 (S) Pindahkan chip auto-shape ke registry dan satukan dengan toast.
- **Selesai bila** roda terbuka lewat klik kanan, tekan lama, dan keyboard, lolos tes aksesibilitas, dan setiap aksi tercatat sebagai event.

### P12 — Sketsa ke 3D dan rotasi 360°

- T01 (L) Paket `sketch-core`: deskriptor bentuk, skor keyakinan, fixture tes dari sketsa nyata.
- T02 (M) Tabel pemetaan bentuk ke solid, skala grid, handle ukuran.
- T03 (M) Aksi "jadikan 3D" sebagai transaksi `batch`, dengan viz\_solid muncul di tempat sketsa.
- T04 (M) Orbit 360°, preset tampak, auto-rotate, simpan pose, sinkron ke siswa.
- T05 (M) Animasi ekstrusi dan putar.
- T06 (M) Ekspor PNG dengan 3D, strategi konteks WebGL bersama, mode perangkat lemah.
- **Selesai bila** demo 60 detik berjalan: gambar persegi, klik kanan, pilih Kubus, putar 360°, undo mengembalikan sketsa, dan siswa melihat putaran guru.

### P13 — Irisan, ukur, dan jaring-jaring

- T01 (L) Polihedron, poligon irisan, dan rumus analitik, dengan fixture bersama TS↔Python.
- T02 (M) Alat irisan tiga titik dan slider bidang.
- T03 (M) Ukur jarak dan sudut dengan label.
- T04 (L) Jaring-jaring kubus (11 bentuk), lalu balok, prisma, limas; animasi engsel; pisah bagian.
- **Selesai bila** hasil irisan dan pengukuran cocok dengan fixture di TypeScript dan Python.

### P14 — Tulisan tangan ke rumus dan grafik

- T01 (M) Rasterisasi goresan terpilih dan endpoint pengenal tinta di ai-service (vision-LLM) dengan batas waktu pendek.
- T02 (M) Chip konfirmasi "Jadikan rumus?" dan konversi ke blok matematika (MathLive, math-core).
- T03 (S) Rumus fungsi menjadi grafik (viz\_graph) dengan slider parameter.
- T04 (S) Set uji 50 sampel tulisan tangan guru; tetapkan ambang akurasi sebelum rilis.
- **Selesai bila** akurasi pada set uji melewati ambang yang disepakati dan tidak ada konversi tanpa konfirmasi.

### P15 — AI kontekstual dan suara

- T01 (M) Aksi "Jelaskan" dan rantai soal (problem-chain) memakai pola AiJob yang ada.
- T02 (M) Perintah suara: tata bahasa deterministik dulu, LLM function-calling untuk sisanya, divalidasi Zod terhadap registry. Cadangan STT di server untuk browser tanpa Web Speech.
- T03 (S) Kata kunci dari teks papan menjadi kueri RAG.
- **Selesai bila** setiap perintah suara memanggil aksi registry yang sama dan gagal dengan aman bila tidak dikenali.

### P16 — Analitik dan aktivitas (lanjutan)

- T01 (M) Segmentasi event log menjadi micro-lesson dan ringkasan pelajaran.
- T02 (S) Highlight momen kelas dari event (jawaban kuis, demo 3D).
- T03 (M) Tantangan interaktif, mulai dari puzzle geometri.
- **Selesai bila** ringkasan dibuat dari event log tanpa menyimpan video atau audio siswa.

## Risiko, keputusan, dan langkah pertama

Empat risiko teknis dan satu risiko privasi menentukan urutan kerja; semuanya punya pengaman murah bila diputuskan sekarang.

| Risiko | Dampak | Pengaman |
| --- | --- | --- |
| File inti berstatus LOCKED | Agen tier rendah tidak boleh mengubah kanvas, hook alat, whiteboard-core | Buka lewat task HIGH dan ADR; P10-T01 mendaftar file yang perlu dibuka |
| Satu konteks WebGL per solid | Banyak solid di satu papan bisa membuat kanvas 3D kosong | Satu Canvas bersama atau bekukan solid di luar layar (P12-T06) |
| Event baru ditolak server | Aksi lolos di klien tetapi gagal sinkron ke kelas | Allowlist dan tes di RoomEventController untuk setiap jenis event baru |
| Akurasi pengenalan | Konversi salah mengganggu pelajaran | Selalu konfirmasi, bentuk ambigu menampilkan pilihan, ambang keyakinan, set uji |
| Privasi siswa | Tulisan tangan dan suara anak adalah data pribadi | Lihat bagian privasi di bawah |

**Keputusan ADR yang perlu diambil sebelum fase terkait**

1. P10: izin mengubah file LOCKED (kanvas, hook alat, ToolBar, whiteboard-core) dan penambahan event `batch`.
2. P12: strategi WebGL (Canvas bersama atau per solid) dan lokasi `sketch-core` (paket baru atau bagian geometry-core).
3. P14: mesin pengenal tulisan tangan. Pilihannya vision-LLM lewat LiteLLM yang sudah ada (tanpa infrastruktur baru, tetapi gambar tulisan siswa dikirim ke penyedia model), pix2tex di server sendiri, atau SDK komersial seperti MyScript. Saran: mulai dari vision-LLM dengan konfirmasi guru, ukur di set uji, lalu putuskan.
4. P14: endpoint sinkron berbatas waktu untuk pengenalan tinta, karena pola AiJob (202 lalu polling) terlalu lambat untuk interaksi sketsa.
5. P15: Web Speech API (id-ID) di browser Chromium dengan cadangan STT di server untuk Firefox.

P10–P13 kemungkinan tidak butuh paket baru (Konva, R3F, MathLive, Mafs sudah dipakai), tetapi cek terhadap STACK.md karena aturan repo melarang paket di luar daftar.

**Privasi dan etika**

- Tulisan tangan dan suara siswa adalah data pribadi anak. Indonesia mengaturnya lewat UU Pelindungan Data Pribadi (UU 27/2022). Saya bukan penasihat hukum; pastikan syarat persetujuan sebelum mengirim gambar tulisan atau audio ke penyedia AI pihak ketiga.
- Dikeluarkan dari lingkup sampai ada tinjauan privasi: avatar guru dengan kloning suara, analisis perilaku siswa dari video, rekaman kamera kelas, dan tokoh sejarah virtual.
- Sengaja ditunda: gestur jarak jauh (MediaPipe), generative 3D, WebXR, mitra belajar bahasa, aktivitas ritme, dan Yjs.

**Langkah pertama minggu ini**

- [ ] Putuskan ADR P10 dan buka file LOCKED yang diperlukan.
- [ ] Jalankan P10-T01: verifikasi lima klaim "perlu dicek" (select/transform di hook alat, dukungan `batch` di reducer, perilaku tombol Bangun 3D, konteks WebGL per solid, ekspor PNG terhadap overlay) dan perbarui CODEMAP.
- [ ] Kumpulkan 15–20 foto atau rekaman sketsa guru (persegi, lingkaran, segitiga, jaring-jaring) sebagai fixture `sketch-core`.
- [ ] Ubah tiap fase di dokumen ini menjadi berkas task di `ai-plan/tasks/` sesuai format TASKS.md.

**Sumber yang saya buka**

- [README repo](https://github.com/xDzaky/ai-interactive-classroom/)
- [CODEMAP.md](https://github.com/xDzaky/ai-interactive-classroom/blob/main/CODEMAP.md)
- [PROGRESS-LOG.md](https://github.com/xDzaky/ai-interactive-classroom/blob/main/PROGRESS-LOG.md)
- Dokumen riset iFLYTEK dan tiga screenshot yang Anda kirim (halaman iFLYTEK sendiri tidak saya buka ulang)
