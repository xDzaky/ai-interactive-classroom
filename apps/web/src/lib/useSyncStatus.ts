/**
 * useSyncStatus.ts — P07-T05
 * Hook: tracks sync state ('saved_locally' | 'syncing' | 'synced' | 'needs_attention')
 * and flushes the offline outbox to the server on reconnect.
 *
 * Integration:
 *   - Use alongside useSyncEngine (P04-T08) for real-time events.
 *   - Call enqueueEvent() for every event the host commits locally.
 *   - On reconnect (navigator.onLine → true), drainOutbox() fires automatically.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  enqueue,
  getPendingOutbox,
  markCommitted,
  pruneCommitted,
} from "@/lib/offlineOutbox";

const BASE = "/api/v1";

/** All possible sync states visible to the UI */
export type SyncState =
  | "saved_locally"   // event queued in outbox, not yet sent
  | "syncing"         // flushing outbox to server
  | "synced"          // outbox empty, server in sync
  | "needs_attention"; // flush failed after retries

export interface UseSyncStatusOptions {
  roomId: string;
  /** Max flush retries before transitioning to 'needs_attention' */
  maxRetries?: number;
}

export interface UseSyncStatusReturn {
  /** Current sync state */
  syncState: SyncState;
  /** Queue a local event for deferred upload */
  enqueueEvent: (
    idempotencyKey: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  /** Manually trigger an outbox flush (e.g. on reconnect) */
  drainOutbox: () => Promise<void>;
  /** Number of pending (uncommitted) outbox items */
  pendingCount: number;
}

/**
 * Post a single event to the server.
 * Returns true on success, false on failure.
 */
async function postEvent(
  roomId: string,
  idempotencyKey: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/rooms/${roomId}/events`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        payload,
      }),
    });
    return res.ok || res.status === 409; // 409 = already committed (idempotent)
  } catch {
    return false;
  }
}

export function useSyncStatus({
  roomId,
  maxRetries = 3,
}: UseSyncStatusOptions): UseSyncStatusReturn {
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const drainingRef = useRef(false);
  const retryCountRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Enqueue a local event
  // ---------------------------------------------------------------------------

  const enqueueEvent = useCallback(
    async (
      idempotencyKey: string,
      eventType: string,
      payload: Record<string, unknown>,
    ): Promise<void> => {
      await enqueue({ idempotency_key: idempotencyKey, room_id: roomId, event_type: eventType, payload });
      setPendingCount((n) => n + 1);
      setSyncState("saved_locally");
    },
    [roomId],
  );

  // ---------------------------------------------------------------------------
  // Drain outbox — sends pending events to the server in order
  // ---------------------------------------------------------------------------

  const drainOutbox = useCallback(async (): Promise<void> => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setSyncState("syncing");

    try {
      const pending = await getPendingOutbox(roomId);
      if (pending.length === 0) {
        setSyncState("synced");
        setPendingCount(0);
        retryCountRef.current = 0;
        return;
      }

      let allOk = true;
      for (const record of pending) {
        const ok = await postEvent(
          roomId,
          record.idempotency_key,
          record.event_type,
          record.payload,
        );
        if (ok && record.id !== undefined) {
          await markCommitted(record.id);
        } else {
          allOk = false;
        }
      }

      await pruneCommitted(roomId);

      if (allOk) {
        retryCountRef.current = 0;
        setSyncState("synced");
        setPendingCount(0);
      } else {
        retryCountRef.current += 1;
        if (retryCountRef.current >= maxRetries) {
          setSyncState("needs_attention");
        } else {
          setSyncState("saved_locally");
          const remaining = await getPendingOutbox(roomId);
          setPendingCount(remaining.length);
        }
      }
    } catch {
      retryCountRef.current += 1;
      if (retryCountRef.current >= maxRetries) {
        setSyncState("needs_attention");
      } else {
        setSyncState("saved_locally");
      }
    } finally {
      drainingRef.current = false;
    }
  }, [roomId, maxRetries]);

  // ---------------------------------------------------------------------------
  // Auto-drain on network reconnect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleOnline = () => {
      void drainOutbox();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [drainOutbox]);

  // ---------------------------------------------------------------------------
  // Initial pending count on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void getPendingOutbox(roomId).then((pending) => {
      setPendingCount(pending.length);
      if (pending.length > 0) setSyncState("saved_locally");
    });
  }, [roomId]);

  return { syncState, enqueueEvent, drainOutbox, pendingCount };
}
