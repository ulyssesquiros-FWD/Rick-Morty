import { useGame } from '../context/GameContext';
import { PLAYABLE_CHARACTERS } from '../data/gameConfig';

/**
 * GameHUD Component
 * Displays real-time arcade HUD metrics:
 * Active Character (Rick/Morty swap), Special Skill badge,
 * Score, Lives, Level, Health, Enemies, Timer, Audio toggle, and Pause.
 */
export default function GameHUD({
  levelNumber = 1,
  levelName = 'Earth C-137',
  formattedTime = '00:00',
  targetEnemies = 10,
  onPauseToggle,
  activeCharacter = 'rick',
  onCharacterSwap
}) {
  const {
    playerName,
    score,
    lives,
    playerHealth,
    enemiesDefeated,
    gameStatus,
    soundMuted,
    toggleSound
  } = useGame();

  const formattedScore = score.toString().padStart(6, '0');
  const isPaused = gameStatus === 'paused';
  const charConfig = PLAYABLE_CHARACTERS[activeCharacter] || PLAYABLE_CHARACTERS.rick;

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
      {/* 1. Left: Active Character Card & Swap Button */}
      <div className="hud-block hud-character-card">
        <div
          className="hud-char-avatar-ring"
          style={{ borderColor: charConfig.color, boxShadow: `0 0 10px ${charConfig.glowColor}` }}
          title={`Personaje actual: ${charConfig.name}`}
        >
          <span className="hud-char-icon" aria-hidden="true">
            {activeCharacter === 'rick' ? '🧪' : '⚡'}
          </span>
        </div>

        <div className="hud-char-info">
          <div className="hud-char-name-row">
            <strong style={{ color: charConfig.color }}>{charConfig.name}</strong>
            <span className="hud-char-title">{charConfig.title}</span>
          </div>

          <div className="hud-skill-badge" title={charConfig.skillDesc}>
            <span className="hud-key-tag">[E]</span>
            <span className="hud-skill-name">{charConfig.skillName}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-hud-swap"
          onClick={onCharacterSwap}
          title="Intercambiar personaje (Tecla Q)"
          aria-label={`Cambiar a ${activeCharacter === 'rick' ? 'Morty' : 'Rick'}`}
        >
          <span className="swap-key-hint">Q</span>
          <span className="swap-label">
            {activeCharacter === 'rick' ? '➔ MORTY' : '➔ RICK'}
          </span>
        </button>
      </div>

      {/* 2. Player Health & Lives */}
      <div className="hud-block hud-player-block">
        <div className="hud-player-name">
          <span className="hud-label">PILOTO:</span>
          <strong>{playerName}</strong>
        </div>

        <div className="hud-health-wrapper" title={`Salud: ${playerHealth}%`}>
          <div
            className="hud-health-bar"
            style={{ width: `${playerHealth}%`, backgroundColor: healthColor }}
          />
          <span className="hud-health-text">{playerHealth}%</span>
        </div>

        <div className="hud-stat-item hud-lives-row">
          <span className="hud-label">VIDAS:</span>
          <div className="hud-hearts-container">{renderHearts()}</div>
        </div>
      </div>

      {/* 3. Level & Enemies Defeated */}
      <div className="hud-block hud-stats-block">
        <div className="hud-stat-item">
          <span className="hud-label">NIVEL:</span>
          <span className="hud-value-badge">0{levelNumber}</span>
          <span className="hud-level-name">{levelName}</span>
        </div>

        <div className="hud-stat-item">
          <span className="hud-label">ENEMIGOS:</span>
          <span className="hud-enemies-value">
            {enemiesDefeated} <span className="hud-sub">/ {targetEnemies}</span>
          </span>
        </div>
      </div>

      {/* 4. Score */}
      <div className="hud-block hud-score-block">
        <div className="hud-stat-item">
          <span className="hud-label">SCORE:</span>
          <span className="hud-score-value">{formattedScore}</span>
        </div>
      </div>

      {/* 5. Right: Time, Sound Mute & Pause */}
      <div className="hud-block hud-controls-block">
        <div className="hud-timer-box" title="Tiempo transcurrido">
          <span className="hud-label">TIEMPO:</span>
          <span className="hud-time-value">{formattedTime}</span>
        </div>

        <button
          type="button"
          className="btn-hud-sound"
          onClick={toggleSound}
          title={soundMuted ? 'Activar Sonido' : 'Silenciar Sonido'}
          aria-label={soundMuted ? 'Activar Sonido' : 'Silenciar Sonido'}
        >
          {soundMuted ? '🔇' : '🔊'}
        </button>

        <button
          type="button"
          className={`btn-hud-pause ${isPaused ? 'is-paused' : ''}`}
          onClick={onPauseToggle}
          aria-label={isPaused ? 'Reanudar juego' : 'Pausar juego'}
        >
          {isPaused ? '▶ SEGUIR' : '❚❚ PAUSA'}
        </button>
      </div>
    </div>
  );
}
