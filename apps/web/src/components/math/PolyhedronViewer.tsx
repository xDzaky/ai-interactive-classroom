/// <reference types="@react-three/fiber" />
/**
 * PolyhedronViewer — P11-T04 / P11-T05
 * Interactive 3D viewer for polyhedra (cube, cuboid, prism, pyramid)
 * Features:
 * - Mathematical (Z-up) to Three.js (Y-up) coordinate conversion via toThree()
 * - Semi-transparent faces with visible wireframe edges
 * - Interactive vertex handles with Indonesian standard labels (A–H / T.ABCD)
 * - Click vertices to select (tap 3 vertices -> displays cross-section polygon & measurements)
 * - OrbitControls for pan/rotate/zoom
 */
import React, { useMemo, useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Polyhedron, Vec3 } from "@ai-classroom/geometry-core";
import {
  planeFrom3Points,
  intersectPolyhedronPlane,
  type SectionPolygon,
} from "@ai-classroom/geometry-core";
import { toThree } from "@/lib/coords";

export interface PolyhedronViewerProps {
  polyhedron: Polyhedron;
  selectedVertices?: string[];
  onVerticesSelect?: (vertices: string[]) => void;
  width?: number | string;
  height?: number | string;
  showSectionPlane?: boolean;
}

// ─── Inner R3F Scene ─────────────────────────────────────────────────────────

interface PolySceneProps {
  polyhedron: Polyhedron;
  selectedVertices: string[];
  onToggleVertex: (label: string) => void;
  sectionPolygon: SectionPolygon | null;
}

function PolyScene({
  polyhedron,
  selectedVertices,
  onToggleVertex,
  sectionPolygon,
}: PolySceneProps) {
  const { vertices, faces, edges, labels } = polyhedron;

  // Convert vertices to Three.js coordinates
  const threeVertices = useMemo(
    () => vertices.map((v) => toThree(v)),
    [vertices]
  );

  // Compute centroid in Three.js coords for centering
  const center = useMemo(() => {
    const sum = threeVertices.reduce(
      (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
      [0, 0, 0]
    );
    const n = threeVertices.length || 1;
    return [sum[0] / n, sum[1] / n, sum[2] / n] as [number, number, number];
  }, [threeVertices]);

  // Build faces mesh geometry via fan triangulation
  const facesGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (const face of faces) {
      const v0 = threeVertices[face[0]];
      for (let i = 1; i < face.length - 1; i++) {
        const v1 = threeVertices[face[i]];
        const v2 = threeVertices[face[i + 1]];
        positions.push(
          v0[0], v0[1], v0[2],
          v1[0], v1[1], v1[2],
          v2[0], v2[1], v2[2]
        );
      }
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }, [faces, threeVertices]);

  // Build unique wireframe edges geometry
  const edgesGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (const [u, v] of edges) {
      const p1 = threeVertices[u];
      const p2 = threeVertices[v];
      positions.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [edges, threeVertices]);

  // Section polygon geometry
  const sectionGeom = useMemo(() => {
    if (!sectionPolygon || sectionPolygon.points.length < 3) return null;
    const geom = new THREE.BufferGeometry();
    const pts = sectionPolygon.points.map((p) => toThree(p));
    const positions: number[] = [];

    const v0 = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const v1 = pts[i];
      const v2 = pts[i + 1];
      positions.push(
        v0[0], v0[1], v0[2],
        v1[0], v1[1], v1[2],
        v2[0], v2[1], v2[2]
      );
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();

    // Outline segments
    const outlineGeom = new THREE.BufferGeometry();
    const outlinePositions: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      outlinePositions.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
    }
    outlineGeom.setAttribute("position", new THREE.Float32BufferAttribute(outlinePositions, 3));

    return { meshGeom: geom, outlineGeom };
  }, [sectionPolygon]);

  return (
    <group position={[-center[0], -center[1], -center[2]]}>
      {/* 1. Semi-transparent faces */}
      <mesh geometry={facesGeometry}>
        <meshStandardMaterial
          color="#818cf8"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Hidden wireframe (dashed / dimmed) */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial
          color="#475569"
          transparent
          opacity={0.35}
          depthTest={false}
        />
      </lineSegments>

      {/* 3. Front visible wireframe */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#38bdf8" linewidth={2} />
      </lineSegments>

      {/* 4. Cross-section polygon overlay (P11-T05) */}
      {sectionGeom && (
        <group>
          <mesh geometry={sectionGeom.meshGeom}>
            <meshBasicMaterial
              color="#3b82f6"
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={sectionGeom.outlineGeom}>
            <lineBasicMaterial color="#60a5fa" linewidth={3} depthTest={false} />
          </lineSegments>
        </group>
      )}

      {/* 5. Vertex handles and labels */}
      {threeVertices.map((pos, idx) => {
        const label = labels[idx] ?? `V${idx}`;
        const isSelected = selectedVertices.includes(label);

        return (
          <group key={label} position={pos}>
            {/* Clickable handle sphere */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onToggleVertex(label);
              }}
            >
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? "#ec4899" : "#10b981"}
                emissive={isSelected ? "#f43f5e" : "#059669"}
                emissiveIntensity={0.6}
              />
            </mesh>

            {/* Vertex label overlay */}
            <Html position={[0.28, 0.28, 0]} center style={{ pointerEvents: "none" }}>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow-md transition-transform ${
                  isSelected
                    ? "scale-110 border-2 border-white bg-pink-600 text-white"
                    : "border border-slate-700 bg-slate-900/90 text-emerald-400"
                }`}
              >
                {label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ─── Main PolyhedronViewer Component ─────────────────────────────────────────

export function PolyhedronViewer({
  polyhedron,
  selectedVertices: controlledSelected,
  onVerticesSelect,
  width = "100%",
  height = "100%",
  showSectionPlane = true,
}: PolyhedronViewerProps) {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selected = controlledSelected ?? internalSelected;

  const handleToggleVertex = useCallback(
    (label: string) => {
      let next: string[];
      if (selected.includes(label)) {
        next = selected.filter((l) => l !== label);
      } else {
        // Keep max 3 vertices for section plane
        next = selected.length >= 3 ? [selected[1], selected[2], label] : [...selected, label];
      }
      setInternalSelected(next);
      onVerticesSelect?.(next);
    },
    [selected, onVerticesSelect]
  );

  // Compute 3-point cross-section when 3 vertices are selected
  const sectionPolygon = useMemo<SectionPolygon | null>(() => {
    if (!showSectionPlane || selected.length !== 3) return null;

    const idx0 = polyhedron.labels.indexOf(selected[0]);
    const idx1 = polyhedron.labels.indexOf(selected[1]);
    const idx2 = polyhedron.labels.indexOf(selected[2]);

    if (idx0 === -1 || idx1 === -1 || idx2 === -1) return null;

    const p0 = polyhedron.vertices[idx0];
    const p1 = polyhedron.vertices[idx1];
    const p2 = polyhedron.vertices[idx2];

    const plane = planeFrom3Points(p0, p1, p2);
    if (!plane) return null;

    return intersectPolyhedronPlane(polyhedron, plane);
  }, [polyhedron, selected, showSectionPlane]);

  return (
    <div
      data-testid="polyhedron-viewer"
      className="relative overflow-hidden rounded-xl bg-slate-950 select-none"
      style={{ width, height }}
    >
      <Canvas
        camera={{ position: [8, 6, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <directionalLight position={[-10, -10, -10]} intensity={0.4} />

        <PolyScene
          polyhedron={polyhedron}
          selectedVertices={selected}
          onToggleVertex={handleToggleVertex}
          sectionPolygon={sectionPolygon}
        />

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>

      {/* Floating Info Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="rounded-lg border border-slate-800 bg-slate-900/85 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md shadow-lg pointer-events-auto">
          <div className="font-semibold text-indigo-400 capitalize">
            {polyhedron.kind === "cube"
              ? "Kubus ABCD.EFGH"
              : polyhedron.kind === "cuboid"
              ? "Balok ABCD.EFGH"
              : polyhedron.kind === "prism"
              ? "Prisma Segitiga ABC.DEF"
              : "Limas Segiempat T.ABCD"}
          </div>
          <div className="text-[11px] text-slate-400">
            Klik 3 titik sudut untuk memotong bidang irisan
          </div>
        </div>

        {/* Cross-section details card */}
        {sectionPolygon && (
          <div
            data-testid="section-info-card"
            className="animate-in fade-in zoom-in-95 rounded-lg border border-blue-500/40 bg-slate-900/90 p-2.5 text-xs text-white shadow-xl backdrop-blur-md pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-semibold text-blue-400">
              <span>Bidang Irisan: {selected.join(" - ")}</span>
              <button
                onClick={() => {
                  setInternalSelected([]);
                  onVerticesSelect?.([]);
                }}
                className="text-slate-400 hover:text-white"
                title="Hapus irisan"
              >
                ✕
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                Luas:{" "}
                <strong className="text-white">
                  {sectionPolygon.area.toFixed(2)} cm²
                </strong>
              </div>
              <div>
                Keliling:{" "}
                <strong className="text-white">
                  {sectionPolygon.perimeter.toFixed(2)} cm
                </strong>
              </div>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              Titik potong: {sectionPolygon.points.length} titik
            </div>
          </div>
        )}
      </div>

      {/* Bottom control pills */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 text-xs">
        {selected.length > 0 && (
          <button
            onClick={() => {
              setInternalSelected([]);
              onVerticesSelect?.([]);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-300 hover:bg-slate-800 hover:text-white shadow-lg backdrop-blur-sm"
          >
            Reset Pilihan ({selected.length})
          </button>
        )}
      </div>
    </div>
  );
}

export default PolyhedronViewer;
