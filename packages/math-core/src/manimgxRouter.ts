/**
 * manimgxRouter.ts — Math-to-ManimGX Intent & Eligibility Analyzer (V6)
 *
 * Classifies selected LaTeX or text into deterministic ManimGX animation templates
 * (Surface 3D, Solid 3D, Function & Calculus, Linear Transform, Stat Chart, or Proof).
 */
import {
  buildManimGxTemplate,
  type ManimGxGeneratedScene,
  type ManimGxTemplateKind,
} from "./manimgxTemplates.js";

export interface ManimGxAnalysis {
  eligible: boolean;
  templateKind: ManimGxTemplateKind;
  recommendedSolidType?: "cube" | "cuboid" | "sphere" | "cylinder" | "cone" | "pyramid" | "prism";
  scene: ManimGxGeneratedScene;
}

export function analyzeForManimGX(selection: { latex?: string; text?: string }): ManimGxAnalysis {
  const raw = (selection.latex || selection.text || "").trim();
  const low = raw.toLowerCase();

  if (!raw) {
    const fallback = buildManimGxTemplate("function_calculus", "y = \\sin(x)");
    return { eligible: false, templateKind: "function_calculus", scene: fallback };
  }

  // 1. Linear Transformation Matrix
  const matMatch = raw.match(/\\begin\{[bp]?matrix\}([\s\S]*?)\\end\{[bp]?matrix\}/i)
    ?? raw.match(/\[\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\s*,\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\s*\]/);
  if (matMatch) {
    let matrix: [[number, number], [number, number]] = [[2, 1], [0, 1]];
    if (matMatch.length >= 5 && matMatch[4] !== undefined) {
      matrix = [
        [Number(matMatch[1]), Number(matMatch[2])],
        [Number(matMatch[3]), Number(matMatch[4])],
      ];
    } else if (matMatch[1]) {
      const nums = matMatch[1].match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (nums.length >= 4) {
        matrix = [[nums[0], nums[1]], [nums[2], nums[3]]];
      }
    }
    return {
      eligible: true,
      templateKind: "linear_transform",
      scene: buildManimGxTemplate("linear_transform", raw, { matrix }),
    };
  }

  // 2. 3D Surface: z = f(x, y) or sphere equation x^2 + y^2 + z^2 = R
  if (/z\s*=/.test(low) || (/x\^?2/.test(low) && /y\^?2/.test(low) && /z\^?2/.test(low))) {
    const pyExpr = low.includes("sin") && low.includes("cos")
      ? "math.sin(u) * math.cos(v)"
      : low.includes("-")
        ? "0.25 * (u**2 - v**2)"
        : "0.22 * (u**2 + v**2)";
    return {
      eligible: true,
      templateKind: "surface_3d",
      scene: buildManimGxTemplate("surface_3d", raw, { pyExpr }),
    };
  }

  // 3. 3D Solid Geometry (kubus, balok, bola, tabung, kerucut, limas, prisma)
  if (/kubus|cube|balok|cuboid|bola|sphere|tabung|cylinder|kerucut|cone|limas|pyramid|prisma|prism/.test(low)) {
    const solidType =
      /bola|sphere/.test(low)
        ? "sphere"
        : /tabung|cylinder/.test(low)
          ? "cylinder"
          : /kerucut|cone/.test(low)
            ? "cone"
            : /limas|pyramid/.test(low)
              ? "pyramid"
              : /balok|cuboid/.test(low)
                ? "cuboid"
                : /prisma|prism/.test(low)
                  ? "prism"
                  : "cube";
    return {
      eligible: true,
      templateKind: "solid_3d",
      recommendedSolidType: solidType,
      scene: buildManimGxTemplate("solid_3d", raw, { solidType }),
    };
  }

  // 4. Statistical Data / Chart
  const kvParts = raw.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (kvParts.length >= 2 && kvParts.every((p) => /^[^:=]+[:=]\s*-?\d+(\.\d+)?$/.test(p))) {
    const labels: string[] = [];
    const values: number[] = [];
    for (const part of kvParts) {
      const m = part.match(/^([^:=]+)[:=]\s*(-?\d+(?:\.\d+)?)$/);
      if (m) {
        labels.push(m[1].trim());
        values.push(Number(m[2]));
      }
    }
    return {
      eligible: true,
      templateKind: "stat_chart",
      scene: buildManimGxTemplate("stat_chart", raw, { labels, values }),
    };
  }

  // 5. Trig Identity / Geometric Proof
  if (/buktikan|prove|cos\(?2|\\cos\s*2|sin\^?\{?2\}?.*\+.*cos\^?\{?2\}?/.test(low)) {
    return {
      eligible: true,
      templateKind: "custom_proof",
      scene: buildManimGxTemplate("custom_proof", raw),
    };
  }

  // 6. Function / Calculus (y = f(x), \int, derivative, sin/cos/x^2)
  const showRiemann = /\\int|integral|∫/.test(low);
  const pyFunc = low.includes("cos")
    ? "math.cos(x)"
    : low.includes("sin")
      ? "math.sin(x)"
      : low.includes("x^2") || low.includes("x²") || low.includes("x^{2}")
        ? "0.35 * (x**2) - 1.5"
        : "math.sin(x)";
  return {
    eligible: true,
    templateKind: "function_calculus",
    scene: buildManimGxTemplate("function_calculus", raw, { pyFunc, showRiemann }),
  };
}
