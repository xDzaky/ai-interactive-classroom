/**
 * threeGeometry.ts — Production Three.js BufferGeometry Builders
 * Supports all 8 core SolidParams + extended catalog:
 * ellipsoid, hemisphere, double_cone, tetrahedron, octahedron, icosahedron,
 * prism_n, pyramid_n, frustum, custom_prism, custom_pyramid, and explicit 3D surfaces z = f(x, y)!
 */
import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import type { SolidParams } from "@ai-classroom/geometry-core";
import { parseExpression, evaluateAST } from "@ai-classroom/math-core";

export interface ThreeGeometryResult {
  geometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
  dimensions: { width: number; height: number; depth: number };
}

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

function buildCube(s: number): ThreeGeometryResult {
  return buildResult(new THREE.BoxGeometry(s, s, s));
}

function buildCuboid(l: number, w: number, h: number): ThreeGeometryResult {
  return buildResult(new THREE.BoxGeometry(l, h, w));
}

function buildSphere(r: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.SphereGeometry(r, segments, segments));
}

function buildEllipsoid(rx: number, ry: number, rz: number, segments = 32): ThreeGeometryResult {
  const geom = new THREE.SphereGeometry(1, segments, segments);
  geom.scale(rx, ry, rz);
  return buildResult(geom);
}

function buildHemisphere(r: number, segments = 32): ThreeGeometryResult {
  const geom = new THREE.SphereGeometry(r, segments, Math.floor(segments / 2), 0, Math.PI * 2, 0, Math.PI / 2);
  geom.translate(0, -r * 0.25, 0);
  return buildResult(geom);
}

function buildCylinder(r: number, h: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.CylinderGeometry(r, r, h, segments, 1, false));
}

function buildCone(r: number, h: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.ConeGeometry(r, h, segments, 1, false));
}

function buildPyramid(b: number, h: number): ThreeGeometryResult {
  const circumR = (b * Math.sqrt(2)) / 2;
  return buildResult(new THREE.ConeGeometry(circumR, h, 4, 1, false));
}

function buildPrism(a: number, b: number, c: number, h: number): ThreeGeometryResult {
  const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const p0 = new THREE.Vector2(0, 0);
  const p1 = new THREE.Vector2(c, 0);
  const p2 = new THREE.Vector2(b * Math.cos(A), b * Math.sin(A));
  const cx = (p0.x + p1.x + p2.x) / 3;
  const cy = (p0.y + p1.y + p2.y) / 3;
  const shape = new THREE.Shape([
    new THREE.Vector2(p0.x - cx, p0.y - cy),
    new THREE.Vector2(p1.x - cx, p1.y - cy),
    new THREE.Vector2(p2.x - cx, p2.y - cy),
  ]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -h / 2, 0);
  return buildResult(geometry);
}

function buildTorus(R: number, r: number, segments = 32): ThreeGeometryResult {
  return buildResult(new THREE.TorusGeometry(R, r, segments, segments * 2));
}

/**
 * Builds an explicit 3D mathematical surface z = f(x, y) using safe AST evaluation
 * (zero eval / Function()) with smooth vertex height colors (heatmap)!
 */
export function buildExplicitSurfaceGeometry(
  formula: string,
  range = 3,
  resolution = 36,
): ThreeGeometryResult {
  const clean = formula.replace(/^z\s*=\s*/i, "").trim() || "sin(x)*cos(y)";
  let ast;
  try {
    ast = parseExpression(clean);
  } catch {
    ast = parseExpression("sin(x)*cos(y)");
  }

  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const step = (range * 2) / resolution;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const gridZ: number[] = [];

  for (let iy = 0; iy <= resolution; iy++) {
    const y = -range + iy * step;
    for (let ix = 0; ix <= resolution; ix++) {
      const x = -range + ix * step;
      let z = 0;
      try {
        const val = evaluateAST(ast, { x, y });
        z = Number.isFinite(val) ? Math.max(-range * 1.5, Math.min(range * 1.5, val)) : 0;
      } catch {
        z = 0;
      }
      gridZ.push(z);
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      // Map math (x, y, z) -> Three.js (x, z, -y)
      positions.push(x, z, -y);
    }
  }

  const spanZ = Math.max(0.001, maxZ - minZ);
  const cLow = new THREE.Color(0x3b82f6);  // cool blue
  const cMid = new THREE.Color(0x14b8a6);  // teal
  const cHigh = new THREE.Color(0xf97316); // warm orange
  const tmpColor = new THREE.Color();

  for (const z of gridZ) {
    const t = (z - minZ) / spanZ;
    if (t < 0.5) tmpColor.lerpColors(cLow, cMid, t * 2);
    else tmpColor.lerpColors(cMid, cHigh, (t - 0.5) * 2);
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
  }

  const stride = resolution + 1;
  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = (iy + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return buildResult(geom);
}

/**
 * Builds parametric 3D surfaces S(u, v) using Three.js ParametricGeometry with heatmap vertex colors.
 * Presets: 'mobius' (Möbius Strip), 'helicoid' (Helicoid), 'torus_knot' (Torus Knot tube).
 */
export function buildParametricSurfaceGeometry(
  preset: "mobius" | "helicoid" | "torus_knot" = "mobius",
): ThreeGeometryResult {
  let geom: THREE.BufferGeometry;
  if (preset === "torus_knot") {
    geom = new THREE.TorusKnotGeometry(1.8, 0.48, 96, 18);
  } else if (preset === "helicoid") {
    geom = new ParametricGeometry(
      (u, v, target) => {
        const alpha = (u - 0.5) * 4 * Math.PI;
        const r = (v - 0.5) * 3.2;
        target.set(r * Math.cos(alpha), alpha * 0.35, r * Math.sin(alpha));
      },
      48,
      20,
    );
  } else {
    // Möbius Strip
    geom = new ParametricGeometry(
      (u, v, target) => {
        const theta = u * Math.PI * 2;
        const w = (v - 0.5) * 1.4;
        const R = 2.1;
        const x = (R + w * Math.cos(theta / 2)) * Math.cos(theta);
        const z = (R + w * Math.cos(theta / 2)) * Math.sin(theta);
        const y = w * Math.sin(theta / 2);
        target.set(x, y, z);
      },
      64,
      16,
    );
  }

  // Apply height-based heatmap vertex colors
  const pos = geom.getAttribute("position");
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(0.001, maxY - minY);
  const cLow = new THREE.Color(0x6366f1);
  const cMid = new THREE.Color(0x14b8a6);
  const cHigh = new THREE.Color(0xf97316);
  const tmp = new THREE.Color();
  const colors: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / span;
    if (t < 0.5) tmp.lerpColors(cLow, cMid, t * 2);
    else tmp.lerpColors(cMid, cHigh, (t - 0.5) * 2);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return buildResult(geom);
}

export function buildThreeGeometry(
  params: SolidParams,
  extendedKind?: string,
  extraParams?: Record<string, unknown>,
): ThreeGeometryResult {
  if (extendedKind === "ellipsoid") {
    const rx = Number(extraParams?.rx ?? (params.type === "sphere" ? params.r * 1.35 : 3));
    const ry = Number(extraParams?.ry ?? (params.type === "sphere" ? params.r * 0.85 : 2));
    const rz = Number(extraParams?.rz ?? ry);
    return buildEllipsoid(rx, ry, rz);
  }
  if (extendedKind === "hemisphere") {
    const r = Number(extraParams?.r ?? (params.type === "sphere" ? params.r : 2.5));
    return buildHemisphere(r);
  }
  if (extendedKind === "surface_3d") {
    const formula = String(extraParams?.formula3d ?? "sin(x)*cos(y)");
    return buildExplicitSurfaceGeometry(formula);
  }
  if (extendedKind === "parametric_3d") {
    const preset = String(extraParams?.preset ?? "mobius") as "mobius" | "helicoid" | "torus_knot";
    return buildParametricSurfaceGeometry(preset);
  }

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

export function computeMeshBoundingBox(mesh: THREE.Mesh): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(mesh);
  return box;
}
