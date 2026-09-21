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

export const PLAYABLE_CHARACTERS = {
  rick: {
    id: 'rick',
    name: 'Rick Sanchez',
    title: 'Científico C-137',
    color: '#42f56c',
    glowColor: 'rgba(66, 245, 108, 0.4)',
    accentColor: '#38bdf8',
    width: 44,
    height: 64,
    moveSpeed: 5.5,
    jumpForce: -12.5,
    bulletSpeed: 13,
    bulletDamage: 38,
    fireCooldown: 12,
    bulletType: 'laser',
    bulletColor: '#42f56c',
    passiveName: 'Genio Multiversal',
    passiveDesc: '+25% Daño Crítico (Probabilidad de desintegración inmediata)',
    skillKey: 'E',
    skillName: 'Salto Cuántico',
    skillDesc: 'Warp de portal 200px al frente con daño de distorsión',
    skillCooldown: 300, // 5 segundos a 60fps
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
    bulletSpeed: 11,
    bulletDamage: 22,
    fireCooldown: 13,
    bulletType: 'dual',
    bulletColor: '#facc15',
    passiveName: 'Doble Salto & Agilidad',
    passiveDesc: 'Permite un segundo impulso en el aire y mayor velocidad base',
    skillKey: 'E',
    skillName: 'Cristal de la Muerte',
    skillDesc: 'Precognición: Invulnerabilidad total y sobrecarga cuádruple por 3.5s',
    skillCooldown: 420, // 7 segundos a 60fps
    skillDuration: 210 // 3.5s duración activa
  }
};

export const POWERUP_CONFIG = {
  FLASK: {
    id: 'flask',
    name: "Rick's Flask",
    label: '+30 HP',
    color: '#38bdf8',
    icon: '🧪',
    duration: 0,
    heal: 30,
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
