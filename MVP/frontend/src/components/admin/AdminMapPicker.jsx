// =============================================================================
// ADMIN INTERACTIVE MAP & RADIUS PICKER (US 03.2 - TSK-03.2.2 / TSK-03.2.3)
// -----------------------------------------------------------------------------
// Presentation-only control reused by every Admin screen that calibrates a
// geofence (the `/admin/geofence` calibration page today, the exhibit editor of
// US 03.4 later). It owns the two-way binding between the Leaflet pin, the
// numeric Latitude/Longitude fields and the 10m-50m radius slider, plus the
// out-of-bounds guardrail of AC-03.2.3. Persistence is delegated to the host
// page through `onSave`, so this component never talks to the network itself.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MUSEUM_BOUNDS, isWithinMuseumBounds } from '../../utils/museumBounds.js';

// Design tokens from ui_rules Section 3.2: accent blue for a valid geofence and
// warning red for the out-of-bounds error state.
const GEOFENCE_OUTLINE_COLOR = '#1D4ED8';
const OUT_OF_BOUNDS_COLOR = '#B91C1C';
const DEFAULT_MAP_BORDER_COLOR = '#CBD5E1';

const DEFAULT_ZOOM = 17;
const MIN_ZOOM = 15;
const MAX_ZOOM = 19;
const MAP_HEIGHT_PX = 320;
const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

// AC-03.2.2: the radius slider honours a 1m step between 10m and 50m.
export const MIN_TRIGGER_RADIUS = 10;
export const MAX_TRIGGER_RADIUS = 50;
const RADIUS_STEP = 1;

// `Numeric(10, 7)` in MySQL stores 7 decimal places, so coordinates are
// rounded to that precision before they are shown or persisted.
const COORDINATE_PRECISION = 1e7;

const OUT_OF_BOUNDS_MESSAGE =
  'Coordinates must stay inside the Cu Chi Tunnels boundary (Lat 11.1350-11.1550, Lng 106.4500-106.4750).';

function roundCoordinate(value) {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

/**
 * Interactive Leaflet coordinate picker with a live geofence radius preview.
 *
 * @param {object} props
 * @param {string} props.poiId exhibit identifier, echoed back to `onSave`
 * @param {number} props.initialLatitude starting latitude of the pin
 * @param {number} props.initialLongitude starting longitude of the pin
 * @param {number} props.initialRadius starting geofence radius in metres
 * @param {boolean} [props.isSaving] disables the save action while persisting
 * @param {(calibration: {poiId: string, latitude: number, longitude: number, radius: number}) => void} [props.onSave]
 */
export default function AdminMapPicker({
  poiId,
  initialLatitude,
  initialLongitude,
  initialRadius,
  isSaving = false,
  onSave,
  onChange,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [radius, setRadius] = useState(initialRadius);

  const isOutOfBounds = useMemo(
    () => !isWithinMuseumBounds(latitude, longitude),
    [latitude, longitude],
  );

  // ---------------------------------------------------------------------------
  // MAP BOOTSTRAP: one bounded map, one draggable pin and one radius circle.
  // The picker is remounted by the host (`key={poiId}`) whenever the selected
  // exhibit changes, so this effect intentionally runs once per exhibit.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(mapElementRef.current, {
      center: [initialLatitude, initialLongitude],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: L.latLngBounds(
        [MUSEUM_BOUNDS.minLat, MUSEUM_BOUNDS.minLng],
        [MUSEUM_BOUNDS.maxLat, MUSEUM_BOUNDS.maxLng],
      ),
      maxBoundsViscosity: 0.85,
    });

    const tileLayer = L.tileLayer(TILE_LAYER_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    });
    tileLayer.addTo(map);

    const marker = L.marker([initialLatitude, initialLongitude], {
      draggable: true,
      autoPan: true,
    });
    marker.addTo(map);

    const circle = L.circle([initialLatitude, initialLongitude], {
      radius: initialRadius,
      color: GEOFENCE_OUTLINE_COLOR,
      weight: 2,
      fillColor: GEOFENCE_OUTLINE_COLOR,
      fillOpacity: 0.15,
    });
    circle.addTo(map);

    // AC-03.2.1: dragging the pin immediately republishes its coordinates to
    // the numeric inputs, and keeps the radius circle centred on the pin.
    const handleMarkerMove = () => {
      const { lat, lng } = marker.getLatLng();
      setLatitude(roundCoordinate(lat));
      setLongitude(roundCoordinate(lng));
      circle.setLatLng([lat, lng]);
    };
    marker.on('drag', handleMarkerMove);
    marker.on('dragend', handleMarkerMove);

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [initialLatitude, initialLongitude, initialRadius]);

  // AC-03.2.2: the geofence circle resizes live as the slider moves.
  useEffect(() => {
    circleRef.current?.setRadius(radius);
  }, [radius]);

  // Report changes to parent container if onChange listener provided
  useEffect(() => {
    if (onChange && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      onChange({ latitude, longitude, radius, isOutOfBounds });
    }
  }, [latitude, longitude, radius, isOutOfBounds, onChange]);

  // AC-03.2.3: an out-of-bounds pin turns the circle red as an extra cue.
  useEffect(() => {
    const circleColor = isOutOfBounds ? OUT_OF_BOUNDS_COLOR : GEOFENCE_OUTLINE_COLOR;
    circleRef.current?.setStyle({ color: circleColor, fillColor: circleColor });
  }, [isOutOfBounds]);

  // UX rules Section 3.2: typing into the numeric fields moves the pin and the
  // geofence circle in real time (the reverse direction of the drag binding).
  const movePinTo = (nextLatitude, nextLongitude) => {
    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) {
      return;
    }
    const nextPosition = [nextLatitude, nextLongitude];
    markerRef.current?.setLatLng(nextPosition);
    circleRef.current?.setLatLng(nextPosition);
  };

  const handleLatitudeChange = (event) => {
    const nextLatitude = event.target.value === '' ? Number.NaN : Number(event.target.value);
    setLatitude(nextLatitude);
    movePinTo(nextLatitude, longitude);
  };

  const handleLongitudeChange = (event) => {
    const nextLongitude = event.target.value === '' ? Number.NaN : Number(event.target.value);
    setLongitude(nextLongitude);
    movePinTo(latitude, nextLongitude);
  };

  const handleRadiusChange = (event) => {
    setRadius(Number(event.target.value));
  };

  const handleSave = () => {
    if (isOutOfBounds || isSaving || !onSave) {
      return;
    }
    onSave({ poiId, latitude, longitude, radius });
  };

  const coordinateInputClass = (hasError) =>
    `w-full rounded-md border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${hasError
      ? 'border-[#B91C1C] focus:ring-[#B91C1C]'
      : 'border-slate-300 focus:ring-blue-600'
    }`;

  return (
    <section className="flex flex-col gap-4" aria-label="Geofence calibration map">
      <div
        ref={mapElementRef}
        role="application"
        aria-label="Interactive geofence map with draggable pin"
        data-testid="admin-map-picker-canvas"
        className="w-full rounded-md border bg-slate-100"
        style={{
          height: `${MAP_HEIGHT_PX}px`,
          borderColor: isOutOfBounds ? OUT_OF_BOUNDS_COLOR : DEFAULT_MAP_BORDER_COLOR,
          borderWidth: isOutOfBounds ? '2px' : '1px',
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Latitude
          <input
            type="number"
            inputMode="decimal"
            step="0.0000001"
            aria-label="Latitude"
            aria-invalid={isOutOfBounds}
            value={Number.isNaN(latitude) ? '' : latitude}
            onChange={handleLatitudeChange}
            className={coordinateInputClass(isOutOfBounds)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Longitude
          <input
            type="number"
            inputMode="decimal"
            step="0.0000001"
            aria-label="Longitude"
            aria-invalid={isOutOfBounds}
            value={Number.isNaN(longitude) ? '' : longitude}
            onChange={handleLongitudeChange}
            className={coordinateInputClass(isOutOfBounds)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
          <label htmlFor="geofence-radius-slider">Trigger Radius</label>
          <span className="font-mono text-sm text-slate-900">{radius}m</span>
        </div>
        <input
          id="geofence-radius-slider"
          type="range"
          min={MIN_TRIGGER_RADIUS}
          max={MAX_TRIGGER_RADIUS}
          step={RADIUS_STEP}
          value={radius}
          onChange={handleRadiusChange}
          aria-label="Trigger Radius"
          className="w-full accent-blue-700"
        />
      </div>

      {isOutOfBounds && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {OUT_OF_BOUNDS_MESSAGE}
        </p>
      )}

      {onSave && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isOutOfBounds || isSaving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </section>
  );
}
