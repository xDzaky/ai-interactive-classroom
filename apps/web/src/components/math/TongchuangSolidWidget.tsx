/**
 * TongchuangSolidWidget.tsx — Zero-Lag Pure Three.js 3D Solid Engine (React 19 Native)
 *
 * Engineered for silky 60fps zero-glitch performance:
 * - Single persistent THREE.WebGLRenderer created ONCE on mount (never torn down on prop/callback updates)
 * - Zero React setState inside requestAnimationFrame (imperative DOM positioning for A-H labels)
 * - In-place geometry rebuild (<1ms) when customizing dimensions, slicing, unfolding, or exploding
 * - Clean textbook 3D style: crisp dark solid front edges + dashed hidden back edges + auto-fit camera
 * - Full inform.md capabilities: 360° Orbit, Auto-Rotate, 3-Point + Plane Slider Cross-Section with
 *   side-by-side 2D interior angles, Unfold Net + Dihedral Angle, Exploded View, Live Dimension Customizer,
 *   Measurements (Volume/Area/Diagonal), and clean single-row Tongchuang white action bar.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SolidParams, Polyhedron, Vec3, SectionPolygon, CompoundSolidPart } from '@ai-classroom/geometry-core';
import {
  buildPolyhedron,
  computeGeometry,
  computeCompoundStats,
  planeFrom3Points,
  intersectPolyhedronPlane,
  computeFaceNormal,
  unfoldPlan,
  vecSub,
  vecCross,
  vecDot,
  vecLength,
  normalizeProfile2D,
  createRegularPolygonProfile,
  extrudeProfile,
  taperProfile,
  buildTetrahedron,
  buildOctahedron,
  buildIcosahedron,
  buildDodecahedron,
  triangulateFace3D,
  verifyEulerCharacteristic,
} from '@ai-classroom/geometry-core';
import { buildThreeGeometry } from '@/lib/threeGeometry';
import {
  createFaceTexture,
  DICE_FACE_VALUES,
  type TexturePreset,
  type FaceCustomConfig,
} from '@/lib/faceTextures';
import { FaceCustomizerPopover } from './FaceCustomizerPopover';
import {
  setupStudioLighting,
  createGlassFaceMaterial,
  createTextbookEdges,
  createContactShadowPlane,
  createAltitudeAndRightAngleHelper,
  createCrossSectionMaterials,
  FACE_EXPLODE_PALETTE,
  SOLID_THEMES,
  type SolidThemeKey,
} from '@/lib/threeMaterials';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { toThree } from '@/lib/coords';
import { useWeakDevice } from '@/lib/useWeakDevice';
import { RotationGimbal3D, type GimbalHUDState } from '@/lib/threeRotationGimbal';

export type SolidToolMode = 'orbit' | 'section' | 'unfold' | 'explode' | 'measure' | 'size';
export type CameraPreset = 'iso' | 'front' | 'top' | 'side';

export interface TongchuangSolidWidgetProps {
  id: string;
  params: SolidParams;
  extendedKind?: string;
  profilePointsCm?: [number, number][];
  extraParams?: Record<string, unknown>;
  texturePreset?: TexturePreset;
  compoundParts?: CompoundSolidPart[];
  theme?: SolidThemeKey;
  label?: string;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onExplainAi?: () => void;
  onDuplicate?: () => void;
  onEdit2D?: () => void;
  onSnapshot?: (dataUrl: string) => void;
  onCloseToolbar?: () => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onParamsChange?: (next: SolidParams) => void;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Pure geometry helpers
// ---------------------------------------------------------------------------

export interface ProjectedSection2D {
  points2D: { x: number; y: number }[];
  anglesDeg: number[];
  sideLengths: number[];
  area: number;
  perimeter: number;
}

export function projectSectionPolygon2D(section: SectionPolygon): ProjectedSection2D {
  const pts = section.points;
  const n = pts.length;
  if (n < 3) {
    return { points2D: [], anglesDeg: [], sideLengths: [], area: section.area, perimeter: section.perimeter };
  }

  const cx = pts.reduce((s, p) => s + p[0], 0) / n;
  const cy = pts.reduce((s, p) => s + p[1], 0) / n;
  const cz = pts.reduce((s, p) => s + p[2], 0) / n;
  const origin: Vec3 = [cx, cy, cz];

  const e0 = vecSub(pts[1], pts[0]);
  const e1 = vecSub(pts[2], pts[0]);
  const normal = vecCross(e0, e1);
  const uLen = vecLength(e0) || 1;
  const u: Vec3 = [e0[0] / uLen, e0[1] / uLen, e0[2] / uLen];
  const vRaw = vecCross(normal, u);
  const vLen = vecLength(vRaw) || 1;
  const v: Vec3 = [vRaw[0] / vLen, vRaw[1] / vLen, vRaw[2] / vLen];

  const raw2D = pts.map((p) => {
    const d = vecSub(p, origin);
    return { x: vecDot(d, u), y: vecDot(d, v) };
  });

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of raw2D) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY, 0.001);
  const scale = 74 / span;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const points2D = raw2D.map((p) => ({
    x: 60 + (p.x - midX) * scale,
    y: 60 - (p.y - midY) * scale,
  }));

  const anglesDeg: number[] = [];
  const sideLengths: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const vPrev = vecSub(prev, curr);
    const vNext = vecSub(next, curr);
    const len1 = vecLength(vPrev);
    const len2 = vecLength(vNext);
    sideLengths.push(len2);
    const cosA =
      len1 > 1e-6 && len2 > 1e-6
        ? Math.max(-1, Math.min(1, vecDot(vPrev, vNext) / (len1 * len2)))
        : 0;
    anglesDeg.push(Math.round((Math.acos(cosA) * 180) / Math.PI));
  }

  return { points2D, anglesDeg, sideLengths, area: section.area, perimeter: section.perimeter };
}

function buildPolyhedronFromParams(
  params: SolidParams,
  extendedKind?: string,
  profilePointsCm?: [number, number][],
  extraParams?: Record<string, unknown>,
): Polyhedron | null {
  if (extendedKind === 'tetrahedron') {
    return buildTetrahedron(Number(extraParams?.s ?? (params.type === 'pyramid' ? params.b : 3)));
  }
  if (extendedKind === 'octahedron') {
    return buildOctahedron(Number(extraParams?.s ?? 3));
  }
  if (extendedKind === 'icosahedron') {
    return buildIcosahedron(Number(extraParams?.r ?? 2.4));
  }
  if (extendedKind === 'dodecahedron') {
    return buildDodecahedron(Number(extraParams?.r ?? 2.4));
  }
  if (extendedKind === 'prism_n') {
    const sides = Number(extraParams?.sides ?? 6);
    const r = Number(extraParams?.r ?? 2);
    const h = Number(extraParams?.height ?? (params.type === 'prism' ? params.h : 4));
    const obX = Number(extraParams?.obliqueX ?? 0);
    return extrudeProfile(createRegularPolygonProfile(sides, r), h, obX, 0).polyhedron;
  }
  if (extendedKind === 'pyramid_n') {
    const sides = Number(extraParams?.sides ?? 5);
    const r = Number(extraParams?.r ?? 2.2);
    const h = Number(extraParams?.height ?? (params.type === 'pyramid' ? params.h : 4));
    return taperProfile(createRegularPolygonProfile(sides, r), h, 0).polyhedron;
  }
  if (extendedKind === 'custom_prism' && profilePointsCm && profilePointsCm.length >= 3) {
    const h = Number(extraParams?.height ?? (params.type === 'prism' ? params.h : 4));
    const obX = Number(extraParams?.obliqueX ?? 0);
    return extrudeProfile(normalizeProfile2D(profilePointsCm, true), h, obX, 0).polyhedron;
  }
  if (
    (extendedKind === 'custom_pyramid' || extendedKind === 'frustum') &&
    profilePointsCm &&
    profilePointsCm.length >= 3
  ) {
    const h = Number(extraParams?.height ?? (params.type === 'pyramid' ? params.h : 4));
    const topScale = extendedKind === 'frustum' ? Number(extraParams?.topScale ?? 0.45) : 0;
    return taperProfile(normalizeProfile2D(profilePointsCm, true), h, topScale).polyhedron;
  }
  if (extendedKind === 'frustum') {
    const sides = Number(extraParams?.sides ?? 4);
    const r = Number(extraParams?.r ?? 2.4);
    const h = Number(extraParams?.height ?? 3.5);
    const topScale = Number(extraParams?.topScale ?? 0.48);
    return taperProfile(createRegularPolygonProfile(sides, r), h, topScale).polyhedron;
  }
  if (
    extendedKind === 'ellipsoid' ||
    extendedKind === 'hemisphere' ||
    extendedKind === 'surface_3d' ||
    extendedKind === 'parametric_3d' ||
    extendedKind === 'compound'
  ) {
    return null;
  }

  switch (params.type) {
    case 'cube':
      return buildPolyhedron('cube', { s: params.s });
    case 'cuboid':
      return buildPolyhedron('cuboid', { l: params.l, w: params.w, h: params.h });
    case 'prism':
      return buildPolyhedron('prism', { a: params.a, b: params.b, c: params.c, h: params.h });
    case 'pyramid':
      return buildPolyhedron('pyramid', { b: params.b, h: params.h });
    default:
      return null;
  }
}

interface InteractiveNode {
  id: string;
  label: string;
  pos: Vec3;
  kind: 'vertex' | 'midpoint';
}

function getInteractiveNodes(polyhedron: Polyhedron): InteractiveNode[] {
  const nodes: InteractiveNode[] = polyhedron.vertices.map((v, idx) => ({
    id: polyhedron.labels[idx] ?? `V${idx}`,
    label: polyhedron.labels[idx] ?? `V${idx}`,
    pos: v,
    kind: 'vertex',
  }));
  polyhedron.edges.forEach(([u, v], idx) => {
    const p1 = polyhedron.vertices[u];
    const p2 = polyhedron.vertices[v];
    const l1 = polyhedron.labels[u] ?? `V${u}`;
    const l2 = polyhedron.labels[v] ?? `V${v}`;
    nodes.push({
      id: `M_${l1}${l2}`,
      label: `M${idx + 1}`,
      pos: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2],
      kind: 'midpoint',
    });
  });
  return nodes;
}

function disposeGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material?.dispose();
    }
  }
}

// ---------------------------------------------------------------------------
// Main TongchuangSolidWidget (Persistent Zero-Lag WebGL)
// ---------------------------------------------------------------------------

export const TongchuangSolidWidget: React.FC<TongchuangSolidWidgetProps> = ({
  id,
  params,
  extendedKind,
  profilePointsCm,
  extraParams,
  texturePreset,
  compoundParts,
  theme = 'ice',
  label,
  selected = true,
  onSelect,
  onDelete,
  onExplainAi,
  onDuplicate,
  onEdit2D,
  onSnapshot,
  onCloseToolbar,
  onMovePosition,
  onParamsChange,
  compact = false,
}) => {
  const isWeakDevice = useWeakDevice();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelLayerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const [mode, setMode] = useState<SolidToolMode>('orbit');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGimbal, setShowGimbal] = useState(true);
  const [snap15Deg, setSnap15Deg] = useState(false);
  const [gimbalHud, setGimbalHud] = useState<GimbalHUDState>({ activeAxis: null, angleDeg: 0, dragging: false });
  const [showLabels, setShowLabels] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [planeOffset, setPlaneOffset] = useState<number>(0); // -1..1 for slice slider
  const [planeTilt, setPlaneTilt] = useState<number>(25);    // degrees
  const [usePlaneSlider, setUsePlaneSlider] = useState(false);
  const [unfoldT, setUnfoldT] = useState(0);
  const [isUnfolding, setIsUnfolding] = useState(false);
  const [explodeT, setExplodeT] = useState(0);
  const [localParams, setLocalParams] = useState<SolidParams>(params);
  const [faceCustom, setFaceCustom] = useState<FaceCustomConfig>({});
  const [showFaceCustomizer, setShowFaceCustomizer] = useState(false);
  const [rolledDiceVal, setRolledDiceVal] = useState<number | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const lineMaterialsRef = useRef<LineMaterial[]>([]);
  const rendererSizeRef = useRef<[number, number]>([320, 260]);
  const hingeNodesRef = useRef<
    Array<{ pivot: THREE.Group; axis: THREE.Vector3; angle: number }>
  >([]);
  const staticEdgesRef = useRef<THREE.Object3D[]>([]);
  const compoundMeshesRef = useRef<
    Array<{ mesh: THREE.Object3D; basePos: THREE.Vector3; explodeDir: THREE.Vector3 }>
  >([]);
  const needsSnapshotRef = useRef(true);
  const rootElRef = useRef<HTMLDivElement | null>(null);
  const onMovePositionRef = useRef(onMovePosition);
  onMovePositionRef.current = onMovePosition;

  // Sync external params ONLY when values genuinely differ
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    setLocalParams(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const updateParam = (patch: Record<string, number>) => {
    const next = { ...localParams, ...patch } as SolidParams;
    setLocalParams(next);
    onParamsChange?.(next);
  };

  // Stable callback refs so WebGLRenderer is NEVER recreated
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  const polyhedron = useMemo(
    () => buildPolyhedronFromParams(localParams, extendedKind, profilePointsCm, extraParams),
    [localParams, extendedKind, profilePointsCm, extraParams]
  );
  const eulerInfo = useMemo(
    () => (polyhedron ? verifyEulerCharacteristic(polyhedron) : null),
    [polyhedron]
  );
  const geoStats = useMemo(() => {
    if (extendedKind === 'compound' && compoundParts && compoundParts.length > 0) {
      const cs = computeCompoundStats(compoundParts);
      return {
        volume: cs.totalVolume,
        surface_area: cs.totalSurfaceArea,
        formula_volume: 'V = \\sum V_i',
        formula_surface_area: 'SA = \\sum SA_i',
        label_volume: `V = ${cs.totalVolume}`,
        label_surface_area: `SA = ${cs.totalSurfaceArea}`,
      };
    }
    try {
      return computeGeometry(localParams);
    } catch {
      return null;
    }
  }, [localParams, extendedKind, compoundParts]);

  const interactiveNodes = useMemo(
    () => (polyhedron ? getInteractiveNodes(polyhedron) : []),
    [polyhedron]
  );

  // Compute cross-section (either 3 clicked points OR interactive plane slider!)
  const sectionPolygon = useMemo<SectionPolygon | null>(() => {
    if (!polyhedron || mode !== 'section') return null;

    if (usePlaneSlider) {
      const tiltRad = (planeTilt * Math.PI) / 180;
      const nx = Math.sin(tiltRad) * 0.6;
      const ny = Math.sin(tiltRad) * 0.8;
      const nz = Math.cos(tiltRad);
      const len = Math.hypot(nx, ny, nz) || 1;
      const normal: Vec3 = [nx / len, ny / len, nz / len];

      // Compute centroid & radius along normal
      const c = polyhedron.vertices.reduce<Vec3>(
        (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
        [0, 0, 0]
      );
      const n = polyhedron.vertices.length || 1;
      const center: Vec3 = [c[0] / n, c[1] / n, c[2] / n];
      const maxExtent = Math.max(
        ...polyhedron.vertices.map((v) => Math.abs(vecDot(vecSub(v, center), normal)))
      );
      const d = vecDot(normal, center) + planeOffset * maxExtent * 0.88;
      return intersectPolyhedronPlane(polyhedron, { n: normal, d });
    }

    if (selectedNodes.length !== 3) return null;
    const pts = selectedNodes
      .map((nid) => interactiveNodes.find((n) => n.id === nid)?.pos)
      .filter((p): p is Vec3 => Boolean(p));
    if (pts.length !== 3) return null;
    const plane = planeFrom3Points(pts[0], pts[1], pts[2]);
    if (!plane) return null;
    return intersectPolyhedronPlane(polyhedron, plane);
  }, [polyhedron, mode, selectedNodes, interactiveNodes, usePlaneSlider, planeOffset, planeTilt]);

  const projected2D = useMemo(
    () => (sectionPolygon ? projectSectionPolygon2D(sectionPolygon) : null),
    [sectionPolygon]
  );

  // Refs for persistent Three.js objects
  const stateRef = useRef({ mode, autoRotate, unfoldT, explodeT, showLabels, selectedNodes, selected, showGimbal, snap15Deg });
  stateRef.current = { mode, autoRotate, unfoldT, explodeT, showLabels, selectedNodes, selected, showGimbal, snap15Deg };
  const gimbalRef = useRef<RotationGimbal3D | null>(null);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const solidGroupRef = useRef<THREE.Group | null>(null);
  const sectionGroupRef = useRef<THREE.Group | null>(null);
  const faceEntriesRef = useRef<
    { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; normal: [number, number, number]; fIdx: number }[]
  >([]);
  const nodeMeshesRef = useRef<{ mesh: THREE.Mesh; node: InteractiveNode }[]>([]);
  const centerRef = useRef<[number, number, number]>([0, 0, 0]);
  const baseScaleRef = useRef<number>(1);

  // Play/Pause unfold animation
  useEffect(() => {
    if (!isUnfolding) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setUnfoldT((prev) => {
        const next = prev + dt * 0.5;
        if (next >= 1) {
          setIsUnfolding(false);
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isUnfolding]);

  // ── 1. PERSISTENT WebGLRenderer MOUNT (runs ONCE — NEVER recreated!) ──────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isWeakDevice,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const w = Math.max(200, container.clientWidth || 300);
    const h = Math.max(180, container.clientHeight || 260);
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isWeakDevice ? 1 : 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(5.2, 4.2, 6.2);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enablePan = false;
    // Prevent 3D mesh & gimbal clipping when zooming (disable internal wheel zoom in compact whiteboard widget; clamp safely in Studio modal)
    controls.enableZoom = !compact;
    controls.minDistance = 6.4;
    controls.maxDistance = 16.0;
    controls.autoRotateSpeed = 2.4;
    controlsRef.current = controls;

    setupStudioLighting(scene);

    // Ground contact shadow plane
    const contactShadow = createContactShadowPlane(2.7, -2.35);
    scene.add(contactShadow);

    const solidGroup = new THREE.Group();
    const sectionGroup = new THREE.Group();
    solidGroup.add(sectionGroup);
    scene.add(solidGroup);
    solidGroupRef.current = solidGroup;
    sectionGroupRef.current = sectionGroup;

    // 3D 360° 3-Axis Quaternion Rotation Gimbal Ring Gizmo (inscribed inside object)
    const gimbal = new RotationGimbal3D(1.38);
    scene.add(gimbal.root);
    gimbalRef.current = gimbal;

    // Raycaster for gimbal ring drag & clicking vertex / midpoint nodes
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const getNdc = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return pointer;
    };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      const st = stateRef.current;
      if (st.selected && st.mode === 'orbit' && st.showGimbal) {
        const picked = gimbal.beginDrag(getNdc(e), { x: e.clientX, y: e.clientY }, camera, solidGroup);
        if (picked) {
          controls.enabled = false;
          e.stopPropagation();
          renderer.domElement.setPointerCapture?.(e.pointerId);
          setGimbalHud({ activeAxis: picked, angleDeg: 0, dragging: true });
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!gimbal.isDragging()) return;
      e.stopPropagation();
      const hud = gimbal.updateDrag(
        getNdc(e),
        { x: e.clientX, y: e.clientY },
        camera,
        solidGroup,
        e.shiftKey || stateRef.current.snap15Deg,
      );
      if (hud) setGimbalHud(hud);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (gimbal.isDragging()) {
        const hud = gimbal.endDrag();
        controls.enabled = true;
        renderer.domElement.releasePointerCapture?.(e.pointerId);
        setGimbalHud(hud);
        return;
      }
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      raycaster.setFromCamera(getNdc(e), camera);

      const visibleMeshes = nodeMeshesRef.current.filter((n) => n.mesh.visible).map((n) => n.mesh);
      const hits = raycaster.intersectObjects(visibleMeshes, false);
      if (hits.length > 0) {
        const found = nodeMeshesRef.current.find((n) => n.mesh === hits[0].object);
        if (found) {
          setMode('section');
          setUsePlaneSlider(false);
          setSelectedNodes((prev) => {
            if (prev.includes(found.node.id)) return prev.filter((x) => x !== found.node.id);
            return prev.length >= 3 ? [prev[1], prev[2], found.node.id] : [...prev, found.node.id];
          });
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const nw = Math.max(160, container.clientWidth);
      const nh = Math.max(140, container.clientHeight);
      rendererSizeRef.current = [nw, nh];
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      for (const lm of lineMaterialsRef.current) {
        lm.resolution.set(nw, nh);
      }
    });
    ro.observe(container);

    // Zero-setState 60fps animation loop!
    let rafId = 0;
    const projVec = new THREE.Vector3();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const st = stateRef.current;

      // 1. True Hinged Unfold/Fold via unfoldPlan(poly) + Auto-Fit Scale so net NEVER clips the box!
      for (const h of hingeNodesRef.current) {
        h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle * st.unfoldT);
      }
      if (hingeNodesRef.current.length > 0) {
        const unfoldShrink = 1 / (1 + st.unfoldT * 1.18);
        solidGroup.scale.setScalar(baseScaleRef.current * unfoldShrink);
        solidGroup.position.set(0, -st.unfoldT * 0.2, 0);
      }
      // Hide static wireframe edges once unfolding starts (each hinged face has its own crisp border!)
      for (const se of staticEdgesRef.current) {
        se.visible = st.unfoldT < 0.02;
      }

      // 2. Compound 3D multi-part Explode offsets
      for (const cp of compoundMeshesRef.current) {
        cp.mesh.position.set(
          cp.basePos.x + cp.explodeDir.x * st.explodeT * 1.4,
          cp.basePos.y + cp.explodeDir.y * st.explodeT * 1.4,
          cp.basePos.z + cp.explodeDir.z * st.explodeT * 1.4
        );
      }

      // 3. Explode face offsets (active when not hinged-unfolded) + pastel/textured face shading
      const themeColors = SOLID_THEMES[theme];
      for (const entry of faceEntriesRef.current) {
        const dist = st.unfoldT < 0.02 ? st.explodeT * 1.15 : 0;
        entry.mesh.position.set(
          entry.normal[0] * dist,
          entry.normal[1] * dist,
          entry.normal[2] * dist
        );
        if (!entry.mat.map) {
          const isFoldFace = st.mode === 'unfold' && entry.fIdx === 1;
          const isExploded = st.explodeT > 0.04 || st.unfoldT > 0.04;
          if (isFoldFace) {
            entry.mat.color.setHex(0xf97316);
            entry.mat.opacity = 0.58;
          } else if (isExploded) {
            entry.mat.color.setHex(FACE_EXPLODE_PALETTE[entry.fIdx % FACE_EXPLODE_PALETTE.length]);
            entry.mat.opacity = 0.42;
          } else {
            entry.mat.color.setHex(themeColors.faceHex);
            entry.mat.opacity = 0.22;
          }
        }
      }

      // Update vertex/midpoint node visibility
      for (const item of nodeMeshesRef.current) {
        item.mesh.visible =
          st.mode === 'section' || (st.showLabels && item.node.kind === 'vertex');
        const isSel = st.selectedNodes.includes(item.node.id);
        item.mesh.scale.setScalar(isSel ? 1.45 : 1);
        const mat = item.mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(isSel ? 0xec4899 : item.node.kind === 'midpoint' ? 0xf472b6 : 0x4f46e5);
      }

      // Spring camera preset interpolation
      if (targetCamPosRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.14);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.04) {
          camera.position.copy(targetCamPosRef.current);
          targetCamPosRef.current = null;
        }
      }

      controls.autoRotate = st.autoRotate && !isWeakDevice;
      controls.update();
      gimbal.setVisible(Boolean(st.selected && st.mode === 'orbit' && st.showGimbal && st.unfoldT < 0.02));
      gimbal.syncToCamera(camera);
      renderer.render(scene, camera);

      // Capture crisp PNG snapshot ONLY AFTER solid meshes exist (never blank frame 0!)
      if (needsSnapshotRef.current && solidGroup.children.length > 1 && onSnapshotRef.current) {
        needsSnapshotRef.current = false;
        try {
          const url = renderer.domElement.toDataURL('image/png');
          if (url.startsWith('data:image/')) onSnapshotRef.current(url);
        } catch {
          // ignore
        }
      }

      // Imperative DOM label projection (ZERO React re-renders! Anti-collision outward push + back-side dim)
      const labelContainer = labelLayerRef.current;
      if (labelContainer) {
        if (!st.showLabels && st.mode !== 'section') {
          labelContainer.style.display = 'none';
        } else {
          labelContainer.style.display = 'block';
          const cw = renderer.domElement.clientWidth || w;
          const ch = renderer.domElement.clientHeight || h;
          const centerProj = new THREE.Vector3(0, 0, 0).project(camera);
          const cxScreen = (centerProj.x * 0.5 + 0.5) * cw;
          const cyScreen = (-centerProj.y * 0.5 + 0.5) * ch;
          const children = labelContainer.children;
          let idx = 0;
          for (const item of nodeMeshesRef.current) {
            if (item.node.kind !== 'vertex') continue;
            const el = children[idx++] as HTMLElement | undefined;
            if (!el) break;
            item.mesh.getWorldPosition(projVec);
            projVec.project(camera);
            const rawSx = (projVec.x * 0.5 + 0.5) * cw;
            const rawSy = (-projVec.y * 0.5 + 0.5) * ch;
            // Push label slightly outward from centroid so it never overlaps edges
            const dx = rawSx - cxScreen;
            const dy = rawSy - cyScreen;
            const dLen = Math.hypot(dx, dy) || 1;
            const sx = rawSx + (dx / dLen) * 14;
            const sy = rawSy + (dy / dLen) * 14;
            el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`;
            el.style.opacity = projVec.z > centerProj.z + 0.015 ? '0.52' : '1';
          }
        }
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      gimbal.dispose();
      controls.dispose();
      renderer.dispose();
    };
  }, [isWeakDevice]);

  // ── 2. IN-PLACE GEOMETRY REBUILD (<1ms, zero WebGL context reset!) ────────
  useEffect(() => {
    const solidGroup = solidGroupRef.current;
    const sectionGroup = sectionGroupRef.current;
    if (!solidGroup || !sectionGroup) return;

    // Remove previous solid meshes while preserving sectionGroup
    const toRemove = solidGroup.children.filter((c) => c !== sectionGroup);
    for (const child of toRemove) {
      solidGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    }
    faceEntriesRef.current = [];
    nodeMeshesRef.current = [];
    lineMaterialsRef.current = [];
    hingeNodesRef.current = [];
    staticEdgesRef.current = [];
    compoundMeshesRef.current = [];
    needsSnapshotRef.current = true;

    if (polyhedron) {
      const threeVerts = polyhedron.vertices.map((v) => toThree(v));
      const cSum = threeVerts.reduce(
        (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
        [0, 0, 0]
      );
      const n = threeVerts.length || 1;
      const center: [number, number, number] = [cSum[0] / n, cSum[1] / n, cSum[2] / n];
      centerRef.current = center;

      // Auto-normalize scale so any solid fits cleanly inside the viewport (no clipping/glitch!)
      let maxR = 1;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const v of threeVerts) {
        const rx = v[0] - center[0];
        const ry = v[1] - center[1];
        const rz = v[2] - center[2];
        maxR = Math.max(maxR, Math.hypot(rx, ry, rz));
        if (ry < minY) minY = ry;
        if (ry > maxY) maxY = ry;
      }
      const normScale = 2.6 / maxR;
      baseScaleRef.current = normScale;
      solidGroup.scale.setScalar(normScale);

      // Build centered vertex array in Three.js space
      const localVerts = threeVerts.map(
        (v) => new THREE.Vector3(v[0] - center[0], v[1] - center[1], v[2] - center[2])
      );

      // Helper: build UV-mapped face mesh + border outline relative to a given origin (for hinge pivots!)
      const buildFaceObject = (faceIndices: number[], fIdx: number, origin: THREE.Vector3) => {
        const geom = new THREE.BufferGeometry();
        const positions: number[] = [];
        const uvs: number[] = [];

        // Compute planar orthonormal (uAxis, vAxis) on this face for crisp [0,1]x[0,1] UV mapping
        const p0 = localVerts[faceIndices[0]];
        const p1 = localVerts[faceIndices[1]];
        const normalVec = new THREE.Vector3(...toThree(computeFaceNormal(faceIndices, polyhedron.vertices))).normalize();
        const uAxis = new THREE.Vector3().subVectors(p1, p0).normalize();
        const vAxis = new THREE.Vector3().crossVectors(normalVec, uAxis).normalize();

        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
        const projMap = new Map<number, [number, number]>();
        for (const vi of faceIndices) {
          const d = new THREE.Vector3().subVectors(localVerts[vi], p0);
          const pu = d.dot(uAxis);
          const pv = d.dot(vAxis);
          projMap.set(vi, [pu, pv]);
          if (pu < minU) minU = pu;
          if (pu > maxU) maxU = pu;
          if (pv < minV) minV = pv;
          if (pv > maxV) maxV = pv;
        }
        const spanU = Math.max(0.001, maxU - minU);
        const spanV = Math.max(0.001, maxV - minV);

        const tris = triangulateFace3D(polyhedron.vertices, faceIndices);
        for (const [ia, ib, ic] of tris) {
          for (const vi of [ia, ib, ic]) {
            const lv = localVerts[vi];
            positions.push(lv.x - origin.x, lv.y - origin.y, lv.z - origin.z);
            const [pu, pv] = projMap.get(vi) ?? [0, 0];
            uvs.push((pu - minU) / spanU, (pv - minV) / spanV);
          }
        }
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.computeVertexNormals();

        const tex = texturePreset ? createFaceTexture(texturePreset, fIdx, faceCustom) : null;
        const mat = tex
          ? new THREE.MeshPhysicalMaterial({
              map: tex,
              transparent: true,
              opacity: 1,
              roughness: 0.25,
              metalness: 0.04,
              clearcoat: 0.35,
              side: THREE.DoubleSide,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: 2,
              polygonOffsetUnits: 2,
            })
          : createGlassFaceMaterial(SOLID_THEMES[theme].faceHex, 0.22, THREE.DoubleSide);

        const mesh = new THREE.Mesh(geom, mat);
        // Attach crisp face border so hinged faces stay sharply outlined while unfolding!
        const loopPts: THREE.Vector3[] = faceIndices.map(
          (vi) => new THREE.Vector3().subVectors(localVerts[vi], origin)
        );
        loopPts.push(loopPts[0].clone());
        const borderLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(loopPts),
          new THREE.LineBasicMaterial({ color: SOLID_THEMES[theme].edgeHex })
        );
        mesh.add(borderLine);

        faceEntriesRef.current.push({
          mesh,
          mat,
          normal: [normalVec.x, normalVec.y, normalVec.z],
          fIdx,
        });
        return mesh;
      };

      // Build True Hierarchical Hinge Tree from unfoldPlan(polyhedron)
      const plan = unfoldPlan(polyhedron);
      const faceContainerMap = new Map<number, { group: THREE.Group; worldOrigin: THREE.Vector3 }>();

      const rootGroup = new THREE.Group();
      const rootOrigin = new THREE.Vector3(0, 0, 0);
      rootGroup.add(buildFaceObject(polyhedron.faces[plan.rootFace], plan.rootFace, rootOrigin));
      solidGroup.add(rootGroup);
      faceContainerMap.set(plan.rootFace, { group: rootGroup, worldOrigin: rootOrigin });

      for (const step of plan.steps) {
        const parentEntry = faceContainerMap.get(step.parent);
        if (!parentEntry) continue;

        const [uIdx, vIdx] = step.hinge;
        const uPos = localVerts[uIdx];
        const vPos = localVerts[vIdx];

        const hingeAxis = new THREE.Vector3().subVectors(vPos, uPos).normalize();
        const nParent = new THREE.Vector3(...toThree(computeFaceNormal(polyhedron.faces[step.parent], polyhedron.vertices))).normalize();
        const nChild = new THREE.Vector3(...toThree(computeFaceNormal(polyhedron.faces[step.face], polyhedron.vertices))).normalize();

        // Pick sign (+1 or -1) that rotates nChild ONTO nParent (flat outward net!)
        const testPlus = nChild.clone().applyAxisAngle(hingeAxis, step.foldAngle);
        const testMinus = nChild.clone().applyAxisAngle(hingeAxis, -step.foldAngle);
        const signedAngle = testPlus.dot(nParent) >= testMinus.dot(nParent) ? step.foldAngle : -step.foldAngle;

        const pivot = new THREE.Group();
        pivot.position.subVectors(uPos, parentEntry.worldOrigin);
        pivot.add(buildFaceObject(polyhedron.faces[step.face], step.face, uPos));
        parentEntry.group.add(pivot);

        hingeNodesRef.current.push({ pivot, axis: hingeAxis, angle: signedAngle });
        faceContainerMap.set(step.face, { group: pivot, worldOrigin: uPos });
      }

      // Anti-aliased FAT textbook solid front (2.2px) + dashed hidden back edges (1.5px)
      const edgeGeom = new THREE.BufferGeometry();
      const edgePos: number[] = [];
      for (const [u, v] of polyhedron.edges) {
        const p1 = threeVerts[u];
        const p2 = threeVerts[v];
        edgePos.push(
          p1[0] - center[0], p1[1] - center[1], p1[2] - center[2],
          p2[0] - center[0], p2[1] - center[1], p2[2] - center[2]
        );
      }
      edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));

      const { hiddenEdges, frontEdges, materials } = createTextbookEdges(
        edgeGeom,
        normScale,
        theme,
        rendererSizeRef.current
      );
      lineMaterialsRef.current.push(...materials);
      staticEdgesRef.current.push(hiddenEdges, frontEdges);
      solidGroup.add(hiddenEdges);
      solidGroup.add(frontEdges);

      // Optional textbook Altitude (t) & 90° Right-Angle Marker
      if (showGuides && isFinite(minY) && isFinite(maxY)) {
        const guideGroup = createAltitudeAndRightAngleHelper(minY, maxY, 0.28 / normScale);
        solidGroup.add(guideGroup);
      }

      // Interactive vertex & midpoint spheres
      const sphereGeom = new THREE.SphereGeometry(0.11 / normScale, 12, 12);
      for (const node of interactiveNodes) {
        const tp = toThree(node.pos);
        const mat = new THREE.MeshStandardMaterial({
          color: node.kind === 'vertex' ? 0x4f46e5 : 0xec4899,
        });
        const mesh = new THREE.Mesh(sphereGeom, mat);
        mesh.position.set(tp[0] - center[0], tp[1] - center[1], tp[2] - center[2]);
        mesh.visible = false;
        solidGroup.add(mesh);
        nodeMeshesRef.current.push({ mesh, node });
      }
    } else if (extendedKind === 'compound' && compoundParts && compoundParts.length > 0) {
      // Compound 3D Multi-Part Assembly (e.g. House = Cube body + Pyramid roof!)
      centerRef.current = [0, 0, 0];
      const normScale = 0.48;
      baseScaleRef.current = normScale;
      solidGroup.scale.setScalar(normScale);

      const avgY = compoundParts.reduce((s, p) => s + p.offsetCm[1], 0) / compoundParts.length;
      compoundParts.forEach((part, idx) => {
        const { geometry } = buildThreeGeometry(part.params, part.extendedKind);
        const partTex = part.texturePreset
          ? createFaceTexture(part.texturePreset as TexturePreset, idx, faceCustom)
          : null;
        const partMat = partTex
          ? new THREE.MeshPhysicalMaterial({
              map: partTex,
              transparent: true,
              opacity: 1,
              roughness: 0.25,
              clearcoat: 0.35,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          : createGlassFaceMaterial(SOLID_THEMES[theme].faceHex, 0.24, THREE.DoubleSide);

        const group = new THREE.Group();
        const mesh = new THREE.Mesh(geometry, partMat);
        group.add(mesh);

        const edgesGeom = new THREE.EdgesGeometry(geometry, 24);
        const { hiddenEdges, frontEdges, materials } = createTextbookEdges(
          edgesGeom,
          normScale,
          theme,
          rendererSizeRef.current
        );
        lineMaterialsRef.current.push(...materials);
        group.add(hiddenEdges);
        group.add(frontEdges);

        const basePos = new THREE.Vector3(part.offsetCm[0], part.offsetCm[1] - avgY, part.offsetCm[2]);
        group.position.copy(basePos);
        solidGroup.add(group);
        compoundMeshesRef.current.push({
          mesh: group,
          basePos,
          explodeDir: new THREE.Vector3(0, idx === 0 ? -1.2 : 1.5, 0),
        });
      });
    } else {
      centerRef.current = [0, 0, 0];
      const { geometry, dimensions } = buildThreeGeometry(localParams, extendedKind, extraParams);
      const maxDim = Math.max(dimensions.width, dimensions.height, dimensions.depth, 1);
      const normScale = 3.8 / maxDim;
      baseScaleRef.current = normScale;
      solidGroup.scale.setScalar(normScale);

      if (extendedKind === 'surface_3d' || extendedKind === 'parametric_3d') {
        const surfMat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.32,
          metalness: 0.08,
          transparent: true,
          opacity: 0.9,
        });
        solidGroup.add(new THREE.Mesh(geometry, surfMat));
        const wireGeom = new THREE.WireframeGeometry(geometry);
        solidGroup.add(
          new THREE.LineSegments(
            wireGeom,
            new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.16 })
          )
        );
      } else {
        const curvedTex = texturePreset ? createFaceTexture(texturePreset, 0, faceCustom) : null;
        if (curvedTex) {
          solidGroup.add(
            new THREE.Mesh(
              geometry,
              new THREE.MeshPhysicalMaterial({
                map: curvedTex,
                transparent: true,
                opacity: 1,
                roughness: 0.25,
                clearcoat: 0.35,
                side: THREE.DoubleSide,
                depthWrite: false,
              })
            )
          );
        } else {
          // Dual-pass glassmorphic translucency (BackSide then FrontSide) — zero Z-fighting!
          solidGroup.add(new THREE.Mesh(geometry, createGlassFaceMaterial(SOLID_THEMES[theme].faceHex, 0.14, THREE.BackSide)));
          solidGroup.add(new THREE.Mesh(geometry, createGlassFaceMaterial(SOLID_THEMES[theme].faceHex, 0.24, THREE.FrontSide)));
        }

        const edgesGeom = new THREE.EdgesGeometry(geometry, 24);
        const { hiddenEdges, frontEdges, materials } = createTextbookEdges(
          edgesGeom,
          normScale,
          theme,
          rendererSizeRef.current
        );
        lineMaterialsRef.current.push(...materials);
        solidGroup.add(hiddenEdges);
        solidGroup.add(frontEdges);
        if (showGuides) {
          const halfH = dimensions.height / 2;
          solidGroup.add(createAltitudeAndRightAngleHelper(-halfH, halfH, 0.26 / normScale));
        }

        if (localParams.type === 'sphere' && extendedKind !== 'ellipsoid' && extendedKind !== 'hemisphere') {
          const r = localParams.r;
          const makeRing = (rotX: number, rotY: number) => {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= 64; i++) {
              const a = (i / 64) * Math.PI * 2;
              pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
            }
            const rg = new THREE.BufferGeometry().setFromPoints(pts);
            const back = new THREE.Line(
              rg,
              new THREE.LineDashedMaterial({
                color: SOLID_THEMES[theme].hiddenEdgeHex,
                dashSize: 0.16 / normScale,
                gapSize: 0.12 / normScale,
                transparent: true,
                opacity: 0.55,
                depthFunc: THREE.GreaterDepth,
                depthWrite: false,
              })
            );
            back.computeLineDistances();
            back.rotation.set(rotX, rotY, 0);
            solidGroup.add(back);

            const front = new THREE.Line(
              rg,
              new THREE.LineBasicMaterial({ color: SOLID_THEMES[theme].edgeHex, depthFunc: THREE.LessEqualDepth })
            );
            front.rotation.set(rotX, rotY, 0);
            solidGroup.add(front);
          };
          makeRing(0, 0);
          makeRing(Math.PI / 2, 0);
        }
      }
    }
  }, [polyhedron, interactiveNodes, localParams, extendedKind, extraParams, theme, showGuides, texturePreset, faceCustom, compoundParts]);

  // ── Remote Mobile Controller 3D Orbit & Action Listener ───────────────────
  useEffect(() => {
    if (!selected) return;
    const onRemoteSolid = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        kind: 'orbit' | 'action';
        dAzimuth?: number;
        dPolar?: number;
        action?: string;
      }>).detail;
      if (!detail) return;
      if (detail.kind === 'orbit' && cameraRef.current) {
        const cam = cameraRef.current;
        const spherical = new THREE.Spherical().setFromVector3(cam.position);
        spherical.theta -= (detail.dAzimuth ?? 0) * 1.4;
        spherical.phi = Math.max(0.18, Math.min(Math.PI - 0.18, spherical.phi - (detail.dPolar ?? 0) * 1.4));
        cam.position.setFromSpherical(spherical);
        cam.lookAt(0, 0, 0);
        targetCamPosRef.current = null;
      } else if (detail.kind === 'action') {
        if (detail.action === 'section') {
          setMode((m) => (m === 'section' ? 'orbit' : 'section'));
          setUsePlaneSlider(true);
        } else if (detail.action === 'unfold') {
          setMode((m) => (m === 'unfold' ? 'orbit' : 'unfold'));
        } else if (detail.action === 'explode') {
          setMode((m) => {
            const next = m === 'explode' ? 'orbit' : 'explode';
            setExplodeT(next === 'explode' ? 0.55 : 0);
            return next;
          });
        } else if (detail.action === 'reset') {
          setMode('orbit');
          setUnfoldT(0);
          setExplodeT(0);
          targetCamPosRef.current = new THREE.Vector3(5.2, 4.2, 6.2);
        }
      }
    };
    window.addEventListener('ai-classroom:remote-solid', onRemoteSolid);
    return () => window.removeEventListener('ai-classroom:remote-solid', onRemoteSolid);
  }, [selected]);

  const applyCameraPreset = (preset: CameraPreset) => {
    const map: Record<CameraPreset, THREE.Vector3> = {
      iso: new THREE.Vector3(5.2, 4.2, 6.2),
      front: new THREE.Vector3(0, 0.4, 8.6),
      top: new THREE.Vector3(0.01, 8.8, 0.01),
      side: new THREE.Vector3(8.6, 0.4, 0),
    };
    targetCamPosRef.current = map[preset];
  };

  const handleRollDice = () => {
    setUnfoldT(0);
    setMode('orbit');
    const faceIdx = Math.floor(Math.random() * 6);
    const val = DICE_FACE_VALUES[faceIdx];
    setRolledDiceVal(val);
    const camTargets = [
      new THREE.Vector3(0.5, -8.5, 0.8),
      new THREE.Vector3(0.5, 8.5, 0.8),
      new THREE.Vector3(0.4, 0.8, 8.5),
      new THREE.Vector3(8.5, 0.8, 0.4),
      new THREE.Vector3(-0.4, 0.8, -8.5),
      new THREE.Vector3(-8.5, 0.8, -0.4),
    ];
    targetCamPosRef.current = camTargets[faceIdx];
  };

  // ── 3. IN-PLACE CROSS-SECTION REBUILD (Electric Blue Plane + Glowing Pins) ─
  useEffect(() => {
    const group = sectionGroupRef.current;
    if (!group) return;
    disposeGroup(group);
    if (!sectionPolygon || sectionPolygon.points.length < 3) return;

    const center = centerRef.current;
    const pts = sectionPolygon.points.map((p) => {
      const t = toThree(p);
      return [t[0] - center[0], t[1] - center[1], t[2] - center[2]] as [number, number, number];
    });

    const { fillMat, outlineMat, pinMat } = createCrossSectionMaterials();
    const meshGeom = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) {
      pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
    }
    meshGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    meshGeom.computeVertexNormals();
    group.add(new THREE.Mesh(meshGeom, fillMat));

    const outGeom = new THREE.BufferGeometry();
    const outPos: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      outPos.push(...pts[i], ...pts[(i + 1) % pts.length]);
    }
    outGeom.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
    group.add(new THREE.LineSegments(outGeom, outlineMat));

    // Glowing intersection vertex pins
    const pinRadius = 0.085 / Math.max(baseScaleRef.current, 0.2);
    const pinGeom = new THREE.SphereGeometry(pinRadius, 12, 12);
    for (const pt of pts) {
      const pin = new THREE.Mesh(pinGeom, pinMat);
      pin.position.set(pt[0], pt[1], pt[2]);
      group.add(pin);
    }
  }, [sectionPolygon]);

  // Glitch-free 60fps Drag-to-Move 3D solid: preserves parent's translate3d(sx,sy,0) scale(s) matrix!
  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePositionRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let totalDx = 0;
    let totalDy = 0;
    const parentEl = rootElRef.current?.parentElement;

    // Read current screen-space transform (sx, sy, scale) from WhiteboardOverlay container
    // so we NEVER wipe out its world-locked position or zoom scale while dragging!
    let baseX = 0;
    let baseY = 0;
    let baseScale = 1;
    let hasParentMatrix = false;
    if (parentEl && typeof window !== 'undefined' && typeof DOMMatrix !== 'undefined') {
      const computed = window.getComputedStyle(parentEl).transform;
      if (computed && computed !== 'none') {
        const m = new DOMMatrix(computed);
        baseX = m.e;
        baseY = m.f;
        baseScale = m.a || 1;
        hasParentMatrix = true;
      }
    }

    const onMove = (ev: PointerEvent) => {
      totalDx = ev.clientX - startX;
      totalDy = ev.clientY - startY;
      if (parentEl && hasParentMatrix) {
        parentEl.style.transform = `translate3d(${baseX + totalDx}px, ${baseY + totalDy}px, 0) scale(${baseScale})`;
      } else if (rootElRef.current) {
        rootElRef.current.style.transform = `translate3d(${totalDx}px, ${totalDy}px, 0)`;
      }
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      if (!hasParentMatrix && rootElRef.current) {
        rootElRef.current.style.transform = '';
      } else if (!commit && parentEl && hasParentMatrix) {
        parentEl.style.transform = `translate3d(${baseX}px, ${baseY}px, 0) scale(${baseScale})`;
      }
      if (commit && (Math.abs(totalDx) > 0.5 || Math.abs(totalDy) > 0.5)) {
        onMovePositionRef.current?.(totalDx, totalDy);
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const enterSectionMode = () => {
    setMode('section');
    setUsePlaneSlider(false);
    if (polyhedron && selectedNodes.length < 3 && polyhedron.labels.length >= 6) {
      setSelectedNodes([polyhedron.labels[0], polyhedron.labels[2], polyhedron.labels[5]]);
    }
  };

  const dihedralDeg = Math.max(0, 180 - Math.round(unfoldT * 97));
  const vertexNodes = useMemo(
    () => interactiveNodes.filter((n) => n.kind === 'vertex'),
    [interactiveNodes]
  );

  return (
    <div
      ref={rootElRef}
      data-testid={`tongchuang-solid-${id}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className="relative flex h-full w-full flex-col items-center justify-center select-none"
    >
      {/* Top drag handle + Spring Camera Presets & 90° Guide Toggle (only when selected) */}
      {selected && (
        <div className="absolute top-1 left-1/2 z-30 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap">
          {onMovePosition && (
            <div
              data-testid={`solid-drag-handle-${id}`}
              onPointerDown={handleDragStart}
              title="Seret untuk menggeser bangun 3D"
              className="flex cursor-grab items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:cursor-grabbing"
            >
              <span>✋</span>
              <span>Geser</span>
            </div>
          )}
          <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 px-1 py-0.5 shadow-sm">
            {([['iso', 'Iso'], ['front', 'Depan'], ['top', 'Atas'], ['side', 'Samping']] as const).map(([key, lbl]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyCameraPreset(key)}
                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {lbl}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowGuides((v) => !v)}
              title="Tampilkan Garis Tinggi (t) & Sudut 90°"
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold transition ${
                showGuides ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              90°
            </button>
            <button
              type="button"
              data-testid={`solid-gimbal-toggle-${id}`}
              onClick={() => setShowGimbal((v) => !v)}
              title="Tampilkan / Sembunyikan Cincin Putar 360° (X/Y/Z)"
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold transition ${
                showGimbal ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:bg-cyan-50 hover:text-cyan-700'
              }`}
            >
              360°
            </button>
            <button
              type="button"
              onClick={() => setSnap15Deg((v) => !v)}
              title="Snap Sudut 15° (atau tahan Shift)"
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold transition ${
                snap15Deg ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              15°
            </button>
            <button
              type="button"
              onClick={() => {
                solidGroupRef.current?.quaternion.identity();
                setGimbalHud({ activeAxis: null, angleDeg: 0, dragging: false });
              }}
              title="Reset Rotasi 0°"
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              0°
            </button>
          </div>
          {gimbalHud.activeAxis && (
            <div
              data-testid={`solid-gimbal-hud-${id}`}
              className="rounded-full bg-slate-900/90 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white shadow"
            >
              {gimbalHud.activeAxis.toUpperCase()}: {gimbalHud.angleDeg}°
            </div>
          )}
        </div>
      )}

      {/* Main 3D Stage */}
      <div className="relative flex h-full w-full items-center justify-center">
        {/* Side-by-side 2D Extracted Cross-Section SVG with Interior Angles */}
        {mode === 'section' && projected2D && projected2D.points2D.length >= 3 && (
          <div
            data-testid="extracted-section-2d"
            className="pointer-events-none absolute -left-36 top-4 z-20 flex flex-col items-center rounded-2xl border border-blue-200 bg-white/95 p-2.5 text-slate-800 shadow-xl"
          >
            <div className="mb-1 text-[10px] font-bold tracking-wide text-blue-600 uppercase">
              Penampang Irisan
            </div>
            <svg width="120" height="120" viewBox="0 0 120 120" className="overflow-visible">
              <polygon
                points={projected2D.points2D.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                fill="rgba(37, 99, 235, 0.25)"
                stroke="#2563eb"
                strokeWidth="2"
              />
              {projected2D.points2D.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="3" fill="#2563eb" />
                  <text
                    x={p.x + (p.x < 60 ? -16 : 8)}
                    y={p.y + (p.y < 60 ? -6 : 12)}
                    fill="#1e293b"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {projected2D.anglesDeg[idx]}°
                  </text>
                </g>
              ))}
            </svg>
            <div className="mt-1 flex gap-2 text-[10px] text-slate-600">
              <span>L: <strong className="text-slate-900">{projected2D.area.toFixed(1)}</strong> cm²</span>
              <span>K: <strong className="text-slate-900">{projected2D.perimeter.toFixed(1)}</strong> cm</span>
            </div>
          </div>
        )}

        {/* Persistent Pure-Three.js WebGL Mount */}
        <div ref={mountRef} data-testid="three-webgl-mount" className="h-full w-full cursor-grab active:cursor-grabbing" />

        {webglError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 bg-slate-100 rounded-xl">
            WebGL tidak tersedia.
          </div>
        )}

        {/* Zero-Re-Render Imperative DOM Vertex Labels (A-H) */}
        <div
          ref={labelLayerRef}
          style={{ display: 'none' }}
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
        >
          {vertexNodes.map((v) => (
            <span
              key={v.id}
              className={`absolute top-0 left-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow ${
                selectedNodes.includes(v.id)
                  ? 'bg-pink-500 text-white ring-2 ring-white'
                  : 'bg-white/95 text-slate-800 border border-slate-300'
              }`}
            >
              {v.label}
            </span>
          ))}
        </div>

        {/* Dihedral Angle Badge in Unfold mode */}
        {mode === 'unfold' && (
          <div
            data-testid="dihedral-angle-badge"
            className="pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-lg border border-orange-300 bg-white/95 px-2.5 py-0.5 text-sm font-extrabold text-orange-600 shadow-lg"
          >
            {dihedralDeg}°
          </div>
        )}

        {/* Rolled Dice Result Badge */}
        {rolledDiceVal !== null && texturePreset === 'dice' && (
          <div
            data-testid="dice-roll-result"
            className="pointer-events-none absolute left-2 top-9 z-20 rounded-xl border border-red-200 bg-white/95 px-2.5 py-1 text-xs font-extrabold text-red-600 shadow-lg"
          >
            Hasil Dadu: {rolledDiceVal}
          </div>
        )}

        {/* Per-Face Customizer Popover */}
        {selected && showFaceCustomizer && (
          <FaceCustomizerPopover
            config={faceCustom}
            onChange={setFaceCustom}
            onClose={() => setShowFaceCustomizer(false)}
          />
        )}

        {/* Measurement HUD */}
        {mode === 'measure' && geoStats && (
          <div
            data-testid="solid-measure-hud"
            className="absolute right-2 top-2 z-20 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2 text-[11px] text-slate-800 shadow-xl"
          >
            <div className="mb-1 font-bold text-emerald-700">{label ?? localParams.type.toUpperCase()}</div>
            <div>Volume: <strong className="font-mono">{geoStats.volume.toFixed(2)} cm³</strong></div>
            <div>Luas Permukaan: <strong className="font-mono">{geoStats.surface_area.toFixed(2)} cm²</strong></div>
            {localParams.type === 'cube' && (
              <>
                <div>Diagonal Bidang: <strong className="font-mono">{(localParams.s * Math.SQRT2).toFixed(2)} cm</strong></div>
                <div>Diagonal Ruang: <strong className="font-mono">{(localParams.s * Math.sqrt(3)).toFixed(2)} cm</strong></div>
              </>
            )}
            {eulerInfo && (
              <div className="mt-1 border-t border-emerald-100 pt-1 text-[10px] text-slate-600">
                Euler: <strong className="font-mono text-emerald-700">V({eulerInfo.V}) − E({eulerInfo.E}) + F({eulerInfo.F}) = {eulerInfo.chi}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode Sub-Controls (Section Plane Slider / Unfold / Explode / Dimensions) */}
      {selected && mode === 'section' && polyhedron && (
        <div className="z-20 mb-1.5 flex items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-3 py-1 text-[11px] text-slate-700 shadow-md">
          <button
            type="button"
            onClick={() => setUsePlaneSlider((v) => !v)}
            className={`rounded-full px-2 py-0.5 font-semibold transition ${
              usePlaneSlider ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {usePlaneSlider ? 'Bidang Geser' : '3 Titik'}
          </button>
          {usePlaneSlider && (
            <>
              <label className="flex items-center gap-1">
                <span>Posisi</span>
                <input
                  type="range"
                  min={-0.95}
                  max={0.95}
                  step={0.05}
                  value={planeOffset}
                  onChange={(e) => setPlaneOffset(parseFloat(e.target.value))}
                  className="w-20 accent-blue-600"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>Sudut</span>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={planeTilt}
                  onChange={(e) => setPlaneTilt(parseFloat(e.target.value))}
                  className="w-16 accent-blue-600"
                />
              </label>
            </>
          )}
        </div>
      )}

      {selected && mode === 'unfold' && (
        <div className="z-20 mb-1.5 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs text-slate-800 shadow-md">
          <button
            type="button"
            onClick={() => {
              if (unfoldT >= 1) setUnfoldT(0);
              setIsUnfolding((v) => !v);
            }}
            className="rounded-full bg-orange-500 px-2.5 py-0.5 font-semibold text-white hover:bg-orange-600"
          >
            {isUnfolding ? '⏸ Jeda' : '▶ Buka/Lipat'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={unfoldT}
            onChange={(e) => {
              setIsUnfolding(false);
              setUnfoldT(parseFloat(e.target.value));
            }}
            aria-label="Persentase Jaring-Jaring"
            className="w-24 accent-orange-500"
          />
          <span className="font-mono text-[11px] font-bold text-orange-600">{Math.round(unfoldT * 100)}%</span>
        </div>
      )}

      {selected && mode === 'explode' && (
        <div className="z-20 mb-1.5 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs text-slate-800 shadow-md">
          <span className="font-semibold text-indigo-700">Pisah</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={explodeT}
            onChange={(e) => setExplodeT(parseFloat(e.target.value))}
            aria-label="Jarak Pisah Bagian"
            className="w-24 accent-indigo-600"
          />
          <span className="font-mono text-[11px] font-bold text-indigo-700">{Math.round(explodeT * 100)}%</span>
        </div>
      )}

      {selected && mode === 'size' && (
        <div className="z-20 mb-1.5 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] text-slate-800 shadow-md">
          {localParams.type === 'cube' && (
            <label className="flex items-center gap-1.5">
              <span className="font-semibold">s = {localParams.s} cm</span>
              <input type="range" min={1} max={10} step={0.5} value={localParams.s} onChange={(e) => updateParam({ s: Number(e.target.value) })} className="w-24 accent-indigo-600" />
            </label>
          )}
          {localParams.type === 'cuboid' && (
            <>
              <label className="flex items-center gap-1"><span>p:{localParams.l}</span><input type="range" min={1} max={10} step={0.5} value={localParams.l} onChange={(e) => updateParam({ l: Number(e.target.value) })} className="w-12 accent-indigo-600" /></label>
              <label className="flex items-center gap-1"><span>l:{localParams.w}</span><input type="range" min={1} max={10} step={0.5} value={localParams.w} onChange={(e) => updateParam({ w: Number(e.target.value) })} className="w-12 accent-indigo-600" /></label>
              <label className="flex items-center gap-1"><span>t:{localParams.h}</span><input type="range" min={1} max={10} step={0.5} value={localParams.h} onChange={(e) => updateParam({ h: Number(e.target.value) })} className="w-12 accent-indigo-600" /></label>
            </>
          )}
          {(localParams.type === 'cylinder' || localParams.type === 'cone') && (
            <>
              <label className="flex items-center gap-1"><span>r:{localParams.r}</span><input type="range" min={0.5} max={8} step={0.5} value={localParams.r} onChange={(e) => updateParam({ r: Number(e.target.value) })} className="w-16 accent-indigo-600" /></label>
              <label className="flex items-center gap-1"><span>t:{localParams.h}</span><input type="range" min={1} max={10} step={0.5} value={localParams.h} onChange={(e) => updateParam({ h: Number(e.target.value) })} className="w-16 accent-indigo-600" /></label>
            </>
          )}
          {localParams.type === 'sphere' && (
            <label className="flex items-center gap-1"><span>r = {localParams.r} cm</span><input type="range" min={1} max={8} step={0.5} value={localParams.r} onChange={(e) => updateParam({ r: Number(e.target.value) })} className="w-24 accent-indigo-600" /></label>
          )}
          {localParams.type === 'pyramid' && (
            <>
              <label className="flex items-center gap-1"><span>a:{localParams.b}</span><input type="range" min={1} max={10} step={0.5} value={localParams.b} onChange={(e) => updateParam({ b: Number(e.target.value) })} className="w-16 accent-indigo-600" /></label>
              <label className="flex items-center gap-1"><span>t:{localParams.h}</span><input type="range" min={1} max={10} step={0.5} value={localParams.h} onChange={(e) => updateParam({ h: Number(e.target.value) })} className="w-16 accent-indigo-600" /></label>
            </>
          )}
        </div>
      )}

      {/* CRISP SINGLE-ROW TONGCHUANG WHITE CONTEXTUAL ACTION BAR (Screenshot 3!) */}
      {selected && (
        <div
          role="toolbar"
          aria-label="Bilah Aksi Bangun Ruang 3D"
          data-testid={`solid-action-bar-${id}`}
          className={`z-20 flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/95 px-2 py-1 text-slate-700 shadow-lg backdrop-blur-md whitespace-nowrap ${
            compact ? 'scale-95' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => { setMode('orbit'); setAutoRotate((v) => !v); }}
            aria-pressed={autoRotate}
            title="Putar 360° Otomatis"
            className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
              autoRotate ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-300' : 'hover:bg-slate-100'
            }`}
          >
            <span className="text-sm leading-none">🔄</span>
            <span className="mt-0.5">Putar</span>
          </button>

          {polyhedron && (
            <button
              type="button"
              data-testid={`solid-btn-section-${id}`}
              onClick={() => (mode === 'section' ? setMode('orbit') : enterSectionMode())}
              aria-pressed={mode === 'section'}
              title="Irisan Bidang (3 Titik / Geser Bidang)"
              className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                mode === 'section' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-sm leading-none">✂️</span>
              <span className="mt-0.5">Irisan</span>
            </button>
          )}

          <button
            type="button"
            data-testid={`solid-btn-unfold-${id}`}
            onClick={() => setMode((m) => (m === 'unfold' ? 'orbit' : 'unfold'))}
            aria-pressed={mode === 'unfold'}
            title="Jaring-Jaring"
            className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
              mode === 'unfold' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-300' : 'hover:bg-slate-100'
            }`}
          >
            <span className="text-sm leading-none">📐</span>
            <span className="mt-0.5">Jaring</span>
          </button>

          {(polyhedron || extendedKind === 'compound') && (
            <button
              type="button"
              data-testid={`solid-btn-explode-${id}`}
              onClick={() => {
                setMode((m) => {
                  const next = m === 'explode' ? 'orbit' : 'explode';
                  if (next === 'explode' && explodeT === 0) setExplodeT(0.5);
                  if (next === 'orbit') setExplodeT(0);
                  return next;
                });
              }}
              aria-pressed={mode === 'explode'}
              title="Pisah Sisi / Bagian"
              className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                mode === 'explode' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-sm leading-none">🧩</span>
              <span className="mt-0.5">Pisah</span>
            </button>
          )}

          {texturePreset === 'dice' && (
            <button
              type="button"
              data-testid={`solid-btn-roll-${id}`}
              onClick={handleRollDice}
              title="Lempar Dadu Acak"
              className="flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 transition"
            >
              <span className="text-sm leading-none">🎲</span>
              <span className="mt-0.5">Lempar</span>
            </button>
          )}

          {texturePreset && (
            <button
              type="button"
              data-testid={`solid-btn-customface-${id}`}
              onClick={() => setShowFaceCustomizer((v) => !v)}
              aria-pressed={showFaceCustomizer}
              title="Kustom Warna & Isi Sisi"
              className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                showFaceCustomizer ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-sm leading-none">🎨</span>
              <span className="mt-0.5">Kustom</span>
            </button>
          )}

          {onEdit2D && (
            <button
              type="button"
              data-testid={`solid-btn-edit2d-${id}`}
              onClick={onEdit2D}
              title="Kembali ke 2D (Edit atau Gabung Bentuk Baru)"
              className="flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 transition"
            >
              <span className="text-sm leading-none">✏️</span>
              <span className="mt-0.5">Edit 2D</span>
            </button>
          )}

          <button
            type="button"
            data-testid={`solid-btn-size-${id}`}
            onClick={() => setMode((m) => (m === 'size' ? 'orbit' : 'size'))}
            aria-pressed={mode === 'size'}
            title="Ubah Ukuran Rusuk/Jari-jari"
            className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
              mode === 'size' ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-300' : 'hover:bg-slate-100'
            }`}
          >
            <span className="text-sm leading-none">↔️</span>
            <span className="mt-0.5">Ukuran</span>
          </button>

          <button
            type="button"
            data-testid={`solid-btn-measure-${id}`}
            onClick={() => setMode((m) => (m === 'measure' ? 'orbit' : 'measure'))}
            aria-pressed={mode === 'measure'}
            title="Ukur Volume, Luas, Diagonal"
            className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
              mode === 'measure' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300' : 'hover:bg-slate-100'
            }`}
          >
            <span className="text-sm leading-none">📏</span>
            <span className="mt-0.5">Ukur</span>
          </button>

          {polyhedron && (
            <button
              type="button"
              onClick={() => setShowLabels((v) => !v)}
              aria-pressed={showLabels}
              title="Titik A-H"
              className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                showLabels ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm leading-none">🏷️</span>
              <span className="mt-0.5">Label</span>
            </button>
          )}

          {onExplainAi && (
            <button
              type="button"
              onClick={onExplainAi}
              title="Jelaskan AI"
              className="flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50 transition"
            >
              <span className="text-sm leading-none">✨</span>
              <span className="mt-0.5">AI</span>
            </button>
          )}

          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              title="Salin"
              className="flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium hover:bg-slate-100 transition"
            >
              <span className="text-sm leading-none">📋</span>
              <span className="mt-0.5">Salin</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Hapus"
              className="flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              <span className="text-sm leading-none">🗑️</span>
              <span className="mt-0.5">Hapus</span>
            </button>
          )}

          <button
            type="button"
            data-testid={`solid-btn-confirm-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              setAutoRotate(false);
              onCloseToolbar?.();
            }}
            title="Selesai (Sembunyikan Bilah)"
            aria-label="Selesai"
            className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 active:scale-95"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
};
