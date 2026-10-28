// =============================================================================
// ACCOUNT LOCKOUT COUNTDOWN MODAL (US 02.2 - TSK-02.2.3)
// -----------------------------------------------------------------------------
// Catches HTTP 423 Locked response and renders an active real-time countdown
// timer modal that cannot be bypassed via page refresh.
// =============================================================================

import { useEffect, useState } from 'react';

export const LOCKOUT_STORAGE_KEY = 'admin_lockout_until';

/**
 * Format total seconds into MM:SS format.
 * @param {number} totalSeconds
 * @returns {string} formatted string e.g. "14:59"
 */
export function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0 || !Number.isFinite(totalSeconds)) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Account Lockout Countdown Modal
 *
 * @param {object} props
 * @param {boolean} props.isOpen whether modal is displayed
 * @param {number} [props.retryAfterSeconds=900] initial countdown seconds
 * @param {() => void} [props.onUnlock] callback when countdown reaches zero
 * @param {() => void} [props.onClose] callback to close/dismiss modal
 */
export default function AccountLockoutModal({
  isOpen,
  retryAfterSeconds = 900,
  onUnlock,
  onClose,
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    // AC-02.2.3 / TSK-02.2.3: Cannot be bypassed via page refresh using sessionStorage
    let unlockTimestamp;
    try {
      const stored = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (stored) {
        unlockTimestamp = parseInt(stored, 10);
      }
    } catch {
      // Storage access gracefully handled in sandboxed/restricted environments
    }

    if (!unlockTimestamp || Number.isNaN(unlockTimestamp) || unlockTimestamp <= Date.now()) {
      unlockTimestamp = Date.now() + (retryAfterSeconds || 900) * 1000;
      try {
        sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(unlockTimestamp));
      } catch {
        // Storage write handled safely
      }
    }

    const calculateRemaining = () =>
      Math.max(0, Math.ceil((unlockTimestamp - Date.now()) / 1000));

    setSecondsRemaining(calculateRemaining());

    const timerInterval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerInterval);
        try {
          sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
        } catch {
          // Storage removal handled safely
        }
        onUnlock?.();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isOpen, retryAfterSeconds, onUnlock]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lockout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl text-center">
        {/* Security Shield Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h2
          id="lockout-modal-title"
          className="text-lg font-bold text-slate-900"
        >
          Account Temporarily Locked
        </h2>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          Too many consecutive failed login attempts detected (5 attempts limit).
          To protect administrative access from brute-force attacks, this account
          has been temporarily locked for 15 minutes.
        </p>

        {/* Live Countdown Display */}
        <div className="my-5 rounded-lg border border-red-100 bg-red-50/70 p-4">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-red-700">
            Time Remaining Until Unlock
          </span>
          <span
            data-testid="lockout-countdown"
            role="timer"
            aria-live="polite"
            className="mt-1 block font-mono text-3xl font-extrabold tracking-tight text-red-600"
          >
            {formatCountdown(secondsRemaining)}
          </span>
        </div>

        <p className="text-[11px] text-slate-500">
          The sign-in form is locked. Please wait for the timer to expire before retrying.
        </p>

        {onClose && (
          <div className="mt-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dismiss Notice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

