import { describe, it, expect } from "vitest";
import { synthesizeVisualFromFormula } from "./diagramSynthesizer.js";
import { buildTrigProofDiagram } from "./trigIdentities.js";

describe("V5 Formula-to-Diagram / Chart / Graph Synthesizer", () => {
  it("synthesizes y = sin(x) on [0, 2π] with exact π-ticks, maks at (π/2, 1), and min at (3π/2, -1) (< 1e-6 error)", () => {
    const spec = synthesizeVisualFromFormula("y = sin(x), 0 <= x <= 2\\pi");
    expect(spec).not.toBeNull();
    expect(spec?.kind).toBe("textbook_function_graph");
    if (spec?.kind !== "textbook_function_graph") return;

    expect(spec.xAxisMode).toBe("pi_fraction");
    expect(spec.xTicks.map((t) => t.label)).toEqual(["0", "π/2", "π", "3π/2", "2π"]);

    const fn = spec.expressions[0];
    const maks = fn.extrema.find((e) => e.kind === "maks");
    const min = fn.extrema.find((e) => e.kind === "min");
    expect(maks).toBeDefined();
    expect(min).toBeDefined();
    expect(Math.abs(maks!.x - Math.PI / 2)).toBeLessThan(1e-6);
    expect(Math.abs(maks!.y - 1)).toBeLessThan(1e-6);
    expect(maks!.xLabel).toBe("π/2");
    expect(Math.abs(min!.x - (3 * Math.PI) / 2)).toBeLessThan(1e-6);
    expect(Math.abs(min!.y - -1)).toBeLessThan(1e-6);
    expect(min!.xLabel).toBe("3π/2");
  });

  it("splits polylines and detects vertical asymptotes for y = tan(x) without drawing vertical jump lines", () => {
    const spec = synthesizeVisualFromFormula("y = tan(x), 0 <= x <= 2\\pi");
    expect(spec?.kind).toBe("textbook_function_graph");
    if (spec?.kind !== "textbook_function_graph") return;

    const fn = spec.expressions[0];
    expect(fn.polylines.length).toBeGreaterThanOrEqual(3);
    expect(fn.asymptotesX.length).toBeGreaterThanOrEqual(2);
    // Ensure no single polyline segment jumps across a vertical asymptote
    for (const pl of fn.polylines) {
      for (let i = 1; i < pl.points.length; i++) {
        const dy = Math.abs(pl.points[i][1] - pl.points[i - 1][1]);
        expect(dy).toBeLessThan(100);
      }
    }
  });

  it("classifies cos(2θ) = 2cos²(θ) - 1 into double_angle proof diagram A-B-D-E-F with θ/2θ arcs and 90° markers", () => {
    const spec = synthesizeVisualFromFormula("cos(2θ) = 2cos^2(θ) - 1");
    expect(spec?.kind).toBe("trig_identity_proof");
    if (spec?.kind !== "trig_identity_proof") return;
    expect(spec.identityId).toBe("double_angle");

    const diagram = buildTrigProofDiagram("double_angle", 28);
    expect(diagram.points.map((p) => p.id)).toEqual(["A", "B", "D", "E", "F", "H"]);
    expect(diagram.arcs.map((a) => a.label)).toEqual(["θ", "θ", "2θ"]);
    expect(diagram.rightAngles.length).toBe(3);
  });

  it("parses statistical key=value and array inputs into stat_chart spec", () => {
    const kv = synthesizeVisualFromFormula("Senin=12, Selasa=19, Rabu=15");
    expect(kv?.kind).toBe("stat_chart");
    if (kv?.kind === "stat_chart") {
      expect(kv.labels).toEqual(["Senin", "Selasa", "Rabu"]);
      expect(kv.series[0].values).toEqual([12, 19, 15]);
    }

    const arr = synthesizeVisualFromFormula("[10, 25, 18, 30]");
    expect(arr?.kind).toBe("stat_chart");
    if (arr?.kind === "stat_chart") {
      expect(arr.series[0].values).toEqual([10, 25, 18, 30]);
    }
  });
});
