import React, { useState } from 'react';
import { ObjectsPanel, type BoardObjectItem } from './ObjectsPanel';
import { GroupedToolBar } from './GroupedToolBar';
import { ModePresetSelector, type WorkspaceModePreset } from './ModePresetSelector';
import type { ToolType } from '@/hooks/useWhiteboardTool';

export interface WorkspaceLayoutProps {
  objects: BoardObjectItem[];
  selectedObjectId?: string | null;
  onSelectObject: (id: string) => void;
  onToggleObjectVisibility: (id: string, hidden: boolean) => void;
  onToggleObjectLock: (id: string, locked: boolean) => void;
  onRenameObject: (id: string, newLabel: string) => void;
  onDeleteObject: (id: string) => void;
  activeTool: ToolType | string;
  onToolSelect: (tool: ToolType | string) => void;
  onSolidSelect?: (solidKind: string) => void;
  onOpenSectionTool?: () => void;
  onOpenUnfoldTool?: () => void;
  onOpenAiTutor?: () => void;
  children: React.ReactNode;
  headerTitle?: string;
  onExportPng?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  objects,
  selectedObjectId,
  onSelectObject,
  onToggleObjectVisibility,
  onToggleObjectLock,
  onRenameObject,
  onDeleteObject,
  activeTool,
  onToolSelect,
  onSolidSelect,
  onOpenSectionTool,
  onOpenUnfoldTool,
  onOpenAiTutor,
  children,
  headerTitle = 'Kelas Interaktif AI',
  onExportPng,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [isObjectsPanelOpen, setIsObjectsPanelOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<WorkspaceModePreset>('drawing');

  const handleModeChange = (mode: WorkspaceModePreset) => {
    setActiveMode(mode);
    if (mode === 'drawing') {
      onToolSelect('pen');
    } else if (mode === 'geometry') {
      onToolSelect('line');
    } else if (mode === 'solids') {
      onToolSelect('select');
    } else if (mode === 'graphing') {
      onToolSelect('select');
    }
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Top Navbar */}
      <header className="h-14 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 shadow-sm backdrop-blur">
        {/* Left: Brand + Toggle Panel Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsObjectsPanelOpen(!isObjectsPanelOpen)}
            aria-label={isObjectsPanelOpen ? 'Sembunyikan Panel Objek' : 'Buka Panel Objek'}
            className={`p-2 rounded-xl text-xs font-medium border transition ${
              isObjectsPanelOpen
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            📋 Objek ({objects.length})
          </button>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 hidden sm:inline">
            {headerTitle}
          </span>
        </div>

        {/* Center: Mode Presets */}
        <div className="hidden md:flex items-center">
          <ModePresetSelector
            activeMode={activeMode}
            onModeChange={handleModeChange}
          />
        </div>

        {/* Right: History & Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Urungkan (Undo)"
            className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            ↩
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Ulangi (Redo)"
            className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            ↪
          </button>
          {onExportPng && (
            <button
              onClick={onExportPng}
              aria-label="Ekspor PNG"
              className="hidden sm:flex items-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition shadow-sm"
            >
              📷 Ekspor
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left: Collapsible Objects Panel */}
        <ObjectsPanel
          objects={objects}
          selectedId={selectedObjectId}
          onSelect={onSelectObject}
          onToggleVisibility={onToggleObjectVisibility}
          onToggleLock={onToggleObjectLock}
          onRename={onRenameObject}
          onDelete={onDeleteObject}
          isOpen={isObjectsPanelOpen}
          onClose={() => setIsObjectsPanelOpen(false)}
        />

        {/* Canvas & Floating ToolBar Viewport */}
        <main className="relative flex-1 h-full w-full overflow-hidden">
          {/* Floating Grouped Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <GroupedToolBar
              activeTool={activeTool}
              onToolSelect={onToolSelect}
              onSolidSelect={onSolidSelect}
              onOpenSectionTool={onOpenSectionTool}
              onOpenUnfoldTool={onOpenUnfoldTool}
              onOpenAiTutor={onOpenAiTutor}
            />
          </div>

          {/* Canvas children */}
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
