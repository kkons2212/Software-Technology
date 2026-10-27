import { useEffect, useRef } from 'react';
import { calculateHaversineDistance } from '../../utils/haversine.js';

const SWIPE_DISMISS_DISTANCE_PX = 48;

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return 'Distance unavailable';
  }

  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km away`;
  }

  return `${Math.round(distanceMeters)} m away`;
}

export default function PoiPreviewCard({
  poi,
  location,
  directionsUrl,
  onPlayAudio,
  onDismiss,
}) {
  const touchStartYRef = useRef(null);
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
            <p className="poi-preview-distance">{formatDistance(distance)}</p>
            <p className="poi-preview-summary">{poi.short_description || 'No preview summary available.'}</p>
          </div>
        </div>
        <div className="poi-preview-actions">
          <a
            className="poi-preview-directions"
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions
          </a>
          <button className="poi-preview-play" type="button" onClick={onPlayAudio}>
            Play Narration
          </button>
        </div>
      </section>
    </div>
  );
}
