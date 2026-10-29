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
  getOrderStatus,
  simulatePaymentSuccess,
} from '../paymentApi.js';

describe('paymentApi', () => {
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
        session_code: 'VN-1234',
        session_token: 'secret-token-123',
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
  });
});

