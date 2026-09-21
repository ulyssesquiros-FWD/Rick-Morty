import { useRef } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';

/**
 * GameBoard Component
 * Manages the responsive HTML5 Canvas and bridges canvas events with the game state engine.
 */
export default function GameBoard({
  levelConfig,
  characterAssets,
  gameStatus,
  onEnemyDefeat,
  onPlayerDamage,
  onPlayerDeath,
  onVictory,
  onPauseToggle,
  onControlsReady
}) {
  const canvasRef = useRef(null);

  const { triggerAction, resetEngine } = useGameEngine({
    canvasRef,
    levelConfig,
    characterAssets,
    gameStatus,
    onEnemyDefeat,
    onPlayerDamage,
    onPlayerDeath,
    onVictory,
    onPauseToggle
  });

  // Pass triggerAction up so touch buttons work
  if (onControlsReady) {
    onControlsReady({ triggerAction, resetEngine });
  }

  const isPaused = gameStatus === 'paused';

  return (
    <div className="game-board-wrapper">
      <div className="game-canvas-container">
        <canvas
          ref={canvasRef}
          width={860}
          height={480}
          className="game-canvas"
          aria-label="Dimension Raid 2D Game Screen"
        />

        {/* Pause Overlay */}
        {isPaused && (
          <div className="pause-overlay" role="dialog" aria-label="Juego Pausado">
            <div className="pause-modal">
              <h2 className="glitch-title">PARTIDA PAUSADA</h2>
              <p>El portal dimensional está congelado temporalmente.</p>
              <button
                type="button"
                className="btn-portal-primary"
                onClick={onPauseToggle}
              >
                REANUDAR MISIÓN (ESC)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
