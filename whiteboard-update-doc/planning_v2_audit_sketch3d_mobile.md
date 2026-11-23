# Audit Mendalam Commit `c833b50` & Master Plan V2: Multi-Stroke 3D Sketch, Mobile Remote & Touch UX, dan Penyempurnaan Visual 3D

Dokumen ini merupakan hasil audit teknis mendalam terhadap pembaruan terbaru pada repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/) — khususnya commit [`c833b50`](https://github.com/xDzaky/ai-interactive-classroom/commit/c833b50e887c2670d1149d82191231bd10fede66) (`feat(upgrade): OBB transform/rotation, glassmorphic 3D & universal 2D->3D engine, MathLive auto-format block, searchable geometry catalog & AI teaching drawer`) dan [`fc2028a`](https://github.com/xDzaky/ai-interactive-classroom/commit/fc2028a7d3f3e62f839b63600abf87e2fe565b4c) — disertai analisis tangkapan layar terbaru serta rancangan logika teknis lengkap untuk:
1. **Engine Multi-Stroke Sketch-to-3D & Poligon Cekung → 3D** (agar sketsa kubus 3D di sebelah kanan maupun bentuk mahkota/poligon cekung di sebelah kiri pada tangkapan layar langsung menjadi model 3D presisi).
2. **Sistem Remote HP & Akses Whiteboard Mobile Multi-Metode** yang berfungsi penuh baik dengan login maupun di *Mode Tanpa Login*.
3. **State Machine Gestur Sentuh Mobile Responsif** (*1x tap* blok seleksi, *2x tap* buka menu bundar/klik kanan, *tahan & geser* pindah objek halus, *pinch* zoom in/out).
4. **Upgrade Desain Visual 3D & Penyederhanaan UI** berbasis referensi open-source terbaik.

---

## 1. Audit Mendalam Hasil Implementasi Commit `c833b50`

### 1.1 Yang Sudah Sangat Baik (Fondasi Kuat)
- **Transformasi OBB & Rotasi**: [`packages/whiteboard-core/src/transform.ts`](https://github.com/xDzaky/ai-interactive-classroom/commit/c833b50e887c2670d1149d82191231bd10fede66) beserta `resizeHandles.ts` dan `selectionHitTest.ts` sudah memakai rotasi berbasis `offsetX`/`offsetY` dengan unit test (`transform.test.ts`, `resizeHandles.test.ts`).
- **Arsitektur Material 3D (`threeMaterials.ts`)**: Sudah menerapkan *3-point studio lighting* (`HemisphereLight` + key + rim light), material kaca transparan (`MeshPhysicalMaterial` dengan `clearcoat` dan `polygonOffset`), serta *dual-pass textbook edges* (`hiddenEdges` putus-putus dengan `THREE.GreaterDepth` dan `frontEdges` solid dengan `THREE.LessEqualDepth`).
- **Katalog Geometri & 2D→3D (`geometry-core`, `GeometryCatalogPopover.tsx`)**: Katalog sudah bebas sekat jenjang, dapat dicari, dan `shapeToSolid.ts` kini mendukung banyak bangun 2D (`rect`, `circle`, `ellipse`, `triangle`, `rhombus`, `trapezoid`, `parallelogram`, `kite`, `pentagon`, `hexagon`, `polygon`, `star`, `customPoints`).
- **MathLive Block & AI Drawer (`MathTextBlockWidget.tsx`, `AITeachingDrawer.tsx`)**: Input rumus auto-format (`8^2` → $8^2$) dan panel *Problem-Chain* 4 tahap sudah terintegrasi rapi.
- **Kerangka Remote HP (`ControllerPage.tsx`, `ConnectDeviceModal.tsx`)**: Sudah ada pairing QR Code (`qrcode.react`) dan rute `/controller?room=X&token=Y`.

### 1.2 Temuan Kritis: Kekurangan & Bug yang Masih Perlu Diperbaiki

| Area Audit | Kondisi Saat Ini di Commit `c833b50` | Dampak ke Pengguna | Solusi Target |
| :--- | :--- | :--- | :--- |
| **1. Pengenalan Sketsa 3D (Kanan di Screenshot)** | [`packages/sketch-core/src/recognizer.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/packages/sketch-core/src/recognizer.ts) hanya menerima 1 stroke (`recognizeShape(points: Pt[])`) dan hanya mengenali 2D. | Guru menggambar kubus 3D bebas dengan beberapa goresan (seperti sisi kanan screenshot), tetapi tetap dianggap coretan biasa dan tidak berubah menjadi model kubus 3D. | Bangun **Multi-Stroke 3D Sketch Recognizer** (`multistroke3d.ts`) berbasis graf pertemuan garis (*junction graph*) + pengenalan *point-cloud* `$P`/`$Q`. |
| **2. Poligon Cekung ke 3D (Kiri di Screenshot)** | `operators3d.ts` membentuk *N-gon face* untuk alas/tutup `custom_prism`/`custom_pyramid`. Jika rendering mesh memakai *fan triangulation*, poligon cekung (seperti bentuk mahkota di kiri screenshot) akan menghasilkan segitiga menyilang menutupi lekukan. | Sisi alas/tutup bangun 3D dari bentuk cekung menjadi cacat visual (*bleeding cap*) atau *non-manifold*. | Wajibkan **Ear-Clipping Triangulation (`THREE.ShapeUtils.triangulateShape` / `earcut`)** untuk seluruh tutup poligon 2D→3D dan jamin orientasi normal luar seragam. |
| **3. Ketebalan Garis & Kelengkapan 3D** | `threeMaterials.ts` masih memakai `LineBasicMaterial` / `LineDashedMaterial` yang di WebGL (Windows/macOS) terkunci pada ketebalan `1px`; Platonic Solid belum memiliki **Dodecahedron**; belum ada permukaan implisit (`MarchingCubes`) dan parametrik $\mathbf{S}(u,v)$. | Garis rusuk terlihat tipis/bergerigi di layar proyektor & HiDPI; 1 dari 5 Platonic Solid hilang. | Upgrade ke **`Line2` + `LineMaterial`** (tebal konsisten 2px anti-aliased), tambah Dodecahedron, `ParametricGeometry`, `MarchingCubes`, *contact shadow*, dan *angle arc markers*. |
| **4. Remote HP Belum Jalan di Mode Tanpa Login & Fitur Terbatas** | [`ControllerPage.tsx`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/pages/room/ControllerPage.tsx) hanya mengirim HTTP `POST /api/v1/rooms/{room}/events` (butuh login + backend room aktif) dan hanya punya aksi `prev/next/zoom/pointer/blank`. | Di `/whiteboard` (*Mode Tanpa Login*), remote HP tidak bisa dipakai; guru juga belum bisa memutar objek 3D, memilih alat, atau menggambar dari HP. | Bangun **Dual-Transport Pairing** (WebSocket Room + fallback **P2P WebRTC via PeerJS** tanpa login), 3 metode masuk (QR, Kode 6 digit, Link langsung), plus mode **Remote Trackpad/3D Orbit** & **Full Mobile Whiteboard**. |
| **5. Responsivitas Mobile & Gestur Sentuh Konva** | Header atas memiliki 9 tombol sejajar (dan tombol `Grafik` duplikat di bar atas & bawah); belum ada state machine terpadu untuk *1x tap* vs *2x tap* vs *long-press drag* vs *2-finger pinch zoom* di Konva. | Di layar HP tombol meluap; di perangkat sentuh, Konva rentan memicu *double-fire* (`touchstart` + `mousedown`) dan konflik antara geser kanvas vs geser objek. | Terapkan **Touch Gesture State Machine** tunggal + layout responsif mobile (dock bawah + *bottom sheet*) + hapus duplikasi tombol `Grafik`. |

---

## 2. Logic Lengkap: Multi-Stroke Sketch-to-3D & Bangun Ruang dari Berbagai Bentuk

Bagian ini menjawab langsung kebutuhan pada tangkapan layar: **mengubah sketsa tangan 3D (seperti kubus di kanan) maupun bentuk poligon bebas/cekung (seperti mahkota di kiri) menjadi model 3D interaktif yang rapi dan akurat**.

### 2.1 Arsitektur Pipeline Multi-Stroke 3D (`packages/sketch-core/src/multistroke3d.ts`)

Berbeda dari *single-stroke* 2D, sketsa 3D selalu terdiri dari **2 hingga 12 goresan** yang saling terhubung (misalnya guru menggambar persegi depan dulu, lalu menarik 3 garis miring ke belakang, lalu menutup sisi atas & samping). Alurnya terdiri dari 4 tahap deterministik:

#### Tahap 1 — Pengelompokan Goresan (*Spatial-Temporal Stroke Cluster*)
Setiap kali pengguna mengangkat pena (`pointerup`), sistem memasukkan stroke ke buffer sementara dan mengelompokkannya dengan stroke lain yang:
- **Dekat secara waktu**: selisih waktu antar-stroke $\Delta t \le 2.5\text{ detik}$ (atau pengguna menyeleksi beberapa stroke secara manual lalu klik **"Ubah ke 3D"**).
- **Dekat secara spasial**: *bounding box* yang diperluas sebesar margin $m = 0.15 \times \max(W, H)$ saling beririsan, atau ujung stroke berada dalam radius *snap* $r_{\text{snap}} = 0.08 \times \text{diagonal}$.

#### Tahap 2 — Penyederhanaan & Konstruksi Graf Geometri (*Polyline & Junction Graph*)
1. Setiap stroke disederhanakan dengan **Ramer-Douglas-Peucker (RDP)** dan dideteksi apakah berbentuk **segmen garis lurus**, **poligon tertutup** (kotak/segitiga), atau **kurva tertutup/busur** (lingkaran/elips).
2. Titik ujung dan sudut yang berjarak $\le r_{\text{snap}}$ digabung (*vertex clustering*) menjadi simpul kanonik $V = \{v_1, \dots, v_k\}$ dan himpunan rusuk $E = \{e_1, \dots, e_m\}$.
3. Setiap simpul diklasifikasikan berdasarkan derajat & sudut pertemuan rusuknya (terinspirasi metode pelabelan garis polihedral **Huffman–Clowes** — [Understanding Line Drawings](https://homepages.inf.ed.ac.uk/rbf/CVonline/LOCAL_COPIES/OWENS/LECT8/node2.html)):
   - **L-junction** (2 rusuk bertemu membentuk sudut).
   - **Y-junction** (3 rusuk bertemu, sudut terbesar $< 180^\circ$ — ciri khas sudut depan-atas kubus/balok!).
   - **Arrow-junction** (3 rusuk bertemu, satu sudut $> 180^\circ$ — ciri khas sudut luar siluet kubus/prisma!).
   - **T-junction** (1 rusuk berhenti di tengah rusuk lain — indikasi oklusi depan/belakang).

#### Tahap 3 — Klasifikasi Bangun Ruang 3D (Rule-Based Topology + `$P`/`$Q` Fallback)
Sistem mengevaluasi graf $(V, E)$ dan daftar primitif 2D yang terdeteksi secara berurutan:

| Target Bangun Ruang | Ciri Topologi & Geometri pada Sketsa | Ekstraksi Parameter Dimensi Otomatis |
| :--- | :--- | :--- |
| **Kubus (`cube`) & Balok (`cuboid`)** *(kasus kanan screenshot)* | Terdeteksi **1 wajah depan segi-4** (4 sudut mendekati $90^\circ \pm 20^\circ$) **+** minimal **2–3 rusuk miring sejajar** (arah vektor $\vec{d}$ konsisten dalam toleransi $\pm 18^\circ$ di sudut $15^\circ$–$75^\circ$) **+** **1–2 rusuk penutup belakang** (membentuk minimal 1 **Y-junction** internal dan 2 **Arrow-junction** luar). Mendukung baik gaya *solid visible-only* (7 titik, 9 rusuk seperti di screenshot) maupun *transparent wireframe* (8 titik, 12 rusuk). | Lebar $w$ & tinggi $h$ dari wajah depan; kedalaman $d = \frac{\|\vec{d}\|}{0.5}$ (kompensasi proyeksi miring *cavalier/cabinet*). Jika $\max(w,h,d)/\min(w,h,d) \le 1.25 \Rightarrow$ **`cube`**, selain itu **`cuboid`**. |
| **Prisma Segitiga / Segi-$n$ (`prism`, `prism_n`)** | Terdeteksi **2 poligon kongruen** (mis. 2 segitiga atau 2 segi-5/6) yang tergeser oleh vektor translasi $\vec{d}$ dan dihubungkan oleh $\ge 2$ rusuk sejajar $\vec{d}$; ATAU 1 segitiga depan + 2 rusuk miring sejajar + 1 garis penutup belakang. | Profil alas diambil dari poligon utama (`normalizeProfile2D`); tinggi prisma dari $\|\vec{d}\|$. |
| **Limas Segitiga / Segiempat / Segi-$n$ (`pyramid`, `tetrahedron`, `pyramid_n`)** | Terdeteksi **1 poligon alas** (segitiga/jajar genjang/segi-$n$) **+** **1 titik puncak (*apex*)** di luar poligon alas dengan derajat $\ge 3$ yang terhubung ke sudut-sudut alas oleh rusuk-rusuk yang saling mengumpul (*converging*). | Alas dari poligon (koreksi perspektif jajar genjang → persegi/persegi panjang); tinggi $t$ dari jarak vertikal apex ke pusat alas. |
| **Tabung (`cylinder`)** | Terdeteksi **2 elips sejajar** (atas & bawah, atau 1 elips atas + 1 busur lengkung bawah) dengan lebar hampir sama ($|w_1 - w_2| / w_1 \le 0.25$) dihubungkan oleh **2 garis lurus sejajar** di tepi kiri & kanan. | Jari-jari $r = w / 2$; tinggi $t$ = jarak pusat elips atas ke elips bawah. |
| **Kerucut (`cone`)** | Terdeteksi **1 elips alas** (atau busur lengkung bawah) **+** **2 garis lurus mengumpul** di 1 titik puncak (*apex*) yang menyentuh ujung kiri & kanan elips. | Jari-jari $r = w / 2$; tinggi $t$ = jarak vertikal apex ke pusat elips. |
| **Bola (`sphere`)** | Terdeteksi **1 lingkaran luar** (rasio $w/h \in [0.85, 1.15]$) **+** **1 elips ekuator** (atau 2 elips ekuator + meridian) yang berada di dalam lingkaran tersebut dengan lebar mendekati diameter lingkaran. | Jari-jari $r = \text{diameter} / 2$. |
| **Bangun Bebas / Poligon Cekung (`custom_prism` / `custom_pyramid`)** *(kasus kiri screenshot)* | Poligon tertutup apa pun (termasuk bentuk cekung seperti **mahkota**, huruf L, T, panah, bintang, atau gambar bebas tertutup) yang tidak masuk kategori standar di atas. | Tampilkan chip konfirmasi ringan **"Jadikan 3D (Prisma / Limas / Putar)"** → jalankan `normalizeProfile2D` + **Ear-Clipping Triangulation** agar lekukan cekung tetap tajam sempurna tanpa *cap* yang menutupi celah. |

**Fallback Multi-Stroke Recognizer (`$P` / `$Q`)**:
Untuk goresan yang sangat cepat atau kurang rapi sehingga *junction graph* memiliki celah, gunakan pengenal *point-cloud* multi-stroke **[$P / $Q Recognizer](https://depts.washington.edu/acelab/proj/dollar/index.html)** (ringan, <150 baris TypeScript, murni *client-side*, tidak peduli urutan maupun arah goresan!) sebagai lapisan validasi kedua sebelum menawarkan tombol konfirmasi non-intrusif (`"Deteksi: Kubus 3D · Ubah?"`).

### 2.2 Perbaikan Wajib Triangulasi Poligon Cekung (`operators3d.ts` & `TongchuangSolidWidget.tsx`)
Untuk memastikan bentuk seperti **mahkota di kiri screenshot** tidak pernah rusak saat diubah menjadi bangun ruang 3D:
1. Pada `packages/geometry-core/src/operators3d.ts`, tambahkan indeks segitiga hasil *ear-clipping* untuk tutup atas dan tutup bawah (atau gunakan `THREE.ShapeUtils.triangulateShape(contour, holes)` di `threeGeometry.ts` / `TongchuangSolidWidget.tsx`).
2. Pastikan dinding samping (*side quads*) dibentuk dengan *winding order* CCW konsisten sehingga normal selalu mengarah keluar (tidak ada sisi yang tembus pandang/terbalik).
3. Untuk fitur **Irisan (`section.ts`)** dan **Jaring-Jaring (`unfold.ts`)** pada poligon cekung, pastikan pemotongan bidang menangani **multi-segmen / poligon irisan terpisah** (karena mengiris bangun berbentuk mahkota secara horizontal bisa menghasilkan 2 atau 3 potongan segitiga terpisah!).

---

## 3. Sistem Remote HP & Akses Whiteboard Mobile Multi-Metode

Agar fitur remote ke HP maupun akses langsung whiteboard dari HP **pasti berfungsi** di berbagai kondisi jaringan (baik di sekolah dengan server lokal/cloud maupun saat guru memakai *Mode Tanpa Login*), gunakan arsitektur **3 Metode Masuk + Dual-Transport Sinkronisasi**.

### 3.1 Tiga Metode Koneksi HP ↔ Desktop Whiteboard

| Metode | Cara Guru / Siswa Masuk | Kelebihan |
| :--- | :--- | :--- |
| **1. Scan QR Code Instan** | Klik tombol `📱 Hubungkan HP` di Desktop → muncul QR Code besar. Scan dari kamera HP langsung membuka mode yang dipilih (**Remote Controller** atau **Whiteboard Mobile**). | Paling cepat (<3 detik), tanpa ketik apa pun, cocok di depan kelas. |
| **2. Kode Pairing 6 Digit** | Buka `/connect` atau `/join` di browser HP lalu ketik kode 6 digit (mis. `482-910`) yang tampil di bawah QR Code. | Tetap berfungsi jika kamera HP bermasalah atau jarak terlalu jauh dari proyektor. |
| **3. Share Link / Deep Link** | Salin tautan atau kirim via WhatsApp/Telegram (mis. `/remote?peer=ID` atau `/whiteboard?room=ID&mode=mobile`). | Memudahkan guru/asisten atau siswa bergabung langsung dari perangkat masing-masing. |

### 3.2 Arsitektur Dual-Transport (Pasti Jalan di Mode Login maupun Mode Tanpa Login)
1. **Jalur 1 — Backend Room WebSocket (`apps/api`)**: Digunakan saat guru login dan membuka Room kelas (mendukung banyak siswa sekaligus, *Raise Hand*, *Presenter Approval*, serta rekaman *Lesson Replay*). Upgrade [`ControllerPage.tsx`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/pages/room/ControllerPage.tsx) dari REST polling ke **WebSocket real-time** (Laravel Reverb / WS) agar pergerakan kursor/orbit 3D berjalan 60fps tanpa delay HTTP.
2. **Jalur 2 — Serverless P2P WebRTC (`PeerJS` / `WebRTC DataChannel`)**: Terinspirasi dari [PeerJS](https://peerjs.com/) dan [phiresky/webrtc-remote-touch-pen-input](https://github.com/phiresky/webrtc-remote-touch-pen-input) serta [WebRTCSmartphoneController](https://github.com/EmmaPoliakova/WebRTCSmartphoneController). Saat guru memakai `/whiteboard` dalam **Mode Tanpa Login** (seperti di tangkapan layar), Desktop langsung membuat `PeerID` acak + QR Code; HP terhubung *peer-to-peer* langsung ke browser Desktop dengan latensi $<30\text{ ms}$ tanpa perlu login maupun database!

### 3.3 Dua Mode Pengalaman di HP
1. **Mode Remote Controller (HP sebagai Remote Pintar Guru)**:
   - **Touchpad & Laser Pointer**: Geser jari di layar HP untuk menggerakkan laser merah di whiteboard Desktop; tap untuk klik/pilih objek.
   - **3D Orbit Trackpad + Gyroscope Opsional**: Saat objek 3D terpilih di Desktop, layar HP otomatis berubah menjadi *trackpad* putar 3D + tombol cepat `Irisan`, `Jaring`, `Pisah`, `Reset`.
   - **Quick Tool & Canvas Control**: Zoom In/Out, Undo/Redo, Next/Prev Page, Blank Screen, serta tombol **🎤 Suara AI** (memakai mikrofon HP agar guru bisa memberi perintah suara sambil berjalan ke belakang kelas!).
   - **Mini Drawing Pad**: Coret langsung di layar HP → goresan langsung muncul real-time di whiteboard Desktop (termasuk *Auto-Shape* & *Sketch-to-3D*).
2. **Mode Direct Mobile Whiteboard (HP Masuk Langsung ke Kanvas)**:
   - Membuka papan tulis penuh yang responsif di browser HP, tersinkronisasi dua arah dengan Desktop (via `Yjs` / WebRTC / WebSocket).

---

## 4. Desain Responsif Mobile & State Machine Gestur Sentuh

Untuk memenuhi interaksi sentuh yang persis Anda minta (**1x klik = blok/pilih**, **2x klik = munculkan fitur bundar / klik kanan desktop**, **tahan & geser = pindah objek halus**, **zoom in/out halus**), kita harus membangun satu **Unified Touch Gesture State Machine** (`apps/web/src/lib/touchGestureEngine.ts`) di atas Pointer Events, menghindari konflik *double-fire* klasik Konva ([Konva Mobile Tap & Click](https://konvajs.org/docs/events/Mobile_Tap_And_Click.html)) dan menerapkan [Konva Multi-touch Scale Stage](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html).

### 4.1 Tabel Transisi State Machine Gestur Sentuh

| Gestur Pengguna di Layar Sentuh | Kondisi Pemicu (Threshold Presisi) | Aksi yang Dijalankan | Umpan Balik Visual & Haptik |
| :--- | :--- | :--- | :--- |
| **1x Tap (Klik 1x pada Objek)** | 1 jari, durasi $< 250\text{ ms}$, pergeseran $< 8\text{ px}$, tidak ada tap kedua dalam `260ms`. | **Blok / Pilih Objek** (tampilkan OBB selection box + handle resize/rotasi + toolbar ringkas). | Border seleksi aktif muncul instan. |
| **2x Tap (Klik 2x pada Objek)** | 2 tap berturut-turut dalam selang $\le 300\text{ ms}$ dan jarak antar-tap $\le 24\text{ px}$ pada objek yang sama. | **Buka Menu Bundar (`TongchuangRadialWheel`)** — setara persis dengan **Klik Kanan di Desktop** (berisi aksi cepat: Ubah ke 3D, Irisan, Jaring, Jelaskan AI, Duplikat, Hapus). | Animasi *pop-in* radial wheel di sekitar titik tap + haptik ringan (`navigator.vibrate?.(15)`). |
| **Tahan lalu Geser (*Long-Press & Smooth Drag*)** | 1 jari diam pada objek selama $\ge 200\text{ ms}$ (pergeseran $< 8\text{ px}$), lalu mulai bergerak. | **Mode Pindah Objek Halus 60fps** — objek mengikuti jari secara imperatif (`previewLayerRef.batchDraw()` / `translate3d` tanpa React re-render per frame). Melepas jari langsung menyimpan `object.updated`. | Efek angkat halus (*subtle elevation shadow* + indikator cincin biru) + haptik singkat (`navigator.vibrate?.(25)`). |
| **Geser di Area Kosong (1 Jari pada Mode Hand/Select)** | 1 jari digeser di area kanvas kosong $> 8\text{ px}$ (bukan di atas objek). | **Pan Kanvas Halus** (menggeser viewport papan tulis). | Pergerakan viewport mengikuti jari 1:1. |
| **Cubitan 2 Jari (*Pinch-to-Zoom & 2-Finger Pan*)** | 2 jari aktif bersamaan (`activePointers.size === 2`). | **Zoom In / Zoom Out + Pan** terpusat tepat pada titik tengah kedua jari (*focal-point zoom*), dengan batas skala `0.2x`–`5.0x` dan sinkronisasi penuh ke Konva maupun DOM Overlay (`viz_solid`, `viz_graph`, `math_block`). | Badge persentase zoom (`125%`) muncul sementara di sudut bawah. |
| **Interaksi Khusus di Dalam Objek 3D** | Jika objek 3D sedang dalam status *Active Orbit*, geser 1 jari di dalam kanvas 3D memutar kamera 3D; **tahan bingkai luar / pill `✋ Geser`** memindahkan posisi widget 3D; **2x tap** membuka Menu Bundar. | Mencegah bentrokan antara memutar bangun 3D dan memindahkan kotak objek 3D. | Indikator mode *Orbit 3D* vs *Geser Objek* jelas di bagian atas widget. |

### 4.2 Penyederhanaan UI & Tata Letak Responsif (Desktop vs Tablet vs HP)
1. **Hapus Duplikasi Tombol**: Di tangkapan layar saat ini, tombol **`Grafik`** muncul dua kali (di bar atas dan bar bawah). Satukan tombol utama secara konsisten:
   - **Desktop**: Top Bar ringkas (Judul, `Katalog 2D/3D`, `Blok Rumus`, `Asisten AI`, `Suara AI`, `📱 Remote HP`, `Masuk Guru`); Left Dock 7 alat inti (`Pilih`, `Geser`, `Pena Pintar`, `Penghapus`, `Bangun`, `Teks/Rumus`, `Grafik`); Bottom Bar hanya untuk utilitas tampilan (`Zoom`, `Undo/Redo`, `Ringkasan`).
   - **Mobile (`< 768px`)**:
     - Top Bar ultra-kompak (hanya Logo, `📱 Sync/Remote`, `✨ AI`, dan menu `⋯`).
     - **Bottom Thumb Dock** melayang di bagian bawah (mudah dijangkau ibu jari): `Pilih/Geser`, `Pena`, `Bangun 2D/3D`, `Rumus`, `Hapus`, `Undo/Redo`.
     - Katalog Geometri, Asisten AI, dan *Custom Inspector* tampil sebagai **Bottom Sheet** yang bisa ditarik ke atas/bawah (*draggable drawer*) sehingga kanvas tetap maksimal.
     - Wajib pasang `touch-action: none` dan `user-select: none` pada container kanvas agar browser HP tidak memicu *pull-to-refresh* atau *pinch-zoom* halaman saat guru menggambar.

---

## 5. Peningkatan Desain 3D, Fitur Tambahan & Referensi Open-Source

Berdasarkan evaluasi hasil desain 3D commit `c833b50` dan referensi dari ekosistem open-source ([tldraw](https://github.com/tldraw/tldraw), [Excalidraw](https://github.com/excalidraw/excalidraw), [Three.js Examples](https://threejs.org/examples/), [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg), [Mafs](https://github.com/stevenpetryk/mafs), [@cortex-js/compute-engine](https://www.npmjs.com/package/@cortex-js/compute-engine), [PeerJS](https://peerjs.com/)), berikut peningkatan desain & fitur bernilai tinggi berikutnya:

### 5.1 Upgrade Kualitas Desain Model 3D
1. **Fat Anti-Aliased Edges (`Line2` / `LineMaterial`)**: Menggantikan `LineBasicMaterial`/`LineDashedMaterial` 1px bawaan WebGL sehingga ketebalan garis rusuk depan (`2.2px`) dan garis putus-putus belakang (`1.5px`) tampil tajam seperti gambar vektor di proyektor kelas maupun layar HP Retina.
2. **Penandaan Geometri Buku Teks Otomatis**:
   - **Simbol Sudut Siku-Siku ($90^\circ$)** berbentuk kotak kecil otomatis pada sudut tegak lurus (tinggi limas/kerucut terhadap alas, sudut kubus/balok, sudut penampang irisan).
   - **Garis Bantu Tinggi ($t$) & Apotema/Garis Pelukis ($s$)** berwarna aksen (mis. merah muda/oranye putus-putus) yang bisa di-toggle on/off.
   - **Preset Kamera Halus (*Spring Camera*)**: Tombol 1-klik `Isometrik`, `Depan`, `Atas`, `Samping` dengan transisi *slerp* halus.
   - **Contact Ground Shadow & Grid 3D Opsional**: Bayangan lembut di bawah bangun ruang agar tidak terasa "mengambang" di ruang kosong.
3. **Pelengkap Katalog Geometri**:
   - Tambah **Dodecahedron** (melengkapi ke-5 Platonic Solids) + **Permukaan Parametrik $\mathbf{S}(u,v)$** ([`ParametricGeometry`](https://threejs.org/docs/pages/ParametricGeometry.html): Pita Möbius, Torus-Knot, Helicoid) + **Permukaan Implisit $F(x,y,z)=0$** ([`MarchingCubes`](https://threejs.org/examples/webgl_marchingcubes.html)).
   - Tambah **CSG Boolean Interaktif** ([`three-bvh-csg`](https://github.com/gkjohnson/three-bvh-csg)) untuk operasi gabung/potong/irisan antar 2 bangun ruang 3D.

### 5.2 Fitur Tambahan Cerdas (Smart Whiteboard Polish)
1. **Magnetic Alignment Guides & Snapping** (referensi: *tldraw / Figma*): Garis panduan putus-putus merah/biru otomatis muncul saat menggeser objek agar sejajar pusat (*center-align*) atau sejajar tepi (*edge-align*) dengan objek lain.
2. **Alat Konstruksi Geometri Virtual (`packages/construction-core`)**: Integrasikan **Penggaris**, **Busur Derajat**, dan **Jangka** interaktif langsung di atas kanvas 2D agar guru dapat mendemonstrasikan pengukuran sudut dan pelukisan lingkaran secara nyata.
3. **Evaluasi Simbolik Penuh (`@cortex-js/compute-engine`)**: Tingkatkan `MathTextBlockWidget.tsx` dengan penyederhanaan aljabar eksak ($\frac{1}{2}+\frac{1}{3}=\frac{5}{6}$), turunan/integral simbolik, dan kompilasi fungsi 3D berkecepatan tinggi (`ce.compile()`).
4. **2D Intelligent Folding Langsung dari Sketsa**: Hubungkan `packages/geometry-core/src/folding2d.ts` langsung ke menu bundar saat guru menggambar jaring-jaring 2D (mis. 6 persegi terhubung) agar muncul aksi **"Lipat Jadi 3D"**.

---

## 6. Pemetaan File & Roadmap Implementasi V2

### 6.1 Pemetaan Perubahan File
| Paket / Folder | File Target | Ringkasan Tugas |
| :--- | :--- | :--- |
| `packages/sketch-core` | `src/multistroke3d.ts` (baru), `src/dollarP.ts` (baru), `src/index.ts` | Implementasi klasterisasi stroke spasial-temporal, RDP + *junction graph* (L/Y/Arrow/T), detektor Kubus/Balok/Prisma/Limas/Tabung/Kerucut/Bola, dan fallback `$P` multi-stroke. |
| `packages/geometry-core` | `src/operators3d.ts`, `src/section.ts`, `src/polyhedron.ts` | Tambah triangulasi *ear-clipping* untuk poligon cekung, dukungan multi-poligon pada irisan bidang cekung, dan tambahkan `buildDodecahedron`. |
| `apps/web/src/lib` | `touchGestureEngine.ts` (baru), `remotePeerBridge.ts` (baru), `threeMaterials.ts`, `threeGeometry.ts` | State machine gestur sentuh (*1x tap, 2x tap, long-press drag, pinch zoom*); jembatan pairing P2P WebRTC (`PeerJS`) + WebSocket; upgrade `Line2` fat edges, *angle markers*, *contact shadow*, `ParametricGeometry`, & `MarchingCubes`. |
| `apps/web/src/pages/whiteboard` | `WhiteboardCanvas.tsx`, `WhiteboardOverlay.tsx`, `ToolBar.tsx` | Integrasi `touchGestureEngine` & `multistroke3d` (dengan chip konfirmasi non-intrusif), *magnetic alignment guides*, hapus duplikasi tombol `Grafik`, dan layout responsif mobile (*Bottom Thumb Dock* + *Bottom Sheet*). |
| `apps/web/src/pages/room` & `components/room` | `ControllerPage.tsx`, `ConnectDeviceModal.tsx` | Tambah 3 metode koneksi (QR, Kode 6 digit, Link), dukung pairing langsung di *Mode Tanpa Login* via WebRTC P2P, tambah mode **3D Orbit Trackpad**, **Voice Mic Remote**, **Mini Drawing Pad**, dan tombol beralih ke **Direct Mobile Whiteboard**. |

### 6.2 Urutan Eksekusi & Kriteria Verifikasi

- **Sprint 1 — Multi-Stroke 3D Sketch & Concave Polygon 3D Fix**:
  - Implementasi `multistroke3d.ts` + `$P` fallback + perbaikan *ear-clipping* untuk poligon cekung (mahkota, L-shape, bintang).
  - *Verifikasi*: Gambar sketsa kubus 3D bebas (seperti kanan screenshot) terdeteksi menjadi `cube`/`cuboid` 3D dalam $< 150\text{ ms}$; konversi bentuk mahkota (kiri screenshot) ke prisma/limas 3D menghasilkan tutup cekung rapi tanpa segitiga menyilang.
- **Sprint 2 — Mobile Touch Gesture Engine & Responsive Whiteboard**:
  - Implementasi `touchGestureEngine.ts` (*1x tap* = pilih, *2x tap* = buka `TongchuangRadialWheel`, *long-press* = drag halus 60fps, *2-finger pinch* = focal-point zoom) + layout responsif HP (`< 768px`) + hapus duplikasi tombol `Grafik`.
  - *Verifikasi*: Uji Playwright emulasi perangkat mobile (Pixel/iPhone viewport) memastikan zero *double-fire*, menu bundar terbuka pada *double-tap*, drag mulus tanpa scroll layar, dan pinch-zoom menjaga keselarasan Konva ↔ DOM Overlay $< 1\text{ px}$.
- **Sprint 3 — Dual-Transport Mobile Remote (QR / Kode / Link + Mode Tanpa Login)**:
  - Integrasi `remotePeerBridge.ts` (WebRTC P2P `PeerJS` + WebSocket Room) pada `ConnectDeviceModal.tsx` dan `ControllerPage.tsx`, plus mode *3D Orbit Trackpad*, *Laser Pointer*, *Voice Mic*, dan *Direct Mobile Whiteboard*.
  - *Verifikasi*: Scan QR dari HP ke `/whiteboard` (*Mode Tanpa Login*) berhasil terhubung $< 2\text{ detik}$, memutar objek 3D & mengirim coretan dengan latensi $< 50\text{ ms}$.
- **Sprint 4 — Upgrade Desain 3D (`Line2`, Dodecahedron, Permukaan Lanjut) & Smart Polish**:
  - Upgrade garis rusuk ke `Line2`/`LineMaterial`, tambah penanda sudut $90^\circ$, *contact shadow*, preset kamera *spring*, Dodecahedron, `ParametricGeometry`, `MarchingCubes`, *magnetic alignment guides*, dan alat konstruksi busur/penggaris/jangka.
  - *Verifikasi*: Garis rusuk solid & dashed tajam di layar 2x DPR, frame rate $\ge 55\text{ FPS}$, seluruh unit test (`test:all`) dan build (`pnpm build`) lulus tanpa error.
