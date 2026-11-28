/**
 * smartSnapPolyline.ts — Auto-Straighten, Magnetic Vertex-Snap & Auto-Connect System
 *
 * Makes sketching 2D/3D geometry (cubes, cuboids, prisms, pyramids, divided polygons)
 * effortless with both the Pen tool and Line tool:
 * 1. Ramer–Douglas–Peucker corner detection + straightness validation (ignores curved handwriting)
 * 2. Horizontal / vertical angle snapping (±12°)
 * 3. Magnetic vertex-snapping (28px) & edge-snapping (14px) to existing shapes on canvas
 * 4. Automatic seamless merging with touched 2D shapes into ONE connected `multiSegments` object
 */
import type { BoardObject, SceneState, WhiteboardEvent } from '@ai-classroom/whiteboard-core';
import { mergeSelectionTo2DShape } from './mergeStrokesToShape';

export interface SnapPt {
  x: number;
  y: number;
}

export interface SceneSnapTarget {
  objectId: string;
  vertices: SnapPt[];
  segments: Array<[SnapPt, SnapPt]>;
}

export interface BeautifiedPolylineResult {
  vertices: SnapPt[];
  segmentCount: number;
  touchedObjectIds: string[];
}

const SNAP_ELIGIBLE_TYPES = new Set([
  'rect',
  'line',
  'arrow',
  'triangle',
  'rhombus',
  'polygon',
  'pentagon',
  'hexagon',
  'trapezoid',
  'parallelogram',
  'kite',
  'circle',
  'ellipse',
]);

function dist(a: SnapPt, b: SnapPt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegDist(p: SnapPt, a: SnapPt, b: SnapPt): { pt: SnapPt; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return { pt: a, dist: dist(p, a) };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const pt = { x: a.x + t * dx, y: a.y + t * dy };
  return { pt, dist: dist(p, pt) };
}

/** Ramer–Douglas–Peucker polyline simplification */
function rdpSimplify(pts: SnapPt[], epsilon: number): SnapPt[] {
  if (pts.length <= 2) return pts;
  const first = pts[0];
  const last = pts[pts.length - 1];
  let maxD = -1;
  let maxIdx = 0;

  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointToSegDist(pts[i], first, last).dist;
    if (d > maxD) {
      maxD = d;
      maxIdx = i;
    }
  }

  if (maxD > epsilon) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(pts.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

/** Extract snap-target vertices and segments from all eligible 2D objects on the scene */
export function extractSceneSnapTargets(scene: SceneState): SceneSnapTarget[] {
  const targets: SceneSnapTarget[] = [];

  for (const obj of Object.values(scene.objects)) {
    if (!SNAP_ELIGIBLE_TYPES.has(obj.object_type)) continue;
    const p = obj.props as Record<string, unknown>;
    const vertices: SnapPt[] = [];
    const segments: Array<[SnapPt, SnapPt]> = [];

    const addPoly = (pts: SnapPt[], closed: boolean) => {
      for (const pt of pts) vertices.push(pt);
      for (let i = 0; i < pts.length - 1; i++) {
        segments.push([pts[i], pts[i + 1]]);
      }
      if (closed && pts.length >= 3) {
        segments.push([pts[pts.length - 1], pts[0]]);
      }
    };

    if (Array.isArray(p.multiSegments) && p.multiSegments.length > 0) {
      for (const flat of p.multiSegments as number[][]) {
        const pts: SnapPt[] = [];
        for (let i = 0; i < flat.length - 1; i += 2) {
          pts.push({ x: flat[i], y: flat[i + 1] });
        }
        if (pts.length >= 2) addPoly(pts, false);
      }
    } else if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
      const flat = p.customPoints as number[];
      const pts: SnapPt[] = [];
      for (let i = 0; i < flat.length - 1; i += 2) {
        pts.push({ x: flat[i], y: flat[i + 1] });
      }
      addPoly(pts, true);
    } else if (obj.object_type === 'rect') {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      addPoly(
        [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ],
        true,
      );
    } else if (obj.object_type === 'line' || obj.object_type === 'arrow') {
      addPoly(
        [
          { x: Number(p.x1 ?? 0), y: Number(p.y1 ?? 0) },
          { x: Number(p.x2 ?? 100), y: Number(p.y2 ?? 100) },
        ],
        false,
      );
    } else if (obj.object_type === 'triangle') {
      addPoly(
        [
          { x: Number(p.x1 ?? 0), y: Number(p.y1 ?? 0) },
          { x: Number(p.x2 ?? 50), y: Number(p.y2 ?? 80) },
          { x: Number(p.x3 ?? 100), y: Number(p.y3 ?? 0) },
        ],
        true,
      );
    } else if (obj.object_type === 'rhombus') {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? 40);
      const ry = Number(p.ry ?? 50);
      addPoly(
        [
          { x: cx, y: cy - ry },
          { x: cx + rx, y: cy },
          { x: cx, y: cy + ry },
          { x: cx - rx, y: cy },
        ],
        true,
      );
    }

    if (vertices.length > 0) {
      targets.push({ objectId: obj.id, vertices, segments });
    }
  }

  return targets;
}

/**
 * Snaps a single point to the nearest existing scene vertex (within vertexRadius)
 * or nearest scene edge (within edgeRadius). Returns the snapped point + touched objectId.
 */
export function snapPointToScene(
  pt: SnapPt,
  targets: SceneSnapTarget[],
  vertexRadius = 28,
  edgeRadius = 14,
): { pt: SnapPt; touchedObjectId: string | null } {
  let bestVDist = vertexRadius;
  let bestVPt: SnapPt | null = null;
  let bestVObj: string | null = null;

  let bestEDist = edgeRadius;
  let bestEPt: SnapPt | null = null;
  let bestEObj: string | null = null;

  for (const t of targets) {
    for (const v of t.vertices) {
      const d = dist(pt, v);
      if (d < bestVDist) {
        bestVDist = d;
        bestVPt = v;
        bestVObj = t.objectId;
      }
    }
    for (const [a, b] of t.segments) {
      const hit = pointToSegDist(pt, a, b);
      if (hit.dist < bestEDist) {
        bestEDist = hit.dist;
        bestEPt = hit.pt;
        bestEObj = t.objectId;
      }
    }
  }

  if (bestVPt) return { pt: { x: bestVPt.x, y: bestVPt.y }, touchedObjectId: bestVObj };
  if (bestEPt) return { pt: bestEPt, touchedObjectId: bestEObj };
  return { pt, touchedObjectId: null };
}

/**
 * Analyzes a raw freehand pen stroke. If it is a straight-edged geometric polyline
 * (1 to 6 straight segments, e.g. cube outer walls, L-corner, straight divider line),
 * straightens all segments, snaps near-horizontal/vertical angles, and magnetically
 * snaps endpoints onto existing shapes in `scene`.
 *
 * Returns null for curved doodles or handwriting so normal writing is never disturbed.
 */
export function beautifyFreehandToSnappedPolyline(
  rawPoints: Array<[number, number, number] | SnapPt>,
  scene: SceneState,
  opts?: { vertexSnapRadius?: number; requireTouchOrMultiSeg?: boolean },
): BeautifiedPolylineResult | null {
  if (rawPoints.length < 2) return null;
  const pts: SnapPt[] = rawPoints.map((p) =>
    Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y },
  );

  // Measure bounding box & total path length
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let pathLen = 0;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].x < minX) minX = pts[i].x;
    if (pts[i].x > maxX) maxX = pts[i].x;
    if (pts[i].y < minY) minY = pts[i].y;
    if (pts[i].y > maxY) maxY = pts[i].y;
    if (i > 0) pathLen += dist(pts[i - 1], pts[i]);
  }
  const diag = Math.hypot(maxX - minX, maxY - minY);
  // Ignore tiny handwriting strokes (< 32px diagonal)
  if (diag < 32 || pathLen < 32) return null;

  // Simplify with RDP to detect genuine geometric corners
  const eps = Math.max(9, Math.min(22, diag * 0.045));
  const simplified = rdpSimplify(pts, eps);
  if (simplified.length < 2 || simplified.length > 7) return null;

  // Verify every simplified segment is genuinely straight (not a curve/loop)
  let segStartIdx = 0;
  for (let s = 0; s < simplified.length - 1; s++) {
    const a = simplified[s];
    const b = simplified[s + 1];
    const segLen = dist(a, b);
    if (segLen < 22) return null; // tiny jitter segment -> likely handwriting

    // Find corresponding index of b in raw pts
    let segEndIdx = segStartIdx + 1;
    while (segEndIdx < pts.length - 1 && dist(pts[segEndIdx], b) > 1e-3) {
      segEndIdx++;
    }

    let sumDev = 0;
    let count = 0;
    let maxDev = 0;
    let subArcLen = 0;
    for (let k = segStartIdx; k <= segEndIdx; k++) {
      const d = pointToSegDist(pts[k], a, b).dist;
      sumDev += d;
      if (d > maxDev) maxDev = d;
      if (k > segStartIdx) subArcLen += dist(pts[k - 1], pts[k]);
      count++;
    }
    const avgDev = count > 0 ? sumDev / count : 0;
    const arcRatio = segLen > 1e-3 ? subArcLen / segLen : 1;
    // Reject smooth curves (like handwriting 'S', '2', '8'): real straight strokes have low avgDev & arcRatio <= 1.055
    if (
      avgDev > Math.max(3.8, segLen * 0.055) ||
      maxDev > Math.max(10, segLen * 0.14) ||
      arcRatio > 1.055
    ) {
      return null; // too curved -> keep as freehand!
    }
    segStartIdx = segEndIdx;
  }

  // Merge nearly-collinear consecutive segments (< 14° bend)
  const cleanVerts: SnapPt[] = [simplified[0]];
  for (let i = 1; i < simplified.length - 1; i++) {
    const prev = cleanVerts[cleanVerts.length - 1];
    const curr = simplified[i];
    const next = simplified[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 > 1e-3 && len2 > 1e-3) {
      const cosA = (v1x * v2x + v1y * v2y) / (len1 * len2);
      if (cosA < Math.cos((14 * Math.PI) / 180)) {
        cleanVerts.push(curr);
      }
    }
  }
  cleanVerts.push(simplified[simplified.length - 1]);

  // Snap endpoints & corners magnetically to existing scene vertices/edges
  const targets = extractSceneSnapTargets(scene);
  const vRad = opts?.vertexSnapRadius ?? 28;
  const touchedSet = new Set<string>();
  const snappedVerts = cleanVerts.map((v, idx) => {
    const isEnd = idx === 0 || idx === cleanVerts.length - 1;
    const res = snapPointToScene(v, targets, isEnd ? vRad : 18, isEnd ? 14 : 10);
    if (res.touchedObjectId) touchedSet.add(res.touchedObjectId);
    return res.pt;
  });

  // Straighten near-horizontal & near-vertical segments (±12°)
  // Keep snapped anchor endpoints fixed; adjust un-snapped intermediate vertices cleanly
  const ANGLE_TOL_RAD = (12 * Math.PI) / 180;
  for (let i = 0; i < snappedVerts.length - 1; i++) {
    const a = snappedVerts[i];
    const b = snappedVerts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const ang = Math.atan2(Math.abs(dy), Math.abs(dx));
    const isLastSnapped = i + 1 === snappedVerts.length - 1 && touchedSet.size > 0;
    if (ang <= ANGLE_TOL_RAD) {
      // Horizontal
      if (isLastSnapped && i > 0) a.y = b.y;
      else b.y = a.y;
    } else if (Math.abs(Math.PI / 2 - ang) <= ANGLE_TOL_RAD) {
      // Vertical
      if (isLastSnapped && i > 0) a.x = b.x;
      else b.x = a.x;
    }
  }

  // Round to clean integer pixels
  const finalVerts = snappedVerts.map((v) => ({ x: Math.round(v.x), y: Math.round(v.y) }));
  const touchedObjectIds = [...touchedSet];

  if (opts?.requireTouchOrMultiSeg && touchedObjectIds.length === 0 && finalVerts.length < 2) {
    return null;
  }

  return {
    vertices: finalVerts,
    segmentCount: finalVerts.length - 1,
    touchedObjectIds,
  };
}

/**
 * Builds the WhiteboardEvent(s) to commit a snapped polyline — and if it touched
 * existing 2D shapes/lines, AUTOMATICALLY merges them into ONE connected object
 * (preserving Undo via a single atomic `batch` event!).
 */
export function buildAutoConnectedPolylineEvent(
  newId: string,
  result: BeautifiedPolylineResult,
  scene: SceneState,
  style: { stroke: string; strokeWidth: number; strokeStyle?: string },
): { event: WhiteboardEvent; finalObjectId: string; autoMerged: boolean } {
  const flatPts = result.vertices.flatMap((v) => [v.x, v.y]);
  const strokeStyle = style.strokeStyle ?? 'solid';

  const tempObj: BoardObject =
    result.segmentCount === 1
      ? {
          id: newId,
          object_type: 'line',
          props: {
            x1: result.vertices[0].x,
            y1: result.vertices[0].y,
            x2: result.vertices[1].x,
            y2: result.vertices[1].y,
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeStyle,
          },
          created_at: Date.now(),
          updated_at: Date.now(),
        }
      : {
          id: newId,
          object_type: 'polygon',
          props: {
            multiSegments: [flatPts],
            multiSegmentStyles: [
              { strokeStyle, stroke: style.stroke, strokeWidth: style.strokeWidth },
            ],
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeStyle,
            fill: 'transparent',
          },
          created_at: Date.now(),
          updated_at: Date.now(),
        };

  // If it snapped onto existing 2D shapes, automatically merge them into ONE unified connected object!
  if (result.touchedObjectIds.length > 0) {
    const tempScene: SceneState = {
      ...scene,
      objects: {
        ...scene.objects,
        [newId]: tempObj,
      },
      order: [...scene.order, newId],
    };
    const merged = mergeSelectionTo2DShape([...result.touchedObjectIds, newId], tempScene);
    if (merged) {
      const mergedId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const events: WhiteboardEvent[] = [];
      for (const oldId of result.touchedObjectIds) {
        events.push({ event_type: 'object.deleted', payload: { id: oldId } });
      }
      events.push({
        event_type: 'object.created',
        payload: {
          id: mergedId,
          object_type: merged.objectType,
          props: merged.props,
        },
      });
      return {
        event: { event_type: 'batch', payload: { events } },
        finalObjectId: mergedId,
        autoMerged: true,
      };
    }
  }

  return {
    event: {
      event_type: 'object.created',
      payload: {
        id: tempObj.id,
        object_type: tempObj.object_type,
        props: tempObj.props,
      },
    },
    finalObjectId: tempObj.id,
    autoMerged: false,
  };
}
