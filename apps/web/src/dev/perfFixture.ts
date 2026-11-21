/**
 * Performance benchmark scene generator for WhiteboardCanvas (P10-T01)
 */
import { createInitialBoardState } from "@ai-classroom/whiteboard-core";
import type { BoardState, BoardStroke, BoardObject } from "@ai-classroom/whiteboard-core";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePerfScene({
  strokes = 300,
  shapes = 100,
  seed = 42,
}: {
  strokes?: number;
  shapes?: number;
  seed?: number;
}): BoardState {
  const state = createInitialBoardState("perf-room");
  const rand = mulberry32(seed);
  const sceneId = state.active_scene_id;
  const scene = state.scenes[sceneId];

  // Generate strokes (~150 points random walk each)
  for (let s = 0; s < strokes; s++) {
    const id = `perf-stroke-${s}`;
    let cx = (rand() - 0.5) * 3000;
    let cy = (rand() - 0.5) * 3000;
    const points: [number, number, number][] = [];
    let angle = rand() * Math.PI * 2;
    for (let p = 0; p < 150; p++) {
      angle += (rand() - 0.5) * 0.4;
      cx += Math.cos(angle) * (2 + rand() * 4);
      cy += Math.sin(angle) * (2 + rand() * 4);
      points.push([cx, cy, 0.5]);
    }
    const stroke: BoardStroke = {
      id,
      points,
      color: "#6366f1",
      width: 3,
      tool: "pen",
    };
    scene.strokes[id] = stroke;
  }

  // Generate shapes
  const shapeTypes = ["rect", "circle", "triangle", "line", "arrow"] as const;
  for (let sh = 0; sh < shapes; sh++) {
    const id = `perf-shape-${sh}`;
    const kind = shapeTypes[Math.floor(rand() * shapeTypes.length)];
    const x = (rand() - 0.5) * 3000;
    const y = (rand() - 0.5) * 3000;
    const w = 40 + rand() * 100;
    const h = 40 + rand() * 100;

    let props: Record<string, unknown> = {
      stroke: "#ec4899",
      strokeWidth: 2,
      fill: "transparent",
    };
    if (kind === "rect") {
      props = { ...props, x, y, w, h };
    } else if (kind === "circle") {
      props = { ...props, x, y, r: w / 2 };
    } else if (kind === "triangle") {
      props = { ...props, x1: x, y1: y, x2: x - w / 2, y2: y + h, x3: x + w / 2, y3: y + h };
    } else {
      props = { ...props, x1: x, y1: y, x2: x + w, y2: y + h };
    }

    const obj: BoardObject = {
      id,
      object_type: kind,
      props,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    scene.objects[id] = obj;
    scene.order.push(id);
  }

  return state;
}

export function parsePerfParam(): { strokes: number; shapes: number } | null {
  if (typeof window === "undefined") return null;
  const isEnabled = import.meta.env.DEV || import.meta.env.VITE_PERF === "1";
  if (!isEnabled) return null;

  const urlParams = new URLSearchParams(window.location.search);
  const perf = urlParams.get("perf");
  if (!perf) return null;

  const match = perf.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return {
    strokes: parseInt(match[1], 10),
    shapes: parseInt(match[2], 10),
  };
}
