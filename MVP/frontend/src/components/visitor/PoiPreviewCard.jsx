import { useEffect, useRef } from 'react';
import { calculateHaversineDistance } from '../../utils/haversine.js';
import ContentPaywallGate from './ContentPaywallGate.jsx';
import { useVisitorSession } from '../../contexts/VisitorSessionContext.jsx';
import MiniAudioPlayer from './MiniAudioPlayer.jsx';
import { getVisitorText } from '../../locales/visitorTranslations.js';

const SWIPE_DISMISS_DISTANCE_PX = 48;

function formatDistance(distanceMeters, lang = 'en') {
  if (!Number.isFinite(distanceMeters)) {
    return getVisitorText('distanceUnavailable', lang);
  }

  if (distanceMeters >= 1000) {
    return getVisitorText('distanceKmAway', lang, { dist: (distanceMeters / 1000).toFixed(1) });
  }

  return getVisitorText('distanceMAway', lang, { dist: Math.round(distanceMeters) });
}

export default function PoiPreviewCard({
  poi,
  location,
  onPlayAudio,
  onDismiss,
  onUnlock,
  isUnlocked: propIsUnlocked,
  isActivated: propIsActivated,
  onDirectionsClick,
  isRoutingActive = false,
  language,
}) {
  const currentLang = language || 'en';
  const touchStartYRef = useRef(null);
  const session = useVisitorSession();
  const poiId = String(poi?.id || poi?.poi_id || '');

  const isUnlocked =
    typeof propIsUnlocked === 'boolean'
      ? propIsUnlocked
      : Boolean(session?.isUnlocked || (poi && poi.is_locked === false));

  const isActivated =
    typeof propIsActivated === 'boolean'
      ? propIsActivated
      : Boolean(
          (typeof session?.isPoiActivated === 'function' && session.isPoiActivated(poiId)) ||
          (poi && poi.is_locked === false) ||
          (typeof propIsActivated === 'undefined' && propIsUnlocked === true)
        );

  const distance = calculateHaversineDistance(location, {
    lat: poi.latitude,
    lng: poi.longitude,
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const handleTouchStart = (event) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event) => {
    const touchEndY = event.changedTouches[0]?.clientY;
    if (
      touchStartYRef.current !== null
      && typeof touchEndY === 'number'
      && touchEndY - touchStartYRef.current >= SWIPE_DISMISS_DISTANCE_PX
    ) {
      onDismiss();
    }
    touchStartYRef.current = null;
  };

  return (
    <div className="poi-preview-overlay">
      <button
        className="poi-preview-backdrop"
        type="button"
        aria-label="Close exhibit preview"
        title={getVisitorText('closeExhibitPreview', currentLang)}
        onClick={onDismiss}
      />
      <section
        className="poi-preview-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="poi-preview-title"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="poi-preview-handle" aria-hidden="true" />
        <div className="poi-preview-content">
          {poi.image_url ? (
            <img className="poi-preview-thumbnail" src={poi.image_url} alt={poi.title} />
          ) : (
            <div className="poi-preview-thumbnail poi-preview-thumbnail--empty" aria-hidden="true" />
          )}
          <div className="poi-preview-copy">
            <h2 id="poi-preview-title">{poi.title}</h2>
            <p className="poi-preview-distance">{formatDistance(distance, currentLang)}</p>
            <ContentPaywallGate
              isUnlocked={isUnlocked}
              isActivated={isActivated}
              shortDescription={poi.short_description || getVisitorText('noPreviewSummary', currentLang)}
              fullDescription={poi.description}
              onUnlock={onUnlock}
              language={currentLang}
            />
          </div>
        </div>

        {/* Embedded audio player between the preview content and action buttons */}
        <MiniAudioPlayer inline poiId={poi.id || poi.poi_id} onPlay={onPlayAudio} />

        <div className="poi-preview-actions">
          <button
            className={`poi-preview-directions ${isRoutingActive ? 'poi-preview-directions--active' : ''}`}
            type="button"
            aria-label={isRoutingActive ? 'Clear Route' : 'Directions'}
            onClick={onDirectionsClick}
          >
            {isRoutingActive
              ? getVisitorText('clearRoute', currentLang)
              : getVisitorText('directions', currentLang)}
          </button>
          <button
            className="poi-preview-play"
            type="button"
            aria-label={isUnlocked && isActivated ? 'Replay' : 'Play Narration'}
            onClick={onPlayAudio}
            data-testid="poi-preview-play-btn"
          >
            {isUnlocked && isActivated
              ? getVisitorText('replay', currentLang)
              : getVisitorText('playNarration', currentLang)}
          </button>
        </div>
      </section>
    </div>
  );
}
