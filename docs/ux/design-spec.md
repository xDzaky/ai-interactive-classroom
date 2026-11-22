# Spesifikasi Desain Antarmuka: Workspace & Math Studio (P13-T03)

Spesifikasi desain resmi untuk *AI Interactive Classroom*, menggabungkan fleksibilitas papan tulis tak terbatas dengan studio matematika interaktif (2D/3D & asisten AI edukasi).

---

## 1. Sistem Token Desain (Design Tokens)

Mengikuti standar `coding-standards` dan `frontend-patterns`:

```css
:root {
  /* Surface & Backgrounds */
  --bg-canvas: #0f172a;       /* Slate 900 */
  --bg-panel: rgba(15, 23, 42, 0.92);
  --bg-card: rgba(30, 41, 59, 0.85);
  --border-subtle: rgba(51, 65, 85, 0.60);
  --border-focus: #6366f1;    /* Indigo 500 */

  /* Semantic Math Accents */
  --math-point: #10b981;      /* Emerald 500: titik bebas / vertex */
  --math-line: #38bdf8;       /* Sky 400: ruas garis / edge */
  --math-plane: #f43f5e;      /* Rose 500: bidang irisan 3D cross-section */
  --math-angle: #f59e0b;      /* Amber 500: sudut & ukuran */
  --math-solid: #8b5cf6;      /* Violet 500: bangun ruang 3D */

  /* Text & Typography */
  --text-primary: #f8fafc;    /* Slate 50 */
  --text-secondary: #94a3b8;  /* Slate 400 */
  --text-muted: #64748b;      /* Slate 500 */

  /* Spacing & Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --touch-target-min: 44px;   /* Aksesibilitas WCAG 2.2 AA & smart display */
}
```

---

## 2. Struktur Tata Letak (Workspace Layout)

### Tiga Wilayah Utama:
1. **Header Bar (Atas):**
   - Judul Ruang Kelas + Kode Kamar + Status Koneksi (Live/Offline).
   - Mode Presets Switcher: `Menggambar` | `Geometri` | `Bangun Ruang` | `Grafik`.
   - Tombol Bantuan / Panduan Murid (AI Math Tutor drawer).
2. **Left Panel (Objek & Aljabar):**
   - Lebar default: 280px (collapsible).
   - Tabs: `Objek Papan` (daftar titik, bangun, kurva) dan `Rumus/Langkah` (penjabaran matematika langkah-demi-langkah).
   - Kontrol visibilitas instan per elemen.
3. **Bottom Grouped Toolbar (Bawah Tengah):**
   - Floating pill berlatar blur (`backdrop-blur-md`).
   - Tombol alat utama dengan popup flyout jika ditekan lama atau diklik tanda panah.
   - Indikator Undo / Redo / Zoom percentage.

---

## 3. Kompatibilitas Perangkat (Responsive Rules)
- **Desktop (≥ 1280px):** Panel objek terbuka di sebelah kiri, kanvas penuh di tengah, toolbar mengambang di bawah.
- **Tablet / Smart Display (768px – 1279px):** Panel objek dapat diminimalkan (collapsible icon button), target sentuh 48px untuk pen stylus / sentuhan jari.
- **Mobile (≤ 767px):** Panel objek menjadi bottom sheet yang dapat digeser ke atas; toolbar ringkas dengan tombol aksi utama.
