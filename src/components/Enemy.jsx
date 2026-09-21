/**
 * Enemy Component
 * Displays individual enemy types, attack patterns, and reward stats.
 */
export default function Enemy({
  name = 'Rogue Meeseeks',
  type = 'Swarm',
  image = 'https://rickandmortyapi.com/api/character/avatar/242.jpeg',
  health = 45,
  points = 100,
  speed = 'Media'
}) {
  return (
    <div className="enemy-spec-card">
      <div className="enemy-img-frame">
        <img src={image} alt={name} className="enemy-avatar" loading="lazy" />
      </div>

      <div className="enemy-details">
        <h4 className="enemy-name">{name}</h4>
        <span className="enemy-type-badge">{type}</span>

        <div className="enemy-metrics">
          <div>
            <span className="metric-lbl">SALUD:</span>
            <strong>{health} HP</strong>
          </div>
          <div>
            <span className="metric-lbl">PUNTOS:</span>
            <strong>+{points} PTS</strong>
          </div>
          <div>
            <span className="metric-lbl">VELOCIDAD:</span>
            <strong>{speed}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
