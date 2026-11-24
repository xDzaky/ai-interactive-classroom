/**
 * phetCatalog.ts — Curated Official PhET Interactive Simulations Catalog (V4)
 *
 * License Compliance:
 * Official PhET HTML5 Simulations by University of Colorado Boulder (https://phet.colorado.edu/)
 * Regular simulations are licensed under CC BY-NC 4.0 (Attribution-NonCommercial 4.0 International).
 * Attribution and official source URLs are preserved in every embedded view.
 */

export type PhETSubject = 'Matematika' | 'Fisika' | 'Kimia' | 'Biologi';

export interface PhETSimulationItem {
  id: string;
  slug: string;
  title: string;
  subject: PhETSubject;
  description: string;
  embedUrl: string;
  officialUrl: string;
  sampleQuestion: string;
  license: 'CC BY-NC 4.0';
  attribution: string;
}

const ATTRIBUTION = 'PhET Interactive Simulations, University of Colorado Boulder (CC BY-NC 4.0)';

function phet(
  id: string,
  slug: string,
  title: string,
  subject: PhETSubject,
  description: string,
  sampleQuestion: string,
): PhETSimulationItem {
  return {
    id,
    slug,
    title,
    subject,
    description,
    embedUrl: `https://phet.colorado.edu/sims/html/${slug}/latest/${slug}_all.html?locale=in`,
    officialUrl: `https://phet.colorado.edu/en/simulations/${slug}`,
    sampleQuestion,
    license: 'CC BY-NC 4.0',
    attribution: ATTRIBUTION,
  };
}

export const PHET_CATALOG: PhETSimulationItem[] = [
  // Matematika
  phet(
    'phet-quadratics',
    'graphing-quadratics',
    'Graphing Quadratics',
    'Matematika',
    'Eksplorasi parabola, titik puncak, fokus, dan sumbu simetri fungsi kuadrat.',
    'Jika nilai koefisien a diubah dari +1 menjadi -2, apa yang terjadi pada arah bukaan dan lebar parabola?',
  ),
  phet(
    'phet-fractions',
    'fractions-intro',
    'Fractions Intro',
    'Matematika',
    'Visualisasi pecahan senilai menggunakan lingkaran, persegi, dan garis bilangan.',
    'Bandingkan 2/4 dengan 3/6 pada diagram lingkaran — apakah luas daerahnya sama?',
  ),
  phet(
    'phet-area',
    'area-builder',
    'Area Builder',
    'Matematika',
    'Membangun bangun datar dari petak satuan untuk memahami hubungan Luas dan Keliling.',
    'Apakah dua bangun dengan luas 12 satuan persegi selalu memiliki keliling yang sama?',
  ),
  phet(
    'phet-plinko',
    'plinko-probability',
    'Plinko Probability',
    'Matematika',
    'Distribusi binomial & peluang jatuhnya bola pada papan Plinko.',
    'Di kotak mana bola paling sering mendarat setelah 100 percobaan dengan probabilitas 0.5?',
  ),

  // Fisika
  phet(
    'phet-gravity',
    'gravity-force-lab',
    'Gravity Force Lab',
    'Fisika',
    'Hukum Gravitasi Newton — ubah massa kedua benda dan jaraknya.',
    'Jika massa benda A digandakan sementara jarak tetap, berapa kali lipat gaya gravitasinya?',
  ),
  phet(
    'phet-forces',
    'forces-and-motion-basics',
    'Forces and Motion: Basics',
    'Fisika',
    'Resultan gaya, gaya gesek, dan percepatan benda (Hukum Newton I & II).',
    'Apa yang terjadi pada kecepatan troli jika gaya dorong sama besar dengan gaya gesek?',
  ),
  phet(
    'phet-circuit',
    'circuit-construction-kit-dc',
    'Circuit Construction Kit: DC',
    'Fisika',
    'Rakit rangkaian seri & paralel dengan baterai, resistor, lampu, dan amperemeter.',
    'Bagaimana terang lampu berubah saat dua lampu disusun seri dibandingkan paralel?',
  ),
  phet(
    'phet-wave',
    'wave-on-a-string',
    'Wave on a String',
    'Fisika',
    'Gelombang transversal: amplitudo, frekuensi, redaman, dan tegangan tali.',
    'Jika frekuensi dinaikkan 2 kali lipat pada tegangan tetap, bagaimana panjang gelombangnya?',
  ),

  // Kimia
  phet(
    'phet-atom',
    'build-an-atom',
    'Build an Atom',
    'Kimia',
    'Susun proton, neutron, dan elektron untuk membentuk unsur & ion stabil.',
    'Partikel subatomik mana yang menentukan nama unsur dan nomor atomnya?',
  ),
  phet(
    'phet-ph',
    'ph-scale',
    'pH Scale',
    'Kimia',
    'Uji tingkat keasaman (pH) berbagai larutan sehari-hari dan pengaruh pengenceran air.',
    'Apa yang terjadi pada nilai pH asam baterai ketika diencerkan dengan air?',
  ),
  phet(
    'phet-balance',
    'balancing-chemical-equations',
    'Balancing Chemical Equations',
    'Kimia',
    'Menyetarakan persamaan reaksi kimia berdasarkan hukum kekekalan massa.',
    'Berapa koefisien H₂, O₂, dan H₂O agar jumlah atom kiri dan kanan setara?',
  ),

  // Biologi
  phet(
    'phet-selection',
    'natural-selection',
    'Natural Selection',
    'Biologi',
    'Simulasi evolusi populasi kelinci terhadap mutasi genetik dan faktor lingkungan.',
    'Mengapa kelinci berbulu putih lebih bertahan hidup di lingkungan bersalju dibanding berbulu cokelat?',
  ),
];
