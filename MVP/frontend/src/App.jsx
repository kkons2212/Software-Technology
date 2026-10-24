// =============================================================================
// TIER 1 - APPLICATION SHELL & ROUTING
// Code-splits the Admin Portal bundle away from the Visitor Web App bundle so
// the visitor payload stays minimal on outdoor mobile networks.
// =============================================================================

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRouteGuard from './components/admin/AdminRouteGuard.jsx';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext.jsx';
import { MiniAudioPlayer } from './components/visitor/MiniAudioPlayer.jsx';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_HOME_PATH = '/admin';

const AdminLoginView = lazy(() => import('./views/admin/AdminLoginView.jsx'));

// Temporary landing surface for authenticated Administrators. The exhibit catalog,
// multilingual curation, and telemetry modules are delivered in later user stories.
const ADMIN_WORKSPACE_PLACEHOLDER = (
  <div className="mx-auto w-full max-w-4xl px-6 py-10">
    <h1 className="text-xl font-semibold text-slate-900">Administrative Workspace</h1>
    <p className="mt-2 text-sm text-slate-600">
      You are signed in. Exhibit catalog, multilingual curation, and telemetry modules arrive in
      later user stories.
    </p>
  </div>
);

export default function App() {
  return (
    <AudioPlayerProvider>
      <Suspense
        fallback={
          <div
            role="status"
            className="flex min-h-screen items-center justify-center text-sm text-slate-600"
          >
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to={ADMIN_HOME_PATH} replace />} />
          <Route path={ADMIN_LOGIN_PATH} element={<AdminLoginView />} />
          <Route
            path={ADMIN_HOME_PATH}
            element={<AdminRouteGuard>{ADMIN_WORKSPACE_PLACEHOLDER}</AdminRouteGuard>}
          />
          <Route path="*" element={<Navigate to={ADMIN_HOME_PATH} replace />} />
        </Routes>
      </Suspense>
      <MiniAudioPlayer />
    </AudioPlayerProvider>
  );
}
