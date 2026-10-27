import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + Vitest configuration.
// The Admin Portal and Visitor Web App are code-split via dynamic imports (see src/App.jsx)
// so the visitor bundle stays minimal for mobile networks.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // -------------------------------------------------------------------------
    // DEV-ENVIRONMENT API PROXY (US 02.1 / AC-02.1.3)
    // -------------------------------------------------------------------------
    // apiClient.js issues RELATIVE paths (e.g. '/api/v1/auth/login') and the
    // backend session cookie is SameSite=Strict. Both facts require the browser
    // to reach FastAPI on the SAME origin it loaded the SPA from. Without this
    // block the request stops at the Vite dev server (:5173), which answers
    // with a non-JSON 404, so the login POST fails and AdminRouteGuard can never
    // observe an authenticated session.
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
