import { describe, expect, it } from "vitest";
import { analyzeForManimGX } from "./manimgxRouter.js";

describe("manimgxRouter", () => {
  it("routes 3D surface equations to surface_3d", () => {
    const res = analyzeForManimGX({ latex: "z = \\sin(x) \\cdot \\cos(y)" });
    expect(res.eligible).toBe(true);
    expect(res.templateKind).toBe("surface_3d");
    expect(res.scene.pythonCode).toContain("ThreeDScene");
  });

  it("routes matrix expressions to linear_transform", () => {
    const res = analyzeForManimGX({ latex: "\\begin{bmatrix} 2 & 1 \\\\ 0 & 1 \\end{bmatrix}" });
    expect(res.eligible).toBe(true);
    expect(res.templateKind).toBe("linear_transform");
    expect(res.scene.pythonCode).toContain("apply_matrix");
  });

  it("routes solid geometry terms to solid_3d", () => {
    const res = analyzeForManimGX({ text: "kubus dengan rusuk 4 cm" });
    expect(res.eligible).toBe(true);
    expect(res.templateKind).toBe("solid_3d");
  });

  it("routes Cartesian circle equations (x - 2)^2 + (y - 1)^2 = 9 to circle_cartesian", () => {
    const res = analyzeForManimGX({ latex: "(x - 2)^2 + (y - 1)^2 = 9" });
    expect(res.eligible).toBe(true);
    expect(res.templateKind).toBe("circle_cartesian");
    expect(res.scene.params.a).toBe(2);
    expect(res.scene.params.b).toBe(1);
    expect(res.scene.params.r).toBe(3);
  });

  it("routes trig/calculus expressions to function_calculus", () => {
    const res = analyzeForManimGX({ latex: "y = \\sin(x)" });
    expect(res.eligible).toBe(true);
    expect(res.templateKind).toBe("function_calculus");
  });

  it("marks empty input as ineligible", () => {
    const res = analyzeForManimGX({ latex: "" });
    expect(res.eligible).toBe(false);
  });
});
