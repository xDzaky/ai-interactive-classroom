/**
 * MeasureTool — P11-T06
 * Floating tool UI for 3D measurement:
 * - Displays active measurement (segment length for 2 selected vertices, angle for 3 vertices)
 * - Quick shortcuts for cube/cuboid: "Diagonal bidang AC", "Diagonal ruang AG" with Indonesian formulas
 */
import React from 'react';
import type { Polyhedron } from '@ai-classroom/geometry-core';
import {
  measureSegment,
  measureAngle,
  diagonalBidang,
  diagonalRuang,
  type MeasurementResult,
} from '@ai-classroom/geometry-core';

export interface MeasureToolProps {
  polyhedron: Polyhedron;
  selectedVertices: string[];
  onSelectShortcut?: (vertices: string[]) => void;
  onClear?: () => void;
}

export function MeasureTool({
  polyhedron,
  selectedVertices,
  onSelectShortcut,
  onClear,
}: MeasureToolProps) {
  const { kind, vertices, labels } = polyhedron;

  // Compute active measurement based on selected vertices
  const activeMeasurement = React.useMemo<MeasurementResult | null>(() => {
    if (selectedVertices.length === 2) {
      const idx1 = labels.indexOf(selectedVertices[0]);
      const idx2 = labels.indexOf(selectedVertices[1]);
      if (idx1 !== -1 && idx2 !== -1) {
        return measureSegment(
          selectedVertices[0],
          vertices[idx1],
          selectedVertices[1],
          vertices[idx2]
        );
      }
    } else if (selectedVertices.length === 3) {
      const idx1 = labels.indexOf(selectedVertices[0]);
      const idxV = labels.indexOf(selectedVertices[1]);
      const idx2 = labels.indexOf(selectedVertices[2]);
      if (idx1 !== -1 && idxV !== -1 && idx2 !== -1) {
        return measureAngle(
          selectedVertices[0],
          vertices[idx1],
          selectedVertices[1],
          vertices[idxV],
          selectedVertices[2],
          vertices[idx2]
        );
      }
    }
    return null;
  }, [selectedVertices, vertices, labels]);

  // Dimensions for shortcuts
  const isBox = kind === 'cube' || kind === 'cuboid';
  const side = 5; // default or from vertices
  const diagBidangRes = isBox ? diagonalBidang(kind, { side }, 'A', 'C') : null;
  const diagRuangRes = isBox ? diagonalRuang(kind, { side }, 'A', 'G') : null;

  return (
    <div
      data-testid="measure-tool"
      className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-xs text-white shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-amber-400">
        <span className="flex items-center gap-1.5">
          <span>📏</span> Alat Ukur & Sudut
        </span>
        {selectedVertices.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Reset
          </button>
        )}
      </div>

      {/* Active Measurement Result */}
      {activeMeasurement ? (
        <div
          data-testid="measurement-result"
          className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2 text-slate-200"
        >
          <div className="text-[11px] font-medium text-amber-300">
            {activeMeasurement.formula}
          </div>
          <div className="mt-0.5 text-base font-bold text-white">
            {activeMeasurement.formattedValue}
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400">
          Pilih 2 titik untuk panjang ruas, atau 3 titik untuk besar sudut.
        </div>
      )}

      {/* Diagonal shortcuts for Cube & Cuboid */}
      {isBox && (
        <div className="mt-1 flex flex-col gap-1 border-t border-slate-800 pt-1.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Rumus Cepat Diagonal
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onSelectShortcut?.(['A', 'C'])}
              data-testid="shortcut-diag-bidang"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-left text-[11px] transition hover:bg-slate-700 hover:text-white"
            >
              <div className="font-semibold text-sky-400">Diagonal Bidang AC</div>
              <div className="text-[10px] text-slate-400">
                {diagBidangRes?.formula}
              </div>
            </button>
            <button
              onClick={() => onSelectShortcut?.(['A', 'G'])}
              data-testid="shortcut-diag-ruang"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-left text-[11px] transition hover:bg-slate-700 hover:text-white"
            >
              <div className="font-semibold text-indigo-400">Diagonal Ruang AG</div>
              <div className="text-[10px] text-slate-400">
                {diagRuangRes?.formula}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeasureTool;
