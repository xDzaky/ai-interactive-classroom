/**
 * trigIdentities.ts — Parametric Textbook Geometric Proof Diagrams for Trigonometric Identities
 *
 * Generates exact textbook geometry primitives (vertices, segments, concentric angle arcs,
 * right-angle squares, and edge-aligned labels) for:
 * - Double-Angle: cos(2θ) = 2cos²(θ) - 1, sin(2θ) = 2sin(θ)cos(θ) (A-B-D-E-F triangle proof)
 * - Pythagorean: sin²(θ) + cos²(θ) = 1 (Unit Circle + Right Triangle)
 * - Angle Sum: sin(α + β) = sin α cos β + cos α sin β (Stacked Right-Triangle Rectangle)
 * - Law of Cosines: c² = a² + b² - 2ab cos C
 */

export type TrigIdentityId =
  | "double_angle"
  | "pythagorean"
  | "angle_sum"
  | "law_of_cosines";

export interface ProofPoint {
  id: string;
  x: number;
  y: number;
  labelOffset?: [number, number];
}

export interface ProofSegment {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
  width?: number;
  label?: string;
  labelOffsetPerp?: number;
}

export interface ProofAngleArc {
  vertex: string;
  startRad: number;
  endRad: number;
  radiusPx: number;
  concentricTier: 1 | 2 | 3;
  label: string;
  color: string;
}

export interface ProofRightAngle {
  vertex: string;
  uDir: [number, number];
  vDir: [number, number];
  sizePx: number;
}

export interface TrigProofDiagram {
  identityId: TrigIdentityId;
  title: string;
  formula: string;
  thetaDeg: number;
  betaDeg?: number;
  points: ProofPoint[];
  segments: ProofSegment[];
  arcs: ProofAngleArc[];
  rightAngles: ProofRightAngle[];
  summarySteps: string[];
}

function norm(dx: number, dy: number): [number, number] {
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

export function buildTrigProofDiagram(
  identityId: TrigIdentityId,
  thetaDeg = 28,
  betaDeg = 20,
): TrigProofDiagram {
  const clampedTheta = Math.max(12, Math.min(42, thetaDeg));
  const theta = (clampedTheta * Math.PI) / 180;

  if (identityId === "double_angle") {
    // Classic A-B-D-E-F geometric proof of cos(2θ) = 2cos²(θ) - 1 & sin(2θ) = 2sin(θ)cos(θ)
    // Scale 1 unit = 190 px, origin at A(70, 290), AD along +x (svg y-down)
    const S = 185;
    const ax = 75;
    const ay = 285;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const c2 = Math.cos(2 * theta);
    const s2 = Math.sin(2 * theta);

    // Point B at angle 2θ, distance 1 from A
    const bx = ax + S * c2;
    const by = ay - S * s2;
    // Point E = projection of B onto horizontal base AD (distance cos(2θ) from A)
    const ex = bx;
    const ey = ay;
    // Point D along horizontal base at distance 2*cos²(θ) = 1 + cos(2θ)
    const dx = ax + S * (2 * c * c);
    const dy = ay;
    // Point F = foot of perpendicular from D to ray AB at angle θ (distance cos θ from A along ray θ)
    // Wait: in classic double-angle isosceles triangle ABD with AB=1, BD=1, ∠BAD=θ, ∠BDA=θ:
    // Actually with ∠FAD = θ, ∠BAF = θ so ∠BAD = 2θ, let AF = 2 cos θ along ray θ?
    // Even cleaner: Isosceles triangle A-B-D where AB = BD = 1, ∠BAD = θ, ∠ABD = 180-2θ:
    // Let's use the exact textbook A-B-D-E-F construction where:
    // A = (0,0), ray AD along x-axis (length 2cos²θ), ray AB at 2θ (length 1),
    // Point C/F on angle bisector θ at distance cos θ (altitude foot from B to AF and D to AF):
    // Wait: let's match standard diagram:
    // A = origin, D = (1, 0) on base, B = (cos 2θ, sin 2θ), E = (cos 2θ, 0) foot of B on AD,
    // F = midpoint of BD => AF ⊥ BD with length AF = cos θ and ∠DAF = ∠FAB = θ!
    // Check: |AB|=1, |AD|=1 => triangle ABD is isosceles with apex A (angle 2θ)!
    // Wait: if AD = 1, then AE = cos 2θ, BE = sin 2θ, and F = midpoint of BD gives AF = cos θ, DF = BF = sin θ.
    // Even better: extend D so AD = 2cos²θ when AF = cos θ and ∠DFA = 90° => cos θ = AF / AD? No, AD = 1/cos θ or AF = cos θ on hypotenuse 1!
    // Let's use exact circle-diameter / textbook A-B-D-E-F:
    // A(0,0), B(cos 2θ, sin 2θ) on unit circle, D(2cos²θ, 0) = (1 + cos 2θ, 0),
    // F = (2cos²θ * cos²θ? No!) Let's check exact coordinates where:
    // A = (0, 0), B = (cos 2θ, sin 2θ), E = (cos 2θ, 0) [BE ⊥ AD],
    // D = (1, 0) [so AB = AD = 1], F = ((1 + cos 2θ)/2, sin 2θ / 2) = midpoint of BD!
    // Check: AF = sqrt(((1+cos2θ)/2)^2 + (sin2θ/2)^2) = cos θ!
    // Angle ∠DAF = θ, ∠FAB = θ, ∠DAB = 2θ!
    // Right angles: ∠BEA = 90°, ∠AFD = 90°, ∠AFB = 90°!
    // And ED = 1 - cos 2θ = 2sin²θ, while BD = 2sinθ, and projecting F onto AD gives H = (cos²θ, 0), AH = cos²θ!
    // Let's scale by S = 260 so the triangle fills the canvas crisply!
    const U = 260;
    const A = { id: "A", x: 70, y: 295, labelOffset: [-16, 8] as [number, number] };
    const D = { id: "D", x: A.x + U, y: A.y, labelOffset: [12, 8] as [number, number] };
    const B = { id: "B", x: A.x + U * c2, y: A.y - U * s2, labelOffset: [0, -14] as [number, number] };
    const E = { id: "E", x: B.x, y: A.y, labelOffset: [0, 18] as [number, number] };
    const F = { id: "F", x: (B.x + D.x) / 2, y: (B.y + D.y) / 2, labelOffset: [14, -8] as [number, number] };
    const H = { id: "H", x: F.x, y: A.y, labelOffset: [0, 18] as [number, number] };

    const angleAF = Math.atan2(F.y - A.y, F.x - A.x); // negative (y-up in screen)
    const angleAB = Math.atan2(B.y - A.y, B.x - A.x);

    return {
      identityId: "double_angle",
      title: "Bukti Geometris Sudut Ganda (Double-Angle)",
      formula: "cos(2θ) = 2cos²(θ) - 1   ·   sin(2θ) = 2sin(θ)cos(θ)",
      thetaDeg: clampedTheta,
      points: [A, B, D, E, F, H],
      segments: [
        { from: "A", to: "D", color: "#0f172a", width: 2.5, label: "1", labelOffsetPerp: 20 },
        { from: "A", to: "B", color: "#0f172a", width: 2.5, label: "1", labelOffsetPerp: -16 },
        { from: "B", to: "D", color: "#0f172a", width: 2.2, label: "2 sin θ", labelOffsetPerp: -16 },
        { from: "A", to: "F", color: "#2563eb", width: 2.2, label: "cos θ", labelOffsetPerp: -14 },
        { from: "B", to: "E", color: "#dc2626", width: 2, dashed: true, label: "sin 2θ", labelOffsetPerp: -22 },
        { from: "F", to: "H", color: "#059669", width: 1.8, dashed: true, label: "sin θ cos θ", labelOffsetPerp: 24 },
      ],
      arcs: [
        { vertex: "A", startRad: angleAF, endRad: 0, radiusPx: 44, concentricTier: 1, label: "θ", color: "#2563eb" },
        { vertex: "A", startRad: angleAB, endRad: angleAF, radiusPx: 54, concentricTier: 2, label: "θ", color: "#7c3aed" },
        { vertex: "A", startRad: angleAB, endRad: 0, radiusPx: 72, concentricTier: 3, label: "2θ", color: "#dc2626" },
      ],
      rightAngles: [
        { vertex: "E", uDir: [0, -1], vDir: [1, 0], sizePx: 12 },
        { vertex: "H", uDir: [0, -1], vDir: [1, 0], sizePx: 11 },
        { vertex: "F", uDir: norm(A.x - F.x, A.y - F.y), vDir: norm(D.x - F.x, D.y - F.y), sizePx: 12 },
      ],
      summarySteps: [
        `θ = ${clampedTheta.toFixed(0)}°, 2θ = ${(2 * clampedTheta).toFixed(0)}°`,
        `AE = cos(2θ) = ${c2.toFixed(3)}, AH = cos²(θ) = ${(c * c).toFixed(3)}`,
        `2cos²(θ) - 1 = ${(2 * c * c - 1).toFixed(3)} = cos(2θ) ✓`,
        `BE = sin(2θ) = ${s2.toFixed(3)} = 2·sin(θ)·cos(θ) = ${(2 * s * c).toFixed(3)} ✓`,
      ],
    };
  }

  if (identityId === "pythagorean") {
    const R = 135;
    const cx = 230;
    const cy = 190;
    const t = (Math.max(15, Math.min(75, thetaDeg)) * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const O = { id: "O", x: cx, y: cy, labelOffset: [-16, 16] as [number, number] };
    const P = { id: "P", x: cx + R * c, y: cy - R * s, labelOffset: [10, -10] as [number, number] };
    const Q = { id: "Q", x: P.x, y: cy, labelOffset: [4, 18] as [number, number] };
    return {
      identityId: "pythagorean",
      title: "Identitas Pythagoras Lingkaran Satuan",
      formula: "sin²(θ) + cos²(θ) = 1",
      thetaDeg,
      points: [O, P, Q],
      segments: [
        { from: "O", to: "P", color: "#4f46e5", width: 2.5, label: "r = 1", labelOffsetPerp: -14 },
        { from: "O", to: "Q", color: "#059669", width: 2.5, label: `cos θ = ${c.toFixed(2)}`, labelOffsetPerp: 20 },
        { from: "Q", to: "P", color: "#dc2626", width: 2.5, label: `sin θ = ${s.toFixed(2)}`, labelOffsetPerp: 28 },
      ],
      arcs: [
        { vertex: "O", startRad: -t, endRad: 0, radiusPx: 38, concentricTier: 1, label: "θ", color: "#4f46e5" },
      ],
      rightAngles: [
        { vertex: "Q", uDir: [-1, 0], vDir: [0, -1], sizePx: 12 },
      ],
      summarySteps: [
        `cos²(${thetaDeg}°) = ${(c * c).toFixed(4)}`,
        `sin²(${thetaDeg}°) = ${(s * s).toFixed(4)}`,
        `sin²(θ) + cos²(θ) = ${(s * s + c * c).toFixed(4)} = 1 ✓`,
      ],
    };
  }

  if (identityId === "angle_sum") {
    const aDeg = Math.max(15, Math.min(40, thetaDeg));
    const bDeg = Math.max(15, Math.min(35, betaDeg));
    const a = (aDeg * Math.PI) / 180;
    const b = (bDeg * Math.PI) / 180;
    const U = 240;
    const A = { id: "A", x: 85, y: 290, labelOffset: [-16, 10] as [number, number] };
    const B = { id: "B", x: A.x + U * Math.cos(a + b), y: A.y - U * Math.sin(a + b), labelOffset: [0, -14] as [number, number] };
    const C = { id: "C", x: A.x + U * Math.cos(b) * Math.cos(a), y: A.y - U * Math.cos(b) * Math.sin(a), labelOffset: [12, 6] as [number, number] };
    const D = { id: "D", x: C.x, y: A.y, labelOffset: [0, 18] as [number, number] };
    const E = { id: "E", x: B.x, y: A.y, labelOffset: [0, 18] as [number, number] };
    return {
      identityId: "angle_sum",
      title: "Identitas Jumlah Sudut (Angle Sum)",
      formula: "sin(α + β) = sin α cos β + cos α sin β",
      thetaDeg: aDeg,
      betaDeg: bDeg,
      points: [A, B, C, D, E],
      segments: [
        { from: "A", to: "B", color: "#0f172a", width: 2.5, label: "1", labelOffsetPerp: -14 },
        { from: "A", to: "C", color: "#2563eb", width: 2.2, label: "cos β", labelOffsetPerp: 16 },
        { from: "B", to: "C", color: "#7c3aed", width: 2.2, label: "sin β", labelOffsetPerp: -16 },
        { from: "B", to: "E", color: "#dc2626", width: 2, dashed: true, label: "sin(α+β)", labelOffsetPerp: -28 },
        { from: "C", to: "D", color: "#059669", width: 2, dashed: true, label: "sin α cos β", labelOffsetPerp: 30 },
        { from: "A", to: "D", color: "#0f172a", width: 2.2 },
      ],
      arcs: [
        { vertex: "A", startRad: -a, endRad: 0, radiusPx: 42, concentricTier: 1, label: "α", color: "#2563eb" },
        { vertex: "A", startRad: -(a + b), endRad: -a, radiusPx: 56, concentricTier: 2, label: "β", color: "#7c3aed" },
      ],
      rightAngles: [
        { vertex: "D", uDir: [-1, 0], vDir: [0, -1], sizePx: 11 },
        { vertex: "E", uDir: [1, 0], vDir: [0, -1], sizePx: 11 },
        { vertex: "C", uDir: norm(A.x - C.x, A.y - C.y), vDir: norm(B.x - C.x, B.y - C.y), sizePx: 11 },
      ],
      summarySteps: [
        `α = ${aDeg}°, β = ${bDeg}°, α + β = ${aDeg + bDeg}°`,
        `sin(α+β) = ${Math.sin(a + b).toFixed(4)}`,
        `sin α cos β + cos α sin β = ${(Math.sin(a) * Math.cos(b) + Math.cos(a) * Math.sin(b)).toFixed(4)} ✓`,
      ],
    };
  }

  // Law of Cosines
  const cDeg = Math.max(25, Math.min(120, thetaDeg * 2));
  const cRad = (cDeg * Math.PI) / 180;
  const sideA = 180;
  const sideB = 220;
  const C = { id: "C", x: 110, y: 280, labelOffset: [-14, 14] as [number, number] };
  const A = { id: "A", x: C.x + sideB, y: C.y, labelOffset: [12, 14] as [number, number] };
  const B = { id: "B", x: C.x + sideA * Math.cos(cRad), y: C.y - sideA * Math.sin(cRad), labelOffset: [0, -14] as [number, number] };
  const lenC = Math.sqrt(sideA * sideA + sideB * sideB - 2 * sideA * sideB * Math.cos(cRad));
  return {
    identityId: "law_of_cosines",
    title: "Aturan Kosinus (Law of Cosines)",
    formula: "c² = a² + b² - 2ab cos(C)",
    thetaDeg: cDeg,
    points: [C, A, B],
    segments: [
      { from: "C", to: "A", color: "#059669", width: 2.5, label: "b = 5.5", labelOffsetPerp: 20 },
      { from: "C", to: "B", color: "#2563eb", width: 2.5, label: "a = 4.5", labelOffsetPerp: -18 },
      { from: "A", to: "B", color: "#dc2626", width: 2.5, label: `c = ${(lenC / 40).toFixed(2)}`, labelOffsetPerp: -16 },
    ],
    arcs: [
      { vertex: "C", startRad: -cRad, endRad: 0, radiusPx: 38, concentricTier: 1, label: `C = ${cDeg}°`, color: "#4f46e5" },
    ],
    rightAngles: [],
    summarySteps: [
      `a = 4.5, b = 5.5, ∠C = ${cDeg}°`,
      `c = √(a² + b² - 2ab cos C) = ${(lenC / 40).toFixed(3)}`,
    ],
  };
}
