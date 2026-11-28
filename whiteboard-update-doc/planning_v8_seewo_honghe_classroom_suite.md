# Master Engineering Plan V8: Adaptasi Fitur Terbaik Seewo EasiNote 5 (`v5.2.4.12230`) & Honghe Whiteboard (`v1.0.1711.145`) ke AI Interactive Classroom

Dokumen spesifikasi ini mengekstrak **pola arsitektur dan fitur paling bernilai tinggi** dari hasil analisis *reverse engineering* **Seewo EasiNote 5 (`v5.2.4.12230`)** ([Seewo Download](https://www.seewo.com/support/customer/download)) dan **Honghe Whiteboard (`v1.0.1711.145`)** ([HiteCloud](https://pie.hitecloud.cn/pie?flag=klTO0iCyu8VmeNz8sDuPm91JmN8M6J42Cd9q478LCaFsPOGp8a8qTnZV9sHDRo6P), [HiteVision](https://www.hitevision.com/portal/list/index/id/31.html)), lalu mengadaptasinya secara **100% browser-native, ringan, dan bebas duplikasi** ke dalam **[xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/)**.

*(Catatan Audit Pre-Flight: Halaman commit GitHub terbaru tidak dapat diakses langsung pada sesi ini; pemetaan file dibangun di atas struktur terverifikasi hingga commit `27a7df1` + V7 AFFiNE BlockSuite. Sebelum memulai Sprint 1, jalankan `git log -n 5 --stat` di lokal untuk memverifikasi perubahan terbaru pada `PersonalRoomPage.tsx`, `NotesPage.tsx`, dan `router/index.tsx`).*

---

## 1. Seleksi Strategis: Apa yang Diambil vs. Apa yang Tidak Perlu Diambil

| Sumber Referensi | Fitur / Pola Arsitektur yang **DIADOPSI** ke Web | Fitur yang **SENGAJA DIKECUALIKAN** |
| :--- | :--- | :--- |
| **Seewo EasiNote 5 (`v5.2.4.12230`)** | 1. **Embedded MCP Server + JSON Property Mappers** (`EasiNote.McpServer.dll`) untuk kontrol kanvas deterministik oleh AI Agent.<br>2. **7 Aktivitas Gamifikasi Kelas** (`Choice`, `Classify`, `SuperClassify`, `GapFilling`, `GroupCompetition`, `Judge`, `TextMatch`).<br>3. **Dual-Screen Presenter Mode** (`DoubleScreen`) + **Spotlight / Tirai Layar**.<br>4. **Konverter Dua Arah `PPTX ↔ Whiteboard`** (`OfficeDocumentConverter`).<br>5. **Studio Instrumen Virtual (`Piano/Gitar`)** berbasis Web Audio + **Tata Surya 3D**. | Runtime .NET 6 desktop, driver hardware inframerah (`FlatFrogTouchFrame`), installer NSIS/DuiLib, `CefSharp` desktop, dan layanan cloud tertutup `*.seewo.com`. |
| **Honghe Whiteboard (`v1.0.1711.145`)** | 1. **Board-in-Board (`GCBoardInBoard`)** — papan coret mini mengambang di atas lab/dokumen/kamera.<br>2. **Document Camera / Webcam Visualizer (`GCShowCamera`)** dengan *freeze*, filter kontras kertas, & anotasi tinta langsung.<br>3. **Micro-Lecture Screen Recorder (`GCRec`)** versi browser (`MediaRecorder` + IndexedDB).<br>4. **Subject Tools Ringan**: Tabel Periodik Interaktif (`GCPeriodicTable`), Kertas 4-Garis-3-Kotak (`GC4Lines3Grids`), Kaca Pembesar (`GCMagnifier`). | Meta-installer 8 aplikasi 1.35 GB, Mosquitto MQTT lokal desktop, OBS C++ native, JRE 8 remote desktop, MDM pemblokir popup Windows, dan kamus Mandarin offline 43 MB. |

---

## 2. Pilar 1 — Classroom Canvas MCP Server & Property Mappers (Adaptasi `EasiNote.McpServer.dll`)

Salah satu inovasi terbaik pada Seewo EasiNote 5 `v5.2.4` adalah menghubungkan AI Agent ke kanvas melalui **Model Context Protocol (MCP)** menggunakan **Property Mappers ber-skema JSON** (`McpSlideProperties`, `McpElementLayoutProperties`, `McpTextProperties`, `McpShapeProperties`, `McpGeometry3DProperties`).

### 2.1 Arsitektur `packages/canvas-mcp` (Menggunakan [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk))
Bangun lapisan MCP standar yang memungkinkan **AI Assistant internal (`apps/ai-service`)** maupun **AI Agent eksternal** (Cursor, Claude, Gemini) membaca dan memodifikasi papan tulis secara aman dan deterministik:

```ts
// packages/canvas-mcp/src/propertyMappers.ts
import { z } from "zod";

export const ElementLayoutSchema = z.object({
  cx: z.number(),
  cy: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
});

export const McpGeometry3DPropertiesSchema = ElementLayoutSchema.extend({
  solidType: z.string(),
  params: z.record(z.number()),
  texturePreset: z.string().optional(),
  unfoldProgress: z.number().min(0).max(1).optional(),
  showGimbal: z.boolean().optional(),
});

export const McpCanvasToolRegistry = {
  "canvas.inspect_scene": "Mengembalikan ringkasan seluruh objek aktif (id, type, bbox, label, latex)",
  "canvas.upsert_element": "Menambah/memperbarui objek (shape2d, viz_solid, math_block, textbook_graph, activity)",
  "canvas.apply_layout_delta": "Menggeser, merapikan grid/alignment, atau mengubah ukuran batch objek",
  "canvas.create_activity": "Membuat salah satu dari 7 game kelas interaktif dengan soal tervalidasi Zod",
  "canvas.trigger_manimgx": "Memicu skill animasi 3D ManimGX dari ekspresi/topik tertentu",
} as const;
```

- **Transport Ganda**:
  - **In-Browser Direct Bus (`BroadcastChannel` / Zustand Action Bridge)** untuk AI Drawer internal (nol latensi).
  - **Streamable HTTP / WebSocket MCP Server** di `apps/api` atau `apps/ai-service` (mengikuti spesifikasi [`@modelcontextprotocol/server`](https://github.com/modelcontextprotocol/typescript-sdk)) sehingga agent eksternal dapat terhubung langsung ke sesi Whiteboard guru dengan token sesi!
- **Undo/Redo Atomik**: Setiap batch perintah MCP dibungkus sebagai satu transaksi `mcp.batch_applied` di `whiteboard-core` agar guru bisa menekan `Ctrl+Z` 1x untuk membatalkan seluruh perubahan AI.

---

## 3. Pilar 2 — 7 Aktivitas Gamifikasi Kelas Interaktif (Adaptasi `EasiNote.Activity.dll`)

Tambahkan modul **`ClassroomActivities`** (`apps/web/src/components/activities/`) yang dapat dijalankan di dalam widget kanvas (`object_type: "viz_activity"`), *full-screen* di proyektor, maupun disinkronkan ke HP siswa via Room.

| # | Jenis Aktivitas | Mekanik Interaksi (Touch & Mouse Friendly) | Contoh Penggunaan di Kelas |
| :-: | :--- | :--- | :--- |
| 1 | **`Choice`** *(Pilihan Ganda)* | Kartu soal + 2–4 opsi besar (mendukung rumus LaTeX/KaTeX), countdown timer, & efek suara benar/salah. | Kuis cepat rumus luas/volume atau konsep sains. |
| 2 | **`Classify`** *(Pengelompokan)* | Drag-and-drop kartu ke 2–3 keranjang kategori; item salah otomatis memantul balik (*spring bounce*). | Kelompokkan *Bangun Datar* vs *Bangun Ruang*, atau *Asam* vs *Basa*. |
| 3 | **`SuperClassify`** *(Klasifikasi Lanjutan)* | Multi-kategori (hingga 4 kategori) dengan mode skor tim, batas waktu, dan ringkasan kesalahan di akhir. | Klasifikasi fungsi linear, kuadrat, trigonometri, dan eksponen. |
| 4 | **`GapFilling`** *(Isian Rumpang)* | Kalimat/rumus dengan slot kosong; siswa menyeret chip jawaban (atau mengetik angka/LaTeX) ke slot kosong. | Melengkapi langkah pembuktian identitas trigonometri atau reaksi kimia. |
| 5 | **`GroupCompetition`** *(Kompetisi 2 Tim)* | **Layar Terbagi Kiri vs Kanan (*Split-Screen*)** untuk 2 siswa/tim berlomba menjawab cepat secara bersamaan (mendukung multi-touch di layar sentuh & HP siswa!). | Adu cepat hitung cepat, pencocokan sifat bangun ruang, atau kuis bab. |
| 6 | **`Judge`** *(Benar / Salah)* | Pernyataan muncul satu per satu dengan tombol besar `Benar ✓` / `Salah ✕` dan indikator *streak*. | Uji miskonsepsi konsep matematika & fisika. |
| 7 | **`TextMatch`** *(Pencocokan Pasangan)* | Kartu sisi kiri & kanan (teks, gambar, atau rumus KaTeX); klik/tarik garis untuk memasangkan dengan animasi menghilang saat cocok. | Pasangkan *Rumus Volume ↔ Nama Bangun Ruang* atau *Unsur ↔ Simbol Kimia*. |

- **AI Activity Generator**: Tombol **`Buat Game dari Papan Ini`** pada `AITeachingDrawer.tsx` membaca objek/catatan aktif via MCP `canvas.inspect_scene` lalu menghasilkan JSON soal tervalidasi Zod untuk langsung dimainkan di kelas!

---

## 4. Pilar 3 — Teaching Utility Suite (Adaptasi Honghe & EasiNote 5)

### 4.1 Board-in-Board (`BoardInBoardOverlay.tsx` — Adaptasi `GCBoardInBoard.exe`)
- Papan tulis mini mengambang (`position: fixed`, `z-index` di atas Lab Virtual, AFFiNE Docs, Game Kelas, & Kamera Visualizer) yang dapat di-**drag**, di-**resize**, diubah opasitasnya (mode **Transparan Overlay** untuk mencoret langsung di atas simulasi vs mode **Papan Putih/Hitam Mini** untuk corat-coret hitungan sampingan), serta di-**minimize** menjadi satu pill kecil di tepi layar.
- Mendukung tombol **`Kirim Coretan ke Whiteboard Utama`** agar catatan singkat tidak hilang.

### 4.2 Dual-Screen Presenter Mode (`PresenterViewPage.tsx` — Adaptasi `EasiNote.DoubleScreen.dll`)
- Menggunakan **`BroadcastChannel("aic-presenter-sync")`** + `window.open("/presenter", "_blank")` (berjalan 100% lokal di browser tanpa server saat laptop tersambung ke proyektor/Smart TV via *Extended Display*):
  - **Layar Proyektor (`/presenter`)**: Hanya menampilkan kanvas/slide/3D/game secara bersih *full-screen* tanpa sidebar, tanpa catatan guru, dan tanpa kunci jawaban.
  - **Layar Laptop Guru**: Menampilkan *Presenter Console* (kanvas kontrol + catatan pribadi guru + pratinjau halaman/frame berikutnya + tombol **Spotlight / Kaca Pembesar**, **Tirai Layar / Curtain Shade** yang bisa ditarik dari atas/bawah/kiri/kanan untuk menyembunyikan jawaban, dan **Countdown Timer**).

### 4.3 Document Camera / Webcam Visualizer (`DocumentVisualizerModal.tsx` — Adaptasi `GCShowCameraApp.exe`)
- Memanfaatkan **`navigator.mediaDevices.getUserMedia`** (mendukung webcam USB, kamera dokumen fisik, maupun **kamera HP guru yang di-stream via WebRTC P2P** dari `ControllerPage.tsx`!):
  - Kontrol visual: **Freeze Frame** (bekukan gambar buku/LKS siswa), **Rotate $90^\circ/180^\circ$**, **Zoom Digital (`1x–4x`)**, **Filter Kontras Dokumen** (CSS/Canvas filter `contrast(1.35) brightness(1.08)` untuk memperjelas tulisan pensil di kertas), **Anotasi Tinta Langsung di Atas Feed Kamera**, dan tombol 1-klik **`Tangkap ke Whiteboard`** (otomatis masuk sebagai `ImageObjectProps` di `mediaStore`!).

### 4.4 Browser Micro-Lecture Screen Recorder (`MicroLectureRecorder.ts` — Adaptasi `GCRec.exe`)
- Menggunakan **`navigator.mediaDevices.getDisplayMedia`** (tab/layar whiteboard) + opsional audio mikrofon (`getUserMedia`) + opsional PiP kamera guru → digabungkan lewat `MediaRecorder` (`video/webm;codecs=vp9,opus`).
- Hasil rekaman tersimpan sebagai Blob di **`dexie` IndexedDB** (`recordings` table, mirip `Rec.db` Honghe) lengkap dengan daftar rekaman, pemutar instan, dan tombol **`Unduh Video`**.

---

## 5. Pilar 4 — Bidirectional Office Converter (`PPTX ↔ Whiteboard`)

Mengadaptasi kemampuan `EasiNote.OfficeDocumentConverter.exe` sepenuhnya di browser (tanpa memerlukan instalasi Microsoft PowerPoint):

1. **Export `Whiteboard / Notes / AFFiNE Frames → .PPTX`** (`apps/web/src/lib/pptxExporter.ts`):
   - Menggunakan **[`pptxgenjs`](https://www.npmjs.com/package/pptxgenjs)** (`pnpm add pptxgenjs`, standar OOXML kompatibel PowerPoint, Keynote, LibreOffice, Google Slides).
   - Memetakan setiap halaman/frame menjadi 1 slide `16:9`:
     - Teks & judul → `slide.addText(...)` (tetap bisa diedit di PowerPoint!).
     - Bangun dasar 2D → `slide.addShape(...)`.
     - Tabel → `slide.addTable(...)`.
     - Objek 3D (`TongchuangSolidWidget`), Rumus KaTeX, Grafik, & Coretan Tinta → dirender sebagai PNG transparan 2x DPR lalu disisipkan via `slide.addImage(...)` pada koordinat proporsional `(x, y, w, h)` yang akurat.
2. **Import `.PPTX / .PDF → Whiteboard Pages`** (`apps/web/src/lib/pptxImporter.ts`):
   - **Jalur `.PDF`**: Memanfaatkan `pdfjs-dist` untuk merender tiap halaman ke layer gambar terkunci (siap dicoret-coret & dianotasi).
   - **Jalur `.PPTX` Client-Side**: Membuka arsip `.pptx` dengan `jszip`, mem-parsing `ppt/slides/slideN.xml` & `ppt/media/*` untuk mengekstrak teks, gambar, dan bangun dasar menjadi objek `BoardObject` yang **editable** di Whiteboard (ditambah fallback render halaman jika slide memakai efek Office kompleks).

---

## 6. Pilar 5 — Subject Tools Lintas Mapel (Lazy-Loaded Plugin Modules)

Agar bundle utama `apps/web` tetap cepat, seluruh subject tools baru dimuat secara **`React.lazy()`** hanya saat dibuka guru:

| Modul Plugin Baru | Referensi Asal | Implementasi Browser-Native |
| :--- | :--- | :--- |
| **Interactive Periodic Table (`PeriodicTableWidget.tsx`)** | Honghe `GCPeriodicTablePlugin` | 118 unsur lengkap dalam JSON terkompresi (`< 25 KB`), filter golongan/blok/wujud, klik unsur menampilkan detail atom + tautan 1-klik ke lab **`BuildAtomLab`** yang sudah ada di repo! |
| **Interactive 3D Solar System (`SolarSystemWidget.tsx`)** | EasiNote `WebSolarSystem` & Honghe `GCPlanetsPlugin` | Memanfaatkan **`three`** yang sudah terpasang di `apps/web`: matahari + 8 planet mengorbit elips, slider kecepatan waktu, fokus kamera per planet, dan kartu fakta astronomi. |
| **Virtual Musical Instrument Studio (`InstrumentStudioModal.tsx`)** | EasiNote `InstrumentTool` & Honghe `GCPiano` | Menggunakan **[`Tone.js`](https://tonejs.github.io/)** (`pnpm add tone`, sintesis Web Audio API tanpa aset audio puluhan MB!): **Piano Interaktif (2–3 oktaf + keyboard PC)** dan **Fretboard Gitar**, lengkap dengan visualisasi **gelombang bunyi & frekuensi ($f\text{ Hz}$)** real-time untuk lintas mapel Musik & Fisika! |
| **Classroom Focus Utilities (`SpotlightOverlay.tsx` & `CurtainShade.tsx`)** | Honghe `GCMagnifier` & EasiNote Teaching Tools | **Spotlight** (lingkaran sorot bergerak meredupkan area sekitar), **Magnifier** (kaca pembesar 2x/3x pada area kanvas), **Tirai Layar**, dan **Kertas 4-Garis-3-Kotak** di `/notes`. |

---

## 7. Pemetaan File Target & Roadmap Implementasi V8

### 7.1 Pemetaan Perubahan pada Struktur Repositori
| Paket / Direktori | File Target | Ringkasan Implementasi |
| :--- | :--- | :--- |
| `packages/canvas-mcp` *(baru)* | `src/propertyMappers.ts`, `src/mcpBridge.ts`, `src/mcpBridge.test.ts` | Zod Property Mappers & MCP tool registry (`canvas.inspect_scene`, `canvas.upsert_element`, `canvas.apply_layout_delta`, `canvas.create_activity`) berbasis `@modelcontextprotocol/sdk`. |
| `packages/whiteboard-core` | `src/index.ts`, `src/reducer.ts` | Tambah `object_type: "viz_activity"` + transaksi atomik `mcp.batch_applied` untuk undo/redo 1-klik. |
| `apps/web/src/components/activities` *(baru)* | `ActivityWidget.tsx`, `ChoiceActivity.tsx`, `ClassifyActivity.tsx`, `GapFillingActivity.tsx`, `GroupCompetitionActivity.tsx`, `JudgeActivity.tsx`, `TextMatchActivity.tsx` | 7 game kelas interaktif (touch/mouse friendly, audio feedback, split-screen 2 tim, & generator soal AI). |
| `apps/web/src/components/classroom` | `BoardInBoardOverlay.tsx` *(baru)*, `DocumentVisualizerModal.tsx` *(baru)*, `SpotlightCurtainOverlay.tsx` *(baru)* | Papan mini mengambang, kamera dokumen/HP visualizer dengan filter kontras & anotasi tinta, serta spotlight/tirai/magnifier. |
| `apps/web/src/components/subjects` *(baru)* | `PeriodicTableWidget.tsx`, `SolarSystemWidget.tsx`, `InstrumentStudioModal.tsx` | Subject tools lazy-loaded: Tabel Periodik 118 unsur, Tata Surya 3D Three.js, & Piano/Gitar Web Audio (`Tone.js`). |
| `apps/web/src/lib` | `pptxExporter.ts` *(baru)*, `pptxImporter.ts` *(baru)*, `microLectureRecorder.ts` *(baru)*, `presenterSync.ts` *(baru)* | Konverter `PPTX ↔ Whiteboard` (`pptxgenjs` + `jszip`), perekam micro-lecture `MediaRecorder` → `dexie`, dan sinkronisasi Dual-Screen `BroadcastChannel`. |
| `apps/web/src/pages` & `router` | `PresenterViewPage.tsx` *(baru)*, `PersonalRoomPage.tsx`, `NotesPage.tsx`, `router/index.tsx` | Rute `/presenter` untuk layar proyektor bersih, tombol akses cepat Teaching Utilities & 7 Game Kelas, serta template kertas `4-Garis-3-Kotak`. |

### 7.2 Urutan Sprint & Kriteria Verifikasi

- **Sprint 1 — Classroom Canvas MCP Bridge & 7 Aktivitas Gamifikasi Kelas**:
  - Bangun `packages/canvas-mcp` (Zod Property Mappers + transaksi atomik undo/redo) + 7 komponen game di `components/activities/` + tombol *AI Generate Game* di `AITeachingDrawer.tsx`.
  - *Verifikasi*: Unit test `mcpBridge.test.ts` lulus 100% (validasi skema + undo 1-klik); seluruh 7 game berjalan mulus di Desktop & Tablet (termasuk *Split-Screen* `GroupCompetition`).
- **Sprint 2 — Teaching Utility Suite (Board-in-Board, Dual-Screen Presenter, Document Visualizer, Micro-Lecture Recorder)**:
  - Implementasi `BoardInBoardOverlay`, `PresenterViewPage` (`/presenter` via `BroadcastChannel`), `DocumentVisualizerModal` (termasuk stream kamera HP via `remotePeerBridge`), `SpotlightCurtainOverlay`, dan `MicroLectureRecorder` → `dexie`.
  - *Verifikasi*: Membuka `/presenter` di jendela kedua menyinkronkan perubahan kanvas `< 30ms` tanpa menampilkan catatan guru; `DocumentVisualizer` berhasil *freeze*, anotasi tinta, dan *snip* ke whiteboard; `MicroLectureRecorder` menyimpan & memutar ulang `.webm` dari IndexedDB.
- **Sprint 3 — Bidirectional `PPTX ↔ Whiteboard` Converter & Cross-Subject Lazy Tools**:
  - Implementasi `pptxExporter.ts` (`pptxgenjs`), `pptxImporter.ts` (`jszip` + XML parser), `PeriodicTableWidget`, `SolarSystemWidget` (Three.js), `InstrumentStudioModal` (`Tone.js`), serta kertas `4-Garis-3-Kotak`.
  - *Verifikasi*: Ekspor whiteboard berisi teks, 3D solid, dan grafik ke `.pptx` menghasilkan file OOXML valid yang terbuka rapi di PowerPoint/LibreOffice; seluruh subject tools di-lazy-load (tidak menaikkan ukuran bundle awal `index.js`) dan `pnpm test:all && pnpm build` lulus 100%.
