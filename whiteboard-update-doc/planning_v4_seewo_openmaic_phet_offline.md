# Master Plan V4: On-Device AI Recognition & Beautification (Seewo), AI Whiteboard & Validated Simulation (OpenMAIC), PhET Experiment Mode, & Offline-First PWA

Dokumen perencanaan ini disusun berdasarkan audit langsung terhadap commit terbaru [`872cb72`](https://github.com/xDzaky/ai-interactive-classroom/commit/872cb72ea13f22b5059bd58df34c1c9de92f0f86) pada repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/), sintesis referensi **`update-ref-v4.md`** (Seewo AI Teaching Model, OpenMAIC, PhET Interactive Simulations, JSXGraph, ONNX Runtime Web), serta riset teknis mendalam untuk memastikan seluruh logika menyatu rapi dengan fondasi V1–V3 yang sudah terbangun.

---

## 1. Audit Commit Terbaru `872cb72` & Pemetaan Kesiapan Repositori

### 1.1 Ringkasan Perubahan pada Commit [`872cb72`](https://github.com/xDzaky/ai-interactive-classroom/commit/872cb72ea13f22b5059bd58df34c1c9de92f0f86)
Commit terbaru (`fix(whiteboard): disable Stage drag in Select tool, fix polygon recognizer (98.8% accuracy, 100% triangle/rhombus), remove verbose header subtitle`) menyempurnakan stabilitas inti whiteboard:
1. **`WhiteboardCanvas.tsx`**: Menonaktifkan *Stage dragging* saat alat *Select* aktif (`isDraggable = false`), memisahkan secara tegas antara seleksi/drag objek dan *Hand panning*.
2. **`packages/sketch-core/src/recognizer.ts`**: Menambahkan `addBestCandidate` lintas epsilon poligon serta filter penolakan segiempat degenerasi (`minSide / maxSide < 0.16 || angles > 152°`), meningkatkan akurasi pengenalan poligon hingga **98.8%** (100% segitiga & belah ketupat).
3. **`PersonalRoomPage.tsx`**: Menghapus subjudul panjang pada header agar ruang kanvas lebih lega dan bersih.

### 1.2 Peta Kesenjangan (*Gap Analysis*): Yang Sudah Ada vs. Target V4

| Pilar di `update-ref-v4.md` | Sudah Tersedia di Repo (V1–V3) | Belum Ada / Perlu Dibangun di V4 |
| :--- | :--- | :--- |
| **1. Seewo AI — Handwriting, Math OCR & Beautification** | `perfect-freehand`, `sketch-core` (2D 98.8% + multi-stroke 3D), `MathLive` (`0.111.0`), `KaTeX`. | **On-Device HMER (Tulisan Tangan Rumus → LaTeX)** via **ONNX Runtime Web** (Web Worker, WebGPU/WASM), **Non-Destructive Blackboard Beautification** (toggle *Asli ↔ Rapikan*), & konfirmasi skor kepercayaan (*confidence*). |
| **2. OpenMAIC — AI Drawing & Validated Simulation** | `AITeachingDrawer.tsx` (Problem-Chain), `GraphViewer` (`mafs`), `TongchuangSolidWidget` (`three`), `MathTextBlockWidget`. | **Declarative AI Whiteboard Command Protocol** (AI menggambar diagram/rumus/3D bertahap langsung ke kanvas via Zod schema), **Schema-Validated Simulation Engine** (slider interaktif tervalidasi + dukungan opsional `JSXGraph`). |
| **3. PhET Interactive Simulations** | Belum ada pustaka simulasi sains lintas mapel. | **PhET HTML5 Simulation Library** (Matematika, Fisika, Kimia, Biologi) patuh lisensi `CC BY-NC 4.0`, plus **Experiment Mode (Predict → Observe → Explain)** di Classroom Room. |
| **4. Classroom Quiz, Replay, Knowledge Explorer & Offline PWA** | `dexie` (IndexedDB) sudah terpasang, `ReplayViewer.tsx` & `ControllerPage.tsx` (Dual-Transport P2P + Room) sudah ada. | **AI Classroom Quiz & Live Poll**, **Event-Based Replay Timeline** terpadu (mencakup perubahan rumus & simulasi), **AI Knowledge Explorer** (graf konsep), serta **Offline-First PWA** (Service Worker + Cache API/OPFS untuk model ONNX). |

*(Catatan audit: file `apps/web/vite.config.ts` dan isi direktori `apps/ai-service` tidak dapat dibuka langsung saat pemeriksaan terakhir, sehingga konfigurasi PWA Workbox dan endpoint FastAPI perlu diverifikasi langsung di lokal sebelum eksekusi kode).*

---

## 2. Pilar 1: Seewo AI — On-Device Handwriting Math Recognition (HMER) & Blackboard Beautification

### 2.1 Arsitektur On-Device AI HMER (Berjalan Lokal di Browser Tanpa Lag)
Mengacu pada dokumentasi [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) dan pola implementasi mutakhir di browser seperti [`aburousan/ink2latex`](https://github.com/aburousan/ink2latex) (model *stroke-to-LaTeX* berbasis *relative 2D transformer encoder* di ONNX Runtime Web dengan caching Service Worker) serta referensi CoMER (`ink-on`, `Calcink`), jalankan seluruh inferensi AI **di luar main thread** agar kanvas Konva tetap 60fps:

```text
[Stroke Guru di Konva (Mouse / Touch / Stylus)]
        │
        ▼ (600ms Idle Debounce + Spatial Line/Block Grouping)
[HMER Coordinator — Main Thread]
   ├── Beri Request ID / Generation Token (buang hasil lama jika guru lanjut menulis!)
   └── Kirim stroke sequence (atau raster 256×128) ke Dedicated Web Worker
        │
        ▼
[hmer.worker.ts — ONNX Runtime Web]
   ├── Auto-detect Execution Provider: ['webgpu', 'wasm'] (WASM fallback wajib!)
   ├── Load model terkuantisasi (INT8/FP16) dari Cache API / OPFS (unduh sekali saja)
   └── Output: { latex: string, confidence: number, type: 'math' | 'text' | 'shape' }
        │
        ▼ (Fallback ke apps/ai-service Pix2Text / RapidLaTeXOCR jika perangkat RAM < 2GB & online)
[Non-Intrusive Confirmation Chip di Atas Goresan]
   ├── Tampilkan pratinjau KaTeX + skor confidence (mis. "x² + 2x - 8 = 0 · 94%")
   ├── [✓ Ubah ke Blok Rumus] → Konversi ke MathTextBlockWidget + simpan rawStrokes
   ├── [✎ Edit]              → Buka langsung di MathLive untuk koreksi manual
   └── [✕ Biarkan Coretan]   → Pertahankan tulisan tangan asli
```

**Aturan Penting Performa & Keandalan**:
- **Stale Inference Cancellation**: Seperti praktik terbaik pada [`aburousan/ink2latex`](https://github.com/aburousan/ink2latex), setiap kali guru menambahkan atau menghapus stroke sebelum inferensi selesai, hasil inferensi sebelumnya langsung dibuang agar UI tidak berkedip dengan rumus lama.
- **Routing Cerdas Lokal vs Cloud**:
  - *Bentuk 2D/3D* → `packages/sketch-core` (deterministik, `< 5ms`, 100% offline).
  - *Rumus Matematika & Simbol* → ONNX Runtime Web di `hmer.worker.ts` (WebGPU jika tersedia, WASM sebagai fallback universal; fallback opsional ke [`Pix2Text`](https://github.com/breezedeus/pix2text) / [`RapidLaTeXOCR`](https://github.com/RapidAI/RapidLatexOCR) di FastAPI untuk foto/tulisan sangat kompleks).
  - *Penjelasan Pedagogis & Generasi Pelajaran* → LLM di `apps/ai-service`.

### 2.2 Non-Destructive AI Blackboard Beautification (*Asli ↔ Rapikan*)
Agar guru merasa nyaman tanpa takut tulisannya "rusak" oleh koreksi otomatis, setiap aksi perapian bersifat **non-destruktif**:

1. **Penyimpanan Ganda pada Objek (`whiteboard-core`)**:
   Setiap objek hasil perapian menyimpan `props.originalStrokes: StrokeData[]` dan `props.displayMode: "beautified" | "original"`. Guru dapat menekan 1 tombol **`Asli / Rapi`** pada toolbar objek kapan saja.
2. **4 Lapisan Beautification**:
   - **Handwriting Smoothing**: Menggunakan `perfect-freehand` dengan sensitivitas tekanan stylus (`pointerEvent.pressure`) + kurva Bézier halus untuk menghilangkan getaran tangan (*jitter*) pada mouse.
   - **Shape & 3D Beautification**: Memanfaatkan `recognizer.ts` (akurasi 98.8%) dan `multistroke3d.ts` untuk meluruskan garis, merapikan sudut siku-siku, dan menyamakan panjang sisi yang hampir sama.
   - **Mathematical Layout Alignment**: Saat beberapa baris persamaan ditulis berurutan ke bawah, sistem otomatis menyejajarkan tanda `=` secara vertikal (*aligned equation column*) dan menyeragamkan ukuran font LaTeX.
   - **Diagram Beautification**: Mendeteksi kotak/lingkaran yang dihubungkan oleh panah (`arrow`), lalu menyelaraskan sumbu pusat (*auto-align*), menyamakan ukuran node, dan menempelkan ujung panah tepat di titik jangkar tepi objek.

---

## 3. Pilar 2: OpenMAIC — AI Whiteboard Drawing & Schema-Validated Simulation Engine

Mengadaptasi konsep inti [`THU-MAIC/OpenMAIC`](https://github.com/THU-MAIC/OpenMAIC) (orkestrasi AI yang menggambar langsung ke papan tulis, menulis rumus bertahap, dan menghasilkan simulasi interaktif) dengan **prinsip keamanan ketat dari `update-ref-v4.md`: AI tidak boleh mengeksekusi kode bebas tanpa validasi**.

### 3.1 Declarative AI Whiteboard Command Protocol (`packages/whiteboard-core/src/aiCommands.ts`)
Alih-alih meminta LLM menghasilkan HTML/JS acak, `apps/ai-service` mengeluarkan array perintah JSON terstruktur yang divalidasi oleh **Zod Schema** sebelum dijalankan di kanvas:

```ts
export type AIWhiteboardStep =
  | { type: "speak_caption"; text: string }
  | { type: "spawn_shape2d"; id: string; shapeType: string; params: Record<string, number>; pos: [number, number]; label?: string }
  | { type: "spawn_solid3d"; id: string; solidType: string; params: Record<string, number>; pos: [number, number] }
  | { type: "spawn_math_block"; id: string; latex: string; pos: [number, number] }
  | { type: "spawn_graph"; id: string; expressions: string[]; sliders?: SliderDef[]; pos: [number, number] }
  | { type: "spawn_simulation"; id: string; templateId: SimulationTemplateId; config: Record<string, unknown>; pos: [number, number] }
  | { type: "annotate_arrow"; fromId: string; toId: string; label: string }
  | { type: "highlight_focus"; targetId: string; color: string };
```

**Alur *Step-by-Step AI Visual Explanation***:
1. Guru mengetik instruksi (atau memilih objek/rumus lalu klik **`Jelaskan Bertahap`**), misal: *"Jelaskan teorema Pythagoras dengan segitiga siku-siku 3-4-5 dan luas perseginya"*.
2. `apps/ai-service` menghasilkan daftar `AIWhiteboardStep[]` yang telah diverifikasi hitungannya secara matematis (via Python/SymPy atau `@cortex-js/compute-engine`).
3. Papan tulis memutar langkah satu per satu dengan kontrol guru (**`Langkah Berikutnya`**, **`Putar Otomatis`**, **`Jeda`**)—setiap objek yang digambar AI adalah objek kanvas asli yang **langsung bisa diedit, diputar, atau digeser** oleh guru!

### 3.2 Schema-Validated Interactive Simulation Engine (`SimulationWidget.tsx`)
Untuk instruksi seperti *"Buat simulasi fungsi kuadrat dengan parameter a, b, dan c yang bisa diubah"* atau *"Simulasi gerak parabola dengan sudut tembak dan kecepatan awal"*, sistem menyediakan **Pustaka Template Simulasi Tervalidasi**:
- **Engine Grafik & Geometri Dinamis**: Mengombinasikan `Mafs` (sudah ada) dan [`JSXGraph`](https://jsxgraph.org/) (untuk konstruksi geometri dinamis tingkat lanjut, titik potong/akar otomatis, vektor, medan lereng ODE, dan statistik interaktif langsung di browser tanpa server).
- **Template Simulasi Bawaan Terverifikasi**:
  1. `math.function_explorer` — Fungsi linear, kuadrat, polinomial, trigonometri, eksponen, logaritma + slider $(a,b,c)$ + penanda akar, titik puncak, dan titik potong otomatis.
  2. `math.geometry_transform` — Visualisasi translasi, rotasi, refleksi, dilatasi berbasis matriks interaktif.
  3. `math.probability_dice` — Simulasi lempar dadu / koin $N$ kali (terhubung dengan template Dadu 3D!) + histogram frekuensi real-time.
  4. `physics.projectile_motion` — Gerak parabola (slider $v_0, \theta, g$, lintasan, titik tertinggi, jangkauan).
  5. `physics.waves_optics` — Superposisi gelombang sinus (slider amplitudo, frekuensi, fase) & pembiasan cahaya.
- Setiap perubahan slider pada simulasi dicatat sebagai event `simulation.parameter_changed` sehingga sinkron ke siswa di Room dan terekam di *Lesson Replay*.

---

## 4. Pilar 3: Integrasi PhET Interactive Simulations & Experiment Mode (POE)

Mengintegrasikan simulasi resmi **PhET Interactive Simulations (University of Colorado Boulder)** ([Situs Resmi](https://phet.colorado.edu/), [Lisensi](https://phet.colorado.edu/en/licensing)) untuk memperluas cakupan Matematika, Fisika, Kimia, dan Biologi secara legal dan terstruktur.

### 4.1 Pustaka Metadata & Kepatuhan Lisensi (`apps/web/src/lib/phetCatalog.ts`)
- Simpan katalog terkurasi (Matematika: *Graphing Quadratics*, *Fraction Matcher*, *Area Builder*, *Plinko Probability*; Fisika: *Gravity Force Lab*, *Forces and Motion*, *Circuit Construction Kit*, *Wave on a String*; Kimia: *Build an Atom*, *pH Scale*, *Balancing Chemical Equations*; Biologi: *Natural Selection*).
- **Kepatuhan Lisensi Wajib**:
  - Simulasi HTML5 reguler PhET dirilis di bawah lisensi **[CC BY-NC 4.0](https://phet.colorado.edu/en/licensing)** (gratis untuk penggunaan & distribusi non-komersial dengan atribusi resmi; penggunaan komersial wajib memiliki lisensi komersial dari PhET).
  - **Dilarang** melakukan *scraping* massal atau menghapus logo/atribusi PhET.
- **3 Mode Integrasi**:
  1. **Mode Embed Resmi (`<iframe>`)**: Menampilkan simulasi HTML5 PhET langsung di dalam panel `PhETSimulationWidget.tsx` menggunakan URL embed resmi PhET, dengan deteksi otomatis jika *cross-origin* atau jaringan memblokir iframe.
  2. **Mode Tautan Resmi (*Fallback 1-Klik*)**: Membuka simulasi di tab resmi PhET bila iframe dibatasi.
  3. **Mode Paket Lokal Offline (*Licensed Local Bundle*)**: Mendukung memuat file HTML5 resmi yang diunduh legal oleh sekolah untuk penggunaan *offline* dengan tetap menampilkan atribusi & tautan lisensi PhET.

### 4.2 PhET Experiment Mode (*Predict → Observe → Explain*)
Ubah simulasi menjadi eksperimen kelas terstruktur di dalam Classroom Room:
1. **Tahap 1 — Launch & Predict**: Guru memilih simulasi PhET → menetapkan pertanyaan eksperimen (mis. *"Jika massa benda A digandakan pada Gravity Force Lab, bagaimana gaya gravitasinya?"*) → siswa mengirim **Prediksi** dari HP/laptop masing-masing.
2. **Tahap 2 — Observe (Live Experiment)**: Guru (atau siswa secara mandiri) menjalankan simulasi dan mengubah parameter; siswa mencatat **Hasil Observasi** di kartu eksperimen samping.
3. **Tahap 3 — Explain & Report**: Siswa mengirim **Kesimpulan**, lalu sistem merangkum **Experiment Report** (Nama Eksperimen, Tujuan, Prediksi vs Hasil, Kesimpulan, & Skor Kuis singkat) yang bisa diekspor guru.

---

## 5. Pilar 4: Classroom Quiz, Event-Based Replay, Knowledge Explorer & Offline-First PWA

### 5.1 AI Classroom Quiz & Live Poll (`QuizOverlayModal.tsx`)
- **Generator Soal AI**: Guru memilih materi dari papan tulis aktif (atau topik) → `apps/ai-service` menyusun soal (Pilihan Ganda, Benar/Salah, Isian Singkat, & Jawaban Rumus Matematika berbasis `MathLive`).
- **Alur Review Wajib**: Guru selalu memeriksa/mengedit soal sebelum menekan **`Luncurkan ke Kelas`**.
- **Live Results & Feedback**: Siswa menjawab via kode Room → grafik batang distribusi jawaban muncul real-time di papan tulis guru → klik **`Tampilkan Pembahasan`** memunculkan *Step-by-Step Explanation* langsung di kanvas.

### 5.2 Event-Based Lesson Replay & Timeline (`ReplayViewer.tsx` + `whiteboard-core`)
Memperkuat sistem replay berbasis event agar **tidak perlu merekam video layar yang berat**:
- Catat seluruh aksi kronologis dengan timestamp: `stroke.created`, `stroke.beautified`, `object.created`, `object.transformed`, `formula.updated`, `simulation.parameter_changed`, `phet.experiment_step`, `quiz.launched`, `student.approved`.
- **Timeline Scrubber**: Guru & siswa dapat menggeser garis waktu (*play, pause, 1x/2x speed, lompat ke chapter*) untuk merekonstruksi ulang seluruh proses mengajar dengan ukuran file sangat kecil (`< 200 KB` per pertemuan) serta mengekspor riwayat sesi (`.json` atau *standalone offline HTML viewer*).

### 5.3 Offline-First PWA & Local Model Cache
Menjadikan AI Interactive Classroom tetap andal di sekolah dengan internet terbatas:
1. **PWA App Shell (`vite-plugin-pwa` + Workbox)**: Meng-cache bundle React, Konva, Three.js, MathLive, KaTeX, JSXGraph, dan seluruh aset template 2D/3D/Dadu agar aplikasi dapat diinstal (*Install App*) dan dibuka penuh tanpa internet.
2. **IndexedDB (`dexie` — sudah terpasang di `apps/web`)**: Menyimpan papan tulis lokal, riwayat *Event-Based Replay*, hasil kuis offline, dan *Offline Write Queue* yang otomatis tersinkronisasi (*Background Sync*) ketika internet kembali.
3. **Cache API / OPFS untuk Model ONNX**: Model pengenalan rumus tulisan tangan diunduh sekali (dengan progress bar jelas + tombol hapus cache) lalu berstatus **`Siap Offline`** agar HMER berjalan lokal tanpa kuota internet.
4. **Batasan Transparan di UI**: Tampilkan indikator status jaringan yang jujur — *Kolaborasi multi-perangkat* membutuhkan LAN/Wi-Fi lokal atau internet, dan *LLM Cloud* otomatis beralih ke mode lokal/template saat offline.

### 5.4 AI Knowledge Explorer (`KnowledgeExplorerModal.tsx`)
- Graf konsep interaktif (dibangun ringan dengan SVG/Konva *force-directed layout*) yang memetakan topik aktif ke: **Konsep Prasyarat**, **Rumus Terkait**, **Template 3D / Simulasi PhET Terkait**, dan **Latihan Soal**. Mengklik node langsung membuka simulasi atau menyisipkan visualisasi terkait ke papan tulis.

---

## 6. Pemetaan File & Roadmap Implementasi V4

### 6.1 Pemetaan Perubahan pada Struktur Repositori
| Paket / Folder | File Target | Ringkasan Perubahan |
| :--- | :--- | :--- |
| `packages/whiteboard-core` | `src/aiCommands.ts` (baru), `src/replay.ts`, `src/index.ts` | Tambah Zod schema `AIWhiteboardStep`, field `originalStrokes` & `displayMode` untuk *non-destructive beautification*, serta tipe event `simulation.parameter_changed` & `phet.experiment_step`. |
| `apps/web/src/workers` | `hmer.worker.ts` (baru) | Dedicated Web Worker menjalankan `onnxruntime-web` (`webgpu` → `wasm`), manajemen cache model (Cache API/OPFS), dan *stale-request cancellation*. |
| `apps/web/src/lib` | `beautificationEngine.ts` (baru), `phetCatalog.ts` (baru), `offlineSync.ts` (baru) | Logika smoothing/alignment tulisan, persamaan, dan diagram; katalog metadata simulasi PhET patuh lisensi `CC BY-NC 4.0`; lapisan `dexie` IndexedDB + *Offline Sync Queue*. |
| `apps/web/src/components/whiteboard` | `HmerConfirmChip.tsx` (baru), `SimulationWidget.tsx` (baru), `PhETSimulationWidget.tsx` (baru), `KnowledgeExplorerModal.tsx` (baru) | Chip konfirmasi hasil OCR rumus + tombol *Asli/Rapi*; widget simulasi tervalidasi (`Mafs`/`JSXGraph`); panel PhET + alur eksperimen POE; graf eksplorasi konsep. |
| `apps/web/src/components/classroom` | `QuizLauncherModal.tsx` (baru), `ExperimentReportDrawer.tsx` (baru) | Live Quiz & Poll untuk guru/siswa serta dokumentasi laporan eksperimen PhET. |
| `apps/web` & `apps/ai-service` | `vite.config.ts`, `manifest.webmanifest`, `apps/ai-service/routers/{ai_draw,quiz,hmer_fallback}.py` | Konfigurasi `vite-plugin-pwa` (Workbox offline shell) dan endpoint FastAPI tervalidasi untuk `AIWhiteboardStep`, Quiz Generator, Knowledge Graph, dan fallback HMER (`Pix2Text`/`RapidLaTeXOCR`). |

### 6.2 Urutan Eksekusi Bertahap & Kriteria Verifikasi

- **Sprint 1 — On-Device AI HMER (`onnxruntime-web`) & Non-Destructive Beautification**:
  - Bangun `hmer.worker.ts` (WebGPU + WASM fallback + cache lokal), `HmerConfirmChip.tsx` (debounce 600ms + *stale cancellation*), dan `beautificationEngine.ts` dengan toggle **`Asli ↔ Rapikan`**.
  - *Verifikasi*: Menulis rumus pecahan/pangkat/akar secara manual di kanvas (bahkan dalam kondisi *Network Offline* setelah model ter-cache) menghasilkan kandidat LaTeX dengan confidence score `< 400ms` tanpa drop FPS kanvas, dan tombol `Asli` mengembalikan stroke mentah 100% utuh.
- **Sprint 2 — OpenMAIC AI Whiteboard Drawing & Schema-Validated Simulation (`JSXGraph` + `Mafs`)**:
  - Implementasi `AIWhiteboardStep` Zod protocol di `whiteboard-core`, pemutar *Step-by-Step AI Drawing* di `WhiteboardCanvas.tsx`, dan `SimulationWidget.tsx` (minimal 5 template simulasi tervalidasi dengan slider live).
  - *Verifikasi*: Prompt *"Buat simulasi fungsi kuadrat dengan slider a, b, c"* menghasilkan widget simulasi tervalidasi dengan slider aktif tanpa pernah menjalankan `eval()`/kode bebas; seluruh objek buatan AI dapat diedit kembali oleh guru.
- **Sprint 3 — PhET Interactive Simulations Library & POE Experiment Mode + Live Quiz**:
  - Bangun `phetCatalog.ts`, `PhETSimulationWidget.tsx` (embed resmi + fallback tautan + atribusi `CC BY-NC 4.0`), mode eksperimen **Predict → Observe → Explain**, serta `QuizLauncherModal.tsx` (Live Poll & pembahasan bertahap).
  - *Verifikasi*: Simulasi PhET terbuka mulus di desktop & tablet dengan atribusi lisensi lengkap; uji 2 tab (Guru + Siswa) berhasil menyelesaikan 1 siklus Prediksi → Observasi → Kesimpulan dan 1 sesi Live Quiz real-time.
- **Sprint 4 — Offline-First PWA, Event-Based Replay Upgrade & Knowledge Explorer**:
  - Konfigurasi `vite-plugin-pwa` + `offlineSync.ts` (`dexie` IndexedDB queue), lengkapi `ReplayViewer.tsx` dengan timeline scrubber mencakup event simulasi/rumus + ekspor sesi, dan tambahkan `KnowledgeExplorerModal.tsx`.
  - *Verifikasi*: Mode *Offline* di Chrome DevTools tetap dapat membuka aplikasi, menggambar, memutar objek 3D, memakai kalkulator/HMER lokal, memutar ulang *Event-Based Replay*, lalu otomatis menyinkronkan data saat kembali *Online* (`pnpm test:all && pnpm build` lulus 100%).
