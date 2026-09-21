/**
 * CharacterCard Component
 * Reusable character card presenting entity details fetched from Rick and Morty API.
 */
export default function CharacterCard({ character, role = 'Entity', points = 100 }) {
  if (!character) return null;

  const { id, name, status, species, image, location } = character;

  return (
    <article className="game-character-card" data-testid={`char-card-${id}`}>
      <div className="char-card-img-wrap">
        <img src={image} alt={name} className="char-card-img" loading="lazy" />
        <span className="char-role-badge">{role}</span>
      </div>

      <div className="char-card-body">
        <h4 className="char-card-name" title={name}>
          {name}
        </h4>
        <div className="char-card-meta">
          <span>{species} &bull; {status}</span>
        </div>
        {location?.name && (
          <div className="char-card-location">
            <span className="loc-label">Ubicación:</span> {location.name}
          </div>
        )}
        <div className="char-card-points">
          <span>VALOR: <strong>+{points} PTS</strong></span>
        </div>
      </div>
    </article>
  );
}
