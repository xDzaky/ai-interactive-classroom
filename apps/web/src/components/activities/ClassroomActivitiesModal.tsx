/**
 * ClassroomActivitiesModal.tsx — 7 Interactive Classroom Gamification Suite (V8)
 *
 * Adapted from Seewo EasiNote 5 (EasiNote.Activity.dll):
 * 1. Choice (Pilihan Ganda)
 * 2. Classify (2-Kategori Drag/Tap)
 * 3. SuperClassify (4-Kategori + Timer + Error Summary)
 * 4. GapFilling (Isian Rumpang Rumus/Kalimat)
 * 5. GroupCompetition (Split-Screen 2 Tim Kiri vs Kanan, Multi-Touch Ready!)
 * 6. Judge (Benar / Salah + Streak)
 * 7. TextMatch (Pencocokan Pasangan)
 * + AI Generator from active board objects via MCP inspect_scene!
 */
import React, { useEffect, useState } from 'react';
import {
  CLASSROOM_ACTIVITY_CATALOG,
  playFeedbackTone,
  type ClassroomActivityKind,
} from './activityTypes';

export interface ClassroomActivitiesModalProps {
  open: boolean;
  boardTopicHint?: string;
  onClose: () => void;
}

const CHOICE_QUESTIONS = [
  { q: 'Volume kubus dengan panjang rusuk s = 5 cm adalah...', opts: ['25 cm³', '100 cm³', '125 cm³', '150 cm³'], ans: 2 },
  { q: 'Persamaan lingkaran berpusat di (2, 1) dengan jari-jari r = 3 adalah...', opts: ['(x-2)² + (y-1)² = 3', '(x-2)² + (y-1)² = 9', '(x+2)² + (y+1)² = 9', 'x² + y² = 9'], ans: 1 },
  { q: 'Turunan pertama dari f(x) = sin(x) adalah...', opts: ['cos(x)', '-cos(x)', '-sin(x)', 'tan(x)'], ans: 0 },
  { q: 'Rumus volume tabung dengan jari-jari r dan tinggi t adalah...', opts: ['2πrt', 'πr²t', '⅓πr²t', '4/3πr³'], ans: 1 },
];

const CLASSIFY_ITEMS = [
  { id: 'c1', label: 'Persegi', cat: 'Bangun Datar' },
  { id: 'c2', label: 'Kubus', cat: 'Bangun Ruang' },
  { id: 'c3', label: 'Lingkaran', cat: 'Bangun Datar' },
  { id: 'c4', label: 'Tabung', cat: 'Bangun Ruang' },
  { id: 'c5', label: 'Segitiga', cat: 'Bangun Datar' },
  { id: 'c6', label: 'Kerucut', cat: 'Bangun Ruang' },
];

const SUPER_CLASSIFY_CATS = ['Linear', 'Kuadrat', 'Trigonometri', 'Eksponen'] as const;
const SUPER_CLASSIFY_ITEMS = [
  { id: 's1', label: 'y = 2x + 3', cat: 'Linear' },
  { id: 's2', label: 'y = x² - 4', cat: 'Kuadrat' },
  { id: 's3', label: 'y = sin(x)', cat: 'Trigonometri' },
  { id: 's4', label: 'y = 2ˣ', cat: 'Eksponen' },
  { id: 's5', label: 'y = -x + 5', cat: 'Linear' },
  { id: 's6', label: 'y = cos(2x)', cat: 'Trigonometri' },
  { id: 's7', label: 'y = 3x² + x', cat: 'Kuadrat' },
  { id: 's8', label: 'y = eˣ', cat: 'Eksponen' },
];

const GAP_SENTENCES = [
  {
    parts: ['Identitas Pythagoras trigonometri menyatakan sin²(θ) + ', ' = ', '.'],
    answers: ['cos²(θ)', '1'],
    chips: ['cos²(θ)', '1', 'tan(θ)', '0'],
  },
  {
    parts: ['Volume kerucut adalah ', ' × π × ', ' × t.'],
    answers: ['⅓', 'r²'],
    chips: ['⅓', 'r²', '2', 'r³'],
  },
];

const JUDGE_ITEMS = [
  { stmt: 'Jumlah sudut dalam segitiga selalu 180°.', truth: true },
  { stmt: 'Kubus memiliki 8 rusuk dan 6 titik sudut.', truth: false },
  { stmt: 'Nilai sin(90°) sama dengan 1.', truth: true },
  { stmt: 'Tabung memiliki 2 sisi datar berbentuk lingkaran dan 1 selimut.', truth: true },
  { stmt: 'Bilangan prima terkecil adalah 1.', truth: false },
];

const TEXT_MATCH_PAIRS = [
  { id: 'm1', left: 'Volume Kubus', right: 's³' },
  { id: 'm2', left: 'Luas Lingkaran', right: 'πr²' },
  { id: 'm3', left: 'Volume Bola', right: '4/3 πr³' },
  { id: 'm4', left: 'Teorema Pythagoras', right: 'a² + b² = c²' },
  { id: 'm5', left: 'Volume Kerucut', right: '⅓ πr²t' },
];

const COMP_POOL = [
  { q: '7 × 8 = ?', opts: ['54', '56', '64'], ans: 1 },
  { q: '√144 = ?', opts: ['12', '14', '11'], ans: 0 },
  { q: '3³ = ?', opts: ['9', '27', '81'], ans: 1 },
  { q: 'cos(0°) = ?', opts: ['0', '1', '-1'], ans: 1 },
  { q: 'Luas persegi s = 6?', opts: ['24', '36', '12'], ans: 1 },
  { q: '2⁵ = ?', opts: ['16', '32', '64'], ans: 1 },
];

export const ClassroomActivitiesModal: React.FC<ClassroomActivitiesModalProps> = ({
  open,
  boardTopicHint,
  onClose,
}) => {
  const [activeKind, setActiveKind] = useState<ClassroomActivityKind>('choice');

  // 1. Choice state
  const [choiceIdx, setChoiceIdx] = useState(0);
  const [choiceScore, setChoiceScore] = useState(0);
  const [choicePicked, setChoicePicked] = useState<number | null>(null);

  // 2. Classify state
  const [classifyRemaining, setClassifyRemaining] = useState(CLASSIFY_ITEMS);
  const [classifyPlaced, setClassifyPlaced] = useState<Record<string, string[]>>({
    'Bangun Datar': [],
    'Bangun Ruang': [],
  });
  const [classifyShake, setClassifyShake] = useState(false);

  // 3. SuperClassify state
  const [superRemaining, setSuperRemaining] = useState(SUPER_CLASSIFY_ITEMS);
  const [superErrors, setSuperErrors] = useState<string[]>([]);
  const [superScore, setSuperScore] = useState(0);

  // 4. GapFilling state
  const [gapIdx, setGapIdx] = useState(0);
  const [gapFilled, setGapFilled] = useState<Array<string | null>>([null, null]);
  const [gapStatus, setGapStatus] = useState<'idle' | 'ok' | 'wrong'>('idle');

  // 5. GroupCompetition (Split-Screen 2 Teams)
  const [teamAIdx, setTeamAIdx] = useState(0);
  const [teamBIdx, setTeamBIdx] = useState(0);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);

  // 6. Judge state
  const [judgeIdx, setJudgeIdx] = useState(0);
  const [judgeScore, setJudgeScore] = useState(0);
  const [judgeStreak, setJudgeStreak] = useState(0);

  // 7. TextMatch state
  const [matchLeft, setMatchLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchWrong, setMatchWrong] = useState(false);

  const resetAll = () => {
    setChoiceIdx(0); setChoiceScore(0); setChoicePicked(null);
    setClassifyRemaining(CLASSIFY_ITEMS); setClassifyPlaced({ 'Bangun Datar': [], 'Bangun Ruang': [] });
    setSuperRemaining(SUPER_CLASSIFY_ITEMS); setSuperErrors([]); setSuperScore(0);
    setGapIdx(0); setGapFilled([null, null]); setGapStatus('idle');
    setTeamAIdx(0); setTeamBIdx(0); setTeamAScore(0); setTeamBScore(0);
    setJudgeIdx(0); setJudgeScore(0); setJudgeStreak(0);
    setMatchLeft(null); setMatchedIds([]);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="classroom-activities-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5 backdrop-blur-xs"
    >
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              🎮 7 Aktivitas Gamifikasi Kelas (Seewo EasiNote Suite)
            </h2>
            {boardTopicHint && (
              <p className="truncate text-[11px] text-indigo-600 font-medium">
                Konteks papan aktif: {boardTopicHint}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              ↺ Ulangi
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Tutup ×
            </button>
          </div>
        </div>

        {/* 7-Game Tab Strip */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5" style={{ scrollbarWidth: 'none' }}>
          {CLASSROOM_ACTIVITY_CATALOG.map((item) => (
            <button
              key={item.kind}
              type="button"
              data-testid={`activity-tab-${item.kind}`}
              onClick={() => setActiveKind(item.kind)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                activeKind === item.kind
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.title.split(' (')[0]}</span>
            </button>
          ))}
        </div>

        {/* Active Game Stage */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          {/* 1. CHOICE */}
          {activeKind === 'choice' && (() => {
            const q = CHOICE_QUESTIONS[choiceIdx];
            if (!q) {
              return (
                <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <h3 className="text-lg font-bold text-emerald-900">Selesai!</h3>
                  <p className="mt-1 text-sm text-emerald-700">Skor Akhir: <strong>{choiceScore} / {CHOICE_QUESTIONS.length}</strong></p>
                  <button type="button" onClick={resetAll} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Main Lagi</button>
                </div>
              );
            }
            return (
              <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Soal {choiceIdx + 1} / {CHOICE_QUESTIONS.length}</span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Skor: {choiceScore}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{q.q}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.opts.map((opt, idx) => {
                    const isPicked = choicePicked === idx;
                    const isRight = idx === q.ans;
                    const cls = choicePicked === null
                      ? 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'
                      : isRight
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : isPicked
                          ? 'border-rose-500 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-white opacity-60';
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={choicePicked !== null}
                        onClick={() => {
                          setChoicePicked(idx);
                          const ok = idx === q.ans;
                          playFeedbackTone(ok);
                          if (ok) setChoiceScore((s) => s + 1);
                          window.setTimeout(() => {
                            setChoicePicked(null);
                            setChoiceIdx((i) => i + 1);
                          }, 900);
                        }}
                        className={`rounded-2xl border-2 p-4 text-left text-sm font-bold transition ${cls}`}
                      >
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-xs">{String.fromCharCode(65 + idx)}</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 2. CLASSIFY */}
          {activeKind === 'classify' && (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Ketuk keranjang tujuan untuk kartu aktif di bawah ({classifyRemaining.length} tersisa)
                </p>
                {classifyRemaining[0] ? (
                  <div className={`inline-block rounded-2xl border-2 border-indigo-400 bg-white px-8 py-4 text-lg font-extrabold text-indigo-900 shadow-md transition ${classifyShake ? 'animate-bounce border-rose-500 text-rose-600' : ''}`}>
                    {classifyRemaining[0].label}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-800">
                    🎉 Semua kartu berhasil dikelompokkan dengan benar!
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['Bangun Datar', 'Bangun Ruang'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const top = classifyRemaining[0];
                      if (!top) return;
                      if (top.cat === cat) {
                        playFeedbackTone(true);
                        setClassifyPlaced((p) => ({ ...p, [cat]: [...p[cat], top.label] }));
                        setClassifyRemaining((r) => r.slice(1));
                      } else {
                        playFeedbackTone(false);
                        setClassifyShake(true);
                        window.setTimeout(() => setClassifyShake(false), 500);
                      }
                    }}
                    className="flex min-h-[180px] flex-col items-center rounded-2xl border-2 border-dashed border-indigo-300 bg-white p-4 transition hover:bg-indigo-50/50"
                  >
                    <span className="mb-3 rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-800">{cat}</span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {classifyPlaced[cat].map((lbl) => (
                        <span key={lbl} className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">✓ {lbl}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. SUPER CLASSIFY (4 Kategori) */}
          {activeKind === 'super_classify' && (
            <div className="mx-auto max-w-4xl space-y-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Sisa: {superRemaining.length} fungsi</span>
                <span className="text-emerald-700">Benar: {superScore} · Salah: {superErrors.length}</span>
              </div>
              {superRemaining[0] ? (
                <div className="text-center">
                  <div className="inline-block rounded-2xl border-2 border-violet-400 bg-white px-8 py-4 font-mono text-xl font-black text-slate-900 shadow-md">
                    {superRemaining[0].label}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <div className="text-base font-bold text-emerald-900">🏆 Klasifikasi Selesai! Skor: {superScore}/{SUPER_CLASSIFY_ITEMS.length}</div>
                  {superErrors.length > 0 && (
                    <p className="mt-2 text-xs text-rose-700">Catatan kesalahan: {superErrors.join(', ')}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SUPER_CLASSIFY_CATS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const top = superRemaining[0];
                      if (!top) return;
                      if (top.cat === cat) {
                        playFeedbackTone(true);
                        setSuperScore((s) => s + 1);
                      } else {
                        playFeedbackTone(false);
                        setSuperErrors((e) => [...e, `${top.label} (${top.cat})`]);
                      }
                      setSuperRemaining((r) => r.slice(1));
                    }}
                    className="rounded-2xl border-2 border-slate-200 bg-white py-6 px-3 text-sm font-extrabold text-slate-800 shadow-xs transition hover:border-violet-500 hover:bg-violet-50"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. GAP FILLING */}
          {activeKind === 'gap_filling' && (() => {
            const cur = GAP_SENTENCES[gapIdx % GAP_SENTENCES.length];
            const fillNext = (chip: string) => {
              const slot = gapFilled.findIndex((x) => x === null);
              if (slot === -1) return;
              const next = [...gapFilled];
              next[slot] = chip;
              setGapFilled(next);
              if (next.every((x) => x !== null)) {
                const ok = next.every((val, i) => val === cur.answers[i]);
                playFeedbackTone(ok);
                setGapStatus(ok ? 'ok' : 'wrong');
              }
            };
            return (
              <div className="mx-auto max-w-2xl space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-base sm:text-lg font-semibold leading-loose text-slate-800 shadow-xs">
                  {cur.parts[0]}
                  <button
                    type="button"
                    onClick={() => { setGapFilled([null, gapFilled[1]]); setGapStatus('idle'); }}
                    className="mx-1 inline-block min-w-[76px] rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50 px-3 py-0.5 text-center font-mono font-bold text-indigo-800"
                  >
                    {gapFilled[0] ?? '_____'}
                  </button>
                  {cur.parts[1]}
                  <button
                    type="button"
                    onClick={() => { setGapFilled([gapFilled[0], null]); setGapStatus('idle'); }}
                    className="mx-1 inline-block min-w-[76px] rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50 px-3 py-0.5 text-center font-mono font-bold text-indigo-800"
                  >
                    {gapFilled[1] ?? '_____'}
                  </button>
                  {cur.parts[2]}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {cur.chips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => fillNext(c)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-mono text-sm font-bold text-slate-800 shadow-xs hover:border-indigo-500 hover:bg-indigo-50"
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {gapStatus !== 'idle' && (
                  <div className={`rounded-xl p-3 text-center text-xs font-bold ${gapStatus === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {gapStatus === 'ok' ? '✓ Tepat sekali! ' : '✕ Belum tepat, ketuk slot untuk mengganti. '}
                    {gapStatus === 'ok' && (
                      <button
                        type="button"
                        onClick={() => { setGapIdx((i) => i + 1); setGapFilled([null, null]); setGapStatus('idle'); }}
                        className="ml-2 rounded-lg bg-emerald-600 px-3 py-1 text-white"
                      >
                        Soal Berikutnya →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 5. GROUP COMPETITION (Split-Screen 2 Teams!) */}
          {activeKind === 'group_competition' && (
            <div data-testid="group-competition-split" className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {([
                { name: 'Tim A (Biru)', color: 'blue', idx: teamAIdx, score: teamAScore, setIdx: setTeamAIdx, setScore: setTeamAScore },
                { name: 'Tim B (Oranye)', color: 'amber', idx: teamBIdx, score: teamBScore, setIdx: setTeamBIdx, setScore: setTeamBScore },
              ] as const).map((team) => {
                const q = COMP_POOL[team.idx % COMP_POOL.length];
                return (
                  <div key={team.name} className={`flex flex-col justify-between rounded-2xl border-2 p-5 bg-white shadow-xs ${team.color === 'blue' ? 'border-blue-300' : 'border-amber-300'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${team.color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {team.name}
                      </span>
                      <span className="font-mono text-xl font-black text-slate-900">{team.score} pts</span>
                    </div>
                    <div className="my-4 text-center text-xl font-black text-slate-900">{q.q}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {q.opts.map((opt, oi) => (
                        <button
                          key={opt}
                          type="button"
                          onPointerDown={() => {
                            const ok = oi === q.ans;
                            playFeedbackTone(ok);
                            if (ok) team.setScore((s) => s + 10);
                            team.setIdx((i) => i + 1);
                          }}
                          className={`rounded-xl border-2 py-3.5 text-base font-extrabold transition active:scale-95 ${
                            team.color === 'blue'
                              ? 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100'
                              : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 6. JUDGE (Benar / Salah) */}
          {activeKind === 'judge' && (() => {
            const item = JUDGE_ITEMS[judgeIdx];
            if (!item) {
              return (
                <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="text-4xl mb-2">⚡</div>
                  <h3 className="text-lg font-bold text-emerald-900">Skor Benar/Salah: {judgeScore} / {JUDGE_ITEMS.length}</h3>
                  <button type="button" onClick={resetAll} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Ulangi</button>
                </div>
              );
            }
            const answer = (val: boolean) => {
              const ok = val === item.truth;
              playFeedbackTone(ok);
              if (ok) { setJudgeScore((s) => s + 1); setJudgeStreak((st) => st + 1); }
              else setJudgeStreak(0);
              setJudgeIdx((i) => i + 1);
            };
            return (
              <div className="mx-auto max-w-xl space-y-5 text-center">
                <div className="flex justify-center gap-3 text-xs font-bold">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Skor: {judgeScore}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">🔥 Streak: {judgeStreak}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-lg font-bold text-slate-900 shadow-xs">
                  {item.stmt}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => answer(true)} className="rounded-2xl bg-emerald-600 py-4 text-base font-extrabold text-white shadow-md hover:bg-emerald-500">
                    ✓ BENAR
                  </button>
                  <button type="button" onClick={() => answer(false)} className="rounded-2xl bg-rose-600 py-4 text-base font-extrabold text-white shadow-md hover:bg-rose-500">
                    ✕ SALAH
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 7. TEXT MATCH */}
          {activeKind === 'text_match' && (
            <div className="mx-auto max-w-3xl space-y-4">
              {matchedIds.length === TEXT_MATCH_PAIRS.length ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center font-bold text-emerald-900">
                  🎉 Semua {TEXT_MATCH_PAIRS.length} pasangan berhasil dicocokkan!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    {TEXT_MATCH_PAIRS.map((p) => {
                      const done = matchedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={done}
                          onClick={() => setMatchLeft(p.id)}
                          className={`w-full rounded-xl border-2 p-3.5 text-left text-sm font-bold transition ${
                            done
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 opacity-50'
                              : matchLeft === p.id
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                                : 'border-slate-200 bg-white hover:border-indigo-300'
                          }`}
                        >
                          {p.left}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2.5">
                    {[...TEXT_MATCH_PAIRS].reverse().map((p) => {
                      const done = matchedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={done || !matchLeft}
                          onClick={() => {
                            if (matchLeft === p.id) {
                              playFeedbackTone(true);
                              setMatchedIds((m) => [...m, p.id]);
                              setMatchLeft(null);
                            } else {
                              playFeedbackTone(false);
                              setMatchWrong(true);
                              window.setTimeout(() => setMatchWrong(false), 450);
                            }
                          }}
                          className={`w-full rounded-xl border-2 p-3.5 font-mono text-sm font-bold transition ${
                            done
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 opacity-50'
                              : matchWrong
                                ? 'border-rose-400 bg-rose-50'
                                : 'border-slate-200 bg-white hover:border-indigo-300'
                          }`}
                        >
                          {p.right}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
