/**
 * GameControls Component
 * Desktop Keyboard Guide and Mobile/Tablet Touch Controls
 * Supports Character Swap (Q) and Special Skill (E).
 */
export default function GameControls({ onTriggerAction }) {
  const handleTouchStart = (action) => (e) => {
    e.preventDefault();
    if (onTriggerAction) onTriggerAction(action, true);
  };

  const handleTouchEnd = (action) => (e) => {
    e.preventDefault();
    if (onTriggerAction) onTriggerAction(action, false);
  };

  return (
    <div className="game-controls-container" aria-label="Game Controls">
      {/* Desktop Key Helper */}
      <div className="desktop-controls-hint">
        <span className="control-badge">
          <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd> MOVER
        </span>
        <span className="control-badge">
          <kbd>W</kbd> / <kbd>↑</kbd> SALTAR (Doble salto con Morty)
        </span>
        <span className="control-badge">
          <kbd>SPACE</kbd> / <kbd>J</kbd> DISPARAR
        </span>
        <span className="control-badge control-badge-highlight">
          <kbd>Q</kbd> CAMBIAR RICK / MORTY
        </span>
        <span className="control-badge control-badge-special">
          <kbd>E</kbd> HABILIDAD ESPECIAL
        </span>
        <span className="control-badge">
          <kbd>ESC</kbd> PAUSAR
        </span>
      </div>

      {/* Touch Screen Arcade D-Pad and Action Buttons for Mobile */}
      <div className="mobile-touch-controls">
        <div className="touch-dpad">
          <button
            type="button"
            className="btn-touch btn-touch-left"
            onPointerDown={handleTouchStart('left')}
            onPointerUp={handleTouchEnd('left')}
            onPointerLeave={handleTouchEnd('left')}
            aria-label="Mover a la izquierda"
          >
            ◀
          </button>
          <button
            type="button"
            className="btn-touch btn-touch-right"
            onPointerDown={handleTouchStart('right')}
            onPointerUp={handleTouchEnd('right')}
            onPointerLeave={handleTouchEnd('right')}
            aria-label="Mover a la derecha"
          >
            ▶
          </button>
        </div>

        {/* Center: Character Swap & Skill Buttons */}
        <div className="touch-utility-actions">
          <button
            type="button"
            className="btn-touch btn-touch-swap"
            onPointerDown={handleTouchStart('swap')}
            onPointerUp={handleTouchEnd('swap')}
            aria-label="Intercambiar personaje Rick / Morty"
            title="Cambiar Personaje"
          >
            🌀 Q
          </button>
          <button
            type="button"
            className="btn-touch btn-touch-skill"
            onPointerDown={handleTouchStart('skill')}
            onPointerUp={handleTouchEnd('skill')}
            aria-label="Habilidad Especial"
            title="Habilidad Especial"
          >
            💥 E
          </button>
        </div>

        <div className="touch-actions">
          <button
            type="button"
            className="btn-touch btn-touch-jump"
            onPointerDown={handleTouchStart('up')}
            onPointerUp={handleTouchEnd('up')}
            onPointerLeave={handleTouchEnd('up')}
            aria-label="Saltar"
          >
            ▲
          </button>
          <button
            type="button"
            className="btn-touch btn-touch-shoot"
            onPointerDown={handleTouchStart('shoot')}
            onPointerUp={handleTouchEnd('shoot')}
            onPointerLeave={handleTouchEnd('shoot')}
            aria-label="Disparar"
          >
            ⚡
          </button>
        </div>
      </div>
    </div>
  );
}
