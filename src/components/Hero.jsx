import { Link } from 'react-router-dom';

/**
 * Hero Component (Home Landing Page)
 * Features large animated dimensional portal, multiverse title, sci-fi badges and CTA.
 */
export default function Hero() {
  return (
    <section className="hero-section" aria-label="Hero Section">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="tech-pill">
            <span aria-hidden="true">⚛</span> CITADEL DIMENSIONAL GATEWAY ACTIVE
          </span>
        </div>

        <h1 className="hero-title">
          EXPLORE THE <br />
          <span className="glitch-title">MULTIVERSE</span>
        </h1>

        <p className="hero-subtitle">
          Access the central Citadel mainframe to discover, analyze, and track thousands of
          biological entities, clones, alien species, and robotic variations across infinite parallel dimensions.
        </p>

        <div className="hero-cta-group">
          <Link to="/personajes" className="btn-portal-primary" id="cta-enter-multiverse">
            <span>ENTER THE MULTIVERSE</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/favoritos" className="btn-portal-secondary" id="cta-view-favorites">
            <span aria-hidden="true">♥</span>
            <span>MY DIMENSIONAL VAULT</span>
          </Link>
        </div>

        {/* Central Animated Multiverse Portal */}
        <div className="hero-portal-container" aria-hidden="true">
          <div className="hero-portal-outer-ring"></div>
          <div className="hero-portal-middle-ring"></div>
          <div className="hero-portal-core">
            <span>C-137</span>
          </div>
        </div>

        {/* Multiverse stats preview */}
        <div className="multiverse-stats-grid">
          <div className="stat-card">
            <div className="stat-number">826+</div>
            <div className="stat-label">Cataloged Entities</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">126+</div>
            <div className="stat-label">Known Realities</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">51+</div>
            <div className="stat-label">Recorded Episodes</div>
          </div>
        </div>
      </div>
    </section>
  );
}
