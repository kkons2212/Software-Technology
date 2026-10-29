/**
 * Paired unit tests for `src/api/analyticsApi.js` (US 05.2 & US 05.1).
 *
 * `apiClient` is exercised through a stubbed global `fetch` so these assertions
 * cover the exact HTTP contract of `GET /api/v1/admin/analytics/summary` and
 * `GET /api/v1/admin/analytics/heatmap`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_SUMMARY_ENDPOINT,
  ANALYTICS_TIME_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  HEATMAP_ENDPOINT,
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

  it('requests the default LAST_7_DAYS window and unwraps the data envelope', async () => {
    const fetchMock = stubJsonResponse({ data: ANALYTICS_SUMMARY_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAnalyticsSummary();

    expect(DEFAULT_ANALYTICS_RANGE).toBe(ANALYTICS_TIME_RANGES.LAST_7_DAYS);
    expect(result).toEqual(ANALYTICS_SUMMARY_PAYLOAD);
    expect(fetchMock).toHaveBeenCalledWith(
      `${ANALYTICS_SUMMARY_ENDPOINT}?range=LAST_7_DAYS`,
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it.each(Object.values(ANALYTICS_TIME_RANGES))(
    'encodes the %s reporting window into the summary query string',
    async (range) => {
      const fetchMock = stubJsonResponse({ data: ANALYTICS_SUMMARY_PAYLOAD });
      vi.stubGlobal('fetch', fetchMock);

      await getAnalyticsSummary({ range });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(`${ANALYTICS_SUMMARY_ENDPOINT}?range=${range}`);
    }
  );

  it('forwards the abort signal so superseded dashboard requests can be cancelled', async () => {
    const fetchMock = stubJsonResponse({ data: ANALYTICS_SUMMARY_PAYLOAD });
    vi.stubGlobal('fetch', fetchMock);
    const abortController = new AbortController();

    await getAnalyticsSummary({ signal: abortController.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      `${ANALYTICS_SUMMARY_ENDPOINT}?range=LAST_7_DAYS`,
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('surfaces a rejected admin session as an ApiError carrying the envelope code', async () => {
    const fetchMock = stubJsonResponse(
      { error: { code: 'UNAUTHENTICATED', message: 'Administrator session is required.' } },
      { ok: false, status: 401 }
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAnalyticsSummary()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Administrator session is required.',
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
