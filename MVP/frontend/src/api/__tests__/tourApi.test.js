import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: { get: vi.fn() },
}));

vi.mock('../apiClient.js', () => ({
  default: mockApiClient,
  apiClient: mockApiClient,
}));

import { getWalkingRoute } from '../tourApi.js';

afterEach(() => vi.restoreAllMocks());

describe('tourApi', () => {
  it('sends GET /api/v1/tour/route with correct query params', async () => {
    const mockFeature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.4631, 11.1432],
          [106.4614, 11.1445],
        ],
      },
      properties: {
        total_distance_meters: 185.5,
        destination: { poi_id: 'POI_01', title: 'Test Exhibit' },
      },
    };
    mockApiClient.get.mockResolvedValue(mockFeature);

    const result = await getWalkingRoute({
      originLat: 11.1432,
      originLng: 106.4631,
      destinationPoiId: 'POI_01',
    });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/v1/tour/route?origin_lat=11.1432&origin_lng=106.4631&destination_poi_id=POI_01',
      expect.objectContaining({}),
    );
    expect(result).toEqual(mockFeature);
  });

  it('passes abort signal to the API client', async () => {
    mockApiClient.get.mockResolvedValue({});
    const controller = new AbortController();

    await getWalkingRoute({
      originLat: 11.1432,
      originLng: 106.4631,
      destinationPoiId: 'POI_01',
      signal: controller.signal,
    });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/v1/tour/route?origin_lat=11.1432&origin_lng=106.4631&destination_poi_id=POI_01',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
