// =============================================================================
// TIER 2 - ADMIN AUTHENTICATION STATE
// Holds the authenticated Administrator profile for the entire Admin Portal and
// exposes the login/logout actions consumed by the presentation layer
// (US 02.1 & US 02.3).
//
// The session itself lives in an HttpOnly cookie (owned by the backend); this
// context only mirrors whether a valid session currently exists.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentAdmin, loginAdmin, logoutAdmin } from '../api/authApi.js';
import useIdleTimer from '../hooks/useIdleTimer.js';

const AuthContext = createContext(null);

// US 02.3: why the session ended, forwarded to the login screen so it can
// explain the redirect. Only the idle case is announced; an explicit sign-out
// needs no explanation because the Administrator just asked for it.
const LOGOUT_REASON_IDLE = 'IDLE_TIMEOUT';
const LOGOUT_REASON_MANUAL = 'MANUAL';

export function AuthProvider({ children }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [logoutReason, setLogoutReason] = useState(null);

  // On first mount, resolve an existing HttpOnly cookie session so a page
  // refresh keeps the Administrator signed in without reloading any other state.
  useEffect(() => {
    let isActive = true;

    fetchCurrentAdmin()
      .then((administrator) => {
        if (isActive && administrator) {
          setCurrentAdmin(administrator);
        }
      })
      .catch(() => {
        // No valid session: stay anonymous on the login screen.
      })
      .finally(() => {
        if (isActive) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const administrator = await loginAdmin({ username, password });
    setCurrentAdmin(administrator);
    // A fresh sign-in clears the previous termination banner.
    setLogoutReason(null);
    return administrator;
  }, []);

  const logout = useCallback(async ({ reason = LOGOUT_REASON_MANUAL } = {}) => {
    try {
      // SECURITY-INVARIANT (AC-02.3.1): the backend revokes the token before it
      // clears the HttpOnly cookie, so the local state is only dropped once the
      // server has confirmed the session is dead.
      await logoutAdmin();
    } catch {
      // FALLBACK-LOGIC: an already-expired or unreachable session must never
      // trap the Administrator in the portal, so the local wipe happens anyway.
    } finally {
      setCurrentAdmin(null);
      setLogoutReason(reason);
    }
  }, []);

  // AC-02.3.2: 30 minutes of continuous inactivity wipes the local session,
  // which makes the AdminRouteGuard bounce to the login screen on its own.
  // ARCH-BOUNDARY: the timer is mounted here, and not in a view, so it keeps
  // running no matter which admin page is on screen.
  const handleIdleExpiry = useCallback(
    () => logout({ reason: LOGOUT_REASON_IDLE }),
    [logout],
  );

  useIdleTimer({
    isEnabled: Boolean(currentAdmin),
    onIdle: handleIdleExpiry,
  });

  const contextValue = useMemo(
    () => ({
      currentAdmin,
      // `user` is a backwards-compatible alias: the admin chrome reads
      // `user.user_name`, while the bootstrap flow uses `currentAdmin`.
      user: currentAdmin,
      isAuthenticated: Boolean(currentAdmin),
      isBootstrapping,
      logoutReason,
      login,
      logout,
    }),
    [currentAdmin, isBootstrapping, logoutReason, login, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

export { LOGOUT_REASON_IDLE, LOGOUT_REASON_MANUAL };

export default AuthContext;
