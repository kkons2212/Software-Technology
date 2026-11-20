import { useEffect, useState } from 'react';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { getVisitorText } from '../../locales/visitorTranslations.js';
import { ensureUtcIso } from '../../utils/dateUtils.js';

const COUNTDOWN_INTERVAL_MS = 1000;

function formatTimeRemaining(milliseconds) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Format long 36-char session codes (e.g. CCT-ECF55A56BC52A31BC00ECDABA41752C9)
 * into a compact display label (e.g. CCT-…752C9) to preserve mobile header real estate.
 */
export function formatDisplaySessionCode(code) {
  if (!code || typeof code !== 'string') return '';
  if (code.length <= 14) return code;
  return `${code.slice(0, 4)}…${code.slice(-5)}`;
}

export default function VisitorHeader({
  languages = [],
  selectedLanguage = '',
  onLanguageChange,
  sessionCode = '',
  expiresAt = null,
  onUnlock,
  onClearSession,
  onRestoreSession,
}) {
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const expirationTime = expiresAt ? new Date(ensureUtcIso(expiresAt)).getTime() : 0;
  const displayCode = formatDisplaySessionCode(sessionCode);

  const handleCopyCode = async (event) => {
    if (event.target.closest('.visitor-clear-session-btn')) return;
    if (!sessionCode) return;
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Safe fallback if clipboard API is blocked in iframe/sandbox
    }
  };

  useEffect(() => {
    if (!sessionCode || !expirationTime) {
      setRemainingMilliseconds(0);
      return undefined;
    }

    const updateCountdown = () => {
      setRemainingMilliseconds(Math.max(0, expirationTime - Date.now()));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, COUNTDOWN_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [expirationTime, sessionCode]);

  const hasActiveSession = Boolean(sessionCode) && remainingMilliseconds > 0;

  return (
    <header className="visitor-header">
      <a className="visitor-brand" href="/" aria-label="Cu Chi Tunnels home">
        <span className="visitor-brand-mark" aria-hidden="true">C</span>
        <span className="visitor-brand-copy">
          <h1>{getVisitorText('brandTitle', selectedLanguage)}</h1>
          <span>{getVisitorText('brandSubtitle', selectedLanguage)}</span>
        </span>
      </a>

      <div className="visitor-header-actions">
        <label className="sr-only" htmlFor="visitor-language">Choose language</label>
        <select
          id="visitor-language"
          aria-label="Choose language"
          value={selectedLanguage}
          onChange={(event) => onLanguageChange?.(event.target.value)}
          disabled={languages.length === 0}
        >
          {languages.length === 0 && <option value="">{getVisitorText('noLanguages', selectedLanguage)}</option>}
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>

        {hasActiveSession ? (
          <div
            className="visitor-session-badge"
            aria-label={`Session ${sessionCode}, ${formatTimeRemaining(remainingMilliseconds)} remaining`}
            title={copied ? 'Đã sao chép!' : `${sessionCode} (Chạm để sao chép)`}
            onClick={handleCopyCode}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleCopyCode(e);
            }}
          >
            <span className="visitor-session-code font-mono">{copied ? '✓ Đã chép' : displayCode}</span>
            <span aria-hidden="true" className="visitor-session-dot">·</span>
            <span className="visitor-session-timer">{formatTimeRemaining(remainingMilliseconds)}</span>
            {onClearSession && (
              <button
                type="button"
                className="visitor-clear-session-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSession();
                }}
                title="Reset session"
                aria-label="Clear session"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              className="visitor-restore-button inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              type="button"
              onClick={onRestoreSession}
              title={getVisitorText('restorePassTitle', selectedLanguage)}
            >
              <KeyRound size={13} aria-hidden="true" />
              <span className="hidden sm:inline">{getVisitorText('restorePass', selectedLanguage)}</span>
            </button>
            <button className="visitor-unlock-button" type="button" onClick={onUnlock}>
              <LockKeyhole size={15} aria-hidden="true" />
              <span>{getVisitorText('unlockAudio', selectedLanguage)}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
