import { useGame } from '../context/GameContext';

/**
 * GameHUD Component
 * Displays real-time arcade HUD metrics: Score, Lives, Level, Health, Enemies, Timer, and Pause.
 */
export default function GameHUD({
  levelNumber = 1,
  levelName = 'Earth C-137',
  formattedTime = '00:00',
  targetEnemies = 10,
  onPauseToggle
}) {
  const {
    playerName,
    score,
    lives,
    playerHealth,
    enemiesDefeated,
    gameStatus
  } = useGame();

  const formattedScore = score.toString().padStart(6, '0');
  const isPaused = gameStatus === 'paused';

  // Heart representations
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      hearts.push(
        <span
          key={`heart-${i}`}
          className={`hud-heart ${i < lives ? 'heart-active' : 'heart-empty'}`}
          aria-hidden="true"
        >
          {i < lives ? '♥' : '♡'}
        </span>
      );
    }
    return hearts;
  };

  const healthColor =
    playerHealth > 60 ? '#42f56c' : playerHealth > 30 ? '#facc15' : '#ef4444';

  return (
    <div className="game-hud-container" role="region" aria-label="Game HUD">
      {/* Left: Player ID & Health */}
      <div className="hud-block hud-player-block">
        <div className="hud-player-name">
          <span className="hud-label">JUGADOR:</span>
          <strong>{playerName}</strong>
        </div>
        <div className="hud-health-wrapper" title={`Salud: ${playerHealth}%`}>
          <div className="hud-health-bar" style={{ width: `${playerHealth}%`, backgroundColor: healthColor }}></div>
          <span className="hud-health-text">{playerHealth}%</span>
        </div>
      </div>

      {/* Middle-Left: Lives & Level */}
      <div className="hud-block hud-stats-block">
        <div className="hud-stat-item">
          <span className="hud-label">LIVES:</span>
          <div className="hud-hearts-container">{renderHearts()}</div>
        </div>

        <div className="hud-stat-item">
          <span className="hud-label">LEVEL:</span>
          <span className="hud-value-badge">0{levelNumber}</span>
          <span className="hud-level-name">{levelName}</span>
        </div>
      </div>

      {/* Middle-Right: Score & Enemies */}
      <div className="hud-block hud-score-block">
        <div className="hud-stat-item">
          <span className="hud-label">SCORE:</span>
          <span className="hud-score-value">{formattedScore}</span>
        </div>

        <div className="hud-stat-item">
          <span className="hud-label">ENEMIES:</span>
          <span className="hud-enemies-value">
            {enemiesDefeated} <span className="hud-sub">/ {targetEnemies}</span>
          </span>
        </div>
      </div>

      {/* Right: Timer & Pause Button */}
      <div className="hud-block hud-controls-block">
        <div className="hud-timer-box" title="Tiempo de misión">
          <span className="hud-label">TIME:</span>
          <span className="hud-time-value">{formattedTime}</span>
        </div>

        <button
          type="button"
          className={`btn-hud-pause ${isPaused ? 'is-paused' : ''}`}
          onClick={onPauseToggle}
          aria-label={isPaused ? 'Reanudar juego' : 'Pausar juego'}
        >
          {isPaused ? '▶ RESUME' : '❚❚ PAUSE'}
        </button>
      </div>
    </div>
  );
}
