import { describe, it, expect } from "vitest";
import { SubjectSchema, CurriculumSchema, LessonTopicSchema, LessonTemplateSchema } from "./index";


describe("curriculum-schema", () => {
  it("validates SubjectSchema", () => {
    const valid = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Mathematics",
      slug: "math",
    };
    expect(SubjectSchema.safeParse(valid).success).toBe(true);
    expect(SubjectSchema.safeParse({ name: "Math" }).success).toBe(false);
  });

  it("validates LessonTopicSchema", () => {
    const topic = {
      id: "topic-1",
      title: "Introduction to 3D Geometry",
      grade_level: "Grade 10",
      subject_id: "123e4567-e89b-12d3-a456-426614174000",
      learning_objectives: ["Identify prisms and pyramids", "Calculate surface area"],
    };
    expect(LessonTopicSchema.safeParse(topic).success).toBe(true);
  });

  it("validates LessonTemplateSchema for Kurikulum Merdeka (P13-T08)", () => {
    const template = {
      id: "tpl-cube-diagonal",
      title: "Kubus ABCD.EFGH & Diagonal Ruang",
      elementCode: "geometri",
      phase: "Fase E",
      grade: "Kelas 10",
      description: "Eksplorasi diagonal bidang dan diagonal ruang pada kubus.",
      teacherNotes: "Gunakan fitur ukur jarak titik A ke G untuk menunjukkan rumus s√3.",
      studentQuestions: [
        "Berapa panjang diagonal bidang AC jika rusuk kubus 6 cm?",
        "Hitung panjang diagonal ruang AG!",
      ],
      boardState: {
        roomId: "demo-room",
        activeSceneId: "scene-1",
        scenes: { "scene-1": { id: "scene-1", name: "Scene 1", strokes: [], objects: {} } },
      },
    };

    const parseResult = LessonTemplateSchema.safeParse(template);
    expect(parseResult.success).toBe(true);
  });
});
