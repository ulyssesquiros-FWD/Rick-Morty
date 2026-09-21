import { useGame } from '../context/GameContext';
import { PLAYABLE_CHARACTERS } from '../data/gameConfig';

/**
 * GameHUD Component
 * Displays real-time arcade HUD metrics:
 * - Active Character (Rick/Morty swap with Starburns avatars)
 * - Contra-style Level Progress Bar (0m ➔ 2450m Boss Sector)
 * - Double Jump status indicator (Quantum rockets / Gravity boots)
 * - Score, Lives, Level, Health, Enemies, Timer, Audio toggle, and Pause.
 */
export default function GameHUD({
  levelNumber = 1,
  levelName = 'Earth C-137',
  formattedTime = '00:00',
  targetEnemies = 12,
  onPauseToggle,
  activeCharacter = 'rick',
  onCharacterSwap,
  levelProgress = { playerX: 100, worldWidth: 3200, bossArenaX: 2450, progressPercent: 0, inBossArena: false }
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

  const hitsRemaining = Math.max(0, Math.ceil(playerHealth / 25));

  const renderHitSegments = () => {
    const segments = [];
    for (let i = 1; i <= 4; i++) {
      const isFilled = i <= hitsRemaining;
      const segColor =
        hitsRemaining >= 3 ? '#42f56c' : hitsRemaining === 2 ? '#facc15' : '#ef4444';
      segments.push(
        <div
          key={`hit-seg-${i}`}
          className={`hud-hit-segment ${isFilled ? 'seg-active' : 'seg-depleted'}`}
          style={{
            backgroundColor: isFilled ? segColor : 'rgba(255,255,255,0.08)',
            boxShadow: isFilled ? `0 0 8px ${segColor}` : 'none'
          }}
          title={`Golpe ${i} de 4 (${isFilled ? 'Activo' : 'Agotado'})`}
        />
      );
    }
    return segments;
  };

  const isPickleRick = (levelProgress.pickleRickTimer || 0) > 0;
  const pickleSeconds = Math.ceil((levelProgress.pickleRickTimer || 0) / 60);

  return (
    <div className="game-hud-container" role="region" aria-label="Game HUD">
      {/* 1. Left: Active Character Card & Swap Button */}
      <div className={`hud-block hud-character-card ${isPickleRick ? 'card-pickle-active' : ''}`}>
        <div
          className={`hud-char-avatar-ring ${isPickleRick ? 'pickle-mode' : ''}`}
          style={{
            borderColor: isPickleRick ? '#84cc16' : charConfig.color,
            boxShadow: `0 0 12px ${isPickleRick ? 'rgba(132, 204, 22, 0.8)' : charConfig.glowColor}`
          }}
          title={isPickleRick ? '¡TRANSFORMACIÓN PICKLE RICK ACTIVA!' : `Personaje actual: ${charConfig.name}`}
        >
          <span className="hud-char-icon" aria-hidden="true">
            {isPickleRick ? '🥒' : activeCharacter === 'rick' ? '🧪' : '⚡'}
          </span>
        </div>

        <div className="hud-char-info">
          <div className="hud-char-name-row">
            <strong style={{ color: isPickleRick ? '#84cc16' : charConfig.color }}>
              {isPickleRick ? 'PICKLE RICK' : charConfig.name}
            </strong>
            <span className="hud-char-title">
              {isPickleRick ? 'Exoesqueleto Rata' : charConfig.title}
            </span>
          </div>

          {isPickleRick ? (
            <div className="hud-pickle-badge" title="Hiper-velocidad y Ráfagas Láser de Batería">
              <span className="pickle-flame">🔥</span>
              <span className="pickle-text">¡PICKLE RICK! ({pickleSeconds}s)</span>
            </div>
          ) : (
            <div className="hud-skill-badge" title={charConfig.skillDesc}>
              <span className="hud-key-tag">[E]</span>
              <span className="hud-skill-name">{charConfig.skillName}</span>
            </div>
          )}
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

      {/* 2. Player Health, 4-Hit Shield & Lives */}
      <div className="hud-block hud-player-block">
        <div className="hud-player-name">
          <span className="hud-label">PILOTO:</span>
          <strong>{playerName}</strong>
        </div>

        {/* 4 Discrete Hits Shield Grid */}
        <div className="hud-hits-counter-row" title="Dificultad Arcade: 4 golpes máximos por vida">
          <span className="hud-hits-title">ESCUDO: {hitsRemaining}/4 GOLPES</span>
          <div className="hud-hit-segments-grid">{renderHitSegments()}</div>
        </div>

        {hitsRemaining === 1 && (
          <div className="hud-critical-alert" role="alert">
            ⚠️ ¡1 GOLPE CRÍTICO!
          </div>
        )}

        <div className="hud-stat-item hud-lives-row">
          <span className="hud-label">VIDAS:</span>
          <div className="hud-hearts-container">{renderHearts()}</div>
          <span className="hud-jump-badge" title="Doble salto disponible presionando dos veces saltar">
            🚀 2x SALTO
          </span>
        </div>
      </div>

      {/* 3. Contra Stage Progress (0m ➔ 2450m Boss Sector) */}
      <div className="hud-block hud-map-progress-block">
        <div className="hud-map-header">
          <span className="hud-label">MAPA CONSECUTIVO:</span>
          <span className={`hud-boss-alert ${levelProgress.inBossArena ? 'in-boss' : ''}`}>
            {levelProgress.inBossArena ? '⚠️ ARENA DE JEFE' : `${levelProgress.progressPercent}%`}
          </span>
        </div>
        <div className="hud-map-track" title={`Posición: ${levelProgress.playerX}m de ${levelProgress.bossArenaX}m`}>
          <div
            className="hud-map-fill"
            style={{ width: `${Math.min(100, levelProgress.progressPercent)}%` }}
          />
          <div className="hud-map-marker" style={{ left: `${Math.min(95, levelProgress.progressPercent)}%` }}>
            {activeCharacter === 'rick' ? '🧪' : '⚡'}
          </div>
          <div className="hud-map-boss-flag">👾</div>
        </div>
        <div className="hud-map-footer">
          <span className="hud-sub">{levelProgress.playerX}m</span>
          <span className="hud-sub">ZONA JEFE {levelProgress.bossArenaX}m</span>
        </div>
      </div>

      {/* 4. Level & Enemies */}
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

      {/* 5. Score */}
      <div className="hud-block hud-score-block">
        <div className="hud-stat-item">
          <span className="hud-label">SCORE:</span>
          <span className="hud-score-value">{formattedScore}</span>
        </div>
      </div>

      {/* 6. Right: Time, Sound Mute & Pause */}
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
