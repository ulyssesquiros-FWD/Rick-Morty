const N8N_WEBHOOK_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_N8N_WEBHOOK_URL) || 'http://localhost:5678/webhook/dimension-raid-score';

/**
 * Sends game session data to the n8n automation webhook.
 * Processes classification and automated rewards workflow.
 * @param {Object} scoreData
 * @param {string} scoreData.player
 * @param {number} scoreData.score
 * @param {number} scoreData.level
 * @param {number} scoreData.enemiesDefeated
 * @param {number} scoreData.livesRemaining
 * @param {number} scoreData.duration
 * @returns {Promise<Object>}
 */
export async function sendScoreToN8n(scoreData) {
  const payload = {
    player: scoreData.player || 'Rick Sanchez',
    score: Number(scoreData.score) || 0,
    level: Number(scoreData.level) || 1,
    enemiesDefeated: Number(scoreData.enemiesDefeated) || 0,
    livesRemaining: Number(scoreData.livesRemaining) || 0,
    duration: Number(scoreData.duration) || 0,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`n8n webhook responded with status ${response.status}`);
      return {
        success: false,
        classification: payload.score >= 1000 ? 'DIMENSION MASTER' : 'PORTAL ROOKIE',
        message: `Webhook responded with status ${response.status}`
      };
    }

    const data = await response.json().catch(() => null);

    return {
      success: true,
      classification: data?.classification || (payload.score >= 1000 ? 'DIMENSION MASTER' : 'PORTAL ROOKIE'),
      data,
      message: data?.message || 'Resultado procesado correctamente por n8n'
    };
  } catch (error) {
    console.warn('n8n Webhook unreachable (automation is optional/offline):', error);
    return {
      success: false,
      offline: true,
      classification: payload.score >= 1000 ? 'DIMENSION MASTER' : 'PORTAL ROOKIE',
      message: 'Automatización interdimensional no disponible (n8n offline)'
    };
  }
}
