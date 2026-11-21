/**
 * replayEngine.ts — P07-T02
 * Pure TypeScript replay engine — no React dependencies.
 * Loads a snapshot then applies subsequent events to replay board state.
 *
 * API:
 *   createReplayEngine(roomId) → { seek, step, setSpeed, getState, getDuration }
 */

import {
  applyEvent,
  createInitialBoardState,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import { getNearestSnapshot } from "@/lib/api/snapshots";

const BASE = "/api/v1";

/** An event as returned by GET /rooms/{room}/events */
export interface ReplayEvent {
  id: string;
  seq: number;
  event_type: string;
  payload: Record<string, unknown>;
  actor_id: string;
  idempotency_key: string;
  committed_at: string;
  ephemeral?: boolean;
}

/** Valid playback speed multipliers */
export type PlaybackSpeed = 1 | 2 | 4;

export interface ReplayEngine {
  /**
   * Seek to a specific seq position.
   * Loads the nearest snapshot then applies events up to `targetSeq`.
   * Returns the BoardState at that position.
   */
  seek(targetSeq: number): Promise<BoardState>;

  /**
   * Step forward one event from the current cursor.
   * Returns null when no more events remain (end of replay).
   */
  step(): BoardState | null;

  /**
   * Set playback speed (affects the `msPerStep` property).
   */
  setSpeed(speed: PlaybackSpeed): void;

  /** Current board state at the cursor position */
  getState(): BoardState;

  /** Total number of replay events loaded */
  getDuration(): number;

  /** Current cursor index (0-based index into events array) */
  getCursor(): number;

  /** Milliseconds between steps at the current speed (base = 100 ms / 1x) */
  get msPerStep(): number;
}

const BASE_STEP_MS = 100;

/**
 * Fetch all events for a room after a given seq.
 * Returns events sorted by seq ascending, non-ephemeral only.
 */
async function fetchEvents(roomId: string, afterSeq: number): Promise<ReplayEvent[]> {
  const url = `${BASE}/rooms/${roomId}/events?after=${afterSeq}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  const json = (await res.json()) as ReplayEvent[] | { data: ReplayEvent[] };
  const raw: ReplayEvent[] = Array.isArray(json) ? json : (json.data ?? []);
  return raw
    .filter((e) => !e.ephemeral)
    .sort((a, b) => a.seq - b.seq);
}

/**
 * Apply a list of ReplayEvents to a BoardState, returning the final state
 * after applying all events up to (and including) the event at index `upToIndex`.
 */
function applyUpTo(
  initial: BoardState,
  events: ReplayEvent[],
  upToIndex: number,
): BoardState {
  let state = initial;
  for (let i = 0; i <= upToIndex && i < events.length; i++) {
    const ev = events[i];
    const wbEvent: WhiteboardEvent = {
      event_type: ev.event_type,
      payload: ev.payload,
    } as unknown as WhiteboardEvent;
    [state] = applyEvent(state, wbEvent);
  }
  return state;
}

/**
 * Factory: creates a new ReplayEngine for a room.
 *
 * Usage:
 *   const engine = createReplayEngine("room-uuid");
 *   const state = await engine.seek(200);   // jump to seq 200
 *   engine.setSpeed(2);                     // 2× speed
 *   engine.step();                          // advance one event
 */
export function createReplayEngine(roomId: string): ReplayEngine {
  let events: ReplayEvent[] = [];
  /** BoardState at snapshotSeq (the starting point for event application) */
  let snapshotState: BoardState = createInitialBoardState(roomId);
  let snapshotSeq: number = 0;
  /** Current cursor: index into `events` after the last seek/step */
  let cursor: number = -1;
  let speed: PlaybackSpeed = 1;

  /**
   * Load snapshot + events for a given targetSeq.
   * Returns the state at targetSeq and sets cursor.
   */
  async function seek(targetSeq: number): Promise<BoardState> {
    // 1. Get nearest snapshot at or before targetSeq
    const snap = await getNearestSnapshot(roomId, targetSeq);

    if (snap && snap.state) {
      snapshotState = snap.state as unknown as BoardState;
      snapshotSeq = snap.seq_at;
    } else {
      // No snapshot — start from seq 0
      snapshotState = createInitialBoardState(roomId);
      snapshotSeq = 0;
    }

    // 2. Fetch events after snapshotSeq
    events = await fetchEvents(roomId, snapshotSeq);

    // 3. Find cursor position for targetSeq
    // Cursor is the index of the last event with seq <= targetSeq
    let newCursor = -1;
    for (let i = 0; i < events.length; i++) {
      if (events[i].seq <= targetSeq) {
        newCursor = i;
      } else {
        break;
      }
    }
    cursor = newCursor;

    // 4. Apply events up to cursor
    if (cursor < 0) {
      return snapshotState;
    }
    return applyUpTo(snapshotState, events, cursor);
  }

  function step(): BoardState | null {
    const nextCursor = cursor + 1;
    if (nextCursor >= events.length) return null;
    cursor = nextCursor;
    return applyUpTo(snapshotState, events, cursor);
  }

  function setSpeed(newSpeed: PlaybackSpeed): void {
    speed = newSpeed;
  }

  function getState(): BoardState {
    if (cursor < 0) return snapshotState;
    return applyUpTo(snapshotState, events, cursor);
  }

  function getDuration(): number {
    return events.length;
  }

  function getCursor(): number {
    return cursor;
  }

  return {
    seek,
    step,
    setSpeed,
    getState,
    getDuration,
    getCursor,
    get msPerStep() {
      return Math.floor(BASE_STEP_MS / speed);
    },
  };
}
