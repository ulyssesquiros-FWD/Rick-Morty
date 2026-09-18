import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';

/**
 * Navbar Component
 * Navigation bar with glassmorphism, responsive menu, and live favorite counter.
 */
export default function Navbar() {
  const { favoriteCount } = useFavorites();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={closeMobile} aria-label="Rick and Morty Multiverse Explorer Home">
          <div className="brand-portal-icon" aria-hidden="true">
            <div className="brand-portal-icon-inner"></div>
          </div>
          <div className="brand-text">
            <span className="brand-title">
              RICK <span>&</span> MORTY
            </span>
            <span className="brand-subtitle">MULTIVERSE EXPLORER</span>
          </div>
        </Link>

        {/* Desktop and Mobile Navigation Links */}
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
                to="/personajes"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                CHARACTERS
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/favoritos"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <span>FAVORITES</span>
                {favoriteCount > 0 && (
                  <span className="fav-counter-badge" aria-label={`${favoriteCount} favorites saved`}>
                    {favoriteCount}
                  </span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Mobile menu trigger */}
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
