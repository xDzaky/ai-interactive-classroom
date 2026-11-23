/**
 * GeometryCatalogPopover.tsx — Unified Searchable 2D, 3D & Surface Geometry Catalog
 * Clean, single-workspace gallery without grade-level barriers.
 */
import React, { useState, useMemo } from 'react';
import type { SolidType } from '@ai-classroom/geometry-core';

export interface CatalogItem {
  id: string;
  label: string;
  category: '2D' | '3D' | 'Platonic' | 'Permukaan 3D';
  icon: string;
  action:
    | { kind: 'shape2d'; objectType: string; props: Record<string, unknown> }
    | {
        kind: 'solid3d';
        solidType: SolidType;
        extendedKind?: string;
        extraParams?: Record<string, unknown>;
        label: string;
      };
}

export const GEOMETRY_CATALOG: CatalogItem[] = [
  // Bangun Datar 2D
  { id: '2d-rect', label: 'Persegi / Persegi Panjang', category: '2D', icon: '▭', action: { kind: 'shape2d', objectType: 'rect', props: { w: 120, h: 90 } } },
  { id: '2d-triangle', label: 'Segitiga', category: '2D', icon: '△', action: { kind: 'shape2d', objectType: 'triangle', props: {} } },
  { id: '2d-circle', label: 'Lingkaran', category: '2D', icon: '○', action: { kind: 'shape2d', objectType: 'circle', props: { r: 52 } } },
  { id: '2d-ellipse', label: 'Elips', category: '2D', icon: '⬭', action: { kind: 'shape2d', objectType: 'ellipse', props: { rx: 72, ry: 44 } } },
  { id: '2d-trapezoid', label: 'Trapesium', category: '2D', icon: '⏢', action: { kind: 'shape2d', objectType: 'trapezoid', props: { topW: 72, bottomW: 130, h: 80 } } },
  { id: '2d-parallelogram', label: 'Jajar Genjang', category: '2D', icon: '▱', action: { kind: 'shape2d', objectType: 'parallelogram', props: { w: 130, h: 74, skew: 26 } } },
  { id: '2d-rhombus', label: 'Belah Ketupat', category: '2D', icon: '◇', action: { kind: 'shape2d', objectType: 'rhombus', props: { rx: 52, ry: 64 } } },
  { id: '2d-kite', label: 'Layang-Layang', category: '2D', icon: '🪁', action: { kind: 'shape2d', objectType: 'kite', props: { w: 96, h: 126 } } },
  { id: '2d-pentagon', label: 'Segi Lima', category: '2D', icon: '⬠', action: { kind: 'shape2d', objectType: 'pentagon', props: { r: 54 } } },
  { id: '2d-hexagon', label: 'Segi Enam', category: '2D', icon: '⬡', action: { kind: 'shape2d', objectType: 'hexagon', props: { r: 54 } } },
  { id: '2d-star', label: 'Bintang', category: '2D', icon: '☆', action: { kind: 'shape2d', objectType: 'star', props: { outerR: 56, innerR: 25, points: 5 } } },

  // Bangun Ruang 3D
  { id: '3d-cube', label: 'Kubus', category: '3D', icon: '🧊', action: { kind: 'solid3d', solidType: 'cube', label: 'Kubus ABCD.EFGH' } },
  { id: '3d-cuboid', label: 'Balok', category: '3D', icon: '📦', action: { kind: 'solid3d', solidType: 'cuboid', label: 'Balok ABCD.EFGH' } },
  { id: '3d-prism', label: 'Prisma Segitiga', category: '3D', icon: '⛺', action: { kind: 'solid3d', solidType: 'prism', label: 'Prisma Segitiga' } },
  { id: '3d-prism6', label: 'Prisma Segi-6', category: '3D', icon: '⬢', action: { kind: 'solid3d', solidType: 'prism', extendedKind: 'prism_n', extraParams: { sides: 6, r: 2, height: 4 }, label: 'Prisma Segi-6' } },
  { id: '3d-pyramid', label: 'Limas Segi-4', category: '3D', icon: '🔺', action: { kind: 'solid3d', solidType: 'pyramid', label: 'Limas T.ABCD' } },
  { id: '3d-frustum', label: 'Limas Terpancung', category: '3D', icon: '⏢', action: { kind: 'solid3d', solidType: 'pyramid', extendedKind: 'frustum', extraParams: { sides: 4, r: 2.4, height: 3.5, topScale: 0.48 }, label: 'Frustum Segi-4' } },
  { id: '3d-cylinder', label: 'Tabung', category: '3D', icon: '🛢️', action: { kind: 'solid3d', solidType: 'cylinder', label: 'Tabung' } },
  { id: '3d-cone', label: 'Kerucut', category: '3D', icon: '🍦', action: { kind: 'solid3d', solidType: 'cone', label: 'Kerucut' } },
  { id: '3d-sphere', label: 'Bola', category: '3D', icon: '⚪', action: { kind: 'solid3d', solidType: 'sphere', label: 'Bola' } },
  { id: '3d-hemisphere', label: 'Belahan Bola', category: '3D', icon: '🌗', action: { kind: 'solid3d', solidType: 'sphere', extendedKind: 'hemisphere', extraParams: { r: 2.6 }, label: 'Belahan Bola' } },
  { id: '3d-ellipsoid', label: 'Elipsoid', category: '3D', icon: '🥚', action: { kind: 'solid3d', solidType: 'sphere', extendedKind: 'ellipsoid', extraParams: { rx: 3.2, ry: 2, rz: 2 }, label: 'Elipsoid' } },
  { id: '3d-torus', label: 'Torus (Donat)', category: '3D', icon: '🍩', action: { kind: 'solid3d', solidType: 'torus', label: 'Torus' } },

  // Platonic Solids (all 5 complete!)
  { id: 'pl-tetra', label: 'Tetrahedron', category: 'Platonic', icon: '▲', action: { kind: 'solid3d', solidType: 'pyramid', extendedKind: 'tetrahedron', extraParams: { s: 3.5 }, label: 'Tetrahedron' } },
  { id: 'pl-octa', label: 'Octahedron', category: 'Platonic', icon: '◆', action: { kind: 'solid3d', solidType: 'pyramid', extendedKind: 'octahedron', extraParams: { s: 3.2 }, label: 'Octahedron' } },
  { id: 'pl-dodeca', label: 'Dodecahedron', category: 'Platonic', icon: '⬟', action: { kind: 'solid3d', solidType: 'sphere', extendedKind: 'dodecahedron', extraParams: { r: 2.5 }, label: 'Dodecahedron' } },
  { id: 'pl-icosa', label: 'Icosahedron', category: 'Platonic', icon: '⬡', action: { kind: 'solid3d', solidType: 'sphere', extendedKind: 'icosahedron', extraParams: { r: 2.5 }, label: 'Icosahedron' } },

  // Permukaan 3D Kalkulus & Parametrik
  { id: 'sf-wave', label: 'Gelombang sin(x)·cos(y)', category: 'Permukaan 3D', icon: '🌊', action: { kind: 'solid3d', solidType: 'cube', extendedKind: 'surface_3d', extraParams: { formula3d: 'sin(x)*cos(y)' }, label: 'z = sin(x)·cos(y)' } },
  { id: 'sf-saddle', label: 'Pelana (x² − y²)/4', category: 'Permukaan 3D', icon: '〰️', action: { kind: 'solid3d', solidType: 'cube', extendedKind: 'surface_3d', extraParams: { formula3d: '(x^2 - y^2)/4' }, label: 'z = (x²−y²)/4' } },
  { id: 'sf-paraboloid', label: 'Paraboloid (x² + y²)/5', category: 'Permukaan 3D', icon: '🥣', action: { kind: 'solid3d', solidType: 'cube', extendedKind: 'surface_3d', extraParams: { formula3d: '(x^2 + y^2)/5' }, label: 'z = (x²+y²)/5' } },
  { id: 'sf-mobius', label: 'Pita Möbius S(u,v)', category: 'Permukaan 3D', icon: '♾️', action: { kind: 'solid3d', solidType: 'torus', extendedKind: 'parametric_3d', extraParams: { preset: 'mobius' }, label: 'Pita Möbius' } },
  { id: 'sf-helicoid', label: 'Helicoid S(u,v)', category: 'Permukaan 3D', icon: '🌀', action: { kind: 'solid3d', solidType: 'torus', extendedKind: 'parametric_3d', extraParams: { preset: 'helicoid' }, label: 'Helicoid' } },
  { id: 'sf-torusknot', label: 'Torus-Knot 3D', category: 'Permukaan 3D', icon: '🥨', action: { kind: 'solid3d', solidType: 'torus', extendedKind: 'parametric_3d', extraParams: { preset: 'torus_knot' }, label: 'Torus-Knot' } },
];

export interface GeometryCatalogPopoverProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
}

export const GeometryCatalogPopover: React.FC<GeometryCatalogPopoverProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'Semua' | CatalogItem['category']>('Semua');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GEOMETRY_CATALOG.filter((item) => {
      if (tab !== 'Semua' && item.category !== tab) return false;
      if (q && !item.label.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, tab]);

  if (!open) return null;

  return (
    <div
      data-testid="geometry-catalog-popover"
      className="fixed left-16 top-16 z-50 w-80 rounded-2xl border border-slate-200 bg-white/98 p-3 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">Katalog Bangun 2D & 3D</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari kubus, trapesium, frustum, z=sin..."
        className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
      />

      <div className="mb-2 flex flex-wrap gap-1">
        {(['Semua', '2D', '3D', 'Platonic', 'Permukaan 3D'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`catalog-item-${item.id}`}
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2 text-left text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="line-clamp-2 leading-tight">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
