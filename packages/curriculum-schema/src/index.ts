/**
 * @ai-classroom/curriculum-schema
 * Zod schemas for curriculum and lesson data.
 */
import { z } from "zod";

export const SubjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});
export type Subject = z.infer<typeof SubjectSchema>;

export const CurriculumSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  content: z.record(z.unknown()),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

export const LessonTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  grade_level: z.string(),
  subject_id: z.string().uuid(),
  learning_objectives: z.array(z.string()),
});
export type LessonTopic = z.infer<typeof LessonTopicSchema>;
