/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base = GitHub Pages project path. TOUCHPOINT: if the repo is renamed
// (project-tw -> climx), this value and the Pages URL move together.
export default defineConfig({
  base: '/project-tw/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
});

// Made with my soul - Swately <3
