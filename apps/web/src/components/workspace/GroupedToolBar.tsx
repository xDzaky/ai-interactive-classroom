import React, { useState, useRef, useEffect } from 'react';
import type { ToolType } from '@/hooks/useWhiteboardTool';

export type WorkspaceToolGroup =
  | 'draw'
  | 'shapes'
  | 'geometry'
  | 'solids'
  | 'graph'
  | 'text'
  | 'ai';

export interface ToolItemDef {
  id: string;
  type?: ToolType;
  label: string;
  icon: string;
  shortcut?: string;
  action?: () => void;
}

export interface ToolGroupDef {
  id: WorkspaceToolGroup;
  label: string;
  icon: string;
  items: ToolItemDef[];
}

export interface GroupedToolBarProps {
  activeTool: ToolType | string;
  onToolSelect: (tool: ToolType | string) => void;
  onSolidSelect?: (solidKind: string) => void;
  onOpenSectionTool?: () => void;
  onOpenUnfoldTool?: () => void;
  onOpenAiTutor?: () => void;
  className?: string;
}

export const GroupedToolBar: React.FC<GroupedToolBarProps> = ({
  activeTool,
  onToolSelect,
  onSolidSelect,
  onOpenSectionTool,
  onOpenUnfoldTool,
  onOpenAiTutor,
  className = '',
}) => {
  const [openGroup, setOpenGroup] = useState<WorkspaceToolGroup | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const groups: ToolGroupDef[] = [
    {
      id: 'draw',
      label: 'Menggambar',
      icon: '✏️',
      items: [
        { id: 'select', type: 'select', label: 'Seleksi', icon: '↖', shortcut: 'V' },
        { id: 'pen', type: 'pen', label: 'Pena', icon: '✏️', shortcut: 'P' },
        { id: 'highlighter', type: 'highlighter', label: 'Stabilo', icon: '🖊', shortcut: 'H' },
        { id: 'eraser', type: 'eraser', label: 'Penghapus', icon: '⌫', shortcut: 'E' },
      ],
    },
    {
      id: 'shapes',
      label: 'Bentuk Datar',
      icon: '▭',
      items: [
        { id: 'rect', type: 'rect', label: 'Persegi / Kotak', icon: '▭', shortcut: 'R' },
        { id: 'circle', type: 'circle', label: 'Lingkaran', icon: '◯', shortcut: 'C' },
        { id: 'triangle', type: 'triangle', label: 'Segitiga', icon: '△' },
        { id: 'rhombus', type: 'rhombus', label: 'Belah Ketupat', icon: '◇' },
        { id: 'pentagon', type: 'pentagon', label: 'Segi Lima', icon: '⬠' },
        { id: 'hexagon', type: 'hexagon', label: 'Segi Enam', icon: '⬡' },
        { id: 'star', type: 'star', label: 'Bintang', icon: '☆' },
      ],
    },
    {
      id: 'geometry',
      label: 'Geometri 2D',
      icon: '📐',
      items: [
        { id: 'line', type: 'line', label: 'Garis', icon: '╱', shortcut: 'L' },
        { id: 'arrow', type: 'arrow', label: 'Panah / Vektor', icon: '→' },
        { id: 'measure_dist', label: 'Ukur Jarak', icon: '📏', action: () => onToolSelect('measure_dist') },
        { id: 'measure_angle', label: 'Ukur Sudut', icon: '∠', action: () => onToolSelect('measure_angle') },
      ],
    },
    {
      id: 'solids',
      label: 'Bangun Ruang 3D',
      icon: '🧊',
      items: [
        { id: 'solid_cube', label: 'Kubus ABCD.EFGH', icon: '🧊', action: () => onSolidSelect?.('cube') },
        { id: 'solid_cuboid', label: 'Balok', icon: '📦', action: () => onSolidSelect?.('cuboid') },
        { id: 'solid_prism', label: 'Prisma Segitiga', icon: '⛺', action: () => onSolidSelect?.('prism') },
        { id: 'solid_pyramid', label: 'Limas Segiempat', icon: '🔺', action: () => onSolidSelect?.('pyramid') },
        { id: 'solid_cylinder', label: 'Tabung', icon: '🥫', action: () => onSolidSelect?.('cylinder') },
        { id: 'solid_cone', label: 'Kerucut', icon: '🍦', action: () => onSolidSelect?.('cone') },
        { id: 'solid_sphere', label: 'Bola', icon: '⚽', action: () => onSolidSelect?.('sphere') },
        { id: 'solid_section', label: 'Irisan Bidang (Section)', icon: '✂️', action: onOpenSectionTool },
        { id: 'solid_unfold', label: 'Jaring-Jaring (Unfold)', icon: '📜', action: onOpenUnfoldTool },
      ],
    },
    {
      id: 'graph',
      label: 'Grafik & Fungsi',
      icon: '📈',
      items: [
        { id: 'graph_plot', label: 'Plot Fungsi y = f(x)', icon: '📈', action: () => onToolSelect('graph_plot') },
        { id: 'cartesian_grid', label: 'Grid Sumbu X-Y', icon: '▦', action: () => onToolSelect('cartesian_grid') },
      ],
    },
    {
      id: 'text',
      label: 'Teks & Rumus',
      icon: 'T',
      items: [
        { id: 'text', type: 'text', label: 'Teks Catatan', icon: 'T', shortcut: 'T' },
        { id: 'formula_katex', label: 'Rumus Matematika (KaTeX)', icon: '∑', action: () => onToolSelect('formula') },
      ],
    },
    {
      id: 'ai',
      label: 'AI Tutor',
      icon: '✨',
      items: [
        { id: 'ai_tutor', label: 'Tanya AI Assistant', icon: '✨', action: onOpenAiTutor },
      ],
    },
  ];

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGroupClick = (group: ToolGroupDef) => {
    if (openGroup === group.id) {
      setOpenGroup(null);
    } else {
      setOpenGroup(group.id);
    }
  };

  const handleItemSelect = (item: ToolItemDef) => {
    if (item.action) {
      item.action();
    } else if (item.type) {
      onToolSelect(item.type);
    } else {
      onToolSelect(item.id);
    }
    setOpenGroup(null);
  };

  return (
    <div
      ref={flyoutRef}
      role="toolbar"
      aria-label="Toolbar Geometri dan Papan Tulis"
      className={`relative inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur select-none ${className}`}
    >
      {groups.map((group) => {
        const isGroupActive = group.items.some((i) => i.id === activeTool || i.type === activeTool);
        const isOpen = openGroup === group.id;

        return (
          <div key={group.id} className="relative">
            <button
              onClick={() => handleGroupClick(group)}
              aria-label={`Kelompok alat ${group.label}`}
              aria-expanded={isOpen}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                isGroupActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isOpen
                  ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{group.icon}</span>
              <span className="hidden sm:inline">{group.label}</span>
              <span className="text-[10px] opacity-60">▾</span>
            </button>

            {/* Flyout popover */}
            {isOpen && (
              <div
                role="menu"
                aria-label={`Pilihan ${group.label}`}
                className="absolute left-0 mt-2 min-w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 tracking-wider">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isItemActive = item.id === activeTool || item.type === activeTool;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      role="menuitem"
                      aria-label={item.label}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        isItemActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <kbd className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
