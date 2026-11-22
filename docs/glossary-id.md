# Glosarium Geometri Tiga Dimensi (Dimensi Tiga) — Bahasa Indonesia

Glosarium istilah baku matematika untuk kurikulum SMP/SMA (Kurikulum Merdeka & K-13) yang diimplementasikan pada modul Geometri 3D AI Interactive Classroom (P11-T11).

## 1. Bangun Ruang (3D Solids)

| Istilah Indonesia | English | Rumus Volume | Rumus Luas Permukaan |
|---|---|---|---|
| **Kubus** | Cube | $V = s^3$ | $L = 6s^2$ |
| **Balok** | Cuboid / Rectangular Prism | $V = p \times l \times t$ | $L = 2(pl + pt + lt)$ |
| **Prisma Segitiga** | Triangular Prism | $V = L_{\text{alas}} \times t$ | $L = 2 L_{\text{alas}} + K_{\text{alas}} \times t$ |
| **Limas Segiempat** | Square Pyramid | $V = \frac{1}{3} L_{\text{alas}} \times t$ | $L = L_{\text{alas}} + \sum L_{\text{sisi tegak}}$ |
| **Tabung** (Silinder) | Cylinder | $V = \pi r^2 t$ | $L = 2\pi r(r + t)$ |
| **Kerucut** | Cone | $V = \frac{1}{3} \pi r^2 t$ | $L = \pi r (r + s)$, $s = \sqrt{r^2 + t^2}$ |
| **Bola** | Sphere | $V = \frac{4}{3} \pi r^3$ | $L = 4\pi r^2$ |

---

## 2. Unsur-Unsur Geometri Bangun Ruang

- **Titik Sudut (Vertex)**: Titik temu antara tiga atau lebih rusuk bangun ruang (misal: titik A, B, C, D, E, F, G, H pada kubus ABCD.EFGH).
- **Rusuk (Edge)**: Garis pertemuan antara dua bidang sisi bangun ruang.
- **Bidang Sisi (Face)**: Bidang datar (poligon) yang membatasi bangun ruang.
- **Alas (Base)**: Bidang tumpuan bangun ruang (misal: bidang ABCD).
- **Tinggi (Height)**: Jarak tegak lurus antara bidang alas dan bidang atas / titik puncak.
- **Apotema / Garis Pelukis (Slant Height)**: Jarak dari puncak kerucut/limas ke keliling alas.

---

## 3. Garis, Diagonal, dan Bidang pada Bangun Ruang

- **Diagonal Bidang (Face Diagonal)**: Garis yang menghubungkan dua titik sudut yang berhadapan pada satu bidang sisi yang sama.
  - Pada kubus dengan panjang rusuk $s$:
    $$\text{Diagonal Bidang} = s\sqrt{2}$$
- **Diagonal Ruang (Space Diagonal)**: Garis yang menghubungkan dua titik sudut yang berhadapan melintasi bagian dalam ruang bangun ruang.
  - Pada kubus dengan panjang rusuk $s$:
    $$\text{Diagonal Ruang} = s\sqrt{3}$$
  - Pada balok dengan dimensi $p \times l \times t$:
    $$\text{Diagonal Ruang} = \sqrt{p^2 + l^2 + t^2}$$
- **Bidang Diagonal (Diagonal Plane)**: Bidang yang melalui dua rusuk yang berhadapan dan sejajar pada kubus/balok (misal: bidang ACGE, BDHF).

---

## 4. Jarak dan Sudut dalam Ruang (Dimensi Tiga SMA)

- **Jarak Titik ke Titik**: Panjang segmen garis terpendek antara dua titik.
- **Jarak Titik ke Garis**: Panjang ruas garis yang tegak lurus dari titik tersebut ke garis tujuan.
- **Jarak Titik ke Bidang**: Panjang garis proyeksi tegak lurus dari titik ke bidang datar.
- **Jarak Dua Garis Bersilangan**: Jarak terpendek antara dua garis yang tidak sejajar dan tidak berpotongan dalam ruang 3D.
- **Sudut Antara Dua Bidang (Dihedral Angle)**: Sudut yang dibentuk oleh dua garis tegak lurus terhadap garis potong persekutuan kedua bidang.
- **Sudut Antara Garis dan Bidang**: Sudut antara garis tersebut dengan bayangan proyeksi tegak lurusnya pada bidang.

---

## 5. Irisan Bidang dan Jaring-Jaring (Cross-Section & Net)

- **Irisan Bidang (Cross-Section)**: Bangun datar poligon yang terbentuk dari perpotongan sebuah bidang datar dengan bangun ruang.
  - Dibangun melalui 3 titik acuan (3-point plane) atau menggunakan metode sumbu afinitas (affinity axis).
- **Jaring-Jaring (Unfold Net)**: Rangkaian bidang datar poligon hasil pembelahan bangun ruang menurut rusuk-rusuk tertentu yang dibentangkan menjadi satu bidang datar tanpa terputus.
  - Invarian: $\text{Luas Jaring-Jaring} = \text{Luas Permukaan Bangun Ruang}$.
