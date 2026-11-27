// =============================================================================
// TIER 3 - ADMIN AUTHENTICATION API
// Thin domain wrapper over apiClient for the Administrator Portal
// (US 02.1 & US 02.3).
// =============================================================================

import { apiClient } from './apiClient.js';

const AUTH_LOGIN_ENDPOINT = '/api/v1/auth/login';
const AUTH_CURRENT_ADMIN_ENDPOINT = '/api/v1/auth/me';
const AUTH_LOGOUT_ENDPOINT = '/api/v1/auth/logout';
const AUTH_CHANGE_PASSWORD_ENDPOINT = '/api/v1/auth/change-password';

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

/**
 * Terminate the current Administrator session (US 02.3 - TSK-02.3.2).
 * The backend revokes the token before clearing the HttpOnly cookie, so a copy
 * of the old JWT is rejected even if some client still holds one.
 * @returns {Promise<object|null>} the termination confirmation payload
 */
export async function logoutAdmin() {
  return apiClient.post(AUTH_LOGOUT_ENDPOINT);
}

/**
 * Change the current Administrator password.
 * @param {object} params
 * @param {string} params.oldPassword
 * @param {string} params.newPassword
 * @param {string} params.confirmPassword
 * @returns {Promise<object>} the updated administrator profile
 */
export async function changeAdminPassword({ oldPassword, newPassword, confirmPassword }) {
  const payload = await apiClient.post(AUTH_CHANGE_PASSWORD_ENDPOINT, {
    old_password: oldPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return payload?.admin ?? payload;
}
