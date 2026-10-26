import { useEffect, useState } from 'react';
import VisitorMapView from './VisitorMapView.jsx';
import VisitorHeader from '../../components/visitor/VisitorHeader.jsx';
import { getPublishedLanguages } from '../../api/languageApi.js';
import { getPois } from '../../api/poiApi.js';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext.jsx';
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

  const { play, currentPoi } = useAudioPlayer();

  useEffect(() => {
    getPois({ page: 1, size: 50 })
      .then((data) => {
        if (data?.items && Array.isArray(data.items)) {
          setPois(data.items);
        }
      })
      .catch((err) => {
        console.warn('Unable to load exhibits:', err);
      });
  }, []);

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

          return availableLanguages.find(({ code }) => code === DEFAULT_LANGUAGE)?.code
            ?? availableLanguages[0]?.code
            ?? '';
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLanguageError('Unable to load available languages. Check your connection and try again.');
        }
      });

    return () => controller.abort();
  }, [retryCount]);

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

