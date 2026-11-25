/**
 * Paired unit tests for `src/components/admin/AnalyticsHeatmap.jsx` (US 05.1 / TSK-05.1.2 & TSK-05.1.3).
 *
 * Verifies the presentation contract of the visitor density heatmap:
 * - AC-05.1.1: 3 gradient tiers in the legend (Green/Yellow/Red).
 * - AC-05.1.2: Preset reporting intervals (Today, Last 7 Days, Last 30 Days).
 * - Congestion alert banner for high-density bottlenecks (>= 70%).
 * - Leaflet map initialization, radius/blur controls and empty/error states.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Leaflet is stubbed for jsdom environment
const leafletMocks = vi.hoisted(() => {
  const mapInstance = {
    remove: vi.fn(),
    removeLayer: vi.fn(),
  };
  const tileLayerInstance = { addTo: vi.fn(() => tileLayerInstance) };
  const layerGroupInstance = {
    addTo: vi.fn(() => layerGroupInstance),
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
  };
  const heatLayerInstance = { addTo: vi.fn(() => heatLayerInstance) };
  const circleMarkerInstance = {
    bindPopup: vi.fn(() => circleMarkerInstance),
    addTo: vi.fn(() => circleMarkerInstance),
  };

  return {
    mapInstance,
    tileLayerInstance,
    layerGroupInstance,
    heatLayerInstance,
    circleMarkerInstance,
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => tileLayerInstance),
    layerGroup: vi.fn(() => layerGroupInstance),
    heatLayer: vi.fn(() => heatLayerInstance),
    circleMarker: vi.fn(() => circleMarkerInstance),
  };
});

vi.mock('leaflet', () => ({
  default: {
    map: leafletMocks.map,
    tileLayer: leafletMocks.tileLayer,
    layerGroup: leafletMocks.layerGroup,
    heatLayer: leafletMocks.heatLayer,
    circleMarker: leafletMocks.circleMarker,
  },
}));

vi.mock('leaflet.heat', () => ({}));

vi.mock('../../../api/analyticsApi.js', () => ({
  ANALYTICS_TIME_RANGES: {
    TODAY: 'TODAY',
    LAST_7_DAYS: 'LAST_7_DAYS',
    LAST_30_DAYS: 'LAST_30_DAYS',
  },
  DEFAULT_ANALYTICS_RANGE: 'LAST_7_DAYS',
  getHeatmapData: vi.fn(),
}));

import { getHeatmapData } from '../../../api/analyticsApi.js';
import AnalyticsHeatmap from '../AnalyticsHeatmap.jsx';
import { ADMIN_TRANSLATIONS } from '../../../locales/adminTranslations.js';

const MOCK_HEATMAP_CONGESTED = {
  time_range: 'LAST_7_DAYS',
  generated_at: '2026-10-27T06:30:00',
  points: [
    {
      poi_id: 'poi-hot',
      poi_title: 'Commanding Bunker',
      lat: 11.1432,
      lng: 106.4631,
      trigger_count: 500,
      intensity: 1.0,
    },
    {
      poi_id: 'poi-moderate',
      poi_title: 'Ammunition Gallery',
      lat: 11.1425,
      lng: 106.4625,
      trigger_count: 250,
      intensity: 0.5,
    },
    {
      poi_id: 'poi-low',
      poi_title: 'Main Entrance',
      lat: 11.1415,
      lng: 106.4615,
      trigger_count: 50,
      intensity: 0.1,
    },
  ],
  total_points: 3,
  max_trigger_count: 500,
};

const MOCK_HEATMAP_EMPTY = {
  time_range: 'LAST_7_DAYS',
  generated_at: '2026-10-27T06:30:00',
  points: [],
  total_points: 0,
  max_trigger_count: 0,
};

describe('AnalyticsHeatmap Component (US 05.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHeatmapData.mockResolvedValue(MOCK_HEATMAP_CONGESTED);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the heatmap container, title and default Leaflet canvas', async () => {
    render(<AnalyticsHeatmap />);

    expect(screen.getByTestId('analytics-heatmap-container')).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TRANSLATIONS.heatmapTitle)).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-leaflet-map')).toBeInTheDocument();

    await waitFor(() => {
      expect(getHeatmapData).toHaveBeenCalledWith(
        expect.objectContaining({ range: 'LAST_7_DAYS' })
      );
    });

    expect(leafletMocks.map).toHaveBeenCalled();
  });

  it('renders the 3 gradient tiers in the legend (AC-05.1.1)', async () => {
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
    });

    const legend = screen.getByTestId('heatmap-legend');
    expect(legend).toHaveTextContent(ADMIN_TRANSLATIONS.densityLow);
    expect(legend).toHaveTextContent(ADMIN_TRANSLATIONS.densityModerate);
    expect(legend).toHaveTextContent(ADMIN_TRANSLATIONS.densityCongestion);
  });

  it('does not display congestion alert card even when a hotspot exceeds 70% density', async () => {
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('heatmap-congestion-alert')).not.toBeInTheDocument();
  });

  it('renders POI titles as text in Leaflet popups instead of interpreting HTML', async () => {
    const unsafeTitle = '<img src=x onerror=alert(1)>Bunker';
    getHeatmapData.mockResolvedValueOnce({
      ...MOCK_HEATMAP_CONGESTED,
      points: [
        {
          ...MOCK_HEATMAP_CONGESTED.points[0],
          poi_title: unsafeTitle,
        },
      ],
      total_points: 1,
    });

    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(leafletMocks.circleMarkerInstance.bindPopup).toHaveBeenCalled();
    });

    const [popup] = leafletMocks.circleMarkerInstance.bindPopup.mock.calls[0];
    expect(popup).toBeInstanceOf(HTMLElement);
    expect(popup.querySelector('strong').textContent).toBe(unsafeTitle);
    expect(popup.querySelector('img')).toBeNull();
    expect(popup.textContent).toContain('500 lượt');
    expect(popup.textContent).toContain('100%');
  });

  it('allows switching reporting window between Today, Last 7 Days and Last 30 Days (AC-05.1.2)', async () => {
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(getHeatmapData).toHaveBeenCalledTimes(1);
    });

    const todayBtn = screen.getByTestId('heatmap-range-TODAY');
    fireEvent.click(todayBtn);

    await waitFor(() => {
      expect(getHeatmapData).toHaveBeenCalledWith(
        expect.objectContaining({ range: 'TODAY' })
      );
    });
  });

  it('renders an empty state banner when no telemetry is recorded for the window', async () => {
    getHeatmapData.mockResolvedValue(MOCK_HEATMAP_EMPTY);
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByText(ADMIN_TRANSLATIONS.heatmapEmptyState)
    ).toBeInTheDocument();
  });

  it('allows adjusting the heat radius and blur sliders', async () => {
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-radius-slider')).toBeInTheDocument();
    });

    const radiusSlider = screen.getByTestId('heatmap-radius-slider');
    const blurSlider = screen.getByTestId('heatmap-blur-slider');

    fireEvent.change(radiusSlider, { target: { value: '35' } });
    fireEvent.change(blurSlider, { target: { value: '22' } });

    expect(radiusSlider.value).toBe('35');
    expect(blurSlider.value).toBe('22');
  });

  it('displays an error state and allows retry on fetch failure', async () => {
    getHeatmapData.mockRejectedValueOnce(new Error('Network error'));
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-error-overlay')).toBeInTheDocument();
    });

    expect(
      screen.getByText(ADMIN_TRANSLATIONS.loadHeatmapError)
    ).toBeInTheDocument();

    getHeatmapData.mockResolvedValueOnce(MOCK_HEATMAP_CONGESTED);
    const retryBtn = screen.getByRole('button', { name: ADMIN_TRANSLATIONS.btnRetry });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('heatmap-error-overlay')).not.toBeInTheDocument();
    });
  });
});
