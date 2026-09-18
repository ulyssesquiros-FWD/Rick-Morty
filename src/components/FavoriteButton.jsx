import { useFavorites } from '../context/FavoritesContext';

/**
 * FavoriteButton Component
 * Allows users to toggle favorite characters with reactive state and animations.
 */
export default function FavoriteButton({ character, large = false }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = character?.id ? isFavorite(character.id) : false;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (character) {
      toggleFavorite(character);
    }
  };

  return (
    <button
      type="button"
      className={`fav-btn ${large ? 'fav-btn-large' : ''} ${favorited ? 'is-favorite' : ''}`}
      onClick={handleClick}
      title={favorited ? 'Remove from Dimensional Favorites' : 'Add to Dimensional Favorites'}
      aria-label={favorited ? `Remove ${character?.name || 'character'} from favorites` : `Add ${character?.name || 'character'} to favorites`}
    >
      <span aria-hidden="true">{favorited ? '♥' : '♡'}</span>
      {large && <span>{favorited ? 'In Favorites' : 'Add to Favorites'}</span>}
    </button>
  );
}
