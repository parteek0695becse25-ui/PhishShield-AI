import { AlertTriangle } from 'lucide-react';

export default function ErrorBanner({ error, onRetry, title = 'Something went wrong' }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  return (
    <div className="banner banner-error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && <button type="button" className="btn btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}
