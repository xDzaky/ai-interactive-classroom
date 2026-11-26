/**
 * customSlashItems.ts — AI Classroom Slash Command Definitions for AFFiNE / BlockSuite (V7)
 *
 * Allows teachers/students to invoke native AI Interactive Classroom engines
 * (/3d, /manimgx, /lab, /grafik) directly inside AFFiNE Page & Edgeless workspace.
 */
import type { ClassroomEmbedKind } from '@/lib/classroomBlockBridge';

export interface ClassroomSlashItem {
  id: string;
  command: string;
  title: string;
  description: string;
  icon: string;
  kind: ClassroomEmbedKind;
  defaultFormula?: string;
}

export const CLASSROOM_SLASH_ITEMS: ClassroomSlashItem[] = [
  {
    id: 'aic-slash-3d',
    command: '/3d',
    title: 'Bangun Ruang 3D (Gimbal & Jaring)',
    description: 'Sisipkan & buka Studio 3D interaktif (Kubus, Balok, Tabung, Irisan)',
    icon: '🧊',
    kind: 'solid3d',
  },
  {
    id: 'aic-slash-manimgx',
    command: '/manimgx',
    title: 'Visualisasi ManimGX (Kartesius / 3D)',
    description: 'Render grafik lingkaran Kartesius atau permukaan 3D zero-lag',
    icon: '🎬',
    kind: 'manimgx',
    defaultFormula: '(x - 2)^2 + (y - 1)^2 = 9',
  },
  {
    id: 'aic-slash-lab',
    command: '/lab',
    title: 'Laboratorium Virtual (12 Simulasi)',
    description: 'Buka eksperimen POE interaktif Matematika, Fisika, Kimia & Biologi',
    icon: '🔬',
    kind: 'virtual_lab',
  },
  {
    id: 'aic-slash-graph',
    command: '/grafik',
    title: 'Grafik Fungsi 2D & Rumus',
    description: 'Sisipkan plotter grafik fungsi matematika interaktif',
    icon: '📈',
    kind: 'math_graph',
    defaultFormula: 'y = sin(x)',
  },
];

/**
 * Matches a typed slash query (e.g. "/3d", "/manim", "/lab") against AI Classroom items.
 */
export function matchClassroomSlashCommand(query: string): ClassroomSlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q.startsWith('/')) return [];
  const token = q.slice(1);
  if (!token) return CLASSROOM_SLASH_ITEMS;
  return CLASSROOM_SLASH_ITEMS.filter(
    (item) =>
      item.command.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(token) ||
      item.description.toLowerCase().includes(token),
  );
}
