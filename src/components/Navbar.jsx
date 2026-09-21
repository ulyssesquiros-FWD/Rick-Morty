import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';

/**
 * Navbar Component for Dimension Raid
 */
export default function Navbar() {
  const { playerName } = useGame();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={closeMobile} aria-label="Dimension Raid Home">
          <div className="brand-portal-icon" aria-hidden="true">
            <div className="brand-portal-icon-inner"></div>
          </div>
          <div className="brand-text">
            <span className="brand-title">
              RICK &amp; MORTY: <span>DIMENSION RAID</span>
            </span>
            <span className="brand-subtitle">2D ACTION ARCADE</span>
          </div>
        </Link>

        {/* Current Agent Badge */}
        {playerName && (
          <div className="nav-agent-badge" title="Agente interdimensional activo">
            <span className="agent-dot" aria-hidden="true"></span>
            <span className="agent-text">AGENTE: <strong>{playerName}</strong></span>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          className={`navbar-links-wrapper ${mobileOpen ? 'mobile-active' : ''}`}
          aria-label="Main Navigation"
        >
          <ul className="navbar-links">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                HOME
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/niveles"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                NIVELES
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/nivel/1"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                JUGAR
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/leaderboard"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                LEADERBOARD
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={toggleMobile}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}
