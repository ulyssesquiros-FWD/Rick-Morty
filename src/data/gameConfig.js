/**
 * Game Configuration Data for RICK & MORTY: DIMENSION RAID
 * Defines levels, enemy scaling, weapons, dimensions, and player attributes.
 */

export const CHARACTER_IDS = {
  RICK: 1,           // Player
  MORTY: 2,          // Support / Powerup
  SUMMER: 3,         // Dimension Guide
  BIRDPERSON: 8,     // Flying Enemy / Heavy
  MEESEEKS: 242,     // Swarm Enemy
  EVIL_MORTY: 118,   // Mini-Boss
  CRONENBERG_RICK: 82, // Boss Level 3
  GROMBFLOMITE: 144  // Level 1 Elite
};

export const LEVELS = [
  {
    id: 1,
    name: 'Earth C-137',
    subtitle: 'Toxic Dimensional Outskirts',
    description: 'Survive the initial portal rupture on Earth C-137. Eliminate rogue Meeseeks and basic alien infiltrators.',
    targetEnemies: 10,
    targetScore: 1000,
    bgColor: '#05130b',
    skyGradient: 'linear-gradient(180deg, #05130b 0%, #0d2818 50%, #040d06 100%)',
    groundColor: '#16381e',
    portalColor: '#42f56c',
    enemySpeedMultiplier: 1.0,
    enemySpawnRate: 140, // frames between spawns
    bossId: CHARACTER_IDS.MEESEEKS,
    bossName: 'Alpha Mr. Meeseeks',
    bossHealth: 300,
    platforms: [
      { x: 180, y: 360, width: 140, height: 16 },
      { x: 420, y: 300, width: 160, height: 16 },
      { x: 680, y: 240, width: 150, height: 16 }
    ]
  },
  {
    id: 2,
    name: 'Citadel of Ricks',
    subtitle: 'Cybernetic Security Grid',
    description: 'Infiltrate the high-tech Citadel. Battle corrupted Rick guards and flying security drones across floating magnetic beams.',
    targetEnemies: 16,
    targetScore: 2200,
    bgColor: '#090d24',
    skyGradient: 'linear-gradient(180deg, #070919 0%, #171d47 50%, #050711 100%)',
    groundColor: '#1e285a',
    portalColor: '#22d3ee',
    enemySpeedMultiplier: 1.35,
    enemySpawnRate: 110,
    bossId: CHARACTER_IDS.BIRDPERSON,
    bossName: 'Cyber Birdperson',
    bossHealth: 500,
    platforms: [
      { x: 120, y: 380, width: 130, height: 16 },
      { x: 340, y: 310, width: 150, height: 16 },
      { x: 580, y: 250, width: 160, height: 16 },
      { x: 780, y: 340, width: 120, height: 16 }
    ]
  },
  {
    id: 3,
    name: 'Final Dimension',
    subtitle: 'Cosmic Singularity & Dark Citadel',
    description: 'Cross into the deepest reality fracture. Confront the ultimate dimensional threat before the multiversal timeline collapses!',
    targetEnemies: 22,
    targetScore: 3500,
    bgColor: '#16041f',
    skyGradient: 'linear-gradient(180deg, #16041f 0%, #3b0764 50%, #0a0112 100%)',
    groundColor: '#4c0d75',
    portalColor: '#a855f7',
    enemySpeedMultiplier: 1.7,
    enemySpawnRate: 85,
    bossId: CHARACTER_IDS.EVIL_MORTY,
    bossName: 'Evil Morty with Dimensional Cannon',
    bossHealth: 800,
    platforms: [
      { x: 100, y: 370, width: 120, height: 16 },
      { x: 280, y: 290, width: 140, height: 16 },
      { x: 500, y: 210, width: 180, height: 16 },
      { x: 740, y: 290, width: 140, height: 16 }
    ]
  }
];

export const PLAYER_CONFIG = {
  width: 44,
  height: 64,
  maxHealth: 100,
  maxLives: 3,
  moveSpeed: 5.5,
  jumpForce: -12.5,
  gravity: 0.52,
  friction: 0.85,
  bulletSpeed: 11,
  bulletDamage: 35,
  fireCooldown: 12 // frames between shots
};

export const SCORE_SYSTEM = {
  REGULAR_ENEMY: 100,
  FLYING_ENEMY: 175,
  ELITE_ENEMY: 250,
  BOSS_ENEMY: 600,
  LEVEL_COMPLETION: 1000,
  TIME_BONUS_MULTIPLIER: 10,
  LIFE_BONUS: 200
};
