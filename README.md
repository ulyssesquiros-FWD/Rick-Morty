# Rick & Morty: Dimension Raid 🌌🎮

**Quiz #5 — Desarrollo Web Frontend: Videojuego 2D con React + Consumo de Datos + n8n**

Videojuego arcade 2D de acción lateral inspirado en clásicos tipo *Contra*, completamente tematizado en el universo de **Rick and Morty**. El jugador controla a **Rick Sanchez**, atraviesa dimensiones paralelas, derrota oleadas de enemigos generados dinámicamente desde la **Rick and Morty API**, enfrenta jefes dimensionales, registra sus puntuaciones en un backend local con **json-server** y clasifica sus resultados mediante un workflow automatizado en **n8n**.

---

## 🚀 Tecnologías y Herramientas

- **React 19** (Functional Components, Hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `useContext`)
- **HTML5 Canvas 2D & requestAnimationFrame** (Motor de físicas, colisiones AABB, partículas y renderizado de sprites)
- **React Router DOM v7** (Enrutamiento dinámico `/nivel/:num`, `/niveles`, `/leaderboard`, etc.)
- **CSS3 Moderno** (Variables CSS, Glassmorphism, animaciones espaciales y soporte responsive/móvil)
- **Rick and Morty API** (`https://rickandmortyapi.com/api` — Consumo real de personajes y avatares)
- **json-server** (`http://localhost:3001/scores` — Backend REST local para puntuaciones)
- **n8n Automation** (`http://localhost:5678/webhook/dimension-raid-score` — Webhook de clasificación)
- **Canvas-Confetti** (Efectos visuales en victoria dimensional)

---

## 🕹️ Mecánicas del Juego y Controles

### Controles de Escritorio:
- **A / D** o **← / →**: Moverse a la izquierda / derecha.
- **W** o **↑**: Saltar.
- **SPACE** o **J**: Disparar pistola de portal (láser de plasma).
- **ESC**: Pausar / Reanudar la partida.

### Controles Móviles / Tablet:
- **D-Pad Táctil en Pantalla**: Botones ◀ y ▶ para movimiento.
- **Botones de Acción Táctil**: ▲ para salto y ⚡ para disparo continuo.

### Sistema de Puntuación:
- **Enemigo regular (Mr. Meeseeks):** +100 pts
- **Enemigo volador (Corrupted Birdperson):** +175 pts
- **Enemigo élite (Gromflomite):** +250 pts
- **Jefe de nivel:** +600 pts
- **Completar nivel:** +1000 pts (+ bonificación de vidas y tiempo)

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Clonar e instalar dependencias:
```bash
npm install
```

### 2. Configurar variables de entorno:
El archivo `.env` ya viene configurado con los endpoints locales y remotos:
```env
VITE_API_URL=http://localhost:3001
VITE_RICK_MORTY_API=https://rickandmortyapi.com/api
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/dimension-raid-score
```

### 3. Iniciar el backend local (json-server):
En una terminal secundaria:
```bash
npm run server
# o directamente: npx json-server --watch db.json --port 3001
```

### 4. Iniciar n8n (Opcional para automatización):
```bash
npx n8n
# Importar el archivo n8n/dimension-raid-score-workflow.json en http://localhost:5678
```

### 5. Iniciar la aplicación React (Vite):
```bash
npm run dev
```

---

## 🌐 Endpoints y Flujo de Datos

1. **Rick and Morty API (`GET`)**:
   - `GET https://rickandmortyapi.com/api/character/1,2,3,8,144,242...`
   - Alimenta los assets del jugador (Rick), compañero (Morty) y enemigos en el canvas.
2. **Leaderboard Backend (`GET`)**:
   - `GET http://localhost:3001/scores`
   - Consulta el historial de mejores puntuaciones.
3. **Guardado de Partida (`POST`)**:
   - `POST http://localhost:3001/scores`
   - Envía el registro de jugador, puntuación, nivel, enemigos y duración.
4. **Automatización n8n (`POST`)**:
   - `POST http://localhost:5678/webhook/dimension-raid-score`
   - Clasifica la partida en **DIMENSION MASTER** (score >= 1000) o **PORTAL ROOKIE** y asigna recompensas.

---

## 🪐 Niveles de Juego

- **Nivel 1 — Earth C-137 (`/nivel/1`):** Terreno tóxico suburbano. Enemigos Meeseeks y Gromflomites. Jefe: *Alpha Mr. Meeseeks*.
- **Nivel 2 — Citadel of Ricks (`/nivel/2`):** Cuadrícula de seguridad cibernética. Plataformas magnéticas y drones. Jefe: *Cyber Birdperson*.
- **Nivel 3 — Final Dimension (`/nivel/3`):** Fractura del multiverso. Velocidad extrema de enemigos. Jefe: *Evil Morty con Cañón Dimensional*.

---

## 📁 Estructura del Proyecto

```text
src/
├── components/              # Componentes UI reutilizables
│   ├── CharacterCard.jsx    # Tarjeta de personaje con rol y puntos
│   ├── Enemy.jsx            # Expediente de amenaza enemiga
│   ├── ErrorState.jsx       # Componente de error con reintento
│   ├── GameBoard.jsx        # Canvas 2D y loop de físicas
│   ├── GameControls.jsx     # Atajos de teclado y botones táctiles
│   ├── GameHUD.jsx          # HUD arcade en tiempo real (vidas, puntos, salud)
│   ├── GameOverModal.jsx    # Modal de Victoria / Game Over con n8n
│   ├── Leaderboard.jsx      # Tabla interactiva y ordenada de puntajes
│   ├── LevelSelector.jsx    # Selector de portales dimensionales
│   ├── LoadingState.jsx     # Loader temático de portal
│   ├── Navbar.jsx           # Barra de navegación con badge de agente
│   ├── Player.jsx           # Ficha de estadísticas de Rick
│   ├── Projectile.jsx       # Ficha de armamento de energía
│   └── Footer.jsx           # Pie de página temático
├── context/
│   └── GameContext.jsx      # Estado global, persistencia de score y n8n
├── data/
│   └── gameConfig.js        # Configuración de niveles, plataformas y físicas
├── hooks/
│   ├── useGameEngine.js     # Motor 2D con requestAnimationFrame y colisiones
│   ├── useGameTimer.js      # Temporizador de misión
│   └── useRickMorty.js      # Hook para carga de sprites desde la API
├── pages/
│   ├── Home.jsx             # Portada arcade y selección de agente (/)
│   ├── Game.jsx             # Pantalla de juego dinámica (/nivel/:num)
│   ├── Levels.jsx           # Selector de dimensiones (/niveles)
│   ├── LeaderboardPage.jsx  # Salón de la fama multiversal (/leaderboard)
│   └── NotFound.jsx         # Página 404 para dimensiones perdidas (*)
├── routes/
│   └── AppRoutes.jsx        # Definición centralizada de rutas
├── services/
│   ├── n8nService.js        # Integración con el webhook de n8n
│   ├── rickMortyService.js  # Consumo de la Rick and Morty API
│   └── scoreService.js      # Consumo GET y POST de json-server
├── styles/
│   ├── components.css       # Estilos modulares de componentes
│   ├── game.css             # Estilos de HUD, Canvas y modal
│   ├── home.css             # Estilos de la portada y briefing
│   ├── index.css            # Estilos base y fondo estelar
│   ├── leaderboard.css      # Estilos de tabla de líderes
│   └── variables.css        # Tokens de diseño y colores neón
├── App.jsx                  # Envoltura principal con Providers y Layout
└── main.jsx                 # Punto de entrada de React
```

---

## 📑 Documentación Adicional

- [docs/rubrica-checklist.md](docs/rubrica-checklist.md): Mapeo punto por punto de los 100 puntos de la rúbrica del Quiz #5.
- [docs/n8n.md](docs/n8n.md): Detalle técnico del flujo de n8n y pruebas con cURL.
- [docs/n8n-workflow.svg](docs/n8n-workflow.svg): Diagrama visual de la arquitectura del webhook.
- [n8n/dimension-raid-score-workflow.json](n8n/dimension-raid-score-workflow.json): Definición JSON del workflow importable.
