import { Link } from 'react-router-dom';

/**
 * NotFound Page (404 / *)
 * Displays a dimensional lost state with options to return to safety.
 */
export default function NotFound() {
  return (
    <div className="not-found-page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div
        className="error-icon-box"
        style={{
          margin: '0 auto 1.5rem',
          width: '90px',
          height: '90px',
          fontSize: '2.5rem',
          borderColor: 'var(--portal-purple)',
          color: 'var(--portal-purple)',
          background: 'rgba(124, 58, 237, 0.15)',
          boxShadow: 'var(--glow-purple)'
        }}
      >
        <span>🌀</span>
      </div>

      <h1 className="glitch-title" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBottom: '0.5rem' }}>
        ERROR 404
      </h1>

      <h2 style={{ color: 'var(--portal-green-bright)', fontSize: '1.4rem', marginBottom: '1.2rem', fontFamily: 'var(--font-display)' }}>
        LOST IN UNCHARTED REALITY
      </h2>

      <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
        The dimensional coordinates you entered collapsed into a micro-singularity. No timeline exists at this URL path.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="btn-portal-primary">
          <span aria-hidden="true">⚛</span>
          <span>RETURN TO EARTH C-137</span>
        </Link>
        <Link to="/personajes" className="btn-portal-secondary">
          <span>BROWSE CHARACTER DATABASE</span>
        </Link>
      </div>
    </div>
  );
}
