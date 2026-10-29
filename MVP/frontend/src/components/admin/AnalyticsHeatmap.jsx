// =============================================================================
// TIER 2 - ADMIN VISITOR DENSITY HEATMAP COMPONENT (US 05.1 / TSK-05.1.2)
// Visualises visitor telemetry clusters across the Cu Chi Tunnels complex using
// Leaflet and leaflet.heat. Adheres to 3-tier architecture by delegating
// data retrieval to `api/analyticsApi.js`.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import {
  ANALYTICS_TIME_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  getHeatmapData,
} from '../../api/analyticsApi.js';
import { MAIN_ENTRANCE } from '../../utils/museumBounds.js';

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

const DEFAULT_MAP_ZOOM = 16;
const MIN_MAP_ZOOM = 14;
const MAX_MAP_ZOOM = 18;

// AC-05.1.1: Three gradient tiers
// 0.0 - 0.4: Green (Low Density)
// 0.4 - 0.7: Yellow (Moderate)
// 0.7 - 1.0: Red (Congestion Alert)
export const HEATMAP_GRADIENT = {
  0.2: '#22C55E', // Green - Low
  0.5: '#EAB308', // Yellow - Moderate
  0.8: '#EF4444', // Red - Congestion Alert
};

export const DEFAULT_HEAT_RADIUS = 25;
export const DEFAULT_HEAT_BLUR = 18;

const RANGE_OPTIONS = [
  { value: ANALYTICS_TIME_RANGES.TODAY, label: 'Today' },
  { value: ANALYTICS_TIME_RANGES.LAST_7_DAYS, label: 'Last 7 days' },
  { value: ANALYTICS_TIME_RANGES.LAST_30_DAYS, label: 'Last 30 days' },
];

export default function AnalyticsHeatmap({
  range: externalRange,
  onRangeChange: externalOnRangeChange,
}) {
  const [internalRange, setInternalRange] = useState(DEFAULT_ANALYTICS_RANGE);
  const activeRange = externalRange || internalRange;

  const [heatmapData, setHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [radius, setRadius] = useState(DEFAULT_HEAT_RADIUS);
  const [blur, setBlur] = useState(DEFAULT_HEAT_BLUR);
  const [reloadToken, setReloadToken] = useState(0);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerGroupRef = useRef(null);

  const handleRangeSelect = (nextRange) => {
    if (externalOnRangeChange) {
      externalOnRangeChange(nextRange);
    } else {
      setInternalRange(nextRange);
    }
  };

  // Fetch telemetry aggregation payload for the active reporting window
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage('');

    getHeatmapData({ range: activeRange, signal: controller.signal })
      .then((payload) => {
        setHeatmapData(payload);
        setErrorMessage('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setErrorMessage('Unable to load heatmap telemetry. Please check connection and retry.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeRange, reloadToken]);

  // Initialise Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current && typeof L.map === 'function') {
      try {
        const map = L.map(mapContainerRef.current, {
          center: [MAIN_ENTRANCE.lat, MAIN_ENTRANCE.lng],
          zoom: DEFAULT_MAP_ZOOM,
          minZoom: MIN_MAP_ZOOM,
          maxZoom: MAX_MAP_ZOOM,
        });

        if (typeof L.tileLayer === 'function') {
          const tile = L.tileLayer(TILE_LAYER_URL, {
            attribution: TILE_ATTRIBUTION,
          });
          if (tile && typeof tile.addTo === 'function') {
            tile.addTo(map);
          }
        }

        if (typeof L.layerGroup === 'function') {
          markersLayerGroupRef.current = L.layerGroup();
          if (markersLayerGroupRef.current && typeof markersLayerGroupRef.current.addTo === 'function') {
            markersLayerGroupRef.current.addTo(map);
          }
        }
        mapInstanceRef.current = map;
      } catch {
        // Fallback for non-browser/test environments
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          if (typeof mapInstanceRef.current.remove === 'function') {
            mapInstanceRef.current.remove();
          }
        } catch {
          // Ignore teardown errors in jsdom
        }
        mapInstanceRef.current = null;
        heatLayerRef.current = null;
        markersLayerGroupRef.current = null;
      }
    };
  }, []);

  // Update Heatmap Layer whenever points or radius/blur controls change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous heat layer if present
    if (heatLayerRef.current && typeof map.removeLayer === 'function') {
      try {
        map.removeLayer(heatLayerRef.current);
      } catch {
        // Safe catch
      }
      heatLayerRef.current = null;
    }

    // Clean up marker tooltips
    if (markersLayerGroupRef.current && typeof markersLayerGroupRef.current.clearLayers === 'function') {
      try {
        markersLayerGroupRef.current.clearLayers();
      } catch {
        // Safe catch
      }
    }

    const points = heatmapData?.points || [];
    if (points.length === 0) return;

    // Format points array: [lat, lng, intensity]
    const heatPoints = points.map((p) => [p.lat, p.lng, p.intensity]);

    if (typeof L.heatLayer === 'function') {
      try {
        const heat = L.heatLayer(heatPoints, {
          radius: Number(radius),
          blur: Number(blur),
          maxZoom: MAX_MAP_ZOOM,
          gradient: HEATMAP_GRADIENT,
        });
        if (heat && typeof heat.addTo === 'function') {
          heat.addTo(map);
          heatLayerRef.current = heat;
        }
      } catch {
        // Fallback for mock/test environments
      }
    }

    // Add lightweight clickable POI dots to inspect details
    if (markersLayerGroupRef.current && typeof L.circleMarker === 'function') {
      points.forEach((point) => {
        try {
          const marker = L.circleMarker([point.lat, point.lng], {
            radius: 6,
            color: point.intensity >= 0.7 ? '#EF4444' : point.intensity >= 0.4 ? '#EAB308' : '#22C55E',
            fillColor: '#FFFFFF',
            fillOpacity: 0.9,
            weight: 2,
          });

          if (marker && typeof marker.bindPopup === 'function') {
            marker.bindPopup(`
              <div class="text-xs font-sans">
                <strong class="text-slate-900 block mb-1">${point.poi_title}</strong>
                <span class="text-slate-600">Triggers: </span><strong>${point.trigger_count}</strong><br/>
                <span class="text-slate-600">Density: </span><strong>${(point.intensity * 100).toFixed(0)}%</strong>
              </div>
            `);
          }
          if (marker && markersLayerGroupRef.current && typeof markersLayerGroupRef.current.addLayer === 'function') {
            markersLayerGroupRef.current.addLayer(marker);
          }
        } catch {
          // Safe catch
        }
      });
    }
  }, [heatmapData, radius, blur]);

  // Identify highest congestion point
  const congestionHotspot = useMemo(() => {
    const points = heatmapData?.points || [];
    if (points.length === 0) return null;
    const top = [...points].sort((a, b) => b.trigger_count - a.trigger_count)[0];
    return top && top.intensity >= 0.7 ? top : null;
  }, [heatmapData]);

  return (
    <div
      data-testid="analytics-heatmap-container"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      {/* Header & Controls bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Real-Time Visitor Density Heatmap</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Live Telemetry
            </span>
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Spatial congestion monitoring across Cu Chi Tunnels complex (AC-05.1.1, AC-05.1.2).
          </p>
        </div>

        {/* Reporting range buttons */}
        <div
          role="group"
          aria-label="Heatmap reporting window"
          data-testid="heatmap-range-controls"
          className="inline-flex flex-wrap gap-1 rounded-md border border-slate-200 bg-slate-50 p-1"
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`heatmap-range-${opt.value}`}
              aria-pressed={activeRange === opt.value}
              onClick={() => handleRangeSelect(opt.value)}
              className={`min-h-[36px] min-w-[70px] rounded px-3 text-xs font-semibold transition-colors ${
                activeRange === opt.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Congestion Alert Notification Card */}
      {congestionHotspot && (
        <div
          data-testid="heatmap-congestion-alert"
          className="mt-3 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-red-900"
        >
          <div className="mt-0.5 h-2 w-2 rounded-full bg-red-600 animate-ping" />
          <div className="text-xs">
            <span className="font-bold">Congestion Alert: </span>
            <span>
              High visitor density detected at <strong>{congestionHotspot.poi_title}</strong> (
              {congestionHotspot.trigger_count} triggers, {(congestionHotspot.intensity * 100).toFixed(0)}% relative density). Consider dispatching staff to regulate tunnel throughput.
            </span>
          </div>
        </div>
      )}

      {/* Interactive Map Canvas Container */}
      <div className="relative mt-4 overflow-hidden rounded-md border border-slate-200">
        <div
          ref={mapContainerRef}
          data-testid="heatmap-leaflet-map"
          className="h-[360px] w-full bg-slate-100"
          aria-label="Visitor density heatmap leaflet canvas"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div
            data-testid="heatmap-loading-overlay"
            className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] text-xs font-medium text-slate-700"
          >
            Aggregating visitor GPS telemetry...
          </div>
        )}

        {/* Error / Empty State Overlay */}
        {errorMessage && (
          <div
            data-testid="heatmap-error-overlay"
            className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 p-4 text-center"
          >
            <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setReloadToken((t) => t + 1)}
              className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && heatmapData?.points?.length === 0 && (
          <div
            data-testid="heatmap-empty-state"
            className="absolute inset-x-4 top-4 rounded bg-white/90 px-3 py-2 text-center text-xs text-slate-600 shadow-sm"
          >
            No POI triggers recorded for this period. Heatmap will render once visitors arrive.
          </div>
        )}

        {/* Bottom Legend Overlay (AC-05.1.1) */}
        <div
          data-testid="heatmap-legend"
          className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/95 px-3 py-2 shadow-md border border-slate-200 text-xs backdrop-blur-sm"
        >
          <div className="font-semibold text-slate-800 mb-1">Density Scale</div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
            <span className="text-[11px] text-slate-600 mr-2">Low (0 - 40%)</span>

            <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]" />
            <span className="text-[11px] text-slate-600 mr-2">Moderate (40 - 70%)</span>

            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
            <span className="text-[11px] text-slate-600 font-semibold">Congestion (&gt; 70%)</span>
          </div>
        </div>
      </div>

      {/* Sliders for Radius & Blur configuration */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <label htmlFor="heatmap-radius-slider" className="font-medium text-slate-700">
            Heat Radius: <span className="font-mono">{radius}px</span>
          </label>
          <input
            id="heatmap-radius-slider"
            data-testid="heatmap-radius-slider"
            type="range"
            min="10"
            max="50"
            step="1"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="h-1.5 w-28 cursor-pointer rounded-lg bg-slate-200 accent-slate-900"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="heatmap-blur-slider" className="font-medium text-slate-700">
            Blur Opacity: <span className="font-mono">{blur}px</span>
          </label>
          <input
            id="heatmap-blur-slider"
            data-testid="heatmap-blur-slider"
            type="range"
            min="5"
            max="30"
            step="1"
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            className="h-1.5 w-28 cursor-pointer rounded-lg bg-slate-200 accent-slate-900"
          />
        </div>

        <div className="text-[11px] text-slate-400">
          Total Exhibits Monitored: <strong className="text-slate-700">{heatmapData?.total_points || 0}</strong>
        </div>
      </div>
    </div>
  );
}
