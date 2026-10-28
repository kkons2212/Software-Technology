// =============================================================================
// TIER 2 - ADMIN INACTIVITY IDLE TIMER
// Watches real user activity and reports when the Administrator has been idle
// long enough for the session to be terminated (US 02.3 - TSK-02.3.2).
// =============================================================================

import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT_MINUTES = 30;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

// Every notification below is a signal that the human is still at the
// workstation. `mousemove`/`keydown` cover the shared-terminal case where the
// Administrator never leaves a form, while `visibilitychange` re-arms the timer
// the moment a backgrounded tab is brought back to the foreground.
const IDLE_ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
  'visibilitychange',
];

// PERF-CRITICAL: browsers throttle background timers to roughly one tick per
// minute, so the hook never trusts "one timeout fired" as proof of idleness.
// It re-reads the wall clock on a coarse poll instead, which is why the timer
// still expires correctly in a background tab (TSK-02.3.2 DoD).
const IDLE_TIMER_POLL_MS = 15000;

/**
 * Report idle expiry after `timeoutMs` without user activity.
 *
 * @param {object} options
 * @param {number} [options.timeoutMs] inactivity budget in milliseconds
 * @param {() => void} [options.onIdle] invoked once per idle period
 * @param {boolean} [options.isEnabled] arms the timer only for a live session
 * @returns {void}
 */
export default function useIdleTimer({
  timeoutMs = IDLE_TIMEOUT_MS,
  onIdle,
  isEnabled = true,
} = {}) {
  // The callback is held in a ref so a new inline lambda from the provider does
  // not tear down and re-register every listener on each render.
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    let lastActivityAtMs = Date.now();
    let hasExpired = false;

    function markActivity() {
      lastActivityAtMs = Date.now();
    }

    function checkIdleDeadline() {
      if (hasExpired) {
        return;
      }
      if (Date.now() - lastActivityAtMs >= timeoutMs) {
        // Guarded so a throttled poll cannot fire the logout twice in a row.
        hasExpired = true;
        onIdleRef.current?.();
      }
    }

    IDLE_ACTIVITY_EVENTS.forEach((activityEvent) => {
      window.addEventListener(activityEvent, markActivity);
    });

    const pollHandle = window.setInterval(checkIdleDeadline, IDLE_TIMER_POLL_MS);

    return () => {
      IDLE_ACTIVITY_EVENTS.forEach((activityEvent) => {
        window.removeEventListener(activityEvent, markActivity);
      });
      window.clearInterval(pollHandle);
    };
  }, [isEnabled, timeoutMs]);
}

export { IDLE_TIMEOUT_MINUTES, IDLE_TIMEOUT_MS, IDLE_ACTIVITY_EVENTS, IDLE_TIMER_POLL_MS };
