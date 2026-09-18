import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const FavoritesContext = createContext(null);

const STORAGE_KEY = 'rick_morty_multiverse_favorites_v1';

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load multiverse favorites from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn('Failed to persist favorites to localStorage:', error);
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (id) => {
      if (!id) return false;
      return favorites.some((fav) => Number(fav.id) === Number(id));
    },
    [favorites]
  );

  const addFavorite = useCallback((character) => {
    if (!character || !character.id) return;
    setFavorites((prev) => {
      if (prev.some((item) => Number(item.id) === Number(character.id))) {
        return prev;
      }
      return [...prev, character];
    });
  }, []);

  const removeFavorite = useCallback((id) => {
    if (!id) return;
    setFavorites((prev) => prev.filter((item) => Number(item.id) !== Number(id)));
  }, []);

  const toggleFavorite = useCallback(
    (character) => {
      if (!character || !character.id) return;
      if (favorites.some((fav) => Number(fav.id) === Number(character.id))) {
        setFavorites((prev) => prev.filter((item) => Number(item.id) !== Number(character.id)));
      } else {
        setFavorites((prev) => [...prev, character]);
      }
    },
    [favorites]
  );

  const value = useMemo(
    () => ({
      favorites,
      favoriteCount: favorites.length,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite
    }),
    [favorites, isFavorite, addFavorite, removeFavorite, toggleFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
