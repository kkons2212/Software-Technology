// =============================================================================
// POI EDIT FORM MODAL (US 03.4 - TSK-03.4.2)
// -----------------------------------------------------------------------------
// Interactive modal for editing exhibit metadata, Vietnamese narrative,
// geofence coordinates, radius, and cover image.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminMapPicker from './AdminMapPicker.jsx';
import { updatePoi, uploadPoiImage } from '../../api/poiApi.js';
import { isWithinMuseumBounds } from '../../utils/museumBounds.js';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * POI Edit Form Modal
 *
 * @param {object} props
 * @param {boolean} props.isOpen whether modal is displayed
 * @param {object} props.poi exhibit object to edit
 * @param {() => void} props.onClose callback to close modal
 * @param {(updated: object) => void} [props.onSuccess] optional success callback
 * @param {(changes: object) => Promise<any>} [props.onSave] optional save override
 */
export default function POIFormModal({
  isOpen,
  poi,
  onClose,
  onSuccess,
  onSave,
}) {
  // Top-of-Scope Rule (dev_rules 1.4): Hooks declared at top of component
  const [title, setTitle] = useState(poi?.title || '');
  const [shortDescription, setShortDescription] = useState(
    poi?.short_description || '',
  );
  const [description, setDescription] = useState(poi?.description || '');
  const [latitude, setLatitude] = useState(
    typeof poi?.latitude === 'number'
      ? poi.latitude
      : parseFloat(poi?.latitude) || 11.1445,
  );
  const [longitude, setLongitude] = useState(
    typeof poi?.longitude === 'number'
      ? poi.longitude
      : parseFloat(poi?.longitude) || 106.4645,
  );
  const [radius, setRadius] = useState(
    typeof poi?.radius === 'number'
      ? poi.radius
      : parseInt(poi?.radius, 10) || 30,
  );
  const [imagePreview, setImagePreview] = useState(poi?.image_url || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const fileInputRef = useRef(null);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapValid, setIsMapValid] = useState(true);

  // Synchronize state from POI prop
  useEffect(() => {
    if (poi) {
      setTitle(poi.title || '');
      setShortDescription(poi.short_description || '');
      setDescription(poi.description || '');
      setLatitude(
        typeof poi.latitude === 'number'
          ? poi.latitude
          : parseFloat(poi.latitude) || 11.1445,
      );
      setLongitude(
        typeof poi.longitude === 'number'
          ? poi.longitude
          : parseFloat(poi.longitude) || 106.4645,
      );
      setRadius(
        typeof poi.radius === 'number'
          ? poi.radius
          : parseInt(poi.radius, 10) || 30,
      );
      setImagePreview(poi.image_url || '');
      setSelectedFile(null);
      setIsPhotoRemoved(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFormError('');
      setSuccessToast('');
    }
  }, [poi]);

  const isOutOfBounds = useMemo(
    () => !isMapValid || !isWithinMuseumBounds(latitude, longitude),
    [isMapValid, latitude, longitude],
  );

  if (!isOpen || !poi) {
    return null;
  }

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        setFormError(ADMIN_TRANSLATIONS.errorImageTooLarge);
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setIsPhotoRemoved(false);
      setFormError('');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setImagePreview('');
    setIsPhotoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMapPickerChange = ({
    latitude: nextLatitude,
    longitude: nextLongitude,
    radius: nextRadius,
    isValid,
  }) => {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setRadius(nextRadius);
    setIsMapValid(isValid !== false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessToast('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError(ADMIN_TRANSLATIONS.errorTitleRequired);
      return;
    }

    if (isOutOfBounds) {
      setFormError(ADMIN_TRANSLATIONS.errorInvalidCoordinates);
      return;
    }

    setIsSubmitting(true);
    try {
      const poiId = poi.poi_id || poi.id;
      let finalImageUrl = imagePreview;

      if (selectedFile) {
        finalImageUrl = await uploadPoiImage(selectedFile);
      }

      const payload = {
        title: trimmedTitle,
        short_description: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        image_url: isPhotoRemoved ? '' : (finalImageUrl || undefined),
        latitude,
        longitude,
        radius,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        await updatePoi(poiId, payload);
      }

      setSuccessToast(ADMIN_TRANSLATIONS.successUpdatePoi);
      if (onSuccess) {
        onSuccess(payload);
      }
      setTimeout(() => {
        setSuccessToast('');
        if (onClose) {
          onClose();
        }
      }, 800);
    } catch (error) {
      setFormError(error?.message || ADMIN_TRANSLATIONS.errorUpdatePoiFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-poi-headline"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 id="edit-poi-headline" className="text-base font-bold text-slate-900">
            {ADMIN_TRANSLATIONS.editExhibitTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={ADMIN_TRANSLATIONS.closeModal || 'Đóng cửa sổ'}
            className="rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alerts */}
        {formError && (
          <div
            role="alert"
            className="mt-3 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
          >
            {formError}
          </div>
        )}

        {successToast && (
          <div
            role="status"
            data-testid="success-toast"
            className="mt-3 rounded border border-green-200 bg-green-50 p-2.5 text-xs font-semibold text-green-700"
          >
            {successToast}
          </div>
        )}

        {/* Edit Form */}
        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="edit-poi-title"
              className="block text-xs font-medium text-slate-700"
            >
              {ADMIN_TRANSLATIONS.fieldTitle}
            </label>
            <input
              id="edit-poi-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ADMIN_TRANSLATIONS.fieldTitlePlaceholder}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-poi-short-desc"
              className="block text-xs font-medium text-slate-700"
            >
              {ADMIN_TRANSLATIONS.fieldShortDesc}
            </label>
            <textarea
              id="edit-poi-short-desc"
              rows={2}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder={ADMIN_TRANSLATIONS.fieldShortDescPlaceholder}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-poi-full-desc"
              className="block text-xs font-medium text-slate-700"
            >
              {ADMIN_TRANSLATIONS.fieldFullDesc}
            </label>
            <textarea
              id="edit-poi-full-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ADMIN_TRANSLATIONS.fieldFullDescPlaceholder}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-amber-700">
              {ADMIN_TRANSLATIONS.editNarrativeNotice}
            </p>
          </div>

          {/* Interactive Geofence Calibration Map */}
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1">
              {ADMIN_TRANSLATIONS.interactiveGeofenceTitle}
            </span>
            <AdminMapPicker
              key={poi.poi_id || poi.id}
              poiId={poi.poi_id || poi.id}
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialRadius={radius}
              latitudeLabel={ADMIN_TRANSLATIONS.latitude}
              longitudeLabel={ADMIN_TRANSLATIONS.longitude}
              radiusLabel={ADMIN_TRANSLATIONS.triggerRadius}
              outOfBoundsMessage={ADMIN_TRANSLATIONS.outOfBoundsError}
              onChange={handleMapPickerChange}
            />
          </div>

          {/* Cover Photo Dropzone & Preview */}
          <div>
            <label
              htmlFor="edit-poi-image"
              className="block text-xs font-medium text-slate-700"
            >
              {ADMIN_TRANSLATIONS.fieldCoverPhoto}
            </label>
            <input
              id="edit-poi-image"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileChange}
              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
            {imagePreview && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Exhibit cover preview"
                  data-testid="cover-image-preview"
                  className="h-20 w-32 rounded object-cover border border-slate-200"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-slate-500">
                    {ADMIN_TRANSLATIONS.currentCoverPhoto}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    data-testid="btn-remove-cover-photo"
                    className="w-fit rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 flex items-center gap-1"
                  >
                    <span>✕</span> {ADMIN_TRANSLATIONS.btnRemovePhoto}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {ADMIN_TRANSLATIONS.btnCancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOutOfBounds}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
            >
              {isSubmitting ? ADMIN_TRANSLATIONS.btnSaving : ADMIN_TRANSLATIONS.btnSaveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
