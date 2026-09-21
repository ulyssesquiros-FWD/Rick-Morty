# Checklist de Rúbrica — Quiz #5: Videojuego con React + Consumo de Datos

**Proyecto:** Rick & Morty: Dimension Raid  
**Puntaje Total Objetivo:** 100 / 100

---

## 🧩 1. Componentes — 15 / 15 pts

- [x] **Mínimo 4 componentes reutilizables implementados:**
  - `GameBoard.jsx`: Renderizado del Canvas 2D y loop de físicas.
  - `GameHUD.jsx`: Visualización de métricas en tiempo real (Salud, Vidas, Nivel, Puntos, Enemigos, Timer, Pausa).
  - `Player.jsx`: Expediente y ficha de estadísticas de Rick Sanchez.
  - `Enemy.jsx`: Ficha y métricas de enemigos (Meeseeks, Gromflomite, Birdperson).
  - `Projectile.jsx`: Demostración de munición de energía y portal gun.
  - `GameControls.jsx`: Controles de teclado y botones táctiles interactivos.
  - `CharacterCard.jsx`: Tarjetas de personajes provenientes de la API.
  - `Leaderboard.jsx`: Tabla dinámica y reactiva de mejores puntuaciones.
  - `LevelSelector.jsx`: Selector visual de dimensiones con dificultad y jefes.
  - `GameOverModal.jsx`: Modal de fin de partida (Victoria / Derrota) con clasificación n8n.
  - `LoadingState.jsx`: Spinner dimensional de carga con leyenda temática.
  - `ErrorState.jsx`: Pantalla de error con acción de reintento.
- [x] **Comunicación por Props:** Todos los componentes reciben información mediante props claras y reutilizables.
- [x] **Keys únicas y estables:** Renderizado de listas mediante `.map()` con `key={item.id}` estable, evitando `key={index}`.
- [x] **Separación de responsabilidades:** Componentes pequeños y modulares sin lógica masiva en `App.jsx`.

---

## ⚡ 2. Estados y Hooks — 20 / 20 pts

- [x] **`useState`:**
  - `score`, `lives`, `playerHealth`, `currentLevel`, `gameStatus`, `enemiesDefeated`, `sessionResult`, `playerName`, `seconds`.
- [x] **`useEffect`:**
  - Carga asíncrona de la Rick and Morty API.
  - Listeners de teclado (WASD, Flechas, Espacio, Escape).
  - Control de inicio y detención del loop `requestAnimationFrame`.
  - Limpieza de event listeners y temporizadores.
- [x] **`useRef`:**
  - `canvasRef`: Referencia al canvas HTML5.
  - `animationFrameIdRef`: Referencia a `requestAnimationFrame`.
  - `gameStateRef`: Estado técnico de alto rendimiento del loop de físicas.
  - `keysRef`: Mapeo de teclas presionadas sin causar re-renders innecesarios.
  - `imageCacheRef`: Caché de imágenes pre-cargadas.
- [x] **`useContext`:**
  - `GameContext.jsx` y hook `useGame()` para estado global.
- [x] **`useMemo` & `useCallback`:**
  - `useMemo` en `Leaderboard.jsx` para ordenar puntuaciones descendentemente.
  - `useCallback` en `useRickMorty.js`, `GameContext.jsx` y `useGameEngine.js` para estabilizar handlers.
- [x] **Inmutabilidad estricta:** Sin mutaciones directas de estado (`prev => ...`).

---

## 🛣️ 3. Rutas — 15 / 15 pts

- [x] **React Router DOM v7 integrado:**
  - `/` → `Home.jsx` (Portada arcade, ingreso de nombre, briefing).
  - `/niveles` → `Levels.jsx` (Selector de dimensiones).
  - `/nivel/:num` → `Game.jsx` (Ruta dinámica que lee el nivel con `useParams()`).
  - `/leaderboard` → `LeaderboardPage.jsx` (Tabla de líderes y salón de la fama).
  - `*` → `NotFound.jsx` (Página 404 dimensional).
- [x] **Ruta dinámica real:** `/nivel/:num` procesa niveles 1, 2 y 3 con diferente dificultad, velocidad y jefe.
- [x] **Navegación SPA:** Uso exclusivo de `<Link>` y `useNavigate()`.

---

## 🌐 4. Consumo de Datos — 20 / 20 pts

- [x] **GET real a Rick and Morty API (`https://rickandmortyapi.com/api`):**
  - Consumo de personajes reales (`/character/1,2,3,8,144,242...`) en `src/services/rickMortyService.js`.
  - Integración visual real de sprites y avatares de Rick, Morty y enemigos en el juego.
- [x] **GET real a json-server (`http://localhost:3001/scores`):**
  - Implementado en `src/services/scoreService.js` para alimentar el Leaderboard.
- [x] **POST real a json-server (`http://localhost:3001/scores`):**
  - Registro de resultados al finalizar cada partida con payload completo.
- [x] **Manejo de estados de carga (`loading`):** `LoadingState.jsx` temático.
- [x] **Manejo de errores (`error`):** `ErrorState.jsx` con botón de reintento.
- [x] **Resiliencia:** Fallback a `localStorage` si `json-server` está temporalmente fuera de línea.

---

## 🤖 5. Integración y Workflow n8n — 15 / 15 pts

- [x] **Webhook real en n8n:** Endpoint `/webhook/dimension-raid-score`.
- [x] **Workflow completo y encadenado (6 nodos):**
  - Webhook → Validar y Normalizar Datos → IF `score >= 1000` → Clasificar Master / Rookie → Respond to Webhook.
- [x] **Petición POST real desde el Frontend:** Implementada en `src/services/n8nService.js`.
- [x] **Captura / Diagrama del flujo:** `docs/n8n-workflow.svg` y archivo JSON `n8n/dimension-raid-score-workflow.json`.
- [x] **Documentación completa:** `n8n/README.md` y `docs/n8n.md`.

---

## 🎮 6. Jugabilidad y Mecánica 2D — 10 / 10 pts

- [x] **Partida 100% funcional:**
  - Movimiento lateral fluido y salto con gravedad.
  - Disparo de ráfagas de plasma con cooldown y partículas.
  - Enemigos terrestres y voladores con patrones de ataque.
  - Jefe final en cada nivel.
  - Detección de colisiones bala-enemigo y enemigo-jugador.
  - Sistema de vidas (3 vidas), salud (0-100 HP) y puntuación acumulativa.
  - Victoria al derrotar al jefe y Game Over al perder las vidas.
  - Pausa con ESC y reanudación instantánea.
- [x] **Controles:** Teclado (WASD / Flechas / Espacio) + Botones táctiles virtuales para móviles.

---

## 📁 7. Repositorio y Entregables — 5 / 5 pts

- [x] **`README.md` completo:** Guía de instalación, comandos, endpoints y arquitectura.
- [x] **`db.json`:** Base de datos inicial para `json-server`.
- [x] **Variables de entorno:** `.env` y `.env.example` centralizados.
- [x] **Commits progresivos:** Historial de commits ordenado y semántico.
