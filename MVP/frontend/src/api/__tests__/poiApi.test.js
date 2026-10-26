import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient.js';
import { getMapPois } from '../poiApi.js';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getMapPois', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests map POIs for the selected language', async () => {
    const pois = [{ id: 'poi-1', title: 'Tunnel entrance' }];
    const signal = new AbortController().signal;
    apiClient.get.mockResolvedValue(pois);

    await expect(getMapPois({ language: 'en-US', signal })).resolves.toEqual(pois);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/pois?language=en-US', { signal });
  });

  it('rejects an invalid response shape', async () => {
    apiClient.get.mockResolvedValue({ pois: [] });

    await expect(getMapPois()).rejects.toThrow('The map POIs response has an invalid format.');
  });
});
