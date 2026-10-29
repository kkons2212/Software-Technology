import { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { cleanOrphanedAudio } from '../../api/systemApi.js';

export default function CleanOrphansModal({ isOpen, onClose, onSuccess }) {
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleClean = async () => {
    setIsCleaning(true);
    setError(null);
    try {
      const result = await cleanOrphanedAudio();
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to prune orphaned audio files.');
    } finally {
      setIsCleaning(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clean-orphans-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center space-x-3 text-amber-600">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          <h2 id="clean-orphans-title" className="text-lg font-semibold text-slate-900">
            Clean Orphaned Audio
          </h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This operation scans physical storage in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-800">/static/audio</code>,
          identifies all cached MP3 files that are no longer linked to any exhibit translation, and permanently unlinks them.
        </p>

        {error && (
          <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            disabled={isCleaning}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isCleaning}
            onClick={handleClean}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
          >
            {isCleaning ? 'Cleaning...' : 'Confirm & Prune'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

CleanOrphansModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
