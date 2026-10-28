// =============================================================================
// TIER 3 - PAYMENT & DIGITAL CHECKOUT API
// Standardized in dev_rules.md & PaymentSetup.md (US 06.1)
// Handles VietQR & Card checkout order creation, status polling, and simulation.
// =============================================================================

import { apiClient } from './apiClient.js';

const CHECKOUT_CREATE_ENDPOINT = '/api/v1/payments/create-checkout';
const ORDER_STATUS_ENDPOINT = (orderId) => `/api/v1/payments/order/${encodeURIComponent(orderId)}/status`;
const ORDER_SIMULATE_ENDPOINT = (orderId) => `/api/v1/payments/order/${encodeURIComponent(orderId)}/simulate-success`;

/**
 * Creates a new checkout order for the 24-hour smart audio guide service.
 * @param {object} params
 * @param {string} [params.paymentMethod='VIETQR'] - 'VIETQR' or 'CARD'
 * @param {string} [params.preferredLanguage='vi']
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Checkout details including order_id, amount, qr_code_url, etc.
 */
export async function createCheckoutOrder(
  { paymentMethod = 'VIETQR', preferredLanguage = 'vi' } = {},
  { signal } = {}
) {
  const payload = await apiClient.post(
    CHECKOUT_CREATE_ENDPOINT,
    {
      payment_method: paymentMethod,
      preferred_language: preferredLanguage,
    },
    { signal }
  );
  return payload;
}

/**
 * Retrieves the current status of an order.
 * Sub-100ms response time designed for low-latency visitor polling.
 * @param {string} orderId
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Status object containing status, session_code, expires_at, etc.
 */
export async function getOrderStatus(orderId, { signal } = {}) {
  if (!orderId) {
    throw new Error('orderId is required to query order status');
  }
  const payload = await apiClient.get(ORDER_STATUS_ENDPOINT(orderId), { signal });
  return payload;
}

/**
 * Simulates successful payment for testing / sandbox verification.
 * @param {string} orderId
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Updated order status with active visitor session
 */
export async function simulatePaymentSuccess(orderId, { signal } = {}) {
  if (!orderId) {
    throw new Error('orderId is required to simulate payment');
  }
  const payload = await apiClient.post(ORDER_SIMULATE_ENDPOINT(orderId), {}, { signal });
  return payload;
}
