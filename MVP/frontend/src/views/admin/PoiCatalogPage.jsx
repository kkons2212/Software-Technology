import { useEffect, useRef, useState } from 'react';
import { getPois, createPoi, togglePoiVisibility, retryPoiTranslations } from '../../api/poiApi.js';
import DeactivateConfirmModal from '../../components/admin/DeactivateConfirmModal.jsx';
import AdminMapPicker from '../../components/admin/AdminMapPicker.jsx';
import POIFormModal from '../../components/admin/POIFormModal.jsx';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

function isOutOfBounds(lat, lng) {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return true;
  return (
    numLat < -90 ||
    numLat > 90 ||
    numLng < -180 ||
    numLng > 180
  );
}

export default function PoiCatalogPage() {
  const [pois, setPois] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState(null);
  const [deactivatingPoi, setDeactivatingPoi] = useState(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [retryingPoiIds, setRetryingPoiIds] = useState({});

  // Form State
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('11.1432');
  const [longitude, setLongitude] = useState('106.4631');
  const [radius, setRadius] = useState(30);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapValid, setIsMapValid] = useState(true);

  const fetchCatalog = async (searchTerm = '') => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getPois({ page: 1, size: 50, search: searchTerm });
      setPois(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err?.message || ADMIN_TRANSLATIONS.errorLoadCatalogFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenDeactivateModal = (poi) => {
    setDeactivatingPoi(poi);
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmVisibilityToggle = async () => {
    if (!deactivatingPoi) return;
    setIsTogglingVisibility(true);
    setError('');
    const newActiveState = deactivatingPoi.is_active === false;
    try {
      await togglePoiVisibility(deactivatingPoi.poi_id, newActiveState);
      setPois((prev) =>
        prev.map((item) =>
          item.poi_id === deactivatingPoi.poi_id
            ? { ...item, is_active: newActiveState }
            : item
        )
      );
      setSuccessMessage(
        newActiveState
          ? ADMIN_TRANSLATIONS.successReactivatedMsg.replace('{title}', deactivatingPoi.title)
          : ADMIN_TRANSLATIONS.successHiddenMsg.replace('{title}', deactivatingPoi.title)
      );
      setIsDeactivateModalOpen(false);
      setDeactivatingPoi(null);
    } catch (err) {
      setError(err?.message || ADMIN_TRANSLATIONS.errorUpdatePoiFailed);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleRetryTranslations = async (poi) => {
    setRetryingPoiIds((prev) => ({ ...prev, [poi.poi_id]: true }));
    setError('');
    try {
      const res = await retryPoiTranslations(poi.poi_id, true);
      const queuedCount = res?.queued_languages?.length || 0;
      setSuccessMessage(
        queuedCount > 0
          ? `Đã đưa ${queuedCount} bản dịch lỗi của "${poi.title}" vào hàng đợi dịch lại!`
          : `Không có bản dịch nào bị lỗi cần dịch lại.`
      );
      setPois((prev) =>
        prev.map((item) => {
          if (item.poi_id !== poi.poi_id) return item;
          const updatedTranslations = (item.translations || []).map((t) =>
            t.status === 'FAILED' ? { ...t, status: 'PENDING' } : t
          );
          return { ...item, translations: updatedTranslations };
        })
      );
    } catch (err) {
      setError(err?.message || 'Không thể thử lại dịch thuật lúc này.');
    } finally {
      setRetryingPoiIds((prev) => ({ ...prev, [poi.poi_id]: false }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError(ADMIN_TRANSLATIONS.errorImageTooLarge);
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError(ADMIN_TRANSLATIONS.errorTitleRequired);
      return;
    }

    if (coordinateInvalid) {
      setFormError(ADMIN_TRANSLATIONS.errorInvalidCoordinates);
      return;
    }

    setIsSubmitting(true);
    try {
      await createPoi(
        {
          title: title.trim(),
          short_description: shortDescription.trim() || undefined,
          description: description.trim() || undefined,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius, 10),
        },
        selectedImage
      );

      // Reset form
      setTitle('');
      setShortDescription('');
      setDescription('');
      setLatitude('11.1432');
      setLongitude('106.4631');
      setRadius(30);
      setSelectedImage(null);
      setImagePreview('');
      setIsModalOpen(false);

      // Refresh list
      fetchCatalog(search);
    } catch (err) {
      setFormError(err?.message || ADMIN_TRANSLATIONS.errorCreatePoiFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const coordinateInvalid = !isMapValid || isOutOfBounds(latitude, longitude);

  return (
    <div className="min-h-screen bg-slate-50">

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page Heading & Actions Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {ADMIN_TRANSLATIONS.poiCatalogTitle}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {ADMIN_TRANSLATIONS.poiCatalogSubtitle}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="search"
              placeholder={ADMIN_TRANSLATIONS.searchPoisPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={ADMIN_TRANSLATIONS.searchPoisAriaLabel}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-md bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none"
            >
              {ADMIN_TRANSLATIONS.newExhibitButton}
            </button>
          </div>
        </div>

        {/* Global Success Banner */}
        {successMessage && (
          <div role="status" className="mt-4 flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="ml-2 font-semibold text-green-800 hover:text-green-950"
            >
              ×
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Catalog Data Table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs" aria-label={ADMIN_TRANSLATIONS.exhibitsTableAriaLabel}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
                <th scope="col" className="px-4 py-3">{ADMIN_TRANSLATIONS.colThumbnail}</th>
                <th scope="col" className="px-4 py-3">{ADMIN_TRANSLATIONS.colTitleOverview}</th>
                <th scope="col" className="px-4 py-3">{ADMIN_TRANSLATIONS.colStatus}</th>
                <th scope="col" className="px-4 py-3">{ADMIN_TRANSLATIONS.colTriggerRadius}</th>
                <th scope="col" className="px-4 py-3">{ADMIN_TRANSLATIONS.colCoordinates}</th>
                <th scope="col" className="px-4 py-3">{ADMIN_TRANSLATIONS.colLanguageStatus}</th>
                <th scope="col" className="px-4 py-3 text-right">{ADMIN_TRANSLATIONS.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {ADMIN_TRANSLATIONS.loadingExhibits}
                  </td>
                </tr>
              ) : pois.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {ADMIN_TRANSLATIONS.noExhibitsFound}
                  </td>
                </tr>
              ) : (
                pois.map((poi) => (
                  <tr key={poi.poi_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {poi.image_url ? (
                        <img
                          src={poi.image_url}
                          alt={poi.title}
                          className="h-12 w-12 rounded object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400 border border-slate-200">
                          {ADMIN_TRANSLATIONS.noPhoto}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{poi.title}</div>
                      {poi.short_description && (
                        <div className="mt-0.5 line-clamp-1 text-slate-500">{poi.short_description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${
                          poi.is_active !== false
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-slate-300 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {poi.is_active !== false ? ADMIN_TRANSLATIONS.statusActive : ADMIN_TRANSLATIONS.statusHidden}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-800 border border-slate-200">
                        {poi.radius}m
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {poi.latitude?.toFixed(4)}, {poi.longitude?.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {poi.translations && poi.translations.length > 0 ? (
                          poi.translations.map((t) => (
                            <span
                              key={t.language_id}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase border ${
                                t.status === 'PUBLISHED' || t.status === 'READY'
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : t.status === 'PENDING'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : t.status === 'DRAFT'
                                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : 'border-red-200 bg-red-50 text-red-700'
                              }`}
                            >
                              {t.language_id}: {t.status}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">{ADMIN_TRANSLATIONS.noneValue}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {poi.translations && poi.translations.some((t) => t.status === 'FAILED') && (
                          <button
                            type="button"
                            onClick={() => handleRetryTranslations(poi)}
                            disabled={retryingPoiIds[poi.poi_id]}
                            title="Thử lại dịch các ngôn ngữ bị lỗi"
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 disabled:opacity-50"
                          >
                            <svg
                              className={`h-3 w-3 ${retryingPoiIds[poi.poi_id] ? 'animate-spin' : ''}`}
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
                            <span>{retryingPoiIds[poi.poi_id] ? 'Đang gửi...' : 'Thử lại dịch'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingPoi(poi)}
                          className="rounded px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                        >
                          {ADMIN_TRANSLATIONS.btnEdit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeactivateModal(poi)}
                          className={`rounded px-2.5 py-1 text-xs font-medium border ${
                            poi.is_active !== false
                              ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                              : 'text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {poi.is_active !== false ? ADMIN_TRANSLATIONS.btnHide : ADMIN_TRANSLATIONS.btnShow}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
            <span>Hiển thị {pois.length} trên tổng số {total} điểm di tích</span>
          </div>
        </div>
      </main>

      {/* Creation Modal / Form Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
            <h2 id="modal-headline" className="text-base font-bold text-slate-900">
              {ADMIN_TRANSLATIONS.createExhibitTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {ADMIN_TRANSLATIONS.createExhibitSubtitle}
            </p>

            {formError && (
              <div role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="poi-title" className="block text-xs font-medium text-slate-700">
                  {ADMIN_TRANSLATIONS.fieldTitle}
                </label>
                <input
                  id="poi-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={ADMIN_TRANSLATIONS.fieldTitlePlaceholder}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="poi-short-desc" className="block text-xs font-medium text-slate-700">
                  {ADMIN_TRANSLATIONS.fieldShortDesc}
                </label>
                <textarea
                  id="poi-short-desc"
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder={ADMIN_TRANSLATIONS.fieldShortDescPlaceholder}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="poi-full-desc" className="block text-xs font-medium text-slate-700">
                  {ADMIN_TRANSLATIONS.fieldFullDesc}
                </label>
                <textarea
                  id="poi-full-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={ADMIN_TRANSLATIONS.fieldFullDescPlaceholder}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1">
                  {ADMIN_TRANSLATIONS.interactiveGeofenceTitle}
                </span>
                <AdminMapPicker
                  poiId="new-exhibit-picker"
                  initialLatitude={Number.isFinite(parseFloat(latitude)) ? parseFloat(latitude) : 11.1432}
                  initialLongitude={Number.isFinite(parseFloat(longitude)) ? parseFloat(longitude) : 106.4631}
                  initialRadius={radius}
                  latitudeLabel={ADMIN_TRANSLATIONS.latitude}
                  longitudeLabel={ADMIN_TRANSLATIONS.longitude}
                  radiusLabel={ADMIN_TRANSLATIONS.triggerRadius}
                  outOfBoundsMessage={ADMIN_TRANSLATIONS.outOfBoundsError}
                  onChange={({ latitude: nextLat, longitude: nextLng, radius: nextRad, isValid }) => {
                    setLatitude(Number.isFinite(nextLat) ? String(nextLat) : 'invalid');
                    setLongitude(Number.isFinite(nextLng) ? String(nextLng) : 'invalid');
                    setRadius(nextRad);
                    setIsMapValid(isValid !== false);
                  }}
                />
              </div>

              <div>
                <label htmlFor="poi-image" className="block text-xs font-medium text-slate-700">
                  {ADMIN_TRANSLATIONS.fieldCoverPhoto}
                </label>
                <input
                  id="poi-image"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
                {imagePreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      data-testid="add-poi-image-preview"
                      className="h-20 w-32 rounded object-cover border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      data-testid="btn-remove-selected-image"
                      className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 flex items-center gap-1"
                    >
                      <span>✕</span> {ADMIN_TRANSLATIONS.btnRemovePhoto}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {ADMIN_TRANSLATIONS.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || coordinateInvalid}
                  className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSubmitting ? ADMIN_TRANSLATIONS.btnCreating : ADMIN_TRANSLATIONS.btnSaveAndDigitize}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POI Edit Form Modal (US 03.4) */}
      <POIFormModal
        isOpen={Boolean(editingPoi)}
        poi={editingPoi}
        onClose={() => setEditingPoi(null)}
        onSuccess={() => {
          setEditingPoi(null);
          fetchCatalog(search);
        }}
      />

      {/* Deactivate / Hide Exhibit Confirmation Modal (US 03.3) */}
      <DeactivateConfirmModal
        isOpen={isDeactivateModalOpen}
        poi={deactivatingPoi}
        isLoading={isTogglingVisibility}
        onConfirm={handleConfirmVisibilityToggle}
        onClose={() => {
          if (!isTogglingVisibility) {
            setIsDeactivateModalOpen(false);
            setDeactivatingPoi(null);
          }
        }}
      />
    </div>
  );
}
