/**
 * inequalityTypes.ts — V10 Canonical schemas & preset builders for
 * Selection-to-Visual Analyzer (SPtLDV, SPLDV, Program Linear & Pertidaksamaan Kuadrat).
 */
import { z } from "zod";

export const InequalityShadeModeSchema = z.enum(["clean_dp", "shaded_dp"]);
export type InequalityShadeMode = z.infer<typeof InequalityShadeModeSchema>;

export const InequalityGraphPropsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  cx: z.number(),
  cy: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  rotation: z.number().default(0),
  title: z.string().optional(),
  /** Raw multi-line text / LaTeX expressions defining the system (one per line) */
  rawExpressions: z.string().default("x + 2y <= 10\nx + y <= 7\nx >= 0\ny >= 0"),
  /** Optional linear objective function, e.g. "Z = 3x + 4y" */
  objectiveExpr: z.string().optional(),
  /** "clean_dp" = DP adalah daerah yang bersih (textbook default), "shaded_dp" = DP diarsir */
  shadeMode: InequalityShadeModeSchema.default("clean_dp"),
  showInterceptTable: z.boolean().default(true),
  showCornerPoints: z.boolean().default(true),
  /** -1 = show all constraints, 0..k = step-by-step teaching reveal */
  visibleStepCount: z.number().int().default(-1),
  /** Optional student table points extracted from selection for automatic consistency checking */
  studentTablePoints: z.array(z.tuple([z.number(), z.number()])).optional(),
  /** Optional detected source kind */
  analysisKind: z.enum(["sptldv", "spldv", "quadratic_ineq"]).default("sptldv"),
});
export type InequalityGraphProps = z.infer<typeof InequalityGraphPropsSchema>;

export function createDefaultInequalityGraphProps(
  opts?: Partial<InequalityGraphProps>,
): InequalityGraphProps {
  const x = opts?.x ?? 160;
  const y = opts?.y ?? 90;
  const width = opts?.width ?? 560;
  const height = opts?.height ?? 440;

  return {
    x,
    y,
    cx: opts?.cx ?? x + width / 2,
    cy: opts?.cy ?? y + height / 2,
    width,
    height,
    w: opts?.w ?? width,
    h: opts?.h ?? height,
    rotation: opts?.rotation ?? 0,
    title: opts?.title ?? "Grafik Daerah Penyelesaian (SPtLDV)",
    rawExpressions:
      opts?.rawExpressions ?? "x + 2y <= 10\nx + y <= 7\nx >= 0\ny >= 0",
    objectiveExpr: opts?.objectiveExpr,
    shadeMode: opts?.shadeMode ?? "clean_dp",
    showInterceptTable: opts?.showInterceptTable ?? true,
    showCornerPoints: opts?.showCornerPoints ?? true,
    visibleStepCount: opts?.visibleStepCount ?? -1,
    studentTablePoints: opts?.studentTablePoints,
    analysisKind: opts?.analysisKind ?? "sptldv",
  };
}
