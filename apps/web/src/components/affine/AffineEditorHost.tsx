/**
 * AffineEditorHost.tsx — React 19 Host for BlockSuite's AffineEditorContainer (V7)
 *
 * Mounts the official Web Component `AffineEditorContainer` (Page Mode ↔ Edgeless Mode)
 * backed by Yjs + IndexedDB local-first persistence, with live FormatBar Selection Bridge
 * to launch TongchuangSolidWidget (3D) or ManimGxWidget from highlighted text/LaTeX.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AffineEditorContainer } from '@blocksuite/presets';
import type { Doc } from '@blocksuite/store';
import { openAffineDoc } from '@/lib/affineWorkspaceStore';
import { useAffineSelectionBridge } from './formatBarBridge';
import '@toeverything/theme/style.css';
import './affineThemeOverrides.css';

export interface AffineEditorHostProps {
  docId: string;
  docTitle: string;
  mode: 'page' | 'edgeless';
  onModeChange?: (mode: 'page' | 'edgeless') => void;
  onEditorReady?: (editor: AffineEditorContainer, doc: Doc) => void;
  onTriggerSelection3D?: (selectedText: string) => void;
  onTriggerSelectionManimGx?: (selectedText: string) => void;
}

export const AffineEditorHost: React.FC<AffineEditorHostProps> = ({
  docId,
  docTitle,
  mode,
  onModeChange,
  onEditorReady,
  onTriggerSelection3D,
  onTriggerSelectionManimGx,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selection = useAffineSelectionBridge(hostRef);

  // Mount & bind BlockSuite AffineEditorContainer whenever docId changes
  useEffect(() => {
    let cancelled = false;
    let disposeModeSub: { dispose(): void } | undefined;

    setLoading(true);
    setError(null);

    openAffineDoc(docId, docTitle)
      .then((doc) => {
        if (cancelled || !mountRef.current) return;
        const container = mountRef.current;
        container.innerHTML = '';

        const editor = new AffineEditorContainer();
        editor.doc = doc;
        editor.mode = mode;
        editor.autofocus = true;
        container.appendChild(editor);
        editorRef.current = editor;

        const slots = editor.slots as unknown as Record<
          string,
          { on?: (cb: (nextMode: string) => void) => { dispose(): void } } | undefined
        >;
        const modeSlot = slots?.editorModeSwitched ?? slots?.docModeChanged;
        if (modeSlot?.on) {
          disposeModeSub = modeSlot.on((nextMode: string) => {
            if (nextMode === 'page' || nextMode === 'edgeless') {
              onModeChange?.(nextMode);
            }
          });
        }

        onEditorReady?.(editor, doc);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat editor AFFiNE');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      disposeModeSub?.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // Sync external Page <-> Edgeless mode toggle into live AffineEditorContainer
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.mode !== mode) {
      editor.switchEditor(mode);
    }
  }, [mode]);

  return (
    <div
      ref={hostRef}
      data-theme="light"
      data-testid="affine-editor-host"
      className="aic-affine-host"
    >
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Memuat Dokumen & Kanvas AFFiNE (Yjs Local-First)...
          </div>
        </div>
      )}

      {error && (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <strong>Gagal memuat BlockSuite:</strong> {error}
        </div>
      )}

      <div ref={mountRef} className="h-full w-full flex-1 overflow-auto" />

      {/* Floating AI Classroom FormatBar Bridge on Text/Formula Selection */}
      {selection && (onTriggerSelection3D || onTriggerSelectionManimGx) && (
        <div
          data-testid="affine-selection-bridge"
          style={{
            position: 'absolute',
            left: selection.x,
            top: selection.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 40,
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white/98 px-2 py-1 text-[11px] shadow-xl backdrop-blur-md"
        >
          <span className="px-1 text-[10px] font-bold text-indigo-600">AI Classroom:</span>
          {onTriggerSelection3D && (
            <button
              type="button"
              data-testid="affine-bridge-3d-btn"
              onClick={() => onTriggerSelection3D(selection.text)}
              className="rounded-lg bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              🧊 Model 3D
            </button>
          )}
          {onTriggerSelectionManimGx && (
            <button
              type="button"
              data-testid="affine-bridge-manimgx-btn"
              onClick={() => onTriggerSelectionManimGx(selection.text)}
              className="rounded-lg bg-indigo-600 px-2 py-1 font-semibold text-white hover:bg-indigo-500"
            >
              🎬 Visual ManimGX
            </button>
          )}
        </div>
      )}
    </div>
  );
};
