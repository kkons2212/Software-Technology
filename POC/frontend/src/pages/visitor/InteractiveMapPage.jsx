import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Compass, MapPin, Navigation, ArrowRight, Volume2,
  Landmark, Layers, RefreshCw, AlertTriangle, ChevronRight, X, Globe,
  CheckCircle2, TrendingUp, RotateCcw, Sparkles
} from 'lucide-react';
import { visitorApi } from '../../services/visitorApi';
import { useVisitorSession } from '../../context/VisitorSessionContext';
import {
  ROOMS_BY_FLOOR,
  STAIRS_CONFIG,
  ENTRANCE_CONFIG,
  findNavigationPath,
  pointsToSvgPath,
  SVG_WIDTH,
  SVG_HEIGHT
} from '../../config/mapConfig';

function FloorPlan({
  floor,
  markers,
  currentPoi,
  nextPoi,
  customTargetPoi,
  selectedPoi,
  onSelectMarker,
  isPoiListened,
  onSelectStairs,
}) {
  const W = SVG_WIDTH;
  const H = SVG_HEIGHT;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pos = (p) => ({
    x: clamp(p.x_coord || 150, 45, W - 45),
    y: clamp(p.y_coord || 100, 45, H - 45),
  });

  const rooms = ROOMS_BY_FLOOR[floor] || ROOMS_BY_FLOOR[1];

  // Tính toán lộ trình navigation theo ô cửa & hành lang (hỗ trợ chỉ đường xuyên tầng)
  const { routePath, isStairsTarget } = useMemo(() => {
    // 1. Khách chủ động chọn "Chỉ đường tới đây"
    if (customTargetPoi) {
      if (customTargetPoi.floor !== floor) {
        // Đích đến nằm ở tầng khác -> trên tầng này mục tiêu là CẦU THANG để chuyển tầng
        const startPt = currentPoi && currentPoi.floor === floor
          ? currentPoi
          : (floor === 2 ? STAIRS_CONFIG.center : ENTRANCE_CONFIG.center);
        const pts = findNavigationPath(startPt, STAIRS_CONFIG.center, floor);
        return {
          routePath: pointsToSvgPath(pts),
          isStairsTarget: true,
        };
      } else {
        // Đích đến nằm ở chính tầng đang xem
        const startPt = currentPoi && currentPoi.floor === floor
          ? currentPoi
          : (floor === 2 ? STAIRS_CONFIG.center : ENTRANCE_CONFIG.center);
        const pts = findNavigationPath(startPt, customTargetPoi, floor);
        return {
          routePath: pointsToSvgPath(pts),
          isStairsTarget: false,
        };
      }
    }

    // 2. Lộ trình gợi ý tự động (AI Recommendation)
    if (!nextPoi) return { routePath: '', isStairsTarget: false };

    let startPoint = currentPoi;
    if (!startPoint || startPoint.floor !== floor) {
      startPoint = floor === 2 ? STAIRS_CONFIG.center : ENTRANCE_CONFIG.center;
    }
    const targetPoint = nextPoi.is_stairs ? STAIRS_CONFIG.center : nextPoi;
    const points = findNavigationPath(startPoint, targetPoint, floor);
    return {
      routePath: pointsToSvgPath(points),
      isStairsTarget: Boolean(nextPoi.is_stairs),
    };
  }, [currentPoi, nextPoi, customTargetPoi, floor]);

  const highlightStairs = isStairsTarget || (nextPoi?.is_stairs && !customTargetPoi);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none">
      {/* Background Grid & Filters */}
      <defs>
        <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="greenGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#grid)" />

      {/* Museum Rooms (Phân vùng theo từng tầng) */}
      {rooms.map((r) => (
        <g key={r.id}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx="14"
            fill="#0f172a"
            stroke="#1e3a5f"
            strokeWidth="1.5"
          />
          <text
            x={r.x + r.w / 2}
            y={r.y + 22}
            fill="#64748b"
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
          >
            {r.label}
          </text>

          {/* Ô cửa mở / Lối ra vào phòng */}
          {r.doorWay && (
            <line
              x1={r.doorWay.x1}
              y1={r.doorWay.y}
              x2={r.doorWay.x2}
              y2={r.doorWay.y}
              stroke="#090d16"
              strokeWidth="4"
              strokeDasharray="4 2"
            />
          )}
        </g>
      ))}

      {/* Khu vực Cầu Thang (Stairs) - Đồng bộ trên cả Tầng 1 và Tầng 2 */}
      <g
        onClick={() => onSelectStairs && onSelectStairs()}
        className="cursor-pointer group"
      >
        {highlightStairs && (
          <rect
            x={STAIRS_CONFIG.x - 4}
            y={STAIRS_CONFIG.y - 4}
            width={STAIRS_CONFIG.w + 8}
            height={STAIRS_CONFIG.h + 8}
            rx="12"
            fill="#38bdf8"
            opacity="0.25"
            filter="url(#glow)"
            className="animate-pulse"
          />
        )}
        <rect
          x={STAIRS_CONFIG.x}
          y={STAIRS_CONFIG.y}
          width={STAIRS_CONFIG.w}
          height={STAIRS_CONFIG.h}
          rx="10"
          fill="#131c31"
          stroke={highlightStairs ? '#38bdf8' : '#254b77'}
          strokeWidth={highlightStairs ? '2' : '1.5'}
        />
        {/* Các bậc thang mô phỏng */}
        <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 13} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 13} stroke="#334155" strokeWidth="1.5" />
        <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 22} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 22} stroke="#334155" strokeWidth="1.5" />
        <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 31} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 31} stroke="#334155" strokeWidth="1.5" />
        <line x1={STAIRS_CONFIG.x + 8} y1={STAIRS_CONFIG.y + 40} x2={STAIRS_CONFIG.x + STAIRS_CONFIG.w - 8} y2={STAIRS_CONFIG.y + 40} stroke="#334155" strokeWidth="1.5" />

        <text
          x={STAIRS_CONFIG.center.x}
          y={STAIRS_CONFIG.y + 28}
          fill={highlightStairs ? '#7dd3fc' : '#64748b'}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          {STAIRS_CONFIG.label}
        </text>
      </g>

      {/* Cổng vào chính (Chỉ xuất hiện ở Tầng 1) */}
      {floor === 1 && (
        <g>
          <rect
            x={ENTRANCE_CONFIG.x}
            y={ENTRANCE_CONFIG.y}
            width={ENTRANCE_CONFIG.w}
            height={ENTRANCE_CONFIG.h}
            rx="4"
            fill="#f59e0b"
            opacity="0.85"
          />
          <text
            x={ENTRANCE_CONFIG.center.x}
            y={ENTRANCE_CONFIG.y - 6}
            fill="#f59e0b"
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
            opacity="0.8"
          >
            {ENTRANCE_CONFIG.label}
          </text>
        </g>
      )}

      {/* Tuyến đường chỉ dẫn thông minh qua hành lang/cửa ra vào (SVG Path bo góc) */}
      {routePath && (
        <g>
          {/* Lớp nền phát sáng (glow) */}
          <path
            d={routePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="6"
            opacity="0.25"
            filter="url(#glow)"
          />
          {/* Tuyến nét đứt chuyển động */}
          <path
            d={routePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="7 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* POI Markers */}
      {markers.map((m) => {
        const { x, y } = pos(m);
        const isCurrent = currentPoi?.id === m.id && currentPoi?.floor === floor;
        const isTarget = (customTargetPoi?.id === m.id && customTargetPoi?.floor === floor) || (!customTargetPoi && nextPoi?.id === m.id);
        const isSel = selectedPoi?.id === m.id;
        const listened = isPoiListened?.(m.id);

        const r = isSel ? 18 : isCurrent ? 16 : 13;

        // Phân cấp màu sắc hiển thị
        let fill = '#1e293b';
        let stroke = '#334155';

        if (isCurrent) {
          fill = '#f59e0b';
          stroke = isSel ? '#ffffff' : '#d97706';
        } else if (isTarget) {
          fill = '#0284c7';
          stroke = isSel ? '#ffffff' : '#38bdf8';
        } else if (listened) {
          fill = '#10b981';
          stroke = isSel ? '#ffffff' : '#34d399';
        } else if (isSel) {
          stroke = '#ffffff';
        }

        return (
          <g key={m.id} onClick={() => onSelectMarker(m)} className="cursor-pointer">
            {/* Vòng pulsing cho vị trí hiện tại và điểm đích */}
            {(isCurrent || isTarget) && (
              <circle
                cx={x}
                cy={y}
                r={r + 10}
                fill={isCurrent ? '#f59e0b' : '#38bdf8'}
                opacity="0.18"
              />
            )}

            {/* Vòng hào quang xanh cho POI đã nghe */}
            {listened && !isCurrent && (
              <circle
                cx={x}
                cy={y}
                r={r + 5}
                fill="#10b981"
                opacity="0.2"
                filter="url(#greenGlow)"
              />
            )}

            {isCurrent && (
              <circle
                cx={x}
                cy={y}
                r={r + 6}
                fill="#f59e0b"
                opacity="0.25"
                filter="url(#glow)"
              />
            )}

            {/* Điểm Marker chính */}
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSel ? '3' : '2'}
            />

            {/* Số ID của POI */}
            <text
              x={x}
              y={y + 4}
              fill={isCurrent ? '#090d16' : '#ffffff'}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {m.id}
            </text>

            {/* Dấu tích xanh nhỏ góc trên bên phải khi đã nghe */}
            {listened && (
              <g transform={`translate(${x + 6}, ${y - 12})`}>
                <circle cx="5" cy="5" r="6" fill="#047857" stroke="#10b981" strokeWidth="1.5" />
                <path
                  d="M 2.5 5.2 L 4.2 6.8 L 7.5 3.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function InteractiveMapPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    lastScannedPoiId,
    listenedPoiIds,
    isPoiListened,
    resetListenedPois,
    preferredLanguage,
    openLanguageModal,
    t
  } = useVisitorSession();

  const [floor, setFloor] = useState(1);
  const [rec, setRec] = useState(null);
  const [selected, setSelected] = useState(null);
  const [customTargetPoi, setCustomTargetPoi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const focusPoiId = searchParams.get('focus_poi')
    ? parseInt(searchParams.get('focus_poi'))
    : lastScannedPoiId;

  const load = async (f) => {
    try {
      setLoading(true);
      setError(false);
      const data = await visitorApi.getRouteRecommendation(focusPoiId, f, listenedPoiIds);
      setRec(data);
      // Thông minh chọn preview POI phù hợp với tầng f hiện tại
      const floorPois = data.all_markers || [];
      if (data.current_poi && data.current_poi.floor === f) {
        setSelected(data.current_poi);
      } else if (data.next_poi && data.next_poi.floor === f && !data.next_poi.is_stairs) {
        setSelected(data.next_poi);
      } else if (floorPois.length > 0) {
        setSelected(floorPois[0]);
      } else {
        setSelected(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(floor);
  }, [focusPoiId, floor, listenedPoiIds]);

  const current = rec?.current_poi;
  const next = rec?.next_poi;
  const markers = rec?.all_markers || [];

  // Tính tiến độ tham quan của tầng hiện tại
  const totalExhibits = markers.length;
  const listenedCount = markers.filter((m) => isPoiListened(m.id)).length;
  const progressPercent = totalExhibits > 0 ? Math.round((listenedCount / totalExhibits) * 100) : 0;

  // Khi click vào khu vực cầu thang
  const handleSelectStairs = () => {
    if (floor === 1) {
      setFloor(2);
    } else {
      setFloor(1);
    }
  };

  // Khách bấm chọn marker trên bản đồ
  const handleSelectMarker = (m) => {
    setSelected(m);
  };

  // Khách chọn "Chỉ đường tới đây"
  const handleNavigateHere = (poi) => {
    setCustomTargetPoi(poi);
  };

  // Khách muốn quay lại gợi ý tự động
  const handleClearCustomTarget = () => {
    setCustomTargetPoi(null);
  };

  // Khách chọn tham quan lại từ đầu
  const handleRestartTour = () => {
    if (window.confirm(t('confirm_restart'))) {
      resetListenedPois();
      setFloor(1);
      setCustomTargetPoi(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col page-enter">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 glass border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{t('map_title')}</h1>
            <p className="text-[11px] text-slate-400 truncate">
              {current ? `📍 ${current.title}` : t('select_poi_prompt')}
            </p>
          </div>
        </div>

        {/* Floor toggle & Language switch button (Không reset customTargetPoi khi chuyển tầng) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={openLanguageModal}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 text-xs font-bold transition-all"
            title={t('change_lang')}
          >
            <Globe className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setFloor(1)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                floor === 1
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('floor_label')} 1
            </button>
            <button
              onClick={() => setFloor(2)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                floor === 2
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('floor_label')} 2
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-3 px-3 py-3 max-w-2xl w-full mx-auto">

        {/* ── Banner Chúc Mừng Hoàn Thành Toàn Bộ Bảo Tàng (Cả 2 Tầng) ── */}
        {rec?.all_completed && !customTargetPoi && !loading && (
          <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  🎉 {t('all_completed_title')}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {t('all_completed_desc')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleRestartTour}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/30 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('restart_tour')}</span>
              </button>
              <button
                onClick={handleClearCustomTarget}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all"
              >
                <Compass className="w-4 h-4 text-sky-400" />
                <span>{t('free_roam')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Banner Đang Chỉ Đường Theo Yêu Cầu (Hỗ trợ xuyên tầng) ── */}
        {customTargetPoi && !loading && (() => {
          const isTargetOnCurrentFloor = customTargetPoi.floor === floor;
          const targetFloor = customTargetPoi.floor;
          const directionText = targetFloor > floor ? 'lên' : 'xuống';

          return (
            <div className="bg-gradient-to-r from-sky-950/70 via-slate-900/90 to-slate-900 border border-sky-500/40 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 flex-shrink-0 animate-pulse">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                      {t('navigating_requested')} · Tầng {targetFloor}
                    </p>
                    {isPoiListened(customTargetPoi.id) && (
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30">
                        ✓ {t('listened_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white truncate">{customTargetPoi.title}</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {!isTargetOnCurrentFloor
                      ? `Vui lòng di chuyển tới CẦU THANG để ${directionText} Tầng ${targetFloor}`
                      : (current?.floor !== floor
                          ? `Từ Cầu Thang đi tới hiện vật trên Tầng ${floor}`
                          : `Đi theo hành lang tới hiện vật`)
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleClearCustomTarget}
                  className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
                  title="Quay lại gợi ý tự động"
                >
                  {t('auto_suggest')}
                </button>
                {!isTargetOnCurrentFloor ? (
                  <button
                    onClick={() => setFloor(targetFloor)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
                  >
                    <span>{t('floor_label')} {targetFloor}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/poi/${customTargetPoi.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20 active:scale-95 transition-transform"
                  >
                    {t('go_to')} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Banner Đề Xuất Chuyển Tầng khi Hoàn Thành Một Tầng (Tự động) ── */}
        {!customTargetPoi && !rec?.all_completed && rec?.floor_completed && rec?.suggest_next_floor && !loading && (
          <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-sky-950/70 border border-emerald-500/40 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Hoàn Thành Tầng {floor}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                  {rec.next_poi?.short_description || `Bạn đã nghe hết các hiện vật tại Tầng ${floor}! Hãy di chuyển tới Cầu Thang để sang Tầng ${rec.suggest_next_floor}.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFloor(rec.suggest_next_floor)}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Sang Tầng {rec.suggest_next_floor}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Route recommendation banner (Cho POI kế tiếp chưa nghe tự động) ── */}
        {!customTargetPoi && next && !rec?.floor_completed && !loading && (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/80 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                {t('next_suggested')}
              </p>
              <p className="text-sm font-bold text-white truncate">{next.title}</p>
            </div>
            {next.id !== 'stairs' && (
              <button
                onClick={() => navigate(`/poi/${next.id}`)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
              >
                {t('go_to')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* ── SVG Map Canvas ── */}
        <div className="bg-slate-950/90 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="relative" style={{ minHeight: 280 }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-sm text-slate-300">{t('poi_not_found_desc')}</p>
                <button
                  onClick={() => load(floor)}
                  className="text-xs text-amber-400 underline underline-offset-4"
                >
                  {t('retry')}
                </button>
              </div>
            ) : (
              <FloorPlan
                floor={floor}
                markers={markers}
                currentPoi={current}
                nextPoi={next}
                customTargetPoi={customTargetPoi}
                selectedPoi={selected}
                onSelectMarker={handleSelectMarker}
                isPoiListened={isPoiListened}
                onSelectStairs={handleSelectStairs}
              />
            )}
          </div>

          {/* Legend: Đặt ở thanh bar bên dưới bản đồ, vừa tinh tế, vừa không bao giờ che khuất bất kỳ POI hay đường đi nào */}
          <div className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-2.5 flex items-center justify-center sm:justify-between gap-3 flex-wrap text-[11px]">
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
                <span className="text-emerald-300 font-medium">{t('listened_legend')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400/50" />
                <span className="text-slate-300">{t('current_location')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-400/50" />
                <span className="text-slate-300">{t('next_location')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                <span className="text-slate-400">{t('other_location')}</span>
              </div>
            </div>

            <span className="hidden sm:inline-block text-[10px] text-slate-500 font-medium">
              {t('click_to_view')}
            </span>
          </div>
        </div>

        {/* ── Progress Bar Tham Quan Tầng ── */}
        {totalExhibits > 0 && !loading && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300 font-medium truncate">
                {t('tour_progress')} Tầng {floor}: <strong className="text-emerald-400">{listenedCount}/{totalExhibits}</strong> ({progressPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {listenedPoiIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestartTour}
                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 ml-1.5 px-2 py-1 rounded-lg border border-slate-800 hover:border-amber-500/30 transition-all"
                  title={t('restart_tour')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('reset_progress')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Selected POI Preview Card ── */}
        {selected && selected.id !== 'stairs' && !loading && (
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Thumbnail + Title + Meta + Short desc */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {/* Thumbnail */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-inner mt-0.5">
                  {selected.image_url ? (
                    <img
                      src={selected.image_url}
                      alt={selected.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Landmark className="w-6 h-6 text-amber-400/60" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      #{selected.id}
                    </span>
                    {isPoiListened(selected.id) && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ✓ {t('listened_badge')}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {t('floor_label')} {selected.floor} &nbsp;·&nbsp; ({Math.round(selected.x_coord)}, {Math.round(selected.y_coord)})
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white truncate" title={selected.title}>
                    {selected.title}
                  </h3>

                  {selected.short_description && (
                    <p className="text-xs text-slate-300/80 leading-relaxed line-clamp-2">
                      {selected.short_description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: CTAs (Chỉ đường tới đây + Nghe Audio Guide) */}
              <div className="flex items-center gap-2.5 flex-shrink-0 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => handleNavigateHere(selected)}
                  className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 border whitespace-nowrap ${
                    customTargetPoi?.id === selected.id
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {customTargetPoi?.id === selected.id ? t('navigating_to') : t('navigate_here')}
                  </span>
                </button>

                <button
                  onClick={() => navigate(`/poi/${selected.id}`)}
                  className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 active:scale-95 transition-transform whitespace-nowrap"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('audio_guide')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── All exhibits list ── */}
        {markers.length > 0 && !loading && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                {t('all_exhibits')} — {t('floor_label')} {floor} ({markers.length} {t('items_count')})
              </p>
              <span className="text-[10px] text-amber-400/80 font-medium">{t('click_to_view')}</span>
            </div>

            <div className="space-y-2.5">
              {markers.map((m) => {
                const isCur = current?.id === m.id && current?.floor === floor;
                const isNxt = (customTargetPoi?.id === m.id && customTargetPoi?.floor === floor) || (!customTargetPoi && next?.id === m.id);
                const isSel = selected?.id === m.id;
                const listened = isPoiListened(m.id);

                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelected(m); }}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                      isSel
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : isCur
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : listened
                            ? 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-700/60'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Number Badge / Image */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden ${
                          isCur
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : isNxt
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : listened
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" />
                        ) : (
                          <span>#{m.id}</span>
                        )}
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-950 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/40 flex items-center justify-center">
                        {m.id}
                      </span>
                    </div>

                    {/* Info & Short Description */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${isCur ? 'text-amber-300' : listened ? 'text-emerald-300' : 'text-slate-100'}`}>
                          {m.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {listened && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-0.5">
                              ✓ {t('listened_badge')}
                            </span>
                          )}
                          {isCur && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                              {t('current_location')}
                            </span>
                          )}
                          {isNxt && !isCur && (
                            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30">
                              {customTargetPoi?.id === m.id ? t('navigating_to') : t('next_location')}
                            </span>
                          )}
                        </div>
                      </div>

                      {m.short_description ? (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {m.short_description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          {t('floor_label')} {m.floor} · ({Math.round(m.x_coord)}, {Math.round(m.y_coord)})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateHere(m);
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-400 hover:text-slate-950 border border-slate-700 transition-colors"
                        title={t('navigate_here')}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/poi/${m.id}`);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                      >
                        {t('audio_guide')} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {markers.length === 0 && !loading && !error && (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-sm">Tầng {floor} chưa có hiện vật nào được nhập.</p>
          </div>
        )}
      </div>
    </div>
  );
}
