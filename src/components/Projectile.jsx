/**
 * Projectile Component
 * Showcase of interdimensional ammunition and weapon types for Rick's Portal Gun.
 */
export default function Projectile({
  name = 'Portal Laser Plasma',
  color = '#42f56c',
  damage = 35,
  cadence = 'Alta',
  description = 'Ráfagas condensadas de energía de portal capaces de desintegrar materia biológica enemiga.'
}) {
  return (
    <div className="projectile-spec-card">
      <div className="projectile-icon-box" style={{ borderColor: color }}>
        <div className="projectile-energy-beam" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}></div>
      </div>

      <div className="projectile-info">
        <h4 className="projectile-name">{name}</h4>
        <p className="projectile-desc">{description}</p>
        <div className="projectile-stats">
          <span>DAÑO: <strong>{damage}</strong></span>
          <span>CADENCIA: <strong>{cadence}</strong></span>
        </div>
      </div>
    </div>
  );
}
