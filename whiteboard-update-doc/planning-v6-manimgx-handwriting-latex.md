# Master Engineering Specification V6: Integrasi `ManimGX` (3D Mathematical Animation Skill) & Unified Handwriting-to-LaTeX Pipeline (Whiteboard + Notes)

Dokumen spesifikasi teknis ini dirancang sebagai blueprint siap-implementasi untuk mengintegrasikan **[`academa-labs/manimgx`](https://github.com/academa-labs/manimgx)** ([Dokumentasi](https://manimgx.academa.ai/), [`SKILL.md`](https://github.com/academa-labs/manimgx/blob/main/skills/manimgx/SKILL.md)) ke dalam **[xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/)** serta menyatukan pipeline **Handwriting → LaTeX → Select → 3D Model / Grafik / Animasi 3D ManimGX** pada halaman **Whiteboard** maupun **Notes**.

*(Catatan Audit Pre-Flight: Commit [`6d39282`](https://github.com/xDzaky/ai-interactive-classroom/commit/6d39282b679ecbdb92544a95d864491d52c6b844) tidak dapat dibuka langsung karena pembatasan akses browser pada sesi ini. Arsitektur di bawah dibangun di atas baseline terverifikasi hingga commit [`32f3dd3`](https://github.com/xDzaky/ai-interactive-classroom/commit/32f3dd31896359d08b2de76ad9001db83beb1ae9) + modul V5; sebelum memulai Sprint 1, agent implementasi wajib menjalankan `git show --stat 6d39282` di lokal untuk menyelaraskan nama file terbaru di `apps/web/src/pages/notes/` dan `apps/web/src/workers/`).*

---

## 1. Analisis Teknis `academa-labs/manimgx` & Strategi Integrasi

Berdasarkan repositori resmi [`academa-labs/manimgx`](https://github.com/academa-labs/manimgx) dan [`skills/manimgx/SKILL.md`](https://github.com/academa-labs/manimgx/blob/main/skills/manimgx/SKILL.md):

* **Core Engine**: Mengimplementasikan API Python **Manim Community Edition** (`import manimgx as m`, `Scene`, `ThreeDScene`, `MathTex`, `VGroup`, `ValueTracker`, `.animate`) di atas core **Rust + `wgpu`** (90,6× lebih cepat dari Manim CE pada benchmark resminya).
* **Zero External LaTeX/FFmpeg Setup**: Typesetting matematika menggunakan **Typst** bawaan + **`mitex`** (penerjemah LaTeX → Typst), font & video encoder sudah termasuk dalam paket.
* **Dual Execution Mode**:
  1. **Browser-Native (`npm install manimgx`)**: Menjalankan Python di **Pyodide Web Worker** dan merender langsung via **WebGPU** tanpa server render!
  2. **Server-Side (`pip install manimgx`, Python 3.13+)**: Merender MP4 1080p60/720p30 secara ultra-cepat (Linux wheel sudah memaketkan Mesa `lavapipe` untuk fallback CPU tanpa GPU) dan menyediakan CLI **`manimgx inspect`** untuk menghasilkan storyboard serta pemeriksaan layout 2D (*overlap/clipping*) secara otomatis.
* **Voiceover Sync**: Mendukung `self.say()` untuk menyinkronkan animasi dengan narasi suara.
* **Kepatuhan Lisensi**: Kode inti ManimGX berlisensi **MIT**, sedangkan *native Python wheels* menyertakan `x264` (**GPL-3.0-or-later**) dan `FFmpeg` (**LGPL-2.1-or-later**). Untuk distribusi web murni, jalankan paket browser (`npm install manimgx`) sebagai jalur utama, dan pisahkan *native render worker* sebagai microservice opsional yang patuh ketentuan GPL/LGPL.

### Arsitektur Hybrid Dual-Mode untuk AI Interactive Classroom

```text
[User Menulis Tangan (Whiteboard / Notes)]
        │
        ▼ (Unified Handwriting -> LaTeX Engine: hmer.worker.ts / Fallback FastAPI)
[Blok LaTeX / Teks Matematika Terpilih (MathTextBlockWidget / Selection Range)]
        │
        ▼ (Intent & Eligibility Analyzer: packages/math-core/src/manimgxRouter.ts)
   ┌───────────────────────────────────────────────────────────────────────┐
   │  Aksi Konteks Muncul pada Objek/Teks Terpilih:                        │
   │  [1] Model 3D Interaktif (Three.js — Putar/Iris/Lipat real-time)      │
   │  [2] Grafik / Chart Presisi (TextbookGraph / StatChart)               │
   │  [3] Animasi 3D ManimGX (Video/Canvas Animasi Matematis 3Blue1Brown)  │
   └───────────────────────────────────────────────────────────────────────┘
        │ (Jika pilih [3] Animasi 3D ManimGX)
        ▼
[ManimGX Scene Authoring & Security Sandbox]
   ├── Jalur Cepat (Deterministik < 50ms): Template Python terverifikasi untuk
   │     y=f(x), z=f(x,y), bangun 3D, transformasi matriks, trigonometri, chart
   ├── Jalur AI Agent (LLM + ManimGX SKILL.md / llms.txt):
   │     Untuk soal bebas / pembuktian bertahap / animasi kustom kompleks
   └── AST Security Validator (Whitelist import: manimgx, math, numpy; blokir os/sys/exec)
        │
        ▼
[Execution Router — Automatic Runtime Selection]
   ├── Priority 1 (WebGPU Tersedia): Browser Pyodide Worker (`manimgx` npm) -> Render lokal 0-server
   ├── Priority 2 (WebGPU Tidak Tersedia / Export MP4 HD): `apps/ai-service` (`/api/manimgx/render`)
   │     └─► Jalankan `manimgx inspect` (cek overlap/clipping, max 2x self-heal) -> `manimgx render`
   └── Fallback Darurat (Offline & Tanpa WebGPU): Konversi otomatis ke Three.js / TextbookGraphWidget
        │
        ▼
[ManimGxWidget.tsx di Whiteboard & Notes]
   (Play/Pause, Timeline Scrubber, Speed 0.5x–2x, Edit Kode Python, Export MP4, Convert ke 3D Interaktif)
```

---

## 2. Unified Handwriting-to-LaTeX Pipeline (Wajib Aktif di Whiteboard & Notes)

Agar tulisan tangan guru/siswa di **Whiteboard** maupun di halaman **Notes** dapat langsung diubah menjadi format **LaTeX** lalu diseleksi untuk dijadikan **Model 3D**, **Grafik/Chart**, atau **Animasi 3D ManimGX**, kedua halaman wajib berbagi satu engine tunggal.

### 2.1 Shared Hook & State (`apps/web/src/hooks/useHandwritingToLatex.ts`)

```ts
export interface InkToLatexCandidate {
  groupId: string;
  strokeIds: string[];
  bboxWorld: { x: number; y: number; w: number; h: number };
  latex: string;              // Mis: "z = \\sin(x)\\cos(y)" atau "\\cos 2\\theta = 2\\cos^2\\theta - 1"
  plainText?: string;         // Jika campuran teks + rumus
  confidence: number;         // [0..1]
  detectedKind: "formula_2d" | "surface_3d" | "solid_3d" | "trig_identity" | "chart_data" | "text_math";
  engine: "onnx_local" | "fastapi_fallback";
}
```

### 2.2 Alur Konversi Non-Destruktif di Whiteboard & Notes

1. **Stroke Grouping (Spasial-Temporal)**:
   * Setiap kali `pointerup` pada alat `Pen` (mouse, touchscreen, atau stylus dengan *palm rejection*), gabungkan stroke yang berdekatan secara spasial (jarak antar-bbox $\le 1.4 \times \text{medianStrokeHeight}$) dan temporal ($\Delta t \le 1.8\text{ detik}$) ke dalam satu `StrokeCluster`.
   * Pengguna juga dapat menggunakan alat **Lasso Select** di Whiteboard maupun Notes untuk melingkari tulisan tangan mana pun dan menekan **`Ubah ke LaTeX`** secara manual.
2. **Inferensi Lokal 60fps (`hmer.worker.ts` — ONNX Runtime Web)**:
   * Debounce `600ms` setelah berhenti menulis; kirim ke Web Worker dengan `generationId` (buang hasil *stale* jika user lanjut menulis sebelum inferensi selesai).
   * Execution provider: `['webgpu', 'wasm']`; jika offline & model sudah ter-cache di Cache API/OPFS, tetap bekerja 100% lokal.
   * Jika `confidence < 0.72` dan online, tawarkan atau jalankan fallback ke `apps/ai-service` (`/api/hmer/recognize` berbasis `Pix2Text` / `RapidLaTeXOCR`).
3. **Konversi ke Blok LaTeX Selectable (`MathTextBlockWidget`)**:
   * Tampilkan *Confirmation Chip* non-intrusif di atas tulisan tangan: pratinjau KaTeX + tombol **`✓ Jadi LaTeX`** | **`✎ Edit`** | **`✕`**.
   * Saat dikonfirmasi, stroke tangan diubah menjadi objek `math_block` (`MathLive`) dengan menyimpan `props.originalStrokes = strokes` (sehingga guru bisa toggle kembali ke tulisan tangan asli kapan saja!).
4. **Bridging Langsung ke 3D Model & ManimGX**:
   * Begitu teks/rumus berada dalam format LaTeX (atau diseleksi di dalam blok teks/catatan), `manimgxRouter.ts` langsung menganalisis isi LaTeX-nya dan menampilkan **Contextual Action Pill**:
     * **`Model 3D`** → Membuat objek interaktif `viz_solid` (`TongchuangSolidWidget`, bisa diputar dengan 3-Axis Gimbal Ring, diiris, dilipat).
     * **`Grafik / Chart`** → Membuat `TextbookGraphWidget` / `StatChartWidget`.
     * **`Animasi ManimGX`** → Memicu pipeline **ManimGX 3D Animation Skill** dan menanamkan `ManimGxWidget` langsung di samping rumus!

---

## 3. Spesifikasi Skill & Engine `ManimGX` untuk AI Interactive Classroom

### 3.1 Math-to-ManimGX Intent Router (`packages/math-core/src/manimgxRouter.ts`)

Fungsi `analyzeForManimGX(selection: { latex?: string; text?: string })` mendeteksi pola matematika yang dapat dianimasikan:

| Kategori Input Terpilih | Contoh Input User (Teks / LaTeX) | Mode Template / Skill ManimGX | Output Animasi 3D / 2D |
| :--- | :--- | :--- | :--- |
| **Permukaan 3D & Kalkulus** | `z = \sin(x)\cos(y)`, `z = x^2 - y^2`, `x^2 + y^2 + z^2 = 9` | `ThreeDScene` + `Surface` + `ThreeDAxes` + `begin_ambient_camera_rotation` | Permukaan 3D berwarna gradien dengan sumbu $(X,Y,Z)$, kamera mengorbit halus, dan label rumus `MathTex` tetap di layar (`add_fixed_in_frame_mobjects`). |
| **Bangun Ruang & Geometri 3D** | `"Kubus rusuk 5 cm"`, `V = \frac{1}{3}\pi r^2 t`, `"Irisan kubus"` | `ThreeDScene` + `Cube`/`Cylinder`/`Cone`/`Sphere`/`Prism` + `ValueTracker` | Animasi pembentukan bangun 3D, penyorotan rusuk/tinggi/jari-jari, animasi perubahan dimensi via `ValueTracker`, dan kemunculan rumus volume bertahap. |
| **Grafik Fungsi & Turunan/Integral** | `y = \sin x, 0 \le x \le 2\pi`, `\int_0^2 x^2 dx`, `y = x^2 - 4x + 3` | `Scene` + `Axes` + `plot` + `get_riemann_rectangles` / `TangentLine` | Animasi menggambar kurva, garis singgung bergerak mengikuti `ValueTracker`, arsiran integral Riemann menyempit, dan penanda `maks.`/`min.`. |
| **Transformasi Aljabar Linear** | `\begin{bmatrix} 2 & 1 \\ 0 & 1 \end{bmatrix}` | `LinearTransformationScene` / `NumberPlane` + `ApplyMatrix` | Animasi grid bidang/ruang terdistorsi mulus oleh matriks, vektor basis $\hat{i}, \hat{j}$ bergerak, dan luas persegi satuan berubah sebesar \$ |
| **Diagram & Chart Data** | `A: 30, B: 45, C: 25` atau tabel data di catatan | `Scene` + `BarChart` / `Axes` animated bars & labels | Animasi batang/kurva chart tumbuh mulus dengan label angka berhitung naik (`DecimalNumber` + `ValueTracker`). |
| **Pembuktian / Soal Bebas** | `"Buktikan \cos 2\theta = 2\cos^2\theta - 1"` atau teks soal cerita | **AI Agent Skill (`skills/manimgx/SKILL.md`)** via `apps/ai-service` | LLM menulis scene Python ManimGX lengkap → validasi AST → `manimgx inspect` (cek overlap) → render animasi bertahap + opsional narasi `self.say()`. |

### 3.2 Kontrak Keamanan Python AST Sandbox (`apps/ai-service/services/manimgx_sandbox.py` & Browser Worker)

Setiap kode Python ManimGX (baik dari LLM maupun hasil edit guru di `ManimGxWidget`) wajib lolos validator AST sebelum dijalankan:

* **Allowed Imports**: Hanya `manimgx`, `math`, `numpy`, `typing`, `dataclasses`.
* **Forbidden Nodes / Calls**: Blokir keras `os`, `sys`, `subprocess`, `socket`, `http`, `urllib`, `pathlib`, `shutil`, `open`, `eval`, `exec`, `compile`, `__import__`, `getattr` pada dunder (`__class__`, `__subclasses__`, `__globals__`).
* **Resource Limits**: Maksimum durasi animasi `30 detik`, resolusi pratinjau `1280×720 @ 30fps` (ekspor HD `1920×1080 @ 60fps`), batas waktu eksekusi worker `15 detik` dengan `AbortController` / process kill.

### 3.3 Self-Healing Render Loop di `apps/ai-service` (Mengikuti `SKILL.md` ManimGX)

```python
# Pseudocode alur apps/ai-service/routers/manimgx.py
1. terima { latex, text, mode, resolution, includeVoiceover }
2. jika cocok template deterministik -> generate Python dari template teruji (0 latency LLM)
   selain itu -> panggil LLM dengan system prompt dari `skills/manimgx/SKILL.md` + API primer `llms.txt`
3. validasi kode dengan `validate_manimgx_ast(code)`
4. jalankan `manimgx inspect scene.py GeneratedScene -t 0.5,end`
   - jika terdapat error sintaks/runtime atau warning 2D overlap/clipping -> kirim balik log ke LLM untuk perbaikan (maksimal 2 iterasi)
5. jalankan `manimgx render scene.py GeneratedScene -r 1280x720 --fps 30 -o out.mp4`
6. kembalikan `{ videoUrl, storyboardUrls, pythonSource, sceneClass, durationSec, inspectWarnings }`
```

### 3.4 Skema Objek Kanvas & Widget (`ManimGxWidget.tsx`)

Tambahkan `object_type: "viz_manimgx"` pada `BoardObjectSchema` di `packages/whiteboard-core/src/index.ts` agar berperilaku penuh sebagai objek whiteboard & notes (OBB drag/resize/rotate, undo/redo, tersimpan di IndexedDB):

```ts
export interface ManimGxObjectProps {
  cx: number;
  cy: number;
  width: number;            // default 480 (16:9 -> height 270)
  height: number;
  rotation: number;
  sourceLatex: string;      // Rumus/teks asal yang diseleksi
  linkedSourceId?: string;  // ID MathTextBlock / NoteBlock asal
  pythonCode: string;       // Kode Python ManimGX yang dapat diedit ulang
  sceneClass: string;
  runtimeMode: "browser_webgpu" | "server_mp4";
  videoAssetId?: string;    // Disimpan di mediaStore (IndexedDB) untuk mode offline
  posterAssetId?: string;   // Frame pratinjau saat paused/offscreen
  status: "idle" | "generating" | "inspecting" | "rendering" | "ready" | "error";
  errorMessage?: string;
}
```

**Kontrol UI Ringkas pada `ManimGxWidget.tsx`**:

* **Player Bar**: `Play / Pause`, *Timeline Scrubber*, `Loop`, `Speed (0.5x | 1x | 1.5x | 2x)`, `Fullscreen`.
* **Action Bar**: `Edit Kode` (drawer editor Python + tombol **`Render Ulang`**), `Jadikan 3D Interaktif` (buka versi Three.js jika bangun ruang/permukaan 3D), `Unduh MP4`, `Hapus`.

---

## 4. Pemetaan File Target & Roadmap Implementasi V6

### 4.1 Pemetaan File pada Repositori

| Paket / Direktori | File Target | Perubahan Utama |
| :--- | :--- | :--- |
| `packages/whiteboard-core` | `src/index.ts`, `src/reducer.ts` | Tambah `object_type: "viz_manimgx"` dengan `ManimGxObjectProps` serta dukungan `originalStrokes` pada `math_block` untuk *non-destructive handwriting-to-LaTeX*. |
| `packages/math-core` | `src/manimgxRouter.ts` (baru), `src/manimgxTemplates.ts` (baru), `src/manimgxRouter.test.ts` (baru) | Detektor kelayakan seleksi teks/LaTeX → ManimGX dan generator template Python ManimGX deterministik (`ThreeDScene`, `Surface`, `Axes`, `BarChart`, `ApplyMatrix`, `Cube/Prism/Cone/Sphere`). |
| `apps/web/src/hooks` & `workers` | `useHandwritingToLatex.ts` (baru), `hmer.worker.ts`, `manimgx.worker.ts` (baru) | Hook tunggal *Handwriting → LaTeX* yang dipakai bersama di `WhiteboardCanvas.tsx` dan `NotesCanvas.tsx`; dedicated Web Worker untuk menjalankan browser package `manimgx` (Pyodide + WebGPU). |
| `apps/web/src/components/math` | `ManimGxWidget.tsx` (baru), `MathTextBlockWidget.tsx` | Widget pemutar & editor animasi 3D ManimGX di kanvas; tambahkan tombol **`Animasi 3D (ManimGX)`** & **`Model 3D`** pada menu seleksi rumus/LaTeX. |
| `apps/web/src/pages/whiteboard` & `pages/notes` | `WhiteboardCanvas.tsx`, `WhiteboardOverlay.tsx`, `NotesCanvas.tsx` | Integrasikan `useHandwritingToLatex` + *Lasso-to-LaTeX* di kedua halaman; render `ManimGxWidget` melalui `WhiteboardOverlay` dengan sinkronisasi `ViewportController` & OBB; tambah opsi **`Animasi ManimGX`** pada `TongchuangRadialWheel`. |
| `apps/ai-service` | `skills/manimgx/SKILL.md` (diimpor dari `academa-labs/manimgx`), `services/manimgx_sandbox.py` (baru), `routers/manimgx.py` (baru) | Endpoint `/api/manimgx/generate` & `/api/manimgx/render` dengan Python AST sandbox, integrasi LLM menggunakan `SKILL.md`, *self-healing* lewat `manimgx inspect`, dan caching hasil render. |

### 4.2 Urutan Sprint & Kriteria Verifikasi

* **Sprint 1 — Unified Handwriting → LaTeX di Whiteboard & Notes**:
  * Pasang `useHandwritingToLatex.ts` + *Lasso-to-LaTeX* + chip konfirmasi KaTeX di `WhiteboardCanvas.tsx` dan `NotesCanvas.tsx` (non-destruktif dengan `originalStrokes`), serta tombol kontekstual **`Model 3D`**, **`Grafik/Chart`**, dan **`Animasi ManimGX`** pada setiap blok LaTeX terpilih.
  * *Verifikasi*: Menulis rumus dengan tangan (mouse/touch/stylus) di Whiteboard **dan** di Notes berubah menjadi blok LaTeX yang bisa diseleksi; klik `Model 3D` langsung membangun `viz_solid` yang akurat tanpa error.
* **Sprint 2 — Deterministic `ManimGX` Templates + Browser WebGPU Worker & `ManimGxWidget`**:
  * Bangun `manimgxRouter.ts`, `manimgxTemplates.ts`, `manimgx.worker.ts` (`npm install manimgx` + deteksi `navigator.gpu`), dan `ManimGxWidget.tsx` terintegrasi dengan `WhiteboardOverlay`.
  * *Verifikasi*: Unit test `manimgxRouter.test.ts` lolos 100%; memilih `z = \sin(x)\cos(y)` atau `y = x^2 - 4` lalu klik **`Animasi ManimGX`** memutar animasi 3D mulus di dalam kanvas Whiteboard & Notes dengan kontrol play/scrub/edit kode.
* **Sprint 3 — Server-Side `apps/ai-service` ManimGX Skill + AST Sandbox & `manimgx inspect` Self-Healing**:
  * Tambahkan `skills/manimgx/SKILL.md` ke `apps/ai-service`, bangun `manimgx_sandbox.py` (AST whitelist), dan `routers/manimgx.py` (LLM authoring + `manimgx inspect` auto-fix loop + `manimgx render` MP4 fallback untuk perangkat non-WebGPU + caching blob ke IndexedDB).
  * *Verifikasi*: Unit test keamanan AST menolak `import os`, `__import__`, dan `eval`; seleksi teks pembuktian matematika bebas menghasilkan video MP4 animasi 3D yang bersih dari overlap, dapat diputar offline dari cache, dan seluruh `pnpm test:all && pnpm build` lulus 100%.