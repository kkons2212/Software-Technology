import { useEffect, useRef } from 'react';
import L from 'leaflet';

const DEFAULT_TRIGGER_RADIUS_METERS = 30;
const MIN_TRIGGER_RADIUS_METERS = 10;
const MAX_TRIGGER_RADIUS_METERS = 50;

function getTriggerRadius(poi) {
  if (typeof poi.trigger_radius !== 'number' || !Number.isFinite(poi.trigger_radius)) {
    return DEFAULT_TRIGGER_RADIUS_METERS;
  }

  return Math.max(
    MIN_TRIGGER_RADIUS_METERS,
    Math.min(MAX_TRIGGER_RADIUS_METERS, poi.trigger_radius),
  );
}

function createPoiIcon(index, status) {
  return L.divIcon({
    className: 'visitor-poi-icon',
    html: `<span class="visitor-poi-marker visitor-poi-marker--${status}">${index + 1}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function VisitorPoiMarkers({
  map,
  pois,
  onSelectPOI,
  playingPoiId = null,
  visitedPoiIds = [],
}) {
  const markerLayersRef = useRef([]);
  const onSelectPOIRef = useRef(onSelectPOI);
  onSelectPOIRef.current = onSelectPOI;

  useEffect(() => {
    if (!map) {
      return undefined;
    }

    const markerLayers = pois.map((poi, index) => {
      const marker = L.marker([poi.latitude, poi.longitude], {
        icon: createPoiIcon(index, 'default'),
        title: poi.title,
        bubblingMouseEvents: false,
      });

      marker.on('click', () => onSelectPOIRef.current?.(poi.id));
      marker.addTo(map).bindTooltip(poi.title, { direction: 'top', offset: [0, -12] });

      const radius = L.circle([poi.latitude, poi.longitude], {
        radius: getTriggerRadius(poi),
        color: '#475569',
        fillColor: '#475569',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '6 6',
        interactive: false,
      }).addTo(map);

      return { marker, radius, poi, index };
    });
    markerLayersRef.current = markerLayers;

    return () => {
      markerLayers.forEach(({ marker, radius }) => {
        marker.off('click');
        marker.remove();
        radius.remove();
      });
      markerLayersRef.current = [];
    };
  }, [map, pois]);

  useEffect(() => {
    const visitedPoiIdSet = new Set(visitedPoiIds.map(String));
    markerLayersRef.current.forEach(({ marker, poi, index }) => {
      const status = String(poi.id) === String(playingPoiId)
        ? 'playing'
        : visitedPoiIdSet.has(String(poi.id))
          ? 'visited'
          : 'default';
      marker.setIcon(createPoiIcon(index, status));
    });
  }, [playingPoiId, visitedPoiIds]);

  return null;
}
