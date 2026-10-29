/**
 * Paired unit tests for `src/api/analyticsApi.js` (US 05.2, US 05.1 & US 05.4).
 *
 * `apiClient` is exercised through a stubbed global `fetch` so these assertions
 * cover the exact HTTP contract of `GET /api/v1/admin/analytics/summary`,
 * `GET /api/v1/admin/analytics/heatmap` and `GET /api/v1/admin/analytics/export`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_SUMMARY_ENDPOINT,
  ANALYTICS_TIME_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  EXPORT_ENDPOINT,
  HEATMAP_ENDPOINT,
  exportTelemetryData,
  getAnalyticsSummary,
  getHeatmapData,
} from '../analyticsApi.js';

const ANALYTICS_SUMMARY_PAYLOAD = {
  time_range: 'LAST_7_DAYS',
  generated_at: '2026-10-27T06:30:00',
  kpis: {
    total_visitors: 1240,
    total_audio_plays: 3010,
    top_exhibit_title: 'Ben Duoc Tunnels',
    average_tour_duration_minutes: 42.5,
  },
  top_pois: [{ poi_id: 'poi-1', poi_title: 'Ben Duoc Tunnels', trigger_count: 320 }],
  language_distribution: [
    { language_id: 'vi', language_name: 'Vietnamese', visitor_count: 620, percentage: 50.0 },
  ],
};

const HEATMAP_PAYLOAD = {
  time_range: 'LAST_7_DAYS',
  generated_at: '2026-10-27T06:30:00',
  points: [
    {
      poi_id: 'poi-1',
      poi_title: 'Ben Duoc Tunnels',
      lat: 11.1432,
      lng: 106.4631,
      trigger_count: 320,
      intensity: 1.0,
    },
  ],
  total_points: 1,
  max_trigger_count: 320,
};

function stubJsonResponse(body, { ok = true, status = 200 } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe('analyticsApi.getAnalyticsSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the default LAST_7_DAYS window when no arguments are provided', async () => {
    const fetchMock = stubJsonResponse({ data: ANALYTICS_SUMMARY_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAnalyticsSummary();

    expect(result).toEqual(ANALYTICS_SUMMARY_PAYLOAD);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${ANALYTICS_SUMMARY_ENDPOINT}?range=${DEFAULT_ANALYTICS_RANGE}`,
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('encodes the custom range into the query string when explicitly provided', async () => {
    const fetchMock = stubJsonResponse({ data: ANALYTICS_SUMMARY_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);

    await getAnalyticsSummary({ range: ANALYTICS_TIME_RANGES.TODAY });

    expect(fetchMock).toHaveBeenCalledWith(
      `${ANALYTICS_SUMMARY_ENDPOINT}?range=TODAY`,
      expect.anything()
    );
  });

  it('forwards the caller AbortSignal so pending requests can be cancelled cleanly', async () => {
    const fetchMock = stubJsonResponse({ data: ANALYTICS_SUMMARY_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);
    const abortController = new AbortController();

    await getAnalyticsSummary({ signal: abortController.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('unwraps the data payload when the server encloses it in a success envelope', async () => {
    const envelope = { success: true, data: ANALYTICS_SUMMARY_PAYLOAD };
    const fetchMock = stubJsonResponse(envelope);
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAnalyticsSummary();

    expect(result).toEqual(ANALYTICS_SUMMARY_PAYLOAD);
  });

  it('normalizes a 401 unauthorized response into an ApiError with status and code', async () => {
    const errorBody = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' },
    };
    const fetchMock = stubJsonResponse(errorBody, { ok: false, status: 401 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAnalyticsSummary()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required',
    });
  });

  it('normalizes a 422 validation response when an unsupported range string is supplied', async () => {
    const errorBody = {
      success: false,
      error: { code: 'REQUEST_VALIDATION_ERROR', message: 'Invalid reporting window' },
    };
    const fetchMock = stubJsonResponse(errorBody, { ok: false, status: 422 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAnalyticsSummary({ range: 'NEXT_YEAR' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'REQUEST_VALIDATION_ERROR',
      message: 'Invalid reporting window',
    });
  });
});

describe('analyticsApi.getHeatmapData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the default LAST_7_DAYS window and unwraps the heatmap data envelope', async () => {
    const fetchMock = stubJsonResponse({ data: HEATMAP_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getHeatmapData();

    expect(result).toEqual(HEATMAP_PAYLOAD);
    expect(fetchMock).toHaveBeenCalledWith(
      `${HEATMAP_ENDPOINT}?range=LAST_7_DAYS`,
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('encodes the custom range into the heatmap query string and forwards abort signal', async () => {
    const fetchMock = stubJsonResponse({ data: HEATMAP_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);
    const abortController = new AbortController();

    await getHeatmapData({ range: ANALYTICS_TIME_RANGES.TODAY, signal: abortController.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      `${HEATMAP_ENDPOINT}?range=TODAY`,
      expect.objectContaining({ signal: abortController.signal })
    );
  });
});

describe('analyticsApi.exportTelemetryData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests export with format and range query params', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
      headers: {
        get: (header) =>
          header === 'Content-Disposition'
            ? 'attachment; filename="telemetry_test.csv"'
            : null,
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await exportTelemetryData({ format: 'csv', range: 'LAST_7_DAYS' });

    expect(result.blob).toBe(mockBlob);
    expect(result.filename).toBe('telemetry_test.csv');
    expect(fetchMock).toHaveBeenCalledWith(
      `${EXPORT_ENDPOINT}?format=csv&range=LAST_7_DAYS`,
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('requests export with custom startDate and endDate', async () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
      headers: {
        get: () => 'attachment; filename="telemetry_custom.json"',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await exportTelemetryData({
      format: 'json',
      startDate: '2026-10-01',
      endDate: '2026-10-15',
    });

    expect(result.blob).toBe(mockBlob);
    expect(result.filename).toBe('telemetry_custom.json');
    expect(fetchMock).toHaveBeenCalledWith(
      `${EXPORT_ENDPOINT}?format=json&start_date=2026-10-01&end_date=2026-10-15`,
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });
});
