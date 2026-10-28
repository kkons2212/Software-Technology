import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AccountLockoutModal, {
  LOCKOUT_STORAGE_KEY,
  formatCountdown,
} from '../admin/AccountLockoutModal.jsx';

describe('formatCountdown', () => {
  it('formats seconds into MM:SS correctly', () => {
    expect(formatCountdown(900)).toBe('15:00');
    expect(formatCountdown(899)).toBe('14:59');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(9)).toBe('00:09');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});

describe('AccountLockoutModal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AccountLockoutModal isOpen={false} retryAfterSeconds={900} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders lockout dialog with 15-minute countdown and security warning when isOpen is true', () => {
    render(
      <AccountLockoutModal isOpen={true} retryAfterSeconds={900} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /account temporarily locked/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('15:00');
    expect(screen.getByText(/5 attempts limit/i)).toBeInTheDocument();
  });

  it('counts down live every 1-second interval', () => {
    render(
      <AccountLockoutModal isOpen={true} retryAfterSeconds={60} />
    );

    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('01:00');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('00:59');

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('00:49');
  });

  it('triggers onUnlock callback when countdown reaches zero', () => {
    const onUnlock = vi.fn();
    render(
      <AccountLockoutModal isOpen={true} retryAfterSeconds={2} onUnlock={onUnlock} />
    );

    expect(onUnlock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('00:00');
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(LOCKOUT_STORAGE_KEY)).toBeNull();
  });

  it('stores and restores lockout timestamp in sessionStorage to prevent refresh bypass', () => {
    const initialSeconds = 300;
    const { unmount } = render(
      <AccountLockoutModal isOpen={true} retryAfterSeconds={initialSeconds} />
    );

    const storedTimestamp = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
    expect(storedTimestamp).toBeTruthy();

    // Advance 50 seconds
    act(() => {
      vi.advanceTimersByTime(50000);
    });
    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('04:10');

    // Simulate page refresh: unmount and remount
    unmount();

    render(
      <AccountLockoutModal isOpen={true} retryAfterSeconds={initialSeconds} />
    );

    // Should resume around 250s (04:10) rather than resetting to 300s (05:00)
    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('04:10');
  });

  it('invokes onClose when dismiss button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <AccountLockoutModal
        isOpen={true}
        retryAfterSeconds={60}
        onClose={onClose}
      />
    );

    const dismissBtn = screen.getByRole('button', { name: /dismiss notice/i });
    await user.click(dismissBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

