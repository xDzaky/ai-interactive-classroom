/**
 * RenderObject.tsx — P10-T05
 *
 * Performance-optimized object renderer for Konva canvas:
 * - React.memo with reference equality check on obj
 * - perfectDrawEnabled={false} for fill+stroke shapes
 * - shadowForStrokeEnabled={false}
 * - hitStrokeWidth <= 12
 * - listening={false} by default
 */
import React from "react";
import { Rect, Circle, Line, Text as KonvaText, Arrow } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@ai-classroom/whiteboard-core";

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function generateEllipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points = 32,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    pts.push(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
  }
  return pts;
}

export function generateRegularPolygonPoints(
  cx: number,
  cy: number,
  r: number,
  sides: number,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  return pts;
}

export function generateRhombusPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): number[] {
  return [cx, cy - ry, cx + rx, cy, cx, cy + ry, cx - rx, cy];
}

export function generateStarPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5,
): number[] {
  const pts: number[] = [];
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  return pts;
}

export function computeObjectBbox(obj: BoardObject): BoundingBox {
  const p = obj.props as Record<string, number & string>;
  switch (obj.object_type) {
    case "rect": {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      return { x, y, w, h };
    }
    case "circle": {
      const cx = Number(p.x ?? 0);
      const cy = Number(p.y ?? 0);
      const r = Number(p.r ?? p.radius ?? 40);
      return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    case "ellipse": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 50));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 30));
      return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
    }
    case "rhombus": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
    }
    case "pentagon":
    case "hexagon":
    case "polygon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    case "star": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? (p.r ?? 45));
      return { x: cx - outerR, y: cy - outerR, w: outerR * 2, h: outerR * 2 };
    }
    case "triangle": {
      const xs = [Number(p.x1 ?? 0), Number(p.x2 ?? 50), Number(p.x3 ?? 100)];
      const ys = [Number(p.y1 ?? 0), Number(p.y2 ?? 80), Number(p.y3 ?? 0)];
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "arrow":
    case "line": {
      const x1 = Number(p.x1 ?? 0);
      const y1 = Number(p.y1 ?? 0);
      const x2 = Number(p.x2 ?? 100);
      const y2 = Number(p.y2 ?? 100);
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      return { x: minX, y: minY, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }
    case "text":
    case "annotation": {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const fontSize = Number(p.fontSize ?? 16);
      const text = String(p.text ?? "");
      return { x, y, w: text.length * fontSize * 0.6, h: fontSize * 1.5 };
    }
    default:
      return { x: 0, y: 0, w: 100, h: 100 };
  }
}

export interface RenderObjectProps {
  obj: BoardObject;
  onNodeRef?: (id: string, node: Konva.Node | null, bbox: BoundingBox) => void;
  listening?: boolean;
}

function RenderObjectComponent({ obj, onNodeRef, listening = false }: RenderObjectProps) {
  const p = obj.props as Record<string, number & string>;
  const strokeW = Number(p.strokeWidth ?? 2);
  const hitW = Math.min(12, strokeW + 6);

  const refCallback = (node: Konva.Node | null) => {
    if (onNodeRef) {
      const bbox = computeObjectBbox(obj);
      onNodeRef(obj.id, node, bbox);
    }
  };

  switch (obj.object_type) {
    case "rect":
      return (
        <Rect
          id={obj.id}
          ref={refCallback}
          x={p.x ?? 0}
          y={p.y ?? 0}
          width={p.w ?? p.width ?? 100}
          height={p.h ?? p.height ?? 60}
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          rotation={p.rotation ?? 0}
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    case "circle":
      return (
        <Circle
          id={obj.id}
          ref={refCallback}
          x={p.x ?? 0}
          y={p.y ?? 0}
          radius={p.r ?? p.radius ?? 40}
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    case "ellipse": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 50));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 30));
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={generateEllipsePoints(cx, cy, rx, ry)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
    case "triangle":
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 50, p.y2 ?? 80, p.x3 ?? 100, p.y3 ?? 0]}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    case "rhombus": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={generateRhombusPoints(cx, cy, rx, ry)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
    case "pentagon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={generateRegularPolygonPoints(cx, cy, r, 5)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
    case "hexagon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={generateRegularPolygonPoints(cx, cy, r, 6)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
    case "star": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? (p.r ?? 45));
      const innerR = Number(p.innerR ?? outerR / 2.2);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={generateStarPoints(cx, cy, outerR, innerR)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
    case "polygon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      const sides = Number(p.sides ?? 5);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={generateRegularPolygonPoints(cx, cy, r, sides)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
    case "arrow":
      return (
        <Arrow
          id={obj.id}
          ref={refCallback}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 100, p.y2 ?? 100]}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          fill={p.stroke ?? "#6366f1"}
          pointerLength={10}
          pointerWidth={8}
          lineCap="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    case "line":
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 100, p.y2 ?? 100]}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    case "text":
    case "annotation":
      return (
        <KonvaText
          id={obj.id}
          ref={refCallback}
          x={p.x ?? 0}
          y={p.y ?? 0}
          text={String(p.text ?? obj.props.text ?? "")}
          fontSize={Number(p.fontSize ?? 16)}
          fill={String(p.fill ?? "#f8fafc")}
          listening={listening}
        />
      );
    default:
      return null;
  }
}

export const RenderObject = React.memo(
  RenderObjectComponent,
  (prev, next) => prev.obj === next.obj && prev.listening === next.listening,
);

export default RenderObject;
