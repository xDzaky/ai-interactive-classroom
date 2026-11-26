/**
 * formatBarBridge.ts — Selection-to-3D / Selection-to-ManimGX Bridge for AFFiNE (V7)
 *
 * Detects highlighted text or LaTeX formulas inside AffineEditorContainer and computes
 * screen coordinates for the floating AI Classroom FormatBar action pill.
 */
import { useEffect, useState, type RefObject } from 'react';

export interface SelectionBridgeState {
  text: string;
  x: number;
  y: number;
}

export function useAffineSelectionBridge(
  hostRef: RefObject<HTMLElement | null>,
): SelectionBridgeState | null {
  const [selection, setSelection] = useState<SelectionBridgeState | null>(null);

  useEffect(() => {
    const updateSelection = () => {
      const host = hostRef.current;
      if (!host) {
        setSelection(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2 || text.length > 160) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!host.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelection(null);
        return;
      }
      const hostRect = host.getBoundingClientRect();
      setSelection({
        text,
        x: Math.max(120, Math.min(hostRect.width - 140, rect.left - hostRect.left + rect.width / 2)),
        y: Math.max(48, rect.top - hostRect.top - 12),
      });
    };

    document.addEventListener('selectionchange', updateSelection);
    window.addEventListener('mouseup', updateSelection);
    window.addEventListener('keyup', updateSelection);
    return () => {
      document.removeEventListener('selectionchange', updateSelection);
      window.removeEventListener('mouseup', updateSelection);
      window.removeEventListener('keyup', updateSelection);
    };
  }, [hostRef]);

  return selection;
}
