// =============================================================================
// TIER 1 - DIGITAL ADMISSION CHECKOUT MODAL (US 06.1)
// Standardized in dev_rules.md & PaymentSetup.md
// Frictionless checkout for 24-hour smart audio guide service via VietQR & Cards.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { createCheckoutOrder, simulatePaymentSuccess } from '../../api/paymentApi.js';
import { usePaymentPolling } from '../../hooks/usePaymentPolling.js';

const SERVICE_TITLE = 'Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ';
const SERVICE_SUBTITLE = 'Gói trải nghiệm 24 giờ không giới hạn';
const DEFAULT_FEE_VND = 50000;

export default function CheckoutModal({
  isOpen = false,
  onClose,
  onSuccess,
  preferredLanguage = 'vi',
}) {
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const [order, setOrder] = useState(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);

  const handlePaymentSuccess = useCallback(
    (paidData) => {
      setIsPaidSuccess(true);
      setCompletedSession(paidData);
      onSuccess?.(paidData);
    },
    [onSuccess]
  );

  const { status: orderStatus, isPolling } = usePaymentPolling({
    orderId: order?.order_id ?? null,
    isOpen: isOpen && !isPaidSuccess,
    onPaymentSuccess: handlePaymentSuccess,
  });

  const fetchOrder = useCallback(
    async (method) => {
      setIsLoadingOrder(true);
      setOrderError(null);
      try {
        const orderData = await createCheckoutOrder({
          paymentMethod: method,
          preferredLanguage,
        });
        setOrder(orderData);
      } catch (err) {
        setOrderError(
          err.message || 'Không thể tạo đơn thanh toán. Vui lòng thử lại.'
        );
      } finally {
        setIsLoadingOrder(false);
      }
    },
    [preferredLanguage]
  );

  useEffect(() => {
    if (isOpen) {
      setIsPaidSuccess(false);
      setCompletedSession(null);
      fetchOrder(paymentMethod);
    } else {
      setOrder(null);
      setOrderError(null);
      setIsPaidSuccess(false);
    }
  }, [fetchOrder, isOpen, paymentMethod]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = (field, text) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Graceful fallback for environments without clipboard permissions
    }
  };

  const handleSimulate = async () => {
    if (!order?.order_id || isSimulating) return;
    setIsSimulating(true);
    try {
      const res = await simulatePaymentSuccess(order.order_id);
      if (res?.status === 'PAID') {
        handlePaymentSuccess(res);
      }
    } catch {
      // Error handled by status polling
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const formattedAmount = (order?.amount ?? DEFAULT_FEE_VND).toLocaleString('vi-VN');

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ thanh toán"
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {isPaidSuccess ? (
          /* SUCCESS STATE */
          <div className="py-6 text-center animate-fadeIn" data-testid="checkout-success-view">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Kích hoạt thành công!
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Gói thuyết minh âm thanh 24 giờ của bạn đã sẵn sàng.
            </p>

            <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left">
              <div className="flex justify-between items-center text-sm py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-medium">Mã phiên:</span>
                <span className="font-bold text-emerald-800 tracking-wider font-mono">
                  {completedSession?.session_code || 'PASS-ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-medium">Thời hạn:</span>
                <span className="text-emerald-800 font-semibold">24 Giờ</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-600 font-medium">Trạng thái:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck size={16} /> Đã kích hoạt
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
            >
              Bắt đầu trải nghiệm ngay
            </button>
          </div>
        ) : (
          /* CHECKOUT VIEW */
          <div>
            {/* Header */}
            <div className="pr-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 mb-2">
                <Sparkles size={13} aria-hidden="true" />
                <span>24h Tour Pass</span>
              </div>
              <h2
                id="checkout-modal-title"
                className="text-lg font-bold text-slate-900 leading-snug"
              >
                {SERVICE_TITLE}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{SERVICE_SUBTITLE}</p>
            </div>

            {/* Fee badge */}
            <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-100">
              <span className="text-xs font-medium text-slate-600">Phí dịch vụ 24h:</span>
              <div className="text-right">
                <span className="text-xl font-extrabold text-emerald-700">
                  {formattedAmount} đ
                </span>
                <span className="text-[11px] text-slate-400 block">/ thiết bị</span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'VIETQR'}
                onClick={() => setPaymentMethod('VIETQR')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  paymentMethod === 'VIETQR'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode size={16} aria-hidden="true" />
                <span>VietQR Napas247</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'CARD'}
                onClick={() => setPaymentMethod('CARD')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard size={16} aria-hidden="true" />
                <span>Thẻ quốc tế</span>
              </button>
            </div>

            {/* Main Content Area */}
            {isLoadingOrder ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 size={32} className="mx-auto animate-spin text-emerald-600" />
                <p className="mt-2 text-xs">Đang khởi tạo mã thanh toán an toàn...</p>
              </div>
            ) : orderError ? (
              <div className="my-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-xs text-red-700">{orderError}</p>
                <button
                  type="button"
                  onClick={() => fetchOrder(paymentMethod)}
                  className="mt-3 inline-block rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Thử lại
                </button>
              </div>
            ) : paymentMethod === 'VIETQR' ? (
              /* VIETQR VIEW */
              <div className="mt-4">
                {/* QR Code Container */}
                <div className="mx-auto flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-inner max-w-[220px]">
                  {order?.qr_code_url ? (
                    <img
                      src={order.qr_code_url}
                      alt="VietQR thanh toán dịch vụ thuyết minh âm thanh"
                      className="w-full h-auto aspect-square rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-44 w-44 items-center justify-center bg-slate-100 text-slate-400">
                      <QrCode size={48} />
                    </div>
                  )}
                  <span className="mt-1 text-[11px] text-slate-500 text-center font-medium">
                    Quét qua ứng dụng Ngân hàng
                  </span>
                </div>

                {/* Transfer Details Card */}
                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Ngân hàng:</span>
                    <span className="font-semibold text-slate-800">
                      {order?.bank_name || 'MBBank'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900">
                        {order?.account_no || '0911223344'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('account', order?.account_no || '0911223344')}
                        aria-label="Sao chép số tài khoản"
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
                      >
                        {copiedField === 'account' ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                      {order?.account_name || 'DIA DAO CU CHI'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Nội dung:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-800">
                        {order?.payment_reference || order?.order_id || 'CCT PASS'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('reference', order?.payment_reference || order?.order_id)
                        }
                        aria-label="Sao chép nội dung chuyển khoản"
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
                      >
                        {copiedField === 'reference' ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Polling Indicator */}
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-50/70 py-2 px-3 text-[11px] text-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  <span>
                    {isPolling || orderStatus === 'PENDING'
                      ? 'Đang chờ hệ thống xác nhận chuyển khoản tự động...'
                      : 'Đang kiểm tra trạng thái thanh toán...'}
                  </span>
                </div>
              </div>
            ) : (
              /* CARD VIEW */
              <div className="mt-6 py-4 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <CreditCard size={28} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Cổng thanh toán thẻ quốc tế
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Hỗ trợ Visa, Mastercard, JCB qua chuẩn mã hoá bảo mật Stripe.
                </p>

                {order?.checkout_url ? (
                  <a
                    href={order.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 px-4 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition"
                  >
                    Tiếp tục thanh toán qua Stripe ({formattedAmount} đ)
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleSimulate}
                    className="mt-5 w-full rounded-xl bg-blue-600 py-3 px-4 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition"
                  >
                    Thanh toán thẻ thử nghiệm ({formattedAmount} đ)
                  </button>
                )}
              </div>
            )}

            {/* Sandbox Simulation Bar (Dev & Test Convenience) */}
            {order && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Sandbox Test Mode:</span>
                <button
                  type="button"
                  data-testid="simulate-payment-btn"
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition disabled:opacity-50"
                >
                  {isSimulating ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <span>⚡ Giả lập thanh toán</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
