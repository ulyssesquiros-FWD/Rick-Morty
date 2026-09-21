import { useState, useEffect, useCallback, useRef } from 'react';
import { getCharactersForGame } from '../services/rickMortyService';

// Module-level persistent cache across all page navigations
let globalCharactersCache = null;

/**
 * Custom Hook to fetch, cache, and provide Rick and Morty game character data.
 * Features AbortController timeout, memory caching, and error resilience.
 */
export function useRickMorty() {
  const [data, setData] = useState(() => {
    return (
      globalCharactersCache || {
        player: null,
        support: null,
        enemies: [],
        bosses: {},
        allCharacters: []
      }
    );
  });

  const [loading, setLoading] = useState(() => !globalCharactersCache);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const fetchGameCharacters = useCallback(async (isForceRetry = false) => {
    // If already cached and not forcing reload, return immediately
    if (globalCharactersCache && !isForceRetry) {
      if (isMountedRef.current) {
        setData(globalCharactersCache);
        setLoading(false);
        setError(null);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    const controller = new AbortController();
    // 5.5 second timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5500);

    try {
      const result = await getCharactersForGame(controller.signal);
      clearTimeout(timeoutId);

      globalCharactersCache = result;

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[Dimension Raid] API fetch error or timeout:', err);

      if (isMountedRef.current) {
        const message =
          err.name === 'AbortError'
            ? 'No pudimos conectar con el Consejo Interdimensional. Tiempo de espera agotado.'
            : (err.message || 'No pudimos conectar con el Consejo Interdimensional.');

        setError(message);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!globalCharactersCache) {
      fetchGameCharacters(false);
    } else {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchGameCharacters]);

  const reload = useCallback(() => {
    fetchGameCharacters(true);
  }, [fetchGameCharacters]);

  return {
    ...data,
    loading,
    error,
    reload
  };
}
