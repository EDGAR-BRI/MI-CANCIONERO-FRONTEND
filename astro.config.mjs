import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel'; // Importa el adaptador
import path from 'path';
import { fileURLToPath } from 'url';

import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 4321
  },
  site: 'https://www.micancionero.online',
  output: 'server', // O 'hybrid' si algunas páginas son estáticas
  adapter: vercel(),
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [react(), AstroPWA({
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
        },
        {
          src: '/icono.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any'
        }
      ]
    },
    workbox: {
      navigateFallback: '/404',
      globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}']
    },
    devOptions: {
      enabled: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
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