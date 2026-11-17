// =============================================================================
// TIER 1 - ADMIN GEOFENCE CALIBRATION PAGE (US 03.2)
// -----------------------------------------------------------------------------
// Host screen for the reusable `AdminMapPicker`. Reached from two route paths
// (`/admin/geofence` and `/admin/pois/:id/geofence`) and therefore reads the
// optional `:id` route param to pre-select the exhibit being calibrated.
//
// Persistence goes through `src/api/adminPoiApi.js` (Tier 3) using the shared
// `PUT /api/v1/admin/pois/{poi_id}` endpoint that the exhibit editor of
// US 03.4 will reuse; the presentation layer never calls fetch/axios directly.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminMapPicker from '../../components/admin/AdminMapPicker.jsx';
import { getMapPois } from '../../api/poiApi.js';
import { updatePoi } from '../../api/adminPoiApi.js';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

const LOAD_ERROR_MESSAGE = ADMIN_TRANSLATIONS.geofenceLoadError;
const SAVE_ERROR_MESSAGE = ADMIN_TRANSLATIONS.geofenceSaveError;
const SAVE_SUCCESS_MESSAGE = ADMIN_TRANSLATIONS.geofenceSavedSuccess;

export default function GeofenceCalibPage() {
  const { id: routePoiId } = useParams();

  const [pois, setPois] = useState([]);
  const [selectedPoiId, setSelectedPoiId] = useState(routePoiId ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    getMapPois()
      .then((items) => {
        if (!isActive) {
          return;
        }
        setPois(items);
        setLoadError('');
      })
      .catch(() => {
        if (isActive) {
          setLoadError(LOAD_ERROR_MESSAGE);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const selectedPoi = useMemo(
    () => pois.find((poi) => poi.id === selectedPoiId) ?? null,
    [pois, selectedPoiId],
  );

  const handleSelectPoi = (event) => {
    setSelectedPoiId(event.target.value);
    setSaveError('');
    setSaveMessage('');
  };

  const handleSave = async ({ poiId, latitude, longitude, radius }) => {
    setIsSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const updatedPoi = await updatePoi(poiId, { latitude, longitude, radius });
      setPois((currentPois) =>
        currentPois.map((poi) => (poi.id === updatedPoi.id ? { ...poi, ...updatedPoi } : poi)),
      );
      setSaveMessage(SAVE_SUCCESS_MESSAGE);
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">{ADMIN_TRANSLATIONS.geofenceCalibTitle}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {ADMIN_TRANSLATIONS.geofenceCalibSubtitle}
      </p>

      {isLoading && (
        <p role="status" className="mt-6 text-sm text-slate-600">
          {ADMIN_TRANSLATIONS.loadingExhibits}
        </p>
      )}

      {loadError && (
        <p role="alert" className="mt-6 text-sm font-medium text-[#B91C1C]">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && (
        <div className="mt-6 flex flex-col gap-6">
          <label className="flex max-w-md flex-col gap-1 text-sm font-medium text-slate-700">
            {ADMIN_TRANSLATIONS.labelExhibitSelect}
            <select
              value={selectedPoiId}
              onChange={handleSelectPoi}
              aria-label={ADMIN_TRANSLATIONS.labelExhibitSelect}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">{ADMIN_TRANSLATIONS.selectExhibitPrompt}</option>
              {pois.map((poi) => (
                <option key={poi.id} value={poi.id}>
                  {poi.title}
                </option>
              ))}
            </select>
          </label>

          {selectedPoi ? (
            <AdminMapPicker
              key={selectedPoi.id}
              poiId={selectedPoi.id}
              initialLatitude={selectedPoi.latitude}
              initialLongitude={selectedPoi.longitude}
              initialRadius={selectedPoi.trigger_radius}
              latitudeLabel={ADMIN_TRANSLATIONS.latitude}
              longitudeLabel={ADMIN_TRANSLATIONS.longitude}
              radiusLabel={ADMIN_TRANSLATIONS.triggerRadius}
              outOfBoundsMessage={ADMIN_TRANSLATIONS.outOfBoundsError}
              isSaving={isSaving}
              onSave={handleSave}
            />
          ) : (
            <p className="text-sm text-slate-600">
              {ADMIN_TRANSLATIONS.selectExhibitHint}
            </p>
          )}

          {saveError && (
            <p role="alert" className="text-sm font-medium text-[#B91C1C]">
              {saveError}
            </p>
          )}
          {saveMessage && (
            <p role="status" className="text-sm font-medium text-green-700">
              {saveMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
