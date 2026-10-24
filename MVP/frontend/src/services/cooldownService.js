/**
 * cooldownService.js
 * 10-Minute Cooldown Trigger Lock Mechanism (Debounce) for POI auto-narration.
 * Prevents repeated trigger popups while a visitor lingers within a geofence zone.
 */

// Top-of-file module constants
export const COOLDOWN_KEY_PREFIX = 'poi_cooldown_';
export const DEFAULT_COOLDOWN_DURATION_MS = 600 * 1000; // 600 seconds = 10 minutes

/**
 * Safely accesses browser localStorage.
 * @returns {Storage | null}
 */
function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Checks whether the 10-minute cooldown lockout is currently active for a POI.
 * @param {string | number} poiId
 * @param {number} durationMs - Optional override duration in milliseconds
 * @returns {boolean} True if cooldown is still active, false otherwise.
 */
export function isCooldownActive(poiId, durationMs = DEFAULT_COOLDOWN_DURATION_MS) {
  if (!poiId) return false;
  const storage = getStorage();
  if (!storage) return false;

  try {
    const rawValue = storage.getItem(`${COOLDOWN_KEY_PREFIX}${poiId}`);
    if (!rawValue) return false;

    const lastTriggeredAt = parseInt(rawValue, 10);
    if (Number.isNaN(lastTriggeredAt)) return false;

    const elapsed = Date.now() - lastTriggeredAt;
    return elapsed >= 0 && elapsed < durationMs;
  } catch (error) {
    console.warn('Error reading POI cooldown from storage:', error);
    return false;
  }
}

/**
 * Sets or updates the cooldown timestamp for a POI.
 * @param {string | number} poiId
 * @param {number} timestamp - Epoch timestamp in milliseconds (defaults to Date.now())
 */
export function setCooldown(poiId, timestamp = Date.now()) {
  if (!poiId) return;
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(`${COOLDOWN_KEY_PREFIX}${poiId}`, String(timestamp));
  } catch (error) {
    console.warn('Error setting POI cooldown in storage:', error);
  }
}

/**
 * Returns remaining cooldown duration in seconds.
 * @param {string | number} poiId
 * @param {number} durationMs - Cooldown duration in milliseconds
 * @returns {number} Remaining seconds (0 if expired or not set)
 */
export function getRemainingCooldownSeconds(poiId, durationMs = DEFAULT_COOLDOWN_DURATION_MS) {
  if (!poiId) return 0;
  const storage = getStorage();
  if (!storage) return 0;

  try {
    const rawValue = storage.getItem(`${COOLDOWN_KEY_PREFIX}${poiId}`);
    if (!rawValue) return 0;

    const lastTriggeredAt = parseInt(rawValue, 10);
    if (Number.isNaN(lastTriggeredAt)) return 0;

    const remainingMs = durationMs - (Date.now() - lastTriggeredAt);
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  } catch (error) {
    console.warn('Error getting remaining cooldown seconds:', error);
    return 0;
  }
}

/**
 * Clears the cooldown for a specific POI.
 * @param {string | number} poiId
 */
export function clearCooldown(poiId) {
  if (!poiId) return;
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(`${COOLDOWN_KEY_PREFIX}${poiId}`);
  } catch (error) {
    console.warn('Error clearing POI cooldown:', error);
  }
}

/**
 * Clears all active POI cooldowns from storage.
 */
export function clearAllCooldowns() {
  const storage = getStorage();
  if (!storage) return;

  try {
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(COOLDOWN_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn('Error clearing all POI cooldowns:', error);
  }
}
