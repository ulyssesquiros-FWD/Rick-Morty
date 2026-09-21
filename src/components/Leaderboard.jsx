import { useState, useEffect, useMemo, useCallback } from 'react';
import { getScores } from '../services/scoreService';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

/**
 * Leaderboard Component
 * Fetches, memoizes, and renders high scores from the json-server backend.
 */
export default function Leaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboardData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScores(signal);
      setScores(data || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('No se pudo sincronizar el registro de puntuaciones del servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboardData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchLeaderboardData]);

  // Sort scores descending by score value using useMemo
  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [scores]);

  const handleRefresh = () => {
    const controller = new AbortController();
    fetchLeaderboardData(controller.signal);
  };

  return (
    <div className="leaderboard-wrapper">
      <div className="leaderboard-header-bar">
        <div>
          <span className="tech-pill">CITADEL HIGH SCORE DATABASE</span>
          <h2 className="glitch-title" style={{ fontSize: '1.8rem', marginTop: '0.4rem' }}>
            REGISTRO DE AGENTES INTERDIMENSIONALES
          </h2>
        </div>

        <button
          type="button"
          className="btn-portal-secondary"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Actualizar tabla de puntuaciones"
        >
          <span>↻ ACTUALIZAR</span>
        </button>
      </div>

      {loading && <LoadingState message="SINCRONIZANDO LEADERBOARD..." subtext="Consultando base de datos en localhost:3001..." />}

      {!loading && error && (
        <ErrorState
          title="ERROR DE CONEXIÓN CON EL BACKEND"
          message={error}
          onRetry={handleRefresh}
          retryLabel="REINTENTAR CONSULTA"
        />
      )}

      {!loading && !error && sortedScores.length === 0 && (
        <div className="empty-leaderboard-box">
          <p>No hay expedientes registrados aún en esta dimensión. ¡Sé el primero en jugar!</p>
        </div>
      )}

      {!loading && !error && sortedScores.length > 0 && (
        <div className="leaderboard-table-container">
          <table className="leaderboard-table" aria-label="Tabla de Puntuaciones">
            <thead>
              <tr>
                <th scope="col"># POS</th>
                <th scope="col">JUGADOR</th>
                <th scope="col">PUNTAJE</th>
                <th scope="col">NIVEL</th>
                <th scope="col">ENEMIGOS</th>
                <th scope="col">CLASIFICACIÓN</th>
                <th scope="col">FECHA</th>
              </tr>
            </thead>
            <tbody>
              {sortedScores.map((entry, index) => {
                const rank = index + 1;
                const isMaster = entry.classification === 'DIMENSION MASTER' || entry.score >= 1000;
                const formattedDate = entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Reciente';

                return (
                  <tr
                    key={entry.id || `score-${index}`}
                    className={rank <= 3 ? `rank-row rank-${rank}` : ''}
                  >
                    <td>
                      <span className={`rank-badge rank-${rank}`}>
                        {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : rank}
                      </span>
                    </td>
                    <td>
                      <strong className="player-table-name">{entry.player || 'Rick Desconocido'}</strong>
                    </td>
                    <td>
                      <span className="score-table-val">{entry.score || 0}</span>
                    </td>
                    <td>0{entry.level || 1}</td>
                    <td>{entry.enemiesDefeated || 0}</td>
                    <td>
                      <span className={`pill-table-class ${isMaster ? 'pill-master' : 'pill-rookie'}`}>
                        {entry.classification || (isMaster ? 'DIMENSION MASTER' : 'PORTAL ROOKIE')}
                      </span>
                    </td>
                    <td className="date-table-cell">{formattedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
