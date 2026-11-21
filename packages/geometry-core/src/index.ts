/**
 * @ai-classroom/geometry-core
 * Deterministic geometry formulas for 3D solids. All functions are pure + tested.
 * No LLM involvement in calculations.
 */

export type SolidType =
  | "cube"
  | "cuboid"
  | "sphere"
  | "cylinder"
  | "cone"
  | "pyramid"
  | "prism"
  | "torus";

export interface SolidParams {
  type: SolidType;
  [key: string]: unknown;
}

/** Surface area and volume result with formula label */
export interface GeometryResult {
  volume: number;
  surface_area: number;
  formula_volume: string;
  formula_surface_area: string;
}

// Placeholder — real implementations in P03-T01
export function computeGeometry(_params: SolidParams): GeometryResult {
  throw new Error("Not implemented — see P03-T01");
}
