// =============================================================================
// TIER 2 - ADMIN VISITOR DENSITY HEATMAP COMPONENT (US 05.1 / TSK-05.1.2)
// Visualises visitor telemetry clusters across the Cu Chi Tunnels complex using
// Leaflet and leaflet.heat. Adheres to 3-tier architecture by delegating
// data retrieval to `api/analyticsApi.js`.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure global window.L is bound for leaflet.heat in modern Vite ESM environments
if (typeof window !== 'undefined' && !window.L) {
  window.L = L;
}
import 'leaflet.heat';

import {
  ANALYTICS_TIME_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  getHeatmapData,
} from '../../api/analyticsApi.js';
import { MAIN_ENTRANCE } from '../../utils/museumBounds.js';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

const DEFAULT_MAP_ZOOM = 16;
const MIN_MAP_ZOOM = 14;
const MAX_MAP_ZOOM = 18;

// AC-05.1.1: Three gradient tiers + Gray for 0 visitors
// 0.0 - 0.4: Green (Low Density)
// 0.4 - 0.7: Yellow (Moderate)
// 0.7 - 1.0: Red (Congestion Alert)
// 0 triggers: Gray (#94A3B8)
export const HEATMAP_GRADIENT = {
  0.2: '#22C55E', // Green - Low
  0.5: '#EAB308', // Yellow - Moderate
  0.8: '#EF4444', // Red - Congestion Alert
};

export const DEFAULT_HEAT_RADIUS = 28;
export const DEFAULT_HEAT_BLUR = 18;

const RANGE_OPTIONS = [
  { value: ANALYTICS_TIME_RANGES.TODAY, label: ADMIN_TRANSLATIONS.rangeToday },
  { value: ANALYTICS_TIME_RANGES.LAST_7_DAYS, label: ADMIN_TRANSLATIONS.rangeLast7Days },
  { value: ANALYTICS_TIME_RANGES.LAST_30_DAYS, label: ADMIN_TRANSLATIONS.rangeLast30Days },
];

function createHeatmapPopup(point, count, intensity, tierColor, congestionStatus) {
  const popup = document.createElement('div');
  popup.className = 'text-xs font-sans min-w-[170px] p-1';

  const title = document.createElement('strong');
  title.className = 'text-slate-900 block font-bold text-sm mb-1';
  title.textContent = String(point.poi_title ?? '');
  popup.append(title);

  const countRow = document.createElement('div');
  countRow.className = 'flex justify-between text-slate-600 mb-0.5';
  const countLabel = document.createElement('span');
  countLabel.textContent = 'Lượt khách:';
  const countValue = document.createElement('strong');
  countValue.className = 'text-slate-900 font-mono';
  countValue.textContent = `${count} lượt`;
  countRow.append(countLabel, countValue);
  popup.append(countRow);

  const intensityRow = document.createElement('div');
  intensityRow.className = 'flex justify-between text-slate-600 mb-1';
  const intensityLabel = document.createElement('span');
  intensityLabel.textContent = 'Mật độ tương đối:';
  const intensityValue = document.createElement('strong');
  intensityValue.style.color = tierColor;
  intensityValue.textContent = `${intensity}%`;
  intensityRow.append(intensityLabel, intensityValue);
  popup.append(intensityRow);

  const status = document.createElement('span');
  status.className = `inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${congestionStatus.className}`;
  status.textContent = congestionStatus.label;
  popup.append(status);

  return popup;
}

function getCongestionStatus(hasVisitors, isCongested, isModerate) {
  if (!hasVisitors) {
    return { className: 'bg-slate-400', label: 'CHƯA CÓ KHÁCH (0 lượt)' };
  }
  if (isCongested) {
    return { className: 'bg-red-600', label: 'CẢNH BÁO ÙN TẮC' };
  }
  if (isModerate) {
    return { className: 'bg-amber-500', label: 'MẬT ĐỘ VỪA PHẢI' };
  }
  return { className: 'bg-emerald-600', label: 'THÔNG THOÁNG' };
}

export default function AnalyticsHeatmap({
  range: externalRange,
  onRangeChange: externalOnRangeChange,
}) {
  const [internalRange, setInternalRange] = useState(DEFAULT_ANALYTICS_RANGE);
  const activeRange = externalRange || internalRange;

  const [heatmapData, setHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
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
          setErrorMessage(ADMIN_TRANSLATIONS.loadHeatmapError);
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

    // Clean up marker overlays
    if (markersLayerGroupRef.current && typeof markersLayerGroupRef.current.clearLayers === 'function') {
      try {
        markersLayerGroupRef.current.clearLayers();
      } catch {
        // Safe catch
      }
    }

    const points = heatmapData?.points || [];
    if (points.length === 0) return;

    // 1. Render leaflet.heat Layer (only points with activity > 0)
    const activePoints = points.filter((p) => (Number(p.trigger_count) || 0) > 0);
    const heatPoints = activePoints.map((p) => [p.lat, p.lng, p.intensity]);
    const heatLayerFactory = L.heatLayer || (window.L && window.L.heatLayer);

    if (heatPoints.length > 0 && typeof heatLayerFactory === 'function') {
      try {
        const heat = heatLayerFactory(heatPoints, {
          radius: Number(DEFAULT_HEAT_RADIUS),
          blur: Number(DEFAULT_HEAT_BLUR),
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

    // 2. Render prominent circular visual indicators on top of the heat map
    // Points with triggers: Red/Yellow/Green. Points with 0 triggers: Gray (#94A3B8).
    if (markersLayerGroupRef.current) {
      points.forEach((point) => {
        try {
          const count = Number(point.trigger_count) || 0;
          const hasVisitors = count > 0;
          const isCongested = hasVisitors && point.intensity >= 0.7;
          const isModerate = hasVisitors && point.intensity >= 0.4;

          // Color tiering: Congested (Red), Moderate (Yellow), Low (Green), Zero (Gray)
          const tierColor = !hasVisitors
            ? '#94A3B8'
            : isCongested
              ? '#EF4444'
              : isModerate
                ? '#EAB308'
                : '#22C55E';
          const intensity = Math.round((Number(point.intensity) || 0) * 100);
          const congestionStatus = getCongestionStatus(
            hasVisitors,
            isCongested,
            isModerate,
          );

          // Pulsing / glowing background circle for active points
          if (hasVisitors && typeof L.circle === 'function') {
            const glowCircle = L.circle([point.lat, point.lng], {
              radius: isCongested ? 40 : 25,
              color: tierColor,
              fillColor: tierColor,
              fillOpacity: isCongested ? 0.35 : 0.2,
              weight: 1,
            });
            markersLayerGroupRef.current.addLayer(glowCircle);
          }

          // Center interactive dot marker
          if (typeof L.circleMarker === 'function') {
            const marker = L.circleMarker([point.lat, point.lng], {
              radius: hasVisitors ? (isCongested ? 9 : 7) : 6,
              color: '#FFFFFF',
              fillColor: tierColor,
              fillOpacity: hasVisitors ? 1 : 0.85,
              weight: hasVisitors ? 2 : 1.5,
            });

            if (marker && typeof marker.bindPopup === 'function') {
              marker.bindPopup(
                createHeatmapPopup(
                  point,
                  count,
                  intensity,
                  tierColor,
                  congestionStatus,
                ),
              );
            }
            markersLayerGroupRef.current.addLayer(marker);
          }
        } catch {
          // Safe catch
        }
      });
    }
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
            <span>{ADMIN_TRANSLATIONS.heatmapTitle}</span>
          </h2>
        </div>

        {/* Range controls only when standalone (not controlled by parent dashboard) */}
        {!externalRange && (
          <div
            role="group"
            aria-label={ADMIN_TRANSLATIONS.heatmapReportingWindowAriaLabel}
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
                className={`min-h-[36px] min-w-[70px] rounded px-3 text-xs font-semibold transition-colors ${activeRange === opt.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative mt-4 overflow-hidden rounded-md border border-slate-200">
        <div
          ref={mapContainerRef}
          data-testid="heatmap-leaflet-map"
          className="h-[420px] w-full bg-slate-100"
          aria-label={ADMIN_TRANSLATIONS.heatmapCanvasAriaLabel}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div
            data-testid="heatmap-loading-overlay"
            className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] text-xs font-medium text-slate-700"
          >
            {ADMIN_TRANSLATIONS.loadingHeatmapTelemetry}
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
              {ADMIN_TRANSLATIONS.btnRetry}
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && heatmapData?.points?.length === 0 && (
          <div
            data-testid="heatmap-empty-state"
            className="absolute inset-x-4 top-4 rounded bg-white/90 px-3 py-2 text-center text-xs text-slate-600 shadow-sm"
          >
            {ADMIN_TRANSLATIONS.heatmapEmptyState}
          </div>
        )}

        {/* Bottom Legend Overlay (AC-05.1.1 + Gray for 0 visitors) */}
        <div
          data-testid="heatmap-legend"
          className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/95 px-3 py-2 shadow-md border border-slate-200 text-xs backdrop-blur-sm"
        >
          <div className="font-semibold text-slate-800 mb-1">{ADMIN_TRANSLATIONS.densityScale}</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
              <span className="text-[11px] text-slate-600">{ADMIN_TRANSLATIONS.densityLow}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]" />
              <span className="text-[11px] text-slate-600">{ADMIN_TRANSLATIONS.densityModerate}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              <span className="text-[11px] text-slate-600 font-semibold">{ADMIN_TRANSLATIONS.densityCongestion}</span>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
              <span className="text-[11px] text-slate-500">{ADMIN_TRANSLATIONS.densityZero}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3 text-xs text-slate-600">
        <div className="text-[11px] text-slate-400">
          {ADMIN_TRANSLATIONS.totalExhibitsMonitored} <strong className="text-slate-700">{heatmapData?.total_points || 0}</strong>
        </div>
      </div>
    </div>
  );
}
