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

const PUBLIC_CONFIG_ENDPOINT = '/api/v1/system/public-config';

/**
 * Fetch public tunnel and base URL configuration for visitor access & QR generation.
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{cloudflare_tunnel_url: string, visitor_url: string, admin_url: string}>}
 */
export async function getPublicSystemConfig({ signal } = {}) {
  const response = await apiClient.get(PUBLIC_CONFIG_ENDPOINT, { signal });
  return response?.data || response;
}
