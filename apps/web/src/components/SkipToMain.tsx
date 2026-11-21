import { useTranslation } from 'react-i18next';

/**
 * SkipToMain — P09-T03
 * WCAG 2.2 — skip navigation link for keyboard users.
 * Must be the first focusable element on the page.
 * Visible only on focus.
 */
export default function SkipToMain() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-700 focus:text-white focus:rounded focus:shadow-lg focus:outline-none"
    >
      {t('a11y.skipToMain', 'Lewati ke konten utama')}
    </a>
  );
}
