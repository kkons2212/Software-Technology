// =============================================================================
// TIER 3 - PAYMENT & DIGITAL CHECKOUT API
// Standardized in dev_rules.md & PaymentSetup.md (US 06.1)
// Handles VietQR & Card checkout order creation, status polling, and simulation.
// =============================================================================

import { apiClient } from './apiClient.js';

const CHECKOUT_CREATE_ENDPOINT = '/api/v1/payments/create-checkout';
const ORDER_STATUS_ENDPOINT = (orderId) => `/api/v1/payments/order/${encodeURIComponent(orderId)}/status`;
const ORDER_SESSION_ENDPOINT = (orderId) => `/api/v1/payments/order/${encodeURIComponent(orderId)}/session`;
const ORDER_SIMULATE_ENDPOINT = (orderId) => `/api/v1/payments/order/${encodeURIComponent(orderId)}/simulate-success`;
const PAYPAL_CAPTURE_ENDPOINT = (orderId) => `/api/v1/payments/order/${encodeURIComponent(orderId)}/paypal-capture`;
const ORDER_CREATOR_TOKEN_PREFIX = 'museum_order_creator_token:';

/**
 * Creates a new checkout order for the 24-hour smart audio guide service.
 * @param {object} params
 * @param {string} [params.paymentMethod='VIETQR'] - 'VIETQR' or 'CARD'
 * @param {string} [params.preferredLanguage='vi']
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Checkout details including order_id and creator_token.
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

export function storeOrderCreatorToken(orderId, creatorToken) {
  if (!orderId || !creatorToken) {
    throw new Error('orderId and creatorToken are required to store checkout access');
  }
  window.sessionStorage.setItem(
    `${ORDER_CREATOR_TOKEN_PREFIX}${orderId}`,
    creatorToken
  );
}

export function getOrderCreatorToken(orderId) {
  if (!orderId) return null;
  return window.sessionStorage.getItem(
    `${ORDER_CREATOR_TOKEN_PREFIX}${orderId}`
  );
}

export function clearOrderCreatorToken(orderId) {
  if (!orderId) return;
  window.sessionStorage.removeItem(`${ORDER_CREATOR_TOKEN_PREFIX}${orderId}`);
}

/**
 * Retrieves the current status of an order.
 * Sub-100ms response time designed for low-latency visitor polling.
 * @param {string} orderId
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Status object without session credentials.
 */
export async function getOrderStatus(orderId, { signal } = {}) {
  if (!orderId) {
    throw new Error('orderId is required to query order status');
  }
  const payload = await apiClient.get(ORDER_STATUS_ENDPOINT(orderId), { signal });
  return payload;
}

/**
 * Exchanges a paid order for session credentials using its creator capability.
 * @param {string} orderId
 * @param {string} creatorToken
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 */
export async function exchangeOrderSession(orderId, creatorToken, { signal } = {}) {
  if (!orderId || !creatorToken) {
    throw new Error('orderId and creatorToken are required to exchange a session');
  }
  return apiClient.post(
    ORDER_SESSION_ENDPOINT(orderId),
    { creator_token: creatorToken },
    { signal }
  );
}

/**
 * Simulates successful payment for testing / sandbox verification.
 * @param {string} orderId
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.preferredLanguage='vi'] - Visitor's selected language code.
 * @returns {Promise<object>} Updated order status with active visitor session
 */
export async function simulatePaymentSuccess(orderId, { signal, preferredLanguage = 'vi' } = {}) {
  if (!orderId) {
    throw new Error('orderId is required to simulate payment');
  }
  const payload = await apiClient.post(
    ORDER_SIMULATE_ENDPOINT(orderId),
    { preferred_language: preferredLanguage },
    { signal }
  );
  return payload;
}

/**
 * Captures a PayPal order after the visitor returns from the provider.
 * @param {string} orderId
 * @param {string} paypalOrderId
 * @param {string} creatorToken
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>} Verified order status with visitor session details
 */
export async function capturePaypalOrder(
  orderId,
  paypalOrderId,
  creatorToken,
  { signal, preferredLanguage = 'vi' } = {}
) {
  if (!orderId || !paypalOrderId || !creatorToken) {
    throw new Error('orderId, paypalOrderId, and creatorToken are required to capture PayPal payment');
  }
  return apiClient.post(
    PAYPAL_CAPTURE_ENDPOINT(orderId),
    {
      paypal_order_id: paypalOrderId,
      creator_token: creatorToken,
      preferred_language: preferredLanguage,
    },
    { signal }
  );
}
