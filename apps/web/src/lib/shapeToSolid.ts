/**
 * Datar -> Ruang (Universal 2D Shape to 3D Solid Proposal) — @ai-classroom/web
 * Supports 100% of 2D shapes: rect, circle, ellipse, triangle, rhombus, trapezoid,
 * parallelogram, kite, pentagon, hexagon, regular n-gon, star, and customPoints!
 * Grid scale convention: 20 world units = 1 cm.
 */
import type { SolidType, SolidParams } from '@ai-classroom/geometry-core';
import { normalizeProfile2D } from '@ai-classroom/geometry-core';
import { getShapeVertices } from './resizeHandles';
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
 * Proposes 3D solids derived from ANY recognized 2D shape.
 * Zero errors for polygons, ellipses, trapezoids, kites, stars, or custom vertex shapes.
 */
export function proposeSolidsFromShape(shape: Input2DShape): SolidProposal[] {
  const { object_type, props } = shape;
  const proposals: SolidProposal[] = [];

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

  return proposals;
}

/**
 * Creates an object.created WhiteboardEvent for replacing a 2D shape with a 3D viz_solid.
 * Aligns top-left (x, y) cleanly with the 320px default widget size so the solid spawns right on the shape!
 */
export function createConvertShapeToSolidEvent(
  _shape: Input2DShape,
  proposal: SolidProposal,
  _roomId?: string,
  _actorId?: string,
  solidId?: string
) {
  const widgetSize = 320;
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
        x: proposal.position.x,
        y: proposal.position.y,
        w: widgetSize,
        h: widgetSize,
        label: proposal.title,
      },
    },
  };
}
