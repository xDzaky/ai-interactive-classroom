/**
 * integerOpsTypes.ts — V10 Canonical schemas & preset builders for
 * Interactive Integer Operations & Number Line Studio (Whiteboard + Notes).
 */
import { z } from "zod";

export const IntegerOpsModeSchema = z.enum([
  "concept_map",
  "operations",
  "integer_chips",
]);
export type IntegerOpsMode = z.infer<typeof IntegerOpsModeSchema>;

export const IntegerHopStyleSchema = z.enum(["unit_arcs", "single_jump"]);
export type IntegerHopStyle = z.infer<typeof IntegerHopStyleSchema>;

export const IntegerOperationStepSchema = z.object({
  from: z.number(),
  delta: z.number(),
  to: z.number(),
  label: z.string().optional(),
  rawOperator: z.string().optional(),
});
export type IntegerOperationStep = z.infer<typeof IntegerOperationStepSchema>;

export const IntegerOpsWidgetPropsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  cx: z.number(),
  cy: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  rotation: z.number().default(0),
  mode: IntegerOpsModeSchema.default("operations"),
  title: z.string().optional(),
  expression: z.string().default("-1 + 3"),
  minTick: z.number().int().default(-7),
  maxTick: z.number().int().default(7),
  hopStyle: IntegerHopStyleSchema.default("unit_arcs"),
  showRuleBanner: z.boolean().default(true),
  showResultCircle: z.boolean().default(true),
  showSetNotation: z.boolean().default(true),
  hideResultQuiz: z.boolean().default(false),
  animateStepIndex: z.number().int().default(-1),
});
export type IntegerOpsWidgetProps = z.infer<typeof IntegerOpsWidgetPropsSchema>;

export function createDefaultIntegerOpsProps(
  mode: IntegerOpsMode = "operations",
  opts?: { x?: number; y?: number; expression?: string; minTick?: number; maxTick?: number; title?: string },
): IntegerOpsWidgetProps {
  const x = opts?.x ?? 140;
  const y = opts?.y ?? 100;
  const isConcept = mode === "concept_map";
  const width = isConcept ? 620 : 600;
  const height = isConcept ? 280 : 320;
  const expression = opts?.expression ?? (isConcept ? "0" : "-1 + 3");
  const minTick = opts?.minTick ?? (isConcept ? -7 : -6);
  const maxTick = opts?.maxTick ?? (isConcept ? 7 : 6);

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
    mode,
    title:
      opts?.title ??
      (isConcept
        ? "Peta Konsep Bilangan Bulat"
        : mode === "integer_chips"
          ? "Keping Muatan Bilangan Bulat (+ / −)"
          : "Operasi Hitung Bilangan Bulat"),
    expression,
    minTick,
    maxTick,
    hopStyle: "unit_arcs",
    showRuleBanner: true,
    showResultCircle: true,
    showSetNotation: true,
    hideResultQuiz: false,
    animateStepIndex: -1,
  };
}
