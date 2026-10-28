import { useCallback, useEffect, useState } from 'react';
import { getTranslations, updateTranslation, publishTranslation } from '../../api/translationApi.js';
import { getPois } from '../../api/poiApi.js';
import AudioSyncBadge from '../../components/admin/AudioSyncBadge.jsx';
import AudioAuditPlayer from '../../components/admin/AudioAuditPlayer.jsx';
import RegenerateAudioButton from '../../components/admin/RegenerateAudioButton.jsx';

const DEFAULT_LANGUAGES = [
  { id: 'en', name: 'English (en)' },
  { id: 'ja', name: 'Japanese (ja)' },
  { id: 'ko', name: 'Korean (ko)' },
  { id: 'zh', name: 'Chinese (zh)' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Review Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'NEEDS_UPDATE', label: 'Needs Audio Update' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PENDING', label: 'Pending' },
];

export default function TranslationAuditView() {
  const [translations, setTranslations] = useState([]);
  const [pois, setPois] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // 3-Tier Filter Bar States (AC-04.1.2)
  const [selectedPoiId, setSelectedPoiId] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Row-level edit drafts: { [stranId]: { title, short_description, description } }
  const [editDrafts, setEditDrafts] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [publishingRows, setPublishingRows] = useState({});

  // 1. Fetch POIs for the 3-tier filter header
  useEffect(() => {
    let isMounted = true;
    getPois({ size: 100 })
      .then((res) => {
        if (!isMounted) return;
        const items = res?.items || (Array.isArray(res) ? res : []);
        setPois(items);
      })
      .catch((err) => {
        console.warn('Unable to load POI filter list:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch translations based on 3-tier filters
  const loadTranslations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getTranslations({
        poiId: selectedPoiId,
        languageId: selectedLanguageId,
        status: selectedStatus,
        page: 1,
        size: 50,
      });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setTranslations(items);
      setEditDrafts({});
    } catch (err) {
      setError(err?.message || 'Failed to load translations for audit.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPoiId, selectedLanguageId, selectedStatus]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  // Handlers for side-by-side editing
  const handleFieldChange = (stranId, field, value, originalItem) => {
    setEditDrafts((prev) => {
      const currentDraft = prev[stranId] || {
        title: originalItem.title,
        short_description: originalItem.short_description || '',
        description: originalItem.description || '',
      };
      return {
        ...prev,
        [stranId]: {
          ...currentDraft,
          [field]: value,
        },
      };
    });
  };

  const isRowModified = (item) => {
    const draft = editDrafts[item.stran_id];
    if (!draft) return false;
    return (
      draft.title !== item.title ||
      draft.short_description !== (item.short_description || '') ||
      draft.description !== (item.description || '')
    );
  };

  const handleSaveTranslation = async (item) => {
    const draft = editDrafts[item.stran_id];
    if (!draft) return;

    setSavingRows((prev) => ({ ...prev, [item.stran_id]: true }));
    setNotification(null);

    try {
      const updated = await updateTranslation(item.stran_id, {
        title: draft.title,
        short_description: draft.short_description,
        description: draft.description,
      });

      setTranslations((prev) =>
        prev.map((t) => (t.stran_id === item.stran_id ? updated : t))
      );

      setEditDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.stran_id];
        return copy;
      });

      setNotification({
        type: 'success',
        message: `Saved '${draft.title}'. Status updated to 'Audio Needs Update'.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to save translation.',
      });
    } finally {
      setSavingRows((prev) => ({ ...prev, [item.stran_id]: false }));
    }
  };

  const handleAudioRegenerated = (translationId, result) => {
    setTranslations((prev) =>
      prev.flatMap((item) => {
        if (item.stran_id !== translationId) return [item];
        if (selectedStatus && selectedStatus !== result.status) return [];
        return [
          {
            ...item,
            audio_url: result.audio_url,
            audio_status: result.audio_status,
            status: result.status,
          },
        ];
      })
    );
    setNotification({
      type: 'success',
      message: 'Audio Guide regenerated successfully. Translation is ready for review.',
    });
  };

  const handleAudioRegenerationError = (errorMessage) => {
    setNotification({ type: 'error', message: errorMessage });
  };

  const handlePublishTranslation = async (item) => {
    setPublishingRows((prev) => ({ ...prev, [item.stran_id]: true }));
    setNotification(null);

    try {
      const published = await publishTranslation(item.stran_id);

      setTranslations((prev) =>
        prev.flatMap((t) => {
          if (t.stran_id !== item.stran_id) return [t];
          if (selectedStatus && selectedStatus !== 'PUBLISHED') return [];
          return [
            {
              ...t,
              status: published.status || 'PUBLISHED',
              audio_status: published.audio_status || t.audio_status,
              audio_url: published.audio_url || t.audio_url,
              review_by: published.review_by || t.review_by,
              review_at: published.review_at || t.review_at,
            },
          ];
        })
      );

      setNotification({
        type: 'success',
        message: `Published '${item.title}' successfully. Now live for visitors.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to publish translation.',
      });
    } finally {
      setPublishingRows((prev) => ({ ...prev, [item.stran_id]: false }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Multilingual Translation Audit & Historical Terminology Refinement
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review and refine translations against source Vietnamese, preview narrations,
          and regenerate audio to maintain strict audio-text synchronization (US 04.1–04.3).
        </p>
      </div>

      {/* Global Notifications */}
      {notification && (
        <div
          data-testid="audit-notification"
          role={notification.type === 'error' ? 'alert' : 'status'}
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed right-4 top-4 z-50 max-w-md rounded-md border p-3 text-sm shadow-lg ${
            notification.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* AC-04.1.2: 3-Tier Filter Bar */}
      <div
        data-testid="translation-filter-bar"
        className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"
      >
        {/* Tier 1: Exhibit / POI Filter */}
        <div>
          <label htmlFor="filter-poi" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            1. Exhibit (POI)
          </label>
          <select
            id="filter-poi"
            data-testid="filter-poi"
            value={selectedPoiId}
            onChange={(e) => setSelectedPoiId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none"
          >
            <option value="">All Exhibits (POIs)</option>
            {pois.map((poi) => (
              <option key={poi.poi_id} value={poi.poi_id}>
                {poi.title} ({poi.poi_id})
              </option>
            ))}
          </select>
        </div>

        {/* Tier 2: Target Language Filter */}
        <div>
          <label htmlFor="filter-language" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            2. Target Language
          </label>
          <select
            id="filter-language"
            data-testid="filter-language"
            value={selectedLanguageId}
            onChange={(e) => setSelectedLanguageId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none"
          >
            <option value="">All Target Languages</option>
            {DEFAULT_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tier 3: Review Status Filter */}
        <div>
          <label htmlFor="filter-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            3. Review Status
          </label>
          <select
            id="filter-status"
            data-testid="filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div data-testid="loading-state" className="mt-8 text-center py-12 text-sm text-slate-500">
          Loading translations for audit...
        </div>
      )}

      {error && (
        <div data-testid="error-state" className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && translations.length === 0 && (
        <div data-testid="empty-state" className="mt-8 rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No translations match the selected criteria.
        </div>
      )}

      {/* Translation Comparison List */}
      {!isLoading && !error && translations.length > 0 && (
        <div className="mt-6 space-y-6">
          {translations.map((item) => {
            const isModified = isRowModified(item);
            const draft = editDrafts[item.stran_id] || {
              title: item.title,
              short_description: item.short_description || '',
              description: item.description || '',
            };
            const isSaving = savingRows[item.stran_id] || false;
            const isPublishing = publishingRows[item.stran_id] || false;
            const effectiveStatus = isModified ? 'NEEDS_UPDATE' : item.status;
            const isPublishLocked =
              effectiveStatus === 'NEEDS_UPDATE' ||
              effectiveStatus === 'PENDING' ||
              item.audio_status !== 'READY';

            return (
              <div
                key={item.stran_id}
                data-testid={`translation-row-${item.stran_id}`}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                {/* Row Header Bar */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {item.poi_title || item.poi_id}
                    </span>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                      {item.language_name || item.language_id.toUpperCase()}
                    </span>
                  </div>

                  {/* Audio Sync Badge & Lock Indicator (AC-04.1.3 & TSK-04.1.3) */}
                  <div className="flex items-center gap-2">
                    <AudioSyncBadge
                      status={item.status}
                      audioStatus={item.audio_status}
                      isEdited={isModified}
                      showLock={true}
                    />
                  </div>
                </div>

                {/* AC-04.1.1: 2-Column Comparison Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {/* Left Column: Read-Only Vietnamese Source Text (background #F8FAFC) */}
                  <div className="bg-slate-50 p-4 sm:p-6" data-testid="source-column">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Source (Vietnamese)
                      </span>
                      <span className="text-xs text-slate-400">Read-Only</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Title</label>
                        <div
                          data-testid="source-title"
                          className="mt-1 rounded-md border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800"
                        >
                          {item.source_title || '—'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600">Summary (Short Description)</label>
                        <div
                          data-testid="source-short-desc"
                          className="mt-1 rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 whitespace-pre-wrap"
                        >
                          {item.source_short_description || '—'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600">Detailed Narration</label>
                        <div
                          data-testid="source-desc"
                          className="mt-1 rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed"
                        >
                          {item.source_description || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Editable Target Language Textarea (background #FFFFFF) */}
                  <div className="bg-white p-4 sm:p-6" data-testid="target-column">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Target Translation ({item.language_id.toUpperCase()})
                      </span>
                      {isModified && (
                        <span className="text-xs font-medium text-amber-700">Unsaved Edits</span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Translated Title</label>
                        <input
                          type="text"
                          data-testid={`target-title-input-${item.stran_id}`}
                          value={draft.title}
                          onChange={(e) =>
                            handleFieldChange(item.stran_id, 'title', e.target.value, item)
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600">Summary (Short Description)</label>
                        <textarea
                          rows={2}
                          data-testid={`target-short-desc-input-${item.stran_id}`}
                          value={draft.short_description}
                          onChange={(e) =>
                            handleFieldChange(item.stran_id, 'short_description', e.target.value, item)
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600">Detailed Historical Narration</label>
                        <textarea
                          rows={4}
                          data-testid={`target-desc-input-${item.stran_id}`}
                          value={draft.description}
                          onChange={(e) =>
                            handleFieldChange(item.stran_id, 'description', e.target.value, item)
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none leading-relaxed"
                        />
                      </div>
                      <AudioAuditPlayer
                        key={`${item.stran_id}-${item.audio_url || 'missing'}`}
                        translationId={item.stran_id}
                        audioUrl={item.audio_url}
                      />
                    </div>
                  </div>
                </div>

                {/* Row Action Footer */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                  <div className="text-xs text-slate-500">
                    StranID: <span className="font-mono text-slate-700">{item.stran_id}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <RegenerateAudioButton
                      translationId={item.stran_id}
                      status={effectiveStatus}
                      hasAudio={Boolean(item.audio_url)}
                      onRegenerated={(result) =>
                        handleAudioRegenerated(item.stran_id, result)
                      }
                      onError={handleAudioRegenerationError}
                    />
                    {/* Save Draft Button */}
                    <button
                      type="button"
                      data-testid={`save-btn-${item.stran_id}`}
                      onClick={() => handleSaveTranslation(item)}
                      disabled={!isModified || isSaving}
                      className={`inline-flex items-center rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm ${
                        isModified && !isSaving
                          ? 'bg-slate-800 text-white hover:bg-slate-700'
                          : 'cursor-not-allowed bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>

                    {/* Publishing remains locked until the translation and audio are in sync (US 04.3). */}
                    <button
                      type="button"
                      data-testid={`publish-btn-${item.stran_id}`}
                      onClick={() => handlePublishTranslation(item)}
                      disabled={isPublishLocked || isPublishing}
                      className={`inline-flex items-center rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm ${
                        !isPublishLocked && !isPublishing
                          ? 'bg-green-700 text-white hover:bg-green-800'
                          : 'cursor-not-allowed bg-slate-200 text-slate-400 opacity-50'
                      }`}
                      title={
                        isPublishLocked
                          ? 'Publishing locked: Narration audio must be regenerated after text edits.'
                          : 'Approve and publish translation to visitors'
                      }
                    >
                      {isPublishing
                        ? 'Publishing...'
                        : isPublishLocked
                        ? '🔒 Publish Locked'
                        : 'Approve & Publish'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
