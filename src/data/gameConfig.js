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
    worldWidth: 3200,
    bossArenaX: 2450,
    targetEnemies: 12,
    targetScore: 1200,
    bgColor: '#05130b',
    skyGradient: 'linear-gradient(180deg, #05130b 0%, #0d2818 50%, #040d06 100%)',
    groundColor: '#16381e',
    portalColor: '#42f56c',
    enemySpeedMultiplier: 1.0,
    enemySpawnRate: 120, // frames between spawns
    bossId: CHARACTER_IDS.MEESEEKS,
    bossName: 'Alpha Mr. Meeseeks',
    bossHealth: 350,
    platforms: [
      // Zone 1: Suburbia & Rick's Garage Outskirts
      { x: 180, y: 360, width: 160, height: 16 },
      { x: 380, y: 300, width: 180, height: 16 },
      { x: 620, y: 240, width: 170, height: 16 },
      { x: 860, y: 320, width: 150, height: 16 },
      // Zone 2: Space Cruiser Crashed Site & Slime Barrels
      { x: 1100, y: 360, width: 220, height: 16 },
      { x: 1380, y: 290, width: 180, height: 16 },
      { x: 1620, y: 220, width: 200, height: 16 },
      { x: 1900, y: 310, width: 170, height: 16 },
      // Zone 3: Gateway to Boss Arena
      { x: 2150, y: 360, width: 160, height: 16 },
      { x: 2360, y: 280, width: 180, height: 16 },
      // Boss Arena Platforms
      { x: 2550, y: 320, width: 160, height: 16 },
      { x: 2800, y: 260, width: 180, height: 16 }
    ],
    movingPlatforms: [
      { x: 480, y: 270, width: 130, height: 14, axis: 'x', minX: 430, maxX: 580, speed: 1.6, dir: 1 },
      { x: 1750, y: 300, width: 140, height: 14, axis: 'y', minY: 220, maxY: 340, speed: 1.4, dir: 1 }
    ],
    steamVents: [
      { x: 540, width: 44, force: -17.5 },
      { x: 1260, width: 44, force: -17.5 },
      { x: 2040, width: 44, force: -17.5 }
    ],
    acidHazards: [
      { x: 740, width: 110, damage: 25 },
      { x: 1500, width: 110, damage: 25 }
    ],
    breakableCrates: [
      { x: 670, y: 200, width: 34, height: 34, health: 3, drop: 'pickle_rick' },
      { x: 1670, y: 180, width: 34, height: 34, health: 3, drop: 'flask' },
      { x: 2210, y: 315, width: 34, height: 34, health: 3, drop: 'pickle_rick' }
    ]
  },
  {
    id: 2,
    name: 'Citadel of Ricks',
    subtitle: 'Cybernetic Security Grid',
    description: 'Infiltrate the high-tech Citadel. Battle corrupted Rick guards and flying security drones across floating magnetic beams.',
    worldWidth: 3200,
    bossArenaX: 2450,
    targetEnemies: 18,
    targetScore: 2400,
    bgColor: '#090d24',
    skyGradient: 'linear-gradient(180deg, #070919 0%, #171d47 50%, #050711 100%)',
    groundColor: '#1e285a',
    portalColor: '#22d3ee',
    enemySpeedMultiplier: 1.35,
    enemySpawnRate: 100,
    bossId: CHARACTER_IDS.BIRDPERSON,
    bossName: 'Cyber Birdperson',
    bossHealth: 550,
    platforms: [
      // Zone 1: Citadel Entrance & Security checkpoint
      { x: 160, y: 370, width: 150, height: 16 },
      { x: 360, y: 290, width: 170, height: 16 },
      { x: 580, y: 230, width: 190, height: 16 },
      { x: 840, y: 330, width: 160, height: 16 },
      // Zone 2: Neon Skyway & Floating Holograms
      { x: 1080, y: 360, width: 200, height: 16 },
      { x: 1340, y: 280, width: 180, height: 16 },
      { x: 1600, y: 210, width: 220, height: 16 },
      { x: 1900, y: 300, width: 180, height: 16 },
      // Zone 3: Council of Ricks Chamber
      { x: 2180, y: 350, width: 170, height: 16 },
      { x: 2390, y: 270, width: 190, height: 16 },
      // Boss Arena Platforms
      { x: 2560, y: 310, width: 170, height: 16 },
      { x: 2820, y: 240, width: 200, height: 16 }
    ],
    movingPlatforms: [
      { x: 700, y: 260, width: 140, height: 14, axis: 'x', minX: 640, maxX: 800, speed: 2.0, dir: 1 },
      { x: 1720, y: 280, width: 140, height: 14, axis: 'y', minY: 190, maxY: 330, speed: 1.8, dir: 1 }
    ],
    steamVents: [
      { x: 500, width: 44, force: -17.5 },
      { x: 1440, width: 44, force: -17.5 },
      { x: 2100, width: 44, force: -17.5 }
    ],
    acidHazards: [
      { x: 680, width: 120, damage: 25 },
      { x: 1520, width: 120, damage: 25 }
    ],
    breakableCrates: [
      { x: 640, y: 190, width: 34, height: 34, health: 3, drop: 'pickle_rick' },
      { x: 1640, y: 170, width: 34, height: 34, health: 3, drop: 'mega_seed' },
      { x: 2240, y: 305, width: 34, height: 34, health: 3, drop: 'pickle_rick' }
    ]
  },
  {
    id: 3,
    name: 'Final Dimension',
    subtitle: 'Cosmic Singularity & Dark Citadel',
    description: 'Cross into the deepest reality fracture. Confront the ultimate dimensional threat before the multiversal timeline collapses!',
    worldWidth: 3200,
    bossArenaX: 2450,
    targetEnemies: 24,
    targetScore: 3800,
    bgColor: '#16041f',
    skyGradient: 'linear-gradient(180deg, #16041f 0%, #3b0764 50%, #0a0112 100%)',
    groundColor: '#4c0d75',
    portalColor: '#a855f7',
    enemySpeedMultiplier: 1.65,
    enemySpawnRate: 80,
    bossId: CHARACTER_IDS.EVIL_MORTY,
    bossName: 'Evil Morty with Dimensional Cannon',
    bossHealth: 850,
    platforms: [
      // Zone 1: Singularity Fracture & Cosmic Shards
      { x: 140, y: 360, width: 150, height: 16 },
      { x: 350, y: 280, width: 160, height: 16 },
      { x: 580, y: 200, width: 200, height: 16 },
      { x: 840, y: 300, width: 160, height: 16 },
      // Zone 2: Cromulon Gaze & Void Rift
      { x: 1060, y: 370, width: 190, height: 16 },
      { x: 1320, y: 270, width: 190, height: 16 },
      { x: 1580, y: 190, width: 230, height: 16 },
      { x: 1880, y: 290, width: 180, height: 16 },
      // Zone 3: Dark Matter Bridge
      { x: 2150, y: 360, width: 180, height: 16 },
      { x: 2380, y: 260, width: 190, height: 16 },
      // Boss Arena Platforms
      { x: 2580, y: 320, width: 180, height: 16 },
      { x: 2850, y: 220, width: 210, height: 16 }
    ],
    movingPlatforms: [
      { x: 720, y: 240, width: 140, height: 14, axis: 'x', minX: 660, maxX: 820, speed: 2.2, dir: 1 },
      { x: 1700, y: 260, width: 140, height: 14, axis: 'y', minY: 170, maxY: 320, speed: 2.0, dir: 1 }
    ],
    steamVents: [
      { x: 460, width: 44, force: -17.5 },
      { x: 1400, width: 44, force: -17.5 },
      { x: 2020, width: 44, force: -17.5 }
    ],
    acidHazards: [
      { x: 700, width: 130, damage: 25 },
      { x: 1460, width: 130, damage: 25 }
    ],
    breakableCrates: [
      { x: 620, y: 160, width: 34, height: 34, health: 3, drop: 'pickle_rick' },
      { x: 1620, y: 150, width: 34, height: 34, health: 3, drop: 'portal_fluid' },
      { x: 2220, y: 310, width: 34, height: 34, health: 3, drop: 'pickle_rick' }
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
  fireCooldown: 12
};

export const PLAYABLE_CHARACTERS = {
  rick: {
    id: 'rick',
    name: 'Rick Sanchez',
    title: 'Científico C-137',
    color: '#42f56c',
    glowColor: 'rgba(66, 245, 108, 0.4)',
    accentColor: '#38bdf8',
    width: 44,
    height: 66,
    moveSpeed: 5.5,
    jumpForce: -12.5,
    doubleJump: true,
    bulletSpeed: 13,
    bulletDamage: 38,
    fireCooldown: 12,
    bulletType: 'laser',
    bulletColor: '#42f56c',
    passiveName: 'Genio & Doble Salto Cuántico',
    passiveDesc: '+25% Crítico y Micro-propulsores de portal para doble salto',
    skillKey: 'E',
    skillName: 'Salto Cuántico',
    skillDesc: 'Warp de portal 220px al frente con daño de distorsión',
    skillCooldown: 300,
    skillDuration: 20
  },
  morty: {
    id: 'morty',
    name: 'Morty Smith',
    title: 'Escudero Ansioso',
    color: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    accentColor: '#c084fc',
    width: 38,
    height: 56,
    moveSpeed: 6.2,
    jumpForce: -11.8,
    doubleJump: true,
    bulletSpeed: 11,
    bulletDamage: 22,
    fireCooldown: 13,
    bulletType: 'dual',
    bulletColor: '#facc15',
    passiveName: 'Botas de Gravedad & Doble Salto',
    passiveDesc: 'Doble impulso en el aire con botas antigravedad y mayor velocidad',
    skillKey: 'E',
    skillName: 'Cristal de la Muerte',
    skillDesc: 'Precognición: Invulnerabilidad total y sobrecarga cuádruple por 3.5s',
    skillCooldown: 420,
    skillDuration: 210
  }
};

export const POWERUP_CONFIG = {
  FLASK: {
    id: 'flask',
    name: "Rick's Flask",
    label: '+25 HP',
    color: '#38bdf8',
    icon: '🧪',
    duration: 0,
    heal: 25,
    score: 150
  },
  MEGA_SEED: {
    id: 'mega_seed',
    name: 'Mega Seed',
    label: 'SKILL READY',
    color: '#a855f7',
    icon: '🧬',
    duration: 0,
    resetSkill: true,
    score: 300
  },
  PORTAL_FLUID: {
    id: 'portal_fluid',
    name: 'Portal Fluid',
    label: 'HYPER SHIELD',
    color: '#42f56c',
    icon: '🌀',
    duration: 360, // 6 segundos
    invulnerable: true,
    score: 200
  },
  PICKLE_RICK: {
    id: 'pickle_rick',
    name: 'Pickle Serum',
    label: "I'M PICKLE RICK!",
    color: '#84cc16',
    icon: '🥒',
    duration: 600, // 10 segundos de frenesí Pickle Rick
    pickleTransformation: true,
    speedMultiplier: 1.45,
    damageMultiplier: 2.2,
    score: 500
  }
};

export const SCORE_SYSTEM = {
  REGULAR_ENEMY: 100,
  FLYING_ENEMY: 175,
  ELITE_ENEMY: 250,
  BOSS_ENEMY: 600,
  LEVEL_COMPLETION: 1000,
  TIME_BONUS_MULTIPLIER: 10,
  LIFE_BONUS: 200,
  POWERUP: 150
};
