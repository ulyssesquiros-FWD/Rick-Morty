# Workflow n8n — Dimension Raid Score Processing ⚡

Este directorio contiene la definición del workflow de automatización en n8n para el procesamiento, clasificación y recompensas de las partidas del videojuego **Rick & Morty: Dimension Raid**.

---

## 📋 Estructura del Flujo

El workflow está compuesto por 6 nodos encadenados:

1. **Webhook Incursión** (`n8n-nodes-base.webhook`):
   - Método: `POST`
   - Path: `dimension-raid-score`
   - URL local: `http://localhost:5678/webhook/dimension-raid-score`
2. **Validar y Normalizar** (`n8n-nodes-base.code`):
   - Sanitiza el nombre del agente.
   - Convierte los campos numéricos (`score`, `level`, `enemiesDefeated`, `livesRemaining`, `duration`).
   - Genera timestamp ISO si no está presente.
3. **IF Score >= 1000** (`n8n-nodes-base.if`):
   - Evalúa si el jugador alcanzó el puntaje mínimo de maestría (1000 puntos).
4. **Clasificar Master** (`n8n-nodes-base.code` - Rama True):
   - Asigna clasificación `DIMENSION MASTER`.
   - Tier `S-Rank` y recompensa *Skins de Portal Gun Dorada*.
5. **Clasificar Rookie** (`n8n-nodes-base.code` - Rama False):
   - Asigna clasificación `PORTAL ROOKIE`.
   - Tier `B-Rank` y recompensa *Batería de Portal Estándar*.
6. **Respond to Webhook** (`n8n-nodes-base.respondToWebhook`):
   - Devuelve la respuesta JSON con código 200 y cabeceras CORS activas.

---

## 🚀 Cómo Importar y Ejecutar el Workflow

1. Iniciar n8n en tu máquina:
   ```bash
   npx n8n
   ```
2. Abrir el panel de n8n en el navegador: [http://localhost:5678](http://localhost:5678).
3. Ir a **Workflows** → **Import from File...** y seleccionar `n8n/dimension-raid-score-workflow.json`.
4. Activar el interruptor **Active** (o usar el modo *Test step-by-step*).

---

## 📦 Ejemplo de Payload Enviado por el Frontend

```json
{
  "player": "Ulysses_C137",
  "score": 2450,
  "level": 2,
  "enemiesDefeated": 18,
  "livesRemaining": 2,
  "duration": 135,
  "timestamp": "2026-09-21T10:30:00.000Z"
}
```

## 📬 Ejemplo de Respuesta Devuelta por n8n

```json
{
  "success": true,
  "player": "Ulysses_C137",
  "score": 2450,
  "level": 2,
  "classification": "DIMENSION MASTER",
  "tier": "S-Rank",
  "badge": "🏆 Maestro Multiversal",
  "reward": "Skins de Portal Gun Dorada",
  "message": "¡Increíble desempeño, Ulysses_C137! Has demostrado maestría interdimensional con 2450 puntos.",
  "timestamp": "2026-09-21T10:30:00.000Z"
}
```
