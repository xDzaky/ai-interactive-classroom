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
 * Creates dual-pass textbook edge LineSegments:
 * - Hidden back edges rendered as subtle dashed slate lines (`THREE.GreaterDepth`)
 * - Visible front edges rendered as crisp dark slate lines (`THREE.LessEqualDepth`)
 */
export function createTextbookEdges(
  edgeGeom: THREE.BufferGeometry,
  normScale: number,
  theme: SolidThemeKey = 'ice',
): { hiddenEdges: THREE.LineSegments; frontEdges: THREE.LineSegments } {
  const colors = SOLID_THEMES[theme];
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

  return { hiddenEdges, frontEdges };
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
