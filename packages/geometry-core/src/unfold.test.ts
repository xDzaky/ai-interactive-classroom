import { describe, it, expect } from 'vitest';
import {
  buildPolyhedron,
} from './polyhedron.js';
import {
  computeFaceArea,
  unfoldPlan,
  curvedSolidNet,
} from './unfold.js';

describe('Polyhedron & Curved Solid Unfolding (P11-T09)', () => {
  it('preserves surface area invariant for cube (s = 5)', () => {
    const cube = buildPolyhedron('cube', { side: 5 });
    const plan = unfoldPlan(cube);

    expect(plan.rootFace).toBeGreaterThanOrEqual(0);
    expect(plan.steps.length).toBe(cube.faces.length - 1); // Spanning tree over 6 faces has 5 edges

    // Check net total area equals surface area (6 * 5^2 = 150)
    let totalArea = 0;
    for (const face of cube.faces) {
      totalArea += computeFaceArea(face, cube.vertices);
    }
    expect(totalArea).toBeCloseTo(150, 4);

    // Verify all steps have valid hinges
    for (const step of plan.steps) {
      expect(step.hinge.length).toBe(2);
      expect(step.foldAngle).toBeCloseTo(Math.PI / 2, 4); // 90 degrees fold for cube
    }
  });

  it('preserves surface area invariant for cuboid (3 x 4 x 5)', () => {
    const cuboid = buildPolyhedron('cuboid', { length: 3, width: 4, height: 5 });
    const plan = unfoldPlan(cuboid);

    expect(plan.steps.length).toBe(cuboid.faces.length - 1);

    // Surface area: 2*(3*4 + 4*5 + 3*5) = 2*(12 + 20 + 15) = 94
    let totalArea = 0;
    for (const face of cuboid.faces) {
      totalArea += computeFaceArea(face, cuboid.vertices);
    }
    expect(totalArea).toBeCloseTo(94, 4);
  });

  it('preserves surface area invariant for triangular prism (3, 4, 10)', () => {
    const prism = buildPolyhedron('prism', { a: 3, b: 4, height: 10 });
    const plan = unfoldPlan(prism);

    expect(plan.steps.length).toBe(prism.faces.length - 1); // 5 faces -> 4 steps

    // 3-4-5 right triangle: base area = 0.5 * 3 * 4 = 6. Two bases = 12.
    // Lateral faces: 3*10 + 4*10 + 5*10 = 120. Total = 132.
    let totalArea = 0;
    for (const face of prism.faces) {
      totalArea += computeFaceArea(face, prism.vertices);
    }
    expect(totalArea).toBeCloseTo(132, 4);
  });

  it('preserves surface area invariant for square pyramid (b = 6, h = 4)', () => {
    const pyramid = buildPolyhedron('pyramid', { base: 6, height: 4 });
    const plan = unfoldPlan(pyramid);

    expect(plan.steps.length).toBe(pyramid.faces.length - 1); // 5 faces -> 4 steps

    // Base: 6x6 = 36
    // Slant height s = sqrt(3^2 + 4^2) = 5
    // 4 triangles: 4 * (0.5 * 6 * 5) = 60. Total = 96.
    let totalArea = 0;
    for (const face of pyramid.faces) {
      totalArea += computeFaceArea(face, pyramid.vertices);
    }
    expect(totalArea).toBeCloseTo(96, 4);
  });

  describe('Curved solids (cylinder, cone)', () => {
    it('computes net and surface area for cylinder (r = 7, h = 10)', () => {
      const net = curvedSolidNet({ type: 'cylinder', r: 7, h: 10 });
      expect(net.type).toBe('cylinder');
      expect(net.parts.length).toBe(3); // 1 rect + 2 circles

      // 2 * pi * r * h + 2 * pi * r^2 = 140*pi + 98*pi = 238*pi
      const expectedArea = 238 * Math.PI;
      expect(net.totalArea).toBeCloseTo(expectedArea, 4);

      const rect = net.parts.find((p) => p.kind === 'rect')!;
      expect(rect.dimensions.width).toBeCloseTo(2 * Math.PI * 7, 4);
      expect(rect.dimensions.height).toBe(10);
    });

    it('computes net and surface area for cone (r = 3, h = 4)', () => {
      const net = curvedSolidNet({ type: 'cone', r: 3, h: 4 });
      expect(net.type).toBe('cone');
      expect(net.parts.length).toBe(2); // 1 sector + 1 circle

      // s = sqrt(3^2 + 4^2) = 5
      // Lateral sector area = pi * r * s = 15*pi
      // Base circle area = pi * r^2 = 9*pi
      // Total = 24*pi
      const expectedArea = 24 * Math.PI;
      expect(net.totalArea).toBeCloseTo(expectedArea, 4);

      const sector = net.parts.find((p) => p.kind === 'sector')!;
      expect(sector.dimensions.slantHeight).toBe(5);
      // Angle: (360 * 3) / 5 = 216 degrees
      expect(sector.dimensions.angleDeg).toBeCloseTo(216, 4);
    });
  });
});
