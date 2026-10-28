// =============================================================================
// TIER 3 - SYSTEM HEALTH & STORAGE API CLIENT (US 05.3)
// Strictly decoupled from UI presentations.
// =============================================================================

import { apiClient } from './apiClient.js';

const SYSTEM_HEALTH_ENDPOINT = '/api/v1/admin/system/health';
const CLEAN_ORPHANS_ENDPOINT = '/api/v1/admin/storage/clean-orphans';

/**
 * Fetch server storage metrics, capacity alert thresholds, and database latency.
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function getSystemHealth({ signal } = {}) {
  return apiClient.get(SYSTEM_HEALTH_ENDPOINT, { signal });
}

/**
 * Trigger physical scan and deletion of unreferenced audio files in cache.
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function cleanOrphanedAudio({ signal } = {}) {
  return apiClient.post(CLEAN_ORPHANS_ENDPOINT, {}, { signal });
}
