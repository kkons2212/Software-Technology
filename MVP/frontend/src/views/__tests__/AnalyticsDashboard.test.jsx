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
}));

import { getAnalyticsSummary } from '../../api/analyticsApi.js';
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
  getAnalyticsSummary.mockResolvedValue(POPULATED_SUMMARY);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AnalyticsDashboard', () => {
  it('renders the 4 KPI cards, the Top 10 ranking bars and the language distribution', async () => {
    render(<AnalyticsDashboard />);

    expect(await screen.findByTestId('analytics-kpi-grid')).toBeInTheDocument();

    expect(screen.getByTestId('analytics-kpi-total-visitors')).toHaveTextContent('Total Visitors');
    expect(screen.getByTestId('analytics-kpi-total-visitors')).toHaveTextContent('1,240');
    expect(screen.getByTestId('analytics-kpi-total-audio-plays')).toHaveTextContent('3,010');
    expect(screen.getByTestId('analytics-kpi-top-exhibit')).toHaveTextContent('Ben Duoc Tunnels');
    expect(screen.getByTestId('analytics-kpi-average-duration')).toHaveTextContent('12.5 min');

    expect(screen.getByTestId('analytics-kpi-grid').children).toHaveLength(4);

    // The busiest exhibit owns the full-width bar; the runner-up is proportional.
    const ranking = screen.getByTestId('analytics-poi-ranking');
    expect(within(ranking).getByText('Ben Duoc Tunnels')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-poi-row-poi-1').querySelector('div[style]')).toHaveStyle({
      width: '100%',
    });
    expect(screen.getByTestId('analytics-poi-row-poi-2').querySelector('div[style]')).toHaveStyle({
      width: '20%',
    });

    const languages = screen.getByTestId('analytics-language-distribution');
    expect(within(languages).getByText('Vietnamese')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-language-row-ja')).toHaveTextContent('310 (50%)');
    expect(screen.getByTestId('analytics-language-row-vi').querySelector('div[style]')).toHaveStyle({
      width: '50%',
    });

    expect(screen.queryByTestId('analytics-error-state')).not.toBeInTheDocument();
  });

  it('defaults to the LAST_7_DAYS window and refetches when another window is selected', async () => {
    render(<AnalyticsDashboard />);

    await screen.findByTestId('analytics-kpi-grid');
    expect(getAnalyticsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ range: 'LAST_7_DAYS', signal: expect.any(AbortSignal) })
    );
    expect(screen.getByTestId('analytics-range-LAST_7_DAYS')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByTestId('analytics-range-TODAY'));

    await waitFor(() =>
      expect(getAnalyticsSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ range: 'TODAY', signal: expect.any(AbortSignal) })
      )
    );
    expect(screen.getByTestId('analytics-range-TODAY')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('analytics-range-LAST_7_DAYS')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('shows a non-blocking error with a Retry action that reloads the summary', async () => {
    getAnalyticsSummary
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(POPULATED_SUMMARY);

    render(<AnalyticsDashboard />);

    const errorState = await screen.findByTestId('analytics-error-state');
    expect(errorState).toHaveTextContent('Unable to load visitor analytics.');
    expect(screen.queryByTestId('analytics-kpi-grid')).not.toBeInTheDocument();

    fireEvent.click(within(errorState).getByRole('button', { name: 'Retry' }));

    expect(await screen.findByTestId('analytics-kpi-grid')).toBeInTheDocument();
    expect(getAnalyticsSummary).toHaveBeenCalledTimes(2);
  });

  it('ignores a superseded (aborted) request instead of surfacing a failure', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    getAnalyticsSummary.mockRejectedValue(abortError);

    render(<AnalyticsDashboard />);

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('analytics-error-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('analytics-range-control')).toBeInTheDocument();
  });

  it('renders zeroed KPIs and empty-state notices when the window holds no telemetry', async () => {
    getAnalyticsSummary.mockResolvedValue(EMPTY_SUMMARY);

    render(<AnalyticsDashboard />);

    expect(await screen.findByTestId('analytics-kpi-grid')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-kpi-total-visitors')).toHaveTextContent('0');
    expect(screen.getByTestId('analytics-kpi-average-duration')).toHaveTextContent('0.0 min');
    expect(screen.getByTestId('analytics-kpi-top-exhibit')).toHaveTextContent('—');
    expect(screen.getByTestId('analytics-poi-empty-state')).toHaveTextContent(
      'No exhibit triggers were recorded for this period.'
    );
    expect(screen.getByTestId('analytics-language-empty-state')).toHaveTextContent(
      'No visitor languages were recorded for this period.'
    );
  });

  it('tolerates a partial payload that omits the KPI and ranking sections', async () => {
    getAnalyticsSummary.mockResolvedValue({ time_range: 'TODAY', generated_at: null });

    render(<AnalyticsDashboard />);

    expect(await screen.findByTestId('analytics-kpi-grid')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-kpi-top-exhibit')).toHaveTextContent('—');
    expect(screen.getByTestId('analytics-poi-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-language-empty-state')).toBeInTheDocument();
  });
});
