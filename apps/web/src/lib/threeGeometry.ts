/**
 * threeGeometry.ts — P03-T02
 * Three.js BufferGeometry builders for each solid type.
 * Returns { geometry, boundingBox } for each solid.
 * No React dependency — pure Three.js functions.
 */
import * as THREE from "three";
import type { SolidParams } from "@ai-classroom/geometry-core";

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface ThreeGeometryResult {
  geometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
  /** Computed bounding box dimensions in world units */
  dimensions: { width: number; height: number; depth: number };
}

// ---------------------------------------------------------------------------
// Helper: build result from geometry
// ---------------------------------------------------------------------------

function buildResult(geometry: THREE.BufferGeometry): ThreeGeometryResult {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox ?? new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);
  return {
    geometry,
    boundingBox: bbox,
    dimensions: {
      width: parseFloat(size.x.toFixed(6)),
      height: parseFloat(size.y.toFixed(6)),
      depth: parseFloat(size.z.toFixed(6)),
    },
  };
}

// ---------------------------------------------------------------------------
// Builders per solid
// ---------------------------------------------------------------------------

function buildCube(s: number): ThreeGeometryResult {
  return buildResult(new THREE.BoxGeometry(s, s, s));
}

function buildCuboid(l: number, w: number, h: number): ThreeGeometryResult {
  return buildResult(new THREE.BoxGeometry(l, h, w));
}

function buildSphere(r: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.SphereGeometry(r, segments, segments));
}

function buildCylinder(r: number, h: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.CylinderGeometry(r, r, h, segments, 1, false));
}

function buildCone(r: number, h: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.ConeGeometry(r, h, segments, 1, false));
}

function buildPyramid(b: number, h: number): ThreeGeometryResult {
  // Square pyramid = ConeGeometry with 4 radial segments, radiusTop=0
  // Circumradius of base square side b = b * sqrt(2) / 2
  const circumR = (b * Math.sqrt(2)) / 2;
  return buildResult(new THREE.ConeGeometry(circumR, h, 4, 1, false));
}

function buildPrism(a: number, b: number, c: number, h: number): ThreeGeometryResult {
  // Build a triangular prism as ExtrudeGeometry
  // Compute triangle vertices from sides a, b, c using law of cosines
  // Place triangle in XZ plane centred at origin
  const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const p0 = new THREE.Vector2(0, 0);
  const p1 = new THREE.Vector2(c, 0);
  const p2 = new THREE.Vector2(b * Math.cos(A), b * Math.sin(A));

  // Centre the triangle
  const cx = (p0.x + p1.x + p2.x) / 3;
  const cy = (p0.y + p1.y + p2.y) / 3;
  const shape = new THREE.Shape([
    new THREE.Vector2(p0.x - cx, p0.y - cy),
    new THREE.Vector2(p1.x - cx, p1.y - cy),
    new THREE.Vector2(p2.x - cx, p2.y - cy),
  ]);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
  });
  // Rotate to stand upright (ExtrudeGeometry extrudes along Z, rotate to Y)
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -h / 2, 0);

  return buildResult(geometry);
}

function buildTorus(R: number, r: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.TorusGeometry(R, r, segments, segments * 2));
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function buildThreeGeometry(params: SolidParams): ThreeGeometryResult {
  switch (params.type) {
    case "cube":     return buildCube(params.s);
    case "cuboid":   return buildCuboid(params.l, params.w, params.h);
    case "sphere":   return buildSphere(params.r);
    case "cylinder": return buildCylinder(params.r, params.h);
    case "cone":     return buildCone(params.r, params.h);
    case "pyramid":  return buildPyramid(params.b, params.h);
    case "prism":    return buildPrism(params.a, params.b, params.c, params.h);
    case "torus":    return buildTorus(params.R, params.r);
  }
}

// ---------------------------------------------------------------------------
// Utility: compute world bounding box for a mesh
// ---------------------------------------------------------------------------

export function computeMeshBoundingBox(mesh: THREE.Mesh): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(mesh);
  return box;
}
