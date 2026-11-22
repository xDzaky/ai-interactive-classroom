import React, { useState, useMemo } from 'react';

export interface BoardObjectItem {
  id: string;
  type: 'viz_solid' | 'rect' | 'circle' | 'triangle' | 'line' | 'text' | 'graph' | 'stroke' | string;
  label?: string;
  color?: string;
  hidden?: boolean;
  locked?: boolean;
  meta?: Record<string, any>;
}

export interface ObjectsPanelProps {
  objects: BoardObjectItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string, hidden: boolean) => void;
  onToggleLock: (id: string, locked: boolean) => void;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ObjectsPanel: React.FC<ObjectsPanelProps> = ({
  objects,
  selectedId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete,
  isOpen = true,
  onClose,
}) => {
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredObjects = useMemo(() => {
    if (!filter.trim()) return objects;
    const q = filter.toLowerCase();
    return objects.filter(
      (obj) =>
        (obj.label && obj.label.toLowerCase().includes(q)) ||
        obj.type.toLowerCase().includes(q) ||
        obj.id.toLowerCase().includes(q)
    );
  }, [objects, filter]);

  const categorized = useMemo(() => {
    const solids = filteredObjects.filter((o) => o.type === 'viz_solid');
    const shapes = filteredObjects.filter((o) =>
      ['rect', 'circle', 'triangle', 'line', 'polygon', 'star', 'ellipse', 'rhombus'].includes(o.type)
    );
    const graphs = filteredObjects.filter((o) => o.type === 'graph');
    const others = filteredObjects.filter(
      (o) => !['viz_solid', 'rect', 'circle', 'triangle', 'line', 'polygon', 'star', 'ellipse', 'rhombus', 'graph'].includes(o.type)
    );

    return [
      { name: 'Bangun Ruang (3D)', items: solids },
      { name: 'Bentuk Datar (2D)', items: shapes },
      { name: 'Grafik & Fungsi', items: graphs },
      { name: 'Lainnya & Teks', items: others },
    ].filter((g) => g.items.length > 0);
  }, [filteredObjects]);

  const handleStartRename = (obj: BoardObjectItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(obj.id);
    setEditName(obj.label || `${obj.type}_${obj.id.slice(0, 4)}`);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Panel Objek Aljabar dan Geometri"
      className="w-72 bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-lg backdrop-blur z-20 text-slate-800 dark:text-slate-100 select-none transition-all duration-200"
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-indigo-600 dark:text-indigo-400">
            Daftar Objek ({objects.length})
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup Panel Objek"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search / Filter */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800/60">
        <input
          type="text"
          placeholder="Cari objek..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter objek"
          className="w-full text-xs px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 focus:outline-none dark:text-slate-200"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categorized.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {objects.length === 0 ? 'Belum ada objek di papan.' : 'Tidak ditemukan objek yang cocok.'}
          </div>
        ) : (
          categorized.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 py-0.5">
                {cat.name}
              </div>
              <ul className="space-y-0.5" role="list">
                {cat.items.map((obj) => {
                  const isSelected = obj.id === selectedId;
                  const displayName = obj.label || `${obj.type}_${obj.id.slice(0, 4)}`;

                  return (
                    <li
                      key={obj.id}
                      onClick={() => onSelect(obj.id)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 font-medium text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {/* Name & Dot */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: obj.color || '#3b82f6' }}
                        />
                        {editingId === obj.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => handleSaveRename(obj.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(obj.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            aria-label={`Ubah nama ${displayName}`}
                            className="text-xs px-1 py-0.5 border rounded bg-white dark:bg-slate-800 focus:outline-none w-full"
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => handleStartRename(obj, e)}
                            className="truncate"
                            title="Klik ganda untuk mengubah nama"
                          >
                            {displayName}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                        {/* Visibility */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(obj.id, !obj.hidden);
                          }}
                          aria-label={obj.hidden ? `Tampilkan ${displayName}` : `Sembunyikan ${displayName}`}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
                            obj.hidden ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {obj.hidden ? '👁‍🗨' : '👁'}
                        </button>

                        {/* Lock */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock(obj.id, !obj.locked);
                          }}
                          aria-label={obj.locked ? `Buka kunci ${displayName}` : `Kunci ${displayName}`}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
                            obj.locked ? 'text-amber-500' : 'text-slate-400'
                          }`}
                        >
                          {obj.locked ? '🔒' : '🔓'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(obj.id);
                          }}
                          aria-label={`Hapus ${displayName}`}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                        >
                          🗑
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
