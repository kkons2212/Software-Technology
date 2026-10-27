import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { reportPoiTrigger, TELEMETRY_TRIGGER_ENDPOINT } from '../telemetryApi.js';

describe('telemetryApi.reportPoiTrigger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches POI proximity trigger event to backend and parses response', async () => {
    const mockResponse = {
      trigger_id: 'trig_001',
      session_id: 'sess_123',
      poi_id: 'poi_1',
      dwell_time: 40,
      trigger_at: '2026-10-26T22:50:00Z',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await reportPoiTrigger({
      poiId: 'poi_1',
      sessionId: 'sess_123',
      dwellTime: 40,
      triggerType: 'AUTOMATIC_GEOFENCE',
    });

    expect(result).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      TELEMETRY_TRIGGER_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"PoiID":"poi_1"'),
      })
    );
  });

  it('includes the visitor language in the payload so demographics can be aggregated (US 05.2)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ trigger_id: 'trig_002', session_id: 'sess_456' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await reportPoiTrigger({
      poiId: 'poi_1',
      sessionId: 'sess_456',
      dwellTime: 75,
      preferredLanguage: 'ja',
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody).toMatchObject({
      PoiID: 'poi_1',
      SessionID: 'sess_456',
      DwellTime: 75,
      PreferredLanguage: 'ja',
    });
  });

  it('sends an explicit null language when the visitor language is unknown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ trigger_id: 'trig_003', session_id: 'sess_789' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await reportPoiTrigger({ poiId: 'poi_1' });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.PreferredLanguage).toBeNull();
    expect(requestBody.DwellTime).toBe(0);
  });

  it('handles non-200 HTTP responses gracefully without crashing', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await reportPoiTrigger({
      poiId: 'non_existent_poi',
      sessionId: 'sess_123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 404');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('handles network failure gracefully without interrupting visitor experience', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const fetchMock = vi.fn().mockRejectedValue(new Error('Network offline in tunnel complex'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await reportPoiTrigger({
      poiId: 'poi_1',
      sessionId: 'sess_123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network offline in tunnel complex');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
