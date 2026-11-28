/**
 * tableTypes.ts — Canonical schemas & preset builders for V9 Smart Custom Table
 * & Smart Subject Helpers (shared across Whiteboard, Notes, PPTX, and Canvas MCP).
 */
import { z } from "zod";

export const TablePresetModeSchema = z.enum([
  "custom",
  "stat_ungrouped",
  "stat_grouped",
  "function_values",
  "truth_table",
  "trig_special_angles",
  "experiment_regression",
  "chem_mrs",
]);
export type TablePresetMode = z.infer<typeof TablePresetModeSchema>;

export const TableCellSchema = z.object({
  raw: z.string(),
  computed: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  bold: z.boolean().optional(),
  colSpan: z.number().int().positive().optional(),
  rowSpan: z.number().int().positive().optional(),
  hiddenForReveal: z.boolean().optional(),
});
export type TableCell = z.infer<typeof TableCellSchema>;

export const SmartTableStatConfigSchema = z.object({
  showMidpointCol: z.boolean().default(true),
  showFxCol: z.boolean().default(true),
  showCumFreqCol: z.boolean().default(true),
  showTotalRow: z.boolean().default(true),
  highlightMedianClass: z.boolean().default(true),
  highlightModalClass: z.boolean().default(true),
  showFormulaCallouts: z.boolean().default(true),
  showSolverCard: z.boolean().default(false),
});
export type SmartTableStatConfig = z.infer<typeof SmartTableStatConfigSchema>;

export const SmartTablePropsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  cx: z.number(),
  cy: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  rotation: z.number().default(0),
  presetMode: TablePresetModeSchema.default("custom"),
  title: z.string().optional(),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  colWidthsPx: z.array(z.number().positive()),
  cells: z.array(z.array(TableCellSchema)),
  headerRowCount: z.number().int().min(0).default(1),
  zebraStriping: z.boolean().default(true),
  borderStyle: z.enum(["classic", "textbook", "minimal", "blackboard"]).default("textbook"),
  statConfig: SmartTableStatConfigSchema.optional(),
  functionExpr: z.string().optional(),
  truthVars: z.array(z.string()).optional(),
  truthExpr: z.string().optional(),
});
export type SmartTableProps = z.infer<typeof SmartTablePropsSchema>;

export const SubjectHelperKindSchema = z.enum([
  "horner_scheme",
  "matrix_grid",
  "factor_tree",
  "number_line",
  "venn_diagram",
  "sample_space_tree",
  "unit_stairs",
]);
export type SubjectHelperKind = z.infer<typeof SubjectHelperKindSchema>;

export const SubjectHelperPropsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  cx: z.number(),
  cy: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  rotation: z.number().default(0),
  helperKind: SubjectHelperKindSchema,
  title: z.string().optional(),
  config: z.record(z.unknown()).default({}),
});
export type SubjectHelperProps = z.infer<typeof SubjectHelperPropsSchema>;

function cell(raw: string, extra?: Partial<TableCell>): TableCell {
  return { raw, ...extra };
}

export function createDefaultSmartTableProps(
  presetMode: TablePresetMode = "custom",
  opts?: { x?: number; y?: number; rows?: number; cols?: number; title?: string },
): SmartTableProps {
  const x = opts?.x ?? 180;
  const y = opts?.y ?? 100;

  if (presetMode === "stat_grouped") {
    const cells: TableCell[][] = [
      [cell("Nilai (Interval)", { bold: true, align: "center" }), cell("Frekuensi (f)", { bold: true, align: "center" })],
      [cell("31 - 40", { align: "center" }), cell("3", { align: "center" })],
      [cell("41 - 50", { align: "center" }), cell("5", { align: "center" })],
      [cell("51 - 60", { align: "center" }), cell("10", { align: "center" })],
      [cell("61 - 70", { align: "center" }), cell("11", { align: "center" })],
      [cell("71 - 80", { align: "center" }), cell("8", { align: "center" })],
      [cell("81 - 90", { align: "center" }), cell("3", { align: "center" })],
    ];
    const width = 560;
    const height = 390;
    return {
      x,
      y,
      cx: x + width / 2,
      cy: y + height / 2,
      width,
      height,
      w: width,
      h: height,
      rotation: 0,
      presetMode,
      title: opts?.title ?? "Tabel Distribusi Frekuensi (Data Kelompok)",
      rows: cells.length,
      cols: 2,
      colWidthsPx: [145, 105],
      cells,
      headerRowCount: 1,
      zebraStriping: true,
      borderStyle: "textbook",
      statConfig: {
        showMidpointCol: true,
        showFxCol: true,
        showCumFreqCol: true,
        showTotalRow: true,
        highlightMedianClass: true,
        highlightModalClass: true,
        showFormulaCallouts: true,
        showSolverCard: true,
      },
    };
  }

  if (presetMode === "stat_ungrouped") {
    const cells: TableCell[][] = [
      [cell("Nilai (x_i)", { bold: true, align: "center" }), cell("Frekuensi (f_i)", { bold: true, align: "center" })],
      [cell("5", { align: "center" }), cell("2", { align: "center" })],
      [cell("6", { align: "center" }), cell("4", { align: "center" })],
      [cell("7", { align: "center" }), cell("6", { align: "center" })],
      [cell("8", { align: "center" }), cell("5", { align: "center" })],
      [cell("9", { align: "center" }), cell("3", { align: "center" })],
    ];
    const width = 480;
    const height = 350;
    return {
      x,
      y,
      cx: x + width / 2,
      cy: y + height / 2,
      width,
      height,
      w: width,
      h: height,
      rotation: 0,
      presetMode,
      title: opts?.title ?? "Tabel Statistika Data Tunggal Berbobot",
      rows: cells.length,
      cols: 2,
      colWidthsPx: [120, 110],
      cells,
      headerRowCount: 1,
      zebraStriping: true,
      borderStyle: "textbook",
      statConfig: {
        showMidpointCol: false,
        showFxCol: true,
        showCumFreqCol: true,
        showTotalRow: true,
        highlightMedianClass: true,
        highlightModalClass: true,
        showFormulaCallouts: true,
        showSolverCard: true,
      },
    };
  }

  if (presetMode === "function_values") {
    const cells: TableCell[][] = [
      [cell("x", { bold: true, align: "center" }), cell("f(x) = x^2 - 4*x + 3", { bold: true, align: "center" }), cell("(x, y)", { bold: true, align: "center" })],
      [cell("-1", { align: "center" }), cell("8", { align: "center" }), cell("(-1, 8)", { align: "center" })],
      [cell("0", { align: "center" }), cell("3", { align: "center" }), cell("(0, 3)", { align: "center" })],
      [cell("1", { align: "center" }), cell("0", { align: "center" }), cell("(1, 0)", { align: "center" })],
      [cell("2", { align: "center" }), cell("-1", { align: "center" }), cell("(2, -1)", { align: "center" })],
      [cell("3", { align: "center" }), cell("0", { align: "center" }), cell("(3, 0)", { align: "center" })],
      [cell("4", { align: "center" }), cell("3", { align: "center" }), cell("(4, 3)", { align: "center" })],
    ];
    const width = 440;
    const height = 340;
    return {
      x,
      y,
      cx: x + width / 2,
      cy: y + height / 2,
      width,
      height,
      w: width,
      h: height,
      rotation: 0,
      presetMode,
      title: opts?.title ?? "Tabel Nilai Fungsi",
      rows: cells.length,
      cols: 3,
      colWidthsPx: [90, 180, 120],
      cells,
      headerRowCount: 1,
      zebraStriping: true,
      borderStyle: "textbook",
      functionExpr: "x^2 - 4*x + 3",
    };
  }

  if (presetMode === "truth_table") {
    const cells: TableCell[][] = [
      [cell("p", { bold: true, align: "center" }), cell("q", { bold: true, align: "center" }), cell("p && q", { bold: true, align: "center" }), cell("p -> q", { bold: true, align: "center" })],
      [cell("B", { align: "center" }), cell("B", { align: "center" }), cell("B", { align: "center" }), cell("B", { align: "center" })],
      [cell("B", { align: "center" }), cell("S", { align: "center" }), cell("S", { align: "center" }), cell("S", { align: "center" })],
      [cell("S", { align: "center" }), cell("B", { align: "center" }), cell("S", { align: "center" }), cell("B", { align: "center" })],
      [cell("S", { align: "center" }), cell("S", { align: "center" }), cell("S", { align: "center" }), cell("B", { align: "center" })],
    ];
    const width = 440;
    const height = 290;
    return {
      x,
      y,
      cx: x + width / 2,
      cy: y + height / 2,
      width,
      height,
      w: width,
      h: height,
      rotation: 0,
      presetMode,
      title: opts?.title ?? "Tabel Kebenaran Logika",
      rows: cells.length,
      cols: 4,
      colWidthsPx: [75, 75, 115, 115],
      cells,
      headerRowCount: 1,
      zebraStriping: true,
      borderStyle: "classic",
      truthVars: ["p", "q"],
      truthExpr: "p -> q",
    };
  }

  if (presetMode === "trig_special_angles") {
    const cells: TableCell[][] = [
      [cell("Sudut (θ)", { bold: true, align: "center" }), cell("0°", { bold: true, align: "center" }), cell("30°", { bold: true, align: "center" }), cell("45°", { bold: true, align: "center" }), cell("60°", { bold: true, align: "center" }), cell("90°", { bold: true, align: "center" })],
      [cell("sin θ", { bold: true, align: "center" }), cell("0", { align: "center" }), cell("1/2", { align: "center" }), cell("1/2 √2", { align: "center" }), cell("1/2 √3", { align: "center" }), cell("1", { align: "center" })],
      [cell("cos θ", { bold: true, align: "center" }), cell("1", { align: "center" }), cell("1/2 √3", { align: "center" }), cell("1/2 √2", { align: "center" }), cell("1/2", { align: "center" }), cell("0", { align: "center" })],
      [cell("tan θ", { bold: true, align: "center" }), cell("0", { align: "center" }), cell("1/3 √3", { align: "center" }), cell("1", { align: "center" }), cell("√3", { align: "center" }), cell("∞", { align: "center" })],
    ];
    const width = 540;
    const height = 250;
    return {
      x,
      y,
      cx: x + width / 2,
      cy: y + height / 2,
      width,
      height,
      w: width,
      h: height,
      rotation: 0,
      presetMode,
      title: opts?.title ?? "Tabel Sudut Istimewa Trigonometri",
      rows: cells.length,
      cols: 6,
      colWidthsPx: [95, 75, 85, 95, 95, 75],
      cells,
      headerRowCount: 1,
      zebraStriping: true,
      borderStyle: "textbook",
    };
  }

  if (presetMode === "chem_mrs") {
    const cells: TableCell[][] = [
      [cell("Tahap", { bold: true, align: "center" }), cell("N₂ (g)", { bold: true, align: "center" }), cell("3 H₂ (g)", { bold: true, align: "center" }), cell("⇌ 2 NH₃ (g)", { bold: true, align: "center" })],
      [cell("Mula-mula (M)", { bold: true }), cell("2 mol", { align: "center" }), cell("6 mol", { align: "center" }), cell("-", { align: "center" })],
      [cell("Reaksi (R)", { bold: true }), cell("-1 mol", { align: "center", textColor: "#dc2626" }), cell("-3 mol", { align: "center", textColor: "#dc2626" }), cell("+2 mol", { align: "center", textColor: "#16a34a" })],
      [cell("Setimbang (S)", { bold: true }), cell("1 mol", { align: "center", bold: true }), cell("3 mol", { align: "center", bold: true }), cell("2 mol", { align: "center", bold: true })],
    ];
    const width = 500;
    const height = 260;
    return {
      x,
      y,
      cx: x + width / 2,
      cy: y + height / 2,
      width,
      height,
      w: width,
      h: height,
      rotation: 0,
      presetMode,
      title: opts?.title ?? "Tabel Stoikiometri MRS (Kimia)",
      rows: cells.length,
      cols: 4,
      colWidthsPx: [130, 110, 110, 120],
      cells,
      headerRowCount: 1,
      zebraStriping: true,
      borderStyle: "classic",
    };
  }

  // Default custom R x C table (Canva-style clean & freeform)
  const rows = Math.max(1, Math.min(20, opts?.rows ?? 4));
  const cols = Math.max(1, Math.min(12, opts?.cols ?? 4));
  const cells: TableCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () =>
      cell("", {
        align: "center",
      }),
    ),
  );
  const colWidthsPx = Array.from({ length: cols }, () => 84);
  const width = Math.max(220, cols * 84 + 16);
  const height = Math.max(140, rows * 36 + 32);
  return {
    x,
    y,
    cx: x + width / 2,
    cy: y + height / 2,
    width,
    height,
    w: width,
    h: height,
    rotation: 0,
    presetMode,
    title: opts?.title ?? `Table (${rows}×${cols})`,
    rows,
    cols,
    colWidthsPx,
    cells,
    headerRowCount: 0,
    zebraStriping: false,
    borderStyle: "classic",
  };
}

export function createDefaultSubjectHelperProps(
  helperKind: SubjectHelperKind,
  opts?: { x?: number; y?: number; title?: string; config?: Record<string, unknown> },
): SubjectHelperProps {
  const x = opts?.x ?? 200;
  const y = opts?.y ?? 110;
  const defaults: Record<SubjectHelperKind, { title: string; width: number; height: number; config: Record<string, unknown> }> = {
    horner_scheme: {
      title: "Skema Horner (Pembagian Polinomial)",
      width: 470,
      height: 300,
      config: { k: 2, coeffs: [1, -3, 2, -5] },
    },
    matrix_grid: {
      title: "Grid Matriks Interaktif (Determinan & Invers)",
      width: 460,
      height: 330,
      config: {
        rows: 2,
        cols: 2,
        values: [
          [4, 2],
          [1, 3],
        ],
      },
    },
    factor_tree: {
      title: "Pohon Faktor & Tabel Sengkedan (FPB / KPK)",
      width: 460,
      height: 340,
      config: { numbers: [24, 36], viewMode: "tree" },
    },
    number_line: {
      title: "Garis Bilangan & Interval Pertidaksamaan",
      width: 500,
      height: 250,
      config: { min: -5, max: 7, lower: -2, upper: 4, lowerInclusive: true, upperInclusive: false, mode: "interval" },
    },
    venn_diagram: {
      title: "Diagram Venn Interaktif (Himpunan)",
      width: 440,
      height: 330,
      config: { sets: 2, labelA: "A", labelB: "B", labelC: "C", counts: { onlyA: 8, onlyB: 6, ab: 4, outside: 2 }, shaded: ["ab"] },
    },
    sample_space_tree: {
      title: "Ruang Sampel, Pohon Peluang & Segitiga Pascal",
      width: 470,
      height: 360,
      config: { tab: "dice", targetSum: 7, pascalRows: 6 },
    },
    unit_stairs: {
      title: "Tangga Konversi Satuan (km → mm)",
      width: 470,
      height: 340,
      config: { category: "length", fromUnit: "km", toUnit: "m", value: 2.5 },
    },
  };
  const d = defaults[helperKind];
  return {
    x,
    y,
    cx: x + d.width / 2,
    cy: y + d.height / 2,
    width: d.width,
    height: d.height,
    w: d.width,
    h: d.height,
    rotation: 0,
    helperKind,
    title: opts?.title ?? d.title,
    config: { ...d.config, ...(opts?.config ?? {}) },
  };
}
