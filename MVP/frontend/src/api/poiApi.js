// =============================================================================
// TIER 3 - API CLIENT FOR POI / EXHIBIT MANAGEMENT
// Strictly decoupled from UI presentations.
// =============================================================================

import { apiClient, ApiError } from './apiClient.js';

const POI_ADMIN_BASE_PATH = '/api/v1/admin/pois';
const POIS_ENDPOINT = '/api/v1/pois';

/**
 * Public visitor API: Load POIs configured for the map.
 */
export async function getMapPois({ language, token, signal } = {}) {
  const params = new URLSearchParams();
  if (language) params.set('language', language);
  if (token) params.set('token', token);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient.get(`${POIS_ENDPOINT}${query}`, { signal });

  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  throw new Error('The map POIs response has an invalid format.');
}

/**
 * Public visitor API: Load detailed POI exhibit profile with visitor content gating.
 */
export async function getVisitorPoiDetail(poiId, { language, token, signal } = {}) {
  const params = new URLSearchParams();
  if (language) params.set('language', language);
  if (token) params.set('token', token);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient.get(`${POIS_ENDPOINT}/${poiId}${query}`, { signal });

  if (response?.data) {
    return response.data;
  }
  return response;
}

/**
 * Fetch paginated POI exhibits with optional title substring filter (Admin).
 */
export async function getPois({ page = 1, size = 50, search = '', signal } = {}) {
  const queryParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (search && search.trim()) {
    queryParams.set('search', search.trim());
  }

  return apiClient.get(`${POI_ADMIN_BASE_PATH}?${queryParams.toString()}`, { signal });
}

/**
 * Fetch detailed exhibit profile by identifier (Admin).
 */
export async function getPoiById(poiId, { signal } = {}) {
  return apiClient.get(`${POI_ADMIN_BASE_PATH}/${poiId}`, { signal });
}

/**
 * Create a new POI profile. Supports both JSON and multipart form data with image file (Admin).
 */
export async function createPoi(poiData, imageFile = null, { signal } = {}) {
  if (imageFile) {
    const formData = new FormData();
    formData.append('title', poiData.title || '');
    if (poiData.short_description) {
      formData.append('short_description', poiData.short_description);
    }
    if (poiData.description) {
      formData.append('description', poiData.description);
    }
    formData.append('latitude', String(poiData.latitude || 0));
    formData.append('longitude', String(poiData.longitude || 0));
    formData.append('radius', String(poiData.radius || 30));
    formData.append('image', imageFile);

    try {
      const response = await fetch(POI_ADMIN_BASE_PATH, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError({
          status: response.status,
          code: payload?.error?.code || payload?.detail?.code || 'POI_CREATE_FAILED',
          message: payload?.error?.message || payload?.detail?.message || payload?.detail || 'Failed to create POI exhibit',
          details: payload?.error?.details || payload?.detail?.details,
        });
      }

      return payload;
    } catch (error) {
      if (error instanceof ApiError || error.name === 'AbortError') {
        throw error;
      }
      throw new ApiError({ message: 'Network error while uploading exhibit profile' });
    }
  }

  return apiClient.post(POI_ADMIN_BASE_PATH, poiData, { signal });
}

/**
 * Update an existing POI exhibit profile (Admin - US 03.4).
 * @param {string} poiId
 * @param {object} changes
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} updated exhibit item
 */
export async function updatePoi(poiId, changes, { signal } = {}) {
  return apiClient.put(`${POI_ADMIN_BASE_PATH}/${encodeURIComponent(poiId)}`, changes, { signal });
}

/**
 * Toggle POI active visibility state (Admin - US 03.3).
 * @param {string} poiId
 * @param {boolean} isActive
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} updated POI profile
 */
export async function togglePoiVisibility(poiId, isActive, { signal } = {}) {
  return apiClient.patch(
    `${POI_ADMIN_BASE_PATH}/${encodeURIComponent(poiId)}/visibility`,
    { is_active: isActive },
    { signal }
  );
}

/**
 * Upload cover image for an exhibit (Admin).
 * @param {File} file
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>} static URL of uploaded image
 */
export async function uploadPoiImage(file, { signal } = {}) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${POI_ADMIN_BASE_PATH}/upload-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError({
        status: response.status,
        code: payload?.error?.code || 'IMAGE_UPLOAD_FAILED',
        message: payload?.error?.message || payload?.detail || 'Failed to upload exhibit image',
      });
    }
    return payload?.image_url;
  } catch (error) {
    if (error instanceof ApiError || error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError({ message: 'Network error while uploading exhibit image' });
  }
}

