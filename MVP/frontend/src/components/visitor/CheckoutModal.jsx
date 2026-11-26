// =============================================================================
// TIER 1 - DIGITAL ADMISSION CHECKOUT MODAL (US 06.1)
// Standardized in dev_rules.md & PaymentSetup.md
// Frictionless checkout for 24-hour smart audio guide service via VietQR & Cards.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  clearOrderCreatorToken,
  createCheckoutOrder,
  simulatePaymentSuccess,
  storeOrderCreatorToken,
} from '../../api/paymentApi.js';
import { usePaymentPolling } from '../../hooks/usePaymentPolling.js';
import { getVisitorText } from '../../locales/visitorTranslations.js';

// Module-level simulation helper declared immediately below imports (dev_rules 1.4.5)
const isSimulationEnabled = () => Boolean(
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_SIMULATE_PAYMENT === 'true'
);

const DEFAULT_FEE_VND = 50000;

export const getDefaultPaymentMethod = (language) => {
  const normalized = String(language || '').toLowerCase().trim();
  if (normalized === 'vi' || normalized.startsWith('vi-') || normalized.startsWith('vi_')) {
    return 'VIETQR';
  }
  return 'CARD';
};

/**
 * Resolves localized checkout order creation error message following 3-Phase SISE.
 * Metrics: K = 2, M <= 3, Nesting <= 2, 0 ternaries.
 */
export function resolveCheckoutOrderError(err, preferredLanguage = 'vi') {
  // Phase 1: Precondition Gate
  if (!err) {
    return getVisitorText('checkoutOrderFailed', preferredLanguage);
  }

  // Phase 2: Linear Compute & Accumulate
  const isRateLimited = Boolean(err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED');
  let resolvedMessage = '';

  if (isRateLimited) {
    let retrySeconds = 60;
    if (err.details && typeof err.details.retry_after_seconds === 'number') {
      retrySeconds = err.details.retry_after_seconds;
    }
    resolvedMessage = getVisitorText('rateLimitExceeded', preferredLanguage, { seconds: retrySeconds });
  } else {
    resolvedMessage = getVisitorText('checkoutOrderFailed', preferredLanguage);
  }

  // Phase 3: Unified Exit Return
  return resolvedMessage;
}

export default function CheckoutModal({
  isOpen = false,
  initialSuccessData = null,
  onClose,
  onSuccess,
  preferredLanguage = 'vi',
  onOpenRestore,
}) {
  // Top-of-Scope Rule (dev_rules 1.4.5): preliminary computed flags at top of component
  const isSimulationAllowed = isSimulationEnabled();

  const [paymentMethod, setPaymentMethod] = useState(() =>
    getDefaultPaymentMethod(preferredLanguage)
  );
  const [order, setOrder] = useState(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [simulationError, setSimulationError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(() => Boolean(initialSuccessData));
  const [completedSession, setCompletedSession] = useState(() => initialSuccessData);

  const prevIsOpenRef = useRef(false);
  const prevLangRef = useRef(preferredLanguage);

  const handlePaymentSuccess = useCallback(
    (paidData) => {
      clearOrderCreatorToken(paidData?.order_id);
      setIsPaidSuccess(true);
      setCompletedSession(paidData);
      onSuccess?.(paidData);
    },
    [onSuccess]
  );

  const { status: orderStatus, isPolling } = usePaymentPolling({
    orderId: order?.order_id ?? null,
    creatorToken: order?.creator_token ?? null,
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
        storeOrderCreatorToken(orderData.order_id, orderData.creator_token);
        setOrder(orderData);
      } catch (err) {
        const resolvedError = resolveCheckoutOrderError(err, preferredLanguage);
        setOrderError(resolvedError);
      } finally {
        setIsLoadingOrder(false);
      }
    },
    [preferredLanguage]
  );

  useEffect(() => {
    if (isOpen) {
      if (initialSuccessData) {
        setIsPaidSuccess(true);
        setCompletedSession(initialSuccessData);
        return;
      }
      const wasOpen = prevIsOpenRef.current;
      const prevLang = prevLangRef.current;
      prevIsOpenRef.current = true;
      prevLangRef.current = preferredLanguage;

      if (!wasOpen || prevLang !== preferredLanguage) {
        const initialMethod = getDefaultPaymentMethod(preferredLanguage);
        setPaymentMethod(initialMethod);
        setIsPaidSuccess(false);
        setCompletedSession(null);
        fetchOrder(initialMethod);
      }
    } else {
      prevIsOpenRef.current = false;
      setOrder(null);
      setOrderError(null);
      setIsPaidSuccess(false);
      setCompletedSession(null);
    }
  }, [fetchOrder, initialSuccessData, isOpen, preferredLanguage]);

  const handleSelectPaymentMethod = (method) => {
    if (method === paymentMethod && order) return;
    setPaymentMethod(method);
    fetchOrder(method);
  };

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
    setSimulationError(null);
    try {
      const res = await simulatePaymentSuccess(order.order_id, { preferredLanguage });
      if (res?.status === 'PAID') {
        handlePaymentSuccess(res);
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Giả lập thanh toán không khả dụng.';
      setSimulationError(errorMessage);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const formattedAmount = (order?.amount ?? DEFAULT_FEE_VND).toLocaleString('vi-VN');

  const isVietnamese =
    String(preferredLanguage || '').toLowerCase().startsWith('vi');

  const tabConfigs = isVietnamese
    ? [
        { id: 'VIETQR', icon: QrCode, label: getVisitorText('tabVietQR', preferredLanguage) },
        { id: 'CARD', icon: CreditCard, label: getVisitorText('tabCard', preferredLanguage) },
      ]
    : [
        { id: 'CARD', icon: CreditCard, label: getVisitorText('tabCard', preferredLanguage) },
        { id: 'VIETQR', icon: QrCode, label: getVisitorText('tabVietQR', preferredLanguage) },
      ];

  // Compute card action element cleanly (refactor_rule 6.2: 0 nested ternaries in JSX)
  let cardActionElement = (
    <p className="mt-5 text-xs text-red-600">
      {getVisitorText('paypalUnavailable', preferredLanguage)}
    </p>
  );

  if (order?.checkout_url) {
    cardActionElement = (
      <a
        href={order.checkout_url}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#0070ba] py-3 px-4 text-xs font-semibold text-white shadow-md hover:bg-[#005ea6] transition"
      >
        {getVisitorText('continueWithPayPal', preferredLanguage, { amount: formattedAmount })}
      </a>
    );
  } else if (isSimulationAllowed) {
    cardActionElement = (
      <button
        type="button"
        onClick={handleSimulate}
        className="mt-5 w-full rounded-xl bg-[#0070ba] py-3 px-4 text-xs font-semibold text-white shadow-md hover:bg-[#005ea6] transition"
      >
        {getVisitorText('simulatePayPalPayment', preferredLanguage, { amount: formattedAmount })}
      </button>
    );
  }

  // Close button 44px touch target (Rule 2.6)
  const closeButtonElement = (
    <button
      type="button"
      onClick={onClose}
      aria-label={getVisitorText('closeCheckout', preferredLanguage)}
      className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 inline-flex items-center justify-center w-11 h-11 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
    >
      <X size={20} aria-hidden="true" />
    </button>
  );

  // Compute main content area view into explicit variable (refactor_rule.md Rule 6.2)
  let mainContentArea = null;
  if (isLoadingOrder) {
    mainContentArea = (
      <div className="py-12 text-center text-slate-500">
        <Loader2 size={32} className="mx-auto animate-spin text-emerald-600" />
        <p className="mt-2 text-xs">{getVisitorText('initializingPaymentCode', preferredLanguage)}</p>
      </div>
    );
  } else if (orderError) {
    mainContentArea = (
      <div className="my-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-xs text-red-700">{orderError}</p>
        <button
          type="button"
          onClick={() => fetchOrder(paymentMethod)}
          className="mt-3 inline-block rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          {getVisitorText('retryOrder', preferredLanguage)}
        </button>
      </div>
    );
  } else if (paymentMethod === 'VIETQR') {
    mainContentArea = (
      <div className="mt-3 sm:mt-4">
        {/* QR Code Container */}
        <div className="mx-auto flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-inner max-w-[180px] sm:max-w-[220px]">
          {order?.qr_code_url ? (
            <img
              src={order.qr_code_url}
              alt="VietQR thanh toán dịch vụ thuyết minh âm thanh"
              className="w-full h-auto aspect-square rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center bg-slate-100 text-slate-400">
              <QrCode size={44} />
            </div>
          )}
          <span className="mt-1 text-[10px] sm:text-[11px] text-slate-500 text-center font-medium">
            {getVisitorText('scanWithBankingApp', preferredLanguage)}
          </span>
        </div>

        {/* Transfer Details Card */}
        <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2 rounded-xl bg-slate-50 p-2.5 sm:p-3 text-xs border border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">{getVisitorText('bank', preferredLanguage)}:</span>
            <span className="font-semibold text-slate-800">
              {order?.bank_name || 'MBBank'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">{getVisitorText('accountNumber', preferredLanguage)}:</span>
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
            <span className="text-slate-500">{getVisitorText('accountHolder', preferredLanguage)}:</span>
            <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
              {order?.account_name || 'DIA DAO CU CHI'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">{getVisitorText('transferContent', preferredLanguage)}:</span>
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
              ? getVisitorText('waitingPaymentConfirm', preferredLanguage)
              : getVisitorText('checkingPaymentStatus', preferredLanguage)}
          </span>
        </div>
      </div>
    );
  } else {
    mainContentArea = (
      <div className="mt-6 py-4 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <CreditCard size={28} />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">
          {getVisitorText('cardGatewayTitle', preferredLanguage)}
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
          {getVisitorText('cardGatewayDesc', preferredLanguage)}
        </p>

        {cardActionElement}
        {simulationError && (
          <p
            className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200"
            data-testid="card-simulation-error-msg"
          >
            {simulationError}
          </p>
        )}
      </div>
    );
  }

  let copySessionCodeTitle = 'Sao chép mã phiên';
  if (copiedField === 'session_code') {
    copySessionCodeTitle = 'Đã sao chép!';
  }

  let completedPaymentMethodLabel = 'VietQR';
  if (
    completedSession?.payment_method === 'CARD' ||
    completedSession?.payment_method === 'PAYPAL' ||
    paymentMethod === 'CARD'
  ) {
    completedPaymentMethodLabel = 'PayPal / Card';
  }

  let sandboxPaymentMethodLabel = 'VietQR';
  if (paymentMethod === 'CARD') {
    sandboxPaymentMethodLabel = 'PayPal';
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="flex min-h-full items-start sm:items-center justify-center py-2 sm:py-8 pointer-events-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-2xl transition-all my-1 sm:my-8 pointer-events-auto">
          {/* Close Button with 44px Touch Target (Rule 2.6) */}
          {closeButtonElement}

        {isPaidSuccess ? (
          /* SUCCESS STATE */
          <div className="py-6 text-center animate-fadeIn" data-testid="checkout-success-view">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {getVisitorText('activationSuccessTitle', preferredLanguage)}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {getVisitorText('activationSuccessSubtitle', preferredLanguage)}
            </p>

            <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left">
              <div className="flex justify-between items-center text-sm py-2 border-b border-emerald-100">
                <span className="text-slate-600 font-medium">{getVisitorText('sessionCodeLabel', preferredLanguage)}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-800 tracking-wider font-mono text-base">
                    {completedSession?.session_code || 'PASS-ACTIVE'}
                  </span>
                  {completedSession?.session_code && (
                    <button
                      type="button"
                      onClick={() => handleCopy('session_code', completedSession.session_code)}
                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-200/60 active:scale-95 transition inline-flex items-center justify-center"
                      title={copySessionCodeTitle}
                      aria-label="Sao chép mã phiên"
                    >
                      {copiedField === 'session_code' && (
                        <Check size={16} className="text-emerald-700" />
                      )}
                      {copiedField !== 'session_code' && (
                        <Copy size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-medium">{getVisitorText('paymentMethodLabel', preferredLanguage)}</span>
                <span className="text-emerald-800 font-semibold">
                  {completedPaymentMethodLabel}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-medium">{getVisitorText('durationLabel', preferredLanguage)}</span>
                <span className="text-emerald-800 font-semibold">{getVisitorText('duration24Hours', preferredLanguage)}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-600 font-medium">{getVisitorText('statusLabel', preferredLanguage)}</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck size={16} /> {getVisitorText('statusActivated', preferredLanguage)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
            >
              {getVisitorText('startListeningBtn', preferredLanguage)}
            </button>
          </div>
        ) : (
          /* CHECKOUT VIEW */
          <div>
            {/* Header */}
            <div className="pr-12 sm:pr-14">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 mb-2">
                <Sparkles size={13} aria-hidden="true" />
                <span>24h Tour Pass</span>
              </div>
              <h2
                id="checkout-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-snug"
              >
                {getVisitorText('serviceTitle', preferredLanguage)}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{getVisitorText('serviceSubtitle', preferredLanguage)}</p>
            </div>

            {/* Fee badge */}
            <div className="mt-2.5 sm:mt-4 flex items-baseline justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 sm:px-4 sm:py-3 border border-slate-100">
              <span className="text-xs font-medium text-slate-600">{getVisitorText('serviceFee24h', preferredLanguage)}</span>
              <div className="text-right">
                <span className="text-lg sm:text-xl font-extrabold text-emerald-700">
                  {formattedAmount} đ
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block">{getVisitorText('perDevice', preferredLanguage)}</span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="mt-2.5 sm:mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="tablist">
              {tabConfigs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = paymentMethod === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleSelectPaymentMethod(tab.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Content Area (Computed cleanly above adhering to refactor_rule.md SISE Rule 6.2) */}
            {mainContentArea}

            {/* Restore Session Prompt Link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onOpenRestore?.();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:underline transition"
              >
                <span>{getVisitorText('alreadyPurchasedPrompt', preferredLanguage)}</span>
              </button>
            </div>

            {/* Sandbox Simulation Bar (Dev & Test Convenience) */}
            {isSimulationAllowed && order && (
              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Sandbox Test Mode ({sandboxPaymentMethodLabel}):
                  </span>
                  <button
                    type="button"
                    data-testid="simulate-payment-btn"
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition disabled:opacity-50"
                  >
                    {isSimulating && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    {!isSimulating && (
                      <span>⚡ {getVisitorText('simulateSuccessBtn', preferredLanguage)}</span>
                    )}
                  </button>
                </div>
                {simulationError && (
                  <p
                    className="mt-1.5 text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200 text-left"
                    data-testid="simulation-error-msg"
                  >
                    {simulationError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
