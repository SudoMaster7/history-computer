import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Da Valvula a IA',
        short_name: 'Bit',
        description: 'RPG educacional sobre a historia da computacao.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#080c18',
        theme_color: '#080c18',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    /*
     * Limpa o dist a cada build. Sem isto, os bundles antigos ficam para tras
     * com o hash velho no nome: o deploy sobe lixo e, pior, o service worker
     * pre-carrega todos eles (o precache tinha chegado a 79 arquivos e 4 MB).
     */
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/core/**/*.ts'],
      // types.ts e so tipos e index.ts e so reexport: nao ha logica para cobrir.
      exclude: ['src/core/**/*.test.ts', 'src/core/types.ts', 'src/core/index.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
