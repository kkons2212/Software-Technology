import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import VisitorLocationMarker from '../../components/visitor/VisitorLocationMarker.jsx';
import VisitorPoiMarkers from '../../components/visitor/VisitorPoiMarkers.jsx';
import RouteOverlay from '../../components/visitor/RouteOverlay.jsx';
import { MAIN_ENTRANCE } from '../../utils/museumBounds.js';

const DEFAULT_ZOOM = 17;
const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function VisitorMapView({
  location = MAIN_ENTRANCE,
  accuracy = null,
  hasLiveLocation = false,
  pois = [],
  onSelectPOI,
  onDismissPOIPreview,
  playingPoiId = null,
  visitedPoiIds = [],
  activeRoute = null,
  onClearRoute,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const previousLiveLocationRef = useRef(false);
  const onDismissPOIPreviewRef = useRef(onDismissPOIPreview);
  const [mapReady, setMapReady] = useState(false);
  onDismissPOIPreviewRef.current = onDismissPOIPreview;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(mapElementRef.current, {
      center: [MAIN_ENTRANCE.lat, MAIN_ENTRANCE.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      touchZoom: true,
      minZoom: 10,
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
    if (!mapReady || !mapRef.current) {
      return undefined;
    }

    const map = mapRef.current;
    const handleMapClick = () => onDismissPOIPreviewRef.current?.();
    map.on('click', handleMapClick);

    return () => map.off('click', handleMapClick);
  }, [mapReady]);

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
          <VisitorPoiMarkers
            map={mapRef.current}
            pois={pois}
            onSelectPOI={onSelectPOI}
            playingPoiId={playingPoiId}
            visitedPoiIds={visitedPoiIds}
          />
          {activeRoute && (
            <RouteOverlay
              map={mapRef.current}
              routeCoordinates={activeRoute.coordinates}
              destinationTitle={activeRoute.destinationTitle}
              userLocation={hasLiveLocation ? location : null}
              destinationLocation={activeRoute.destinationLocation}
              onClearRoute={onClearRoute}
            />
          )}
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
