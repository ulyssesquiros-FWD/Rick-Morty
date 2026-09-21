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
 * Complete 2D Arcade Engine with Rick & Morty Character Swapping,
 * Full animated character bodies & limbs, unique canonical abilities,
 * Double Jump, Power-Up drops, Screen Shake, and Web Audio retro sounds.
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
  onScoreBonus
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
      x: 80,
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

  // Sync external activeCharacter change
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

  // Preload images into cache
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
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 3;
      gameStateRef.current.particles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25,
        maxLife: 25,
        color: nextChar === 'rick' ? '#42f56c' : '#facc15',
        size: 3 + Math.random() * 2
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
      state.screenShake = 9;

      const originX = p.x;
      const warpDist = p.facing === 'right' ? 200 : -200;
      const targetX = Math.max(10, Math.min(850 - p.width, p.x + warpDist));

      // Particles at origin
      for (let i = 0; i < 16; i++) {
        state.particles.push({
          x: originX + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 24,
          maxLife: 24,
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
          en.health -= 70;
          soundManager.playEnemyHit();
          state.floatingTexts.push({
            text: 'WARP HIT! -70',
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
      for (let i = 0; i < 20; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.5) * 7,
          life: 28,
          maxLife: 28,
          color: '#22d3ee',
          size: 4
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
      p.skillActiveTimer = charConf.skillDuration; // 210 frames = 3.5s
      p.invulnerableTimer = charConf.skillDuration;
      state.screenShake = 6;

      for (let i = 0; i < 24; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 30,
          maxLife: 30,
          color: '#c084fc',
          size: 4
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
          // Jump event trigger
          const p = gameStateRef.current.player;
          if (p.onGround) {
            const charConf = PLAYABLE_CHARACTERS[p.character] || PLAYABLE_CHARACTERS.rick;
            p.vy = charConf.jumpForce;
            p.onGround = false;
            p.jumpCount = 1;
            soundManager.playJump(false);
          } else if (p.character === 'morty' && p.jumpCount === 1) {
            // Morty Double Jump!
            const charConf = PLAYABLE_CHARACTERS.morty;
            p.vy = charConf.jumpForce * 0.92;
            p.jumpCount = 2;
            soundManager.playJump(true);
            // Spawn propulsion particles
            for (let i = 0; i < 8; i++) {
              gameStateRef.current.particles.push({
                x: p.x + p.width / 2 + (Math.random() - 0.5) * 16,
                y: p.y + p.height,
                vx: (Math.random() - 0.5) * 3,
                vy: 2 + Math.random() * 3,
                life: 18,
                maxLife: 18,
                color: '#facc15',
                size: 3
              });
            }
          }
        }
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysRef.current.down = true;
      if (e.code === 'Space' || e.code === 'KeyJ') keysRef.current.shoot = true;

      // Character Swap: Q key
      if (e.code === 'KeyQ') {
        e.preventDefault();
        triggerCharacterSwap();
      }

      // Special Ability: E key
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
  }, [onPauseToggle, triggerCharacterSwap, triggerSpecialSkill]);

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
        const p = gameStateRef.current.player;
        if (p.onGround) {
          const charConf = PLAYABLE_CHARACTERS[p.character] || PLAYABLE_CHARACTERS.rick;
          p.vy = charConf.jumpForce;
          p.onGround = false;
          p.jumpCount = 1;
          soundManager.playJump(false);
        } else if (p.character === 'morty' && p.jumpCount === 1) {
          const charConf = PLAYABLE_CHARACTERS.morty;
          p.vy = charConf.jumpForce * 0.92;
          p.jumpCount = 2;
          soundManager.playJump(true);
        }
      }
    },
    [triggerCharacterSwap, triggerSpecialSkill]
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

      // Boundary check X
      if (p.x < 10) p.x = 10;
      if (p.x + p.width > CANVAS_WIDTH - 10) p.x = CANVAS_WIDTH - p.width - 10;

      // Platform collisions
      p.onGround = false;

      // Ground collision
      if (p.y + p.height >= GROUND_Y) {
        p.y = GROUND_Y - p.height;
        p.vy = 0;
        p.onGround = true;
        p.jumpCount = 0;
      }

      // Solid platform collision (from above)
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

      // Player shooting
      const isFireReady = p.skillActiveTimer > 0 ? p.shootCooldown <= 3 : p.shootCooldown === 0;

      if (keys.shoot && isFireReady) {
        p.recoilTimer = 6;
        const bulletSpeed = p.facing === 'right' ? charConf.bulletSpeed : -charConf.bulletSpeed;
        const startX = p.facing === 'right' ? p.x + p.width + 2 : p.x - 14;
        const startY = p.y + p.height / 2 - 2;

        if (p.character === 'rick') {
          // Rick: Concentrated Laser with Critical Hit chance
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
          // Morty: Twin Crystal Scatter Blaster
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

        // Trail particle
        if (Math.random() < 0.45) {
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

        // Out of bounds
        if (b.x < 0 || b.x > CANVAS_WIDTH) {
          state.bullets.splice(i, 1);
        }
      }

      // Enemy bullets
      for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const eb = state.enemyBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;

        // Hit player
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

        if (eb.x < 0 || eb.x > CANVAS_WIDTH || eb.y > CANVAS_HEIGHT) {
          state.enemyBullets.splice(i, 1);
        }
      }

      // Update Powerups (Physics + Collection)
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const pw = state.powerups[i];
        pw.vy += 0.25;
        pw.y += pw.vy;
        pw.x += pw.vx;
        pw.life--;
        pw.hoverOffset += 0.08;

        // Ground collision
        if (pw.y >= GROUND_Y - 24) {
          pw.y = GROUND_Y - 24;
          pw.vy = -pw.vy * 0.4;
          pw.vx *= 0.85;
        }

        // Collection by player
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
            p.invulnerableTimer = 360; // 6s invulnerability
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
      // 3. SPAWN AND UPDATE ENEMIES
      // ==========================================
      state.spawnTimer++;
      const spawnInterval = levelConfig?.enemySpawnRate || 120;
      const targetEnemies = levelConfig?.targetEnemies || 10;

      // Regular enemy spawns
      if (
        state.spawnTimer >= spawnInterval &&
        state.enemiesSpawnedCount < targetEnemies
      ) {
        state.spawnTimer = 0;
        state.enemiesSpawnedCount++;

        const isFlying = Math.random() < 0.35;
        const enemyType = isFlying ? 'flying' : 'walker';
        const startX = CANVAS_WIDTH + 20;
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

      // Boss Spawn trigger
      if (
        !state.bossSpawned &&
        state.levelKillsCount >= targetEnemies - 1
      ) {
        state.bossSpawned = true;
        const bossName = levelConfig?.bossName || 'Dimension Master Entity';
        const bossHealth = levelConfig?.bossHealth || 400;

        state.enemies.push({
          id: `boss-${levelConfig?.id || 1}`,
          isBoss: true,
          type: 'boss',
          name: bossName,
          imageKey: levelConfig?.id === 2 ? 'birdperson' : 'meeseeks',
          x: CANVAS_WIDTH - 130,
          y: GROUND_Y - 96,
          vx: -0.6,
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
        state.screenShake = 12;
        addFloatingText('⚠️ DIMENSIONAL BOSS DETECTED! ⚠️', CANVAS_WIDTH / 2 - 140, 80, '#ef4444');
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
          if (en.x < CANVAS_WIDTH - 240 || en.x > CANVAS_WIDTH - 90) {
            en.vx *= -1;
          }
        } else {
          en.x += en.vx;
        }

        // Enemy shooting
        en.shootTimer--;
        if (en.shootTimer <= 0) {
          en.shootTimer = en.isBoss ? 70 : 150 + Math.random() * 80;
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

        // Bullet vs Enemy Collisions
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

            // Enemy defeated
            if (en.health <= 0) {
              soundManager.playExplosion(en.isBoss);
              createExplosion(
                en.x + en.width / 2,
                en.y + en.height / 2,
                en.isBoss ? '#a855f7' : '#42f56c',
                en.isBoss ? 45 : 22
              );

              // Combo update
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

              // 30% chance to drop Powerup
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
                  life: 480, // 8s
                  hoverOffset: 0
                });
              }

              state.levelKillsCount++;
              onEnemyDefeat(totalPoints);

              if (en.isBoss) {
                state.bossDefeated = true;
                state.screenShake = 20;
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

        // Cleanup out of screen
        if (state.enemies[i] && en.x < -80) {
          state.enemies.splice(i, 1);
        }
      }

      // ==========================================
      // 4. PARTICLES & FLOATING TEXTS
      // ==========================================
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) state.particles.splice(i, 1);
      }

      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        ft.alpha = ft.life / 45;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
      }

      // ==========================================
      // 5. CANVAS RENDERING
      // ==========================================
      ctx.save();

      // Apply Screen Shake
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake * 1.5;
        const shakeY = (Math.random() - 0.5) * state.screenShake * 1.5;
        ctx.translate(shakeX, shakeY);
      }

      // Sky Background
      ctx.fillStyle = levelConfig?.bgColor || '#050816';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Star / Dimensional grid
      ctx.fillStyle = 'rgba(66, 245, 108, 0.08)';
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.fillRect(x, 0, 1, CANVAS_HEIGHT);
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.fillRect(0, y, CANVAS_WIDTH, 1);
      }

      // Swirling Background Portal
      const portalColor = levelConfig?.portalColor || '#42f56c';
      ctx.save();
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 80, 120, 55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = portalColor;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();

      // Platforms
      platforms.forEach((plat) => {
        ctx.save();
        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.strokeStyle = portalColor;
        ctx.lineWidth = 2;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Platform top glow line
        ctx.fillStyle = portalColor;
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
        ctx.restore();
      });

      // Ground Terrain
      ctx.save();
      ctx.fillStyle = levelConfig?.groundColor || '#111827';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.fillStyle = portalColor;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 3);
      ctx.restore();

      // Draw Bullets (Player)
      state.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color || '#42f56c';
        ctx.shadowColor = b.color || '#42f56c';
        ctx.shadowBlur = b.isCritical ? 14 : 9;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.restore();
      });

      // Draw Enemy Bullets
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

      // Draw Powerups
      state.powerups.forEach((pw) => {
        ctx.save();
        const hoverY = pw.y + Math.sin(pw.hoverOffset) * 5;
        ctx.shadowColor = pw.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
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

      // Draw Enemies with Animated Limbs
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

      // ==========================================
      // DRAW PLAYER (ANIMATED FULL BODY: RICK / MORTY)
      // ==========================================
      if (p.invulnerableTimer % 6 < 3) {
        ctx.save();
        const avatarImg =
          p.character === 'rick' ? imageCacheRef.current.player : imageCacheRef.current.support;

        if (p.character === 'rick') {
          drawAnimatedRickBody(ctx, p, avatarImg);
        } else {
          drawAnimatedMortyBody(ctx, p, avatarImg);
        }

        // Portal Swap vortex animation
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

      // Draw Morty / Rick Companion Hovering
      const compKey = p.character === 'rick' ? 'support' : 'player';
      const compImg = imageCacheRef.current[compKey];
      const compX = p.facing === 'right' ? p.x - 30 : p.x + p.width + 6;
      const compY = p.y - 12 + Math.sin(Date.now() / 250) * 5;

      ctx.save();
      if (compImg && compImg.complete) {
        ctx.drawImage(compImg, compX, compY, 26, 28);
      } else {
        ctx.fillStyle = p.character === 'rick' ? '#facc15' : '#42f56c';
        ctx.beginPath();
        ctx.arc(compX + 13, compY + 14, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      // Floating label
      ctx.font = '9px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(p.character === 'rick' ? 'Morty' : 'Rick', compX, compY - 4);
      ctx.restore();

      // Draw Particles
      state.particles.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life / pt.maxLife;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Floating Texts
      state.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 13px Orbitron, monospace';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Draw Active Combo Badge
      if (state.comboCount > 1) {
        ctx.save();
        ctx.font = 'bold 16px Orbitron, monospace';
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.fillText(`COMBO x${state.comboCount}!`, 20, 40);
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
    onScoreBonus
  ]);

  const resetEngine = useCallback((_level = 1) => {
    gameStateRef.current = {
      player: {
        x: 80,
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
 * ANIMATED CHARACTER & ENEMY DRAWING ROUTINES (FULL BODIES + LIMB MOTION)
 * =========================================================================
 */

function drawAnimatedRickBody(ctx, p, avatarImg) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer } = p;
  const isMoving = Math.abs(p.vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;
  const bobbing = onGround && isMoving ? Math.sin(legCycle * 2) * 2 : Math.sin(Date.now() / 350) * 1.2;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + bobbing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // 1. LAB COAT FLAP (Back)
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  const coatFlap = isMoving ? Math.sin(legCycle) * 6 : 0;
  ctx.moveTo(-10, 6);
  ctx.lineTo(-16 - coatFlap, 22);
  ctx.lineTo(-6, 22);
  ctx.lineTo(-4, 6);
  ctx.fill();

  // 2. LEGS & BLACK SHOES
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.45 : -0.25;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.45 : 0.35;

  // Left Leg (Trousers: #78350f)
  ctx.save();
  ctx.translate(-5, 12);
  ctx.rotate(leftLegAngle);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-3, 0, 6, 12);
  // Shoe
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-4, 11, 8, 4);
  ctx.restore();

  // Right Leg
  ctx.save();
  ctx.translate(5, 12);
  ctx.rotate(rightLegAngle);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-3, 0, 6, 12);
  // Shoe
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-4, 11, 8, 4);
  ctx.restore();

  // 3. TORSO (Turquoise Shirt + White Lab Coat + Belt)
  // Lab coat base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-10, -8, 20, 20);

  // Turquoise shirt in center
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(4, -8);
  ctx.lineTo(3, 8);
  ctx.lineTo(-3, 8);
  ctx.fill();

  // Belt
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-9, 8, 18, 3);
  ctx.fillStyle = '#f59e0b'; // Buckle
  ctx.fillRect(-2, 8, 4, 3);

  // 4. ARMS & PORTAL GUN
  const recoilOffset = recoilTimer > 0 ? -recoilTimer : 0;
  ctx.save();
  ctx.translate(8 + recoilOffset, -1);

  // Aiming Arm
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-6, -4, 10, 5);

  // Gun Body
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, -4, 13, 6);
  ctx.fillStyle = '#475569';
  ctx.fillRect(11, -3, 3, 4);

  // Portal fluid tube
  ctx.fillStyle = '#39ff14';
  ctx.shadowColor = '#39ff14';
  ctx.shadowBlur = 6;
  ctx.fillRect(3, -7, 6, 3);
  ctx.shadowBlur = 0;

  // Red antenna
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, -8, 2, 4);
  ctx.restore();

  // 5. HEAD (Rick Sanchez Avatar or Detailed Face)
  if (avatarImg && avatarImg.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -18, 14, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, -14, -32, 28, 28);
    ctx.restore();
    // Cyan hair spikes around head
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.arc(0, -22, 14, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Stylized procedural Rick Face
    // Head shape
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(0, -16, 12, 0, Math.PI * 2);
    ctx.fill();

    // Spiky cyan hair
    ctx.fillStyle = '#a5f3fc';
    const spikes = [-14, -10, -6, -2, 2, 6, 10, 14];
    spikes.forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx - 3, -22);
      ctx.lineTo(sx, -32);
      ctx.lineTo(sx + 3, -22);
      ctx.fill();
    });

    // Unibrow
    ctx.strokeStyle = '#0891b2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -19);
    ctx.lineTo(7, -19);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -15, 3.5, 0, Math.PI * 2);
    ctx.arc(4, -15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3, -15, 1.2, 0, Math.PI * 2);
    ctx.arc(5, -15, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Drool on chin
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(1, -9, 2, 3);
  }

  ctx.restore();
}

function drawAnimatedMortyBody(ctx, p, avatarImg) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer, skillActiveTimer } = p;
  const isMoving = Math.abs(p.vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;
  const bobbing = onGround && isMoving ? Math.sin(legCycle * 2) * 2 : Math.sin(Date.now() / 300) * 1;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + bobbing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // Aura for Death Crystal Skill
  if (skillActiveTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, -3, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1. LEGS (Blue jeans) & WHITE SNEAKERS
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.5 : -0.2;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.5 : 0.3;

  ctx.save();
  ctx.translate(-4, 10);
  ctx.rotate(leftLegAngle);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-2.5, 0, 5, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, 9, 6, 3.5);
  ctx.restore();

  ctx.save();
  ctx.translate(4, 10);
  ctx.rotate(rightLegAngle);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-2.5, 0, 5, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, 9, 6, 3.5);
  ctx.restore();

  // 2. TORSO (Iconic Yellow Shirt)
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(-8, -8, 16, 18, 3);
  ctx.fill();

  // 3. ARMS & DUAL BLASTER / DEATH CRYSTAL
  const recoilOffset = recoilTimer > 0 ? -recoilTimer : 0;
  ctx.save();
  ctx.translate(6 + recoilOffset, -1);

  // Arm
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(-3, -3, 7, 4);

  // Blaster
  ctx.fillStyle = skillActiveTimer > 0 ? '#c084fc' : '#475569';
  ctx.fillRect(2, -4, 9, 5);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(9, -3, 3, 3);
  ctx.restore();

  // 4. HEAD (Morty Avatar or Stylized Face)
  if (avatarImg && avatarImg.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -17, 13, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, -13, -30, 26, 26);
    ctx.restore();
    // Curly brown hair
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(0, -21, 13, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Round curly hair
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(0, -16, 12, 0, Math.PI * 2);
    ctx.fill();

    // Round face
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(0, -14, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Wide worried eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.5, -14, 3.5, 0, Math.PI * 2);
    ctx.arc(3.5, -14, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-2.5, -14, 1.2, 0, Math.PI * 2);
    ctx.arc(4.5, -14, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Anxious wiggly mouth
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.lineTo(0, -8);
    ctx.lineTo(3, -9);
    ctx.stroke();
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
    // Boss: Alpha Entity / Evil Morty style
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 8);
    ctx.fill();

    // Boss Core
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'flying') {
    // Birdperson / Drone: Hovering with flapping wings
    const wingFlap = Math.sin(runCycle * 1.5) * 8;
    ctx.fillStyle = '#38bdf8';
    // Wings
    ctx.beginPath();
    ctx.moveTo(-16, -10 + wingFlap);
    ctx.lineTo(0, 0);
    ctx.lineTo(16, -10 + wingFlap);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    // Body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Mr. Meeseeks: Spindly blue walker
    const legAngle = Math.sin(runCycle) * 0.4;
    // Legs
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-6 - legAngle * 10, 22);
    ctx.moveTo(6, 8);
    ctx.lineTo(6 + legAngle * 10, 22);
    ctx.stroke();

    // Slender Body
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-8, -6, 16, 18);

    // Head with orange tuft
    ctx.beginPath();
    ctx.arc(0, -14, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -25, 4, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -12, 5, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}
