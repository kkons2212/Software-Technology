// =============================================================================
// TIER 3 - VISITOR SESSION API (US 06.3)
// Standardized in dev_rules.md & tasks.md (TSK-06.3.1 / TSK-06.3.2)
// Handles session recovery across multiple devices and browsers via Session Code.
// =============================================================================

import { apiClient } from './apiClient.js';

const SESSION_RESTORE_ENDPOINT = '/api/v1/sessions/restore';

/**
 * Restores a 24-hour visiting session using a 6-character session code.
 *
 * @param {object} params
 * @param {string} params.sessionCode - Session code (e.g., 'CCT-894201' or '894201')
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Restored session details including session_code, session_token, expires_at, etc.
 */
export async function restoreSession({ sessionCode }, { signal } = {}) {
  if (!sessionCode || typeof sessionCode !== 'string') {
    throw new Error('Mã phiên không được để trống.');
  }

  const payload = await apiClient.post(
    SESSION_RESTORE_ENDPOINT,
    { session_code: sessionCode.trim().toUpperCase() },
    { signal }
  );

  return payload;
}

