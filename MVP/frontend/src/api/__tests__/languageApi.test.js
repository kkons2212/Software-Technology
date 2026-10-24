import { describe, expect, it, vi } from 'vitest';

vi.mock('../apiClient.js', () => ({
  getJson: vi.fn(),
}));

import { getJson } from '../apiClient.js';
import { getPublishedLanguages } from '../languageApi.js';

describe('getPublishedLanguages', () => {
  it('returns only published languages and normalizes language fields', async () => {
    getJson.mockResolvedValue({
      data: [
        { language_id: 'vi', language_name: 'Tiếng Việt', status: 'PUBLISHED' },
        { code: 'en', native_name: 'English', status: 'published' },
        { language_id: 'ja', language_name: '日本語', status: 'DRAFT' },
        { language_id: 'ko', language_name: '한국어', status: 'PENDING' },
      ],
    });

    await expect(getPublishedLanguages()).resolves.toEqual([
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'en', name: 'English' },
    ]);
    expect(getJson).toHaveBeenCalledWith('/api/v1/languages', { signal: undefined });
  });

  it('reports malformed language payloads instead of returning an empty list', async () => {
    getJson.mockResolvedValue({ data: { languages: [] } });

    await expect(getPublishedLanguages()).rejects.toThrow(
      'The languages response has an invalid format.',
    );
  });
});
