/**
 * telemetryApi.js
 * Client Telemetry Ingestion API module for POI triggers and visitor dwell times.
 * Dispatches trigger events to backend POST /api/v1/telemetry/trigger.
 */

// Top-of-file constants
export const TELEMETRY_TRIGGER_ENDPOINT = '/api/v1/telemetry/trigger';

/**
 * Reports a POI geofence trigger event to the backend.
 *
 * @param {Object} payload
 * @param {string | number} payload.poiId
 * @param {string} [payload.sessionId]
 * @param {number} [payload.dwellTime=0]
 * @param {string} [payload.triggerType='AUTOMATIC_GEOFENCE']
 * @returns {Promise<Object>}
 */
export async function reportPoiTrigger({
  poiId,
  sessionId = null,
  dwellTime = 0,
  triggerType = 'AUTOMATIC_GEOFENCE',
}) {
  try {
    const response = await fetch(TELEMETRY_TRIGGER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        PoiID: poiId,
        SessionID: sessionId,
        DwellTime: dwellTime,
        TriggerType: triggerType,
        Timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Telemetry ingestion failed with HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Non-blocking telemetry reporting: log warning without interrupting user audio guide experience
    console.warn('Telemetry trigger reporting error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  reportPoiTrigger,
};
