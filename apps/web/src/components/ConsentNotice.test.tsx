import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsentNotice from './ConsentNotice';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ConsentNotice', () => {
  it('renders title and body', () => {
    render(<ConsentNotice onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('consent.title')).toBeInTheDocument();
    expect(screen.getByText('consent.body')).toBeInTheDocument();
  });

  it('calls onAccept when accept button clicked', () => {
    const onAccept = vi.fn();
    render(<ConsentNotice onAccept={onAccept} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByText('consent.accept'));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('calls onDecline when decline button clicked', () => {
    const onDecline = vi.fn();
    render(<ConsentNotice onAccept={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByText('consent.decline'));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('has accessible role and aria-labelledby', () => {
    render(<ConsentNotice onAccept={vi.fn()} onDecline={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'consent-title');
  });
});
