import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import FavoriteButton from './FavoriteButton';

/**
 * CharacterDetail Component
 * Visual presentation for the full character dossier with dimensional aura.
 */
export default function CharacterDetail({ character }) {
  const navigate = useNavigate();

  if (!character) return null;

  const {
    id,
    name,
    status,
    species,
    type,
    gender,
    origin,
    location,
    image,
    episode = [],
    created
  } = character;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/personajes');
    }
  };

  const formattedDate = created
    ? new Date(created).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Unknown Earth Cycle';

  return (
    <article className="detail-page-container" data-testid="character-detail-view">
      {/* Navigation Header */}
      <div className="detail-nav-bar">
        <button
          type="button"
          onClick={handleBack}
          className="btn-back"
          aria-label="Return to Multiverse Explorer"
        >
          <span aria-hidden="true">←</span>
          <span>RETURN TO DATABASE</span>
        </button>

        <span className="tech-pill">
          COORDINATES: DIM-SEC-{id.toString().padStart(4, '0')}
        </span>
      </div>

      {/* Main Spec Dossier */}
      <div className="detail-card-panel">
        <div className="detail-image-side">
          <div className="detail-image-portal-aura" aria-hidden="true"></div>
          <div className="detail-avatar-wrapper">
            <img src={image} alt={name} className="detail-avatar" />
          </div>
        </div>

        <div className="detail-info-side">
          <div className="detail-header">
            <div className="detail-header-top">
              <span className="card-id-badge" style={{ fontSize: '0.85rem' }}>
                RECORD #{id}
              </span>
              <StatusBadge status={status} />
            </div>
            <h1 className="detail-name">{name}</h1>
          </div>

          <div className="detail-specs-grid">
            <div className="spec-box">
              <div className="spec-label">SPECIES / SUBTYPE</div>
              <div className="spec-value">
                {species} {type ? `(${type})` : ''}
              </div>
            </div>

            <div className="spec-box">
              <div className="spec-label">GENDER IDENTITY</div>
              <div className="spec-value">{gender || 'Unknown'}</div>
            </div>

            <div className="spec-box">
              <div className="spec-label">ORIGIN DIMENSION / PLANET</div>
              <div className="spec-value">{origin?.name || 'Unknown Dimension'}</div>
            </div>

            <div className="spec-box">
              <div className="spec-label">CURRENT KNOWN LOCATION</div>
              <div className="spec-value">{location?.name || 'Unknown Reality'}</div>
            </div>

            <div className="spec-box">
              <div className="spec-label">DOCUMENTED EPISODES</div>
              <div className="spec-value" style={{ color: 'var(--portal-green-bright)' }}>
                {episode.length} {episode.length === 1 ? 'Episode' : 'Episodes'}
              </div>
            </div>

            <div className="spec-box">
              <div className="spec-label">CITADEL TIMESTAMP</div>
              <div className="spec-value">{formattedDate}</div>
            </div>
          </div>

          <div className="detail-footer-actions">
            <FavoriteButton character={character} large={true} />
            <Link to="/personajes" className="btn-portal-secondary">
              BROWSE ALL CHARACTERS
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
