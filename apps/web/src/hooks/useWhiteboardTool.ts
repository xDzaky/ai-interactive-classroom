/**
 * useWhiteboardTool — P02-T04
 * Tool state machine for the whiteboard canvas.
 * Maps pointer events → WhiteboardEvents for all tools.
 * No DOM side effects; all event emission via onEvent callback.
 * Uses perfect-freehand for pen strokes.
 */
import { useCallback, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import type { WhiteboardEvent } from "@ai-classroom/whiteboard-core";

// ---------------------------------------------------------------------------
// Tool types
// ---------------------------------------------------------------------------

export type ToolType =
  | "select"
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "arrow"
  | "text"
  | "rect"
  | "circle"
  | "triangle";

export interface ToolState {
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
}

export interface PointerPoint {
  x: number;
  y: number;
  pressure: number;
}

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

export interface UseWhiteboardToolReturn {
  toolState: ToolState;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  /** Call on canvas pointer down (world coordinates) */
  onPointerDown: (pt: PointerPoint, roomId: string, actorId: string) => void;
  /** Call on canvas pointer move */
  onPointerMove: (pt: PointerPoint, roomId: string, actorId: string) => WhiteboardEvent | null;
  /** Call on canvas pointer up — returns committed event if any */
  onPointerUp: (pt: PointerPoint, roomId: string, actorId: string) => WhiteboardEvent | null;
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): number {
  return Date.now();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWhiteboardTool(
  onEvent: (event: WhiteboardEvent) => void,
  seq: { current: number }
): UseWhiteboardToolReturn {
  const [toolState, setToolState] = useState<ToolState>({
    activeTool: "pen",
    color: "#111827",
    strokeWidth: 3,
  });

  // Active stroke accumulator for pen/highlighter/eraser
  const strokePoints = useRef<[number, number, number][]>([]);
  const activeId = useRef<string>("");
  const dragStart = useRef<PointerPoint | null>(null);
  const isDrawing = useRef(false);

  const nextSeq = useCallback(() => {
    seq.current += 1;
    return seq.current;
  }, [seq]);

  const setTool = useCallback((tool: ToolType) => {
    setToolState((s) => ({ ...s, activeTool: tool }));
  }, []);

  const setColor = useCallback((color: string) => {
    setToolState((s) => ({ ...s, color }));
  }, []);

  const setStrokeWidth = useCallback((strokeWidth: number) => {
    setToolState((s) => ({ ...s, strokeWidth }));
  }, []);

  // -------------------------------------------------------------------------
  // Pointer Down
  // -------------------------------------------------------------------------
  const onPointerDown = useCallback(
    (pt: PointerPoint, _roomId: string, _actorId: string) => {
      isDrawing.current = true;
      activeId.current = uid();
      dragStart.current = pt;

      if (
        toolState.activeTool === "pen" ||
        toolState.activeTool === "highlighter" ||
        toolState.activeTool === "eraser"
      ) {
        strokePoints.current = [[pt.x, pt.y, pt.pressure]];
      }
    },
    [toolState.activeTool]
  );

  // -------------------------------------------------------------------------
  // Pointer Move — emit pointer.moved events (ephemeral)
  // -------------------------------------------------------------------------
  const onPointerMove = useCallback(
    (pt: PointerPoint, roomId: string, actorId: string): WhiteboardEvent | null => {
      if (!isDrawing.current) {
        // Emit ephemeral cursor position for collaborators
        const cursorEvent: WhiteboardEvent = {
          event_type: "device.pointer.moved",
          payload: { x: pt.x, y: pt.y, pressure: pt.pressure },
        };
        onEvent(cursorEvent);
        return cursorEvent;
      }

      // Accumulate stroke points
      if (
        toolState.activeTool === "pen" ||
        toolState.activeTool === "highlighter" ||
        toolState.activeTool === "eraser"
      ) {
        strokePoints.current.push([pt.x, pt.y, pt.pressure]);
      }

      return null;
    },
    [onEvent, toolState.activeTool]
  );

  // -------------------------------------------------------------------------
  // Pointer Up — commit the event
  // -------------------------------------------------------------------------
  const onPointerUp = useCallback(
    (pt: PointerPoint, roomId: string, actorId: string): WhiteboardEvent | null => {
      if (!isDrawing.current) return null;
      isDrawing.current = false;

      const id = activeId.current;
      const start = dragStart.current;
      let committed: WhiteboardEvent | null = null;

      switch (toolState.activeTool) {
        case "pen":
        case "highlighter":
        case "eraser": {
          const pts = [...strokePoints.current, [pt.x, pt.y, pt.pressure] as [number, number, number]];
          if (pts.length < 2) break;
          committed = {
            event_type: "stroke.committed",
            payload: {
              id,
              points: pts,
              color: toolState.activeTool === "eraser" ? "#ffffff" : toolState.color,
              width: toolState.strokeWidth,
              tool: toolState.activeTool,
            },
          };
          onEvent(committed);
          strokePoints.current = [];
          break;
        }

        case "line":
        case "arrow": {
          if (!start) break;
          committed = {
            event_type: "object.created",
            payload: {
              id,
              object_type: toolState.activeTool,
              props: {
                x1: start.x,
                y1: start.y,
                x2: pt.x,
                y2: pt.y,
                stroke: toolState.color,
                strokeWidth: toolState.strokeWidth,
              },
            },
          };
          onEvent(committed);
          break;
        }

        case "rect": {
          if (!start) break;
          const x = Math.min(start.x, pt.x);
          const y = Math.min(start.y, pt.y);
          committed = {
            event_type: "object.created",
            payload: {
              id,
              object_type: "rect",
              props: {
                x,
                y,
                w: Math.abs(pt.x - start.x),
                h: Math.abs(pt.y - start.y),
                stroke: toolState.color,
                strokeWidth: toolState.strokeWidth,
                fill: "transparent",
              },
            },
          };
          onEvent(committed);
          break;
        }

        case "circle": {
          if (!start) break;
          const r = Math.sqrt(
            Math.pow(pt.x - start.x, 2) + Math.pow(pt.y - start.y, 2)
          ) / 2;
          committed = {
            event_type: "object.created",
            payload: {
              id,
              object_type: "circle",
              props: {
                x: (start.x + pt.x) / 2,
                y: (start.y + pt.y) / 2,
                r: Math.max(r, 2),
                stroke: toolState.color,
                strokeWidth: toolState.strokeWidth,
                fill: "transparent",
              },
            },
          };
          onEvent(committed);
          break;
        }

        case "text": {
          if (!start) break;
          // For text: emit object.created with empty text; UI should open an editor
          committed = {
            event_type: "object.created",
            payload: {
              id,
              object_type: "text",
              props: {
                x: start.x,
                y: start.y,
                text: "",
                fontSize: 16,
                fill: toolState.color,
              },
            },
          };
          onEvent(committed);
          break;
        }

        case "select":
        default:
          break;
      }

      activeId.current = "";
      dragStart.current = null;
      return committed;
    },
    [onEvent, toolState]
  );

  return {
    toolState,
    setTool,
    setColor,
    setStrokeWidth,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
