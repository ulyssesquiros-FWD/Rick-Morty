import { useEffect, useRef, useCallback } from 'react';
import {
  PLAYER_CONFIG,
  PLAYABLE_CHARACTERS,
  POWERUP_CONFIG,
  SCORE_SYSTEM
} from '../data/gameConfig';
import { soundManager } from '../services/soundService';

/**
 * Custom Hook: useGameEngine
 * Contra (1987) Horizontal Side-Scrolling Engine:
 * - Dynamic tracking camera across 3200px+ sprawling stages
 * - Rich parallax backgrounds with Rick and Morty canonical lore
 *   (Smith Garage, Space Cruiser, Cromulon "SHOW ME WHAT YOU GOT", Citadel billboards)
 * - 2D character models with animations rigged directly from Starburns Industries Model Sheets
 * - Double jump for BOTH Rick (quantum portal thrusters) and Morty (gravity boots)
 * - Powerup drops, enemy limb animations, and climactic Boss Arena lock
 */
export function useGameEngine({
  canvasRef,
  levelConfig,
  characterAssets,
  gameStatus,
  onEnemyDefeat,
  onPlayerDamage,
  onPlayerDeath,
  onVictory,
  onPauseToggle,
  activeCharacter = 'rick',
  onCharacterSwap,
  onHealPlayer,
  onScoreBonus,
  onProgressUpdate
}) {
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    swap: false,
    skill: false
  });

  const gameStateRef = useRef({
    player: {
      x: 100,
      y: 350,
      vx: 0,
      vy: 0,
      width: PLAYABLE_CHARACTERS.rick.width,
      height: PLAYABLE_CHARACTERS.rick.height,
      facing: 'right',
      onGround: false,
      shootCooldown: 0,
      invulnerableTimer: 0,
      runCycle: 0,
      jumpCount: 0,
      recoilTimer: 0,
      character: 'rick',
      skillCooldown: 0,
      skillActiveTimer: 0,
      portalSwapTimer: 0
    },
    cameraX: 0,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    floatingTexts: [],
    powerups: [],
    spawnTimer: 0,
    bossSpawned: false,
    bossDefeated: false,
    enemiesSpawnedCount: 0,
    levelKillsCount: 0,
    screenShake: 0,
    comboCount: 0,
    comboTimer: 0
  });

  const imageCacheRef = useRef({});
  const animationFrameIdRef = useRef(null);

  // Sync external activeCharacter changes
  useEffect(() => {
    if (gameStateRef.current.player.character !== activeCharacter) {
      const p = gameStateRef.current.player;
      p.character = activeCharacter;
      p.portalSwapTimer = 16;
      const charConf = PLAYABLE_CHARACTERS[activeCharacter] || PLAYABLE_CHARACTERS.rick;
      p.width = charConf.width;
      p.height = charConf.height;
    }
  }, [activeCharacter]);

  // Preload character images
  useEffect(() => {
    if (!characterAssets) return;

    const urlsToLoad = [
      { key: 'player', url: characterAssets.player?.image },
      { key: 'support', url: characterAssets.support?.image },
      { key: 'meeseeks', url: characterAssets.enemies?.[0]?.image },
      { key: 'gromflomite', url: characterAssets.enemies?.[1]?.image },
      { key: 'birdperson', url: characterAssets.enemies?.[2]?.image }
    ];

    urlsToLoad.forEach(({ key, url }) => {
      if (url && !imageCacheRef.current[key]) {
        const img = new Image();
        img.onload = () => {
          imageCacheRef.current[key] = img;
        };
        img.onerror = () => {
          imageCacheRef.current[key] = null;
        };
        img.src = url;
      }
    });
  }, [characterAssets]);

  // Trigger Character Swap
  const triggerCharacterSwap = useCallback(() => {
    const p = gameStateRef.current.player;
    const nextChar = p.character === 'rick' ? 'morty' : 'rick';
    p.character = nextChar;
    p.portalSwapTimer = 16;
    soundManager.playPortalSwap();

    const charConf = PLAYABLE_CHARACTERS[nextChar];
    p.width = charConf.width;
    p.height = charConf.height;

    // Portal vortex particles
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22;
      const speed = 2.5 + Math.random() * 3.5;
      gameStateRef.current.particles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 26,
        maxLife: 26,
        color: nextChar === 'rick' ? '#42f56c' : '#facc15',
        size: 3.5 + Math.random() * 2
      });
    }

    gameStateRef.current.floatingTexts.push({
      text: nextChar === 'rick' ? '¡RICK C-137!' : '¡MORTY SMITH!',
      x: p.x - 10,
      y: p.y - 18,
      vy: -1.3,
      alpha: 1.0,
      life: 50,
      color: nextChar === 'rick' ? '#42f56c' : '#facc15'
    });

    if (onCharacterSwap) {
      onCharacterSwap(nextChar);
    }
  }, [onCharacterSwap]);

  // Trigger Special Skill
  const triggerSpecialSkill = useCallback(() => {
    const state = gameStateRef.current;
    const p = state.player;
    const charConf = PLAYABLE_CHARACTERS[p.character] || PLAYABLE_CHARACTERS.rick;

    if (p.skillCooldown > 0) return;

    if (p.character === 'rick') {
      // Rick: Salto Cuántico (Portal Warp Dash)
      soundManager.playSpecialSkill('rick');
      p.skillCooldown = charConf.skillCooldown;
      state.screenShake = 10;

      const originX = p.x;
      const warpDist = p.facing === 'right' ? 220 : -220;
      const targetX = Math.max(10, Math.min((levelConfig?.worldWidth || 3200) - p.width - 20, p.x + warpDist));

      // Particles at origin
      for (let i = 0; i < 18; i++) {
        state.particles.push({
          x: originX + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.5) * 7,
          life: 25,
          maxLife: 25,
          color: '#39ff14',
          size: 4
        });
      }

      // Warp player
      p.x = targetX;
      p.invulnerableTimer = 35;

      // Clear enemy bullets in path
      const minX = Math.min(originX, targetX);
      const maxX = Math.max(originX, targetX) + p.width;
      for (let b = state.enemyBullets.length - 1; b >= 0; b--) {
        const eb = state.enemyBullets[b];
        if (eb.x >= minX && eb.x <= maxX) {
          state.enemyBullets.splice(b, 1);
        }
      }

      // Damage intersected enemies
      state.enemies.forEach((en) => {
        if (en.x + en.width >= minX && en.x <= maxX) {
          en.health -= 75;
          soundManager.playEnemyHit();
          state.floatingTexts.push({
            text: 'WARP HIT! -75',
            x: en.x,
            y: en.y - 12,
            vy: -1.2,
            alpha: 1.0,
            life: 40,
            color: '#38bdf8'
          });
        }
      });

      // Particles at destination
      for (let i = 0; i < 22; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.5) * 7,
          life: 28,
          maxLife: 28,
          color: '#22d3ee',
          size: 4.5
        });
      }

      state.floatingTexts.push({
        text: '¡PORTAL WARP!',
        x: p.x - 20,
        y: p.y - 20,
        vy: -1.4,
        alpha: 1.0,
        life: 50,
        color: '#42f56c'
      });
    } else {
      // Morty: Death Crystal Matrix
      soundManager.playSpecialSkill('morty');
      p.skillCooldown = charConf.skillCooldown;
      p.skillActiveTimer = charConf.skillDuration; // 3.5s
      p.invulnerableTimer = charConf.skillDuration;
      state.screenShake = 7;

      for (let i = 0; i < 24; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 30,
          maxLife: 30,
          color: '#c084fc',
          size: 4.5
        });
      }

      state.floatingTexts.push({
        text: '¡DEATH CRYSTAL MATRIX!',
        x: p.x - 30,
        y: p.y - 22,
        vy: -1.3,
        alpha: 1.0,
        life: 60,
        color: '#c084fc'
      });
    }
  }, [levelConfig?.worldWidth]);

  // Jump Action Handler with DOUBLE JUMP for BOTH Rick and Morty
  const handleJumpPress = useCallback(() => {
    const p = gameStateRef.current.player;
    const charConf = PLAYABLE_CHARACTERS[p.character] || PLAYABLE_CHARACTERS.rick;

    if (p.onGround) {
      // First Jump (from ground or platform)
      p.vy = charConf.jumpForce;
      p.onGround = false;
      p.jumpCount = 1;
      soundManager.playJump(false);
    } else if (p.jumpCount === 1) {
      // DOUBLE JUMP in mid-air (BOTH Rick & Morty!)
      p.vy = charConf.jumpForce * 0.94;
      p.jumpCount = 2;
      soundManager.playJump(true);

      const isRick = p.character === 'rick';
      const sparkColor = isRick ? '#39ff14' : '#facc15';

      // Spawn rocket boot propulsion particles
      for (let i = 0; i < 12; i++) {
        gameStateRef.current.particles.push({
          x: p.x + p.width / 2 + (Math.random() - 0.5) * 18,
          y: p.y + p.height,
          vx: (Math.random() - 0.5) * 4,
          vy: 3 + Math.random() * 4,
          life: 20,
          maxLife: 20,
          color: sparkColor,
          size: 3.5
        });
      }

      gameStateRef.current.floatingTexts.push({
        text: isRick ? '🚀 QUANTUM THRUSTER!' : '⚡ GRAVITY BOOTS!',
        x: p.x - 20,
        y: p.y - 15,
        vy: -1.2,
        alpha: 1.0,
        life: 40,
        color: sparkColor
      });
    }
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysRef.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysRef.current.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!keysRef.current.up) {
          keysRef.current.up = true;
          handleJumpPress();
        }
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysRef.current.down = true;
      if (e.code === 'Space' || e.code === 'KeyJ') keysRef.current.shoot = true;

      if (e.code === 'KeyQ') {
        e.preventDefault();
        triggerCharacterSwap();
      }

      if (e.code === 'KeyE') {
        e.preventDefault();
        triggerSpecialSkill();
      }

      if (e.code === 'Escape') {
        if (onPauseToggle) onPauseToggle();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysRef.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysRef.current.right = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysRef.current.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysRef.current.down = false;
      if (e.code === 'Space' || e.code === 'KeyJ') keysRef.current.shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPauseToggle, triggerCharacterSwap, triggerSpecialSkill, handleJumpPress]);

  // Virtual control triggers
  const triggerAction = useCallback(
    (action, isPressed) => {
      if (action === 'swap') {
        if (isPressed) triggerCharacterSwap();
        return;
      }
      if (action === 'skill') {
        if (isPressed) triggerSpecialSkill();
        return;
      }
      if (keysRef.current[action] !== undefined) {
        keysRef.current[action] = isPressed;
      }
      if (action === 'up' && isPressed) {
        handleJumpPress();
      }
    },
    [triggerCharacterSwap, triggerSpecialSkill, handleJumpPress]
  );

  // Main Canvas Game Loop
  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CANVAS_WIDTH = canvas.width;
    const CANVAS_HEIGHT = canvas.height;
    const GROUND_Y = CANVAS_HEIGHT - 48;
    const WORLD_WIDTH = levelConfig?.worldWidth || 3200;
    const BOSS_ARENA_X = levelConfig?.bossArenaX || 2450;

    const state = gameStateRef.current;
    const keys = keysRef.current;
    const platforms = levelConfig?.platforms || [];

    let isRunning = true;

    // Helper: spawn particles
    const createExplosion = (x, y, color = '#42f56c', count = 16) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 25 + Math.random() * 15,
          maxLife: 40,
          color,
          size: 2 + Math.random() * 3.5
        });
      }
    };

    // Helper: floating score text
    const addFloatingText = (text, x, y, color = '#42f56c') => {
      state.floatingTexts.push({
        text,
        x,
        y,
        vy: -1.2,
        alpha: 1.0,
        life: 45,
        color
      });
    };

    const updateAndRender = () => {
      if (!isRunning) return;

      // ==========================================
      // 1. UPDATE PLAYER PHYSICS & TIMERS
      // ==========================================
      const p = state.player;
      const charConf = PLAYABLE_CHARACTERS[p.character] || PLAYABLE_CHARACTERS.rick;
      const speedMultiplier = p.skillActiveTimer > 0 ? 1.55 : 1.0;
      const effectiveMoveSpeed = charConf.moveSpeed * speedMultiplier;

      // Cooldowns and timers
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.invulnerableTimer > 0) p.invulnerableTimer--;
      if (p.skillCooldown > 0) p.skillCooldown--;
      if (p.skillActiveTimer > 0) p.skillActiveTimer--;
      if (p.portalSwapTimer > 0) p.portalSwapTimer--;
      if (p.recoilTimer > 0) p.recoilTimer--;
      if (state.screenShake > 0) state.screenShake--;

      // Combo expiration
      if (state.comboTimer > 0) {
        state.comboTimer--;
        if (state.comboTimer <= 0) {
          state.comboCount = 0;
        }
      }

      // Horizontal movement
      if (keys.left) {
        p.vx = -effectiveMoveSpeed;
        p.facing = 'left';
        p.runCycle += 0.22;
      } else if (keys.right) {
        p.vx = effectiveMoveSpeed;
        p.facing = 'right';
        p.runCycle += 0.22;
      } else {
        p.vx *= PLAYER_CONFIG.friction;
        if (Math.abs(p.vx) < 0.1) p.vx = 0;
      }

      // Gravity
      p.vy += PLAYER_CONFIG.gravity;
      p.x += p.vx;
      p.y += p.vy;

      // Stage boundary check X (Contra side-scrolling style)
      if (p.x < 10) p.x = 10;
      if (p.x + p.width > WORLD_WIDTH - 20) p.x = WORLD_WIDTH - p.width - 20;

      // Ground collision
      p.onGround = false;
      if (p.y + p.height >= GROUND_Y) {
        p.y = GROUND_Y - p.height;
        p.vy = 0;
        p.onGround = true;
        p.jumpCount = 0;
      }

      // Platform collision
      platforms.forEach((plat) => {
        if (
          p.x + p.width > plat.x &&
          p.x < plat.x + plat.width &&
          p.y + p.height >= plat.y &&
          p.y + p.height <= plat.y + 16 &&
          p.vy >= 0
        ) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.onGround = true;
          p.jumpCount = 0;
        }
      });

      // ==========================================
      // CONTRA (1987) CAMERA SCROLLING
      // ==========================================
      let targetCamX = p.x - 240;
      // In boss fight arena, camera locks to the arena area
      if (state.bossSpawned) {
        targetCamX = Math.min(Math.max(BOSS_ARENA_X - 60, targetCamX), WORLD_WIDTH - CANVAS_WIDTH);
      }
      targetCamX = Math.max(0, Math.min(WORLD_WIDTH - CANVAS_WIDTH, targetCamX));
      state.cameraX += (targetCamX - state.cameraX) * 0.1;

      // Progress reporting
      if (onProgressUpdate) {
        const progressPercent = Math.min(100, Math.round((p.x / BOSS_ARENA_X) * 100));
        onProgressUpdate({
          playerX: Math.round(p.x),
          worldWidth: WORLD_WIDTH,
          bossArenaX: BOSS_ARENA_X,
          progressPercent,
          inBossArena: p.x >= BOSS_ARENA_X
        });
      }

      // Player shooting
      const isFireReady = p.skillActiveTimer > 0 ? p.shootCooldown <= 3 : p.shootCooldown === 0;

      if (keys.shoot && isFireReady) {
        p.recoilTimer = 6;
        const bulletSpeed = p.facing === 'right' ? charConf.bulletSpeed : -charConf.bulletSpeed;
        const startX = p.facing === 'right' ? p.x + p.width + 2 : p.x - 14;
        const startY = p.y + p.height / 2 - 2;

        if (p.character === 'rick') {
          // Rick: Laser with critical hit
          soundManager.playLaser();
          const isCritical = Math.random() < 0.25;
          const damage = isCritical ? Math.round(charConf.bulletDamage * 2.5) : charConf.bulletDamage;

          state.bullets.push({
            x: startX,
            y: startY,
            vx: bulletSpeed,
            vy: (Math.random() - 0.5) * 0.3,
            width: isCritical ? 20 : 15,
            height: isCritical ? 8 : 6,
            color: isCritical ? '#fde047' : '#42f56c',
            damage,
            isCritical
          });

          createExplosion(startX, startY, isCritical ? '#fde047' : '#39ff14', 4);
          p.shootCooldown = charConf.fireCooldown;
        } else {
          // Morty: Twin scatter blaster
          soundManager.playMortyBlaster();
          const pelletsCount = p.skillActiveTimer > 0 ? 4 : 2;

          for (let k = 0; k < pelletsCount; k++) {
            const spreadY = (k - (pelletsCount - 1) / 2) * 1.5;
            state.bullets.push({
              x: startX,
              y: startY + spreadY * 4,
              vx: bulletSpeed,
              vy: spreadY * 0.8,
              width: 12,
              height: 7,
              color: p.skillActiveTimer > 0 ? '#c084fc' : '#facc15',
              damage: charConf.bulletDamage,
              isMorty: true
            });
          }

          createExplosion(startX, startY, p.skillActiveTimer > 0 ? '#c084fc' : '#facc15', 5);
          p.shootCooldown = p.skillActiveTimer > 0 ? 5 : charConf.fireCooldown;
        }
      }

      // ==========================================
      // 2. UPDATE BULLETS & POWERUPS
      // ==========================================
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (Math.random() < 0.4) {
          state.particles.push({
            x: b.x,
            y: b.y + 2,
            vx: -b.vx * 0.08,
            vy: (Math.random() - 0.5) * 0.8,
            life: 10,
            maxLife: 10,
            color: b.color || '#22d3ee',
            size: 2
          });
        }

        if (b.x < state.cameraX - 100 || b.x > state.cameraX + CANVAS_WIDTH + 100) {
          state.bullets.splice(i, 1);
        }
      }

      // Enemy bullets
      for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const eb = state.enemyBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;

        if (
          p.invulnerableTimer === 0 &&
          eb.x < p.x + p.width &&
          eb.x + eb.width > p.x &&
          eb.y < p.y + p.height &&
          eb.y + eb.height > p.y
        ) {
          state.enemyBullets.splice(i, 1);
          soundManager.playPlayerHurt();
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 12);
          p.invulnerableTimer = 45;
          state.screenShake = 6;
          onPlayerDamage(20);
          continue;
        }

        if (eb.x < state.cameraX - 100 || eb.x > state.cameraX + CANVAS_WIDTH + 100 || eb.y > CANVAS_HEIGHT) {
          state.enemyBullets.splice(i, 1);
        }
      }

      // Update Powerups
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const pw = state.powerups[i];
        pw.vy += 0.25;
        pw.y += pw.vy;
        pw.x += pw.vx;
        pw.life--;
        pw.hoverOffset += 0.08;

        if (pw.y >= GROUND_Y - 24) {
          pw.y = GROUND_Y - 24;
          pw.vy = -pw.vy * 0.4;
          pw.vx *= 0.85;
        }

        if (
          p.x < pw.x + 28 &&
          p.x + p.width > pw.x &&
          p.y < pw.y + 28 &&
          p.y + p.height > pw.y
        ) {
          soundManager.playPowerup();
          createExplosion(pw.x + 14, pw.y + 14, pw.color, 16);

          if (pw.id === 'flask') {
            if (onHealPlayer) onHealPlayer(30);
            addFloatingText('+30 HP (FLASK)', p.x, p.y - 12, '#38bdf8');
          } else if (pw.id === 'mega_seed') {
            p.skillCooldown = 0;
            if (onScoreBonus) onScoreBonus(300);
            addFloatingText('SKILL READY! +300 PTS', p.x, p.y - 12, '#a855f7');
          } else if (pw.id === 'portal_fluid') {
            p.invulnerableTimer = 360;
            if (onScoreBonus) onScoreBonus(200);
            addFloatingText('HYPER SHIELD! (6s)', p.x, p.y - 12, '#42f56c');
          }

          state.powerups.splice(i, 1);
          continue;
        }

        if (pw.life <= 0) {
          state.powerups.splice(i, 1);
        }
      }

      // ==========================================
      // 3. SPAWN ENEMIES ALONG SCROLLING WORLD
      // ==========================================
      state.spawnTimer++;
      const spawnInterval = levelConfig?.enemySpawnRate || 120;
      const targetEnemies = levelConfig?.targetEnemies || 12;

      // Spawn regular enemies ahead of camera while traveling
      if (
        state.spawnTimer >= spawnInterval &&
        state.enemiesSpawnedCount < targetEnemies &&
        p.x < BOSS_ARENA_X - 100
      ) {
        state.spawnTimer = 0;
        state.enemiesSpawnedCount++;

        const isFlying = Math.random() < 0.35;
        const enemyType = isFlying ? 'flying' : 'walker';
        const startX = Math.min(WORLD_WIDTH - 60, state.cameraX + CANVAS_WIDTH + 40 + Math.random() * 80);
        const startY = isFlying ? 120 + Math.random() * 140 : GROUND_Y - 48;
        const speedMultiplier = levelConfig?.enemySpeedMultiplier || 1.0;

        state.enemies.push({
          id: `enemy-${Date.now()}-${Math.random()}`,
          type: enemyType,
          name: isFlying ? 'Corrupted Birdperson' : 'Rogue Mr. Meeseeks',
          imageKey: isFlying ? 'birdperson' : 'meeseeks',
          x: startX,
          y: startY,
          vx: -(1.4 + Math.random() * 1.2) * speedMultiplier,
          vy: 0,
          width: 44,
          height: 48,
          health: isFlying ? 60 : 45,
          maxHealth: isFlying ? 60 : 45,
          points: isFlying ? SCORE_SYSTEM.FLYING_ENEMY : SCORE_SYSTEM.REGULAR_ENEMY,
          shootTimer: Math.floor(Math.random() * 90) + 60,
          hoverAngle: Math.random() * Math.PI * 2,
          runCycle: 0,
          hitFlash: 0
        });
      }

      // Boss Spawn Trigger: Player reached the Boss Arena or defeated enough enemies
      if (
        !state.bossSpawned &&
        (p.x >= BOSS_ARENA_X || state.levelKillsCount >= targetEnemies - 1)
      ) {
        state.bossSpawned = true;
        const bossName = levelConfig?.bossName || 'Dimension Master Entity';
        const bossHealth = levelConfig?.bossHealth || 450;

        state.enemies.push({
          id: `boss-${levelConfig?.id || 1}`,
          isBoss: true,
          type: 'boss',
          name: bossName,
          imageKey: levelConfig?.id === 2 ? 'birdperson' : 'meeseeks',
          x: Math.max(BOSS_ARENA_X + 280, p.x + 300),
          y: GROUND_Y - 96,
          vx: -0.8,
          vy: 0,
          width: 86,
          height: 96,
          health: bossHealth,
          maxHealth: bossHealth,
          points: SCORE_SYSTEM.BOSS_ENEMY,
          shootTimer: 60,
          hoverAngle: 0,
          runCycle: 0,
          hitFlash: 0
        });

        soundManager.playExplosion(true);
        state.screenShake = 14;
        addFloatingText('⚠️ ALERTA: JEFE DIMENSIONAL DETECTADO! ⚠️', p.x - 60, 80, '#ef4444');
      }

      // Update enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        en.runCycle += 0.15;
        if (en.hitFlash > 0) en.hitFlash--;

        if (en.type === 'flying') {
          en.hoverAngle += 0.05;
          en.y += Math.sin(en.hoverAngle) * 1.5;
          en.x += en.vx;
        } else if (en.isBoss) {
          en.x += en.vx;
          // Constrain boss within the arena
          if (en.x < BOSS_ARENA_X + 40 || en.x > WORLD_WIDTH - en.width - 20) {
            en.vx *= -1;
          }
        } else {
          en.x += en.vx;
        }

        // Enemy shooting
        en.shootTimer--;
        if (en.shootTimer <= 0) {
          en.shootTimer = en.isBoss ? 65 : 140 + Math.random() * 80;
          state.enemyBullets.push({
            x: en.x,
            y: en.y + en.height / 2,
            vx: -5.5,
            vy: (Math.random() - 0.5) * 1.5,
            width: 10,
            height: 10,
            color: '#ef4444'
          });
        }

        // Bullet collisions
        for (let bIndex = state.bullets.length - 1; bIndex >= 0; bIndex--) {
          const bul = state.bullets[bIndex];
          if (
            bul.x < en.x + en.width &&
            bul.x + bul.width > en.x &&
            bul.y < en.y + en.height &&
            bul.y + bul.height > en.y
          ) {
            const damageDealt = bul.damage || PLAYER_CONFIG.bulletDamage;
            en.health -= damageDealt;
            en.hitFlash = 4;
            soundManager.playEnemyHit();

            if (bul.isCritical) {
              addFloatingText(`CRIT! -${damageDealt}`, en.x, en.y - 14, '#fde047');
              addFloatingText('WUBBA LUBBA DUB DUB!', p.x, p.y - 20, '#42f56c');
            }

            state.bullets.splice(bIndex, 1);
            createExplosion(bul.x, bul.y, bul.color || '#97ce4c', 6);

            // Defeated enemy
            if (en.health <= 0) {
              soundManager.playExplosion(en.isBoss);
              createExplosion(
                en.x + en.width / 2,
                en.y + en.height / 2,
                en.isBoss ? '#a855f7' : '#42f56c',
                en.isBoss ? 45 : 22
              );

              state.comboCount++;
              state.comboTimer = 150;
              const comboBonus = state.comboCount > 1 ? state.comboCount * 50 : 0;
              const totalPoints = en.points + comboBonus;

              addFloatingText(
                state.comboCount > 1 ? `+${totalPoints} (x${state.comboCount})` : `+${totalPoints}`,
                en.x + en.width / 2,
                en.y - 10,
                state.comboCount >= 3 ? '#fde047' : '#39ff14'
              );

              // 35% chance to drop powerup
              if (Math.random() < 0.35) {
                const powerupKeys = ['FLASK', 'MEGA_SEED', 'PORTAL_FLUID'];
                const selectedKey = powerupKeys[Math.floor(Math.random() * powerupKeys.length)];
                const pwData = POWERUP_CONFIG[selectedKey];

                state.powerups.push({
                  id: pwData.id,
                  name: pwData.name,
                  color: pwData.color,
                  icon: pwData.icon,
                  x: en.x + en.width / 2 - 12,
                  y: en.y + en.height / 2 - 12,
                  vx: (Math.random() - 0.5) * 2,
                  vy: -3.5,
                  life: 480,
                  hoverOffset: 0
                });
              }

              state.levelKillsCount++;
              onEnemyDefeat(totalPoints);

              if (en.isBoss) {
                state.bossDefeated = true;
                state.screenShake = 22;
                onVictory();
              }

              state.enemies.splice(i, 1);
              break;
            }
          }
        }

        // Enemy vs Player collision
        if (
          state.enemies[i] &&
          p.invulnerableTimer === 0 &&
          p.x < en.x + en.width &&
          p.x + p.width > en.x &&
          p.y < en.y + en.height &&
          p.y + p.height > en.y
        ) {
          p.invulnerableTimer = 50;
          state.screenShake = 8;
          soundManager.playPlayerHurt();
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 12);
          onPlayerDamage(en.isBoss ? 35 : 20);
        }

        // Out of bounds cleanup behind camera
        if (state.enemies[i] && en.x < state.cameraX - 160) {
          state.enemies.splice(i, 1);
        }
      }

      // Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) state.particles.splice(i, 1);
      }

      // Floating texts
      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        ft.alpha = ft.life / 45;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
      }

      // ==========================================
      // 4. CANVAS RENDERING WITH PARALLAX SCROLLING
      // ==========================================
      ctx.save();

      // Screen Shake
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake * 1.5;
        const shakeY = (Math.random() - 0.5) * state.screenShake * 1.5;
        ctx.translate(shakeX, shakeY);
      }

      // Sky Background (Fixed)
      ctx.fillStyle = levelConfig?.bgColor || '#050816';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Parallax Layer 1: Distant Stars & Deep Cosmos (0.12x speed)
      drawFarParallax(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, state.cameraX * 0.12, levelConfig?.id || 1);

      // Parallax Layer 2: Mid-distance Iconic Lore (0.42x speed)
      // (Rick's Garage, Space Cruiser, Cromulon Head, Citadel Megastructures)
      drawMidParallax(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, state.cameraX * 0.42, levelConfig?.id || 1, GROUND_Y);

      // ==========================================
      // WORLD SPACE RENDERING (1.0x Camera Translation)
      // ==========================================
      ctx.save();
      ctx.translate(-state.cameraX, 0);

      const portalColor = levelConfig?.portalColor || '#42f56c';

      // Ground Terrain (Full 3200px length)
      ctx.save();
      ctx.fillStyle = levelConfig?.groundColor || '#111827';
      ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.fillStyle = portalColor;
      ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, 4);
      // Terrain grid lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let gx = 0; gx < WORLD_WIDTH; gx += 60) {
        ctx.fillRect(gx, GROUND_Y, 2, CANVAS_HEIGHT - GROUND_Y);
      }
      ctx.restore();

      // Boss Arena Entrance Archway
      drawArenaPortalArch(ctx, BOSS_ARENA_X, GROUND_Y, portalColor);

      // Platforms along the world
      platforms.forEach((plat) => {
        ctx.save();
        ctx.fillStyle = 'rgba(17, 24, 39, 0.94)';
        ctx.strokeStyle = portalColor;
        ctx.lineWidth = 2;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Platform top glow line
        ctx.fillStyle = portalColor;
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
        ctx.restore();
      });

      // Bullets
      state.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color || '#42f56c';
        ctx.shadowColor = b.color || '#42f56c';
        ctx.shadowBlur = b.isCritical ? 14 : 9;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.restore();
      });

      // Enemy Bullets
      state.enemyBullets.forEach((eb) => {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(eb.x + eb.width / 2, eb.y + eb.height / 2, eb.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Powerups
      state.powerups.forEach((pw) => {
        ctx.save();
        const hoverY = pw.y + Math.sin(pw.hoverOffset) * 5;
        ctx.shadowColor = pw.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.strokeStyle = pw.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pw.x + 14, hoverY + 14, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pw.icon, pw.x + 14, hoverY + 15);
        ctx.restore();
      });

      // Enemies
      state.enemies.forEach((en) => {
        ctx.save();
        if (en.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(en.x, en.y, en.width, en.height);
        } else {
          drawAnimatedEnemy(ctx, en, imageCacheRef.current[en.imageKey]);
        }

        // Enemy Health Bar
        const barWidth = en.width;
        const healthPercent = Math.max(0, en.health / en.maxHealth);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(en.x, en.y - 10, barWidth, 6);
        ctx.fillStyle = en.isBoss ? '#a855f7' : '#ef4444';
        ctx.fillRect(en.x, en.y - 10, barWidth * healthPercent, 6);

        // Enemy Name
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px Outfit, sans-serif';
        ctx.fillText(en.name, en.x, en.y - 14);
        ctx.restore();
      });

      // Player Body Rigged from Starburns Model Sheets
      if (p.invulnerableTimer % 6 < 3) {
        ctx.save();
        const avatarImg =
          p.character === 'rick' ? imageCacheRef.current.player : imageCacheRef.current.support;

        if (p.character === 'rick') {
          drawStarburnsRick(ctx, p, avatarImg);
        } else {
          drawStarburnsMorty(ctx, p, avatarImg);
        }

        // Portal Swap vortex
        if (p.portalSwapTimer > 0) {
          ctx.save();
          ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
          ctx.rotate((p.portalSwapTimer * Math.PI) / 3);
          ctx.strokeStyle = p.character === 'rick' ? '#42f56c' : '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, p.width * 0.9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

      // Companion Floating
      const compKey = p.character === 'rick' ? 'support' : 'player';
      const compImg = imageCacheRef.current[compKey];
      const compX = p.facing === 'right' ? p.x - 30 : p.x + p.width + 6;
      const compY = p.y - 14 + Math.sin(Date.now() / 250) * 5;

      ctx.save();
      if (compImg && compImg.complete) {
        ctx.drawImage(compImg, compX, compY, 26, 28);
      } else {
        ctx.fillStyle = p.character === 'rick' ? '#facc15' : '#42f56c';
        ctx.beginPath();
        ctx.arc(compX + 13, compY + 14, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '9px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(p.character === 'rick' ? 'Morty' : 'Rick', compX, compY - 4);
      ctx.restore();

      // Particles
      state.particles.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life / pt.maxLife;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Floating Texts
      state.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 13px Orbitron, monospace';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // End World Space

      // ==========================================
      // SCREEN-SPACE OVERLAY (HUD & COMBO)
      // ==========================================
      if (state.comboCount > 1) {
        ctx.save();
        ctx.font = 'bold 16px Orbitron, monospace';
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.fillText(`COMBO x${state.comboCount}!`, 20, 36);
        ctx.restore();
      }

      ctx.restore(); // Restore Screen Shake

      animationFrameIdRef.current = requestAnimationFrame(updateAndRender);
    };

    animationFrameIdRef.current = requestAnimationFrame(updateAndRender);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [
    canvasRef,
    levelConfig,
    gameStatus,
    onEnemyDefeat,
    onPlayerDamage,
    onPlayerDeath,
    onVictory,
    onHealPlayer,
    onScoreBonus,
    onProgressUpdate
  ]);

  const resetEngine = useCallback((_level = 1) => {
    gameStateRef.current = {
      player: {
        x: 100,
        y: 350,
        vx: 0,
        vy: 0,
        width: PLAYABLE_CHARACTERS.rick.width,
        height: PLAYABLE_CHARACTERS.rick.height,
        facing: 'right',
        onGround: false,
        shootCooldown: 0,
        invulnerableTimer: 0,
        runCycle: 0,
        jumpCount: 0,
        recoilTimer: 0,
        character: activeCharacter || 'rick',
        skillCooldown: 0,
        skillActiveTimer: 0,
        portalSwapTimer: 0
      },
      cameraX: 0,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      particles: [],
      floatingTexts: [],
      powerups: [],
      spawnTimer: 0,
      bossSpawned: false,
      bossDefeated: false,
      enemiesSpawnedCount: 0,
      levelKillsCount: 0,
      screenShake: 0,
      comboCount: 0,
      comboTimer: 0
    };
  }, [activeCharacter]);

  return {
    triggerAction,
    resetEngine
  };
}

/**
 * =========================================================================
 * PARALLAX BACKGROUND LAYERS WITH RICK AND MORTY LORE ARTWORK
 * =========================================================================
 */

function drawFarParallax(ctx, width, height, offsetX, levelId) {
  ctx.save();
  // Twinkling stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 45; i++) {
    const sx = (i * 73 - (offsetX % width) + width) % width;
    const sy = (i * 37) % (height - 120);
    const size = (i % 3) + 1;
    ctx.globalAlpha = 0.3 + (Math.sin(Date.now() / 600 + i) + 1) * 0.35;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1.0;

  if (levelId === 3) {
    // LEVEL 3: GIANT CROMULON HEAD ("SHOW ME WHAT YOU GOT")
    const cromulonX = (width * 0.65 - (offsetX % width) + width) % width;
    const cromulonY = 90;
    drawCromulonHead(ctx, cromulonX, cromulonY);
  } else if (levelId === 2) {
    // LEVEL 2: CITADEL NEON SKYLINE
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    for (let b = 0; b < 10; b++) {
      const bx = (b * 120 - (offsetX % 1200) + 1200) % 1200;
      const bHeight = 160 + (b % 4) * 40;
      ctx.fillRect(bx, height - bHeight - 48, 80, bHeight);
    }
  }
  ctx.restore();
}

function drawMidParallax(ctx, width, height, offsetX, levelId, groundY) {
  ctx.save();

  if (levelId === 1) {
    // -------------------------------------------------------------
    // LEVEL 1 (Earth C-137): Rick's Garage, Space Cruiser & Slime
    // -------------------------------------------------------------
    // 1. Rick's Suburban Garage & Smith Residence
    const garageX = 350 - offsetX;
    if (garageX > -300 && garageX < width + 100) {
      drawSmithGarage(ctx, garageX, groundY);
    }

    // 2. The Space Cruiser (Flying Saucer parked / hovering)
    const cruiserX = 1150 - offsetX;
    if (cruiserX > -250 && cruiserX < width + 100) {
      drawSpaceCruiser(ctx, cruiserX, groundY - 60);
    }

    // 3. Radioactive Slime Barrels & Transmission Tower
    const barrelX = 1850 - offsetX;
    if (barrelX > -150 && barrelX < width + 100) {
      drawRadioactiveBarrels(ctx, barrelX, groundY);
    }
  } else if (levelId === 2) {
    // -------------------------------------------------------------
    // LEVEL 2 (Citadel of Ricks): Cybernetic City & Holographic Ads
    // -------------------------------------------------------------
    // 1. Simple Rick's Wafers Billboard
    const ad1X = 550 - offsetX;
    if (ad1X > -250 && ad1X < width + 100) {
      drawHoloBillboard(ctx, ad1X, groundY - 180, "SIMPLE RICK'S", 'WAFERS', '#22d3ee');
    }

    // 2. Vote For Morty Campaign Billboard
    const ad2X = 1350 - offsetX;
    if (ad2X > -250 && ad2X < width + 100) {
      drawHoloBillboard(ctx, ad2X, groundY - 180, 'VOTE FOR MORTY', 'CITADEL 2026', '#facc15');
    }

    // 3. Council of Ricks Crest
    const crestX = 2050 - offsetX;
    if (crestX > -200 && crestX < width + 100) {
      drawCouncilCrest(ctx, crestX, groundY - 190);
    }
  } else {
    // -------------------------------------------------------------
    // LEVEL 3 (Final Dimension): Cosmic Singularity & Reality Rifts
    // -------------------------------------------------------------
    const riftX = 900 - offsetX;
    if (riftX > -300 && riftX < width + 100) {
      drawRealityRiftShard(ctx, riftX, groundY - 160);
    }
    const ruinsX = 1750 - offsetX;
    if (ruinsX > -300 && ruinsX < width + 100) {
      drawCosmicRuins(ctx, ruinsX, groundY);
    }
  }

  ctx.restore();
}

/**
 * Procedural Vector Art for Rick's House / Garage
 */
function drawSmithGarage(ctx, x, groundY) {
  ctx.save();
  ctx.fillStyle = '#1e293b';
  // House Body
  ctx.fillRect(x, groundY - 130, 200, 130);
  // Roof triangle
  ctx.beginPath();
  ctx.moveTo(x - 15, groundY - 130);
  ctx.lineTo(x + 100, groundY - 190);
  ctx.lineTo(x + 215, groundY - 130);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Garage Door
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 20, groundY - 95, 85, 95);
  // Garage Lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  for (let l = 1; l <= 4; l++) {
    ctx.beginPath();
    ctx.moveTo(x + 20, groundY - l * 20);
    ctx.lineTo(x + 105, groundY - l * 20);
    ctx.stroke();
  }

  // Window with Rick's workbench green glow
  ctx.fillStyle = '#42f56c';
  ctx.shadowColor = '#42f56c';
  ctx.shadowBlur = 10;
  ctx.fillRect(x + 130, groundY - 80, 45, 40);
  ctx.shadowBlur = 0;

  // Label
  ctx.font = '10px Outfit, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText("RICK'S GARAGE", x + 20, groundY - 102);
  ctx.restore();
}

/**
 * Procedural Space Cruiser (Flying Saucer)
 */
function drawSpaceCruiser(ctx, x, y) {
  ctx.save();
  const hover = Math.sin(Date.now() / 300) * 4;
  ctx.translate(x, y + hover);

  // Thruster Green Glow
  ctx.fillStyle = 'rgba(66, 245, 108, 0.4)';
  ctx.beginPath();
  ctx.ellipse(50, 40, 40, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glass Dome
  ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(50, 12, 22, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Saucer Body (Garbage Can Thruster aesthetic)
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.ellipse(50, 20, 55, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#fde047';
  ctx.fillRect(15, 18, 10, 6);
  ctx.fillRect(75, 18, 10, 6);

  ctx.font = '9px Outfit, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('SPACE CRUISER C-137', 5, -8);
  ctx.restore();
}

/**
 * Giant CROMULON Head ("SHOW ME WHAT YOU GOT")
 */
function drawCromulonHead(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Golden Cosmic Aura
  ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, 85, 0, Math.PI * 2);
  ctx.fill();

  // Head Shape
  ctx.fillStyle = '#ca8a04';
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 65, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyes (Glowing Yellow)
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#eab308';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(-22, -15, 12, 0, Math.PI * 2);
  ctx.arc(22, -15, 12, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#713f12';
  ctx.beginPath();
  ctx.arc(-22, -15, 4, 0, Math.PI * 2);
  ctx.arc(22, -15, 4, 0, Math.PI * 2);
  ctx.fill();

  // Big Flat Nose
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, 5);
  ctx.lineTo(0, 18);
  ctx.lineTo(10, 5);
  ctx.stroke();

  // Wide Open Mouth (Singing / Demanding)
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(0, 42, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Text Banner
  ctx.font = 'bold 12px Orbitron, sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.fillText('SHOW ME WHAT YOU GOT!', 0, 95);
  ctx.restore();
}

/**
 * Holographic Billboard for Citadel
 */
function drawHoloBillboard(ctx, x, y, title, subtitle, color) {
  ctx.save();
  ctx.translate(x, y);

  // Pole
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80, 70);
  ctx.lineTo(80, 180);
  ctx.stroke();

  // Hologram Screen
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillRect(0, 0, 160, 70);
  ctx.strokeRect(0, 0, 160, 70);

  ctx.font = 'bold 11px Orbitron, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(title, 80, 30);

  ctx.font = '9px Outfit, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(subtitle, 80, 50);
  ctx.restore();
}

function drawCouncilCrest(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(40, 70);
  ctx.lineTo(-40, 70);
  ctx.closePath();
  ctx.stroke();

  ctx.font = 'bold 10px Orbitron, sans-serif';
  ctx.fillStyle = '#22d3ee';
  ctx.textAlign = 'center';
  ctx.fillText('COUNCIL OF RICKS', 0, 88);
  ctx.restore();
}

function drawRadioactiveBarrels(ctx, x, groundY) {
  ctx.save();
  ctx.fillStyle = '#3f6212';
  ctx.fillRect(x, groundY - 40, 30, 40);
  ctx.fillRect(x + 35, groundY - 35, 28, 35);
  // Slime pool
  ctx.fillStyle = '#42f56c';
  ctx.shadowColor = '#42f56c';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(x + 30, groundY - 2, 45, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRealityRiftShard(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(35, -45);
  ctx.lineTo(70, 15);
  ctx.lineTo(30, 60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCosmicRuins(ctx, x, groundY) {
  ctx.save();
  ctx.fillStyle = '#3b0764';
  ctx.fillRect(x, groundY - 90, 45, 90);
  ctx.fillRect(x + 55, groundY - 140, 40, 140);
  ctx.restore();
}

function drawArenaPortalArch(ctx, x, groundY, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(x, groundY - 80, 80, Math.PI, 0);
  ctx.stroke();

  ctx.font = 'bold 12px Orbitron, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText('⚡ BOSS SECTOR ⚡', x, groundY - 175);
  ctx.restore();
}

/**
 * =========================================================================
 * 2D RIGGED CHARACTER MODELS (EXACT STARBURNS INDUSTRIES MODEL SHEETS)
 * =========================================================================
 */

function drawStarburnsRick(ctx, p, avatarImg) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer } = p;
  const isMoving = Math.abs(p.vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;
  // Athletic runner stride from Rick Body Expressions sheet
  const bobbing = onGround && isMoving ? Math.sin(legCycle * 2) * 2.5 : Math.sin(Date.now() / 350) * 1.2;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + bobbing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // 1. BILLOWING LAB COAT (Flapping back dynamically like Starburns reference)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  const coatSweep = isMoving ? Math.sin(legCycle) * 14 + Math.abs(p.vx) * 3 : 0;
  const jumpBillow = !onGround ? 8 : 0;
  ctx.moveTo(-10, 8);
  ctx.lineTo(-18 - coatSweep, 28 - jumpBillow);
  ctx.lineTo(-6, 28);
  ctx.lineTo(-4, 8);
  ctx.fill();

  // 2. LONG LANKY LEGS (Brown Pants + Black Shoes as in turnaround sheet)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.55 : -0.3;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.55 : 0.4;

  // Left Leg
  ctx.save();
  ctx.translate(-5, 14);
  ctx.rotate(leftLegAngle);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2.5, 0, 5, 14);
  // Black shoe
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-3, 13, 8, 4);
  ctx.restore();

  // Right Leg
  ctx.save();
  ctx.translate(5, 14);
  ctx.rotate(rightLegAngle);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2.5, 0, 5, 14);
  // Black shoe
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-3, 13, 8, 4);
  ctx.restore();

  // 3. TORSO (Lab Coat + Turquoise Undershirt + Belt with Brass Buckle)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-10, -10, 20, 24);

  // Turquoise shirt (#00b5cc / #06b6d4)
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.moveTo(-4, -10);
  ctx.lineTo(4, -10);
  ctx.lineTo(3, 10);
  ctx.lineTo(-3, 10);
  ctx.fill();

  // Black belt with brass buckle
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-9, 10, 18, 3.5);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-2, 10, 4, 3.5);

  // 4. ARMS & PORTAL GUN (Starburns aiming posture with recoil)
  const recoilOffset = recoilTimer > 0 ? -recoilTimer : 0;
  ctx.save();
  ctx.translate(9 + recoilOffset, -2);

  // Arm in lab coat
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-6, -4, 11, 5);

  // Portal Gun Chasis
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(1, -4, 14, 6);
  ctx.fillStyle = '#475569';
  ctx.fillRect(13, -3, 4, 4);

  // Green Fluid Reservoir
  ctx.fillStyle = '#39ff14';
  ctx.shadowColor = '#39ff14';
  ctx.shadowBlur = 8;
  ctx.fillRect(4, -8, 7, 4);
  ctx.shadowBlur = 0;

  // Red Antenna
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(2, -9, 2, 5);
  ctx.restore();

  // 5. RICK HEAD & 12 SPIKY HAIR POINTS (From Starburns Model Sheet)
  if (avatarImg && avatarImg.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -22, 15, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, -15, -37, 30, 30);
    ctx.restore();
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.arc(0, -26, 15, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Exact Spiky hair silhouette from reference sheet
    ctx.fillStyle = '#a5f3fc';
    const spikeCoords = [-16, -12, -8, -4, 0, 4, 8, 12, 16];
    spikeCoords.forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx - 3, -26);
      ctx.lineTo(sx, -39);
      ctx.lineTo(sx + 3, -26);
      ctx.fill();
    });

    // Head oval
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.ellipse(0, -20, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Unibrow
    ctx.strokeStyle = '#0891b2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -24);
    ctx.lineTo(8, -24);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.5, -19, 3.5, 0, Math.PI * 2);
    ctx.arc(4.5, -19, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3.5, -19, 1.2, 0, Math.PI * 2);
    ctx.arc(5.5, -19, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Drool on chin
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(1, -12, 2.5, 3.5);
  }

  ctx.restore();
}

function drawStarburnsMorty(ctx, p, avatarImg) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer, skillActiveTimer } = p;
  const isMoving = Math.abs(p.vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;
  // Hysterical sprint from Morty Body Expressions sheet
  const bobbing = onGround && isMoving ? Math.sin(legCycle * 2) * 2.8 : Math.sin(Date.now() / 300) * 1.2;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + bobbing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // Death Crystal Aura
  if (skillActiveTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, -4, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1. LEGS (Dark Blue Jeans + Gravity Boots from reference sheet)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.6 : -0.25;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.6 : 0.35;

  // Left Leg
  ctx.save();
  ctx.translate(-4, 11);
  ctx.rotate(leftLegAngle);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(-2.5, 0, 5, 11);
  // Gravity Boots (Cyan base + Orange strap as in reference sheet)
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(-3, 10, 7, 4);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-3, 9, 7, 2);
  ctx.restore();

  // Right Leg
  ctx.save();
  ctx.translate(4, 11);
  ctx.rotate(rightLegAngle);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(-2.5, 0, 5, 11);
  // Gravity Boots
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(-3, 10, 7, 4);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-3, 9, 7, 2);
  ctx.restore();

  // 2. ICONIC YELLOW SHIRT (Compact round body)
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(-9, -9, 18, 20, 4);
  ctx.fill();

  // 3. ARMS & BLASTER / CRYSTAL (Panicked motion)
  const recoilOffset = recoilTimer > 0 ? -recoilTimer : 0;
  ctx.save();
  ctx.translate(7 + recoilOffset, -1);

  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(-3, -3, 8, 4);

  // Weapon
  ctx.fillStyle = skillActiveTimer > 0 ? '#c084fc' : '#475569';
  ctx.fillRect(3, -4, 10, 5);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(11, -3, 3, 3);
  ctx.restore();

  // 4. ROUND HEAD & CURLY HAIR (Starburns Model Sheet Turnaround)
  if (avatarImg && avatarImg.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -18, 14, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, -14, -32, 28, 28);
    ctx.restore();
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(0, -22, 14, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Curly brown cap of hair
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(0, -18, 13, 0, Math.PI * 2);
    ctx.fill();

    // Round face
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(0, -15, 11.5, 0, Math.PI * 2);
    ctx.fill();

    // Big round anxious eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -15, 4, 0, Math.PI * 2);
    ctx.arc(4, -15, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3, -15, 1.4, 0, Math.PI * 2);
    ctx.arc(5, -15, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Panicked open mouth
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(0, -8, 3, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

function drawAnimatedEnemy(ctx, en, img) {
  const { x, y, width, height, isBoss, type, runCycle } = en;

  if (img && img.complete) {
    ctx.drawImage(img, x, y, width, height);
    return;
  }

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);

  if (isBoss) {
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 10);
    ctx.fill();

    // Core
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'flying') {
    const wingFlap = Math.sin(runCycle * 1.6) * 9;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-18, -10 + wingFlap);
    ctx.lineTo(0, 0);
    ctx.lineTo(18, -10 + wingFlap);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Meeseeks Walker with noodle limbs
    const legAngle = Math.sin(runCycle) * 0.45;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-6 - legAngle * 12, 22);
    ctx.moveTo(6, 8);
    ctx.lineTo(6 + legAngle * 12, 22);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-8, -6, 16, 18);

    ctx.beginPath();
    ctx.arc(0, -14, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -12, 5, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}
