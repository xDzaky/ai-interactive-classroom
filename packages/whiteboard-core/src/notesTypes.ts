/**
 * notesTypes.ts — V5 Types for Image Tracing Layer, Textbook Geometry Primitives,
 * and Freenote-Style Multi-Page / Infinite Canvas Notebooks.
 */
import type { BoardObject, BoardStroke } from "./index.js";
import type { Point2D } from "./transform.js";

export interface ImageObjectProps {
  assetId: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number; // radian, center-pivot
  opacity: number; // [0.05, 1.0], default 1.0 (Tracing preset: 0.30)
  locked: boolean; // true => pass-through pointer for manual tracing
  zLayer: "background" | "normal" | "foreground";
  aspectLocked: boolean;
  flipX?: boolean;
  flipY?: boolean;
  crop?: { x: number; y: number; w: number; h: number };
  grayscale?: boolean;
  label?: string;
}

export interface AngleArcProps {
  vertex: Point2D;
  startRad: number;
  endRad: number;
  radiusPx: number;
  concentricTier: 1 | 2 | 3;
  labelLatex?: string;
  color: string;
}

export interface RightAngleMarkerProps {
  vertex: Point2D;
  uDir: Point2D;
  vDir: Point2D;
  sizePx: number;
  fill?: string;
  stroke: string;
}

export interface EdgeLabelProps {
  p1: Point2D;
  p2: Point2D;
  t: number;
  offsetPerpPx: number;
  latex: string;
  alignToEdge: boolean;
  color: string;
}

export type PaperTemplateKind =
  | "blank"
  | "ruled"
  | "grid"
  | "dot_grid"
  | "cornell"
  | "isometric_dot"
  | "music_staff";

export interface NoteLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // [0..1]
  order: number;
}

export interface NoteTapeCover {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  revealed: boolean;
  layerId: string;
}

export interface NoteStickerItem {
  id: string;
  x: number;
  y: number;
  emoji: string;
  label?: string;
  size: number;
  layerId: string;
}

export interface NoteTextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  isMath?: boolean;
  layerId: string;
}

export interface NoteStroke extends BoardStroke {
  layerId: string;
  penKind: "fountain" | "ballpoint" | "highlighter";
  opacity?: number;
  lineStyle?: "solid" | "dotted" | "dashed";
  straightLine?: boolean;
}

export interface NotePage {
  id: string;
  index: number;
  mode: "infinite" | "paged";
  pageSize?: {
    widthPx: number;
    heightPx: number;
    preset: "A4" | "Letter" | "16:9" | "Custom";
  };
  template: PaperTemplateKind;
  templateColor: string;
  templateSpacingPx: number;
  bookmarked?: boolean;
  backgroundPdfAssetId?: string;
  backgroundPdfPage?: number;
  layers: NoteLayer[];
  objects: BoardObject[];
  strokes: NoteStroke[];
  tapes?: NoteTapeCover[];
  stickers?: NoteStickerItem[];
  texts?: NoteTextItem[];
}

export interface NotebookDocument {
  id: string;
  title: string;
  folderId: string | null;
  coverColor: string;
  trashed?: boolean;
  createdAt: number;
  updatedAt: number;
  pages: NotePage[];
}

export interface NotebookFolder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface ManimGxObjectProps {
  cx: number;
  cy: number;
  x?: number;
  y?: number;
  width: number;
  height: number;
  rotation: number;
  sourceLatex: string;
  linkedSourceId?: string;
  pythonCode: string;
  sceneClass: string;
  templateKind:
    | "surface_3d"
    | "solid_3d"
    | "function_calculus"
    | "linear_transform"
    | "stat_chart"
    | "custom_proof";
  runtimeMode: "browser_webgpu" | "procedural_canvas" | "server_mp4";
  videoAssetId?: string;
  posterAssetId?: string;
  status: "idle" | "generating" | "inspecting" | "rendering" | "ready" | "error";
  errorMessage?: string;
}
