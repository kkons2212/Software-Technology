import apiClient from './apiClient.js';

/**
 * Calculate walking route from visitor's GPS location to a destination POI.
 *
 * @param {{ originLat: number, originLng: number, destinationPoiId: string, signal?: AbortSignal }} params
 * @returns {Promise<object>} GeoJSON Feature with LineString geometry and route properties
 */
export async function getWalkingRoute({ originLat, originLng, destinationPoiId, signal }) {
  const response = await apiClient.get('/api/v1/tour/route', {
    params: {
      origin_lat: originLat,
      origin_lng: originLng,
      destination_poi_id: destinationPoiId,
    },
    signal,
  });
  return response.data?.data ?? response.data;
}
