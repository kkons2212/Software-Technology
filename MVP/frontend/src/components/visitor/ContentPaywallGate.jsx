/**
 * ContentPaywallGate Component (TSK-06.4.3 & AC-06.4.3)
 * Protects in-depth historical narrative and audio content for unpaid visitors.
 * Renders preview teaser with smooth fade gradient and unlock CTA.
 */
export default function ContentPaywallGate({
  isUnlocked = false,
  isActivated = true,
  shortDescription = '',
  fullDescription = '',
  onUnlock,
  className = '',
}) {
  if (isUnlocked) {
    if (isActivated) {
      return (
        <div data-testid="content-unlocked" className={`content-unlocked ${className}`}>
          <p className="poi-preview-summary text-slate-700 dark:text-slate-200">
            {fullDescription || shortDescription || 'No description available.'}
          </p>
        </div>
      );
    }

    return (
      <div data-testid="content-teaser-paid" className={`content-teaser-paid ${className}`}>
        <p className="poi-preview-summary text-slate-700 dark:text-slate-200 line-clamp-2">
          {shortDescription || 'Historical chronicle preview...'}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          📍 Đến gần điểm (&le;15m) để kích hoạt thuyết minh đầy đủ
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="content-paywall-gate"
      className={`content-paywall-gate ${className}`}
    >
      <p className="poi-preview-summary text-slate-600 line-clamp-2 select-none">
        {shortDescription || 'Historical chronicle preview...'}
      </p>

      <div className="mt-2 flex items-center">
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
