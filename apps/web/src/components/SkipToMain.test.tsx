import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SkipToMain from './SkipToMain';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

describe('SkipToMain', () => {
  it('renders a link to #main-content', () => {
    render(<SkipToMain />);
    const link = screen.getByRole('link', { name: 'Lewati ke konten utama' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has sr-only class (visually hidden by default)', () => {
    render(<SkipToMain />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('sr-only');
  });
});
