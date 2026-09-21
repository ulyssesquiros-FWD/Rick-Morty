import { useGame } from '../context/GameContext';
import LevelSelector from '../components/LevelSelector';

/**
 * Levels Page (/niveles)
 * Mission select terminal for dimensional levels.
 */
export default function Levels() {
  const { currentLevel } = useGame();

  return (
    <div className="levels-page">
      <header className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="tech-pill">TERMINAL DE PORTALES &bull; C-137</span>
        </div>
        <h1 className="glitch-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', marginBottom: '0.75rem' }}>
          SELECCIÓN DE DIMENSIONES
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
          Selecciona las coordenadas de la grieta dimensional que deseas purgar. Cada nivel incrementa la dificultad, la velocidad de los enemigos y el poder del jefe final.
        </p>
      </header>

      <LevelSelector activeLevel={currentLevel} />
    </div>
  );
}
