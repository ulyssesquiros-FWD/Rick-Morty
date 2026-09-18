/**
 * ErrorMessage Component
 * Presents thematic error and empty states with optional retry trigger.
 */
export default function ErrorMessage({
  title = 'DIMENSION GLITCH DETECTED',
  message = 'An unexpected dimensional rift occurred while retrieving data.',
  type = 'error', // 'error' | 'empty' | 'network'
  onRetry = null,
  retryLabel = 'TRY AGAIN',
  secondaryAction = null,
  secondaryActionLabel = 'RESET SEARCH'
}) {
  const isNotFound = type === 'empty' || message.includes('DIMENSION NOT FOUND') || message.includes('NOT FOUND');

  const displayTitle = isNotFound ? 'DIMENSION NOT FOUND' : title;
  const iconSymbol = isNotFound ? '🔍' : '⚡';

  return (
    <div className={`error-container ${isNotFound ? 'empty-state-box' : ''}`} role="alert">
      <div className="error-icon-box" aria-hidden="true">
        <span>{iconSymbol}</span>
      </div>
      <h3 className="error-title">{displayTitle}</h3>
      <p className="error-message-text">{message}</p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <button type="button" className="btn-portal-primary" onClick={onRetry}>
            <span aria-hidden="true">↻</span>
            <span>{retryLabel}</span>
          </button>
        )}
        {secondaryAction && (
          <button type="button" className="btn-portal-secondary" onClick={secondaryAction}>
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
