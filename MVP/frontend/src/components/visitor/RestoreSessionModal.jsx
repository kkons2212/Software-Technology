// =============================================================================
// TIER 1 - VISITOR SESSION RESTORE MODAL (US 06.3)
// Standardized in dev_rules.md, ui_rules.md & ux_rules.md
// Allows visitors to enter their 6-digit session code (e.g., CCT-894201)
// to regain access across multiple devices or after clearing browser storage.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, X } from 'lucide-react';
import { restoreSession } from '../../api/sessionApi.js';
import { useVisitorSession } from '../../contexts/VisitorSessionContext.jsx';
import { getVisitorText } from '../../locales/visitorTranslations.js';

const PIN_LENGTH = 6;

export default function RestoreSessionModal({
  isOpen = false,
  onClose,
  onSuccess,
  language = 'vi',
}) {
  const [pin, setPin] = useState(Array(PIN_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRefs = useRef([]);
  const { activateSession } = useVisitorSession();

  // Reset state and autofocus when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setPin(Array(PIN_LENGTH).fill(''));
      setErrorMessage(null);
      setIsSuccess(false);
      setIsLoading(false);

      // Autofocus first PIN input
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }

    setPin(Array(PIN_LENGTH).fill(''));
    setErrorMessage(null);
    setIsSuccess(false);
    setIsLoading(false);
    return undefined;
  }, [isOpen]);

  // Handle Escape key to close modal
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

  const executeRestore = useCallback(
    async (rawCode) => {
      const code = (rawCode || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!code) {
        setErrorMessage('Vui lòng nhập mã phiên của bạn.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await restoreSession({ sessionCode: code });
        const restoredData = response?.data || response;

        const codeVal = restoredData?.session_code || code;
        const tokenVal = restoredData?.session_token || '';
        const expiresAtVal = restoredData?.expires_at;

        // Activate session in global context
        activateSession({
          sessionCode: codeVal,
          sessionToken: tokenVal,
          expiresAt: expiresAtVal,
        });

        setIsSuccess(true);
        onSuccess?.(restoredData);

        // Auto close after briefly showing success state
        setTimeout(() => {
          onClose?.();
        }, 750);
      } catch (err) {
        const errorDetail =
          err?.error?.message ||
          err?.message ||
          'Session code is invalid or has expired.';

        if (
          err?.status === 404 ||
          err?.status === 410 ||
          errorDetail.toLowerCase().includes('expired') ||
          errorDetail.toLowerCase().includes('invalid')
        ) {
          setErrorMessage('Mã phiên không hợp lệ hoặc đã hết hạn.');
        } else {
          setErrorMessage(errorDetail);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activateSession, onClose, onSuccess]
  );

  // Handle individual PIN digit changes
  const handleDigitChange = (index, event) => {
    const value = event.target.value;
    if (errorMessage) setErrorMessage(null);

    // Extract only digits
    const cleaned = value.replace(/[^0-9]/g, '');

    if (!cleaned) {
      const nextPin = [...pin];
      nextPin[index] = '';
      setPin(nextPin);
      return;
    }

    // Take the last digit if multiple were entered
    const digit = cleaned.slice(-1);
    const nextPin = [...pin];
    nextPin[index] = digit;
    setPin(nextPin);

    // Auto-advance to next input
    if (index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if PIN is complete (all 6 digits present)
    const allFilled = nextPin.every((d) => d.trim() !== '');
    if (allFilled) {
      const fullPinCode = nextPin.join('');
      executeRestore(`CCT-${fullPinCode}`);
    }
  };

  // Handle Backspace and arrow navigation
  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        const nextPin = [...pin];
        nextPin[index - 1] = '';
        setPin(nextPin);
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextPin = [...pin];
        nextPin[index] = '';
        setPin(nextPin);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle clipboard paste
  const handlePaste = (event) => {
    event.preventDefault();
    if (errorMessage) setErrorMessage(null);

    const pastedData = event.clipboardData?.getData('text') || '';
    const cleaned = pastedData.trim().toUpperCase().replace(/\s+/g, '');

    // Extract digits (strip any CCT- prefix if present)
    const digitsOnly = cleaned.replace(/^CCT-?/, '').replace(/[^0-9]/g, '');
    if (digitsOnly.length > 0) {
      const nextPin = Array(PIN_LENGTH).fill('');
      for (let i = 0; i < Math.min(digitsOnly.length, PIN_LENGTH); i++) {
        nextPin[i] = digitsOnly[i];
      }
      setPin(nextPin);

      const focusIdx = Math.min(digitsOnly.length, PIN_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();

      if (digitsOnly.length >= PIN_LENGTH) {
        executeRestore(`CCT-${digitsOnly.slice(0, PIN_LENGTH)}`);
      }
    }
  };

  // Form submit button handler
  const handleSubmit = (event) => {
    event?.preventDefault();
    const fullPinCode = pin.join('');
    if (fullPinCode.length < PIN_LENGTH) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số mã phiên.');
      return;
    }
    executeRestore(`CCT-${fullPinCode}`);
  };

  if (!isOpen) return null;

  const isFormComplete = pin.every((d) => d.trim() !== '');

  let submitButtonContent = (
    <span>{getVisitorText('restoreSessionBtn', language)}</span>
  );
  if (isLoading) {
    submitButtonContent = (
      <>
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        <span>Đang xác thực...</span>
      </>
    );
  } else if (isSuccess) {
    submitButtonContent = (
      <>
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>Đã khôi phục</span>
      </>
    );
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8 pointer-events-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 transition-all p-4 sm:p-6 my-auto pointer-events-auto">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <X size={20} aria-hidden="true" />
          </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="restore-modal-title"
              className="text-lg font-bold text-slate-900 leading-tight"
            >
              {getVisitorText('restoreModalTitle', language)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {getVisitorText('restoreModalSubtitle', language)}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="session-code-input"
              className="block text-xs font-semibold text-slate-700 mb-2 text-center"
            >
              Mã phiên (Session Code)
            </label>

            {/* PIN 6-BOX INTERFACE */}
            <div
              className="flex items-center justify-center gap-1.5 sm:gap-2"
              onPaste={handlePaste}
            >
              <div className="px-1.5 sm:px-2 py-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] sm:text-xs font-mono font-bold text-slate-500 select-none">
                CCT -
              </div>
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  id={index === 0 ? 'session-code-input' : undefined}
                  name={index === 0 ? 'sessionCode' : undefined}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading || isSuccess}
                  aria-label={`Chữ số thứ ${index + 1}`}
                  data-testid={`pin-input-${index}`}
                  className="w-9 h-11 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition disabled:opacity-60"
                />
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Nhập 6 chữ số mã phiên của bạn (ví dụ: CCT-894201).
            </p>
          </div>

          {/* Inline Error State */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-shake"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Inline Success State */}
          {isSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs"
            >
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
              <span className="font-medium">
                Khôi phục phiên thành công! Đang mở khoá audio guide...
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isSuccess}
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition disabled:opacity-50"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormComplete || isSuccess}
              className="flex-[2] h-11 px-4 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitButtonContent}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
