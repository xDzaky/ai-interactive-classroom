/// <reference types="@react-three/fiber" />
/**
 * SolidViewer — P03-T03
 * React Three Fiber viewer for 3D solids.
 * Features:
 *  - Renders any solid from SolidParams via buildThreeGeometry
 *  - OrbitControls (drag to rotate, scroll to zoom)
 *  - Dimension labels via HTML overlay (R3F Html helper from drei)
 *  - Clip plane toggle (horizontal cross-section)
 *  - Low-quality mode (reduced segments for weak devices)
 *  - WebGL fallback message if canvas fails
 *  - Parameter panel: inputs to tweak solid parameters
 */
import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import { buildThreeGeometry } from "@/lib/threeGeometry";
import type { SolidParams } from "@ai-classroom/geometry-core";
import { computeGeometry } from "@ai-classroom/geometry-core";

// ---------------------------------------------------------------------------
// 3D Solid mesh (inner R3F component)
// ---------------------------------------------------------------------------

interface SolidMeshProps {
  params: SolidParams;
  lowQuality: boolean;
  clipPlane: THREE.Plane | null;
  color?: string;
  wireframe?: boolean;
}

function SolidMesh({ params, lowQuality: _lq, clipPlane, color = "#6366f1", wireframe = false }: SolidMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, dimensions } = useMemo(
    () => buildThreeGeometry(params),
    [params]
  );

  // Gentle auto-rotation
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const material = new THREE.MeshStandardMaterial({
    color,
    wireframe,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlane ? [clipPlane] : [],
    clipShadows: true,
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow>
        {/* Dimension label overlay */}
        <Html
          position={[0, dimensions.height / 2 + 0.5, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded bg-black/60 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-sm whitespace-nowrap">
            {dimensions.width.toFixed(1)} × {dimensions.height.toFixed(1)} × {dimensions.depth.toFixed(1)}
          </div>
        </Html>
      </mesh>
      {/* Grid floor */}
      <Grid
        args={[20, 20]}
        position={[0, -dimensions.height / 2 - 0.01, 0]}
        cellColor="#d1d5db"
        sectionColor="#9ca3af"
        fadeDistance={30}
        fadeStrength={1}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// SolidViewer props
// ---------------------------------------------------------------------------

export interface SolidViewerProps {
  params: SolidParams;
  onParamsChange?: (p: SolidParams) => void;
  width?: number | string;
  height?: number | string;
  showPanel?: boolean;
}

// ---------------------------------------------------------------------------
// Parameter panel (simple numeric inputs per solid type)
// ---------------------------------------------------------------------------

function ParamField({
  label,
  value,
  min = 0.1,
  max = 50,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700">
      <span className="w-14 shrink-0 font-medium">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
        aria-label={label}
      />
      <span className="w-10 text-right font-mono">{value.toFixed(1)}</span>
    </label>
  );
}

function SolidParamPanel({
  params,
  onChange,
}: {
  params: SolidParams;
  onChange: (p: SolidParams) => void;
}) {
  const up = (patch: Partial<typeof params>) =>
    onChange({ ...params, ...patch } as SolidParams);

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 capitalize">
        {params.type}
      </span>
      {params.type === "cube" && (
        <ParamField label="Sisi (s)" value={params.s} onChange={(s) => up({ s })} />
      )}
      {params.type === "cuboid" && (<>
        <ParamField label="Panjang (l)" value={params.l} onChange={(l) => up({ l })} />
        <ParamField label="Lebar (w)" value={params.w} onChange={(w) => up({ w })} />
        <ParamField label="Tinggi (h)" value={params.h} onChange={(h) => up({ h })} />
      </>)}
      {params.type === "sphere" && (
        <ParamField label="Radius (r)" value={params.r} onChange={(r) => up({ r })} />
      )}
      {(params.type === "cylinder" || params.type === "cone") && (<>
        <ParamField label="Radius (r)" value={params.r} onChange={(r) => up({ r })} />
        <ParamField label="Tinggi (h)" value={params.h} onChange={(h) => up({ h })} />
      </>)}
      {params.type === "pyramid" && (<>
        <ParamField label="Alas (b)" value={params.b} onChange={(b) => up({ b })} />
        <ParamField label="Tinggi (h)" value={params.h} onChange={(h) => up({ h })} />
      </>)}
      {params.type === "torus" && (<>
        <ParamField label="Radius besar (R)" value={params.R} onChange={(R) => up({ R })} />
        <ParamField label="Radius kecil (r)" value={params.r} onChange={(r) => up({ r })} />
      </>)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SolidViewer — main exported component
// ---------------------------------------------------------------------------

export function SolidViewer({
  params,
  onParamsChange,
  width = "100%",
  height = 400,
  showPanel = true,
}: SolidViewerProps) {
  const [localParams, setLocalParams] = useState<SolidParams>(params);
  const [clipEnabled, setClipEnabled] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [lowQuality] = useState(() =>
    // Detect weak GPU: navigator.deviceMemory < 4 or hardwareConcurrency < 4
    typeof navigator !== "undefined" &&
    ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) < 4
  );
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handleChange = (p: SolidParams) => {
    setLocalParams(p);
    onParamsChange?.(p);
  };

  const clipPlane = clipEnabled
    ? new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
    : null;

  let formulaResult;
  try {
    formulaResult = computeGeometry(localParams);
  } catch {
    formulaResult = null;
  }

  if (webglError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center"
        style={{ width, height }}
        role="alert"
        aria-label="WebGL tidak tersedia"
      >
        <span className="text-4xl">🖥️</span>
        <p className="font-medium text-gray-700">WebGL tidak tersedia</p>
        <p className="text-sm text-gray-500">
          Browser atau perangkat Anda tidak mendukung rendering 3D.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3" aria-label={`Visualisasi 3D: ${localParams.type}`}>
      {/* Three.js Canvas */}
      <div
        className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-900"
        style={{ height }}
      >
        <Canvas
          gl={{ antialias: !lowQuality, localClippingEnabled: true }}
          camera={{ position: [4, 3, 6], fov: 45 }}
          shadows
          onCreated={({ gl }) => {
            if (!gl.getContext()) setWebglError(true);
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
            <SolidMesh
              params={localParams}
              lowQuality={lowQuality}
              clipPlane={clipPlane}
              wireframe={wireframe}
            />
            <OrbitControls makeDefault />
            {!lowQuality && <Environment preset="city" />}
          </Suspense>
        </Canvas>

        {/* Controls overlay */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            onClick={() => setClipEnabled((v) => !v)}
            aria-label={clipEnabled ? "Matikan bidang potong" : "Aktifkan bidang potong"}
            aria-pressed={clipEnabled}
            className={[
              "rounded-md px-2 py-1 text-xs font-medium shadow transition-colors",
              clipEnabled
                ? "bg-blue-500 text-white"
                : "bg-white/80 text-gray-700 hover:bg-white",
            ].join(" ")}
          >
            ✂ Potong
          </button>
          <button
            onClick={() => setWireframe((v) => !v)}
            aria-label={wireframe ? "Mode solid" : "Mode wireframe"}
            aria-pressed={wireframe}
            className={[
              "rounded-md px-2 py-1 text-xs font-medium shadow transition-colors",
              wireframe
                ? "bg-blue-500 text-white"
                : "bg-white/80 text-gray-700 hover:bg-white",
            ].join(" ")}
          >
            ⬡ Wireframe
          </button>
        </div>
      </div>

      {/* Side panel: params + formulas */}
      {showPanel && (
        <div className="flex w-56 shrink-0 flex-col gap-3">
          {/* Parameter sliders */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SolidParamPanel params={localParams} onChange={handleChange} />
          </div>

          {/* Formula display */}
          {formulaResult && (
            <div className="rounded-xl border border-gray-100 bg-indigo-50 p-3 text-xs text-gray-700">
              <div className="mb-1 font-semibold text-indigo-700">Rumus</div>
              <div className="font-mono">{formulaResult.formula_volume}</div>
              <div className="mt-1 text-gray-600">{formulaResult.label_volume}</div>
              <div className="mt-2 font-mono">{formulaResult.formula_surface_area}</div>
              <div className="mt-1 text-gray-600">{formulaResult.label_surface_area}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SolidViewer;
