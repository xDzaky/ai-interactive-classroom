**PROPOSAL PENGEMBANGAN PRODUK**

# AI INTERACTIVE CLASSROOM {.unnumbered}

## Platform Pembelajaran Interaktif Berbasis Web, AI, dan Visualisasi 2D/3D untuk Sekolah Indonesia {.unnumbered}

**Dokumen Proposal Konseptual dan Rencana Pengembangan**  
**Versi:** 1.0  
**Tanggal:** 21 November 2026  
**Status:** Proposal awal untuk validasi kebutuhan, pengembangan prototipe, dan pilot sekolah  
**Nama produk:** AI Interactive Classroom (nama kerja; merek final belum ditetapkan)

\newpage

# DAFTAR ISI {.unnumbered}

1. Ringkasan Eksekutif
2. Latar Belakang dan Identifikasi Masalah
3. Gagasan, Solusi, Visi, dan Tujuan
4. Target Pengguna
5. Adaptive Classroom dan Skenario Penggunaan
6. Sistem Room, Peran, dan Permission
7. Fitur Produk dan Manfaat
8. Diferensiasi dan Posisi Produk
9. Arsitektur Teknologi dan Data Model
10. Riset Repository GitHub dan Fondasi Pengembangan
11. Knowledge Base dan Kurikulum
12. Keamanan, Privasi, Offline, dan Low Bandwidth
13. Roadmap, KPI, Risiko, dan Operasional
14. Rencana Pilot, Model Keberlanjutan, dan Kesimpulan
15. Referensi

\newpage

# Ringkasan Eksekutif {.unnumbered}

AI Interactive Classroom adalah gagasan platform pembelajaran berbasis web yang dirancang agar guru dan siswa dapat melakukan kegiatan belajar interaktif menggunakan perangkat yang sudah tersedia: laptop, tablet, smartphone, proyektor, Smart TV, atau interactive display yang kompatibel. Platform tidak membutuhkan pembuatan smartboard fisik baru.

Fokus awal produk adalah pembelajaran Matematika, khususnya geometri ruang dan grafik, dengan kemampuan untuk dikembangkan ke materi matematika lain. Guru dapat membuat objek, mengubah parameter, menampilkan grafik, dan mengeksplorasi model 3D. AI membantu memahami konteks, menyusun penjelasan, membuat materi dan kuis, serta menghubungkan materi dengan sumber pembelajaran. Perhitungan dan bentuk matematika yang membutuhkan ketepatan tetap dikerjakan oleh engine deterministik, bukan diserahkan sepenuhnya kepada model generatif.

Platform mengakomodasi beberapa kondisi kelas: guru menggunakan laptop dan proyektor; guru menggunakan Smart TV touchscreen; guru hanya menggunakan smartphone; guru memasangkan smartphone sebagai remote controller untuk laptop; serta siswa bergabung melalui browser dengan kode atau akun. Jika perangkat siswa terbatas, guru dapat menggunakan Group Learning Mode. Jika fasilitas layar dan perangkat siswa sama sekali tidak tersedia, platform tidak menjanjikan visualisasi bersama yang secara fisik tidak dapat ditampilkan; guru tetap dapat menggunakan materi cetak atau aktivitas yang dipandu.

Fitur kolaborasi menggunakan Room System. Guru menjadi host dengan kontrol utama. Siswa dapat masuk sebagai guest atau akun, mengikuti presentasi, menjawab kuis, dan mengajukan Raise Hand. Siswa hanya dapat mengubah master whiteboard setelah disetujui guru sebagai presenter sementara dengan izin terbatas dan dapat dicabut. Event-based Replay menyimpan perubahan whiteboard dan aktivitas terstruktur untuk ditinjau ulang, tanpa merekam video/audio kelas sebagai pengaturan default.

Arsitektur yang dipilih adalah React + TypeScript untuk frontend, Laravel untuk backend utama, FastAPI untuk layanan AI dan komputasi Python, PostgreSQL sebagai database utama, Laravel Reverb untuk realtime tahap awal, Three.js untuk 3D, React Konva untuk whiteboard, serta PWA/IndexedDB untuk kemampuan offline terbatas. Repository open-source yang relevan ditampilkan di proposal ini beserta lisensi dan catatan penggunaannya agar menjadi fondasi riset dan tidak perlu dicari ulang dari awal.

Produk masih berada pada tahap rancangan. Kebutuhan, harga, efektivitas pembelajaran, kompatibilitas perangkat, dan model bisnis harus divalidasi melalui wawancara guru, uji prototipe, serta pilot di sekolah.

---

# 1. Latar Belakang

Kegiatan belajar di sekolah tidak selalu didukung fasilitas digital yang sama. Sebagian kelas mempunyai proyektor dan Wi-Fi, sebagian mempunyai Smart TV atau layar sentuh, sementara kelas lain hanya memiliki papan tulis konvensional. Tidak semua guru memiliki laptop pribadi, dan kepemilikan smartphone atau tablet siswa juga tidak merata.

Di sisi lain, beberapa materi pelajaran sulit dibayangkan hanya melalui tulisan di papan. Bangun ruang, perubahan parameter fungsi, struktur objek, dan hubungan antarbagian dapat lebih mudah dipelajari ketika siswa dapat melihat dan memanipulasi representasi visual. Guru juga membutuhkan cara untuk mengajak siswa berpartisipasi, menilai pemahaman dengan cepat, dan menyimpan proses pembelajaran agar dapat ditinjau kembali.

Inspirasi awal produk berasal dari perkembangan AI smart classroom dan AI blackboard, termasuk gagasan pengenalan tulisan/sketsa, perapian bentuk, visualisasi matematika, model 3D, asisten pengajaran, rekomendasi materi, dan dokumentasi pembelajaran. Brief referensi iFLYTEK yang disediakan dalam riset awal menjadi sumber inspirasi fungsional, bukan spesifikasi hardware yang akan ditiru. Karena target produk ini adalah website, fitur yang membutuhkan sensor layar, stylus khusus, array mikrofon, atau kamera hardware tidak termasuk ruang lingkup awal.

Solusi yang diusulkan adalah membangun lapisan software pembelajaran yang dapat menyesuaikan diri dengan perangkat yang tersedia di kelas. Dengan pendekatan tersebut, sekolah tidak harus membeli smartboard baru untuk mulai menggunakan pembelajaran visual dan interaktif.

# 2. Identifikasi Masalah

Masalah yang menjadi dasar pengembangan:

1. **Perbedaan fasilitas kelas.** Tidak semua kelas memiliki Smart TV, proyektor, laptop guru, atau Wi-Fi yang stabil.
2. **Akses perangkat siswa tidak merata.** Tidak semua siswa mempunyai smartphone atau laptop sendiri.
3. **Keterbatasan media visual.** Materi abstrak seperti geometri ruang dan grafik fungsi memerlukan representasi visual yang dapat dieksplorasi.
4. **Input menggambar tidak seragam.** Mouse, touchpad, layar sentuh, dan stylus memiliki pengalaman input berbeda.
5. **Partisipasi siswa perlu dikelola.** Guru perlu memberi kesempatan siswa untuk menjelaskan atau mempraktikkan materi tanpa membuka hak edit kepada seluruh peserta.
6. **Guru ingin bergerak saat mengajar.** Guru yang menggunakan laptop dan proyektor perlu opsi mengendalikan materi dari smartphone.
7. **Materi dan aktivitas perlu ditinjau ulang.** Catatan whiteboard dan jawaban kuis sering tidak terstruktur menjadi dokumentasi yang mudah dipelajari kembali.
8. **AI pendidikan harus memiliki konteks.** Jawaban AI perlu terhubung dengan materi, jenjang, tujuan pembelajaran, dan sumber yang dapat diperiksa.

# 3. Gagasan dan Solusi yang Diusulkan

AI Interactive Classroom adalah satu platform web dengan beberapa ruang kerja dan mode penggunaan. Semua perangkat terhubung ke room pembelajaran yang sama, tetapi masing-masing memperoleh antarmuka sesuai perannya.

### Komponen solusi

- **AI Smart Whiteboard:** area menggambar, bentuk, teks, anotasi, layer, snapping, dan penyimpanan scene.
- **AI Learning Visualization:** visualisasi 2D/3D, geometri parametrik, grafik fungsi, dan eksplorasi objek.
- **AI Teaching Assistant:** bantuan membuat outline pelajaran, penjelasan, soal, kuis, dan materi.
- **AI Student Learning Assistant:** tanya jawab berdasarkan materi kelas, penjelasan bertahap, dan latihan.
- **Classroom Room System:** room code, QR join, host control, role, permission, dan aktivitas kelas.
- **Mobile Controller:** HP guru sebagai remote drawing pad, pointer, annotation, dan 3D controller.
- **Student Participation:** Raise Hand, presenter approval, polling, quiz, dan submit jawaban.
- **Event-based Replay:** rekonstruksi perubahan whiteboard dan aktivitas dari event log.
- **Offline Support:** penyimpanan lokal dan cache materi/aset yang telah diunduh.

# 4. Visi, Misi, dan Tujuan

## 4.1 Visi

Membuat pengalaman pembelajaran interaktif lebih mudah dijangkau sekolah dengan fasilitas dan perangkat yang beragam.

## 4.2 Misi

- Mengubah konsep abstrak menjadi representasi visual yang dapat dieksplorasi.
- Membantu guru mempersiapkan dan menyampaikan materi dengan lebih interaktif.
- Memberikan ruang partisipasi siswa yang aman dan terkontrol.
- Memanfaatkan AI secara terukur, dengan validasi perhitungan dan sumber pembelajaran.
- Mengurangi ketergantungan pada hardware smartboard khusus.

## 4.3 Tujuan Pengembangan

1. Membuat prototipe whiteboard web yang nyaman pada mouse, touch, dan stylus.
2. Menyediakan library objek geometri dan grafik matematika yang akurat.
3. Membuat room system dengan guest join dan account join.
4. Menyediakan mode presenter dengan approval guru.
5. Memungkinkan pairing smartphone sebagai controller untuk layar presentasi.
6. Membuat replay sesi berbasis event.
7. Menguji pengalaman di kelas dengan fasilitas berbeda.
8. Mengembangkan layanan AI berdasarkan materi dan kurikulum yang dikurasi.

# 5. Target Pengguna

| Pengguna | Kebutuhan utama | Manfaat |
|---|---|---|
| Guru SMP/SMA/SMK | Mengajar, menggambar, mengelola kelas, membuat evaluasi | Media visual, kontrol kelas, persiapan materi lebih terbantu |
| Siswa dengan akun | Mengikuti kelas, menyimpan progres, bertanya | Akses materi, kuis, AI tutor, riwayat belajar |
| Siswa guest | Join cepat tanpa proses akun panjang | Partisipasi dengan kode/QR |
| Kelompok siswa | Menggunakan satu perangkat bersama | Kolaborasi dan submit hasil |
| Admin sekolah | Mengelola kelas, anggota, dan kebijakan | Kontrol organisasi dan penggunaan |
| Admin platform | Menjaga operasi dan keamanan | Monitoring, audit, dan pengelolaan layanan |

**Target tahap pertama:** guru matematika dan siswa SMP/SMA/SMK. Mata pelajaran pertama adalah Matematika, dimulai dari geometri ruang dan grafik, lalu meluas ke materi matematika lainnya berdasarkan hasil uji guru.

# 6. Skenario Penggunaan: Adaptive Classroom

Adaptive Classroom bukan sekadar responsive design. Sistem menyesuaikan workflow sesuai fasilitas dan perangkat yang tersedia. Guru mengonfirmasi fasilitas pada quick setup karena browser tidak dapat mengetahui secara andal apakah ruangan memiliki proyektor atau layar eksternal.

## 6.1 Projector Mode

**Kondisi:** guru memiliki laptop, kelas memiliki proyektor, dan siswa dapat bergabung melalui HP/laptop.

1. Guru membuat room.
2. Laptop menampilkan Presentation View yang bersih.
3. Guru mengendalikan materi dari Teacher Workspace.
4. Siswa melihat tampilan yang sama atau membuka Student View.
5. HP guru dapat dipasangkan sebagai controller.

## 6.2 Smart Display Mode

**Kondisi:** kelas memiliki Smart TV/interactive display touchscreen yang kompatibel.

Guru dapat menggambar, memilih, menggeser, memutar objek 3D, dan menjalankan aktivitas langsung melalui layar sentuh. Tombol dan toolbar dibuat touch-first. Kompatibilitas browser dan dukungan WebGL tetap harus diuji pada model perangkat yang ditargetkan.

## 6.3 Mobile Host Mode

**Kondisi:** guru hanya memiliki smartphone.

Guru dapat membuat Instant Room dari HP, membagikan kode/QR, menjalankan materi dan kuis sederhana, serta mengontrol aktivitas siswa. Visualisasi akan tampil pada perangkat siswa atau perangkat kelompok yang bergabung. Jika tidak ada layar bersama dan tidak ada perangkat siswa, platform tidak dapat menampilkan konten digital secara serempak kepada seluruh kelas; opsi cetak atau aktivitas non-digital tetap perlu disediakan.

## 6.4 Mobile Controller Mode

**Kondisi:** laptop guru terhubung ke proyektor dan HP digunakan sebagai remote.

1. Guru membuka room di laptop.
2. Guru memilih `Connect Device`.
3. QR pairing muncul.
4. Guru memindai QR dari smartphone.
5. HP membuka Mobile Controller khusus.
6. Guru dapat berjalan di sekitar kelas sambil mengontrol pointer, drawing, anotasi, slide, objek, zoom, dan rotasi 3D.

HP tidak melakukan screen mirroring. HP mengirim command terstruktur ke room; laptop tetap menjadi presentation host.

## 6.5 Student Room dan Group Learning

Siswa dapat join menggunakan kode atau akun. Jika perangkat siswa terbatas, guru dapat membagi kelas menjadi kelompok. Setiap kelompok menggunakan satu perangkat dan workspace sendiri. Siswa dapat mengikuti mode `Follow Teacher`, mengeksplorasi `Independent View`, atau bekerja di `Group Workspace`.

\newpage

![Alur room, presenter, dan mobile controller](assets/room-flow.png)

*Gambar 1. Alur pembuatan room, pairing controller, presenter approval, dan replay.*

# 7. Sistem Room, Peran, dan Permission

## 7.1 Akses Room

- **Guest Join:** siswa menggunakan kode/QR dan alias sesi. Tidak wajib membuat akun hanya untuk mengikuti satu room.
- **Account Join:** siswa login dan diverifikasi melalui keanggotaan kelas/invitation.
- **Room Code:** harus memiliki expiry, rate limit, opsi regenerate, dan lock room.
- **Guest Token:** token sesi terbatas pada room dan participant; tidak sama dengan room code.
- **Device Pairing Token:** token khusus Mobile Controller, terpisah dari guest/room token, scoped, dan dapat dicabut.

## 7.2 Peran

- **Teacher Host:** kendali utama room, peserta, materi, dan permission.
- **Presenter:** siswa yang memperoleh izin sementara setelah disetujui guru.
- **Student:** melihat materi, menjawab aktivitas, dan meminta giliran.
- **Guest Student:** akses sesi berbasis room tanpa akun penuh.
- **Group Leader:** mengelola submission kelompok.
- **School Admin:** mengelola sekolah dan anggota.
- **Platform Admin:** mengelola layanan platform.

## 7.3 Raise Hand dan Presenter Approval

1. Siswa menekan Raise Hand.
2. Guru menerima permintaan.
3. Guru memilih approve atau reject.
4. Jika approve, guru memilih izin: draw-only, object-edit, atau full-board.
5. Presenter mendapat akses sementara.
6. Aktivitas presenter tercatat pada event log.
7. Guru dapat revoke kapan saja; permission juga dapat berakhir otomatis.

Untuk MVP, hanya satu presenter yang aktif mengedit master whiteboard pada satu waktu. Siswa lain tetap dapat bekerja bersamaan pada group workspace masing-masing.

# 8. Fitur Produk

## 8.1 AI Smart Whiteboard

- Select, Pen, Eraser, Shapes, Line, Arrow, Text, Ruler.
- Free Draw, Shape Builder, snap/alignment, layer, grouping.
- Undo/Redo, Zoom/Pan, grid, transform.
- Simpan/load scene.
- Export gambar/PDF.
- Input melalui mouse, touch, stylus.

Untuk mouse, sistem mengutamakan click-to-create, drag-to-resize, numeric input, snapping, dan keyboard shortcut. Untuk touch/stylus, sistem menyediakan freehand drawing dan gesture yang sesuai. Pointer Events menyediakan mekanisme untuk membedakan mouse, pen, dan touch; implementasi tetap perlu diuji lintas browser [S22].

## 8.2 Mathematical Learning Visualization

**Fokus awal:**

- Bangun datar dan bangun ruang.
- Kubus, balok, prisma, limas, tabung, kerucut, bola.
- Volume dan luas permukaan.
- Koordinat dan grafik fungsi.
- Persamaan dan pertidaksamaan dasar.

**Pengembangan berikutnya:** aritmetika, aljabar, fungsi, trigonometri, statistika, peluang, dan kalkulus dasar sesuai kebutuhan jenjang.

Sistem memungkinkan siswa memutar objek 3D, mengubah parameter, melihat label bagian, mengeksplorasi irisan/cross-section, dan menghubungkan objek ke rumus. Perhitungan dilakukan oleh geometry/math engine yang teruji.

## 8.3 AI Sketch Recognition dan Sketch-to-3D

Alur hybrid:

1. Stroke ditangkap sebagai titik koordinat dan metadata input.
2. Stroke dinormalisasi dan disegmentasi.
3. Rule-based geometry dan model ringan mengenali bentuk.
4. Sistem menghitung confidence.
5. Jika ambigu, guru diminta memilih jenis objek.
6. Geometry engine membuat objek parametrik.
7. Three.js merender model.
8. AI menghubungkan objek dengan konsep/penjelasan.

Untuk geometri sekolah, model parametrik lebih akurat daripada generative image-to-3D. Model generatif seperti TripoSR hanya kandidat eksperimen untuk objek visual tambahan, bukan fondasi bangun ruang yang membutuhkan akurasi matematika [S15].

## 8.4 AI Teaching Assistant

- Draft lesson outline.
- Penjelasan konsep sesuai tingkat kelas.
- Generator soal, kuis, dan worksheet.
- Saran visualisasi.
- Rangkuman materi.
- Pemetaan ke tujuan pembelajaran.
- Guru dapat mengedit dan menyetujui konten sebelum dibagikan.

## 8.5 AI Student Learning Assistant

- Tanya jawab berdasarkan materi guru.
- Penjelasan langkah demi langkah.
- Mode hint-first.
- Latihan soal dan feedback.
- Tautan ke visualisasi.
- Learning history.

Jawaban yang menggunakan dokumen perlu menyertakan sumber atau bagian dokumen yang menjadi rujukan. AI tidak menjadi satu-satunya penentu nilai akhir.

## 8.6 Classroom Collaboration

- Instant/Scheduled Room.
- Guest/account join.
- QR join.
- Teacher Dashboard dan Presentation View.
- Follow Teacher / Independent View.
- Raise Hand / Presenter Approval.
- Mobile Controller.
- Quick Poll dan Quiz.
- Group Workspace dan Group Submission.

Pola terpisah antara Projector View, Student View, dan Teacher Dashboard telah digunakan pada produk seperti Pear Deck. Join code untuk live participation juga menjadi pola yang digunakan Nearpod. Hal tersebut digunakan sebagai referensi pola interaksi, bukan untuk menyalin merek atau implementasi produk lain [S23][S24].

## 8.7 Classroom Activity Tools

- Smart Attendance opsional.
- Classroom Timer.
- Random Student Picker.
- Group Generator.
- Exit Ticket.
- Flashcard Generator.
- Assignment and Homework.
- Student Answer Gallery.
- Anonymous response display pada proyektor.

## 8.8 Event-based Replay

Sistem menyimpan perubahan terstruktur seperti objek dibuat/diubah/dihapus, stroke selesai, parameter visualisasi berubah, slide aktif, polling, kuis, dan perubahan permission. Sistem tidak menyimpan pergerakan cursor secara terus-menerus sebagai event replay, dan tidak merekam video/audio secara default.

Replay dapat memiliki timeline, play/pause, kecepatan, langkah sebelumnya/berikutnya, snapshot, dan highlight event.

# 9. Manfaat yang Diharapkan

| Pihak | Manfaat yang dituju |
|---|---|
| Guru | Lebih mudah membuat visualisasi, mengelola partisipasi, menggunakan HP sebagai controller, dan meninjau sesi |
| Siswa | Mendapat cara belajar lebih visual, interaktif, dan dapat mengulang materi |
| Sekolah | Memanfaatkan perangkat yang sudah ada tanpa membeli smartboard khusus untuk memulai |
| Kelompok belajar | Dapat bekerja bersama walau perangkat terbatas |
| Pengelola pendidikan | Berpotensi memperoleh insight aktivitas pembelajaran dengan tata kelola dan privasi yang sesuai |

Manfaat ini merupakan hipotesis yang harus diuji melalui pilot. Peningkatan hasil belajar tidak boleh diklaim hanya dari penggunaan fitur atau tingkat interaksi.

# 10. Diferensiasi dan Posisi Produk

Produk tidak berusaha meniru seluruh hardware iFLYTEK. Fokusnya adalah software yang bekerja lintas perangkat dan menyesuaikan kondisi sekolah Indonesia.

Diferensiasi yang dituju:

1. Device-agnostic dan tidak bergantung pada smartboard khusus.
2. Adaptive Classroom berdasarkan fasilitas kelas.
3. Mobile Controller untuk guru yang bergerak saat mengajar.
4. Presenter approval yang aman dan terkontrol.
5. Event-based Replay untuk whiteboard dan aktivitas kelas.
6. Visualisasi matematika parametrik yang presisi.
7. Knowledge base yang dapat disesuaikan dengan kurikulum dan materi sekolah.
8. Offline support terbatas dan low-bandwidth design.

Nearpod dan Pear Deck menjadi referensi alur join dan tampilan presentasi/dasbor. Excalidraw menjadi referensi whiteboard; repository-nya berlisensi MIT [S11]. Produk akhir harus memiliki desain, kode, dan identitas sendiri.

# 11. Arsitektur Teknologi

## 11.1 Stack yang Dipilih

| Lapisan | Teknologi | Tanggung jawab |
|---|---|---|
| Frontend | React + TypeScript | Teacher, student, projector, mobile controller |
| Whiteboard | React Konva + Konva | Drawing dan object manipulation |
| 3D | Three.js | Geometri dan model 3D |
| Math input | MathLive | Input rumus dan virtual math keyboard |
| Math computation | mathjs / engine tervalidasi | Evaluasi ekspresi yang diizinkan |
| Backend | Laravel | Auth, sekolah, kelas, room, permission, API |
| AI service | Python + FastAPI | AI orchestration, RAG, sketch/geometry service |
| Database | PostgreSQL | Data utama |
| Vector search | pgvector | Retrieval dokumen |
| Realtime | Laravel Reverb | WebSocket events dan presence |
| Cache/queue | Redis + worker | Cache, queue, rate control |
| Offline | Workbox + IndexedDB | Cache aset dan data lokal |
| Object storage | S3-compatible | PDF, image, GLB/GLTF |

## 11.2 Arsitektur Konseptual

![Arsitektur teknis AI Interactive Classroom](assets/architecture.png)

Laravel menangani proses bisnis utama dan otorisasi. FastAPI menjadi layanan terpisah untuk AI/komputasi yang membutuhkan ekosistem Python. Realtime MVP menggunakan Laravel Reverb. Yjs dan Hocuspocus ditunda sampai kebutuhan multi-editor pada canvas terbukti; mengaktifkan dua sistem sinkronisasi sejak hari pertama akan menambah kompleksitas.

## 11.3 Data Model Ringkas

![ERD ringkas entitas utama](assets/erd.png)

Entitas utama mencakup users, schools, memberships, classrooms, rooms, participants, devices, presenter requests, permissions, whiteboards, room events, snapshots, learning materials, lesson sessions, activities, answers, AI documents/chunks, AI jobs, dan audit logs. Detail hubungan, kolom, constraint, dan Mermaid ERD lengkap tersedia pada dokumen **AI-Interactive-Classroom-Tech-Spec.md**.

# 12. Riset Repository GitHub dan Fondasi Pengembangan

Repository berikut diperiksa sebagai repository publik pada 21 November 2026. Ringkasan lisensi mengikuti halaman LICENSE/README/dokumentasi resmi yang ditautkan. Pemeriksaan ini bukan pengganti audit lisensi dependency, model weights, dataset, font, ikon, atau aset yang ikut digunakan.

## 12.1 Rekomendasi Utama untuk MVP

| Repository | Peran | Lisensi / catatan | Rekomendasi |
|---|---|---|---|
| [React Konva](https://github.com/konvajs/react-konva) | Komponen React untuk canvas 2D dan whiteboard | MIT [S1] | Gunakan sebagai drawing engine awal |
| [Konva](https://github.com/konvajs/konva) | Scene graph 2D, shapes, transforms, events | MIT [S2] | Dependency utama React Konva |
| [Three.js](https://github.com/mrdoob/three.js) | Rendering dan interaksi 3D browser | MIT [S3] | Gunakan untuk geometri dan visualisasi |
| [MathLive](https://github.com/arnog/mathlive) | Input rumus matematika dan virtual keyboard | MIT [S4] | Evaluasi untuk math input |
| [mathjs](https://github.com/josdejong/mathjs) | Evaluasi ekspresi dan utilitas matematika | Apache-2.0; periksa notice komponen pihak ketiga [S5] | Kandidat compute engine |
| [Laravel Reverb](https://github.com/laravel/reverb) | WebSocket realtime untuk Laravel | MIT [S6] | Pilihan realtime MVP |
| [pgvector](https://github.com/pgvector/pgvector) | Vector similarity search di PostgreSQL | PostgreSQL License [S7] | Fondasi RAG tanpa database vector terpisah |
| [Workbox](https://github.com/GoogleChrome/workbox) | Service worker dan caching PWA | MIT [S8] | Pilihan offline caching |

## 12.2 Repository Kolaborasi dan Referensi

| Repository | Peran | Lisensi / catatan | Keputusan |
|---|---|---|---|
| [Yjs](https://github.com/yjs/yjs) | CRDT, shared state, offline merge | MIT [S9] | Tambahkan saat multi-editor dibutuhkan |
| [Hocuspocus](https://github.com/ueberdosis/hocuspocus) | Backend WebSocket untuk Yjs | MIT [S10] | Pasangan Yjs untuk fase lanjut |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | Referensi whiteboard dan diagram | MIT [S11] | Pelajari UX; integrasi opsional |
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | OCR teks cetak | Apache-2.0; bukan pilihan utama untuk tulisan tangan [S12] | Optional untuk dokumen, bukan math handwriting |

## 12.3 Repository Scientific Visualization dan Generative 3D

| Repository | Peran | Lisensi / catatan | Keputusan |
|---|---|---|---|
| [Mol*](https://github.com/molstar/molstar) | Visualisasi protein/makromolekul | MIT [S13] | Fase biologi/kimia |
| [3Dmol.js](https://github.com/3dmol/3Dmol.js) | Visualisasi molekul di browser | BSD-3-Clause [S14] | Alternatif/komponen molekul |
| [TripoSR](https://github.com/VAST-AI-Research/TripoSR) | Single-image-to-3D | MIT menurut repository; perlu uji GPU dan output [S15] | Eksperimen terpisah, bukan core geometry |

## 12.4 Hal yang Tidak Boleh Diasumsikan Bebas Digunakan

- **tldraw SDK:** source-available, tetapi penggunaan production memerlukan lisensi yang sesuai. Jangan memasukkannya ke produk produksi tanpa meninjau license tier dan syarat terbaru [S16].
- **PhET:** simulasi reguler berlisensi CC BY-NC 4.0; penggunaan komersial atau berlangganan memerlukan lisensi komersial [S17].
- **OpenStax:** materi buku berlisensi CC BY-NC-SA 4.0; tidak boleh diasumsikan dapat dibundel ke produk komersial tanpa izin [S18].
- **RCSB PDB:** file PDB dan API umumnya CC0, tetapi sumber eksternal yang terintegrasi dapat memiliki lisensi berbeda [S19].
- **Tesseract:** FAQ resminya menyebut pengenalan handwriting tidak bekerja baik karena dirancang untuk teks cetak; jangan gunakan sebagai fondasi pengenalan tulisan tangan matematika [S20].

### Keputusan teknis akhir dari riset repository

Mulai dengan React Konva + Three.js + MathLive + Laravel Reverb + PostgreSQL/pgvector + Workbox. Buat geometry engine sendiri untuk bangun ruang standar. Tunda Yjs/Hocuspocus dan generative 3D sampai ada kebutuhan dan bukti manfaat.

# 13. Knowledge Base dan Kurikulum

Platform harus menyimpan metadata kurikulum secara berversi agar materi tidak terkunci pada satu dokumen atau satu versi kurikulum. Struktur yang disarankan:

`Jenjang -> Fase -> Mata Pelajaran -> Capaian/Tujuan Pembelajaran -> Topik -> Subtopik -> Materi -> Aktivitas -> Evaluasi`.

Dokumen Capaian Pembelajaran resmi, seperti dokumen CP SMK/MAK yang diterbitkan melalui portal kurikulum, dapat menjadi titik awal pemetaan. Versi yang berlaku harus diverifikasi kembali saat implementasi dan peluncuran [S25].

### Retrieval-Augmented Generation (RAG)

1. Guru mengunggah materi yang memiliki hak penggunaan.
2. Sistem mengekstrak teks dan metadata halaman/judul.
3. Konten dipecah menjadi chunk.
4. Embedding disimpan pada pgvector.
5. Pertanyaan siswa dicari pada dokumen yang boleh diakses dalam school/class/room tersebut.
6. LLM menyusun jawaban dengan kutipan bagian sumber.
7. Guru dapat mengoreksi atau menandai jawaban.

Sumber konten harus memiliki catatan asal, lisensi, atribusi, versi, tanggal akses, dan cakupan penggunaan.

# 14. Keamanan, Privasi, dan Penggunaan AI yang Bertanggung Jawab

Karena platform ditujukan untuk sekolah dan dapat digunakan oleh siswa di bawah umur, privasi harus dirancang sejak awal. UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi menyebut pemrosesan data pribadi anak diselenggarakan secara khusus dan memerlukan persetujuan orang tua/wali sesuai ketentuan; pemrosesan juga harus terbatas, spesifik, sah, transparan, dan sesuai tujuan [S21]. Implementasi perlu ditinjau oleh pihak yang kompeten dalam hukum dan tata kelola data.

Prinsip produk:

- Guest alias untuk mengurangi kebutuhan identitas.
- Tidak meminta nomor telepon/email hanya untuk join satu sesi.
- Tidak mengumpulkan lokasi presisi.
- Tidak merekam video/audio sebagai default.
- Retention period untuk guest activity, jawaban, dan replay harus ditetapkan.
- Server memvalidasi izin edit, presenter, device pairing, dan akses data.
- AI-generated lesson/quiz harus dapat ditinjau guru.
- AI tidak dipakai untuk memberi label permanen atau diagnosis kemampuan siswa.
- Jawaban AI yang berasal dari RAG menampilkan sumber.
- Data sekolah dan kelas dipisahkan dengan kontrol akses tenant.

# 15. Strategi Offline dan Low Bandwidth

- PWA dan service worker menyimpan shell aplikasi.
- IndexedDB menyimpan draft whiteboard dan antrean event lokal.
- Aset geometri ringan tersedia secara default.
- Model 3D berukuran besar dimuat saat dibutuhkan.
- Sediakan low-detail mode untuk smartphone dengan kemampuan grafis terbatas.
- Sediakan status saved locally / syncing / synced / needs attention.
- Setelah koneksi kembali, event disinkronkan dengan idempotency key.
- AI cloud, RAG cloud, dan realtime antarperangkat tetap membutuhkan koneksi kecuali ada model lokal yang sengaja dipasang.

# 16. Roadmap Pengembangan

| Tahap | Fokus | Hasil yang diharapkan |
|---|---|---|
| 0. Discovery | Wawancara guru, observasi fasilitas kelas, inventaris perangkat | Validasi kebutuhan dan urutan fitur |
| 1. Foundation | React shell, Laravel auth, sekolah/kelas, design system | Guru dapat login dan membuat kelas |
| 2. Whiteboard MVP | React Konva, tools, shape builder, save/load | Whiteboard dapat digunakan dengan mouse/touch |
| 3. Math Visualization | Geometri parametrik, Three.js, input rumus, grafik | Demo bangun ruang dan grafik |
| 4. Classroom Room | Room code, guest/account join, projector/student view | Kelas live berfungsi |
| 5. Presenter + Controller | Raise Hand, approval, pairing QR, mobile remote | Guru mengontrol layar dari HP dan siswa dapat menjadi presenter sementara |
| 6. Replay + Offline | Event log, snapshots, replay, PWA caching | Sesi dapat diputar ulang dan draft lokal pulih |
| 7. AI/RAG | Materi guru, retrieval, lesson assistant, quiz generator | Jawaban berbasis sumber diuji |
| 8. Pilot | Uji di kelas nyata, performa, usability, privasi | Laporan pilot dan backlog prioritas |

Durasi setiap tahap ditentukan setelah mengetahui jumlah pengembang, perangkat uji, pilihan provider AI, dan kebutuhan integrasi. Jadwal ini adalah urutan kerja, bukan janji waktu selesai.

# 17. Indikator Keberhasilan (KPI)

| KPI | Pengukuran |
|---|---|
| Teacher Activation | Guru yang berhasil membuat dan memulai room |
| Join Success Rate | Keberhasilan siswa masuk dari semua percobaan join |
| Room Completion | Sesi yang selesai dengan baik |
| Presenter Workflow Success | Permintaan presenter yang disetujui/dicabut tanpa error izin |
| Visualization Usage | Sesi yang menggunakan geometri/grafik interaktif |
| Student Participation | Jumlah peserta yang mengirim respons |
| Replay Usage | Replay yang dibuka kembali setelah kelas |
| AI Answer Review | Persentase output AI yang disetujui, diedit, atau ditolak guru |
| Sync Recovery | Perubahan offline yang berhasil tersinkronisasi |
| Learning Check | Perubahan hasil pre/post question sesuai tujuan pembelajaran |

Penggunaan platform atau jumlah interaksi bukan bukti tunggal peningkatan hasil belajar. Pilot harus melibatkan evaluasi materi dan observasi guru.

# 18. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Mouse tidak nyaman untuk menggambar | Guru enggan menggunakan whiteboard | Shape Builder, snap, numeric input, keyboard shortcuts |
| Browser Smart TV tidak kompatibel | Mode touchscreen gagal | Daftar perangkat uji dan fallback projector/mobile |
| Internet putus | Sesi terganggu | Local save, queue, reconnect, low-bandwidth mode |
| Room code disalahgunakan | Peserta tidak dikenal masuk | Expiry, rate limit, lock room, host approval |
| Siswa mengubah board tanpa izin | Materi terganggu | Server-side RBAC dan presenter approval |
| AI menghasilkan rumus salah | Kesalahan materi | Geometry/math engine, sumber, review guru |
| Generative 3D mahal/berat | Biaya dan latency | Opsional, async job, quota, server GPU terpisah |
| Data anak diproses berlebihan | Risiko hukum dan privasi | Data minimization, consent, legal review |
| Lisensi aset tidak sesuai | Risiko distribusi produk | License inventory dan review tiap aset |
| Sistem realtime terlalu kompleks | Beban pengembangan | Reverb terlebih dahulu; CRDT ditunda |

# 19. Kebutuhan Sumber Daya dan Operasional

### Kebutuhan tim minimum (peran, bukan jumlah wajib)

- Product owner/analyst: prioritas, validasi, dan requirement.
- UI/UX designer: teacher/student/projector/mobile flows.
- Frontend developer: React, whiteboard, 3D, PWA.
- Backend developer: Laravel, auth, room, permission, data.
- AI/ML developer: FastAPI, RAG, sketch/geometry integration.
- QA/tester: perangkat, browser, network, role and replay tests.
- Guru/subject reviewer: akurasi materi dan kelayakan pedagogis.

### Biaya yang perlu diukur sebelum penetapan harga

- Hosting API dan database.
- Redis/WebSocket.
- Object storage dan bandwidth.
- Provider LLM/embedding.
- GPU untuk model generatif 3D jika diaktifkan.
- Monitoring, logging, backup, dan keamanan.
- Dukungan sekolah dan pemeliharaan.

Tidak ada nominal anggaran atau harga langganan yang ditetapkan dalam proposal ini karena belum ada estimasi pemakaian, target kapasitas, provider, maupun hasil validasi sekolah.

# 20. Model Keberlanjutan Produk (Hipotesis)

Model awal yang dapat diuji:

- **Teacher Starter:** fitur whiteboard/geometry dasar dengan batas penggunaan wajar.
- **Teacher Pro:** fitur AI dan dokumentasi tambahan.
- **School Plan:** manajemen guru/siswa, kelas, analytics, dan kebijakan sekolah.
- **Institution/Partner:** onboarding, pelatihan, dan integrasi khusus.

Model ini belum divalidasi. Perlu uji willingness-to-pay, skema akses sekolah negeri/swasta, kebutuhan procurement, dan biaya AI per kelas sebelum menetapkan harga.

# 21. Rencana Pilot dan Evaluasi

### Pilot yang disarankan

- Mulai dari 1-2 guru matematika dan satu topik geometri.
- Uji minimal dua konfigurasi perangkat: laptop/proyektor dan smartphone-only/student devices.
- Jika tersedia, uji satu Smart TV touchscreen.
- Uji guest join dan account join.
- Uji Raise Hand, presenter approval, mobile controller, replay, serta jaringan terputus.
- Kumpulkan feedback guru dan siswa secara terstruktur.

### Pertanyaan evaluasi

1. Apakah guru dapat memulai room tanpa bantuan teknis?
2. Apakah shape builder lebih mudah daripada menggambar manual menggunakan mouse?
3. Apakah mode mobile controller membantu guru bergerak?
4. Apakah siswa paham cara join dan mengajukan presenter?
5. Apakah mode independent view membantu eksplorasi tanpa mengganggu presentasi?
6. Apakah replay berguna untuk mengulang urutan penjelasan?
7. Apakah kualitas AI cukup akurat dan dapat dipercaya setelah review guru?
8. Bagaimana pengalaman pada jaringan yang lemah?

# 22. Kesimpulan

AI Interactive Classroom diusulkan sebagai platform pembelajaran interaktif berbasis web yang dapat beradaptasi dengan fasilitas sekolah. Produk tidak bergantung pada hardware smartboard, mendukung laptop/tablet/smartphone, dan menggabungkan visualisasi matematika, room pembelajaran, mobile controller, partisipasi siswa, AI assistant, serta event-based replay.

Keputusan teknologi awal telah diarahkan pada Laravel + FastAPI, React + TypeScript, React Konva, Three.js, MathLive, PostgreSQL/pgvector, Laravel Reverb, dan Workbox. Daftar repository di proposal ini dapat menjadi baseline awal riset dan implementasi, dengan catatan lisensi serta kecocokan versi wajib diperiksa lagi saat dependency dikunci.

Fokus pengembangan pertama sebaiknya bukan membuat AI generatif yang sangat kompleks. Prioritaskan pengalaman kelas yang dapat digunakan guru dengan perangkat sederhana: room, whiteboard, geometry engine, 3D viewer, student join, permission, mobile controller, dan replay. Setelah pengalaman dasar terbukti bermanfaat dalam pilot sekolah, barulah sistem memperluas AI teaching, RAG, sketch recognition, dan visualisasi sains lainnya.

**Arah utama produk: teknologi pembelajaran interaktif yang tidak bergantung pada mahalnya fasilitas sekolah.**

---

# Referensi

**Repositori dan dokumentasi teknis**

- [S1] React Konva, repository dan lisensi MIT: https://github.com/konvajs/react-konva
- [S2] Konva, repository dan lisensi MIT: https://github.com/konvajs/konva
- [S3] Three.js, repository dan lisensi MIT: https://github.com/mrdoob/three.js
- [S4] MathLive, repository dan lisensi MIT: https://github.com/arnog/mathlive
- [S5] mathjs, repository dan lisensi Apache-2.0; tinjau komponen pihak ketiga: https://github.com/josdejong/mathjs
- [S6] Laravel Reverb, repository dan dokumentasi realtime: https://github.com/laravel/reverb dan https://laravel.com/docs/reverb
- [S7] pgvector, repository dan PostgreSQL License: https://github.com/pgvector/pgvector
- [S8] Workbox, repository dan MIT: https://github.com/GoogleChrome/workbox
- [S9] Yjs, repository CRDT dan MIT: https://github.com/yjs/yjs
- [S10] Hocuspocus, repository backend Yjs dan MIT: https://github.com/ueberdosis/hocuspocus
- [S11] Excalidraw, repository whiteboard dan MIT: https://github.com/excalidraw/excalidraw
- [S12] Tesseract OCR: https://github.com/tesseract-ocr/tesseract
- [S13] Mol*, repository dan MIT: https://github.com/molstar/molstar
- [S14] 3Dmol.js, repository dan BSD-3-Clause: https://github.com/3dmol/3Dmol.js
- [S15] TripoSR, repository dan MIT: https://github.com/VAST-AI-Research/TripoSR
- [S16] tldraw SDK licensing: https://tldraw.dev/community/license
- [S17] PhET licensing: https://phet.colorado.edu/en/licensing
- [S18] OpenStax licensing: https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks
- [S19] RCSB PDB usage policy: https://www.rcsb.org/pages/usage-policy
- [S20] Tesseract FAQ tentang handwriting: https://github.com/tesseract-ocr/tesseract/wiki/FAQ
- [S22] MDN PointerEvent.pointerType: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType
- [S26] MDN Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

**Referensi produk dan pola pembelajaran**

- [S23] Pear Deck, Teacher Dashboard: https://help.peardeck.com/migration/en/the-teacher-dashboard
- [S24] Nearpod, FAQ dan Live Participation: https://nearpod.com/frequently-asked-questions

**Kebijakan dan sumber pendidikan**

- [S21] Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi: https://peraturan.bpk.go.id/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf
- [S25] Dokumen Capaian Pembelajaran SMK/MAK melalui portal kurikulum; periksa versi yang berlaku saat deployment: https://kurikulum.kemendikdasmen.go.id/file/1718851677_manage_file.pdf

**Tanggal pemeriksaan referensi online:** 21 November 2026. Repository diperiksa sebagai repository publik; status dan lisensi dapat berubah. Lakukan pemeriksaan ulang sebelum rilis.
