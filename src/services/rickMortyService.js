import { CHARACTER_IDS } from '../data/gameConfig.js';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RICK_MORTY_API) || 'https://rickandmortyapi.com/api';

/**
 * Custom Error Class for Rick and Morty API operations
 */
export class RickMortyServiceError extends Error {
  constructor(message, status = 0, code = 'API_ERROR') {
    super(message);
    this.name = 'RickMortyServiceError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Fallback static character pack in case API is unreachable or times out
 */
export const FALLBACK_GAME_CHARACTERS = {
  player: {
    id: CHARACTER_IDS.RICK,
    name: 'Rick Sanchez',
    image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
    status: 'Alive',
    species: 'Human'
  },
  support: {
    id: CHARACTER_IDS.MORTY,
    name: 'Morty Smith',
    image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
    status: 'Alive',
    species: 'Human'
  },
  enemies: [
    {
      id: CHARACTER_IDS.MEESEEKS,
      name: 'Mr. Meeseeks',
      image: 'https://rickandmortyapi.com/api/character/avatar/242.jpeg',
      species: 'Meeseeks'
    },
    {
      id: CHARACTER_IDS.GROMBFLOMITE,
      name: 'Gromflomite Guard',
      image: 'https://rickandmortyapi.com/api/character/avatar/144.jpeg',
      species: 'Alien'
    },
    {
      id: CHARACTER_IDS.BIRDPERSON,
      name: 'Birdperson (Corrupted)',
      image: 'https://rickandmortyapi.com/api/character/avatar/8.jpeg',
      species: 'Alien'
    }
  ],
  bosses: {
    1: {
      id: CHARACTER_IDS.MEESEEKS,
      name: 'Alpha Mr. Meeseeks',
      image: 'https://rickandmortyapi.com/api/character/avatar/242.jpeg'
    },
    2: {
      id: CHARACTER_IDS.BIRDPERSON,
      name: 'Cyber Birdperson',
      image: 'https://rickandmortyapi.com/api/character/avatar/8.jpeg'
    },
    3: {
      id: CHARACTER_IDS.EVIL_MORTY,
      name: 'Evil Morty',
      image: 'https://rickandmortyapi.com/api/character/avatar/118.jpeg'
    }
  },
  allCharacters: []
};

/**
 * Fetches a single character by ID from Rick and Morty API.
 * @param {number|string} id
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export async function getCharacter(id, signal = null) {
  if (!id) {
    throw new RickMortyServiceError('Character ID is required.', 400, 'BAD_REQUEST');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/character/${id}`, { signal });
    if (!response.ok) {
      throw new RickMortyServiceError(
        `Failed to fetch character #${id} from the Citadel API. Status: ${response.status}`,
        response.status,
        'NOT_FOUND'
      );
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new RickMortyServiceError('Respuesta de API inválida.', 500, 'INVALID_DATA');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error instanceof RickMortyServiceError) throw error;
    throw new RickMortyServiceError(
      'No pudimos conectar con el Consejo Interdimensional.',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Fetches multiple characters by an array of IDs.
 * @param {Array<number|string>} ids
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>}
 */
export async function getCharacters(ids, signal = null) {
  if (!ids || ids.length === 0) return [];

  const idsString = ids.join(',');
  try {
    const response = await fetch(`${API_BASE_URL}/character/${idsString}`, { signal });
    if (!response.ok) {
      throw new RickMortyServiceError(
        `Error al obtener personajes [${idsString}]. Código: ${response.status}`,
        response.status,
        'SERVER_ERROR'
      );
    }
    const data = await response.json();
    if (!data) {
      throw new RickMortyServiceError('Respuesta vacía de la API.', 500, 'INVALID_DATA');
    }
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error instanceof RickMortyServiceError) throw error;
    throw new RickMortyServiceError(
      'No pudimos conectar con el Consejo Interdimensional.',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Fetches all necessary characters for the Dimension Raid arcade game.
 * Uses real character IDs for Rick (Player), Morty (Support), and diverse Enemies/Bosses.
 * @param {AbortSignal} [signal]
 * @returns {Promise<{player: Object, support: Object, enemies: Array, bosses: Object, allCharacters: Array}>}
 */
export async function getCharactersForGame(signal = null) {
  const targetIds = [
    CHARACTER_IDS.RICK,
    CHARACTER_IDS.MORTY,
    CHARACTER_IDS.SUMMER,
    CHARACTER_IDS.BIRDPERSON,
    CHARACTER_IDS.MEESEEKS,
    CHARACTER_IDS.EVIL_MORTY,
    CHARACTER_IDS.CRONENBERG_RICK,
    CHARACTER_IDS.GROMBFLOMITE
  ];

  try {
    const charactersList = await getCharacters(targetIds, signal);

    const characterMap = {};
    if (Array.isArray(charactersList)) {
      charactersList.forEach((char) => {
        if (char && char.id) {
          characterMap[char.id] = char;
        }
      });
    }

    const player = characterMap[CHARACTER_IDS.RICK] || FALLBACK_GAME_CHARACTERS.player;
    const support = characterMap[CHARACTER_IDS.MORTY] || FALLBACK_GAME_CHARACTERS.support;

    const enemies = [
      characterMap[CHARACTER_IDS.MEESEEKS] || FALLBACK_GAME_CHARACTERS.enemies[0],
      characterMap[CHARACTER_IDS.GROMBFLOMITE] || FALLBACK_GAME_CHARACTERS.enemies[1],
      characterMap[CHARACTER_IDS.BIRDPERSON] || FALLBACK_GAME_CHARACTERS.enemies[2]
    ];

    const bosses = {
      1: characterMap[CHARACTER_IDS.MEESEEKS] || FALLBACK_GAME_CHARACTERS.bosses[1],
      2: characterMap[CHARACTER_IDS.BIRDPERSON] || FALLBACK_GAME_CHARACTERS.bosses[2],
      3: characterMap[CHARACTER_IDS.EVIL_MORTY] || characterMap[CHARACTER_IDS.CRONENBERG_RICK] || FALLBACK_GAME_CHARACTERS.bosses[3]
    };

    return {
      player,
      support,
      enemies,
      bosses,
      allCharacters: charactersList
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('[rickMortyService] Returning fallback characters after API error:', err);
    throw err;
  }
}
