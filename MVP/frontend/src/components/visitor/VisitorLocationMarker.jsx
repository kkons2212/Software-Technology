import { useEffect, useRef } from 'react';
import L from 'leaflet';

export function createVisitorLocationIcon(isLiveLocation) {
  if (!isLiveLocation) {
    return L.divIcon({
      className: 'visitor-entrance-icon',
      html: '<span class="visitor-entrance-dot" aria-hidden="true"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  return L.divIcon({
    className: 'visitor-location-icon',
    html: '<span class="visitor-location-pulse" aria-hidden="true"></span><span class="visitor-location-dot" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function VisitorLocationMarker({ map, location, accuracy, isLiveLocation }) {
  const markerRef = useRef(null);
  const accuracyCircleRef = useRef(null);

  useEffect(() => {
    if (!map || !location) {
      return undefined;
    }

    const marker = L.marker([location.lat, location.lng], {
      icon: createVisitorLocationIcon(isLiveLocation),
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);
    markerRef.current = marker;

    if (isLiveLocation && Number.isFinite(accuracy) && accuracy > 0) {
      accuracyCircleRef.current = L.circle([location.lat, location.lng], {
        radius: accuracy,
        className: 'visitor-accuracy-circle',
        color: '#1D4ED8',
        fillColor: '#1D4ED8',
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);
    }

    return () => {
      marker.remove();
      accuracyCircleRef.current?.remove();
      markerRef.current = null;
      accuracyCircleRef.current = null;
    };
  }, [isLiveLocation, map]);

  useEffect(() => {
    if (!location || !markerRef.current) {
      return;
    }

    const nextPosition = [location.lat, location.lng];
    markerRef.current.setLatLng(nextPosition);

    if (isLiveLocation && Number.isFinite(accuracy) && accuracy > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(nextPosition, {
          radius: accuracy,
          className: 'visitor-accuracy-circle',
          color: '#1D4ED8',
          fillColor: '#1D4ED8',
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng(nextPosition);
        accuracyCircleRef.current.setRadius(accuracy);
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }
  }, [accuracy, isLiveLocation, location?.lat, location?.lng, map]);

  return null;
}
