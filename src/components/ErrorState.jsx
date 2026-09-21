/**
 * ErrorState Component
 * Displays friendly themed error messages with retry action.
 */
export default function ErrorState({
  title = 'FALLA EN EL PORTAL DIMENSIONAL',
  message = 'No se pudo establecer conexión con el servidor interdimensional.',
  onRetry = null,
  retryLabel = 'REINTENTAR CONEXIÓN',
  secondaryAction = null,
  secondaryLabel = 'VOLVER AL INICIO'
}) {
  return (
    <div className="error-container" role="alert">
      <div className="error-icon-box" aria-hidden="true">
        <span>⚡</span>
      </div>
      <h3 className="error-title">{title}</h3>
      <p className="error-message-text">{message}</p>

      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
        {onRetry && (
          <button type="button" className="btn-portal-primary" onClick={onRetry}>
            <span aria-hidden="true">↻</span>
            <span>{retryLabel}</span>
          </button>
        )}
        {secondaryAction && (
          <button type="button" className="btn-portal-secondary" onClick={secondaryAction}>
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
