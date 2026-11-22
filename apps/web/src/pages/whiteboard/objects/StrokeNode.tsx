/**
 * StrokeNode.tsx — P10-T06
 *
 * Memoized Konva Line renderer for individual committed strokes.
 * Uses getCachedStrokePoints (WeakMap) so perfect-freehand outline is only
 * computed once per stroke points array.
 */
import React from "react";
import { Line } from "react-konva";
import type { BoardStroke } from "@ai-classroom/whiteboard-core";
import { getCachedStrokePoints } from "@/lib/strokePath";

export interface StrokeNodeProps {
  stroke: BoardStroke;
}

export const StrokeNode = React.memo(
  function StrokeNode({ stroke }: StrokeNodeProps) {
    const pts = getCachedStrokePoints(stroke);
    if (pts.length < 4) return null;

    const isEraser = stroke.tool === "eraser";
    const isHighlighter = stroke.tool === "highlighter";
    const fill = isEraser
      ? "#0f172a"
      : isHighlighter
        ? stroke.color + "66"
        : stroke.color;

    return (
      <Line
        id={stroke.id}
        points={pts}
        strokeWidth={1}
        closed
        fill={fill}
        lineCap="round"
        lineJoin="round"
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        hitStrokeWidth={0}
        globalCompositeOperation={isEraser ? "destination-out" : "source-over"}
      />
    );
  },
  (prev, next) => prev.stroke === next.stroke,
);

export default StrokeNode;
