import { useTranslation } from 'react-i18next';

interface ConsentNoticeProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * ConsentNotice — P09-T02
 * Displays a privacy/data consent notice banner.
 * Uses i18n keys under "consent.*" (Indonesian default).
 */
export default function ConsentNotice({ onAccept, onDecline }: ConsentNoticeProps) {
  const { t } = useTranslation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto">
        <h2 id="consent-title" className="text-base font-semibold text-gray-900 mb-2">
          {t('consent.title')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('consent.body')}
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('consent.accept')}
          >
            {t('consent.accept')}
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label={t('consent.decline')}
          >
            {t('consent.decline')}
          </button>
        </div>
      </div>
    </div>
  );
}
