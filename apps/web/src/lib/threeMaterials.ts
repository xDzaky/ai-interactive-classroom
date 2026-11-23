/**
 * threeMaterials.ts — Production-Grade 3D Visual System (iFLYTEK Tongchuang Aesthetic)
 *
 * Standards:
 * 1. 3-Point Studio Lighting (HemisphereLight + Main DirectionalLight + Rim Light)
 * 2. Dual-Pass Glassmorphic Translucency (BackSide + FrontSide) — eliminates Z-fighting
 * 3. Dual-Pass Textbook Edges (crisp dark solid front edges + subtle dashed hidden back edges)
 * 4. Distinct harmonious per-face pastel palette for Exploded View & Unfolding Nets
 * 5. Electric-blue translucent cross-section plane + glowing intersection pins
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export type SolidThemeKey = 'ice' | 'teal' | 'amber' | 'slate';

export const SOLID_THEMES: Record<
  SolidThemeKey,
  { faceHex: number; edgeHex: number; hiddenEdgeHex: number; accentHex: number }
> = {
  ice:   { faceHex: 0xbae6fd, edgeHex: 0x1e293b, hiddenEdgeHex: 0x64748b, accentHex: 0x3b82f6 },
  teal:  { faceHex: 0x99f6e4, edgeHex: 0x134e4a, hiddenEdgeHex: 0x64748b, accentHex: 0x0d9488 },
  amber: { faceHex: 0xfde68a, edgeHex: 0x78350f, hiddenEdgeHex: 0x78716c, accentHex: 0xd97706 },
  slate: { faceHex: 0xe2e8f0, edgeHex: 0x0f172a, hiddenEdgeHex: 0x64748b, accentHex: 0x4f46e5 },
};

/** Harmonious pastel palette for Exploded / Unfold per-face distinction */
export const FACE_EXPLODE_PALETTE = [
  0x93c5fd, // sky blue
  0x6ee7b7, // emerald
  0xfcd34d, // amber
  0xf9a8d4, // pink
  0xc4b5fd, // violet
  0xfdba74, // orange
  0x67e8f9, // cyan
  0xa5b4fc, // indigo
];

/**
 * Adds balanced 3-point studio lighting to a Three.js scene so glassmorphic 3D solids
 * look crisp, luminous, and readable on whiteboards & projectors.
 */
export function setupStudioLighting(scene: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight(0xf8fafc, 0xcbd5e1, 0.95);
  hemi.position.set(0, 12, 0);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  keyLight.position.set(8, 13, 10);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
  rimLight.position.set(-9, -4, -8);
  scene.add(rimLight);
}

/**
 * Creates a clean glassmorphic textbook face material (single or dual-pass)
 * with polygonOffset enabled so edges NEVER z-fight against faces.
 */
export function createGlassFaceMaterial(
  colorHex = 0xbae6fd,
  opacity = 0.24,
  side: THREE.Side = THREE.FrontSide,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    roughness: 0.28,
    metalness: 0.04,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    side,
    depthWrite: side === THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
}

/**
 * Creates dual-pass anti-aliased FAT textbook edges (`LineSegments2` + `LineMaterial`):
 * - Hidden back edges: 1.5px subtle dashed slate lines (`THREE.GreaterDepth`)
 * - Visible front edges: 2.2px crisp dark solid lines (`THREE.LessEqualDepth`)
 * Renders at true pixel thickness on Windows/macOS WebGL & HiDPI projectors!
 */
export function createTextbookEdges(
  edgeGeom: THREE.BufferGeometry,
  normScale: number,
  theme: SolidThemeKey = 'ice',
  resolution: [number, number] = [320, 280],
): { hiddenEdges: THREE.Object3D; frontEdges: THREE.Object3D; materials: LineMaterial[] } {
  const colors = SOLID_THEMES[theme];
  const posAttr = edgeGeom.getAttribute('position');
  const positions = posAttr ? Array.from(posAttr.array as Float32Array) : [];

  if (positions.length >= 6) {
    const segGeom = new LineSegmentsGeometry();
    segGeom.setPositions(positions);

    const hiddenMat = new LineMaterial({
      color: colors.hiddenEdgeHex,
      linewidth: 1.5,
      dashed: true,
      dashSize: 0.16 / Math.max(normScale, 0.1),
      gapSize: 0.12 / Math.max(normScale, 0.1),
      transparent: true,
      opacity: 0.55,
      depthFunc: THREE.GreaterDepth,
      depthWrite: false,
      resolution: new THREE.Vector2(resolution[0], resolution[1]),
    });

    const hiddenEdges = new LineSegments2(segGeom, hiddenMat);
    hiddenEdges.computeLineDistances();

    const frontMat = new LineMaterial({
      color: colors.edgeHex,
      linewidth: 2.2,
      dashed: false,
      depthFunc: THREE.LessEqualDepth,
      resolution: new THREE.Vector2(resolution[0], resolution[1]),
    });

    const frontEdges = new LineSegments2(segGeom, frontMat);
    return { hiddenEdges, frontEdges, materials: [hiddenMat, frontMat] };
  }

  // Fallback for empty geometry
  const hiddenEdges = new THREE.LineSegments(
    edgeGeom,
    new THREE.LineDashedMaterial({
      color: colors.hiddenEdgeHex,
      dashSize: 0.16 / Math.max(normScale, 0.1),
      gapSize: 0.12 / Math.max(normScale, 0.1),
      transparent: true,
      opacity: 0.55,
      depthFunc: THREE.GreaterDepth,
      depthWrite: false,
    }),
  );
  hiddenEdges.computeLineDistances();

  const frontEdges = new THREE.LineSegments(
    edgeGeom,
    new THREE.LineBasicMaterial({
      color: colors.edgeHex,
      depthFunc: THREE.LessEqualDepth,
    }),
  );

  return { hiddenEdges, frontEdges, materials: [] };
}

/**
 * Creates a soft radial contact shadow plane beneath a 3D solid so it feels grounded.
 */
export function createContactShadowPlane(radius = 2.8, yOffset = -2.15): THREE.Mesh {
  let tex: THREE.CanvasTexture | null = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
      grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.08)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      tex = new THREE.CanvasTexture(canvas);
    }
  }
  const geom = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    color: tex ? 0xffffff : 0x94a3b8,
    transparent: true,
    opacity: tex ? 0.9 : 0.12,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = yOffset;
  return mesh;
}

/**
 * Creates an automatic textbook Altitude (height t) dashed line + 90-degree right-angle corner marker.
 */
export function createAltitudeAndRightAngleHelper(
  bottomY: number,
  topY: number,
  markerSize = 0.28,
): THREE.Group {
  const group = new THREE.Group();
  // Vertical dashed altitude line (rose accent)
  const altGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, bottomY, 0),
    new THREE.Vector3(0, topY, 0),
  ]);
  const altLine = new THREE.Line(
    altGeom,
    new THREE.LineDashedMaterial({
      color: 0xe11d48,
      dashSize: 0.16,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    }),
  );
  altLine.computeLineDistances();
  group.add(altLine);

  // 90-degree right-angle square symbol at base (0, bottomY, 0)
  const sqGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(markerSize, bottomY, 0),
    new THREE.Vector3(markerSize, bottomY + markerSize, 0),
    new THREE.Vector3(0, bottomY + markerSize, 0),
  ]);
  const sqLine = new THREE.Line(
    sqGeom,
    new THREE.LineBasicMaterial({ color: 0xe11d48, depthTest: false }),
  );
  group.add(sqLine);
  return group;
}

/**
 * Creates the electric-blue translucent cross-section plane material + border + glowing pins.
 */
export function createCrossSectionMaterials() {
  const fillMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.42,
    roughness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const outlineMat = new THREE.LineBasicMaterial({
    color: 0x1d4ed8,
    depthTest: false,
  });

  const pinMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x2563eb,
    emissiveIntensity: 0.65,
    roughness: 0.15,
  });

  return { fillMat, outlineMat, pinMat };
}
