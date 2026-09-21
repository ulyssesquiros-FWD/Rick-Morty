import { useEffect, useRef, useCallback } from 'react';
import { PLAYER_CONFIG, SCORE_SYSTEM } from '../data/gameConfig';

/**
 * Custom Hook: useGameEngine
 * Encapsulates the complete 2D Canvas Arcade Engine with requestAnimationFrame,
 * AABB collision physics, particles, enemy AI, and sprite rendering.
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
  onPauseToggle
}) {
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false
  });

  const gameStateRef = useRef({
    player: {
      x: 80,
      y: 350,
      vx: 0,
      vy: 0,
      width: PLAYER_CONFIG.width,
      height: PLAYER_CONFIG.height,
      facing: 'right',
      onGround: false,
      shootCooldown: 0,
      invulnerableTimer: 0
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
    cameraX: 0
  });

  const imageCacheRef = useRef({});
  const animationFrameIdRef = useRef(null);

  // Preload character images into Image objects for smooth canvas drawImage
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
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
          imageCacheRef.current[key] = img;
        };
      }
    });
  }, [characterAssets]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysRef.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysRef.current.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysRef.current.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysRef.current.down = true;
      if (e.code === 'Space' || e.code === 'KeyJ') keysRef.current.shoot = true;
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
  }, [onPauseToggle]);

  // Virtual control triggers for mobile
  const triggerAction = useCallback((action, isPressed) => {
    if (keysRef.current[action] !== undefined) {
      keysRef.current[action] = isPressed;
    }
  }, []);

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
      // 1. UPDATE PLAYER PHYSICS
      // ==========================================
      const p = state.player;

      // Horizontal movement
      if (keys.left) {
        p.vx = -PLAYER_CONFIG.moveSpeed;
        p.facing = 'left';
      } else if (keys.right) {
        p.vx = PLAYER_CONFIG.moveSpeed;
        p.facing = 'right';
      } else {
        p.vx *= PLAYER_CONFIG.friction;
      }

      // Jump
      if (keys.up && p.onGround) {
        p.vy = PLAYER_CONFIG.jumpForce;
        p.onGround = false;
        createExplosion(p.x + p.width / 2, p.y + p.height, '#22d3ee', 6);
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
        }
      });

      // Player shooting
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.invulnerableTimer > 0) p.invulnerableTimer--;

      if (keys.shoot && p.shootCooldown === 0) {
        const bulletSpeed = p.facing === 'right' ? PLAYER_CONFIG.bulletSpeed : -PLAYER_CONFIG.bulletSpeed;
        const startX = p.facing === 'right' ? p.x + p.width + 4 : p.x - 12;
        const startY = p.y + p.height / 2 - 4;

        state.bullets.push({
          x: startX,
          y: startY,
          vx: bulletSpeed,
          vy: (Math.random() - 0.5) * 0.4,
          width: 14,
          height: 6,
          color: '#42f56c'
        });

        createExplosion(startX, startY, '#39ff14', 4);
        p.shootCooldown = PLAYER_CONFIG.fireCooldown;
      }

      // ==========================================
      // 2. UPDATE BULLETS
      // ==========================================
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Trail particle
        if (Math.random() < 0.4) {
          state.particles.push({
            x: b.x,
            y: b.y + 2,
            vx: -b.vx * 0.1,
            vy: (Math.random() - 0.5) * 0.8,
            life: 10,
            maxLife: 10,
            color: '#22d3ee',
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
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 12);
          p.invulnerableTimer = 45;
          onPlayerDamage(20);
          continue;
        }

        if (eb.x < 0 || eb.x > CANVAS_WIDTH || eb.y > CANVAS_HEIGHT) {
          state.enemyBullets.splice(i, 1);
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
          hoverAngle: Math.random() * Math.PI * 2
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
          x: CANVAS_WIDTH - 120,
          y: GROUND_Y - 90,
          vx: -0.6,
          vy: 0,
          width: 80,
          height: 90,
          health: bossHealth,
          maxHealth: bossHealth,
          points: SCORE_SYSTEM.BOSS_ENEMY,
          shootTimer: 60,
          hoverAngle: 0
        });

        addFloatingText('⚠️ DIMENSIONAL BOSS DETECTED! ⚠️', CANVAS_WIDTH / 2 - 140, 80, '#ef4444');
      }

      // Update enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];

        if (en.type === 'flying') {
          en.hoverAngle += 0.05;
          en.y += Math.sin(en.hoverAngle) * 1.5;
          en.x += en.vx;
        } else if (en.isBoss) {
          en.x += en.vx;
          if (en.x < CANVAS_WIDTH - 220 || en.x > CANVAS_WIDTH - 90) {
            en.vx *= -1;
          }
        } else {
          en.x += en.vx;
        }

        // Enemy shooting
        en.shootTimer--;
        if (en.shootTimer <= 0) {
          en.shootTimer = en.isBoss ? 75 : 160 + Math.random() * 80;
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
            en.health -= PLAYER_CONFIG.bulletDamage;
            state.bullets.splice(bIndex, 1);
            createExplosion(bul.x, bul.y, '#97ce4c', 6);

            // Enemy defeated
            if (en.health <= 0) {
              createExplosion(en.x + en.width / 2, en.y + en.height / 2, '#42f56c', en.isBoss ? 35 : 18);
              addFloatingText(`+${en.points}`, en.x + en.width / 2, en.y - 10, '#39ff14');

              state.levelKillsCount++;
              onEnemyDefeat(en.points);

              if (en.isBoss) {
                state.bossDefeated = true;
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
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 10);
          onPlayerDamage(en.isBoss ? 35 : 20);
        }

        // Out of screen cleanup
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
      // Background Sky / Space gradient
      ctx.fillStyle = levelConfig?.bgColor || '#050816';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Distant stars / dimensional grid
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
        ctx.fillStyle = '#42f56c';
        ctx.shadowColor = '#42f56c';
        ctx.shadowBlur = 10;
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

      // Draw Enemies
      state.enemies.forEach((en) => {
        ctx.save();
        const img = imageCacheRef.current[en.imageKey];

        if (img && img.complete) {
          ctx.drawImage(img, en.x, en.y, en.width, en.height);
        } else {
          // Fallback shape
          ctx.fillStyle = en.isBoss ? '#a855f7' : '#22d3ee';
          ctx.fillRect(en.x, en.y, en.width, en.height);
        }

        // Enemy Health bar
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

      // Draw Player (Rick)
      if (p.invulnerableTimer % 6 < 3) {
        ctx.save();
        const playerImg = imageCacheRef.current.player;

        if (p.facing === 'left') {
          ctx.translate(p.x + p.width, p.y);
          ctx.scale(-1, 1);
          if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, 0, 0, p.width, p.height);
          } else {
            ctx.fillStyle = '#97ce4c';
            ctx.fillRect(0, 0, p.width, p.height);
          }
        } else {
          if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);
          } else {
            ctx.fillStyle = '#97ce4c';
            ctx.fillRect(p.x, p.y, p.width, p.height);
          }
        }

        // Portal Gun & Muzzle glow
        const gunX = p.facing === 'right' ? p.x + p.width - 6 : p.x - 8;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(gunX, p.y + p.height / 2 - 2, 14, 6);

        ctx.restore();
      }

      // Draw Morty Companion hovering near Rick
      const mortyImg = imageCacheRef.current.support;
      const mortyX = p.facing === 'right' ? p.x - 32 : p.x + p.width + 6;
      const mortyY = p.y - 15 + Math.sin(Date.now() / 250) * 6;

      ctx.save();
      if (mortyImg && mortyImg.complete) {
        ctx.drawImage(mortyImg, mortyX, mortyY, 28, 32);
      } else {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(mortyX + 14, mortyY + 16, 12, 0, Math.PI * 2);
        ctx.fill();
      }
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
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

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
    onVictory
  ]);

  const resetEngine = useCallback((_level = 1) => {
    gameStateRef.current = {
      player: {
        x: 80,
        y: 350,
        vx: 0,
        vy: 0,
        width: PLAYER_CONFIG.width,
        height: PLAYER_CONFIG.height,
        facing: 'right',
        onGround: false,
        shootCooldown: 0,
        invulnerableTimer: 0
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
      cameraX: 0
    };
  }, []);

  return {
    triggerAction,
    resetEngine
  };
}
