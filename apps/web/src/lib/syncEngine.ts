/**
 * syncEngine.ts — P04-T08
 * Realtime sync engine for the whiteboard board state.
 *
 * Responsibilities:
 *  - Receive broadcast payloads (from Echo listener or direct call)
 *  - Maintain a local seq counter; detect gaps (missing seq numbers)
 *  - On gap: HTTP back-fill via GET /api/v1/rooms/{room}/events?after={seq}
 *  - Deduplicate by idempotency_key
 *  - Apply ordered events to boardState via applyEvent
 *
 * Usage: instantiate SyncEngine, call receive() on each broadcast payload,
 * subscribe to onStateChange for React re-renders.
 *
 * React integration: use the useSyncEngine hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEvent,
  createInitialBoardState,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a broadcast payload from the server (matches CONTRACTS.md) */
export interface BroadcastPayload {
  seq: number;
  event_type: string;
  payload: Record<string, unknown>;
  actor_id: string;
  idempotency_key: string;
  committed_at: string;
}

/** Shape of an event returned by GET /rooms/{room}/events */
export interface RemoteEvent {
  id: string;
  seq: number;
  event_type: string;
  payload: Record<string, unknown>;
  actor_id: string;
  idempotency_key: string;
  committed_at: string;
  ephemeral: boolean;
}

export interface SyncEngineOptions {
  roomId: string;
  initialState?: BoardState;
  /** Called whenever boardState changes */
  onStateChange: (state: BoardState) => void;
  /** Called with the new seq whenever it advances */
  onSeqAdvance?: (seq: number) => void;
}

// ---------------------------------------------------------------------------
// SyncEngine class (framework-free, testable without React)
// ---------------------------------------------------------------------------

export class SyncEngine {
  private readonly roomId: string;
  private state: BoardState;
  private seq: number = 0;
  private seen = new Set<string>(); // idempotency_key dedup
  private pendingQueue: BroadcastPayload[] = []; // out-of-order buffer
  private filling = false;
  private readonly onStateChange: (state: BoardState) => void;
  private readonly onSeqAdvance?: (seq: number) => void;

  constructor(opts: SyncEngineOptions) {
    this.roomId = opts.roomId;
    this.state = opts.initialState ?? createInitialBoardState(opts.roomId);
    this.onStateChange = opts.onStateChange;
    this.onSeqAdvance = opts.onSeqAdvance;
  }

  /** Seed the engine with a known server state and seq (e.g. from a snapshot). */
  seed(state: BoardState, seq: number) {
    this.state = state;
    this.seq = seq;
    this.seen.clear();
    this.onStateChange(this.state);
    this.onSeqAdvance?.(this.seq);
  }

  /** Receive a broadcast payload (may arrive out-of-order). */
  receive(payload: BroadcastPayload): void {
    // Already applied or stale
    if (payload.seq <= this.seq) return;
    // Deduplicate by idempotency_key
    if (this.seen.has(payload.idempotency_key)) return;

    if (payload.seq === this.seq + 1) {
      // In-order: apply immediately, then drain buffer
      this._applyPayload(payload);
      this._drainQueue();
    } else {
      // Gap detected: buffer and back-fill from server
      this.pendingQueue.push(payload);
      this.pendingQueue.sort((a, b) => a.seq - b.seq);
      void this._backfill();
    }
  }

  // ── private helpers ──────────────────────────────────────────────────────

  private _applyPayload(payload: BroadcastPayload): void {
    const event: WhiteboardEvent = {
      event_type: payload.event_type as WhiteboardEvent["event_type"],
      payload: payload.payload,
      idempotency_key: payload.idempotency_key,
    };

    try {
      const [nextState] = applyEvent(this.state, event);
      this.state = nextState;
    } catch {
      // Unsupported event type — skip but advance seq to stay in sync
    }

    this.seen.add(payload.idempotency_key);
    this.seq = payload.seq;
    this.onStateChange(this.state);
    this.onSeqAdvance?.(this.seq);
  }

  private _drainQueue(): void {
    while (this.pendingQueue.length > 0) {
      const next = this.pendingQueue[0];
      if (!next || next.seq !== this.seq + 1) break;
      this.pendingQueue.shift();
      if (!this.seen.has(next.idempotency_key)) {
        this._applyPayload(next);
      }
    }
  }

  private async _backfill(): Promise<void> {
    if (this.filling) return;
    this.filling = true;
    try {
      const response = await api.get<RemoteEvent[] | { data: RemoteEvent[] }>(
        `/api/v1/rooms/${this.roomId}/events`,
        { params: { after: this.seq } },
      );
      const raw = response.data;
      const events: RemoteEvent[] = Array.isArray(raw) ? raw : (raw.data ?? []);
      events.sort((a, b) => a.seq - b.seq);
      for (const ev of events) {
        if (ev.seq <= this.seq) continue;
        if (this.seen.has(ev.idempotency_key)) continue;
        this._applyPayload({
          seq: ev.seq,
          event_type: ev.event_type,
          payload: ev.payload,
          actor_id: ev.actor_id,
          idempotency_key: ev.idempotency_key,
          committed_at: ev.committed_at,
        });
      }
      this._drainQueue();
    } catch {
      // Network error — will retry on next broadcast receive()
    } finally {
      this.filling = false;
    }
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  getState(): BoardState {
    return this.state;
  }

  getSeq(): number {
    return this.seq;
  }
}

// ---------------------------------------------------------------------------
// useSyncEngine — React hook
// ---------------------------------------------------------------------------

export interface UseSyncEngineResult {
  boardState: BoardState;
  seq: number;
  /** Call this to feed an incoming broadcast payload into the engine. */
  receive: (payload: BroadcastPayload) => void;
  /** Seed from a snapshot (boardState + seq). */
  seed: (state: BoardState, seq: number) => void;
}

/**
 * React hook that creates and manages a SyncEngine instance.
 * The boardState returned is kept in React state so components re-render.
 */
export function useSyncEngine(roomId: string): UseSyncEngineResult {
  const [boardState, setBoardState] = useState<BoardState>(() =>
    createInitialBoardState(roomId),
  );
  const [seq, setSeq] = useState(0);

  const engineRef = useRef<SyncEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new SyncEngine({
      roomId,
      onStateChange: setBoardState,
      onSeqAdvance: setSeq,
    });
  }

  // Reset engine when roomId changes
  useEffect(() => {
    engineRef.current = new SyncEngine({
      roomId,
      onStateChange: setBoardState,
      onSeqAdvance: setSeq,
    });
    setBoardState(engineRef.current.getState());
    setSeq(0);
  }, [roomId]);

  const receive = useCallback((payload: BroadcastPayload) => {
    engineRef.current?.receive(payload);
  }, []);

  const seed = useCallback((state: BoardState, newSeq: number) => {
    engineRef.current?.seed(state, newSeq);
  }, []);

  return { boardState, seq, receive, seed };
}
