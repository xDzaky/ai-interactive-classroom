# Master Plan Arsitektur & Pengembangan: AI Interactive Classroom

Dokumen perencanaan ini merupakan penyempurnaan menyeluruh berdasarkan:
1. Audit langsung commit terbaru repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom) (commit [`5aa0055`](https://github.com/xDzaky/ai-interactive-classroom/commits/main/), [`35c29c5`](https://github.com/xDzaky/ai-interactive-classroom/commit/35c29c59bad1ac1c29fee491cf7d4bcf6b5162fb), [`781475c`](https://github.com/xDzaky/ai-interactive-classroom/commit/781475c86570d0ca53d5afa42d8c369dde3f6ff5), dan [`4d7a9c5`](https://github.com/xDzaky/ai-interactive-classroom/commit/4d7a9c5b1c7c91c51e4bfa7e79cbb88ef0f609de)) serta analisis tangkapan layar aplikasi saat ini.
2. Referensi ekosistem **iFLYTEK Tongchuang AI Blackboard (讯飞同窗AI黑板)** ([Produk Resmi](https://edu.iflytek.com/solution/school/smartwindow), [Rilis 24 Okt 2025](https://edu.iflytek.com/about-us/news/company-news/2475.html), [WAIC 2026](https://edu.iflytek.com/about-us/news/company-news/2801), [CEEE 2026](https://edu.iflytek.com/about-us/news/company-news/2949.html)) yang diadaptasi penuh ke platform web lintas perangkat tanpa membutuhkan hardware khusus.
3. Prinsip desain **Satu Workspace Terbuka (Tanpa Pembatasan Jenjang)**: seluruh fitur bangun datar, bangun ruang, kalkulator/teks matematika auto-format, interaksi AI, dan kolaborasi kelas tersedia langsung dalam **toolbar yang ringkas, bersih, dan sangat mudah digunakan guru**, namun memiliki kapabilitas kustomisasi sistem tingkat tinggi.

---

## 1. Audit Commit Terbaru & Diagnosis Root Cause Bug

Stack aktif di [`apps/web/package.json`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/package.json) mencakup React 19, `konva` (`9.3.14`) + `react-konva` (`19.0.3`), `three` (`0.169.0`), `mathlive` (`0.111.0`), `katex` (`0.16.11`), `mafs` (`0.21.0`), dan `zustand` (`5.0.2`), dengan paket monorepo `whiteboard-core`, `geometry-core`, `math-core`, `construction-core`, `curriculum-schema`, `shared-types`, dan `sketch-core`.

Audit kode dan tangkapan layar mengidentifikasi **5 akar masalah utama** yang wajib dibereskan terlebih dahulu:

| Area Masalah | Bukti di Kode & Tangkapan Layar | Akar Masalah Teknis (Root Cause) |
| :--- | :--- | :--- |
| **1. Miss antara Objek & Selection Box saat Drag/Rotasi** | Kotak seleksi putus-putus ungu (`180 x 180`) melayang di ruang kosong di kiri-atas objek 3D; saat objek diputar atau digeser, hitbox dan handle meleset dari visual objek. | [`selectionHitTest.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/lib/selectionHitTest.ts) hanya memakai *Axis-Aligned Bounding Box* (AABB `{ x, y, w, h }`) tanpa matriks rotasi/OBB. [`resizeHandles.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/lib/resizeHandles.ts) belum memiliki handle rotasi maupun transformasi *world-to-local*. Di sisi lain, [`WhiteboardOverlay.tsx`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/pages/whiteboard/WhiteboardOverlay.tsx) memosisikan overlay DOM (`viz_solid`, `viz_graph`) terpisah dari layer Konva ([`WhiteboardCanvas.tsx`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx)) dengan perbedaan titik tumpu (*top-left* vs *center*) dan padding container 3D. |
| **2. Konflik Dual-Selection & Dual-Toolbar** | Toolbar 2D (`Jelaskan`, `Duplikat`, `Hapus`, `✓`) muncul bersamaan dengan toolbar 3D (`Putar`, `Irisan`, `Jaring`, `Pisah`, dst.) pada satu objek. | State seleksi di `WhiteboardCanvas.tsx` tidak tersinkron penuh dengan state aktif di `TongchuangSolidWidget.tsx`. |
| **3. Tabrakan Overlay & Placeholder WebGL** | Kartu placeholder putih `"Cylinder - Klik untuk interaksi 3D"` menutupi widget grafik `GraphViewer` (`x^2`) di bawahnya. | `WhiteboardOverlay.tsx` membatasi 3 kanvas WebGL aktif dan mengganti sisanya dengan kartu putih buram tanpa *clipping* bounding box dan tanpa manajemen `z-index` deterministik. |
| **4. Konversi 2D → 3D Error & Sisi Tidak Sesuai** | Banyak bangun datar error saat dijadikan 3D, bentuk elips/lengkung menjadi dua elips bersilangan yang rusak, dan jumlah sisi/rusuk tidak akurat. | [`shapeToSolid.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/lib/shapeToSolid.ts) hanya memetakan 3 bentuk (`rect`, `circle`, `triangle`) dan [`threeGeometry.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/lib/threeGeometry.ts) hanya berisi 8 bangun statis (`cube`, `cuboid`, `sphere`, `cylinder`, `cone`, `pyramid`, `prism`, `torus`). Bangun poligon bebas, trapesium, belah ketupat, elips, juring, dan jaring-jaring 2D belum punya pipeline geometri universal. |
| **5. Input Matematika Belum Auto-Format & Terpisah dari Visual** | Input rumus masih terkurung di modal [`FormulaToGraphModal.tsx`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/components/whiteboard/FormulaToGraphModal.tsx) dan parser terbatas di [`packages/math-core/src/index.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/packages/math-core/src/index.ts). | `mathlive` (`0.111.0`) sudah terpasang tetapi belum dimanfaatkan sebagai blok teks/kalkulator matematika langsung di papan tulis dengan auto-format instan (`8^2` → $8^2$) dan pengikatan dua arah ke objek visual 2D/3D. |

---

## 2. Perbaikan Fundamental: Unified Transform, OBB Selection & Viewport Engine

Seluruh bug *miss* antara objek dan blok seleksi saat memindahkan, mengubah ukuran, maupun memutar objek diselesaikan dengan membangun **satu sistem koordinat dan transformasi kanonik**.

### 2.1 Model Transformasi Tunggal (`CanonicalTransform`)
Setiap objek di [`packages/whiteboard-core/src/reducer.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/packages/whiteboard-core/src/reducer.ts) (`shape`, `polygon`, `stroke`, `math_block`, `viz_solid`, `viz_graph`) wajib memakai struktur transformasi berpusat di tengah (*center-pivot*):

```ts
export interface CanonicalTransform {
  cx: number;        // Titik pusat objek pada koordinat World
  cy: number;        // Titik pusat objek pada koordinat World
  width: number;     // Lebar lokal sebelum rotasi (> 0)
  height: number;    // Tinggi lokal sebelum rotasi (> 0)
  rotation: number;  // Sudut rotasi (radian) mengelilingi (cx, cy)
  flipX?: boolean;
  flipY?: boolean;
}
```

Mengacu pada prinsip transformasi [Konva.js (`Position vs Offset`)](https://konvajs.org/docs/posts/Position_vs_Offset.html), menyeragamkan seluruh objek dengan `center-pivot (cx, cy)` dan `offset = (width/2, height/2)` menjamin visual objek dan *selection box* selalu berputar pada poros yang sama persis tanpa bergeser.

### 2.2 Oriented Bounding Box (OBB), Invers Matriks & Handle Rotasi
Perbarui [`selectionHitTest.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/lib/selectionHitTest.ts) dan [`resizeHandles.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/main/apps/web/src/lib/resizeHandles.ts):
1. **Hit-Test Berbasis World-to-Local**:
   Sebelum mengecek apakah klik berada di dalam objek atau handle, transformasikan titik pointer $(P_x, P_y)$ ke koordinat lokal objek dengan rotasi invers $-\theta$:
   $$x_{\text{local}} = (P_x - c_x)\cos(-\theta) - (P_y - c_y)\sin(-\theta)$$
   $$y_{\text{local}} = (P_x - c_x)\sin(-\theta) + (P_y - c_y)\cos(-\theta)$$
2. **Pinned-Anchor Resize pada Objek Miring**:
   Saat pengguna menarik handle sudut/sisi (mis. `se`), hitung perubahan ukuran di ruang lokal lalu kunci posisi titik jangkar berlawanan (`nw`) di ruang dunia agar objek tidak meluncur saat diubah ukurannya dalam kondisi terputar.
3. **Handle Rotasi Khusus (`'rotate'`)**:
   Tambahkan handle rotasi di posisi lokal `(0, -height/2 - 28 / zoom)` dengan sudut `Math.atan2(pointerY - cy, pointerX - cx) + Math.PI / 2`, *snap* otomatis tiap $15^\circ$ saat menahan `Shift`, dan badge indikator sudut live (`45°`).
4. **Vertex Edit Auto-Recenter**:
   Untuk poligon bebas (`customPoints`), simpan titik vertex relatif terhadap `(cx, cy)`. Setelah vertex selesai digeser, lakukan *re-centering* bounding box lokal sehingga pusat `(cx, cy)` tetap presisi tanpa membuat bentuk melompat.

### 2.3 Sinkronisasi Konva ↔ DOM Overlay & Anti-Dual-Toolbar
1. **Formula Proyeksi Identik di `WhiteboardOverlay.tsx`**:
   Seluruh widget DOM (`viz_solid`, `viz_graph`, `math_block`) diposisikan dari `ViewportController` dengan CSS `transform: translate3d(screenX, screenY, 0) translate(-50%, -50%) rotate(rotRad) scale(zoom)` dan ukuran `width x height` persis sama dengan Konva—tanpa margin/padding tambahan yang menggeser pusat objek.
2. **Single Selection State Machine**:
   Hanya satu `selectedIds` aktif. Jika objek yang dipilih adalah `viz_solid` atau `viz_graph`, toolbar 2D (`Jelaskan | Duplikat | Hapus`) **tidak ditampilkan**—digantikan sepenuhnya oleh toolbar kontekstual objek tersebut.
3. **Pemisahan Gestur Drag 2D vs Orbit 3D**:
   Menyeret bingkai/handle memindahkan atau me-resize kotak objek 3D di papan tulis; menyeret isi kanvas 3D saat mode *Orbit* aktif memutar sudut pandang kamera 3D tanpa mengubah koordinat `(cx, cy)`.
4. **High-Res Transparent PNG Snapshot untuk WebGL > 3**:
   Saat jumlah objek 3D melebihi kuota 3 konteks WebGL aktif, simpan tangkapan kanvas WebGL beresolusi tinggi dengan latar transparan (*transparent PNG dataURL*) sebagai tampilan pasif—menghilangkan kartu putih buram `"Cylinder - Klik untuk interaksi 3D"` yang sebelumnya menutupi objek lain.

---

## 3. Arsitektur Visual & Desain Model 3D Kelas Produksi

Agar kualitas visual 3D pada AI Interactive Classroom setara dengan standar estetika **iFLYTEK Tongchuang AI Blackboard** (jernih, elegan, terbaca jelas dari jauh melalui proyektor/Smart TV, namun tetap terasa ringan di browser), seluruh komponen rendering di `TongchuangSolidWidget.tsx` dan `threeGeometry.ts` ditingkatkan dengan standar desain berikut:

| Aspek Desain 3D | Standar Visual & Implementasi di Three.js |
| :--- | :--- |
| **1. Material Glassmorphic / Translucent Buku Teks** | Gunakan `MeshPhysicalMaterial` / `MeshStandardMaterial` semi-transparan dengan palet warna harmonis (biru es, slate lembut, teal, amber lembut), *roughness* halus (`0.25–0.4`), *clearcoat* ringan, serta pemisahan *back-face* dan *front-face* render pass (`THREE.BackSide` lalu `THREE.FrontSide`) untuk menghilangkan artefak *Z-fighting* dan tumpang tindih transparansi. |
| **2. Dual-Pass Textbook Edges (Solid & Dashed Presisi)** | Rusuk depan yang terlihat digambar dengan `Line2` / `LineMaterial` anti-aliased berketebalan konstan (`1.8–2.2px`, warna slate gelap `#1E293B`), sedangkan rusuk belakang yang tertutup badan bangun otomatis digambar sebagai garis putus-putus halus (`#64748B`, *opacity* `0.45`) menggunakan *depth-test* (`THREE.GreaterDepth`) agar mirip ilustrasi buku teks matematika presisi tinggi. |
| **3. Studio Lighting & Depth Cue** | Terapkan pencahayaan 3 titik yang lembut (*HemisphereLight* langit-tanah + *DirectionalLight* utama + *Rim Light* tipis) ditambah bayangan lantai lembut (*contact shadow* opsional) dan sumbu koordinat $(X, Y, Z)$ minimalis agar kedalaman ruang 3D langsung terasa tanpa warna gelap yang kusam. |
| **4. Visualisasi Irisan (*Cross-Section*) & Pemisahan (*Exploded*)** | Bidang potong diberi warna biru elektrik transparan (`#3B82F6`, opacity `0.38`) dengan garis tepi kontras (`2.5px`), titik potong rusuk berupa bola kecil bercahaya (*glowing pin*), dan panel **Penampang 2D** sejajar di samping objek yang menampilkan bentuk asli irisan, panjang sisi, luas, keliling, dan sudut dalam. Saat mode **Pisah (*3D Separation*)** atau **Jaring (*Unfolding*)**, setiap sisi diberi aksen warna berbeda yang konsisten dengan animasi *spring easing* halus 60fps. |
| **5. Label Titik Sudut & Dimensi Anti-Tabrakan** | Label titik sudut (`A, B, C, ...`), panjang rusuk, tinggi, jari-jari, dan simbol siku-siku dirender sebagai *imperative DOM pill badge* yang selalu menghadap kamera (*billboard*), otomatis menggeser sedikit keluar dari pusat massa bangun agar tidak pernah menumpuk di atas garis rusuk, serta meredup otomatis jika berada di sisi belakang bangun. |
| **6. Ketajaman Layar & Performa** | Skala *pixel ratio* adaptif (`Math.min(window.devicePixelRatio, 2)`), *multisample antialiasing* (`antialias: true`), satu `THREE.WebGLRenderer` persisten, serta *disposal* memori geometri/material yang disiplin saat objek berubah parameter. |

---

## 4. Engine Bangun Datar & Bangun Ruang Lengkap (Unified Parametric & Manifold Kernel)

Seluruh bangun datar dan bangun ruang disediakan secara lengkap dalam **satu katalog terpadu yang rapi tanpa penyekatan jenjang**, ditopang oleh kernel geometri deterministik di [`packages/geometry-core`](https://github.com/xDzaky/ai-interactive-classroom/tree/main/packages/geometry-core/src).

### 4.1 Pipeline Konversi 2D → 3D & 2D Intelligent Folding (Anti-Bug)
1. **Normalisasi Profil 2D (`Profile2D`)**:
   Setiap bangun datar (persegi, segitiga sembarang, trapesium, jajar genjang, belah ketupat, layang-layang, elips, juring, cincin/annulus, poligon beraturan $n$-sisi, hingga poligon bebas `customPoints`) dinormalisasi menjadi `Profile2D` dengan urutan vertex *Counter-Clockwise (CCW)*, bebas *self-intersection*, dan mendukung lubang (*holes*).
2. **4 Operator 3D Universal (*Watertight 2-Manifold*)**:
   Dibangun di atas [Three.js](https://threejs.org/docs/) serta diperkuat oleh [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) dan opsi kernel WASM [Manifold 3D](https://github.com/SovereignShop/clj-manifold3d/blob/main/README.md) untuk menghindari bug triangulasi non-manifold pada `ExtrudeGeometry`:
   - **Extrude (Prisma)**: Mengubah *semua* profil 2D menjadi prisma tegak maupun prisma miring (*oblique*) dengan jumlah sisi, rusuk, volume ($V = A_{\text{alas}} \cdot t$), dan luas permukaan yang 100% presisi.
   - **Taper / Pyramid (Limas & Frustum)**: Mengubah profil 2D menjadi limas tegak/miring atau bangun terpancung (*frustum*) dengan rasio alas-atas yang dapat diatur lewat slider.
   - **Revolve / Lathe (Benda Putar)**: Memutar profil 2D atau kurva fungsi $y=f(x)$ mengelilingi sumbu $X$, $Y$, atau garis bebas (sudut $0^\circ$–$360^\circ$) menghasilkan tabung, kerucut, bola, torus, elipsoid, paraboloid, hingga volume benda putar integral.
   - **Loft & CSG Boolean**: Menghubungkan dua penampang berbeda serta mendukung operasi gabungan ($\cup$), irisan ($\cap$), dan pengurangan ($\setminus$) antar bangun ruang.
3. **2D Intelligent Folding (Adaptasi Langsung iFLYTEK Tongchuang)**:
   Ketika guru menggambar **jaring-jaring 2D** di papan tulis (mis. 6 persegi berbentuk salib untuk kubus, atau jaring-jaring balok/prisma/limas), sistem mendeteksi graf ketetanggaan antar bidang (*face adjacency graph*), menentukan bidang alas sebagai akar, membangun pohon engsel (*spanning tree*), lalu menganimasikan pelipatan jaring-jaring 2D tersebut menjadi model 3D utuh secara real-time.
4. **Spanning-Tree Unfold Net & Exact Plane Clipping**:
   Sebaliknya, setiap polihedron 3D (prisma-$n$, limas-$n$, frustum, Platonic/Archimedean Solids, tabung, kerucut) dapat dibentangkan menjadi jaring-jaring 2D mulus lewat slider menggunakan algoritma *spanning-tree dual graph* ([Polyhedron Nets](https://www.mysimulator.uk/articles/polyhedron-nets-the-art-of-unfolding-3d-solids/)), dan dipotong dengan bidang bebas ($ax+by+cz+d=0$ atau 3 titik) dengan perhitungan irisan exact.

### 4.2 Katalog Menyeluruh Bangun Datar, Bangun Ruang & Visualisasi Matematika

Semua kategori berikut tersedia dalam panel katalog visual yang mudah dicari (*searchable gallery*):

| Kategori | Daftar Objek & Visualisasi yang Tersedia | Kustomisasi Real-Time oleh Guru |
| :--- | :--- | :--- |
| **Bangun Datar 2D** | Persegi, Persegi Panjang, Segitiga (Sama Sisi, Sama Kaki, Siku-Siku, Sembarang), Jajar Genjang, Belah Ketupat, Layang-Layang, Trapesium (Siku, Sama Kaki, Sembarang), Lingkaran, Elips, Juring & Tembereng, Cincin (*Annulus*), Poligon Beraturan Segi-$n$, Poligon Bebas (*Custom Vertex*), Bangun Gabungan. | Tarik vertex bebas, ubah sisi/sudut eksak, tampilkan grid satuan, tanda sudut siku-siku, tanda sisi sama panjang, diagonal, tinggi, luas & keliling live, konversi 1-klik ke 3D. |
| **Bangun Ruang Dasar & Polihedron** | Kubus, Balok, Prisma Segi-$n$ (Tegak & Miring), Limas Segi-$n$ (Tegak & Miring), Limas & Kerucut Terpancung (*Frustum*), 5 *Platonic Solids* (Tetrahedron, Hexahedron, Octahedron, Dodecahedron, Icosahedron), 13 *Archimedean Solids*, *Dual Polyhedra*, Bangun Ruang Gabungan (CSG). | Slider dimensi ($p, l, t, r, n$, sudut miring), Putar 360°, Irisan Bidang (3 titik & plane slider + animasi potong), Jaring-Jaring (*Unfold/Fold*), Pisah Sisi (*Exploded View*), Perbandingan 2 Bangun 3D, Diagonal Bidang/Ruang, Verifikasi Euler ($V-E+F=2$). |
| **Benda Putar & Sisi Lengkung** | Tabung, Kerucut, Kerucut Ganda (*Double Cone* untuk asal irisan kerucut), Bola, Belahan Bola, Torus, Elipsoid, Paraboloid, Benda Putar dari Kurva $y=f(x)$ (metode cakram, cincin, kulit tabung). | Sudut putar parsial ($0^\circ$–$360^\circ$), irisan kerucut interaktif (lingkaran, elips, parabola, hiperbola), animasi kulit/cakram, garis pelukis & jari-jari. |
| **Grafik 2D, Vektor & Aljabar Linear** | Grafik Fungsi Eksplisit $y=f(x)$, Kurva Parametrik 2D, Koordinat Polar, Pertidaksamaan & Arsiran Daerah, Irisan Kerucut (fokus & direktriks), Lingkaran Satuan Trigonometri, Medan Lereng (*Slope Fields*), Vektor 2D & 3D (*Dot/Cross Product*, Proyeksi), Transformasi Matriks 2D & 3D (Translasi, Refleksi, Rotasi, Dilatasi, Shear, Eigenvector, Determinan). | Slider parameter $(a, b, c)$, perbandingan banyak fungsi, arsiran integral Riemann/tentu, garis singgung bergerak, animasi transformasi matriks $A(t) = (1-t)I + tA$. |
| **Permukaan 3D, Kalkulus & Topologi Lanjut** | Permukaan $z = f(x,y)$ + Peta Kontur (*Level Curves*), Permukaan Kuadrik (Hiperboloid 1 & 2 lembar, Paraboloid Hiperbolik/Pelana), Kurva Ruang $\vec{r}(t)$ + Bingkai Frenet-Serret $(\mathbf{T}, \mathbf{N}, \mathbf{B})$, Bidang Singgung & Gradien $\nabla f$, Permukaan Parametrik $\mathbf{S}(u,v)$ ([`ParametricGeometry`](https://threejs.org/docs/pages/ParametricGeometry.html)), Permukaan Implisit $F(x,y,z)=0$ ([`MarchingCubes`](https://threejs.org/examples/webgl_marchingcubes.html)), Medan Vektor 3D, Pita Möbius, Botol Klein, Torus-Knot, Permukaan Minimal (Enneper, Catenoid, Helicoid, Gyroid). | Input rumus bebas, resolusi grid, pewarnaan *heatmap* (ketinggian $z$, Kelengkungan Gaussian $K$, Mean Curvature $H$), *clipping plane* multi-sumbu, ekspor `.PNG`/`.SVG`/`.STL`/`.GLTF`. |

---

## 5. Kalkulator & Editor Teks Matematika Auto-Format + Math-to-Visual Engine

Mengoptimalkan [`mathlive`](https://github.com/arnog/mathlive) (yang sudah ada di repo) bersama [`@cortex-js/compute-engine`](https://www.npmjs.com/package/@cortex-js/compute-engine) ([Dokumentasi](https://epsil.dev/compute-engine/)) dan [`mathjs`](https://github.com/josdejong/mathjs) untuk menghadirkan blok teks & kalkulator matematika langsung di papan tulis.

### 5.1 Auto-Format Real-Time saat Mengetik (`MathTextBlockWidget.tsx`)
Dengan mengaktifkan `smartSuperscript`, `smartFence`, `smartMode`, dan `inlineShortcuts` pada [MathLive](https://mathlive.io/mathfield/guides/customizing/), guru cukup mengetik secara natural:
- **Pangkat & Akar**: `8^2` → otomatis jadi $8^2$; `x^n` → $x^n$; `sqrt` → $\sqrt{\phantom{x}}$; `cbrt` → $\sqrt[3]{\phantom{x}}$; `nthroot` → $\sqrt[n]{\phantom{x}}$.
- **Pecahan & Simbol**: `1/2` → $\frac{1}{2}$; `pi` → $\pi$; `theta` → $\theta$; `alpha` → $\alpha$; `inf` → $\infty$; `deg` → $^\circ$; `+-` → $\pm$; `!=` → $\neq$; `<=` → $\le$; `>=` → $\ge$.
- **Kalkulus, Vektor & Matriks**: `int` → $\int$; `sum` → $\sum$; `lim` → $\lim$; `ddx` → $\frac{d}{dx}$; `pdiff` → $\frac{\partial}{\partial x}$; `vec` → $\vec{v}$; `mat` → matriks $2\times 2$ / $3\times 3$.
- **Mode Campuran Teks + Rumus (`smartMode`)**: Guru dapat mengetik soal cerita dan rumus dalam satu kotak secara mulus, dilengkapi *virtual keyboard* matematika minimalis yang muncul hanya saat dibutuhkan.
- **Kalkulator Simbolik & Numerik Langsung**:
  - **`= Hitung`**: Hasil eksak ($\frac{3}{4}\pi$, $64$, $2\sqrt{3}$) dengan toggle desimal (`N()`).
  - **`Sederhanakan` / `Selesaikan`**: Faktorisasi, solusi persamaan, turunan, integral, operasi matriks.
  - **`Langkah`**: Penjelasan penyelesaian tahap demi tahap (*step-by-step*) yang bisa dibuka satu per satu di depan kelas.

### 5.2 Pipeline Dua Arah (*Bidirectional*): Bahasa / Rumus Matematika ↔ Visualisasi Custom
1. **Parse & Klasifikasi Otomatis**:
   Ekspresi dari `MathLive` (atau hasil *Handwriting / Formula Recognition* di kanvas) diparsing ke MathJSON AST oleh `@cortex-js/compute-engine`, lalu `intentClassifier.ts` mendeteksi visualisasi yang paling tepat:
   - Aritmetika/pecahan (`3/4 + 1/2`) → Visualisasi diagram pecahan / garis bilangan / blok satuan yang bisa digeser & diwarnai.
   - Fungsi 1 variabel (`y = x^2 - 3`) → Widget Grafik 2D (`Mafs`) dengan slider koefisien otomatis & area integral.
   - Fungsi 2 variabel / implisit (`z = sin(x)*cos(y)`, `x^2 + y^2 + z^2 = 25`) → Dikompilasi ke fungsi JS cepat via [`ce.compile()`](https://mathlive.io/compute-engine/guides/compiling/) lalu dirender sebagai Permukaan 3D interaktif di Three.js.
   - Vektor / Matriks → Visualisasi panah vektor 2D/3D atau animasi transformasi ruang.
   - Rumus atau perintah geometri (`V = 1/3 * pi * r^2 * t`, atau *"Tabung r=4, t=10"*) → Bangun 3D parametrik dengan ukuran exact dan label rumus.
2. **Pengikatan Reaktif Dua Arah (*Two-Way Binding*)**:
   Objek visual yang tercipta tetap terhubung (`linkedMathBlockId`) ke blok matematikanya. Guru bebas mengkustomisasi ulang warna, posisi, irisan, jaring-jaring, maupun menggeser slider/vertex di kanvas—dan angka serta hasil hitungan pada blok teks matematika otomatis terbarui secara real-time.

---

## 6. Adaptasi Lengkap Fitur iFLYTEK Tongchuang AI Blackboard (Desain Toolbar Simple)

Seluruh kemampuan perangkat lunak dari riset **iFLYTEK Tongchuang AI Blackboard** ([sumber resmi](https://edu.iflytek.com/solution/school/smartwindow)) diintegrasikan ke dalam AI Interactive Classroom, namun **disederhanakan antarmukanya** agar guru tidak pernah kewalahan oleh terlalu banyak tombol.

*(Catatan: Kemampuan khusus hardware fisik iFLYTEK seperti layar Circular Polarized, 24-speaker array, optical side boards, dan sistem 4+1 kamera kelas dikecualikan karena platform kita berbasis browser untuk laptop, tablet, smartphone, proyektor, dan Smart TV).*

### 6.1 Desain Toolbar & UX yang Sederhana (*Clean Canvas, Power on Demand*)
1. **Top Bar Minimalis (Hanya 4 Grup Utama)**:
   - Judul Sesi & Simpan/Sinkronisasi Papan Tulis (*Digital Board Sync*).
   - **Aksi Cepat AI**: Tombol `🎤 Suara AI` (*Voice Command*), `✨ Asisten AI` (*Explain / Problem-Chain / Socratic / Lesson Prep*), dan `👥 Kelas` (*Room Code / QR Join / Raise Hand*).
   - **Rekam & Ringkas**: Tombol `⏺ Rekam Sesi` (*Event-based Replay* + *Structured Summary*) & `Ekspor`.
2. **Left Dock Ringkas (Hanya 7 Ikon Utama)**:
   - `Pilih / Geser` (Select & Hand dengan OBB presisi)
   - `Pena Pintar` (Freehand + toggle **Auto-Correct Shape & Handwriting/Formula Recognition**)
   - `Penghapus`
   - `Bangun 2D & 3D` (Membuka popover katalog visual dengan pencarian cepat — semua bangun datar, bangun ruang, permukaan 3D, dan alat konstruksi busur/penggaris)
   - `Teks & Kalkulator` (`MathTextBlockWidget` auto-format + tombol 1-klik **Visualisasikan**)
   - `Grafik` (`Mafs` 2D & 3D Function Plotter)
   - `Aktivitas Seru` (Kuis interaktif, Math Challenge, Geometry Puzzle)
3. **Contextual Radial / Floating Bar (Terinspirasi Tongchuang)**:
   Muncul **hanya** saat objek dipilih (maksimal 6–8 aksi paling relevan untuk objek tersebut):
   - Jika memilih **Sketsa / Bangun 2D**: `Rapikan Bentuk`, `Ubah ke 3D / Lipat Jaring`, `Ukur`, `Tanya AI`, `Duplikat`, `Hapus`.
   - Jika memilih **Bangun 3D**: `Putar`, `Irisan`, `Jaring`, `Pisah`, `Bandingkan`, `Kustomisasi` (membuka *Slide-over Inspector* di sisi kanan), `Tanya AI`, `Hapus`.
   - Jika memilih **Blok Matematika**: `= Hitung`, `Langkah`, `Visualisasikan`, `Duplikat`, `Hapus`.
4. **Slide-Over Customizer Inspector (Tersembunyi Secara Default)**:
   Semua pengaturan tingkat tinggi (slider dimensi, jumlah sisi $n$, sudut miring, *clipping plane*, shader kelengkungan, toggle rusuk putus-putus, warna per-sisi, *Step-by-Step Reveal*, serta input rumus parametrik/implisit custom) berada di panel sisi kanan yang hanya muncul saat guru mengklik `Kustomisasi`.

### 6.2 Matriks Integrasi Fitur iFLYTEK Tongchuang ke Arsitektur Platform

| Pilar iFLYTEK Tongchuang | Fitur yang Diadopsi ke AI Interactive Classroom | Implementasi & Stack Teknis |
| :--- | :--- | :--- |
| **1. AI Digital Blackboard** | Sketch Recognition, Automatic Shape Correction, Handwriting & Mathematical Formula Recognition, 2D→3D Conversion, **2D Intelligent Folding**, 3D Dynamic Geometry, 3D Rotation, 3D Separation (*Exploded*), 3D Unfolding, Cross-section Visualization (Plane Control, Slice Animation, Highlight, Rotation, Measurement, Reset), 3D Object Comparison, Dynamic Math Graph, Digital Board Sync. | `react-konva` + `packages/sketch-core` + `packages/geometry-core` + `three` + `mafs` + `mathlive` + `@cortex-js/compute-engine` + `apps/ai-service` (FastAPI hybrid geometry + AI classifier). |
| **2. AI Natural Interaction** | **Voice Command** (mis. *"Tampilkan kubus rusuk 5 cm"*, *"Buat grafik y = x kuadrat"*), **Intent Understanding** (menawarkan model 3D, rumus, dan pertanyaan otomatis dari ucapan/tulisan), **Multimodal Interaction** (Mouse, Touch, Stylus, Voice), **Keyword Extraction** & **Teaching Resource Recommendation** (rekomendasi materi/animasi/soal sesuai kata kunci di papan). | Web Speech API / Whisper STT → FastAPI NLP Intent Router → Action Dispatcher ke `whiteboard-core` & `curriculum-schema` (mendukung Kurikulum Merdeka). |
| **3. AI Teaching Assistant & Fun Teaching** | **Explain Object & Formula**, **Problem-Chain Mathematics Assistant** (rangkaian 4–5 pertanyaan berjenjang untuk membangun penalaran), **Socratic Tutor**, **AI Exercise Explanation & Review** (bertahap), **AI Lesson Preparation** (RPP/tujuan/kuis/rekomendasi visual), **Cross-disciplinary Discussion**, **AI Virtual Human** (Tokoh Sejarah/Ilmuwan seperti Einstein & Avatar Guru — opsional fase lanjut), **AI Fun Teaching** (Math Challenge, Geometry Puzzle, Math Sudoku, Interactive Quiz). | `apps/ai-service` (LLM terstruktur dengan konteks objek kanvas aktif + prompt pedagogis Socratic & Problem-Chain) + modul mini-game interaktif di `apps/web`. |
| **4. Interactive Classroom Collaboration** | Room Creation, Room Code & QR Code Join, Guest Access & Student Login, Teacher & Student View, **Raise Hand & Presenter Approval**, Collaborative Whiteboard Real-Time, **Mobile Controller** (HP guru mengontrol rotasi 3D, slide, dan suara dari mana saja di kelas). | [`Yjs`](https://github.com/yjs/yjs) + [`Hocuspocus`](https://github.com/ueberdosis/hocuspocus) untuk sinkronisasi CRDT whiteboard real-time; `apps/api` (WebSocket / Laravel Reverb atau Node WS sesuai backend aktif) untuk event room, *raise hand*, dan *mobile remote*. |
| **5. Learning Analytics & Documentation** | **Event-based Lesson Replay** (putar ulang papan tulis ringan berbasis log event, bukan video berat), **Structured Lesson Summary** otomatis, **Automatic Micro-Lesson Chapters** (memecah sesi menjadi bab: konsep, rumus, demo 3D, kuis), **AI Class Highlight**, **Student Participation & Quiz Analytics**, serta **Teacher Growth Profile** (refleksi aktivitas mengajar). | Event log di `packages/whiteboard-core` + ringkasan & segmentasi bab oleh `apps/ai-service` + dashboard riwayat di `apps/web`. *(Catatan: analisis fokus pada partisipasi & aktivitas whiteboard, bukan penilaian otomatis sepihak terhadap kualitas guru).* |

---

## 7. Pemetaan Perubahan pada Struktur Repositori Saat Ini

| Paket / Folder di Repo | File Target | Perubahan Utama |
| :--- | :--- | :--- |
| `packages/whiteboard-core` | `src/transform.ts` (baru), `src/reducer.ts`, `src/replay.ts` (baru) | Tambah `CanonicalTransform` (*center-pivot*), matriks OBB (`worldToLocal`, `localToWorld`, `resizeWithPinnedAnchor`), `linkedMathBlockId`, dan pencatatan timestamp untuk *Event-based Lesson Replay*. |
| `packages/geometry-core` | `src/profile2d.ts` (baru), `src/operators3d.ts` (baru), `src/folding2d.ts` (baru), `src/surfaces.ts` (baru), `src/polyhedron.ts`, `src/unfold.ts`, `src/section.ts` | Normalisasi `Profile2D` CCW; operator Extrude/Taper/Revolve/Loft/CSG; deteksi & pelipatan jaring-jaring 2D (*2D Intelligent Folding*); katalog lengkap polihedron, kuadrik, parametrik & implisit; *spanning-tree unfold* & *exact plane clipping*. |
| `packages/math-core` | `src/computeAdapter.ts` (baru), `src/intentClassifier.ts` (baru), `src/index.ts` | Integrasi `@cortex-js/compute-engine` + `mathjs` untuk parsing LaTeX↔MathJSON, evaluasi eksak/numerik, kompilasi fungsi 2D/3D cepat, dan klasifikasi otomatis ekspresi ke visualisasi. |
| `packages/sketch-core` | `src/shapeRecognizer.ts`, `src/handwritingAdapter.ts` (baru) | Tingkatkan *Sketch Recognition* & *Automatic Shape Correction* untuk semua bangun datar dan jaring-jaring 2D, serta integrasi pengenalan tulisan tangan & rumus matematika ke `apps/ai-service`. |
| `apps/web/src/lib` | `selectionHitTest.ts`, `resizeHandles.ts`, `shapeToSolid.ts`, `threeGeometry.ts`, `threeMaterials.ts` (baru) | OBB hit-test & handle `'rotate'` dengan snap $15^\circ$; rombak `shapeToSolid.ts` berbasis `Profile2D`; pisahkan sistem material glassmorphic + dual-pass textbook edges + studio lighting di `threeMaterials.ts`. |
| `apps/web/src/pages/whiteboard` | `WhiteboardCanvas.tsx`, `WhiteboardOverlay.tsx`, `ToolBar.tsx` | Unifikasi state seleksi (hapus dual-toolbar), sinkronisasi transform DOM overlay persis sama dengan Konva, PNG snapshot transparan untuk WebGL > 3, dan penyederhanaan dock toolbar (7 ikon utama + contextual floating bar). |
| `apps/web/src/components/math` | `MathTextBlockWidget.tsx` (baru), `TongchuangSolidWidget.tsx`, `GraphViewer.tsx`, `CustomInspectorPanel.tsx` (baru) | Blok teks/kalkulator `MathLive` auto-format + *two-way binding* ke visual; upgrade kualitas desain 3D & perbandingan 2 objek 3D; panel *Slide-Over Customizer* untuk kustomisasi guru. |
| `apps/web/src/components/classroom` & `apps/ai-service` | `VoiceCommandBar.tsx` (baru), `AITeachingDrawer.tsx` (baru), `ClassroomRoomModal.tsx` (baru), `LessonReplayBar.tsx` (baru) | Voice command + intent routing, Problem-Chain & Socratic AI Assistant, Room Code/QR/Raise Hand/Mobile Controller (`Yjs` + WebSocket), serta Replay & Structured Lesson Summary. |

---

## 8. Roadmap Eksekusi Bertahap & Kriteria Verifikasi

### Fase 1 — Stabilisasi Core Whiteboard & Perbaikan Total Selection/Transform (Prioritas Utama)
- **Lingkup**: Implementasi `CanonicalTransform` (*center-pivot*) & matriks OBB di `packages/whiteboard-core`; refactor `selectionHitTest.ts` dan `resizeHandles.ts` (OBB hit-test, *pinned-anchor resize*, handle `'rotate'` + snap $15^\circ$); sinkronisasi penuh `WhiteboardOverlay.tsx` ↔ `WhiteboardCanvas.tsx`; eliminasi dual-toolbar; ganti kartu placeholder WebGL dengan transparent PNG snapshot.
- **Kriteria Lulus**: Unit test Vitest matriks rotasi/resize pada $0^\circ, 30^\circ, 45^\circ, 90^\circ, 180^\circ$ lolos 100%; Playwright E2E test drag, resize, dan rotate objek 2D & 3D menunjukkan selisih visual vs bounding box $< 1\text{ px}$ dan nol tabrakan toolbar/overlay.

### Fase 2 — Perombakan Engine 2D→3D, Kualitas Visual 3D & Katalog Geometri Lengkap
- **Lingkup**: Bangun `Profile2D` + operator universal `Extrude`, `Taper/Frustum`, `Revolve`, `Loft/CSG` + **2D Intelligent Folding**; terapkan standar visual 3D baru (`threeMaterials.ts`: glassmorphic dual-pass translucency, anti-aliased solid/dashed textbook edges, 3-point studio lighting, billboard labels anti-tabrakan); lengkapi seluruh katalog bangun datar, bangun ruang, Platonic/Archimedean, kuadrik, parametrik (`ParametricGeometry`), implisit (`MarchingCubes`), vektor 3D, *spanning-tree unfold*, *exact cross-section*, *3D separation*, dan *3D object comparison*.
- **Kriteria Lulus**: Property-based test `geometry-core` (Euler $V-E+F=2$, validasi volume/luas toleransi $< 10^{-4}$); 100% bangun datar dapat dikonversi ke 3D tanpa error sisi; frame rate stabil $\ge 55\text{ FPS}$ pada interaksi orbit, irisan, dan pelipatan jaring-jaring.

### Fase 3 — Kalkulator/Editor Matematika Auto-Format, Math-to-Visual & Toolbar Simple
- **Lingkup**: Integrasi `@cortex-js/compute-engine` + `mathjs` ke `packages/math-core`; bangun `MathTextBlockWidget.tsx` berbasis `MathLive` (`8^2` → $8^2$, pecahan, akar, kalkulus, matriks, `smartMode`); implementasi pipeline *bidirectional* Math ↔ Visual (grafik 2D, permukaan 3D, bangun geometri parametrik, diagram pecahan); terapkan desain toolbar ringkas (7 ikon utama + contextual floating bar + *Slide-Over Customizer*).
- **Kriteria Lulus**: Uji ketik langsung (`8^2`, `1/2`, `sqrt`, `int`, `z=sin(x)*cos(y)`) terformat instan tanpa modal; tombol **Visualisasikan** menghasilkan objek interaktif yang sinkron dua arah dengan blok teksnya.

### Fase 4 — Ekosistem iFLYTEK Tongchuang (AI Interaction, Classroom Collaboration & Analytics)
- **Lingkup**: Integrasi *Sketch Recognition*, *Automatic Shape Correction*, & *Handwriting/Formula Recognition*; **Voice Command & Intent Understanding**; **AI Teaching Assistant** (*Explain*, *Problem-Chain*, *Socratic Tutor*, *Step-by-Step Exercise Review*, *Lesson Prep*, *Keyword Extraction & Resource Recommendation*); **Interactive Classroom** (Room Code/QR, Guest/Student View, Raise Hand, Presenter Approval, *Real-Time Yjs Sync*, *Mobile Controller*); **Learning Analytics** (*Event-based Lesson Replay*, *Structured Lesson Summary*, *Micro-Lesson Chapters*, *Class Highlights*); serta modul **AI Fun Teaching** (Math Challenge, Geometry Puzzle, Interactive Quiz) dan opsi **AI Virtual Human** (Tokoh Ilmuwan & Avatar Guru).
- **Kriteria Lulus**: Uji end-to-end perintah suara → pembuatan objek 3D/grafik; uji kolaborasi multi-tab (Guru + Siswa + Mobile Controller) dengan latensi sinkronisasi $< 150\text{ ms}$; uji *Lesson Replay* & generasi ringkasan sesi otomatis.