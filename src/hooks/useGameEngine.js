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
 * PS2-Era Action Arcade Engine (Inspired by Contra: Shattered Soldier & Viewtiful Joe)
 * - 100% Rigged 2D Vector Cel-Shading with articulated moving limbs for ALL characters & enemies
 * - Reactive Enemy AI: Dodge leaps, tactical spacing, laser-sight telegraphed shots, dive-bombing, frenzy rage
 * - Multi-Phase Bosses: Ground shockwaves, bullet-deflecting barriers, orbital death lasers, summon rifts
 * - Active Companion Support: Covering fire, comic speech bubbles, dynamic reactions
 * - 4-Layer Parallax Backgrounds with rich Rick & Morty lore (Garage, Space Cruiser, Cromulon, Citadel)
 * - Atmospheric FX: Volumetric god-rays, ground depth fog, steam vents, dimensional floating spores & motes
 * - Double jump for BOTH Rick and Morty with distinct thruster particles
 * - 3200px stage traversal with locked Boss Arena
 */
export function useGameEngine({
  canvasRef,
  levelConfig,
  _characterAssets,
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
      portalSwapTimer: 0,
      blinkTimer: 0
    },
    companion: {
      x: 60,
      y: 350,
      vx: 0,
      vy: 0,
      width: PLAYABLE_CHARACTERS.morty.width,
      height: PLAYABLE_CHARACTERS.morty.height,
      facing: 'right',
      onGround: true,
      runCycle: 0,
      recoilTimer: 0,
      shootCooldown: 0,
      dialogueTimer: 0
    },
    cameraX: 0,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    ambientParticles: [],
    floatingTexts: [],
    powerups: [],
    shockwaves: [],
    ceilingDebris: [],
    orbitalBeams: [],
    steamVentTimer: 0,
    spawnTimer: 0,
    bossSpawned: false,
    bossDefeated: false,
    enemiesSpawnedCount: 0,
    levelKillsCount: 0,
    screenShake: 0,
    comboCount: 0,
    comboTimer: 0
  });

  const animationFrameIdRef = useRef(null);

  // Sync external activeCharacter changes
  useEffect(() => {
    const p = gameStateRef.current.player;
    if (p.character !== activeCharacter) {
      p.character = activeCharacter;
      p.portalSwapTimer = 16;
      const charConf = PLAYABLE_CHARACTERS[activeCharacter] || PLAYABLE_CHARACTERS.rick;
      p.width = charConf.width;
      p.height = charConf.height;

      // Swap companion character dimensions
      const comp = gameStateRef.current.companion;
      const compCharKey = activeCharacter === 'rick' ? 'morty' : 'rick';
      const compConf = PLAYABLE_CHARACTERS[compCharKey];
      comp.width = compConf.width;
      comp.height = compConf.height;
    }
  }, [activeCharacter]);

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

    // Swap companion dimensions
    const comp = gameStateRef.current.companion;
    const compCharKey = nextChar === 'rick' ? 'morty' : 'rick';
    const compConf = PLAYABLE_CHARACTERS[compCharKey];
    comp.width = compConf.width;
    comp.height = compConf.height;

    // Portal vortex particles
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const speed = 2.8 + Math.random() * 4.0;
      gameStateRef.current.particles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 28,
        maxLife: 28,
        color: nextChar === 'rick' ? '#42f56c' : '#facc15',
        size: 3.5 + Math.random() * 2.5
      });
    }

    gameStateRef.current.floatingTexts.push({
      text: nextChar === 'rick' ? '¡RICK C-137 ACTIVO!' : '¡MORTY SMITH ACTIVO!',
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

  // Special Skill Trigger (Rick: Portal Jump / Morty: Death Crystal)
  const triggerSpecialSkill = useCallback(() => {
    const p = gameStateRef.current.player;
    const charConf = PLAYABLE_CHARACTERS[p.character] || PLAYABLE_CHARACTERS.rick;
    const state = gameStateRef.current;

    if (p.skillCooldown > 0) {
      soundManager.playEnemyHit();
      state.floatingTexts.push({
        text: 'COOLDOWN...',
        x: p.x,
        y: p.y - 15,
        vy: -1,
        alpha: 1.0,
        life: 30,
        color: '#94a3b8'
      });
      return;
    }

    if (p.character === 'rick') {
      // Rick: Portal Warp Dash (220px horizontal teleport with area distortion damage)
      soundManager.playSpecialSkill('rick');
      p.skillCooldown = charConf.skillCooldown;
      p.invulnerableTimer = 35;
      state.screenShake = 9;

      const warpDist = p.facing === 'right' ? 220 : -220;
      const originX = p.x;
      const targetX = Math.max(20, Math.min(levelConfig?.worldWidth || 3200 - 80, p.x + warpDist));

      // Particles at departure
      for (let i = 0; i < 24; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 28,
          maxLife: 28,
          color: '#42f56c',
          size: 4.5
        });
      }

      p.x = targetX;

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
          en.health -= 85;
          soundManager.playEnemyHit();
          state.floatingTexts.push({
            text: 'WARP HIT! -85',
            x: en.x,
            y: en.y - 14,
            vy: -1.2,
            alpha: 1.0,
            life: 40,
            color: '#38bdf8'
          });
        }
      });

      // Particles at destination
      for (let i = 0; i < 26; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 7.5,
          vy: (Math.random() - 0.5) * 7.5,
          life: 30,
          maxLife: 30,
          color: '#22d3ee',
          size: 4.5
        });
      }

      state.floatingTexts.push({
        text: '¡PORTAL WARP DASH!',
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
      state.screenShake = 8;

      for (let i = 0; i < 28; i++) {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 6.5,
          vy: (Math.random() - 0.5) * 6.5,
          life: 32,
          maxLife: 32,
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
      p.vy = charConf.jumpForce;
      p.onGround = false;
      p.jumpCount = 1;
      soundManager.playJump(false);
    } else if (p.jumpCount === 1) {
      // DOUBLE JUMP in mid-air
      p.vy = charConf.jumpForce * 0.94;
      p.jumpCount = 2;
      soundManager.playJump(true);

      const isRick = p.character === 'rick';
      const sparkColor = isRick ? '#39ff14' : '#facc15';

      for (let i = 0; i < 14; i++) {
        gameStateRef.current.particles.push({
          x: p.x + p.width / 2 + (Math.random() - 0.5) * 20,
          y: p.y + p.height,
          vx: (Math.random() - 0.5) * 4,
          vy: 3 + Math.random() * 4.5,
          life: 22,
          maxLife: 22,
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

    // Helper: spawn explosion particles
    const createExplosion = (x, y, color = '#42f56c', count = 18) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 5.0;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 25 + Math.random() * 16,
          maxLife: 42,
          color,
          size: 2.2 + Math.random() * 3.8
        });
      }
    };

    // Helper: floating text
    const addFloatingText = (text, x, y, color = '#42f56c') => {
      state.floatingTexts.push({
        text,
        x,
        y,
        vy: -1.2,
        alpha: 1.0,
        life: 48,
        color
      });
    };

    // Helper: spawn ground shockwave
    const spawnShockwave = (originX, direction = 1) => {
      soundManager.playShockwave();
      state.shockwaves.push({
        x: originX,
        y: GROUND_Y - 10,
        vx: direction * 5.8,
        width: 32,
        height: 24,
        life: 75,
        maxLife: 75,
        color: '#ef4444'
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

      p.blinkTimer++;
      if (p.blinkTimer > 180) p.blinkTimer = 0;

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
        p.runCycle += 0.24;
      } else if (keys.right) {
        p.vx = effectiveMoveSpeed;
        p.facing = 'right';
        p.runCycle += 0.24;
      } else {
        p.vx *= PLAYER_CONFIG.friction;
        if (Math.abs(p.vx) < 0.1) p.vx = 0;
      }

      // Gravity & position
      p.vy += PLAYER_CONFIG.gravity;
      p.x += p.vx;
      p.y += p.vy;

      // Stage boundary check X
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
      // 2. ACTIVE COMPANION FOLLOWING & COVERING FIRE
      // ==========================================
      const comp = state.companion;
      const followDist = p.facing === 'right' ? -42 : 42;
      const targetCompX = p.x + followDist;
      comp.vx = (targetCompX - comp.x) * 0.18;
      comp.x += comp.vx;
      comp.facing = p.facing;

      if (Math.abs(comp.vx) > 0.3) {
        comp.runCycle += 0.24;
      }

      if (!p.onGround) {
        comp.y += (p.y - comp.y) * 0.22;
        comp.onGround = false;
      } else {
        comp.y = p.y + (p.height - comp.height);
        comp.onGround = true;
      }

      // Companion covering fire AI (fires at nearby threats)
      if (comp.shootCooldown > 0) comp.shootCooldown--;
      if (comp.recoilTimer > 0) comp.recoilTimer--;
      if (comp.dialogueTimer > 0) comp.dialogueTimer--;

      const isMortyActive = p.character === 'morty'; // Companion is Rick

      // Scan closest enemy within 280px in front
      if (comp.shootCooldown <= 0) {
        const threatEnemy = state.enemies.find((en) => {
          const inFront = comp.facing === 'right' ? en.x > comp.x : en.x < comp.x;
          const dist = Math.abs(en.x - comp.x);
          return inFront && dist < 280;
        });

        if (threatEnemy) {
          comp.shootCooldown = 65 + Math.floor(Math.random() * 35);
          comp.recoilTimer = 8;
          const compBulletSpeed = comp.facing === 'right' ? 12 : -12;
          const compStartX = comp.facing === 'right' ? comp.x + comp.width + 4 : comp.x - 12;
          const compStartY = comp.y + comp.height / 2 - 2;

          if (isMortyActive) {
            // Rick fires companion laser
            soundManager.playLaser();
            state.bullets.push({
              x: compStartX,
              y: compStartY,
              vx: compBulletSpeed,
              vy: (Math.random() - 0.5) * 0.4,
              width: 14,
              height: 5,
              color: '#39ff14',
              damage: 25,
              isCompanion: true
            });
          } else {
            // Morty fires companion blaster
            soundManager.playMortyBlaster();
            state.bullets.push({
              x: compStartX,
              y: compStartY,
              vx: compBulletSpeed,
              vy: (Math.random() - 0.5) * 0.5,
              width: 10,
              height: 5,
              color: '#facc15',
              damage: 18,
              isCompanion: true
            });
          }

          // Trigger companion dialogue
          if (comp.dialogueTimer <= 0) {
            comp.dialogueTimer = 220;
            const mortyPhrases = ['¡OH JEEZ!', '¡CUIDADO!', '¡TOMA ESTO!', '¡AHÍ VA!'];
            const rickPhrases = ['*BURP*', '¡MIRA ESTO!', 'FACILITO.', '¡MUERAN!'];
            const phrase = isMortyActive
              ? rickPhrases[Math.floor(Math.random() * rickPhrases.length)]
              : mortyPhrases[Math.floor(Math.random() * mortyPhrases.length)];
            addFloatingText(phrase, comp.x - 10, comp.y - 20, isMortyActive ? '#39ff14' : '#facc15');
          }
        }
      }

      // ==========================================
      // 3. CONTRA CAMERA SCROLLING
      // ==========================================
      let targetCamX = p.x - 240;
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
          soundManager.playLaser();
          const isCritical = Math.random() < 0.25;
          const damage = isCritical ? Math.round(charConf.bulletDamage * 2.5) : charConf.bulletDamage;

          state.bullets.push({
            x: startX,
            y: startY,
            vx: bulletSpeed,
            vy: (Math.random() - 0.5) * 0.3,
            width: isCritical ? 22 : 16,
            height: isCritical ? 8 : 6,
            color: isCritical ? '#fde047' : '#42f56c',
            damage,
            isCritical
          });

          createExplosion(startX, startY, isCritical ? '#fde047' : '#39ff14', 5);
          p.shootCooldown = charConf.fireCooldown;
        } else {
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
      // 4. BULLETS, SHOCKWAVES & CEILING DEBRIS
      // ==========================================
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (Math.random() < 0.35) {
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
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 14);
          p.invulnerableTimer = 45;
          state.screenShake = 7;
          onPlayerDamage(20);
          continue;
        }

        if (eb.x < state.cameraX - 100 || eb.x > state.cameraX + CANVAS_WIDTH + 100 || eb.y > CANVAS_HEIGHT) {
          state.enemyBullets.splice(i, 1);
        }
      }

      // Ground shockwaves (require jump over!)
      for (let sIndex = state.shockwaves.length - 1; sIndex >= 0; sIndex--) {
        const sw = state.shockwaves[sIndex];
        sw.x += sw.vx;
        sw.life--;

        // Check player collision (player on ground)
        if (
          p.invulnerableTimer === 0 &&
          p.onGround &&
          p.x < sw.x + sw.width &&
          p.x + p.width > sw.x &&
          p.y + p.height >= GROUND_Y - 14
        ) {
          p.invulnerableTimer = 50;
          state.screenShake = 9;
          soundManager.playPlayerHurt();
          createExplosion(p.x + p.width / 2, GROUND_Y - 10, '#ef4444', 16);
          onPlayerDamage(25);
          addFloatingText('¡SALTA LA ONDA!', p.x - 20, p.y - 18, '#ef4444');
        }

        if (sw.life <= 0) {
          state.shockwaves.splice(sIndex, 1);
        }
      }

      // Ceiling debris (falling rocks/stalactites in Boss Phase 2)
      for (let cIndex = state.ceilingDebris.length - 1; cIndex >= 0; cIndex--) {
        const cd = state.ceilingDebris[cIndex];
        cd.y += cd.vy;
        cd.vy += 0.3;

        if (
          p.invulnerableTimer === 0 &&
          p.x < cd.x + cd.width &&
          p.x + p.width > cd.x &&
          p.y < cd.y + cd.height &&
          p.y + p.height > cd.y
        ) {
          p.invulnerableTimer = 45;
          state.screenShake = 8;
          soundManager.playPlayerHurt();
          createExplosion(cd.x + cd.width / 2, cd.y + cd.height / 2, '#94a3b8', 12);
          onPlayerDamage(18);
          state.ceilingDebris.splice(cIndex, 1);
          continue;
        }

        if (cd.y >= GROUND_Y - 10) {
          createExplosion(cd.x + cd.width / 2, GROUND_Y - 4, '#94a3b8', 8);
          state.ceilingDebris.splice(cIndex, 1);
        }
      }

      // Orbital death beams (Evil Morty Phase 2)
      for (let obIndex = state.orbitalBeams.length - 1; obIndex >= 0; obIndex--) {
        const ob = state.orbitalBeams[obIndex];
        ob.timer++;

        if (ob.timer === ob.warnFrames) {
          soundManager.playShockwave();
          state.screenShake = 12;
        }

        // Active firing phase
        if (ob.timer > ob.warnFrames && ob.timer < ob.warnFrames + ob.fireFrames) {
          if (
            p.invulnerableTimer === 0 &&
            p.x < ob.x + ob.width &&
            p.x + p.width > ob.x
          ) {
            p.invulnerableTimer = 40;
            state.screenShake = 9;
            soundManager.playPlayerHurt();
            onPlayerDamage(28);
          }
        }

        if (ob.timer >= ob.warnFrames + ob.fireFrames) {
          state.orbitalBeams.splice(obIndex, 1);
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
      // 5. SPAWN ENEMIES ALONG SCROLLING WORLD
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
        // Subtype variety: walker can be Meeseeks or Gromflomite Trooper
        const subType = isFlying
          ? 'drone'
          : Math.random() < 0.55
          ? 'meeseeks'
          : 'gromflomite';

        const startX = Math.min(WORLD_WIDTH - 60, state.cameraX + CANVAS_WIDTH + 40 + Math.random() * 80);
        const startY = isFlying ? 120 + Math.random() * 140 : GROUND_Y - 54;
        const speedMultiplier = levelConfig?.enemySpeedMultiplier || 1.0;

        const enemyName = isFlying
          ? 'Cyber Bird Drone'
          : subType === 'gromflomite'
          ? 'Gromflomite Trooper'
          : 'Rogue Mr. Meeseeks';

        state.enemies.push({
          id: `enemy-${Date.now()}-${Math.random()}`,
          type: enemyType,
          subType,
          name: enemyName,
          x: startX,
          y: startY,
          vx: -(1.4 + Math.random() * 1.1) * speedMultiplier,
          vy: 0,
          width: 44,
          height: 52,
          health: isFlying ? 60 : subType === 'gromflomite' ? 55 : 45,
          maxHealth: isFlying ? 60 : subType === 'gromflomite' ? 55 : 45,
          points: isFlying ? SCORE_SYSTEM.FLYING_ENEMY : SCORE_SYSTEM.REGULAR_ENEMY,
          shootTimer: Math.floor(Math.random() * 90) + 60,
          hoverAngle: Math.random() * Math.PI * 2,
          runCycle: 0,
          hitFlash: 0,
          // REACTIVE AI FIELDS
          aiState: 'approach',
          dodgeCooldown: 0,
          aimTimer: 0,
          diveTimer: 0,
          isFrenzied: false
        });
      }

      // Boss Spawn Trigger
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
          x: Math.max(BOSS_ARENA_X + 280, p.x + 300),
          y: GROUND_Y - 96,
          vx: -0.9,
          vy: 0,
          width: 86,
          height: 96,
          health: bossHealth,
          maxHealth: bossHealth,
          points: SCORE_SYSTEM.BOSS_ENEMY,
          shootTimer: 60,
          hoverAngle: 0,
          runCycle: 0,
          hitFlash: 0,
          // BOSS REACTIVE AI FIELDS
          phase: 1,
          specialAttackTimer: 180,
          shieldActive: false,
          shieldAngle: 0,
          groundPoundTimer: 0,
          dashTimer: 0,
          rageRoarDone: false
        });

        soundManager.playExplosion(true);
        state.screenShake = 16;
        addFloatingText('⚠️ ALERTA: JEFE DIMENSIONAL DETECTADO! ⚠️', p.x - 60, 80, '#ef4444');
      }

      // =========================================================
      // 6. ADVANCED REACTIVE ENEMY AI STATE MACHINE
      // =========================================================
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        en.runCycle += 0.2;
        if (en.hitFlash > 0) en.hitFlash--;
        if (en.dodgeCooldown > 0) en.dodgeCooldown--;

        // A. BOSS AI STATE MACHINE
        if (en.isBoss) {
          const healthPercent = en.health / en.maxHealth;

          // Check Phase Transition to Phase 2 Enrage
          if (healthPercent <= 0.5 && en.phase === 1) {
            en.phase = 2;
            state.screenShake = 18;
            soundManager.playFrenzyRoar();
            addFloatingText('⚠️ FASE 2: RAGE OVERDRIVE! ⚠️', en.x - 40, en.y - 30, '#ef4444');
            createExplosion(en.x + en.width / 2, en.y + en.height / 2, '#ef4444', 32);
          }

          // Arena movement limits
          en.x += en.vx;
          if (en.x < BOSS_ARENA_X + 40) {
            en.x = BOSS_ARENA_X + 40;
            en.vx = Math.abs(en.vx);
          } else if (en.x > WORLD_WIDTH - en.width - 20) {
            en.x = WORLD_WIDTH - en.width - 20;
            en.vx = -Math.abs(en.vx);
          }

          // Boss Level-Specific AI
          const levelId = levelConfig?.id || 1;

          if (levelId === 1) {
            // BOSS 1: ALPHA MR. MEESEEKS (Stomp Shockwaves + Phase 2 Earthquake & Mini-Summons)
            en.groundPoundTimer = (en.groundPoundTimer || 0) + 1;
            const poundInterval = en.phase === 2 ? 140 : 200;

            if (en.groundPoundTimer >= poundInterval) {
              en.groundPoundTimer = 0;
              spawnShockwave(en.x, -1);
              spawnShockwave(en.x + en.width, 1);
              state.screenShake = 10;
              addFloatingText('¡GOLPE SÍSMICO!', en.x, en.y - 18, '#ef4444');

              // Phase 2: Ceiling Debris
              if (en.phase === 2) {
                for (let d = 0; d < 3; d++) {
                  state.ceilingDebris.push({
                    x: BOSS_ARENA_X + 80 + Math.random() * 500,
                    y: 20,
                    vy: 2 + Math.random() * 2,
                    width: 18,
                    height: 22
                  });
                }
              }
            }
          } else if (levelId === 2) {
            // BOSS 2: CYBER BIRDPERSON (Sonic Dash + Carpet Bombing)
            en.dashTimer = (en.dashTimer || 0) + 1;
            if (en.dashTimer >= 180) {
              en.dashTimer = 0;
              soundManager.playSpecialSkill('rick');
              en.vx = en.x > p.x ? -6.5 : 6.5; // Fast charge toward player
              state.screenShake = 8;
              addFloatingText('¡CHOQUE SÓNICO!', en.x, en.y - 20, '#38bdf8');
            } else if (Math.abs(en.vx) > 2) {
              en.vx *= 0.96; // Recover from dash
            }
          } else {
            // BOSS 3: EVIL MORTY (Front Barrier Shield + Orbital Death Beam)
            en.shieldActive = true; // Front barrier deflects player shots
            en.specialAttackTimer = (en.specialAttackTimer || 0) + 1;

            if (en.phase === 2 && en.specialAttackTimer >= 220) {
              en.specialAttackTimer = 0;
              soundManager.playTelegraph();
              // Spawn orbital death beam centered near player
              state.orbitalBeams.push({
                x: Math.max(BOSS_ARENA_X + 40, p.x - 30),
                width: 70,
                warnFrames: 45,
                fireFrames: 35,
                timer: 0
              });
              addFloatingText('⚠️ RAYO ORBITAL INMINENTE ⚠️', p.x - 40, 60, '#c084fc');
            }
          }

          // Boss Shooting (tracks player direction and shoots backwards if flanked!)
          en.shootTimer--;
          if (en.shootTimer <= 0) {
            en.shootTimer = en.phase === 2 ? 45 : 70;
            const shootDirX = p.x >= en.x + en.width / 2 ? 1 : -1;
            en.facing = shootDirX === 1 ? 'right' : 'left';
            const bulletSpeed = 6.2 * shootDirX;
            const bulletStartX = shootDirX === 1 ? en.x + en.width + 4 : en.x - 12;

            if (levelId === 3 && en.phase === 2) {
              // 3-way spread
              [-1.2, 0, 1.2].forEach((spreadY) => {
                state.enemyBullets.push({
                  x: bulletStartX,
                  y: en.y + en.height / 2,
                  vx: bulletSpeed,
                  vy: spreadY,
                  width: 12,
                  height: 12,
                  color: '#c084fc'
                });
              });
            } else {
              state.enemyBullets.push({
                x: bulletStartX,
                y: en.y + en.height / 2,
                vx: bulletSpeed,
                vy: (Math.random() - 0.5) * 1.5,
                width: 12,
                height: 12,
                color: '#ef4444'
              });
            }
          }
        }
        // B. FLYING ENEMY: CYBER BIRD DRONE (Sinusoidal Hover & Dive-Bombing in both directions)
        else if (en.type === 'flying') {
          const shootDirX = p.x >= en.x + en.width / 2 ? 1 : -1;
          en.facing = shootDirX === 1 ? 'right' : 'left';
          en.hoverAngle += 0.06;
          en.diveTimer = (en.diveTimer || 0) + 1;

          if (en.diveTimer > 150 && en.aiState !== 'dive') {
            // Initiate Dive-Bomb run toward player (forward or backward!)
            en.aiState = 'dive';
            en.diveTimer = 0;
            en.vy = 4.2;
            en.vx = 4.5 * shootDirX;
            soundManager.playTelegraph();
            addFloatingText('¡PICADA!', en.x, en.y - 12, '#f97316');
          }

          if (en.aiState === 'dive') {
            en.y += en.vy;
            en.x += en.vx;

            // Thrust particles
            state.particles.push({
              x: en.x + en.width / 2,
              y: en.y + 10,
              vx: (Math.random() - 0.5) * 2,
              vy: -2,
              life: 14,
              maxLife: 14,
              color: '#f97316',
              size: 3
            });

            // Pull up near ground
            if (en.y >= GROUND_Y - 80) {
              en.vy = -3.8;
            }
            if (en.y <= 130 && en.vy < 0) {
              en.aiState = 'approach';
              en.vy = 0;
              en.vx = -1.8;
            }
          } else {
            // Normal Sinusoidal Hover
            en.y += Math.sin(en.hoverAngle) * 1.6;
            en.x += en.vx;
          }

          // Flying Drone shooting (shoots backwards or forwards toward player)
          en.shootTimer--;
          if (en.shootTimer <= 0) {
            en.shootTimer = 135 + Math.random() * 70;
            const bulletStartX = shootDirX === 1 ? en.x + en.width + 4 : en.x - 10;
            state.enemyBullets.push({
              x: bulletStartX,
              y: en.y + en.height / 2,
              vx: 5.8 * shootDirX,
              vy: 0.8,
              width: 10,
              height: 10,
              color: '#ef4444'
            });
          }
        }
        // C. WALKER: GROMFLOMITE TROOPER (Tactical Spacing & 360-Degree Laser Sight Aim)
        else if (en.subType === 'gromflomite') {
          const playerRelX = (p.x + p.width / 2) - (en.x + en.width / 2);
          const shootDirX = playerRelX >= 0 ? 1 : -1;
          en.facing = shootDirX === 1 ? 'right' : 'left';
          const distToPlayer = Math.abs(playerRelX);

          // Tactical spacing: if player too close, step back in opposite direction!
          if (distToPlayer < 90) {
            en.vx = -2.2 * shootDirX; // Tactical retreat away from player
          } else if (distToPlayer >= 90 && distToPlayer <= 280) {
            en.vx = 0; // Stop and aim
            en.aimTimer = (en.aimTimer || 0) + 1;

            // Telegraph warning beam before firing
            if (en.aimTimer === 25) {
              soundManager.playTelegraph();
            }

            if (en.aimTimer >= 55) {
              en.aimTimer = 0;
              soundManager.playLaser();
              const muzzleX = shootDirX === 1 ? en.x + en.width + 6 : en.x - 14;
              state.enemyBullets.push({
                x: muzzleX,
                y: en.y + 16,
                vx: 8.5 * shootDirX, // High-speed piercing bolt backwards or forwards
                vy: 0,
                width: 16,
                height: 5,
                color: '#ef4444'
              });
            }
          } else {
            en.vx = 1.6 * shootDirX; // Advance towards player
            en.aimTimer = 0;
          }

          en.x += en.vx;
        }
        // D. WALKER: MR. MEESEEKS (Reactive Dodge Leaps & 360-degree pursuit & shooting)
        else {
          const playerRelX = (p.x + p.width / 2) - (en.x + en.width / 2);
          const shootDirX = playerRelX >= 0 ? 1 : -1;
          en.facing = shootDirX === 1 ? 'right' : 'left';

          // Check oncoming player bullets to trigger a REACTIVE DODGE LEAP!
          if (en.dodgeCooldown <= 0) {
            const oncomingBullet = state.bullets.find(
              (b) =>
                ((b.vx > 0 && b.x < en.x && en.x - b.x < 140) ||
                 (b.vx < 0 && b.x > en.x && b.x - en.x < 140)) &&
                Math.abs(b.y - (en.y + en.height / 2)) < 30
            );

            if (oncomingBullet) {
              en.vy = -7.4; // Evasive jump
              en.dodgeCooldown = 90;
              en.runCycle += 1.2;
              soundManager.playJump(false);
              addFloatingText('¡ESQUIVA!', en.x, en.y - 16, '#38bdf8');
            }
          }

          // Check Frenzy Mode (<50% HP)
          if (en.health <= en.maxHealth * 0.5 && !en.isFrenzied) {
            en.isFrenzied = true;
            soundManager.playFrenzyRoar();
            addFloatingText('¡EXISTENCE IS PAIN!', en.x - 30, en.y - 20, '#ef4444');
          }

          // Move towards player (forward or backward)
          const moveSpeed = en.isFrenzied ? 3.0 : 1.6;
          en.vx = moveSpeed * shootDirX;

          // Frenzy leaping
          if (en.isFrenzied) {
            en.hoverAngle += 0.08;
            if (Math.random() < 0.025 && en.y >= GROUND_Y - en.height - 4) {
              en.vy = -6.0;
            }
          }

          // Gravity for walker
          en.vy = (en.vy || 0) + 0.48;
          en.y += en.vy;
          if (en.y >= GROUND_Y - en.height) {
            en.y = GROUND_Y - en.height;
            en.vy = 0;
          }

          en.x += en.vx;

          // Regular shooting (shoots backward or forward!)
          en.shootTimer--;
          if (en.shootTimer <= 0) {
            en.shootTimer = en.isFrenzied ? 75 : 140 + Math.random() * 60;
            const muzzleX = shootDirX === 1 ? en.x + en.width + 2 : en.x - 10;
            state.enemyBullets.push({
              x: muzzleX,
              y: en.y + en.height / 2,
              vx: 5.5 * shootDirX,
              vy: (Math.random() - 0.5) * 1.5,
              width: 10,
              height: 10,
              color: en.isFrenzied ? '#ef4444' : '#0284c7'
            });
          }
        }

        // ==========================================
        // BULLET VS ENEMY COLLISIONS
        // ==========================================
        for (let bIndex = state.bullets.length - 1; bIndex >= 0; bIndex--) {
          const bul = state.bullets[bIndex];
          if (
            bul.x < en.x + en.width &&
            bul.x + bul.width > en.x &&
            bul.y < en.y + en.height &&
            bul.y + bul.height > en.y
          ) {
            // Check Boss Front Shield Deflection (Evil Morty Phase 1/2)
            if (en.isBoss && en.shieldActive && bul.vx > 0 && bul.x < en.x + 24) {
              soundManager.playShieldDeflect();
              createExplosion(bul.x, bul.y, '#eab308', 8);
              state.bullets.splice(bIndex, 1);
              addFloatingText('¡DEFLECTED!', en.x - 10, en.y - 10, '#eab308');
              continue;
            }

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
                en.isBoss ? '#a855f7' : en.isFrenzied ? '#ef4444' : '#42f56c',
                en.isBoss ? 48 : 24
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
                state.screenShake = 24;
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

      // ==========================================
      // 7. PARTICLES, TEXTS & ATMOSPHERICS
      // ==========================================
      // Spurt steam vents every 100 frames
      state.steamVentTimer++;
      if (state.steamVentTimer > 90) {
        state.steamVentTimer = 0;
        platforms.forEach((plat) => {
          for (let s = 0; s < 5; s++) {
            state.particles.push({
              x: plat.x + 20 + Math.random() * (plat.width - 40),
              y: plat.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -(2.5 + Math.random() * 2),
              life: 25,
              maxLife: 25,
              color: 'rgba(255, 255, 255, 0.4)',
              size: 3.5
            });
          }
        });
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
        ft.alpha = ft.life / 48;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
      }

      // =========================================================
      // 8. PS2-ERA CANVAS RENDERING: MULTI-LAYER PARALLAX & CEL-SHADING
      // =========================================================
      ctx.save();

      // Screen Shake
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake * 1.5;
        const shakeY = (Math.random() - 0.5) * state.screenShake * 1.5;
        ctx.translate(shakeX, shakeY);
      }

      // Layer 0: Cosmic Sky with Rich Gradient & Auroras
      drawDeepCosmicSky(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, levelConfig?.id || 1);

      // Layer 1: Far Parallax (0.12x speed) - Mountains, Distant Skyline & Cromulon
      drawFarParallax(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, state.cameraX * 0.12, levelConfig?.id || 1);

      // Layer 2: Mid Parallax (0.42x speed) - Lore Landmarks (Garage, Space Cruiser, Citadel)
      drawMidParallax(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, state.cameraX * 0.42, levelConfig?.id || 1, GROUND_Y);

      // ==========================================
      // WORLD SPACE RENDERING (1.0x Camera Translation)
      // ==========================================
      ctx.save();
      ctx.translate(-state.cameraX, 0);

      const portalColor = levelConfig?.portalColor || '#42f56c';

      // Layer 3: High-Detail Ground Terrain with Hazard Striping & Grids
      drawHighDetailTerrain(ctx, WORLD_WIDTH, GROUND_Y, CANVAS_HEIGHT, portalColor, levelConfig?.groundColor);

      // Boss Arena Entrance Archway
      drawArenaPortalArch(ctx, BOSS_ARENA_X, GROUND_Y, portalColor);

      // Detailed Platforms with Conduit Glow & Hazard Trim
      platforms.forEach((plat) => {
        drawDetailedPlatform(ctx, plat, portalColor);
      });

      // Orbital Death Beams (Warning Telegraph & Fire Column)
      state.orbitalBeams.forEach((ob) => {
        ctx.save();
        if (ob.timer < ob.warnFrames) {
          // Warning red targeting column
          const alpha = 0.25 + Math.sin(ob.timer * 0.4) * 0.2;
          ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.fillRect(ob.x, 0, ob.width, GROUND_Y);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(ob.x, 0, ob.width, GROUND_Y);
        } else {
          // Devastating Purple Death Laser
          const grad = ctx.createLinearGradient(ob.x, 0, ob.x + ob.width, 0);
          grad.addColorStop(0, 'rgba(192, 132, 252, 0.4)');
          grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          grad.addColorStop(1, 'rgba(192, 132, 252, 0.4)');
          ctx.fillStyle = grad;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 24;
          ctx.fillRect(ob.x, 0, ob.width, GROUND_Y);
        }
        ctx.restore();
      });

      // Gromflomite Aiming Laser Sight Telegraphs
      state.enemies.forEach((en) => {
        if (en.subType === 'gromflomite' && en.aimTimer > 20 && en.aimTimer < 55) {
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          const muzzleX = en.facing === 'right' ? en.x + en.width + 6 : en.x - 6;
          ctx.moveTo(muzzleX, en.y + 16);
          ctx.lineTo(p.x + p.width / 2, p.y + p.height / 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Shockwaves rippling along floor
      state.shockwaves.forEach((sw) => {
        ctx.save();
        ctx.fillStyle = sw.color;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.width / 2, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      });

      // Ceiling Debris falling
      state.ceilingDebris.forEach((cd) => {
        ctx.save();
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cd.x, cd.y);
        ctx.lineTo(cd.x + cd.width, cd.y + 4);
        ctx.lineTo(cd.x + cd.width / 2, cd.y + cd.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Bullets
      state.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color || '#42f56c';
        ctx.shadowColor = b.color || '#42f56c';
        ctx.shadowBlur = b.isCritical ? 16 : 10;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.restore();
      });

      // Enemy Bullets
      state.enemyBullets.forEach((eb) => {
        ctx.save();
        ctx.fillStyle = eb.color || '#ef4444';
        ctx.shadowColor = eb.color || '#ef4444';
        ctx.shadowBlur = 9;
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
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.strokeStyle = pw.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pw.x + 14, hoverY + 14, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pw.icon, pw.x + 14, hoverY + 15);
        ctx.restore();
      });

      // =========================================================
      // 100% RIGGED 2D CEL-SHADED ANIMATED ENEMIES (ZERO PHOTO BOXES)
      // =========================================================
      state.enemies.forEach((en) => {
        ctx.save();
        if (en.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(en.x, en.y, en.width, en.height);
        } else {
          drawAnimatedEnemyCharacter(ctx, en, levelConfig?.id || 1);
        }

        // Enemy Health Bar with Gradient
        const barWidth = en.width;
        const healthPercent = Math.max(0, en.health / en.maxHealth);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(en.x, en.y - 12, barWidth, 6);
        ctx.fillStyle = en.isBoss ? '#a855f7' : en.isFrenzied ? '#ef4444' : '#06b6d4';
        ctx.fillRect(en.x, en.y - 12, barWidth * healthPercent, 6);

        // Enemy Name
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.fillText(en.name, en.x, en.y - 16);
        ctx.restore();
      });

      // =========================================================
      // FULLY ANIMATED 2D COMPANION (ACTIVE FOLLOWING & FIRING)
      // =========================================================
      ctx.save();
      if (p.character === 'rick') {
        drawPS2CelShadedMorty(ctx, comp);
      } else {
        drawPS2CelShadedRick(ctx, comp);
      }
      ctx.restore();

      // =========================================================
      // FULLY ANIMATED 2D ACTIVE PLAYER (CEL-SHADED RIGGED MODEL)
      // =========================================================
      if (p.invulnerableTimer % 6 < 3) {
        ctx.save();
        if (p.character === 'rick') {
          drawPS2CelShadedRick(ctx, p);
        } else {
          drawPS2CelShadedMorty(ctx, p);
        }

        // Portal Swap vortex
        if (p.portalSwapTimer > 0) {
          ctx.save();
          ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
          ctx.rotate((p.portalSwapTimer * Math.PI) / 3);
          ctx.strokeStyle = p.character === 'rick' ? '#42f56c' : '#facc15';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, p.width * 0.95, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

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

      // =========================================================
      // FOREGROUND ATMOSPHERICS: GOD-RAYS, GROUND FOG & VIGNETTE
      // =========================================================
      drawForegroundAtmospherics(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, levelConfig?.id || 1);

      // SCREEN-SPACE OVERLAY (HUD & COMBO)
      if (state.comboCount > 1) {
        ctx.save();
        ctx.font = 'bold 17px Orbitron, monospace';
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 12;
        ctx.fillText(`COMBO x${state.comboCount}!`, 22, 38);
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
        portalSwapTimer: 0,
        blinkTimer: 0
      },
      companion: {
        x: 60,
        y: 350,
        vx: 0,
        vy: 0,
        width: PLAYABLE_CHARACTERS.morty.width,
        height: PLAYABLE_CHARACTERS.morty.height,
        facing: 'right',
        onGround: true,
        runCycle: 0,
        recoilTimer: 0,
        shootCooldown: 0,
        dialogueTimer: 0
      },
      cameraX: 0,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      particles: [],
      ambientParticles: [],
      floatingTexts: [],
      powerups: [],
      shockwaves: [],
      ceilingDebris: [],
      orbitalBeams: [],
      steamVentTimer: 0,
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
 * 4-LAYER PARALLAX BACKGROUND LAYERS WITH RICK AND MORTY LORE ARTWORK
 * =========================================================================
 */

function drawDeepCosmicSky(ctx, width, height, levelId) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, height);

  if (levelId === 1) {
    grad.addColorStop(0, '#040d07');
    grad.addColorStop(0.5, '#0a2313');
    grad.addColorStop(1, '#051109');
  } else if (levelId === 2) {
    grad.addColorStop(0, '#050716');
    grad.addColorStop(0.5, '#12193b');
    grad.addColorStop(1, '#090d24');
  } else {
    grad.addColorStop(0, '#12021c');
    grad.addColorStop(0.5, '#3b0764');
    grad.addColorStop(1, '#16041f');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Rotating Cosmic Nebula or Aurora
  const t = Date.now() / 3000;
  const radGrad = ctx.createRadialGradient(
    width * 0.7 + Math.sin(t) * 40,
    height * 0.25,
    20,
    width * 0.7,
    height * 0.25,
    width * 0.5
  );

  if (levelId === 1) {
    radGrad.addColorStop(0, 'rgba(66, 245, 108, 0.18)');
    radGrad.addColorStop(1, 'rgba(66, 245, 108, 0)');
  } else if (levelId === 2) {
    radGrad.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
    radGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  } else {
    radGrad.addColorStop(0, 'rgba(192, 132, 252, 0.22)');
    radGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
  }

  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawFarParallax(ctx, width, height, offsetX, levelId) {
  ctx.save();

  // Twinkling stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    const sx = (i * 71 - (offsetX % width) + width) % width;
    const sy = (i * 37) % (height - 130);
    const size = (i % 3) + 1;
    ctx.globalAlpha = 0.3 + (Math.sin(Date.now() / 500 + i) + 1) * 0.35;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1.0;

  if (levelId === 3) {
    // LEVEL 3: GIANT CROMULON HEAD ("SHOW ME WHAT YOU GOT")
    const cromulonX = (width * 0.62 - (offsetX % width) + width) % width;
    const cromulonY = 95;
    drawCromulonHead(ctx, cromulonX, cromulonY);
  } else if (levelId === 2) {
    // LEVEL 2: CITADEL NEON SKYLINE WITH FLASHING TRAFFIC BEACONS
    for (let b = 0; b < 12; b++) {
      const bx = (b * 110 - (offsetX % 1320) + 1320) % 1320;
      const bHeight = 150 + (b % 4) * 45;
      const bWidth = 75;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(bx, height - bHeight - 48, bWidth, bHeight);

      // Red flashing beacon atop spires
      ctx.fillStyle = (Date.now() + b * 200) % 800 < 400 ? '#ef4444' : '#7f1d1d';
      ctx.fillRect(bx + bWidth / 2 - 1.5, height - bHeight - 56, 3, 8);
    }
  } else {
    // LEVEL 1: DISTANT MOUNTAIN RIDGE UNDER GREEN STORM
    ctx.fillStyle = 'rgba(6, 78, 59, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, height - 48);
    for (let m = 0; m <= width + 80; m += 80) {
      const my = height - 120 - Math.sin((m + offsetX) * 0.008) * 35;
      ctx.lineTo(m, my);
    }
    ctx.lineTo(width, height - 48);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMidParallax(ctx, width, height, offsetX, levelId, groundY) {
  ctx.save();

  if (levelId === 1) {
    // 1. Rick's Suburban Garage & Smith Residence
    const garageX = 350 - offsetX;
    if (garageX > -300 && garageX < width + 100) {
      drawSmithGarage(ctx, garageX, groundY);
    }

    // 2. The Space Cruiser (Hovering Saucer with rotating plasma ring)
    const cruiserX = 1180 - offsetX;
    if (cruiserX > -250 && cruiserX < width + 100) {
      drawSpaceCruiser(ctx, cruiserX, groundY - 65);
    }

    // 3. Radioactive Slime Barrels & Transmission Tower
    const barrelX = 1880 - offsetX;
    if (barrelX > -150 && barrelX < width + 100) {
      drawRadioactiveBarrels(ctx, barrelX, groundY);
    }
  } else if (levelId === 2) {
    // 1. Simple Rick's Wafers Holographic Billboard
    const ad1X = 540 - offsetX;
    if (ad1X > -250 && ad1X < width + 100) {
      drawHoloBillboard(ctx, ad1X, groundY - 180, "SIMPLE RICK'S", 'WAFERS', '#22d3ee');
    }

    // 2. Vote For Morty Campaign Billboard
    const ad2X = 1380 - offsetX;
    if (ad2X > -250 && ad2X < width + 100) {
      drawHoloBillboard(ctx, ad2X, groundY - 180, 'VOTE FOR MORTY', 'CITADEL 2026', '#facc15');
    }

    // 3. Council of Ricks Crest Spires
    const crestX = 2100 - offsetX;
    if (crestX > -200 && crestX < width + 100) {
      drawCouncilCrest(ctx, crestX, groundY - 190);
    }
  } else {
    // LEVEL 3: MULTIVERSE REALITY RIFTS & FLOATING SHARDS
    const riftX = 920 - offsetX;
    if (riftX > -300 && riftX < width + 100) {
      drawRealityRiftShard(ctx, riftX, groundY - 160);
    }
    const ruinsX = 1780 - offsetX;
    if (ruinsX > -300 && ruinsX < width + 100) {
      drawCosmicRuins(ctx, ruinsX, groundY);
    }
  }

  ctx.restore();
}

function drawHighDetailTerrain(ctx, worldWidth, groundY, canvasHeight, portalColor, groundBaseColor) {
  ctx.save();

  // Base earth
  ctx.fillStyle = groundBaseColor || '#111827';
  ctx.fillRect(0, groundY, worldWidth, canvasHeight - groundY);

  // Metallic top walking plate
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, groundY, worldWidth, 8);

  // Glowing energy conduit strip
  ctx.fillStyle = portalColor;
  ctx.shadowColor = portalColor;
  ctx.shadowBlur = 10;
  ctx.fillRect(0, groundY, worldWidth, 3);
  ctx.shadowBlur = 0;

  // Hazard Caution Stripes (Yellow & Black angled lines)
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.lineWidth = 3;
  for (let gx = 0; gx < worldWidth; gx += 45) {
    ctx.beginPath();
    ctx.moveTo(gx, groundY + 8);
    ctx.lineTo(gx + 12, groundY + 18);
    ctx.stroke();
  }

  // Grate Grid vertical panels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let gx = 0; gx < worldWidth; gx += 60) {
    ctx.fillRect(gx, groundY + 18, 2, canvasHeight - groundY - 18);
  }

  ctx.restore();
}

function drawDetailedPlatform(ctx, plat, portalColor) {
  ctx.save();
  // Dark metallic chassis
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.strokeStyle = portalColor;
  ctx.lineWidth = 2;
  ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

  // Top neon glowing energy edge
  ctx.fillStyle = portalColor;
  ctx.shadowColor = portalColor;
  ctx.shadowBlur = 8;
  ctx.fillRect(plat.x, plat.y, plat.width, 3);
  ctx.shadowBlur = 0;

  // Hazard diagonal tick marks
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
  ctx.lineWidth = 2;
  for (let px = plat.x + 8; px < plat.x + plat.width - 8; px += 24) {
    ctx.beginPath();
    ctx.moveTo(px, plat.y + 4);
    ctx.lineTo(px + 6, plat.y + 12);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSmithGarage(ctx, x, groundY) {
  ctx.save();
  // Siding walls with gradient
  const wallGrad = ctx.createLinearGradient(x, groundY - 135, x, groundY);
  wallGrad.addColorStop(0, '#1e293b');
  wallGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(x, groundY - 135, 210, 135);

  // Roof gable
  ctx.beginPath();
  ctx.moveTo(x - 15, groundY - 135);
  ctx.lineTo(x + 105, groundY - 195);
  ctx.lineTo(x + 225, groundY - 135);
  ctx.closePath();
  ctx.fillStyle = '#090d16';
  ctx.fill();

  // Segmented garage roll-up door
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 20, groundY - 100, 90, 100);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  for (let l = 1; l <= 5; l++) {
    ctx.beginPath();
    ctx.moveTo(x + 20, groundY - l * 18);
    ctx.lineTo(x + 110, groundY - l * 18);
    ctx.stroke();
  }

  // Lit window with green portal reactor glow
  ctx.fillStyle = '#42f56c';
  ctx.shadowColor = '#42f56c';
  ctx.shadowBlur = 12;
  ctx.fillRect(x + 135, groundY - 85, 50, 42);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 10px Orbitron, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText("RICK'S GARAGE LAB", x + 20, groundY - 108);
  ctx.restore();
}

function drawSpaceCruiser(ctx, x, y) {
  ctx.save();
  const hover = Math.sin(Date.now() / 320) * 5;
  ctx.translate(x, y + hover);

  // Plasma Ring Thruster (Pulsing underneath)
  const plasmaGrad = ctx.createRadialGradient(50, 42, 5, 50, 42, 45);
  plasmaGrad.addColorStop(0, '#39ff14');
  plasmaGrad.addColorStop(0.6, 'rgba(66, 245, 108, 0.4)');
  plasmaGrad.addColorStop(1, 'rgba(66, 245, 108, 0)');
  ctx.fillStyle = plasmaGrad;
  ctx.beginPath();
  ctx.ellipse(50, 42, 45, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit Glass Bubble with reflection
  const glassGrad = ctx.createLinearGradient(30, -5, 70, 20);
  glassGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
  glassGrad.addColorStop(1, 'rgba(2, 132, 199, 0.4)');
  ctx.fillStyle = glassGrad;
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(50, 14, 24, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Metallic saucer body with cel-shading
  const saucerGrad = ctx.createLinearGradient(0, 10, 100, 30);
  saucerGrad.addColorStop(0, '#94a3b8');
  saucerGrad.addColorStop(0.5, '#64748b');
  saucerGrad.addColorStop(1, '#334155');
  ctx.fillStyle = saucerGrad;
  ctx.beginPath();
  ctx.ellipse(50, 22, 60, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 8;
  ctx.fillRect(15, 20, 10, 6);
  ctx.fillRect(75, 20, 10, 6);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('SPACE CRUISER C-137', 2, -6);
  ctx.restore();
}

function drawCromulonHead(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Golden celestial aura with acoustic soundwave rings
  const pulse = (Date.now() / 400) % 30;
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 85 + pulse, 0, Math.PI * 2);
  ctx.arc(0, 0, 110 + pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Massive Golden Head Oval
  const headGrad = ctx.createLinearGradient(-60, -80, 60, 80);
  headGrad.addColorStop(0, '#fef08a');
  headGrad.addColorStop(0.5, '#eab308');
  headGrad.addColorStop(1, '#a16207');
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 70, 88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing Ocular Beams (Eyes)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(-24, -16, 14, 0, Math.PI * 2);
  ctx.arc(24, -16, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Dark Pupils tracking
  ctx.fillStyle = '#713f12';
  ctx.beginPath();
  ctx.arc(-24, -16, 5, 0, Math.PI * 2);
  ctx.arc(24, -16, 5, 0, Math.PI * 2);
  ctx.fill();

  // Wide singing mouth
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(0, 44, 32, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 12px Orbitron, sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.fillText('SHOW ME WHAT YOU GOT!', 0, 106);
  ctx.restore();
}

function drawHoloBillboard(ctx, x, y, title, subtitle, color) {
  ctx.save();
  ctx.translate(x, y);

  // Metal support stanchion
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80, 70);
  ctx.lineTo(80, 180);
  ctx.stroke();

  // Glowing holographic box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillRect(0, 0, 160, 70);
  ctx.strokeRect(0, 0, 160, 70);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 11px Orbitron, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(title, 80, 30);

  ctx.font = 'bold 9px Outfit, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(subtitle, 80, 50);
  ctx.restore();
}

function drawCouncilCrest(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(42, 72);
  ctx.lineTo(-42, 72);
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 10px Orbitron, sans-serif';
  ctx.fillStyle = '#22d3ee';
  ctx.textAlign = 'center';
  ctx.fillText('COUNCIL OF RICKS', 0, 90);
  ctx.restore();
}

function drawRadioactiveBarrels(ctx, x, groundY) {
  ctx.save();
  ctx.fillStyle = '#3f6212';
  ctx.fillRect(x, groundY - 42, 32, 42);
  ctx.fillRect(x + 36, groundY - 36, 30, 36);

  ctx.fillStyle = '#42f56c';
  ctx.shadowColor = '#42f56c';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(x + 32, groundY - 2, 48, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawRealityRiftShard(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(38, -48);
  ctx.lineTo(76, 16);
  ctx.lineTo(34, 64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCosmicRuins(ctx, x, groundY) {
  ctx.save();
  ctx.fillStyle = '#3b0764';
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.fillRect(x, groundY - 95, 48, 95);
  ctx.strokeRect(x, groundY - 95, 48, 95);
  ctx.fillRect(x + 58, groundY - 145, 42, 145);
  ctx.strokeRect(x + 58, groundY - 145, 42, 145);
  ctx.restore();
}

function drawArenaPortalArch(ctx, x, groundY, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(x, groundY - 80, 80, Math.PI, 0);
  ctx.stroke();

  // Swirling vortex inner glow
  const vortexGrad = ctx.createRadialGradient(x, groundY - 80, 10, x, groundY - 80, 75);
  vortexGrad.addColorStop(0, 'rgba(66, 245, 108, 0.35)');
  vortexGrad.addColorStop(1, 'rgba(66, 245, 108, 0)');
  ctx.fillStyle = vortexGrad;
  ctx.fill();

  ctx.font = 'bold 12px Orbitron, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText('⚡ ARENA DE JEFE ⚡', x, groundY - 175);
  ctx.restore();
}

function drawForegroundAtmospherics(ctx, width, height, groundY, levelId) {
  ctx.save();

  // 1. Rolling Floor Fog / Mist
  const fogGrad = ctx.createLinearGradient(0, groundY - 20, 0, height);
  if (levelId === 1) {
    fogGrad.addColorStop(0, 'rgba(66, 245, 108, 0)');
    fogGrad.addColorStop(1, 'rgba(66, 245, 108, 0.12)');
  } else if (levelId === 2) {
    fogGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
    fogGrad.addColorStop(1, 'rgba(34, 211, 238, 0.1)');
  } else {
    fogGrad.addColorStop(0, 'rgba(192, 132, 252, 0)');
    fogGrad.addColorStop(1, 'rgba(192, 132, 252, 0.14)');
  }
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, groundY - 20, width, height - groundY + 20);

  // 2. Cinematic Vignette (Dark Corners)
  const vigGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.35,
    width / 2,
    height / 2,
    width * 0.65
  );
  vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * =========================================================================
 * PS2-ERA CEL-SHADED ARTICULATED CHARACTER MODELS (NO SQUARE PHOTO BOXES)
 * =========================================================================
 */

function drawPS2CelShadedRick(ctx, p) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer, blinkTimer } = p;
  const isMoving = Math.abs(p.vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;
  const bobbing = onGround && isMoving ? Math.sin(legCycle * 2) * 2.8 : Math.sin(Date.now() / 350) * 1.2;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + bobbing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // 1. BILLOWING WHITE LAB COAT (Split Tails with Realistic Cloth Physics & Inner Lining)
  ctx.save();
  const coatSweep = isMoving ? Math.sin(legCycle) * 16 + Math.abs(p.vx) * 3.5 : 0;
  const jumpBillow = !onGround ? 10 : 0;

  // Outer white coat
  const coatGrad = ctx.createLinearGradient(-10, 8, -22, 32);
  coatGrad.addColorStop(0, '#ffffff');
  coatGrad.addColorStop(0.7, '#f1f5f9');
  coatGrad.addColorStop(1, '#cbd5e1');

  ctx.fillStyle = coatGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.lineTo(-24 - coatSweep, 30 - jumpBillow);
  ctx.lineTo(-18 - coatSweep * 0.7, 32 - jumpBillow);
  ctx.lineTo(-8, 30);
  ctx.lineTo(-4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. LONG LANKY LEGS (Dark Brown Slacks #78350f + White Socks + Penny Loafers)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.62 : -0.32;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.62 : 0.42;

  // Left Leg
  ctx.save();
  ctx.translate(-5, 14);
  ctx.rotate(leftLegAngle);
  // Slacks
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-2.5, 0, 5, 14);
  ctx.strokeRect(-2.5, 0, 5, 14);
  // Knee crease
  ctx.strokeStyle = '#581c87';
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.lineTo(2, 7);
  ctx.stroke();
  // Exposed White Sock
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.5, 11, 5, 2.5);
  // Black Penny Loafer Shoe
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-3, 13, 8, 4.5, [1, 2, 2, 1]);
  ctx.fill();
  ctx.restore();

  // Right Leg
  ctx.save();
  ctx.translate(5, 14);
  ctx.rotate(rightLegAngle);
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-2.5, 0, 5, 14);
  ctx.strokeRect(-2.5, 0, 5, 14);
  ctx.strokeStyle = '#581c87';
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.lineTo(2, 7);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.5, 11, 5, 2.5);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-3, 13, 8, 4.5, [1, 2, 2, 1]);
  ctx.fill();
  ctx.restore();

  // 3. TORSO (Lab Coat Front + Notched Lapels + Turquoise Undershirt + Belt with Brass Buckle)
  // Lab coat body
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-10, -10, 20, 24);
  ctx.strokeRect(-10, -10, 20, 24);

  // Turquoise shirt (#06b6d4 / #22d3ee)
  const shirtGrad = ctx.createLinearGradient(0, -10, 0, 10);
  shirtGrad.addColorStop(0, '#22d3ee');
  shirtGrad.addColorStop(1, '#0891b2');
  ctx.fillStyle = shirtGrad;
  ctx.beginPath();
  ctx.moveTo(-4.5, -10);
  ctx.lineTo(4.5, -10);
  ctx.lineTo(3.5, 10);
  ctx.lineTo(-3.5, 10);
  ctx.closePath();
  ctx.fill();

  // Lab coat open lapel collars
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(-4.5, -2);
  ctx.lineTo(-10, 4);
  ctx.moveTo(10, -8);
  ctx.lineTo(4.5, -2);
  ctx.lineTo(10, 4);
  ctx.stroke();

  // Breast pocket with black and red pen
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -4, 4, 5);
  // Red pen
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-7, -6, 1.2, 2.5);
  // Black pen
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-5.5, -6, 1.2, 2.5);

  // Dark Belt with Golden Brass Buckle
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-9, 10, 18, 3.5);
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1;
  ctx.strokeRect(-2.5, 9.5, 5, 4.5);
  ctx.fillRect(-2, 10, 4, 3.5);

  // 4. ARMS & CANONICAL C-137 PORTAL GUN
  const recoilOffset = recoilTimer > 0 ? -recoilTimer : 0;
  ctx.save();
  ctx.translate(9 + recoilOffset, -2);

  // Arm with lab coat sleeve and cuff crease
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-6, -4, 11, 5.5);
  ctx.strokeRect(-6, -4, 11, 5.5);

  // Portal Gun Casing (Brushed Steel Chassis)
  const gunGrad = ctx.createLinearGradient(0, -5, 0, 5);
  gunGrad.addColorStop(0, '#f8fafc');
  gunGrad.addColorStop(0.5, '#cbd5e1');
  gunGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = gunGrad;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(1, -4, 15, 6.5, [1, 2, 2, 1]);
  ctx.fill();
  ctx.stroke();

  // Muzzle front nozzle
  ctx.fillStyle = '#475569';
  ctx.fillRect(15, -3, 3.5, 4.5);

  // Glowing Green Portal Fluid Chamber (Glass tube with internal bubbles & glare)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, -9, 8, 5);

  const fluidGrad = ctx.createLinearGradient(4, -9, 12, -4);
  fluidGrad.addColorStop(0, '#4ade80');
  fluidGrad.addColorStop(1, '#16a34a');
  ctx.fillStyle = fluidGrad;
  ctx.shadowColor = '#39ff14';
  ctx.shadowBlur = 12;
  ctx.fillRect(4.5, -8.5, 7, 4);
  ctx.shadowBlur = 0;

  // Tiny rising bubbles in portal fluid
  const bubbleY = -6.5 + Math.sin(Date.now() / 150) * 1.5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(6.5, bubbleY, 0.8, 0, Math.PI * 2);
  ctx.arc(9.5, bubbleY - 1, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Red Rear Antenna Indicator Button
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 0.8;
  ctx.fillRect(2, -9.5, 2, 5.5);
  ctx.beginPath();
  ctx.arc(3, -9.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Rick's Slender Hand with articulated fingers
  ctx.fillStyle = '#fee2e2';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(3, -1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 5. RICK HEAD & AUTHENTIC 14-SPIKE RADIAL HAIR
  // Hair Spikes Background (14 distinct asymmetric spikes with cel-shading)
  const hairGrad = ctx.createRadialGradient(0, -22, 10, 0, -22, 26);
  hairGrad.addColorStop(0, '#cffafe');
  hairGrad.addColorStop(0.7, '#a5f3fc');
  hairGrad.addColorStop(1, '#0891b2');
  ctx.fillStyle = hairGrad;
  ctx.strokeStyle = '#0891b2';
  ctx.lineWidth = 1.6;

  // Precise Starburns Model Sheet Spike Radians
  const spikeAngles = [
    -Math.PI * 0.95, -Math.PI * 0.82, -Math.PI * 0.68, -Math.PI * 0.54,
    -Math.PI * 0.42, -Math.PI * 0.28, -Math.PI * 0.15, -Math.PI * 0.02,
    Math.PI * 0.1, Math.PI * 0.22, Math.PI * 0.35, Math.PI * 0.48,
    Math.PI * 0.62, Math.PI * 0.78
  ];

  ctx.beginPath();
  ctx.moveTo(0, -22);
  spikeAngles.forEach((angle) => {
    const tipDist = 23 + (Math.abs(Math.sin(angle * 3)) * 4);
    const tipX = Math.cos(angle) * tipDist;
    const tipY = -22 + Math.sin(angle) * tipDist;
    ctx.lineTo(tipX, tipY);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rick Head Oval (Elongated jawline & pale skin)
  ctx.fillStyle = '#fee2e2';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -20, 11, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bald hairline arc above forehead
  ctx.strokeStyle = '#0891b2';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -22, 11.2, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.stroke();

  // Forehead Cynical Wrinkles (2 age lines)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -28, 6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -26, 7, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  // Bold Arched Cyan Unibrow (#0891b2)
  ctx.strokeStyle = '#0891b2';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-8, -25);
  ctx.quadraticCurveTo(0, -26.5, 8, -25);
  ctx.stroke();

  // Under-eye bags
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-4.5, -19, 4, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4.5, -19, 4, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Eyes with blinking
  const isBlinking = blinkTimer > 172;
  if (!isBlinking) {
    // Left eye
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4.5, -20, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right eye
    ctx.beginPath();
    ctx.arc(4.5, -20, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupils (Tracking facing direction with specular white dot)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3.8, -20, 1.2, 0, Math.PI * 2);
    ctx.arc(5.2, -20, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.2, -20.5, 0.4, 0, Math.PI * 2);
    ctx.arc(4.8, -20.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-7, -20);
    ctx.lineTo(-2, -20);
    ctx.moveTo(2, -20);
    ctx.lineTo(7, -20);
    ctx.stroke();
  }

  // Slender Nose
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.lineTo(1.5, -17.5);
  ctx.lineTo(0, -16.5);
  ctx.stroke();

  // Cynical Smirk Mouth with Teeth
  ctx.fillStyle = '#450a0a';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -12, 4.5, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // White teeth line
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.5, -12, 5, 1.4);

  // Fluorescent Green Toxic Drool on lower chin
  ctx.fillStyle = '#39ff14';
  ctx.shadowColor = '#39ff14';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(1, -12);
  ctx.lineTo(3.5, -12);
  ctx.lineTo(3, -7.5);
  ctx.lineTo(1.5, -7.5);
  ctx.closePath();
  ctx.fill();

  // Droplet tear
  ctx.beginPath();
  ctx.arc(2.2, -6.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawPS2CelShadedMorty(ctx, p) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer, skillActiveTimer, blinkTimer } = p;
  const isMoving = Math.abs(p.vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;
  const bobbing = onGround && isMoving ? Math.sin(legCycle * 2) * 2.8 : Math.sin(Date.now() / 300) * 1.2;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + bobbing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // Death Crystal Matrix Aura (When Morty skill is active)
  if (skillActiveTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, -4, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Geometric matrix lines
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
    ctx.lineWidth = 1.5;
    for (let m = 0; m < 6; m++) {
      const angle = (m * Math.PI) / 3 + Date.now() / 400;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 18 - 4);
      ctx.lineTo(Math.cos(angle) * 28, Math.sin(angle) * 28 - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 1. LEGS (Straight-Cut Blue Jeans #1d4ed8 with Ankle Turn-Up Cuffs + White Sneakers)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.6 : -0.25;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.6 : 0.35;

  // Left Leg
  ctx.save();
  ctx.translate(-4, 11);
  ctx.rotate(leftLegAngle);
  // Denim jeans
  ctx.fillStyle = '#1d4ed8';
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-2.5, 0, 5, 11);
  ctx.strokeRect(-2.5, 0, 5, 11);
  // Ankle Cuff
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(-2.5, 9, 5, 2);
  // White Sneaker with grey sole
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-3, 10.5, 7.5, 4.5, [1, 2, 2, 1]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-3, 14, 7.5, 1.2);
  ctx.restore();

  // Right Leg
  ctx.save();
  ctx.translate(4, 11);
  ctx.rotate(rightLegAngle);
  ctx.fillStyle = '#1d4ed8';
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-2.5, 0, 5, 11);
  ctx.strokeRect(-2.5, 0, 5, 11);
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(-2.5, 9, 5, 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-3, 10.5, 7.5, 4.5, [1, 2, 2, 1]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-3, 14, 7.5, 1.2);
  ctx.restore();

  // 2. ICONIC YELLOW T-SHIRT (Subtle Cel-Shaded Folds)
  const shirtGrad = ctx.createLinearGradient(0, -9, 0, 11);
  shirtGrad.addColorStop(0, '#fef08a');
  shirtGrad.addColorStop(0.6, '#facc15');
  shirtGrad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = shirtGrad;
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-9, -9, 18, 20, 4);
  ctx.fill();
  ctx.stroke();

  // Crew-neck collar line
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -9, 4, 0, Math.PI);
  ctx.stroke();

  // 3. TWO-HANDED BLASTER GRIP (Anxious combat stance)
  const recoilOffset = recoilTimer > 0 ? -recoilTimer : 0;
  ctx.save();
  ctx.translate(7 + recoilOffset, -1);

  // Arms holding blaster with two hands
  ctx.fillStyle = '#ffedd5';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-2, 0, 3, 0, Math.PI * 2);
  ctx.arc(2, 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Morty's Sci-Fi Plasma Blaster
  const blasterGrad = ctx.createLinearGradient(2, -4, 13, 2);
  blasterGrad.addColorStop(0, '#94a3b8');
  blasterGrad.addColorStop(1, '#475569');
  ctx.fillStyle = skillActiveTimer > 0 ? '#c084fc' : blasterGrad;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(2, -4, 11, 5.5, [1, 2, 2, 1]);
  ctx.fill();
  ctx.stroke();

  // Glowing Plasma Muzzle Tip
  ctx.fillStyle = skillActiveTimer > 0 ? '#e9d5ff' : '#facc15';
  ctx.shadowColor = skillActiveTimer > 0 ? '#c084fc' : '#facc15';
  ctx.shadowBlur = 6;
  ctx.fillRect(12, -3, 3, 3.5);
  ctx.shadowBlur = 0;
  ctx.restore();

  // 4. ROUND HEAD & SCALLOPED CURLY BROWN HAIR
  // Voluminous curly brown hair mop with textured curves
  ctx.fillStyle = '#854d0e';
  ctx.strokeStyle = '#582f0e';
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  // Hair contour with scalloped curly bumps
  ctx.arc(0, -18, 13.5, -Math.PI * 0.9, -Math.PI * 0.1);
  ctx.arc(6, -24, 4.5, 0, Math.PI * 2);
  ctx.arc(-2, -26, 5, 0, Math.PI * 2);
  ctx.arc(-8, -23, 4.5, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Morty's Perfectly Round Spherical Face
  ctx.fillStyle = '#ffedd5';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -15, 11.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair bangs on forehead
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.arc(-5, -23, 3.5, 0, Math.PI);
  ctx.arc(2, -24, 4, 0, Math.PI);
  ctx.fill();

  // Anxious upward-tilted eyebrows
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, -21.5);
  ctx.lineTo(-2, -22.5); // Angled upward in worry
  ctx.moveTo(2, -22.5);
  ctx.lineTo(6, -21.5);
  ctx.stroke();

  // Big Wide Anxious Eyes
  const isBlinking = blinkTimer > 172;
  if (!isBlinking) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4, -15, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(4, -15, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Nervous jittery black pupil dots
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3.4, -15, 1.4, 0, Math.PI * 2);
    ctx.arc(4.6, -15, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -15);
    ctx.lineTo(-1.5, -15);
    ctx.moveTo(1.5, -15);
    ctx.lineTo(6, -15);
    ctx.stroke();
  }

  // Morty's Round Nose
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -13, 1.5, 0, Math.PI);
  ctx.stroke();

  // Morty's Classic Trembling Wavy '3'-Shaped / Frown Mouth
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3.5, -8.5);
  ctx.quadraticCurveTo(-1.5, -10, 0, -8.5);
  ctx.quadraticCurveTo(1.5, -10, 3.5, -8.5);
  ctx.stroke();

  // Nervous Cold Sweat Droplet on Temple
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(-8.5, -19.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Death Crystal Embedded in Forehead (When Skill Active)
  if (skillActiveTimer > 0) {
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(3.5, -21.5);
    ctx.lineTo(0, -18);
    ctx.lineTo(-3.5, -21.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * =========================================================================
 * 100% RIGGED 2D ANIMATED ENEMY ROUTINES (CEL-SHADED NO SQUARE PHOTOS)
 * =========================================================================
 */
function drawAnimatedEnemyCharacter(ctx, en, levelId) {
  const { x, y, width, height, isBoss, type, subType, runCycle, isFrenzied, facing } = en;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);

  // Flip horizontally if facing right to look, aim and shoot backwards!
  if (facing === 'right') {
    ctx.scale(-1, 1);
  }

  if (isBoss) {
    if (levelId === 1) {
      drawAlphaMeeseeksBoss(ctx, width, height, runCycle, en.phase);
    } else if (levelId === 2) {
      drawCyberBirdpersonBoss(ctx, width, height, runCycle, en.phase);
    } else {
      drawEvilMortyBoss(ctx, width, height, runCycle, en.phase);
    }
  } else if (type === 'flying') {
    drawCyberBirdDrone(ctx, runCycle);
  } else if (subType === 'gromflomite') {
    drawGromflomiteTrooper(ctx, runCycle);
  } else {
    drawMeeseeksWalker(ctx, runCycle, isFrenzied);
  }

  ctx.restore();
}

function drawMeeseeksWalker(ctx, runCycle, isFrenzied) {
  const legAngle = Math.sin(runCycle) * 0.6;
  const armAngle = -Math.sin(runCycle) * 0.65;

  // Frenzy Aura particles
  if (isFrenzied) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Moving Noodle Legs
  ctx.strokeStyle = isFrenzied ? '#ef4444' : '#0284c7';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-6 - legAngle * 14, 24);
  ctx.moveTo(6, 8);
  ctx.lineTo(6 + legAngle * 14, 24);
  ctx.stroke();

  // Feet
  ctx.fillStyle = isFrenzied ? '#991b1b' : '#0369a1';
  ctx.fillRect(-9 - legAngle * 14, 23, 7, 3);
  ctx.fillRect(3 + legAngle * 14, 23, 7, 3);

  // Slender Blue Torso with Cel-Shading
  const torsoGrad = ctx.createLinearGradient(-7, -8, 7, 10);
  torsoGrad.addColorStop(0, isFrenzied ? '#f87171' : '#7dd3fc');
  torsoGrad.addColorStop(1, isFrenzied ? '#dc2626' : '#0284c7');
  ctx.fillStyle = torsoGrad;
  ctx.fillRect(-7, -8, 14, 18);

  // Wild Noodle Arms
  ctx.strokeStyle = isFrenzied ? '#ef4444' : '#0284c7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-14 + armAngle * 12, 8);
  ctx.moveTo(7, -4);
  ctx.lineTo(14 - armAngle * 12, 8);
  ctx.stroke();

  // Round Head
  ctx.fillStyle = isFrenzied ? '#f87171' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, -16, 12, 0, Math.PI * 2);
  ctx.fill();

  // Orange Hair Tuft
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(0, -28, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (Crimson in Frenzy)
  ctx.fillStyle = isFrenzied ? '#ef4444' : '#ffffff';
  ctx.beginPath();
  ctx.arc(-4, -17, 3, 0, Math.PI * 2);
  ctx.arc(4, -17, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-4, -17, 1.2, 0, Math.PI * 2);
  ctx.arc(4, -17, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Frantic Open Smile
  ctx.fillStyle = isFrenzied ? '#450a0a' : '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI);
  ctx.fill();
}

function drawGromflomiteTrooper(ctx, runCycle) {
  const legAngle = Math.sin(runCycle) * 0.5;

  // Segmented Insectoid Chitin Legs
  ctx.strokeStyle = '#3f6212';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-8 - legAngle * 10, 24);
  ctx.moveTo(6, 8);
  ctx.lineTo(8 + legAngle * 10, 24);
  ctx.stroke();

  // Carapace Armor Body with Cel-Shading
  const chitinGrad = ctx.createLinearGradient(-10, -10, 10, 12);
  chitinGrad.addColorStop(0, '#65a30d');
  chitinGrad.addColorStop(1, '#365314');
  ctx.fillStyle = chitinGrad;
  ctx.fillRect(-9, -10, 18, 20);

  // Federation Chest Emblem
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, -6, 4, 5);

  // Laser Rifle in hands
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, 0, 18, 5);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-20, 1, 3, 3); // Muzzle

  // Insectoid Head & Curved Antennae
  ctx.fillStyle = '#4d7c0f';
  ctx.beginPath();
  ctx.ellipse(0, -18, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = '#65a30d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -28);
  ctx.lineTo(-8, -36);
  ctx.moveTo(4, -28);
  ctx.lineTo(8, -36);
  ctx.stroke();

  // Bug Compound Visor Eyes (Purple/Red)
  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(-4, -18, 3.5, 0, Math.PI * 2);
  ctx.arc(4, -18, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCyberBirdDrone(ctx, runCycle) {
  const wingFlap = Math.sin(runCycle * 1.8) * 12;

  // Feathered / Cyber Wings Flapping
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(-24, -8 + wingFlap);
  ctx.lineTo(-8, 2);
  ctx.lineTo(0, -6);
  ctx.lineTo(8, 2);
  ctx.lineTo(24, -8 + wingFlap);
  ctx.lineTo(14, -16 + wingFlap);
  ctx.lineTo(0, -12);
  ctx.lineTo(-14, -16 + wingFlap);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dual Jet Thruster Flare (Blue core to Orange heat)
  const flareGrad = ctx.createLinearGradient(0, 10, 0, 25);
  flareGrad.addColorStop(0, '#38bdf8');
  flareGrad.addColorStop(0.5, '#f97316');
  flareGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = flareGrad;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 22 + Math.random() * 5);
  ctx.lineTo(5, 12);
  ctx.fill();

  // Cyber Bird Body
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red Visor Optical Eye
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6;
  ctx.fillRect(-6, -6, 12, 3.5);
  ctx.shadowBlur = 0;
}

function drawAlphaMeeseeksBoss(ctx, width, height, runCycle, phase) {
  const stomp = Math.sin(runCycle) * 0.4;
  const isPhase2 = phase === 2;

  // Massive Muscular Blue Body with Cel-Shading
  const bodyGrad = ctx.createLinearGradient(0, -height / 2.8, 0, height / 2);
  bodyGrad.addColorStop(0, isPhase2 ? '#1e3a8a' : '#0369a1');
  bodyGrad.addColorStop(1, isPhase2 ? '#0f172a' : '#075985');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-width / 2.5, -height / 2.8, width * 0.8, height * 0.75, 12);
  ctx.fill();

  // Pectoral and Abdominal Muscle Striations
  ctx.strokeStyle = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.lineTo(0, 2);
  ctx.lineTo(16, -6);
  ctx.moveTo(0, 2);
  ctx.lineTo(0, 22);
  ctx.stroke();

  // Huge Flexing Arms
  ctx.fillStyle = isPhase2 ? '#1e40af' : '#0284c7';
  ctx.beginPath();
  ctx.arc(-width / 2.2, -4 + stomp * 6, 15, 0, Math.PI * 2);
  ctx.arc(width / 2.2, -4 - stomp * 6, 15, 0, Math.PI * 2);
  ctx.fill();

  // Giant Stomping Legs
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-22, height / 3, 14, 16 + stomp * 6);
  ctx.fillRect(8, height / 3, 14, 16 - stomp * 6);

  // Glowing Electric Eyes (Cyan or Crimson)
  ctx.fillStyle = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowColor = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(-10, -22, 6.5, 0, Math.PI * 2);
  ctx.arc(10, -22, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Big Orange Hair Tuft
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(0, -42, 8.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCyberBirdpersonBoss(ctx, width, height, runCycle, phase) {
  const wingFlap = Math.sin(runCycle * 1.5) * 16;
  const isPhase2 = phase === 2;

  // Giant Articulated Cybernetic Wings
  ctx.fillStyle = isPhase2 ? '#1e293b' : '#475569';
  ctx.beginPath();
  ctx.moveTo(-width * 0.72, -16 + wingFlap);
  ctx.lineTo(0, -10);
  ctx.lineTo(width * 0.72, -16 + wingFlap);
  ctx.lineTo(width * 0.45, 16);
  ctx.lineTo(0, 8);
  ctx.lineTo(-width * 0.45, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Mechanical Armor Body with Reactor Core
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chest Plasma Reactor Core
  ctx.fillStyle = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowColor = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Laser Eye Visor
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  ctx.fillRect(-8, -15, 16, 5);
  ctx.shadowBlur = 0;
}

function drawEvilMortyBoss(ctx, width, height, runCycle, phase) {
  const isPhase2 = phase === 2;

  // 1. Citadel President Suit & Billowing Dual-Tone Cape
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  const capeFlap = Math.sin(runCycle) * 8;
  ctx.moveTo(-16, -10);
  ctx.lineTo(-26 - capeFlap, 32);
  ctx.lineTo(26 + capeFlap, 32);
  ctx.lineTo(16, -10);
  ctx.closePath();
  ctx.fill();

  // Inner purple cape lining
  ctx.fillStyle = '#4c1d95';
  ctx.beginPath();
  ctx.moveTo(-12, 10);
  ctx.lineTo(-22 - capeFlap, 32);
  ctx.lineTo(22 + capeFlap, 32);
  ctx.lineTo(12, 10);
  ctx.closePath();
  ctx.fill();

  // 2. Yellow Shirt & Black Tie
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-10, -8, 20, 24);
  ctx.fillStyle = '#020617';
  ctx.fillRect(-2, -6, 4, 14);

  // 3. Head & Hair
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffedd5';
  ctx.beginPath();
  ctx.arc(0, -15, 12, 0, Math.PI * 2);
  ctx.fill();

  // 4. Iconic Golden Eye Patch with Holographic Crosshairs
  ctx.fillStyle = '#eab308';
  ctx.shadowColor = '#eab308';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(5, -16, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Other Cold Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-5, -16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-5, -16, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Orbiting Dark Matter Dimensional Turret & Defensive Barrier
  const orbitAngle = Date.now() / 400;
  const turretX = Math.cos(orbitAngle) * 36;
  const turretY = Math.sin(orbitAngle) * 16 - 10;

  // Barrier Shield (Frontal in Phase 1, Dual in Phase 2)
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(-22, 0, 24, Math.PI * 0.7, Math.PI * 1.3);
  ctx.stroke();

  if (isPhase2) {
    ctx.beginPath();
    ctx.arc(22, 0, 24, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Floating Dark Matter Turret
  ctx.fillStyle = '#7c3aed';
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(turretX, turretY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Turret barrel
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(turretX - 14, turretY - 2, 10, 4);
}
