import { CHARACTER_IDS } from '../data/gameConfig';

const API_BASE_URL = import.meta.env.VITE_RICK_MORTY_API || 'https://rickandmortyapi.com/api';

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
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error instanceof RickMortyServiceError) throw error;
    throw new RickMortyServiceError(
      'PORTAL CONNECTION FAILED: Unable to communicate with the Rick and Morty API dimension.',
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
        `Failed to fetch character pack [${idsString}]. Status: ${response.status}`,
        response.status,
        'SERVER_ERROR'
      );
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error instanceof RickMortyServiceError) throw error;
    throw new RickMortyServiceError(
      'PORTAL CONNECTION FAILED: The multiverse datastream could not be synchronized.',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Fetches all necessary characters for the Dimension Raid arcade game.
 * Uses real character IDs for Rick (Player), Morty (Support), and diverse Enemies/Bosses.
 * @param {AbortSignal} [signal]
 * @returns {Promise<{player: Object, support: Object, enemies: Array, bosses: Object}>}
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

  const charactersList = await getCharacters(targetIds, signal);

  const characterMap = {};
  charactersList.forEach((char) => {
    characterMap[char.id] = char;
  });

  const player = characterMap[CHARACTER_IDS.RICK] || {
    id: CHARACTER_IDS.RICK,
    name: 'Rick Sanchez',
    image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
    status: 'Alive',
    species: 'Human'
  };

  const support = characterMap[CHARACTER_IDS.MORTY] || {
    id: CHARACTER_IDS.MORTY,
    name: 'Morty Smith',
    image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
    status: 'Alive',
    species: 'Human'
  };

  const enemies = [
    characterMap[CHARACTER_IDS.MEESEEKS] || {
      id: CHARACTER_IDS.MEESEEKS,
      name: 'Mr. Meeseeks',
      image: 'https://rickandmortyapi.com/api/character/avatar/242.jpeg',
      species: 'Meeseeks'
    },
    characterMap[CHARACTER_IDS.GROMBFLOMITE] || {
      id: CHARACTER_IDS.GROMBFLOMITE,
      name: 'Gromflomite Guard',
      image: 'https://rickandmortyapi.com/api/character/avatar/144.jpeg',
      species: 'Alien'
    },
    characterMap[CHARACTER_IDS.BIRDPERSON] || {
      id: CHARACTER_IDS.BIRDPERSON,
      name: 'Birdperson (Corrupted)',
      image: 'https://rickandmortyapi.com/api/character/avatar/8.jpeg',
      species: 'Alien'
    }
  ];

  const bosses = {
    1: characterMap[CHARACTER_IDS.MEESEEKS],
    2: characterMap[CHARACTER_IDS.BIRDPERSON],
    3: characterMap[CHARACTER_IDS.EVIL_MORTY] || characterMap[CHARACTER_IDS.CRONENBERG_RICK]
  };

  return {
    player,
    support,
    enemies,
    bosses,
    allCharacters: charactersList
  };
}
