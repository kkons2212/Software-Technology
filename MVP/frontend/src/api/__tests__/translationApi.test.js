import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient.js';
import { regenerateTranslationAudio, publishTranslation } from '../translationApi.js';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('translationApi audio regeneration & publish', () => {
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

  it('posts the publish request without a body payload (US 04.3)', async () => {
    apiClient.post.mockResolvedValue({
      stran_id: 'TR_01',
      status: 'PUBLISHED',
      audio_status: 'READY',
      review_by: 'admin',
    });

    await publishTranslation('TR_01');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/admin/translations/TR_01/publish',
      {},
      { signal: undefined }
    );
  });
});
