import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VisitorMapView from './VisitorMapView.jsx';
import VisitorHeader from '../../components/visitor/VisitorHeader.jsx';
import PoiPreviewCard from '../../components/visitor/PoiPreviewCard.jsx';
import { getPublishedLanguages } from '../../api/languageApi.js';
import { getMapPois } from '../../api/poiApi.js';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext.jsx';
import { useGeofenceTrigger } from '../../hooks/useGeofenceTrigger.js';
import { reportPoiTrigger } from '../../api/telemetryApi.js';
import useGeolocation from '../../hooks/useGeolocation.js';

const PREFERRED_LANGUAGE_KEY = 'museum_preferred_lang';
const DEFAULT_LANGUAGE = 'vi';
const MILLISECONDS_PER_SECOND = 1000;

export default function VisitorTourPage({
  sessionCode = '',
  expiresAt = null,
  onUnlock,
}) {
  const { location, accuracy, errorMessage, hasLiveLocation } = useGeolocation();
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [languageError, setLanguageError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [pois, setPois] = useState([]);
  const [poiError, setPoiError] = useState('');
  const [poiRetryCount, setPoiRetryCount] = useState(0);
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const { currentPoi, isPlaying, completedPoiIds, play } = useAudioPlayer();
  // Dwell windows opened by a real geofence trigger, keyed by POI id. The
  // telemetry row is only reported once the visitor leaves the zone, because a
  // duration cannot be measured at the moment of entry.
  const dwellStartByPoiIdRef = useRef({});

  const handleProximityTrigger = useCallback((poi) => {
    play(poi);
    // The language is captured alongside the entry instant: the backend mints
    // the visitor session from this value, so it must be the visitor's choice at
    // the time the exhibit was actually triggered.
    dwellStartByPoiIdRef.current[String(poi.poi_id || poi.id)] = {
      startedAtMs: Date.now(),
      language: selectedLanguage,
    };
  }, [play, selectedLanguage]);

  const { activeGeofencePois } = useGeofenceTrigger({
    userLocation: location,
    pois,
    onTrigger: handleProximityTrigger,
    currentPlayingPoiId: currentPoi?.poi_id || currentPoi?.id,
  });

  useEffect(() => {
    const activePoiIds = new Set(
      activeGeofencePois.map(({ poi }) => String(poi.poi_id || poi.id))
    );

    Object.keys(dwellStartByPoiIdRef.current).forEach((poiId) => {
      if (activePoiIds.has(poiId)) {
        return;
      }

      const { startedAtMs, language } = dwellStartByPoiIdRef.current[poiId];
      delete dwellStartByPoiIdRef.current[poiId];

      const dwellSeconds = Math.max(
        0,
        Math.round((Date.now() - startedAtMs) / MILLISECONDS_PER_SECOND)
      );

      reportPoiTrigger({
        poiId,
        dwellTime: dwellSeconds,
        triggerType: 'AUTOMATIC_GEOFENCE',
        preferredLanguage: language,
      });
    });
  }, [activeGeofencePois]);

  useEffect(() => {
    const controller = new AbortController();

    getPublishedLanguages({ signal: controller.signal })
      .then((availableLanguages) => {
        setLanguages(availableLanguages);
        setLanguageError('');
        setSelectedLanguage((currentLanguage) => {
          if (availableLanguages.some(({ code }) => code === currentLanguage)) {
            return currentLanguage;
          }

          const savedLanguage = window.localStorage.getItem(PREFERRED_LANGUAGE_KEY);
          if (availableLanguages.some(({ code }) => code === savedLanguage)) {
            return savedLanguage;
          }

          return (
            availableLanguages.find(({ code }) => code === DEFAULT_LANGUAGE)?.code
            ?? availableLanguages[0]?.code
            ?? ''
          );
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLanguageError(
            'Unable to load available languages. Check your connection and try again.'
          );
        }
      });

    return () => controller.abort();
  }, [retryCount]);

  useEffect(() => {
    if (!selectedLanguage) {
      setPois([]);
      setSelectedPoiId(null);
      return undefined;
    }

    setPois([]);
    setSelectedPoiId(null);
    setPoiError('');
    const controller = new AbortController();
    getMapPois({ language: selectedLanguage, signal: controller.signal })
      .then((availablePois) => {
        setPois(availablePois);
        setPoiError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setPoiError(
            'Unable to load map locations. Check your connection and try again.'
          );
        }
      });

    return () => controller.abort();
  }, [poiRetryCount, selectedLanguage]);

  const selectedPoi = pois.find(({ id }) => String(id) === String(selectedPoiId));
  const playingPoiId = isPlaying ? currentPoi?.id ?? null : null;

  const directionsUrl = useMemo(() => {
    if (!selectedPoi) {
      return '';
    }

    const directions = new URL('https://www.google.com/maps/dir/');
    directions.searchParams.set('api', '1');
    directions.searchParams.set('destination', `${selectedPoi.latitude},${selectedPoi.longitude}`);
    return directions.toString();
  }, [selectedPoi]);

  const handleDismissPOIPreview = useCallback(() => {
    setSelectedPoiId(null);
  }, []);

  const handlePlayAudio = () => {
    if (!selectedPoi) {
      return;
    }

    play({
      ...selectedPoi,
      text: selectedPoi.short_description || selectedPoi.title,
      lang: selectedLanguage,
    });
  };

  const handleLanguageChange = (languageCode) => {
    window.localStorage.setItem(PREFERRED_LANGUAGE_KEY, languageCode);
    setSelectedLanguage(languageCode);
  };

  return (
    <main className="visitor-tour-page">
      <VisitorHeader
        languages={languages}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        sessionCode={sessionCode}
        expiresAt={expiresAt}
        onUnlock={onUnlock}
      />

      {languageError && (
        <div className="visitor-language-error" role="alert">
          <span>{languageError}</span>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Retry
          </button>
        </div>
      )}

      {poiError && (
        <div className="visitor-language-error" role="alert">
          <span>{poiError}</span>
          <button type="button" onClick={() => setPoiRetryCount((count) => count + 1)}>
            Retry
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="visitor-location-banner" role="status">
          <span className="visitor-location-banner-dot" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <VisitorMapView
        location={location}
        accuracy={accuracy}
        hasLiveLocation={hasLiveLocation}
        pois={pois}
        onSelectPOI={setSelectedPoiId}
        onDismissPOIPreview={handleDismissPOIPreview}
        playingPoiId={playingPoiId}
        visitedPoiIds={completedPoiIds}
      />
      {selectedPoi && (
        <PoiPreviewCard
          poi={selectedPoi}
          location={hasLiveLocation ? location : null}
          directionsUrl={directionsUrl}
          onPlayAudio={handlePlayAudio}
          onDismiss={handleDismissPOIPreview}
        />
      )}
    </main>
  );
}
