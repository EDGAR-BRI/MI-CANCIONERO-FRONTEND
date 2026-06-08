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
  site: 'https://micancionero.online',
  output: 'server', // O 'hybrid' si algunas páginas son estáticas
  adapter: vercel(),
  integrations: [react(), AstroPWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: 'Cancionero Letras y Acordes',
      short_name: 'Cancionero',
      description: 'Tu colección personal de letras y acordes.',
      theme_color: '#0a0a0a',
      background_color: '#0a0a0a',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icono.svg',
          sizes: '192x192',
          type: 'image/svg+xml'
        },
        {
          src: '/icono.svg',
          sizes: '512x512',
          type: 'image/svg+xml'
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
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
});