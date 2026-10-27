import { apiClient } from './apiClient.js';

const POIS_ENDPOINT = '/api/v1/pois';

export async function getMapPois({ language, signal } = {}) {
  const query = language ? `?language=${encodeURIComponent(language)}` : '';
  const response = await apiClient.get(`${POIS_ENDPOINT}${query}`, { signal });

  if (!Array.isArray(response)) {
    throw new Error('The map POIs response has an invalid format.');
  }

  return response;
}
