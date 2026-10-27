import { useCallback, useEffect, useState } from 'react';
import { getTranslations, updateTranslation } from '../../api/translationApi.js';
import { getPois } from '../../api/poiApi.js';
import AudioSyncBadge from '../../components/admin/AudioSyncBadge.jsx';

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
  { value: 'PENDING', label: 'Processing AI' },
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

  // Handle keystroke edits in target textareas (AC-04.1.3)
  const handleFieldChange = (item, field, value) => {
    const currentDraft = editDrafts[item.stran_id] || {
      title: item.title,
      short_description: item.short_description || '',
      description: item.description || '',
    };

    setEditDrafts((prev) => ({
      ...prev,
      [item.stran_id]: {
        ...currentDraft,
        [field]: value,
      },
    }));
  };

  // Determine if a row has uncommitted text modifications
  const isRowModified = (item) => {
    const draft = editDrafts[item.stran_id];
    if (!draft) return false;
    return (
      draft.title !== item.title ||
      (draft.short_description || '') !== (item.short_description || '') ||
      (draft.description || '') !== (item.description || '')
    );
  };

  // Save modified text (transitions status to NEEDS_UPDATE)
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Multilingual Translation Audit & Historical Terminology Refinement
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Side-by-side linguistic audit (US 04.1). Review machine translations against source Vietnamese,
          refine historical terms, and maintain strict audio-text synchronization.
        </p>
      </div>

      {/* Global Notifications */}
      {notification && (
        <div
          data-testid="audit-notification"
          className={`mt-4 rounded-md border p-3 text-sm ${
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
            const effectiveStatus = isModified ? 'NEEDS_UPDATE' : item.status;
            const isPublishLocked = effectiveStatus === 'NEEDS_UPDATE' || effectiveStatus === 'PENDING';

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
                        <label htmlFor={`target-title-${item.stran_id}`} className="block text-xs font-medium text-slate-700">
                          Translated Title
                        </label>
                        <input
                          id={`target-title-${item.stran_id}`}
                          data-testid={`target-title-input-${item.stran_id}`}
                          type="text"
                          value={draft.title}
                          onChange={(e) => handleFieldChange(item, 'title', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor={`target-short-${item.stran_id}`} className="block text-xs font-medium text-slate-700">
                          Summary (Short Description)
                        </label>
                        <textarea
                          id={`target-short-${item.stran_id}`}
                          data-testid={`target-short-input-${item.stran_id}`}
                          rows={2}
                          value={draft.short_description}
                          onChange={(e) => handleFieldChange(item, 'short_description', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 shadow-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor={`target-desc-${item.stran_id}`} className="block text-xs font-medium text-slate-700">
                          Detailed Historical Narration
                        </label>
                        <textarea
                          id={`target-desc-${item.stran_id}`}
                          data-testid={`target-desc-input-${item.stran_id}`}
                          rows={5}
                          value={draft.description}
                          onChange={(e) => handleFieldChange(item, 'description', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 shadow-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row Action Footer */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                  <div className="text-xs text-slate-500">
                    StranID: <span className="font-mono text-slate-700">{item.stran_id}</span>
                  </div>

                  <div className="flex items-center gap-3">
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

                    {/* AC-04.1.3: Approve & Publish Button (Locked when NEEDS_UPDATE or isModified) */}
                    <button
                      type="button"
                      data-testid={`publish-btn-${item.stran_id}`}
                      disabled={isPublishLocked}
                      className={`inline-flex items-center rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm ${
                        !isPublishLocked
                          ? 'bg-green-700 text-white hover:bg-green-800'
                          : 'cursor-not-allowed bg-slate-200 text-slate-400 opacity-50'
                      }`}
                      title={
                        isPublishLocked
                          ? 'Publishing locked: Narration audio must be regenerated after text edits.'
                          : 'Approve and publish translation to visitors'
                      }
                    >
                      {isPublishLocked ? '🔒 Publish Locked' : 'Approve & Publish'}
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
