import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient.js';
import { updatePoi } from '../adminPoiApi.js';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    put: vi.fn(),
  },
}));

describe('updatePoi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a partial geofence update to the shared admin endpoint', async () => {
    const updatedPoi = { id: 'poi-1', trigger_radius: 45 };
    apiClient.put.mockResolvedValue(updatedPoi);

    await expect(updatePoi('poi-1', { radius: 45 })).resolves.toEqual(updatedPoi);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/admin/pois/poi-1', {
      radius: 45,
    });
  });

  it('encodes the exhibit identifier inside the request path', async () => {
    apiClient.put.mockResolvedValue({});

    await updatePoi('poi/1 2', { latitude: 11.1445 });

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/admin/pois/poi%2F1%202', {
      latitude: 11.1445,
    });
  });
});
