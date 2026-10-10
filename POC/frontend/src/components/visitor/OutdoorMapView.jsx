import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Navigation, MapPin, Compass, RefreshCw, Volume2,
  CheckCircle2, Sparkles, LocateFixed, Map as MapIcon,
  Route, Footprints, AlertCircle, ChevronUp, ChevronDown,
  Smartphone, Radio, VolumeX, Play, Pause, RotateCcw, FastForward
} from 'lucide-react';
import { visitorApi } from '../../services/visitorApi';
import { useVisitorSession } from '../../context/VisitorSessionContext';

const PROXIMITY_RADIUS_METERS = 30; // Bán kính tự động nhận diện hiện vật (30 mét)

// Helper: Generate interpolated walking steps along route or straight line
function generateWalkingSteps(start, end, polyline = []) {
  const steps = [];
  if (polyline && polyline.length >= 2) {
    for (let i = 0; i < polyline.length - 1; i++) {
      const [lat1, lng1] = polyline[i];
      const [lat2, lng2] = polyline[i + 1];
      const segmentDist = getHaversineDist(lat1, lng1, lat2, lng2);
      const subSteps = Math.max(1, Math.round(segmentDist / 2)); // ~2m per step
      for (let s = 0; s < subSteps; s++) {
        const ratio = s / subSteps;
        steps.push({
          lat: lat1 + (lat2 - lat1) * ratio,
          lng: lng1 + (lng2 - lng1) * ratio
        });
      }
    }
    const last = polyline[polyline.length - 1];
    steps.push({ lat: last[0], lng: last[1] });
  } else if (start && end && end.latitude && end.longitude) {
    const dist = getHaversineDist(start.lat, start.lng, end.latitude, end.longitude);
    const totalSteps = Math.max(10, Math.round(dist / 2));
    for (let i = 0; i <= totalSteps; i++) {
      const ratio = i / totalSteps;
      steps.push({
        lat: start.lat + (end.latitude - start.lat) * ratio,
        lng: start.lng + (end.longitude - start.lng) * ratio
      });
    }
  }
  return steps;
}

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

export default function OutdoorMapView({ onSelectPoi, onPlayAudio, initialPoiId = null }) {
  const { preferredLanguage, lastScannedPoiId, isPoiListened, t } = useVisitorSession();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const geofenceLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);
  const triggeredPoiIdsRef = useRef(new Set()); // Ghi nhớ POI đã kích hoạt tự động

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

  // Proximity Autoplay feature (Tự động phát khi lại gần)
  const [autoTourEnabled, setAutoTourEnabled] = useState(true);
  const [proximityAlert, setProximityAlert] = useState(null); // { poi, distance, countdown }
  const countdownTimerRef = useRef(null);

  // Walking Simulation for Geofence Testing
  const [isSimulatingWalk, setIsSimulatingWalk] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x | 2x | 4x
  const [simProgress, setSimProgress] = useState(0); // 0 -> 100%
  const [showSimPanel, setShowSimPanel] = useState(true);
  const [startPointToast, setStartPointToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const simIntervalRef = useRef(null);
  const simStepsRef = useRef([]);
  const simCurrentIndexRef = useRef(0);

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

  // 2. Fetch OSRM Walking Route
  const calculateWalkingRoute = useCallback(async (origin, target) => {
    if (!origin || !target || !target.latitude || !target.longitude) return;

    try {
      setRoutingLoading(true);
      const url = `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${target.longitude},${target.latitude}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0];
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
        drawFallbackStraightLine(origin, target);
      }
    } catch (err) {
      console.warn('OSRM routing request failed, using fallback:', err);
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

  // 3. Proximity Geofence Triggering (Tự động phát khi lại gần)
  const checkProximityTrigger = useCallback((lat, lng, markers) => {
    if (!autoTourEnabled || !markers || markers.length === 0) return;

    for (const poi of markers) {
      if (!poi.latitude || !poi.longitude) continue;
      const dist = getHaversineDist(lat, lng, poi.latitude, poi.longitude);

      if (dist <= PROXIMITY_RADIUS_METERS) {
        // Nếu chưa từng kích hoạt tự động POI này trong phiên
        if (!triggeredPoiIdsRef.current.has(poi.id)) {
          triggeredPoiIdsRef.current.add(poi.id);

          setProximityAlert({
            poi,
            distance: dist,
            countdown: 3
          });

          // Tự động kích hoạt thuyết minh sau 3 giây (hoặc khách bấm ngay)
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          let count = 3;
          countdownTimerRef.current = setInterval(() => {
            count -= 1;
            if (count <= 0) {
              clearInterval(countdownTimerRef.current);
              setProximityAlert(null);
              if (onPlayAudio) {
                onPlayAudio(poi.id, true);
              } else {
                onSelectPoi(poi.id, true);
              }
            } else {
              setProximityAlert((prev) => (prev ? { ...prev, countdown: count } : null));
            }
          }, 1000);

          break;
        }
      }
    }
  }, [autoTourEnabled, onSelectPoi, onPlayAudio]);

  // 4. Initialize Leaflet Map
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

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" class="text-[10px] text-slate-500">OpenStreetMap</a>')
      .addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    geofenceLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Allow user to click anywhere on map to set starting location in simulation mode
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      handleSetSimulatedStartLocation(lat, lng, 'Vị trí đã chọn trên bản đồ');
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
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Set custom simulated starting location
  const handleSetSimulatedStartLocation = (lat, lng, name = null) => {
    if (watchIdRef.current) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulatingWalk(false);
    setSimProgress(0);
    simCurrentIndexRef.current = 0;
    simStepsRef.current = [];
    triggeredPoiIdsRef.current.clear(); // Reset geofence history for re-testing

    updateUserMarkerPosition(lat, lng, null, true);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }

    const target = selectedPoi || nextPoi;
    const dist = target && target.latitude ? getHaversineDist(lat, lng, target.latitude, target.longitude) : 0;
    const msg = name 
      ? `📍 Điểm xuất phát: ${name} (Cách #${target?.id || ''}: ~${dist}m)` 
      : `📍 Đã đặt điểm xuất phát mới (Cách #${target?.id || ''}: ~${dist}m)`;
    
    setStartPointToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setStartPointToast(null), 3500);
  };

  // Update user marker, accuracy circle & check geofence
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

    // Check GPS Geofence for proximity auto-tour
    checkProximityTrigger(lat, lng, markersData);
  };

  // 5. Trigger Real Phone GPS
  const handleEnableRealGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsErrorMsg('Trình duyệt hoặc thiết bị không hỗ trợ GPS.');
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
          msg = 'Bạn đã từ chối quyền GPS. Hãy cho phép quyền vị trí trong cài đặt trình duyệt.';
        } else if (error.code === 2) {
          msg = 'Vị trí GPS không khả dụng (hãy bật GPS thiết bị).';
        }
        setGpsErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // 6. Reset to Simulated Entrance
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

  // 7. Update POI Markers & Geofence Zones on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !geofenceLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    geofenceLayerRef.current.clearLayers();

    markersData.forEach((item) => {
      const isSelected = selectedPoi && selectedPoi.id === item.id;
      const isVisited = isPoiListened(item.id);
      const icon = createPoiIcon(item, isSelected, isVisited);

      // Marker
      const marker = L.marker([item.latitude, item.longitude], { icon });
      marker.on('click', () => {
        setSelectedPoi(item);
      });
      markersLayerRef.current.addLayer(marker);

      // Proximity Geofence Zone Circle (30m radius)
      const geofenceCircle = L.circle([item.latitude, item.longitude], {
        radius: PROXIMITY_RADIUS_METERS,
        color: isVisited ? '#10b981' : isSelected ? '#f59e0b' : '#38bdf8',
        fillColor: isVisited ? '#10b981' : isSelected ? '#f59e0b' : '#38bdf8',
        fillOpacity: isSelected ? 0.12 : 0.06,
        weight: 1,
        dashArray: '4, 4'
      });
      geofenceLayerRef.current.addLayer(geofenceCircle);
    });
  }, [markersData, selectedPoi, isPoiListened]);

  // 8. Calculate Walking Route whenever target changes
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

  // ─── WALKING SIMULATION SYSTEM (TEST GPS GEOFENCE STEP-BY-STEP) ───
  const handleStartWalkingSimulation = () => {
    const target = selectedPoi || nextPoi;
    if (!target || !userLocation) return;

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    // If starting fresh or reached the end, regenerate steps
    if (simStepsRef.current.length === 0 || simCurrentIndexRef.current >= simStepsRef.current.length) {
      const steps = generateWalkingSteps(userLocation, target, routeInfo.polyline);
      simStepsRef.current = steps;
      simCurrentIndexRef.current = 0;
    }

    setIsSimulatingWalk(true);

    const intervalMs = Math.max(70, Math.round(450 / simSpeed));
    simIntervalRef.current = setInterval(() => {
      if (simCurrentIndexRef.current >= simStepsRef.current.length) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setIsSimulatingWalk(false);
        return;
      }

      const currentStep = simStepsRef.current[simCurrentIndexRef.current];
      updateUserMarkerPosition(currentStep.lat, currentStep.lng, null, true);

      if (mapInstanceRef.current && simCurrentIndexRef.current % 2 === 0) {
        mapInstanceRef.current.panTo([currentStep.lat, currentStep.lng], { animate: true, duration: 0.25 });
      }

      const progress = Math.round((simCurrentIndexRef.current / (simStepsRef.current.length - 1)) * 100);
      setSimProgress(progress);
      simCurrentIndexRef.current += 1;
    }, intervalMs);
  };

  const handlePauseWalkingSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulatingWalk(false);
  };

  const handleResetWalkingSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulatingWalk(false);
    setSimProgress(0);
    simCurrentIndexRef.current = 0;
    simStepsRef.current = [];
    // Reset triggered POI history so geofence alert can fire again for testing
    triggeredPoiIdsRef.current.clear();
    handleResetToEntrance();
  };

  // Speed changes reaction
  useEffect(() => {
    if (isSimulatingWalk && simStepsRef.current.length > 0) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      const intervalMs = Math.max(70, Math.round(450 / simSpeed));
      simIntervalRef.current = setInterval(() => {
        if (simCurrentIndexRef.current >= simStepsRef.current.length) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
          setIsSimulatingWalk(false);
          return;
        }

        const currentStep = simStepsRef.current[simCurrentIndexRef.current];
        updateUserMarkerPosition(currentStep.lat, currentStep.lng, null, true);

        if (mapInstanceRef.current && simCurrentIndexRef.current % 2 === 0) {
          mapInstanceRef.current.panTo([currentStep.lat, currentStep.lng], { animate: true, duration: 0.25 });
        }

        const progress = Math.round((simCurrentIndexRef.current / (simStepsRef.current.length - 1)) * 100);
        setSimProgress(progress);
        simCurrentIndexRef.current += 1;
      }, intervalMs);
    }
  }, [simSpeed, isSimulatingWalk]);

  const activeTarget = selectedPoi || nextPoi;
  const walkingMins = Math.max(1, Math.round(routeInfo.distanceMeters / 70));

  return (
    <div className="relative w-full h-[calc(100dvh-125px)] flex flex-col bg-slate-950 overflow-hidden select-none">

      {/* ─── LEAFLET MAP CANVAS ─── */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ─── TOP CONTROL BAR (GPS MODE & AUTO-TOUR TOGGLE) ─── */}
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
          <span>{locationMode === 'real' ? 'GPS Thật' : 'Bật GPS Điện Thoại'}</span>
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
          <span>Mô Phỏng Cổng Di Tích</span>
        </button>

        {/* Toggle Proximity Auto-Tour Mode */}
        <button
          type="button"
          onClick={() => setAutoTourEnabled(!autoTourEnabled)}
          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
            autoTourEnabled
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 backdrop-blur-md'
              : 'glass bg-slate-950/85 border-slate-800 text-slate-400'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${autoTourEnabled ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
          <span>Tự Động Phát GPS: {autoTourEnabled ? 'BẬT' : 'TẮT'}</span>
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

      {/* ─── WALKING TEST SIMULATION BAR (THỬ NGHIỆM ĐI BỘ LẠI GẦN HIỆN VẬT) ─── */}
      <div className="absolute top-14 left-3 right-3 z-20 max-w-md mx-auto">
        <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
          {/* Header & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
              <Footprints className="w-4 h-4 animate-bounce-short" />
              <span>Thử Nghiệm Đi Bộ GPS (Test Geofence)</span>
            </div>
            {activeTarget && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                (routeInfo.distanceMeters || 0) <= PROXIMITY_RADIUS_METERS
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {(routeInfo.distanceMeters || 0) <= PROXIMITY_RADIUS_METERS
                  ? '⚡ ĐÃ VÀO VÙNG PHÁT (≤30m)'
                  : `Cách #${activeTarget.id}: ${routeInfo.distanceMeters || 50}m`}
              </span>
            )}
          </div>

          {/* Quick Start Location Presets */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none text-[10px]">
            <span className="text-slate-500 font-bold whitespace-nowrap">Xuất phát từ:</span>
            <button
              type="button"
              onClick={() => handleSetSimulatedStartLocation(10.77688, 106.69532, 'Cổng Di Tích')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap active:scale-95 transition-all"
            >
              🏛️ Cổng Chính
            </button>
            <button
              type="button"
              onClick={() => handleSetSimulatedStartLocation(10.77645, 106.69505, 'Sân Vườn Trước')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap active:scale-95 transition-all"
            >
              🌲 Sân Vườn (~65m)
            </button>
            <button
              type="button"
              onClick={() => handleSetSimulatedStartLocation(10.77615, 106.69470, 'Bãi Đỗ Xe')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap active:scale-95 transition-all"
            >
              🅿️ Bãi Xe (~110m)
            </button>
            <span className="text-amber-400/80 italic whitespace-nowrap text-[9px]">
              (hoặc click bản đồ)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 h-full transition-all duration-200"
              style={{ width: `${simProgress}%` }}
            />
          </div>

          {/* Controls: Play/Pause, Speed, Reset */}
          <div className="flex items-center justify-between gap-1.5">
            {/* Play / Pause Walk */}
            {!isSimulatingWalk ? (
              <button
                type="button"
                onClick={handleStartWalkingSimulation}
                className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>{simProgress > 0 && simProgress < 100 ? 'Tiếp Tục Đi Bộ' : 'Bắt Đầu Đi Bộ Lại Gần'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePauseWalkingSimulation}
                className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Tạm Dừng ({simProgress}%)</span>
              </button>
            )}

            {/* Speed Toggle: 1x, 2x, 4x */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-0.5">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                    simSpeed === spd
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetWalkingSimulation}
              title="Đặt lại vị trí cổng & xoá lịch sử kích hoạt để test lại"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all flex items-center gap-1 text-[10px] font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── START POINT TOAST NOTIFICATION ─── */}
      {startPointToast && (
        <div className="absolute top-44 left-1/2 -translate-x-1/2 z-30 glass px-3.5 py-1.5 rounded-full border border-sky-500/50 bg-slate-950/90 text-sky-300 text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{startPointToast}</span>
        </div>
      )}

      {/* ─── PROXIMITY GEOFENCE POPUP ALERT (KHI LẠI GẦN HIỆN VẬT) ─── */}
      {proximityAlert && (
        <div className="absolute top-40 left-3 right-3 z-30 max-w-md mx-auto animate-bounce-short">
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 p-4 rounded-3xl shadow-2xl border-2 border-white/40 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Radio className="w-6 h-6 animate-ping" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-400 px-2 py-0.5 rounded-full">
                  GPS Tự Động Nhận Diện
                </span>
                <span className="text-xs font-black text-slate-900">
                  (~{proximityAlert.distance}m)
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-950 truncate mt-0.5 leading-tight">
                {proximityAlert.poi.title}
              </h4>
              <p className="text-[11px] font-semibold text-slate-900/90">
                Tự động mở bài thuyết minh trong {proximityAlert.countdown}s...
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                setProximityAlert(null);
                if (onPlayAudio) {
                  onPlayAudio(proximityAlert.poi.id, true);
                } else {
                  onSelectPoi(proximityAlert.poi.id, true);
                }
              }}
              className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs shadow-lg active:scale-95 flex items-center gap-1 flex-shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400" />
              <span>Nghe Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── GPS ERROR BANNER ─── */}
      {gpsErrorMsg && (
        <div className="absolute top-40 left-3 right-3 z-20 glass px-3.5 py-2 rounded-2xl border border-red-500/50 bg-red-950/90 text-red-200 text-xs font-medium flex items-center justify-between shadow-xl animate-fade-in">
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

            {/* Action Button: Audio Guide */}
            <div className="pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  if (onPlayAudio) {
                    onPlayAudio(activeTarget.id, true);
                  } else {
                    onSelectPoi(activeTarget.id, true);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe Thuyết Minh Hiện Vật</span>
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
