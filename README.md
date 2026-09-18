# Rick & Morty — Multiverse Explorer 🌌

Aplicación frontend moderna desarrollada en **React** que consume de forma reactiva y en tiempo real la API REST oficial de **Rick and Morty** ([https://rickandmortyapi.com/api](https://rickandmortyapi.com/api)). Diseñada con una temática inmersiva de ciencia ficción, portales interdimensionales, estética neón y una arquitectura modular y escalable.

---

## 🚀 Tecnologías Utilizadas

- **React 19** (Functional Components, Hooks: `useState`, `useEffect`, `useCallback`, `useMemo`, `useContext`)
- **Vite** (Bundler ultrarrápido y entorno de desarrollo)
- **React Router DOM v7** (Enrutamiento declarativo y sincronización con URL search params)
- **Fetch API nativo & AbortController** (Consumo asíncrono con cancelación de peticiones obsoletas)
- **CSS Puro (Vanilla CSS Moderno)** (Variables CSS, CSS Grid, Flexbox, Glassmorphism, animaciones de portales e interfaces dimensionales, `@media (prefers-reduced-motion)`)
- **LocalStorage Web API** (Persistencia local reactiva del baúl de personajes favoritos)

---

## 🛠️ Instalación y Ejecución

### Prerrequisitos
- Node.js (v18 o superior)
- npm o yarn

### 1. Clonar o acceder al directorio del proyecto:
```bash
cd "c:/Users/dell5/UQV/Rick&Morty"
```

### 2. Instalar dependencias:
```bash
npm install
```

### 3. Configurar variables de entorno:
El archivo `.env` ya viene configurado con el endpoint de la API:
```env
VITE_RICK_MORTY_API_URL=https://rickandmortyapi.com/api
```
*(También se proporciona `.env.example` como plantilla)*

### 4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

### 5. Compilar para producción y validación:
```bash
npm run build
```

### 6. Ejecutar linter:
```bash
npm run lint
```

---

## 🌐 API y Endpoints Consumidos

Base URL: `https://rickandmortyapi.com/api`

- **Listado y Búsqueda con Paginación**:
  - `GET /character/?page={n}`
  - `GET /character/?page={n}&name={nombre}`
  - `GET /character/?page={n}&name={nombre}&status={alive|dead|unknown}`
- **Detalle Individual por ID**:
  - `GET /character/{id}`
- **Carga Múltiple por IDs**:
  - `GET /character/{id1,id2,...}`

---

## ✨ Funcionalidades Principales

1. **Explorador Multiversal (`/personajes`)**:
   - Listado completo de personajes provenientes de la API en vivo.
   - Paginación dinámica conectada con la metadata devuelta por la API (`info.pages`, `info.count`, `info.next`, `info.prev`).
   - Contador visual de entidades detectadas en el multiverso.
2. **Búsqueda y Filtros en Tiempo Real**:
   - Barra de búsqueda temática por nombre con botones de *Search* y *Clear*.
   - Filtro por estado vital (*All*, *Alive*, *Dead*, *Unknown*).
   - Manejo de respuestas 404 cuando una búsqueda no arroja resultados ("*DIMENSION NOT FOUND*").
3. **Expediente / Detalle Individual (`/personajes/:id`)**:
   - Consulta directa del personaje mediante su identificador en la API.
   - Dossier interactivo con avatar en aura de portal dimensional, especie, género, dimensión de origen, ubicación actual, conteo de episodios y marca de tiempo.
   - Botón de retorno al explorador y botón de guardado en favoritos.
4. **Baúl de Favoritos (`/favoritos`)**:
   - Guardado y eliminación reactiva de personajes en `localStorage`.
   - Contador sincronizado en vivo en la barra de navegación (`Navbar`).
   - Estado visual temático cuando el baúl está vacío.
5. **Portal Hero Interactivo (`/`)**:
   - Landing page con portal animado en CSS, estadísticas del multiverso y accesos directos.
6. **Manejo Integral de Estados**:
   - **Loader temático**: Portal interdimensional giratorio con anillos de energía neón.
   - **Error Handling**: Gestión amigable de errores de red, dimensiones inexistentes y fallas de conexión con opción de reintento (*Try Again*).
   - **Control de Peticiones Asíncronas**: Uso de `AbortController` para prevenir *race conditions* y cancelaciones limpias.
7. **Diseño Responsivo y Accesible**:
   - Adaptable a Desktop (4 columnas), Tablets (2-3 columnas) y Móviles (1 columna).
   - Soporte para usuarios con preferencia de movimiento reducido (`prefers-reduced-motion`).

---

## 📁 Estructura del Proyecto

```text
src/
├── assets/                  # Iconos y recursos estáticos
├── components/              # Componentes reutilizables
│   ├── CharacterCard.jsx    # Tarjeta de presentación de entidad con hover y glow
│   ├── CharacterDetail.jsx  # Vista detallada de expediente y aura de portal
│   ├── CharacterGrid.jsx    # Grid responsivo de tarjetas
│   ├── ErrorMessage.jsx     # Mensajes temáticos de error y estados vacíos
│   ├── FavoriteButton.jsx   # Botón interactivo de guardado de favoritos
│   ├── Footer.jsx           # Pie de página temático y créditos
│   ├── Hero.jsx             # Sección Hero con portal animado y estadísticas
│   ├── Loader.jsx           # Spinner de portal dimensional
│   ├── Navbar.jsx           # Barra de navegación con contador de favoritos
│   ├── Pagination.jsx       # Control de navegación entre páginas
│   ├── SearchBar.jsx        # Buscador y filtros de estado
│   └── StatusBadge.jsx      # Indicador de estado (Alive, Dead, Unknown)
├── config/
│   └── api.js               # Configuración centralizada de endpoints y URLs base
├── context/
│   └── FavoritesContext.jsx # Contexto global para gestión de favoritos y localStorage
├── pages/                   # Vistas principales de la aplicación
│   ├── Characters.jsx       # Página del explorador de personajes (/personajes)
│   ├── CharacterDetailPage.jsx # Página de detalle individual (/personajes/:id)
│   ├── Favorites.jsx        # Página de favoritos (/favoritos)
│   ├── Home.jsx             # Landing page principal (/)
│   └── NotFound.jsx         # Página 404 para dimensiones desconocidas (*)
├── routes/
│   └── AppRoutes.jsx        # Definición y centralización de rutas de la app
├── services/
│   └── api/
│       └── rickAndMortyApi.js # Capa de servicio con fetch, async/await y control de errores
├── styles/
│   ├── components.css       # Estilos específicos de componentes y vistas
│   ├── index.css            # Estilos base, reseteo, fondo cósmico y keyframes
│   └── variables.css        # Tokens de diseño, paleta Rick & Morty y tipografías
├── App.jsx                  # Envoltura principal, Router, Layout y Providers
└── main.jsx                 # Punto de entrada de la aplicación React
```
