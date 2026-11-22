# Study Spec S6: Studio Toolbar Structure & Discoverability (Struktur Toolbar)

## Behavioral Description
Modern math studio software organizes tools into functional hierarchies rather than an overwhelming single list of 50 icons. Primary tools remain one tap away; specialized tools expand in flyout drawers or context toolbars.

## Information Architecture
1. **Pena & Menggambar (Draw):**
   - Freehand pen, highlighter, eraser, auto-shape toggle.
2. **Geometri 2D (Plane Geometry):**
   - Titik (Point), Garis (Line), Ruas Garis (Segment), Titik Tengah (Midpoint), Garis Tegak Lurus (Perpendicular), Lingkaran (Circle), Poligon (Polygon).
3. **Bangun Ruang 3D (Solid Geometry):**
   - Kubus (Cube), Balok (Cuboid), Prisma (Prism), Limas (Pyramid), Tabung (Cylinder), Kerucut (Cone), Bola (Sphere).
   - Irisan Bidang (Cross-section plane), Jaring-jaring (Unfolding net slider), Ukur (Measure).
4. **Grafik & Fungsi (Graphing):**
   - Fungsi Aljabar $f(x)$, Trigonometri, Polinomial, Eksponen.
5. **Aksi Cepat & Konteks (Contextual):**
   - Radial Quick Menu for tablet & stylus users.
   - Floating context toolbar attached beneath the active 3D solid.

## Edge Cases
1. Small phone screens: collapse to bottom navigation bar or floating speed dial.
2. Large interactive display panels (IFPD): double-spaced hit targets (≥ 56px) for finger/stylus comfort.

## Test Vectors (Ours)
- Tested across breakpoints 360px, 768px, 1280px in `e2e/devices.spec.ts`.

## Gaps vs Our Implementation
- Implemented in `GroupedToolBar.tsx`, `RadialMenu.tsx`, and `SolidContextToolbar.tsx`. 100% covered.
