import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient.js';
import { getSystemHealth, cleanOrphanedAudio, getPublicSystemConfig } from '../systemApi.js';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('systemApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /api/v1/admin/system/health', async () => {
    const mockHealth = { disk_used_percent: 75.0, db_status: 'connected' };
    apiClient.get.mockResolvedValue(mockHealth);

    const result = await getSystemHealth();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/system/health', { signal: undefined });
    expect(result).toEqual(mockHealth);
  });

  it('calls POST /api/v1/admin/storage/clean-orphans', async () => {
    const mockCleanResult = { deleted_count: 5, reclaimed_mb: 12.4 };
    apiClient.post.mockResolvedValue(mockCleanResult);

    const result = await cleanOrphanedAudio();

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/storage/clean-orphans', {}, { signal: undefined });
    expect(result).toEqual(mockCleanResult);
  });

  it('calls GET /api/v1/system/public-config', async () => {
    const mockPublicConfig = {
      cloudflare_tunnel_url: 'https://test-tunnel.trycloudflare.com',
      visitor_url: 'https://test-tunnel.trycloudflare.com/visitor',
      admin_url: 'https://test-tunnel.trycloudflare.com/admin',
    };
    apiClient.get.mockResolvedValue({ data: mockPublicConfig });

    const result = await getPublicSystemConfig();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system/public-config', { signal: undefined });
    expect(result).toEqual(mockPublicConfig);
  });
});
