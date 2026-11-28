/**
 * SolarSystemWidget.tsx — Interactive 3D Solar System using Three.js (Lazy-Loaded, V8)
 *
 * Adapted from EasiNote `WebSolarSystem` & Honghe `GCPlanetsPlugin`:
 * Sun + 8 orbiting planets, orbital rings, time speed slider, and planet astronomy fact card.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PlanetSpec {
  name: string;
  radius: number;
  orbitR: number;
  speed: number;
  color: number;
  fact: string;
}

const PLANETS: PlanetSpec[] = [
  { name: 'Merkurius', radius: 0.22, orbitR: 2.2, speed: 1.6, color: 0x94a3b8, fact: 'Planet terkecil & terdekat dengan Matahari (periode 88 hari).' },
  { name: 'Venus', radius: 0.34, orbitR: 3.1, speed: 1.2, color: 0xf59e0b, fact: 'Planet terpanas di Tata Surya akibat efek rumah kaca tebal.' },
  { name: 'Bumi', radius: 0.38, orbitR: 4.2, speed: 1.0, color: 0x3b82f6, fact: 'Satu-satunya planet dengan air cair melimpah & kehidupan.' },
  { name: 'Mars', radius: 0.28, orbitR: 5.3, speed: 0.8, color: 0xef4444, fact: 'Planet Merah dengan gunung tertinggi Olympus Mons (21.9 km).' },
  { name: 'Jupiter', radius: 0.82, orbitR: 7.0, speed: 0.45, color: 0xd97706, fact: 'Planet terbesar, raksasa gas dengan Bintik Merah Besar.' },
  { name: 'Saturnus', radius: 0.72, orbitR: 9.0, speed: 0.34, color: 0xeab308, fact: 'Terkenal dengan sistem cincin es & batuan yang spektakuler.' },
  { name: 'Uranus', radius: 0.52, orbitR: 11.0, speed: 0.24, color: 0x38bdf8, fact: 'Raksasa es yang berotasi miring hampir 98° terhadap orbitnya.' },
  { name: 'Neptunus', radius: 0.5, orbitR: 12.8, speed: 0.18, color: 0x2563eb, fact: 'Planet terjauh dengan angin supersonik tercepat (>2.000 km/jam).' },
];

export interface SolarSystemWidgetProps {
  open: boolean;
  onClose: () => void;
}

export const SolarSystemWidget: React.FC<SolarSystemWidgetProps> = ({ open, onClose }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetSpec>(PLANETS[2]); // Bumi

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (!open || !mountRef.current) return;
    const el = mountRef.current;
    const w = el.clientWidth || 720;
    const h = el.clientHeight || 440;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(0, 14, 21);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x94a3b8, 0.75));
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 100);
    scene.add(sunLight);

    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
    );
    scene.add(sun);

    const planetNodes = PLANETS.map((p, idx) => {
      // Orbit ring
      const ringGeo = new THREE.RingGeometry(p.orbitR - 0.025, p.orbitR + 0.025, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 24, 24),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.65 }),
      );
      if (p.name === 'Saturnus') {
        const satRing = new THREE.Mesh(
          new THREE.RingGeometry(p.radius * 1.3, p.radius * 2.1, 32),
          new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
        );
        satRing.rotation.x = Math.PI / 2.3;
        mesh.add(satRing);
      }
      scene.add(mesh);
      return { spec: p, mesh, angle: idx * 0.9 };
    });

    let rafId = 0;
    let lastTs = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      for (const node of planetNodes) {
        node.angle += dt * node.spec.speed * 0.55 * speedRef.current;
        node.mesh.position.set(
          Math.cos(node.angle) * node.spec.orbitR,
          0,
          Math.sin(node.angle) * node.spec.orbitR * 0.88,
        );
        node.mesh.rotation.y += dt * 0.8;
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div data-testid="solar-system-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 sm:p-5 backdrop-blur-xs">
      <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-3 text-xs">
          <span className="text-sm font-bold">🪐 Tata Surya 3D Interaktif</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-slate-300">
              <span>Kecepatan: {speed}x</span>
              <input type="range" min={0} max={4} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-24 accent-amber-400" />
            </label>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700">
              Tutup ×
            </button>
          </div>
        </div>

        <div ref={mountRef} className="relative flex-1 min-h-0" />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/95 px-4 py-3 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {PLANETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setSelectedPlanet(p)}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${selectedPlanet.name === p.name ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-amber-200 max-w-md">
            <strong>{selectedPlanet.name}:</strong> {selectedPlanet.fact}
          </div>
        </div>
      </div>
    </div>
  );
};
