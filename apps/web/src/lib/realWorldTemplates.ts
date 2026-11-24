/**
 * realWorldTemplates.ts — Unified Visual Template Catalog (V3)
 *
 * 3 clean categories for the Right-Side Slide-Out Visual Card Drawer:
 * 1. Bangun Datar (2D shapes)
 * 2. Bangun Ruang (3D solids, Platonic solids, 3D surfaces)
 * 3. Benda Sehari-hari (Parametric real-world objects: Dice 1-6, Rubik, Gift, Milk Box, Can, Hat, Cone, Tent, Pyramid, Globe, House, Clock, Pizza, Chessboard)
 */
import type { SolidType, CompoundSolidPart } from '@ai-classroom/geometry-core';
import type { TexturePreset } from './faceTextures';

export type TemplateCategory = 'Bangun Datar' | 'Bangun Ruang' | 'Benda Sehari-hari';

export interface VisualTemplateItem {
  id: string;
  label: string;
  subtitle: string;
  category: TemplateCategory;
  badge: '2D' | '3D' | 'Lipat' | 'Majemuk';
  thumbKind: string;
  accentColor: string;
  action:
    | { kind: 'shape2d'; objectType: string; props: Record<string, unknown> }
    | {
        kind: 'solid3d';
        solidType: SolidType;
        extendedKind?: string;
        texturePreset?: TexturePreset;
        compoundParts?: CompoundSolidPart[];
        extraParams?: Record<string, unknown>;
        label: string;
      };
}

export const VISUAL_TEMPLATES: VisualTemplateItem[] = [
  // ── 1. BENDA SEHARI-HARI (Parametric Real-World Objects) ────────────────
  {
    id: 'rw-dice',
    label: 'Dadu (1–6)',
    subtitle: 'Lipat 3D ↔ Pola Jaring',
    category: 'Benda Sehari-hari',
    badge: 'Lipat',
    thumbKind: 'dice',
    accentColor: '#ef4444',
    action: {
      kind: 'solid3d',
      solidType: 'cube',
      texturePreset: 'dice',
      label: 'Dadu Interaktif (1–6)',
    },
  },
  {
    id: 'rw-rubik',
    label: 'Rubik 3×3',
    subtitle: 'Kubus 27 Satuan',
    category: 'Benda Sehari-hari',
    badge: 'Lipat',
    thumbKind: 'rubik',
    accentColor: '#2563eb',
    action: {
      kind: 'solid3d',
      solidType: 'cube',
      texturePreset: 'rubik',
      label: 'Kubus Rubik 3×3',
    },
  },
  {
    id: 'rw-gift',
    label: 'Kotak Kado',
    subtitle: 'Luas Kertas Kado',
    category: 'Benda Sehari-hari',
    badge: 'Lipat',
    thumbKind: 'gift',
    accentColor: '#e11d48',
    action: {
      kind: 'solid3d',
      solidType: 'cube',
      texturePreset: 'gift',
      label: 'Kotak Kado',
    },
  },
  {
    id: 'rw-milk',
    label: 'Kotak Susu 1L',
    subtitle: 'Balok · 1000 cm³',
    category: 'Benda Sehari-hari',
    badge: 'Lipat',
    thumbKind: 'milk_box',
    accentColor: '#3b82f6',
    action: {
      kind: 'solid3d',
      solidType: 'cuboid',
      texturePreset: 'milk_box',
      label: 'Kotak Susu 1 Liter',
    },
  },
  {
    id: 'rw-house',
    label: 'Rumah 3D',
    subtitle: 'Balok + Atap Limas',
    category: 'Benda Sehari-hari',
    badge: 'Majemuk',
    thumbKind: 'house',
    accentColor: '#d97706',
    action: {
      kind: 'solid3d',
      solidType: 'cube',
      extendedKind: 'compound',
      texturePreset: 'house',
      compoundParts: [
        {
          id: 'body',
          label: 'Badan Rumah',
          solidType: 'cube',
          params: { type: 'cube', s: 4 },
          offsetCm: [0, 0, 0],
          colorHex: 0xfef3c7,
          texturePreset: 'house',
        },
        {
          id: 'roof',
          label: 'Atap Limas',
          solidType: 'pyramid',
          params: { type: 'pyramid', b: 4.4, h: 2.8 },
          offsetCm: [0, 3.4, 0],
          colorHex: 0xf97316,
        },
      ],
      label: 'Rumah 3D Majemuk',
    },
  },
  {
    id: 'rw-can',
    label: 'Kaleng Minuman',
    subtitle: 'Tabung 330 mL',
    category: 'Benda Sehari-hari',
    badge: '3D',
    thumbKind: 'soda_can',
    accentColor: '#dc2626',
    action: {
      kind: 'solid3d',
      solidType: 'cylinder',
      texturePreset: 'soda_can',
      label: 'Kaleng Minuman',
    },
  },
  {
    id: 'rw-hat',
    label: 'Topi Ulang Tahun',
    subtitle: 'Kerucut Polkadot',
    category: 'Benda Sehari-hari',
    badge: '3D',
    thumbKind: 'party_hat',
    accentColor: '#ec4899',
    action: {
      kind: 'solid3d',
      solidType: 'cone',
      texturePreset: 'party_hat',
      label: 'Topi Ulang Tahun',
    },
  },
  {
    id: 'rw-icecream',
    label: 'Cone Es Krim',
    subtitle: 'Kerucut + Belahan Bola',
    category: 'Benda Sehari-hari',
    badge: 'Majemuk',
    thumbKind: 'ice_cream',
    accentColor: '#f59e0b',
    action: {
      kind: 'solid3d',
      solidType: 'cone',
      texturePreset: 'ice_cream_cone',
      label: 'Cone Es Krim',
    },
  },
  {
    id: 'rw-traffic',
    label: 'Traffic Cone',
    subtitle: 'Kerucut Lalu Lintas',
    category: 'Benda Sehari-hari',
    badge: '3D',
    thumbKind: 'traffic_cone',
    accentColor: '#ea580c',
    action: {
      kind: 'solid3d',
      solidType: 'cone',
      texturePreset: 'traffic_cone',
      label: 'Traffic Cone',
    },
  },
  {
    id: 'rw-tent',
    label: 'Tenda Kemah',
    subtitle: 'Prisma Segitiga',
    category: 'Benda Sehari-hari',
    badge: 'Lipat',
    thumbKind: 'tent',
    accentColor: '#10b981',
    action: {
      kind: 'solid3d',
      solidType: 'prism',
      texturePreset: 'tent',
      label: 'Tenda Kemah',
    },
  },
  {
    id: 'rw-pyramid',
    label: 'Piramida Mesir',
    subtitle: 'Limas Segi-4',
    category: 'Benda Sehari-hari',
    badge: 'Lipat',
    thumbKind: 'egypt_pyramid',
    accentColor: '#b45309',
    action: {
      kind: 'solid3d',
      solidType: 'pyramid',
      texturePreset: 'egypt_pyramid',
      label: 'Piramida Mesir',
    },
  },
  {
    id: 'rw-globe',
    label: 'Globe Bumi',
    subtitle: 'Bola · Garis Lintang',
    category: 'Benda Sehari-hari',
    badge: '3D',
    thumbKind: 'globe',
    accentColor: '#0284c7',
    action: {
      kind: 'solid3d',
      solidType: 'sphere',
      texturePreset: 'globe',
      label: 'Globe Bumi',
    },
  },
  {
    id: 'rw-soccer',
    label: 'Bola Sepak',
    subtitle: 'Bola Geometri',
    category: 'Benda Sehari-hari',
    badge: '3D',
    thumbKind: 'soccer_ball',
    accentColor: '#334155',
    action: {
      kind: 'solid3d',
      solidType: 'sphere',
      texturePreset: 'soccer_ball',
      label: 'Bola Sepak',
    },
  },
  {
    id: 'rw-clock',
    label: 'Jam Dinding',
    subtitle: 'Sudut Lingkaran 360°',
    category: 'Benda Sehari-hari',
    badge: '2D',
    thumbKind: 'clock',
    accentColor: '#0f172a',
    action: { kind: 'shape2d', objectType: 'circle', props: { r: 62 } },
  },

  // ── 2. BANGUN DATAR (2D Geometry) ───────────────────────────────────────
  { id: '2d-square', label: 'Persegi', subtitle: '4 Sisi Sama', category: 'Bangun Datar', badge: '2D', thumbKind: 'rect', accentColor: '#4f46e5', action: { kind: 'shape2d', objectType: 'rect', props: { w: 100, h: 100 } } },
  { id: '2d-rect', label: 'Persegi Panjang', subtitle: 'p × l', category: 'Bangun Datar', badge: '2D', thumbKind: 'rect_wide', accentColor: '#4f46e5', action: { kind: 'shape2d', objectType: 'rect', props: { w: 140, h: 86 } } },
  { id: '2d-triangle', label: 'Segitiga', subtitle: '3 Sudut 180°', category: 'Bangun Datar', badge: '2D', thumbKind: 'triangle', accentColor: '#0ea5e9', action: { kind: 'shape2d', objectType: 'triangle', props: {} } },
  { id: '2d-circle', label: 'Lingkaran', subtitle: 'πr² · 2πr', category: 'Bangun Datar', badge: '2D', thumbKind: 'circle', accentColor: '#10b981', action: { kind: 'shape2d', objectType: 'circle', props: { r: 54 } } },
  { id: '2d-ellipse', label: 'Elips', subtitle: 'Sumbu Mayor/Minor', category: 'Bangun Datar', badge: '2D', thumbKind: 'ellipse', accentColor: '#14b8a6', action: { kind: 'shape2d', objectType: 'ellipse', props: { rx: 72, ry: 44 } } },
  { id: '2d-trapezoid', label: 'Trapesium', subtitle: 'Sisi Sejajar', category: 'Bangun Datar', badge: '2D', thumbKind: 'trapezoid', accentColor: '#8b5cf6', action: { kind: 'shape2d', objectType: 'trapezoid', props: { topW: 72, bottomW: 130, h: 80 } } },
  { id: '2d-parallelogram', label: 'Jajar Genjang', subtitle: 'Alas × Tinggi', category: 'Bangun Datar', badge: '2D', thumbKind: 'parallelogram', accentColor: '#6366f1', action: { kind: 'shape2d', objectType: 'parallelogram', props: { w: 130, h: 74, skew: 26 } } },
  { id: '2d-rhombus', label: 'Belah Ketupat', subtitle: '½ × d₁ × d₂', category: 'Bangun Datar', badge: '2D', thumbKind: 'rhombus', accentColor: '#ec4899', action: { kind: 'shape2d', objectType: 'rhombus', props: { rx: 52, ry: 64 } } },
  { id: '2d-kite', label: 'Layang-Layang', subtitle: 'Simetri Diagonal', category: 'Bangun Datar', badge: '2D', thumbKind: 'kite', accentColor: '#f59e0b', action: { kind: 'shape2d', objectType: 'kite', props: { w: 96, h: 126 } } },
  { id: '2d-pentagon', label: 'Segi Lima', subtitle: 'Pentagon Beraturan', category: 'Bangun Datar', badge: '2D', thumbKind: 'pentagon', accentColor: '#0284c7', action: { kind: 'shape2d', objectType: 'pentagon', props: { r: 54 } } },
  { id: '2d-hexagon', label: 'Segi Enam', subtitle: 'Heksagon Beraturan', category: 'Bangun Datar', badge: '2D', thumbKind: 'hexagon', accentColor: '#0d9488', action: { kind: 'shape2d', objectType: 'hexagon', props: { r: 54 } } },
  { id: '2d-star', label: 'Bintang', subtitle: 'Poligon Cekung', category: 'Bangun Datar', badge: '2D', thumbKind: 'star', accentColor: '#eab308', action: { kind: 'shape2d', objectType: 'star', props: { outerR: 56, innerR: 25, points: 5 } } },

  // ── 3. BANGUN RUANG (3D Solids, Platonic, & Surfaces) ───────────────────
  { id: '3d-cube', label: 'Kubus', subtitle: 'V = s³ · Lipat', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'cube', accentColor: '#3b82f6', action: { kind: 'solid3d', solidType: 'cube', label: 'Kubus ABCD.EFGH' } },
  { id: '3d-cuboid', label: 'Balok', subtitle: 'V = p × l × t', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'cuboid', accentColor: '#2563eb', action: { kind: 'solid3d', solidType: 'cuboid', label: 'Balok ABCD.EFGH' } },
  { id: '3d-prism', label: 'Prisma Segitiga', subtitle: 'Alas Segitiga', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'prism', accentColor: '#0d9488', action: { kind: 'solid3d', solidType: 'prism', label: 'Prisma Segitiga' } },
  { id: '3d-prism6', label: 'Prisma Segi-6', subtitle: 'Heksagonal', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'prism6', accentColor: '#0f766e', action: { kind: 'solid3d', solidType: 'prism', extendedKind: 'prism_n', extraParams: { sides: 6, r: 2, height: 4 }, label: 'Prisma Segi-6' } },
  { id: '3d-pyramid', label: 'Limas Segi-4', subtitle: 'V = ⅓ × L × t', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'pyramid', accentColor: '#d97706', action: { kind: 'solid3d', solidType: 'pyramid', label: 'Limas T.ABCD' } },
  { id: '3d-frustum', label: 'Limas Terpancung', subtitle: 'Frustum', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'frustum', accentColor: '#b45309', action: { kind: 'solid3d', solidType: 'pyramid', extendedKind: 'frustum', extraParams: { sides: 4, r: 2.4, height: 3.5, topScale: 0.48 }, label: 'Frustum Segi-4' } },
  { id: '3d-cylinder', label: 'Tabung', subtitle: 'V = πr²t', category: 'Bangun Ruang', badge: '3D', thumbKind: 'cylinder', accentColor: '#0284c7', action: { kind: 'solid3d', solidType: 'cylinder', label: 'Tabung' } },
  { id: '3d-cone', label: 'Kerucut', subtitle: 'V = ⅓πr²t', category: 'Bangun Ruang', badge: '3D', thumbKind: 'cone', accentColor: '#ea580c', action: { kind: 'solid3d', solidType: 'cone', label: 'Kerucut' } },
  { id: '3d-sphere', label: 'Bola', subtitle: 'V = ⁴⁄₃πr³', category: 'Bangun Ruang', badge: '3D', thumbKind: 'sphere', accentColor: '#4f46e5', action: { kind: 'solid3d', solidType: 'sphere', label: 'Bola' } },
  { id: '3d-torus', label: 'Torus (Donat)', subtitle: '2π²Rr²', category: 'Bangun Ruang', badge: '3D', thumbKind: 'torus', accentColor: '#9333ea', action: { kind: 'solid3d', solidType: 'torus', label: 'Torus' } },
  { id: 'pl-tetra', label: 'Tetrahedron', subtitle: 'Platonic · 4 Sisi', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'pyramid', accentColor: '#7c3aed', action: { kind: 'solid3d', solidType: 'pyramid', extendedKind: 'tetrahedron', extraParams: { s: 3.5 }, label: 'Tetrahedron' } },
  { id: 'pl-octa', label: 'Octahedron', subtitle: 'Platonic · 8 Sisi', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'octa', accentColor: '#6d28d9', action: { kind: 'solid3d', solidType: 'pyramid', extendedKind: 'octahedron', extraParams: { s: 3.2 }, label: 'Octahedron' } },
  { id: 'pl-dodeca', label: 'Dodecahedron', subtitle: 'Platonic · 12 Sisi', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'dodeca', accentColor: '#5b21b6', action: { kind: 'solid3d', solidType: 'sphere', extendedKind: 'dodecahedron', extraParams: { r: 2.5 }, label: 'Dodecahedron' } },
  { id: 'pl-icosa', label: 'Icosahedron', subtitle: 'Platonic · 20 Sisi', category: 'Bangun Ruang', badge: 'Lipat', thumbKind: 'dodeca', accentColor: '#4c1d95', action: { kind: 'solid3d', solidType: 'sphere', extendedKind: 'icosahedron', extraParams: { r: 2.5 }, label: 'Icosahedron' } },
  { id: 'sf-wave', label: 'Gelombang 3D', subtitle: 'z = sin(x)cos(y)', category: 'Bangun Ruang', badge: '3D', thumbKind: 'wave', accentColor: '#06b6d4', action: { kind: 'solid3d', solidType: 'cube', extendedKind: 'surface_3d', extraParams: { formula3d: 'sin(x)*cos(y)' }, label: 'z = sin(x)·cos(y)' } },
  { id: 'sf-mobius', label: 'Pita Möbius', subtitle: 'Parametrik S(u,v)', category: 'Bangun Ruang', badge: '3D', thumbKind: 'mobius', accentColor: '#14b8a6', action: { kind: 'solid3d', solidType: 'torus', extendedKind: 'parametric_3d', extraParams: { preset: 'mobius' }, label: 'Pita Möbius' } },
];
