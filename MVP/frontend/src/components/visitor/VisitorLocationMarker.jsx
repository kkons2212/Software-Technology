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
  const currentPropsRef = useRef({ location, accuracy, isLiveLocation, map });
  currentPropsRef.current = { location, accuracy, isLiveLocation, map };

  useEffect(() => {
    const currentProps = currentPropsRef.current;
    if (!currentProps.map || !currentProps.location) {
      return undefined;
    }

    const initialPosition = [currentProps.location.lat, currentProps.location.lng];
    const marker = L.marker(initialPosition, {
      icon: createVisitorLocationIcon(currentProps.isLiveLocation),
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(currentProps.map);
    markerRef.current = marker;

    if (currentProps.isLiveLocation && Number.isFinite(currentProps.accuracy) && currentProps.accuracy > 0) {
      accuracyCircleRef.current = L.circle(initialPosition, {
        radius: currentProps.accuracy,
        className: 'visitor-accuracy-circle',
        color: '#1D4ED8',
        fillColor: '#1D4ED8',
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(currentProps.map);
    }

    return () => {
      marker.remove();
      accuracyCircleRef.current?.remove();
      markerRef.current = null;
      accuracyCircleRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const currentLocation = location;
    if (!currentLocation || !markerRef.current) {
      return;
    }

    const nextPosition = [currentLocation.lat, currentLocation.lng];
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
  }, [accuracy, isLiveLocation, location, map]);

  return null;
}
