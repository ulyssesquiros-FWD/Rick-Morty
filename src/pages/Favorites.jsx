import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import CharacterGrid from '../components/CharacterGrid';
import ErrorMessage from '../components/ErrorMessage';

/**
 * Favorites Page (/favoritos)
 * Displays all multiverse entities bookmarked by the user in localStorage.
 */
export default function Favorites() {
  const { favorites, favoriteCount } = useFavorites();

  return (
    <div className="favorites-page">
      <header className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="tech-pill">PERSONAL VAULT &bull; ENCRYPTED STORAGE</span>
        </div>
        <h1 className="glitch-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', marginBottom: '0.75rem' }}>
          FAVORITE ENTITIES
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Your bookmarked multiverse entities, synchronized directly into your local dimension device memory.
        </p>
      </header>

      {favoriteCount === 0 ? (
        <ErrorMessage
          title="NO FAVORITES IN THIS DIMENSION"
          message="Your dimensional vault is currently empty. Explore the database and click the heart icon on any character card to bookmark them here."
          type="empty"
          secondaryAction={() => {}}
          secondaryActionLabel=""
          onRetry={null}
        />
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              padding: '0 0.5rem'
            }}
          >
            <span className="entities-badge">
              <span aria-hidden="true">♥</span>
              <span>{favoriteCount} {favoriteCount === 1 ? 'SAVED ENTITY' : 'SAVED ENTITIES'}</span>
            </span>

            <Link to="/personajes" className="btn-portal-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
              + EXPLORE MORE
            </Link>
          </div>

          <CharacterGrid characters={favorites} />
        </>
      )}

      {favoriteCount === 0 && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/personajes" className="btn-portal-primary">
            <span>START EXPLORING CHARACTERS</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
