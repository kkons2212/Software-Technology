import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Move, Layers, Sparkles, LocateFixed } from 'lucide-react';
import {
  ROOMS_BY_FLOOR,
  STAIRS_CONFIG,
  ENTRANCE_CONFIG,
  SVG_WIDTH,
  SVG_HEIGHT
} from '../../config/mapConfig';

export default function InteractiveMapPicker({
  xCoord = 150,
  yCoord = 150,
  floor = 1,
  onChange,
  onFloorChange,
  existingPois = [],
  currentPoiId = null,
}) {
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);

  const rooms = ROOMS_BY_FLOOR[floor] || ROOMS_BY_FLOOR[1];

  // Convert client mouse/touch coordinates to SVG coordinates (0 - 600, 0 - 420)
  const getSvgCoordinates = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: xCoord, y: yCoord };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;

    // Constrain inside bounds with padding
    x = Math.round(Math.max(40, Math.min(SVG_WIDTH - 40, x)));
    y = Math.round(Math.max(40, Math.min(SVG_HEIGHT - 40, y)));
    return { x, y };
  }, [xCoord, yCoord]);

  // Click on SVG map to place pin
  const handleSvgClick = (e) => {
    if (isDragging) return;
    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
    onChange(x, y);
  };

  // Drag handlers
  const handlePointerDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
    onChange(x, y);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture?.(e.pointerId);
    }
  };

  // Quick preset jump to center of room
  const handleJumpToRoom = (room) => {
    onChange(room.center.x, room.center.y);
  };

  // Filter existing POIs on current floor
  const floorPois = existingPois.filter(
    (p) => p.floor === floor && p.id !== currentPoiId
  );

  return (
    <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              Vị Trí Trên Sơ Đồ Bảo Tàng
              <span className="text-[10px] font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Click hoặc Kéo thả Pin
              </span>
            </p>
            <p className="text-[11px] text-slate-400">
              Nhấp vào bản đồ hoặc kéo điểm đánh dấu màu vàng để chọn toạ độ
            </p>
          </div>
        </div>

        {/* Floor Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => onFloorChange(1)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              floor === 1
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tầng 1
          </button>
          <button
            type="button"
            onClick={() => onFloorChange(2)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              floor === 2
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tầng 2
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        className="relative bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden shadow-inner cursor-crosshair select-none"
        style={{ aspectRatio: '600 / 420' }}
        onClick={handleSvgClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full"
        >
          {/* Grid pattern */}
          <defs>
            <pattern id="pickerGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.6" />
            </pattern>
            <filter id="pickerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#pickerGrid)" />

          {/* Museum Room zones */}
          {rooms.map((r) => {
            const isHovered = hoveredRoom === r.id;
            return (
              <g
                key={r.id}
                onMouseEnter={() => setHoveredRoom(r.id)}
                onMouseLeave={() => setHoveredRoom(null)}
              >
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx="14"
                  fill={isHovered ? '#1e293b' : '#0f172a'}
                  stroke={isHovered ? '#38bdf8' : '#1e3a5f'}
                  strokeWidth={isHovered ? '2' : '1.5'}
                  className="transition-colors duration-200"
                />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 22}
                  fill={isHovered ? '#7dd3fc' : '#64748b'}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {r.label}
                </text>
              </g>
            );
          })}

          {/* Stairs Zone on Both Floors */}
          <g>
            <rect
              x={STAIRS_CONFIG.x}
              y={STAIRS_CONFIG.y}
              width={STAIRS_CONFIG.w}
              height={STAIRS_CONFIG.h}
              rx="10"
              fill="#131c31"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 13} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 13} stroke="#475569" strokeWidth="1.5" />
            <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 22} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 22} stroke="#475569" strokeWidth="1.5" />
            <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 31} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 31} stroke="#475569" strokeWidth="1.5" />
            <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 40} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 40} stroke="#475569" strokeWidth="1.5" />
            <text
              x={STAIRS_CONFIG.center.x}
              y={STAIRS_CONFIG.y + 28}
              fill="#7dd3fc"
              fontSize="9"
              fontWeight="700"
              textAnchor="middle"
            >
              {STAIRS_CONFIG.label}
            </text>
          </g>

          {/* Entrance marker on Floor 1 */}
          {floor === 1 && (
            <g>
              <rect x={ENTRANCE_CONFIG.x} y={ENTRANCE_CONFIG.y} width={ENTRANCE_CONFIG.w} height={ENTRANCE_CONFIG.h} rx="4" fill="#f59e0b" opacity="0.8" />
              <text x={ENTRANCE_CONFIG.center.x} y={ENTRANCE_CONFIG.y - 4} fill="#f59e0b" fontSize="9" fontWeight="700" textAnchor="middle" opacity="0.8">
                {ENTRANCE_CONFIG.label}
              </text>
            </g>
          )}

          {/* Existing other POIs (Reference Markers) */}
          {floorPois.map((poi) => (
            <g key={poi.id} opacity="0.45">
              <circle
                cx={poi.x_coord}
                cy={poi.y_coord}
                r="10"
                fill="#334155"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <text
                x={poi.x_coord}
                y={poi.y_coord + 3.5}
                fill="#cbd5e1"
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
              >
                #{poi.id}
              </text>
            </g>
          ))}

          {/* ── Active Draggable Marker Pin ── */}
          <g
            transform={`translate(${xCoord}, ${yCoord})`}
            onPointerDown={handlePointerDown}
            className="cursor-grab active:cursor-grabbing"
          >
            {/* Pulsing ring animation */}
            <circle
              r="22"
              fill="#f59e0b"
              opacity="0.25"
              filter="url(#pickerGlow)"
              className="animate-pulse"
            />
            <circle
              r="14"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="2.5"
              className="shadow-xl"
            />
            {/* Center icon / dot */}
            <circle r="4" fill="#090d16" />

            {/* Floating Coordinate Label above pin */}
            <g transform="translate(0, -24)">
              <rect
                x="-42"
                y="-14"
                width="84"
                height="20"
                rx="6"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1"
                opacity="0.95"
              />
              <text
                x="0"
                y="0"
                fill="#fde68a"
                fontSize="9.5"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {Math.round(xCoord)}, {Math.round(yCoord)}
              </text>
            </g>
          </g>
        </svg>

        {/* Live coordinate badge */}
        <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-2 text-xs shadow-lg pointer-events-none">
          <LocateFixed className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-300 font-mono">
            X: <strong className="text-amber-400">{Math.round(xCoord)}</strong> &nbsp;
            Y: <strong className="text-amber-400">{Math.round(yCoord)}</strong>
          </span>
        </div>

        {/* Dragging hint */}
        <div className="absolute bottom-3 right-3 glass px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1 pointer-events-none">
          <Move className="w-3 h-3 text-amber-400" />
          {isDragging ? 'Đang kéo thả...' : 'Kéo thả điểm vàng để chỉnh toạ độ'}
        </div>
      </div>

      {/* Quick Jump Buttons to Rooms */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] text-slate-400 font-medium mr-1">Đặt nhanh vào:</span>
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => handleJumpToRoom(room)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-[11px] font-medium text-slate-300 hover:text-amber-300 transition-all active:scale-95"
          >
            📍 {room.label}
          </button>
        ))}
      </div>
    </div>
  );
}
