/**
 * useDraftBoard.ts — P07-T04
 * React hook: persists board state to IndexedDB via offlineOutbox.
 * Provides saveDraft and loadDraft to integrate with the sync engine.
 */

import { useCallback, useRef } from "react";
import {
  saveDraftBoard,
  loadDraftBoard,
  clearDraftBoard,
} from "@/lib/offlineOutbox";
import type { BoardState } from "@ai-classroom/whiteboard-core";

export interface UseDraftBoardOptions {
  roomId: string;
}

export interface UseDraftBoardReturn {
  /** Persist the current board state; debounced to at most once per 500 ms */
  saveDraft: (state: BoardState, seq: number) => void;
  /** Load the saved draft state from IndexedDB (may return null) */
  loadDraft: () => Promise<{ state: BoardState; seq: number } | null>;
  /** Remove the draft (call on clean session end) */
  clearDraft: () => Promise<void>;
}

const DEBOUNCE_MS = 500;

export function useDraftBoard({ roomId }: UseDraftBoardOptions): UseDraftBoardReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (state: BoardState, seq: number): void => {
      // Debounce: cancel previous pending save
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void saveDraftBoard(roomId, state as unknown as Record<string, unknown>, seq);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [roomId],
  );

  const loadDraft = useCallback(async (): Promise<{
    state: BoardState;
    seq: number;
  } | null> => {
    const record = await loadDraftBoard(roomId);
    if (!record) return null;
    return {
      state: record.state as unknown as BoardState,
      seq: record.seq,
    };
  }, [roomId]);

  const clearDraft = useCallback(async (): Promise<void> => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await clearDraftBoard(roomId);
  }, [roomId]);

  return { saveDraft, loadDraft, clearDraft };
}
