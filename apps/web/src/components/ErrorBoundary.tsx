import { ReactNode, Component, ErrorInfo } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

/**
 * ErrorBoundary — P09-T06
 * React error boundary that catches render errors, logs them, and shows a fallback.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console (structured); in production wire to Sentry/observability sink
    console.error(JSON.stringify({
      level: 'error',
      type: 'react_render_error',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    }));

    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="p-6 text-center">
      <h2 className="text-lg font-semibold text-red-600 mb-2">
        {t('error.unexpectedTitle', 'Terjadi kesalahan')}
      </h2>
      <p className="text-sm text-gray-500">
        {t('error.unexpectedBody', 'Mohon muat ulang halaman.')}
      </p>
      {error && (
        <pre className="mt-3 text-xs text-left bg-gray-50 p-3 rounded overflow-auto max-h-40">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {t('error.reload', 'Muat Ulang')}
      </button>
    </div>
  );
}

export default ErrorBoundary;
