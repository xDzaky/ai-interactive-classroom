# Spike: JSXGraph untuk Dynamic Geometry Engine (P13-T04)

Analisis dan evaluasi kelayakan teknis pengadopsian **JSXGraph** untuk mesin geometri dinamis 2D (titik, garis, lingkaran, proyeksi, dan ketergantungan relasi geometris).

---

## 1. Verifikasi Lisensi

- **Proyek:** JSXGraph (Universitas Bayreuth) — https://github.com/jsxgraph/jsxgraph
- **Model Lisensi:** Dual license **LGPL-3.0** dan **MIT** (bebas digunakan untuk tujuan komersial di bawah klausul MIT).
- **Pilihan Lisensi Proyek Ini:** **MIT License** (memenuhi syarat ADR-P13 Path C dan bebas dari copyleft restriction).

---

## 2. Matriks Evaluasi (Skor 0–3)

| Kriteria | Skor (0-3) | Catatan Teknis |
|---|:---:|---|
| **Integrasi React & TypeScript** | 2/3 | Membutuhkan wrapper component (`useRef` pada container DOM div); deklarasi types `@types/jsxgraph` tersedia atau definisi d.ts ringkas. |
| **Dukungan Touch / Stylus Tablet** | 3/3 | Sangat matang, mendukung multitouch, drag handle, pinch-to-zoom pada perangkat layar sentuh dan smart display. |
| **Ketergantungan Objek (DAG)** | 3/3 | Sudah memiliki dependency graph internal: memindahkan titik A akan langsung memperbarui titik tengah, garis bagi, dan lingkaran terkait secara otomatis. |
| **Dukungan Dark Mode & Styling** | 3/3 | Atribut warna, ketebalan, dan stroke dapat dikonfigurasi penuh via tema JavaScript/CSS. |
| **Serialisasi Event Log / Replay** | 2/3 | Dapat mengekspor/mengimpor state elemen atau dikendalikan secara deklaratif dari event log `WhiteboardEvent` kami. |
| **Kinerja (200+ objek)** | 3/3 | Menggunakan rendering SVG / Canvas teroptimasi; frame update < 16ms untuk recomputation. |

---

## 3. Keputusan (Decision)

**Pilihan: HYBRID (Adopt for Dynamic 2D Geometry Elements, Native Three.js for 3D)**
- Untuk geometri 2D dinamis berelasi (misal teorema Pythagoras interaktif, garis bagi, sudut bergerak), gunakan JSXGraph sebagai widget board khusus (`object_type: "dynamic_geometry"`).
- Untuk 3D Bangun Ruang (kubus, irisan bidang, jaring-jaring unfold), gunakan implementasi Three.js/R3F mandiri dari P11 karena membutuhkan rendering mesh 3D WebGL dengan shader irisan dan animasi rotasi engsel.
- Tidak perlu membuat mesin constraint solver 2D dari nol (*re-inventing the wheel*), menghemat ratusan jam kerja dan ribuan token.
