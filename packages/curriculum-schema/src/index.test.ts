import { describe, it, expect } from "vitest";
import { SubjectSchema, CurriculumSchema, LessonTopicSchema } from "./index";

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
});
