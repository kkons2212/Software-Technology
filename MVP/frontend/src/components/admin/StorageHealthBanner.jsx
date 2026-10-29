import PropTypes from 'prop-types';

export const WARNING_THRESHOLD_PERCENT = 85.0;
export const CRITICAL_THRESHOLD_PERCENT = 95.0;

export function formatBytes(bytes) {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function StorageHealthBanner({
  diskUsedPercent = 0,
  thresholdStatus,
  totalBytes,
  usedBytes,
  freeBytes,
  audioCacheBytes,
  audioCacheFiles,
  onCleanClick,
  stickyOnly = false,
  showMeter = true,
}) {
  const percent = Number(diskUsedPercent) || 0;
  const isCritical = percent >= CRITICAL_THRESHOLD_PERCENT || thresholdStatus === 'CRITICAL';
  const isWarning = (percent >= WARNING_THRESHOLD_PERCENT && percent < CRITICAL_THRESHOLD_PERCENT) || thresholdStatus === 'WARNING';
  const hasAlert = isWarning || isCritical;

  // In stickyOnly mode, do not render if below 85%
  if (stickyOnly && !hasAlert) {
    return null;
  }

  const alertClasses = isCritical
    ? 'border-red-300 bg-red-50 text-red-800'
    : 'border-amber-300 bg-amber-50 text-amber-800';

  const buttonClasses = isCritical
    ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
    : 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500';

  const meterBarColor = isCritical
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className={`w-full ${stickyOnly ? '' : 'space-y-4'}`} data-testid="storage-health-banner">
      {hasAlert && (
        <aside
          role="alert"
          aria-live="assertive"
          className={`flex flex-col items-start justify-between gap-3 rounded-lg border ${
            stickyOnly ? 'p-2 sm:px-3 sm:py-1.5' : 'p-4'
          } sm:flex-row sm:items-center ${alertClasses}`}
        >
          <div className="flex items-center space-x-3">
            <svg
              className={`h-5 w-5 shrink-0 ${isCritical ? 'text-red-600' : 'text-amber-600'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-xs sm:text-sm">
              <span className="font-semibold">
                {isCritical ? 'Critical Alert: ' : 'Warning: '}
              </span>
              {isCritical
                ? 'Audio cache capacity exceeds 95%. Please prune files before generating new audio or uploading media.'
                : 'Audio cache capacity exceeds 85%. Please prune orphaned files.'}
            </div>
          </div>

          {onCleanClick && (
            <button
              type="button"
              data-testid="clean-orphans-btn"
              onClick={onCleanClick}
              className={`inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClasses}`}
            >
              Clean Orphaned Audio
            </button>
          )}
        </aside>
      )}

      {showMeter && !stickyOnly && (
        <section
          data-testid="storage-progress-meter"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">Static Audio Cache Disk Usage</span>
              <span className="font-medium text-slate-600">
                {percent.toFixed(1)}%
                <span className="ml-1 text-xs text-slate-500">
                  ({thresholdStatus || (isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL')})
                </span>
              </span>
            </div>

            {/* Meter Bar */}
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Audio cache storage disk usage"
              className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${meterBarColor}`}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Used: {formatBytes(usedBytes)}</span>
              <span>Total: {formatBytes(totalBytes)}</span>
            </div>
          </div>

          {/* Stats summary breakdown */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-600">Free Space</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatBytes(freeBytes)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Audio Cache Size</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatBytes(audioCacheBytes)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Audio Cache Files</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {audioCacheFiles !== undefined && audioCacheFiles !== null ? `${audioCacheFiles} files` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Threshold Alert</p>
              <p className={`mt-0.5 text-sm font-semibold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isCritical ? 'Critical (≥95%)' : isWarning ? 'Warning (≥85%)' : 'Healthy (<85%)'}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

StorageHealthBanner.propTypes = {
  diskUsedPercent: PropTypes.number,
  thresholdStatus: PropTypes.string,
  totalBytes: PropTypes.number,
  usedBytes: PropTypes.number,
  freeBytes: PropTypes.number,
  audioCacheBytes: PropTypes.number,
  audioCacheFiles: PropTypes.number,
  onCleanClick: PropTypes.func,
  stickyOnly: PropTypes.bool,
  showMeter: PropTypes.bool,
};
