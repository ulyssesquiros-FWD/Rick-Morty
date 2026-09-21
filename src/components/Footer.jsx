/**
 * Footer Component
 * Minimal sci-fi themed footer with academic attribution.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <p className="footer-brand">
          RICK &amp; MORTY: <span>DIMENSION RAID</span>
        </p>
        <p className="footer-text">
          Quiz #5 &bull; Videojuego 2D con React, Rick &amp; Morty API, json-server y automatización n8n &bull; {currentYear}
        </p>
      </div>
    </footer>
  );
}
