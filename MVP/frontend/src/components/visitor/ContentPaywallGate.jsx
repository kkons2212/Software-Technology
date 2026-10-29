/**
 * ContentPaywallGate Component (TSK-06.4.3 & AC-06.4.3)
 * Protects in-depth historical narrative and audio content for unpaid visitors.
 * Renders preview teaser with smooth fade gradient and unlock CTA.
 */
export default function ContentPaywallGate({
  isUnlocked = false,
  shortDescription = '',
  fullDescription = '',
  onUnlock,
  className = '',
}) {
  if (isUnlocked) {
    return (
      <div data-testid="content-unlocked" className={`content-unlocked ${className}`}>
        <p className="poi-preview-summary text-slate-700 dark:text-slate-200">
          {fullDescription || shortDescription || 'No description available.'}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="content-paywall-gate"
      className={`content-paywall-gate relative overflow-hidden ${className}`}
    >
      <p className="poi-preview-summary text-slate-600 line-clamp-3 select-none">
        {shortDescription || 'Historical chronicle preview...'}
      </p>

      {/* Smooth fade gradient overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-b from-transparent via-white/80 to-white dark:via-slate-900/80 dark:to-slate-900 pt-6 pb-0.5">
        <button
          type="button"
          onClick={onUnlock}
          data-testid="paywall-unlock-btn"
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Unlock Full Story</span>
        </button>
      </div>
    </div>
  );
}

