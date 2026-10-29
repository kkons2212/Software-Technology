import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWalkingRoute } from '../tourApi.js';
import apiClient from '../apiClient.js';

vi.mock('../apiClient.js', () => ({
  default: {
    get: vi.fn(),
  },
}));

afterEach(() => vi.restoreAllMocks());

describe('tourApi', () => {
  it('sends GET /api/v1/tour/route with correct query params', async () => {
    const mockFeature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[106.4631, 11.1432], [106.4614, 11.1445]],
      },
      properties: {
        total_distance_meters: 185.5,
        destination: { poi_id: 'POI_01', title: 'Test Exhibit' },
      },
    };
    apiClient.get.mockResolvedValue({ data: { data: mockFeature } });

    const result = await getWalkingRoute({
      originLat: 11.1432,
      originLng: 106.4631,
      destinationPoiId: 'POI_01',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/tour/route', {
      params: {
        origin_lat: 11.1432,
        origin_lng: 106.4631,
        destination_poi_id: 'POI_01',
      },
      signal: undefined,
    });
    expect(result).toEqual(mockFeature);
  });

  it('passes abort signal to the API client', async () => {
    apiClient.get.mockResolvedValue({ data: { data: {} } });
    const controller = new AbortController();

    await getWalkingRoute({
      originLat: 11.1432,
      originLng: 106.4631,
      destinationPoiId: 'POI_02',
      signal: controller.signal,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/tour/route',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

