// =============================================================================
// TIER 1 - ADMIN ROUTE GUARD
// Protects every /admin/* route. Renders protected children only for an
// authenticated Administrator, otherwise redirects to the login screen while
// remembering the originally requested destination (US 02.1) and the reason the
// session ended (US 02.3).
// =============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_CHANGE_PASSWORD_PATH = '/admin/change-password';

export default function AdminRouteGuard({ children }) {
  const { currentAdmin, isAuthenticated, isBootstrapping, logoutReason } = useAuth();
  const currentLocation = useLocation();

  if (isBootstrapping) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600"
      >
        {ADMIN_TRANSLATIONS.verifyingSession}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ADMIN_LOGIN_PATH}
        replace
        state={{ from: currentLocation.pathname, reason: logoutReason }}
      />
    );
  }

  // Force password change if expired (1 day old) and not already on the change password page
  if (
    currentAdmin?.require_password_change &&
    currentLocation.pathname !== ADMIN_CHANGE_PASSWORD_PATH
  ) {
    return <Navigate to={ADMIN_CHANGE_PASSWORD_PATH} replace />;
  }

  return children;
}
