import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import VisitorLocationMarker from '../../components/visitor/VisitorLocationMarker.jsx';
import VisitorPoiMarkers from '../../components/visitor/VisitorPoiMarkers.jsx';
import { MAIN_ENTRANCE, MUSEUM_BOUNDS } from '../../hooks/useGeolocation.js';

const DEFAULT_ZOOM = 17;
const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const SITE_BOUNDS = L.latLngBounds(
  [MUSEUM_BOUNDS.minLat, MUSEUM_BOUNDS.minLng],
  [MUSEUM_BOUNDS.maxLat, MUSEUM_BOUNDS.maxLng],
);

export default function VisitorMapView({
  location = MAIN_ENTRANCE,
  accuracy = null,
  hasLiveLocation = false,
  pois = [],
  onPoiSelect = null,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const previousLiveLocationRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(mapElementRef.current, {
      center: [MAIN_ENTRANCE.lat, MAIN_ENTRANCE.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      touchZoom: true,
      maxBounds: SITE_BOUNDS,
      maxBoundsViscosity: 0.85,
      minZoom: 15,
      maxZoom: 19,
    });

    L.tileLayer(TILE_LAYER_URL, {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !location) {
      return;
    }

    if (hasLiveLocation && !previousLiveLocationRef.current) {
      mapRef.current.panTo([location.lat, location.lng], { animate: true, duration: 0.35 });
    } else if (!hasLiveLocation && previousLiveLocationRef.current) {
      mapRef.current.panTo([location.lat, location.lng], { animate: true, duration: 0.35 });
    }

    previousLiveLocationRef.current = hasLiveLocation;
  }, [hasLiveLocation, location]);

  // Render POI markers and geofence proximity circles
  useEffect(() => {
    if (!mapRef.current || !mapReady || !Array.isArray(pois) || pois.length === 0) {
      return;
    }

    if (typeof L.layerGroup !== 'function' || typeof L.marker !== 'function') {
      return;
    }

    const poiLayer = L.layerGroup().addTo(mapRef.current);

    pois.forEach((poi) => {
      const lat = poi.latitude ?? poi.lat;
      const lng = poi.longitude ?? poi.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      if (typeof L.circle === 'function') {
        L.circle([lat, lng], {
          radius: poi.radius || 30,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(poiLayer);
      }

      const marker = L.marker([lat, lng], { title: poi.title }).addTo(poiLayer);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; max-width: 200px;">
          <strong style="color: #0f172a;">${poi.title}</strong>
          <p style="margin: 4px 0 8px; color: #475569; font-size: 11px;">${poi.short_description || ''}</p>
          <button id="play-btn-${poi.poi_id || poi.id}" style="background: #0f172a; color: white; border: none; border-radius: 4px; padding: 6px 10px; font-size: 11px; cursor: pointer; width: 100%;">
            ▶ Nghe thuyết minh
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`play-btn-${poi.poi_id || poi.id}`);
        if (btn && onPoiSelect) {
          btn.onclick = () => onPoiSelect(poi);
        }
      });
    });

    return () => {
      poiLayer.remove();
    };
  }, [mapReady, pois, onPoiSelect]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleLocateMe = () => {
    if (mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], DEFAULT_ZOOM, { animate: true });
    }
  };

  return (
    <section className="visitor-map-shell" aria-label="Outdoor museum map">
      <div ref={mapElementRef} className="visitor-map" aria-label="Interactive OpenStreetMap" />
      {mapReady && (
        <>
          <VisitorLocationMarker
            map={mapRef.current}
            location={location}
            accuracy={accuracy}
            isLiveLocation={hasLiveLocation}
          />
          <VisitorPoiMarkers map={mapRef.current} pois={pois} />
          <div className="visitor-map-zoom-controls" aria-label="Map zoom controls">
            <button type="button" aria-label="Zoom in" onClick={handleZoomIn}>+</button>
            <button type="button" aria-label="Zoom out" onClick={handleZoomOut}>−</button>
          </div>
          <button
            className="visitor-locate-button"
            type="button"
            aria-label="Locate me"
            title="Center map on your location"
            onClick={handleLocateMe}
          >
            <LocateFixed size={19} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
}
