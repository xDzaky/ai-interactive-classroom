/**
 * touchGestureEngine.ts — Unified Mobile Touch Gesture State Machine
 *
 * Prevents Konva touch/mouse double-fire and implements exact classroom touch gestures:
 * - 1x Tap (<250ms, <8px, no 2nd tap in 260ms) -> onSingleTap (select/block object)
 * - 2x Tap (2 taps <=300ms apart, <=24px distance) -> onDoubleTap (open TongchuangRadialWheel = Desktop Right-Click)
 * - Long-Press & Smooth Drag (>=200ms stationary on object, then move) -> onLongPressDragStart/Move/End (60fps smooth move)
 * - 1-Finger Drag on empty space (Hand/Select) -> onPan
 * - 2-Finger Pinch-to-Zoom & 2-Finger Pan -> onPinchZoom (focal-point zoom 0.2x..5.0x)
 */

export interface ScreenPt {
  x: number;
  y: number;
}

export interface TouchGestureCallbacks {
  onSingleTap?: (pt: ScreenPt) => void;
  onDoubleTap?: (pt: ScreenPt) => void;
  onLongPressDragStart?: (pt: ScreenPt) => void;
  onLongPressDragMove?: (pt: ScreenPt, dx: number, dy: number) => void;
  onLongPressDragEnd?: (pt: ScreenPt) => void;
  onPan?: (dx: number, dy: number) => void;
  onPinchZoom?: (midX: number, midY: number, scaleFactor: number, panDx: number, panDy: number) => void;
}

export interface TouchGestureConfig {
  tapMaxDurationMs?: number;
  tapMaxMovePx?: number;
  doubleTapWindowMs?: number;
  doubleTapMaxDistPx?: number;
  longPressMs?: number;
}

type GestureState =
  | 'idle'
  | 'down'
  | 'long_press_ready'
  | 'long_press_dragging'
  | 'panning'
  | 'pinching';

interface ActivePointer {
  id: number;
  x: number;
  y: number;
}

function vibrate(ms: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore unsupported environments
  }
}

export class TouchGestureEngine {
  private callbacks: TouchGestureCallbacks;
  private cfg: Required<TouchGestureConfig>;
  private state: GestureState = 'idle';
  private pointers = new Map<number, ActivePointer>();

  private downPt: ScreenPt = { x: 0, y: 0 };
  private lastPt: ScreenPt = { x: 0, y: 0 };
  private downTime = 0;

  private lastTapTime = 0;
  private lastTapPt: ScreenPt = { x: 0, y: 0 };
  private singleTapTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  private lastPinchDist = 0;
  private lastPinchMid: ScreenPt = { x: 0, y: 0 };

  constructor(callbacks: TouchGestureCallbacks, config: TouchGestureConfig = {}) {
    this.callbacks = callbacks;
    this.cfg = {
      tapMaxDurationMs: config.tapMaxDurationMs ?? 250,
      tapMaxMovePx: config.tapMaxMovePx ?? 8,
      doubleTapWindowMs: config.doubleTapWindowMs ?? 300,
      doubleTapMaxDistPx: config.doubleTapMaxDistPx ?? 24,
      longPressMs: config.longPressMs ?? 200,
    };
  }

  public getState(): GestureState {
    return this.state;
  }

  public getActivePointerCount(): number {
    return this.pointers.size;
  }

  public dispose(): void {
    this.clearTimers();
    this.pointers.clear();
    this.state = 'idle';
  }

  private clearTimers(): void {
    if (this.singleTapTimer) {
      clearTimeout(this.singleTapTimer);
      this.singleTapTimer = null;
    }
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  public handlePointerDown(pointerId: number, x: number, y: number, now = Date.now()): void {
    this.pointers.set(pointerId, { id: pointerId, x, y });

    // Transition to 2-finger pinch immediately when 2 pointers are active
    if (this.pointers.size === 2) {
      this.clearTimers();
      this.state = 'pinching';
      const [p1, p2] = Array.from(this.pointers.values());
      this.lastPinchDist = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      this.lastPinchMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      return;
    }

    if (this.pointers.size > 2) return;

    // 1-finger down
    this.state = 'down';
    this.downPt = { x, y };
    this.lastPt = { x, y };
    this.downTime = now;

    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      if (this.state === 'down' && this.pointers.size === 1) {
        this.state = 'long_press_ready';
        vibrate(25);
        this.callbacks.onLongPressDragStart?.({ ...this.lastPt });
      }
    }, this.cfg.longPressMs);
  }

  public handlePointerMove(pointerId: number, x: number, y: number): void {
    if (!this.pointers.has(pointerId)) return;
    this.pointers.set(pointerId, { id: pointerId, x, y });

    if (this.state === 'pinching' && this.pointers.size >= 2) {
      const [p1, p2] = Array.from(this.pointers.values());
      const dist = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const scaleFactor = dist / Math.max(1, this.lastPinchDist);
      const panDx = mid.x - this.lastPinchMid.x;
      const panDy = mid.y - this.lastPinchMid.y;
      this.lastPinchDist = dist;
      this.lastPinchMid = mid;
      this.callbacks.onPinchZoom?.(mid.x, mid.y, scaleFactor, panDx, panDy);
      return;
    }

    const dx = x - this.lastPt.x;
    const dy = y - this.lastPt.y;
    const totalMoved = Math.hypot(x - this.downPt.x, y - this.downPt.y);

    if (this.state === 'long_press_ready' || this.state === 'long_press_dragging') {
      this.state = 'long_press_dragging';
      this.lastPt = { x, y };
      this.callbacks.onLongPressDragMove?.({ x, y }, dx, dy);
      return;
    }

    if (this.state === 'down' && totalMoved >= this.cfg.tapMaxMovePx) {
      this.clearLongPressTimer();
      this.state = 'panning';
    }

    if (this.state === 'panning') {
      this.lastPt = { x, y };
      this.callbacks.onPan?.(dx, dy);
    }
  }

  public handlePointerUp(pointerId: number, x: number, y: number, now = Date.now()): void {
    this.pointers.delete(pointerId);
    this.clearLongPressTimer();

    if (this.state === 'pinching') {
      if (this.pointers.size < 2) {
        this.state = 'idle';
        this.lastPinchDist = 0;
      }
      return;
    }

    if (this.state === 'long_press_ready' || this.state === 'long_press_dragging') {
      this.callbacks.onLongPressDragEnd?.({ x, y });
      this.state = 'idle';
      return;
    }

    if (this.state === 'down') {
      const duration = now - this.downTime;
      const moved = Math.hypot(x - this.downPt.x, y - this.downPt.y);
      if (duration <= this.cfg.tapMaxDurationMs && moved <= this.cfg.tapMaxMovePx) {
        const sinceLast = now - this.lastTapTime;
        const distFromLast = Math.hypot(x - this.lastTapPt.x, y - this.lastTapPt.y);

        if (sinceLast <= this.cfg.doubleTapWindowMs && distFromLast <= this.cfg.doubleTapMaxDistPx) {
          // 2x Tap -> Radial Wheel!
          if (this.singleTapTimer) {
            clearTimeout(this.singleTapTimer);
            this.singleTapTimer = null;
          }
          this.lastTapTime = 0;
          vibrate(15);
          this.callbacks.onDoubleTap?.({ x, y });
        } else {
          // Schedule 1x Tap (wait doubleTapWindow to confirm no 2nd tap)
          this.lastTapTime = now;
          this.lastTapPt = { x, y };
          if (this.singleTapTimer) clearTimeout(this.singleTapTimer);
          this.singleTapTimer = setTimeout(() => {
            this.singleTapTimer = null;
            this.callbacks.onSingleTap?.({ x, y });
          }, Math.min(260, this.cfg.doubleTapWindowMs));
        }
      }
    }

    this.state = 'idle';
  }
}
