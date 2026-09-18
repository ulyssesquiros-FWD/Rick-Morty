/**
 * StatusBadge Component
 * Displays character life status (Alive, Dead, unknown) with themed neon indicators.
 */
export default function StatusBadge({ status = 'unknown' }) {
  const normalizedStatus = (status || 'unknown').toLowerCase();

  let statusClass = 'status-unknown';
  let label = status;

  if (normalizedStatus === 'alive') {
    statusClass = 'status-alive';
    label = 'Alive';
  } else if (normalizedStatus === 'dead') {
    statusClass = 'status-dead';
    label = 'Dead';
  } else {
    statusClass = 'status-unknown';
    label = 'Unknown';
  }

  return (
    <span className={`status-badge ${statusClass}`} title={`Status: ${label}`}>
      <span className="status-dot" aria-hidden="true"></span>
      <span>{label}</span>
    </span>
  );
}
