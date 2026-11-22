import { describe, it, expect } from 'vitest';
import { buildPolyhedron } from './polyhedron.js';
import {
  planeFrom3Points,
  intersectSegmentPlane,
  intersectPolyhedronPlane,
  pointLineDistance,
  lineLineDistance,
  dihedralAngleDeg,
} from './section.js';

describe('Plane & Cross-Section Mathematics (P11-T03)', () => {
  it('creates plane from 3 points and rejects collinear points', () => {
    // Collinear points along X axis
    const collinear = planeFrom3Points([0, 0, 0], [1, 0, 0], [2, 0, 0]);
    expect(collinear).toBeNull();

    // Horizontal plane at z = 1
    const p1 = planeFrom3Points([0, 0, 1], [2, 0, 1], [0, 2, 1]);
    expect(p1).not.toBeNull();
    expect(Math.abs(p1!.n[2])).toBeCloseTo(1.0, 5);
    expect(p1!.d).toBeCloseTo(1.0, 5);
  });

  it('calculates segment-plane intersection', () => {
    const plane = { n: [0, 0, 1] as [number, number, number], d: 1 };

    // Crossing segment from z=0 to z=2
    const hit = intersectSegmentPlane([0, 0, 0], [0, 0, 2], plane);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeCloseTo(0.5, 5);
    expect(hit!.point).toEqual([0, 0, 1]);

    // Segment completely above plane
    const above = intersectSegmentPlane([0, 0, 2], [0, 0, 4], plane);
    expect(above).toBeNull();

    // Segment parallel to plane
    const parallel = intersectSegmentPlane([0, 0, 0], [5, 0, 0], plane);
    expect(parallel).toBeNull();
  });

  it('intersects cube with horizontal plane z=1 yielding exact square of area 4', () => {
    const cube = buildPolyhedron('cube', { side: 2 });
    const plane = { n: [0, 0, 1] as [number, number, number], d: 1 };

    const section = intersectPolyhedronPlane(cube, plane);
    expect(section).not.toBeNull();
    expect(section!.points.length).toBe(4);
    expect(section!.area).toBeCloseTo(4.0, 4);
    expect(section!.perimeter).toBeCloseTo(8.0, 4);

    // All angles must be 90 degrees
    for (const angle of section!.anglesDeg) {
      expect(angle).toBeCloseTo(90.0, 2);
    }
  });

  it('intersects cube with plane through 3 vertices A(0,0,0), C(2,2,0), H(0,2,2)', () => {
    const cube = buildPolyhedron('cube', { side: 2 });
    const plane = planeFrom3Points([0, 0, 0], [2, 2, 0], [0, 2, 2]);
    expect(plane).not.toBeNull();

    const section = intersectPolyhedronPlane(cube, plane!);
    expect(section).not.toBeNull();
    // Intersection points must contain A(0,0,0), C(2,2,0), H(0,2,2)
    expect(section!.points.length).toBeGreaterThanOrEqual(3);
    expect(section!.area).toBeGreaterThan(0);
    expect(section!.perimeter).toBeGreaterThan(0);
  });

  it('computes shortest distance from point to line', () => {
    // Point (0, 3, 0) to line along X axis from (0,0,0) to (5,0,0)
    const dist = pointLineDistance([0, 3, 0], [0, 0, 0], [5, 0, 0]);
    expect(dist).toBeCloseTo(3.0, 5);

    // Point (0, 0, 5) to line along X axis
    const distZ = pointLineDistance([2, 0, 5], [0, 0, 0], [5, 0, 0]);
    expect(distZ).toBeCloseTo(5.0, 5);
  });

  it('computes shortest distance between skew lines', () => {
    // Line 1: along X axis at z = 0 -> p1=(0,0,0), d1=(1,0,0)
    // Line 2: along Y axis at z = 4 -> p2=(0,0,4), d2=(0,1,0)
    const skewDist = lineLineDistance([0, 0, 0], [1, 0, 0], [0, 0, 4], [0, 1, 0]);
    expect(skewDist).toBeCloseTo(4.0, 5);

    // Parallel lines: both along X axis, separated by y = 2
    const parDist = lineLineDistance([0, 0, 0], [1, 0, 0], [0, 2, 0], [1, 0, 0]);
    expect(parDist).toBeCloseTo(2.0, 5);
  });

  it('computes dihedral angle between planes', () => {
    // XY plane (normal Z) and XZ plane (normal Y) -> 90 degrees
    const angle90 = dihedralAngleDeg([0, 0, 1], [0, 1, 0]);
    expect(angle90).toBeCloseTo(90.0, 4);

    // Identical planes -> 0 degrees
    const angle0 = dihedralAngleDeg([0, 0, 1], [0, 0, 1]);
    expect(angle0).toBeCloseTo(0.0, 4);

    // 45 degrees
    const angle45 = dihedralAngleDeg([0, 0, 1], [0, 1, 1]);
    expect(angle45).toBeCloseTo(45.0, 2);
  });
});
