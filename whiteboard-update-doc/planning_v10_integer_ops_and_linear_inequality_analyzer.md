# Master Engineering Plan V10: Alat Bantu Operasi Hitung Bilangan Bulat & Selection-to-Visual Analyzer (Sistem Pertidaksamaan Linear / SPtLDV & Sejenisnya)

Dokumen spesifikasi teknis ini dibangun di atas baseline commit terbaru repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/):
- **`77de98c`** *(28 Nov 2026)*: `fix(regions): translation-invariant region ordering & split/detach slices (Pecah Potongan)`
- **`d65101c`** *(28 Nov 2026)*: `feat(v9): smart tables, subject helpers, per-region fill, colored 3D solids & full Notes parity`
- **`7b97e1e`** *(28 Nov 2026)*: `feat(whiteboard): V8 classroom suite, multi-object group/ungroup, smooth 60fps drag & 3D move fix`

V10 menambahkan dua kapabilitas pengajaran visual presisi tinggi yang bekerja identik di **Whiteboard** maupun **Notes**:
1. **Modul 1 — Interactive Integer Operations & Number Line Studio** (mengacu pada `screenshot_20261128_110929.jpg` & `screenshot_20261128_110339.png`): Template klasifikasi bilangan bulat (Negatif / Nol / Positif) + simulator **Operasi Hitung Bilangan Bulat** dengan animasi lompatan busur step-by-step.
2. **Modul 2 — Selection-to-Visual Analyzer untuk SPtLDV, SPLDV, Program Linear & Pertidaksamaan Kuadrat** (mengacu pada `screenshot_20261128_153212.jpg`, `153326.jpg`, `153408.jpg`, & `153011.png`): Pengguna menyeleksi seluruh teks/rumus/tabel jawaban yang sudah ditulis → klik **`Analisis & Visualisasikan`** → sistem memvalidasi hitungan, membentuk tabel titik potong, dan merender grafik **Daerah Penyelesaian (`DP`)** secara eksak (mendukung mode **DP Daerah Bersih** maupun **DP Diarsir**).

---

## 1. Modul 1 — Interactive Integer Operations & Number Line Studio

Memperluas `NumberLineWidget` dari commit `d65101c` menjadi 2 preset template siap pakai di `TemplateDrawer` (drag-and-drop & 1-klik) pada **Whiteboard** dan **Notes**.

### 1.1 Template A: Peta Konsep Bilangan Bulat (`preset: "integer_concept"`)
Mengacu persis pada `screenshot_20261128_110929.jpg`:
- **Garis Bilangan Dua Arah Custom**: Rentang default `[-7, 7]` (dapat diubah guru bebas mis. `[-10, 10]` atau `[-20, 20]`) dengan panah hitam di kedua ujung dan tick label berwarna semantik:
  - Bilangan bulat negatif (`< 0`): warna **hijau** (`#15803D`) + garis bawah hijau + panah putus-putus ke **Kiri (`← (Kiri)`)**.
  - **Nol (`0`)**: warna **cokelat/merah tua** (`#7C2D12`) + penanda titik asal.
  - Bilangan bulat positif (`> 0`): warna **biru** (`#1D4ED8`) + garis bawah biru + panah putus-putus ke **Kanan (`(Kanan) →`)**.
- **Braket Klasifikasi Atas & Notasi Himpunan Bawah**:
  - Braket 3 cabang di atas garis (*Bilangan bulat negatif | Nol | Bilangan bulat positif*) dan notasi himpunan dinamis di bawah: $B = \{\dots, -7, \dots, 0, \dots, 7, \dots\}$ (dapat di-toggle on/off).

### 1.2 Template B: Simulator Operasi Hitung Bilangan Bulat (`preset: "integer_operations"`)
Mengacu persis pada `screenshot_20261128_110339.png`:

```ts
// packages/whiteboard-core/src/integerOpsTypes.ts
export interface IntegerOperationStep {
  from: number;
  delta: number;           // > 0 lompat ke kanan (hijau), < 0 lompat ke kiri (merah)
  to: number;
  label?: string;          // mis. "+3" atau "-3"
  rawOperator?: string;    // mis. "- (-2)" -> dinormalisasi ke "+2"
}

export interface IntegerOpsWidgetProps {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
  mode: "concept_map" | "operations" | "integer_chips";
  expression: string;      // mis. "-1 + 3", "-1 - 3", "2 - (-4) - 5", "3 * (-2)"
  minTick: number;         // auto-fit dengan padding +-2 dari min/max lintasan
  maxTick: number;
  hopStyle: "unit_arcs" | "single_jump"; // busur lompat per 1 satuan (seperti gambar) vs 1 panah panjang
  showRuleBanner: boolean; // Tampilkan "INGAT! + : arah ke kanan, - : arah ke kiri"
  showResultCircle: boolean; // Lingkari angka hasil akhir di sumbu (mis. lingkaran di angka 2 atau -4)
  animateStepIndex: number; // -1 = tampil semua, 0..k = step-by-step reveal saat mengajar!
}
```

**Logika Deterministik (`packages/math-core/src/integerOpsEngine.ts`)**:
1. **Expression Parser & Sign Simplifier**:
   - Parsing aman untuk operasi tunggal maupun berantai: `-1 + 3`, `-1 - 3`, `4 + (-6)`, `3 - (-2)`, `-2 + 5 - 4`, dan perkalian bilangan bulat `3 × (-2)` (diterjemahkan menjadi 3 lompatan berulang berukuran `-2`).
   - Jika terdapat tanda ganda (`- (-b)` → `+ b`, `+ (-b)` → `- b`), tampilkan baris penyederhanaan tanda otomatis di atas garis bilangan!
2. **Rendering Busur Lompatan Unit (`unit_arcs`)**:
   - Untuk langkah dari $a$ sebesar $\Delta$ ($|\Delta| = k$ satuan, arah $s = \text{sign}(\Delta)$):
   - Gambar $k$ buah busur Bézier kuadratik berurutan dari $x_i = a + i\cdot s$ ke $x_{i+1} = a + (i+1)\cdot s$ dengan titik kontrol $( \frac{x_i + x_{i+1}}{2},\; y_{\text{axis}} - h_{\text{arc}} )$ dan kepala panah di tiap ujung busur (warna **hijau `#16A34A`** untuk arah kanan `+`, **merah `#DC2626`** untuk arah kiri `-`).
   - Pada angka hasil akhir $x_{\text{final}}$, gambar **lingkaran penanda hasil** (persis lingkaran pada angka `2` dan `-4` di `screenshot_20261128_110339.png`).
   - Untuk operasi berantai (2+ langkah), tingkatkan tinggi busur langkah ke-2 atau pisahkan di sisi atas/bawah garis agar tidak saling menumpuk.
3. **Mode Pendamping: Keping Muatan (`integer_chips`)**:
   - Toggle 1-klik untuk menampilkan keping `+` (biru) dan `-` (merah) dengan animasi **pasangan nol (*zero-pair cancellation*)** agar siswa memahami mengapa `-1 + 3 = 2` secara konkret maupun garis bilangan!
4. **Kontrol Mengajar Interaktif**:
   - Tombol **`Mainkan Lompatan`** (animasi busur melompat satu per satu 1→2→3), **`Langkah Berikutnya`**, **`Ulangi`**, serta **`Tampilkan/Sembunyikan Hasil`** (mode kuis kelas).

---

## 2. Modul 2 — Selection-to-Visual Analyzer (SPtLDV, SPLDV, Program Linear & Pertidaksamaan Kuadrat)

Alur utama yang diminta: **Guru/siswa menyelesaikan soal di Whiteboard atau Notes (tulis tangan → LaTeX, blok rumus, teks, maupun tabel titik potong) → blok/seleksi semua elemen jawaban tersebut → klik `Analisis & Visualisasikan` → sistem menganalisis dan langsung melahirkan gambar grafik hasil penyelesaiannya!**

### 2.1 Pipeline Ekstraksi Multi-Objek dari Seleksi (`packages/math-core/src/selectionAnalyzer.ts`)

Ketika user menyeleksi 1 atau lebih objek (`selectedIds` di Whiteboard/Notes atau teks terblok di `MathTextBlockWidget` / AFFiNE):
1. **Aggregator Konten Seleksi**:
   - Kumpulkan seluruh string teks & LaTeX dari `math_block`, `text`, `smart_table` (ambil koordinat `(x, y)` jika guru sudah membuat tabel titik potong!), serta stroke tulisan tangan (jalur HMER → LaTeX bila belum dikonversi).
   - Pisahkan baris/klausa dengan normalisasi simbol Unicode & LaTeX (`\le`, `<=`, `≤`, `\ge`, `>=`, `≥`, `<`, `>`, `=`, `\left\{`, `\\`).
2. **Classifier Otomatis Jenis Materi**:
   - **`sptldv` (Sistem Pertidaksamaan Linear 2 Variabel / Program Linear)**: Terdeteksi $\ge 1$ pertidaksamaan linear dalam $x, y$ (mis. `x + 2y <= 10`, `x + y <= 7`, `2 <= x <= 6`, `x >= 0`, `y >= 0`) + opsional fungsi tujuan `Z = px + qy`.
   - **`spldv` (Sistem Persamaan Linear 2 Variabel)**: Terdeteksi $\ge 2$ persamaan linear `ax + by = c` → gambar garis + titik potong solusi $(x^*, y^*)$ + garis proyeksi putus-putus.
   - **`quadratic_ineq` (Pertidaksamaan Kuadrat / Sistem Linear-Kuadrat)**: Terdeteksi suku $x^2$ atau $y^2$ pada pertidaksamaan → render parabola batas + daerah irisan/bersih.
   - **`sptlsv` (Pertidaksamaan 1 Variabel / Nilai Mutlak)**: Hanya memuat 1 variabel ($x$) → arahkan otomatis ke `NumberLineWidget` (interval dengan titik penuh $\bullet$ / kosong $\circ$).
   - **`integer_ops`**: Ekspresi aritmetika bilangan bulat sederhana (mis. `-1 + 3 = 2`) → arahkan langsung ke `IntegerOpsWidget`!

### 2.2 Algoritma Geometri Eksak SPtLDV (`packages/math-core/src/linearInequalityEngine.ts`)

```ts
export interface LinearInequality {
  id: string;
  rawLatex: string;       // mis. "2x + 3y \\le 12"
  a: number;              // koefisien x
  b: number;              // koefisien y
  c: number;              // konstanta kanan: a*x + b*y [op] c
  op: "<=" | ">=" | "<" | ">";
  strict: boolean;        // true => garis batas putus-putus, false => garis batas solid
  color: string;          // warna pita arsiran khas tiap pertidaksamaan
}

export interface AnalyzedLinearSystem {
  inequalities: LinearInequality[];
  interceptTables: Array<{
    equationLatex: string; // mis. "x + 2y = 10"
    xIntercept: [number, number] | null; // (c/a, 0)
    yIntercept: [number, number] | null; // (0, c/b)
    testPoint: { pt: [number, number]; satisfied: boolean; substitutionText: string };
  }>;
  feasiblePolygon: [number, number][];   // Poligon konveks DP hasil Sutherland-Hodgman
  isBounded: boolean;
  isEmpty: boolean;
  dpLabelPoint: [number, number] | null; // Pusat visual poligon DP untuk label "DP"
  cornerPoints: Array<{ pt: [number, number]; label: string; objectiveValue?: number }>;
  objective?: { latex: string; p: number; q: number; maxCorner?: number; minCorner?: number };
  viewportBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  studentCheck?: {
    warnings: string[];   // mis. jika tabel titik potong yang diseleksi user tidak cocok dengan persamaan!
    isConsistent: boolean;
  };
}
```

#### Langkah Matematika Inti (100% Deterministik, Nol Error):
1. **Pemecahan Pertidaksamaan Ganda (*Chained Inequality Splitting*)**:
   - Bentuk seperti `2 <= x <= 6` atau `0 <= y <= 8` (persis pada `screenshot_20261128_153408.jpg`!) otomatis dipecah menjadi dua pertidaksamaan kanonik: `x >= 2` dan `x <= 6` (serta `y >= 0` dan `y <= 8`).
2. **Auto-Bounding Box Viewport Cerdas**:
   - Kumpulkan seluruh titik potong sumbu $(c/a, 0)$, $(0, c/b)$, dan seluruh titik potong antar-garis (via Aturan Cramer $D = a_1 b_2 - a_2 b_1 \ne 0$: $x = \frac{c_1 b_2 - c_2 b_1}{D},\; y = \frac{a_1 c_2 - a_2 c_1}{D}$).
   - Hitung rentang $[x_{\min}, x_{\max}] \times [y_{\min}, y_{\max}]$ dengan margin padding `25%` dan selalu sertakan titik asal $(0, 0)$ agar sumbu Kartesius terlihat proporsional seperti di buku teks!
3. **Sutherland–Hodgman Half-Plane Clipping untuk Poligon Feasible (`DP`)**:
   - Mulai dengan poligon persegi panjang besar $P_0 = \text{clipBox}(x_{\min}-M, x_{\max}+M, y_{\min}-M, y_{\max}+M)$.
   - Untuk setiap pertidaksamaan $a_i x + b_i y \le c_i$ (normalisasi $\ge$ dengan mengalikan $-1$), potong poligon $P$ menggunakan fungsi signed-distance $g(x,y) = a_i x + b_i y - c_i \le 0$.
   - Hasil akhir $P_k$ adalah **poligon konveks exact** dari Daerah Penyelesaian (`DP`)! Jika $P_k$ kosong $\Rightarrow$ tampilkan status `"Himpunan Penyelesaian Kosong (∅)"`.
4. **Dua Mode Arsiran Buku Teks (1-Klik Toggle)**:
   - **Mode `clean_dp` — "DP adalah daerah yang bersih"** *(default, identik dengan `153212`, `153326`, `153408`)*:
     - Untuk **setiap** pertidaksamaan $i$, bentuk poligon pita (*half-plane band*) pada sisi yang **TIDAK memenuhi** ($g_i(x,y) > 0$) selebar $W_{\text{band}}$ (atau hingga tepi viewport) lalu isi dengan warna berbeda semi-transparan (`#FDE68A`, `#93C5FD`, `#BBF7D0`, `#FDBA74`, `#94A3B8`).
     - Hasilnya: seluruh area salah tertutup pita warna, menyisakan **poligon `DP` putih bersih** di tengah, lengkap dengan kotak keterangan **`DP adalah daerah yang bersih`** dan label **`DP`** di pusat poligon!
   - **Mode `shaded_dp` — "Daerah yang diarsir adalah DP"** *(identik dengan `153011.png`)*:
     - Isi poligon `feasiblePolygon` dengan warna abu/biru solid semi-transparan, tandai titik-titik sudutnya ($A, B, C, \dots$) dengan titik biru + label koordinat, dan biarkan area luar tetap putih bersih!
5. **Garis Batas, Label Persamaan & Anotasi Otomatis**:
   - Gambar sumbu-$x$ dan sumbu-$y$ berpanah dengan angka tepat di semua titik potong sumbu (`0, 2, 6, 7, 8, 10`, dll. — tanpa label bertabrakan!).
   - Gambar tiap garis batas: **garis solid** untuk $\le, \ge$ dan **garis putus-putus** untuk $<, >$, lengkap dengan label pertidaksamaan (`x + 2y <= 10`, `x >= 2`, `y <= 8`) di ujung garis.
   - Opsional tampilkan **Ringkasan Tabel Titik Potong** otomatis di samping grafik (menggunakan `SmartTableWidget` V9!) dan **Verifikasi Jawaban Siswa** bila user ikut menyeleksi tabel/opsi jawaban buatan sendiri!

---

## 3. Widget Visualisasi & Integrasi UX di Whiteboard + Notes

1. **Tombol Aksi Kontekstual pada Seleksi (`SelectionAnalyzerBar`)**:
   - Setiap kali user menyeleksi blok rumus/teks/tabel (baik 1 objek maupun *multi-select* seluruh langkah penyelesaian di Whiteboard atau Notes), jika `selectionAnalyzer` mendeteksi SPtLDV / SPLDV / Pertidaksamaan Kuadrat / Operasi Bilangan Bulat, muncul pill tombol:
     - **`Analisis & Gambar Grafik (DP)`** (untuk SPtLDV / SPLDV / Kuadrat)
     - **`Visualisasikan Garis Bilangan`** (untuk Operasi Bilangan Bulat / SPtLSV)
2. **Widget `LinearInequalityGraphWidget.tsx` (`object_type: "viz_inequality_graph"`)**:
   - Mengikuti `CanonicalTransform` OBB (`cx, cy, width, height, rotation`), mendukung Group/Ungroup (`7b97e1e`), copy-paste (`27a7df1`), mobile *pinch-guard* (`f5ffbf2`), dan *Notes parity* (`d65101c`).
   - **Toolbar Ringkas di Bawah Widget**:
     - Toggle **`DP Bersih | DP Diarsir`**
     - Toggle **`Tabel Titik Potong`** (munculkan/sembunyikan tabel $(0, y)$ & $(x, 0)$)
     - Toggle **`Titik Pojok & Z`** (tampilkan koordinat titik sudut & nilai maksimum/minimum fungsi tujuan)
     - Toggle **`Step-by-Step`** (munculkan arsiran satu pertidaksamaan demi satu pertidaksamaan secara berurutan agar guru bisa menjelaskan dari garis ke-1 → garis ke-2 → garis ke-3 → ketemu `DP`!)
     - Tombol **`Edit Pertidaksamaan`** (ubah angka/tanda langsung dan grafik langsung berubah real-time).

---

## 4. Pemetaan File Target & Roadmap Implementasi V10

### 4.1 Pemetaan File Baru & Modifikasi
| Paket / Direktori | File Target | Ringkasan Implementasi |
| :--- | :--- | :--- |
| `packages/whiteboard-core` | `src/integerOpsTypes.ts` *(baru)*, `src/inequalityTypes.ts` *(baru)*, `src/index.ts`, `src/reducer.ts` | Tambah `object_type: "viz_integer_ops"` (`IntegerOpsWidgetProps`) dan `object_type: "viz_inequality_graph"` (`InequalityGraphProps`) dengan `CanonicalTransform` penuh. |
| `packages/math-core` | `src/integerOpsEngine.ts` *(baru)*, `src/linearInequalityEngine.ts` *(baru)*, `src/selectionAnalyzer.ts` *(baru)*, `src/v10Engines.test.ts` *(baru)* | Parser & stepper operasi bilangan bulat (tanda ganda, berantai, perkalian); parser SPtLDV (termasuk `a <= x <= b`), Sutherland–Hodgman half-plane clipping, Cramer intersection, corner objective optimizer, dan verifikasi konsistensi jawaban siswa. |
| `apps/web/src/components/helpers` | `IntegerOpsWidget.tsx` *(baru)* | Renderer SVG/Canvas presisi untuk **Peta Konsep Bilangan Bulat** (`110929.jpg`), **Simulator Lompatan Busur** (`110339.png`), dan mode **Keping Muatan (`+`/`-`)** lengkap dengan animasi step-by-step. |
| `apps/web/src/components/math` | `LinearInequalityGraphWidget.tsx` *(baru)* | Renderer grafik SPtLDV/SPLDV/Kuadrat dengan mode **`DP Bersih`** (pita warna per pertidaksamaan) & **`DP Diarsir`**, step-by-step reveal per garis, label titik potong & titik pojok, plus tabel titik potong & koreksi otomatis. |
| `apps/web/src/pages/whiteboard`, `pages/notes` & `components/whiteboard` | `WhiteboardOverlay.tsx`, `NotesCanvas.tsx`, `TemplateDrawer.tsx`, `SelectionContextBar.tsx`, `pptxExporter.ts`, `packages/canvas-mcp` | Tambah 2 template **Bilangan Bulat** di `TemplateDrawer` (drag & click); hubungkan tombol **`Analisis & Visualisasikan`** pada multi-select/text-select di Whiteboard & Notes; daftarkan ke `pptxExporter` & `canvas-mcp`. |

### 4.2 Urutan Sprint & Kriteria Verifikasi

- **Sprint 1 — Interactive Integer Operations & Concept Map (`IntegerOpsWidget`)**:
  - Bangun `integerOpsEngine.ts` dan `IntegerOpsWidget.tsx` (3 mode: `concept_map`, `operations` dengan busur lompat hijau/merah & lingkaran hasil, dan `integer_chips` zero-pair) + daftarkan di `TemplateDrawer` untuk Whiteboard & Notes.
  - *Verifikasi*: Unit test `integerOpsEngine` untuk `-1 + 3 = 2`, `-1 - 3 = -4`, `3 - (-2) = 5`, `2 - 5 + 4 = 1`, dan `3 * (-2) = -6`; animasi lompatan berjalan mulus per langkah dan tampilan responsif di PC/Tablet/HP.
- **Sprint 2 — SPtLDV / SPLDV / Program Linear Exact Engine (`linearInequalityEngine.ts` + `LinearInequalityGraphWidget.tsx`)**:
  - Implementasi parser pertidaksamaan tunggal & ganda (`2 <= x <= 6`), Sutherland–Hodgman clipping, mode **`DP Bersih`** vs **`DP Diarsir`**, step-by-step reveal tiap pita warna, tabel titik potong, dan optimasi titik pojok $Z = px + qy$.
  - *Verifikasi*: Unit test `v10Engines.test.ts` memverifikasi 100% ketiga contoh screenshot:
    1. `{x + 2y <= 10, x + y <= 7, x >= 0, y >= 0}` → titik pojok `(0,0), (7,0), (4,3), (0,5)`.
    2. `{2x + 3y <= 12, x >= 1, y >= 1}` → titik pojok `(1,1), (4.5,1), (1, 10/3)`.
    3. `{x + y <= 7, 2 <= x <= 6, 0 <= y <= 8}` → titik pojok `(2,0), (6,0), (6,1), (2,5)`.
- **Sprint 3 — Selection-to-Visual Analyzer Bridge (Whiteboard + Notes + Answer Verification)**:
  - Bangun `selectionAnalyzer.ts` dan tombol **`Analisis & Visualisasikan`** saat user menyeleksi banyak blok jawaban (rumus, teks, tabel, atau tulisan tangan) di Whiteboard & Notes, plus dukungan verifikasi kesalahan titik potong siswa, ekspor PPTX, dan integrasi `canvas-mcp`.
  - *Verifikasi*: Seleksi 4 blok pertidaksamaan + tabel titik potong di kanvas → klik `Analisis & Visualisasikan` → langsung muncul `LinearInequalityGraphWidget` di samping soal dengan `DP` akurat tanpa overlap label; seluruh `pnpm test:all && pnpm build` lulus 100%.
