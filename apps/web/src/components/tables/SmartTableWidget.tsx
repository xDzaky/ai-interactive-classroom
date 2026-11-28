/**
 * SmartTableWidget.tsx — V9 Interactive Smart Custom Table Engine (Whiteboard + Notes)
 *
 * Features:
 * - Zero-glitch 60fps drag-to-move header (preserves WhiteboardOverlay DOMMatrix scale/translation)
 * - Instant +Row / +Col / -Row / -Col controls & inline tap-to-edit (mobile pinch-guard & >=16px font)
 * - Paste directly from Excel / Google Sheets / CSV (auto-expands rows & columns)
 * - Pedagogical "Tirai Sel" (Cell Reveal ?) quiz mode
 * - Deterministic Statistics Mode (Data Kelompok & Data Tunggal): auto x_i, f_i*x_i, f_k,
 *   auto-highlight Kelas Median & Kelas Modus, Textbook callout badges, Step-by-Step Solver Card,
 *   and 1-Click Reactive Chart (Histogram / Poligon / Ogive)
 * - Function Values live evaluator + 1-Click Plot Graph
 * - Truth Table live evaluator + Tautologi/Kontradiksi badge
 */
import React, { useMemo, useRef, useState } from "react";
import type { SmartTableProps, TableCell } from "@ai-classroom/whiteboard-core";
import {
  computeGroupedStats,
  computeUngroupedStats,
  formatIdNumber,
  parseSpreadsheetPaste,
  computeFunctionTable,
  computeTruthTable,
} from "@ai-classroom/math-core";
import { StatSolverCard } from "./StatSolverCard";

export interface SmartTableWidgetProps {
  id: string;
  tableProps: SmartTableProps;
  selected?: boolean;
  onSelect?: () => void;
  onUpdateProps?: (patch: Partial<SmartTableProps>) => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
  onSpawnStatChart?: (
    chartKind: "histogram" | "polygon" | "ogive",
    title: string,
    series: Array<{ label: string; value: number }>,
  ) => void;
  onSpawnFunctionGraph?: (expr: string) => void;
}

export const SmartTableWidget: React.FC<SmartTableWidgetProps> = ({
  id,
  tableProps,
  selected = false,
  onSelect,
  onUpdateProps,
  onMovePosition,
  onDelete,
  onSpawnStatChart,
  onSpawnFunctionGraph,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [showChartMenu, setShowChartMenu] = useState(false);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [isFocusedLocal, setIsFocusedLocal] = useState(false);

  const isCustom = tableProps.presetMode === "custom";
  const showCanvaHandles = selected || isFocusedLocal || activeCell !== null;
  const cells = tableProps.cells ?? [];
  const headerRows = tableProps.headerRowCount ?? (isCustom ? 0 : 1);
  const statCfg = tableProps.statConfig ?? {
    showMidpointCol: tableProps.presetMode === "stat_grouped",
    showFxCol: true,
    showCumFreqCol: true,
    showTotalRow: true,
    highlightMedianClass: true,
    highlightModalClass: true,
    showFormulaCallouts: true,
    showSolverCard: true,
  };

  // Compute live statistics when in stat_grouped or stat_ungrouped mode
  const groupedStats = useMemo(() => {
    if (tableProps.presetMode !== "stat_grouped") return undefined;
    const dataRows = cells.slice(headerRows).map((row) => ({
      intervalLabel: row[0]?.raw ?? "",
      frequency: Number((row[1]?.raw ?? "0").replace(",", ".")),
    }));
    return computeGroupedStats(dataRows);
  }, [tableProps.presetMode, cells, headerRows]);

  const ungroupedStats = useMemo(() => {
    if (tableProps.presetMode !== "stat_ungrouped") return undefined;
    const entries = cells.slice(headerRows).map((row) => ({
      x: Number((row[0]?.raw ?? "0").replace(",", ".")),
      f: Number((row[1]?.raw ?? "0").replace(",", ".")),
    }));
    return computeUngroupedStats(entries);
  }, [tableProps.presetMode, cells, headerRows]);

  // Compute live truth table classification
  const truthResult = useMemo(() => {
    if (tableProps.presetMode !== "truth_table") return undefined;
    const vars = tableProps.truthVars ?? ["p", "q"];
    const expr = tableProps.truthExpr ?? "p -> q";
    return computeTruthTable(vars, expr);
  }, [tableProps.presetMode, tableProps.truthVars, tableProps.truthExpr]);

  // Smooth GPU drag preserving WhiteboardOverlay parent DOMMatrix
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

  const updateCell = (r: number, c: number, raw: string) => {
    const next = cells.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? { ...cell, raw } : cell)) : row,
    );
    // If function_values mode and user edited x column, auto-update f(x) and (x,y)
    if (tableProps.presetMode === "function_values" && r >= headerRows && c === 0 && tableProps.functionExpr) {
      const xVal = Number(raw.replace(",", "."));
      if (Number.isFinite(xVal)) {
        const computed = computeFunctionTable(tableProps.functionExpr, [xVal])[0];
        if (next[r][1]) next[r][1] = { ...next[r][1], raw: computed.y !== null ? String(computed.y) : "?" };
        if (next[r][2]) next[r][2] = { ...next[r][2], raw: computed.pairLabel };
      }
    }
    onUpdateProps?.({ cells: next });
  };

  const handlePaste = (r: number, c: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const grid = parseSpreadsheetPaste(text);
    if (grid.length === 0) return;

    const neededRows = Math.max(cells.length, r + grid.length);
    const maxPasteCols = Math.max(...grid.map((row) => row.length));
    const neededCols = Math.max(tableProps.cols, c + maxPasteCols);

    const next: TableCell[][] = Array.from({ length: neededRows }, (_, ri) =>
      Array.from({ length: neededCols }, (_, ci) => cells[ri]?.[ci] ?? { raw: "", align: "center" }),
    );
    grid.forEach((pRow, dr) => {
      pRow.forEach((val, dc) => {
        next[r + dr][c + dc] = { ...next[r + dr][c + dc], raw: val };
      });
    });
    const nextWidths = Array.from({ length: neededCols }, (_, i) => tableProps.colWidthsPx[i] ?? 110);
    onUpdateProps?.({ cells: next, rows: neededRows, cols: neededCols, colWidthsPx: nextWidths });
  };

  const syncAutoTitle = (nextRows: number, nextCols: number) => {
    const cur = tableProps.title ?? "";
    if (!cur || /^Tab(?:le|el Custom)\s*\(\d+[×x]\d+\)$/i.test(cur.trim())) {
      return `Table (${nextRows}×${nextCols})`;
    }
    return cur;
  };

  const addRow = () => {
    const colCount = Math.max(1, tableProps.cols);
    const newRow: TableCell[] = Array.from({ length: colCount }, () => ({ raw: "", align: "center" }));
    if (tableProps.presetMode === "stat_grouped" && groupedStats?.valid && groupedStats.rows.length > 0) {
      const last = groupedStats.rows[groupedStats.rows.length - 1].interval;
      newRow[0].raw = `${last.upper + 1} - ${last.upper + last.p}`;
      newRow[1].raw = "0";
    }
    const next = [...cells, newRow];
    onUpdateProps?.({
      cells: next,
      rows: next.length,
      ...(isCustom ? { title: syncAutoTitle(next.length, colCount) } : {}),
    });
  };

  const removeRow = () => {
    const minRows = isCustom ? 1 : headerRows + 1;
    if (cells.length <= minRows) return;
    const next = cells.slice(0, -1);
    onUpdateProps?.({
      cells: next,
      rows: next.length,
      ...(isCustom ? { title: syncAutoTitle(next.length, tableProps.cols) } : {}),
    });
  };

  const addCol = () => {
    if (tableProps.cols >= 12) return;
    const nextCols = tableProps.cols + 1;
    const next = cells.map((row, ri) => [
      ...row,
      {
        raw: !isCustom && ri === 0 ? `Kolom ${nextCols}` : "",
        bold: !isCustom && ri === 0,
        align: "center" as const,
      },
    ]);
    onUpdateProps?.({
      cells: next,
      cols: nextCols,
      colWidthsPx: [...tableProps.colWidthsPx, isCustom ? 84 : 105],
      ...(isCustom ? { title: syncAutoTitle(cells.length, nextCols) } : {}),
    });
  };

  const removeCol = () => {
    const minCols = isCustom ? 1 : 2;
    if (tableProps.cols <= minCols) return;
    const nextCols = tableProps.cols - 1;
    const next = cells.map((row) => row.slice(0, -1));
    onUpdateProps?.({
      cells: next,
      cols: nextCols,
      colWidthsPx: tableProps.colWidthsPx.slice(0, -1),
      ...(isCustom ? { title: syncAutoTitle(cells.length, nextCols) } : {}),
    });
  };

  const updateFunctionExpr = (expr: string) => {
    const xVals = cells.slice(headerRows).map((r) => Number((r[0]?.raw ?? "0").replace(",", ".")));
    const computed = computeFunctionTable(expr, xVals);
    const next = cells.map((row, ri) => {
      if (ri === 0) {
        return row.map((cell, ci) => (ci === 1 ? { ...cell, raw: `f(x) = ${expr}` } : cell));
      }
      const item = computed[ri - headerRows];
      if (!item) return row;
      return row.map((cell, ci) =>
        ci === 1
          ? { ...cell, raw: item.y !== null ? String(item.y) : "?" }
          : ci === 2
            ? { ...cell, raw: item.pairLabel }
            : cell,
      );
    });
    onUpdateProps?.({ functionExpr: expr, cells: next });
  };

  const updateTruthExpr = (expr: string) => {
    const vars = tableProps.truthVars ?? ["p", "q"];
    const evaluated = computeTruthTable(vars, expr);
    const next: TableCell[][] = [
      [
        ...vars.map((v) => ({ raw: v, bold: true, align: "center" as const })),
        { raw: expr, bold: true, align: "center" as const },
      ],
      ...evaluated.rows.map((r) => [
        ...r.inputs.map((b) => ({ raw: b ? "B" : "S", align: "center" as const })),
        { raw: r.result ? "B" : "S", align: "center" as const, bold: true },
      ]),
    ];
    onUpdateProps?.({
      truthExpr: expr,
      cells: next,
      rows: next.length,
      cols: vars.length + 1,
      colWidthsPx: [...vars.map(() => 70), 140],
    });
  };

  const isStatMode = tableProps.presetMode === "stat_grouped" || tableProps.presetMode === "stat_ungrouped";
  const showXi = tableProps.presetMode === "stat_grouped" && statCfg.showMidpointCol;
  const showFx = isStatMode && statCfg.showFxCol;
  const showFk = isStatMode && statCfg.showCumFreqCol;

  const isDarkBoard = tableProps.borderStyle === "blackboard";

  return (
    <div
      ref={rootRef}
      data-testid={`smart-table-${id}`}
      tabIndex={-1}
      onFocus={() => setIsFocusedLocal(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) {
          setIsFocusedLocal(false);
          setActiveCell(null);
        }
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsFocusedLocal(true);
        onSelect?.();
      }}
      className="relative flex w-fit flex-col bg-transparent text-slate-800 select-none"
    >
      {/* Slim Floating Control Strip (only for interactive math modes, NO card, NO icons, NO Tirai Sel) */}
      {isStatMode && (
        <div
          className="mb-1 flex flex-wrap items-center gap-2 text-[11px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {tableProps.presetMode === "stat_grouped" && (
            <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-600">
              <input
                type="checkbox"
                checked={statCfg.showMidpointCol}
                onChange={(e) =>
                  onUpdateProps?.({ statConfig: { ...statCfg, showMidpointCol: e.target.checked } })
                }
              />
              xᵢ
            </label>
          )}
          <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-600">
            <input
              type="checkbox"
              checked={statCfg.showFxCol}
              onChange={(e) =>
                onUpdateProps?.({ statConfig: { ...statCfg, showFxCol: e.target.checked } })
              }
            />
            fᵢ·xᵢ
          </label>
          <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-600">
            <input
              type="checkbox"
              checked={statCfg.showCumFreqCol}
              onChange={(e) =>
                onUpdateProps?.({ statConfig: { ...statCfg, showCumFreqCol: e.target.checked } })
              }
            />
            f_k
          </label>
          <label className="flex items-center gap-1 cursor-pointer font-medium text-indigo-700">
            <input
              type="checkbox"
              checked={statCfg.showSolverCard}
              onChange={(e) =>
                onUpdateProps?.({ statConfig: { ...statCfg, showSolverCard: e.target.checked } })
              }
            />
            Langkah
          </label>
          {onSpawnStatChart && groupedStats?.valid && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowChartMenu((v) => !v)}
                className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700"
              >
                Grafik
              </button>
              {showChartMenu && (
                <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg text-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      onSpawnStatChart(
                        "histogram",
                        `Histogram — ${tableProps.title ?? "Data Kelompok"}`,
                        groupedStats.chartSeries.histogram.map((h) => ({ label: h.label, value: h.value })),
                      );
                      setShowChartMenu(false);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-[11px] font-medium hover:bg-indigo-50"
                  >
                    Histogram (Tb–Ta)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSpawnStatChart(
                        "polygon",
                        `Poligon Frekuensi — ${tableProps.title ?? "Data Kelompok"}`,
                        groupedStats.chartSeries.polygon.map((p) => ({ label: p.label, value: p.value })),
                      );
                      setShowChartMenu(false);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-[11px] font-medium hover:bg-indigo-50"
                  >
                    Poligon Frekuensi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSpawnStatChart(
                        "ogive",
                        `Ogive Positif — ${tableProps.title ?? "Data Kelompok"}`,
                        groupedStats.chartSeries.ogivePositive.map((o) => ({ label: o.label, value: o.value })),
                      );
                      setShowChartMenu(false);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-[11px] font-medium hover:bg-indigo-50"
                  >
                    Ogive Positif (fk)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tableProps.presetMode === "function_values" && (
        <div
          className="mb-1 flex items-center gap-1.5 text-xs"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="font-semibold text-slate-700">f(x) =</span>
          <input
            type="text"
            value={tableProps.functionExpr ?? "x^2 - 4*x + 3"}
            onChange={(e) => updateFunctionExpr(e.target.value)}
            className="flex-1 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-base sm:text-xs outline-none focus:border-indigo-500"
          />
          {onSpawnFunctionGraph && tableProps.functionExpr && (
            <button
              type="button"
              onClick={() => onSpawnFunctionGraph(tableProps.functionExpr!)}
              className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700"
            >
              Plot Kurva
            </button>
          )}
        </div>
      )}

      {tableProps.presetMode === "truth_table" && (
        <div
          className="mb-1 flex items-center gap-1.5 text-xs"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="font-semibold text-slate-700">Ekspresi:</span>
          <input
            type="text"
            value={tableProps.truthExpr ?? "p -> q"}
            onChange={(e) => updateTruthExpr(e.target.value)}
            className="flex-1 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-base sm:text-xs outline-none focus:border-indigo-500"
          />
          {truthResult && (
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-white">
              {truthResult.classification}
            </span>
          )}
        </div>
      )}

      {/* Main Editable Table Grid — 100% Pure Borderless Table Directly on Canvas */}
      <div className="p-0" onPointerDown={(e) => e.stopPropagation()}>
        <table className="border-collapse bg-white text-xs">
          <tbody>
            {cells.map((row, ri) => {
              const isHeader = ri < headerRows;
              const dataIdx = ri - headerRows;
              const gRow = !isHeader && groupedStats?.valid ? groupedStats.rows[dataIdx] : undefined;
              const uRow = !isHeader && ungroupedStats?.valid ? ungroupedStats.entries[dataIdx] : undefined;

              const isMedClass =
                !isHeader &&
                statCfg.highlightMedianClass &&
                tableProps.presetMode === "stat_grouped" &&
                groupedStats?.medianClassIndex === dataIdx;
              const isModClass =
                !isHeader &&
                statCfg.highlightModalClass &&
                tableProps.presetMode === "stat_grouped" &&
                Boolean(groupedStats?.modalClassIndices.includes(dataIdx));

              const rowBg = isHeader
                ? isDarkBoard
                  ? "bg-slate-800 text-slate-100"
                  : "bg-slate-100/90 text-slate-800"
                : isMedClass && isModClass
                  ? "bg-gradient-to-r from-amber-50 to-sky-50"
                  : isMedClass
                    ? "bg-amber-50/90"
                    : isModClass
                      ? "bg-sky-50/90"
                      : tableProps.zebraStriping && ri % 2 === 0
                        ? "bg-slate-50/60"
                        : "";

              return (
                <tr key={ri} className={rowBg}>
                  {row.map((cell, ci) => {
                    const isCellActive = activeCell?.r === ri && activeCell?.c === ci;
                    return (
                      <td
                        key={ci}
                        className={`border border-slate-400/80 px-1.5 py-1 transition-shadow ${
                          isCellActive ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/15" : ""
                        }`}
                        style={{
                          width: tableProps.colWidthsPx[ci] ?? (isCustom ? 84 : 96),
                          minWidth: isCustom ? 64 : 80,
                          height: 34,
                        }}
                      >
                        <input
                          type="text"
                          value={cell.raw}
                          onFocus={() => setActiveCell({ r: ri, c: ci })}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          onPaste={(e) => handlePaste(ri, ci, e)}
                          style={{
                            textAlign: cell.align ?? (isHeader || isCustom ? "center" : "left"),
                            color: cell.textColor,
                          }}
                          className={`w-full bg-transparent outline-none text-base sm:text-xs ${
                            cell.bold || isHeader ? "font-bold" : "font-medium"
                          }`}
                        />
                      </td>
                    );
                  })}

                  {/* Auto-computed Statistics Helper Columns */}
                  {showXi && (
                    <td className="border border-slate-400/80 bg-indigo-50/30 px-2 py-1 text-center font-mono text-[11px] font-semibold text-indigo-800">
                      {isHeader ? "xᵢ" : gRow ? formatIdNumber(gRow.xi, 1) : "-"}
                    </td>
                  )}
                  {showFx && (
                    <td className="border border-slate-400/80 bg-indigo-50/40 px-2 py-1 text-center font-mono text-[11px] font-semibold text-indigo-900">
                      {isHeader ? "fᵢ·xᵢ" : gRow ? formatIdNumber(gRow.fxi, 1) : uRow ? formatIdNumber(uRow.fx, 1) : "-"}
                    </td>
                  )}
                  {showFk && (
                    <td className="border border-slate-400/80 bg-amber-50/40 px-2 py-1 text-center font-mono text-[11px] font-semibold text-amber-900">
                      {isHeader ? "f_k" : gRow ? gRow.fk : uRow ? uRow.fk : "-"}
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Auto Total Row for Statistics */}
            {isStatMode && statCfg.showTotalRow && (
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="border border-slate-300 px-2 py-1 text-center">Jumlah (Σ)</td>
                <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                  {tableProps.presetMode === "stat_grouped"
                    ? groupedStats?.n ?? 0
                    : ungroupedStats?.n ?? 0}
                </td>
                {showXi && <td className="border border-slate-300 px-2 py-1 text-center">—</td>}
                {showFx && (
                  <td className="border border-slate-300 px-2 py-1 text-center font-mono text-indigo-800">
                    {formatIdNumber(
                      tableProps.presetMode === "stat_grouped"
                        ? groupedStats?.sumFx ?? 0
                        : ungroupedStats?.sumFx ?? 0,
                      1,
                    )}
                  </td>
                )}
                {showFk && <td className="border border-slate-300 px-2 py-1 text-center">—</td>}
              </tr>
            )}
          </tbody>
        </table>

        {/* Step-by-Step Statistics Solver Card */}
        {isStatMode && statCfg.showSolverCard && (
          <StatSolverCard
            mode={tableProps.presetMode as "stat_grouped" | "stat_ungrouped"}
            grouped={groupedStats}
            ungrouped={ungroupedStats}
          />
        )}
      </div>

      {/* Canva-Style Floating Circular + / − Edge Handles (appear cleanly when table is clicked/selected) */}
      {showCanvaHandles && (
        <>
          {/* Bottom Edge: Move Handle + / − Row + Delete */}
          <div
            className="absolute -bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {onMovePosition && (
              <button
                type="button"
                onPointerDown={handleDragStart}
                title="Geser Tabel"
                aria-label="Geser Tabel"
                className="flex h-6 w-6 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-md transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:cursor-grabbing"
              >
                ✥
              </button>
            )}
            <button
              type="button"
              onClick={addRow}
              title="Tambah Baris"
              aria-label="Tambah Baris"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-md transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-90"
            >
              +
            </button>
            <button
              type="button"
              onClick={removeRow}
              disabled={cells.length <= (isCustom ? 1 : headerRows + 1)}
              title="Hapus Baris Terakhir"
              aria-label="Hapus Baris"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-md transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:opacity-35"
            >
              −
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title="Hapus Tabel"
                aria-label="Hapus Tabel"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500 shadow-md transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-90"
              >
                ×
              </button>
            )}
          </div>

          {/* Right Edge: + / − Column (for custom & non-stat tables) */}
          {!isStatMode && (
            <div
              className="absolute -right-8 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={addCol}
                disabled={tableProps.cols >= 12}
                title="Tambah Kolom"
                aria-label="Tambah Kolom"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-md transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-90 disabled:opacity-35"
              >
                +
              </button>
              <button
                type="button"
                onClick={removeCol}
                disabled={tableProps.cols <= (isCustom ? 1 : 2)}
                title="Hapus Kolom Terakhir"
                aria-label="Hapus Kolom"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-md transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:opacity-35"
              >
                −
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
