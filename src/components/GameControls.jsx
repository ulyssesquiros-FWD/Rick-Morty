/**
 * GameControls Component
 * Provides both visual desktop key guide and on-screen touch controls for mobile/tablet devices.
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
        <span className="control-badge"><kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd> MOVER</span>
        <span className="control-badge"><kbd>W</kbd> / <kbd>↑</kbd> SALTAR</span>
        <span className="control-badge"><kbd>SPACE</kbd> / <kbd>J</kbd> DISPARAR</span>
        <span className="control-badge"><kbd>ESC</kbd> PAUSAR</span>
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
            aria-label="Disparar arma de portal"
          >
            ⚡
          </button>
        </div>
      </div>
    </div>
  );
}
