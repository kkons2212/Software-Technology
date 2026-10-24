import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isCooldownActive,
  setCooldown,
  getRemainingCooldownSeconds,
  clearCooldown,
  clearAllCooldowns,
  COOLDOWN_KEY_PREFIX,
  DEFAULT_COOLDOWN_DURATION_MS,
} from '../cooldownService.js';

describe('cooldownService (US 01.3.2 10-Minute Lockout)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns false when no cooldown has been recorded', () => {
    expect(isCooldownActive(1)).toBe(false);
    expect(isCooldownActive('poi-101')).toBe(false);
  });

  it('returns false for invalid or empty poiId', () => {
    expect(isCooldownActive(null)).toBe(false);
    expect(isCooldownActive(undefined)).toBe(false);
    expect(isCooldownActive('')).toBe(false);
  });

  it('records cooldown and returns true while within 600s window', () => {
    const poiId = 'poi-1';
    const now = Date.now();
    setCooldown(poiId, now);

    expect(localStorage.getItem(`${COOLDOWN_KEY_PREFIX}${poiId}`)).toBe(String(now));
    expect(isCooldownActive(poiId)).toBe(true);
  });

  it('returns false when cooldown has expired (> 600s)', () => {
    const poiId = 'poi-2';
    const pastTime = Date.now() - (DEFAULT_COOLDOWN_DURATION_MS + 1000);
    setCooldown(poiId, pastTime);

    expect(isCooldownActive(poiId)).toBe(false);
  });

  it('calculates remaining cooldown seconds accurately', () => {
    const poiId = 'poi-3';
    const now = Date.now();
    // 300 seconds elapsed out of 600 seconds
    const halfPastTime = now - 300 * 1000;
    setCooldown(poiId, halfPastTime);

    const remaining = getRemainingCooldownSeconds(poiId);
    expect(remaining).toBeGreaterThanOrEqual(299);
    expect(remaining).toBeLessThanOrEqual(301);
  });

  it('returns 0 remaining seconds when cooldown is expired or not found', () => {
    expect(getRemainingCooldownSeconds('non-existent')).toBe(0);

    const poiId = 'poi-expired';
    setCooldown(poiId, Date.now() - 700 * 1000);
    expect(getRemainingCooldownSeconds(poiId)).toBe(0);
  });

  it('clears specific POI cooldown from storage', () => {
    setCooldown('poi-A');
    setCooldown('poi-B');

    clearCooldown('poi-A');

    expect(isCooldownActive('poi-A')).toBe(false);
    expect(isCooldownActive('poi-B')).toBe(true);
  });

  it('clears all POI cooldowns without affecting unrelated keys', () => {
    setCooldown('poi-1');
    setCooldown('poi-2');
    localStorage.setItem('user_token', 'secret123');

    clearAllCooldowns();

    expect(isCooldownActive('poi-1')).toBe(false);
    expect(isCooldownActive('poi-2')).toBe(false);
    expect(localStorage.getItem('user_token')).toBe('secret123');
  });

  it('handles invalid non-numeric storage values gracefully', () => {
    localStorage.setItem(`${COOLDOWN_KEY_PREFIX}invalid`, 'not-a-number');
    expect(isCooldownActive('invalid')).toBe(false);
    expect(getRemainingCooldownSeconds('invalid')).toBe(0);
  });
});
