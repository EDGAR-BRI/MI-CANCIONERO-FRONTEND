# MI CANCIONERO

Cancionero digital para músicos católicos. Aplicación web para gestionar canciones con acordes en formato ChordPro, organizar misas y compartir listas de reproducción litúrgicas.

**Producción:** [https://www.micancionero.online](https://www.micancionero.online)

## Repositorios

| Componente | Repositorio |
|------------|-------------|
| Frontend | [MI-CANCIONERO-FRONTEND](https://github.com/EDGAR-BRI/MI-CANCIONERO-FRONTEND) |
| Backend | [MI-CANCIONERO-BACKEND](https://github.com/EDGAR-BRI/MI-CANCIONERO-BACKEND) |

## Features

- **Editor ChordPro** — Editor de código con vista previa en tiempo real, inserción de acordes y secciones
- **Transposición de acordes** — Cambio de tonalidad al instante
- **Generación de acordes con IA** — Búsqueda por letras o generación automática de acordes
- **Gestión de Misas** — Crear y organizar misas por momentos litúrgicos (Entrada, Ofertorio, Comunión, etc.)
- **Enlaces compartidos** — Compartir misas vía enlaces con tokens de acceso
- **Reproductor de YouTube** — Videos embebidos para cada canción
- **Panel de administración** — Gestión de usuarios, canciones y roles/permisos
- **PWA** — Aplicación web progresiva con soporte offline
- **Modo oscuro** — Tema oscuro por defecto con estilos optimizados para impresión

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Astro 5 (SSR) |
| UI Library | React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 |
| Despliegue | Vercel |
| PWA | @vite-pwa/astro + Workbox |

## Prerrequisitos

- Node.js >= 18
- npm
- Backend corriendo y accesible (ver [MI-CANCIONERO-BACKEND](https://github.com/EDGAR-BRI/MI-CANCIONERO-BACKEND))

## Instalación

```bash
# Clonar el repositorio
git clone git@github.com:EDGAR-BRI/MI-CANCIONERO-FRONTEND.git

# Entrar al directorio
cd MI-CANCIONERO-FRONTEND

# Instalar dependencias
npm install

# Copiar el archivo de ejemplo de variables de entorno
cp .env.example .env

# Editar .env con la URL de tu backend
# PUBLIC_API_URL="http://localhost:3000/api"
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en `localhost:4321` |
| `npm run build` | Construye el proyecto para producción en `./dist/` |
| `npm run preview` | Previsualiza la build de producción localmente |

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PUBLIC_API_URL` | URL del backend API | `http://localhost:3000/api` |

## Estructura del Proyecto

```
MI-CANCIONERO-FRONTEND/
├── public/                  # Assets estáticos (favicon, logos, robots.txt)
├── src/
│   ├── actions/             # Acciones server-side (login, register, etc.)
│   ├── components/          # Componentes Astro y React
│   │   ├── Ui/              # Componentes de UI reutilizables
│   │   └── skeletons/       # Skeletons de carga
│   ├── layouts/             # Layouts (Layout, LoginLayout, AdminLayout)
│   ├── pages/               # Rutas de la aplicación
│   │   ├── songs/           # CRUD de canciones
│   │   ├── misas/           # Gestión de misas
│   │   └── admin/           # Panel de administración
│   ├── services/            # Capa de servicios (API calls)
│   ├── styles/              # Estilos globales y Tailwind
│   ├── types/               # Definiciones de tipos TypeScript
│   └── utils/               # Utilidades (auth, música, alerts)
├── astro.config.mjs         # Configuración de Astro
├── package.json
└── tsconfig.json
```

## Deploy

El proyecto está configurado para desplegarse en **Vercel** usando el adaptador `@astrojs/vercel`. Para desplegar:

1. Conectar el repositorio a Vercel
2. Configurar la variable de entorno `PUBLIC_API_URL` en el panel de Vercel
3. El build se ejecutará automáticamente en cada push
