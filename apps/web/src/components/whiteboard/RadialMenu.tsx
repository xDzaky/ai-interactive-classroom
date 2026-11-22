import React, { useState, useEffect } from 'react';

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  color?: string;
}

export interface RadialMenuProps {
  items: RadialMenuItem[];
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

const STORAGE_KEY = 'ai_classroom_radial_menu_pos';

export const RadialMenu: React.FC<RadialMenuProps> = ({
  items,
  defaultPosition = { x: 80, y: 300 },
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultPosition;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const radius = 90; // distance from center to items

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newPos = {
        x: Math.max(50, Math.min(window.innerWidth - 50, e.clientX - dragStart.x)),
        y: Math.max(50, Math.min(window.innerHeight - 50, e.clientY - dragStart.y)),
      };
      setPosition(newPos);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
        } catch {}
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      onClose?.();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex].action();
      setIsOpen(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Menu Radial Cepat"
      className="fixed z-40"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onKeyDown={handleKeyDown}
    >
      {/* Center toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={handleMouseDown}
        aria-expanded={isOpen}
        aria-label="Buka Menu Aksi Cepat AI"
        title="Klik untuk membuka menu, drag untuk memindahkan"
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-xl flex items-center justify-center font-bold text-lg select-none cursor-move transition-transform active:scale-95 border-2 border-white dark:border-slate-800"
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* Radial sector buttons */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Pilihan Menu Radial"
          className="absolute inset-0 pointer-events-none"
        >
          {items.map((item, index) => {
            const angle = (index / items.length) * 2 * Math.PI - Math.PI / 2;
            const x = Math.round(Math.cos(angle) * radius);
            const y = Math.round(Math.sin(angle) * radius);
            const isItemActive = index === activeIndex;

            return (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                aria-label={item.label}
                title={item.label}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  minWidth: '44px',
                  minHeight: '44px',
                }}
                className={`pointer-events-auto absolute -top-1 -left-1 w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-sm border transition-all duration-150 select-none ${
                  isItemActive
                    ? 'scale-110 ring-2 ring-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-300'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:scale-105 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{item.icon}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
