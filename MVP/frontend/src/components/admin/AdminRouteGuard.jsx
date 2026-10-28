// =============================================================================
// TIER 1 - ADMIN ROUTE GUARD
// Protects every /admin/* route. Renders protected children only for an
// authenticated Administrator, otherwise redirects to the login screen while
// remembering the originally requested destination (US 02.1) and the reason the
// session ended (US 02.3).
// =============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ADMIN_LOGIN_PATH = '/admin/login';

export default function AdminRouteGuard({ children }) {
  const { isAuthenticated, isBootstrapping, logoutReason } = useAuth();
  const currentLocation = useLocation();

  if (isBootstrapping) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600"
      >
        Verifying administrator session...
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

  return children;
}
