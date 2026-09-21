import { PLAYER_CONFIG } from '../data/gameConfig';

/**
 * Player Component
 * Displays player dossier, avatar, abilities, and equipped portal weapon specs.
 */
export default function Player({ playerAsset, customName = 'Rick Sanchez' }) {
  const avatar = playerAsset?.image || 'https://rickandmortyapi.com/api/character/avatar/1.jpeg';

  return (
    <div className="player-dossier-card">
      <div className="player-dossier-header">
        <span className="tech-pill">PERSONAJE PRINCIPAL</span>
        <span className="player-status-tag">LISTO PARA EL COMBATE</span>
      </div>

      <div className="player-dossier-main">
        <div className="player-avatar-box">
          <img src={avatar} alt="Rick Sanchez" className="player-avatar-img" />
          <div className="player-portal-ring" aria-hidden="true"></div>
        </div>

        <div className="player-info-box">
          <h3 className="player-title">{customName}</h3>
          <p className="player-species">C-137 &bull; Genio Multiversal &bull; Terrícola</p>

          <div className="player-stats-mini">
            <div className="stat-mini">
              <span>SALUD:</span>
              <strong>{PLAYER_CONFIG.maxHealth} HP</strong>
            </div>
            <div className="stat-mini">
              <span>VIDAS:</span>
              <strong>{PLAYER_CONFIG.maxLives}</strong>
            </div>
            <div className="stat-mini">
              <span>VELOCIDAD:</span>
              <strong>{PLAYER_CONFIG.moveSpeed}x</strong>
            </div>
            <div className="stat-mini">
              <span>DAÑO:</span>
              <strong>{PLAYER_CONFIG.bulletDamage} PWR</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
