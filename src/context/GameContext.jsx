import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { PLAYER_CONFIG } from '../data/gameConfig';
import { saveScore } from '../services/scoreService';
import { sendScoreToN8n } from '../services/n8nService';
import { soundManager } from '../services/soundService';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [playerName, setPlayerNameState] = useState(() => {
    return localStorage.getItem('dimension_raid_player_name') || 'Rick Sanchez';
  });

  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(PLAYER_CONFIG.maxLives);
  const [playerHealth, setPlayerHealth] = useState(PLAYER_CONFIG.maxHealth);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle'); // 'idle' | 'playing' | 'paused' | 'game_over' | 'victory'
  const [sessionResult, setSessionResult] = useState(null);
  const [activeCharacter, setActiveCharacter] = useState('rick'); // 'rick' | 'morty'
  const [soundMuted, setSoundMuted] = useState(false);

  const toggleSound = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev;
      soundManager.setMuted(next);
      return next;
    });
  }, []);

  const switchCharacter = useCallback(() => {
    setActiveCharacter((prev) => {
      const next = prev === 'rick' ? 'morty' : 'rick';
      soundManager.playPortalSwap();
      return next;
    });
  }, []);

  const setPlayerName = useCallback((name) => {
    const trimmed = name?.trim() || 'Rick Sanchez';
    setPlayerNameState(trimmed);
    localStorage.setItem('dimension_raid_player_name', trimmed);
  }, []);

  const resetGame = useCallback((level = 1) => {
    setScore(0);
    setLives(PLAYER_CONFIG.maxLives);
    setPlayerHealth(PLAYER_CONFIG.maxHealth);
    setEnemiesDefeated(0);
    setCurrentLevel(level);
    setGameStatus('idle');
    setSessionResult(null);
  }, []);

  const startGame = useCallback((level = 1) => {
    setCurrentLevel(level);
    setPlayerHealth(PLAYER_CONFIG.maxHealth);
    setGameStatus('playing');
  }, []);

  const pauseGame = useCallback(() => {
    setGameStatus((prev) => (prev === 'playing' ? 'paused' : prev));
  }, []);

  const resumeGame = useCallback(() => {
    setGameStatus((prev) => (prev === 'paused' ? 'playing' : prev));
  }, []);

  const addScore = useCallback((points) => {
    setScore((prev) => prev + points);
  }, []);

  const recordEnemyDefeat = useCallback((points = 100) => {
    setEnemiesDefeated((prev) => prev + 1);
    setScore((prev) => prev + points);
  }, []);

  const damagePlayer = useCallback((amount = 20) => {
    setPlayerHealth((prev) => {
      const nextHealth = Math.max(0, prev - amount);
      return nextHealth;
    });
  }, []);

  const healPlayer = useCallback((amount = 25) => {
    setPlayerHealth((prev) => Math.min(PLAYER_CONFIG.maxHealth, prev + amount));
  }, []);

  const loseLife = useCallback(() => {
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives > 0) {
        setPlayerHealth(PLAYER_CONFIG.maxHealth);
      }
      return nextLives;
    });
  }, []);

  /**
   * Finalizes the game session, registers with json-server, and triggers the n8n webhook.
   */
  const finishGame = useCallback(
    async ({ status, finalScore, totalEnemies, duration, level }) => {
      const isVictory = status === 'victory';
      const effectiveScore = finalScore !== undefined ? finalScore : score;
      const effectiveEnemies = totalEnemies !== undefined ? totalEnemies : enemiesDefeated;
      const effectiveLevel = level || currentLevel;

      setGameStatus(isVictory ? 'victory' : 'game_over');

      const scorePayload = {
        player: playerName,
        score: effectiveScore,
        level: effectiveLevel,
        enemiesDefeated: effectiveEnemies,
        livesRemaining: isVictory ? lives : 0,
        duration: duration || 60,
        classification: effectiveScore >= 1000 ? 'DIMENSION MASTER' : 'PORTAL ROOKIE'
      };

      // Execute backend POST and n8n webhook in parallel
      const [savedDbResult, n8nResult] = await Promise.allSettled([
        saveScore(scorePayload),
        sendScoreToN8n(scorePayload)
      ]);

      const resultObject = {
        ...scorePayload,
        isVictory,
        dbSaved: savedDbResult.status === 'fulfilled',
        n8nData: n8nResult.status === 'fulfilled' ? n8nResult.value : null,
        classification:
          n8nResult.status === 'fulfilled' && n8nResult.value?.classification
            ? n8nResult.value.classification
            : scorePayload.classification
      };

      setSessionResult(resultObject);
      return resultObject;
    },
    [currentLevel, enemiesDefeated, lives, playerName, score]
  );

  const contextValue = useMemo(
    () => ({
      playerName,
      setPlayerName,
      currentLevel,
      setCurrentLevel,
      score,
      setScore,
      lives,
      setLives,
      playerHealth,
      setPlayerHealth,
      enemiesDefeated,
      gameStatus,
      setGameStatus,
      sessionResult,
      startGame,
      pauseGame,
      resumeGame,
      resetGame,
      addScore,
      recordEnemyDefeat,
      damagePlayer,
      healPlayer,
      loseLife,
      finishGame,
      activeCharacter,
      setActiveCharacter,
      switchCharacter,
      soundMuted,
      toggleSound
    }),
    [
      playerName,
      setPlayerName,
      currentLevel,
      score,
      lives,
      playerHealth,
      enemiesDefeated,
      gameStatus,
      sessionResult,
      startGame,
      pauseGame,
      resumeGame,
      resetGame,
      addScore,
      recordEnemyDefeat,
      damagePlayer,
      healPlayer,
      loseLife,
      finishGame,
      activeCharacter,
      switchCharacter,
      soundMuted,
      toggleSound
    ]
  );

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
