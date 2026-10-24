/**
 * haversine.js
 * Geodesic calculation utility using the Haversine formula
 * to compute distance between two physical coordinates in meters.
 */

// Top-of-file module constants
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the Haversine distance in meters between two coordinates.
 * @param {Object} origin - { lat: number, lng: number }
 * @param {Object} destination - { lat: number, lng: number }
 * @returns {number} Distance in meters (rounded to 1 decimal place)
 */
export function calculateHaversineDistance(origin, destination) {
  if (!origin || !destination) {
    return Infinity;
  }

  const lat1 = typeof origin.lat === 'number' ? origin.lat : origin.latitude;
  const lon1 = typeof origin.lng === 'number' ? origin.lng : (origin.lon ?? origin.longitude);
  const lat2 = typeof destination.lat === 'number' ? destination.lat : destination.latitude;
  const lon2 = typeof destination.lng === 'number' ? destination.lng : (destination.lon ?? destination.longitude);

  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return Infinity;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const haversineComponent =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const centralAngleRadians = 2 * Math.atan2(Math.sqrt(haversineComponent), Math.sqrt(1 - haversineComponent));
  const distance = EARTH_RADIUS_METERS * centralAngleRadians;

  return Math.round(distance * 10) / 10;
}
