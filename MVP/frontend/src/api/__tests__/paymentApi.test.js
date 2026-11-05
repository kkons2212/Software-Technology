import { describe, expect, it, vi } from 'vitest';

vi.mock('../apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '../apiClient.js';
import {
  createCheckoutOrder,
  capturePaypalOrder,
  exchangeOrderSession,
  clearOrderCreatorToken,
  getOrderStatus,
  getOrderCreatorToken,
  simulatePaymentSuccess,
  storeOrderCreatorToken,
} from '../paymentApi.js';

describe('paymentApi', () => {
  describe('order creator capability storage', () => {
    it('stores, reads, and removes the capability from sessionStorage', () => {
      storeOrderCreatorToken('order-1', 'private-capability');

      expect(getOrderCreatorToken('order-1')).toBe('private-capability');

      clearOrderCreatorToken('order-1');
      expect(getOrderCreatorToken('order-1')).toBeNull();
    });
  });

  describe('createCheckoutOrder', () => {
    it('creates checkout order with default options', async () => {
      const mockResponse = {
        order_id: 'cct-order-123',
        status: 'PENDING',
        amount: 50000,
        currency: 'VND',
        qr_code_url: 'https://img.vietqr.io/image/970422-0911223344-compact.png',
      };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await createCheckoutOrder();
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/payments/create-checkout',
        {
          payment_method: 'VIETQR',
          preferred_language: 'vi',
        },
        { signal: undefined }
      );
      expect(result).toEqual(mockResponse);
    });

    it('creates checkout order with custom parameters and signal', async () => {
      const controller = new AbortController();
      const mockResponse = {
        order_id: 'cct-order-456',
        status: 'PENDING',
        amount: 50000,
        currency: 'VND',
      };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await createCheckoutOrder(
        { paymentMethod: 'CARD', preferredLanguage: 'en' },
        { signal: controller.signal }
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/payments/create-checkout',
        {
          payment_method: 'CARD',
          preferred_language: 'en',
        },
        { signal: controller.signal }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getOrderStatus', () => {
    it('retrieves order status by orderId', async () => {
      const mockStatus = {
        order_id: 'cct-order-123',
        status: 'PAID',
      };
      apiClient.get.mockResolvedValueOnce(mockStatus);

      const result = await getOrderStatus('cct-order-123');
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/payments/order/cct-order-123/status',
        { signal: undefined }
      );
      expect(result).toEqual(mockStatus);
    });

    it('throws error if orderId is missing', async () => {
      await expect(getOrderStatus('')).rejects.toThrow('orderId is required');
      await expect(getOrderStatus(null)).rejects.toThrow('orderId is required');
    });

    describe('exchangeOrderSession', () => {
      it('sends the creator capability in the request body', async () => {
        const mockResponse = { order_id: 'cct-order-123', status: 'PAID' };
        apiClient.post.mockResolvedValueOnce(mockResponse);

        const result = await exchangeOrderSession('cct-order-123', 'creator-capability');

        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/payments/order/cct-order-123/session',
          { creator_token: 'creator-capability' },
          { signal: undefined }
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('simulatePaymentSuccess', () => {
    it('posts simulation with default vi language in body', async () => {
      const mockResponse = {
        order_id: 'cct-order-123',
        status: 'PAID',
        session_code: 'VN-1234',
      };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await simulatePaymentSuccess('cct-order-123');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/payments/order/cct-order-123/simulate-success',
        { preferred_language: 'vi' },
        { signal: undefined }
      );
      expect(result).toEqual(mockResponse);
    });

    it('forwards preferredLanguage to request body', async () => {
      const mockResponse = {
        order_id: 'cct-order-456',
        status: 'PAID',
        session_code: 'EN-5678',
      };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await simulatePaymentSuccess('cct-order-456', { preferredLanguage: 'en' });
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/payments/order/cct-order-456/simulate-success',
        { preferred_language: 'en' },
        { signal: undefined }
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error if orderId is missing', async () => {
      await expect(simulatePaymentSuccess('')).rejects.toThrow('orderId is required');
    });

    describe('capturePaypalOrder', () => {
      it('captures the returned PayPal order for the checkout', async () => {
        const mockResponse = { order_id: 'cct-order-789', status: 'PAID' };
        apiClient.post.mockResolvedValueOnce(mockResponse);

        const result = await capturePaypalOrder(
          'cct order/789',
          'paypal-order-1',
          'creator-capability'
        );

        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/payments/order/cct%20order%2F789/paypal-capture',
          {
            paypal_order_id: 'paypal-order-1',
            creator_token: 'creator-capability',
            preferred_language: 'vi',
          },
          { signal: undefined }
        );
        expect(result).toEqual(mockResponse);
      });

      it('requires both checkout and PayPal order identifiers', async () => {
        await expect(capturePaypalOrder('', 'paypal-order-1', 'capability')).rejects.toThrow(
          'orderId, paypalOrderId, and creatorToken are required'
        );
        await expect(capturePaypalOrder('order-1', 'paypal-order-1', '')).rejects.toThrow(
          'orderId, paypalOrderId, and creatorToken are required'
        );
      });
    });
  });
});
