import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

vi.mock('../../api/paymentApi.js', () => ({
  getOrderStatus: vi.fn(),
}));

import { getOrderStatus } from '../../api/paymentApi.js';
import { usePaymentPolling } from '../usePaymentPolling.js';

describe('usePaymentPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('stays IDLE when isOpen is false or orderId is missing', () => {
    const { result } = renderHook(() =>
      usePaymentPolling({
        orderId: null,
        isOpen: false,
      })
    );

    expect(result.current.status).toBe('IDLE');
    expect(result.current.isPolling).toBe(false);
    expect(getOrderStatus).not.toHaveBeenCalled();
  });

  it('initiates polling and calls getOrderStatus when modal opens with orderId', async () => {
    getOrderStatus.mockResolvedValue({
      order_id: 'order-1',
      status: 'PENDING',
    });

    const { result } = renderHook(() =>
      usePaymentPolling({
        orderId: 'order-1',
        isOpen: true,
        pollIntervalMs: 2500,
      })
    );

    expect(result.current.status).toBe('PENDING');
    expect(result.current.isPolling).toBe(true);

    // Initial immediate poll
    await act(async () => {
      await Promise.resolve();
    });

    expect(getOrderStatus).toHaveBeenCalledWith('order-1', {
      signal: expect.any(AbortSignal),
    });

    // Advance 2500ms
    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(getOrderStatus).toHaveBeenCalledTimes(2);
  });

  it('calls onPaymentSuccess and stops polling when order reaches PAID', async () => {
    const onPaymentSuccess = vi.fn();
    getOrderStatus
      .mockResolvedValueOnce({
        order_id: 'order-1',
        status: 'PENDING',
      })
      .mockResolvedValueOnce({
        order_id: 'order-1',
        status: 'PAID',
        session_code: 'VN-1234',
        session_token: 'secret-token',
      });

    const { result } = renderHook(() =>
      usePaymentPolling({
        orderId: 'order-1',
        isOpen: true,
        onPaymentSuccess,
        pollIntervalMs: 2500,
      })
    );

    // First call: PENDING
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('PENDING');
    expect(onPaymentSuccess).not.toHaveBeenCalled();

    // Second call: PAID
    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(result.current.status).toBe('PAID');
    expect(result.current.isPolling).toBe(false);
    expect(onPaymentSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'order-1',
        status: 'PAID',
        session_code: 'VN-1234',
      })
    );
  });

  it('cleans up interval timer when unmounted', async () => {
    getOrderStatus.mockResolvedValue({
      order_id: 'order-1',
      status: 'PENDING',
    });

    const { unmount } = renderHook(() =>
      usePaymentPolling({
        orderId: 'order-1',
        isOpen: true,
        pollIntervalMs: 2500,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getOrderStatus).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    // No further calls should happen after unmount
    expect(getOrderStatus).toHaveBeenCalledTimes(1);
  });
});
