import { useEffect, useState } from 'react';
import { KeyRound, LockKeyhole } from 'lucide-react';

const COUNTDOWN_INTERVAL_MS = 1000;

function formatTimeRemaining(milliseconds) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export default function VisitorHeader({
  languages = [],
  selectedLanguage = '',
  onLanguageChange,
  sessionCode = '',
  expiresAt = null,
  onUnlock,
  onRestoreSession,
}) {
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(0);
  const expirationTime = expiresAt ? new Date(expiresAt).getTime() : 0;

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
          <h1>Cu Chi Tunnels</h1>
          <span>Smart audio guide</span>
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
          {languages.length === 0 && <option value="">No languages available</option>}
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>

        {hasActiveSession ? (
          <div className="visitor-session-badge" aria-label={`Session ${sessionCode}, ${formatTimeRemaining(remainingMilliseconds)} remaining`}>
            <span>{sessionCode}</span>
            <span aria-hidden="true">·</span>
            <span>{formatTimeRemaining(remainingMilliseconds)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              className="visitor-restore-button inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              type="button"
              onClick={onRestoreSession}
              title="Khôi phục phiên đã mua"
            >
              <KeyRound size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Khôi phục</span>
            </button>
            <button className="visitor-unlock-button" type="button" onClick={onUnlock}>
              <LockKeyhole size={15} aria-hidden="true" />
              <span>Unlock audio</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
