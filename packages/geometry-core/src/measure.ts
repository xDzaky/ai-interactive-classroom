/**
 * Geometric Measurement Tools & Diagonal Shortcuts — @ai-classroom/geometry-core (P11-T06)
 * Supports segment length, vertex angles, and analytical diagonal formulas in Indonesian.
 */

import type { Vec3 } from './polyhedron.js';
import { vecSub, vecDot, vecLength } from './polyhedron.js';

export interface MeasurementResult {
  type: 'length' | 'angle' | 'diagonal_bidang' | 'diagonal_ruang';
  value: number;
  formattedValue: string;
  formula: string;
  latex: string;
  labels: string[];
}

/** Distance between 2 3D points in cm (world units / 20, or direct cm) */
export function segmentLength(p1: Vec3, p2: Vec3): number {
  return vecLength(vecSub(p2, p1));
}

/**
 * Angle formed at the vertex by rays (vertex -> p1) and (vertex -> p2) in degrees.
 * E.g. angleAtVertexDeg(B, A, D) measures angle BAD at vertex A.
 */
export function angleAtVertexDeg(p1: Vec3, vertex: Vec3, p2: Vec3): number {
  const v1 = vecSub(p1, vertex);
  const v2 = vecSub(p2, vertex);
  const len1 = vecLength(v1);
  const len2 = vecLength(v2);

  if (len1 < 1e-9 || len2 < 1e-9) return 0;

  const cosAngle = Math.max(-1, Math.min(1, vecDot(v1, v2) / (len1 * len2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/** Format number with Indonesian decimal comma */
export function formatIdNumber(val: number, decimals = 2): string {
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Measure 2 selected vertices (segment length).
 */
export function measureSegment(
  label1: string,
  p1: Vec3,
  label2: string,
  p2: Vec3
): MeasurementResult {
  const len = segmentLength(p1, p2);
  return {
    type: 'length',
    value: len,
    formattedValue: `${formatIdNumber(len)} cm`,
    formula: `Panjang ruas |${label1}${label2}|`,
    latex: `|${label1}${label2}| = ${formatIdNumber(len)}\\text{ cm}`,
    labels: [label1, label2],
  };
}

/**
 * Measure 3 selected vertices (angle at middle vertex).
 */
export function measureAngle(
  label1: string,
  p1: Vec3,
  vertexLabel: string,
  vertex: Vec3,
  label2: string,
  p2: Vec3
): MeasurementResult {
  const deg = angleAtVertexDeg(p1, vertex, p2);
  return {
    type: 'angle',
    value: deg,
    formattedValue: `${formatIdNumber(deg, 1)}°`,
    formula: `Besar sudut ∠${label1}${vertexLabel}${label2}`,
    latex: `\\angle ${label1}${vertexLabel}${label2} = ${formatIdNumber(deg, 1)}^\\circ`,
    labels: [label1, vertexLabel, label2],
  };
}

/**
 * Compute diagonal bidang (face diagonal) formula for cube or cuboid.
 */
export function diagonalBidang(
  kind: 'cube' | 'cuboid',
  p: { side?: number; s?: number; length?: number; l?: number; width?: number; w?: number; height?: number; h?: number },
  label1 = 'A',
  label2 = 'C'
): MeasurementResult {
  if (kind === 'cube') {
    const s = p.side ?? p.s ?? 5;
    const len = s * Math.SQRT2;
    return {
      type: 'diagonal_bidang',
      value: len,
      formattedValue: `${formatIdNumber(len)} cm`,
      formula: `Diagonal bidang ${label1}${label2} = s√2 = ${s}√2`,
      latex: `d_b = s\\sqrt{2} = ${s}\\sqrt{2} \\approx ${formatIdNumber(len)}\\text{ cm}`,
      labels: [label1, label2],
    };
  } else {
    // Cuboid: base diagonal = sqrt(p^2 + l^2)
    const l = p.length ?? p.l ?? 4;
    const w = p.width ?? p.w ?? 3;
    const len = Math.hypot(l, w);
    return {
      type: 'diagonal_bidang',
      value: len,
      formattedValue: `${formatIdNumber(len)} cm`,
      formula: `Diagonal bidang ${label1}${label2} = √(p² + l²) = √(${l}² + ${w}²)`,
      latex: `d_b = \\sqrt{p^2 + l^2} = \\sqrt{${l}^2 + ${w}^2} = ${formatIdNumber(len)}\\text{ cm}`,
      labels: [label1, label2],
    };
  }
}

/**
 * Compute diagonal ruang (space diagonal) formula for cube or cuboid.
 */
export function diagonalRuang(
  kind: 'cube' | 'cuboid',
  p: { side?: number; s?: number; length?: number; l?: number; width?: number; w?: number; height?: number; h?: number },
  label1 = 'A',
  label2 = 'G'
): MeasurementResult {
  if (kind === 'cube') {
    const s = p.side ?? p.s ?? 5;
    const len = s * Math.sqrt(3);
    return {
      type: 'diagonal_ruang',
      value: len,
      formattedValue: `${formatIdNumber(len)} cm`,
      formula: `Diagonal ruang ${label1}${label2} = s√3 = ${s}√3`,
      latex: `d_r = s\\sqrt{3} = ${s}\\sqrt{3} \\approx ${formatIdNumber(len)}\\text{ cm}`,
      labels: [label1, label2],
    };
  } else {
    // Cuboid: space diagonal = sqrt(p^2 + l^2 + t^2)
    const l = p.length ?? p.l ?? 3;
    const w = p.width ?? p.w ?? 4;
    const h = p.height ?? p.h ?? 5;
    const len = Math.sqrt(l * l + w * w + h * h);
    return {
      type: 'diagonal_ruang',
      value: len,
      formattedValue: `${formatIdNumber(len)} cm`,
      formula: `Diagonal ruang ${label1}${label2} = √(p² + l² + t²) = √(${l}² + ${w}² + ${h}²)`,
      latex: `d_r = \\sqrt{p^2 + l^2 + t^2} = \\sqrt{${l}^2 + ${w}^2 + ${h}^2} \\approx ${formatIdNumber(len)}\\text{ cm}`,
      labels: [label1, label2],
    };
  }
}
