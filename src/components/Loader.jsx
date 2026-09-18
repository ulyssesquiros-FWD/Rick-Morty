/**
 * Loader Component
 * Themed Rick & Morty interdimensional portal spinner with animated rings and sci-fi legend.
 */
export default function Loader({ message = 'TRAVERSING DIMENSIONAL PORTAL...' }) {
  return (
    <div className="loader-container" role="status" aria-live="polite">
      <div className="portal-spinner" aria-hidden="true">
        <div className="spinner-ring-1"></div>
        <div className="spinner-ring-2"></div>
        <div className="spinner-ring-3"></div>
        <div className="spinner-center-pulse"></div>
      </div>
      <p className="loader-legend">{message}</p>
      <span className="loader-sublegend">CITADEL PROTOCOL v4.20 // CALIBRATING FREQUENCIES</span>
    </div>
  );
}
