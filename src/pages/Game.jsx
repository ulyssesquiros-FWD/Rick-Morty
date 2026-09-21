import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useRickMorty } from '../hooks/useRickMorty';
import { useGameTimer } from '../hooks/useGameTimer';
import { LEVELS } from '../data/gameConfig';
import GameHUD from '../components/GameHUD';
import GameBoard from '../components/GameBoard';
import GameControls from '../components/GameControls';
import GameOverModal from '../components/GameOverModal';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

/**
 * Game Page (/nivel/:num)
 * Dynamic route running the 2D arcade gameplay for the selected level.
 */
export default function Game() {
  const { num } = useParams();
  const navigate = useNavigate();

  // Validate and parse level number
  const parsedLevelNum = parseInt(num, 10);
  const validLevelId = !isNaN(parsedLevelNum) && parsedLevelNum >= 1 && parsedLevelNum <= 3 ? parsedLevelNum : 1;

  const levelConfig = LEVELS.find((l) => l.id === validLevelId) || LEVELS[0];

  const {
    playerName,
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
    recordEnemyDefeat,
    damagePlayer,
    healPlayer,
    addScore,
    loseLife,
    finishGame,
    activeCharacter,
    switchCharacter
  } = useGame();

  const {
    player: playerAsset,
    support: supportAsset,
    enemies: enemyAssets,
    loading: apiLoading,
    error: apiError,
    reload: reloadApi
  } = useRickMorty();

  const isTimerActive = gameStatus === 'playing';
  const { seconds, resetTimer, formattedTime } = useGameTimer(isTimerActive, 0);

  const controlsRef = useRef(null);
  const finishedRef = useRef(false);

  const [levelProgress, setLevelProgress] = useState({
    playerX: 100,
    worldWidth: levelConfig.worldWidth || 3200,
    bossArenaX: levelConfig.bossArenaX || 2450,
    progressPercent: 0,
    inBossArena: false
  });

  // Initialize level when character assets are available and ready
  useEffect(() => {
    if (!apiLoading && !apiError) {
      finishedRef.current = false;
      setLevelProgress({
        playerX: 100,
        worldWidth: levelConfig.worldWidth || 3200,
        bossArenaX: levelConfig.bossArenaX || 2450,
        progressPercent: 0,
        inBossArena: false
      });
      resetTimer(0);
      resetGame(validLevelId);
      startGame(validLevelId);
      if (controlsRef.current?.resetEngine) {
        controlsRef.current.resetEngine(validLevelId);
      }
    }
  }, [validLevelId, apiLoading, apiError, resetGame, resetTimer, startGame, levelConfig.worldWidth, levelConfig.bossArenaX]);

  // Handle Player Damage
  const handlePlayerDamage = useCallback(
    (amount) => {
      if (gameStatus !== 'playing') return;

      if (playerHealth - amount <= 0) {
        if (lives > 1) {
          loseLife();
        } else {
          // Final life lost -> Game Over
          if (!finishedRef.current) {
            finishedRef.current = true;
            loseLife();
            finishGame({
              status: 'game_over',
              finalScore: score,
              totalEnemies: enemiesDefeated,
              duration: seconds,
              level: validLevelId
            });
          }
        }
      } else {
        damagePlayer(amount);
      }
    },
    [damagePlayer, enemiesDefeated, finishGame, gameStatus, lives, loseLife, playerHealth, score, seconds, validLevelId]
  );

  // Handle Player Direct Death
  const handlePlayerDeath = useCallback(() => {
    if (gameStatus !== 'playing' || finishedRef.current) return;
    finishedRef.current = true;
    finishGame({
      status: 'game_over',
      finalScore: score,
      totalEnemies: enemiesDefeated,
      duration: seconds,
      level: validLevelId
    });
  }, [enemiesDefeated, finishGame, gameStatus, score, seconds, validLevelId]);

  // Handle Enemy Defeat
  const handleEnemyDefeat = useCallback(
    (points) => {
      recordEnemyDefeat(points);
    },
    [recordEnemyDefeat]
  );

  // Handle Victory (Boss defeated or goal reached)
  const handleVictory = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const finalCalculatedScore = score + 1000 + lives * 200;

    finishGame({
      status: 'victory',
      finalScore: finalCalculatedScore,
      totalEnemies: enemiesDefeated + 1,
      duration: seconds,
      level: validLevelId
    });
  }, [enemiesDefeated, finishGame, lives, score, seconds, validLevelId]);

  const handlePauseToggle = useCallback(() => {
    if (gameStatus === 'playing') {
      pauseGame();
    } else if (gameStatus === 'paused') {
      resumeGame();
    }
  }, [gameStatus, pauseGame, resumeGame]);

  const handleRestart = () => {
    finishedRef.current = false;
    resetTimer(0);
    resetGame(validLevelId);
    startGame(validLevelId);
    if (controlsRef.current?.resetEngine) {
      controlsRef.current.resetEngine(validLevelId);
    }
  };

  const characterAssets = useMemo(
    () => ({
      player: playerAsset,
      support: supportAsset,
      enemies: enemyAssets
    }),
    [playerAsset, supportAsset, enemyAssets]
  );

  // 1. Loading State
  if (apiLoading) {
    return (
      <div className="game-page-container">
        <LoadingState
          message="CARGANDO DATOS INTERDIMENSIONALES..."
          subtext="Sincronizando entidades y parámetros de la Ciudadela C-137..."
        />
      </div>
    );
  }

  // 2. Error State with Retry
  if (apiError) {
    return (
      <div className="game-page-container">
        <ErrorState
          title="FALLA EN EL PORTAL DIMENSIONAL"
          message={apiError}
          onRetry={reloadApi}
          retryLabel="REINTENTAR"
          secondaryAction={() => navigate('/niveles')}
          secondaryLabel="VER OTROS NIVELES"
        />
      </div>
    );
  }

  const isGameOverOrVictory = gameStatus === 'game_over' || gameStatus === 'victory';

  // 3. Main Gameplay Board
  return (
    <div className="game-page-container">
      {/* HUD Header */}
      <GameHUD
        levelNumber={validLevelId}
        levelName={levelConfig.name}
        formattedTime={formattedTime}
        targetEnemies={levelConfig.targetEnemies}
        onPauseToggle={handlePauseToggle}
        activeCharacter={activeCharacter}
        onCharacterSwap={switchCharacter}
        levelProgress={levelProgress}
      />

      {/* Main 2D Canvas Area */}
      <GameBoard
        levelConfig={levelConfig}
        characterAssets={characterAssets}
        gameStatus={gameStatus}
        onEnemyDefeat={handleEnemyDefeat}
        onPlayerDamage={handlePlayerDamage}
        onPlayerDeath={handlePlayerDeath}
        onVictory={handleVictory}
        onPauseToggle={handlePauseToggle}
        controlsRef={controlsRef}
        activeCharacter={activeCharacter}
        onCharacterSwap={switchCharacter}
        onHealPlayer={healPlayer}
        onScoreBonus={addScore}
        onProgressUpdate={setLevelProgress}
      />

      {/* Controls Overlay & Mobile Touch D-Pad */}
      <GameControls
        onTriggerAction={(action, isPressed) => {
          if (controlsRef.current?.triggerAction) {
            controlsRef.current.triggerAction(action, isPressed);
          }
        }}
      />

      {/* Game Over / Victory Modal */}
      {isGameOverOrVictory && (
        <GameOverModal
          isVictory={gameStatus === 'victory'}
          playerName={playerName}
          score={sessionResult?.score || score}
          level={validLevelId}
          enemiesDefeated={sessionResult?.enemiesDefeated || enemiesDefeated}
          duration={sessionResult?.duration || seconds}
          classification={sessionResult?.classification || (score >= 1000 ? 'DIMENSION MASTER' : 'PORTAL ROOKIE')}
          n8nStatus={sessionResult?.n8nData}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
