import { apiClient } from './apiClient.js';

const LANGUAGES_ENDPOINT = '/api/v1/languages';

function unwrapLanguages(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.languages)) {
    return response.languages;
  }

  throw new Error('The languages response has an invalid format.');
}

export async function getPublishedLanguages({ signal } = {}) {
  const response = await apiClient.get(LANGUAGES_ENDPOINT, { signal });

  return unwrapLanguages(response)
    .filter((language) => {
      const status = String(language.status ?? language.translation_status ?? '').toUpperCase();
      return status === 'PUBLISHED'
        || language.is_published === true
        || language.has_published_content === true;
    })
    .map((language) => ({
      code: language.code ?? language.language_id ?? language.language_code,
      name: language.native_name ?? language.language_name ?? language.name,
    }))
    .filter((language) => typeof language.code === 'string' && typeof language.name === 'string');
}
