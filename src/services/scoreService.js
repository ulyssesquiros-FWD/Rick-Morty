const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const LOCAL_STORAGE_SCORES_KEY = 'dimension_raid_fallback_scores';

/**
 * Custom error for Score operations
 */
export class ScoreServiceError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ScoreServiceError';
    this.status = status;
  }
}

/**
 * Retrieves all scores from json-server backend with fallback to local storage.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>}
 */
export async function getScores(signal = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/scores`, { signal });

    if (!response.ok) {
      throw new ScoreServiceError(`Backend returned HTTP status ${response.status}`, response.status);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    console.warn('JSON-Server unreachable. Falling back to local storage cache for scores.', error);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Saves a new score entry via POST to json-server and persists locally.
 * @param {Object} scoreData
 * @param {string} scoreData.player
 * @param {number} scoreData.score
 * @param {number} scoreData.level
 * @param {number} scoreData.enemiesDefeated
 * @param {number} scoreData.livesRemaining
 * @param {number} scoreData.duration
 * @param {string} [scoreData.classification]
 * @returns {Promise<Object>}
 */
export async function saveScore(scoreData) {
  const normalizedData = {
    player: scoreData.player || 'Anonymous Rick',
    score: Number(scoreData.score) || 0,
    level: Number(scoreData.level) || 1,
    enemiesDefeated: Number(scoreData.enemiesDefeated) || 0,
    livesRemaining: Number(scoreData.livesRemaining) || 0,
    duration: Number(scoreData.duration) || 0,
    classification: scoreData.classification || (scoreData.score >= 1000 ? 'DIMENSION MASTER' : 'PORTAL ROOKIE'),
    createdAt: new Date().toISOString()
  };

  // Always cache locally as backup
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
    const scoresList = cached ? JSON.parse(cached) : [];
    scoresList.unshift({ id: Date.now(), ...normalizedData });
    localStorage.setItem(LOCAL_STORAGE_SCORES_KEY, JSON.stringify(scoresList.slice(0, 50)));
  } catch (e) {
    console.warn('Could not cache score to localStorage:', e);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(normalizedData)
    });

    if (!response.ok) {
      throw new ScoreServiceError(`Failed to save score. Status ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    console.warn('JSON-Server POST failed, saved to local cache fallback.', error);
    return {
      success: true,
      savedLocally: true,
      ...normalizedData
    };
  }
}
