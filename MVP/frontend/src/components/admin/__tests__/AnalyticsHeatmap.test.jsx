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
    expect(screen.getByText('Real-Time Visitor Density Heatmap')).toBeInTheDocument();
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
    expect(legend).toHaveTextContent(/Low \(0 - 40%\)/i);
    expect(legend).toHaveTextContent(/Moderate \(40 - 70%\)/i);
    expect(legend).toHaveTextContent(/Congestion \(> 70%\)/i);
  });

  it('displays a high-priority congestion alert card when a hotspot exceeds 70% density', async () => {
    render(<AnalyticsHeatmap />);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-congestion-alert')).toBeInTheDocument();
    });

    const alert = screen.getByTestId('heatmap-congestion-alert');
    expect(alert).toHaveTextContent('Congestion Alert:');
    expect(alert).toHaveTextContent('Commanding Bunker');
    expect(alert).toHaveTextContent('500 triggers');
    expect(alert).toHaveTextContent('100% relative density');
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
      screen.getByText(/No POI triggers recorded for this period/i)
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
      screen.getByText(/Unable to load heatmap telemetry/i)
    ).toBeInTheDocument();

    getHeatmapData.mockResolvedValueOnce(MOCK_HEATMAP_CONGESTED);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('heatmap-error-overlay')).not.toBeInTheDocument();
    });
  });
});
