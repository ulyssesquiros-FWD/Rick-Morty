import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCharacters } from '../services/api/rickAndMortyApi';
import SearchBar from '../components/SearchBar';
import CharacterGrid from '../components/CharacterGrid';
import Pagination from '../components/Pagination';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

/**
 * Characters Page (/personajes)
 * Main multiverse explorer database view.
 */
export default function Characters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract initial parameters from URL
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const nameParam = searchParams.get('name') || '';
  const statusParam = searchParams.get('status') || 'all';

  const [characters, setCharacters] = useState([]);
  const [info, setInfo] = useState({ count: 0, pages: 1, next: null, prev: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch characters logic with AbortController to prevent race conditions
  const fetchCharactersData = useCallback(
    async (page, name, status, signal) => {
      setLoading(true);
      setError(null);

      try {
        const data = await getCharacters({
          page,
          name,
          status: status === 'all' ? '' : status,
          signal
        });

        setCharacters(data.results || []);
        setInfo(data.info || { count: 0, pages: 1, next: null, prev: null });
      } catch (err) {
        if (err.name === 'AbortError') {
          // Ignore cancellation
          return;
        }

        setCharacters([]);
        setInfo({ count: 0, pages: 0, next: null, prev: null });

        if (err.status === 404 || err.code === 'NOT_FOUND') {
          setError({
            type: 'empty',
            title: 'DIMENSION NOT FOUND',
            message: `We couldn't locate any entity named "${name}" in this sector of the multiverse. Try another character name or reset your filters.`
          });
        } else if (err.code === 'NETWORK_ERROR') {
          setError({
            type: 'network',
            title: 'PORTAL CONNECTION FAILED',
            message: err.message || 'The multiverse connection could not be established. Try again.'
          });
        } else {
          setError({
            type: 'error',
            title: 'DIMENSIONAL ANOMALY',
            message: err.message || 'An unexpected error occurred while traversing dimensional frequencies.'
          });
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCharactersData(pageParam, nameParam, statusParam, controller.signal);

    return () => {
      controller.abort();
    };
  }, [pageParam, nameParam, statusParam, fetchCharactersData]);

  // Handlers for search, filter and pagination
  const handleSearch = (searchTerm) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (searchTerm) params.set('name', searchTerm);
    if (statusParam && statusParam !== 'all') params.set('status', statusParam);
    setSearchParams(params);
  };

  const handleClearSearch = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (statusParam && statusParam !== 'all') params.set('status', statusParam);
    setSearchParams(params);
  };

  const handleStatusFilterChange = (newStatus) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (nameParam) params.set('name', nameParam);
    if (newStatus && newStatus !== 'all') params.set('status', newStatus);
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    if (nameParam) params.set('name', nameParam);
    if (statusParam && statusParam !== 'all') params.set('status', statusParam);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    const controller = new AbortController();
    fetchCharactersData(pageParam, nameParam, statusParam, controller.signal);
  };

  return (
    <div className="characters-page">
      <header className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="tech-pill">DATABASE v2.40 &bull; CITADEL MAINFRAME</span>
        </div>
        <h1 className="glitch-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', marginBottom: '0.75rem' }}>
          DIMENSIONAL CHARACTER DATABASE
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
          Browse biological and synthetic entities across infinite parallel universes. Filter by identity frequency or search directly.
        </p>
      </header>

      {/* Multiverse Search & Filters */}
      <SearchBar
        initialSearch={nameParam}
        totalCount={loading ? null : info.count}
        onSearch={handleSearch}
        onClear={handleClearSearch}
        statusFilter={statusParam}
        onStatusFilterChange={handleStatusFilterChange}
      />

      {/* Dynamic Content States */}
      {loading && <Loader message="SEARCHING MULTIVERSE FREQUENCIES..." />}

      {!loading && error && (
        <ErrorMessage
          title={error.title}
          message={error.message}
          type={error.type}
          onRetry={handleRetry}
          secondaryAction={nameParam || statusParam !== 'all' ? handleClearSearch : null}
          secondaryActionLabel="RESET ALL FILTERS"
        />
      )}

      {!loading && !error && characters.length > 0 && (
        <>
          <CharacterGrid characters={characters} />

          <Pagination
            currentPage={pageParam}
            totalPages={info.pages}
            hasNext={Boolean(info.next)}
            hasPrev={Boolean(info.prev)}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
