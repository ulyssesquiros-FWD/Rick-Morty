/**
 * LoadingState Component
 * Displays an interdimensional portal loading animation with themed sci-fi status.
 */
export default function LoadingState({
  message = 'CARGANDO DATOS INTERDIMENSIONALES...',
  subtext = 'Conectando con la base de datos de la Ciudadela C-137...'
}) {
  return (
    <div className="loader-container" role="status" aria-live="polite">
      <div className="portal-spinner" aria-hidden="true">
        <div className="spinner-ring-1"></div>
        <div className="spinner-ring-2"></div>
        <div className="spinner-ring-3"></div>
        <div className="spinner-center-pulse"></div>
      </div>
      <p className="loader-legend">{message}</p>
      <span className="loader-sublegend">{subtext}</span>
    </div>
  );
}
