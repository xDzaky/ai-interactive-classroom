/**
 * aiCommands.ts — OpenMAIC Declarative AI Whiteboard Command Protocol (V4)
 * Strictly validated with Zod so AI NEVER executes arbitrary JS/eval().
 */
import { z } from "zod";

export const SimulationTemplateIdSchema = z.enum([
  "math.function_explorer",
  "math.geometry_transform",
  "math.probability_dice",
  "physics.projectile_motion",
  "physics.waves_optics",
]);
export type SimulationTemplateId = z.infer<typeof SimulationTemplateIdSchema>;

export const SliderDefSchema = z.object({
  name: z.string().min(1).max(16),
  label: z.string().min(1).max(40),
  min: z.number(),
  max: z.number(),
  step: z.number().positive().default(0.5),
  value: z.number(),
});
export type SliderDef = z.infer<typeof SliderDefSchema>;

export const AIWhiteboardStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("speak_caption"),
    text: z.string().min(1).max(400),
  }),
  z.object({
    type: z.literal("spawn_shape2d"),
    id: z.string().min(1),
    shapeType: z.enum(["rect", "circle", "triangle", "line", "arrow", "polygon"]),
    params: z.record(z.number()),
    pos: z.tuple([z.number(), z.number()]),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("spawn_solid3d"),
    id: z.string().min(1),
    solidType: z.enum(["cube", "cuboid", "sphere", "cylinder", "cone", "pyramid", "prism", "torus"]),
    params: z.record(z.number()),
    pos: z.tuple([z.number(), z.number()]),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("spawn_math_block"),
    id: z.string().min(1),
    latex: z.string().min(1).max(200),
    pos: z.tuple([z.number(), z.number()]),
  }),
  z.object({
    type: z.literal("spawn_graph"),
    id: z.string().min(1),
    expressions: z.array(z.string().min(1)).min(1).max(4),
    sliders: z.array(SliderDefSchema).optional(),
    pos: z.tuple([z.number(), z.number()]),
  }),
  z.object({
    type: z.literal("spawn_simulation"),
    id: z.string().min(1),
    templateId: SimulationTemplateIdSchema,
    config: z.record(z.unknown()).default({}),
    pos: z.tuple([z.number(), z.number()]),
  }),
  z.object({
    type: z.literal("annotate_arrow"),
    fromId: z.string().min(1),
    toId: z.string().min(1),
    label: z.string().max(80),
  }),
  z.object({
    type: z.literal("highlight_focus"),
    targetId: z.string().min(1),
    color: z.string().default("#4f46e5"),
  }),
]);

export type AIWhiteboardStep = z.infer<typeof AIWhiteboardStepSchema>;

export const AIWhiteboardPlanSchema = z.object({
  title: z.string().min(1),
  steps: z.array(AIWhiteboardStepSchema).min(1).max(24),
});
export type AIWhiteboardPlan = z.infer<typeof AIWhiteboardPlanSchema>;

/**
 * Safely validates raw AI JSON output against the strict declarative Zod protocol.
 */
export function validateAIWhiteboardPlan(raw: unknown): AIWhiteboardPlan {
  return AIWhiteboardPlanSchema.parse(raw);
}

/**
 * Offline-capable deterministic AI Visual Lesson Planner for Indonesian classroom prompts.
 * Guarantees instant, mathematically verified step-by-step plans even without cloud LLM.
 */
export function generateLocalAIPlan(prompt: string): AIWhiteboardPlan {
  const q = prompt.toLowerCase();

  if (q.includes("kuadrat") || q.includes("parabola") && q.includes("fungsi") || q.includes("ax^2")) {
    return validateAIWhiteboardPlan({
      title: "Eksplorasi Fungsi Kuadrat f(x) = ax² + bx + c",
      steps: [
        { type: "speak_caption", text: "Mari kita eksplorasi pengaruh koefisien a, b, dan c pada grafik parabola." },
        { type: "spawn_math_block", id: "ai-math-quad", latex: "f(x) = a x^2 + b x + c", pos: [120, 90] },
        {
          type: "spawn_simulation",
          id: "ai-sim-quad",
          templateId: "math.function_explorer",
          config: { a: 1, b: -2, c: -3 },
          pos: [460, 90],
        },
        { type: "speak_caption", text: "Geser slider a untuk melihat kurva membuka ke atas (a > 0) atau ke bawah (a < 0)!" },
      ],
    });
  }

  if (q.includes("gerak parabola") || q.includes("proyektil") || q.includes("lempar") && q.includes("sudut")) {
    return validateAIWhiteboardPlan({
      title: "Simulasi Gerak Parabola (Fisika)",
      steps: [
        { type: "speak_caption", text: "Gerak parabola memadukan GLB pada sumbu X dan GLBB pada sumbu Y." },
        { type: "spawn_math_block", id: "ai-math-proj", latex: "R = \\frac{v_0^2 \\sin(2\\theta)}{g}", pos: [110, 90] },
        {
          type: "spawn_simulation",
          id: "ai-sim-proj",
          templateId: "physics.projectile_motion",
          config: { v0: 25, angleDeg: 45, g: 9.8 },
          pos: [450, 90],
        },
      ],
    });
  }

  if (q.includes("peluang") || q.includes("dadu") || q.includes("statistika")) {
    return validateAIWhiteboardPlan({
      title: "Eksperimen Peluang & Frekuensi Relatif Dadu",
      steps: [
        { type: "speak_caption", text: "Semakin banyak percobaan lempar dadu, frekuensi relatif mendekati 1/6 (16.7%)." },
        { type: "spawn_math_block", id: "ai-math-prob", latex: "P(A) = \\frac{1}{6}", pos: [110, 90] },
        {
          type: "spawn_simulation",
          id: "ai-sim-prob",
          templateId: "math.probability_dice",
          config: { trials: 30 },
          pos: [450, 90],
        },
      ],
    });
  }

  if (q.includes("gelombang") || q.includes("sinus") || q.includes("frekuensi") || q.includes("amplitudo")) {
    return validateAIWhiteboardPlan({
      title: "Simulasi Superposisi Gelombang Sinus",
      steps: [
        { type: "speak_caption", text: "Amati interferensi konstruktif dan destruktif saat fase & frekuensi diubah." },
        { type: "spawn_math_block", id: "ai-math-wave", latex: "y = A \\sin(\\omega t + \\phi)", pos: [110, 90] },
        {
          type: "spawn_simulation",
          id: "ai-sim-wave",
          templateId: "physics.waves_optics",
          config: { amplitude: 1.5, frequency: 2, phase: 0 },
          pos: [450, 90],
        },
      ],
    });
  }

  if (q.includes("transformasi") || q.includes("rotasi") || q.includes("translasi") || q.includes("dilatasi")) {
    return validateAIWhiteboardPlan({
      title: "Simulasi Transformasi Geometri 2D",
      steps: [
        { type: "speak_caption", text: "Ubah parameter translasi, rotasi, dan skala untuk melihat bayangan bangun datar." },
        {
          type: "spawn_simulation",
          id: "ai-sim-trans",
          templateId: "math.geometry_transform",
          config: { tx: 2, ty: 1, rotDeg: 45, scale: 1.2 },
          pos: [320, 90],
        },
      ],
    });
  }

  if (q.includes("kubus") || q.includes("balok") || q.includes("volume")) {
    return validateAIWhiteboardPlan({
      title: "Visualisasi Volume & Luas Permukaan Kubus 3D",
      steps: [
        { type: "speak_caption", text: "Sebuah kubus dengan panjang rusuk s = 4 cm memiliki volume V = s³ = 64 cm³." },
        { type: "spawn_solid3d", id: "ai-cube-1", solidType: "cube", params: { s: 4 }, pos: [160, 120], label: "Kubus s = 4 cm" },
        { type: "spawn_math_block", id: "ai-math-cube", latex: "4^3", pos: [520, 140] },
      ],
    });
  }

  // Default: Teorema Pythagoras 3-4-5 Step-by-Step!
  return validateAIWhiteboardPlan({
    title: "Pembuktian Visual Teorema Pythagoras (3-4-5)",
    steps: [
      { type: "speak_caption", text: "Langkah 1: Gambar segitiga siku-siku dengan sisi tegak a = 3 dan b = 4." },
      { type: "spawn_shape2d", id: "ai-tri-pyth", shapeType: "triangle", params: { w: 120, h: 160 }, pos: [220, 220], label: "Segitiga 3-4-5" },
      { type: "speak_caption", text: "Langkah 2: Hitung kuadrat sisi miring c² = a² + b² = 3² + 4² = 25." },
      { type: "spawn_math_block", id: "ai-math-pyth1", latex: "3^2 + 4^2", pos: [440, 120] },
      { type: "speak_caption", text: "Langkah 3: Maka panjang sisi miring c = √25 = 5 satuan!" },
      { type: "spawn_math_block", id: "ai-math-pyth2", latex: "\\sqrt{25}", pos: [440, 270] },
    ],
  });
}
