import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient.js';
import { regenerateTranslationAudio } from '../translationApi.js';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('translationApi audio regeneration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts the regenerate-audio request without a body payload', async () => {
    apiClient.post.mockResolvedValue({
      stran_id: 'TR_01',
      status: 'DRAFT',
      audio_url: '/static/audio/new.mp3',
      audio_status: 'READY',
    });

    await regenerateTranslationAudio('TR_01');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/admin/translations/TR_01/regenerate-audio',
      {},
      { signal: undefined }
    );
  });
});
