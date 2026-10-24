// =============================================================================
// TIER 3 - ADMIN AUTHENTICATION API
// Thin domain wrapper over apiClient for the Administrator Portal (US 02.1).
// =============================================================================

import { apiClient } from './apiClient.js';

const AUTH_LOGIN_ENDPOINT = '/api/v1/auth/login';
const AUTH_CURRENT_ADMIN_ENDPOINT = '/api/v1/auth/me';

/**
 * Authenticate an Administrator. The backend sets the HttpOnly session cookie,
 * so no token is ever persisted in JavaScript.
 * @returns {Promise<object>} the authenticated administrator profile
 */
export async function loginAdmin({ username, password }) {
  const payload = await apiClient.post(AUTH_LOGIN_ENDPOINT, { username, password });
  return payload?.admin ?? payload;
}

/**
 * Bootstrap the current Administrator session from the HttpOnly cookie.
 * Resolves to null when there is no valid session (the client throws a
 * normalized ApiError, which callers translate into an anonymous state).
 * @returns {Promise<object|null>} the administrator profile or null
 */
export async function fetchCurrentAdmin() {
  const payload = await apiClient.get(AUTH_CURRENT_ADMIN_ENDPOINT);
  return payload?.admin ?? payload ?? null;
}
