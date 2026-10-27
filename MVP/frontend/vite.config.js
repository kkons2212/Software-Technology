import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + Vitest configuration.
// The Admin Portal and Visitor Web App are code-split via dynamic imports (see src/App.jsx)
// so the visitor bundle stays minimal for mobile networks.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
});
