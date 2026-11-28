/**
 * presenterSync.ts — Dual-Screen Presenter Mode Sync via BroadcastChannel (V8)
 *
 * Adapted from Seewo EasiNote 5 (`EasiNote.DoubleScreen.dll`):
 * Zero-server local sync (<10ms) between Teacher Laptop & Projector `/presenter` window.
 */
import type { BoardState } from '@ai-classroom/whiteboard-core';

const CHANNEL_NAME = 'aic-presenter-sync';

export interface PresenterSyncMessage {
  type: 'board_state' | 'spotlight' | 'request_sync';
  boardState?: BoardState;
  caption?: string | null;
  sentAt: number;
}

export function broadcastPresenterState(boardState: BoardState, caption?: string | null): void {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    const msg: PresenterSyncMessage = {
      type: 'board_state',
      boardState,
      caption,
      sentAt: Date.now(),
    };
    ch.postMessage(msg);
    ch.close();
  } catch {
    // ignore
  }
}

export function subscribePresenterSync(
  onMessage: (msg: PresenterSyncMessage) => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const ch = new BroadcastChannel(CHANNEL_NAME);
  ch.onmessage = (ev: MessageEvent<PresenterSyncMessage>) => {
    if (ev.data) onMessage(ev.data);
  };
  ch.postMessage({ type: 'request_sync', sentAt: Date.now() } satisfies PresenterSyncMessage);
  return () => ch.close();
}
