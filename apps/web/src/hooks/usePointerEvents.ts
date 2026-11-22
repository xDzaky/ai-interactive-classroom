/**
 * usePointerEvents — P02-T06
 * Unified pointer event handler for the whiteboard canvas.
 * Handles:
 *  - Mouse (button 0 = draw, button 1 = pan, button 2 = menu)
 *  - Pen / stylus (via PointerEvent.pointerType === 'pen')
 *  - Touch (single finger = draw, two fingers = pan + pinch-zoom)
 *  - Palm rejection (ignore touch when pen is active within cooldown)
 *
 * Usage: attach the returned event handlers to the canvas container div.
 * All coordinates are in world-space (after view transform inversion).
 */
import { useCallback, useRef } from "react";
import type { ViewportController } from "@/lib/viewport";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface PointerEventHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export interface UsePointerEventsOptions {
  view: ViewTransform;
  onViewChange: (v: ViewTransform) => void;
  onDrawStart: (pt: WorldPoint, type: "pen" | "mouse" | "touch") => void;
  onDrawMove: (pt: WorldPoint, type: "pen" | "mouse" | "touch") => void;
  onDrawEnd: (pt: WorldPoint, type: "pen" | "mouse" | "touch") => void;
  /** If true, disable all drawing (read-only mode) */
  readOnly?: boolean;
  /** Optional imperative ViewportController (P10-T03: avoids React re-renders on zoom/pan) */
  viewportController?: ViewportController;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** After pen contact, ignore touch for this many ms (palm rejection) */
const PALM_REJECTION_MS = 500;

/** Minimum pinch distance change before updating scale */
const MIN_PINCH_DELTA = 2;

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function screenToWorld(sx: number, sy: number, view: ViewTransform): WorldPoint {
  return {
    x: (sx - view.x) / view.scale,
    y: (sy - view.y) / view.scale,
    pressure: 0.5,
  };
}

function withPressure(pt: WorldPoint, e: React.PointerEvent): WorldPoint {
  return { ...pt, pressure: e.pressure > 0 ? e.pressure : 0.5 };
}

function midpoint(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function distance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePointerEvents({
  view,
  onViewChange,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  readOnly = false,
  viewportController,
}: UsePointerEventsOptions): PointerEventHandlers {
  // Track all active pointers (for multi-touch)
  const activePointers = useRef<Map<number, React.PointerEvent["nativeEvent"]>>(new Map());

  // Palm rejection: timestamp of last pen contact
  const lastPenContact = useRef<number>(0);

  // Pinch state
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const isPinching = useRef(false);

  // Single-finger pan state (touch)
  const panStart = useRef<{ pointerX: number; pointerY: number; viewX: number; viewY: number } | null>(null);

  // Drawing state
  const isDrawing = useRef(false);
  const drawType = useRef<"pen" | "mouse" | "touch">("mouse");

  // -------------------------------------------------------------------------
  const getPointerType = (e: React.PointerEvent): "pen" | "mouse" | "touch" => {
    if (e.pointerType === "pen") return "pen";
    if (e.pointerType === "touch") return "touch";
    return "mouse";
  };

  const isPalmRejected = useCallback((e: React.PointerEvent): boolean => {
    if (e.pointerType !== "touch") return false;
    return Date.now() - lastPenContact.current < PALM_REJECTION_MS;
  }, []);

  // -------------------------------------------------------------------------
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointers.current.set(e.pointerId, e.nativeEvent);

      const type = getPointerType(e);

      // Track pen contact for palm rejection
      if (type === "pen") {
        lastPenContact.current = Date.now();
      }

      // Palm rejection
      if (isPalmRejected(e)) return;

      // Middle mouse button = pan mode; skip drawing
      if (e.button === 1) return;

      const count = activePointers.current.size;

      // Two-finger pinch start
      if (type === "touch" && count === 2) {
        isDrawing.current = false;
        const pts = [...activePointers.current.values()];
        const d = distance(pts[0], pts[1]);
        const mid = midpoint(pts[0], pts[1]);
        pinchRef.current = { dist: d, midX: mid.x, midY: mid.y };
        isPinching.current = true;
        return;
      }

      // One finger touch = pan
      if (type === "touch" && count === 1) {
        panStart.current = { pointerX: e.clientX, pointerY: e.clientY, viewX: view.x, viewY: view.y };
        return;
      }

      // Draw start (pen or mouse left button)
      if (readOnly) return;
      if (type === "mouse" && e.button !== 0) return;

      isDrawing.current = true;
      drawType.current = type;
      const pt = withPressure(screenToWorld(e.clientX, e.clientY, view), e);
      onDrawStart(pt, type);
    },
    [view, isPalmRejected, onDrawStart, readOnly]
  );

  // -------------------------------------------------------------------------
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      activePointers.current.set(e.pointerId, e.nativeEvent);

      const type = getPointerType(e);

      // Palm rejection
      if (isPalmRejected(e)) return;

      const count = activePointers.current.size;

      // Pinch-zoom
      if (isPinching.current && count >= 2) {
        const pts = [...activePointers.current.values()];
        const newDist = distance(pts[0], pts[1]);
        const pinch = pinchRef.current;
        if (pinch && Math.abs(newDist - pinch.dist) > MIN_PINCH_DELTA) {
          const scaleFactor = newDist / pinch.dist;
          const mid = midpoint(pts[0], pts[1]);
          if (viewportController) {
            viewportController.zoomAt(mid.x, mid.y, scaleFactor);
          } else {
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * scaleFactor));
            onViewChange({
              scale: newScale,
              x: mid.x - ((mid.x - view.x) / view.scale) * newScale,
              y: mid.y - ((mid.y - view.y) / view.scale) * newScale,
            });
          }
          pinchRef.current = { dist: newDist, midX: mid.x, midY: mid.y };
        }
        return;
      }

      // Single-touch pan
      if (type === "touch" && panStart.current && count === 1) {
        const dx = e.clientX - panStart.current.pointerX;
        const dy = e.clientY - panStart.current.pointerY;
        if (viewportController) {
          viewportController.panBy(dx, dy);
          panStart.current.pointerX = e.clientX;
          panStart.current.pointerY = e.clientY;
        } else {
          onViewChange({ ...view, x: panStart.current.viewX + dx, y: panStart.current.viewY + dy });
        }
        return;
      }

      // Draw move
      if (!isDrawing.current || readOnly) return;
      const pt = withPressure(screenToWorld(e.clientX, e.clientY, view), e);
      onDrawMove(pt, drawType.current);
    },
    [view, isPalmRejected, onViewChange, onDrawMove, readOnly]
  );

  // -------------------------------------------------------------------------
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      activePointers.current.delete(e.pointerId);

      const type = getPointerType(e);

      // End pinch
      if (isPinching.current && activePointers.current.size < 2) {
        isPinching.current = false;
        pinchRef.current = null;
      }

      // End pan
      if (type === "touch" && activePointers.current.size === 0) {
        panStart.current = null;
      }

      // End draw
      if (isDrawing.current && !readOnly) {
        isDrawing.current = false;
        const pt = withPressure(screenToWorld(e.clientX, e.clientY, view), e);
        onDrawEnd(pt, drawType.current);
      }
    },
    [view, onDrawEnd, readOnly]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      isDrawing.current = false;
      isPinching.current = false;
      pinchRef.current = null;
      panStart.current = null;
    },
    []
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
