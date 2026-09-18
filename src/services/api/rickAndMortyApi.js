import { API_ENDPOINTS } from '../../config/api.js';

/**
 * Custom API error for structured error handling
 */
export class RickAndMortyApiError extends Error {
  constructor(message, status = null, code = 'API_ERROR') {
    super(message);
    this.name = 'RickAndMortyApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Fetches characters with pagination and optional search / filter parameters.
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {string} [options.name='']
 * @param {string} [options.status='']
 * @param {string} [options.gender='']
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{info: {count: number, pages: number, next: string|null, prev: string|null}, results: Array}>}
 */
export async function getCharacters({ page = 1, name = '', status = '', gender = '', signal } = {}) {
  const queryParams = new URLSearchParams();

  if (page) {
    queryParams.append('page', page.toString());
  }

  const trimmedName = name ? name.trim() : '';
  if (trimmedName) {
    queryParams.append('name', trimmedName);
  }

  if (status && status !== 'all') {
    queryParams.append('status', status);
  }

  if (gender && gender !== 'all') {
    queryParams.append('gender', gender);
  }

  const queryString = queryParams.toString();
  const url = `${API_ENDPOINTS.characters}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      if (response.status === 404) {
        throw new RickAndMortyApiError(
          'DIMENSION NOT FOUND: We could not locate any beings matching this query in the current universe timeline.',
          404,
          'NOT_FOUND'
        );
      }
      throw new RickAndMortyApiError(
        `PORTAL GLITCH: Dimensional gateway returned status code ${response.status}.`,
        response.status,
        'SERVER_ERROR'
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error; // Let caller ignore aborted requests cleanly
    }

    if (error instanceof RickAndMortyApiError) {
      throw error;
    }

    // Network error / connection failure
    throw new RickAndMortyApiError(
      'PORTAL CONNECTION FAILED: The multiverse link could not be established. Check your interdimensional communicator connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Fetches single character details by their unique Multiverse ID.
 * @param {number|string} id
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>}
 */
export async function getCharacterById(id, { signal } = {}) {
  if (!id) {
    throw new RickAndMortyApiError('Character ID is required to pinpoint dimensional coordinates.', 400, 'BAD_REQUEST');
  }

  const url = `${API_ENDPOINTS.characters}/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      if (response.status === 404) {
        throw new RickAndMortyApiError(
          `ENTITY NOT FOUND: Character with ID #${id} does not exist in the Citadel database.`,
          404,
          'NOT_FOUND'
        );
      }
      throw new RickAndMortyApiError(
        `PORTAL GLITCH: Failed to retrieve character #${id}. Status code ${response.status}.`,
        response.status,
        'SERVER_ERROR'
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    if (error instanceof RickAndMortyApiError) {
      throw error;
    }

    throw new RickAndMortyApiError(
      'PORTAL CONNECTION FAILED: The multiverse link could not be established. Check your interdimensional communicator connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Fetches multiple characters by an array of IDs (useful for bulk favorites loading if needed).
 * @param {Array<number|string>} ids
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array>}
 */
export async function getMultipleCharacters(ids, { signal } = {}) {
  if (!ids || ids.length === 0) {
    return [];
  }

  if (ids.length === 1) {
    const single = await getCharacterById(ids[0], { signal });
    return [single];
  }

  const idsParam = ids.join(',');
  const url = `${API_ENDPOINTS.characters}/${idsParam}`;

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new RickAndMortyApiError(
        `Failed to retrieve characters list. Status ${response.status}`,
        response.status,
        'SERVER_ERROR'
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error instanceof RickAndMortyApiError) throw error;
    throw new RickAndMortyApiError(
      'PORTAL CONNECTION FAILED: Unable to synchronize multiple multiverse signals.',
      0,
      'NETWORK_ERROR'
    );
  }
}
