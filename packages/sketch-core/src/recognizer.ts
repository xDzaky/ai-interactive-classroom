/**
 * Shape Recognizer v2 — @ai-classroom/sketch-core (P10-T09)
 * High-accuracy multi-candidate shape fitting with confidence and rejection option.
 */
import type { Pt, ShapeCandidate, ShapeKind, ShapeGeometry, RecognizeOptions, RecognizeResult } from './types.js';
import { CONSTANTS } from './constants.js';
import { ptDistance, pathLength, filterMinDistance, resample } from './resample.js';
import {
  computeBBox,
  perpDistToLine,
  interiorAngleDeg,
  ramerDouglasPeucker,
  isPolygonSelfIntersecting,
  intersectLines,
  computePolygonFitError,
  fitEllipsePCA,
} from './geometry.js';

/** Standard deviation helper */
function getMeanAndCV(values: number[]): { mean: number; cv: number } {
  if (values.length === 0) return { mean: 0, cv: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  if (mean < 1e-6) return { mean, cv: 0 };
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  return { mean, cv: std / mean };
}

/** Check if angle is within tolerance of 0, 90, 180, 270 degrees */
function isNearAxis(angleDeg: number, tolerance: number): boolean {
  const norm = ((angleDeg % 90) + 90) % 90;
  return norm <= tolerance || norm >= 90 - tolerance;
}

/**
 * Recognizes geometric shape from raw stroke point sequence.
 */
export function recognizeShape(points: Pt[], opts?: RecognizeOptions): RecognizeResult {
  const scale = opts?.scale ?? 1.0;
  const minLengthPx = opts?.minLengthPx ?? CONSTANTS.DEFAULT_MIN_LENGTH_PX;
  const worldMinLength = minLengthPx / scale;
  const snapAngleDeg = opts?.snapAngleDeg ?? CONSTANTS.ANGLE_SNAP_TOLERANCE_DEG;

  // 1. Reject tiny input
  if (!points || points.length < CONSTANTS.DEFAULT_MIN_POINTS) {
    return {
      decision: 'keep',
      best: null,
      candidates: [],
      reason: `Stroke has fewer than ${CONSTANTS.DEFAULT_MIN_POINTS} points`,
    };
  }

  const rawLength = pathLength(points);
  if (rawLength < worldMinLength) {
    return {
      decision: 'keep',
      best: null,
      candidates: [],
      reason: `Stroke length (${rawLength.toFixed(1)}) below minLength (${worldMinLength.toFixed(1)})`,
    };
  }

  // 2. Remove points closer than 1 px; resample to N = 64 equidistant points
  const minFiltered = filterMinDistance(points, CONSTANTS.POINT_MIN_DIST_PX / scale);
  if (minFiltered.length < 4) {
    return {
      decision: 'keep',
      best: null,
      candidates: [],
      reason: 'Too few distinct points after distance filter',
    };
  }

  const resampled = resample(minFiltered, CONSTANTS.RESAMPLE_N);
  const totalLength = pathLength(resampled);
  const bbox = computeBBox(resampled);

  // 3. Gap check for closed vs open stroke
  const startPt = resampled[0];
  const endPt = resampled[resampled.length - 1];
  const gap = ptDistance(startPt, endPt);
  const gapRatio = totalLength > 0 ? gap / totalLength : 1.0;
  const isClosed = gapRatio <= CONSTANTS.CLOSED_GAP_RATIO;

  const candidates: ShapeCandidate[] = [];

  // 4. Open stroke -> Line evaluation
  if (!isClosed) {
    const chord = ptDistance(startPt, endPt);
    let maxPerpDev = 0;
    for (const p of resampled) {
      const dev = perpDistToLine(p, startPt, endPt);
      if (dev > maxPerpDev) maxPerpDev = dev;
    }

    const perpDevRatio = chord > 1e-4 ? maxPerpDev / chord : 1.0;
    const chordRatio = totalLength > 1e-4 ? chord / totalLength : 0.0;

    if (perpDevRatio <= CONSTANTS.LINE_PERP_DEV_RATIO && chordRatio >= CONSTANTS.LINE_CHORD_RATIO) {
      let lineA = { ...startPt };
      let lineB = { ...endPt };

      const dx = lineB.x - lineA.x;
      const dy = lineB.y - lineA.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Snap to horizontal or vertical when within snap tolerance
      if (isNearAxis(angle, CONSTANTS.LINE_SNAP_ANGLE_DEG)) {
        const normAngle = ((angle % 180) + 180) % 180;
        if (normAngle <= CONSTANTS.LINE_SNAP_ANGLE_DEG || normAngle >= 180 - CONSTANTS.LINE_SNAP_ANGLE_DEG) {
          // Horizontal snap
          const midY = (lineA.y + lineB.y) / 2;
          lineA.y = midY;
          lineB.y = midY;
        } else if (Math.abs(normAngle - 90) <= CONSTANTS.LINE_SNAP_ANGLE_DEG) {
          // Vertical snap
          const midX = (lineA.x + lineB.x) / 2;
          lineA.x = midX;
          lineB.x = midX;
        }
      }

      const conf = Math.max(0, Math.min(1, 1 - perpDevRatio / CONSTANTS.LINE_PERP_DEV_RATIO));
      candidates.push({
        kind: 'line',
        confidence: conf,
        fitError: perpDevRatio,
        geometry: {
          type: 'line',
          a: lineA,
          b: lineB,
        },
      });
    }

    return finalizeDecision(candidates, 'Open stroke');
  }

  // 5. Closed stroke -> Ellipse/Circle & Polygons

  // 5a. Ellipse fit
  const ellipseFit = fitEllipsePCA(resampled);
  if (ellipseFit && ellipseFit.candidate.confidence > 0.40) {
    candidates.push(ellipseFit.candidate);
  }

  // 5b. Polygon candidates via multi-epsilon Douglas-Peucker
  for (const epsRatio of CONSTANTS.POLYGON_EPSILONS) {
    const epsilon = epsRatio * bbox.diagonal;
    // Closed polyline for RDP
    const polyline = [...resampled, resampled[0]];
    const rdp = ramerDouglasPeucker(polyline, epsilon);

    // Drop identical end point
    let corners = rdp.slice(0, rdp.length - 1);
    if (corners.length < 3) continue;

    // Merge corners closer than 0.06 * L
    const mergeDist = CONSTANTS.CORNER_MERGE_RATIO * totalLength;
    let merged = true;
    let mergePasses = 25;
    while (merged && corners.length > 3 && mergePasses-- > 0) {
      merged = false;
      for (let i = 0; i < corners.length; i++) {
        const nextIdx = (i + 1) % corners.length;
        if (ptDistance(corners[i], corners[nextIdx]) < mergeDist) {
          const mid: Pt = {
            x: (corners[i].x + corners[nextIdx].x) / 2,
            y: (corners[i].y + corners[nextIdx].y) / 2,
          };
          if (i === corners.length - 1) {
            corners[0] = mid;
            corners.pop();
          } else {
            corners.splice(i, 2, mid);
          }
          merged = true;
          break;
        }
      }
    }

    // Drop corners with interior angle > 165°
    let dropped = true;
    let dropPasses = 25;
    while (dropped && corners.length > 3 && dropPasses-- > 0) {
      dropped = false;
      for (let i = 0; i < corners.length; i++) {
        const prev = corners[(i - 1 + corners.length) % corners.length];
        const curr = corners[i];
        const next = corners[(i + 1) % corners.length];
        const angle = interiorAngleDeg(prev, curr, next);
        if (angle > CONSTANTS.DROP_CORNER_ANGLE_DEG) {
          corners.splice(i, 1);
          dropped = true;
          break;
        }
      }
    }

    const k = corners.length;
    if (k < 3 || k > 10) continue;

    // Refine vertices by intersecting adjacent side lines
    const refined: Pt[] = [];
    for (let i = 0; i < k; i++) {
      const prev = corners[(i - 1 + k) % k];
      const curr = corners[i];
      const next = corners[(i + 1) % k];
      const isect = intersectLines(prev, curr, curr, next);
      if (isect && ptDistance(isect, curr) < 0.25 * bbox.diagonal) {
        refined.push(isect);
      } else {
        refined.push(curr);
      }
    }

    // Measure polygon side lengths and angles
    const sideLengths: number[] = [];
    const angles: number[] = [];
    for (let i = 0; i < k; i++) {
      const p1 = refined[i];
      const p2 = refined[(i + 1) % k];
      const p3 = refined[(i + 2) % k];
      sideLengths.push(ptDistance(p1, p2));
      angles.push(interiorAngleDeg(p1, p2, p3));
    }

    const { mean: meanSide, cv: sideCV } = getMeanAndCV(sideLengths);
    const fitError = computePolygonFitError(resampled, refined, bbox.diagonal);
    const baseConf = Math.max(0, Math.min(1, 1 - fitError / CONSTANTS.FIT_ERROR_DIVISOR));
    const regularity = Math.max(0.5, Math.min(1.0, 1.0 - sideCV * 0.5));
    const confidence = baseConf * regularity;

    const isSelfIntersecting = isPolygonSelfIntersecting(refined);

    // Classification per k
    if (k === 3 && !isSelfIntersecting) {
      const hasRightAngle = angles.some((a) => Math.abs(a - 90) <= 10);
      if (hasRightAngle) {
        candidates.push({
          kind: 'right_triangle',
          confidence: confidence * 0.98,
          fitError,
          geometry: { type: 'polygon', points: refined },
        });
      }
      candidates.push({
        kind: 'triangle',
        confidence,
        fitError,
        geometry: { type: 'polygon', points: refined },
      });
      break; // Found primary polygon simplification
    } else if (k === 4 && !isSelfIntersecting) {
      const s0 = sideLengths[0];
      const s1 = sideLengths[1];
      const s2 = sideLengths[2];
      const s3 = sideLengths[3];
      const oppEqual =
        Math.abs(s0 - s2) / Math.max((s0 + s2) / 2, 0.001) <= 0.15 &&
        Math.abs(s1 - s3) / Math.max((s1 + s3) / 2, 0.001) <= 0.15;
      const allSidesEqual = (Math.max(s0, s1, s2, s3) - Math.min(s0, s1, s2, s3)) / meanSide <= 0.15;
      const all90 = angles.every((a) => Math.abs(a - 90) <= 14);

      let quadKind: ShapeKind = 'rect';
      if (allSidesEqual && all90) {
        quadKind = 'square';
      } else if (oppEqual && all90) {
        quadKind = 'rect';
      } else if (allSidesEqual && !all90) {
        quadKind = 'rhombus';
      }

      // Check axis snapping for rect / square
      let finalPoints = refined;
      if ((quadKind === 'rect' || quadKind === 'square') && snapAngleDeg > 0) {
        const edgeAngle = (Math.atan2(refined[1].y - refined[0].y, refined[1].x - refined[0].x) * 180) / Math.PI;
        if (isNearAxis(edgeAngle, snapAngleDeg)) {
          // Snap to axis-aligned rectangle
          const polyBBox = computeBBox(refined);
          if (quadKind === 'square') {
            const side = (polyBBox.width + polyBBox.height) / 2;
            const cx = polyBBox.centerX;
            const cy = polyBBox.centerY;
            finalPoints = [
              { x: cx - side / 2, y: cy - side / 2 },
              { x: cx + side / 2, y: cy - side / 2 },
              { x: cx + side / 2, y: cy + side / 2 },
              { x: cx - side / 2, y: cy + side / 2 },
            ];
          } else {
            finalPoints = [
              { x: polyBBox.minX, y: polyBBox.minY },
              { x: polyBBox.maxX, y: polyBBox.minY },
              { x: polyBBox.maxX, y: polyBBox.maxY },
              { x: polyBBox.minX, y: polyBBox.maxY },
            ];
          }
        }
      }

      candidates.push({
        kind: quadKind,
        confidence,
        fitError,
        geometry: { type: 'polygon', points: finalPoints },
      });
      break;
    } else if (k === 5 && !isSelfIntersecting && sideCV <= 0.25) {
      candidates.push({
        kind: 'pentagon',
        confidence,
        fitError,
        geometry: { type: 'polygon', points: refined },
      });
      break;
    } else if (k === 6 && !isSelfIntersecting && sideCV <= 0.25) {
      candidates.push({
        kind: 'hexagon',
        confidence,
        fitError,
        geometry: { type: 'polygon', points: refined },
      });
      break;
    } else if (k === 10) {
      // Star detection: alternating radii from centroid
      const centroid: Pt = { x: bbox.centerX, y: bbox.centerY };
      const radii = refined.map((p) => ptDistance(p, centroid));
      const r1 = radii.filter((_, idx) => idx % 2 === 0);
      const r2 = radii.filter((_, idx) => idx % 2 === 1);
      const meanR1 = r1.reduce((a, b) => a + b, 0) / r1.length;
      const meanR2 = r2.reduce((a, b) => a + b, 0) / r2.length;
      const minR = Math.min(meanR1, meanR2);
      const maxR = Math.max(meanR1, meanR2);
      const starRatio = maxR > 0 ? minR / maxR : 0;

      if (starRatio >= 0.30 && starRatio <= 0.65) {
        candidates.push({
          kind: 'star',
          confidence: Math.max(0.60, confidence),
          fitError,
          geometry: { type: 'polygon', points: refined },
        });
        break;
      }
    }
  }

  return finalizeDecision(candidates, 'Closed stroke');
}

/** Finalize recognition candidate ranking, decision, and diagnostic reason */
function finalizeDecision(candidates: ShapeCandidate[], strokeType: string): RecognizeResult {
  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    return {
      decision: 'keep',
      best: null,
      candidates: [],
      reason: `${strokeType}: No matching geometric model`,
    };
  }

  const best = candidates[0];
  const second = candidates.length > 1 ? candidates[1] : null;

  let decision: 'snap' | 'suggest' | 'keep' = 'keep';
  let reason = '';

  const margin = second ? best.confidence - second.confidence : 1.0;

  if (best.confidence >= CONSTANTS.DECISION_SNAP_MIN_CONF && margin >= CONSTANTS.DECISION_SNAP_MARGIN) {
    decision = 'snap';
    reason = `Snap: Best candidate '${best.kind}' conf=${best.confidence.toFixed(2)} (margin=${margin.toFixed(2)})`;
  } else if (best.confidence >= CONSTANTS.DECISION_SUGGEST_MIN_CONF) {
    decision = 'suggest';
    reason = `Suggest: Candidate '${best.kind}' conf=${best.confidence.toFixed(2)} below snap threshold or margin`;
  } else {
    decision = 'keep';
    reason = `Keep: Best candidate '${best.kind}' conf=${best.confidence.toFixed(2)} below suggest threshold`;
  }

  return {
    decision,
    best,
    candidates,
    reason,
  };
}
