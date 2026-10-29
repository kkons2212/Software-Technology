/**
 * Paired unit tests for `src/views/admin/AnalyticsDashboard.jsx`
 * (US 05.2 / TSK-05.2.2 & TSK-05.2.3).
 *
 * The Tier-3 API module is mocked so these assertions cover the presentation
 * contract only: the 4 AC-05.2.1 KPI cards, the AC-05.2.2 Top 10 bar ranking and
 * language percentage list, the reporting-window segmented control, and the
 * loading / non-blocking error / empty states.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../api/analyticsApi.js', () => ({
  ANALYTICS_TIME_RANGES: {
    TODAY: 'TODAY',
    LAST_7_DAYS: 'LAST_7_DAYS',
    LAST_30_DAYS: 'LAST_30_DAYS',
  },
  DEFAULT_ANALYTICS_RANGE: 'LAST_7_DAYS',
  getAnalyticsSummary: vi.fn(),
  getHeatmapData: vi.fn(),
  exportTelemetryData: vi.fn(),
}));

import { getAnalyticsSummary, getHeatmapData } from '../../api/analyticsApi.js';
import AnalyticsDashboard from '../admin/AnalyticsDashboard.jsx';

const POPULATED_SUMMARY = {
  time_range: 'LAST_7_DAYS',
  generated_at: '2026-10-27T06:30:00',
  kpis: {
    total_visitors: 1240,
    total_audio_plays: 3010,
    top_exhibit_title: 'Ben Duoc Tunnels',
    average_tour_duration_minutes: 12.5,
  },
  top_pois: [
    { poi_id: 'poi-1', poi_title: 'Ben Duoc Tunnels', trigger_count: 60 },
    { poi_id: 'poi-2', poi_title: 'Cu Chi Tunnels', trigger_count: 12 },
  ],
  language_distribution: [
    { language_id: 'vi', language_name: 'Vietnamese', visitor_count: 310, percentage: 50.0 },
    { language_id: 'ja', language_name: 'Japanese', visitor_count: 310, percentage: 50.0 },
  ],
};

const EMPTY_SUMMARY = {
  time_range: 'LAST_7_DAYS',
  generated_at: '2026-10-27T06:30:00',
  kpis: {
    total_visitors: 0,
    total_audio_plays: 0,
    top_exhibit_title: null,
    average_tour_duration_minutes: 0.0,
  },
  top_pois: [],
  language_distribution: [],
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  getAnalyticsSummary.mockResolvedValue(POPULATED_SUMMARY);
  getHeatmapData.mockResolvedValue({
    time_range: 'LAST_7_DAYS',
    generated_at: '2026-10-27T06:30:00',
    points: [],
    total_points: 0,
    max_trigger_count: 0,
  });
});

afterEach(() => {
  cleanup();
});

describe('AnalyticsDashboard', () => {
  it('renders the 4 KPI cards, the Top 10 ranking bars and the language distribution', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('analytics-loading-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('analytics-kpi-total-visitors')).toHaveTextContent('1,240');
    expect(screen.getByTestId('analytics-kpi-total-audio-plays')).toHaveTextContent('3,010');
    expect(screen.getByTestId('analytics-kpi-top-exhibit')).toHaveTextContent('Ben Duoc Tunnels');
    expect(screen.getByTestId('analytics-kpi-average-duration')).toHaveTextContent('12.5 min');

    const topSection = screen.getByTestId('analytics-top-exhibits');
    expect(within(topSection).getByTestId('analytics-top-poi-row-poi-1')).toHaveTextContent(
      'Ben Duoc Tunnels',
    );
    expect(within(topSection).getByTestId('analytics-top-poi-row-poi-2')).toHaveTextContent(
      'Cu Chi Tunnels',
    );

    const langSection = screen.getByTestId('analytics-language-distribution');
    expect(within(langSection).getByTestId('analytics-language-row-vi')).toHaveTextContent(
      'Vietnamese',
    );
    expect(within(langSection).getByTestId('analytics-language-row-ja')).toHaveTextContent(
      'Japanese',
    );
  });

  it('defaults to the LAST_7_DAYS reporting window and loads that period', async () => {
    render(<AnalyticsDashboard />);

    expect(getAnalyticsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ range: 'LAST_7_DAYS' }),
    );
    expect(screen.getByTestId('analytics-range-LAST_7_DAYS')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('re-fetches telemetry when the operator switches the reporting window', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('analytics-loading-skeleton')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('analytics-range-TODAY'));

    await waitFor(() => {
      expect(getAnalyticsSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ range: 'TODAY' }),
      );
    });
    expect(screen.getByTestId('analytics-range-TODAY')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('analytics-range-LAST_7_DAYS')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('renders a retryable non-blocking error banner on network failure', async () => {
    getAnalyticsSummary.mockRejectedValueOnce(new Error('Network offline'));

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('analytics-error-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('analytics-error-state')).toHaveTextContent('Network offline');

    getAnalyticsSummary.mockResolvedValueOnce(POPULATED_SUMMARY);
    fireEvent.click(screen.getByTestId('analytics-retry-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('analytics-error-state')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('analytics-kpi-total-visitors')).toHaveTextContent('1,240');
  });

  it('displays empty placeholders when the reporting window contains zero triggers', async () => {
    getAnalyticsSummary.mockResolvedValueOnce(EMPTY_SUMMARY);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('analytics-loading-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('analytics-kpi-total-visitors')).toHaveTextContent('0');
    expect(screen.getByTestId('analytics-kpi-total-audio-plays')).toHaveTextContent('0');
    expect(screen.getByTestId('analytics-kpi-top-exhibit')).toHaveTextContent('—');
    expect(screen.getByTestId('analytics-kpi-average-duration')).toHaveTextContent('0.0 min');

    expect(screen.getByTestId('analytics-top-exhibits-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-language-empty-state')).toBeInTheDocument();
  });

  it('renders the analytics export toolbar', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('analytics-loading-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('analytics-export-toolbar')).toBeInTheDocument();
  });
});
