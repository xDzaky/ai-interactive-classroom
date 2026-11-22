import React from 'react';

export type WorkspaceModePreset =
  | 'drawing'
  | 'graphing'
  | 'geometry'
  | 'solids';

export interface ModePresetDef {
  id: WorkspaceModePreset;
  label: string;
  icon: string;
  description: string;
}

export const MODE_PRESETS: ModePresetDef[] = [
  {
    id: 'drawing',
    label: 'Menggambar',
    icon: '🎨',
    description: 'Papan tulis bebas, pena, stabilo, dan catatan',
  },
  {
    id: 'geometry',
    label: 'Geometri',
    icon: '📐',
    description: 'Konstruksi bidang datar, sudut, dan pengukuran',
  },
  {
    id: 'solids',
    label: 'Bangun Ruang',
    icon: '🧊',
    description: 'Visualisasi 3D bangun ruang, irisan, dan jaring-jaring',
  },
  {
    id: 'graphing',
    label: 'Grafik 2D',
    icon: '📈',
    description: 'Plot fungsi matematika dan sumbu koordinat Kartesius',
  },
];

export interface ModePresetSelectorProps {
  activeMode: WorkspaceModePreset;
  onModeChange: (mode: WorkspaceModePreset) => void;
  className?: string;
}

export const ModePresetSelector: React.FC<ModePresetSelectorProps> = ({
  activeMode,
  onModeChange,
  className = '',
}) => {
  return (
    <nav
      aria-label="Preset Mode Pembelajaran"
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm ${className}`}
    >
      {MODE_PRESETS.map((preset) => {
        const isActive = activeMode === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => onModeChange(preset.id)}
            aria-pressed={isActive}
            aria-label={`Mode ${preset.label}: ${preset.description}`}
            title={preset.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
