/**
 * Footer Component
 * Minimal and sci-fi themed footer with academic attribution.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <p className="footer-brand">
          RICK <span>&</span> MORTY MULTIVERSE EXPLORER
        </p>
        <p className="footer-text">
          Academic Laboratory &bull; Powered by React, React Router &amp; Rick and Morty API &bull; {currentYear}
        </p>
      </div>
    </footer>
  );
}
