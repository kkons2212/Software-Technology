import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VisitorSessionProvider,
  VISITOR_STORAGE_KEYS,
  formatSessionCountdown,
  useVisitorSession,
} from '../VisitorSessionContext.jsx';

function renderSessionHook() {
  return renderHook(() => useVisitorSession(), {
    wrapper: VisitorSessionProvider,
  });
}

describe('VisitorSessionContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('starts locked with empty defaults when localStorage is empty', () => {
    const { result } = renderSessionHook();

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.sessionCode).toBe('');
    expect(result.current.sessionToken).toBe('');
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.formattedCountdown).toBe('0h 00m');
  });

  it('automatically restores unlocked state from localStorage on reload', () => {
    const futureDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.SESSION_CODE, 'CCT-894201');
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.SESSION_TOKEN, 'test_token_abc');
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.EXPIRES_AT, futureDate);

    const { result } = renderSessionHook();

    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.sessionCode).toBe('CCT-894201');
    expect(result.current.sessionToken).toBe('test_token_abc');
    expect(result.current.expiresAt).toBe(futureDate);
    expect(result.current.timeRemaining).toBeGreaterThan(0);
    expect(result.current.formattedCountdown).toBe('12h 00m');
  });

  it('automatically clears expired session from localStorage upon mounting', () => {
    const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.SESSION_CODE, 'CCT-EXPIRED');
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.EXPIRES_AT, pastDate);

    const { result } = renderSessionHook();

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.sessionCode).toBe('');
    expect(window.localStorage.getItem(VISITOR_STORAGE_KEYS.SESSION_CODE)).toBeNull();
  });

  it('activates session and persists to localStorage', () => {
    const { result } = renderSessionHook();
    expect(result.current.isUnlocked).toBe(false);

    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    act(() => {
      result.current.activateSession({
        sessionCode: 'CCT-123456',
        sessionToken: 'token_xyz',
        expiresAt: expiry,
      });
    });

    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.sessionCode).toBe('CCT-123456');
    expect(result.current.sessionToken).toBe('token_xyz');
    expect(result.current.expiresAt).toBe(expiry);
    expect(window.localStorage.getItem(VISITOR_STORAGE_KEYS.SESSION_CODE)).toBe('CCT-123456');
    expect(window.localStorage.getItem(VISITOR_STORAGE_KEYS.SESSION_TOKEN)).toBe('token_xyz');
  });

  it('clears session and removes from localStorage', () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.SESSION_CODE, 'CCT-ACTIVE');
    window.localStorage.setItem(VISITOR_STORAGE_KEYS.EXPIRES_AT, futureDate);

    const { result } = renderSessionHook();
    expect(result.current.isUnlocked).toBe(true);

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.sessionCode).toBe('');
    expect(result.current.sessionToken).toBe('');
    expect(result.current.expiresAt).toBeNull();
    expect(window.localStorage.getItem(VISITOR_STORAGE_KEYS.SESSION_CODE)).toBeNull();
  });

  it('updates countdown timer and auto-expires when timer finishes', () => {
    const expiry = new Date(Date.now() + 2000).toISOString(); // 2 seconds in future
    const { result } = renderSessionHook();

    act(() => {
      result.current.activateSession({
        sessionCode: 'CCT-QUICK',
        sessionToken: 'token_quick',
        expiresAt: expiry,
      });
    });

    expect(result.current.isUnlocked).toBe(true);

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isUnlocked).toBe(true);

    // Advance another 1.5 seconds - session should auto-expire
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.sessionCode).toBe('');
  });

  it('returns safe fallback state if useVisitorSession is used outside provider', () => {
    const { result } = renderHook(() => useVisitorSession());
    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.sessionCode).toBe('');
    expect(result.current.formattedCountdown).toBe('0h 00m');
  });

  it('formats session countdown correctly', () => {
    expect(formatSessionCountdown(0)).toBe('0h 00m');
    expect(formatSessionCountdown(-100)).toBe('0h 00m');
    expect(formatSessionCountdown(60000)).toBe('0h 01m');
    expect(formatSessionCountdown(3600000)).toBe('1h 00m');
    expect(formatSessionCountdown(86400000)).toBe('24h 00m');
  });
});
