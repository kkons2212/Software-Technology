// =============================================================================
// TIER 1 - ADMIN VISITOR ANALYTICS DASHBOARD (US 05.2)
// Renders the 4 KPI summary cards, the Top 10 exhibit ranking and the visitor
// language distribution. All network access is delegated to the Tier-3 API
// layer (`api/analyticsApi.js`) to preserve the frontend 3-tier boundary.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_TIME_RANGES,
  getAnalyticsSummary,
} from '../../api/analyticsApi.js';

// Reporting windows exposed by the segmented control, in display order.
const RANGE_OPTIONS = [
  { value: ANALYTICS_TIME_RANGES.TODAY, label: 'Today' },
  { value: ANALYTICS_TIME_RANGES.LAST_7_DAYS, label: 'Last 7 days' },
  { value: ANALYTICS_TIME_RANGES.LAST_30_DAYS, label: 'Last 30 days' },
];

const DEFAULT_RANGE = ANALYTICS_TIME_RANGES.LAST_7_DAYS;
const PERCENTAGE_BASE = 100;
// Bar widths are relative to the busiest exhibit so the ranking stays legible
// even when one exhibit dominates the reporting window.
const MIN_BAR_WIDTH_PERCENT = 2;
const EMPTY_EXHIBIT_PLACEHOLDER = '—';
const LOAD_ERROR_MESSAGE =
  'Unable to load visitor analytics. Check your connection and try again.';

/**
 * Formats a whole-number metric with thousands separators for KPI legibility.
 */
function formatCount(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString('en-US') : '0';
}

/**
 * Converts a raw value into a clamped CSS width percentage for the flat bars.
 */
function toBarWidthPercent(value, maxValue) {
  if (!maxValue || maxValue <= 0) {
    return MIN_BAR_WIDTH_PERCENT;
  }
  const ratio = (Number(value) / Number(maxValue)) * PERCENTAGE_BASE;
  return Math.max(MIN_BAR_WIDTH_PERCENT, Math.min(PERCENTAGE_BASE, ratio));
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage('');

    getAnalyticsSummary({ range, signal: controller.signal })
      .then((payload) => {
        setSummary(payload);
        setErrorMessage('');
      })
      .catch((error) => {
        // An aborted request is a superseded fetch, not a user-facing failure.
        if (error.name !== 'AbortError') {
          setErrorMessage(LOAD_ERROR_MESSAGE);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [range, reloadToken]);

  const kpis = summary?.kpis ?? null;
  const topPois = useMemo(() => summary?.top_pois ?? [], [summary]);
  const languageDistribution = useMemo(
    () => summary?.language_distribution ?? [],
    [summary]
  );
  const busiestTriggerCount = useMemo(
    () =>
      topPois.reduce(
        (maxCount, entry) => Math.max(maxCount, Number(entry.trigger_count) || 0),
        0
      ),
    [topPois]
  );

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
  };

  const handleRetry = () => {
    setReloadToken((token) => token + 1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Visitor Analytics &amp; Exhibition Impact
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Aggregated visitor KPIs, Top 10 exhibit rankings, average tour duration and
          language demographics (US 05.2).
        </p>
      </div>

      {/* AC-05.2.2: Reporting window segmented control (touch targets >= 44px) */}
      <div
        role="group"
        aria-label="Reporting period"
        data-testid="analytics-range-control"
        className="mt-6 inline-flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-1"
      >
        {RANGE_OPTIONS.map((option) => {
          const isActive = option.value === range;
          return (
            <button
              key={option.value}
              type="button"
              data-testid={`analytics-range-${option.value}`}
              aria-pressed={isActive}
              onClick={() => handleRangeChange(option.value)}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-4 text-sm font-semibold ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          role="status"
          data-testid="analytics-loading-state"
          className="mt-8 py-12 text-center text-sm text-slate-500"
        >
          Loading visitor analytics...
        </div>
      )}

      {/* Non-blocking Error State with Retry */}
      {!isLoading && errorMessage && (
        <div
          role="alert"
          data-testid="analytics-error-state"
          className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && summary && (
        <>
          {/* AC-05.2.1: 4 flat KPI summary cards (no decorative icons) */}
          <div
            data-testid="analytics-kpi-grid"
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div
              data-testid="analytics-kpi-total-visitors"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <p className="text-xs text-slate-600">Total Visitors</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCount(kpis?.total_visitors)}
              </p>
            </div>

            <div
              data-testid="analytics-kpi-total-audio-plays"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <p className="text-xs text-slate-600">Total Audio Plays</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCount(kpis?.total_audio_plays)}
              </p>
            </div>

            <div
              data-testid="analytics-kpi-top-exhibit"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <p className="text-xs text-slate-600">Top Exhibit</p>
              <p
                className="mt-1 truncate text-2xl font-bold text-slate-900"
                title={kpis?.top_exhibit_title ?? EMPTY_EXHIBIT_PLACEHOLDER}
              >
                {kpis?.top_exhibit_title ?? EMPTY_EXHIBIT_PLACEHOLDER}
              </p>
            </div>

            <div
              data-testid="analytics-kpi-average-duration"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <p className="text-xs text-slate-600">Average Tour Duration</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(Number(kpis?.average_tour_duration_minutes) || 0).toFixed(1)} min
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* AC-05.2.2: Top 10 POI ranking as a flat horizontal bar list */}
            <section
              aria-labelledby="analytics-top-exhibits-heading"
              data-testid="analytics-poi-ranking"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <h2
                id="analytics-top-exhibits-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Top 10 Exhibits by Trigger Volume
              </h2>

              {topPois.length === 0 ? (
                <p
                  data-testid="analytics-poi-empty-state"
                  className="mt-4 text-sm text-slate-500"
                >
                  No exhibit triggers were recorded for this period.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {topPois.map((entry, index) => (
                    <li
                      key={entry.poi_id ?? entry.poi_title}
                      data-testid={`analytics-poi-row-${entry.poi_id}`}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm text-slate-700">
                          <span className="mr-2 font-mono text-xs text-slate-500">
                            {index + 1}
                          </span>
                          {entry.poi_title}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">
                          {formatCount(entry.trigger_count)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-[#1E293B]"
                          style={{
                            width: `${toBarWidthPercent(entry.trigger_count, busiestTriggerCount)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* AC-05.2.2: Visitor language percentage distribution list */}
            <section
              aria-labelledby="analytics-languages-heading"
              data-testid="analytics-language-distribution"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <h2
                id="analytics-languages-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Visitor Language Distribution
              </h2>

              {languageDistribution.length === 0 ? (
                <p
                  data-testid="analytics-language-empty-state"
                  className="mt-4 text-sm text-slate-500"
                >
                  No visitor languages were recorded for this period.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {languageDistribution.map((entry) => (
                    <li
                      key={entry.language_id}
                      data-testid={`analytics-language-row-${entry.language_id}`}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm text-slate-700">
                          {entry.language_name}
                        </span>
                        <span className="shrink-0 text-sm text-slate-600">
                          {formatCount(entry.visitor_count)} ({entry.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-[#64748B]"
                          style={{
                            width: `${toBarWidthPercent(entry.percentage, PERCENTAGE_BASE)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
