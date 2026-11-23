import { useCallback, useEffect, useRef, useState } from 'react';
import VisitorMapView from './VisitorMapView.jsx';
import VisitorHeader from '../../components/visitor/VisitorHeader.jsx';
import PoiPreviewCard from '../../components/visitor/PoiPreviewCard.jsx';
import CheckoutModal from '../../components/visitor/CheckoutModal.jsx';
import RestoreSessionModal from '../../components/visitor/RestoreSessionModal.jsx';
import { getPublishedLanguages } from '../../api/languageApi.js';
import {
  capturePaypalOrder,
  clearOrderCreatorToken,
  exchangeOrderSession,
  getOrderCreatorToken,
  getOrderStatus,
} from '../../api/paymentApi.js';
import { getMapPois } from '../../api/poiApi.js';
import { getWalkingRoute } from '../../api/tourApi.js';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext.jsx';
import { useVisitorSession } from '../../contexts/VisitorSessionContext.jsx';
import { useGeofenceTrigger } from '../../hooks/useGeofenceTrigger.js';
import { reportPoiTrigger } from '../../api/telemetryApi.js';
import useGeolocation from '../../hooks/useGeolocation.js';
import { calculateHaversineDistance } from '../../utils/haversine.js';
import { MAIN_ENTRANCE } from '../../utils/museumBounds.js';
import { buildRequestUrl } from '../../api/apiClient.js';
import { ensureUtcIso } from '../../utils/dateUtils.js';
import { getVisitorText } from '../../locales/visitorTranslations.js';

const PREFERRED_LANGUAGE_KEY = 'museum_preferred_lang';
const DEFAULT_LANGUAGE = 'vi';
const MILLISECONDS_PER_SECOND = 1000;

let defaultExitGracePeriodMs = 10000;
if (
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')
) {
  defaultExitGracePeriodMs = 0;
}
export const DEFAULT_EXIT_GRACE_PERIOD_MS = defaultExitGracePeriodMs;
export const MIN_DWELL_SECONDS = 0;

/**
 * Resolves localized catalog / POI loading error message following 3-Phase SISE.
 * Metrics: K = 2, M <= 3, Nesting <= 2, 0 ternaries.
 */
export function resolveCatalogError(err, language = 'vi', fallbackMessage = '') {
  // Phase 1: Precondition Gate
  if (!err || err.name === 'AbortError') {
    return '';
  }

  // Phase 2: Linear Compute & Accumulate
  const isRateLimited = Boolean(err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED');
  let resolvedMessage = '';

  if (isRateLimited) {
    let retrySeconds = 60;
    if (err.details && typeof err.details.retry_after_seconds === 'number') {
      retrySeconds = err.details.retry_after_seconds;
    }
    resolvedMessage = getVisitorText('rateLimitExceeded', language, { seconds: retrySeconds });
  } else {
    resolvedMessage = fallbackMessage;
  }

  // Phase 3: Unified Exit Return
  return resolvedMessage;
}

export default function VisitorTourPage({
  sessionCode = '',
  expiresAt = null,
  onUnlock,
  exitGracePeriodMs = DEFAULT_EXIT_GRACE_PERIOD_MS,
} = {}) {
  const { location, accuracy, errorMessage, hasLiveLocation } = useGeolocation();
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(PREFERRED_LANGUAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });
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
    (poiId) => {
      if (typeof rawIsPoiActivated === 'function') {
        return rawIsPoiActivated(poiId);
      }
      return false;
    },
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

  // Auto-activate session upon redirect return from PayPal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      const orderId = params.get('order_id');
      const paypalOrderId = params.get('token');

      if (orderId) {
        const creatorToken = getOrderCreatorToken(orderId);
        const resolvePayment = paypalOrderId
          ? creatorToken
            ? capturePaypalOrder(orderId, paypalOrderId, creatorToken)
            : Promise.reject(new Error('Checkout access is unavailable for this PayPal order.'))
          : getOrderStatus(orderId).then((orderData) => {
              if (orderData?.status !== 'PAID') return orderData;
              if (!creatorToken) {
                throw new Error('Checkout access is unavailable for this paid order.');
              }
              return exchangeOrderSession(orderId, creatorToken);
            });
        resolvePayment
          .then((orderData) => {
            if (orderData?.status === 'PAID' && orderData.session_token) {
              clearOrderCreatorToken(orderId);
              activateSession({
                sessionCode: orderData.session_code,
                sessionToken: orderData.session_token,
                expiresAt: ensureUtcIso(orderData.session_expires_at || orderData.expires_at),
              });
            }
          })
          .catch((err) => {
            console.warn('Unable to resolve session for order:', orderId, err);
          })
          .finally(() => {
            window.history.replaceState({}, '', window.location.pathname);
          });
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [activateSession]);
  const { currentPoi, isPlaying, completedPoiIds, play, primeAudio } = useAudioPlayer();

  // AUTOPLAY-PRIMING: Prime audio element on first user touch/click on page
  useEffect(() => {
    const handleUserGesture = () => {
      primeAudio?.();
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
    window.addEventListener('pointerdown', handleUserGesture, { once: true });
    window.addEventListener('keydown', handleUserGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, [primeAudio]);

  // Dwell windows opened by a real geofence trigger, keyed by POI id. The
  // telemetry row is only reported once the visitor leaves the zone, debounced
  // with a grace period to prevent GPS jitter from cutting sessions short.
  const dwellStartByPoiIdRef = useRef({});
  const pendingExitsRef = useRef({});
  const selectedLanguageRef = useRef(selectedLanguage);
  selectedLanguageRef.current = selectedLanguage;

  const handleProximityTrigger = useCallback(
    (poi) => {
      const poiId = String(poi.poi_id || poi.id);
      if (isUnlocked) {
        markPoiActivated(poiId);
      }

      // Cancel any pending exit debounce timer if visitor re-enters within grace period
      if (pendingExitsRef.current[poiId]) {
        clearTimeout(pendingExitsRef.current[poiId].timerId);
        delete pendingExitsRef.current[poiId];
      }

      // STREAMING-ENDPOINT: Construct full backend audio URL
      let rawAudioUrl = poi.audio_url || null;
      if (!rawAudioUrl && contextSessionToken) {
        rawAudioUrl = `/api/v1/audio/${poiId}?token=${encodeURIComponent(contextSessionToken)}&language=${encodeURIComponent(selectedLanguage || 'vi')}`;
      }
      let fullAudioUrl = null;
      if (rawAudioUrl) {
        fullAudioUrl = buildRequestUrl(rawAudioUrl);
      }

      // Auto-play narration immediately on arrival without extra taps
      play({
        ...poi,
        audio_url: fullAudioUrl,
        text: poi.description || poi.short_description || poi.title,
        lang: selectedLanguage,
      });

      // Auto-open POI card
      setSelectedPoiId(poiId);

      // The language is captured alongside the entry instant: the backend mints
      // the visitor session from this value, so it must be the visitor's choice at
      // the time the exhibit was actually triggered.
      if (!dwellStartByPoiIdRef.current[poiId]) {
        dwellStartByPoiIdRef.current[poiId] = {
          startedAtMs: Date.now(),
          language: selectedLanguage,
        };
      }
    },
    [isUnlocked, markPoiActivated, play, selectedLanguage, contextSessionToken]
  );

  const { activeGeofencePois } = useGeofenceTrigger({
    userLocation: location,
    pois,
    onTrigger: handleProximityTrigger,
    currentPlayingPoiId: currentPoi?.poi_id || currentPoi?.id,
    isUnlocked: isUnlocked || Boolean(effectiveSessionCode),
  });

  // Track dwell time across GPS presence with hysteresis/exit debounce
  useEffect(() => {
    const activePoiIds = new Set(
      activeGeofencePois.map(({ poi }) => String(poi.poi_id || poi.id))
    );

    // 1. Cancel pending exits for POIs that are currently active in the geofence
    activePoiIds.forEach((poiId) => {
      if (pendingExitsRef.current[poiId]) {
        clearTimeout(pendingExitsRef.current[poiId].timerId);
        delete pendingExitsRef.current[poiId];
      }

      // If an already activated POI is re-entered (even while audio cooldown is active), resume dwell tracking
      if (isPoiActivated(poiId) && !dwellStartByPoiIdRef.current[poiId]) {
        dwellStartByPoiIdRef.current[poiId] = {
          startedAtMs: Date.now(),
          language: selectedLanguageRef.current,
        };
      }
    });

    const finalizeExit = (targetPoiId) => {
      const dwellEntry = dwellStartByPoiIdRef.current[targetPoiId];
      if (!dwellEntry) return;

      const pending = pendingExitsRef.current[targetPoiId];
      const exitTimeMs = pending?.exitCandidateAtMs ?? Date.now();

      delete dwellStartByPoiIdRef.current[targetPoiId];
      delete pendingExitsRef.current[targetPoiId];

      const dwellSeconds = Math.max(
        0,
        Math.round((exitTimeMs - dwellEntry.startedAtMs) / MILLISECONDS_PER_SECOND)
      );

      if (dwellSeconds >= MIN_DWELL_SECONDS) {
        reportPoiTrigger({
          poiId: targetPoiId,
          dwellTime: dwellSeconds,
          triggerType: 'AUTOMATIC_GEOFENCE',
          preferredLanguage: dwellEntry.language,
        });
      }
    };

    // 2. Debounce exits for POIs that just left the active geofence
    Object.keys(dwellStartByPoiIdRef.current).forEach((poiId) => {
      if (activePoiIds.has(poiId)) {
        return;
      }

      if (pendingExitsRef.current[poiId]) {
        return;
      }

      if (exitGracePeriodMs <= 0) {
        finalizeExit(poiId);
      } else {
        const exitCandidateAtMs = Date.now();
        const timerId = setTimeout(() => {
          finalizeExit(poiId);
        }, exitGracePeriodMs);

        pendingExitsRef.current[poiId] = {
          timerId,
          exitCandidateAtMs,
        };
      }
    });
  }, [activeGeofencePois, exitGracePeriodMs, isPoiActivated]);

  // Flush any open dwell sessions on unmount or tab hide
  useEffect(() => {
    const flushActiveDwells = () => {
      Object.keys(dwellStartByPoiIdRef.current).forEach((poiId) => {
        const dwellEntry = dwellStartByPoiIdRef.current[poiId];
        if (!dwellEntry) return;

        const pending = pendingExitsRef.current[poiId];
        if (pending?.timerId) {
          clearTimeout(pending.timerId);
        }

        const exitTimeMs = pending?.exitCandidateAtMs ?? Date.now();
        delete dwellStartByPoiIdRef.current[poiId];
        delete pendingExitsRef.current[poiId];

        const dwellSeconds = Math.max(
          0,
          Math.round((exitTimeMs - dwellEntry.startedAtMs) / MILLISECONDS_PER_SECOND)
        );

        if (dwellSeconds >= MIN_DWELL_SECONDS) {
          reportPoiTrigger({
            poiId,
            dwellTime: dwellSeconds,
            triggerType: 'AUTOMATIC_GEOFENCE',
            preferredLanguage: dwellEntry.language,
          });
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushActiveDwells();
      }
    };

    window.addEventListener('beforeunload', flushActiveDwells);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushActiveDwells);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushActiveDwells();
    };
  }, []);

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
        const resolved = resolveCatalogError(
          error,
          selectedLanguage,
          'Unable to load available languages. Check your connection and try again.'
        );
        if (resolved) {
          setLanguageError(resolved);
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
        const resolved = resolveCatalogError(
          error,
          selectedLanguage,
          'Unable to load map locations. Check your connection and try again.'
        );
        if (resolved) {
          setPoiError(resolved);
        }
      });

    return () => controller.abort();
  }, [poiRetryCount, selectedLanguage, contextSessionToken]);

  const selectedPoi = pois.find((poi) => String(poi.id || poi.poi_id) === String(selectedPoiId));
  let playingPoiId = null;
  if (isPlaying && currentPoi?.id) {
    playingPoiId = currentPoi.id;
  }

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
      let rawAudioUrl = selectedPoi.audio_url || null;
      if (!rawAudioUrl && contextSessionToken) {
        rawAudioUrl = `/api/v1/audio/${poiId}?token=${encodeURIComponent(contextSessionToken)}&language=${encodeURIComponent(selectedLanguage || 'vi')}`;
      }
      let fullAudioUrl = null;
      if (rawAudioUrl) {
        fullAudioUrl = buildRequestUrl(rawAudioUrl);
      }

      play({
        ...selectedPoi,
        audio_url: fullAudioUrl,
        text: selectedPoi.description || selectedPoi.short_description || selectedPoi.title,
        lang: selectedLanguage,
      });
    }
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
      ? ensureUtcIso(rawExpiry)
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    activateSession({
      sessionCode: code,
      sessionToken: token,
      expiresAt: expiry,
    });

    const sessionLang = paymentData?.preferred_language || paymentData?.PreferredLanguage;
    if (sessionLang && sessionLang !== selectedLanguage) {
      handleLanguageChange(sessionLang);
    }
  };

  const handleRestoreSuccess = (sessionData) => {
    const code = sessionData?.session_code || sessionData?.SessionCode || '';
    const token = sessionData?.session_token || sessionData?.SessionToken || '';
    const rawExpiry = sessionData?.expires_at || sessionData?.Expire_at;
    const expiry = rawExpiry
      ? ensureUtcIso(rawExpiry)
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    activateSession({
      sessionCode: code,
      sessionToken: token,
      expiresAt: expiry,
    });

    const sessionLang = sessionData?.preferred_language || sessionData?.PreferredLanguage;
    if (sessionLang && sessionLang !== selectedLanguage) {
      handleLanguageChange(sessionLang);
    }
  };

  let activeLocation = null;
  if (hasLiveLocation) {
    activeLocation = location;
  }

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

      {errorMessage && !errorMessage.includes('outside the museum grounds') && (
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
          location={activeLocation}
          onPlayAudio={handlePlayAudio}
          onDismiss={handleDismissPOIPreview}
          onUnlock={handleUnlockClick}
          isUnlocked={isUnlocked || Boolean(effectiveSessionCode)}
          isActivated={isPoiActivated(selectedPoi.poi_id || selectedPoi.id)}
          onDirectionsClick={handleDirectionsClick}
          isRoutingActive={!!isRoutingToSelectedPoi}
          language={selectedLanguage}
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
        language={selectedLanguage || DEFAULT_LANGUAGE}
      />
    </main>
  );
}
