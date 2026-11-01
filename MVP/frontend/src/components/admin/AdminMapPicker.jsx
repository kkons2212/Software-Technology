// =============================================================================
// ADMIN INTERACTIVE MAP & RADIUS PICKER (US 03.2 - TSK-03.2.2 / TSK-03.2.3)
// -----------------------------------------------------------------------------
// Presentation-only control reused by every Admin screen that calibrates a
// geofence (the `/admin/geofence` calibration page today, the exhibit editor of
// US 03.4 later). It owns the two-way binding between the Leaflet pin, the
// numeric Latitude/Longitude fields and the 10m-50m radius input, plus the
// out-of-bounds guardrail of AC-03.2.3. Persistence is delegated to the host
// page through `onSave`, so this component never talks to the network itself.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { isWithinMuseumBounds } from '../../utils/museumBounds.js';

// Design tokens from ui_rules Section 3.2: accent blue for a valid geofence and
// warning red for the out-of-bounds error state.
const GEOFENCE_OUTLINE_COLOR = '#1D4ED8';
const OUT_OF_BOUNDS_COLOR = '#B91C1C';
const DEFAULT_MAP_BORDER_COLOR = '#CBD5E1';

const DEFAULT_ZOOM = 17;
const MIN_ZOOM = 1;
const MAX_ZOOM = 19;
const DEFAULT_MAP_HEIGHT_PX = 260;
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
  'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).';

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
  latitudeLabel = 'Latitude',
  longitudeLabel = 'Longitude',
  radiusLabel = 'Trigger Radius',
  outOfBoundsMessage = OUT_OF_BOUNDS_MESSAGE,
  mapHeight = DEFAULT_MAP_HEIGHT_PX,
}) {
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [radius, setRadius] = useState(initialRadius);
  const [hasInvalidCharError, setHasInvalidCharError] = useState(false);
  const [hasRadiusError, setHasRadiusError] = useState(false);

  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const radiusRef = useRef(radius);
  radiusRef.current = radius;

  const isCoordOutOfBounds = useMemo(
    () => !isWithinMuseumBounds(latitude, longitude),
    [latitude, longitude],
  );

  const isOutOfBounds = useMemo(
    () => hasInvalidCharError || isCoordOutOfBounds,
    [hasInvalidCharError, isCoordOutOfBounds],
  );

  const isRadiusInvalid = useMemo(
    () => hasRadiusError || !Number.isFinite(radius) || radius < MIN_TRIGGER_RADIUS || radius > MAX_TRIGGER_RADIUS,
    [hasRadiusError, radius],
  );

  const hasAnyError = isOutOfBounds || isRadiusInvalid;

  // ---------------------------------------------------------------------------
  // MAP BOOTSTRAP: one bounded map, one draggable pin and one radius circle.
  // The picker is remounted by the host (`key={poiId}`) whenever the selected
  // exhibit changes, so this effect intentionally runs once per exhibit.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    try {
      const map = L.map(mapElementRef.current, {
        center: [initialLatitude, initialLongitude],
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
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
        interactive: false,
      });
      circle.addTo(map);

      // AC-03.2.1: dragging the pin immediately republishes its coordinates to
      // the numeric inputs, and keeps the radius circle centred on the pin.
      const handleMarkerMove = () => {
        const { lat, lng } = marker.getLatLng();
        const nextLat = roundCoordinate(lat);
        const nextLng = roundCoordinate(lng);
        setLatitude(nextLat);
        setLongitude(nextLng);
        circle.setLatLng([lat, lng]);
        onChangeRef.current?.({ latitude: nextLat, longitude: nextLng, radius: radiusRef.current });
      };
      marker.on('drag', handleMarkerMove);
      marker.on('dragend', handleMarkerMove);

      const handleMapClick = (event) => {
        if (!event?.latlng) return;
        const { lat, lng } = event.latlng;
        const nextLat = roundCoordinate(lat);
        const nextLng = roundCoordinate(lng);
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setLatitude(nextLat);
        setLongitude(nextLng);
        onChangeRef.current?.({ latitude: nextLat, longitude: nextLng, radius: radiusRef.current });
      };
      if (typeof map.on === 'function') {
        map.on('click', handleMapClick);
      }

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // Safe ignore in headless tests
        }
      }, 150);
    } catch {
      // # FALLBACK-LOGIC: Safe fallback when rendered in headless test runner (jsdom) without WebGL/DOM layout
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiId]);

  // Synchronize pin position when parent updates initialLatitude/initialLongitude (e.g. form reset or switch)
  useEffect(() => {
    if (Number.isFinite(initialLatitude) && Number.isFinite(initialLongitude)) {
      setLatitude(initialLatitude);
      setLongitude(initialLongitude);
      if (markerRef.current && circleRef.current) {
        const currentPos = markerRef.current.getLatLng();
        if (
          roundCoordinate(currentPos.lat) !== roundCoordinate(initialLatitude) ||
          roundCoordinate(currentPos.lng) !== roundCoordinate(initialLongitude)
        ) {
          const nextPos = [initialLatitude, initialLongitude];
          markerRef.current.setLatLng(nextPos);
          circleRef.current.setLatLng(nextPos);
        }
      }
    }
  }, [initialLatitude, initialLongitude]);

  useEffect(() => {
    if (typeof initialRadius === 'number') {
      setRadius(initialRadius);
    }
  }, [initialRadius]);

  // AC-03.2.2: the geofence circle resizes live as the radius value changes.
  useEffect(() => {
    if (Number.isFinite(radius) && radius > 0) {
      circleRef.current?.setRadius(radius);
    }
  }, [radius]);

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

  const handleKeyDownCoordinate = (event) => {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Enter',
      'Escape',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (
      allowedKeys.includes(event.key) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (!/^[\d.-]$/.test(event.key)) {
      setHasInvalidCharError(true);
      event.preventDefault();
    }
  };

  const handlePasteCoordinate = (event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!/^-?\d+(\.\d+)?$/.test(pasted.trim())) {
      setHasInvalidCharError(true);
      event.preventDefault();
    }
  };

  const handleLatitudeChange = (event) => {
    const isBad = event.target.validity?.badInput;
    const rawVal = event.target.value;
    if (isBad) {
      setHasInvalidCharError(true);
    } else if (rawVal !== '' && Number.isFinite(Number(rawVal))) {
      setHasInvalidCharError(false);
    }
    const nextLatitude = rawVal === '' || isBad ? Number.NaN : Number(rawVal);
    setLatitude(nextLatitude);
    movePinTo(nextLatitude, longitude);
    const valid = !isBad && Number.isFinite(nextLatitude) && isWithinMuseumBounds(nextLatitude, longitude) && !isRadiusInvalid;
    onChange?.({ latitude: nextLatitude, longitude, radius, isValid: valid });
  };

  const handleLongitudeChange = (event) => {
    const isBad = event.target.validity?.badInput;
    const rawVal = event.target.value;
    if (isBad) {
      setHasInvalidCharError(true);
    } else if (rawVal !== '' && Number.isFinite(Number(rawVal))) {
      setHasInvalidCharError(false);
    }
    const nextLongitude = rawVal === '' || isBad ? Number.NaN : Number(rawVal);
    setLongitude(nextLongitude);
    movePinTo(latitude, nextLongitude);
    const valid = !isBad && Number.isFinite(nextLongitude) && isWithinMuseumBounds(latitude, nextLongitude) && !isRadiusInvalid;
    onChange?.({ latitude, longitude: nextLongitude, radius, isValid: valid });
  };

  const handleRadiusChange = (event) => {
    const isBad = event.target.validity?.badInput;
    const rawValue = event.target.value;
    const isFloat = rawValue.includes('.') || rawValue.includes(',');
    const parsedInt = rawValue === '' || isBad || isFloat ? Number.NaN : parseInt(rawValue, 10);
    const invalidRadius =
      isBad ||
      isFloat ||
      !Number.isInteger(Number(rawValue)) ||
      !Number.isFinite(parsedInt) ||
      parsedInt < MIN_TRIGGER_RADIUS ||
      parsedInt > MAX_TRIGGER_RADIUS;

    setHasRadiusError(invalidRadius);
    setRadius(parsedInt);
    const valid = !invalidRadius && !isOutOfBounds;
    onChange?.({ latitude, longitude, radius: parsedInt, isValid: valid });
  };

  const handleKeyDownRadius = (event) => {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Enter',
      'Escape',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (
      allowedKeys.includes(event.key) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    // Only allow integer digits (0-9). Reject dot '.', comma ',', minus '-', 'e', etc.
    if (!/^\d$/.test(event.key)) {
      setHasRadiusError(true);
      event.preventDefault();
    }
  };

  const handlePasteRadius = (event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!/^\d+$/.test(pasted.trim())) {
      setHasRadiusError(true);
      event.preventDefault();
    }
  };

  const handleSave = () => {
    if (hasAnyError || isSaving || !onSave) {
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
        className="w-full rounded-md border bg-slate-100 touch-none relative z-0 cursor-crosshair"
        style={{
          height: `${mapHeight}px`,
          borderColor: hasAnyError ? OUT_OF_BOUNDS_COLOR : DEFAULT_MAP_BORDER_COLOR,
          borderWidth: hasAnyError ? '2px' : '1px',
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {latitudeLabel}
          <input
            id="poi-latitude"
            type="number"
            inputMode="decimal"
            step="0.0000001"
            aria-label={latitudeLabel}
            aria-invalid={isOutOfBounds}
            value={Number.isNaN(latitude) ? '' : latitude}
            onKeyDown={handleKeyDownCoordinate}
            onPaste={handlePasteCoordinate}
            onChange={handleLatitudeChange}
            className={coordinateInputClass(isOutOfBounds)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {longitudeLabel}
          <input
            id="poi-longitude"
            type="number"
            inputMode="decimal"
            step="0.0000001"
            aria-label={longitudeLabel}
            aria-invalid={isOutOfBounds}
            value={Number.isNaN(longitude) ? '' : longitude}
            onKeyDown={handleKeyDownCoordinate}
            onPaste={handlePasteCoordinate}
            onChange={handleLongitudeChange}
            className={coordinateInputClass(isOutOfBounds)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
          <label htmlFor="geofence-radius-input">{radiusLabel}</label>
          <span className="font-mono text-sm text-slate-900">
            {Number.isFinite(radius) ? `${radius}m` : '—'}
          </span>
        </div>
        <div className="relative">
          <input
            id="geofence-radius-input"
            type="number"
            inputMode="numeric"
            min={MIN_TRIGGER_RADIUS}
            max={MAX_TRIGGER_RADIUS}
            step={RADIUS_STEP}
            value={Number.isNaN(radius) || radius === null || radius === undefined ? '' : radius}
            onKeyDown={handleKeyDownRadius}
            onPaste={handlePasteRadius}
            onChange={handleRadiusChange}
            aria-label={radiusLabel}
            aria-invalid={isRadiusInvalid}
            placeholder="30"
            className={`w-full rounded-md border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 pr-10 ${
              isRadiusInvalid
                ? 'border-[#B91C1C] focus:ring-[#B91C1C]'
                : 'border-slate-300 focus:ring-blue-600'
            }`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 font-mono text-sm text-slate-400">
            m
          </span>
        </div>
        <span className="text-xs text-slate-500">
          Bán kính kích hoạt (10m – 50m)
        </span>
      </div>

      {hasAnyError && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {hasInvalidCharError
            ? 'Tọa độ không hợp lệ: Vui lòng chỉ nhập số thực (ví dụ: 11.1432), không được nhập chữ cái hoặc ký tự đặc biệt.'
            : isCoordOutOfBounds
            ? outOfBoundsMessage
            : 'Bán kính kích hoạt không hợp lệ (vui lòng chỉ nhập số nguyên từ 10m đến 50m, không nhập số thập phân).'}
        </p>
      )}

      {onSave && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={hasAnyError || isSaving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </section>
  );
}
