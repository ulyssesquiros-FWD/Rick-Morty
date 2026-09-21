import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useRickMorty } from '../hooks/useRickMorty';
import Player from '../components/Player';
import Enemy from '../components/Enemy';
import Projectile from '../components/Projectile';
import CharacterCard from '../components/CharacterCard';

/**
 * Home Page (/) - Dimension Raid Arcade Landing
 */
export default function Home() {
  const navigate = useNavigate();
  const { playerName, setPlayerName } = useGame();
  const [inputName, setInputName] = useState(playerName || 'Rick Sanchez');
  const [nameError, setNameError] = useState('');

  const { player, support, enemies, loading } = useRickMorty();

  const handleStartGame = (e) => {
    e.preventDefault();
    const cleanName = inputName.trim();

    if (!cleanName) {
      setNameError('Debes ingresar un nombre de agente para iniciar la incursión.');
      return;
    }

    if (cleanName.length < 2) {
      setNameError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setNameError('');
    setPlayerName(cleanName);
    navigate('/nivel/1');
  };

  return (
    <div className="home-page">
      {/* Hero Arcade Section */}
      <section className="arcade-hero-section">
        <div className="hero-badge">
          <span className="tech-pill">
            <span aria-hidden="true">⚛</span> PROYECTO 2D ARCADE &bull; QUIZ #5
          </span>
        </div>

        <h1 className="hero-game-title">
          RICK &amp; MORTY: <br />
          <span className="glitch-title">DIMENSION RAID</span>
        </h1>

        <p className="hero-game-subtitle">
          &quot;Portal abierto. Munición lista. Sobrevive al multiverso.&quot;
        </p>

        {/* Player Name Form */}
        <form className="player-entry-card" onSubmit={handleStartGame}>
          <label htmlFor="agent-name-input" className="agent-input-label">
            IDENTIFICACIÓN DEL AGENTE INTERDIMENSIONAL:
          </label>
          <div className="agent-input-group">
            <input
              id="agent-name-input"
              type="text"
              className="agent-text-input"
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="Ingresa tu nombre de agente (ej: Ulysses C-137)..."
              maxLength={24}
            />
            <button type="submit" className="btn-portal-primary" id="btn-quick-play">
              <span>▶ INICIAR INCURSIÓN</span>
            </button>
          </div>
          {nameError && <p className="input-error-msg">{nameError}</p>}
        </form>

        {/* Main Action Buttons */}
        <div className="hero-nav-buttons">
          <Link to="/niveles" className="btn-portal-secondary" id="btn-hero-levels">
            <span>🪐 SELECCIONAR NIVEL</span>
          </Link>
          <Link to="/leaderboard" className="btn-portal-secondary" id="btn-hero-leaderboard">
            <span>🏆 VER LEADERBOARD</span>
          </Link>
          <a href="#instrucciones" className="btn-portal-secondary" id="btn-hero-instructions">
            <span>📖 INSTRUCCIONES</span>
          </a>
        </div>

        {/* Central Animated Dimensional Portal */}
        <div className="hero-portal-container" aria-hidden="true">
          <div className="hero-portal-outer-ring"></div>
          <div className="hero-portal-middle-ring"></div>
          <div className="hero-portal-core">
            <span>RAID</span>
          </div>
        </div>
      </section>

      {/* Briefing & Character Showcase Section (Consuming Rick & Morty API) */}
      <section id="instrucciones" className="briefing-section">
        <div className="section-header">
          <span className="tech-pill">INTELIGENCIA DE MISIÓN &bull; API DATA</span>
          <h2 className="glitch-title" style={{ fontSize: '2rem', marginTop: '0.5rem' }}>
            EXPEDIENTES Y MECÁNICAS DE JUEGO
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '0.5rem auto 2rem' }}>
            Información en tiempo real suministrada por la API oficial de Rick and Morty sobre los combatientes y amenazas de cada dimensión.
          </p>
        </div>

        {/* Player & Weapons showcase */}
        <div className="briefing-grid-row">
          <Player playerAsset={player} customName={inputName || playerName} />
          <Projectile />
        </div>

        {/* Enemies from API */}
        <div className="threats-section">
          <h3 className="section-sub-title">AMENAZAS DETECTADAS EN LAS DIMENSIONES</h3>
          <div className="enemies-cards-grid">
            <Enemy
              name="Rogue Mr. Meeseeks"
              type="Enjambre Terrestre"
              image={enemies?.[0]?.image || 'https://rickandmortyapi.com/api/character/avatar/242.jpeg'}
              health={45}
              points={100}
              speed="Media"
            />
            <Enemy
              name="Gromflomite Security"
              type="Guardia de Asalto"
              image={enemies?.[1]?.image || 'https://rickandmortyapi.com/api/character/avatar/144.jpeg'}
              health={60}
              points={175}
              speed="Rápida"
            />
            <Enemy
              name="Corrupted Birdperson"
              type="Unidad Aérea / Élite"
              image={enemies?.[2]?.image || 'https://rickandmortyapi.com/api/character/avatar/8.jpeg'}
              health={90}
              points={250}
              speed="Volador"
            />
          </div>
        </div>

        {/* Real API Character Feed Grid */}
        {!loading && (player || support) && (
          <div className="api-roster-section">
            <h3 className="section-sub-title">SISTEMA DE ASISTENCIA Y ENLACE</h3>
            <div className="character-cards-roster">
              {player && <CharacterCard character={player} role="Jugador (Rick)" points={500} />}
              {support && <CharacterCard character={support} role="Compañero (Morty)" points={250} />}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
