/**
 * SubjectHelperWidget.tsx — Shared Shell for V9 Smart Subject Helpers (Whiteboard + Notes)
 *
 * Zero-glitch 60fps drag-to-move header preserving WhiteboardOverlay DOMMatrix transform,
 * mobile pinch-guard (stopPropagation), and lazy-loaded visual builders.
 */
import React, { useRef } from "react";
import type { SubjectHelperProps } from "@ai-classroom/whiteboard-core";
import {
  HornerSchemeBody,
  MatrixGridBody,
  FactorTreeBody,
  NumberLineBody,
} from "./SubjectHelperPartsA";
import {
  VennDiagramBody,
  SampleSpaceTreeBody,
  UnitStairsBody,
} from "./SubjectHelperPartsB";

export interface SubjectHelperWidgetProps {
  id: string;
  helperProps: SubjectHelperProps;
  selected?: boolean;
  onSelect?: () => void;
  onUpdateProps?: (patch: Partial<SubjectHelperProps>) => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

export const SubjectHelperWidget: React.FC<SubjectHelperWidgetProps> = ({
  id,
  helperProps,
  selected = false,
  onSelect,
  onUpdateProps,
  onMovePosition,
  onDelete,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePosition) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    const startX = e.clientX;
    const startY = e.clientY;
    let dx = 0;
    let dy = 0;
    const parentEl = rootRef.current?.parentElement;
    let baseX = 0;
    let baseY = 0;
    let baseScale = 1;
    let hasMatrix = false;
    if (parentEl && typeof window !== "undefined" && typeof DOMMatrix !== "undefined") {
      const comp = window.getComputedStyle(parentEl).transform;
      if (comp && comp !== "none") {
        const m = new DOMMatrix(comp);
        baseX = m.e;
        baseY = m.f;
        baseScale = m.a || 1;
        hasMatrix = true;
      }
    }
    const onMove = (ev: PointerEvent) => {
      dx = ev.clientX - startX;
      dy = ev.clientY - startY;
      if (parentEl && hasMatrix) {
        parentEl.style.transform = `translate3d(${baseX + dx}px, ${baseY + dy}px, 0) scale(${baseScale})`;
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        onMovePosition(dx, dy);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const updateConfig = (patch: Record<string, unknown>) => {
    onUpdateProps?.({
      config: { ...(helperProps.config ?? {}), ...patch },
    });
  };

  const renderBody = () => {
    const cfg = helperProps.config ?? {};
    switch (helperProps.helperKind) {
      case "horner_scheme":
        return <HornerSchemeBody config={cfg} onUpdateConfig={updateConfig} />;
      case "matrix_grid":
        return <MatrixGridBody config={cfg} onUpdateConfig={updateConfig} />;
      case "factor_tree":
        return <FactorTreeBody config={cfg} onUpdateConfig={updateConfig} />;
      case "number_line":
        return <NumberLineBody config={cfg} onUpdateConfig={updateConfig} />;
      case "venn_diagram":
        return <VennDiagramBody config={cfg} onUpdateConfig={updateConfig} />;
      case "sample_space_tree":
        return <SampleSpaceTreeBody config={cfg} onUpdateConfig={updateConfig} />;
      case "unit_stairs":
        return <UnitStairsBody config={cfg} onUpdateConfig={updateConfig} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={rootRef}
      data-testid={`subject-helper-${id}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`group relative flex flex-col bg-transparent text-slate-800 select-none ${
        selected ? "rounded-lg ring-1 ring-indigo-400/70" : ""
      }`}
      style={{ minWidth: 340, maxWidth: 540 }}
    >
      <div className="p-1" onPointerDown={(e) => e.stopPropagation()}>
        {renderBody()}
      </div>

      {/* Minimal Floating Controls on Select / Hover (no card, no icon) */}
      <div
        className={`absolute -bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onMovePosition && (
          <button
            type="button"
            onPointerDown={handleDragStart}
            title="Geser"
            aria-label="Geser"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-md hover:border-indigo-400 hover:bg-indigo-50 active:cursor-grabbing"
          >
            ✥
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Hapus"
            aria-label="Hapus"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500 shadow-md hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
