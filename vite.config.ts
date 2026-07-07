/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// When deploying to a GitHub Pages *project* site the app is served from
// https://<user>.github.io/<repo>/, so assets must resolve under that subpath.
// Set BASE_PATH=/bingo-bango/ in CI (the deploy workflow does this). Locally and
// on root-serving hosts (Vercel/Netlify, user/org Pages) it defaults to '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Bingo Bango — Music Bingo',
        short_name: 'Bingo Bango',
        description: 'Generate music bingo cards from your Spotify playlists.',
        theme_color: '#1db954',
        background_color: '#0b0f14',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell for offline use. Spotify API calls are never
        // cached (they need fresh auth); only static build assets are.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api/, /accounts\.spotify\.com/, /api\.spotify\.com/],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
