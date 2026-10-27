// =============================================================================
// TIER 3 - ADMIN POI MANAGEMENT API
// Thin domain wrapper over apiClient for POI writes (US 03.2 geofence
// calibration today, US 03.4 exhibit editor later). Both screens share this
// single `PUT /api/v1/admin/pois/{poi_id}` endpoint.
// =============================================================================

import { apiClient } from './apiClient.js';

const ADMIN_POIS_ENDPOINT = '/api/v1/admin/pois';

/**
 * Apply a partial update to an exhibit.
 * @param {string} poiId
 * @param {{ latitude?: number, longitude?: number, radius?: number }} changes
 * @returns {Promise<object>} the updated exhibit
 */
export async function updatePoi(poiId, changes) {
  return apiClient.put(`${ADMIN_POIS_ENDPOINT}/${encodeURIComponent(poiId)}`, changes);
}
