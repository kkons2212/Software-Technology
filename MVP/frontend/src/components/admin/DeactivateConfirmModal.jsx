import { useEffect } from 'react';

/**
 * DeactivateConfirmModal (US 03.3)
 * Prompts administrator confirmation before deactivating (hiding) or reactivating an exhibit.
 * Preserves all underlying translations, audio files, and historical telemetry intact.
 */
export default function DeactivateConfirmModal({
  isOpen,
  poi,
  onConfirm,
  onClose,
  isLoading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !poi) {
    return null;
  }

  const isDeactivating = poi.is_active !== false;
  const exhibitTitle = poi.title || 'Untitled Exhibit';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-modal-title"
      aria-describedby="deactivate-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start space-x-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDeactivating ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}
            aria-hidden="true"
          >
            {isDeactivating ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 id="deactivate-modal-title" className="text-base font-bold text-slate-900">
              {isDeactivating ? 'Hide Exhibit from Visitor Map' : 'Reactivate Exhibit'}
            </h3>
            <p id="deactivate-modal-desc" className="mt-2 text-xs leading-relaxed text-slate-600">
              {isDeactivating ? (
                <>
                  Are you sure you want to hide <span className="font-semibold text-slate-800">"{exhibitTitle}"</span>?
                  This will immediately exclude it from visitor interactive maps, automated GPS geofence triggers, and tour routes.
                  All translations, audio files, and telemetry logs will remain safely preserved in the database.
                </>
              ) : (
                <>
                  Reactivate <span className="font-semibold text-slate-800">"{exhibitTitle}"</span>?
                  It will immediately reappear on visitor maps and resume automated proximity narrations for visitors.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="min-h-[44px] rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-[44px] rounded-md px-4 py-2 text-xs font-semibold text-white shadow-sm focus:outline-none disabled:opacity-50 ${
              isDeactivating
                ? 'bg-red-700 hover:bg-red-800 focus:ring-red-500'
                : 'bg-slate-800 hover:bg-slate-700 focus:ring-slate-500'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center space-x-1.5">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : isDeactivating ? (
              'Hide Exhibit'
            ) : (
              'Reactivate Exhibit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

