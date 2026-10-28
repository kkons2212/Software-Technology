// =============================================================================
// TIER 3 - API CLIENT FOR MULTILINGUAL TRANSLATION AUDIT (US 04.1 & US 04.3)
// Strictly decoupled from UI presentations.
// =============================================================================

import { apiClient } from './apiClient.js';

const TRANSLATION_ADMIN_BASE_PATH = '/api/v1/admin/translations';

/**
 * Fetch paginated translation records with optional query filters (Admin).
 * @param {Object} options
 * @param {string} [options.poiId]
 * @param {string} [options.languageId]
 * @param {string} [options.status]
 * @param {number} [options.page=1]
 * @param {number} [options.size=50]
 * @param {AbortSignal} [options.signal]
 */
export async function getTranslations({
  poiId = '',
  languageId = '',
  status = '',
  page = 1,
  size = 50,
  signal,
} = {}) {
  const queryParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (poiId && poiId.trim()) {
    queryParams.set('poi_id', poiId.trim());
  }
  if (languageId && languageId.trim()) {
    queryParams.set('language_id', languageId.trim());
  }
  if (status && status.trim()) {
    queryParams.set('status', status.trim());
  }

  return apiClient.get(`${TRANSLATION_ADMIN_BASE_PATH}?${queryParams.toString()}`, { signal });
}

/**
 * Fetch a single translation audit record by identifier (Admin).
 * @param {string} translationId
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 */
export async function getTranslationById(translationId, { signal } = {}) {
  return apiClient.get(`${TRANSLATION_ADMIN_BASE_PATH}/${translationId}`, { signal });
}

/**
 * Update translation text and transition status to NEEDS_UPDATE (Admin).
 * @param {string} translationId
 * @param {Object} payload
 * @param {string} [payload.title]
 * @param {string} [payload.short_description]
 * @param {string} [payload.description]
 * @param {string} [payload.status]
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 */
export async function updateTranslation(translationId, payload, { signal } = {}) {
  return apiClient.put(`${TRANSLATION_ADMIN_BASE_PATH}/${translationId}`, payload, { signal });
}

/**
 * Regenerate the audio guide for a translation that needs a new narration.
 * @param {string} translationId
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 */
export async function regenerateTranslationAudio(translationId, { signal } = {}) {
  return apiClient.post(
    `${TRANSLATION_ADMIN_BASE_PATH}/${translationId}/regenerate-audio`,
    {},
    { signal }
  );
}

/**
 * Grant publication approval to a verified translation (Admin - US 04.3).
 * @param {string} translationId
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 */
export async function publishTranslation(translationId, { signal } = {}) {
  return apiClient.post(
    `${TRANSLATION_ADMIN_BASE_PATH}/${translationId}/publish`,
    {},
    { signal }
  );
}
