/**
 * GraphViewer — 2D function graphing using Mafs.
 * Supports multiple named expressions evaluated via math-core safeEvaluate.
 */
import React, { useCallback, useMemo, useState } from "react";
import { Mafs, Coordinates, Plot } from "mafs";
import "mafs/core.css";
import { safeEvaluate, ParseError, EvaluationError } from "@ai-classroom/math-core";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExpressionEntry {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
}

export interface GraphViewerProps {
  expressions?: ExpressionEntry[];
  onAdd?: (entry: ExpressionEntry) => void;
  onRemove?: (id: string) => void;
  onChange?: (id: string, patch: Partial<ExpressionEntry>) => void;
  /** Controlled mode: if provided, use these; otherwise use internal state */
  controlled?: boolean;
}

// ─── Default colors ────────────────────────────────────────────────────────

const PALETTE = [
  "#e63946", "#2a9d8f", "#e9c46a", "#f4a261", "#264653",
  "#a8dadc", "#457b9d", "#1d3557", "#6a4c93", "#52b788",
];

function nextColor(entries: ExpressionEntry[]): string {
  return PALETTE[entries.length % PALETTE.length];
}

function makeId(): string {
  return `expr-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Validation ────────────────────────────────────────────────────────────

function validateExpr(expr: string): string | null {
  if (!expr.trim()) return "Expression is empty";
  try {
    // Test with x=1 to catch obvious parse/eval errors
    safeEvaluate(expr, { x: 1, t: 0 });
    return null;
  } catch (err) {
    if (err instanceof ParseError) return `Parse error: ${err.message}`;
    if (err instanceof EvaluationError) return null; // might be ok (e.g., division by zero at x=1)
    return String(err);
  }
}

// ─── Single expression row ─────────────────────────────────────────────────

interface ExprRowProps {
  entry: ExpressionEntry;
  error: string | null;
  onToggle: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<ExpressionEntry>) => void;
}

function ExprRow({ entry, error, onToggle, onRemove, onChange }: ExprRowProps) {
  return (
    <div
      data-testid={`expr-row-${entry.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 0",
        borderBottom: "1px solid #e5e7eb",
        opacity: entry.visible ? 1 : 0.5,
      }}
    >
      {/* Color swatch / color picker */}
      <input
        type="color"
        aria-label="Expression color"
        value={entry.color}
        onChange={(e) => onChange({ color: e.target.value })}
        style={{ width: 24, height: 24, border: "none", padding: 0, cursor: "pointer", borderRadius: 4 }}
      />

      {/* Expression input */}
      <div style={{ flex: 1 }}>
        <input
          type="text"
          aria-label="Expression"
          value={entry.expr}
          onChange={(e) => onChange({ expr: e.target.value })}
          placeholder="e.g. sin(x)"
          style={{
            width: "100%",
            fontFamily: "monospace",
            fontSize: 13,
            border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: 4,
            padding: "2px 6px",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <div style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }} role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Visibility toggle */}
      <button
        onClick={onToggle}
        aria-label={entry.visible ? "Hide expression" : "Show expression"}
        style={{
          background: "none",
          border: "1px solid #d1d5db",
          borderRadius: 4,
          cursor: "pointer",
          padding: "2px 6px",
          fontSize: 12,
        }}
      >
        {entry.visible ? "👁" : "🙈"}
      </button>

      {/* Remove */}
      <button
        onClick={onRemove}
        aria-label="Remove expression"
        style={{
          background: "none",
          border: "1px solid #fca5a5",
          borderRadius: 4,
          cursor: "pointer",
          color: "#ef4444",
          padding: "2px 6px",
          fontSize: 12,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── GraphViewer ────────────────────────────────────────────────────────────

export function GraphViewer({
  expressions: externalEntries,
  onAdd,
  onRemove,
  onChange,
  controlled = false,
}: GraphViewerProps) {
  // Internal state when not controlled
  const [internalEntries, setInternalEntries] = useState<ExpressionEntry[]>([
    { id: makeId(), expr: "sin(x)", color: PALETTE[0], visible: true },
  ]);

  const entries = controlled && externalEntries !== undefined ? externalEntries : internalEntries;

  // Compute per-entry validation errors
  const errors = useMemo<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const e of entries) {
      map[e.id] = validateExpr(e.expr);
    }
    return map;
  }, [entries]);

  const handleAdd = useCallback(() => {
    const entry: ExpressionEntry = {
      id: makeId(),
      expr: "",
      color: nextColor(entries),
      visible: true,
    };
    if (controlled) {
      onAdd?.(entry);
    } else {
      setInternalEntries((prev) => [...prev, entry]);
      onAdd?.(entry);
    }
  }, [controlled, entries, onAdd]);

  const handleRemove = useCallback(
    (id: string) => {
      if (controlled) {
        onRemove?.(id);
      } else {
        setInternalEntries((prev) => prev.filter((e) => e.id !== id));
        onRemove?.(id);
      }
    },
    [controlled, onRemove]
  );

  const handleChange = useCallback(
    (id: string, patch: Partial<ExpressionEntry>) => {
      if (controlled) {
        onChange?.(id, patch);
      } else {
        setInternalEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
        onChange?.(id, patch);
      }
    },
    [controlled, onChange]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      handleChange(id, { visible: !entry.visible });
    },
    [entries, handleChange]
  );

  return (
    <div
      data-testid="graph-viewer"
      style={{ display: "flex", height: "100%", minHeight: 400, fontFamily: "sans-serif" }}
    >
      {/* Left: Mafs canvas */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Mafs pan zoom={{ min: 0.1, max: 5 }}>
          <Coordinates.Cartesian />
          {entries
            .filter((e) => e.visible && !errors[e.id])
            .map((entry) => (
              <MemoPlotOfX key={entry.id} expr={entry.expr} color={entry.color} />
            ))}
        </Mafs>
      </div>

      {/* Right: expression list panel */}
      <div
        data-testid="expression-panel"
        style={{
          width: 220,
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #e5e7eb",
          padding: "8px",
          overflowY: "auto",
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>
          Expressions
        </div>

        {entries.map((entry) => (
          <ExprRow
            key={entry.id}
            entry={entry}
            error={errors[entry.id]}
            onToggle={() => handleToggle(entry.id)}
            onRemove={() => handleRemove(entry.id)}
            onChange={(patch) => handleChange(entry.id, patch)}
          />
        ))}

        <button
          onClick={handleAdd}
          aria-label="Add expression"
          data-testid="add-expression-btn"
          style={{
            marginTop: 8,
            border: "1px dashed #9ca3af",
            borderRadius: 4,
            background: "none",
            cursor: "pointer",
            padding: "4px 0",
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          + Add expression
        </button>
      </div>
    </div>
  );
}

// ─── Memoized plot helper ──────────────────────────────────────────────────

interface PlotOfXProps {
  expr: string;
  color: string;
}

const MemoPlotOfX = React.memo(function PlotOfX({ expr, color }: PlotOfXProps) {
  const fn = useCallback(
    (x: number) => {
      try {
        return safeEvaluate(expr, { x, t: 0 });
      } catch {
        return NaN;
      }
    },
    [expr]
  );

  return <Plot.OfX y={fn} color={color} />;
});
