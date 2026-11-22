import { useCallback, useEffect, useState } from 'react';
import { getTranslations, updateTranslation, publishTranslation, retryTranslation } from '../../api/translationApi.js';
import { getPois } from '../../api/poiApi.js';
import { getSupportedLanguages } from '../../api/languageApi.js';
import AudioSyncBadge from '../../components/admin/AudioSyncBadge.jsx';
import AudioAuditPlayer from '../../components/admin/AudioAuditPlayer.jsx';
import RegenerateAudioButton from '../../components/admin/RegenerateAudioButton.jsx';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

const DEFAULT_LANGUAGES = [
  { id: 'en', name: 'English (en)' },
  { id: 'ja', name: 'Japanese (ja)' },
  { id: 'ko', name: 'Korean (ko)' },
  { id: 'zh', name: 'Chinese (zh)' },
];

const STATUS_OPTIONS = [
  { value: '', label: ADMIN_TRANSLATIONS.statusAllReview },
  { value: 'DRAFT', label: ADMIN_TRANSLATIONS.statusDraft },
  { value: 'NEEDS_UPDATE', label: ADMIN_TRANSLATIONS.statusNeedsUpdate },
  { value: 'PUBLISHED', label: ADMIN_TRANSLATIONS.statusPublished },
  { value: 'PENDING', label: ADMIN_TRANSLATIONS.statusPending },
];

export default function TranslationAuditView() {
  const [translations, setTranslations] = useState([]);
  const [pois, setPois] = useState([]);
  const [targetLanguages, setTargetLanguages] = useState(DEFAULT_LANGUAGES);
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
  const [retryingRows, setRetryingRows] = useState({});

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

  // 2. Fetch supported target languages dynamically from catalog
  useEffect(() => {
    let isMounted = true;
    getSupportedLanguages()
      .then((langs) => {
        if (!isMounted) return;
        const items = Array.isArray(langs) ? langs : [];
        const targets = items
          .filter((l) => l.code && l.code.toLowerCase() !== 'vi')
          .map((l) => ({
            id: l.code,
            name: `${l.name} (${l.code})`,
          }));
        if (targets.length > 0) {
          setTargetLanguages(targets);
        }
      })
      .catch((err) => {
        console.warn('Unable to load target languages filter list:', err);
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
      setError(err?.message || ADMIN_TRANSLATIONS.failedLoadTranslations);
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
        message: ADMIN_TRANSLATIONS.notificationSavedDraft.replace('{title}', draft.title),
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err?.message || ADMIN_TRANSLATIONS.notificationSaveError,
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
      message: ADMIN_TRANSLATIONS.notificationRegeneratedSuccess,
    });
  };

  const handleAudioRegenerationError = (errorMessage) => {
    setNotification({ type: 'error', message: errorMessage });
  };

  
  const handleRetryTranslation = async (item) => {
    setRetryingRows((prev) => ({ ...prev, [item.stran_id]: true }));
    setNotification(null);
    try {
      await retryTranslation(item.stran_id);
      setTranslations((prev) =>
        prev.map((t) => (t.stran_id === item.stran_id ? { ...t, status: 'PENDING' } : t))
      );
      setNotification({
        type: 'success',
        message: `Đã đưa bản dịch ${item.language_id?.toUpperCase()} của "${item.poi_title || item.poi_id}" vào hàng đợi dịch lại!`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err?.message || 'Không thể thử lại dịch thuật lúc này.',
      });
    } finally {
      setRetryingRows((prev) => ({ ...prev, [item.stran_id]: false }));
    }
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
        message: ADMIN_TRANSLATIONS.notificationPublishedSuccess.replace('{title}', item.title),
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err?.message || ADMIN_TRANSLATIONS.notificationPublishError,
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
          {ADMIN_TRANSLATIONS.translationAuditTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {ADMIN_TRANSLATIONS.translationAuditSubtitle}

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
            {ADMIN_TRANSLATIONS.filterPoiLabel}
          </label>
          <select
            id="filter-poi"
            data-testid="filter-poi"
            value={selectedPoiId}
            onChange={(e) => setSelectedPoiId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none"
          >
            <option value="">{ADMIN_TRANSLATIONS.filterPoiAll}</option>
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
            {ADMIN_TRANSLATIONS.filterLanguageLabel}
          </label>
          <select
            id="filter-language"
            data-testid="filter-language"
            value={selectedLanguageId}
            onChange={(e) => setSelectedLanguageId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none"
          >
            <option value="">{ADMIN_TRANSLATIONS.filterLanguageAll}</option>
            {targetLanguages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tier 3: Review Status Filter */}
        <div>
          <label htmlFor="filter-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {ADMIN_TRANSLATIONS.filterStatusLabel}
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
          {ADMIN_TRANSLATIONS.loadingTranslations}
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
          {ADMIN_TRANSLATIONS.noTranslationsFound}
        </div>
      )}

      {/* Translation Comparison List */}
      {!isLoading && !error && translations.length > 0 && (
        <div className="mt-6 space-y-6">
          {translations.map((item) => {
            const isSourceLanguage = Boolean(item.language_id && item.language_id.toLowerCase() === 'vi');
            const isModified = !isSourceLanguage && isRowModified(item);
            const draft = editDrafts[item.stran_id] || {
              title: item.title,
              short_description: item.short_description || '',
              description: item.description || '',
            };
            const isSaving = savingRows[item.stran_id] || false;
            const isPublishing = publishingRows[item.stran_id] || false;
            let effectiveStatus = item.status;
            if (isModified) {
              effectiveStatus = 'NEEDS_UPDATE';
            }
            const isPublishLocked =
              effectiveStatus === 'NEEDS_UPDATE' ||
              effectiveStatus === 'PENDING' ||
              item.audio_status !== 'READY';

            let saveBtnClass = 'cursor-not-allowed bg-slate-200 text-slate-400';
            if (isModified && !isSaving) {
              saveBtnClass = 'bg-slate-800 text-white hover:bg-slate-700';
            }

            let saveBtnText = ADMIN_TRANSLATIONS.btnSaveDraft;
            if (isSaving) {
              saveBtnText = ADMIN_TRANSLATIONS.btnSavingDraft;
            }

            let publishBtnClass = 'cursor-not-allowed bg-slate-200 text-slate-400 opacity-50';
            if (!isPublishLocked && !isPublishing) {
              publishBtnClass = 'bg-green-700 text-white hover:bg-green-800';
            }

            let publishTooltip = ADMIN_TRANSLATIONS.tooltipPublishLive;
            if (isPublishLocked) {
              publishTooltip = ADMIN_TRANSLATIONS.tooltipPublishLocked;
            }

            let publishBtnText = ADMIN_TRANSLATIONS.btnApproveAndPublish;
            if (isPublishLocked) {
              publishBtnText = ADMIN_TRANSLATIONS.btnPublishLocked;
            }
            if (isPublishing) {
              publishBtnText = ADMIN_TRANSLATIONS.btnPublishing;
            }

            let retryIconClass = 'h-3.5 w-3.5';
            if (retryingRows[item.stran_id]) {
              retryIconClass = 'h-3.5 w-3.5 animate-spin';
            }
            let retryText = 'Thử lại dịch';
            if (retryingRows[item.stran_id]) {
              retryText = 'Đang gửi...';
            }

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
                    {isSourceLanguage && (
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {ADMIN_TRANSLATIONS.badgeSourceVietnamese}
                      </span>
                    )}
                    {!isSourceLanguage && (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                        {item.language_name || item.language_id.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Audio Sync Badge & Lock Indicator (AC-04.1.3 & TSK-04.1.3) */}
                  <div className="flex items-center gap-2">
                    <AudioSyncBadge
                      status={item.status}
                      audioStatus={item.audio_status}
                      isEdited={isModified}
                      showLock={!isSourceLanguage}
                    />
                  </div>
                </div>

                {/* Dedicated Vietnamese Source Audio & Narrative Frame */}
                {isSourceLanguage && (
                  <div
                    data-testid="vietnamese-source-frame"
                    className="p-4 sm:p-6 bg-slate-50 space-y-6"
                  >
                    <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                          {ADMIN_TRANSLATIONS.frameVietnameseAudioTitle}
                        </span>
                        <span className="text-xs text-indigo-600 font-medium">
                          {ADMIN_TRANSLATIONS.colReadOnly}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        {ADMIN_TRANSLATIONS.frameVietnameseAudioNotice}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          {ADMIN_TRANSLATIONS.fieldSourceTitle}
                        </label>
                        <div
                          data-testid="source-title"
                          className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm font-semibold text-slate-800"
                        >
                          {item.title || item.source_title || '—'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          {ADMIN_TRANSLATIONS.fieldSourceShortDesc}
                        </label>
                        <div
                          data-testid="source-short-desc"
                          className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 whitespace-pre-wrap"
                        >
                          {item.short_description || item.source_short_description || '—'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          {ADMIN_TRANSLATIONS.fieldSourceDetailedNarration}
                        </label>
                        <div
                          data-testid="source-desc"
                          className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed"
                        >
                          {item.description || item.source_description || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {ADMIN_TRANSLATIONS.audioVietnameseHeader}
                        </span>
                        <AudioSyncBadge
                          status={item.status}
                          audioStatus={item.audio_status}
                          isEdited={false}
                          showLock={false}
                        />
                      </div>
                      <AudioAuditPlayer
                        key={`${item.stran_id}-${item.audio_url || 'missing'}`}
                        translationId={item.stran_id}
                        audioUrl={item.audio_url}
                      />
                    </div>
                  </div>
                )}

                {/* AC-04.1.1: 2-Column Comparison Layout */}
                {!isSourceLanguage && (
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    {/* Left Column: Read-Only Vietnamese Source Text (background #F8FAFC) */}
                    <div className="bg-slate-50 p-4 sm:p-6" data-testid="source-column">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {ADMIN_TRANSLATIONS.colSourceVietnamese}
                        </span>
                        <span className="text-xs text-slate-400">{ADMIN_TRANSLATIONS.colReadOnly}</span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600">{ADMIN_TRANSLATIONS.fieldSourceTitle}</label>
                          <div
                            data-testid="source-title"
                            className="mt-1 rounded-md border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800"
                          >
                            {item.source_title || '—'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600">{ADMIN_TRANSLATIONS.fieldSummaryShortDesc}</label>
                          <div
                            data-testid="source-short-desc"
                            className="mt-1 rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 whitespace-pre-wrap"
                          >
                            {item.source_short_description || '—'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600">{ADMIN_TRANSLATIONS.fieldSourceDetailedNarration}</label>
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
                          {ADMIN_TRANSLATIONS.colTargetLanguage.replace('{lang}', item.language_id.toUpperCase())}
                        </span>
                        {isModified && (
                          <span className="text-xs font-medium text-amber-700">{ADMIN_TRANSLATIONS.colUnsavedEdits}</span>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600">{ADMIN_TRANSLATIONS.fieldTranslatedTitle}</label>
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
                          <label className="block text-xs font-medium text-slate-600">{ADMIN_TRANSLATIONS.fieldSummaryShortDesc}</label>
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
                          <label className="block text-xs font-medium text-slate-600">{ADMIN_TRANSLATIONS.fieldDetailedNarration}</label>
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
                )}

                {/* Row Action Footer */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                  <div className="text-xs text-slate-500">
                    Mã bản dịch: <span className="font-mono text-slate-700">{item.stran_id}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isSourceLanguage && (
                      <button
                        type="button"
                        data-testid={`retry-btn-${item.stran_id}`}
                        onClick={() => handleRetryTranslation(item)}
                        disabled={retryingRows[item.stran_id]}
                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50"
                        title="Gửi lại bản dịch này vào hàng đợi tự động dịch"
                      >
                        <svg
                          className={retryIconClass}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {retryText}
                      </button>
                    )}
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
                    {!isSourceLanguage && (
                      <button
                        type="button"
                        data-testid={`save-btn-${item.stran_id}`}
                        onClick={() => handleSaveTranslation(item)}
                        disabled={!isModified || isSaving}
                        className={`inline-flex items-center rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm ${saveBtnClass}`}
                      >
                        {saveBtnText}
                      </button>
                    )}

                    {/* Publishing remains locked until the translation and audio are in sync (US 04.3). */}
                    {!isSourceLanguage && (
                      <button
                        type="button"
                        data-testid={`publish-btn-${item.stran_id}`}
                        onClick={() => handlePublishTranslation(item)}
                        disabled={isPublishLocked || isPublishing}
                        className={`inline-flex items-center rounded-md px-3.5 py-1.5 text-xs font-semibold shadow-sm ${publishBtnClass}`}
                        title={publishTooltip}
                      >
                        {publishBtnText}
                      </button>
                    )}
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
