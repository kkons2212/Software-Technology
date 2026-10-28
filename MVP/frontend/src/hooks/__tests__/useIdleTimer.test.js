import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useIdleTimer, {
  IDLE_TIMEOUT_MINUTES,
  IDLE_TIMEOUT_MS,
  IDLE_TIMER_POLL_MS,
} from '../useIdleTimer.js';

// A deliberately short budget keeps every assertion deterministic; the poll is
// the real production cadence so the boundary maths stays honest.
const SHORT_TIMEOUT_MS = 30000;

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useIdleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exposes the 30-minute inactivity budget required by AC-02.3.2', () => {
    expect(IDLE_TIMEOUT_MINUTES).toBe(30);
    expect(IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  it('reports idleness once the inactivity budget elapses', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle }));

    advance(SHORT_TIMEOUT_MS - IDLE_TIMER_POLL_MS);
    expect(onIdle).not.toHaveBeenCalled();

    advance(IDLE_TIMER_POLL_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('restarts the countdown whenever the administrator is active', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle }));

    advance(IDLE_TIMER_POLL_MS);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    advance(IDLE_TIMER_POLL_MS);
    expect(onIdle).not.toHaveBeenCalled();

    advance(IDLE_TIMER_POLL_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('treats keyboard input as activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle }));

    advance(SHORT_TIMEOUT_MS - IDLE_TIMER_POLL_MS);
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    advance(SHORT_TIMEOUT_MS - IDLE_TIMER_POLL_MS);

    expect(onIdle).not.toHaveBeenCalled();
  });

  it('expires while the browser tab is backgrounded thanks to the wall-clock poll', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle }));

    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
    advance(IDLE_TIMER_POLL_MS * 2);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('reports the expiry only once per idle period', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle }));

    advance(SHORT_TIMEOUT_MS * 10);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('stays dormant until the timer is enabled and then arms itself', () => {
    const onIdle = vi.fn();
    const { rerender } = renderHook(
      ({ isEnabled }) => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle, isEnabled }),
      { initialProps: { isEnabled: false } },
    );

    advance(SHORT_TIMEOUT_MS * 3);
    expect(onIdle).not.toHaveBeenCalled();

    rerender({ isEnabled: true });
    advance(SHORT_TIMEOUT_MS + IDLE_TIMER_POLL_MS);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('removes its listeners and interval on unmount', () => {
    const onIdle = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS, onIdle }));

    unmount();
    advance(SHORT_TIMEOUT_MS * 3);

    expect(onIdle).not.toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('stays safe when no onIdle callback is supplied', () => {
    renderHook(() => useIdleTimer({ timeoutMs: SHORT_TIMEOUT_MS }));

    expect(() => advance(SHORT_TIMEOUT_MS * 2)).not.toThrow();
  });
});
