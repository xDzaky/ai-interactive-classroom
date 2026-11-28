/**
 * TableGridPicker.tsx — Instant R×C Hover Grid Picker + Subject Presets (V9)
 * Used inside TemplateDrawer ("Tabel & Alat Bantu" tab) and Notes quick-insert popover.
 */
import React, { useState } from "react";
import type { SubjectHelperKind, TablePresetMode } from "@ai-classroom/whiteboard-core";

export interface TableGridPickerProps {
  onInsertTable: (preset: TablePresetMode, opts?: { rows?: number; cols?: number }) => void;
  onInsertHelper: (helperKind: SubjectHelperKind) => void;
}

const TABLE_PRESETS: Array<{
  mode: TablePresetMode;
  icon: string;
  label: string;
  desc: string;
  badge: string;
}> = [
  {
    mode: "stat_grouped",
    icon: "📊",
    label: "Statistika Data Kelompok",
    desc: "Interval + f → Mean, Median, Modus, xᵢ, f·x, fk & Histogram",
    badge: "Populer",
  },
  {
    mode: "stat_ungrouped",
    icon: "🧮",
    label: "Statistika Data Tunggal",
    desc: "Nilai xᵢ + fᵢ → Mean, Median (ganjil/genap), Modus & Q₁–Q₃",
    badge: "Statistika",
  },
  {
    mode: "function_values",
    icon: "📈",
    label: "Tabel Nilai Fungsi f(x)",
    desc: "Ketik rumus f(x) → isi otomatis (x, y) & 1-klik plot kurva",
    badge: "Aljabar",
  },
  {
    mode: "truth_table",
    icon: "⊤",
    label: "Tabel Kebenaran Logika",
    desc: "Evaluasi ekspresi p, q, r + deteksi Tautologi / Kontradiksi",
    badge: "Logika",
  },
  {
    mode: "trig_special_angles",
    icon: "📐",
    label: "Tabel Sudut Istimewa",
    desc: "sin, cos, tan (0°–90°) lengkap siap edit",
    badge: "Trigonometri",
  },
  {
    mode: "chem_mrs",
    icon: "⚗️",
    label: "Tabel MRS Stoikiometri",
    desc: "Mula-mula, Reaksi, Setimbang siap edit untuk Kimia",
    badge: "Kimia",
  },
];

const SUBJECT_HELPERS: Array<{
  kind: SubjectHelperKind;
  icon: string;
  label: string;
  desc: string;
}> = [
  { kind: "horner_scheme", icon: "➗", label: "Skema Horner", desc: "Pembagian polinomial, Hasil Bagi H(x) & Sisa S" },
  { kind: "matrix_grid", icon: "▦", label: "Grid Matriks", desc: "Ordo 2×2 / 3×3, Determinan Sarrus, Transpose & Invers" },
  { kind: "factor_tree", icon: "🌳", label: "Pohon Faktor & Sengkedan", desc: "Faktorisasi prima, FPB & KPK otomatis" },
  { kind: "number_line", icon: "↔️", label: "Garis Bilangan & Interval", desc: "Titik penuh/kosong & arsiran pertidaksamaan" },
  { kind: "venn_diagram", icon: "⭕", label: "Diagram Venn Himpunan", desc: "Klik irisan A∩B, A∪B, komplemen + jumlah anggota" },
  { kind: "sample_space_tree", icon: "🎲", label: "Ruang Sampel & Pascal", desc: "Tabel 2 Dadu (6×6), Pohon Peluang & Segitiga Pascal" },
  { kind: "unit_stairs", icon: "🪜", label: "Tangga Konversi Satuan", desc: "km↔mm & kg↔mg dengan loncatan ×10 / ÷10" },
];

export const TableGridPicker: React.FC<TableGridPickerProps> = ({
  onInsertTable,
  onInsertHelper,
}) => {
  const [hoverR, setHoverR] = useState(4);
  const [hoverC, setHoverC] = useState(4);

  return (
    <div className="space-y-4">
      {/* 1. Hover Grid Picker for Custom Table */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">Tabel Custom Cepat</span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
            {hoverR} Baris × {hoverC} Kolom
          </span>
        </div>
        <div
          className="grid grid-cols-8 gap-1 w-fit mx-auto"
          onMouseLeave={() => {
            setHoverR(4);
            setHoverC(4);
          }}
        >
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const active = r < hoverR && c < hoverC;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onMouseEnter={() => {
                    setHoverR(r + 1);
                    setHoverC(c + 1);
                  }}
                  onClick={() => onInsertTable("custom", { rows: r + 1, cols: c + 1 })}
                  title={`Buat tabel ${r + 1} × ${c + 1}`}
                  className={`h-5 w-5 rounded-[4px] border transition ${
                    active
                      ? "border-indigo-500 bg-indigo-500/80 shadow-xs"
                      : "border-slate-300 bg-white hover:border-indigo-400"
                  }`}
                />
              );
            }),
          )}
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Klik kotak ukuran untuk menyisipkan tabel bebas (bisa tambah/hapus baris & paste Excel)
        </p>
      </div>

      {/* 2. Smart Table Presets (clean typographic list, no emoji icons) */}
      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Preset Tabel Pintar
        </div>
        <div className="space-y-1">
          {TABLE_PRESETS.map((p) => (
            <button
              key={p.mode}
              type="button"
              data-testid={`insert-table-${p.mode}`}
              onClick={() => onInsertTable(p.mode)}
              className="flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40 active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800 truncate">{p.label}</div>
                <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{p.desc}</p>
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shrink-0">
                {p.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Smart Subject Helpers (clean typographic list, no emoji icons) */}
      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Alat Bantu Terstruktur Lintas Materi
        </div>
        <div className="space-y-1">
          {SUBJECT_HELPERS.map((h) => (
            <button
              key={h.kind}
              type="button"
              data-testid={`insert-helper-${h.kind}`}
              onClick={() => onInsertHelper(h.kind)}
              className="block w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40 active:scale-[0.99]"
            >
              <div className="text-xs font-semibold text-slate-800">{h.label}</div>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{h.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
