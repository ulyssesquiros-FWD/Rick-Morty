import { useState, useEffect, useCallback } from 'react';
import { getCharactersForGame } from '../services/rickMortyService';

/**
 * Custom Hook to fetch and prepare Rick and Morty game character data.
 */
export function useRickMorty() {
  const [data, setData] = useState({
    player: null,
    support: null,
    enemies: [],
    bosses: {},
    allCharacters: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGameCharacters = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCharactersForGame(signal);
      setData(result);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching Rick and Morty game data:', err);
      setError(err.message || 'Error al conectar con la API de Rick and Morty.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchGameCharacters(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchGameCharacters]);

  const reload = useCallback(() => {
    const controller = new AbortController();
    fetchGameCharacters(controller.signal);
  }, [fetchGameCharacters]);

  return {
    ...data,
    loading,
    error,
    reload
  };
}
