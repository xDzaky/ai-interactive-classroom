# Master Plan V3: Penyempurnaan UI/UX Header, Right-Side Visual Template Drawer (Drag & Click), Round-Trip 3D ↔ 2D + Penggabungan Bentuk, & Template Benda Sehari-hari (Dadu Lipat 3D)

Dokumen perencanaan ini disusun berdasarkan audit langsung pada commit [`699de57d14e3c82e4c39928abb8b2170f5bfd0df`](https://github.com/xDzaky/ai-interactive-classroom/commit/699de57d14e3c82e4c39928abb8b2170f5bfd0df) (*"feat(v2): multi-stroke 3D sketch & concave ear-clipping, mobile touch gesture engine, dual-transport phone remote, Line2 fat edges & parametric 3D surfaces"*) pada repositori [xDzaky/ai-interactive-classroom](https://github.com/xDzaky/ai-interactive-classroom/commits/main/), tangkapan layar terbaru, serta referensi pola jaring-jaring **Dadu (`Pola Dadu`)**.

---

## 1. Audit Kondisi Saat Ini pada Commit `699de57`

| Komponen / Area | Status di Commit `699de57` | Celah yang Akan Diselesaikan di V3 |
| :--- | :--- | :--- |
| **Header Whiteboard (`PersonalRoomPage.tsx`)** | Berisi tombol `Katalog 2D/3D`, `Blok Rumus`, `Remote HP`, `Asisten AI`, `Suara AI`, `Aktivitas`, `Export PNG`, `Bersihkan Papan`, `Masuk Guru` yang memakai ikon di dalam tombol teks. | Ikon di dalam tombol teks membuat teks terpotong menjadi 2 baris (`Katalog\n2D/3D`, `Blok\nRumus`, dst.) dan terasa sesak; tombol `Template` masih terpisah di bar bawah. |
| **Katalog Bangun (`GeometryCatalogPopover.tsx`)** | Sudah memiliki 33 item (`2D`, `3D`, `Platonic`, `Permukaan 3D`) dalam popover klik-saja tanpa pratinjau kartu visual besar dan belum mendukung *drag-and-drop*. | Perlu diubah menjadi **Right Slide-Out Visual Card Drawer** dengan pratinjau visual SVG/mini-3D pada setiap kartu, mendukung **Tarik ke Kanvas (*Drag-and-Drop*)** sekaligus **Klik Langsung**, plus kategori baru **Benda Sehari-hari**. |
| **Jaring-Jaring Lipat 3D (`unfold.ts` vs `TongchuangSolidWidget.tsx`)** | [`packages/geometry-core/src/unfold.ts`](https://github.com/xDzaky/ai-interactive-classroom/blob/699de57d14e3c82e4c39928abb8b2170f5bfd0df/packages/geometry-core/src/unfold.ts) sudah memiliki `unfoldPlan(poly)` berbasis BFS *spanning-tree* & sudut engsel dihedral, **tetapi belum diimpor/dipakai oleh `TongchuangSolidWidget.tsx`** (saat ini `unfoldT` hanya mendorong sisi keluar sepanjang normal). | Menyambungkan `unfoldPlan(poly)` ke pohon engsel `THREE.Group` berhierarki di `TongchuangSolidWidget.tsx` agar Dadu, Kubus, Balok, Prisma, Limas, dll. benar-benar **terlipat menjadi kotak 3D dan terbuka mulus menjadi jaring-jaring 2D**. |
| **Tekstur Per-Sisi & Benda Nyata** | `TongchuangSolidWidget.tsx` belum memiliki *UV mapping* per sisi maupun penyimpanan tekstur/warna/label kustom per sisi. | Tambah engine **`CanvasTexture` prosedural per sisi** ([Three.js `CanvasTexture`](https://threejs.org/docs/pages/CanvasTexture.html)) agar Dadu (mata 1–6), Rubik, Kotak Kado, Kaleng, Tenda, dll. memiliki tampilan visual nyata dan tetap menempel presisi saat dilipat/dibuka atau dicustom guru. |
| **Round-Trip 3D ↔ 2D & Gabung Bentuk** | `shapeToSolid.ts` sudah menyimpan `profilePointsCm` pada `viz_solid.props`, namun belum ada tombol **"Kembali ke 2D / Edit 2D"** maupun logika menggabung 2+ bentuk (mis. Persegi + Segitiga → Rumah) menjadi satu objek 3D terpadu. | Tambah **3D ↔ 2D Round-Trip Editing**, **Magnetic Edge Snapping**, **2D Boolean Union → 3D Extrude** (`polygon-clipping`), dan **Compound 3D Assembly** (gabungan multi-bagian dalam satu objek 3D). |

---

## 2. Perbaikan UI/UX Header & Right-Side Visual Template Drawer

### 2.1 Desain Header Bersih Tanpa Ikon pada Tombol Teks (`PersonalRoomPage.tsx`)
1. **Hapus Semua Ikon di Dalam Tombol Teks Header**:
   Ubah tombol header menjadi tombol teks satu baris (`whitespace-nowrap`, `h-9`, `px-3.5`, `text-[13px] font-medium`, `rounded-lg`, border halus `#E2E8F0` dengan aksen warna aktif lembut):
   - Kiri: Logo `AI` + judul ringkas `AI Smart Whiteboard` + pill status `Mode Tanpa Login`.
   - Tengah/Kanan (tombol teks bersih tanpa ikon): **`Template`** (membuka *Right Visual Drawer*), **`Rumus`**, **`Remote HP`**, **`Asisten AI`**, **`Suara AI`**, **`Aktivitas`**.
   - Kanan Ujung: Tombol aksi singkat (`Simpan PNG`, `Bersihkan`) + tombol utama **`Masuk Guru`** (tanpa emoji guru agar tidak pecah 2 baris).
2. **Rapikan Bar Bawah**:
   Hapus tombol `Template` yang duplikat di bar bawah agar fokus bar bawah hanya pada `Undo/Redo`, `Ringkasan`, dan `Zoom 100%`.

### 2.2 Right Slide-Out Visual Card Drawer (`TemplateDrawer.tsx`)
Saat tombol **`Template`** di header diklik, muncul panel kartu elegan dari **sisi kanan** (`w-[340px] sm:w-[380px]`, *slide-in smooth*, tidak memblokir interaksi kanvas di sebelah kiri sehingga guru bisa langsung menarik objek ke papan tulis):

- **Tab Kategori Ringkas + Kotak Pencarian Cepat**:
  1. **`Bangun Datar`** (Persegi, Persegi Panjang, Segitiga Siku/Sama Sisi/Sama Kaki, Trapesium, Jajar Genjang, Belah Ketupat, Layang-Layang, Lingkaran, Elips, Juring, Segi-5, Segi-6, Bintang, Bentuk Rumah/L).
  2. **`Bangun Ruang`** (Kubus, Balok, Prisma Segitiga/Segi-6, Limas Segitiga/Segiempat, Frustum, Tabung, Kerucut, Bola, Belahan Bola, Elipsoid, Torus, 5 Platonic Solids, Permukaan 3D).
  3. **`Benda Sehari-hari`** (Dadu 1–6, Rubik 3×3, Kotak Kado, Kotak Susu, Kaleng Minuman, Topi Ulang Tahun, Cone Es Krim, Traffic Cone, Tenda Kemah, Piramida, Bola Sepak, Globe, Rumah 3D, Jam Dinding, Potongan Pizza, Rambu Lalu Lintas, Papan Catur).
- **Desain Kartu Visual (*Visual Preview Cards*)**:
  Grid 2 kolom di dalam drawer; setiap kartu menampilkan **ilustrasi vektor SVG tajam / pratinjau isometrik 3D berwarna** (bukan sekadar teks), nama objek, dan badge kecil tipe (`2D` / `3D` / `Lipat`).
- **Dua Cara Memasukkan Objek ke Whiteboard**:
  1. **Drag-and-Drop Langsung dari Drawer ke Kanvas**:
     - Gunakan Pointer Events (`onPointerDown` pada kartu → saat bergeser $> 6\text{ px}$, tampilkan *floating drag ghost* mengikuti kursor di atas kanvas).
     - Saat dilepas (`pointerup`) di atas area `WhiteboardCanvas`, konversikan posisi layar `(clientX, clientY)` ke koordinat kanvas melalui `ViewportController.screenToWorld(x, y)` lalu langsung ciptakan objek `shape2d` atau `viz_solid` persis di titik jatuhnya!
     - Berikan *drop zone highlight* tipis saat kursor melintasi kanvas; mendukung mouse desktop maupun sentuhan jari di tablet/HP.
  2. **1-Click Instant Insert**:
     - Jika kartu hanya diklik (tanpa diseret), objek langsung muncul di tengah viewport aktif dengan sedikit *cascade offset* (`+24px` tiap klik beruntun agar tidak saling menumpuk persis).

---

## 3. Logic Round-Trip 3D ↔ 2D & Penggabungan Bentuk (Contoh: Persegi + Segitiga → Rumah 3D)

Fitur ini memungkinkan guru bekerja secara fleksibel: mulai dari 2D → ubah ke 3D → **kembalikan ke 2D untuk mengedit atau menempelkan bentuk baru** → gabungkan lagi ke 3D tanpa kehilangan data.

### 3.1 Skema Data Terpadu pada `viz_solid.props` (`packages/whiteboard-core`)
Perluas payload `props` pada `viz_solid` agar selalu menyimpan asal 2D dan/atau daftar bagian majemuknya:

```ts
export interface SolidSource2D {
  shapes: Array<{
    objectType: string;           // 'rect' | 'triangle' | 'polygon' | ...
    verticesCm: [number, number][]; // Koordinat lokal (cm) relatif ke centroid grup
    fill?: string;
    stroke?: string;
  }>;
  mergedProfileCm: [number, number][]; // Hasil union 2D yang siap di-extrude/taper
  extrudeMode: "extrude" | "taper" | "revolve";
  depthCm: number;
  topScale?: number;
}

export interface CompoundSolidPart {
  id: string;
  label: string;
  solidType: string;
  extendedKind?: string;
  params: Record<string, number>;
  profilePointsCm?: [number, number][];
  offsetCm: [number, number, number];   // Posisi relatif (dx, dy, dz) dalam satu scene 3D
  rotationRad?: [number, number, number];
  colorHex?: number;
  texturePreset?: string;
}
```

### 3.2 Alur 1: Kembali dari 3D ke 2D (*3D → 2D Round-Trip*)
1. Tambahkan tombol **`Edit 2D`** pada toolbar konteks 3D (`TongchuangSolidWidget.tsx`) dan pada Menu Bundar (`TongchuangRadialWheel.tsx`).
2. Saat guru mengklik **`Edit 2D`**:
   - Jika `viz_solid` punya `source2D.shapes`, sistem mengembalikan setiap bentuk 2D asalnya ke kanvas Konva di posisi `(cx, cy)` yang sama (dalam skala `WORLD_UNITS_PER_CM = 20`) dengan metadata `linkedSolidConfig` (menyimpan `depthCm`, `texturePreset`, `theme`, dll.).
   - Jika `viz_solid` berasal dari preset standar (mis. `cube`, `cuboid`, `prism`, `cylinder`), sistem otomatis mengekstrak profil alas 2D-nya (`rect`, `triangle`, `circle`, atau `polygon`) sehingga **semua** bangun 3D tetap bisa dikembalikan ke 2D.
   - Muncul bar aksi mengambang kecil di atas grup bentuk 2D tersebut: **`Tambahkan Bentuk`** | **`Gabung & Jadikan 3D`** | **`Batal`**.

### 3.3 Alur 2: Menambahkan & Menggabungkan Bentuk Baru (Persegi + Segitiga → Rumah)
1. **Magnetic Edge & Vertex Snapping (`apps/web/src/lib/snapEngine.ts`)**:
   Saat guru menarik bentuk baru (mis. Segitiga) mendekati sisi atas Persegi dalam jarak $\le 12\text{ px}$, sistem otomatis menempelkan (*snap*) sisi alas segitiga sejajar sempurna dengan sisi atas persegi (dan menampilkan garis panduan snap berwarna biru).
2. **Deteksi Multi-Bentuk & Penggabungan (`packages/geometry-core/src/composite.ts`)**:
   Saat 2 atau lebih bentuk 2D yang bersentuhan/tumpang tindih dipilih bersamaan (atau melalui tombol **`Gabung ke 3D`**), sistem menyediakan 2 mode penggabungan otomatis yang sama-sama presisi:

| Mode Gabung | Cara Kerja Matematika | Contoh Hasil Nyata |
| :--- | :--- | :--- |
| **Mode A: Gabung Profil 2D → 1 Bangun 3D (`2D Boolean Union → Extrude`)** | Menggunakan operasi boolean union 2D ([`polygon-clipping`](https://npm-compare.com/convex,earcut,polygon-clipping)) untuk menyatukan kontur luar Persegi + Segitiga menjadi 1 poligon rumah 5 titik (tanpa garis dalam tumpang tindih), lalu `normalizeProfile2D` + `extrudeProfile` (dengan `triangulateFace3D` ear-clipping). | **Prisma Berbentuk Rumah** utuh (1 mesh *watertight*), bisa diiris, dihitung luas alas gabungannya ($A_{\text{persegi}} + A_{\text{segitiga}}$) dan volumenya ($V = A_{\text{total}} \cdot t$). |
| **Mode B: Gabung Bangun Ruang Majemuk (`Compound 3D Assembly`)** | Mengubah tiap bentuk 2D menjadi `CompoundSolidPart` terpisah di dalam **satu widget 3D bersama** (mis. Persegi → Kubus/Balok sebagai badan rumah, Segitiga → Prisma Segitiga atau Limas sebagai atap yang menempel di `offsetCm = [0, h/2, 0]`). | **Rumah 3D Majemuk** (Kubus + Atap Prisma/Limas), Roket (Tabung + Kerucut), Es Krim (Kerucut + Belahan Bola). Semua bagian berputar bersama, bisa **Pisah Bagian (*Exploded*)** untuk melihat komponen penyusunnya, dan menghitung $V_{\text{total}} = \sum V_i$ serta $L_{p,\text{total}}$ (dikurangi luas bidang tempel!). |

---

## 4. Template Benda Sehari-hari & Sistem Dadu Lipat 3D (*Real-World Parametric Props*)

Mengacu pada gambar **`Pola Dadu`** yang Anda unggah, benda sehari-hari tidak boleh berupa gambar statis, melainkan **model geometri parametrik dengan tekstur prosedural per sisi yang bisa dilipat menjadi kotak 3D, dibuka kembali menjadi jaring-jaring 2D, dan dicustom guru**.

### 4.1 Arsitektur Engine Lipat Berengsel (*True Hinged Unfold/Fold*)
Kunci utama untuk membuat Dadu (dan semua polihedron lainnya) dapat dilipat jadi kotak lalu dibuka kembali menjadi jaring-jaring adalah **menyambungkan [`unfoldPlan(poly)`](https://github.com/xDzaky/ai-interactive-classroom/blob/699de57d14e3c82e4c39928abb8b2170f5bfd0df/packages/geometry-core/src/unfold.ts) ke pohon engsel `THREE.Group` di `TongchuangSolidWidget.tsx`**:

1. **Konstruksi Pohon Engsel (*Hinge Tree*)**:
   - Ambil hasil `plan = unfoldPlan(poly)` (`rootFace` sebagai alas tetap di bidang $y = 0$, dan daftar `steps` berisi `parentFace`, `face`, `hinge: [u, v]`, `foldAngle`).
   - Untuk setiap langkah, buat `hingeGroup = new THREE.Group()` yang diposisikan di titik asal rusuk engsel `u`, dengan sumbu rotasi vektor satuan $\hat{a} = \frac{v - u}{\|v - u\|}$.
   - Pasang mesh wajah anak (*child face mesh*) beserta seluruh sub-pohon anaknya di dalam `hingeGroup`.
2. **Animasi Lipat ↔ Buka (`foldProgress` $t \in [0, 1]$)**:
   - Pada $t = 0$: sudut rotasi tiap engsel = `0` → **Kotak Dadu 3D tertutup rapat**.
   - Pada $t = 1$: sudut rotasi tiap engsel = `foldAngle` ($\pi - \text{dihedral}$, mis. $90^\circ$ untuk kubus) → **Jaring-Jaring Dadu 2D terbuka rata sempurna** persis seperti pola salib pada gambar `Pola Dadu`!
   - Gunakan *spring easing* halus saat tombol **`Buka Jaring`** / **`Lipat Kotak`** ditekan, plus slider manual `0%–100%` agar guru bisa menghentikan lipatan di tengah jalan (mis. $45^\circ$) untuk menjelaskan sisi berhadapan.
   - Opsional toggle **`Tampilkan Flap Lem`** (tab trapesium tipis di tepi jaring-jaring seperti pada gambar `Pola Dadu`) saat $t > 0.5$.

### 4.2 Engine Tekstur Prosedural Per-Sisi (`apps/web/src/lib/faceTextures.ts`)
Gunakan [`THREE.CanvasTexture`](https://threejs.org/docs/pages/CanvasTexture.html) (`512×512` per sisi, di-cache di memori) dengan pemetaan UV lokal $[0,1] \times [0,1]$ yang unik untuk tiap wajah polihedron:

- **Template Dadu Interaktif (`preset: "dice"`)**:
  - Aturan standar dadu (sisi berhadapan berjumlah 7, sesuai gambar `Pola Dadu`):
    - Alas = **1**, Atas = **6**, Kiri = **2**, Kanan = **5**, Belakang = **3**, Depan = **4**.
  - **Fitur Khusus Dadu**:
    1. **Lipat & Buka Jaring-Jaring**: Slider `0% ↔ 100%` mengubah Pola Dadu 2D menjadi Kubus Dadu 3D (dan sebaliknya), dengan titik mata dadu tetap menempel presisi di sisi yang benar.
    2. **Lempar Dadu (*Roll Dice*)**: Animasi putaran acak 3D yang mendarat tepat pada salah satu dari 6 sisi atas lalu menampilkan hasil angka (sangat berguna untuk materi Peluang/Statistika!).
    3. **Kustomisasi Sisi Dadu (*Face Customizer*)**: Guru bisa mengklik salah satu sisi dadu untuk mengubah warna dasar dadu, warna titik, mengganti gaya (titik `●`, angka `1–6`, huruf `A–F`, atau teks/pecahan bebas seperti `1/2`, `x²`), serta mengatur transparansi kaca agar sisi belakang tetap terlihat.

### 4.3 Katalog Lengkap Template Benda Sehari-hari (`Real-World References`)

| Benda Sehari-hari | Acuan Geometri | Visual & Tekstur Prosedural | Interaksi Khusus |
| :--- | :--- | :--- | :--- |
| **Dadu (1–6)** | Kubus (`cube`) | 6 sisi mata dadu 1–6 (1↔6, 2↔5, 3↔4), border membulat, opsional flap lem. | **Lipat/Buka Jaring**, **Lempar Dadu**, Custom warna/isi tiap sisi. |
| **Rubik 3×3** | Kubus (`cube`) | Grid 3×3 berwarna klasik (putih, kuning, merah, oranye, biru, hijau). | Lipat/Buka, Pisah Sisi, hitung volume kubus satuan ($3^3 = 27$). |
| **Kotak Kado** | Kubus / Balok | Warna pastel + pita menyilang di tiap sisi. | Lipat/Buka Jaring untuk menjelaskan luas permukaan kertas kado. |
| **Kotak Susu / Kardus** | Balok (`cuboid`) | Label kemasan depan/belakang & lipatan atas. | Ubah dimensi $p, l, t$, hitung volume liter ($\text{cm}^3 \to \text{mL}$), Buka Jaring. |
| **Kaleng Minuman / Drum** | Tabung (`cylinder`) | Tutup logam atas-bawah + selimut berlabel warna. | Buka selimut tabung menjadi **Persegi Panjang + 2 Lingkaran** (`CurvedSolidNet`). |
| **Topi Ulang Tahun / Cone Es Krim / Traffic Cone** | Kerucut (`cone`) | Pola garis/polkadot (topi), pola wafel (cone), strip reflektif oranye-putih (traffic cone). | Buka selimut kerucut menjadi **Juring Lingkaran + Alas Lingkaran**, tampilkan garis pelukis $s$. |
| **Tenda Kemah / Toblerone** | Prisma Segitiga (`prism`) | Kain tenda dua warna dengan pintu depan segitiga. | Buka jaring-jaring prisma segitiga (2 segitiga + 3 persegi panjang). |
| **Piramida Mesir** | Limas Segiempat (`pyramid`) | Tekstur batu pasir bertingkat lembut. | Tampilkan garis tinggi $t$ + sudut siku $90^\circ$ + buka jaring bintang 4 segitiga. |
| **Bola Sepak / Globe Bumi** | Bola (`sphere`) | Pola pentagon-heksagon (bola) atau garis lintang-bujur & benua minimalis (globe). | Irisan bidang memperlihatkan lingkaran besar (*great circle*) & jari-jari. |
| **Rumah Sederhana** | Gabungan Balok + Prisma/Limas (`compound`) | Dinding + pintu/jendela + atap genteng. | **Edit 2D**, **Pisah Atap & Badan**, hitung volume & luas permukaan gabungan. |
| **Benda Acuan 2D** | Bangun Datar 2D | **Jam Dinding** (sudut antar jarum), **Potongan Pizza** (juring & sudut pusat), **Rambu Lalu Lintas** (segitiga/oktagon), **Papan Catur** (grid persegi), **Layang-Layang** (diagonal & sumbu simetri). | Tarik jarum jam / sudut juring live, konversi langsung ke 3D. |

---

## 5. Pemetaan Perubahan File & Roadmap Implementasi V3

### 5.1 Pemetaan File Target pada Repositori
| Paket / Folder | File Target | Perubahan Utama |
| :--- | :--- | :--- |
| `packages/geometry-core` | `src/composite.ts` (baru), `src/unfold.ts`, `src/index.ts` | Tambah `mergeProfiles2DUnion` (via `polygon-clipping`), helper `extractBaseProfile2D`, validasi `CompoundSolidPart`, serta dukungan flap lem opsional pada `unfoldPlan`. |
| `apps/web/src/lib` | `faceTextures.ts` (baru), `realWorldTemplates.ts` (baru), `snapEngine.ts` (baru), `shapeToSolid.ts` | Generator `CanvasTexture` prosedural (Dadu 1–6, Rubik, Kado, Kaleng, Topi, Tenda, Globe, dll.); definisi katalog benda sehari-hari; *magnetic edge/vertex snapping* 2D; simpan `source2D` pada proposal `viz_solid`. |
| `apps/web/src/components/math` | `TongchuangSolidWidget.tsx`, `FaceCustomizerPopover.tsx` (baru) | Implementasi **True Hinged Unfold/Fold** memakai `unfoldPlan(poly)` + `THREE.Group` berengsel; dukungan `CanvasTexture` per sisi + UV mapping; render `compound` multi-part 3D; tombol **`Edit 2D`** & **`Lempar Dadu`**; popover kustomisasi isi/warna per sisi. |
| `apps/web/src/components/whiteboard` | `TemplateDrawer.tsx` (baru, menggantikan popover lama), `TemplateCardThumb.tsx` (baru) | Right slide-out visual card drawer (tab `Bangun Datar`, `Bangun Ruang`, `Benda Sehari-hari`) dengan thumbnail SVG visual + **Drag-and-Drop** (*floating ghost* → `screenToWorld`) + **1-Click Insert**. |
| `apps/web/src/pages/room` & `pages/whiteboard` | `PersonalRoomPage.tsx`, `WhiteboardCanvas.tsx` | Hapus ikon dari tombol teks header agar rapi 1 baris; pasang tombol **`Template`** pembuka `TemplateDrawer`; integrasi *drop handler* kanvas, *magnetic snapping* 2D, tombol **`Gabung Bentuk (2D Union / 3D Majemuk)`**, dan alur *round-trip* **`Edit 2D` ↔ `Terapkan ke 3D`**. |

### 5.2 Urutan Eksekusi Bertahap & Kriteria Verifikasi

- **Sprint 1 — Header UI Polish & Right-Side Visual Template Drawer (Drag & Click)**:
  - Hapus ikon pada tombol teks header di `PersonalRoomPage.tsx` (zero 2-line wrap), hilangkan duplikasi tombol bawah, bangun `TemplateDrawer.tsx` + `TemplateCardThumb.tsx` dengan *drag-and-drop* presisi (`screenToWorld`) dan *1-click insert*.
  - *Verifikasi*: Seluruh tombol header tampil rapi 1 baris pada lebar layar `>= 1024px`; menarik kartu dari drawer kanan dan melepaskannya di titik mana pun pada kanvas memunculkan objek tepat di bawah kursor (`< 2px` offset) pada zoom `50%`, `100%`, dan `200%`.
- **Sprint 2 — True Hinged Unfold/Fold & Template Benda Sehari-hari (Dadu 1–6 & Lainnya)**:
  - Sambungkan `unfoldPlan(poly)` ke pohon engsel `THREE.Group` di `TongchuangSolidWidget.tsx`; bangun `faceTextures.ts` (`CanvasTexture` per sisi) dan `realWorldTemplates.ts` (Dadu 1–6 + 10+ benda sehari-hari); tambahkan tombol **`Buka/Lipat`**, **`Lempar Dadu`**, dan `FaceCustomizerPopover.tsx`.
  - *Verifikasi*: Dadu 3D terbuka rata menjadi jaring-jaring salib 2D dengan posisi mata dadu 1↔6, 2↔5, 3↔4 tetap benar tanpa tekstur terbalik/terpotong, dan terlipat kembali menjadi kubus tertutup rapat pada `0%`.
- **Sprint 3 — Round-Trip 3D ↔ 2D & Penggabungan Bentuk (Persegi + Segitiga → Rumah 3D)**:
  - Implementasi `snapEngine.ts` (magnetic edge/vertex snapping), `composite.ts` (`polygon-clipping` 2D Boolean Union + `CompoundSolidPart` multi-bagian), tombol **`Edit 2D`** di widget 3D, dan aksi **`Gabung ke 3D`** (Mode Union 1-mesh & Mode Majemuk).
  - *Verifikasi*: Skenario end-to-end: masukkan Kubus 3D → klik `Edit 2D` → tarik Segitiga ke atas Persegi (auto-snap) → klik `Gabung ke 3D` → menghasilkan Rumah 3D yang bisa diputar, diiris, dipisah komponennya, dan dihitung volume gabungannya tanpa error build/test (`pnpm test:all && pnpm build`).
