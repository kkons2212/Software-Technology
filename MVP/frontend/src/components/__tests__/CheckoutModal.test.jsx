import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../api/paymentApi.js', () => ({
  clearOrderCreatorToken: vi.fn(),
  createCheckoutOrder: vi.fn(),
  getOrderStatus: vi.fn(),
  simulatePaymentSuccess: vi.fn(),
  storeOrderCreatorToken: vi.fn(),
}));

import {
  clearOrderCreatorToken,
  createCheckoutOrder,
  getOrderStatus,
  simulatePaymentSuccess,
  storeOrderCreatorToken,
} from '../../api/paymentApi.js';
import CheckoutModal, { resolveCheckoutOrderError } from '../visitor/CheckoutModal.jsx';

describe('CheckoutModal', () => {
  const mockOrder = {
    order_id: 'cct-order-999',
    creator_token: 'creator-capability-token-12345678901234567890',
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
      expect(storeOrderCreatorToken).toHaveBeenCalledWith(
        'cct-order-999',
        mockOrder.creator_token
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

  it('prioritizes VietQR as first tab and default method when preferredLanguage is Vietnamese', async () => {
    render(<CheckoutModal isOpen={true} preferredLanguage="vi" />);

    await waitFor(() => {
      expect(createCheckoutOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'VIETQR',
          preferredLanguage: 'vi',
        })
      );
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent(/VietQR/i);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveTextContent(/thẻ quốc tế/i);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText(/Sandbox Test Mode \(VietQR\):/i)).toBeInTheDocument();
  });

  it('prioritizes PayPal (CARD) as first tab and default method when preferredLanguage is international', async () => {
    render(<CheckoutModal isOpen={true} preferredLanguage="en" />);

    await waitFor(() => {
      expect(createCheckoutOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'CARD',
          preferredLanguage: 'en',
        })
      );
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent(/Card/i);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveTextContent(/VietQR/i);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText(/Sandbox Test Mode \(PayPal\):/i)).toBeInTheDocument();
  });

  it('allows switching from prioritized PayPal to VietQR for international visitors', async () => {
    render(<CheckoutModal isOpen={true} preferredLanguage="en" />);

    await waitFor(() => {
      expect(createCheckoutOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'CARD',
          preferredLanguage: 'en',
        })
      );
    });

    const vietQrTab = screen.getByRole('tab', { name: /vietqr/i });
    await act(async () => {
      fireEvent.click(vietQrTab);
    });

    expect(vietQrTab).toHaveAttribute('aria-selected', 'true');
    expect(createCheckoutOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'VIETQR',
        preferredLanguage: 'en',
      })
    );
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
    expect(screen.getByText('Thời hạn:')).toBeInTheDocument();
    expect(screen.getByText('24 Giờ')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái:')).toBeInTheDocument();
    expect(screen.getByText(/Đã kích hoạt/)).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'cct-order-999',
        status: 'PAID',
        session_code: 'VN-8888',
      })
    );
    expect(clearOrderCreatorToken).toHaveBeenCalledWith('cct-order-999');
  });

  it('renders localized success view labels when preferredLanguage is Japanese', async () => {
    simulatePaymentSuccess.mockResolvedValueOnce({
      order_id: 'cct-order-ja',
      status: 'PAID',
      session_code: 'CCT-7C9101',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

    render(<CheckoutModal isOpen={true} preferredLanguage="ja" />);

    await waitFor(() => {
      expect(screen.getByTestId('simulate-payment-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('simulate-payment-btn'));
    });

    expect(await screen.findByTestId('checkout-success-view')).toBeInTheDocument();
    expect(screen.getByText('有効化が完了しました！')).toBeInTheDocument();
    expect(screen.getByText('セッションコード:')).toBeInTheDocument();
    expect(screen.getByText('CCT-7C9101')).toBeInTheDocument();
    expect(screen.getByText('有効期間:')).toBeInTheDocument();
    expect(screen.getByText('24時間')).toBeInTheDocument();
    expect(screen.getByText('ステータス:')).toBeInTheDocument();
    expect(screen.getByText(/有効化済み/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '音声ガイドを聞き始める' })).toBeInTheDocument();
  });

  it('renders simulation button when VITE_ENABLE_SIMULATE_PAYMENT is enabled in production mode', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_ENABLE_SIMULATE_PAYMENT', 'true');

    render(<CheckoutModal isOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('simulate-payment-btn')).toBeInTheDocument();
    });

    vi.unstubAllEnvs();
  });

  it('renders success view immediately when initialSuccessData is provided', async () => {
    const successData = {
      order_id: 'cct-order-paypal',
      status: 'PAID',
      session_code: 'CCT-PAYPAL99',
      payment_method: 'PAYPAL',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    render(
      <CheckoutModal
        isOpen={true}
        initialSuccessData={successData}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByTestId('checkout-success-view')).toBeInTheDocument();
    expect(screen.getByText('Kích hoạt thành công!')).toBeInTheDocument();
    expect(screen.getByText('CCT-PAYPAL99')).toBeInTheDocument();
    expect(screen.getByText('PayPal / Card')).toBeInTheDocument();
    expect(screen.getByText('24 Giờ')).toBeInTheDocument();
    expect(screen.getByText(/Đã kích hoạt/)).toBeInTheDocument();
  });
  it('renders multilingual QR loading message matching preferredLanguage', () => {
    // Keep createCheckoutOrder pending so modal remains in loading state
    createCheckoutOrder.mockImplementation(() => new Promise(() => {}));

    // 1. English
    const { unmount: unmountEn } = render(
      <CheckoutModal isOpen={true} preferredLanguage="en" />
    );
    expect(screen.getByText('Initializing secure payment code...')).toBeInTheDocument();
    unmountEn();

    // 2. Japanese
    const { unmount: unmountJa } = render(
      <CheckoutModal isOpen={true} preferredLanguage="ja" />
    );
    expect(screen.getByText('安全な支払いコードを生成中...')).toBeInTheDocument();
    unmountJa();

    // 3. Vietnamese
    const { unmount: unmountVi } = render(
      <CheckoutModal isOpen={true} preferredLanguage="vi" />
    );
    expect(screen.getByText('Đang khởi tạo mã thanh toán an toàn...')).toBeInTheDocument();
    unmountVi();
  });

  it('renders localized QR scan hint and payment method label for international visitors', async () => {
    render(<CheckoutModal isOpen={true} preferredLanguage="en" />);

    // Switch to VietQR tab to inspect QR scan hint
    const vietQrTab = await screen.findByRole('tab', { name: /vietqr/i });
    await act(async () => {
      fireEvent.click(vietQrTab);
    });

    expect(await screen.findByText('Scan with your banking or payment app')).toBeInTheDocument();
  });

  describe('resolveCheckoutOrderError & Multilingual HTTP 429 Handling', () => {
    it('returns checkoutOrderFailed fallback for null error', () => {
      expect(resolveCheckoutOrderError(null, 'vi')).toBe(
        'Không thể tạo đơn thanh toán. Vui lòng thử lại.'
      );
      expect(resolveCheckoutOrderError(undefined, 'en')).toBe(
        'Unable to create payment order. Please try again.'
      );
    });

    it('returns localized rate limit message with dynamic seconds for 429 errors', () => {
      const errEn = {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retry_after_seconds: 50 },
      };
      expect(resolveCheckoutOrderError(errEn, 'en')).toBe(
        'Too many requests. Please try again in 50 seconds.'
      );

      const errVi = {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
      };
      expect(resolveCheckoutOrderError(errVi, 'vi')).toBe(
        'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 60 giây.'
      );
    });

    it('returns localized checkoutOrderFailed for generic errors in French and Japanese', () => {
      const err = new Error('Network timeout');
      expect(resolveCheckoutOrderError(err, 'fr')).toBe(
        'Impossible de créer la commande de paiement. Veuillez réessayer.'
      );
      expect(resolveCheckoutOrderError(err, 'ja')).toBe(
        '決済注文を作成できませんでした。もう一度お試しください。'
      );
    });

    it('displays localized rate limit error when order creation is rate limited', async () => {
      createCheckoutOrder.mockRejectedValueOnce({
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retry_after_seconds: 50 },
      });

      render(<CheckoutModal isOpen={true} preferredLanguage="en" />);

      expect(
        await screen.findByText('Too many requests. Please try again in 50 seconds.')
      ).toBeInTheDocument();
    });

    it('displays localized generic error when order creation fails in French', async () => {
      createCheckoutOrder.mockRejectedValueOnce(new Error('Connection failure'));

      render(<CheckoutModal isOpen={true} preferredLanguage="fr" />);

      expect(
        await screen.findByText('Impossible de créer la commande de paiement. Veuillez réessayer.')
      ).toBeInTheDocument();
    });
  });
});
