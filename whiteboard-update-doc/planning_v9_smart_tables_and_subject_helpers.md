# Master Engineering Plan V9: Smart Custom Table Engine (Statistika Mean/Median/Modus) & Alat Bantu Terstruktur Lintas Materi (Whiteboard + Notes)

Dokumen spesifikasi teknis ini disusun berdasarkan pembaruan terbaru pada repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/) hingga commit **`7b97e1e`** (28 Nov 2026) — setelah V7 (`f5ffbf2`: AFFiNE/BlockSuite, LAN Wi-Fi host, Freenote 120fps mobile ink, zoom lock, pinch-guard) dan V8 (`7b97e1e`: V8 classroom suite, multi-object group/ungroup, smooth 60fps drag & 3D move fix).

Fokus V9 adalah menghilangkan kebutuhan guru menggambar tabel dan struktur matematis secara manual di **Whiteboard** maupun **Notes** melalui dua sistem terpadu:
1. **Smart Custom Table Engine (`smart_table`)** — tabel fleksibel (bebas atur jumlah baris & kolom, *merge/split*, highlight baris, *Cell Reveal*, LaTeX di sel) dengan **Mode Statistika Pintar** (Mean, Median, Modus Data Tunggal & Data Kelompok + 1-klik Histogram/Poligon/Ogive).
2. **Smart Subject Helper Builders (`subject_helper`)** — katalog alat bantu terstruktur siap pakai untuk materi lain yang membutuhkan format visual serupa (Tabel Nilai Fungsi, Skema Horner, Grid Matriks, Pohon Faktor, Tabel Kebenaran, Diagram Venn, Diagram Pohon Peluang, Segitiga Pascal, Tabel Sudut Istimewa, Tabel MRS Kimia, & Tangga Konversi Satuan).

---

## 1. Audit Baseline Commit `7b97e1e` & Integrasi Arsitektur

Seluruh komponen baru V9 wajib mematuhi kontrak arsitektur yang sudah stabil di `7b97e1e` dan `f5ffbf2`:
- **Canonical OBB & Group/Ungroup (`7b97e1e`)**: Setiap `smart_table` dan `subject_helper` menggunakan `CanonicalTransform` (`cx, cy, width, height, rotation`) sehingga dapat di-**Group/Ungroup** bersama `MathTextBlockWidget`, grafik, atau bangun 3D, disalin-tempel (`Ctrl+C/V`), dan digeser 60fps via `WhiteboardOverlay`.
- **Shared Whiteboard + Notes**: Engine komponen disimpan di `apps/web/src/components/tables/` dan `packages/math-core/` agar langsung bekerja identik di `/whiteboard` maupun `/notes` (serta dapat disisipkan via Slash Menu `/tabel` di AFFiNE Workspace).
- **Mobile 120fps & Pinch-Guard (`f5ffbf2`)**: Edit sel memakai *tap-to-edit* dengan `font-size >= 16px` di mobile (mencegah auto-zoom Safari/Chrome) dan `stopPropagation` pada pointer input sel agar tidak bentrok dengan *pinch-zoom* kanvas.
- **Integrasi V8 (MCP + PPTX)**: Terdaftar di `packages/canvas-mcp` (AI bisa membuat tabel langsung dari soal cerita) dan diekspor sebagai **native editable table (`slide.addTable`)** di `pptxExporter.ts`.

---

## 2. Modul 1 — Smart Custom Table Engine (`object_type: "smart_table"`)

### 2.1 Skema Data Kanonik (`packages/whiteboard-core/src/tableTypes.ts`)

```ts
export type TablePresetMode =
  | "custom"                // Tabel bebas R x C
  | "stat_ungrouped"        // Data Tunggal Berbobot (Nilai x_i | Frekuensi f_i)
  | "stat_grouped"          // Data Kelompok (Interval a-b | Frekuensi f_i)
  | "function_values"       // Tabel Nilai Fungsi (x | f(x))
  | "truth_table"           // Tabel Kebenaran Logika (p, q, ..., expr)
  | "trig_special_angles"   // Tabel Sudut Istimewa (0°..360°)
  | "experiment_regression" // Tabel Pengamatan Fisika + Regresi Linear
  | "chem_mrs";             // Tabel Stoikiometri Mula-mula, Reaksi, Setimbang

export interface TableCell {
  raw: string;              // Nilai teks / angka / interval ("31 - 40") / LaTeX ("$x_i$")
  computed?: string;        // Hasil rumus/auto-calc (read-only bila kolom terkomputasi)
  bgColor?: string;         // Highlight warna (mis. kuning kelas median, biru kelas modus)
  textColor?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  colSpan?: number;
  rowSpan?: number;
  hiddenForReveal?: boolean; // Mode "Tirai Sel" (? -> klik untuk membuka jawaban di kelas!)
}

export interface SmartTableProps {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
  presetMode: TablePresetMode;
  title?: string;
  rows: number;
  cols: number;
  colWidthsPx: number[];
  cells: TableCell[][];      // Matriks [row][col]
  headerRowCount: number;    // default 1
  zebraStriping: boolean;
  borderStyle: "classic" | "textbook" | "minimal" | "blackboard";
  // Opsi khusus Statistika & Komputasi
  statConfig?: {
    showMidpointCol: boolean;       // Kolom Nilai Tengah (x_i)
    showFxCol: boolean;             // Kolom f_i * x_i
    showCumFreqCol: boolean;        // Kolom Frekuensi Kumulatif (f_k)
    showTotalRow: boolean;          // Baris Jumlah (Σf, Σf·x)
    highlightMedianClass: boolean;  // Otomatis sorot baris kelas Median
    highlightModalClass: boolean;   // Otomatis sorot baris kelas Modus
    showFormulaCallouts: boolean;   // Tampilkan anotasi Tb, p, fk, d1, d2 di tepi tabel
    showSolverCard: boolean;        // Tampilkan kartu perhitungan Mean, Median, Modus step-by-step
  };
}
```

### 2.2 Kontrol Kustomisasi Instan (Zero Manual Drawing)
1. **Grid Picker Cepat saat Insert**: Klik **`Tabel`** di toolbar atau *Template Drawer* → pilih cepat dimensi via *hover grid* (mis. `3×5`, `6×4` hingga `20×12`) **ATAU** pilih langsung **Preset Materi** (*Statistika Data Kelompok*, *Statistika Data Tunggal*, *Tabel Nilai Fungsi*, *Tabel Kebenaran*, dll.).
2. **Edit Struktur Langsung di Kanvas**:
   - Tombol `+` mengambang di tepi kanan (tambah kolom) dan tepi bawah (tambah baris) — seperti Notion/AFFiNE.
   - Drag garis pemisah kolom untuk mengatur lebar kolom secara halus.
   - Klik kanan / toolbar sel: `Sisipkan Baris Atas/Bawah`, `Sisipkan Kolom Kiri/Kanan`, `Hapus Baris/Kolom`, `Gabung Sel (Merge)`, `Pisah Sel`, `Warna Sorotan`, dan **`Tutup Sel (Mode Kuis ?)`**.
3. **Mode Pedagogis "Tirai Sel" (*Cell Reveal*)**:
   - Guru dapat menandai kolom pembantu (mis. seluruh kolom $f_i \cdot x_i$ atau nilai sudut istimewa) sebagai tersembunyi (`?`), lalu saat mengajar di depan kelas tinggal mengklik tiap sel satu per satu untuk membuka jawabannya secara bertahap!
4. **Paste Langsung dari Excel / Spreadsheet / CSV**:
   - Menempel teks berpemisah Tab (`\t`) atau koma (`,`) ke dalam sel otomatis memperluas baris & kolom tabel dan mengisi seluruh sel secara presisi.

---

## 3. Modul 2 — Engine Statistika Presisi (Mean, Median, Modus: Data Tunggal & Kelompok)

Dibangun deterministik di **`packages/math-core/src/statisticsEngine.ts`** (nol LLM hallucination, akurasi numerik penuh, unit-tested).

### 3.1 Parsing Interval & Perhitungan Data Kelompok
Ketika `presetMode === "stat_grouped"`, guru cukup mengisi kolom 1 (`Interval`, mis. `31 - 40`, `41 - 50`, ..., `81 - 90` — persis seperti referensi `screenshot_20261128_090742.jpg`) dan kolom 2 (`Frekuensi f`):

1. **Interval Parser (`parseClassInterval`)**:
   - Menerima format `31-40`, `31 - 40`, `31–40`, `31 s.d. 40` → ekstrak batas bawah $a_i$ dan batas atas $b_i$.
   - Hitung otomatis:
     - **Tepi Bawah**: $T_{b,i} = a_i - 0.5$ (atau $a_i - 0.05$ jika data berdesimal 1 angka!).
     - **Tepi Atas**: $T_{a,i} = b_i + 0.5$.
     - **Panjang Kelas**: $p = T_{a,i} - T_{b,i} = b_i - a_i + 1$.
     - **Nilai Tengah**: $x_i = \frac{a_i + b_i}{2}$.
     - **Frekuensi Kumulatif**: $f_{k,i} = \sum_{j=1}^{i} f_j$, total data $n = \sum f_i$.
2. **Rumus Exact Ukuran Pemusatan & Penyebaran**:
   - **Mean ($\bar{x}$)**:
     $$\bar{x} = \frac{\sum_{i=1}^{k} f_i x_i}{\sum_{i=1}^{k} f_i}$$
   - **Median ($Me$)** & **Kuartil ($Q_r, r \in \{1,2,3\}$)**:
     - Temukan kelas pertama dengan $f_{k,m} \ge \frac{r}{4}n$ (untuk Median, $\frac{1}{2}n$).
     - $$Me = T_{b,m} + \left(\frac{\frac{1}{2}n - f_{k,m-1}}{f_m}\right) \cdot p$$
   - **Modus ($Mo$)**:
     - Temukan kelas dengan $f_{\text{mod}} = \max_i f_i$; hitung $d_1 = f_{\text{mod}} - f_{\text{mod}-1}$ dan $d_2 = f_{\text{mod}} - f_{\text{mod}+1}$ (dengan $f_0 = 0, f_{k+1} = 0$).
     - $$Mo = T_{b,\text{mod}} + \left(\frac{d_1}{d_1 + d_2}\right) \cdot p$$
     - *(Menangani kasus bimodal/multimodal dengan menampilkan semua kelas modus!).*
   - **Variansi ($s^2$) & Simpangan Baku ($s$)**:
     $$s^2 = \frac{\sum f_i (x_i - \bar{x})^2}{n - 1} \quad (\text{sampel}), \qquad \sigma^2 = \frac{\sum f_i (x_i - \bar{x})^2}{n} \quad (\text{populasi})$$

### 3.2 Perhitungan Data Tunggal & Data Tunggal Berbobot
- Mendukung input daftar mentah (mis. `5, 7, 6, 8, 7, 9, 6`) **atau** tabel `[Nilai x_i | Frekuensi f_i]`:
  - **Mean**: $\bar{x} = \frac{\sum f_i x_i}{n}$.
  - **Median**:
    - Jika $n$ ganjil: $Me = X_{\frac{n+1}{2}}$ (tampilkan posisi datum ke-$\frac{n+1}{2}$!).
    - Jika $n$ genap: $Me = \frac{X_{n/2} + X_{n/2 + 1}}{2}$.
  - **Modus**: Seluruh nilai $x_i$ dengan frekuensi maksimum (atau `"Tidak ada modus"` jika semua frekuensi sama).

### 3.3 Anotasi Buku Teks & 1-Klik Visualisasi Reaktif
- **Anotasi Panah Otomatis di Samping Tabel**: Sama seperti gambar referensi guru (`Tb = 61 - 0,5 = 60,5`, `p = 10`, sorotan warna baris **Kelas Median** & **Kelas Modus**).
- **Step-by-Step Solver Card**: Menampilkan 4 tahap (*Diketahui → Rumus → Substitusi → Hasil*) dalam format KaTeX yang bisa dibuka satu per satu di depan kelas.
- **1-Klik Buat Grafik Reaktif**: Tombol **`Buat Grafik`** di toolbar tabel langsung melahirkan objek terhubung (`linkedTableId`) pada kanvas:
  - **Histogram** (sumbu-x otomatis memakai tepi kelas $T_b$–$T_a$ rapat tanpa celah!)
  - **Poligon Frekuensi** (menghubungkan titik tengah $x_i$)
  - **Ogive Positif & Negatif** (kurva frekuensi kumulatif $\le$ dan $\ge$)
  - **Diagram Batang / Lingkaran** (untuk data tunggal/kategori)
  - **Animasi ManimGX** (menganimasikan pertumbuhan batang histogram & garis rata-rata!).

---

## 4. Modul 3 — Analisis & Katalog Alat Bantu Terstruktur untuk Materi Lain (`Smart Subject Helpers`)

Selain tabel Mean-Median-Modus, banyak materi lain yang memaksa guru menggambar struktur/grid berulang di papan tulis. Berikut **8 Alat Bantu Terstruktur** yang paling sering dipakai dan paling berdampak di kelas:

| # | Alat Bantu (`helperKind`) | Materi Pelajaran | Visual & Interaksi Otomatis |
| :-: | :--- | :--- | :--- |
| 1 | **Tabel Nilai Fungsi (`function_values`)** | Aljabar, Fungsi Linear/Kuadrat/Trig, Kalkulus | Guru ketik rumus $f(x) = x^2 - 4x + 3$ + domain $x \in [-1, 5]$ → baris $(x, y)$ terisi otomatis (atau mode `?` untuk diisi siswa) → **1-klik plot titik & kurva ke `TextbookGraphWidget`**! |
| 2 | **Skema Horner / Pembagian Polinomial (`horner_scheme`)** | Polinomial / Suku Banyak | Grid siku-L khas Horner dengan input pembagi $x = k$ dan koefisien $[a_n, \dots, a_0]$; panah penjumlahan & perkalian berjalan **step-by-step**, otomatis menandai **Hasil Bagi $H(x)$** dan **Sisa $S$** di kotak kanan bawah. |
| 3 | **Grid Matriks Interaktif (`matrix_grid`)** | Aljabar Linear, Transformasi Geometri | Pilih ordo $m \times n$ (tambah/kurang baris-kolom instan, kurung siku `[ ]` otomatis melar), operasi 1-klik: **Determinan** (dengan garis bantu aturan Sarrus $3\times 3$!), **Invers $A^{-1}$**, **Transpose $A^T$**, **Perkalian $A \times B$**, & **1-klik Animasi Transformasi ManimGX**. |
| 4 | **Pohon Faktor & Tabel Sengkedan (`factor_tree`)** | Bilangan, FPB & KPK | Masukkan 1–3 bilangan (mis. `24, 36, 60`) → otomatis menggambar **Pohon Faktor** (lingkaran prima berwarna) **atau** **Tabel Sengkedan** (pembagi prima di kolom kiri) → langsung tampilkan faktorisasi prima, **FPB**, dan **KPK**! |
| 5 | **Garis Bilangan & Interval (`number_line`)** | Bilangan Bulat, Pertidaksamaan, Nilai Mutlak | Garis bilangan berpanah dengan skala bebas, **titik penuh ($\bullet$ untuk $\le, \ge$)** vs **titik kosong ($\circ$ untuk $<, >$)**, arsiran daerah himpunan penyelesaian, serta lompatan panah operasi penjumlahan/pengurangan bilangan bulat! |
| 6 | **Tabel Kebenaran & Diagram Venn (`truth_table` & `venn_diagram`)** | Logika Matematika, Himpunan, Informatika | **Truth Table**: pilih $n \in \{1,2,3,4\}$ variabel → otomatis isi $2^n$ kombinasi `B/S` (`T/F`), ketik ekspresi $(p \land q) \implies \neg r$ → evaluasi tiap kolom & deteksi *Tautologi/Kontradiksi*. **Diagram Venn**: 2 atau 3 lingkaran dengan klik-untuk-arsir per irisan ($A \cap B, A \cup B, A \setminus B, A^c$) + jumlah anggota! |
| 7 | **Diagram Pohon Peluang, Ruang Sampel & Segitiga Pascal (`prob_tree` / `pascal_triangle`)** | Peluang & Kombinatorika | **Ruang Sampel**: tabel otomatis 2 Dadu ($6\times 6$) atau $n$ Koin (klik sel untuk menyorot kejadian mis. *"jumlah mata dadu = 7"* → langsung hitung $P(A) = \frac{6}{36} = \frac{1}{6}$!). **Pohon Peluang**: cabang probabilitas perkalian otomatis. **Segitiga Pascal**: klik baris $n$ untuk menyorot koefisien $(a+b)^n$. |
| 8 | **Tabel Sudut Istimewa, Tabel MRS Kimia & Tangga Satuan (`trig_table` / `chem_mrs` / `unit_stairs`)** | Trigonometri, Stoikiometri Kimia, Fisika/Pengukuran | **Tabel Sudut Istimewa** ($0^\circ$–$360^\circ$ dengan *Cell Reveal* `?`); **Tabel MRS** (Mula-mula, Reaksi, Setimbang) dengan validasi stoikiometri; **Tangga Konversi Satuan** ($\text{km} \to \text{mm}$ / $\text{kg} \to \text{mg}$) dengan animasi loncatan $\times 10 / \div 10$! |

---

## 5. Integrasi UI Sederhana di Whiteboard & Notes

Agar toolbar tetap bersih dan tidak penuh tombol:
1. **Tambahkan 1 Entry Baru di Template Drawer & Toolbar**: Tab **`Tabel & Alat Bantu`** pada `TemplateDrawer.tsx` (mendukung **Drag-and-Drop** ke kanvas maupun **1-Klik Insert**), serta tombol cepat **`Tabel`** di *Notes* (`/notes`).
2. **Alur Kerja 2 Klik bagi Guru**:
   - *Klik 1*: Pilih **`Tabel Custom (R×C)`** atau preset (**`Statistika Data Kelompok`**, **`Statistika Data Tunggal`**, **`Matriks`**, **`Pohon Faktor`**, **`Diagram Venn`**, dll.).
   - *Klik 2*: Isi/ubah angka langsung di sel → aktifkan toggle kolom pembantu ($x_i, f_i x_i, f_k$), tombol **`Hitung Step-by-Step`**, atau **`Buat Grafik / Histogram`**.
3. **Interoperabilitas Penuh**:
   - Klik kanan / *2x tap* pada tabel membuka *Radial Wheel* (`Edit Struktur`, `Hitung Otomatis`, `Mode Tirai ?`, `Buat Grafik`, `Duplikat`, `Group`, `Hapus`).
   - Tersambung ke `packages/canvas-mcp` (`canvas.create_smart_table`, `canvas.create_subject_helper`) sehingga guru bisa mengetik di **Asisten AI**: *"Buatkan tabel data kelompok nilai ujian 40 siswa beserta mean, median, modus dan histogramnya"* → langsung muncul di kanvas!

---

## 6. Pemetaan File Target & Roadmap Implementasi V9

### 6.1 Pemetaan File Baru & Modifikasi
| Paket / Direktori | File Target | Ringkasan Implementasi |
| :--- | :--- | :--- |
| `packages/whiteboard-core` | `src/tableTypes.ts` *(baru)*, `src/index.ts`, `src/reducer.ts` | Tambah `object_type: "smart_table"` (`SmartTableProps`) dan `object_type: "subject_helper"` (`SubjectHelperProps`) dengan `CanonicalTransform` penuh (mendukung Group/Ungroup & copy-paste). |
| `packages/math-core` | `src/statisticsEngine.ts` *(baru)*, `src/subjectHelpersEngine.ts` *(baru)*, `src/statisticsEngine.test.ts` *(baru)* | Engine exact Statistika (Data Tunggal & Kelompok: Mean, Median, Modus, $Q_1..Q_3$, $s^2, s$, interval parser, histogram/ogive series) + solver deterministik untuk Horner, Matriks, Pohon Faktor (FPB/KPK), Truth Table, Ruang Sampel, & Segitiga Pascal. |
| `apps/web/src/components/tables` *(baru)* | `SmartTableWidget.tsx`, `TableGridPicker.tsx`, `StatSolverCard.tsx`, `TableContextBar.tsx` | Komponen tabel interaktif (inline edit, paste Excel/CSV, `+baris/+kolom`, resize kolom, *merge*, *Cell Reveal `?`*, auto-highlight kelas median/modus, anotasi panah buku teks, tombol 1-klik Histogram/Poligon/Ogive). |
| `apps/web/src/components/helpers` *(baru)* | `HornerSchemeWidget.tsx`, `MatrixGridWidget.tsx`, `FactorTreeWidget.tsx`, `NumberLineWidget.tsx`, `VennDiagramWidget.tsx`, `SampleSpaceTreeWidget.tsx`, `UnitStairsWidget.tsx` | Katalog *lazy-loaded* alat bantu visual terstruktur lintas materi untuk Whiteboard & Notes. |
| `apps/web/src/pages/whiteboard`, `pages/notes` & `lib` | `WhiteboardOverlay.tsx`, `NotesCanvas.tsx`, `TemplateDrawer.tsx`, `pptxExporter.ts`, `packages/canvas-mcp` | Render `smart_table` & `subject_helper` di Whiteboard dan Notes; tambah tab **`Tabel & Alat Bantu`** di `TemplateDrawer` (drag & click); ekspor native `slide.addTable` di `pptxExporter.ts`; daftarkan tool MCP untuk generasi tabel otomatis oleh AI. |

### 6.2 Urutan Sprint & Kriteria Verifikasi

- **Sprint 1 — Smart Custom Table Engine & Statistika Mean/Median/Modus (Whiteboard + Notes)**:
  - Bangun `tableTypes.ts`, `statisticsEngine.ts`, `SmartTableWidget.tsx`, `TableGridPicker.tsx`, `StatSolverCard.tsx`, dan hubungkan ke `WhiteboardOverlay.tsx`, `NotesCanvas.tsx`, & `TemplateDrawer.tsx`.
  - *Verifikasi*: Unit test `statisticsEngine.test.ts` lolos 100% (memverifikasi contoh data kelompok `31–40..81–90` dan data tunggal ganjil/genap hingga galat $< 10^{-6}$); guru dapat menambah/mengurangi baris & kolom, *paste* dari Excel, menyembunyikan sel (`?`), dan membuat **Histogram/Ogive** 1-klik yang reaktif saat frekuensi diubah.
- **Sprint 2 — Smart Subject Helpers (Aljabar, Logika, Peluang, & Sains)**:
  - Implementasi *lazy-loaded* widgets: `HornerSchemeWidget`, `MatrixGridWidget` (termasuk Sarrus & link ManimGX), `FactorTreeWidget` (FPB/KPK), `NumberLineWidget`, `VennDiagramWidget` + `TruthTable` preset, `SampleSpaceTreeWidget` (Dadu $6\times 6$, Pohon Peluang, Segitiga Pascal), serta `TrigTable`, `ChemMRS`, dan `UnitStairsWidget`.
  - *Verifikasi*: Unit test solver deterministik untuk seluruh helper; seluruh widget mendukung OBB drag/resize, Group/Ungroup (`7b97e1e`), dan tampilan mobile bebas *pinch-zoom* konflik (`f5ffbf2`).
- **Sprint 3 — Integrasi PPTX Native Table Export & AI MCP Table Generator**:
  - Tambahkan pemetaan `smart_table` → `slide.addTable(...)` di `pptxExporter.ts` dan tool `canvas.create_smart_table` / `canvas.create_subject_helper` di `packages/canvas-mcp` + `AITeachingDrawer.tsx`.
  - *Verifikasi*: Prompt AI *"Buatkan tabel data kelompok nilai matematika 30 siswa dan hitung mean, median, modusnya"* langsung memunculkan `SmartTableWidget` terisi lengkap di kanvas; ekspor `.pptx` menghasilkan tabel editable asli; `pnpm test:all && pnpm build` lulus 100%.
