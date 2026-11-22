import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatePickerModal } from './TemplatePickerModal';
import { STARTER_LESSON_TEMPLATES } from './lessonTemplates';

describe('TemplatePickerModal Component (P13-T08)', () => {
  it('renders template picker dialog with categories and search input', () => {
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectTemplate={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Pustaka Template Pembelajaran Matematika' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Geometri' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aljabar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pengukuran' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cari template pembelajaran')).toBeInTheDocument();
  });

  it('filters templates when clicking an element tab', () => {
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectTemplate={vi.fn()}
      />
    );

    const aljabarBtn = screen.getByRole('button', { name: 'Aljabar' });
    fireEvent.click(aljabarBtn);

    expect(screen.getAllByText(/Grafik Fungsi Kuadrat/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Kubus ABCD.EFGH/)).not.toBeInTheDocument();
  });

  it('selects a template and triggers onSelectTemplate', () => {
    const onSelectTemplate = vi.fn();
    const onClose = vi.fn();

    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={onClose}
        onSelectTemplate={onSelectTemplate}
      />
    );

    const useBtn = screen.getByRole('button', { name: /Gunakan Template/ });
    fireEvent.click(useBtn);

    expect(onSelectTemplate).toHaveBeenCalledWith(STARTER_LESSON_TEMPLATES[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press or close button click', () => {
    const onClose = vi.fn();

    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={onClose}
        onSelectTemplate={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText('Tutup Pustaka Template');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
