/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base = GitHub Pages project path. TOUCHPOINT: renamed with the repo
// (project-tw -> climx, 2026-07-29) together with public/404.html and the
// Pages URL.
export default defineConfig({
  base: '/climx/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      // The M1 item-5 gate: the data layer holds the line or CI fails.
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});

// Made with my soul - Swately <3
