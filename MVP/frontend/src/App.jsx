// =============================================================================
// TIER 1 - APPLICATION SHELL & CENTRAL ROUTING TABLE
// Standardized in dev_rules.md Section 2.7 (Page & Route Tree Structure)
// Code-splits the Admin Portal bundle away from the Visitor Web App bundle so
// the visitor payload stays minimal on outdoor mobile networks.
// =============================================================================

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRouteGuard from './components/admin/AdminRouteGuard.jsx';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext.jsx';
import { VisitorSessionProvider } from './contexts/VisitorSessionContext.jsx';
import { MiniAudioPlayer } from './components/visitor/MiniAudioPlayer.jsx';

// -----------------------------------------------------------------------------
// CENTRAL ROUTE PATH REGISTRY
// Developers and AI Agents must reference these standardized constants.
// -----------------------------------------------------------------------------
export const VISITOR_ROUTES = {
  HOME: '/visitor',
  TOUR: '/tour',
  CHECKOUT_SUCCESS: '/visitor/checkout/success',
};

export const ADMIN_ROUTES = {
  LOGIN: '/admin/login',
  DASHBOARD: '/admin',
  ANALYTICS: '/admin/analytics',
  POIS: '/admin/pois',
  GEOFENCE: '/admin/geofence',
  TRANSLATIONS: '/admin/translations',
  HEALTH: '/admin/health',
};

// -----------------------------------------------------------------------------
// LAZY-LOADED PAGE VIEWS (CODE-SPLIT BUNDLES)
// -----------------------------------------------------------------------------
// Visitor Domain (Mobile-First)
const VisitorTourPage = lazy(() => import('./views/visitor/VisitorTourPage.jsx'));
const CheckoutSuccessPage = lazy(() => import('./views/visitor/CheckoutSuccessPage.jsx'));

// Admin Domain (Desktop-First)
const AdminLoginView = lazy(() => import('./views/admin/AdminLoginView.jsx'));
const AnalyticsDashboard = lazy(() => import('./views/admin/AnalyticsDashboard.jsx'));
const PoiCatalogPage = lazy(() => import('./views/admin/PoiCatalogPage.jsx'));
const GeofenceCalibPage = lazy(() => import('./views/admin/GeofenceCalibPage.jsx'));
const TranslationPage = lazy(() => import('./views/admin/TranslationPage.jsx'));
const SystemHealthPage = lazy(() => import('./views/admin/SystemHealthPage.jsx'));

// Fallback / Error Domain
const NotFoundPage = lazy(() => import('./views/NotFoundPage.jsx'));

export default function App() {
  return (
    <VisitorSessionProvider>
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
            {/* Visitor Web App Routes (Mobile-First, Public Access) */}
            <Route path="/" element={<VisitorTourPage />} />
            <Route path={VISITOR_ROUTES.HOME} element={<VisitorTourPage />} />
            <Route path={VISITOR_ROUTES.TOUR} element={<Navigate to={VISITOR_ROUTES.HOME} replace />} />
            <Route path={VISITOR_ROUTES.CHECKOUT_SUCCESS} element={<CheckoutSuccessPage />} />
            <Route path="/checkout/success" element={<Navigate to={VISITOR_ROUTES.CHECKOUT_SUCCESS} replace />} />

            {/* Admin Web Portal Routes (Desktop-First) */}
            <Route path={ADMIN_ROUTES.LOGIN} element={<AdminLoginView />} />
            <Route
              path={ADMIN_ROUTES.DASHBOARD}
              element={
                <AdminRouteGuard>
                  <AnalyticsDashboard />
                </AdminRouteGuard>
              }
            />
            <Route
              path={ADMIN_ROUTES.ANALYTICS}
              element={
                <AdminRouteGuard>
                  <AnalyticsDashboard />
                </AdminRouteGuard>
              }
            />
            <Route
              path={ADMIN_ROUTES.POIS}
              element={
                <AdminRouteGuard>
                  <PoiCatalogPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path={`${ADMIN_ROUTES.POIS}/:id/geofence`}
              element={
                <AdminRouteGuard>
                  <GeofenceCalibPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path={ADMIN_ROUTES.GEOFENCE}
              element={
                <AdminRouteGuard>
                  <GeofenceCalibPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path={ADMIN_ROUTES.TRANSLATIONS}
              element={
                <AdminRouteGuard>
                  <TranslationPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path={ADMIN_ROUTES.HEALTH}
              element={
                <AdminRouteGuard>
                  <SystemHealthPage />
                </AdminRouteGuard>
              }
            />

            {/* Catch-all Wildcard Route: User-Friendly 404 Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <MiniAudioPlayer />
      </AudioPlayerProvider>
    </VisitorSessionProvider>
  );
}
