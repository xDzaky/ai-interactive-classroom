/**
 * Core types for @ai-classroom/sketch-core (P10-T09)
 */

export interface Pt {
  x: number;
  y: number;
  t?: number;
  p?: number;
}

export type ShapeKind =
  | 'line'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'right_triangle'
  | 'rect'
  | 'square'
  | 'rhombus'
  | 'parallelogram'
  | 'trapezoid'
  | 'kite'
  | 'pentagon'
  | 'hexagon'
  | 'star';

export type ShapeGeometry =
  | { type: 'line'; a: Pt; b: Pt }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotationDeg: number }
  | { type: 'polygon'; points: Pt[] }; // ordered, closed implicitly

export interface ShapeCandidate {
  kind: ShapeKind;
  confidence: number;
  fitError: number;
  geometry: ShapeGeometry;
}

export interface RecognizeOptions {
  scale?: number;
  minLengthPx?: number;
  snapAngleDeg?: number;
}

export interface RecognizeResult {
  decision: 'snap' | 'suggest' | 'keep';
  best: ShapeCandidate | null;
  candidates: ShapeCandidate[];
  reason: string;
}
