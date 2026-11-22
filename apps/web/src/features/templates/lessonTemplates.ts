import type { LessonTemplate } from '@ai-classroom/curriculum-schema';

export const STARTER_LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'tpl-kubus-diagonal',
    title: 'Kubus ABCD.EFGH: Diagonal Bidang & Diagonal Ruang',
    elementCode: 'geometri',
    phase: 'Fase E',
    grade: 'Kelas 10',
    description: 'Visualisasi dan perhitungan diagonal bidang (s√2) dan diagonal ruang (s√3) pada kubus.',
    teacherNotes: 'Pandu siswa menggunakan alat ukur untuk membandingkan panjang diagonal bidang AC dengan diagonal ruang AG.',
    studentQuestions: [
      'Jika panjang rusuk kubus adalah 8 cm, hitunglah panjang diagonal bidang AC!',
      'Buktikan bahwa panjang ruas garis AG sama dengan 8√3 cm!',
    ],
    boardState: {
      roomId: 'tpl-kubus-diagonal',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Kubus Diagonal',
          strokes: [],
          objects: {
            'solid-cube-1': {
              id: 'solid-cube-1',
              type: 'viz_solid',
              solidType: 'cube',
              params: { type: 'cube', s: 6 },
              x: 0,
              y: 0,
              display: { showLabels: true, showHiddenEdges: true, opacity: 0.35 },
            },
          },
        },
      },
    },
  },
  {
    id: 'tpl-irisan-kubus',
    title: 'Irisan Bidang pada Kubus (Cross-Section)',
    elementCode: 'geometri',
    phase: 'Fase F',
    grade: 'Kelas 12',
    description: 'Membuat dan menganalisis poligon irisan yang terbentuk dari perpotongan bidang datar dengan kubus.',
    teacherNotes: 'Pilih 3 titik sudut (misal A, C, H) untuk memperlihatkan irisan segitiga ACH.',
    studentQuestions: [
      'Bentuk bangun datar apa yang dihasilkan oleh bidang yang melalui titik A, C, dan H?',
      'Berapakah luas segitiga irisan ACH jika panjang rusuk kubus 6 cm?',
    ],
    boardState: {
      roomId: 'tpl-irisan-kubus',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Irisan Kubus',
          strokes: [],
          objects: {
            'solid-cube-section': {
              id: 'solid-cube-section',
              type: 'viz_solid',
              solidType: 'cube',
              params: { type: 'cube', s: 6 },
              x: 0,
              y: 0,
              display: {
                showLabels: true,
                showHiddenEdges: true,
                sectionPlane: { p1: [0, 0, 0], p2: [6, 6, 0], p3: [0, 6, 6] },
              },
            },
          },
        },
      },
    },
  },
  {
    id: 'tpl-jaring-balok',
    title: 'Jaring-Jaring Balok (Unfold Net)',
    elementCode: 'pengukuran',
    phase: 'Fase D',
    grade: 'Kelas 8',
    description: 'Membuka balok menjadi jaring-jaring datar dan membuktikan luas permukaan.',
    teacherNotes: 'Gunakan slider jaring-jaring untuk memperlihatkan 6 persegi panjang penyusun balok.',
    studentQuestions: [
      'Ada berapa pasang persegi panjang kongruen yang menyusun jaring-jaring balok?',
      'Jika ukuran balok 4 cm × 3 cm × 5 cm, tentukan luas jaring-jaringnya!',
    ],
    boardState: {
      roomId: 'tpl-jaring-balok',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Jaring Balok',
          strokes: [],
          objects: {
            'solid-cuboid-1': {
              id: 'solid-cuboid-1',
              type: 'viz_solid',
              solidType: 'cuboid',
              params: { type: 'cuboid', l: 5, w: 4, h: 3 },
              x: 0,
              y: 0,
              display: { showLabels: true, unfoldT: 0.8 },
            },
          },
        },
      },
    },
  },
  {
    id: 'tpl-tabung-luas-volume',
    title: 'Bangun Ruang Sisi Lengkung: Tabung',
    elementCode: 'pengukuran',
    phase: 'Fase D',
    grade: 'Kelas 9',
    description: 'Analisis jaring-jaring selimut tabung (persegi panjang 2πr × t) dan luas dua lingkaran alas.',
    teacherNotes: 'Tunjukkan bahwa selimut tabung jika dibuka membentuk persegi panjang dengan panjang 2πr.',
    studentQuestions: [
      'Rumus apakah yang digunakan untuk menghitung luas selimut tabung?',
      'Hitunglah volume tabung dengan jari-jari 7 cm dan tinggi 10 cm!',
    ],
    boardState: {
      roomId: 'tpl-tabung-luas-volume',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Tabung',
          strokes: [],
          objects: {
            'solid-cylinder-1': {
              id: 'solid-cylinder-1',
              type: 'viz_solid',
              solidType: 'cylinder',
              params: { type: 'cylinder', r: 7, h: 10 },
              x: 0,
              y: 0,
            },
          },
        },
      },
    },
  },
  {
    id: 'tpl-grafik-kuadrat',
    title: 'Grafik Fungsi Kuadrat: y = ax² + bx + c',
    elementCode: 'aljabar',
    phase: 'Fase D',
    grade: 'Kelas 9',
    description: 'Eksplorasi titik puncak, sumbu simetri, dan pengaruh nilai a terhadap arah keterbukaan parabola.',
    teacherNotes: 'Amati pergeseran grafik saat konstanta c diubah.',
    studentQuestions: [
      'Ke arah manakah kurva parabola terbuka jika koefisien a bernilai positif?',
      'Tentukan koordinat titik potong grafik y = x² - 4 terhadap sumbu X!',
    ],
    boardState: {
      roomId: 'tpl-grafik-kuadrat',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Fungsi Kuadrat',
          strokes: [],
          objects: {
            'graph-parabola-1': {
              id: 'graph-parabola-1',
              type: 'graph',
              expression: 'x^2 - 4',
              color: '#3b82f6',
            },
          },
        },
      },
    },
  },
  {
    id: 'tpl-garis-dan-sudut',
    title: 'Hubungan Antargaris dan Sudut',
    elementCode: 'geometri',
    phase: 'Fase D',
    grade: 'Kelas 7',
    description: 'Sudut sehadap, berseberangan dalam/luar, dan bertolak belakang pada dua garis sejajar dipotong transversal.',
    teacherNotes: 'Gunakan busur/alat ukur sudut untuk memverifikasi besar sudut yang sama.',
    studentQuestions: [
      'Sebutkan pasangan sudut sehadap pada gambar!',
      'Jika sudut A1 = 70°, berapakah besar sudut dalam sepihak B2?',
    ],
    boardState: {
      roomId: 'tpl-garis-dan-sudut',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Garis & Sudut',
          strokes: [],
          objects: {},
        },
      },
    },
  },
  {
    id: 'tpl-keliling-luas-datar',
    title: 'Keliling & Luas Bangun Datar',
    elementCode: 'pengukuran',
    phase: 'Fase C',
    grade: 'Kelas 5',
    description: 'Konsep luas persegipanjang, segitiga, dan jajargenjang berbasis petak satuan.',
    teacherNotes: 'Ajak siswa menghitung jumlah petak satuan sebelum menggunakan perkalian rumus.',
    studentQuestions: [
      'Hitunglah keliling bangun datar tersebut!',
      'Berapa luas persegi panjang yang memiliki panjang 12 cm dan lebar 5 cm?',
    ],
    boardState: {
      roomId: 'tpl-keliling-luas-datar',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Bangun Datar',
          strokes: [],
          objects: {},
        },
      },
    },
  },
  {
    id: 'tpl-pythagoras',
    title: 'Teorema Pythagoras Segitiga Siku-Siku',
    elementCode: 'geometri',
    phase: 'Fase D',
    grade: 'Kelas 8',
    description: 'Pembuktian visual kuadrat sisi miring sama dengan jumlah kuadrat kedua sisi siku-sikunya: c² = a² + b².',
    teacherNotes: 'Gunakan triple Pythagoras 3-4-5 dan 5-12-13 sebagai contoh awal.',
    studentQuestions: [
      'Jika panjang sisi siku-siku adalah 6 cm dan 8 cm, berapakah panjang sisi miringnya?',
      'Apakah segitiga dengan sisi 5 cm, 12 cm, dan 13 cm merupakan segitiga siku-siku?',
    ],
    boardState: {
      roomId: 'tpl-pythagoras',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Pythagoras',
          strokes: [],
          objects: {},
        },
      },
    },
  },
  {
    id: 'tpl-limas-segiempat',
    title: 'Limas Segiempat: Rusuk, Tinggi & Volume',
    elementCode: 'geometri',
    phase: 'Fase D',
    grade: 'Kelas 8',
    description: 'Konstruksi limas T.ABCD, tinggi limas, dan apotema segitiga tegak.',
    teacherNotes: 'Jelaskan perbedaan antara tinggi limas (titik T ke pusat alas) dengan tinggi segitiga tegak.',
    studentQuestions: [
      'Berapa banyak rusuk dan titik sudut pada limas segiempat T.ABCD?',
      'Hitunglah luas permukaan limas jika alas persegi berukuran 10 cm dan tinggi segitiga sisi tegak 13 cm!',
    ],
    boardState: {
      roomId: 'tpl-limas-segiempat',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Limas Segiempat',
          strokes: [],
          objects: {
            'solid-pyramid-1': {
              id: 'solid-pyramid-1',
              type: 'viz_solid',
              solidType: 'pyramid',
              params: { type: 'pyramid', b: 6, h: 4 },
              x: 0,
              y: 0,
            },
          },
        },
      },
    },
  },
  {
    id: 'tpl-peluang-data',
    title: 'Analisis Data: Diagram Batang & Peluang',
    elementCode: 'analisis_data_peluang',
    phase: 'Fase D',
    grade: 'Kelas 8',
    description: 'Penyajian data frekuensi dalam bentuk diagram dan perhitungan peluang empiris.',
    teacherNotes: 'Gunakan papan tulis untuk menggambar diagram batang data frekuensi pelemparan dadu.',
    studentQuestions: [
      'Berapakah peluang munculnya mata dadu prima pada pelemparan sebuah dadu?',
      'Nilai manakah yang merupakan modus dari diagram data tersebut?',
    ],
    boardState: {
      roomId: 'tpl-peluang-data',
      activeSceneId: 'scene-1',
      scenes: {
        'scene-1': {
          id: 'scene-1',
          name: 'Analisis Data',
          strokes: [],
          objects: {},
        },
      },
    },
  },
];
