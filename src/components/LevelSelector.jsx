import { Link } from 'react-router-dom';
import { LEVELS } from '../data/gameConfig';

/**
 * LevelSelector Component
 * Grid of interactive dimensional level portals with stats and launch buttons.
 */
export default function LevelSelector({ activeLevel = 1, onSelect = null }) {
  return (
    <div className="levels-grid" aria-label="Selector de Niveles">
      {LEVELS.map((lvl) => {
        const isSelected = activeLevel === lvl.id;

        return (
          <div
            key={lvl.id}
            className={`level-card ${isSelected ? 'level-card-active' : ''}`}
            style={{ borderColor: lvl.portalColor }}
          >
            <div className="level-card-header">
              <span className="level-number-badge" style={{ backgroundColor: lvl.portalColor }}>
                NIVEL 0{lvl.id}
              </span>
              <span className="tech-pill">OBJETIVO: {lvl.targetEnemies} ENEMIGOS</span>
            </div>

            <h3 className="level-card-title">{lvl.name}</h3>
            <p className="level-card-subtitle">{lvl.subtitle}</p>

            <p className="level-card-desc">{lvl.description}</p>

            <div className="level-specs-box">
              <div className="level-spec-item">
                <span className="spec-label">JEFE FINAL:</span>
                <span className="spec-val" style={{ color: lvl.portalColor }}>
                  {lvl.bossName}
                </span>
              </div>
              <div className="level-spec-item">
                <span className="spec-label">DIFICULTAD:</span>
                <span className="spec-val">
                  {lvl.id === 1 ? '⭐ Normal' : lvl.id === 2 ? '⭐⭐ Difícil' : '⭐⭐⭐ Extrema'}
                </span>
              </div>
            </div>

            <div className="level-card-footer">
              <Link
                to={`/nivel/${lvl.id}`}
                className="btn-portal-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onSelect && onSelect(lvl.id)}
              >
                <span>ABRIR PORTAL 0{lvl.id}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
