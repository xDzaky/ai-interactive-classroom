# Master Engineering Plan V7: Integrasi Fitur `toeverything/AFFiNE` (Clone/Reuse BlockSuite — Zero Rebuild from Scratch) ke AI Interactive Classroom

Dokumen perencanaan ini disusun berdasarkan audit commit terbaru pada repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/) hingga commit **`27a7df1`** (26 Nov 2026) serta analisis arsitektur repositori **[toeverything/AFFiNE](https://github.com/toeverything/AFFiNE)** (v0.27.4, lisensi **MIT**).

**Prinsip Utama:** **JANGAN membangun ulang (*rebuild from scratch*) fitur yang sudah dimiliki AFFiNE/BlockSuite.** Gunakan paket resmi `@blocksuite/*` dan/atau *sparse-clone* direktori `blocksuite/` dari repositori AFFiNE, lalu konfigurasi & sambungkan (*bridge*) dengan engine unik milik **AI Interactive Classroom** (Three.js 3D Gimbal/Unfold, ManimGX, Excalidraw, Handwriting-to-LaTeX, dan 12 Native Virtual Labs).

---

## 1. Audit Baseline Commit Terbaru (`27a7df1`) & Peta Fitur Tanpa Duplikasi

Berdasarkan riwayat commit terbaru di `xDzaky/ai-interactive-classroom` (`main`):
- **`27a7df1`** *(26 Nov 2026)*: `feat(whiteboard,notes): zero-lag white ManimGX, 1:1 viewport lock, centered 2D->3D sizing, 2D/3D copy-paste, mouse select icon, and Notes hand/drag`
- **`2044fbe`** *(25 Nov 2026)*: `fix(v6): inner 3D gimbal, 3D zoom clamp, always-beside 2D->3D card, text tool, and ManimGX Cartesian circle`
- **`9ac9169`** *(25 Nov 2026)*: `feat(v6): capability-filtered Gaya & Properti, ManimGX 3D animation engine, AST sandbox, and unified Handwriting-to-LaTeX`
- **`6d39282`** *(25 Nov 2026)*: `feat(excalidraw): add full Excalidraw toolbar, style inspector, roughness/hachure engine, arrow binding, Mermaid-to-diagram, Command Palette, SVG/JSON export to Whiteboard & Notes`
- **`feat(v5)`**: `Image tracing layer, Freenote-style /notes workspace, formula-to-diagram/chart synthesizer, textbook geometry & 3D...`

### Tabel Keputusan: Pertahankan Engine Kita vs. Reuse/Clone dari AFFiNE

| Fitur / Kapabilitas | Status di Repo Kita (`27a7df1`) | Keputusan Arsitektur V7 |
| :--- | :--- | :--- |
| **3D Solid, Gimbal 360°, Dadu Lipat, Irisan, ManimGX, 12 Virtual Labs, Handwriting→LaTeX, Excalidraw Canvas** | Sudah matang & jadi keunggulan inti kita | **PERTAHANKAN 100%** — bungkus sebagai *Custom Block / Embed Bridge* agar bisa dipanggil langsung dari dalam editor AFFiNE/BlockSuite! |
| **Dual-View Page Mode (Doc Notion) ↔ Edgeless Mode (Canvas Miro) dalam 1 Yjs Tree** | Belum ada | **REUSE LANGSUNG** dari BlockSuite (`AffineEditorContainer` / `PageEditor` + `EdgelessEditor`). |
| **Slash Menu (`/`), Rich Blocks (Heading, Callout, Code, Divider, Checklist, Table, Bookmark, Attachment)** | Belum ada | **REUSE LANGSUNG** dari `@blocksuite/blocks` / `blocksuite/affine/blocks`. |
| **Database Block Multi-View (Table + Kanban Board)** | Belum ada | **REUSE LANGSUNG** dari `@blocksuite/affine-block-database` & `@blocksuite/affine-block-data-view`. |
| **Auto-Layout Mindmap (`Tab` anak, `Enter` saudara)** | Belum ada | **REUSE LANGSUNG** dari `@blocksuite/affine-gfx-mindmap`. |
| **Frames & Mode Presentasi Slide-by-Slide di Kanvas** | Belum ada | **REUSE LANGSUNG** dari `@blocksuite/affine-block-frame` & `@blocksuite/affine-fragment-frame-panel`. |
| **Bi-Directional Linked Pages (`[[Judul]]`), Doc Embedding & Outline TOC** | Belum ada | **REUSE LANGSUNG** dari `@blocksuite/affine-block-embed-doc` & `@blocksuite/affine-fragment-outline`. |
| **Local-First CRDT Sync (`Yjs` + IndexedDB)** | `dexie` sudah ada, belum Yjs Block Tree | **REUSE LANGSUNG** `@blocksuite/store` + `yjs` + `y-indexeddb` untuk sinkronisasi lokal & kolaborasi real-time. |

---

## 2. Daftar URL Referensi Lengkap (Siap Pakai untuk AI Agent — Tanpa Cari Manual)

Agent implementasi dapat langsung mengakses URL terverifikasi berikut untuk instalasi, *sparse-clone*, dan referensi API:

| Sumber | URL Resmi Terverifikasi | Kegunaan untuk Agent |
| :--- | :--- | :--- |
| **Repositori Utama AFFiNE** | `https://github.com/toeverything/AFFiNE` | Sumber *sparse-clone* folder `blocksuite/` (MIT License, branch `canary`, v0.27.4+). |
| **Dokumentasi Resmi AFFiNE** | `https://docs.affine.pro/` | Referensi arsitektur, konsep *Page vs Edgeless*, dan konfigurasi workspace. |
| **Arsitektur Sistem AFFiNE (DeepWiki)** | `https://deepwiki.com/toeverything/AFFiNE` | Peta dependensi paket (`@blocksuite/affine`, `@affine/core`, `@affine/component`). |
| **Contoh Export Mindmap di AFFiNE** | `https://github.com/toeverything/AFFiNE/blob/canary/blocksuite/affine/all/src/gfx/mindmap/index.ts` | Contoh titik masuk re-export modul grafis BlockSuite di dalam monorepo AFFiNE. |
| **NPM `@blocksuite/presets`** | `https://www.npmjs.com/package/@blocksuite/presets` | Paket prebuilt `AffineEditorContainer`, `PageEditor`, `EdgelessEditor` (v0.19.5, kompatibel React 19 + `lit` + `yjs`). |
| **NPM `@blocksuite/blocks`** | `https://www.npmjs.com/package/@blocksuite/blocks` | Seluruh blok editor standar AFFiNE (Database, Frame, Mindmap, LaTeX, Callout, Table, Embed, Connector). |
| **Organisasi NPM `@blocksuite`** | `https://www.npmjs.com/org/blocksuite?page=3` | Daftar paket resmi (`@blocksuite/store`, `@blocksuite/std`, `@blocksuite/sync`, `@blocksuite/icons`). |
| **Repositori Yjs (CRDT)** | `https://github.com/yjs/yjs` | Engine sinkronisasi CRDT yang menjadi dasar state BlockSuite & kolaborasi classroom. |

---

## 3. Strategi Cloning & Konfigurasi (Zero Rebuild, Zero Bloat)

**Peringatan Arsitektur:** Repositori penuh `toeverything/AFFiNE` berisi 3.100+ paket termasuk backend NestJS, Electron, iOS/Android, dan Rust native (`y-octo`). **Jangan** menyalin seluruh repo AFFiNE ke `ai-interactive-classroom`. Gunakan **2 Jalur Integrasi Bersih** berikut:

### Jalur Utama (Direkomendasikan untuk Implementasi Cepat & Stabil) — Instalasi Paket Resmi `@blocksuite/*`
Paket BlockSuite dibangun sebagai **Web Components (`lit`)** sehingga dapat dipasang langsung di **React 19 + Vite** tanpa konflik framework:

```bash
# Jalankan di apps/web
pnpm add @blocksuite/presets@0.19.5 @blocksuite/blocks@0.19.5 @blocksuite/block-std@0.19.5 @blocksuite/store@0.19.5 @blocksuite/icons@2.1.75 lit@^3.0.0 yjs@^13.6.0 y-indexeddb
```

### Jalur Ekstensi (Opsional — Sparse Clone dari `toeverything/AFFiNE` untuk Modul v0.27.4 Terbaru)
Jika agent membutuhkan fitur terbaru dari `AFFiNE` `canary` (mis. pembaruan `@blocksuite/affine-block-database`, `@blocksuite/affine-block-callout`, `@blocksuite/affine-block-latex`, `@blocksuite/affine-gfx-mindmap`, atau `@blocksuite/affine-fragment-frame-panel`), lakukan **Git Sparse Checkout** ke folder referensi terisolasi (bukan langsung ke `apps/web`):

```bash
# Clone super cepat hanya folder blocksuite/ (tanpa history & tanpa app Electron/NestJS/Rust)
git clone --depth 1 --filter=blob:none --sparse https://github.com/toeverything/AFFiNE.git vendor/affine-ref
cd vendor/affine-ref
git sparse-checkout set blocksuite/affine/blocks blocksuite/affine/gfx blocksuite/affine/fragments blocksuite/affine/widgets blocksuite/affine/all
```

> **Aturan Konfigurasi untuk Agent:**
> 1. Tambahkan `vendor/affine-ref/` ke `.gitignore` (atau hanya salin file utilitas/CSS/block spesifik berlisensi MIT ke `packages/affine-workspace/` dengan menyertakan header atribusi MIT `LICENSE-MIT` dari `toeverything/AFFiNE`).
> 2. Pastikan `apps/web/vite.config.ts` mengonfigurasi `optimizeDeps.exclude` bila diperlukan untuk Web Components `lit` dan tidak bentrok dengan polyfill `react19-compat.ts`.

---

## 4. Arsitektur Integrasi ke AI Interactive Classroom (`/workspace` & Upgrade `/notes`)

Kita menyediakan mode **AFFiNE Workspace (`Page Mode ↔ Edgeless Mode`)** yang terintegrasi rapi dengan halaman **`/notes`** (sebagai tab/mode **`Doc & Board (AFFiNE)`** di samping mode *Freenote Ink*) sekaligus dapat dibuka dari rute khusus **`/workspace/:docId`**.

### 4.1 Komponen Pembungkus React 19 (`packages/affine-workspace` + `apps/web/src/components/affine/`)

```ts
// apps/web/src/components/affine/AffineEditorHost.tsx
import { useEffect, useRef } from "react";
import { AffineEditorContainer } from "@blocksuite/presets";
import { AffineSchemas } from "@blocksuite/blocks";
import { DocCollection, Schema } from "@blocksuite/store";
import { IndexeddbPersistence } from "y-indexeddb";
import "@blocksuite/presets/themes/affine.css";

export interface AffineEditorHostProps {
  docId: string;
  mode: "page" | "edgeless";
  onModeChange?: (mode: "page" | "edgeless") => void;
  onRequestClassroomEmbed?: (kind: "solid3d" | "manimgx" | "virtual_lab" | "math_graph") => void;
}
```

**Konfigurasi Wajib Saat Mount (`useEffect`)**:
1. Inisialisasi `Schema().register(AffineSchemas)` + `DocCollection` tunggal (singleton per workspace di Zustand/Context agar perpindahan dokumen instan).
2. Hubungkan `doc.spaceDoc` (Yjs `Y.Doc`) ke `new IndexeddbPersistence(`aic-affine-${docId}`, doc.spaceDoc)` untuk **Local-First Offline Persistence** otomatis (setiap ketikan, mindmap, database, atau frame tersimpan di browser tanpa server!).
3. Buat `const editor = new AffineEditorContainer(); editor.doc = doc; editor.mode = mode;` lalu tempelkan ke `containerRef.current`.
4. Sinkronkan `editor.slots.docModeChanged` ke state React agar tombol toggle **`Dokumen (Page)` ↔ `Kanvas (Edgeless)`** di header selalu sinkron 100% pada **satu dataset Yjs yang sama**.

### 4.2 Konfigurasi Fitur AFFiNE yang Diaktifkan & Disesuaikan untuk Guru/Siswa

| Fitur AFFiNE / BlockSuite | Cara Mengaktifkan / Mengonfigurasi | Manfaat Langsung di Kelas |
| :--- | :--- | :--- |
| **1. Toggle `Page` ↔ `Edgeless`** | Switch `editor.mode = 'page' \| 'edgeless'` pada `AffineEditorContainer` (shortcut `Alt+S`). | Guru menulis RPP/materi rapi di *Page Mode*, lalu 1-klik pindah ke *Edgeless Mode* untuk menjelaskan secara visual di papan tak terbatas tanpa salin-tempel! |
| **2. Slash Menu (`/`) + Custom Classroom Items** | Extend konfigurasi `AffineSlashMenuWidget` untuk menyisipkan grup **`AI Classroom`**: `/3d` (Bangun Ruang 3D), `/manimgx` (Animasi 3D ManimGX), `/lab` (12 Lab Virtual), `/rumus` (Blok MathLive), `/grafik` (Grafik Buku Teks). | Guru cukup mengetik `/3d` atau `/manimgx` di tengah catatan untuk memunculkan visualisasi interaktif kita. |
| **3. Auto-Layout Mindmap** | Aktif di `EdgelessMode` bawaan BlockSuite (`@blocksuite/blocks` / `@blocksuite/affine-gfx-mindmap`). | Guru & siswa membuat peta konsep materi secara instan (`Tab` tambah cabang, `Enter` tambah saudara) dengan perataan otomatis. |
| **4. Frames & Mode Presentasi** | Aktifkan `edgeless-frame-tool` + `FramePanel` sidebar (daftar urutan slide frame) + tombol **`Presentasi`** (`edgeless.mode = 'present'`). | Kanvas catatan/materi langsung berubah menjadi presentasi slide interaktif yang meluncur mulus antar-frame saat ditampilkan ke proyektor! |
| **5. Database Block (Table + Kanban)** | Tersedia lewat Slash Menu `/table` & `/kanban` (`@blocksuite/affine-block-database`). | Pelacakan tugas siswa, daftar rumus penting, jadwal praktikum, dan rubrik penilaian langsung di dalam catatan kelas. |
| **6. Linked Pages (`[[...]]`) & Outline Panel** | Aktifkan `AffineReference` + `OutlinePanel` dari `@blocksuite/presets` di sidebar kiri/kanan. | Navigasi cepat antar bab/halaman catatan dan daftar isi otomatis berdasarkan Heading (`H1–H3`). |
| **7. Import / Export Universal** | Gunakan `MarkdownAdapter`, `HtmlAdapter`, dan `Print/PDF` bawaan BlockSuite. | Guru dapat mengimpor catatan `.md` langsung menjadi blok AFFiNE atau mengekspor materi kelas ke Markdown/HTML/PDF. |

### 4.3 Jembatan Dua Arah (*Classroom Bridge*) dengan Engine V1–V6 Kita
Agar AFFiNE tidak berjalan terpisah sebagai "pulau sendiri", bangun **`ClassroomBlockBridge.ts`**:
1. **Embed Objek AI Interactive Classroom ke Dalam AFFiNE**:
   - Tambahkan tombol **"Kirim ke Catatan AFFiNE"** pada `TongchuangSolidWidget` (3D), `ManimGxWidget` (Animasi 3D), dan `MathTextBlockWidget` → menyisipkan *Custom Embed Card / Bookmark / LaTeX Block* ke `doc` AFFiNE aktif (lengkap dengan *snapshot preview* PNG & tombol **"Buka Interaktif"** yang membuka overlay 3D/ManimGX/Lab penuh).
2. **Seleksi Teks/LaTeX di AFFiNE → Picu `ManimGX` & `3D Model`**:
   - Pasang listener pada `FormatBar` (*selection toolbar* bawaan BlockSuite saat user memblok teks/rumus) dengan menambahkan 2 tombol aksi kustom:
     - **`Model 3D`** → kirim string/LaTeX terpilih ke `shapeToSolid` / `diagramSynthesizer` → buka/sisipkan `TongchuangSolidWidget`.
     - **`Animasi ManimGX`** → kirim string/LaTeX terpilih ke `manimgxRouter.ts` (commit `9ac9169` / `27a7df1`) → render animasi 3D zero-lag white ManimGX!
3. **Kolaborasi Real-Time Classroom (Opsional Sinkronisasi Room)**:
   - Karena BlockSuite menggunakan **Yjs (`doc.spaceDoc`)**, sinkronisasi multi-pengguna (Guru + Siswa di Room) dapat langsung dihubungkan ke provider WebSocket/WebRTC (`y-websocket` atau `remotePeerBridge.ts` P2P WebRTC yang sudah ada!) hanya dengan meneruskan `Y.encodeStateAsUpdate` & `Y.applyUpdate`.

---

## 5. Pemetaan File Target & Roadmap Implementasi V7

### 5.1 Pemetaan File Baru & Modifikasi
| Paket / Direktori | File Target | Ringkasan Implementasi |
| :--- | :--- | :--- |
| `apps/web/package.json` | `package.json` | Tambah `@blocksuite/presets@0.19.5`, `@blocksuite/blocks@0.19.5`, `@blocksuite/block-std@0.19.5`, `@blocksuite/store@0.19.5`, `@blocksuite/icons@2.1.75`, `lit`, `yjs`, `y-indexeddb`. |
| `apps/web/src/lib` | `affineWorkspaceStore.ts` (baru), `classroomBlockBridge.ts` (baru) | Singleton `DocCollection` + `IndexeddbPersistence` (`y-indexeddb`), manajemen daftar dokumen/notebook lokal, dan jembatan konversi dua arah antara BlockSuite `Y.Doc` ↔ `WhiteboardCanvas` / `ManimGX` / `TongchuangSolidWidget`. |
| `apps/web/src/components/affine` | `AffineEditorHost.tsx` (baru), `AffineWorkspaceShell.tsx` (baru), `AffineSidebar.tsx` (baru), `affineThemeOverrides.css` (baru) | Wrapper Web Component `AffineEditorContainer` untuk React 19; header toggle **`Page ↔ Edgeless`** + tombol **`Presentasi`**; sidebar **Dokumen, Outline TOC, & Frame Panel**; penyesuaian tema putih bersih selaras AI Interactive Classroom. |
| `apps/web/src/components/affine` | `customSlashItems.ts` (baru), `formatBarBridge.ts` (baru) | Injeksi item Slash Menu (`/3d`, `/manimgx`, `/lab`, `/grafik`) dan tombol *FormatBar* (**`Model 3D`**, **`Animasi ManimGX`**) saat user menyeleksi teks/rumus di dalam AFFiNE. |
| `apps/web/src/pages/notes` & `router` | `NotesPage.tsx`, `PersonalRoomPage.tsx`, `router/index.tsx` | Tambah switcher **`Mode Catatan: Freenote Ink | AFFiNE Doc & Board`** di `/notes`, rute langsung `/workspace/:docId`, serta tombol **"Kirim ke Catatan AFFiNE"** di whiteboard. |

### 5.2 Urutan Sprint & Kriteria Verifikasi untuk Agent

- **Sprint 1 — Instalasi `@blocksuite/*`, Mount `AffineEditorContainer` & Local-First Yjs Persistence**:
  - Pasang dependensi BlockSuite + `lit` + `yjs` + `y-indexeddb` di `apps/web`; bangun `affineWorkspaceStore.ts`, `AffineEditorHost.tsx`, dan `AffineWorkspaceShell.tsx`; daftarkan rute `/workspace` dan switcher di `/notes`.
  - *Verifikasi*: `pnpm build` lulus tanpa konflik React 19 / Vite; user dapat membuat dokumen, mengetik `/`, membuat Database Table/Kanban, berpindah **`Page ↔ Edgeless`** tanpa kehilangan data, menggambar Mindmap & Frame, lalu refresh browser dan seluruh data tetap utuh dari IndexedDB.
- **Sprint 2 — Sidebar Navigasi (Docs, Outline TOC, Presentation Frames) & Theme Alignment**:
  - Pasang `OutlinePanel` dan `FramePanel` bawaan BlockSuite di `AffineSidebar.tsx`, tombol 1-klik **`Presentasi`**, *Export/Import Markdown*, serta styling responsif PC/Tablet/HP agar menyatu dengan tampilan bersih AI Interactive Classroom.
  - *Verifikasi*: Membuat 3 Frame di *Edgeless Mode* → klik `Presentasi` meluncur mulus dari Frame 1 → 2 → 3; `Outline` melompat otomatis ke heading yang diklik; *Export Markdown* menghasilkan file `.md` valid.
- **Sprint 3 — Classroom Bridge (`/3d`, `/manimgx`, `/lab` & Selection → ManimGX/3D) + Opsional Sparse-Clone Polish**:
  - Implementasi `customSlashItems.ts`, `formatBarBridge.ts`, dan `classroomBlockBridge.ts` sehingga memblok teks matematika di AFFiNE langsung bisa memicu **Model 3D (`TongchuangSolidWidget`)** atau **Animasi 3D (`ManimGxWidget` zero-lag white)**, dan objek dari `/whiteboard` dapat dikirim ke dokumen AFFiNE.
  - *Verifikasi*: Ketik `z = \sin(x)\cos(y)` di Page Mode AFFiNE → blok teks → klik **`Animasi ManimGX`** di FormatBar → animasi 3D ManimGX berjalan mulus; ketik `/3d` di Slash Menu → memilih Kubus/Dadu menyisipkan kartu 3D interaktif; seluruh `pnpm test:all && pnpm build` lulus 100%.
