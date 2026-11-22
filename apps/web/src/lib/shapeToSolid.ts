/**
 * Datar -> Ruang (2D Shape to 3D Solid Proposal) — @ai-classroom/web (P11-T08)
 * Pure mapping from recognized 2D shapes to 3D solid construction proposals.
 * Grid scale convention: 20 world units = 1 cm.
 */
import type { SolidType, SolidParams } from '@ai-classroom/geometry-core';

export const WORLD_UNITS_PER_CM = 20;

export interface SolidProposal {
  id: string;
  solidType: SolidType;
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

/**
 * Proposes 3D solids derived from a recognized 2D shape.
 */
export function proposeSolidsFromShape(shape: Input2DShape): SolidProposal[] {
  const { object_type, props } = shape;
  const proposals: SolidProposal[] = [];

  if (object_type === 'rect') {
    const wPx = typeof props.w === 'number' ? props.w : 100;
    const hPx = typeof props.h === 'number' ? props.h : 100;
    const x = typeof props.x === 'number' ? props.x : 0;
    const y = typeof props.y === 'number' ? props.y : 0;
    const cx = x + wPx / 2;
    const cy = y + hPx / 2;

    const wCm = Math.max(1, Math.round((wPx / WORLD_UNITS_PER_CM) * 10) / 10);
    const hCm = Math.max(1, Math.round((hPx / WORLD_UNITS_PER_CM) * 10) / 10);
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
    proposals.push({
      id: 'cuboid',
      solidType: 'cuboid',
      title: 'Balok (p × l × t)',
      description: `Balok panjang ${wCm} cm, lebar ${hCm} cm, tinggi ${defaultDepth} cm`,
      params: { type: 'cuboid', l: wCm, w: hCm, h: defaultDepth },
      position: { x: cx, y: cy },
    });
  } else if (object_type === 'circle') {
    const rPx = typeof props.r === 'number' ? props.r : 50;
    const cx = typeof props.x === 'number' ? props.x : (props.cx as number) ?? 0;
    const cy = typeof props.y === 'number' ? props.y : (props.cy as number) ?? 0;
    const rCm = Math.max(1, Math.round((rPx / WORLD_UNITS_PER_CM) * 10) / 10);
    const defaultH = rCm * 2;

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

    const aCm = Math.max(1, Math.round(sideA * 10) / 10);
    const bCm = Math.max(1, Math.round(sideB * 10) / 10);
    const cCm = Math.max(1, Math.round(sideC * 10) / 10);
    const defaultH = Math.max(aCm, bCm);

    const cx = (x1 + x2 + x3) / 3;
    const cy = (y1 + y2 + y3) / 3;

    proposals.push({
      id: 'prism',
      solidType: 'prism',
      title: 'Prisma Segitiga',
      description: `Prisma segitiga alas ${aCm} × ${bCm} × ${cCm} cm, tinggi ${defaultH} cm`,
      params: { type: 'prism', a: aCm, b: bCm, c: cCm, h: defaultH },
      position: { x: cx, y: cy },
    });
  }

  return proposals;
}
