// =============================================================================
// TIER 2 - ADMIN AUTHENTICATION STATE
// Holds the authenticated Administrator profile for the entire Admin Portal and
// exposes the login action consumed by the presentation layer (US 02.1).
//
// The session itself lives in an HttpOnly cookie (owned by the backend); this
// context only mirrors whether a valid session currently exists.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentAdmin, loginAdmin } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

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
    return administrator;
  }, []);

  const contextValue = useMemo(
    () => ({
      currentAdmin,
      isAuthenticated: Boolean(currentAdmin),
      isBootstrapping,
      login,
    }),
    [currentAdmin, isBootstrapping, login],
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

export default AuthContext;
