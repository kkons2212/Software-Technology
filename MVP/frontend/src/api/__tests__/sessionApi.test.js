import { describe, expect, it, vi } from 'vitest';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../apiClient.js';
import { restoreSession } from '../sessionApi.js';

describe('sessionApi (US 06.3)', () => {
  it('throws error when sessionCode is missing or empty', async () => {
    await expect(restoreSession({ sessionCode: '' })).rejects.toThrow(
      'Mã phiên không được để trống.'
    );
    await expect(restoreSession({})).rejects.toThrow(
      'Mã phiên không được để trống.'
    );
  });

  it('posts normalized uppercase session code to restore endpoint', async () => {
    const mockPayload = {
      session_id: 'SES_123',
      session_code: 'CCT-894201',
      session_token: 'mock-session-token',
      status: 'ACTIVE',
      expires_at: '2026-10-30T10:00:00.000Z',
      remaining_seconds: 86400,
    };
    apiClient.post.mockResolvedValueOnce(mockPayload);

    const result = await restoreSession({ sessionCode: '  cct-894201  ' });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/sessions/restore',
      { session_code: 'CCT-894201' },
      { signal: undefined }
    );
    expect(result).toEqual(mockPayload);
  });
});

