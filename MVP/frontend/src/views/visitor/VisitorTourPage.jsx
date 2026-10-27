import { useContext, useEffect, useState } from 'react';
import VisitorMapView from './VisitorMapView.jsx';
import VisitorHeader from '../../components/visitor/VisitorHeader.jsx';
import { getPublishedLanguages } from '../../api/languageApi.js';
import { getMapPois } from '../../api/poiApi.js';
import AudioPlayerContext from '../../contexts/AudioPlayerContext.jsx';
import { useGeofenceTrigger } from '../../hooks/useGeofenceTrigger.js';
import { reportPoiTrigger } from '../../api/telemetryApi.js';
import useGeolocation from '../../hooks/useGeolocation.js';

const PREFERRED_LANGUAGE_KEY = 'museum_preferred_lang';
const DEFAULT_LANGUAGE = 'vi';

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

  const audioContext = useContext(AudioPlayerContext);
  const play = audioContext?.play;
  const currentPoi = audioContext?.currentPoi;

  const handleProximityTrigger = (poi) => {
    if (play) {
      play(poi);
    }
    reportPoiTrigger({
      poiId: poi.poi_id || poi.id,
      dwellTime: 10,
      triggerType: 'AUTOMATIC_GEOFENCE',
    });
  };

  useGeofenceTrigger({
    userLocation: location,
    pois,
    onTrigger: handleProximityTrigger,
    currentPlayingPoiId: currentPoi?.poi_id || currentPoi?.id,
  });

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
      return undefined;
    }

    setPois([]);
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
        onPoiSelect={play}
      />
    </main>
  );
}
