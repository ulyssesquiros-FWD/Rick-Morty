import { useState } from 'react';

/**
 * SearchBar Component
 * Search input with thematic placeholder, submit button, clear button, and filter chips.
 */
export default function SearchBar({
  initialSearch = '',
  totalCount = null,
  onSearch,
  onClear,
  statusFilter = 'all',
  onStatusFilterChange = null
}) {
  const [query, setQuery] = useState(initialSearch);
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);

  // Synchronize state when initialSearch prop changes externally (e.g. navigation / clear)
  if (initialSearch !== prevInitialSearch) {
    setPrevInitialSearch(initialSearch);
    setQuery(initialSearch);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'alive', label: '● Alive' },
    { value: 'dead', label: '● Dead' },
    { value: 'unknown', label: '● Unknown' }
  ];

  return (
    <div className="search-container">
      <form className="search-form" onSubmit={handleSubmit} role="search">
        <div className="search-icon" aria-hidden="true">
          ⚡
        </div>

        <input
          type="search"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across the multiverse (e.g. Rick, Morty, Pickle)..."
          aria-label="Search character by name"
        />

        <div className="search-actions">
          {query && (
            <button
              type="button"
              className="btn-clear"
              onClick={handleClear}
              aria-label="Clear current search query"
            >
              CLEAR
            </button>
          )}

          <button
            type="submit"
            className="btn-portal-primary"
            style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem' }}
          >
            <span>SEARCH</span>
            <span aria-hidden="true">🔍</span>
          </button>
        </div>
      </form>

      {/* Filter Chips row for extra dimension query capabilities */}
      {onStatusFilterChange && (
        <div className="filters-row">
          <span className="filter-label">Filter Status:</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-chip ${statusFilter === opt.value ? 'active' : ''}`}
              onClick={() => onStatusFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {totalCount !== null && totalCount !== undefined && (
        <div className="search-status-bar">
          <span className="entities-badge">
            <span aria-hidden="true">🌌</span>
            <span>
              {totalCount === 1 ? '1 ENTITY DETECTED' : `${totalCount} ENTITIES DETECTED ACROSS REALMS`}
            </span>
          </span>
          {initialSearch && (
            <span style={{ color: 'var(--portal-green)' }}>
              Filtering by: &quot;{initialSearch}&quot;
            </span>
          )}
        </div>
      )}
    </div>
  );
}
