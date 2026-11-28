import { describe, expect, it } from 'vitest';
import { computePlanarRegions, findRegionAtPoint } from './regionPartition';
import { proposeSolidsFromShape } from './shapeToSolid';

function makeCirclePolyline(cx: number, cy: number, r: number, steps = 36): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i * 2 * Math.PI) / steps;
    pts.push(Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)));
  }
  return pts;
}

describe('regionPartition — Per-Region Background Fill for Merged 2D Objects', () => {
  it('splits a circle + 1 horizontal diameter into 2 exact halves (1/2)', () => {
    const circle = makeCirclePolyline(200, 200, 100);
    const hLine = [100, 200, 300, 200];
    const segs = [circle, hLine];

    const regions = computePlanarRegions(segs);
    expect(regions.length).toBe(2);
    // Top half has cy < 200, bottom half has cy > 200
    expect(regions[0].cy).toBeLessThan(200);
    expect(regions[1].cy).toBeGreaterThan(200);

    // Hit-test top half vs bottom half
    expect(findRegionAtPoint(segs, { x: 200, y: 150 })).toBe(0);
    expect(findRegionAtPoint(segs, { x: 200, y: 250 })).toBe(1);
  });

  it('splits a circle + 2 perpendicular diameters into 4 exact quarters (2/4)', () => {
    const circle = makeCirclePolyline(200, 200, 100);
    const hLine = [100, 200, 300, 200];
    const vLine = [200, 100, 200, 300];
    const regions = computePlanarRegions([circle, hLine, vLine]);
    expect(regions.length).toBe(4);
  });

  it('splits a circle + 4 diameters into 8 exact slices (4/8)', () => {
    const circle = makeCirclePolyline(200, 200, 100);
    const d = Math.round(100 * Math.SQRT1_2);
    const segs = [
      circle,
      [100, 200, 300, 200],
      [200, 100, 200, 300],
      [200 - d, 200 - d, 200 + d, 200 + d],
      [200 + d, 200 - d, 200 - d, 200 + d],
    ];
    const regions = computePlanarRegions(segs);
    expect(regions.length).toBe(8);
  });

  it('splits a rectangle + vertical divider into 2 sub-rectangles', () => {
    const rect = [100, 100, 300, 100, 300, 200, 100, 200, 100, 100];
    const divider = [200, 100, 200, 200];
    const regions = computePlanarRegions([rect, divider]);
    expect(regions.length).toBe(2);
    expect(findRegionAtPoint([rect, divider], { x: 150, y: 150 })).toBe(0);
    expect(findRegionAtPoint([rect, divider], { x: 250, y: 150 })).toBe(1);
  });

  it('proposes colored 3D solids preserving custom regions & divider lines for a 1/2 colored circle', () => {
    const circle = makeCirclePolyline(200, 200, 100);
    const vLine = [200, 100, 200, 300];
    const proposals = proposeSolidsFromShape({
      id: 'c-half',
      object_type: 'polygon',
      props: {
        multiSegments: [circle, vLine],
        regionFills: { '0': '#bbf7d0', '1': '#fecaca' },
        stroke: '#0f172a',
        strokeWidth: 3,
      },
    });
    expect(proposals.length).toBe(3);
    expect(proposals[0].extendedKind).toBe('custom_colored_extrude');
    const surf = proposals[0].extraParams?.customSurface as {
      regions: Array<{ color: string }>;
      segments: number[][];
    };
    expect(surf.regions.length).toBe(2);
    expect(surf.regions.map((r) => r.color)).toEqual(['#bbf7d0', '#fecaca']);
    expect(surf.segments.length).toBe(2);
  });

  it('proposes ONLY polygonal 3D solids (no Bola/Kerucut) for a colored split square', () => {
    const sq = [100, 100, 240, 100, 240, 240, 100, 240, 100, 100];
    const vDiv = [170, 100, 170, 240];
    const hDiv = [170, 170, 240, 170];
    const proposals = proposeSolidsFromShape({
      id: 'sq-split',
      object_type: 'polygon',
      props: {
        multiSegments: [sq, vDiv, hDiv],
        regionFills: { '0': '#fecaca', '1': '#93c5fd', '2': '#ddd6fe' },
        stroke: '#0f172a',
        strokeWidth: 2,
      },
    });
    expect(proposals.every((p) => p.solidType !== 'sphere' && p.solidType !== 'cone')).toBe(true);
    expect(proposals[0].title).toContain('Kubus');
  });
});
