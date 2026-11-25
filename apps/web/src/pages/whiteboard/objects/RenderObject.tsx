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
import { Group, Rect, Circle, Line, Text as KonvaText, Arrow } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@ai-classroom/whiteboard-core";
import {
  generateSketchyRectPaths,
  generateSketchyDiamondPaths,
  generateSketchyEllipsePaths,
  generateHachureSegments,
  getStrokeDashArray,
  resolveFontFamilyCss,
  type FillStyleKind,
  type FontFamilyKind,
  type RoughnessLevel,
  type StrokeStyleKind,
} from "@/lib/excalidrawEngine";

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
  const p = obj.props as Record<string, unknown>;
  if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
    const pts = p.customPoints as number[];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] < minX) minX = pts[i];
      if (pts[i] > maxX) maxX = pts[i];
      if (pts[i + 1] < minY) minY = pts[i + 1];
      if (pts[i + 1] > maxY) maxY = pts[i + 1];
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  const pn = obj.props as Record<string, number & string>;
  switch (obj.object_type) {
    case "frame":
    case "rect": {
      const x = Number(pn.x ?? 0);
      const y = Number(pn.y ?? 0);
      const w = Number(pn.w ?? pn.width ?? 100);
      const h = Number(pn.h ?? pn.height ?? 60);
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
  const rawEx = obj.props as Record<string, unknown>;
  const strokeW = Number(p.strokeWidth ?? 2);
  const hitW = Math.min(12, strokeW + 6);
  const rotRad = Number(p.rotation ?? 0);
  const rotDeg = Number.isFinite(rotRad) ? (rotRad * 180) / Math.PI : 0;
  const exOpacityRaw = typeof rawEx.opacity === "number" ? rawEx.opacity : 100;
  const exOpacity = exOpacityRaw <= 1 ? Math.max(0.05, exOpacityRaw) : Math.max(0.05, Math.min(1, exOpacityRaw / 100));
  const strokeStyle = (rawEx.strokeStyle as StrokeStyleKind) ?? "solid";
  const dashArr = getStrokeDashArray(strokeStyle, strokeW);
  const roughness = (typeof rawEx.roughness === "number" ? rawEx.roughness : 0) as RoughnessLevel;
  const fillStyle = (rawEx.fillStyle as FillStyleKind) ?? "solid";
  const roundness = (rawEx.roundness as "sharp" | "round") ?? "sharp";
  const fontFamily = resolveFontFamilyCss((rawEx.fontFamily as FontFamilyKind) ?? "sans");
  const shapeLabel = typeof rawEx.label === "string" && rawEx.label.trim().length > 0 ? rawEx.label : null;
  const bbox = computeObjectBbox(obj);
  const pivotX = bbox.x + bbox.w / 2;
  const pivotY = bbox.y + bbox.h / 2;
  const lineRotProps =
    Math.abs(rotDeg) > 1e-3
      ? { x: pivotX, y: pivotY, offsetX: pivotX, offsetY: pivotY, rotation: rotDeg }
      : {};

  const refCallback = (node: Konva.Node | null) => {
    if (onNodeRef) {
      onNodeRef(obj.id, node, bbox);
    }
  };

  // Custom editable polygon vertices (created when double-clicking corners/edges or dragging vertices)
  const rawProps = obj.props as Record<string, unknown>;
  if (Array.isArray(rawProps.customPoints) && rawProps.customPoints.length >= 6) {
    return (
      <Line
        id={obj.id}
        ref={refCallback}
        points={rawProps.customPoints as number[]}
        closed
        fill={p.fill ?? "transparent"}
        stroke={p.stroke ?? "#0f172a"}
        strokeWidth={strokeW}
        lineCap="round"
        lineJoin="round"
        listening={listening}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        hitStrokeWidth={hitW}
        {...lineRotProps}
      />
    );
  }

  switch (obj.object_type) {
    case "frame": {
      const fw = Number(p.w ?? p.width ?? 420);
      const fh = Number(p.h ?? p.height ?? 300);
      const fx = Number(p.x ?? 0);
      const fy = Number(p.y ?? 0);
      const title = shapeLabel ?? "Frame 1";
      return (
        <Group id={obj.id} ref={refCallback} opacity={exOpacity} listening={listening}>
          <KonvaText
            x={fx + 4}
            y={fy - 20}
            text={title}
            fontSize={12}
            fontStyle="bold"
            fill="#64748b"
            listening={false}
          />
          <Rect
            x={fx}
            y={fy}
            width={fw}
            height={fh}
            cornerRadius={12}
            fill={p.fill && p.fill !== "transparent" ? p.fill : "rgba(248, 250, 252, 0.45)"}
            stroke={p.stroke ?? "#94a3b8"}
            strokeWidth={1.8}
            dash={[8, 5]}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        </Group>
      );
    }
    case "rect": {
      const rw = Number(p.w ?? p.width ?? 100);
      const rh = Number(p.h ?? p.height ?? 60);
      const rx = Number(p.x ?? 0);
      const ry = Number(p.y ?? 0);
      const fillVal = p.fill ?? "transparent";
      const useHachure = fillVal !== "transparent" && fillStyle !== "solid";
      const hachureSegs = useHachure ? generateHachureSegments(rx, ry, rw, rh, fillStyle, 11) : [];
      const roughPaths = roughness > 0 ? generateSketchyRectPaths(rx, ry, rw, rh, roughness, obj.id) : null;

      if (roughPaths || useHachure || shapeLabel) {
        return (
          <Group
            id={obj.id}
            ref={refCallback}
            x={rx + rw / 2}
            y={ry + rh / 2}
            offsetX={rx + rw / 2}
            offsetY={ry + rh / 2}
            rotation={rotDeg}
            opacity={exOpacity}
            listening={listening}
          >
            <Rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              cornerRadius={roundness === "round" ? 10 : 0}
              fill={useHachure ? "transparent" : fillVal}
              stroke={roughPaths ? "transparent" : (p.stroke ?? "#6366f1")}
              strokeWidth={strokeW}
              dash={dashArr}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
              hitStrokeWidth={hitW}
            />
            {hachureSegs.map((seg, i) => (
              <Line
                key={`h-${i}`}
                points={seg}
                stroke={fillVal}
                strokeWidth={2}
                lineCap="round"
                listening={false}
                perfectDrawEnabled={false}
              />
            ))}
            {roughPaths?.map((pts, i) => (
              <Line
                key={`r-${i}`}
                points={pts}
                stroke={p.stroke ?? "#1e1e1e"}
                strokeWidth={strokeW}
                dash={dashArr}
                tension={0.35}
                lineCap="round"
                lineJoin="round"
                listening={false}
                perfectDrawEnabled={false}
              />
            ))}
            {shapeLabel && (
              <KonvaText
                x={rx + 8}
                y={ry + rh / 2 - 9}
                width={Math.max(20, rw - 16)}
                align="center"
                text={shapeLabel}
                fontSize={14}
                fontFamily={fontFamily}
                fontStyle="bold"
                fill={p.stroke ?? "#1e1e1e"}
                listening={false}
              />
            )}
          </Group>
        );
      }

      return (
        <Rect
          id={obj.id}
          ref={refCallback}
          x={rx + rw / 2}
          y={ry + rh / 2}
          offsetX={rw / 2}
          offsetY={rh / 2}
          width={rw}
          height={rh}
          cornerRadius={roundness === "round" ? 10 : 0}
          fill={fillVal}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={strokeW}
          dash={dashArr}
          opacity={exOpacity}
          rotation={rotDeg}
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
        />
      );
    }
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
          dash={dashArr}
          opacity={exOpacity}
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
      const roughPaths = roughness > 0 ? generateSketchyEllipsePaths(cx, cy, rx, ry, roughness, obj.id) : null;
      return (
        <Group id={obj.id} ref={refCallback} opacity={exOpacity} listening={listening} {...lineRotProps}>
          <Line
            points={generateEllipsePoints(cx, cy, rx, ry)}
            closed
            fill={p.fill ?? "transparent"}
            stroke={roughPaths ? "transparent" : (p.stroke ?? "#6366f1")}
            strokeWidth={strokeW}
            dash={dashArr}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            hitStrokeWidth={hitW}
          />
          {roughPaths?.map((pts, i) => (
            <Line
              key={`re-${i}`}
              points={pts}
              stroke={p.stroke ?? "#1e1e1e"}
              strokeWidth={strokeW}
              dash={dashArr}
              tension={0.35}
              lineCap="round"
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
          {shapeLabel && (
            <KonvaText
              x={cx - rx + 6}
              y={cy - 9}
              width={Math.max(20, rx * 2 - 12)}
              align="center"
              text={shapeLabel}
              fontSize={13}
              fontFamily={fontFamily}
              fontStyle="bold"
              fill={p.stroke ?? "#1e1e1e"}
              listening={false}
            />
          )}
        </Group>
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
          dash={dashArr}
          opacity={exOpacity}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={hitW}
          {...lineRotProps}
        />
      );
    case "rhombus": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      const roughPaths = roughness > 0 ? generateSketchyDiamondPaths(cx, cy, rx, ry, roughness, obj.id) : null;
      return (
        <Group id={obj.id} ref={refCallback} opacity={exOpacity} listening={listening} {...lineRotProps}>
          <Line
            points={generateRhombusPoints(cx, cy, rx, ry)}
            closed
            fill={p.fill ?? "transparent"}
            stroke={roughPaths ? "transparent" : (p.stroke ?? "#6366f1")}
            strokeWidth={strokeW}
            dash={dashArr}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            hitStrokeWidth={hitW}
          />
          {roughPaths?.map((pts, i) => (
            <Line
              key={`rd-${i}`}
              points={pts}
              stroke={p.stroke ?? "#1e1e1e"}
              strokeWidth={strokeW}
              dash={dashArr}
              tension={0.35}
              lineCap="round"
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
          {shapeLabel && (
            <KonvaText
              x={cx - rx + 8}
              y={cy - 8}
              width={Math.max(20, rx * 2 - 16)}
              align="center"
              text={shapeLabel}
              fontSize={12}
              fontFamily={fontFamily}
              fontStyle="bold"
              fill={p.stroke ?? "#1e1e1e"}
              listening={false}
            />
          )}
        </Group>
      );
    }
    case "trapezoid": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const bottomW = Number(p.bottomW ?? p.w ?? 120);
      const topW = Number(p.topW ?? bottomW * 0.6);
      const h = Number(p.h ?? 80);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={[
            cx - topW / 2, cy - h / 2,
            cx + topW / 2, cy - h / 2,
            cx + bottomW / 2, cy + h / 2,
            cx - bottomW / 2, cy + h / 2,
          ]}
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
          {...lineRotProps}
        />
      );
    }
    case "parallelogram": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? 120);
      const h = Number(p.h ?? 70);
      const skew = Number(p.skew ?? 24);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={[
            cx - w / 2 + skew, cy - h / 2,
            cx + w / 2, cy - h / 2,
            cx + w / 2 - skew, cy + h / 2,
            cx - w / 2, cy + h / 2,
          ]}
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
          {...lineRotProps}
        />
      );
    }
    case "kite": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? 90);
      const h = Number(p.h ?? 120);
      return (
        <Line
          id={obj.id}
          ref={refCallback}
          points={[
            cx, cy - h / 2,
            cx + w / 2, cy - h * 0.12,
            cx, cy + h / 2,
            cx - w / 2, cy - h * 0.12,
          ]}
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
          {...lineRotProps}
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
          dash={dashArr}
          opacity={exOpacity}
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
          dash={dashArr}
          opacity={exOpacity}
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
          fontFamily={fontFamily}
          opacity={exOpacity}
          fill={String(p.stroke ?? p.fill ?? "#0f172a")}
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
