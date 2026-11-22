import { useState } from 'react';
import { regenerateTranslationAudio } from '../../api/translationApi.js';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

export default function RegenerateAudioButton({
  translationId,
  status,
  hasAudio,
  onRegenerated,
  onError,
  alwaysAvailable = false,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const isHighlighted = status === 'NEEDS_UPDATE';
  const isAvailable = alwaysAvailable || isHighlighted || !hasAudio;

  if (!isAvailable) return null;

  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      const result = await regenerateTranslationAudio(translationId);
      onRegenerated(result);
    } catch (error) {
      onError(error?.message || ADMIN_TRANSLATIONS.audioRegenerateError);
    } finally {
      setIsLoading(false);
    }
  };

  let btnClass = 'border border-amber-300 bg-white text-amber-800 hover:bg-amber-50';
  if (isHighlighted) {
    btnClass = 'bg-amber-600 text-white hover:bg-amber-700';
  }

  let btnText = ADMIN_TRANSLATIONS.btnRegenerateAudio;
  if (isLoading) {
    btnText = ADMIN_TRANSLATIONS.btnGeneratingAudio;
  }

  return (
    <button
      type="button"
      data-testid={`regenerate-audio-${translationId}`}
      onClick={handleRegenerate}
      disabled={isLoading}
      aria-busy={isLoading}
      className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm disabled:cursor-wait disabled:opacity-70 ${btnClass}`}
    >
      {isLoading && (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {btnText}
    </button>
  );
}
