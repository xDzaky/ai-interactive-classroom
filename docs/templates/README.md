# Pustaka Template Pembelajaran Matematika (Kurikulum Merdeka)

Dokumentasi pustaka template pembelajaran interaktif untuk AI Interactive Classroom (P13-T08).

## 1. Taksonomi Elemen Kurikulum Merdeka

Taksonomi disusun mengacu pada Capaian Pembelajaran Matematika Kurikulum Merdeka (Kemendikbudristek) yang dibagi menjadi 5 elemen utama:

| Kode Elemen | Nama Elemen | Cakupan Materi Pokok |
|---|---|---|
| `bilangan` | Bilangan | Operasi hitung bilangan bulat, pecahan, persen, pangkat, dan bentuk akar |
| `aljabar` | Aljabar | Persamaan linear, pertidaksamaan, fungsi linear, fungsi kuadrat, relasi |
| `pengukuran` | Pengukuran | Luas bangun datar, volume bangun ruang, jaring-jaring, satuan internasional |
| `geometri` | Geometri | Bangun datar, bangun ruang (dimensi tiga), kesebangunan, transformasi, trigonometri |
| `analisis_data_peluang` | Analisis Data & Peluang | Diagram batang/garis/lingkaran, ukuran pemusatan (mean/median/modus), peluang kejadian |

---

## 2. Fase Pembelajaran

- **Fase A**: Kelas 1 - 2 SD
- **Fase B**: Kelas 3 - 4 SD
- **Fase C**: Kelas 5 - 6 SD
- **Fase D**: Kelas 7 - 9 SMP
- **Fase E**: Kelas 10 SMA
- **Fase F**: Kelas 11 - 12 SMA

---

## 3. Template Starter (10 Materi Original)

Semua starter template dibuat secara mandiri (original content) tanpa mengambil materi berlisensi non-komersial (NC) dari platform eksternal:

1. **`tpl-kubus-diagonal`**: Kubus ABCD.EFGH: Diagonal Bidang & Diagonal Ruang (Fase E, Geometri)
2. **`tpl-irisan-kubus`**: Irisan Bidang pada Kubus / Cross-Section (Fase F, Geometri)
3. **`tpl-jaring-balok`**: Jaring-Jaring Balok / Unfold Net (Fase D, Pengukuran)
4. **`tpl-tabung-luas-volume`**: Bangun Ruang Sisi Lengkung: Tabung (Fase D, Pengukuran)
5. **`tpl-grafik-kuadrat`**: Grafik Fungsi Kuadrat: $y = ax^2 + bx + c$ (Fase D, Aljabar)
6. **`tpl-garis-dan-sudut`**: Hubungan Antargaris dan Sudut (Fase D, Geometri)
7. **`tpl-keliling-luas-datar`**: Keliling & Luas Bangun Datar (Fase C, Pengukuran)
8. **`tpl-pythagoras`**: Teorema Pythagoras Segitiga Siku-Siku (Fase D, Geometri)
9. **`tpl-limas-segiempat`**: Limas Segiempat: Rusuk, Tinggi & Volume (Fase D, Geometri)
10. **`tpl-peluang-data`**: Analisis Data: Diagram Batang & Peluang (Fase D, Analisis Data & Peluang)

---

## 4. Struktur Data `LessonTemplate`

```typescript
export interface LessonTemplate {
  id: string;
  title: string;
  elementCode: 'bilangan' | 'aljabar' | 'pengukuran' | 'geometri' | 'analisis_data_peluang';
  phase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D' | 'Fase E' | 'Fase F';
  grade: string;
  description: string;
  teacherNotes?: string;
  studentQuestions: string[];
  boardState: Record<string, unknown>; // JSON BoardState
}
```
