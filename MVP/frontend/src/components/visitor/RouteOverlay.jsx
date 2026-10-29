import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation, X } from 'lucide-react';
import { calculateHaversineDistance } from '../../utils/haversine.js';

const POLYLINE_COLOR = '#1D4ED8';
const POLYLINE_WEIGHT = 4;
const POLYLINE_OPACITY = 0.9;

/**
 * Format remaining distance into a human-readable string.
 * @param {number} meters
 * @returns {string}
 */
function formatRemainingDistance(meters) {
  if (!Number.isFinite(meters)) {
    return 'Calculating…';
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * RouteOverlay — Walking direction polyline overlay and floating status banner.
 *
 * Draws a Leaflet L.polyline connecting the visitor GPS trail to the destination
 * POI. Displays a floating top banner showing remaining walking distance with a
 * "Clear Route" dismiss button.
 *
 * Complies with UI Rules: 4px solid `#1D4ED8`, floating top banner.
 */
export default function RouteOverlay({
  map,
  routeCoordinates,
  destinationTitle,
  userLocation,
  destinationLocation,
  onClearRoute,
}) {
  const polylineRef = useRef(null);

  // Draw / update Leaflet polyline
  useEffect(() => {
    if (!map || !routeCoordinates || routeCoordinates.length < 2) {
      return undefined;
    }

    // GeoJSON coordinates are [lng, lat] — Leaflet needs [lat, lng]
    const latLngs = routeCoordinates.map(([lng, lat]) => [lat, lng]);

    const polyline = L.polyline(latLngs, {
      color: POLYLINE_COLOR,
      weight: POLYLINE_WEIGHT,
      opacity: POLYLINE_OPACITY,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map);

    polylineRef.current = polyline;

    // Fit map bounds to include the route
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    return () => {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    };
  }, [map, routeCoordinates]);

  // Compute remaining distance dynamically from current location
  const remainingDistance = calculateHaversineDistance(
    userLocation,
    destinationLocation,
  );

  if (!routeCoordinates || routeCoordinates.length < 2) {
    return null;
  }

  return (
    <div
      className="route-overlay-banner"
      role="status"
      aria-live="polite"
      aria-label={`Navigation: ${formatRemainingDistance(remainingDistance)} to ${destinationTitle}`}
    >
      <Navigation size={18} className="route-overlay-icon" aria-hidden="true" />
      <span className="route-overlay-text">
        <strong>{formatRemainingDistance(remainingDistance)}</strong>
        {' to '}
        {destinationTitle}
      </span>
      <button
        type="button"
        className="route-overlay-clear"
        aria-label="Clear navigation route"
        onClick={onClearRoute}
      >
        <X size={16} aria-hidden="true" />
        <span>Clear Route</span>
      </button>
    </div>
  );
}

