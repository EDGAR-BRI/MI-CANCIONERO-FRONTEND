import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel'; // Importa el adaptador
import path from 'path';
import { fileURLToPath } from 'url';

import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  devToolbar: {
    enabled: false
  },
  server: {
    port: 4321
  },
  site: 'https://www.micancionero.online',
  output: 'server', // O 'hybrid' si algunas páginas son estáticas
  adapter: vercel(),
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [icon(), react(), AstroPWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      id: '/',
      name: 'Cancionero Letras y Acordes',
      short_name: 'Cancionero',
      description: 'Tu colección personal de letras y acordes.',
      theme_color: '#0a0a0a',
      background_color: '#0a0a0a',
      display: 'standalone',
      display_override: ['standalone', 'window-controls-overlay'],
      orientation: 'portrait-primary',
      scope: '/',
      start_url: '/',
      categories: ['music', 'lifestyle', 'utilities'],
      icons: [
        {
          src: '/pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png'
        },
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/pwa-maskable-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/offline',
      navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /\.[a-zA-Z0-9]+$/],
      globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}'],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages-cache',
            networkTimeoutSeconds: 2.5,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
    },
  }), sitemap()],
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    },
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: ['@blobatar/react', 'blobatar', 'blobatar/expression']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
});