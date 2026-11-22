import { describe, it, expect } from 'vitest';
import {
  segmentLength,
  angleAtVertexDeg,
  measureSegment,
  measureAngle,
  diagonalBidang,
  diagonalRuang,
} from './measure.js';
import { buildPolyhedron } from './polyhedron.js';

describe('Measurement Tools & Diagonal Shortcuts (P11-T06)', () => {
  // Unit cube: side = 1
  const unitCube = buildPolyhedron('cube', { side: 1 });
  // Vertices: A(0,0,0)=0, B(1,0,0)=1, C(1,1,0)=2, D(0,1,0)=3, E(0,0,1)=4, F(1,0,1)=5, G(1,1,1)=6, H(0,1,1)=7
  const vA = unitCube.vertices[0];
  const vB = unitCube.vertices[1];
  const vC = unitCube.vertices[2];
  const vD = unitCube.vertices[3];
  const vG = unitCube.vertices[6];

  it('verifies exact test vector: |AC| = √2 on unit cube', () => {
    const ac = segmentLength(vA, vC);
    expect(ac).toBeCloseTo(Math.SQRT2, 6);
  });

  it('verifies exact test vector: |AG| = √3 on unit cube', () => {
    const ag = segmentLength(vA, vG);
    expect(ag).toBeCloseTo(Math.sqrt(3), 6);
  });

  it('verifies exact test vector: angleAtVertexDeg(B, A, D) = 90', () => {
    const angleBAD = angleAtVertexDeg(vB, vA, vD);
    expect(angleBAD).toBeCloseTo(90.0, 5);
  });

  it('verifies exact test vector: angleAtVertexDeg(C, A, G) ≈ 35.2643897', () => {
    const angleCAG = angleAtVertexDeg(vC, vA, vG);
    expect(angleCAG).toBeCloseTo(35.2643897, 5);
  });

  it('formats segment and angle measurements in Indonesian', () => {
    const mSeg = measureSegment('A', vA, 'C', vC);
    expect(mSeg.formula).toBe('Panjang ruas |AC|');
    expect(mSeg.formattedValue).toContain('cm');

    const mAng = measureAngle('B', vB, 'A', vA, 'D', vD);
    expect(mAng.formula).toBe('Besar sudut ∠BAD');
    expect(mAng.formattedValue).toBe('90°');
  });

  it('computes diagonal bidang and diagonal ruang formulas in Indonesian', () => {
    // Cube side 5
    const dbCube = diagonalBidang('cube', { side: 5 }, 'A', 'C');
    expect(dbCube.formula).toContain('s√2 = 5√2');
    expect(dbCube.value).toBeCloseTo(5 * Math.SQRT2, 4);

    const drCube = diagonalRuang('cube', { side: 5 }, 'A', 'G');
    expect(drCube.formula).toContain('s√3 = 5√3');
    expect(drCube.value).toBeCloseTo(5 * Math.sqrt(3), 4);

    // Cuboid 3x4x5
    const drCuboid = diagonalRuang('cuboid', { length: 3, width: 4, height: 5 }, 'A', 'G');
    expect(drCuboid.formula).toContain('√(p² + l² + t²)');
    expect(drCuboid.value).toBeCloseTo(Math.sqrt(9 + 16 + 25), 4);
  });
});
