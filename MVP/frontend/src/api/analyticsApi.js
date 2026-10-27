// =============================================================================
// TIER 3 - API CLIENT FOR ADMINISTRATOR ANALYTICS
// Strictly decoupled from UI presentations.
// =============================================================================

import { apiClient } from './apiClient.js';

export const ANALYTICS_SUMMARY_ENDPOINT = '/api/v1/admin/analytics/summary';
export const ANALYTICS_TIME_RANGES = {
  TODAY: 'TODAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
};
export const DEFAULT_ANALYTICS_RANGE = ANALYTICS_TIME_RANGES.LAST_7_DAYS;

/**
 * Fetch the aggregated telemetry summary for the requested reporting window (Admin).
 *
 * @param {Object} [options]
 * @param {string} [options.range=DEFAULT_ANALYTICS_RANGE]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>} Analytics summary payload already unwrapped from `{data}`.
 */
export async function getAnalyticsSummary({ range = DEFAULT_ANALYTICS_RANGE, signal } = {}) {
  const query = `?range=${encodeURIComponent(range)}`;
  return apiClient.get(`${ANALYTICS_SUMMARY_ENDPOINT}${query}`, { signal });
}
