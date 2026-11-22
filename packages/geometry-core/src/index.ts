/**
 * @ai-classroom/geometry-core
 * Deterministic geometry formulas for 3D solids.
 * All functions are pure + fully tested. No LLM involvement in calculations.
 * See CONTRACTS.md § viz.solid types.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Solid types
// ---------------------------------------------------------------------------

export type SolidType =
  | "cube"
  | "cuboid"
  | "sphere"
  | "cylinder"
  | "cone"
  | "pyramid"       // square base pyramid
  | "prism"         // triangular prism
  | "torus";

// ---------------------------------------------------------------------------
// Parameter interfaces per solid
// ---------------------------------------------------------------------------

export interface CubeParams     { type: "cube";     s: number }
export interface CuboidParams   { type: "cuboid";   l: number; w: number; h: number }
export interface SphereParams   { type: "sphere";   r: number }
export interface CylinderParams { type: "cylinder"; r: number; h: number }
export interface ConeParams     { type: "cone";     r: number; h: number }
export interface PyramidParams  { type: "pyramid";  b: number; h: number }  // square base side b
export interface PrismParams    { type: "prism";    a: number; b: number; c: number; h: number } // triangle sides, height
export interface TorusParams    { type: "torus";    R: number; r: number }   // major/minor radius

export type SolidParams =
  | CubeParams
  | CuboidParams
  | SphereParams
  | CylinderParams
  | ConeParams
  | PyramidParams
  | PrismParams
  | TorusParams;

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface GeometryResult {
  volume: number;
  surface_area: number;
  /** LaTeX formula string for volume */
  formula_volume: string;
  /** LaTeX formula string for surface area */
  formula_surface_area: string;
  /** Human-readable label substituted with param values */
  label_volume: string;
  label_surface_area: string;
}

// ---------------------------------------------------------------------------
// Helper: round to avoid floating-point noise in display
// ---------------------------------------------------------------------------

function r(n: number, dp = 6): number {
  return parseFloat(n.toFixed(dp));
}

// ---------------------------------------------------------------------------
// Solid implementations
// ---------------------------------------------------------------------------

function cube(p: CubeParams): GeometryResult {
  const { s } = p;
  return {
    volume: r(s ** 3),
    surface_area: r(6 * s ** 2),
    formula_volume: "V = s^3",
    formula_surface_area: "SA = 6s^2",
    label_volume: `V = ${s}³ = ${r(s ** 3)}`,
    label_surface_area: `SA = 6 × ${s}² = ${r(6 * s ** 2)}`,
  };
}

function cuboid(p: CuboidParams): GeometryResult {
  const { l, w, h } = p;
  return {
    volume: r(l * w * h),
    surface_area: r(2 * (l * w + l * h + w * h)),
    formula_volume: "V = l \\times w \\times h",
    formula_surface_area: "SA = 2(lw + lh + wh)",
    label_volume: `V = ${l} × ${w} × ${h} = ${r(l * w * h)}`,
    label_surface_area: `SA = 2(${l}×${w} + ${l}×${h} + ${w}×${h}) = ${r(2 * (l * w + l * h + w * h))}`,
  };
}

function sphere(p: SphereParams): GeometryResult {
  const { r: radius } = p;
  return {
    volume: r((4 / 3) * PI * radius ** 3),
    surface_area: r(4 * PI * radius ** 2),
    formula_volume: "V = \\frac{4}{3}\\pi r^3",
    formula_surface_area: "SA = 4\\pi r^2",
    label_volume: `V = (4/3)π × ${radius}³ = ${r((4 / 3) * PI * radius ** 3)}`,
    label_surface_area: `SA = 4π × ${radius}² = ${r(4 * PI * radius ** 2)}`,
  };
}

function cylinder(p: CylinderParams): GeometryResult {
  const { r: radius, h } = p;
  return {
    volume: r(PI * radius ** 2 * h),
    surface_area: r(2 * PI * radius * (radius + h)),
    formula_volume: "V = \\pi r^2 h",
    formula_surface_area: "SA = 2\\pi r(r + h)",
    label_volume: `V = π × ${radius}² × ${h} = ${r(PI * radius ** 2 * h)}`,
    label_surface_area: `SA = 2π × ${radius} × (${radius} + ${h}) = ${r(2 * PI * radius * (radius + h))}`,
  };
}

function cone(p: ConeParams): GeometryResult {
  const { r: radius, h } = p;
  const slant = Math.sqrt(radius ** 2 + h ** 2);
  return {
    volume: r((1 / 3) * PI * radius ** 2 * h),
    surface_area: r(PI * radius * (radius + slant)),
    formula_volume: "V = \\frac{1}{3}\\pi r^2 h",
    formula_surface_area: "SA = \\pi r(r + l), \\; l = \\sqrt{r^2+h^2}",
    label_volume: `V = (1/3)π × ${radius}² × ${h} = ${r((1 / 3) * PI * radius ** 2 * h)}`,
    label_surface_area: `SA = π × ${radius} × (${radius} + ${r(slant)}) = ${r(PI * radius * (radius + slant))}`,
  };
}

function pyramid(p: PyramidParams): GeometryResult {
  const { b, h } = p;
  // Square-base pyramid
  const slant = Math.sqrt((b / 2) ** 2 + h ** 2);
  return {
    volume: r((1 / 3) * b ** 2 * h),
    surface_area: r(b ** 2 + 2 * b * slant),
    formula_volume: "V = \\frac{1}{3}b^2 h",
    formula_surface_area: "SA = b^2 + 2bl, \\; l = \\sqrt{(b/2)^2+h^2}",
    label_volume: `V = (1/3) × ${b}² × ${h} = ${r((1 / 3) * b ** 2 * h)}`,
    label_surface_area: `SA = ${b}² + 2 × ${b} × ${r(slant)} = ${r(b ** 2 + 2 * b * slant)}`,
  };
}

function prism(p: PrismParams): GeometryResult {
  // Triangular prism with sides a, b, c and height h
  // Triangle area via Heron's formula
  const { a, b, c, h } = p;
  const s = (a + b + c) / 2;
  const triangleArea = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const vol = triangleArea * h;
  const sa = 2 * triangleArea + (a + b + c) * h;
  return {
    volume: r(vol),
    surface_area: r(sa),
    formula_volume: "V = A_{\\triangle} \\times h",
    formula_surface_area: "SA = 2A_{\\triangle} + (a+b+c)h",
    label_volume: `V = ${r(triangleArea)} × ${h} = ${r(vol)}`,
    label_surface_area: `SA = 2 × ${r(triangleArea)} + (${a}+${b}+${c}) × ${h} = ${r(sa)}`,
  };
}

function torus(p: TorusParams): GeometryResult {
  const { R, r: radius } = p;
  return {
    volume: r(2 * PI ** 2 * R * radius ** 2),
    surface_area: r(4 * PI ** 2 * R * radius),
    formula_volume: "V = 2\\pi^2 R r^2",
    formula_surface_area: "SA = 4\\pi^2 R r",
    label_volume: `V = 2π² × ${R} × ${radius}² = ${r(2 * PI ** 2 * R * radius ** 2)}`,
    label_surface_area: `SA = 4π² × ${R} × ${radius} = ${r(4 * PI ** 2 * R * radius)}`,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export class GeometryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeometryError";
  }
}

function requirePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new GeometryError(`${name} must be a positive finite number, got ${value}`);
  }
}

function validateParams(params: SolidParams): void {
  switch (params.type) {
    case "cube":     requirePositive(params.s, "s"); break;
    case "cuboid":   requirePositive(params.l, "l"); requirePositive(params.w, "w"); requirePositive(params.h, "h"); break;
    case "sphere":   requirePositive(params.r, "r"); break;
    case "cylinder": requirePositive(params.r, "r"); requirePositive(params.h, "h"); break;
    case "cone":     requirePositive(params.r, "r"); requirePositive(params.h, "h"); break;
    case "pyramid":  requirePositive(params.b, "b"); requirePositive(params.h, "h"); break;
    case "prism":
      requirePositive(params.a, "a"); requirePositive(params.b, "b");
      requirePositive(params.c, "c"); requirePositive(params.h, "h");
      // Triangle inequality
      if (params.a + params.b <= params.c || params.a + params.c <= params.b || params.b + params.c <= params.a) {
        throw new GeometryError("Triangle sides violate triangle inequality");
      }
      break;
    case "torus":    requirePositive(params.R, "R"); requirePositive(params.r, "r"); break;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function computeGeometry(params: SolidParams): GeometryResult {
  validateParams(params);
  switch (params.type) {
    case "cube":     return cube(params);
    case "cuboid":   return cuboid(params);
    case "sphere":   return sphere(params);
    case "cylinder": return cylinder(params);
    case "cone":     return cone(params);
    case "pyramid":  return pyramid(params);
    case "prism":    return prism(params);
    case "torus":    return torus(params);
  }
}

// ---------------------------------------------------------------------------
// Shared test fixtures (also used by Python ai-service contract tests)
// ---------------------------------------------------------------------------

export interface GeometryFixture {
  params: SolidParams;
  expected: { volume: number; surface_area: number };
  tolerance: number;
}

export const GEOMETRY_FIXTURES: GeometryFixture[] = [
  {
    params: { type: "cube", s: 3 },
    expected: { volume: 27, surface_area: 54 },
    tolerance: 1e-4,
  },
  {
    params: { type: "cuboid", l: 4, w: 3, h: 2 },
    expected: { volume: 24, surface_area: 52 },
    tolerance: 1e-4,
  },
  {
    params: { type: "sphere", r: 5 },
    expected: { volume: (4 / 3) * PI * 125, surface_area: 4 * PI * 25 },
    tolerance: 1e-3,
  },
  {
    params: { type: "cylinder", r: 3, h: 7 },
    expected: { volume: PI * 9 * 7, surface_area: 2 * PI * 3 * (3 + 7) },
    tolerance: 1e-3,
  },
  {
    params: { type: "cone", r: 4, h: 3 },
    expected: { volume: (1 / 3) * PI * 16 * 3, surface_area: PI * 4 * (4 + 5) },
    tolerance: 1e-3,
  },
  {
    params: { type: "pyramid", b: 6, h: 4 },
    expected: { volume: (1 / 3) * 36 * 4, surface_area: 36 + 2 * 6 * Math.sqrt(9 + 16) },
    tolerance: 1e-3,
  },
  {
    params: { type: "prism", a: 3, b: 4, c: 5, h: 10 },
    // 3-4-5 right triangle, area=6
    expected: { volume: 6 * 10, surface_area: 2 * 6 + (3 + 4 + 5) * 10 },
    tolerance: 1e-3,
  },
  {
    params: { type: "torus", R: 5, r: 2 },
    expected: { volume: 2 * PI ** 2 * 5 * 4, surface_area: 4 * PI ** 2 * 5 * 2 },
    tolerance: 1e-3,
  },
];

// ---------------------------------------------------------------------------
// Polyhedron models (P11-T02)
// ---------------------------------------------------------------------------
export * from "./polyhedron.js";

// ---------------------------------------------------------------------------
// 3D Plane math & Polyhedron Cross-Sections (P11-T03)
// ---------------------------------------------------------------------------
export * from "./section.js";

// ---------------------------------------------------------------------------
// 3D Geometric Measurement & Diagonal Shortcuts (P11-T06)
// ---------------------------------------------------------------------------
export * from "./measure.js";

// ---------------------------------------------------------------------------
// Polyhedron & Curved Solid Unfolding (P11-T09)
// ---------------------------------------------------------------------------
export * from "./unfold.js";

