/**
 * useSnapshot.ts — P07-T01
 * Hook: host auto-posts a board state snapshot every SNAPSHOT_INTERVAL events.
 * Provides createSnapshot and getNearestSnapshot for the replay engine (P07-T02).
 */
import { useCallback, useRef } from "react";
import {
  createSnapshot as apiCreateSnapshot,
  getNearestSnapshot as apiGetNearest,
} from "@/lib/api/snapshots";
import type { BoardState } from "@ai-classroom/whiteboard-core";

/** Post a snapshot after every this many events processed */
const SNAPSHOT_INTERVAL = 50;

export interface UseSnapshotOptions {
  roomId: string;
  /** Whether this client is the host (only host should push snapshots) */
  isHost: boolean;
}

export interface UseSnapshotReturn {
  /** Call after each event to auto-snapshot at interval */
  onEventApplied: (seq: number, state: BoardState) => void;
  /** Explicitly push a snapshot now */
  pushSnapshot: (seq: number, state: BoardState) => Promise<void>;
  /** Fetch the nearest snapshot for replay */
  fetchNearestSnapshot: (seq: number) => Promise<{ seq_at: number; state: BoardState } | null>;
}

export function useSnapshot({ roomId, isHost }: UseSnapshotOptions): UseSnapshotReturn {
  const lastSnapshotSeqRef = useRef<number>(-1);
  const pendingRef = useRef<boolean>(false);

  const pushSnapshot = useCallback(
    async (seq: number, state: BoardState): Promise<void> => {
      if (!isHost || pendingRef.current) return;
      pendingRef.current = true;
      try {
        await apiCreateSnapshot(roomId, seq, state as unknown as Record<string, unknown>);
        lastSnapshotSeqRef.current = seq;
      } catch {
        // Non-critical — replay falls back to full event log
      } finally {
        pendingRef.current = false;
      }
    },
    [roomId, isHost],
  );

  const onEventApplied = useCallback(
    (seq: number, state: BoardState): void => {
      if (!isHost) return;
      const lastSeq = lastSnapshotSeqRef.current;
      if (lastSeq < 0 || seq - lastSeq >= SNAPSHOT_INTERVAL) {
        void pushSnapshot(seq, state);
      }
    },
    [isHost, pushSnapshot],
  );

  const fetchNearestSnapshot = useCallback(
    async (seq: number): Promise<{ seq_at: number; state: BoardState } | null> => {
      const snap = await apiGetNearest(roomId, seq);
      if (!snap || !snap.state) return null;
      return { seq_at: snap.seq_at, state: snap.state as unknown as BoardState };
    },
    [roomId],
  );

  return { onEventApplied, pushSnapshot, fetchNearestSnapshot };
}
