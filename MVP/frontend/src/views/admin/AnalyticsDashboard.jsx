// =============================================================================
// TIER 1 - ADMIN VISITOR ANALYTICS DASHBOARD (US 05.2, US 05.1 & US 05.4)
// Renders the 4 KPI summary cards, the visitor density heatmap, the telemetry
// export toolbar, the Top 10 exhibit ranking and the visitor language distribution.
// All network access is delegated to the Tier-3 API layer (`api/analyticsApi.js`)
// to preserve the frontend 3-tier boundary.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_TIME_RANGES,
  getAnalyticsSummary,
} from '../../api/analyticsApi.js';
import AnalyticsExport from '../../components/admin/AnalyticsExport.jsx';
import AnalyticsHeatmap from '../../components/admin/AnalyticsHeatmap.jsx';

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
        setIsLoading(false);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }
        setErrorMessage(error?.message || LOAD_ERROR_MESSAGE);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [range, reloadToken]);

  const handleRangeChange = (nextRange) => {
    if (nextRange === range) {
      return;
    }
    setRange(nextRange);
  };

  const handleRetry = () => {
    setReloadToken((current) => current + 1);
  };

  const kpis = summary?.kpis;
  const topPois = useMemo(() => summary?.top_pois ?? [], [summary]);
  const languageDistribution = useMemo(
    () => summary?.language_distribution ?? [],
    [summary],
  );

  const maxTriggerCount = useMemo(() => {
    if (!topPois.length) {
      return 0;
    }
    return Math.max(...topPois.map((item) => Number(item.trigger_count) || 0));
  }, [topPois]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Visitor Analytics &amp; Exhibition Impact
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Aggregated visitor KPIs, Top 10 exhibit rankings, average tour duration,
          spatial density heatmap, data export and language demographics (US 05.1, US 05.2 &amp; US 05.4).
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
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* US 05.4: Telemetry Filtering & Structured Data Export Toolbar */}
      <div className="mt-6">
        <AnalyticsExport currentRange={range} />
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          data-testid="analytics-loading-skeleton"
          className="mt-6 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-md bg-slate-200"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-md bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-md bg-slate-200" />
            <div className="h-64 animate-pulse rounded-md bg-slate-200" />
          </div>
          <span className="sr-only">Loading visitor analytics...</span>
        </div>
      )}

      {/* Error state */}
      {!isLoading && errorMessage && (
        <div
          role="alert"
          data-testid="analytics-error-state"
          className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
        >
          <p className="text-sm font-medium">{errorMessage}</p>
          <button
            type="button"
            data-testid="analytics-retry-button"
            onClick={handleRetry}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-md bg-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Body */}
      {!isLoading && !errorMessage && (
        <>
          {/* AC-05.2.1: 4 Flat KPI Cards */}
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

          {/* US 05.1: Real-Time Visitor Density Heatmap */}
          <div className="mt-8">
            <AnalyticsHeatmap range={range} />
          </div>

          {/* Visual Charts: Top 10 Exhibits + Language Distribution */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top 10 Exhibits by Trigger Volume */}
            <section
              aria-labelledby="analytics-top-exhibits-heading"
              data-testid="analytics-top-exhibits"
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
                  data-testid="analytics-top-exhibits-empty-state"
                  className="mt-4 text-sm text-slate-500"
                >
                  No exhibit triggers were recorded for this period.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {topPois.map((item) => (
                    <li
                      key={item.poi_id}
                      data-testid={`analytics-top-poi-row-${item.poi_id}`}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm text-slate-700">
                          {item.poi_title}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">
                          {formatCount(item.trigger_count)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-[#1E293B]"
                          style={{
                            width: `${toBarWidthPercent(item.trigger_count, maxTriggerCount)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Language Demographics */}
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
