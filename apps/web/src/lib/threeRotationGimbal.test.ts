import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyGimbalQuaternion,
  computeGimbalRotationDelta,
  computeEdgeOnFallbackDelta,
  snapAngleRad,
  normalizeDeg360,
} from './threeRotationGimbal';

describe('V5 3D 360° Quaternion Rotation Gimbal', () => {
  it('performs 90° X pitch then 180° Y yaw with ZERO gimbal lock and unit-length quaternion', () => {
    const q0 = new THREE.Quaternion(); // identity
    const q1 = applyGimbalQuaternion(q0, new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const q2 = applyGimbalQuaternion(q1, new THREE.Vector3(0, 1, 0), Math.PI);

    expect(Math.abs(q2.length() - 1)).toBeLessThan(1e-6);
    // Test vector (0, 1, 0): after +90° around X => (0, 0, 1); after +180° around Y => (0, 0, -1)
    const v = new THREE.Vector3(0, 1, 0).applyQuaternion(q2);
    expect(Math.abs(v.x)).toBeLessThan(1e-5);
    expect(Math.abs(v.y)).toBeLessThan(1e-5);
    expect(Math.abs(v.z - -1)).toBeLessThan(1e-5);
  });

  it('computes signed 360° rotation delta around Z axis accurately', () => {
    const v0 = new THREE.Vector3(1, 0, 0);
    const vt = new THREE.Vector3(0, 1, 0);
    const delta = computeGimbalRotationDelta(v0, vt, new THREE.Vector3(0, 0, 1));
    expect(Math.abs(delta - Math.PI / 2)).toBeLessThan(1e-6);

    const negDelta = computeGimbalRotationDelta(v0, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1));
    expect(Math.abs(negDelta - -Math.PI / 2)).toBeLessThan(1e-6);
    expect(Math.round(normalizeDeg360(negDelta))).toBe(270);
  });

  it('keeps edge-on fallback bounded and smooth without NaN or spikes', () => {
    const d1 = computeEdgeOnFallbackDelta({ dx: 50, dy: 0 }, { tx: 1, ty: 0 }, 0.01);
    expect(Math.abs(d1 - 0.5)).toBeLessThan(1e-6);
    const dZero = computeEdgeOnFallbackDelta({ dx: 20, dy: 10 }, { tx: 0, ty: 0 }, 0.01);
    expect(Number.isFinite(dZero)).toBe(true);
  });

  it('snaps angles to 15° increments', () => {
    const rad17 = (17 * Math.PI) / 180;
    const snapped = snapAngleRad(rad17, Math.PI / 12);
    expect(Math.round(normalizeDeg360(snapped))).toBe(15);
  });
});
