import { describe, it, expect } from "vitest";
import { analyzeForManimGX } from "./manimgxRouter.js";

describe("V6 ManimGX Intent Router & Deterministic Scene Templates", () => {
  it("routes z = sin(x)cos(y) to ThreeDScene Surface template", () => {
    const res = analyzeForManimGX({ latex: "z = \\sin(x)\\cos(y)" });
    expect(res.eligible).toBe(true);
    expect(res.templateKind).toBe("surface_3d");
    expect(res.scene.pythonCode).toContain("m.ThreeDScene");
    expect(res.scene.pythonCode).toContain("m.Surface");
  });

  it("routes 3D solid descriptions to SolidGeometryScene with recommendedSolidType", () => {
    const res = analyzeForManimGX({ text: "Kubus rusuk 5 cm" });
    expect(res.templateKind).toBe("solid_3d");
    expect(res.recommendedSolidType).toBe("cube");
    expect(res.scene.pythonCode).toContain("m.Cube");
  });

  it("routes matrix notation to LinearTransformScene", () => {
    const res = analyzeForManimGX({ latex: "\\begin{bmatrix} 2 & 1 \\\\ 0 & 1 \\end{bmatrix}" });
    expect(res.templateKind).toBe("linear_transform");
    expect(res.scene.pythonCode).toContain("apply_matrix([[2, 1], [0, 1]])");
  });

  it("routes stat data to AnimatedChartScene", () => {
    const res = analyzeForManimGX({ text: "A: 30, B: 45, C: 25" });
    expect(res.templateKind).toBe("stat_chart");
    expect(res.scene.pythonCode).toContain("m.BarChart");
  });

  it("routes y = sin(x) and integrals to FunctionCalculusScene", () => {
    const res = analyzeForManimGX({ latex: "\\int_0^2 x^2 dx" });
    expect(res.templateKind).toBe("function_calculus");
    expect(res.scene.params.showRiemann).toBe(true);
  });
});
