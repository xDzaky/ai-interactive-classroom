/**
 * mcpBridge.ts — Deterministic In-Browser Canvas MCP Tool Executor & Atomic Undo Batching (V8)
 *
 * Translates validated MCP tool calls into atomic `batch` WhiteboardEvents so teachers
 * can press Ctrl+Z once to undo an entire AI canvas operation cleanly.
 */
import {
  McpActivityPropertiesSchema,
  McpLayoutDeltaInputSchema,
  McpUpsertElementInputSchema,
  type McpCanvasToolName,
} from "./propertyMappers.js";

export interface SceneSnapshotObject {
  id: string;
  object_type: string;
  props: Record<string, unknown>;
}

export interface SceneSnapshot {
  objects: Record<string, SceneSnapshotObject>;
  order: string[];
}

export interface McpWhiteboardEvent {
  event_type: "object.created" | "object.updated" | "object.deleted" | "batch";
  payload: Record<string, unknown>;
}

export interface McpToolResult {
  ok: boolean;
  tool: McpCanvasToolName;
  summary: string;
  data?: unknown;
  /** Atomic batch event ready to dispatch into whiteboard-core reducer (1-click Ctrl+Z!) */
  batchEvent?: McpWhiteboardEvent;
  error?: string;
}

export function executeCanvasMcpTool(
  tool: McpCanvasToolName,
  rawArgs: unknown,
  scene: SceneSnapshot,
): McpToolResult {
  try {
    if (tool === "canvas.inspect_scene") {
      const items = scene.order
        .map((id) => scene.objects[id])
        .filter(Boolean)
        .map((obj) => ({
          id: obj.id,
          type: obj.object_type,
          x: Number(obj.props.x ?? obj.props.cx ?? 0),
          y: Number(obj.props.y ?? obj.props.cy ?? 0),
          w: Number(obj.props.w ?? obj.props.width ?? 120),
          h: Number(obj.props.h ?? obj.props.height ?? 100),
          label: String(obj.props.label ?? obj.props.title ?? obj.props.text ?? ""),
          latex: typeof obj.props.latex === "string" ? obj.props.latex : typeof obj.props.formulaLatex === "string" ? obj.props.formulaLatex : undefined,
        }));
      return {
        ok: true,
        tool,
        summary: `Ditemukan ${items.length} objek aktif di papan tulis.`,
        data: { count: items.length, items },
      };
    }

    if (tool === "canvas.upsert_element") {
      const parsed = McpUpsertElementInputSchema.parse(rawArgs);
      const exists = parsed.id ? Boolean(scene.objects[parsed.id]) : false;
      const targetId = parsed.id || `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const ev: McpWhiteboardEvent = exists
        ? {
            event_type: "object.updated",
            payload: { id: targetId, props_patch: parsed.props },
          }
        : {
            event_type: "object.created",
            payload: { id: targetId, object_type: parsed.objectType, props: parsed.props },
          };
      return {
        ok: true,
        tool,
        summary: exists ? `Objek ${targetId} diperbarui.` : `Objek ${parsed.objectType} (${targetId}) ditambahkan.`,
        data: { id: targetId },
        batchEvent: { event_type: "batch", payload: { events: [ev] } },
      };
    }

    if (tool === "canvas.apply_layout_delta") {
      const parsed = McpLayoutDeltaInputSchema.parse(rawArgs);
      const events: McpWhiteboardEvent[] = [];
      const targets = parsed.ids.map((id) => scene.objects[id]).filter(Boolean);
      const minX = targets.length > 0 ? Math.min(...targets.map((o) => Number(o.props.x ?? o.props.cx ?? 0))) : 0;
      const minY = targets.length > 0 ? Math.min(...targets.map((o) => Number(o.props.y ?? o.props.cy ?? 0))) : 0;

      for (const obj of targets) {
        const patch: Record<string, unknown> = {};
        if (typeof obj.props.x === "number") {
          patch.x = parsed.align === "left" ? minX + parsed.dx : obj.props.x + parsed.dx;
        }
        if (typeof obj.props.y === "number") {
          patch.y = parsed.align === "top" ? minY + parsed.dy : obj.props.y + parsed.dy;
        }
        if (typeof obj.props.cx === "number") {
          patch.cx = parsed.align === "left" ? minX + parsed.dx : obj.props.cx + parsed.dx;
        }
        if (typeof obj.props.cy === "number") {
          patch.cy = parsed.align === "top" ? minY + parsed.dy : obj.props.cy + parsed.dy;
        }
        events.push({
          event_type: "object.updated",
          payload: { id: obj.id, props_patch: patch },
        });
      }
      return {
        ok: true,
        tool,
        summary: `Tata letak ${events.length} objek diperbarui.`,
        data: { updatedCount: events.length },
        batchEvent: { event_type: "batch", payload: { events } },
      };
    }

    if (tool === "canvas.create_activity") {
      const parsed = McpActivityPropertiesSchema.parse(rawArgs);
      const actId = `act-${Date.now()}`;
      return {
        ok: true,
        tool,
        summary: `Aktivitas "${parsed.title}" (${parsed.activityKind}) siap dimainkan.`,
        data: { id: actId, activity: parsed },
        batchEvent: {
          event_type: "batch",
          payload: {
            events: [
              {
                event_type: "object.created",
                payload: {
                  id: actId,
                  object_type: "viz_activity",
                  props: {
                    x: 180,
                    y: 90,
                    w: 560,
                    h: 420,
                    ...parsed,
                  },
                },
              },
            ],
          },
        },
      };
    }

    if (tool === "canvas.trigger_manimgx") {
      const obj = (rawArgs ?? {}) as Record<string, unknown>;
      const formulaLatex = String(obj.formulaLatex ?? obj.latex ?? "(x - 2)^2 + (y - 1)^2 = 9");
      const title = String(obj.title ?? "Visualisasi ManimGX");
      const manimId = `mcp-manim-${Date.now()}`;
      return {
        ok: true,
        tool,
        summary: `Visualisasi ManimGX untuk "${formulaLatex}" dibuat.`,
        data: { id: manimId, formulaLatex },
        batchEvent: {
          event_type: "batch",
          payload: {
            events: [
              {
                event_type: "object.created",
                payload: {
                  id: manimId,
                  object_type: "viz_manimgx",
                  props: {
                    x: 240,
                    y: 100,
                    w: 500,
                    h: 360,
                    title,
                    formulaLatex,
                    templateId: String(obj.templateId ?? "circle_cartesian"),
                    sceneCode: String(obj.sceneCode ?? ""),
                  },
                },
              },
            ],
          },
        },
      };
    }

    return { ok: false, tool, summary: "Tool tidak dikenal.", error: `Unknown tool: ${tool}` };
  } catch (err) {
    return {
      ok: false,
      tool,
      summary: "Validasi parameter MCP gagal.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
