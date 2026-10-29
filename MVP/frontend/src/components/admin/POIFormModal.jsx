// =============================================================================
// POI EDIT FORM MODAL (US 03.4 - TSK-03.4.2)
// -----------------------------------------------------------------------------
// Interactive modal for editing exhibit metadata, Vietnamese narrative,
// geofence coordinates, radius, and cover image.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import AdminMapPicker from './AdminMapPicker.jsx';
import { updatePoi, uploadPoiImage } from '../../api/poiApi.js';
import { isWithinMuseumBounds } from '../../utils/museumBounds.js';

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
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setFormError('');
      setSuccessToast('');
    }
  }, [poi]);

  const isOutOfBounds = useMemo(
    () => !isWithinMuseumBounds(latitude, longitude),
    [latitude, longitude],
  );

  if (!isOpen || !poi) {
    return null;
  }

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        setFormError('Image size exceeds maximum limit of 5MB.');
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  const handleMapPickerChange = ({
    latitude: nextLatitude,
    longitude: nextLongitude,
    radius: nextRadius,
  }) => {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setRadius(nextRadius);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessToast('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Exhibit title is required.');
      return;
    }

    if (isOutOfBounds) {
      setFormError('Tọa độ không hợp lệ (Vĩ độ: [-90, 90], Kinh độ: [-180, 180]).');
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
        image_url: finalImageUrl || undefined,
        latitude,
        longitude,
        radius,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        await updatePoi(poiId, payload);
      }

      setSuccessToast('Exhibit updated successfully!');
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
      setFormError(error?.message || 'Failed to update exhibit profile.');
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
            Edit Exhibit Details & Geofence
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
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
              Exhibit Title (Vietnamese) *
            </label>
            <input
              id="edit-poi-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Bếp Hoàng Cầm, Địa đạo Bến Dược"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-poi-short-desc"
              className="block text-xs font-medium text-slate-700"
            >
              Free Teaser Summary (Displayed on visitor preview cards)
            </label>
            <textarea
              id="edit-poi-short-desc"
              rows={2}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary shown on map bottom sheet..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-poi-full-desc"
              className="block text-xs font-medium text-slate-700"
            >
              Detailed Historical Narration Content (Unlocked audio/text narration)
            </label>
            <textarea
              id="edit-poi-full-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full historical narration..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-amber-700">
              Notice: Editing narrative content automatically flags linked foreign translations as &quot;Needs Update&quot;.
            </p>
          </div>

          {/* Interactive Geofence Calibration Map */}
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Geofence Calibration (Pin & Radius: 10m–50m)
            </span>
            <AdminMapPicker
              key={poi.poi_id || poi.id}
              poiId={poi.poi_id || poi.id}
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialRadius={radius}
              onChange={handleMapPickerChange}
            />
          </div>

          {/* Cover Photo Dropzone & Preview */}
          <div>
            <label
              htmlFor="edit-poi-image"
              className="block text-xs font-medium text-slate-700"
            >
              Cover Photo (JPG, PNG, WebP &lt; 5MB)
            </label>
            <input
              id="edit-poi-image"
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
                <span className="text-[11px] text-slate-500">Current Cover Photo</span>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOutOfBounds}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
