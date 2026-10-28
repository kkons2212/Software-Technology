// =============================================================================
// TIER 2 - PAYMENT POLLING HOOK
// Standardized in dev_rules.md & PaymentSetup.md (US 06.1)
// Handles automatic background polling (2.5s interval) of order status.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrderStatus } from '../api/paymentApi.js';

const DEFAULT_POLL_INTERVAL_MS = 2500;

/**
 * Custom React hook for polling payment order status until completion.
 * Automatically halts upon reaching terminal statuses (PAID, EXPIRED, CANCELLED)
 * or when the modal closes / component unmounts.
 *
 * @param {object} options
 * @param {string|null} options.orderId - The order ID to poll
 * @param {boolean} options.isOpen - Whether the checkout modal is currently active
 * @param {function} [options.onPaymentSuccess] - Callback executed when status reaches 'PAID'
 * @param {function} [options.onError] - Callback executed upon persistent polling error
 * @param {number} [options.pollIntervalMs=2500] - Interval between checks in ms
 */
export function usePaymentPolling({
  orderId,
  isOpen = false,
  onPaymentSuccess,
  onError,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
} = {}) {
  const [status, setStatus] = useState('IDLE');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);
  const onSuccessRef = useRef(onPaymentSuccess);
  const onErrorRef = useRef(onError);

  // Keep callback refs synchronized without triggering effect re-runs
  useEffect(() => {
    onSuccessRef.current = onPaymentSuccess;
  }, [onPaymentSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const pollOnce = useCallback(async () => {
    if (!orderId || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      const data = await getOrderStatus(orderId, {
        signal: abortControllerRef.current.signal,
      });

      if (!isMountedRef.current) return;

      setOrderData(data);
      setStatus(data.status);
      setError(null);

      if (data.status === 'PAID') {
        setIsPolling(false);
        onSuccessRef.current?.(data);
      }
    } catch (err) {
      if (err.name === 'AbortError' || !isMountedRef.current) {
        return;
      }
      const message = err.message || 'Unable to verify payment status';
      setError(message);
      onErrorRef.current?.(err);
    } finally {
      inFlightRef.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isOpen || !orderId || status === 'PAID') {
      setIsPolling(false);
      return undefined;
    }

    setIsPolling(true);
    setStatus('PENDING');

    // Run first poll check immediately
    pollOnce();

    const intervalId = window.setInterval(() => {
      pollOnce();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      abortControllerRef.current?.abort();
      setIsPolling(false);
    };
  }, [isOpen, orderId, pollIntervalMs, pollOnce, status]);

  // Reset when orderId changes or modal opens fresh
  useEffect(() => {
    if (orderId && isOpen) {
      setStatus('PENDING');
      setError(null);
      setOrderData(null);
    } else if (!isOpen) {
      setStatus('IDLE');
      setError(null);
      setOrderData(null);
    }
  }, [isOpen, orderId]);

  return {
    status,
    isPolling,
    error,
    orderData,
    pollOnce,
  };
}

