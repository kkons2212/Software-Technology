import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';

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
  onClearSession,
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
          <div
            className="visitor-session-badge"
            aria-label={`Session ${sessionCode}, ${formatTimeRemaining(remainingMilliseconds)} remaining`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span>{sessionCode}</span>
            <span aria-hidden="true">·</span>
            <span>{formatTimeRemaining(remainingMilliseconds)}</span>
            {onClearSession && (
              <button
                type="button"
                className="visitor-clear-session-btn"
                onClick={onClearSession}
                title="Reset session"
                aria-label="Clear session"
                style={{
                  background: 'rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  lineHeight: 1,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '9999px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <button className="visitor-unlock-button" type="button" onClick={onUnlock}>
            <LockKeyhole size={15} aria-hidden="true" />
            <span>Unlock audio</span>
          </button>
        )}
      </div>
    </header>
  );
}
