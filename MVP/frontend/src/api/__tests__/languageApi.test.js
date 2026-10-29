import { describe, expect, it, vi } from 'vitest';

vi.mock('../apiClient.js', () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from '../apiClient.js';
import { getPublishedLanguages, getSupportedLanguages } from '../languageApi.js';

describe('getPublishedLanguages', () => {
  it('returns only published languages and normalizes language fields', async () => {
    apiClient.get.mockResolvedValue([
      { language_id: 'vi', language_name: 'Tiếng Việt', status: 'PUBLISHED' },
      { code: 'en', native_name: 'English', status: 'published' },
      { language_id: 'ja', language_name: '日本語', status: 'DRAFT' },
      { language_id: 'ko', language_name: '한국어', status: 'PENDING' },
    ]);

    await expect(getPublishedLanguages()).resolves.toEqual([
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'en', name: 'English' },
    ]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/languages', { signal: undefined });
  });

  it('does not expose a language with an unpublished status despite stale published flags', async () => {
    apiClient.get.mockResolvedValue([
      { code: 'vi', name: 'Tiếng Việt', status: 'DRAFT', is_published: true },
      { code: 'en', name: 'English', has_published_content: true },
    ]);

    await expect(getPublishedLanguages()).resolves.toEqual([
      { code: 'en', name: 'English' },
    ]);
  });

  it('reports malformed language payloads instead of returning an empty list', async () => {
    apiClient.get.mockResolvedValue({ data: { languages: [] } });

    await expect(getPublishedLanguages()).rejects.toThrow(
      'The languages response has an invalid format.',
    );
  });
});

describe('getSupportedLanguages', () => {
  it('returns all catalog languages regardless of publication status', async () => {
    apiClient.get.mockResolvedValue([
      { language_id: 'vi', language_name: 'Tiếng Việt', status: 'SUPPORTED' },
      { code: 'en', native_name: 'English', status: 'SUPPORTED' },
      { language_id: 'ja', language_name: 'Japanese', status: 'SUPPORTED' },
      { language_id: 'fr', language_name: 'French', status: 'SUPPORTED' },
    ]);

    const result = await getSupportedLanguages();
    expect(result).toEqual([
      { code: 'vi', name: 'Tiếng Việt', status: 'SUPPORTED' },
      { code: 'en', name: 'English', status: 'SUPPORTED' },
      { code: 'ja', name: 'Japanese', status: 'SUPPORTED' },
      { code: 'fr', name: 'French', status: 'SUPPORTED' },
    ]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/languages?all=true', { signal: undefined });
  });
});
