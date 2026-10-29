import { apiClient } from './apiClient.js';

/**
 * Calculate walking route from visitor's GPS location to a destination POI.
 *
 * @param {{ originLat: number, originLng: number, destinationPoiId: string, signal?: AbortSignal }} params
 * @returns {Promise<object>} GeoJSON Feature with LineString geometry and route properties
 */
export async function getWalkingRoute({ originLat, originLng, destinationPoiId, signal }) {
  const query = new URLSearchParams({
    origin_lat: String(originLat),
    origin_lng: String(originLng),
    destination_poi_id: String(destinationPoiId),
  });

  const payload = await apiClient.get(`/api/v1/tour/route?${query.toString()}`, { signal });
  return payload?.data ?? payload;
}
