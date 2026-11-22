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

// ---------------------------------------------------------------------------
// Kurikulum Merdeka Taxonomy & Lesson Templates (P13-T08)
// ---------------------------------------------------------------------------

export const KurikulumMerdekaElementSchema = z.enum([
  "bilangan",
  "aljabar",
  "pengukuran",
  "geometri",
  "analisis_data_peluang",
]);
export type KurikulumMerdekaElement = z.infer<typeof KurikulumMerdekaElementSchema>;

export const CurriculumPhaseSchema = z.enum([
  "Fase A", // Kelas 1-2 SD
  "Fase B", // Kelas 3-4 SD
  "Fase C", // Kelas 5-6 SD
  "Fase D", // Kelas 7-9 SMP
  "Fase E", // Kelas 10 SMA
  "Fase F", // Kelas 11-12 SMA
]);
export type CurriculumPhase = z.infer<typeof CurriculumPhaseSchema>;

export const LessonTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  elementCode: KurikulumMerdekaElementSchema,
  phase: CurriculumPhaseSchema,
  grade: z.string(),
  description: z.string(),
  teacherNotes: z.string().optional(),
  studentQuestions: z.array(z.string()).default([]),
  boardState: z.record(z.unknown()),
});
export type LessonTemplate = z.infer<typeof LessonTemplateSchema>;

