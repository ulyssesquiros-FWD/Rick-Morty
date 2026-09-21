import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

/**
 * GameOverModal Component
 * Handles the completion screen for both Victory and Defeat scenarios.
 */
export default function GameOverModal({
  isVictory = false,
  playerName = 'Rick Sanchez',
  score = 0,
  level = 1,
  enemiesDefeated = 0,
  duration = 0,
  classification = 'DIMENSION MASTER',
  n8nStatus = null,
  onRestart
}) {
  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#42f56c', '#22d3ee', '#a855f7', '#facc15']
      });
    }
  }, [isVictory]);

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isMaster = classification === 'DIMENSION MASTER' || score >= 1000;

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`game-modal-card ${isVictory ? 'modal-victory' : 'modal-defeat'}`}>
        <div className="modal-icon-badge" aria-hidden="true">
          {isVictory ? '🏆' : '💀'}
        </div>

        <h2 id="modal-title" className="modal-title glitch-title">
          {isVictory ? 'DIMENSION SAVED' : 'GAME OVER'}
        </h2>

        <p className="modal-subtitle">
          {isVictory
            ? 'El Consejo de Ricks puede dormir tranquilo. Has purgado la amenaza dimensional.'
            : 'El multiverso no perdona. Tu rastro dimensional se desvaneció en el vacío.'}
        </p>

        {/* Classification Badge from n8n / Rules */}
        <div className="modal-classification-row">
          <span className="classification-label">CLASIFICACIÓN INTERDIMENSIONAL:</span>
          <span className={`classification-pill ${isMaster ? 'pill-master' : 'pill-rookie'}`}>
            ★ {classification || (isMaster ? 'DIMENSION MASTER' : 'PORTAL ROOKIE')} ★
          </span>
        </div>

        {/* Results Grid */}
        <div className="modal-stats-grid">
          <div className="modal-stat-box">
            <span className="stat-box-label">JUGADOR</span>
            <span className="stat-box-val">{playerName}</span>
          </div>

          <div className="modal-stat-box">
            <span className="stat-box-label">PUNTAJE FINAL</span>
            <span className="stat-box-val val-highlight">{score}</span>
          </div>

          <div className="modal-stat-box">
            <span className="stat-box-label">NIVEL</span>
            <span className="stat-box-val">0{level}</span>
          </div>

          <div className="modal-stat-box">
            <span className="stat-box-label">ENEMIGOS DERROTADOS</span>
            <span className="stat-box-val">{enemiesDefeated}</span>
          </div>

          <div className="modal-stat-box">
            <span className="stat-box-label">DURACIÓN</span>
            <span className="stat-box-val">{timeFormatted}</span>
          </div>

          <div className="modal-stat-box">
            <span className="stat-box-label">AUTOMATIZACIÓN N8N</span>
            <span className="stat-box-val val-n8n">
              {n8nStatus?.success ? '✓ Sincronizado' : '✓ Procesado'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions-group">
          {isVictory && level < 3 && (
            <Link
              to={`/nivel/${level + 1}`}
              className="btn-portal-primary btn-next-level"
              id="btn-next-level"
              onClick={onRestart}
            >
              <span aria-hidden="true">🚀</span>
              <span>SIGUIENTE NIVEL (0{level + 1})</span>
            </Link>
          )}

          <button
            type="button"
            className={isVictory && level < 3 ? 'btn-portal-secondary' : 'btn-portal-primary'}
            onClick={onRestart}
            id="btn-play-again"
          >
            <span aria-hidden="true">↻</span>
            <span>{isVictory ? 'REPETIR NIVEL' : 'REINTENTAR NIVEL (1 VIDA)'}</span>
          </button>

          <Link to="/leaderboard" className="btn-portal-secondary" id="btn-view-leaderboard">
            <span>VER LEADERBOARD</span>
          </Link>

          <Link to="/" className="btn-portal-secondary" id="btn-go-home">
            <span>VOLVER AL INICIO</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
