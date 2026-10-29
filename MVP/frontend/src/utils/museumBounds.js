// =============================================================================
// SHARED GEOGRAPHY CONSTANTS
// Global coordinate validation guardrails (-90..90 lat, -180..180 lng).
// =============================================================================

export const MAIN_ENTRANCE = { lat: 11.1432, lng: 106.4631 };

export const MUSEUM_BOUNDS = {
  minLat: -90,
  maxLat: 90,
  minLng: -180,
  maxLng: 180,
};

/**
 * Whether a coordinate falls inside the valid global coordinate range.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export function isWithinMuseumBounds(latitude, longitude) {
  const numLat = parseFloat(latitude);
  const numLng = parseFloat(longitude);
  if (Number.isNaN(numLat) || Number.isNaN(numLng)) return false;
  return (
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180
  );
}
