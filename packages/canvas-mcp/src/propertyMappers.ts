/**
 * propertyMappers.ts — Seewo EasiNote 5 MCP Property Mappers Adaptation (V8)
 *
 * Deterministic Zod-validated JSON schemas for controlling the AI Interactive Classroom
 * whiteboard canvas via internal AI agents or external MCP clients.
 */
import { z } from "zod";

export const ElementLayoutSchema = z.object({
  cx: z.number(),
  cy: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
});
export type McpElementLayout = z.infer<typeof ElementLayoutSchema>;

export const McpTextPropertiesSchema = ElementLayoutSchema.extend({
  text: z.string().min(1),
  fontSize: z.number().min(8).max(120).default(20),
  color: z.string().default("#0f172a"),
  fontFamily: z.enum(["hand", "sans", "mono"]).default("sans"),
});
export type McpTextProperties = z.infer<typeof McpTextPropertiesSchema>;

export const McpShapePropertiesSchema = ElementLayoutSchema.extend({
  shapeType: z.enum(["rect", "circle", "ellipse", "triangle", "rhombus", "line", "arrow"]),
  stroke: z.string().default("#0f172a"),
  fill: z.string().default("transparent"),
  strokeWidth: z.number().min(1).max(24).default(2),
  label: z.string().optional(),
});
export type McpShapeProperties = z.infer<typeof McpShapePropertiesSchema>;

export const McpGeometry3DPropertiesSchema = ElementLayoutSchema.extend({
  solidType: z.enum(["cube", "cuboid", "sphere", "cylinder", "cone", "pyramid", "prism", "torus"]),
  params: z.record(z.number()),
  texturePreset: z.string().optional(),
  unfoldProgress: z.number().min(0).max(1).optional(),
  showGimbal: z.boolean().optional(),
  label: z.string().optional(),
});
export type McpGeometry3DProperties = z.infer<typeof McpGeometry3DPropertiesSchema>;

export const McpActivityKindSchema = z.enum([
  "choice",
  "classify",
  "super_classify",
  "gap_filling",
  "group_competition",
  "judge",
  "text_match",
]);
export type McpActivityKind = z.infer<typeof McpActivityKindSchema>;

export const McpActivityPropertiesSchema = z.object({
  activityKind: McpActivityKindSchema,
  title: z.string().min(1),
  subject: z.string().default("Matematika"),
  items: z.array(z.record(z.unknown())).min(1),
});
export type McpActivityProperties = z.infer<typeof McpActivityPropertiesSchema>;

export const McpUpsertElementInputSchema = z.object({
  id: z.string().optional(),
  objectType: z.enum([
    "rect",
    "circle",
    "ellipse",
    "triangle",
    "rhombus",
    "text",
    "viz_solid",
    "math_block",
    "viz_manimgx",
    "viz_activity",
    "smart_table",
    "subject_helper",
  ]),
  props: z.record(z.unknown()),
});
export type McpUpsertElementInput = z.infer<typeof McpUpsertElementInputSchema>;

export const McpLayoutDeltaInputSchema = z.object({
  ids: z.array(z.string()).min(1),
  dx: z.number().default(0),
  dy: z.number().default(0),
  align: z.enum(["none", "left", "center", "right", "top", "middle", "bottom"]).default("none"),
});
export type McpLayoutDeltaInput = z.infer<typeof McpLayoutDeltaInputSchema>;

export const McpCanvasToolRegistry = {
  "canvas.inspect_scene": "Mengembalikan ringkasan seluruh objek aktif (id, type, bbox, label, latex)",
  "canvas.upsert_element": "Menambah/memperbarui objek (shape2d, viz_solid, math_block, viz_manimgx, activity)",
  "canvas.apply_layout_delta": "Menggeser, merapikan grid/alignment, atau mengubah ukuran batch objek",
  "canvas.create_activity": "Membuat salah satu dari 7 game kelas interaktif dengan soal tervalidasi Zod",
  "canvas.trigger_manimgx": "Memicu animasi/visualisasi 3D ManimGX dari ekspresi/topik tertentu",
  "canvas.create_smart_table": "Membuat tabel custom/statistika (Mean/Median/Modus) terisi data siap hitung di kanvas",
  "canvas.create_subject_helper": "Membuat alat bantu visual terstruktur (Horner, Matriks, Pohon Faktor, Garis Bilangan, Venn, Ruang Sampel, Tangga Satuan)",
} as const;

export type McpCanvasToolName = keyof typeof McpCanvasToolRegistry;
