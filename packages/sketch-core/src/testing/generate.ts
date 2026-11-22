/**
 * Synthetic stroke generator with realistic human drawing noise (P10-T10)
 */
import type { Pt, ShapeKind } from '../types.js';

export type NegativeKind =
  | 'scribble'
  | 'letter_S'
  | 'letter_8'
  | 'heart'
  | 'spiral'
  | 'zigzag'
  | 'wave'
  | 'blob'
  | 'hook'
  | 'open_arc';

export interface GeneratorOptions {
  seed?: number;
  pointsCount?: number;
  noiseLevel?: number; // fraction of bbox diagonal (0.01 - 0.03)
  rotationDeg?: number;
  scale?: number;
  cx?: number;
  cy?: number;
}

/** Simple fast deterministic PRNG (mulberry32) */
export function createRNG(seed = 123456) {
  let s = seed | 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add low-frequency hand wobble and high-frequency jitter */
function addHumanNoise(pts: Pt[], rng: () => number, noiseMag: number): Pt[] {
  const n = pts.length;
  const f1 = 2 + rng() * 2;
  const f2 = 4 + rng() * 3;
  const phase1 = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;

  return pts.map((p, i) => {
    const t = i / Math.max(n - 1, 1);
    // Low-frequency hand wobble (sum of 2 sines)
    const wobble = Math.sin(t * f1 * Math.PI * 2 + phase1) * 0.6 + Math.sin(t * f2 * Math.PI * 2 + phase2) * 0.4;
    // High-frequency jitter
    const jitterX = (rng() - 0.5) * 2 * noiseMag;
    const jitterY = (rng() - 0.5) * 2 * noiseMag;

    return {
      x: p.x + jitterX + wobble * noiseMag * 0.5,
      y: p.y + jitterY + wobble * noiseMag * 0.5,
    };
  });
}

/** Rotate points around center */
function rotatePoints(pts: Pt[], cx: number, cy: number, deg: number): Pt[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });
}

/** Interpolate points along polygon vertices with optional gap/overshoot */
function interpolatePolygon(
  vertices: Pt[],
  totalPoints: number,
  rng: () => number,
  isClosed = true
): Pt[] {
  const m = vertices.length;
  // Random start vertex and direction
  const startIdx = Math.floor(rng() * m);
  const isCCW = rng() > 0.5;

  const ordered: Pt[] = [];
  for (let i = 0; i < m; i++) {
    const idx = isCCW ? (startIdx - i + m) % m : (startIdx + i) % m;
    ordered.push(vertices[idx]);
  }

  const ptsPerSide = Math.max(Math.floor(totalPoints / m), 4);
  const pts: Pt[] = [];

  for (let i = 0; i < m; i++) {
    const v1 = ordered[i];
    const v2 = ordered[(i + 1) % m];
    for (let j = 0; j < ptsPerSide; j++) {
      const t = j / ptsPerSide;
      pts.push({
        x: v1.x + (v2.x - v1.x) * t,
        y: v1.y + (v2.y - v1.y) * t,
      });
    }
  }

  if (isClosed) {
    // Gap or overshoot (0 - 10%)
    const closureMode = rng();
    if (closureMode > 0.4) {
      // Small overshoot
      const v0 = ordered[0];
      const v1 = ordered[1];
      const t = 0.05 * rng();
      pts.push({
        x: v0.x + (v1.x - v0.x) * t,
        y: v0.y + (v1.y - v0.y) * t,
      });
    } else {
      // Exact or near close
      pts.push({ ...ordered[0] });
    }
  }

  return pts;
}

// ─── Generators for 11 shape classes ─────────────────────────────────────────

export function generateSyntheticShape(kind: ShapeKind, opts: GeneratorOptions = {}): Pt[] {
  const rng = createRNG(opts.seed ?? Math.floor(Math.random() * 1000000));
  const cx = opts.cx ?? 200;
  const cy = opts.cy ?? 200;
  const scale = opts.scale ?? 100;
  const totalPoints = opts.pointsCount ?? 64;
  const noiseMag = (opts.noiseLevel ?? 0.015) * scale;
  const rot = opts.rotationDeg ?? (rng() - 0.5) * 30; // ±15°

  let basePts: Pt[] = [];

  switch (kind) {
    case 'line': {
      const len = scale * (0.8 + rng() * 0.4);
      const angle = (rng() - 0.5) * 360;
      const rad = (angle * Math.PI) / 180;
      const half = len / 2;
      for (let i = 0; i < totalPoints; i++) {
        const t = (i / (totalPoints - 1) - 0.5) * len;
        basePts.push({
          x: cx + t * Math.cos(rad),
          y: cy + t * Math.sin(rad),
        });
      }
      break;
    }
    case 'circle': {
      const r = scale * 0.5;
      const startAngle = rng() * Math.PI * 2;
      const ccw = rng() > 0.5 ? -1 : 1;
      for (let i = 0; i < totalPoints; i++) {
        const th = startAngle + ccw * (i / totalPoints) * Math.PI * 2;
        basePts.push({
          x: cx + r * Math.cos(th),
          y: cy + r * Math.sin(th),
        });
      }
      basePts.push({ ...basePts[0] });
      break;
    }
    case 'ellipse': {
      const rx = scale * 0.6;
      const ry = scale * 0.3 * (0.7 + rng() * 0.4);
      const startAngle = rng() * Math.PI * 2;
      const ccw = rng() > 0.5 ? -1 : 1;
      for (let i = 0; i < totalPoints; i++) {
        const th = startAngle + ccw * (i / totalPoints) * Math.PI * 2;
        basePts.push({
          x: cx + rx * Math.cos(th),
          y: cy + ry * Math.sin(th),
        });
      }
      basePts.push({ ...basePts[0] });
      break;
    }
    case 'triangle': {
      const s = scale * 0.8;
      const h = (Math.sqrt(3) / 2) * s;
      const verts: Pt[] = [
        { x: cx, y: cy - (2 / 3) * h },
        { x: cx + s / 2, y: cy + (1 / 3) * h },
        { x: cx - s / 2, y: cy + (1 / 3) * h },
      ];
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'right_triangle': {
      const a = scale * 0.7;
      const b = scale * 0.5;
      const verts: Pt[] = [
        { x: cx - a / 2, y: cy + b / 2 },
        { x: cx + a / 2, y: cy + b / 2 },
        { x: cx - a / 2, y: cy - b / 2 },
      ];
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'square': {
      const s = scale * 0.7;
      const h = s / 2;
      const verts: Pt[] = [
        { x: cx - h, y: cy - h },
        { x: cx + h, y: cy - h },
        { x: cx + h, y: cy + h },
        { x: cx - h, y: cy + h },
      ];
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'rect': {
      const w = scale * 0.9;
      const h = scale * 0.45;
      const hw = w / 2;
      const hh = h / 2;
      const verts: Pt[] = [
        { x: cx - hw, y: cy - hh },
        { x: cx + hw, y: cy - hh },
        { x: cx + hw, y: cy + hh },
        { x: cx - hw, y: cy + hh },
      ];
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'rhombus': {
      const d1 = scale * 0.8;
      const d2 = scale * 0.5;
      const verts: Pt[] = [
        { x: cx, y: cy - d2 / 2 },
        { x: cx + d1 / 2, y: cy },
        { x: cx, y: cy + d2 / 2 },
        { x: cx - d1 / 2, y: cy },
      ];
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'pentagon': {
      const r = scale * 0.5;
      const verts: Pt[] = [];
      for (let i = 0; i < 5; i++) {
        const th = (i / 5) * 2 * Math.PI - Math.PI / 2;
        verts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
      }
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'hexagon': {
      const r = scale * 0.5;
      const verts: Pt[] = [];
      for (let i = 0; i < 6; i++) {
        const th = (i / 6) * 2 * Math.PI;
        verts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
      }
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
    case 'star': {
      const rOuter = scale * 0.6;
      const rInner = scale * 0.28;
      const verts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const th = (i / 10) * 2 * Math.PI - Math.PI / 2;
        verts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
      }
      basePts = interpolatePolygon(verts, totalPoints, rng);
      break;
    }
  }

  // Apply human hand wobble and noise
  const noisy = addHumanNoise(basePts, rng, noiseMag);
  // Apply rotation
  return rotatePoints(noisy, cx, cy, rot);
}

// ─── Generators for 10 negative non-shape classes ─────────────────────────────

export function generateSyntheticNegative(kind: NegativeKind, opts: GeneratorOptions = {}): Pt[] {
  const rng = createRNG(opts.seed ?? Math.floor(Math.random() * 1000000));
  const cx = opts.cx ?? 200;
  const cy = opts.cy ?? 200;
  const scale = opts.scale ?? 100;
  const totalPoints = opts.pointsCount ?? 64;

  const pts: Pt[] = [];

  switch (kind) {
    case 'scribble': {
      let x = cx;
      let y = cy;
      for (let i = 0; i < totalPoints; i++) {
        x += (rng() - 0.5) * scale * 0.2;
        y += (rng() - 0.5) * scale * 0.2;
        pts.push({ x, y });
      }
      break;
    }
    case 'letter_S': {
      for (let i = 0; i < totalPoints; i++) {
        const t = (i / (totalPoints - 1)) * Math.PI * 2;
        pts.push({
          x: cx + (scale * 0.3) * Math.sin(t),
          y: cy + (scale * 0.5) * (t / Math.PI - 1),
        });
      }
      break;
    }
    case 'letter_8': {
      for (let i = 0; i < totalPoints; i++) {
        const t = (i / (totalPoints - 1)) * Math.PI * 2;
        const denom = 1 + Math.sin(t) * Math.sin(t);
        pts.push({
          x: cx + (scale * 0.4 * Math.cos(t)) / denom,
          y: cy + (scale * 0.6 * Math.sin(t) * Math.cos(t)) / denom,
        });
      }
      break;
    }
    case 'heart': {
      for (let i = 0; i < totalPoints; i++) {
        const t = (i / (totalPoints - 1)) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push({ x: cx + (x * scale) / 36, y: cy + (y * scale) / 36 });
      }
      break;
    }
    case 'spiral': {
      for (let i = 0; i < totalPoints; i++) {
        const th = (i / (totalPoints - 1)) * Math.PI * 6;
        const r = (scale * 0.5 * i) / totalPoints;
        pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
      }
      break;
    }
    case 'zigzag': {
      for (let i = 0; i < totalPoints; i++) {
        const seg = Math.floor(i / 8);
        const t = (i % 8) / 8;
        const x = cx - scale / 2 + (i / totalPoints) * scale;
        const y = cy + (seg % 2 === 0 ? t * 30 : (1 - t) * 30) - 15;
        pts.push({ x, y });
      }
      break;
    }
    case 'wave': {
      for (let i = 0; i < totalPoints; i++) {
        const x = cx - scale / 2 + (i / totalPoints) * scale;
        const y = cy + Math.sin((i / 8) * Math.PI) * 20;
        pts.push({ x, y });
      }
      break;
    }
    case 'blob': {
      for (let i = 0; i < totalPoints; i++) {
        const th = (i / totalPoints) * Math.PI * 2;
        const r = scale * 0.4 * (1 + 0.3 * Math.sin(3 * th) + 0.2 * Math.cos(5 * th));
        pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
      }
      pts.push({ ...pts[0] });
      break;
    }
    case 'hook': {
      for (let i = 0; i < totalPoints / 2; i++) {
        pts.push({ x: cx, y: cy - scale / 2 + (i / (totalPoints / 2)) * scale });
      }
      for (let i = 0; i < totalPoints / 2; i++) {
        const th = (i / (totalPoints / 2)) * Math.PI;
        pts.push({ x: cx - scale * 0.25 * Math.sin(th), y: cy + scale / 2 - scale * 0.25 * (1 - Math.cos(th)) });
      }
      break;
    }
    case 'open_arc': {
      const r = scale * 0.5;
      for (let i = 0; i < totalPoints; i++) {
        const th = (i / (totalPoints - 1)) * Math.PI * 1.2;
        pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
      }
      break;
    }
  }

  return addHumanNoise(pts, rng, (opts.noiseLevel ?? 0.015) * scale);
}
