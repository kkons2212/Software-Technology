// =============================================================================
// SHARED MUSEUM GEOGRAPHY CONSTANTS
// Single source of truth for the Cu Chi Tunnels perimeter, consumed by the
// visitor geolocation hook and the Admin geofence calibrator (US 03.2).
// Kept in sync with the backend `CU_CHI_BOUNDS` constant in `poi_service.py`.
// =============================================================================

export const MAIN_ENTRANCE = { lat: 11.1432, lng: 106.4631 };

export const MUSEUM_BOUNDS = {
  minLat: 11.136361,
  maxLat: 11.149306,
  minLng: 106.455139,
  maxLng: 106.467639,
};

/**
 * Whether a coordinate falls inside the historical site perimeter.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export function isWithinMuseumBounds(latitude, longitude) {
  return (
    latitude >= MUSEUM_BOUNDS.minLat &&
    latitude <= MUSEUM_BOUNDS.maxLat &&
    longitude >= MUSEUM_BOUNDS.minLng &&
    longitude <= MUSEUM_BOUNDS.maxLng
  );
}
