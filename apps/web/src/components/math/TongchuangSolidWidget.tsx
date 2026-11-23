/**
 * TongchuangSolidWidget.tsx — P12 / P13 (Pure Three.js — React 19 native)
 * Interactive 3D math solid widget rendered directly on the dark matte blackboard,
 * modeled on the iFLYTEK Tongchuang AI Blackboard (讯飞同窗AI黑板).
 *
 * Uses native THREE.WebGLRenderer + OrbitControls + THREE.Raycaster (zero @react-three/fiber),
 * eliminating React 19 reconciler incompatibility while delivering smooth 60fps 3D interaction:
 * - Transparent WebGL canvas blended directly onto the chalkboard
 * - Crisp white wireframe edges + translucent faces + clickable white/pink vertex & midpoint nodes
 * - 360° free OrbitControls + Auto-Rotate + View Presets (Isometrik, Depan, Atas, Samping)
 * - Smooth 2D -> 3D extrusion/morph entry animation
 * - 3-Point Cross-Section (Irisan Bidang) with vivid blue polygon + live side-by-side 2D extracted
 *   projection showing exact interior angles in degrees (e.g. 60°, 110°, 120°, 130°)
 * - Interactive Unfold/Fold Net animation with live dihedral angle badge (e.g. 83°) & orange face
 * - Exploded View (Pisah Bagian) separating faces along normals
 * - Floating crisp white Tongchuang contextual action bar with green confirm button
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SolidParams, Polyhedron, Vec3, SectionPolygon } from '@ai-classroom/geometry-core';
import {
  buildPolyhedron,
  computeGeometry,
  planeFrom3Points,
  intersectPolyhedronPlane,
  computeFaceNormal,
  vecSub,
  vecCross,
  vecDot,
  vecLength,
} from '@ai-classroom/geometry-core';
import { buildThreeGeometry } from '@/lib/threeGeometry';
import { toThree } from '@/lib/coords';
import { useWeakDevice } from '@/lib/useWeakDevice';

export type SolidToolMode = 'orbit' | 'section' | 'unfold' | 'explode' | 'measure';
export type CameraPreset = 'iso' | 'front' | 'top' | 'side';

export interface TongchuangSolidWidgetProps {
  id: string;
  params: SolidParams;
  label?: string;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onExplainAi?: () => void;
  onDuplicate?: () => void;
  onSnapshot?: (dataUrl: string) => void;
  onCloseToolbar?: () => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onParamsChange?: (next: SolidParams) => void;
  /** Compact mode when embedded in WhiteboardOverlay */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Pure geometry helpers (2D cross-section projection + interior angles)
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
  const scale = 76 / span;
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

    const cosA = len1 > 1e-6 && len2 > 1e-6
      ? Math.max(-1, Math.min(1, vecDot(vPrev, vNext) / (len1 * len2)))
      : 0;
    anglesDeg.push(Math.round((Math.acos(cosA) * 180) / Math.PI));
  }

  return {
    points2D,
    anglesDeg,
    sideLengths,
    area: section.area,
    perimeter: section.perimeter,
  };
}

function buildPolyhedronFromParams(params: SolidParams): Polyhedron | null {
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

// ---------------------------------------------------------------------------
// Main TongchuangSolidWidget (Pure Three.js WebGLRenderer)
// ---------------------------------------------------------------------------

export const TongchuangSolidWidget: React.FC<TongchuangSolidWidgetProps> = ({
  id,
  params,
  label,
  selected = true,
  onSelect,
  onDelete,
  onExplainAi,
  onDuplicate,
  onSnapshot,
  onCloseToolbar,
  onMovePosition,
  onParamsChange,
  compact = false,
}) => {
  const isWeakDevice = useWeakDevice();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const [mode, setMode] = useState<SolidToolMode>('orbit');
  const [autoRotate, setAutoRotate] = useState(false);
  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [presetTick, setPresetTick] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [unfoldT, setUnfoldT] = useState(0);
  const [isUnfolding, setIsUnfolding] = useState(false);
  const [explodeT, setExplodeT] = useState(0);
  const [localParams, setLocalParams] = useState<SolidParams>(params);
  // Crisp dark slate wireframe for Always-White Whiteboard theme
  const wireColor = 0x1e293b;

  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  // Direct corner drag-to-resize 3D dimensions (no Custom icon needed)
  const handleCornerResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = { ...localParams };
    const onMove = (ev: PointerEvent) => {
      const delta = ((ev.clientX - startX) + (ev.clientY - startY)) / 80;
      const factor = Math.max(0.4, Math.min(2.5, 1 + delta));
      const round1 = (n: number) => Math.max(1, Math.min(12, Math.round(n * factor * 2) / 2));
      let next: SolidParams = base;
      if (base.type === 'cube') next = { type: 'cube', s: round1(base.s) };
      else if (base.type === 'cuboid') next = { type: 'cuboid', l: round1(base.l), w: round1(base.w), h: round1(base.h) };
      else if (base.type === 'cylinder') next = { type: 'cylinder', r: round1(base.r), h: round1(base.h) };
      else if (base.type === 'cone') next = { type: 'cone', r: round1(base.r), h: round1(base.h) };
      else if (base.type === 'sphere') next = { type: 'sphere', r: round1(base.r) };
      else if (base.type === 'pyramid') next = { type: 'pyramid', b: round1(base.b), h: round1(base.h) };
      else if (base.type === 'prism') next = { type: 'prism', a: round1(base.a), b: round1(base.b), c: round1(base.c), h: round1(base.h) };
      setLocalParams(next);
      onParamsChange?.(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Drag-to-move handle for repositioning the 3D solid on the blackboard
  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePosition) return;
    e.stopPropagation();
    let lastX = e.clientX;
    let lastY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (dx !== 0 || dy !== 0) onMovePosition(dx, dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Projected 2D screen positions for vertex labels (A-H)
  const [vertexOverlays, setVertexOverlays] = useState<
    { id: string; label: string; x: number; y: number; selected: boolean }[]
  >([]);

  const polyhedron = useMemo(() => buildPolyhedronFromParams(localParams), [localParams]);
  const geoStats = useMemo(() => {
    try {
      return computeGeometry(localParams);
    } catch {
      return null;
    }
  }, [localParams]);

  const interactiveNodes = useMemo(
    () => (polyhedron ? getInteractiveNodes(polyhedron) : []),
    [polyhedron]
  );

  const sectionPolygon = useMemo<SectionPolygon | null>(() => {
    if (!polyhedron || mode !== 'section' || selectedNodes.length !== 3) return null;
    const pts = selectedNodes
      .map((nid) => interactiveNodes.find((n) => n.id === nid)?.pos)
      .filter((p): p is Vec3 => Boolean(p));
    if (pts.length !== 3) return null;
    const plane = planeFrom3Points(pts[0], pts[1], pts[2]);
    if (!plane) return null;
    return intersectPolyhedronPlane(polyhedron, plane);
  }, [polyhedron, mode, selectedNodes, interactiveNodes]);

  const projected2D = useMemo(
    () => (sectionPolygon ? projectSectionPolygon2D(sectionPolygon) : null),
    [sectionPolygon]
  );

  // Refs for latest state inside rAF / event handlers
  const stateRef = useRef({
    mode,
    autoRotate,
    unfoldT,
    explodeT,
    showLabels,
    selectedNodes,
  });
  stateRef.current = { mode, autoRotate, unfoldT, explodeT, showLabels, selectedNodes };

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const faceEntriesRef = useRef<
    { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; normal: [number, number, number]; fIdx: number }[]
  >([]);
  const nodeMeshesRef = useRef<{ mesh: THREE.Mesh; node: InteractiveNode }[]>([]);
  const sectionGroupRef = useRef<THREE.Group | null>(null);
  const centerRef = useRef<[number, number, number]>([0, 0, 0]);
  const morphStartRef = useRef<number>(performance.now());

  // Play/Pause unfold animation
  useEffect(() => {
    if (!isUnfolding) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setUnfoldT((prev) => {
        const next = prev + dt * 0.45;
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

  // Apply camera presets
  useEffect(() => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const pos: Record<CameraPreset, [number, number, number]> = {
      iso: [7.5, 6, 8.5],
      front: [0, 0, 11],
      top: [0, 11, 0.01],
      side: [11, 0, 0],
    };
    const [x, y, z] = pos[preset];
    cam.position.set(x, y, z);
    ctrl.target.set(0, 0, 0);
    ctrl.update();
  }, [preset, presetTick]);

  // Build Three.js WebGL scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isWeakDevice,
        alpha: true,
        preserveDrawingBuffer: true,
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
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(7.5, 6, 8.5);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 2.4;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.1);
    dir1.position.set(10, 14, 10);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir2.position.set(-8, -10, -8);
    scene.add(dir2);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;
    faceEntriesRef.current = [];
    nodeMeshesRef.current = [];

    const sectionGroup = new THREE.Group();
    rootGroup.add(sectionGroup);
    sectionGroupRef.current = sectionGroup;

    if (polyhedron) {
      const threeVerts = polyhedron.vertices.map((v) => toThree(v));
      const cSum = threeVerts.reduce(
        (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
        [0, 0, 0]
      );
      const n = threeVerts.length || 1;
      const center: [number, number, number] = [cSum[0] / n, cSum[1] / n, cSum[2] / n];
      centerRef.current = center;

      // Faces
      polyhedron.faces.forEach((faceIndices, fIdx) => {
        const geom = new THREE.BufferGeometry();
        const positions: number[] = [];
        const v0 = threeVerts[faceIndices[0]];
        for (let i = 1; i < faceIndices.length - 1; i++) {
          const v1 = threeVerts[faceIndices[i]];
          const v2 = threeVerts[faceIndices[i + 1]];
          positions.push(
            v0[0] - center[0], v0[1] - center[1], v0[2] - center[2],
            v1[0] - center[0], v1[1] - center[1], v1[2] - center[2],
            v2[0] - center[0], v2[1] - center[1], v2[2] - center[2]
          );
        }
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.computeVertexNormals();

        const normalThree = toThree(computeFaceNormal(faceIndices, polyhedron.vertices));
        const nLen = Math.hypot(normalThree[0], normalThree[1], normalThree[2]) || 1;
        const unitNormal: [number, number, number] = [
          normalThree[0] / nLen,
          normalThree[1] / nLen,
          normalThree[2] / nLen,
        ];

        const mat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.14,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        rootGroup.add(mesh);
        faceEntriesRef.current.push({ mesh, mat, normal: unitNormal, fIdx });
      });

      // Crisp white Tongchuang wireframe edges
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
      const edgeLines = new THREE.LineSegments(
        edgeGeom,
        new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.95 })
      );
      rootGroup.add(edgeLines);

      // Interactive vertex + midpoint spheres
      const sphereGeom = new THREE.SphereGeometry(0.15, 14, 14);
      for (const node of interactiveNodes) {
        const tp = toThree(node.pos);
        const mat = new THREE.MeshStandardMaterial({
          color: node.kind === 'vertex' ? 0x4f46e5 : 0xec4899,
          emissive: node.kind === 'vertex' ? 0x3730a3 : 0xbe185d,
          emissiveIntensity: 0.35,
        });
        const mesh = new THREE.Mesh(sphereGeom, mat);
        mesh.position.set(tp[0] - center[0], tp[1] - center[1], tp[2] - center[2]);
        mesh.visible = node.kind === 'vertex';
        rootGroup.add(mesh);
        nodeMeshesRef.current.push({ mesh, node });
      }
    } else {
      centerRef.current = [0, 0, 0];
      const { geometry } = buildThreeGeometry(localParams);
      const fillMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      });
      rootGroup.add(new THREE.Mesh(geometry, fillMat));
      const wireMat = new THREE.MeshBasicMaterial({
        color: wireColor,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      rootGroup.add(new THREE.Mesh(geometry, wireMat));
    }

    // Raycaster for clicking vertex / edge-midpoint nodes
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const visibleMeshes = nodeMeshesRef.current.filter((n) => n.mesh.visible).map((n) => n.mesh);
      const hits = raycaster.intersectObjects(visibleMeshes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const found = nodeMeshesRef.current.find((n) => n.mesh === hitObj);
        if (found) {
          setMode('section');
          setSelectedNodes((prev) => {
            if (prev.includes(found.node.id)) return prev.filter((x) => x !== found.node.id);
            return prev.length >= 3 ? [prev[1], prev[2], found.node.id] : [...prev, found.node.id];
          });
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const nw = Math.max(180, container.clientWidth);
      const nh = Math.max(160, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    // Animation loop
    morphStartRef.current = performance.now();
    let snapped = false;
    let frameCount = 0;
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const st = stateRef.current;

      // 2D -> 3D extrusion morph animation
      const elapsed = Math.min(1, (performance.now() - morphStartRef.current) / 600);
      const morphT = Math.max(0.05, 1 - Math.pow(1 - elapsed, 3));
      rootGroup.scale.set(1, morphT, 1);

      // Update faces for Explode / Unfold
      for (const entry of faceEntriesRef.current) {
        const dist = st.explodeT * 1.35 + (entry.fIdx > 0 ? st.unfoldT * 0.9 : 0);
        entry.mesh.position.set(
          entry.normal[0] * dist,
          entry.normal[1] * dist,
          entry.normal[2] * dist
        );
        const isFoldFace = st.mode === 'unfold' && entry.fIdx === 1;
        entry.mat.color.setHex(isFoldFace ? 0xf97316 : 0x94a3b8);
        entry.mat.opacity = isFoldFace ? 0.72 : st.explodeT > 0.05 ? 0.42 : 0.14;
      }

      // Update node visibility & highlight
      for (const item of nodeMeshesRef.current) {
        item.mesh.visible = item.node.kind === 'vertex' || st.mode === 'section';
        const isSel = st.selectedNodes.includes(item.node.id);
        item.mesh.scale.setScalar(isSel ? 1.45 : 1);
        const mat = item.mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(isSel ? 0xec4899 : item.node.kind === 'midpoint' ? 0xf472b6 : 0x4f46e5);
        mat.emissive.setHex(isSel ? 0xec4899 : 0x3730a3);
      }

      controls.autoRotate = st.autoRotate && !isWeakDevice;
      controls.update();
      renderer.render(scene, camera);

      if (!snapped && onSnapshot) {
        snapped = true;
        try {
          const url = renderer.domElement.toDataURL('image/png');
          if (url.startsWith('data:image/')) onSnapshot(url);
        } catch {
          // ignore
        }
      }

      // Project vertex labels every 3rd frame to keep React light
      frameCount++;
      if (polyhedron && st.showLabels && frameCount % 3 === 0) {
        const cw = renderer.domElement.clientWidth || w;
        const ch = renderer.domElement.clientHeight || h;
        const nextOverlays = nodeMeshesRef.current
          .filter((item) => item.node.kind === 'vertex')
          .map((item) => {
            const worldPos = new THREE.Vector3();
            item.mesh.getWorldPosition(worldPos);
            worldPos.project(camera);
            return {
              id: item.node.id,
              label: item.node.label,
              x: (worldPos.x * 0.5 + 0.5) * cw,
              y: (-worldPos.y * 0.5 + 0.5) * ch,
              selected: st.selectedNodes.includes(item.node.id),
            };
          });
        setVertexOverlays(nextOverlays);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, [polyhedron, interactiveNodes, localParams, wireColor, isWeakDevice, onSnapshot]);

  // Rebuild cross-section polygon mesh whenever sectionPolygon changes
  useEffect(() => {
    const group = sectionGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    if (!sectionPolygon || sectionPolygon.points.length < 3) return;

    const center = centerRef.current;
    const pts = sectionPolygon.points.map((p) => {
      const t = toThree(p);
      return [t[0] - center[0], t[1] - center[1], t[2] - center[2]] as [number, number, number];
    });

    const meshGeom = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) {
      pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
    }
    meshGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    meshGeom.computeVertexNormals();
    group.add(
      new THREE.Mesh(
        meshGeom,
        new THREE.MeshBasicMaterial({
          color: 0x2563eb,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );

    const outGeom = new THREE.BufferGeometry();
    const outPos: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      outPos.push(...pts[i], ...pts[(i + 1) % pts.length]);
    }
    outGeom.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
    group.add(
      new THREE.LineSegments(
        outGeom,
        new THREE.LineBasicMaterial({ color: 0x93c5fd, depthTest: false })
      )
    );
  }, [sectionPolygon]);

  const enterSectionMode = () => {
    setMode('section');
    if (polyhedron && selectedNodes.length < 3 && polyhedron.labels.length >= 6) {
      setSelectedNodes([polyhedron.labels[0], polyhedron.labels[2], polyhedron.labels[5]]);
    }
  };

  const dihedralDeg = Math.max(0, 180 - Math.round(unfoldT * 97));

  return (
    <div
      data-testid={`tongchuang-solid-${id}`}
      onClick={onSelect}
      className="relative flex h-full w-full flex-col items-center justify-center select-none"
    >
      {/* Drag-to-move 3D Solid handle (White Theme) */}
      {onMovePosition && (
        <div
          data-testid={`solid-drag-handle-${id}`}
          onPointerDown={handleDragStart}
          title="Seret untuk menggeser bangun 3D"
          className="absolute top-1 left-1/2 z-30 -translate-x-1/2 flex cursor-grab items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-md backdrop-blur-sm hover:bg-slate-50 active:cursor-grabbing"
        >
          <span>✋</span>
          <span>Geser</span>
        </div>
      )}

      {/* Direct Corner Resize Handle for 3D Solid */}
      <div
        data-testid={`solid-resize-handle-${id}`}
        onPointerDown={handleCornerResizeStart}
        title="Tarik ujung untuk ubah ukuran 3D"
        className="absolute bottom-14 right-1 z-30 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-md border border-indigo-400 bg-white text-[10px] font-bold text-indigo-600 shadow-md hover:bg-indigo-50"
      >
        ↘
      </div>

      {/* Main Interactive Stage */}
      <div className="relative flex h-full w-full items-center justify-center">
        {/* Side-by-Side Extracted 2D Cross-Section SVG with Interior Angles (White Theme) */}
        {mode === 'section' && projected2D && projected2D.points2D.length >= 3 && (
          <div
            data-testid="extracted-section-2d"
            className="pointer-events-none absolute -left-36 top-4 z-20 flex flex-col items-center rounded-2xl border border-blue-200 bg-white/95 p-2.5 text-slate-800 shadow-xl backdrop-blur-md"
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

        {/* Transparent Pure-Three.js WebGL Mount */}
        <div ref={mountRef} data-testid="three-webgl-mount" className="h-full w-full cursor-grab active:cursor-grabbing" />

        {webglError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 bg-slate-900/70 rounded-xl">
            WebGL tidak tersedia di browser ini.
          </div>
        )}

        {/* Projected Vertex Labels (A-H) */}
        {showLabels &&
          vertexOverlays.map((v) => (
            <span
              key={v.id}
              style={{
                left: `${v.x}px`,
                top: `${v.y}px`,
                transform: 'translate(-50%, -130%)',
              }}
              className={`pointer-events-none absolute z-10 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow ${
                v.selected
                  ? 'bg-pink-500 text-white ring-2 ring-white'
                  : 'bg-white/95 text-slate-800 border border-slate-300'
              }`}
            >
              {v.label}
            </span>
          ))}

        {/* Dihedral Angle Badge in Unfold mode */}
        {mode === 'unfold' && (
          <div
            data-testid="dihedral-angle-badge"
            className="pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-lg border border-orange-300 bg-white/95 px-2.5 py-0.5 text-sm font-extrabold text-orange-600 shadow-lg"
          >
            {dihedralDeg}°
          </div>
        )}

        {/* Measurement HUD Overlay */}
        {mode === 'measure' && geoStats && (
          <div
            data-testid="solid-measure-hud"
            className="absolute right-2 top-2 z-20 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2 text-[11px] text-slate-800 shadow-xl backdrop-blur-md"
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
          </div>
        )}
      </div>

      {/* Mode Sub-Sliders */}
      {selected && mode === 'unfold' && (
        <div className="z-20 mb-1.5 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs text-slate-800 shadow-lg">
          <button
            type="button"
            onClick={() => {
              if (unfoldT >= 1) setUnfoldT(0);
              setIsUnfolding((v) => !v);
            }}
            className="rounded-full bg-orange-500 px-2.5 py-0.5 font-semibold text-white hover:bg-orange-600"
          >
            {isUnfolding ? '⏸ Jeda' : '▶ Lipat/Buka'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={unfoldT}
            onChange={(e) => {
              setIsUnfolding(false);
              setUnfoldT(parseFloat(e.target.value));
            }}
            aria-label="Persentase Jaring-Jaring"
            className="w-28 accent-orange-500"
          />
          <span className="font-mono text-[11px] font-bold text-orange-600">
            {Math.round(unfoldT * 100)}%
          </span>
        </div>
      )}

      {selected && mode === 'explode' && (
        <div className="z-20 mb-1.5 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs text-slate-800 shadow-lg">
          <span className="font-semibold text-indigo-700">Pisah Sisi</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={explodeT}
            onChange={(e) => setExplodeT(parseFloat(e.target.value))}
            aria-label="Jarak Pisah Bagian"
            className="w-28 accent-indigo-600"
          />
          <span className="font-mono text-[11px] font-bold text-indigo-700">
            {Math.round(explodeT * 100)}%
          </span>
        </div>
      )}

      {selected && mode === 'orbit' && !compact && (
        <div className="z-20 mb-1.5 flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow">
          {(['iso', 'front', 'top', 'side'] as CameraPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p);
                setPresetTick((t) => t + 1);
              }}
              className={`rounded-full px-2 py-0.5 capitalize transition ${
                preset === p ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200'
              }`}
            >
              {p === 'iso' ? 'Isometrik' : p === 'front' ? 'Depan' : p === 'top' ? 'Atas' : 'Samping'}
            </button>
          ))}
        </div>
      )}

      {/* CRISP WHITE TONGCHUANG CONTEXTUAL ACTION BAR */}
      {selected && (
        <div
          role="toolbar"
          aria-label="Bilah Aksi Bangun Ruang 3D"
          data-testid={`solid-action-bar-${id}`}
          className="z-20 flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 px-2 py-1.5 text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.38)] backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => {
              setMode('orbit');
              setAutoRotate((v) => !v);
            }}
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
              title="Irisan Bidang 3 Titik"
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
            title="Jaring-Jaring & Sudut Lipat"
            className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
              mode === 'unfold' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-300' : 'hover:bg-slate-100'
            }`}
          >
            <span className="text-sm leading-none">📐</span>
            <span className="mt-0.5">Jaring</span>
          </button>

          {polyhedron && (
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
              title="Pisah Bagian Sisi"
              className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                mode === 'explode' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-sm leading-none">🧩</span>
              <span className="mt-0.5">Pisah</span>
            </button>
          )}

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
              title="Tampilkan / Sembunyikan Titik A-H"
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
              title="Jelaskan Bangun Ruang dengan AI"
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
              title="Duplikat"
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
              title="Hapus Bangun Ruang"
              className="flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
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
            title="Selesai"
            aria-label="Selesai"
            className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-95"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
};
