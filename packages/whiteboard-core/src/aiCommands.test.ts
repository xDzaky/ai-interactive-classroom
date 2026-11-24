import { describe, it, expect } from "vitest";
import { validateAIWhiteboardPlan, generateLocalAIPlan } from "./aiCommands.js";

describe("aiCommands — OpenMAIC Declarative AI Whiteboard Protocol", () => {
  it("validates a well-formed AIWhiteboardPlan with Zod", () => {
    const plan = validateAIWhiteboardPlan({
      title: "Uji Pythagoras",
      steps: [
        { type: "speak_caption", text: "Langkah 1" },
        { type: "spawn_math_block", id: "m1", latex: "3^2 + 4^2", pos: [100, 100] },
        { type: "spawn_simulation", id: "s1", templateId: "math.function_explorer", config: { a: 1 }, pos: [300, 100] },
      ],
    });
    expect(plan.steps).toHaveLength(3);
  });

  it("rejects unknown or unsafe command types", () => {
    expect(() =>
      validateAIWhiteboardPlan({
        title: "Unsafe",
        steps: [{ type: "eval_js", code: "alert(1)" }],
      }),
    ).toThrow();
  });

  it("generates validated local plans for quadratic, projectile, dice, and pythagoras prompts", () => {
    expect(generateLocalAIPlan("Buat simulasi fungsi kuadrat").steps.some((s) => s.type === "spawn_simulation")).toBe(true);
    expect(generateLocalAIPlan("Simulasi gerak parabola fisika").steps.some((s) => s.type === "spawn_simulation")).toBe(true);
    expect(generateLocalAIPlan("Eksperimen peluang dadu").steps.some((s) => s.type === "spawn_simulation")).toBe(true);
    expect(generateLocalAIPlan("Jelaskan teorema pythagoras").steps.length).toBeGreaterThanOrEqual(4);
  });
});
