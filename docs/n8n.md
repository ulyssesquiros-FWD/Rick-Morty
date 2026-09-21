# Documentación de la Automatización n8n — Quiz #5

Este documento detalla la integración técnica entre el frontend de **Rick & Morty: Dimension Raid** y el flujo de automatización en **n8n**.

---

## 🔄 Diagrama de Flujo Encadenado

```text
[Frontend React: finishGame()]
        │
        ▼ (HTTP POST JSON)
[1. Webhook Incursión: /webhook/dimension-raid-score]
        │
        ▼
[2. Validar y Normalizar Datos]
        │
        ▼
[3. IF Score >= 1000]
       /        \
 (TRUE)          (FALSE)
     ▼              ▼
[4. Master]    [5. Rookie]
       \        /
        ▼      ▼
[6. Respond to Webhook]
        │
        ▼ (HTTP Response JSON)
[Frontend: GameOverModal (Muestra Clasificación & Recompensa)]
```

---

## 📡 Endpoint y Configuración

- **URL del Webhook en Desarrollo:**
  `http://localhost:5678/webhook/dimension-raid-score`
- **Variable de Entorno en Frontend:**
  `VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/dimension-raid-score`

---

## 🧪 Prueba Manual con cURL

Puedes probar el webhook directamente desde la terminal con el siguiente comando:

```bash
curl -X POST http://localhost:5678/webhook/dimension-raid-score \
  -H "Content-Type: application/json" \
  -d '{
    "player": "TestRick",
    "score": 1500,
    "level": 2,
    "enemiesDefeated": 15,
    "livesRemaining": 2,
    "duration": 110,
    "timestamp": "2026-09-21T10:00:00.000Z"
  }'
```

---

## 🛡️ Resiliencia y Manejo de Errores en Frontend

Si el servicio local de n8n no se encuentra en ejecución al momento de finalizar una partida, el servicio `src/services/n8nService.js` captura el error de red de forma transparente:
- La aplicación **NO se bloquea ni interrumpe la partida**.
- Se asigna una clasificación local por defecto según el puntaje alcanzado.
- El puntaje se guarda de manera segura en `json-server` (o en `localStorage` como fallback).
- Se notifica en la interfaz el estado de la automatización.
