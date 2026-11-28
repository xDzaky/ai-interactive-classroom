/**
 * Datar -> Ruang (Universal 2D Shape to 3D Solid Proposal) — @ai-classroom/web
 * Supports 100% of 2D shapes: rect, circle, ellipse, triangle, rhombus, trapezoid,
 * parallelogram, kite, pentagon, hexagon, regular n-gon, star, and customPoints!
 * Grid scale convention: 20 world units = 1 cm.
 */
import type { SolidType, SolidParams } from '@ai-classroom/geometry-core';
import { normalizeProfile2D } from '@ai-classroom/geometry-core';
import { getShapeVertices } from './resizeHandles';
import { getCachedPlanarRegions } from './regionPartition';
import type { Custom3DSurfaceSpec } from './custom3DSurface';
import type { BoardObject } from '@ai-classroom/whiteboard-core';

export const WORLD_UNITS_PER_CM = 20;

export type ExtendedSolidKind =
  | SolidType
  | 'prism_n'
  | 'pyramid_n'
  | 'frustum'
  | 'tetrahedron'
  | 'octahedron'
  | 'icosahedron'
  | 'ellipsoid'
  | 'hemisphere'
  | 'custom_prism'
  | 'custom_pyramid'
  | 'custom_colored_extrude'
  | 'surface_3d';

export interface SolidProposal {
  id: string;
  solidType: SolidType;
  /** Optional extended geometry kind (e.g. custom_prism, ellipsoid, frustum, prism_n) */
  extendedKind?: ExtendedSolidKind;
  /** Optional normalized 2D profile in cm for custom extrude/taper */
  profilePointsCm?: [number, number][];
  /** Optional extra parameters (sides, topScale, rx, ry, rz, height, formula3d) */
  extraParams?: Record<string, unknown>;
  title: string;
  description: string;
  params: SolidParams;
  position: { x: number; y: number };
}

export interface Input2DShape {
  id: string;
  object_type: string;
  props: Record<string, unknown>;
}

function round1(n: number): number {
  return Math.max(0.5, Math.round(n * 10) / 10);
}

/**
 * Extracts a serializable Custom3DSurfaceSpec from a merged multiSegments object OR a colored 2D shape
 * so its exact per-region colors and divider lines are preserved on the generated 3D solid.
 */
export function extractCustom3DSurface(shape: Input2DShape): Custom3DSurfaceSpec | null {
  const { props } = shape;
  const strokeColor = typeof props.stroke === 'string' ? props.stroke : '#0f172a';
  const strokeWidth = typeof props.strokeWidth === 'number' ? props.strokeWidth : 3;

  if (Array.isArray(props.multiSegments) && props.multiSegments.length > 0) {
    const segs = props.multiSegments as number[][];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const seg of segs) {
      for (let i = 0; i < seg.length - 1; i += 2) {
        if (seg[i] < minX) minX = seg[i];
        if (seg[i] > maxX) maxX = seg[i];
        if (seg[i + 1] < minY) minY = seg[i + 1];
        if (seg[i + 1] > maxY) maxY = seg[i + 1];
      }
    }
    if (!isFinite(minX)) return null;
    const w = Math.max(20, maxX - minX);
    const h = Math.max(20, maxY - minY);
    const rf =
      typeof props.regionFills === 'object' && props.regionFills !== null
        ? (props.regionFills as Record<string, string>)
        : {};
    const regions = getCachedPlanarRegions(segs).map((r) => ({
      points: r.points,
      color: rf[String(r.index)] ?? '#f8fafc',
    }));
    // Detect whether the merged composite silhouette is circular/elliptical vs polygonal
    const groupedItems = Array.isArray(props.groupedItems)
      ? (props.groupedItems as Array<{ kind?: string; object_type?: string }>)
      : [];
    const hasCircleSource = groupedItems.some(
      (it) => it.kind === 'object' && (it.object_type === 'circle' || it.object_type === 'ellipse'),
    );
    const hasCirclePolyline = segs.some((s) => s.length >= 48);
    const isCircular = hasCircleSource || hasCirclePolyline;

    return {
      bbox: { x: minX, y: minY, w, h },
      strokeColor,
      strokeWidth,
      isCircular,
      segments: segs,
      regions,
    };
  }

  const fillColor = typeof props.fill === 'string' && props.fill !== '' && props.fill !== 'transparent'
    ? props.fill
    : undefined;
  if (!fillColor) return null;

  const size = computeShape2DBBoxSize(shape);
  const bx = Number(props.x ?? (typeof props.cx === 'number' ? props.cx - size.w / 2 : 0));
  const by = Number(props.y ?? (typeof props.cy === 'number' ? props.cy - size.h / 2 : 0));
  return {
    bbox: { x: bx, y: by, w: size.w, h: size.h },
    strokeColor,
    strokeWidth,
    fillColor,
    segments: [],
    regions: [],
  };
}

/**
 * Proposes 3D solids derived from ANY recognized 2D shape.
 * Zero errors for polygons, ellipses, trapezoids, kites, stars, multiSegments colored shapes, or custom vertex shapes.
 */
export function proposeSolidsFromShape(shape: Input2DShape): SolidProposal[] {
  const { object_type, props } = shape;
  const proposals: SolidProposal[] = [];

  // 0. Merged / Divided Colored 2D Object (multiSegments — e.g. 1/2, 2/4, 4/8 colored circle OR split square/rect!)
  if (Array.isArray(props.multiSegments) && (props.multiSegments as number[][]).length > 0) {
    const customSurface = extractCustom3DSurface(shape);
    if (customSurface) {
      const cx = customSurface.bbox.x + customSurface.bbox.w / 2;
      const cy = customSurface.bbox.y + customSurface.bbox.h / 2;
      const wCm = round1(customSurface.bbox.w / WORLD_UNITS_PER_CM);
      const hCm = round1(customSurface.bbox.h / WORLD_UNITS_PER_CM);
      const rCm = round1(Math.max(wCm, hCm) / 2);

      if (customSurface.isCircular) {
        proposals.push(
          {
            id: 'colored_cylinder_3d',
            solidType: 'prism',
            extendedKind: 'custom_colored_extrude',
            extraParams: { customSurface, height: round1(rCm * 1.4), depthWorld: 1.8 },
            title: 'Tabung 3D Berwarna (Sesuai Potongan)',
            description: `Tabung 3D mempertahankan ${customSurface.regions.length} bagian warna & garis pembagi`,
            params: { type: 'prism', a: rCm, b: rCm, c: rCm, h: round1(rCm * 1.4) },
            position: { x: cx, y: cy },
          },
          {
            id: 'colored_sphere_3d',
            solidType: 'sphere',
            extendedKind: 'sphere',
            extraParams: { customSurface },
            title: 'Bola 3D Berwarna',
            description: `Bola jari-jari ${rCm} cm dengan belahan warna & garis custom`,
            params: { type: 'sphere', r: rCm },
            position: { x: cx, y: cy },
          },
          {
            id: 'colored_cone_3d',
            solidType: 'cone',
            extendedKind: 'cone',
            extraParams: { customSurface },
            title: 'Kerucut 3D Berwarna',
            description: `Kerucut jari-jari ${rCm} cm dengan warna & garis custom`,
            params: { type: 'cone', r: rCm, h: round1(rCm * 2) },
            position: { x: cx, y: cy },
          },
        );
      } else {
        // Polygonal / Square / Rectangle composite -> ONLY matching cuboid/prism 3D solids (NEVER Bola/Kerucut!)
        const isSquareLike = Math.abs(wCm - hCm) <= Math.max(wCm, hCm) * 0.2;
        proposals.push(
          {
            id: 'colored_cuboid_3d',
            solidType: 'prism',
            extendedKind: 'custom_colored_extrude',
            extraParams: { customSurface, height: hCm, depthWorld: isSquareLike ? 2.6 : 1.9 },
            title: isSquareLike ? 'Kubus 3D Berwarna (Sesuai Garis & Warna)' : 'Balok 3D Berwarna (Sesuai Garis & Warna)',
            description: `Mempertahankan ${customSurface.regions.length} bagian warna & garis pembagi custom`,
            params: { type: 'prism', a: wCm, b: hCm, c: wCm, h: hCm },
            position: { x: cx, y: cy },
          },
          {
            id: 'colored_prism_thin_3d',
            solidType: 'prism',
            extendedKind: 'custom_colored_extrude',
            extraParams: { customSurface, height: round1(hCm * 0.5), depthWorld: 1.1 },
            title: 'Prisma / Lempeng 3D Berwarna',
            description: `Prisma tipis mempertahankan ${customSurface.regions.length} bidang warna & garis`,
            params: { type: 'prism', a: wCm, b: hCm, c: wCm, h: round1(hCm * 0.5) },
            position: { x: cx, y: cy },
          },
        );
      }
      return proposals;
    }
  }

  // 1. Custom-vertex edited shapes or arbitrary polygons (trapezoid, parallelogram, kite, rhombus, pentagon, hexagon, polygon, star)
  const hasCustomPoints = Array.isArray(props.customPoints) && (props.customPoints as number[]).length >= 6;
  const isPolyType = [
    'rhombus',
    'trapezoid',
    'parallelogram',
    'kite',
    'pentagon',
    'hexagon',
    'polygon',
    'star',
  ].includes(object_type);

  if (hasCustomPoints || isPolyType) {
    const fakeObj = { id: shape.id, object_type, props, created_at: 0, updated_at: 0 } as BoardObject;
    const verts = getShapeVertices(fakeObj);
    if (verts && verts.length >= 6) {
      const profilePx = normalizeProfile2D(verts, false);
      const cx = profilePx.centroid[0];
      const cy = profilePx.centroid[1];
      const centeredCm: [number, number][] = profilePx.points.map(([x, y]) => [
        (x - cx) / WORLD_UNITS_PER_CM,
        (y - cy) / WORLD_UNITS_PER_CM,
      ]);
      const nSides = centeredCm.length;
      const defaultH = round1(Math.max(profilePx.bbox.width, profilePx.bbox.height) / WORLD_UNITS_PER_CM * 0.85);
      const baseR = round1(Math.max(profilePx.bbox.width, profilePx.bbox.height) / (2 * WORLD_UNITS_PER_CM));

      proposals.push(
        {
          id: 'custom_prism',
          solidType: 'prism',
          extendedKind: 'custom_prism',
          profilePointsCm: centeredCm,
          extraParams: { height: defaultH, sides: nSides },
          title: `Prisma Segi-${nSides}`,
          description: `Prisma tegak alas ${nSides} sisi persis bentuk 2D, tinggi ${defaultH} cm`,
          params: { type: 'prism', a: baseR * 1.5, b: baseR * 1.5, c: baseR * 1.5, h: defaultH },
          position: { x: cx, y: cy },
        },
        {
          id: 'custom_pyramid',
          solidType: 'pyramid',
          extendedKind: 'custom_pyramid',
          profilePointsCm: centeredCm,
          extraParams: { height: defaultH, topScale: 0, sides: nSides },
          title: `Limas Segi-${nSides}`,
          description: `Limas alas ${nSides} sisi sesuai bentuk 2D, tinggi ${defaultH} cm`,
          params: { type: 'pyramid', b: baseR * 2, h: defaultH },
          position: { x: cx, y: cy },
        },
        {
          id: 'frustum',
          solidType: 'pyramid',
          extendedKind: 'frustum',
          profilePointsCm: centeredCm,
          extraParams: { height: defaultH, topScale: 0.45, sides: nSides },
          title: `Limas Terpancung (${nSides} sisi)`,
          description: `Frustum alas ${nSides} sisi dengan rasio atas 45%`,
          params: { type: 'pyramid', b: baseR * 2, h: defaultH },
          position: { x: cx, y: cy },
        }
      );
      return proposals;
    }
  }

  if (object_type === 'rect') {
    const wPx = typeof props.w === 'number' ? props.w : 100;
    const hPx = typeof props.h === 'number' ? props.h : 100;
    const x = typeof props.x === 'number' ? props.x : 0;
    const y = typeof props.y === 'number' ? props.y : 0;
    const cx = x + wPx / 2;
    const cy = y + hPx / 2;

    const wCm = round1(wPx / WORLD_UNITS_PER_CM);
    const hCm = round1(hPx / WORLD_UNITS_PER_CM);
    const isSquare = Math.abs(wPx - hPx) < 5;

    if (isSquare) {
      proposals.push({
        id: 'cube',
        solidType: 'cube',
        title: 'Kubus (s × s × s)',
        description: `Kubus dengan rusuk s = ${wCm} cm`,
        params: { type: 'cube', s: wCm },
        position: { x: cx, y: cy },
      });
    }

    const defaultDepth = Math.min(wCm, hCm);
    proposals.push(
      {
        id: 'cuboid',
        solidType: 'cuboid',
        title: 'Balok (p × l × t)',
        description: `Balok panjang ${wCm} cm, lebar ${hCm} cm, tinggi ${defaultDepth} cm`,
        params: { type: 'cuboid', l: wCm, w: hCm, h: defaultDepth },
        position: { x: cx, y: cy },
      },
      {
        id: 'pyramid',
        solidType: 'pyramid',
        title: 'Limas Segi Empat',
        description: `Limas alas ${wCm} cm, tinggi ${round1(wCm * 1.2)} cm`,
        params: { type: 'pyramid', b: wCm, h: round1(wCm * 1.2) },
        position: { x: cx, y: cy },
      }
    );
  } else if (object_type === 'circle') {
    const rPx = typeof props.r === 'number' ? props.r : 50;
    const cx = typeof props.x === 'number' ? props.x : (props.cx as number) ?? 0;
    const cy = typeof props.y === 'number' ? props.y : (props.cy as number) ?? 0;
    const rCm = round1(rPx / WORLD_UNITS_PER_CM);
    const defaultH = round1(rCm * 2);

    proposals.push(
      {
        id: 'cylinder',
        solidType: 'cylinder',
        title: 'Tabung',
        description: `Tabung jari-jari r = ${rCm} cm, tinggi ${defaultH} cm`,
        params: { type: 'cylinder', r: rCm, h: defaultH },
        position: { x: cx, y: cy },
      },
      {
        id: 'cone',
        solidType: 'cone',
        title: 'Kerucut',
        description: `Kerucut jari-jari r = ${rCm} cm, tinggi ${defaultH} cm`,
        params: { type: 'cone', r: rCm, h: defaultH },
        position: { x: cx, y: cy },
      },
      {
        id: 'sphere',
        solidType: 'sphere',
        title: 'Bola',
        description: `Bola pejal jari-jari r = ${rCm} cm`,
        params: { type: 'sphere', r: rCm },
        position: { x: cx, y: cy },
      },
      {
        id: 'hemisphere',
        solidType: 'sphere',
        extendedKind: 'hemisphere',
        extraParams: { r: rCm },
        title: 'Belahan Bola',
        description: `Setengah bola jari-jari r = ${rCm} cm`,
        params: { type: 'sphere', r: rCm },
        position: { x: cx, y: cy },
      }
    );
  } else if (object_type === 'ellipse') {
    const cx = Number(props.cx ?? props.x ?? 0);
    const cy = Number(props.cy ?? props.y ?? 0);
    const rxPx = Number(props.rx ?? (props.w ? Number(props.w) / 2 : 60));
    const ryPx = Number(props.ry ?? (props.h ? Number(props.h) / 2 : 36));
    const rxCm = round1(rxPx / WORLD_UNITS_PER_CM);
    const ryCm = round1(ryPx / WORLD_UNITS_PER_CM);
    const avgR = round1((rxCm + ryCm) / 2);
    const defaultH = round1(Math.max(rxCm, ryCm) * 1.6);

    proposals.push(
      {
        id: 'ellipsoid',
        solidType: 'sphere',
        extendedKind: 'ellipsoid',
        extraParams: { rx: rxCm, ry: ryCm, rz: ryCm },
        title: 'Elipsoid 3D',
        description: `Elipsoid sumbu ${rxCm} × ${ryCm} × ${ryCm} cm (mulus tanpa glitch)`,
        params: { type: 'sphere', r: avgR },
        position: { x: cx, y: cy },
      },
      {
        id: 'cylinder',
        solidType: 'cylinder',
        title: 'Tabung',
        description: `Tabung jari-jari ${avgR} cm, tinggi ${defaultH} cm`,
        params: { type: 'cylinder', r: avgR, h: defaultH },
        position: { x: cx, y: cy },
      },
      {
        id: 'cone',
        solidType: 'cone',
        title: 'Kerucut',
        description: `Kerucut jari-jari ${avgR} cm, tinggi ${defaultH} cm`,
        params: { type: 'cone', r: avgR, h: defaultH },
        position: { x: cx, y: cy },
      }
    );
  } else if (object_type === 'triangle') {
    const x1 = (props.x1 as number) ?? 0;
    const y1 = (props.y1 as number) ?? 0;
    const x2 = (props.x2 as number) ?? 100;
    const y2 = (props.y2 as number) ?? 0;
    const x3 = (props.x3 as number) ?? 50;
    const y3 = (props.y3 as number) ?? 86;

    const sideA = Math.hypot(x2 - x1, y2 - y1) / WORLD_UNITS_PER_CM;
    const sideB = Math.hypot(x3 - x1, y3 - y1) / WORLD_UNITS_PER_CM;
    const sideC = Math.hypot(x3 - x2, y3 - y2) / WORLD_UNITS_PER_CM;

    const aCm = round1(sideA);
    const bCm = round1(sideB);
    const cCm = round1(sideC);
    const defaultH = round1(Math.max(aCm, bCm));

    const cx = (x1 + x2 + x3) / 3;
    const cy = (y1 + y2 + y3) / 3;

    proposals.push(
      {
        id: 'prism',
        solidType: 'prism',
        title: 'Prisma Segitiga',
        description: `Prisma segitiga alas ${aCm} × ${bCm} × ${cCm} cm, tinggi ${defaultH} cm`,
        params: { type: 'prism', a: aCm, b: bCm, c: cCm, h: defaultH },
        position: { x: cx, y: cy },
      },
      {
        id: 'tetrahedron',
        solidType: 'pyramid',
        extendedKind: 'tetrahedron',
        extraParams: { s: aCm },
        title: 'Limas Segitiga (Tetrahedron)',
        description: `Tetrahedron beraturan rusuk ${aCm} cm`,
        params: { type: 'pyramid', b: aCm, h: defaultH },
        position: { x: cx, y: cy },
      }
    );
  }

  // Attach custom fill/stroke surface spec for single colored 2D shapes so their color carries into 3D!
  const singleCustomSurface = extractCustom3DSurface(shape);
  if (singleCustomSurface) {
    return proposals.map((p) => ({
      ...p,
      extraParams: { ...(p.extraParams ?? {}), customSurface: singleCustomSurface },
    }));
  }

  return proposals;
}

/**
 * Computes the exact 2D bounding box (width, height) of an Input2DShape in world units.
 */
function computeShape2DBBoxSize(shape: Input2DShape): { w: number; h: number } {
  const { object_type, props } = shape;
  if (Array.isArray(props.multiSegments) && props.multiSegments.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const seg of props.multiSegments as number[][]) {
      for (let i = 0; i < seg.length - 1; i += 2) {
        if (seg[i] < minX) minX = seg[i];
        if (seg[i] > maxX) maxX = seg[i];
        if (seg[i + 1] < minY) minY = seg[i + 1];
        if (seg[i + 1] > maxY) maxY = seg[i + 1];
      }
    }
    if (isFinite(minX)) {
      return { w: Math.max(40, maxX - minX), h: Math.max(40, maxY - minY) };
    }
  }
  if (object_type === 'rect') {
    return {
      w: Math.max(40, typeof props.w === 'number' ? Math.abs(props.w) : 160),
      h: Math.max(40, typeof props.h === 'number' ? Math.abs(props.h) : 160),
    };
  }
  if (object_type === 'circle') {
    const r = Math.max(20, typeof props.r === 'number' ? props.r : 60);
    return { w: r * 2, h: r * 2 };
  }
  if (object_type === 'ellipse') {
    const rx = Math.max(20, Number(props.rx ?? (props.w ? Number(props.w) / 2 : 60)));
    const ry = Math.max(20, Number(props.ry ?? (props.h ? Number(props.h) / 2 : 45)));
    return { w: rx * 2, h: ry * 2 };
  }
  if (object_type === 'triangle') {
    const xs = [Number(props.x1 ?? 0), Number(props.x2 ?? 100), Number(props.x3 ?? 50)];
    const ys = [Number(props.y1 ?? 0), Number(props.y2 ?? 0), Number(props.y3 ?? 86)];
    return {
      w: Math.max(40, Math.max(...xs) - Math.min(...xs)),
      h: Math.max(40, Math.max(...ys) - Math.min(...ys)),
    };
  }
  const fakeObj = { id: shape.id, object_type, props, created_at: 0, updated_at: 0 } as BoardObject;
  const verts = getShapeVertices(fakeObj);
  if (verts && verts.length >= 6) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < verts.length; i += 2) {
      if (verts[i] < minX) minX = verts[i];
      if (verts[i] > maxX) maxX = verts[i];
      if (verts[i + 1] < minY) minY = verts[i + 1];
      if (verts[i + 1] > maxY) maxY = verts[i + 1];
    }
    return {
      w: Math.max(40, maxX - minX),
      h: Math.max(40, maxY - minY),
    };
  }
  return { w: 200, h: 200 };
}

/**
 * Creates an object.created WhiteboardEvent for replacing a 2D shape with a 3D viz_solid.
 * Centers the 3D widget box EXACTLY on the 2D shape's center (proposal.position) and
 * scales (w, h) proportionally so the rendered 3D solid matches the 2D shape's visual size.
 */
export function createConvertShapeToSolidEvent(
  shape: Input2DShape,
  proposal: SolidProposal,
  _roomId?: string,
  _actorId?: string,
  solidId?: string
) {
  const { w: shapeW, h: shapeH } = computeShape2DBBoxSize(shape);
  // In TongchuangSolidWidget (fov=38, dist~6.4), the 3D mesh fills ~70% of the canvas height.
  // Scaling the container by ~1.42x ensures the 3D solid's on-screen footprint matches the 2D shape.
  const boxH = Math.max(200, Math.min(640, Math.round(shapeH * 1.42)));
  const boxW = Math.max(boxH, Math.min(700, Math.round(shapeW * 1.42)));
  const topLeftX = Math.round(proposal.position.x - boxW / 2);
  const topLeftY = Math.round(proposal.position.y - boxH / 2);

  return {
    event_type: 'object.created' as const,
    payload: {
      id: solidId || `solid-${Date.now()}`,
      object_type: 'viz_solid',
      props: {
        solid_type: proposal.solidType,
        extended_kind: proposal.extendedKind,
        profile_points_cm: proposal.profilePointsCm,
        extra_params: proposal.extraParams,
        params: proposal.params,
        x: topLeftX,
        y: topLeftY,
        w: boxW,
        h: boxH,
        label: proposal.title,
      },
    },
  };
}
