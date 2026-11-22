import { describe, it, expect } from 'vitest';
import { STARTER_LESSON_TEMPLATES } from './lessonTemplates';
import { LessonTemplateSchema } from '@ai-classroom/curriculum-schema';

describe('Starter Lesson Templates (P13-T08)', () => {
  it('contains at least 10 starter lesson templates', () => {
    expect(STARTER_LESSON_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it('validates every starter template against LessonTemplateSchema', () => {
    for (const tpl of STARTER_LESSON_TEMPLATES) {
      const res = LessonTemplateSchema.safeParse(tpl);
      expect(res.success, `Template ${tpl.id} failed validation: ${JSON.stringify(res.error?.issues)}`).toBe(true);
      expect(tpl.studentQuestions.length).toBeGreaterThanOrEqual(2);
      expect(tpl.teacherNotes).toBeDefined();
    }
  });

  it('covers multiple Kurikulum Merdeka elements (geometri, aljabar, pengukuran, dll)', () => {
    const elements = new Set(STARTER_LESSON_TEMPLATES.map((t) => t.elementCode));
    expect(elements.has('geometri')).toBe(true);
    expect(elements.has('aljabar')).toBe(true);
    expect(elements.has('pengukuran')).toBe(true);
    expect(elements.has('analisis_data_peluang')).toBe(true);
  });
});
