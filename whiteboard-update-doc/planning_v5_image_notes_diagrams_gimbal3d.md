# Master Engineering Specification V5: Image Tracing Layer, Freenote-Style `/notes` Workspace, Formula-to-Diagram/Chart Synthesizer, Textbook Geometry Primitives & 3D 360° Gimbal Ring Gizmo

Dokumen spesifikasi teknis ini dirancang sebagai **blueprint siap-eksekusi untuk AI Agent (Gemini 4 Neon)** dengan formulasi matematika, skema tipe TypeScript, arsitektur komponen, dan kontrak verifikasi yang terintegrasi langsung ke basis kode [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/) pada commit terbaru [`32f3dd3`](https://github.com/xDzaky/ai-interactive-classroom/commit/32f3dd31896359d08b2de76ad9001db83beb1ae9).

## 0. Audit Baseline Commit `32f3dd3`

Commit [`32f3dd3`](https://github.com/xDzaky/ai-interactive-classroom/commit/32f3dd31896359d08b2de76ad9001db83beb1ae9) (*`feat(lab): replace external PhET iframe with 12 native full-screen AI Interactive Classroom virtual labs`*) mengganti embed PhET eksternal dengan 12 lab virtual offline-first (`MathLabs.tsx`, `PhysicsLabs.tsx`, `ChemistryLabs.tsx`, `BiologyLabs.tsx`) dan tidak mengubah `WhiteboardCanvas.tsx`, `TongchuangSolidWidget.tsx`, `TemplateDrawer.tsx`, `router/index.tsx`, maupun `packages/whiteboard-core`.

Artinya, seluruh fondasi V1–V4 (`CanonicalTransform` OBB, `touchGestureEngine`, `TemplateDrawer`, `TongchuangSolidWidget` dengan `Line2` & glassmorphic material, `MathTextBlockWidget` berbasis `MathLive`, `dexie` IndexedDB, dan `perfect-freehand`) tetap utuh dan siap diperluas oleh 5 modul V5 di bawah ini.

## 1. Modul 1 — Image Layer & Sketch-Tracing Engine (Upload, Paste `Ctrl+V`, Opacity, Lock)

### 1.1 Data Model & Penyimpanan Biner (`packages/whiteboard-core` & `dexie`)

Jangan simpan string `base64` gambar beresolusi tinggi langsung di dalam `scene.objects` (akan membengkakkan event replay & undo stack). Pisahkan penyimpanan biner ke **IndexedDB (`dexie`)**:

```
// apps/web/src/lib/mediaStore.ts
export interface StoredMediaAsset {
  assetId: string;          // SHA-256 hex digest (deduplikasi otomatis)
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml" | "image/gif";
  blob: Blob;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
}

// Payload props pada BoardObject (object_type: "image")
export interface ImageObjectProps {
  assetId: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;         // radian, center-pivot (CanonicalTransform)
  opacity: number;          // [0.05, 1.0], default 1.0 (Tracing preset: 0.30)
  locked: boolean;          // true => pass-through pointer untuk tracing manual
  zLayer: "background" | "normal" | "foreground";
  aspectLocked: boolean;    // default true
  flipX?: boolean;
  flipY?: boolean;
  crop?: { x: number; y: number; w: number; h: number }; // normalized [0..1]
  grayscale?: boolean;      // opsional untuk mode sketsa tracing
  label?: string;
}

```

### 1.2 Pipeline Ingestion (3 Jalur)

1. **Upload Button** (`<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" multiple />`).

2. **Global Clipboard Paste (`Ctrl+V` / `Cmd+V`)**:

   * Listener pada `window` (diabaikan jika `document.activeElement` adalah `<input>`, `<textarea>`, atau `<math-field>`):

   * Iterasi `event.clipboardData.items` → ambil item `kind === "file"` & `type.startsWith("image/")` → konversi `getAsFile()` menjadi `Blob` → simpan ke `mediaStore.putAsset(blob)` → hitung dimensi proporsional (maksimal `min(naturalWidth, viewportWorldWidth * 0.65)`) → dispatch `object.created` pada pusat viewport aktif.

3. **Drag-and-Drop File dari OS** (`onDragOver` + `onDrop` pada container `WhiteboardCanvas` & `NotesCanvas`): konversi `(e.clientX, e.clientY)` lewat `ViewportController.screenToWorld()` agar gambar jatuh tepat di posisi kursor.

### 1.3 Logika Tracing Mode (`opacity` + `locked` + Pass-Through Hit-Testing)

* Di `apps/web/src/lib/selectionHitTest.ts`:

  * Tambahkan filter: `if (obj.props.locked && !opts.includeLocked) return false;`.

  * Saat `locked === true`, pointer event pada `WhiteboardCanvas` **menembus** gambar langsung ke alat `Pen`, `Auto-Shape`, atau `Multi-Stroke 3D`, sehingga guru/siswa dapat menjiplak (*trace*) sketsa di atas gambar tanpa gambar ikut tergeser.

* **Image Context Floating Toolbar** (muncul saat gambar tidak terkunci & dipilih):

  * Slider **`Opacity`** (`5%–100%`) + tombol cepat **`Mode Sketsa (30% + Lock + Belakang)`**.

  * Tombol **`Kunci / Buka Kunci`**, **`Taruh Belakang` / `Taruh Depan`**, **`Flip H/V`**, **`Crop`**, **`Duplikat`**, **`Hapus`**.

* **Unlock Mechanism**: Gambar yang terkunci selalu tampil di **Layers Panel (`Lapisan`)** dengan ikon gembok 1-klik untuk membuka kunci kembali (plus opsi *double-click* pada badge gembok kecil di pojok gambar saat alat `Select` aktif).

## 2. Modul 2 — Dedicated `/notes` Workspace (Arsitektur Freenote Cross-Device)

Tambahkan rute baru `/notes` dan `/notes/:notebookId` di `apps/web/src/router/index.tsx` (beserta navigasi 1-klik **`Catatan`** ↔ **`Whiteboard`** di header) yang berbagi engine inti `packages/whiteboard-core`, `packages/sketch-core`, dan `packages/math-core`.

### 2.1 Dual-Canvas Engine: Infinite Study Board & Multi-Page Notebook

Mengacu pada gaya catatan *infinite canvas* (mind-map + diagram + anotasi bebas) dan manajemen halaman bergaya [Freenote](https://www.freenotetech.com/#home):

```
export type PaperTemplateKind =
  | "blank" | "ruled" | "grid" | "dot_grid" | "cornell" | "isometric_dot" | "music_staff";

export interface NotePage {
  id: string;
  index: number;
  mode: "infinite" | "paged";
  pageSize?: { widthPx: number; heightPx: number; preset: "A4" | "Letter" | "16:9" | "Custom" };
  template: PaperTemplateKind;
  templateColor: string;
  templateSpacingPx: number; // mis. 28px
  backgroundPdfAssetId?: string;
  backgroundPdfPage?: number;
  layers: NoteLayer[];
  objects: BoardObject[];
  strokes: StrokeData[];
}

export interface NoteLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // [0..1]
  order: number;
}

```

### 2.2 Sistem Alat & Floating Pill UI (Adaptasi Freenote)

1. **Top Floating Pill Left (Manajemen Notebook)**:

   * `<` (Daftar Notebook), `⊞` (Page Grid Overview — *reorder/duplicate/delete* halaman), `Undo`, `Redo`, `+ Halaman` (**Popover Tambah Halaman**: *Template Saat Ini*, *Polos*, *Bergaris*, *Grid*, *More Template*, *Impor PDF*, *Impor Gambar*), dan tombol **`+` / Menu Utilitas** (4 tab: **`Umum | Kanvas | Menulis | Lainnya`**):

     * *Umum*: `Lapisan (Layers)`, `Cari (Full-text & LaTeX Search)`, `Perekaman Audio + Transkripsi Otomatis`, `Timer Belajar`, `Tangkapan Layar (Snip to Canvas)`, `Ambil Foto (getUserMedia)`, `Feynman AI / Asisten AI`.

     * *Kanvas*: `Ubah Mode (Infinite ↔ Halaman)`, `Ubah Template Kertas`, `Impor PDF` (render tiap halaman PDF menjadi layer terkunci menggunakan `pdfjs-dist`), `Ekspor PNG / PDF`.

2. **Top Floating Pill Right (Pen Rack)**:

   * **Ballpoint & Fountain Pen**: `perfect-freehand` dengan parameter `thinning`, `smoothing`, `streamline`; memakai `e.pressure` asli untuk stylus (`pointerType === "pen"`) dan simulasi kecepatan (*velocity-based pressure*) untuk mouse/jari.

   * **Highlighter (`Stabilo`)**: Ujung pipih lebar dengan `globalCompositeOperation = "multiply"` (warna kuning/hijau/pink/biru pastel transparan yang tidak pernah menutup teks hitam di bawahnya).

   * **Pena Laser (`LaserPointerEngine.ts`)**:

     * Mode: `"dot"` (*Tidak Ada Ekor*) vs `"trail"` (*Ekor memudar*).

     * Parameter: `thickness` (`0.5–3.0`), `durationSec` (`0.5–4.0s`), `color` swatches + custom hex.

     * Implementasi performa tinggi: dirender pada **overlay `<canvas>` transparan terpisah** dengan `requestAnimationFrame` loop yang menghapus titik berumur $t - t_i > \text{durationSec}$ dan menginterpolasi opasitas $\alpha_i = \max\left(0, 1 - \frac{t - t_i}{\text{durationSec}}\right)^2$ serta lebar ekor $w_i = w_0 \cdot \alpha_i$. **Tidak pernah menulis ke state/undo stack!**

   * **Penggaris & Busur Virtual**, **Penghapus** (*Stroke Eraser* & *Pixel/Partial Eraser*), **Lasso Select**, **Teks & Blok Rumus (`MathLive`)**, dan **Sisipkan Gambar**.

### 2.3 Cross-Device Input & Palm Rejection Engine (`apps/web/src/lib/inputRouter.ts`)

Agar berjalan mulus di **PC Desktop**, **Tablet Touchscreen/Stylus**, dan **Smartphone**:

* **Stylus Palm Rejection**:

  * Jika terdeteksi event `e.pointerType === "pen"`, set `lastPenTimestamp = performance.now()`.

  * Selama `performance.now() - lastPenTimestamp < 450` (atau `activePenId !== null`), semua input `pointerType === "touch"` tunggal diblokir untuk menggambar (hanya 2-finger pinch/pan yang tetap diizinkan!).

* **Responsive Breakpoints**:

  * Desktop (`>= 1024px`): Dual floating pills di atas + panel `Lapisan`/`AI` di sisi kanan.

  * Tablet (`768–1023px`): Floating pills penuh + dukungan stylus penuh + *split-view friendly*.

  * Mobile (`< 768px`): Pill atas diringkas menjadi 1 bar kompak, *Pen Rack* berpindah ke *bottom thumb bar*, dan semua popover (`Tambah Halaman`, `Pena Laser`, `Lapisan`) tampil sebagai *Bottom Sheet* (`touch-action: none`).

## 3. Modul 3 — Precision Formula-to-Diagram / Chart / Graph Synthesizer

Alur pengguna: **Pilih (select) rumus, persamaan, identitas trigonometri, atau ekspresi data** pada `MathTextBlockWidget` atau hasil tulisan tangan di Whiteboard/Notes → klik **`Jadikan Grafik / Diagram / Chart`**.

### 3.1 Arsitektur Classifier & Verifier (`packages/math-core/src/diagramSynthesizer.ts`)

Seluruh input diparsing ke **MathJSON AST** oleh `@cortex-js/compute-engine` (atau `parseExpression` fallback) — **nol `eval()`**.

```
export type SynthesizedVisualSpec =
  | { kind: "textbook_function_graph"; expressions: ParsedFuncSpec[]; domain: [number, number]; xAxisMode: "numeric" | "pi_fraction"; showExtrema: boolean; showRoots: boolean; showDashedProjections: boolean }
  | { kind: "trig_identity_proof"; identityId: TrigIdentityId; thetaDeg: number; interactive: boolean }
  | { kind: "stat_chart"; chartType: "bar" | "line" | "pie" | "scatter" | "histogram"; labels: string[]; series: { name: string; values: number[]; color: string }[] }
  | { kind: "surface_3d"; exprZ: string; domainX: [number, number]; domainY: [number, number] }
  | { kind: "geometry_solid_2d_3d"; target: string; params: Record<string, number> };

```

### 3.2 Presisi Matematika Tanpa Error (Algoritma Inti)

1. **Deteksi Sumbu** $\pi$**-Rasional & Interval Domain**:

   * Jika ekspresi mengandung fungsi trigonometri (`sin`, `cos`, `tan`, `csc`, `sec`, `cot`) dan/atau domain eksplisit seperti `0 <= x <= 2\pi`, otomatis aktifkan `xAxisMode: "pi_fraction"` dengan label tick exact ($0, \frac{\pi}{2}, \pi, \frac{3\pi}{2}, 2\pi$ — persis seperti `image_ea0bbe.png`).

2. **Adaptive Sampling & Discontinuity Clamping**:

   * Sampling awal $N = 400$ titik, dilanjutkan subdivisi adaptif jika $\vert{}\Delta^2 y\vert{} > \epsilon$.

   * Jika $\vert{}f(x_{i+1}) - f(x_i)\vert{} > 10 \cdot \text{rangeY}$ atau $\vert{}f'(x)\vert{} > 10^4$ atau `NaN`/`!Number.isFinite(y)`, **putus polyline** (*split path*) dan gambar garis asimtot vertikal putus-putus (mencegah garis vertikal error pada $\tan x$ atau $\frac{1}{x-a}$).

3. **Pencarian Exact Extrema (`maks.`, `min.`) & Akar (**$f(x) = 0$**)**:

   * Gunakan turunan numerik pusat $f'(x) \approx \frac{f(x+h)-f(x-h)}{2h}$ ($h = 10^{-5}$) + **Brent's / Bisection Root Refinement** (toleransi $10^{-7}$) untuk menemukan titik stasioner ($f'(x)=0$) dan akar ($f(x)=0$).

   * Klasifikasikan `maks.` ($f''(x) < 0$) dan `min.` ($f''(x) > 0$), tempatkan titik merah, label miring `maks.`/`min.`, serta **garis proyeksi putus-putus horizontal & vertikal** ke sumbu $y$ dan $x$.

4. **Katalog Pembuktian Visual Identitas Trigonometri** (merujuk [Wikipedia: List of trigonometric identities](https://en.wikipedia.org/wiki/List_of_trigonometric_identities)):

   * Mendukung generator diagram bukti geometris parametrik untuk:

     * **Double-Angle** ($\cos 2\theta = 2\cos^2\theta - 1$, $\sin 2\theta = 2\sin\theta\cos\theta$ — menghasilkan diagram segitiga `A-B-D-E-F` persis seperti `image_f3fc8a.png` dengan slider $\theta$!).

     * **Pythagorean Identity** ($\sin^2\theta + \cos^2\theta = 1$, lingkaran satuan + segitiga siku-siku).

     * **Angle Sum & Difference** ($\sin(\alpha+\beta)$, $\cos(\alpha+\beta)$, konstruksi persegi panjang bertingkat).

     * **Law of Sines & Law of Cosines** ($c^2 = a^2 + b^2 - 2ab\cos C$).

5. **Chart Statistik Presisi**:

   * Parsing input daftar angka/pasangan kunci-nilai (`[10, 25, 18, 30]` atau `Senin=12, Selasa=19, Rabu=15` atau tabel 2 kolom) → merender Bar/Line/Pie/Scatter chart vektor tajam yang bisa diubah tipe chart-nya 1-klik tanpa error skala.

## 4. Modul 4 — Textbook Geometry & Graph Primitives (Mampu Menggambar `image_f3fc8a.png` & `image_ea0bbe.png`)

Tambahkan 5 primitif vektor kelas buku teks ke `packages/whiteboard-core` (tersedia baik di **Whiteboard** maupun **Notes**):

| Primitif Baru (`object_type`) | Parameter Matematis Inti | Kemampuan Visual yang Dihasilkan | 
| ----- | ----- | ----- | 
| **`angle_arc`** | `{ vertex: Pt, startRad, endRad, radiusPx, concentricTier: 1|2|3, labelLatex?: string, color }` | Busur sudut presisi yang mendukung **busur konsentris bertumpuk** (contoh: $\theta$, $\theta$, dan $2\theta$ di titik `A` pada `image_f3fc8a.png`), otomatis menghitung besar sudut dalam derajat/radian. | 
| **`right_angle_marker`** | `{ vertex: Pt, uDir: Vec2, vDir: Vec2, sizePx: 14, fill, stroke }` | Kotak penanda sudut siku-siku $90^\circ$ ($\square$) otomatis di titik `F`, `E`, dan kaki garis tinggi pada `AD` di `image_f3fc8a.png` menggunakan basis ortonormal $(\hat{u}, \hat{v})$: 4 titik $[V,\; V+s\hat{u},\; V+s\hat{u}+s\hat{v},\; V+s\hat{v}]$. | 
| **`edge_label`** | `{ p1: Pt, p2: Pt, t: number, offsetPerpPx: number, latex: string, alignToEdge: boolean, color }` | Label LaTeX (rendered via KaTeX) yang menempel di posisi $P(t) = (1-t)P_1 + tP_2 + d_\perp \hat{n}$ dengan rotasi otomatis $\alpha = \text{atan2}(\Delta y, \Delta x)$ (dibalik $+\pi$ jika $\vert{}\alpha\vert{} > \frac{\pi}{2}$ agar tidak pernah terbalik — persis label $\cos\theta$ dan $2\cos\theta$ di `image_f3fc8a.png`!). | 
| **`perp_snap_tool`** *(Alat Snap Garis Tinggi)* | Proyeksi ortogonal titik $B$ ke segmen $AD$: $H = A + \text{clamp}\left(\frac{(B-A)\cdot(D-A)}{\Vert{}D-A\Vert{}^2}, 0, 1\right)(D-A)$ | Saat guru menarik garis dari sudut `B` mendekati garis tegak lurus pada sisi `AD` ($\pm 4^\circ$), garis otomatis *snap* ke titik kaki tegak lurus $H$ dan memunculkan `right_angle_marker` secara instan! | 
| **`textbook_graph`** | `{ funcs, domainX, rangeY, xAxisMode: "pi_fraction"|"numeric", extremaMarkers, dashedProjections, titleLatex }` | Grafik fungsi buku teks dengan sumbu berpanah, skala pecahan $\pi$, titik `maks.`/`min.`, dan garis putus-putus proyeksi (`image_ea0bbe.png`), dapat diedit ulang propertinya dan diekspor tajam. | 

## 5. Modul 5 — 3D 360° 3-Axis Rotation Gimbal Ring Gizmo (Referensi `Screenshot_20261124-234114.jpg.jpg`)

Tambahkan komponen **`RotationGimbal3D`** (`apps/web/src/lib/threeRotationGimbal.ts`) yang membungkus bangun ruang di dalam `TongchuangSolidWidget.tsx` saat mode **`Putar`** aktif (dengan toggle tampilan cincin on/off).

### 5.1 Geometri Visual & Hitbox 3 Cincin Ortogonal

Hitung jari-jari cincin dari *bounding sphere* bangun 3D: $R = 1.28 \cdot r_{\text{sphere}}$.

| Sumbu | Warna Cincin | Bidang Cincin & Normal $\hat{n}$ | Geometri Visual & Hit-Test | 
| ----- | ----- | ----- | ----- | 
| **X-Axis (Pitch)** | Oranye-Merah (`#F97316`) | Bidang $YZ$, $\hat{n}_x = (1, 0, 0)$ | Visible `TorusGeometry(R, 0.032, 16, 96)` + Invisible Hit-Torus (`tube = 0.14`, `visible = false`) agar mudah disentuh jari di tablet/smartboard! | 
| **Y-Axis (Yaw)** | Hijau (`#22C55E`) | Bidang $XZ$, $\hat{n}_y = (0, 1, 0)$ | Rotasi `rotation.x = Math.PI / 2`. | 
| **Z-Axis (Roll)** | Cyan-Biru (`#06B6D4`) | Bidang $XY$, $\hat{n}_z = (0, 0, 1)$ | Default orientasi `TorusGeometry` di bidang $XY$. | 

Tambahkan juga **1 Outer Screen-Space Trackball Ring** tipis berwarna abu-abu lembut (`#94A3B8`, radius $1.10 R$, selalu menghadap kamera via `quaternion.copy(camera.quaternion)`) untuk rotasi *screen-roll* bebas, sementara menyeret bagian dalam bola (di luar ketiga cincin) tetap melakukan rotasi *free arcball* 360°.

### 5.2 Matematika Rotasi Quaternion Bebas Gimbal Lock (`threeRotationGimbal.ts`)

Menggunakan kuaternion inkremental (menghindari *gimbal lock* Euler angles sebagaimana standar [Three.js `Object3D.quaternion`](https://threejs.org/docs/#api/en/core/Object3D.rotation)):

1. **Axis Picking (`pointerdown`)**:

   * Lakukan `raycaster.intersectObjects([hitRingX, hitRingY, hitRingZ])`.

   * Jika mengenai cincin sumbu $\hat{a}$: kunci `activeAxis = a`, simpan `startQuat = solidGroup.quaternion.clone()`, dan bentuk bidang rotasi $\Pi: (\mathbf{p} - \mathbf{c}) \cdot \hat{a}_{\text{world}} = 0$.

   * Hitung titik awal $\mathbf{p}_0 = \text{rayPlaneIntersect}(\text{ray}_0, \Pi)$ dan vektor satuan $\mathbf{v}_0 = \frac{\mathbf{p}_0 - \mathbf{c}}{\Vert{}\mathbf{p}_0 - \mathbf{c}\Vert{}}$.

2. **Continuous 360° Drag (`pointermove`)**:

   * **Kasus Normal** ($\vert{}\mathbf{d}_{\text{cam}} \cdot \hat{a}_{\text{world}}\vert{} \ge 0.14$): Hitung $\mathbf{p}_t = \text{rayPlaneIntersect}(\text{ray}_t, \Pi)$, $\mathbf{v}_t = \frac{\mathbf{p}_t - \mathbf{c}}{\Vert{}\mathbf{p}_t - \mathbf{c}\Vert{}}$, lalu sudut bertanda:

$$
\Delta\theta = \text{atan2}\Big(\big((\mathbf{v}_0 \times \mathbf{v}_t) \cdot \hat{a}_{\text{world}}\big),\; \mathbf{v}_0 \cdot \mathbf{v}_t\Big)
$$

* **Edge-On Fallback** ($\vert{}\mathbf{d}_{\text{cam}} \cdot \hat{a}_{\text{world}}\vert{} < 0.14$, saat cincin terlihat hampir sejajar garis pandangan kamera): Proyeksikan garis singgung cincin di titik $\mathbf{p}_0$ ($\vec{\tau} = \hat{a}_{\text{world}} \times \mathbf{v}_0$) ke ruang layar 2D $\vec{\tau}_{\text{screen}}$, lalu hitung $\Delta\theta = k \cdot (\Delta\mathbf{s}_{\text{pointer}} \cdot \hat{\tau}_{\text{screen}})$ sehingga rotasi tidak pernah melompat/liar!

* **Angle Snapping**: Jika `Shift` ditekan atau mode *Snap* $15^\circ$ aktif: $\Delta\theta \leftarrow \text{round}(\Delta\theta / \frac{\pi}{12}) \cdot \frac{\pi}{12}$.

* **Quaternion Update**:

$$
q_{\Delta} = \text{Quaternion.setFromAxisAngle}(\hat{a}_{\text{world}}, \Delta\theta), \qquad q_{\text{solid}} = q_{\Delta} \cdot q_{\text{start}}
$$

3. **Umpan Balik Visual Saat Diputar**:

   * **Active Angle Wedge**: Render kipas sudut (*sector mesh*) semi-transparan di dalam cincin aktif dari $\mathbf{v}_0$ ke $\mathbf{v}_t$ agar besar putaran ($0^\circ \to 360^\circ$) terlihat secara geometris!

   * **Dimming & Highlight**: Cincin aktif menyala tegas (`opacity: 1.0`, skala `1.06`), 2 cincin lain meredup (`opacity: 0.22`).

   * **Live Degree HUD**: Badge imperatif di dekat kursor/cincin menampilkan `X: 135°` (dinormalisasi ke $[0^\circ, 360^\circ)$) serta opsi reset 1-klik `0°`.

## 6. Pemetaan File Target & Urutan Implementasi untuk Agent

### 6.1 Peta File Baru & Modifikasi

| Paket / Direktori | File Target | Ringkasan Implementasi | 
| ----- | ----- | ----- | 
| `packages/whiteboard-core` | `src/index.ts`, `src/reducer.ts`, `src/notesTypes.ts` (baru) | Tambah `ImageObjectProps`, primitif `angle_arc`, `right_angle_marker`, `edge_label`, `textbook_graph`, serta tipe `NotePage` & `NoteLayer`. | 
| `packages/math-core` | `src/diagramSynthesizer.ts` (baru), `src/trigIdentities.ts` (baru), `src/diagramSynthesizer.test.ts` (baru) | Classifier & verifier formula → grafik fungsi ($\pi$-ticks, extrema Brent/Bisection, discontinuity clamping), katalog bukti visual identitas trigonometri, dan parser chart statistik. | 
| `apps/web/src/lib` | `mediaStore.ts` (baru), `laserPointerEngine.ts` (baru), `inputRouter.ts` (baru), `threeRotationGimbal.ts` (baru), `selectionHitTest.ts` | IndexedDB `dexie` blob storage untuk gambar; engine *Pena Laser* RAF; *stylus palm rejection*; *3-axis quaternion gimbal ring* + edge-on fallback; filter `locked` pass-through di `selectionHitTest.ts`. | 
| `apps/web/src/components/math` | `TongchuangSolidWidget.tsx`, `TextbookGraphWidget.tsx` (baru), `StatChartWidget.tsx` (baru) | Integrasi `RotationGimbal3D` (3 cincin X/Y/Z + wedge + HUD derajat $0^\circ$–$360^\circ$); renderer grafik fungsi buku teks (`image_ea0bbe.png`) & chart statistik vektor. | 
| `apps/web/src/components/whiteboard` | `ImageContextToolbar.tsx` (baru), `LayersPanel.tsx` (baru), `MathTextBlockWidget.tsx` | Kontrol `opacity`/`lock`/tracing/crop gambar; panel `Lapisan`; tombol **`Jadikan Grafik / Diagram / Chart`** pada rumus terpilih. | 
| `apps/web/src/pages/notes` | `NotesPage.tsx` (baru), `NotesCanvas.tsx` (baru), `NotesToolbarPills.tsx` (baru), `AddPagePopover.tsx` (baru), `LaserToolPopover.tsx` (baru) | Halaman `/notes` lengkap bergaya Freenote (Infinite + Paged, template kertas, impor PDF/Gambar, *Pen Rack* + *Highlighter* + *Pena Laser*, *Layers*, audio/timer/snip, responsif PC/Tablet/HP). | 
| `apps/web/src/pages/room` & `router` | `PersonalRoomPage.tsx`, `WhiteboardCanvas.tsx`, `router/index.tsx` | Tambah listener global `paste` (`Ctrl+V`) & drag-drop file gambar, render primitif geometri baru (`angle_arc`, `right_angle_marker`, `edge_label`, `perp_snap_tool`), serta rute `/notes` dan tombol pindah `Whiteboard ↔ Catatan`. | 

### 6.2 Urutan Sprint & Kriteria Verifikasi Otomatis

* **Sprint 1 — 3D 360° Gimbal Ring Gizmo & Image Tracing Layer**:

  * Implementasi `threeRotationGimbal.ts` + integrasi ke `TongchuangSolidWidget.tsx`; implementasi `mediaStore.ts`, global `Ctrl+V` paste, drag-drop file, `ImageContextToolbar.tsx` (`opacity`, `locked` pass-through, tracing mode), dan `LayersPanel.tsx`.

  * *Verifikasi*: Unit test kuaternion (`threeRotationGimbal.test.ts`: nol *gimbal lock* pada rotasi $90^\circ$ X lalu $180^\circ$ Y, edge-on fallback stabil); Playwright E2E test paste/upload gambar → set `opacity: 0.3` + `lock` → gambar garis di atas gambar tanpa gambar ikut bergeser.

* **Sprint 2 — Textbook Geometry Primitives & Formula-to-Diagram/Chart Synthesizer**:

  * Implementasi `angle_arc`, `right_angle_marker`, `edge_label`, `perp_snap_tool`, `diagramSynthesizer.ts`, `trigIdentities.ts`, `TextbookGraphWidget.tsx`, dan `StatChartWidget.tsx`.

  * *Verifikasi*: Unit test `diagramSynthesizer.test.ts` ($y = \sin x$ pada $[0, 2\pi]$ menghasilkan `maks.` di $(\frac{\pi}{2}, 1)$ dan `min.` di $(\frac{3\pi}{2}, -1)$ galat $< 10^{-6}$; $\tan x$ tidak menggambar garis vertikal asimtot; identitas $\cos 2\theta = 2\cos^2\theta - 1$ merender diagram segitiga `A-B-D-E-F` lengkap dengan busur $\theta, 2\theta$ dan kotak siku-siku $90^\circ$).

* **Sprint 3 — Dedicated `/notes` Workspace (Freenote-Style Cross-Device)**:

  * Bangun `/notes` (`NotesPage.tsx`, `NotesCanvas.tsx`, `NotesToolbarPills.tsx`, `AddPagePopover.tsx`, `LaserToolPopover.tsx`, `laserPointerEngine.ts`, `inputRouter.ts` dengan *palm rejection*, impor PDF/Gambar, mode *Infinite* & *Paged*, serta responsivitas PC/Tablet/HP).

  * *Verifikasi*: Uji di viewport Desktop (`1440px`), Tablet (`820px`), dan Mobile (`390px`); *Pena Laser* memudar mulus sesuai slider durasi tanpa masuk undo stack; *palm rejection* memblokir sentuhan telapak saat stylus aktif; seluruh suite `pnpm test:all && pnpm build` lulus 100%.