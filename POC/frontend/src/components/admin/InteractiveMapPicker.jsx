import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, LocateFixed, Compass, Layers, CheckCircle2, Sparkles } from 'lucide-react';

const DEFAULT_CENTER_LAT = 10.7769;
const DEFAULT_CENTER_LNG = 106.6953;

// Pin icons
const createPickerPinIcon = () => {
  const html = `
    <div class="relative flex flex-col items-center cursor-move animate-bounce-short">
      <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 border-2 border-white text-slate-950 flex items-center justify-center font-black text-xs shadow-2xl ring-4 ring-amber-400/40">
        📍
      </div>
      <div class="w-2 h-2 bg-amber-400 rotate-45 -mt-1 rounded-xs"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'admin-picker-pin',
    iconSize: [36, 44],
    iconAnchor: [18, 40],
  });
};

const createExistingPoiIcon = (item) => {
  const html = `
    <div class="flex flex-col items-center opacity-75 hover:opacity-100 transition-opacity">
      <div class="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 text-slate-300 flex items-center justify-center text-[10px] font-bold shadow">
        ${item.id}
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'admin-existing-pin',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function InteractiveMapPicker({
  latitude = DEFAULT_CENTER_LAT,
  longitude = DEFAULT_CENTER_LNG,
  onChange,
  existingPois = [],
  currentPoiId = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const existingLayerRef = useRef(null);

  const [latInput, setLatInput] = useState(latitude ? Number(latitude).toFixed(6) : DEFAULT_CENTER_LAT.toFixed(6));
  const [lngInput, setLngInput] = useState(longitude ? Number(longitude).toFixed(6) : DEFAULT_CENTER_LNG.toFixed(6));

  const currentLat = Number(latInput) || DEFAULT_CENTER_LAT;
  const currentLng = Number(lngInput) || DEFAULT_CENTER_LNG;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 18,
      minZoom: 5,
      maxZoom: 21,
      zoomControl: true,
      attributionControl: false,
    });

    // Tile Layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    existingLayerRef.current = L.layerGroup().addTo(map);

    // Draggable Active Target Marker
    const marker = L.marker([currentLat, currentLng], {
      icon: createPickerPinIcon(),
      draggable: true,
    }).addTo(map);

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      const fixedLat = parseFloat(lat.toFixed(6));
      const fixedLng = parseFloat(lng.toFixed(6));
      setLatInput(fixedLat.toString());
      setLngInput(fixedLng.toString());
      if (onChange) onChange(fixedLat, fixedLng);
    });

    activeMarkerRef.current = marker;

    // Click anywhere on map to reposition marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const fixedLat = parseFloat(lat.toFixed(6));
      const fixedLng = parseFloat(lng.toFixed(6));
      marker.setLatLng([fixedLat, fixedLng]);
      setLatInput(fixedLat.toString());
      setLngInput(fixedLng.toString());
      if (onChange) onChange(fixedLat, fixedLng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update existing POIs on map
  useEffect(() => {
    if (!mapInstanceRef.current || !existingLayerRef.current) return;

    existingLayerRef.current.clearLayers();

    existingPois
      .filter((p) => p.id !== currentPoiId && p.latitude && p.longitude)
      .forEach((p) => {
        const marker = L.marker([p.latitude, p.longitude], {
          icon: createExistingPoiIcon(p),
        });
        marker.bindTooltip(`<b>#${p.id}</b> - ${p.title_vi || p.title || ''}`, {
          direction: 'top',
          offset: [0, -10],
          className: 'bg-slate-900 text-white text-xs border border-slate-700 px-2 py-1 rounded-lg shadow-lg',
        });
        existingLayerRef.current.addLayer(marker);
      });
  }, [existingPois, currentPoiId]);

  // Sync internal state when external props change
  useEffect(() => {
    if (latitude && longitude) {
      const fixedLat = parseFloat(Number(latitude).toFixed(6));
      const fixedLng = parseFloat(Number(longitude).toFixed(6));
      setLatInput(fixedLat.toString());
      setLngInput(fixedLng.toString());
      if (activeMarkerRef.current) {
        activeMarkerRef.current.setLatLng([fixedLat, fixedLng]);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([fixedLat, fixedLng], { animate: true });
      }
    }
  }, [latitude, longitude]);

  // Handle manual input change
  const handleInputChange = (newLat, newLng) => {
    setLatInput(newLat);
    setLngInput(newLng);
    const parsedLat = parseFloat(newLat);
    const parsedLng = parseFloat(newLng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      if (activeMarkerRef.current) {
        activeMarkerRef.current.setLatLng([parsedLat, parsedLng]);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([parsedLat, parsedLng]);
      }
      if (onChange) onChange(parsedLat, parsedLng);
    }
  };

  // Quick preset jump
  const handleJumpPreset = (lat, lng) => {
    handleInputChange(lat.toFixed(6), lng.toFixed(6));
  };

  // Current Device GPS
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        handleInputChange(latitude.toFixed(6), longitude.toFixed(6));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 19);
        }
      },
      (err) => alert('Không thể lấy GPS: ' + err.message),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              Toạ Độ GPS Ngoài Trời (Outdoor Map Pin)
              <span className="text-[10px] font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Click hoặc Kéo thả Pin
              </span>
            </p>
            <p className="text-[11px] text-slate-400">
              Nhấp trực tiếp trên bản đồ hoặc kéo thả ghim màu vàng để đặt vị trí hiện vật
            </p>
          </div>
        </div>

        {/* Quick GPS Location Button */}
        <button
          type="button"
          onClick={handleUseCurrentGps}
          className="px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
        >
          <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
          <span>Lấy GPS hiện tại</span>
        </button>
      </div>

      {/* Preset quick buttons */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="text-slate-500 text-[11px] self-center">Chọn nhanh:</span>
        <button
          type="button"
          onClick={() => handleJumpPreset(10.77688, 106.69532)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700"
        >
          🏛️ Cổng Di Tích
        </button>
        <button
          type="button"
          onClick={() => handleJumpPreset(10.77705, 106.69528)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700"
        >
          🌳 Sân Trước
        </button>
        <button
          type="button"
          onClick={() => handleJumpPreset(10.77732, 106.69542)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700"
        >
          🏰 Đại Sảnh Trung Tâm
        </button>
        <button
          type="button"
          onClick={() => handleJumpPreset(10.77718, 106.69562)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700"
        >
          🗿 Gian Trưng Bày Phía Đông
        </button>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* Latitude & Longitude Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Vĩ Độ (Latitude)
          </label>
          <input
            type="number"
            step="0.000001"
            value={latInput}
            onChange={(e) => handleInputChange(e.target.value, lngInput)}
            placeholder="10.776900"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Kinh Độ (Longitude)
          </label>
          <input
            type="number"
            step="0.000001"
            value={lngInput}
            onChange={(e) => handleInputChange(latInput, e.target.value)}
            placeholder="106.695300"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>
      </div>
    </div>
  );
}
