import { useEffect } from 'react';
import L from 'leaflet';

export default function VisitorPoiMarkers({ map, pois }) {
  useEffect(() => {
    if (!map || pois.length === 0) {
      return undefined;
    }

    const markers = pois.map((poi) => {
      const icon = L.divIcon({
        className: 'visitor-poi-icon',
        html: '<span class="visitor-poi-marker-dot" aria-hidden="true"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      return L.marker([poi.latitude, poi.longitude], { icon })
        .addTo(map)
        .bindTooltip(poi.title, { direction: 'top', offset: [0, -12] });
    });

    return () => markers.forEach((marker) => marker.remove());
  }, [map, pois]);

  return null;
}
