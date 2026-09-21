import { Link } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';

/**
 * LeaderboardPage (/leaderboard)
 * High scores hub connected to json-server and n8n classifications.
 */
export default function LeaderboardPage() {
  return (
    <div className="leaderboard-page">
      <header className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="tech-pill">CIUDADELA DE RICKS &bull; SALÓN DE LA FAMA</span>
        </div>
        <h1 className="glitch-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', marginBottom: '0.75rem' }}>
          TABLA DE LÍDERES MULTIVERSAL
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
          Los mejores registros de combate interdimensional clasificados automáticamente por la inteligencia de n8n y almacenados en la base de datos de la Ciudadela.
        </p>
      </header>

      <Leaderboard />

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link to="/nivel/1" className="btn-portal-primary" style={{ padding: '0.9rem 2.2rem', fontSize: '1rem' }}>
          <span>⚡ DESAFIAR EL RECORD EN EL NIVEL 1</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
