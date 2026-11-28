/**
 * resizeHandles.ts
 * Pure arithmetic helpers for shape-matched selection outlines, direct corner/vertex dragging,
 * and double-click vertex insertion on 2D whiteboard objects.
 * Zero Konva/DOM dependencies.
 */

import {
  localToWorld,
  resizeWithPinnedAnchor,
  computeRotationAngle,
  getRotationHandleWorldPos,
  type BoardObject,
  type CanonicalTransform,
  type BoxHandleKind,
} from '@ai-classroom/whiteboard-core';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ResizeHandleKind =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'
  | `v:${number}`
  | `seg:${number}:${number}`;

export interface HandlePoint {
  kind: ResizeHandleKind;
  x: number;
  y: number;
}

/**
 * Extracts exact flat vertex array [x0, y0, x1, y1, ...] for polygonal shapes.
 * Returns null for non-polygonal shapes (circle, ellipse, text, viz_*).
 */
export function getShapeVertices(obj: BoardObject): number[] | null {
  const p = obj.props as Record<string, unknown>;
  if (Array.isArray(p.multiSegments) && p.multiSegments.length > 0) {
    return null;
  }
  if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
    return p.customPoints as number[];
  }

  switch (obj.object_type) {
    case 'rect': {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      return [x, y, x + w, y, x + w, y + h, x, y + h];
    }
    case 'triangle':
      return [
        Number(p.x1 ?? 0), Number(p.y1 ?? 0),
        Number(p.x2 ?? 50), Number(p.y2 ?? 80),
        Number(p.x3 ?? 100), Number(p.y3 ?? 0),
      ];
    case 'rhombus': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      return [cx, cy - ry, cx + rx, cy, cx, cy + ry, cx - rx, cy];
    }
    case 'trapezoid': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const bottomW = Number(p.bottomW ?? p.w ?? 120);
      const topW = Number(p.topW ?? bottomW * 0.6);
      const h = Number(p.h ?? 80);
      return [
        cx - topW / 2, cy - h / 2,
        cx + topW / 2, cy - h / 2,
        cx + bottomW / 2, cy + h / 2,
        cx - bottomW / 2, cy + h / 2,
      ];
    }
    case 'parallelogram': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? 120);
      const h = Number(p.h ?? 70);
      const skew = Number(p.skew ?? 24);
      return [
        cx - w / 2 + skew, cy - h / 2,
        cx + w / 2, cy - h / 2,
        cx + w / 2 - skew, cy + h / 2,
        cx - w / 2, cy + h / 2,
      ];
    }
    case 'kite': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? 90);
      const h = Number(p.h ?? 120);
      return [
        cx, cy - h / 2,
        cx + w / 2, cy - h * 0.12,
        cx, cy + h / 2,
        cx - w / 2, cy - h * 0.12,
      ];
    }
    case 'pentagon':
    case 'hexagon':
    case 'polygon': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      const sides =
        obj.object_type === 'pentagon'
          ? 5
          : obj.object_type === 'hexagon'
          ? 6
          : Number(p.sides ?? 6);
      const pts: number[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return pts;
    }
    case 'star': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? p.r ?? 45);
      const innerR = Number(p.innerR ?? outerR / 2.2);
      const points = Number(p.points ?? 5);
      const pts: number[] = [];
      const step = Math.PI / points;
      for (let i = 0; i < 2 * points; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const angle = i * step - Math.PI / 2;
        pts.push(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
      }
      return pts;
    }
    default:
      return null;
  }
}

export function getResizeHandles(bbox: BBox): HandlePoint[] {
  const { x, y, w, h } = bbox;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    { kind: 'nw', x, y },
    { kind: 'n', x: cx, y },
    { kind: 'ne', x: x + w, y },
    { kind: 'e', x: x + w, y: cy },
    { kind: 'se', x: x + w, y: y + h },
    { kind: 's', x: cx, y: y + h },
    { kind: 'sw', x, y: y + h },
    { kind: 'w', x, y: cy },
  ];
}

/**
 * Returns shape-matched handles:
 * - Custom polygons / triangles / pentagons / hexagons / rhombus / star -> handle on EVERY vertex
 * - Circle / Ellipse -> 4 cardinal handles right on the perimeter
 * - Line / Arrow -> 2 endpoint handles
 * - Rect -> 4 corners + 4 edge midpoints
 */
export function getShapeHandles(obj: BoardObject, bbox: BBox, scale = 1): HandlePoint[] {
  const p = obj.props as Record<string, unknown>;
  const rot = Number(p.rotation ?? 0);
  const tf: CanonicalTransform = {
    cx: bbox.x + bbox.w / 2,
    cy: bbox.y + bbox.h / 2,
    width: Math.max(10, bbox.w),
    height: Math.max(10, bbox.h),
    rotation: Number.isFinite(rot) ? rot : 0,
  };

  const applyRot = (handles: HandlePoint[]): HandlePoint[] => {
    const transformed =
      Math.abs(tf.rotation) > 1e-4
        ? handles.map((h) => {
            const world = localToWorld({ x: h.x - tf.cx, y: h.y - tf.cy }, tf);
            return { kind: h.kind, x: world.x, y: world.y };
          })
        : handles;

    // Add rotation lollipop handle for 2D shapes (not line/arrow/viz_*)
    if (
      obj.object_type !== 'line' &&
      obj.object_type !== 'arrow' &&
      obj.object_type !== 'viz_solid' &&
      obj.object_type !== 'viz_graph' &&
      obj.object_type !== 'math_block'
    ) {
      const rotPos = getRotationHandleWorldPos(tf, scale, 28);
      transformed.push({ kind: 'rotate', x: rotPos.x, y: rotPos.y });
    }
    return transformed;
  };

  if (Array.isArray(p.multiSegments) && p.multiSegments.length > 0) {
    const segs = p.multiSegments as number[][];
    const activeSegIdx = typeof p.activeSegmentIndex === 'number' ? p.activeSegmentIndex : -1;
    if (activeSegIdx >= 0 && activeSegIdx < segs.length) {
      const seg = segs[activeSegIdx];
      if (Array.isArray(seg) && seg.length >= 4) {
        const lastPtIdx = Math.floor(seg.length / 2) - 1;
        return [
          { kind: `seg:${activeSegIdx}:0`, x: seg[0], y: seg[1] },
          { kind: `seg:${activeSegIdx}:${lastPtIdx}`, x: seg[lastPtIdx * 2], y: seg[lastPtIdx * 2 + 1] },
        ];
      }
    }
    return applyRot(getResizeHandles(bbox));
  }

  if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
    const pts = p.customPoints as number[];
    const handles: HandlePoint[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      handles.push({ kind: `v:${i / 2}`, x: pts[i], y: pts[i + 1] });
    }
    return applyRot(handles);
  }

  if (obj.object_type === 'circle' || obj.object_type === 'ellipse') {
    const cx = bbox.x + bbox.w / 2;
    const cy = bbox.y + bbox.h / 2;
    return applyRot([
      { kind: 'n', x: cx, y: bbox.y },
      { kind: 'e', x: bbox.x + bbox.w, y: cy },
      { kind: 's', x: cx, y: bbox.y + bbox.h },
      { kind: 'w', x: bbox.x, y: cy },
    ]);
  }

  if (obj.object_type === 'line' || obj.object_type === 'arrow') {
    return [
      { kind: 'nw', x: Number(p.x1 ?? bbox.x), y: Number(p.y1 ?? bbox.y) },
      { kind: 'se', x: Number(p.x2 ?? bbox.x + bbox.w), y: Number(p.y2 ?? bbox.y + bbox.h) },
    ];
  }

  if (
    obj.object_type === 'triangle' ||
    obj.object_type === 'rhombus' ||
    obj.object_type === 'trapezoid' ||
    obj.object_type === 'parallelogram' ||
    obj.object_type === 'kite' ||
    obj.object_type === 'pentagon' ||
    obj.object_type === 'hexagon' ||
    obj.object_type === 'polygon' ||
    obj.object_type === 'star'
  ) {
    const verts = getShapeVertices(obj);
    if (verts) {
      const handles: HandlePoint[] = [];
      for (let i = 0; i < verts.length; i += 2) {
        handles.push({ kind: `v:${i / 2}`, x: verts[i], y: verts[i + 1] });
      }
      return applyRot(handles);
    }
  }

  return applyRot(getResizeHandles(bbox));
}

export function findHitResizeHandle(
  pos: { x: number; y: number },
  bbox: BBox,
  scale = 1,
  obj?: BoardObject
): ResizeHandleKind | null {
  const tol = Math.max(10, 14 / (scale || 1));
  const handles = obj ? getShapeHandles(obj, bbox, scale) : getResizeHandles(bbox);
  for (const h of handles) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= tol) {
      return h.kind;
    }
  }
  return null;
}

/**
 * Inserts a new draggable vertex at `pos` on the nearest edge of a polygonal shape
 * (triggered when the user double-clicks a corner or edge of a selected shape).
 */
export function insertVertexAtPoint(
  obj: BoardObject,
  pos: { x: number; y: number }
): Record<string, unknown> | null {
  const verts = getShapeVertices(obj);
  if (!verts || verts.length < 6) return null;

  const n = verts.length / 2;
  let bestEdgeIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < n; i++) {
    const x1 = verts[i * 2];
    const y1 = verts[i * 2 + 1];
    const nextI = (i + 1) % n;
    const x2 = verts[nextI * 2];
    const y2 = verts[nextI * 2 + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 1e-6) {
      t = Math.max(0, Math.min(1, ((pos.x - x1) * dx + (pos.y - y1) * dy) / lenSq));
    }
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const dist = Math.hypot(pos.x - px, pos.y - py);
    if (dist < bestDist) {
      bestDist = dist;
      bestEdgeIdx = i;
    }
  }

  // Insert new point right after bestEdgeIdx (if clicked right on a corner, nudge slightly so it's immediately grabbable)
  const vx = verts[bestEdgeIdx * 2];
  const vy = verts[bestEdgeIdx * 2 + 1];
  const nextI = (bestEdgeIdx + 1) % n;
  const nx = verts[nextI * 2];
  const ny = verts[nextI * 2 + 1];

  const tooCloseToCorner =
    Math.hypot(pos.x - vx, pos.y - vy) < 8 || Math.hypot(pos.x - nx, pos.y - ny) < 8;
  const insertX = tooCloseToCorner ? (vx + nx) / 2 : pos.x;
  const insertY = tooCloseToCorner ? (vy + ny) / 2 : pos.y;

  const nextVerts = [...verts];
  nextVerts.splice((bestEdgeIdx + 1) * 2, 0, Math.round(insertX), Math.round(insertY));

  return {
    ...(obj.props as Record<string, unknown>),
    customPoints: nextVerts,
  };
}

/**
 * Computes new object props when dragging one of the shape handles (corner, edge, or individual vertex).
 */
export function computeResizedProps(
  obj: BoardObject,
  handle: ResizeHandleKind,
  origBBox: BBox,
  origProps: Record<string, unknown>,
  pos: { x: number; y: number },
  shiftKey = false
): Record<string, unknown> {
  // Rotation handle dragging
  if (handle === 'rotate') {
    const center = { x: origBBox.x + origBBox.w / 2, y: origBBox.y + origBBox.h / 2 };
    const nextRot = computeRotationAngle(center, pos, shiftKey);
    return { ...origProps, rotation: nextRot };
  }

  // Individual segment endpoint dragging inside a grouped multiSegments object (seg:<segIdx>:<ptIdx>)
  if (handle.startsWith('seg:') && Array.isArray(origProps.multiSegments)) {
    const [, segIdxStr, ptIdxStr] = handle.split(':');
    const segIdx = Number(segIdxStr);
    const ptIdx = Number(ptIdxStr);
    const segs = origProps.multiSegments as number[][];
    if (segIdx >= 0 && segIdx < segs.length && segs[segIdx] && ptIdx * 2 + 1 < segs[segIdx].length) {
      let nx = pos.x;
      let ny = pos.y;

      // 1. Magnetic snap (10px) to any other vertex in the same grouped shape (perfect cube corners!)
      let bestDist = 10;
      for (let si = 0; si < segs.length; si++) {
        const s = segs[si];
        if (!Array.isArray(s)) continue;
        for (let pi = 0; pi < s.length - 1; pi += 2) {
          if (si === segIdx && pi / 2 === ptIdx) continue;
          const d = Math.hypot(nx - s[pi], ny - s[pi + 1]);
          if (d < bestDist) {
            bestDist = d;
            nx = s[pi];
            ny = s[pi + 1];
          }
        }
      }

      // 2. Auto-straighten horizontal / vertical within ±6px of the other endpoint of this segment
      const otherPtIdx = ptIdx === 0 ? Math.floor(segs[segIdx].length / 2) - 1 : 0;
      const ox = segs[segIdx][otherPtIdx * 2];
      const oy = segs[segIdx][otherPtIdx * 2 + 1];
      if (bestDist >= 10) {
        if (Math.abs(ny - oy) <= 6) ny = oy;
        else if (Math.abs(nx - ox) <= 6) nx = ox;
      }

      const nextSegs = segs.map((s, si) => {
        if (si !== segIdx) return s;
        const copy = [...s];
        copy[ptIdx * 2] = Math.round(nx);
        copy[ptIdx * 2 + 1] = Math.round(ny);
        return copy;
      });

      let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
      for (const s of nextSegs) {
        for (let i = 0; i < s.length - 1; i += 2) {
          if (s[i] < bMinX) bMinX = s[i];
          if (s[i] > bMaxX) bMaxX = s[i];
          if (s[i + 1] < bMinY) bMinY = s[i + 1];
          if (s[i + 1] > bMaxY) bMaxY = s[i + 1];
        }
      }
      const bw = Math.max(12, Math.round(bMaxX - bMinX));
      const bh = Math.max(12, Math.round(bMaxY - bMinY));
      return {
        ...origProps,
        multiSegments: nextSegs,
        x: Math.round(bMinX),
        y: Math.round(bMinY),
        w: bw,
        h: bh,
        cx: Math.round(bMinX + bw / 2),
        cy: Math.round(bMinY + bh / 2),
      };
    }
    return origProps;
  }

  // Individual vertex dragging (v:0, v:1, ...)
  if (handle.startsWith('v:')) {
    const idx = Number(handle.slice(2));
    if (obj.object_type === 'triangle' && !Array.isArray(origProps.customPoints)) {
      if (idx === 0) return { ...origProps, x1: pos.x, y1: pos.y };
      if (idx === 1) return { ...origProps, x2: pos.x, y2: pos.y };
      if (idx === 2) return { ...origProps, x3: pos.x, y3: pos.y };
    }
    const baseVerts = getShapeVertices({ ...obj, props: origProps });
    if (baseVerts && idx * 2 + 1 < baseVerts.length) {
      const updated = [...baseVerts];
      updated[idx * 2] = pos.x;
      updated[idx * 2 + 1] = pos.y;
      return { ...origProps, customPoints: updated };
    }
    return origProps;
  }

  const rot = Number(origProps.rotation ?? 0);
  let minX = origBBox.x;
  let minY = origBBox.y;
  let maxX = origBBox.x + origBBox.w;
  let maxY = origBBox.y + origBBox.h;
  let newW: number;
  let newH: number;
  let newCx: number;
  let newCy: number;

  if (Math.abs(rot) > 1e-4) {
    // Pinned-anchor OBB resize so rotated shapes never slide!
    const origTf: CanonicalTransform = {
      cx: origBBox.x + origBBox.w / 2,
      cy: origBBox.y + origBBox.h / 2,
      width: Math.max(12, origBBox.w),
      height: Math.max(12, origBBox.h),
      rotation: rot,
    };
    const nextTf = resizeWithPinnedAnchor(origTf, handle as BoxHandleKind, pos, 12);
    newW = nextTf.width;
    newH = nextTf.height;
    newCx = nextTf.cx;
    newCy = nextTf.cy;
    minX = newCx - newW / 2;
    minY = newCy - newH / 2;
  } else {
    if (handle.includes('w')) minX = Math.min(maxX - 12, pos.x);
    if (handle.includes('e')) maxX = Math.max(minX + 12, pos.x);
    if (handle.includes('n')) minY = Math.min(maxY - 12, pos.y);
    if (handle.includes('s')) maxY = Math.max(minY + 12, pos.y);
    newW = Math.max(12, maxX - minX);
    newH = Math.max(12, maxY - minY);
    newCx = minX + newW / 2;
    newCy = minY + newH / 2;
  }

  if (Array.isArray(origProps.multiSegments) && origProps.multiSegments.length > 0) {
    const oldW = Math.max(1, origBBox.w);
    const oldH = Math.max(1, origBBox.h);
    const sx = newW / oldW;
    const sy = newH / oldH;
    const scaledSegments = (origProps.multiSegments as number[][]).map((seg) =>
      seg.map((v, i) =>
        i % 2 === 0
          ? minX + (v - origBBox.x) * sx
          : minY + (v - origBBox.y) * sy,
      ),
    );
    return {
      ...origProps,
      multiSegments: scaledSegments,
      x: minX,
      y: minY,
      w: newW,
      h: newH,
      cx: newCx,
      cy: newCy,
      r: Math.max(8, Math.max(newW, newH) / 2),
    };
  }

  switch (obj.object_type) {
    case 'rect':
    case 'viz_solid':
    case 'viz_graph':
    case 'math_block':
      return { ...origProps, x: minX, y: minY, w: newW, h: newH };

    case 'circle': {
      const r = Math.max(8, Math.max(newW, newH) / 2);
      return { ...origProps, x: newCx, y: newCy, r };
    }

    case 'ellipse':
    case 'rhombus':
      return { ...origProps, cx: newCx, cy: newCy, rx: newW / 2, ry: newH / 2 };

    case 'polygon':
    case 'pentagon':
    case 'hexagon': {
      const r = Math.max(8, Math.max(newW, newH) / 2);
      return { ...origProps, cx: newCx, cy: newCy, r };
    }

    case 'star': {
      const outerR = Math.max(10, Math.max(newW, newH) / 2);
      return { ...origProps, cx: newCx, cy: newCy, outerR, innerR: outerR / 2.2 };
    }

    case 'line':
    case 'arrow': {
      if (handle === 'nw' || handle === 'w' || handle === 'n') {
        return { ...origProps, x1: pos.x, y1: pos.y };
      }
      return { ...origProps, x2: pos.x, y2: pos.y };
    }

    default:
      return origProps;
  }
}
