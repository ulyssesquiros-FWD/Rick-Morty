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
      blinkTimer: 0,
      pickleRickTimer: 0
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
    comboTimer: 0,
    movingPlatforms: (levelConfig?.movingPlatforms || []).map((mp) => ({ ...mp })),
    steamVents: (levelConfig?.steamVents || []).map((sv) => ({ ...sv, timer: 0 })),
    acidHazards: (levelConfig?.acidHazards || []).map((ah) => ({ ...ah })),
    breakableCrates: (levelConfig?.breakableCrates || []).map((bc) => ({ ...bc, maxHealth: bc.health }))
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

    
    if (p.pickleRickTimer > 0) {
      // Pickle Rick: "RAT GROUND SLAM & AA-BATTERY OVERCHARGE"
      soundManager.playPickleRoar();
      soundManager.playCrateBreak();
      soundManager.playLaser();
      p.skillCooldown = 180; // 3s cooldown
      p.invulnerableTimer = 45;
      state.screenShake = 16;

      const groundY = 432;

      // Slam down immediately if in mid-air
      if (!p.onGround) {
        p.vy = 18;
      }

      const slamX = p.x + p.width / 2;
      const slamY = p.y + p.height;

      // Shockwaves traveling left and right
      soundManager.playShockwave();
      state.shockwaves.push({
        x: slamX,
        y: groundY - 10,
        vx: 6.8,
        width: 36,
        height: 26,
        life: 80,
        maxLife: 80,
        color: '#ef4444'
      });
      state.shockwaves.push({
        x: slamX,
        y: groundY - 10,
        vx: -6.8,
        width: 36,
        height: 26,
        life: 80,
        maxLife: 80,
        color: '#ef4444'
      });

      // Impact explosion particles
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 6;
        state.particles.push({
          x: slamX,
          y: slamY - 8,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 30 + Math.random() * 18,
          maxLife: 45,
          color: Math.random() < 0.5 ? '#ef4444' : '#42f56c',
          size: 3 + Math.random() * 4
        });
      }

      // Massive area damage to all enemies within 340px
      state.enemies.forEach((en) => {
        const dist = Math.abs(en.x - p.x);
        if (dist < 340) {
          en.health -= 120;
          soundManager.playEnemyHit();
          state.floatingTexts.push({
            text: 'RAT SLAM! -120 🥒💥',
            x: en.x,
            y: en.y - 20,
            vy: -1.4,
            alpha: 1.0,
            life: 45,
            color: '#ef4444'
          });
        }
      });

      // 5-way fan spread of high-voltage battery laser beams
      const facingDir = p.facing === 'right' ? 1 : -1;
      const laserStartX = p.facing === 'right' ? p.x + p.width + 6 : p.x - 22;
      const laserStartY = p.y + p.height / 2;
      for (let s = -2; s <= 2; s++) {
        state.bullets.push({
          x: laserStartX,
          y: laserStartY + s * 7,
          vx: facingDir * 16,
          vy: s * 2.2,
          width: 32,
          height: 10,
          color: '#ef4444',
          damage: 75,
          isCritical: true,
          isPickleLaser: true
        });
      }

      state.floatingTexts.push({
        text: "¡I'M PICKLE RICK! 🥒⚡",
        x: p.x - 25,
        y: p.y - 32,
        vy: -1.2,
        alpha: 1.0,
        life: 55,
        color: '#42f56c'
      });
      return;
    } else if (p.character === 'rick') {
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

    const jumpForce = p.pickleRickTimer > 0 ? charConf.jumpForce * 1.15 : charConf.jumpForce;
    if (p.onGround) {
      p.vy = jumpForce;
      p.onGround = false;
      p.jumpCount = 1;
      soundManager.playJump(false);
    } else if (p.jumpCount === 1) {
      // DOUBLE JUMP in mid-air
      p.vy = jumpForce * 0.94;
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
      soundManager.pauseMusic();
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
      const isPickle = p.pickleRickTimer > 0;
      const speedMultiplier = (p.skillActiveTimer > 0 ? 1.55 : 1.0) * (isPickle ? 1.45 : 1.0);
      const effectiveMoveSpeed = charConf.moveSpeed * speedMultiplier;

      // Cooldowns and timers
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.invulnerableTimer > 0) p.invulnerableTimer--;
      if (p.skillCooldown > 0) p.skillCooldown--;
      if (p.skillActiveTimer > 0) p.skillActiveTimer--;
      if (p.portalSwapTimer > 0) p.portalSwapTimer--;
      if (p.recoilTimer > 0) p.recoilTimer--;
      if (p.pickleRickTimer > 0) {
        p.pickleRickTimer--;
        // Pickle Rick cellular regeneration: restores 25 HP (+1 hit) every 2 seconds (120 frames)
        if (p.pickleRickTimer > 0 && p.pickleRickTimer % 120 === 0 && onHealPlayer) {
          onHealPlayer(25);
          soundManager.playPowerup();
          addFloatingText('🥒 +25 HP REGENERADO', p.x - 10, p.y - 25, '#42f56c');
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#42f56c', 10);
        }
      }
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

      
      // Moving Platforms Physics & Collision
      state.movingPlatforms.forEach((mp) => {
        if (mp.axis === 'x') {
          mp.x += mp.speed * mp.dir;
          if (mp.x <= mp.minX) {
            mp.x = mp.minX;
            mp.dir = 1;
          } else if (mp.x >= mp.maxX) {
            mp.x = mp.maxX;
            mp.dir = -1;
          }
        } else {
          mp.y += mp.speed * mp.dir;
          if (mp.y <= mp.minY) {
            mp.y = mp.minY;
            mp.dir = 1;
          } else if (mp.y >= mp.maxY) {
            mp.y = mp.maxY;
            mp.dir = -1;
          }
        }

        // Platform collision & transport
        if (
          p.x + p.width > mp.x &&
          p.x < mp.x + mp.width &&
          p.y + p.height >= mp.y &&
          p.y + p.height <= mp.y + 16 &&
          p.vy >= 0
        ) {
          p.y = mp.y - p.height;
          p.vy = 0;
          p.onGround = true;
          p.jumpCount = 0;
          if (mp.axis === 'x') {
            p.x += mp.speed * mp.dir;
          } else {
            p.y += mp.speed * mp.dir;
          }
        }
      });

      // Steam Vents (Geothermal Catapults)
      state.steamVents.forEach((sv) => {
        sv.timer = (sv.timer || 0) + 1;
        if (
          p.x + p.width > sv.x &&
          p.x < sv.x + sv.width &&
          p.y + p.height >= GROUND_Y - 14
        ) {
          p.vy = sv.force || -17.5;
          p.onGround = false;
          soundManager.playSteamVent();
          state.screenShake = 6;
          addFloatingText('¡PROPULSIÓN GÉISER!', p.x - 14, p.y - 18, '#38bdf8');
          for (let k = 0; k < 14; k++) {
            state.particles.push({
              x: sv.x + sv.width / 2 + (Math.random() - 0.5) * 20,
              y: GROUND_Y - 4,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 8 - 4,
              size: Math.random() * 6 + 3,
              color: 'rgba(255, 255, 255, 0.7)',
              life: 25,
              maxLife: 25
            });
          }
        }
      });

      // Toxic Acid Hazards on Ground
      state.acidHazards.forEach((ah) => {
        if (
          p.x + p.width > ah.x &&
          p.x < ah.x + ah.width &&
          p.y + p.height >= GROUND_Y - 6
        ) {
          if (isPickle) {
            // Pickle Rick is immune to sewer toxic acid! Bounces effortlessly
            if (p.vy >= 0) {
              p.vy = -10.5;
              soundManager.playSteamVent();
              addFloatingText('🥒 ¡INMUNE AL ÁCIDO!', p.x - 10, p.y - 18, '#42f56c');
              createExplosion(p.x + p.width / 2, GROUND_Y - 4, '#42f56c', 12);
            }
          } else if (p.invulnerableTimer === 0) {
            p.invulnerableTimer = 50;
            p.vy = -8.5;
            soundManager.playPlayerHurt();
            state.screenShake = 8;
            onPlayerDamage(ah.damage || 25);
            addFloatingText('¡ÁCIDO TÓXICO! -1 GOLPE', p.x - 20, p.y - 18, '#22c55e');
            createExplosion(p.x + p.width / 2, GROUND_Y - 4, '#22c55e', 16);
          }
        }
      });

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
          inBossArena: p.x >= BOSS_ARENA_X,
          pickleRickTimer: p.pickleRickTimer || 0
        });
      }

      // Player shooting
      const isFireReady = p.skillActiveTimer > 0 ? p.shootCooldown <= 3 : p.shootCooldown === 0;

      if (keys.shoot && isFireReady) {
        p.recoilTimer = 6;
        const bulletSpeed = p.facing === 'right' ? charConf.bulletSpeed : -charConf.bulletSpeed;
        const startX = p.facing === 'right' ? p.x + p.width + 2 : p.x - 14;
        const startY = p.y + p.height / 2 - 2;

        if (isPickle) {
          soundManager.playLaser();
          // Twin high-voltage AA battery laser cannons
          state.bullets.push({
            x: startX,
            y: startY - 4,
            vx: bulletSpeed * 1.4,
            vy: (Math.random() - 0.5) * 0.2,
            width: 28,
            height: 8,
            color: '#ef4444',
            damage: Math.round(charConf.bulletDamage * 2.2),
            isCritical: true,
            isPickleLaser: true
          });
          state.bullets.push({
            x: startX,
            y: startY + 4,
            vx: bulletSpeed * 1.4,
            vy: (Math.random() - 0.5) * 0.2,
            width: 24,
            height: 6,
            color: '#42f56c',
            damage: Math.round(charConf.bulletDamage * 1.6),
            isCritical: true,
            isPickleLaser: true
          });
          createExplosion(startX, startY, '#ef4444', 8);
          p.shootCooldown = 6; // Ultra fast fire rate
        } else if (p.character === 'rick') {
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
          onPlayerDamage(25);
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
          onPlayerDamage(25);
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
            onPlayerDamage(25);
          }
        }

        if (ob.timer >= ob.warnFrames + ob.fireFrames) {
          state.orbitalBeams.splice(obIndex, 1);
        }
      }

      
      // Check bullets hitting breakable crates
      state.breakableCrates.forEach((bc, bcIdx) => {
        for (let bIdx = state.bullets.length - 1; bIdx >= 0; bIdx--) {
          const b = state.bullets[bIdx];
          if (
            b.x < bc.x + bc.width &&
            b.x + b.width > bc.x &&
            b.y < bc.y + bc.height &&
            b.y + b.height > bc.y
          ) {
            state.bullets.splice(bIdx, 1);
            bc.health--;
            createExplosion(b.x, b.y, '#f59e0b', 8);
            if (bc.health <= 0) {
              soundManager.playCrateBreak();
              createExplosion(bc.x + bc.width / 2, bc.y + bc.height / 2, '#f59e0b', 22);
              const dropType = bc.drop || 'pickle_rick';
              const pwConfig = POWERUP_CONFIG[dropType.toUpperCase()] || POWERUP_CONFIG.PICKLE_RICK;
              state.powerups.push({
                id: dropType,
                x: bc.x + 4,
                y: bc.y - 12,
                vx: (Math.random() - 0.5) * 2,
                vy: -4,
                color: pwConfig.color,
                icon: pwConfig.icon,
                name: pwConfig.name,
                life: 900,
                hoverOffset: 0
              });
              addFloatingText('¡CAJA DESTRUCTIBLE!', bc.x - 20, bc.y - 16, '#facc15');
              state.breakableCrates.splice(bcIdx, 1);
              break;
            }
          }
        }
      });

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
          } else if (pw.id === 'pickle_rick') {
            p.pickleRickTimer = 600;
            soundManager.playPickleRoar();
            if (onScoreBonus) onScoreBonus(500);
            addFloatingText("¡I'M PICKLE RICK! (10s)", p.x, p.y - 20, '#84cc16');
            createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#84cc16', 26);
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
          onPlayerDamage(25);
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

      // Acid Hazards (Toxic Pools)
      state.acidHazards.forEach((ah) => {
        drawAcidHazard(ctx, ah, GROUND_Y);
      });

      // Steam Vents (Catapult Geysers)
      state.steamVents.forEach((sv) => {
        drawSteamVent(ctx, sv, GROUND_Y);
      });

      // Breakable Crates
      state.breakableCrates.forEach((bc) => {
        drawBreakableCrate(ctx, bc);
      });

      // Moving Platforms
      state.movingPlatforms.forEach((mp) => {
        drawMovingPlatform(ctx, mp);
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
      // DYNAMIC 3D GROUND DROP SHADOWS
      // =========================================================
      state.enemies.forEach((en) => {
        draw3DGroundDropShadow(ctx, en.x, en.width, en.y, en.height, GROUND_Y);
      });
      draw3DGroundDropShadow(ctx, comp.x, comp.width, comp.y, comp.height, GROUND_Y);
      draw3DGroundDropShadow(ctx, p.x, p.width, p.y, p.height, GROUND_Y);

      // =========================================================
      // 100% RIGGED 3D VOLUMETRIC ANIMATED ENEMIES (ZERO PHOTO BOXES)
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
        if (p.pickleRickTimer > 0) {
          drawPickleRickExoModel(ctx, p);
        } else if (p.character === 'rick') {
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

    soundManager.startMusic(gameStateRef.current.bossSpawned ? 'boss' : 'level');
    animationFrameIdRef.current = requestAnimationFrame(updateAndRender);

    return () => {
      isRunning = false;
      soundManager.stopMusic();
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
        blinkTimer: 0,
        pickleRickTimer: 0
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
      comboTimer: 0,
      movingPlatforms: (levelConfig?.movingPlatforms || []).map((mp) => ({ ...mp })),
      steamVents: (levelConfig?.steamVents || []).map((sv) => ({ ...sv, timer: 0 })),
      acidHazards: (levelConfig?.acidHazards || []).map((ah) => ({ ...ah })),
      breakableCrates: (levelConfig?.breakableCrates || []).map((bc) => ({ ...bc, maxHealth: bc.health }))
    };
  }, [activeCharacter, levelConfig]);

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
 * 3D VOLUMETRIC CEL-SHADED ARTICULATED CHARACTER MODELS & DROP SHADOWS
 * Inspired by MultiVersus, Fortnite 3D Skins & Console 2.5D Action Games
 * =========================================================================
 */

/**
 * Dynamic 3D Ground Drop Shadow
 * Projects an elliptical ambient occlusion shadow onto the ground (GROUND_Y)
 * that realistically scales down and softens as the entity jumps higher in 3D space.
 */
function draw3DGroundDropShadow(ctx, entityX, entityWidth, entityY, entityHeight, groundY) {
  ctx.save();
  const heightAboveGround = Math.max(0, groundY - (entityY + entityHeight));
  const maxDistance = 220;
  const distanceRatio = Math.min(1, heightAboveGround / maxDistance);

  // Shadow scales down and softens as character jumps higher
  const shadowScale = Math.max(0.32, 1 - distanceRatio * 0.55);
  const shadowAlpha = Math.max(0.1, 0.46 * (1 - distanceRatio * 0.72));
  const shadowRadiusX = (entityWidth * 0.52) * shadowScale;
  const shadowRadiusY = 7.5 * shadowScale;
  const shadowCenterX = entityX + entityWidth / 2;

  const shadowGrad = ctx.createRadialGradient(
    shadowCenterX, groundY, 0,
    shadowCenterX, groundY, shadowRadiusX
  );
  shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
  shadowGrad.addColorStop(0.55, `rgba(0, 0, 0, ${shadowAlpha * 0.55})`);
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, groundY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * =========================================================================
 * MODERN AAA 2.5D PROCEDURAL RIGGED CHARACTER MODELS: RICK & MORTY
 * High-definition skeletal articulation, dynamic cloth physics, expressive
 * emotion engine, fluid particle simulations and weapon recoil kickback.
 * =========================================================================
 */

/**
 * Modern High-Definition Rick Sanchez (C-137)
 * - Dynamic breathing physics & spine lean in sprint
 * - Multi-segment cloth simulation for lab coat tails with dark interior lining
 * - 14-spike 3D faceted hair dome with ambient occlusion and specular ridge creases
 * - Facial rigging: expressive segmented unibrow, glossy 3D eyes, bags, wrinkles, and dynamic hanging drool
 * - C-137 Portal Gun: brushed titanium chassis, transparent Pyrex cylinder with bubbling chroniton plasma,
 *   twin emitter prongs with crackling neon electrical arcs, and heavy recoil shock absorption
 * - Quantum micro-thruster exhaust jets on double jumps
 */
function drawPS2CelShadedRick(ctx, p) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer, blinkTimer, jumpCount = 0 } = p;
  const vx = p.vx || 0;
  const vy = p.vy || 0;
  const isMoving = Math.abs(vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;

  // Dynamic physics variables
  const now = Date.now();
  const breatheCycle = Math.sin(now / 260);
  const idleBob = onGround && !isMoving ? breatheCycle * 1.4 : 0;
  const runBob = onGround && isMoving ? Math.sin(legCycle * 2) * 3.2 : 0;
  const spineLean = isMoving && onGround ? Math.max(-0.22, Math.min(0.22, vx * 0.038)) : 0;
  const jumpSquash = !onGround ? Math.max(-4, Math.min(6, vy * 0.4)) : 0;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + idleBob + runBob);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }
  ctx.rotate(spineLean);

  // 0. QUANTUM MICRO-THRUSTERS (Double Jump Particle Flares)
  if (!onGround && (jumpCount > 1 || vy < -3)) {
    ctx.save();
    const thrusterFlicker = 10 + Math.sin(now / 40) * 4;
    // Left shoe jet
    const jetGradL = ctx.createLinearGradient(-6, 26, -6, 26 + thrusterFlicker);
    jetGradL.addColorStop(0, '#ffffff');
    jetGradL.addColorStop(0.3, '#42f56c');
    jetGradL.addColorStop(0.7, '#06b6d4');
    jetGradL.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = jetGradL;
    ctx.beginPath();
    ctx.moveTo(-9, 26);
    ctx.lineTo(-3, 26);
    ctx.lineTo(-6, 26 + thrusterFlicker);
    ctx.closePath();
    ctx.fill();

    // Right shoe jet
    const jetGradR = ctx.createLinearGradient(6, 26, 6, 26 + thrusterFlicker);
    jetGradR.addColorStop(0, '#ffffff');
    jetGradR.addColorStop(0.3, '#42f56c');
    jetGradR.addColorStop(0.7, '#06b6d4');
    jetGradR.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = jetGradR;
    ctx.beginPath();
    ctx.moveTo(3, 26);
    ctx.lineTo(9, 26);
    ctx.lineTo(6, 26 + thrusterFlicker);
    ctx.closePath();
    ctx.fill();

    // Quantum shock rings
    ctx.strokeStyle = 'rgba(66, 245, 108, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-6, 28, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, 28, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1. DYNAMIC LAB COAT (Multi-Segment Billowing Tails with Interior Lining)
  ctx.save();
  const velocitySweep = Math.abs(vx) * 3.8;
  const wave1 = isMoving ? Math.sin(legCycle) * 16 : Math.sin(now / 320) * 3;
  const wave2 = isMoving ? Math.sin(legCycle + 0.6) * 14 : Math.sin(now / 320 + 0.5) * 3;
  const jumpFlutter = !onGround ? -vy * 1.8 : 0;

  // Background Tail Lining (Deep Slate Depth)
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.quadraticCurveTo(-18 - velocitySweep - wave1, 20 + jumpFlutter, -28 - velocitySweep - wave1, 33 + jumpFlutter);
  ctx.lineTo(-18 - velocitySweep * 0.7, 34 + jumpFlutter);
  ctx.lineTo(-6, 28);
  ctx.closePath();
  ctx.fill();

  // Foreground Tail with Directional Gradient & Hem Stitching
  const coatGrad = ctx.createLinearGradient(-8, 6, -26, 34);
  coatGrad.addColorStop(0, '#ffffff');
  coatGrad.addColorStop(0.5, '#f8fafc');
  coatGrad.addColorStop(0.85, '#e2e8f0');
  coatGrad.addColorStop(1, '#94a3b8');

  ctx.fillStyle = coatGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.quadraticCurveTo(-16 - velocitySweep - wave2, 18 + jumpFlutter, -26 - velocitySweep - wave2, 31 + jumpFlutter);
  ctx.lineTo(-16 - velocitySweep * 0.7, 33 + jumpFlutter);
  ctx.lineTo(-5, 29);
  ctx.lineTo(-2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. SKELETAL ARTICULATED LEGS (Brown Slacks + Ankle Cuffs + White Socks + Loafers)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.64 : -0.35;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.64 : 0.42;

  // Helper: Draw single articulated leg
  const drawRickLeg = (offsetX, legAngle) => {
    ctx.save();
    ctx.translate(offsetX, 13);
    ctx.rotate(legAngle);

    // Thigh and Calf (Volumetric Cylinder)
    const legGrad = ctx.createLinearGradient(-3, 0, 3, 0);
    legGrad.addColorStop(0, '#9a3412');
    legGrad.addColorStop(0.35, '#78350f');
    legGrad.addColorStop(0.8, '#451a03');
    legGrad.addColorStop(1, '#290e02');
    ctx.fillStyle = legGrad;
    ctx.strokeStyle = '#1c0a02';
    ctx.lineWidth = 1.3;

    // Pants Tube
    ctx.fillRect(-2.5, 0, 5.2, 14);
    ctx.strokeRect(-2.5, 0, 5.2, 14);

    // Knee fabric crease
    ctx.strokeStyle = '#290e02';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, 7);
    ctx.lineTo(2, 7.5);
    ctx.stroke();

    // White Sock Cylinder
    const sockGrad = ctx.createLinearGradient(-2.5, 0, 2.5, 0);
    sockGrad.addColorStop(0, '#ffffff');
    sockGrad.addColorStop(0.7, '#e2e8f0');
    sockGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = sockGrad;
    ctx.fillRect(-2.5, 11, 5.2, 3);

    // Penny Loafer (Sleek leather with sole tread & heel)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-3.2, 13.5, 9.2, 5, [1, 2, 2, 1]);
    ctx.fill();

    // Leather Specular Shine on toe cap
    ctx.fillStyle = '#334155';
    ctx.fillRect(1.5, 14, 3.5, 1.2);

    // Dark Rubber Outsole
    ctx.fillStyle = '#020617';
    ctx.fillRect(-3.2, 17.5, 9.2, 1.2);
    ctx.restore();
  };

  drawRickLeg(-5, leftLegAngle, true);
  drawRickLeg(5, rightLegAngle, false);

  // 3. VOLUMETRIC TORSO & LAB COAT BODY
  // Main Lab Coat Front
  const coatBodyGrad = ctx.createLinearGradient(-11, 0, 11, 0);
  coatBodyGrad.addColorStop(0, '#ffffff');
  coatBodyGrad.addColorStop(0.4, '#f8fafc');
  coatBodyGrad.addColorStop(0.8, '#e2e8f0');
  coatBodyGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = coatBodyGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-10.5, -11, 21, 25 + jumpSquash * 0.5);
  ctx.strokeRect(-10.5, -11, 21, 25 + jumpSquash * 0.5);

  // Turquoise Undershirt with Ribbed Neckline
  const shirtGrad = ctx.createLinearGradient(-4.5, 0, 4.5, 0);
  shirtGrad.addColorStop(0, '#67e8f9');
  shirtGrad.addColorStop(0.4, '#06b6d4');
  shirtGrad.addColorStop(0.8, '#0891b2');
  shirtGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = shirtGrad;
  ctx.beginPath();
  ctx.moveTo(-4.5, -11);
  ctx.lineTo(4.5, -11);
  ctx.lineTo(3.5, 10);
  ctx.lineTo(-3.5, 10);
  ctx.closePath();
  ctx.fill();

  // 3D Peak Notched Lapels casting ambient drop shadows onto shirt
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.beginPath();
  ctx.moveTo(-4.5, -11);
  ctx.lineTo(-3.5, 10);
  ctx.lineTo(-2.2, 10);
  ctx.lineTo(-3.2, -11);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10.5, -9);
  ctx.lineTo(-4.5, -2);
  ctx.lineTo(-10.5, 5);
  ctx.moveTo(10.5, -9);
  ctx.lineTo(4.5, -2);
  ctx.lineTo(10.5, 5);
  ctx.stroke();

  // Breast Pocket with Rick's Screwdriver/Laser Pen
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8.5, -4, 4.2, 5.2);
  // Red & Brass Screwdriver
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-7.5, -6.5, 1.4, 3);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-5.8, -6.5, 1.4, 3);

  // Dark Brown Belt with 3D Golden Brass Buckle
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-9.5, 10, 19, 3.8);
  // Brass Buckle Bevel
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1;
  ctx.strokeRect(-3, 9.5, 6, 4.8);
  ctx.fillRect(-2.5, 10, 5, 3.8);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-2.2, 10.3, 2, 1.8);

  // 4. SCI-FI PORTAL GUN C-137 (Ergonomic Grip, Bubbling Pyrex Core & Recoil Kick)
  const recoilOffset = recoilTimer > 0 ? -recoilTimer * 1.5 : 0;
  const recoilAngle = recoilTimer > 0 ? -0.18 : 0;

  ctx.save();
  ctx.translate(9 + recoilOffset, -2);
  ctx.rotate(recoilAngle);

  // Arm Sleeve with Volumetric Cuff
  const armGrad = ctx.createLinearGradient(0, -4, 0, 3);
  armGrad.addColorStop(0, '#ffffff');
  armGrad.addColorStop(0.7, '#f1f5f9');
  armGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = armGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-6, -4, 11, 6);
  ctx.strokeRect(-6, -4, 11, 6);

  // Gun Body (Chamfered Titanium Casing)
  const gunGrad = ctx.createLinearGradient(0, -5, 0, 4);
  gunGrad.addColorStop(0, '#f8fafc');
  gunGrad.addColorStop(0.3, '#cbd5e1');
  gunGrad.addColorStop(0.8, '#475569');
  gunGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = gunGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(1, -4.5, 16, 7.2, [1, 2, 2, 1]);
  ctx.fill();
  ctx.stroke();

  // Front Muzzle Emitter with Dark Aperture
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(16, -3.2, 4, 4.8);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(18.5, -2, 1.8, 2.4);

  // Transparent Pyrex Fluid Chamber with Metallic Endcaps
  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, -10, 8.5, 5.5);

  // Glowing Chroniton Quantum Fluid with Animated Bubbles
  const fluidGrad = ctx.createRadialGradient(8.2, -7.2, 1, 8.2, -7.2, 5.5);
  fluidGrad.addColorStop(0, '#bbf7d0');
  fluidGrad.addColorStop(0.5, '#4ade80');
  fluidGrad.addColorStop(0.85, '#16a34a');
  fluidGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = fluidGrad;
  ctx.shadowColor = '#42f56c';
  ctx.shadowBlur = 14;
  ctx.fillRect(4.5, -9.5, 7.5, 4.5);
  ctx.shadowBlur = 0;

  // Bubbles inside fluid
  const bubble1Y = -8.5 + Math.sin(now / 150) * 1.8;
  const bubble2Y = -6.5 + Math.cos(now / 180) * 1.5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(6.5, bubble1Y, 0.8, 0, Math.PI * 2);
  ctx.arc(9.8, bubble2Y, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Top Red LED Dome with Pulse
  const ledGlow = Math.sin(now / 180) * 3;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(2, -10, 2, 5.5);
  ctx.fillStyle = '#f87171';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6 + ledGlow;
  ctx.beginPath();
  ctx.arc(3, -10, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Electrical Spark Arcs Between Front Emitter Prongs (During Firing)
  if (recoilTimer > 0) {
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(17, -5);
    ctx.lineTo(19, -2);
    ctx.lineTo(21, -4);
    ctx.stroke();

    // Muzzle flash glow
    ctx.fillStyle = 'rgba(66, 245, 108, 0.6)';
    ctx.shadowColor = '#42f56c';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(20, -1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Rick's Slender Fingers Wrapping Handgrip
  ctx.fillStyle = '#fee2e2';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(3.2, -1, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 5. CANONICAL RICK HAIR SILHOUETTE (Exact Show Model Sheet from Starburns Industries)
  ctx.save();
  ctx.fillStyle = '#a6d5e8'; // Canonical periwinkle powder-blue from the series
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;

  ctx.beginPath();
  // Start at front-right sideburn (just behind the eye)
  ctx.moveTo(8.5, -16);
  // Spike 1: Lower front sideburn spike
  ctx.lineTo(16, -18);
  ctx.lineTo(8.5, -21.5);
  // Spike 2: Front temple spike
  ctx.lineTo(17.5, -25.5);
  ctx.lineTo(8, -28);
  // Spike 3: Upper front spike
  ctx.lineTo(16.5, -34);
  ctx.lineTo(6, -32);
  // Spike 4: Front crown spike
  ctx.lineTo(11.5, -40);
  ctx.lineTo(2.5, -34);
  // Spike 5: Top center crown spike (highest point)
  ctx.lineTo(0.5, -44);
  ctx.lineTo(-3.5, -34);
  // Spike 6: Top back spike
  ctx.lineTo(-8.5, -41);
  ctx.lineTo(-7.5, -31);
  // Spike 7: Upper back spike
  ctx.lineTo(-17.5, -35);
  ctx.lineTo(-10, -26);
  // Spike 8: Mid-back upper spike
  ctx.lineTo(-21, -26);
  ctx.lineTo(-10.5, -20);
  // Spike 9: Mid-back lower spike
  ctx.lineTo(-19.5, -18);
  ctx.lineTo(-9.5, -14);
  // Spike 10: Lower back spike
  ctx.lineTo(-16.5, -11.5);
  ctx.lineTo(-8, -8.5);
  // Spike 11: Nape of neck spike
  ctx.lineTo(-12, -5.5);
  ctx.lineTo(-4.5, -6.5);
  // Close behind the skull into the neck
  ctx.lineTo(2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle canonical cel-shade shadow on the lower-back hair spikes
  ctx.fillStyle = 'rgba(138, 192, 214, 0.45)';
  ctx.beginPath();
  ctx.moveTo(-4.5, -6.5);
  ctx.lineTo(-12, -5.5);
  ctx.lineTo(-8, -8.5);
  ctx.lineTo(-16.5, -11.5);
  ctx.lineTo(-9.5, -14);
  ctx.lineTo(-19.5, -18);
  ctx.lineTo(-10.5, -20);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 6. RICK'S CANONICAL HEAD & BALD FOREHEAD DOME
  const headGrad = ctx.createRadialGradient(-3.5, -24, 2, 0, -20, 15);
  headGrad.addColorStop(0, '#ece9df'); // Canonical pale grayish-tan skin
  headGrad.addColorStop(0.55, '#e0ded4');
  headGrad.addColorStop(0.9, '#d6d2c6');
  headGrad.addColorStop(1, '#c5bfb2');
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -20, 11, 14.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bald Hairline Arch Above Forehead (Defining the bare skull)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -22.5, 11.2, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.stroke();

  // Forehead Age Creases
  ctx.strokeStyle = '#9e988d';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -28.5, 6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -26.5, 7, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  // Canonical Powder-Blue Unibrow (Matches hair color with black outline)
  const browTension = recoilTimer > 0 ? 2 : 0;
  ctx.fillStyle = '#a6d5e8';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-8, -25.5 - browTension * 0.5, 16, 2.6, 1);
  ctx.fill();
  ctx.stroke();

  // Bags Under Eyes (Insomnia / Exhaustion)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(-4.5, -19, 4, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4.5, -19, 4, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // 3D Spherical Eyes with Pupils and Highlights
  const isBlinking = blinkTimer > 172;
  if (!isBlinking) {
    // Left Eye Sphere
    const eyeGradL = ctx.createRadialGradient(-5.2, -21, 0.5, -4.5, -20, 3.8);
    eyeGradL.addColorStop(0, '#ffffff');
    eyeGradL.addColorStop(0.85, '#ffffff');
    eyeGradL.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = eyeGradL;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4.5, -20, 3.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right Eye Sphere
    const eyeGradR = ctx.createRadialGradient(3.8, -21, 0.5, 4.5, -20, 3.8);
    eyeGradR.addColorStop(0, '#ffffff');
    eyeGradR.addColorStop(0.85, '#ffffff');
    eyeGradR.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = eyeGradR;
    ctx.beginPath();
    ctx.arc(4.5, -20, 3.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupils Tracking Movement / Facing
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3.8, -20, 1.3, 0, Math.PI * 2);
    ctx.arc(5.2, -20, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Specular Glints
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.2, -20.6, 0.6, 0, Math.PI * 2);
    ctx.arc(4.8, -20.6, 0.6, 0, Math.PI * 2);
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

  // Slender Angular Nose
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.lineTo(1.8, -17.5);
  ctx.lineTo(0, -16.5);
  ctx.stroke();

  // Cynical Smirk Mouth with White Teeth Row
  ctx.fillStyle = '#450a0a';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, -12, 4.8, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.8, -12, 5.6, 1.5);

  // 7. BABA CANÓNICA DE RICK (Saliva característica goteando en la comisura del labio)
  ctx.save();
  ctx.fillStyle = '#9ee038'; // Baba verde claro auténtica de la serie
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.1;

  // Mancha y escurrimiento sutil de baba en la comisura derecha de la boca
  ctx.beginPath();
  ctx.moveTo(3.2, -12);
  ctx.quadraticCurveTo(5.2, -11.5, 4.8, -9);
  ctx.quadraticCurveTo(4.2, -7.5, 3.4, -8.2);
  ctx.quadraticCurveTo(2.8, -9.8, 3.2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Brillo húmedo de la saliva
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(3.9, -10.2, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Pequeño reflejo en la comisura
  ctx.fillStyle = '#bbf7d0';
  ctx.beginPath();
  ctx.arc(4.4, -8.8, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Modern High-Definition Morty Smith
 * - 9-cluster sculpted curly brunette hair crown with warm specular highlights
 * - Anxious emotion rig: wide reflective glossy eyes, quivering micro-pupils, wavy '3'-mouth
 * - Animated cold sweat droplet beads on forehead
 * - Modern yellow crew-neck shirt with collar rim and fabric crease depth
 * - Textured indigo denim jeans with golden double-stitched seams and rolled ankle cuffs
 * - Retro white skate sneakers with crimson stripe and dark rubber tread
 * - Tactical dual-grip plasma blaster with status LED bar and recoil absorption
 * - Rotating 3D amethyst Death Crystal octahedron with holographic clairvoyance field (Skill [E])
 */
function drawPS2CelShadedMorty(ctx, p) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer, skillActiveTimer, blinkTimer } = p;
  const vx = p.vx || 0;
  const _vy = p.vy || 0;
  const isMoving = Math.abs(vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle : 0;

  const now = Date.now();
  const breatheCycle = Math.sin(now / 220);
  const idleBob = onGround && !isMoving ? breatheCycle * 1.2 : 0;
  const runBob = onGround && isMoving ? Math.sin(legCycle * 2) * 2.8 : 0;
  const spineLean = isMoving && onGround ? Math.max(-0.2, Math.min(0.2, vx * 0.032)) : 0;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + idleBob + runBob);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }
  ctx.rotate(spineLean);

  // 0. DEATH CRYSTAL HOLOGRAPHIC CLAIRVOYANCE FIELD (Skill [E] Active)
  if (skillActiveTimer > 0) {
    ctx.save();
    // Pulsing outer aura
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, -4, 29, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting Runic Energy Rays
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.55)';
    ctx.lineWidth = 1.6;
    for (let m = 0; m < 8; m++) {
      const angle = (m * Math.PI) / 4 + now / 300;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 19, Math.sin(angle) * 19 - 4);
      ctx.lineTo(Math.cos(angle) * 29, Math.sin(angle) * 29 - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 1. SKELETAL LEGS (Indigo Denim Jeans with Double-Stitching & White Sneakers)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.62 : -0.28;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.62 : 0.38;

  // Helper: Draw single articulated Morty leg
  const drawMortyLeg = (offsetX, legAngle) => {
    ctx.save();
    ctx.translate(offsetX, 11);
    ctx.rotate(legAngle);

    // Indigo Denim Jeans Cylinder
    const jeanGrad = ctx.createLinearGradient(-3, 0, 3, 0);
    jeanGrad.addColorStop(0, '#3b82f6');
    jeanGrad.addColorStop(0.35, '#1d4ed8');
    jeanGrad.addColorStop(0.8, '#1e3a8a');
    jeanGrad.addColorStop(1, '#172554');
    ctx.fillStyle = jeanGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.3;
    ctx.fillRect(-2.8, 0, 5.6, 12);
    ctx.strokeRect(-2.8, 0, 5.6, 12);

    // Golden Thread Double-Stitch Seam
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1.8, 0);
    ctx.lineTo(1.8, 10);
    ctx.stroke();

    // Rolled Denim Ankle Cuff
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-2.8, 9.5, 5.6, 2.5);

    // Retro White Skate Sneaker with Crimson Stripe
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-3.2, 11.5, 8.8, 5, [1, 2, 2, 1]);
    ctx.fill();
    ctx.stroke();

    // Crimson Stripe
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1.5, 12.8, 6.5, 1.4);

    // Dark Rubber Grip Tread
    ctx.fillStyle = '#334155';
    ctx.fillRect(-3.2, 15.5, 8.8, 1.2);
    ctx.restore();
  };

  drawMortyLeg(-4.5, leftLegAngle);
  drawMortyLeg(4.5, rightLegAngle);

  // 2. 3D YELLOW CREW-NECK T-SHIRT (Volumetric Torso with Fabric Folds)
  const shirtGrad = ctx.createRadialGradient(-3, -2, 2, 0, 1, 13);
  shirtGrad.addColorStop(0, '#fef08a');
  shirtGrad.addColorStop(0.45, '#facc15');
  shirtGrad.addColorStop(0.85, '#eab308');
  shirtGrad.addColorStop(1, '#a16207');
  ctx.fillStyle = shirtGrad;
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-9.5, -9, 19, 21, 5);
  ctx.fill();
  ctx.stroke();

  // Ribbed Collar Ring
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -9, 4.5, 0, Math.PI);
  ctx.stroke();

  // Fabric crease across lower abdomen
  ctx.strokeStyle = 'rgba(113, 63, 18, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 6);
  ctx.quadraticCurveTo(0, 7.5, 5, 6);
  ctx.stroke();

  // 3. TACTICAL DUAL-GRIP RAYGUN & WEAPON RECOIL
  const recoilOffset = recoilTimer > 0 ? -recoilTimer * 1.4 : 0;
  const recoilAngle = recoilTimer > 0 ? -0.16 : 0;

  ctx.save();
  ctx.translate(8 + recoilOffset, 0);
  ctx.rotate(recoilAngle);

  // Left Arm (Stabilizing underneath)
  ctx.fillStyle = '#fee2e2';
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-6, 2, 10, 4, 2);
  ctx.fill();
  ctx.stroke();

  // Blaster Chassis (Industrial Sci-Fi Yellow/Gunmetal)
  const gunGrad = ctx.createLinearGradient(0, -4, 0, 4);
  gunGrad.addColorStop(0, '#fef08a');
  gunGrad.addColorStop(0.4, '#f59e0b');
  gunGrad.addColorStop(0.8, '#475569');
  gunGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = gunGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(0, -4, 15, 7.5, [2, 3, 3, 2]);
  ctx.fill();
  ctx.stroke();

  // Glowing Plasma Barrel Core
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fillRect(4, -2.5, 8, 4);
  ctx.shadowBlur = 0;

  // Front Muzzle Tip
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(15, -3, 3, 5.5);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(17, -1.8, 1.5, 3);

  // Right Hand Trigger Grip
  ctx.fillStyle = '#fee2e2';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. SCULPTED 9-CLUSTER CURLY BRUNETTE HAIR CROWN
  // Individual volumetric curls overlapping smoothly
  const curls = [
    { x: -11, y: -18, r: 6.5 },
    { x: -9, y: -25, r: 7.0 },
    { x: -4, y: -29, r: 7.2 },
    { x: 2, y: -30, r: 7.2 },
    { x: 8, y: -27, r: 7.0 },
    { x: 11, y: -20, r: 6.5 },
    { x: 8, y: -14, r: 5.5 },
    { x: -4, y: -24, r: 6.0 }, // Central volume
    { x: 3, y: -24, r: 6.0 }
  ];

  curls.forEach((c) => {
    const curlGrad = ctx.createRadialGradient(c.x - 2, c.y - 2, 1, c.x, c.y, c.r);
    curlGrad.addColorStop(0, '#b45309');
    curlGrad.addColorStop(0.5, '#78350f');
    curlGrad.addColorStop(0.85, '#451a03');
    curlGrad.addColorStop(1, '#290e02');
    ctx.fillStyle = curlGrad;
    ctx.strokeStyle = '#1c0a02';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular Highlight Curls Cap
    ctx.fillStyle = 'rgba(254, 243, 199, 0.4)';
    ctx.beginPath();
    ctx.arc(c.x - 1.5, c.y - 1.8, c.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });

  // 5. 3D SPHERICAL MORTY HEAD & ANXIOUS FACIAL RIGGING
  const headGrad = ctx.createRadialGradient(-3, -19, 2, 0, -16, 13.5);
  headGrad.addColorStop(0, '#fff1f2');
  headGrad.addColorStop(0.45, '#fee2e2');
  headGrad.addColorStop(0.85, '#fecaca');
  headGrad.addColorStop(1, '#fca5a5');
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -16, 12.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // High-Arched Nervous Eyebrows (Trembling in Distress)
  const browJitter = Math.sin(now / 110) * 0.6;
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-4.5, -23 + browJitter, 3.8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4.5, -23 - browJitter, 3.8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Giant Expressive 3D Eyes with Specular Highlights
  const isBlinking = blinkTimer > 172;
  if (!isBlinking) {
    // Left Eye
    const eyeGradL = ctx.createRadialGradient(-3.5, -16, 0.5, -4, -15, 4.4);
    eyeGradL.addColorStop(0, '#ffffff');
    eyeGradL.addColorStop(0.85, '#ffffff');
    eyeGradL.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = eyeGradL;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4, -15, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right Eye
    const eyeGradR = ctx.createRadialGradient(3.5, -16, 0.5, 4, -15, 4.4);
    eyeGradR.addColorStop(0, '#ffffff');
    eyeGradR.addColorStop(0.85, '#ffffff');
    eyeGradR.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = eyeGradR;
    ctx.beginPath();
    ctx.arc(4, -15, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jittery Nervous Pupils (Reacting to Danger)
    const pupilJitter = Math.sin(now / 80) * 0.35;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3.5 + pupilJitter, -15, 1.4, 0, Math.PI * 2);
    ctx.arc(4.5 + pupilJitter, -15, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Glossy Specular Glints
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.9, -15.6, 0.5, 0, Math.PI * 2);
    ctx.arc(4.1, -15.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6.5, -15);
    ctx.lineTo(-1.5, -15);
    ctx.moveTo(1.5, -15);
    ctx.lineTo(6.5, -15);
    ctx.stroke();
  }

  // Round Button Nose
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, -13, 1.5, 0, Math.PI);
  ctx.stroke();

  // Iconic Trembling Wavy '3'-Shaped / Gritted Frown Mouth
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3.8, -8.5);
  ctx.quadraticCurveTo(-1.8, -10, 0, -8.5);
  ctx.quadraticCurveTo(1.8, -10, 3.8, -8.5);
  ctx.stroke();

  // Animated Cold Sweat Droplet
  const sweatDropY = -19.5 + Math.sin(now / 200) * 1.2;
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(-8.5, sweatDropY, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 6. 3D POLYHEDRAL AMETHYST DEATH CRYSTAL (Skill [E] Active)
  if (skillActiveTimer > 0) {
    const crystalSpin = now / 250;
    ctx.save();
    ctx.translate(0, -26);
    ctx.rotate(crystalSpin);

    // Multi-faceted Octahedron
    const cryGrad = ctx.createLinearGradient(-4, -6, 4, 6);
    cryGrad.addColorStop(0, '#f3e8ff');
    cryGrad.addColorStop(0.4, '#c084fc');
    cryGrad.addColorStop(0.8, '#7e22ce');
    cryGrad.addColorStop(1, '#3b0764');
    ctx.fillStyle = cryGrad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Internal facet crease
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * =========================================================================
 * PROCEDURAL 3D CEL-SHADED RIGGED MODEL: PICKLE RICK (RAT EXO-SUIT)
 * - Authentic bumpy green pickle body with realistic warts and curvature
 * - Maniacal Rick facial expression: fierce brow, bared sharp teeth, crazed eyes
 * - Scavenged rat-bone exoskeleton harness with skull pauldrons and wire ties
 * - Forearm-mounted AA-battery laser cannon with copper coils and red plasma emitter
 * - Beastly articulated rat limbs with razor claws and spring jump sinews
 * =========================================================================
 */
function drawPickleRickExoModel(ctx, p) {
  const { x, y, width, height, facing, runCycle, onGround, recoilTimer } = p;
  const vx = p.vx || 0;
  const isMoving = Math.abs(vx) > 0.3;
  const legCycle = onGround && isMoving ? runCycle * 1.3 : 0;
  const now = Date.now();
  const breathing = Math.sin(now / 180) * 1.5;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + breathing);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  // 1. RAT TAIL (Sinuous trailing whip behind pickle)
  const tailWave = Math.sin(now / 140) * 6 + (isMoving ? Math.sin(legCycle) * 8 : 0);
  ctx.strokeStyle = '#e2b3a8';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 14);
  ctx.quadraticCurveTo(-18 + tailWave, 18, -26 + tailWave * 1.4, 12);
  ctx.stroke();

  // 2. ARTICULATED RAT HIND LEGS (Muscular Sinew & Claws)
  const leftLegAngle = onGround ? Math.sin(legCycle) * 0.75 : -0.4;
  const rightLegAngle = onGround ? -Math.sin(legCycle) * 0.75 : 0.45;

  const drawRatLeg = (offsetX, legAngle) => {
    ctx.save();
    ctx.translate(offsetX, 12);
    ctx.rotate(legAngle);

    // Thigh muscle (flesh and bone)
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 4.5, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White rat bone tibia
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(1, 14);
    ctx.stroke();

    // Muscle tendon wire spring
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(0, 13);
    ctx.stroke();

    // 3 Sharp Rat Claws
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-2, 14);
    ctx.lineTo(5, 15.5);
    ctx.lineTo(2, 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawRatLeg(-6, leftLegAngle);
  drawRatLeg(6, rightLegAngle);

  // 3. THE ICONIC PICKLE BODY (Bumpy green curved cucumber cylinder)
  ctx.save();
  const pickleGrad = ctx.createRadialGradient(-3, -2, 2, 0, 0, 14);
  pickleGrad.addColorStop(0, '#a3e635'); // Bright pickle green highlight
  pickleGrad.addColorStop(0.4, '#65a30d'); // Medium pickle green
  pickleGrad.addColorStop(0.8, '#3f6212'); // Deep pickle flesh
  pickleGrad.addColorStop(1, '#14532d'); // Dark pickle shadow rim

  ctx.fillStyle = pickleGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;

  // Curvature of the pickle
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 21, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3D Pickle Warts / Bumps scattered along skin
  const warts = [
    { x: -6, y: -12, r: 2 },
    { x: 5, y: -10, r: 2.2 },
    { x: -7, y: 3, r: 2.4 },
    { x: 6, y: 7, r: 2.2 },
    { x: -2, y: 13, r: 2.1 },
    { x: 4, y: -2, r: 1.8 }
  ];

  warts.forEach((w) => {
    ctx.fillStyle = '#365314';
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#bef264';
    ctx.beginPath();
    ctx.arc(w.x - 0.5, w.y - 0.6, w.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 4. RAT EXOSKELETON HARNESS & SKULL PAULDRONS
  // Ribcage bone strap around pickle torso
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.quadraticCurveTo(0, 5, 10, 2);
  ctx.moveTo(-9, 8);
  ctx.quadraticCurveTo(0, 11, 9, 8);
  ctx.stroke();

  // Copper tie wires
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.lineTo(10, 6);
  ctx.stroke();

  // Left Rat Skull Shoulder Pauldron
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(-10, -8, 5, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Skull eye socket
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-11, -9, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 5. FOREARM BATTERY LASER CANNON (AA Battery + Red Plasma Emitter)
  const recoilKick = recoilTimer > 0 ? -recoilTimer * 2 : 0;
  ctx.save();
  ctx.translate(10 + recoilKick, -3);

  // Rat forearm bone
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(8, 0);
  ctx.stroke();

  // AA Battery Laser Body
  const battGrad = ctx.createLinearGradient(6, -5, 6, 5);
  battGrad.addColorStop(0, '#f59e0b');
  battGrad.addColorStop(0.3, '#1e293b');
  battGrad.addColorStop(0.7, '#1e293b');
  battGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = battGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(6, -4, 14, 8, 2);
  ctx.fill();
  ctx.stroke();

  // Exposed copper wire coils
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.2;
  for (let c = 8; c <= 16; c += 3) {
    ctx.beginPath();
    ctx.moveTo(c, -4);
    ctx.lineTo(c, 4);
    ctx.stroke();
  }

  // Laser Diode Emitter Aperture
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  ctx.fillRect(19, -2.5, 3, 5);
  ctx.shadowBlur = 0;

  // Red Laser Charging Sparks (When Firing)
  if (recoilTimer > 0) {
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(21, -4);
    ctx.lineTo(25, -1);
    ctx.lineTo(22, 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(23, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // 6. RICK'S MANIACAL PICKLE FACE (Furrowed Brow, Crazy Eyes & Savage Teeth)
  // Crazed unibrow etched into pickle skin
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-6, -11);
  ctx.quadraticCurveTo(0, -13.5, 6, -11);
  ctx.stroke();

  // Forehead wrinkles
  ctx.strokeStyle = '#1e3a10';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, -14, 4, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Maniacal Eyes
  const eyeL = ctx.createRadialGradient(-3.5, -7, 0.5, -3.5, -6.5, 3.2);
  eyeL.addColorStop(0, '#ffffff');
  eyeL.addColorStop(0.85, '#ffffff');
  eyeL.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = eyeL;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-3.5, -6.5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const eyeR = ctx.createRadialGradient(3.5, -7, 0.5, 3.5, -6.5, 3.2);
  eyeR.addColorStop(0, '#ffffff');
  eyeR.addColorStop(0.85, '#ffffff');
  eyeR.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = eyeR;
  ctx.beginPath();
  ctx.arc(3.5, -6.5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Manic Pupils (Tiny dilated dots)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-2.8, -6.5, 1.1, 0, Math.PI * 2);
  ctx.arc(4.2, -6.5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Bared Teeth Savage Grimace Mouth
  ctx.fillStyle = '#450a0a';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-4.5, -1.5, 9, 5, 2);
  ctx.fill();
  ctx.stroke();

  // Sharp Clenched Teeth
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3.8, -1.5, 7.6, 2);
  ctx.fillRect(-3.8, 1.5, 7.6, 2);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1.5, -1.5);
  ctx.lineTo(-1.5, 3.5);
  ctx.moveTo(1.5, -1.5);
  ctx.lineTo(1.5, 3.5);
  ctx.stroke();

  // Saliva on corner of teeth
  ctx.fillStyle = '#bef264';
  ctx.beginPath();
  ctx.arc(3.8, 2, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * =========================================================================
 * INTERACTIVE STAGE ELEMENTS RENDERING ROUTINES
 * Moving platforms, steam vents, acid hazards, and breakable supply crates
 * =========================================================================
 */

function drawMovingPlatform(ctx, plat) {
  ctx.save();
  // Chassis body
  const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
  grad.addColorStop(0, '#334155');
  grad.addColorStop(0.5, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
  ctx.fill();
  ctx.stroke();

  // Top Neon Energy Guide Rail
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 8;
  ctx.fillRect(plat.x + 2, plat.y, plat.width - 4, 3);
  ctx.shadowBlur = 0;

  // Mechanical Gear / Piston Core
  ctx.fillStyle = '#64748b';
  const midX = plat.x + plat.width / 2;
  ctx.beginPath();
  ctx.arc(midX, plat.y + plat.height / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Hover Jet Flame under platform
  const now = Date.now();
  const jetFlicker = 4 + Math.sin(now / 50) * 2;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(plat.x + 16, plat.y + plat.height);
  ctx.lineTo(plat.x + 24, plat.y + plat.height + jetFlicker);
  ctx.lineTo(plat.x + 32, plat.y + plat.height);
  ctx.moveTo(plat.x + plat.width - 32, plat.y + plat.height);
  ctx.lineTo(plat.x + plat.width - 24, plat.y + plat.height + jetFlicker);
  ctx.lineTo(plat.x + plat.width - 16, plat.y + plat.height);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawSteamVent(ctx, vent, groundY) {
  ctx.save();
  // Floor Vent Grate
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.fillRect(vent.x, groundY - 4, vent.width, 8);
  ctx.strokeRect(vent.x, groundY - 4, vent.width, 8);

  // Grate Slits
  ctx.fillStyle = '#f59e0b';
  for (let s = vent.x + 6; s < vent.x + vent.width - 4; s += 8) {
    ctx.fillRect(s, groundY - 2, 3, 4);
  }

  // Animated Billowing Steam Column
  const now = Date.now();
  const steamHeight = 60 + Math.sin(now / 120) * 16;
  const steamGrad = ctx.createLinearGradient(0, groundY, 0, groundY - steamHeight);
  steamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  steamGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.35)');
  steamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = steamGrad;
  ctx.beginPath();
  ctx.moveTo(vent.x + 4, groundY);
  ctx.quadraticCurveTo(vent.x - 6, groundY - steamHeight * 0.6, vent.x + vent.width / 2, groundY - steamHeight);
  ctx.quadraticCurveTo(vent.x + vent.width + 6, groundY - steamHeight * 0.6, vent.x + vent.width - 4, groundY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawAcidHazard(ctx, acid, groundY) {
  ctx.save();
  // Acid Pool Trench
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(acid.x, groundY, acid.width, 18);

  // Bubbling Radioactive Acid Surface
  const now = Date.now();
  const acidGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 14);
  acidGrad.addColorStop(0, '#4ade80');
  acidGrad.addColorStop(0.6, '#22c55e');
  acidGrad.addColorStop(1, '#14532d');

  ctx.fillStyle = acidGrad;
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(acid.x, groundY + 2);
  for (let ax = acid.x; ax <= acid.x + acid.width; ax += 14) {
    const waveY = Math.sin((now / 150) + (ax * 0.2)) * 3;
    ctx.lineTo(ax, groundY + 2 + waveY);
  }
  ctx.lineTo(acid.x + acid.width, groundY + 16);
  ctx.lineTo(acid.x, groundY + 16);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Acid Bubbles
  const bubble1X = acid.x + 18 + Math.sin(now / 300) * 6;
  const bubble1Y = groundY + Math.abs(Math.sin(now / 180)) * 4;
  ctx.fillStyle = '#bbf7d0';
  ctx.beginPath();
  ctx.arc(bubble1X, bubble1Y, 3, 0, Math.PI * 2);
  ctx.arc(acid.x + acid.width - 24, groundY + 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Toxic Hazard Warning Stripes on Banks
  ctx.fillStyle = '#eab308';
  ctx.fillRect(acid.x - 6, groundY, 6, 8);
  ctx.fillRect(acid.x + acid.width, groundY, 6, 8);

  ctx.restore();
}

function drawBreakableCrate(ctx, crate) {
  ctx.save();
  // Crate Body (Reinforced Wooden / Metal Supply Box)
  const grad = ctx.createLinearGradient(crate.x, crate.y, crate.x, crate.y + crate.height);
  grad.addColorStop(0, '#b45309');
  grad.addColorStop(0.5, '#78350f');
  grad.addColorStop(1, '#451a03');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(crate.x, crate.y, crate.width, crate.height, 3);
  ctx.fill();
  ctx.stroke();

  // Steel Corner Brackets
  ctx.fillStyle = '#64748b';
  ctx.fillRect(crate.x, crate.y, 6, 6);
  ctx.fillRect(crate.x + crate.width - 6, crate.y, 6, 6);
  ctx.fillRect(crate.x, crate.y + crate.height - 6, 6, 6);
  ctx.fillRect(crate.x + crate.width - 6, crate.y + crate.height - 6, 6, 6);

  // Cross Reinforcement Planks
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(crate.x + 4, crate.y + 4);
  ctx.lineTo(crate.x + crate.width - 4, crate.y + crate.height - 4);
  ctx.moveTo(crate.x + crate.width - 4, crate.y + 4);
  ctx.lineTo(crate.x + 4, crate.y + crate.height - 4);
  ctx.stroke();

  // Supply Icon Badge
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icon = crate.drop === 'pickle_rick' ? '🥒' : crate.drop === 'mega_seed' ? '🧬' : '🧪';
  ctx.fillText(icon, crate.x + crate.width / 2, crate.y + crate.height / 2);

  // Damage health pip indicator
  if (crate.health < crate.maxHealth) {
    const healthPercent = Math.max(0, crate.health / crate.maxHealth);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(crate.x, crate.y - 7, crate.width, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(crate.x, crate.y - 7, crate.width * healthPercent, 4);
  }

  ctx.restore();
}

/**
 * =========================================================================
 * 100% RIGGED 3D VOLUMETRIC ANIMATED ENEMY ROUTINES (ZERO PHOTO BOXES)
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

/**
 * 3D Volumetric Mr. Meeseeks
 * Cylindrical tubular limbs with specular shine, spherical head & 3D hair bulb.
 * In Frenzy: 3D pulsing crimson Fresnel rim-lighting and crackling arcs.
 */
function drawMeeseeksWalker(ctx, runCycle, isFrenzied) {
  const legAngle = Math.sin(runCycle) * 0.6;
  const armAngle = -Math.sin(runCycle) * 0.65;

  // 3D Crimson Fresnel Rim-lighting in Frenzy Mode
  if (isFrenzied) {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, -6, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3D Cylindrical Noodle Legs
  ctx.lineWidth = 4;
  const legGrad = ctx.createLinearGradient(-6, 0, 6, 0);
  legGrad.addColorStop(0, isFrenzied ? '#f87171' : '#7dd3fc');
  legGrad.addColorStop(0.5, isFrenzied ? '#ef4444' : '#0284c7');
  legGrad.addColorStop(1, isFrenzied ? '#991b1b' : '#0369a1');
  ctx.strokeStyle = legGrad;

  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-6 - legAngle * 14, 24);
  ctx.moveTo(6, 8);
  ctx.lineTo(6 + legAngle * 14, 24);
  ctx.stroke();

  // 3D Rounded Feet
  ctx.fillStyle = isFrenzied ? '#991b1b' : '#0369a1';
  ctx.beginPath();
  ctx.roundRect(-9 - legAngle * 14, 22, 7.5, 4, 2);
  ctx.roundRect(3 + legAngle * 14, 22, 7.5, 4, 2);
  ctx.fill();

  // 3D Cylindrical Torso with Phong Lighting
  const torsoGrad = ctx.createRadialGradient(-2, 0, 2, 0, 0, 10);
  torsoGrad.addColorStop(0, isFrenzied ? '#fca5a5' : '#bae6fd');
  torsoGrad.addColorStop(0.5, isFrenzied ? '#ef4444' : '#38bdf8');
  torsoGrad.addColorStop(1, isFrenzied ? '#991b1b' : '#0284c7');
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = isFrenzied ? '#7f1d1d' : '#0369a1';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 14, 18, 4);
  ctx.fill();
  ctx.stroke();

  // 3D Cylindrical Arms
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-14 + armAngle * 12, 8);
  ctx.moveTo(7, -4);
  ctx.lineTo(14 - armAngle * 12, 8);
  ctx.stroke();

  // 3D Spherical Head with Specular Glint
  const headGrad = ctx.createRadialGradient(-3, -19, 2, 0, -16, 12);
  headGrad.addColorStop(0, isFrenzied ? '#fca5a5' : '#e0f2fe');
  headGrad.addColorStop(0.45, isFrenzied ? '#ef4444' : '#38bdf8');
  headGrad.addColorStop(1, isFrenzied ? '#991b1b' : '#0369a1');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -16, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3D Orange Hair Bulb with Highlight
  const hairGrad = ctx.createRadialGradient(-1, -29, 1, 0, -28, 4.5);
  hairGrad.addColorStop(0, '#fed7aa');
  hairGrad.addColorStop(0.6, '#f97316');
  hairGrad.addColorStop(1, '#c2410c');
  ctx.fillStyle = hairGrad;
  ctx.beginPath();
  ctx.arc(0, -28, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 3D Spherical Eyes
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

  // Mouth
  ctx.fillStyle = isFrenzied ? '#450a0a' : '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI);
  ctx.fill();
}

/**
 * 3D Volumetric Gromflomite Trooper
 * Hard-surface chitin armor segments with metallic bronze/green reflection,
 * 3D cylindrical leg joints, and high-tech rifle with glowing lens.
 */
function drawGromflomiteTrooper(ctx, runCycle) {
  const legAngle = Math.sin(runCycle) * 0.5;

  // 3D Segmented Chitin Legs
  ctx.strokeStyle = '#3f6212';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-8 - legAngle * 10, 24);
  ctx.moveTo(6, 8);
  ctx.lineTo(8 + legAngle * 10, 24);
  ctx.stroke();

  // 3D Beveled Chitin Exoskeleton Torso with Metallic Sheen
  const chitinGrad = ctx.createLinearGradient(-9, -10, 9, 10);
  chitinGrad.addColorStop(0, '#a3e635');
  chitinGrad.addColorStop(0.35, '#65a30d');
  chitinGrad.addColorStop(0.8, '#365314');
  chitinGrad.addColorStop(1, '#1a2e05');
  ctx.fillStyle = chitinGrad;
  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-9, -10, 18, 20, 3);
  ctx.fill();
  ctx.stroke();

  // Carapace segment plates
  ctx.strokeStyle = '#1a2e05';
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(8, -4);
  ctx.moveTo(-8, 3);
  ctx.lineTo(8, 3);
  ctx.stroke();

  // Federation Crest
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, -7, 4, 4);

  // 3D Laser Rifle with cylindrical barrel & optic lens
  const rifleGrad = ctx.createLinearGradient(0, -2, 0, 4);
  rifleGrad.addColorStop(0, '#94a3b8');
  rifleGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = rifleGrad;
  ctx.fillRect(-18, 0, 18, 5.5);

  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6;
  ctx.fillRect(-21, 1, 3.5, 3.5); // Optical diode
  ctx.shadowBlur = 0;

  // 3D Insectoid Head
  const headGrad = ctx.createRadialGradient(-2, -20, 2, 0, -18, 11);
  headGrad.addColorStop(0, '#84cc16');
  headGrad.addColorStop(0.6, '#4d7c0f');
  headGrad.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, -18, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Curved Antennae
  ctx.strokeStyle = '#65a30d';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4, -28);
  ctx.lineTo(-8, -36);
  ctx.moveTo(4, -28);
  ctx.lineTo(8, -36);
  ctx.stroke();

  // 3D Compound Insectoid Eyes (Convex Red Facets)
  const eyeGrad = ctx.createRadialGradient(-5, -19, 1, -4, -18, 4);
  eyeGrad.addColorStop(0, '#fca5a5');
  eyeGrad.addColorStop(0.6, '#dc2626');
  eyeGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = eyeGrad;
  ctx.beginPath();
  ctx.arc(-4, -18, 3.8, 0, Math.PI * 2);
  ctx.arc(4, -18, 3.8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 3D Volumetric Cyber Bird Drone
 * Aerofoil beveled wings with chrome reflections, dual 3D jet turbine nacelles
 * with internal glowing combustion cones, and spherical optical camera eye.
 */
function drawCyberBirdDrone(ctx, runCycle) {
  const wingFlap = Math.sin(runCycle * 1.8) * 12;

  // 3D Chrome Beveled Wings
  const wingGrad = ctx.createLinearGradient(0, -16 + wingFlap, 0, 8);
  wingGrad.addColorStop(0, '#e0f2fe');
  wingGrad.addColorStop(0.4, '#38bdf8');
  wingGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = wingGrad;
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-25, -8 + wingFlap);
  ctx.lineTo(-8, 2);
  ctx.lineTo(0, -6);
  ctx.lineTo(8, 2);
  ctx.lineTo(25, -8 + wingFlap);
  ctx.lineTo(15, -16 + wingFlap);
  ctx.lineTo(0, -12);
  ctx.lineTo(-15, -16 + wingFlap);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dual 3D Cylindrical Jet Turbine Nacelles
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, 7, 4, 6);
  ctx.fillRect(2, 7, 4, 6);

  // Volumetric Thruster Combustion Flare (Blue Core to Orange Heat)
  const flareGrad = ctx.createLinearGradient(0, 11, 0, 24);
  flareGrad.addColorStop(0, '#67e8f9');
  flareGrad.addColorStop(0.4, '#f97316');
  flareGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = flareGrad;
  ctx.beginPath();
  ctx.moveTo(-6, 12);
  ctx.lineTo(0, 24 + Math.random() * 5);
  ctx.lineTo(6, 12);
  ctx.fill();

  // 3D Metallic Drone Fuselage
  const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
  bodyGrad.addColorStop(0, '#94a3b8');
  bodyGrad.addColorStop(0.5, '#475569');
  bodyGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Convex Camera Eyeball Visor
  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 8;
  ctx.fillRect(-6, -6, 12, 3.8);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(-4, -5.5, 3, 1.2);
}

/**
 * 3D Volumetric Boss: Alpha Mr. Meeseeks
 * Sculpted 3D muscular anatomy (slabs of pectorals, 3D deltoids, six-pack abs with directional light mapping).
 */
function drawAlphaMeeseeksBoss(ctx, width, height, runCycle, phase) {
  const stomp = Math.sin(runCycle) * 0.4;
  const isPhase2 = phase === 2;

  // 3D Muscular Torso Slab with Directional Phong Lighting
  const bodyGrad = ctx.createLinearGradient(-width / 3, -height / 3, width / 3, height / 2);
  bodyGrad.addColorStop(0, isPhase2 ? '#2563eb' : '#38bdf8');
  bodyGrad.addColorStop(0.45, isPhase2 ? '#1e3a8a' : '#0284c7');
  bodyGrad.addColorStop(1, isPhase2 ? '#0f172a' : '#075985');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = isPhase2 ? '#ef4444' : '#0369a1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-width / 2.5, -height / 2.8, width * 0.8, height * 0.75, 14);
  ctx.fill();
  ctx.stroke();

  // 3D Sculpted Pectoral Plates and Abdominal Quadrants
  ctx.strokeStyle = isPhase2 ? '#f87171' : '#7dd3fc';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  // Pectoral cleft
  ctx.moveTo(-18, -8);
  ctx.lineTo(0, 2);
  ctx.lineTo(18, -8);
  // Abdominal line
  ctx.moveTo(0, 2);
  ctx.lineTo(0, 24);
  // Six-pack horizontal divisions
  ctx.moveTo(-12, 9);
  ctx.lineTo(12, 9);
  ctx.moveTo(-10, 16);
  ctx.lineTo(10, 16);
  ctx.stroke();

  // 3D Deltoid Muscle Spheres
  const armGrad = ctx.createRadialGradient(-width / 2.2, -4 + stomp * 6, 2, -width / 2.2, -4 + stomp * 6, 16);
  armGrad.addColorStop(0, isPhase2 ? '#60a5fa' : '#7dd3fc');
  armGrad.addColorStop(1, isPhase2 ? '#1e3a8a' : '#0284c7');
  ctx.fillStyle = armGrad;
  ctx.beginPath();
  ctx.arc(-width / 2.2, -4 + stomp * 6, 16, 0, Math.PI * 2);
  ctx.arc(width / 2.2, -4 - stomp * 6, 16, 0, Math.PI * 2);
  ctx.fill();

  // 3D Cylindrical Stomping Legs
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-22, height / 3, 14, 16 + stomp * 6);
  ctx.fillRect(8, height / 3, 14, 16 - stomp * 6);

  // 3D Electric Glowing Eyes
  ctx.fillStyle = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowColor = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(-10, -22, 7, 0, Math.PI * 2);
  ctx.arc(10, -22, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 3D Orange Hair Tuft Sphere
  const hairGrad = ctx.createRadialGradient(-2, -44, 2, 0, -42, 9);
  hairGrad.addColorStop(0, '#fdba74');
  hairGrad.addColorStop(0.6, '#f97316');
  hairGrad.addColorStop(1, '#c2410c');
  ctx.fillStyle = hairGrad;
  ctx.beginPath();
  ctx.arc(0, -42, 9, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 3D Volumetric Boss: Cyber Birdperson
 * Multi-layer chamfered blade wings, cylindrical armor torso, and glowing 3D spherical plasma core.
 */
function drawCyberBirdpersonBoss(ctx, width, height, runCycle, phase) {
  const wingFlap = Math.sin(runCycle * 1.5) * 16;
  const isPhase2 = phase === 2;

  // 3D Multi-Layer Chamfered Blade Wings
  const wingGrad = ctx.createLinearGradient(0, -18 + wingFlap, 0, 16);
  wingGrad.addColorStop(0, '#cbd5e1');
  wingGrad.addColorStop(0.5, isPhase2 ? '#1e293b' : '#475569');
  wingGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = wingGrad;
  ctx.strokeStyle = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(-width * 0.74, -16 + wingFlap);
  ctx.lineTo(0, -10);
  ctx.lineTo(width * 0.74, -16 + wingFlap);
  ctx.lineTo(width * 0.46, 17);
  ctx.lineTo(0, 8);
  ctx.lineTo(-width * 0.46, 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3D Armored Torso with Metallic Sheen
  const torsoGrad = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22);
  torsoGrad.addColorStop(0, '#94a3b8');
  torsoGrad.addColorStop(0.6, '#475569');
  torsoGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 29, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Glowing Spherical Plasma Reactor Core
  const coreGrad = ctx.createRadialGradient(-1, 0, 1, 0, 2, 8);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.5, isPhase2 ? '#ef4444' : '#38bdf8');
  coreGrad.addColorStop(1, isPhase2 ? '#7f1d1d' : '#0369a1');
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = isPhase2 ? '#ef4444' : '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 3D Laser Eye Visor
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  ctx.fillRect(-8, -15, 16, 5);
  ctx.shadowBlur = 0;
}

/**
 * 3D Volumetric Boss: Evil Morty
 * 3D tailored suit with peaked lapels, billowing 3D cape, gold eyepatch with holographic crosshair,
 * and 3D dark-matter orb turret with concentric orbiting rings.
 */
function drawEvilMortyBoss(ctx, width, height, runCycle, phase) {
  const isPhase2 = phase === 2;

  // 3D Billowing Cape with Volumetric Folds
  const capeFlap = Math.sin(runCycle) * 8;
  // Inner dark purple lining
  ctx.fillStyle = '#3b0764';
  ctx.beginPath();
  ctx.moveTo(-12, 10);
  ctx.lineTo(-22 - capeFlap, 32);
  ctx.lineTo(22 + capeFlap, 32);
  ctx.lineTo(12, 10);
  ctx.closePath();
  ctx.fill();

  // Outer black suit cape
  const capeGrad = ctx.createLinearGradient(0, -10, 0, 32);
  capeGrad.addColorStop(0, '#1e293b');
  capeGrad.addColorStop(1, '#020617');
  ctx.fillStyle = capeGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -10);
  ctx.lineTo(-26 - capeFlap, 32);
  ctx.lineTo(26 + capeFlap, 32);
  ctx.lineTo(16, -10);
  ctx.closePath();
  ctx.fill();

  // 3D Presidential Suit with Gold Buttons
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10, -8, 20, 24);
  // Yellow shirt & tie
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-3, -8, 6, 20);
  ctx.fillStyle = '#020617';
  ctx.fillRect(-1.5, -6, 3, 14);

  // 3D Head & Hair
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fill();

  const faceGrad = ctx.createRadialGradient(-3, -17, 2, 0, -15, 12);
  faceGrad.addColorStop(0, '#fff1f2');
  faceGrad.addColorStop(0.6, '#fee2e2');
  faceGrad.addColorStop(1, '#fca5a5');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(0, -15, 12, 0, Math.PI * 2);
  ctx.fill();

  // 3D Golden Eye Patch with Holographic Reticle Grid
  const patchGrad = ctx.createRadialGradient(4, -17, 1, 5, -16, 6);
  patchGrad.addColorStop(0, '#fef08a');
  patchGrad.addColorStop(0.6, '#eab308');
  patchGrad.addColorStop(1, '#a16207');
  ctx.fillStyle = patchGrad;
  ctx.shadowColor = '#eab308';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(5, -16, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Holographic crosshair lines inside patch
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1, -16);
  ctx.lineTo(9, -16);
  ctx.moveTo(5, -20);
  ctx.lineTo(5, -12);
  ctx.stroke();

  // Other Cold Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-5, -16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-5, -16, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Floating 3D Dark-Matter Orb Turret with Concentric Orbiting Rings
  const orbitAngle = Date.now() / 380;
  const turretX = Math.cos(orbitAngle) * 36;
  const turretY = Math.sin(orbitAngle) * 16 - 10;

  // Front Barrier Shield
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 2.8;
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

  // 3D Dark Matter Sphere Turret with Specular Sheen
  const orbGrad = ctx.createRadialGradient(turretX - 2, turretY - 2, 1, turretX, turretY, 9);
  orbGrad.addColorStop(0, '#e9d5ff');
  orbGrad.addColorStop(0.4, '#9333ea');
  orbGrad.addColorStop(1, '#3b0764');
  ctx.fillStyle = orbGrad;
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(turretX, turretY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3D Cylindrical Gun Barrel
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(turretX - 14, turretY - 2, 10, 4);
}
