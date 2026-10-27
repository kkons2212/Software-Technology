
/**
 * AudioSyncBadge (TSK-04.1.3 & AC-04.1.3)
 * Renders real-time audio synchronization badge and publish lock indicator.
 */
export default function AudioSyncBadge({
  status = 'DRAFT',
  audioStatus,
  isEdited = false,
  showLock = false,
  className = '',
}) {
  const normalizedStatus = (status || '').toUpperCase();
  const effectiveStatus = isEdited ? 'NEEDS_UPDATE' : normalizedStatus;

  let badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let badgeLabel = 'Draft';
  let isPublishLocked = audioStatus !== 'READY';

  switch (effectiveStatus) {
    case 'NEEDS_UPDATE':
      badgeStyles = 'bg-amber-50 text-amber-800 border-amber-300';
      badgeLabel = 'Audio Needs Update';
      isPublishLocked = true;
      break;
    case 'PUBLISHED':
    case 'READY':
    case 'IN_SYNC':
      badgeStyles = 'bg-green-50 text-green-700 border-green-200';
      badgeLabel = 'Audio In Sync';
      isPublishLocked = false;
      break;
    case 'PENDING':
      badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      badgeLabel = 'Processing AI...';
      isPublishLocked = true;
      break;
    case 'FAILED':
      badgeStyles = 'bg-red-50 text-red-700 border-red-200';
      badgeLabel = 'Audio Failed';
      isPublishLocked = true;
      break;
    default:
      if (audioStatus === 'READY') {
        badgeStyles = 'bg-green-50 text-green-700 border-green-200';
        badgeLabel = 'Audio In Sync';
        isPublishLocked = false;
      }
      break;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        data-testid="audio-sync-badge"
        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${badgeStyles}`}
      >
        {effectiveStatus === 'PENDING' && (
          <svg
            className="mr-1.5 h-3 w-3 animate-spin text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {badgeLabel}
      </span>

      {showLock && isPublishLocked && (
        <span
          data-testid="publish-lock-indicator"
          className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-normal text-slate-600"
          title="Publishing locked until audio is regenerated"
        >
          <span className="mr-1" aria-hidden="true">🔒</span>
          Publish Locked
        </span>
      )}
    </div>
  );
}
