import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import FavoriteButton from './FavoriteButton';

/**
 * CharacterCard Component
 * Displays character overview card with interactive hover effects, status badge and details link.
 * Receives data cleanly via props.
 */
export default function CharacterCard({ character }) {
  if (!character) return null;

  const { id, name, status, species, location, image } = character;
  const locationName = location?.name || 'Unknown Location';

  return (
    <article className="character-card" data-testid={`character-card-${id}`}>
      <div className="card-image-wrapper">
        <img
          src={image}
          alt={name}
          className="card-image"
          loading="lazy"
        />
        <div className="card-top-overlay">
          <span className="card-id-badge">#{id}</span>
          <FavoriteButton character={character} />
        </div>
      </div>

      <div className="card-body">
        <div className="card-header-info">
          <h3 className="card-name" title={name}>
            {name}
          </h3>
          <div className="card-status-row">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="card-meta-list">
          <div className="meta-item">
            <span className="meta-label">Species</span>
            <span className="meta-value">{species || 'Unknown'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Last Known Location</span>
            <span className="meta-value" title={locationName}>
              {locationName}
            </span>
          </div>
        </div>

        <div className="card-actions">
          <Link
            to={`/personajes/${id}`}
            className="btn-inspect"
            aria-label={`Inspect multiverse records for ${name}`}
          >
            <span>Inspect Entity</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
