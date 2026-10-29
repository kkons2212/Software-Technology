// =============================================================================
// TIER 1 - VISITOR SESSION RESTORE MODAL (US 06.3)
// Standardized in dev_rules.md, ui_rules.md & ux_rules.md
// Allows visitors to enter their 6-character session code to regain access
// across multiple devices or after clearing browser storage.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, X } from 'lucide-react';
import { restoreSession } from '../../api/sessionApi.js';
import { useVisitorSession } from '../../contexts/VisitorSessionContext.jsx';
import { getVisitorText } from '../../locales/visitorTranslations.js';

export default function RestoreSessionModal({
  isOpen = false,
  onClose,
  onSuccess,
  language = 'vi',
}) {
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRef = useRef(null);
  const { activateSession } = useVisitorSession();

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSessionCodeInput('');
      setErrorMessage(null);
      setIsSuccess(false);
      setIsLoading(false);
      // Autofocus input after small tick for portal mount
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSessionCodeInput('');
      setErrorMessage(null);
      setIsSuccess(false);
      setIsLoading(false);
    }
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

  const handleInputChange = (event) => {
    const raw = event.target.value;
    // Strip whitespace and convert to uppercase automatically
    const cleaned = raw.toUpperCase().replace(/\s+/g, '');
    setSessionCodeInput(cleaned);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault();
      const code = sessionCodeInput.trim().toUpperCase();
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
    [activateSession, onClose, onSuccess, sessionCodeInput]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 transition-all p-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 inline-flex items-center justify-center w-11 h-11 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Mã phiên (Session Code)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="session-code-input"
                name="sessionCode"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                maxLength={20}
                placeholder="CCT-XXXXXX"
                value={sessionCodeInput}
                onChange={handleInputChange}
                disabled={isLoading || isSuccess}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono text-base tracking-widest text-center uppercase placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition disabled:opacity-60"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Mã gồm 6 ký tự in trên hoá đơn hoặc màn hình thanh toán trước đó (ví dụ: <span className="font-mono font-medium text-slate-700">CCT-894201</span>).
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
              disabled={isLoading || !sessionCodeInput.trim() || isSuccess}
              className="flex-[2] h-11 px-4 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Đang xác thực...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Đã khôi phục</span>
                </>
              ) : (
                <span>{getVisitorText('restoreSessionBtn', language)}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
