/**
 * phetCatalog.ts — Native Interactive Virtual Lab Catalog (AI Interactive Classroom)
 *
 * 100% first-party native React/SVG/Canvas simulations owned by AI Interactive Classroom.
 * Works completely offline (PWA) and can be freely customized in apps/web/src/components/lab/.
 */

export type PhETSubject = 'Matematika' | 'Fisika' | 'Kimia' | 'Biologi';

export interface PhETSimulationItem {
  id: string;
  slug: string;
  title: string;
  subject: PhETSubject;
  description: string;
  sampleQuestion: string;
  modulePath: string;
}

function lab(
  id: string,
  slug: string,
  title: string,
  subject: PhETSubject,
  description: string,
  sampleQuestion: string,
  modulePath: string,
): PhETSimulationItem {
  return {
    id,
    slug,
    title,
    subject,
    description,
    sampleQuestion,
    modulePath,
  };
}

export const PHET_CATALOG: PhETSimulationItem[] = [
  // Matematika
  lab(
    'phet-quadratics',
    'graphing-quadratics',
    'Grafik Fungsi Kuadrat',
    'Matematika',
    'Eksplorasi parabola, titik puncak, fokus, akar-akar, dan sumbu simetri fungsi kuadrat.',
    'Jika nilai koefisien a diubah dari +1 menjadi -2, apa yang terjadi pada arah bukaan dan lebar parabola?',
    'apps/web/src/components/lab/MathLabs.tsx',
  ),
  lab(
    'phet-fractions',
    'fractions-intro',
    'Pengenalan Pecahan',
    'Matematika',
    'Visualisasi pecahan senilai menggunakan diagram lingkaran, batang, gelas ukur, dan garis bilangan.',
    'Bandingkan 2/4 dengan 3/6 pada diagram lingkaran — apakah luas daerahnya sama?',
    'apps/web/src/components/lab/MathLabs.tsx',
  ),
  lab(
    'phet-area',
    'area-builder',
    'Pembangun Luas & Keliling',
    'Matematika',
    'Bangun bentuk datar dari petak satuan untuk memahami hubungan Luas dan Keliling.',
    'Apakah dua bangun dengan luas 12 satuan persegi selalu memiliki keliling yang sama?',
    'apps/web/src/components/lab/MathLabs.tsx',
  ),
  lab(
    'phet-plinko',
    'plinko-probability',
    'Peluang Plinko',
    'Matematika',
    'Distribusi binomial & peluang jatuhnya bola secara real-time pada papan paku Plinko.',
    'Di kotak mana bola paling sering mendarat setelah 100 percobaan dengan probabilitas 0.5?',
    'apps/web/src/components/lab/MathLabs.tsx',
  ),

  // Fisika
  lab(
    'phet-gravity',
    'gravity-force-lab',
    'Lab Gaya Gravitasi',
    'Fisika',
    'Hukum Gravitasi Newton — ubah massa kedua benda dan jaraknya untuk mengamati gaya tarik.',
    'Jika massa benda A digandakan sementara jarak tetap, berapa kali lipat gaya gravitasinya?',
    'apps/web/src/components/lab/PhysicsLabs.tsx',
  ),
  lab(
    'phet-forces',
    'forces-and-motion-basics',
    'Gaya & Gerak Dasar',
    'Fisika',
    'Resultan gaya, gaya gesek, kecepatan, dan percepatan benda (Hukum Newton I & II).',
    'Apa yang terjadi pada kecepatan troli jika gaya dorong sama besar dengan gaya gesek?',
    'apps/web/src/components/lab/PhysicsLabs.tsx',
  ),
  lab(
    'phet-circuit',
    'circuit-construction-kit-dc',
    'Rangkaian Listrik DC',
    'Fisika',
    'Eksperimen rangkaian seri, paralel, dan campuran dengan baterai, lampu, sakelar, dan meteran.',
    'Bagaimana terang lampu berubah saat dua lampu disusun seri dibandingkan paralel?',
    'apps/web/src/components/lab/PhysicsLabs.tsx',
  ),
  lab(
    'phet-wave',
    'wave-on-a-string',
    'Gelombang pada Tali',
    'Fisika',
    'Gelombang transversal real-time: amplitudo, frekuensi, redaman, dan tegangan tali.',
    'Jika frekuensi dinaikkan 2 kali lipat pada tegangan tetap, bagaimana panjang gelombangnya?',
    'apps/web/src/components/lab/PhysicsLabs.tsx',
  ),

  // Kimia
  lab(
    'phet-ph',
    'ph-scale',
    'Skala pH & Pengenceran',
    'Kimia',
    'Uji tingkat keasaman (pH) larutan sehari-hari, pengenceran air, dan tampilan ion Makro/Mikro.',
    'Apa yang terjadi pada nilai pH asam baterai ketika diencerkan dengan air?',
    'apps/web/src/components/lab/ChemistryLabs.tsx',
  ),
  lab(
    'phet-atom',
    'build-an-atom',
    'Susun Atom (Model Bohr)',
    'Kimia',
    'Susun proton, neutron, dan elektron untuk membentuk unsur, ion, serta cek kestabilan inti.',
    'Partikel subatomik mana yang menentukan nama unsur dan nomor atomnya?',
    'apps/web/src/components/lab/ChemistryLabs.tsx',
  ),
  lab(
    'phet-balance',
    'balancing-chemical-equations',
    'Penyetaraan Reaksi Kimia',
    'Kimia',
    'Menyetarakan persamaan reaksi kimia secara visual berdasarkan hukum kekekalan massa.',
    'Berapa koefisien H₂, O₂, dan H₂O agar jumlah atom kiri dan kanan setara?',
    'apps/web/src/components/lab/ChemistryLabs.tsx',
  ),

  // Biologi
  lab(
    'phet-selection',
    'natural-selection',
    'Seleksi Alam & Evolusi',
    'Biologi',
    'Simulasi evolusi populasi kelinci terhadap mutasi warna bulu, habitat, dan predator.',
    'Mengapa kelinci berbulu putih lebih bertahan hidup di lingkungan bersalju dibanding berbulu cokelat?',
    'apps/web/src/components/lab/BiologyLabs.tsx',
  ),
];
