/**
 * activityTypes.ts — Data Models & Starter Presets for 7 Seewo EasiNote 5 Classroom Games (V8)
 *
 * Covers: Choice, Classify, SuperClassify, GapFilling, GroupCompetition (Split-Screen), Judge, TextMatch
 */
export type ClassroomActivityKind =
  | 'choice'
  | 'classify'
  | 'super_classify'
  | 'gap_filling'
  | 'group_competition'
  | 'judge'
  | 'text_match';

export interface ActivityMeta {
  kind: ClassroomActivityKind;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
}

export const CLASSROOM_ACTIVITY_CATALOG: ActivityMeta[] = [
  { kind: 'choice', title: 'Pilihan Ganda (Choice)', subtitle: 'Soal cepat 4 opsi dengan timer & skor', icon: '🎯', badge: 'Kuis' },
  { kind: 'classify', title: 'Pengelompokan (Classify)', subtitle: 'Kelompokkan kartu ke 2 keranjang kategori', icon: '🗂️', badge: 'Sortir' },
  { kind: 'super_classify', title: 'Klasifikasi Lanjutan', subtitle: '4 kategori + waktu & ringkasan kesalahan', icon: '🧩', badge: '4 Kategori' },
  { kind: 'gap_filling', title: 'Isian Rumpang (GapFilling)', subtitle: 'Lengkapi slot kosong rumus & kalimat', icon: '✍️', badge: 'Rumus' },
  { kind: 'group_competition', title: 'Kompetisi 2 Tim (Split)', subtitle: 'Layar terbagi Kiri vs Kanan adu cepat!', icon: '⚔️', badge: '2 Tim' },
  { kind: 'judge', title: 'Benar / Salah (Judge)', subtitle: 'Uji miskonsepsi konsep + streak', icon: '⚡', badge: 'Cepat' },
  { kind: 'text_match', title: 'Cocokkan Pasangan', subtitle: 'Pasangkan rumus ↔ bangun ruang / unsur', icon: '🔗', badge: 'Memori' },
];

export function playFeedbackTone(correct: boolean): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = correct ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(correct ? 587.33 : 220, ctx.currentTime);
    if (correct) {
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    } else {
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.16);
    }
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    // ignore audio autoplay restrictions
  }
}
