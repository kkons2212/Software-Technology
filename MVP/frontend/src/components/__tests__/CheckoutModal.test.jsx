import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../api/paymentApi.js', () => ({
  createCheckoutOrder: vi.fn(),
  getOrderStatus: vi.fn(),
  simulatePaymentSuccess: vi.fn(),
}));

import {
  createCheckoutOrder,
  getOrderStatus,
  simulatePaymentSuccess,
} from '../../api/paymentApi.js';
import CheckoutModal from '../visitor/CheckoutModal.jsx';

describe('CheckoutModal', () => {
  const mockOrder = {
    order_id: 'cct-order-999',
    status: 'PENDING',
    amount: 50000,
    currency: 'VND',
    payment_method: 'VIETQR',
    bank_name: 'MBBank',
    account_no: '0911223344',
    account_name: 'DIA DAO CU CHI',
    payment_reference: 'CCT 999',
    qr_code_url: 'https://img.vietqr.io/image/970422-0911223344-compact.png',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createCheckoutOrder.mockResolvedValue(mockOrder);
    getOrderStatus.mockResolvedValue({
      order_id: 'cct-order-999',
      status: 'PENDING',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <CheckoutModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with service fee and loads order when isOpen is true', async () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ')).toBeInTheDocument();
    expect(screen.getByText('Gói trải nghiệm 24 giờ không giới hạn')).toBeInTheDocument();
    expect(screen.getByText(/50\.000\s*đ/)).toBeInTheDocument();

    await waitFor(() => {
      expect(createCheckoutOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'VIETQR',
          preferredLanguage: 'vi',
        })
      );
    });

    // Check banking details rendered
    expect(await screen.findByText('0911223344')).toBeInTheDocument();
    expect(screen.getByText('CCT 999')).toBeInTheDocument();
    expect(screen.getByText('MBBank')).toBeInTheDocument();
    expect(screen.getByAltText(/VietQR thanh toán/i)).toBeInTheDocument();
  });

  it('calls onClose when close icon button is clicked', async () => {
    const onClose = vi.fn();
    render(<CheckoutModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /đóng/i })).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /đóng/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(<CheckoutModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('switches between VietQR and Card payment method tabs', async () => {
    render(<CheckoutModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('0911223344')).toBeInTheDocument();
    });

    const cardTab = screen.getByRole('tab', { name: /thẻ quốc tế/i });
    await act(async () => {
      fireEvent.click(cardTab);
    });

    expect(cardTab).toHaveAttribute('aria-selected', 'true');
    expect(
      await screen.findByText('Cổng thanh toán thẻ quốc tế')
    ).toBeInTheDocument();
  });

  it('simulates payment success and transitions to activation success view', async () => {
    const onSuccess = vi.fn();
    simulatePaymentSuccess.mockResolvedValueOnce({
      order_id: 'cct-order-999',
      status: 'PAID',
      session_code: 'VN-8888',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

    render(<CheckoutModal isOpen={true} onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByTestId('simulate-payment-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('simulate-payment-btn'));
    });

    await waitFor(() => {
      expect(simulatePaymentSuccess).toHaveBeenCalledWith('cct-order-999', { preferredLanguage: 'vi' });
    });

    expect(await screen.findByTestId('checkout-success-view')).toBeInTheDocument();
    expect(screen.getByText('Kích hoạt thành công!')).toBeInTheDocument();
    expect(screen.getByText('VN-8888')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'cct-order-999',
        status: 'PAID',
        session_code: 'VN-8888',
      })
    );
  });
});
