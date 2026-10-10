import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Navigation, MapPin, Compass, RefreshCw, Volume2,
  CheckCircle2, Sparkles, LocateFixed, Map as MapIcon,
  Route, Footprints, AlertCircle, ArrowUpRight, ChevronUp, ChevronDown,
  Smartphone, ShieldCheck
} from 'lucide-react';
import { visitorApi } from '../../services/visitorApi';
import { useVisitorSession } from '../../context/VisitorSessionContext';

// Custom POI Pin Icon generator
const createPoiIcon = (item, isSelected = false, isVisited = false) => {
  const bgClass = isVisited
    ? 'bg-emerald-500 border-emerald-300 text-slate-950 ring-2 ring-emerald-500/40'
    : isSelected
    ? 'bg-amber-400 border-white text-slate-950 scale-125 shadow-xl shadow-amber-500/70 ring-4 ring-amber-400/40'
    : 'bg-slate-900/90 border-amber-500/80 text-amber-400 hover:scale-110';

  const html = `
    <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200">
      <div class="w-8 h-8 rounded-full border-2 ${bgClass} flex items-center justify-center font-black text-xs shadow-md">
        ${isVisited ? '✓' : item.id}
      </div>
      <div class="w-1.5 h-1.5 bg-amber-400 rotate-45 -mt-0.5 rounded-xs"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-poi-marker',
    iconSize: [32, 40],
    iconAnchor: [16, 36],
    popupAnchor: [0, -36]
  });
};

// Custom User GPS Location Icon with Pulse Effect
const userGpsIcon = L.divIcon({
  html: '<div class="gps-pulse-marker" title="Vị trí của bạn"></div>',
  className: 'user-gps-container',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Helper: Haversine distance in meters
function getHaversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function OutdoorMapView({ onSelectPoi, initialPoiId = null }) {
  const { preferredLanguage, lastScannedPoiId, isPoiListened, t } = useVisitorSession();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);

  // States
  const [loading, setLoading] = useState(true);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [siteInfo, setSiteInfo] = useState({
    name: 'Khu Di Tích Ngoài Trời',
    center_lat: 10.7769,
    center_lng: 106.6953,
    zoom: 17
  });

  const [markersData, setMarkersData] = useState([]);
  const [nextPoi, setNextPoi] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationMode, setLocationMode] = useState('simulated'); // 'real' | 'simulated'
  const [gpsErrorMsg, setGpsErrorMsg] = useState(null);

  // Turn-by-turn route state from OSRM
  const [routeInfo, setRouteInfo] = useState({
    distanceMeters: 0,
    durationSeconds: 0,
    steps: [],
    polyline: []
  });
  const [showSteps, setShowSteps] = useState(false);

  // 1. Fetch Backend Data
  const fetchMapData = useCallback(async (currentLat = null, currentLng = null) => {
    try {
      setLoading(true);
      const res = await visitorApi.getMapRecommendation({
        currentPoiId: initialPoiId || lastScannedPoiId,
        userLat: currentLat,
        userLng: currentLng
      });

      if (res) {
        if (res.site_info) setSiteInfo(res.site_info);
        if (res.next_poi) setNextPoi(res.next_poi);
        if (res.all_markers) setMarkersData(res.all_markers);

        // Mặc định chọn next_poi hoặc current_poi nếu có
        if (!selectedPoi && (res.next_poi || res.current_poi)) {
          setSelectedPoi(res.next_poi || res.current_poi);
        }
      }
    } catch (err) {
      console.error('Failed to load outdoor map data:', err);
    } finally {
      setLoading(false);
    }
  }, [initialPoiId, lastScannedPoiId, selectedPoi]);

  // 2. Fetch OSRM Walking Route (Đường đi bộ uốn lượn theo vỉa hè/lối đi thực tế)
  const calculateWalkingRoute = useCallback(async (origin, target) => {
    if (!origin || !target || !target.latitude || !target.longitude) return;

    try {
      setRoutingLoading(true);
      const url = `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${target.longitude},${target.latitude}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0];
        // Coordinates from OSRM are [lng, lat], convert to Leaflet [lat, lng]
        const latlngs = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

        const steps = route.legs[0]?.steps?.map((step) => {
          let instruction = 'Đi thẳng';
          const type = step.maneuver?.type;
          const modifier = step.maneuver?.modifier;

          if (type === 'depart') instruction = 'Bắt đầu xuất phát';
          else if (type === 'arrive') instruction = `Đã đến ${target.title}`;
          else if (modifier === 'left') instruction = 'Rẽ trái';
          else if (modifier === 'right') instruction = 'Rẽ phải';
          else if (modifier === 'slight left') instruction = 'Chếch sang trái';
          else if (modifier === 'slight right') instruction = 'Chếch sang phải';
          else if (modifier === 'sharp left') instruction = 'Ngoặt gấp sang trái';
          else if (modifier === 'sharp right') instruction = 'Ngoặt gấp sang phải';
          else if (modifier === 'straight') instruction = 'Tiếp tục đi thẳng';

          const street = step.name ? ` vào ${step.name}` : '';
          return {
            text: `${instruction}${street}`,
            distance: Math.round(step.distance)
          };
        }) || [];

        setRouteInfo({
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
          steps,
          polyline: latlngs
        });

        // Draw polyline on Leaflet
        if (mapInstanceRef.current) {
          if (routeLayerRef.current) {
            routeLayerRef.current.remove();
          }

          routeLayerRef.current = L.polyline(latlngs, {
            color: '#38bdf8',
            weight: 5,
            opacity: 0.9,
            dashArray: '10, 8',
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapInstanceRef.current);
        }
      } else {
        // Fallback straight line
        drawFallbackStraightLine(origin, target);
      }
    } catch (err) {
      console.warn('OSRM routing request failed, using straight-line fallback:', err);
      drawFallbackStraightLine(origin, target);
    } finally {
      setRoutingLoading(false);
    }
  }, []);

  const drawFallbackStraightLine = (origin, target) => {
    const latlngs = [
      [origin.lat, origin.lng],
      [target.latitude, target.longitude]
    ];
    const dist = getHaversineDist(origin.lat, origin.lng, target.latitude, target.longitude);
    setRouteInfo({
      distanceMeters: dist,
      durationSeconds: Math.round(dist / 1.2),
      steps: [
        { text: 'Di chuyển theo hướng điểm tham quan', distance: dist },
        { text: `Đã đến ${target.title}`, distance: 0 }
      ],
      polyline: latlngs
    });

    if (mapInstanceRef.current) {
      if (routeLayerRef.current) routeLayerRef.current.remove();
      routeLayerRef.current = L.polyline(latlngs, {
        color: '#f59e0b',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(mapInstanceRef.current);
    }
  };

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = siteInfo.center_lat;
    const initialLng = siteInfo.center_lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: siteInfo.zoom,
      minZoom: 5,
      maxZoom: 21,
      zoomControl: false,
      attributionControl: false
    });

    // OpenStreetMap Tile Layer with maxNativeZoom: 19 so zoom >= 20 never goes black!
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" class="text-[10px] text-slate-500">OpenStreetMap</a>')
      .addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Allow user to click anywhere on map to relocate in simulation mode
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      updateUserMarkerPosition(lat, lng, null, true);
    });

    // Default simulated location at entrance
    const defaultEntrance = { lat: 10.77688, lng: 106.69532 };
    updateUserMarkerPosition(defaultEntrance.lat, defaultEntrance.lng, null, true);

    // Initial backend fetch
    fetchMapData(defaultEntrance.lat, defaultEntrance.lng);

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user marker & optional accuracy circle
  const updateUserMarkerPosition = (lat, lng, accuracy = null, isSimulated = false) => {
    const coords = { lat, lng };
    setUserLocation(coords);
    setGpsAccuracy(accuracy);
    setLocationMode(isSimulated ? 'simulated' : 'real');

    if (mapInstanceRef.current) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([lat, lng], { icon: userGpsIcon }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng([lat, lng]);
      }

      // Accuracy circle
      if (accuracy && accuracy < 200 && !isSimulated) {
        if (!userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.15,
            weight: 1
          }).addTo(mapInstanceRef.current);
        } else {
          userAccuracyCircleRef.current.setLatLng([lat, lng]);
          userAccuracyCircleRef.current.setRadius(accuracy);
        }
      } else if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
    }

    const target = selectedPoi || nextPoi;
    if (target) {
      calculateWalkingRoute(coords, target);
    }
  };

  // 4. Trigger Real Phone GPS
  const handleEnableRealGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsErrorMsg('Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setGpsErrorMsg(null);
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        const { latitude, longitude, accuracy } = position.coords;
        updateUserMarkerPosition(latitude, longitude, accuracy, false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 18, { duration: 1 });
        }

        // Start continuous watching
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            updateUserMarkerPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, false);
          },
          (err) => console.warn('GPS watch error:', err.message),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
        );
      },
      (error) => {
        setLoading(false);
        let msg = 'Không thể lấy GPS điện thoại.';
        if (error.code === 1) {
          msg = 'Bạn đã từ chối quyền GPS. Vui lòng cho phép quyền vị trí trong cài đặt trình duyệt.';
        } else if (error.code === 2) {
          msg = 'Vị trí GPS không khả dụng (hãy bật GPS trên điện thoại).';
        } else if (error.code === 3) {
          msg = 'Yêu cầu định vị GPS bị quá hạn thời gian.';
        }
        setGpsErrorMsg(msg);
        console.warn('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // 5. Reset to Simulated Entrance
  const handleResetToEntrance = () => {
    if (watchIdRef.current) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsErrorMsg(null);
    const entrance = { lat: 10.77688, lng: 106.69532 };
    updateUserMarkerPosition(entrance.lat, entrance.lng, null, true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([entrance.lat, entrance.lng], 18, { duration: 0.8 });
    }
  };

  // 6. Update POI Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markersData.forEach((item) => {
      const isSelected = selectedPoi && selectedPoi.id === item.id;
      const isVisited = isPoiListened(item.id);
      const icon = createPoiIcon(item, isSelected, isVisited);

      const marker = L.marker([item.latitude, item.longitude], { icon });

      marker.on('click', () => {
        setSelectedPoi(item);
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [markersData, selectedPoi, isPoiListened]);

  // 7. Calculate Walking Route whenever target changes
  useEffect(() => {
    const target = selectedPoi || nextPoi;
    if (userLocation && target) {
      calculateWalkingRoute(userLocation, target);
    }
  }, [selectedPoi, nextPoi, userLocation, calculateWalkingRoute]);

  // Center on User Location
  const handleCenterOnUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 18, { duration: 0.8 });
    }
  };

  // Open native Google Maps app for direct walking navigation
  const handleOpenGoogleMaps = (poi) => {
    if (!poi || !poi.latitude || !poi.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const activeTarget = selectedPoi || nextPoi;
  const walkingMins = Math.max(1, Math.round(routeInfo.distanceMeters / 70));

  return (
    <div className="relative w-full h-[calc(100dvh-125px)] flex flex-col bg-slate-950 overflow-hidden select-none">

      {/* ─── LEAFLET MAP CANVAS ─── */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ─── TOP CONTROL BAR (GPS MODE SWITCHER) ─── */}
      <div className="absolute top-3 left-3 right-14 z-10 flex flex-wrap items-center gap-1.5">
        {/* Toggle Real GPS Button */}
        <button
          type="button"
          onClick={handleEnableRealGps}
          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
            locationMode === 'real'
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/25'
              : 'glass bg-slate-950/85 border-slate-700 text-slate-300 hover:text-white hover:border-sky-400'
          }`}
        >
          <Smartphone className={`w-3.5 h-3.5 ${locationMode === 'real' ? 'text-white' : 'text-sky-400'}`} />
          <span>{locationMode === 'real' ? 'Đang Dùng GPS Thật' : 'Bật GPS Điện Thoại'}</span>
          {gpsAccuracy && <span className="text-[10px] opacity-80">(±{Math.round(gpsAccuracy)}m)</span>}
        </button>

        {/* Toggle Simulated Entrance */}
        <button
          type="button"
          onClick={handleResetToEntrance}
          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
            locationMode === 'simulated'
              ? 'bg-sky-600 border-sky-400 text-white shadow-sky-500/25'
              : 'glass bg-slate-950/85 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Mô Phỏng Tại Di Tích</span>
        </button>
      </div>

      {/* ─── FLOATING RECENTER BUTTON ─── */}
      <button
        type="button"
        onClick={handleCenterOnUser}
        title="Vị trí của bạn"
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-sky-400 flex items-center justify-center shadow-xl backdrop-blur-md active:scale-90 transition-all"
      >
        <LocateFixed className="w-5 h-5" />
      </button>

      {/* ─── GPS ERROR BANNER (IF ANY) ─── */}
      {gpsErrorMsg && (
        <div className="absolute top-14 left-3 right-3 z-20 glass px-3.5 py-2 rounded-2xl border border-red-500/50 bg-red-950/90 text-red-200 text-xs font-medium flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{gpsErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsErrorMsg(null)}
            className="text-red-400 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── BOTTOM NAVIGATION DRAWER ─── */}
      {activeTarget && (
        <div className="absolute bottom-4 left-3 right-3 z-20 max-w-md mx-auto">
          <div className="bg-slate-900/95 border border-sky-500/40 rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5">

            {/* Routing summary badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-400">
                <Footprints className="w-3.5 h-3.5" />
                <span>Chỉ Đường Đi Bộ (OSRM)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-[11px] font-extrabold text-sky-300 flex items-center gap-1">
                  <span>~{routeInfo.distanceMeters || Math.round(activeTarget.distance_meters || 50)}m</span>
                  <span className="text-slate-500">•</span>
                  <span>{walkingMins} phút đi bộ</span>
                </span>
                {routeInfo.steps?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSteps(!showSteps)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {showSteps ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Turn-by-turn directions drawer (collapsible) */}
            {showSteps && routeInfo.steps?.length > 0 && (
              <div className="max-h-36 overflow-y-auto pr-1 py-1 space-y-1.5 border-y border-slate-800 text-xs">
                {routeInfo.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1">{st.text}</span>
                    {st.distance > 0 && <span className="text-[10px] text-slate-500">{st.distance}m</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Target POI Info */}
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {activeTarget.image_url ? (
                  <img src={activeTarget.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <MapPin className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate leading-tight">
                  #{activeTarget.id} · {activeTarget.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {activeTarget.short_description || 'Xem chi tiết và nghe thuyết minh'}
                </p>
                {isPoiListened(activeTarget.id) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Đã nghe thuyết minh
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: Google Maps link + Audio Guide */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleOpenGoogleMaps(activeTarget)}
                className="py-2.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                <span>Mở Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectPoi(activeTarget.id)}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe Thuyết Minh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(loading || routingLoading) && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 glass px-3 py-1 rounded-full border border-sky-500/40 bg-slate-950/80 text-[10px] font-bold text-sky-300 flex items-center gap-1.5 shadow-lg">
          <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
          <span>{routingLoading ? 'Đang vẽ đường đi bộ OSRM...' : 'Đang nạp dữ liệu...'}</span>
        </div>
      )}
    </div>
  );
}
