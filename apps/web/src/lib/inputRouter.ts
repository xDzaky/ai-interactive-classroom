/**
 * inputRouter.ts — Cross-Device Input Router & Stylus Palm Rejection Engine (V5)
 *
 * Ensures smooth operation on Desktop PC, Stylus Tablets, and Smartphones:
 * - When pointerType === "pen" is detected, records lastPenTimestamp & activePenId.
 * - While within 450ms of pen activity (or activePenId !== null), single-finger touch
 *   drawing is rejected (palm rejection), while 2-finger pinch/pan remains allowed.
 */

export interface PointerLikeEvent {
  pointerId: number;
  pointerType: string; // "mouse" | "pen" | "touch"
  pressure?: number;
}

export class InputRouter {
  private lastPenTimestamp = -Infinity;
  private activePenId: number | null = null;
  private activeTouchIds = new Set<number>();
  private readonly palmWindowMs: number;

  constructor(palmWindowMs = 450) {
    this.palmWindowMs = palmWindowMs;
  }

  public onPointerDown(e: PointerLikeEvent, now = performance.now()): {
    allowDraw: boolean;
    isMultiTouch: boolean;
    rejectedAsPalm: boolean;
  } {
    if (e.pointerType === 'pen') {
      this.activePenId = e.pointerId;
      this.lastPenTimestamp = now;
      return { allowDraw: true, isMultiTouch: false, rejectedAsPalm: false };
    }

    if (e.pointerType === 'touch') {
      this.activeTouchIds.add(e.pointerId);
      if (this.activeTouchIds.size >= 2) {
        return { allowDraw: false, isMultiTouch: true, rejectedAsPalm: false };
      }
      const withinPalmWindow =
        this.activePenId !== null || now - this.lastPenTimestamp < this.palmWindowMs;
      if (withinPalmWindow) {
        return { allowDraw: false, isMultiTouch: false, rejectedAsPalm: true };
      }
      return { allowDraw: true, isMultiTouch: false, rejectedAsPalm: false };
    }

    // Mouse always allowed
    return { allowDraw: true, isMultiTouch: false, rejectedAsPalm: false };
  }

  public onPointerMove(e: PointerLikeEvent, now = performance.now()): {
    allowDraw: boolean;
    rejectedAsPalm: boolean;
  } {
    if (e.pointerType === 'pen') {
      this.lastPenTimestamp = now;
      return { allowDraw: true, rejectedAsPalm: false };
    }
    if (e.pointerType === 'touch') {
      if (this.activeTouchIds.size >= 2) {
        return { allowDraw: false, rejectedAsPalm: false };
      }
      if (this.activePenId !== null || now - this.lastPenTimestamp < this.palmWindowMs) {
        return { allowDraw: false, rejectedAsPalm: true };
      }
    }
    return { allowDraw: true, rejectedAsPalm: false };
  }

  public onPointerUp(e: PointerLikeEvent, now = performance.now()): void {
    if (e.pointerType === 'pen') {
      this.lastPenTimestamp = now;
      if (this.activePenId === e.pointerId) {
        this.activePenId = null;
      }
    } else if (e.pointerType === 'touch') {
      this.activeTouchIds.delete(e.pointerId);
    }
  }

  public reset(): void {
    this.lastPenTimestamp = -Infinity;
    this.activePenId = null;
    this.activeTouchIds.clear();
  }
}
