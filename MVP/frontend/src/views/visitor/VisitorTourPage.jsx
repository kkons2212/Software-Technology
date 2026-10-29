import { useCallback, useEffect, useRef, useState } from 'react';
import VisitorMapView from './VisitorMapView.jsx';
import VisitorHeader from '../../components/visitor/VisitorHeader.jsx';
import PoiPreviewCard from '../../components/visitor/PoiPreviewCard.jsx';
import CheckoutModal from '../../components/visitor/CheckoutModal.jsx';
import RestoreSessionModal from '../../components/visitor/RestoreSessionModal.jsx';
import { getPublishedLanguages } from '../../api/languageApi.js';
import { getMapPois } from '../../api/poiApi.js';
import { getWalkingRoute } from '../../api/tourApi.js';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext.jsx';
import { useVisitorSession } from '../../contexts/VisitorSessionContext.jsx';
import { useGeofenceTrigger } from '../../hooks/useGeofenceTrigger.js';
import { reportPoiTrigger } from '../../api/telemetryApi.js';
import useGeolocation from '../../hooks/useGeolocation.js';
import { calculateHaversineDistance } from '../../utils/haversine.js';
import { MAIN_ENTRANCE } from '../../utils/museumBounds.js';

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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);

  const {
    sessionCode: contextSessionCode,
    sessionToken: contextSessionToken,
    expiresAt: contextExpiresAt,
    isUnlocked,
    isPoiActivated: rawIsPoiActivated,
    markPoiActivated: rawMarkPoiActivated,
    activateSession,
    clearSession,
  } = useVisitorSession();

  const isPoiActivated = useCallback(
    (poiId) => (typeof rawIsPoiActivated === 'function' ? rawIsPoiActivated(poiId) : false),
    [rawIsPoiActivated]
  );
  const markPoiActivated = useCallback(
    (poiId) => {
      if (typeof rawMarkPoiActivated === 'function') {
        rawMarkPoiActivated(poiId);
      }
    },
    [rawMarkPoiActivated]
  );

  const effectiveSessionCode = sessionCode || contextSessionCode;
  const effectiveExpiresAt = expiresAt || contextExpiresAt;
  const { currentPoi, isPlaying, completedPoiIds, play } = useAudioPlayer();
  // Dwell windows opened by a real geofence trigger, keyed by POI id. The
  // telemetry row is only reported once the visitor leaves the zone, because a
  // duration cannot be measured at the moment of entry.
  const dwellStartByPoiIdRef = useRef({});

  const handleProximityTrigger = useCallback(
    (poi) => {
      const poiId = String(poi.poi_id || poi.id);
      if (isUnlocked) {
        markPoiActivated(poiId);
      }
      play(poi);
      // The language is captured alongside the entry instant: the backend mints
      // the visitor session from this value, so it must be the visitor's choice at
      // the time the exhibit was actually triggered.
      dwellStartByPoiIdRef.current[poiId] = {
        startedAtMs: Date.now(),
        language: selectedLanguage,
      };
    },
    [isUnlocked, markPoiActivated, play, selectedLanguage]
  );

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

  // Auto-clear route when visitor enters the destination geofence
  useEffect(() => {
    if (!activeRoute || !location || !hasLiveLocation) {
      return;
    }

    const destLocation = activeRoute.destinationLocation;
    const triggerRadius = activeRoute.triggerRadius || 30;
    const distanceToDest = calculateHaversineDistance(location, destLocation);

    if (Number.isFinite(distanceToDest) && distanceToDest <= triggerRadius) {
      setActiveRoute(null);
    }
  }, [activeRoute, location, hasLiveLocation]);

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
            availableLanguages.find(({ code }) => code === DEFAULT_LANGUAGE)?.code ??
            availableLanguages[0]?.code ??
            ''
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
    getMapPois({
      language: selectedLanguage,
      token: contextSessionToken,
      signal: controller.signal,
    })
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
  }, [poiRetryCount, selectedLanguage, contextSessionToken]);

  const selectedPoi = pois.find(({ id }) => String(id) === String(selectedPoiId));
  const playingPoiId = isPlaying ? currentPoi?.id ?? null : null;

  const isRoutingToSelectedPoi =
    activeRoute &&
    selectedPoi &&
    activeRoute.destinationPoiId === String(selectedPoi.id);

  const handleDirectionsClick = useCallback(() => {
    if (!selectedPoi) {
      return;
    }

    // If already routing to this POI, clear the route
    if (isRoutingToSelectedPoi) {
      setActiveRoute(null);
      return;
    }

    const effectiveLocation = location || MAIN_ENTRANCE;
    const controller = new AbortController();
    getWalkingRoute({
      originLat: effectiveLocation.lat,
      originLng: effectiveLocation.lng,
      destinationPoiId: String(selectedPoi.id),
      signal: controller.signal,
    })
      .then((routeFeature) => {
        if (!routeFeature?.geometry?.coordinates) {
          console.warn('Invalid route payload:', routeFeature);
          return;
        }
        setActiveRoute({
          coordinates: routeFeature.geometry.coordinates,
          destinationTitle: routeFeature.properties.destination.title,
          destinationPoiId: String(routeFeature.properties.destination.poi_id),
          destinationLocation: {
            lat: routeFeature.properties.destination.lat,
            lng: routeFeature.properties.destination.lng,
          },
          triggerRadius: routeFeature.properties.destination.trigger_radius,
          totalDistance: routeFeature.properties.total_distance_meters,
          estimatedMinutes: routeFeature.properties.estimated_walking_minutes,
        });
        setSelectedPoiId(null);
      })
      .catch((err) => {
        console.error('Failed to get walking route:', err);
      });
  }, [selectedPoi, isRoutingToSelectedPoi, location]);

  const handleClearRoute = useCallback(() => {
    setActiveRoute(null);
  }, []);

  const handleDismissPOIPreview = useCallback(() => {
    setSelectedPoiId(null);
  }, []);

  const handlePlayAudio = () => {
    if (!selectedPoi) {
      return;
    }

    const poiId = String(selectedPoi.poi_id || selectedPoi.id);
    const hasActivated = isPoiActivated(poiId);

    if (isUnlocked && hasActivated) {
      const fullAudioUrl =
        selectedPoi.audio_url ||
        (contextSessionToken
          ? `/api/v1/audio/${poiId}?token=${encodeURIComponent(contextSessionToken)}&language=${encodeURIComponent(selectedLanguage || 'vi')}`
          : null);

      play({
        ...selectedPoi,
        audio_url: fullAudioUrl,
        text: selectedPoi.description || selectedPoi.short_description || selectedPoi.title,
        lang: selectedLanguage,
      });
      return;
    }

    play({
      ...selectedPoi,
      audio_url: null,
      text: selectedPoi.short_description || selectedPoi.title,
      lang: selectedLanguage,
    });
  };

  const handleLanguageChange = (languageCode) => {
    window.localStorage.setItem(PREFERRED_LANGUAGE_KEY, languageCode);
    setSelectedLanguage(languageCode);
  };

  const handleUnlockClick = () => {
    setIsCheckoutOpen(true);
    onUnlock?.();
  };

  const handleCheckoutSuccess = (paymentData) => {
    const code = paymentData?.session_code || paymentData?.SessionCode || '';
    const token = paymentData?.session_token || paymentData?.SessionToken || '';
    const rawExpiry =
      paymentData?.expires_at ||
      paymentData?.session_expires_at ||
      paymentData?.Expire_at;
    const expiry = rawExpiry
      ? new Date(rawExpiry).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    activateSession({
      sessionCode: code,
      sessionToken: token,
      expiresAt: expiry,
    });
  };

  const handleRestoreSuccess = (sessionData) => {
    const code = sessionData?.session_code || sessionData?.SessionCode || '';
    const token = sessionData?.session_token || sessionData?.SessionToken || '';
    const rawExpiry = sessionData?.expires_at || sessionData?.Expire_at;
    const expiry = rawExpiry
      ? new Date(rawExpiry).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    activateSession({
      sessionCode: code,
      sessionToken: token,
      expiresAt: expiry,
    });
  };

  return (
    <main className="visitor-tour-page">
      <VisitorHeader
        languages={languages}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        sessionCode={effectiveSessionCode}
        expiresAt={effectiveExpiresAt}
        onUnlock={handleUnlockClick}
        onClearSession={clearSession}
        onRestoreSession={() => setIsRestoreOpen(true)}
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
        activeRoute={activeRoute}
        onClearRoute={handleClearRoute}
      />
      {selectedPoi && (
        <PoiPreviewCard
          poi={selectedPoi}
          location={hasLiveLocation ? location : null}
          onPlayAudio={handlePlayAudio}
          onDismiss={handleDismissPOIPreview}
          onUnlock={handleUnlockClick}
          isUnlocked={isUnlocked || Boolean(effectiveSessionCode)}
          isActivated={isPoiActivated(selectedPoi.poi_id || selectedPoi.id)}
          onDirectionsClick={handleDirectionsClick}
          isRoutingActive={!!isRoutingToSelectedPoi}
        />
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
        preferredLanguage={selectedLanguage || DEFAULT_LANGUAGE}
        onOpenRestore={() => setIsRestoreOpen(true)}
      />

      <RestoreSessionModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onSuccess={handleRestoreSuccess}
      />
    </main>
  );
}
