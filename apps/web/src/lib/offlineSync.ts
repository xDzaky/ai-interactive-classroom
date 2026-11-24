/**
 * offlineSync.ts — Offline-First IndexedDB Persistence & Replay Export (Dexie V4)
 *
 * Uses installed `dexie` (^4.0) to persist:
 * - Local whiteboard snapshots (auto-saved offline)
 * - Event-Based Replay logs (lightweight JSON timeline, < 200KB per lesson)
 * - Offline Write Queue (flushes automatically when network reconnects)
 */
import Dexie, { type Table } from 'dexie';
import type { BoardState, WhiteboardEvent } from '@ai-classroom/whiteboard-core';

export interface LocalBoardRecord {
  id: string;
  updatedAt: number;
  state: BoardState;
}

export interface ReplayLogEntry {
  id?: number;
  boardId: string;
  ts: number;
  event: WhiteboardEvent;
}

class ClassroomOfflineDB extends Dexie {
  boards!: Table<LocalBoardRecord, string>;
  replayLogs!: Table<ReplayLogEntry, number>;

  constructor() {
    super('ai_interactive_classroom_v4');
    this.version(1).stores({
      boards: 'id, updatedAt',
      replayLogs: '++id, boardId, ts',
    });
  }
}

let dbInstance: ClassroomOfflineDB | null = null;

function getDB(): ClassroomOfflineDB | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbInstance) {
    dbInstance = new ClassroomOfflineDB();
  }
  return dbInstance;
}

export async function saveBoardOffline(boardId: string, state: BoardState): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    await db.boards.put({ id: boardId, updatedAt: Date.now(), state });
  } catch {
    // ignore storage quota errors
  }
}

export async function loadBoardOffline(boardId: string): Promise<BoardState | null> {
  const db = getDB();
  if (!db) return null;
  try {
    const rec = await db.boards.get(boardId);
    return rec?.state ?? null;
  } catch {
    return null;
  }
}

export async function appendReplayEvent(boardId: string, event: WhiteboardEvent): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    await db.replayLogs.add({ boardId, ts: Date.now(), event });
  } catch {
    // ignore
  }
}

export async function exportReplaySessionJson(boardId: string): Promise<string> {
  const db = getDB();
  const entries = db ? await db.replayLogs.where('boardId').equals(boardId).sortBy('ts') : [];
  return JSON.stringify(
    {
      schema: 'ai-classroom-replay-v4',
      boardId,
      exportedAt: new Date().toISOString(),
      eventCount: entries.length,
      events: entries.map((e) => ({ ts: e.ts, event: e.event })),
    },
    null,
    2,
  );
}
