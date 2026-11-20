import { describe, expect, it } from 'vitest';
import { ensureUtcIso } from '../dateUtils.js';

describe('ensureUtcIso (US 06.1 Timezone Normalization)', () => {
  it('returns empty string for null, undefined, or empty values', () => {
    expect(ensureUtcIso(null)).toBe('');
    expect(ensureUtcIso(undefined)).toBe('');
    expect(ensureUtcIso('')).toBe('');
  });

  it('appends Z to naive ISO strings missing timezone information', () => {
    const naive = '2026-11-21T03:47:00';
    expect(ensureUtcIso(naive)).toBe('2026-11-21T03:47:00Z');
  });

  it('preserves ISO strings already ending with Z', () => {
    const utc = '2026-11-21T03:47:00Z';
    expect(ensureUtcIso(utc)).toBe('2026-11-21T03:47:00Z');
  });

  it('preserves ISO strings with explicit offset', () => {
    const withOffset = '2026-11-21T10:47:00+07:00';
    expect(ensureUtcIso(withOffset)).toBe('2026-11-21T10:47:00+07:00');
  });

  it('converts Date instance to ISO string', () => {
    const d = new Date('2026-11-21T03:47:00.000Z');
    expect(ensureUtcIso(d)).toBe('2026-11-21T03:47:00.000Z');
  });

  it('evaluates to 24h difference when server returns naive utcnow + 24h', () => {
    const now = Date.now();
    const serverNaive = new Date(now + 24 * 3600 * 1000).toISOString().replace('Z', '');
    const normalized = ensureUtcIso(serverNaive);
    const diffHours = (new Date(normalized).getTime() - now) / (3600 * 1000);
    expect(Math.round(diffHours)).toBe(24);
  });
});
