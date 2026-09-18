/**
 * Pagination Component
 * Allows navigating between API pages using API metadata.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  hasNext = false,
  hasPrev = false,
  onPageChange,
  disabled = false
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination-container" aria-label="Pagination Navigation">
      <button
        type="button"
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev || currentPage <= 1 || disabled}
        aria-label="Go to previous dimension page"
      >
        <span aria-hidden="true">←</span>
        <span>PREVIOUS</span>
      </button>

      <div className="pagination-info">
        DIMENSION PAGE <strong>{currentPage}</strong> OF <strong>{totalPages}</strong>
      </div>

      <button
        type="button"
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext || currentPage >= totalPages || disabled}
        aria-label="Go to next dimension page"
      >
        <span>NEXT</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
