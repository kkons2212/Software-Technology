import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Compass, MapPin, Navigation, ArrowRight, Volume2,
  Landmark, Layers, RefreshCw, AlertTriangle, ChevronRight, X, Globe
} from 'lucide-react';
import { visitorApi } from '../../services/visitorApi';
import { useVisitorSession } from '../../context/VisitorSessionContext';

// ── Museum floor plan layout (room boundaries for SVG)
const ROOMS = [
  { id: 'room1', x: 30,  y: 30,  w: 240, h: 140, label: 'Khu Cổ Vật Tiền Sử' },
  { id: 'room2', x: 330, y: 30,  w: 240, h: 140, label: 'Khu Văn Hóa Đông Sơn' },
  { id: 'hall',  x: 30,  y: 230, w: 540, h: 155, label: 'Đại Sảnh Chính & Cổng Vào' },
];

function FloorPlan({ markers, currentPoi, nextPoi, selectedPoi, onSelectMarker }) {
  const W = 600; const H = 420;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pos = (p) => ({ x: clamp(p.x_coord || 150, 55, 545), y: clamp(p.y_coord || 100, 55, 365) });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none">
      {/* Grid background */}
      <defs>
        <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
        {/* Glow filter */}
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#grid)" />

      {/* Museum rooms */}
      {ROOMS.map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="14"
            fill="#0f172a" stroke="#1e3a5f" strokeWidth="1.5" />
          <text x={r.x + r.w / 2} y={r.y + 22} fill="#475569"
            fontSize="11" fontWeight="600" textAnchor="middle">{r.label}</text>
        </g>
      ))}

      {/* Entrance */}
      <rect x={255} y={378} width={90} height={8} rx="4" fill="#f59e0b" opacity="0.8" />
      <text x={300} y={368} fill="#f59e0b" fontSize="9" fontWeight="700" textAnchor="middle" opacity="0.7">CỔNG VÀO</text>

      {/* Route dashed line */}
      {currentPoi && nextPoi && (() => {
        const a = pos(currentPoi), b = pos(nextPoi);
        return (
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="7 5" opacity="0.6" />
        );
      })()}

      {/* Markers */}
      {markers.map((m) => {
        const { x, y } = pos(m);
        const isCurrent = currentPoi?.id === m.id;
        const isNext    = nextPoi?.id === m.id;
        const isSel     = selectedPoi?.id === m.id;
        const r         = isSel ? 18 : isCurrent ? 16 : 13;
        const fill      = isCurrent ? '#f59e0b' : isNext ? '#38bdf8' : '#1e293b';
        const stroke    = isSel ? '#ffffff' : isCurrent ? '#d97706' : isNext ? '#0ea5e9' : '#334155';

        return (
          <g key={m.id} onClick={() => onSelectMarker(m)} className="cursor-pointer">
            {(isCurrent || isNext) && (
              <circle cx={x} cy={y} r={r + 10}
                fill={isCurrent ? '#f59e0b' : '#38bdf8'} opacity="0.15" />
            )}
            {isCurrent && (
              <circle cx={x} cy={y} r={r + 6} fill="#f59e0b" opacity="0.2" filter="url(#glow)" />
            )}
            <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="2.5" />
            <text x={x} y={y + 4}
              fill={isCurrent ? '#090d16' : '#e2e8f0'}
              fontSize="11" fontWeight="700" textAnchor="middle">{m.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function InteractiveMapPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { lastScannedPoiId, preferredLanguage, openLanguageModal, t } = useVisitorSession();

  const [floor, setFloor]             = useState(1);
  const [rec, setRec]                 = useState(null);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

  const focusPoiId = searchParams.get('focus_poi')
    ? parseInt(searchParams.get('focus_poi'))
    : lastScannedPoiId;

  const load = async (f) => {
    try {
      setLoading(true);
      setError(false);
      const data = await visitorApi.getRouteRecommendation(focusPoiId, f);
      setRec(data);
      setSelected(data.current_poi || data.next_poi || null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(floor); }, [focusPoiId, floor]);

  const current = rec?.current_poi;
  const next    = rec?.next_poi;
  const markers = rec?.all_markers || [];

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

        {/* Floor toggle & Language switch button */}
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
            <button onClick={() => setFloor(1)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                floor === 1 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}>
              {t('floor_label')} 1
            </button>
            <button onClick={() => setFloor(2)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                floor === 2 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}>
              {t('floor_label')} 2
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-3 px-3 py-3 max-w-2xl w-full mx-auto">

        {/* ── Route recommendation banner ── */}
        {next && !loading && (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/80 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">{t('next_suggested')} (UC-02)</p>
              <p className="text-sm font-bold text-white truncate">{next.title}</p>
            </div>
            <button onClick={() => navigate(`/poi/${next.id}`)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-transform">
              {t('go_to')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── SVG Map Canvas ── */}
        <div className="relative bg-slate-950/90 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl"
          style={{ minHeight: 280 }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-sm text-slate-300">{t('poi_not_found_desc')}</p>
              <button onClick={() => load(floor)}
                className="text-xs text-amber-400 underline underline-offset-4">{t('retry')}</button>
            </div>
          ) : (
            <FloorPlan
              markers={markers}
              currentPoi={current}
              nextPoi={next}
              selectedPoi={selected}
              onSelectMarker={setSelected}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 glass rounded-xl border border-slate-800 p-2.5 space-y-1 text-[10px]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/><span className="text-slate-300">{t('current_location')}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"/><span className="text-slate-300">{t('next_location')}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block"/><span className="text-slate-400">{t('other_location')}</span></div>
          </div>
        </div>

        {/* ── Selected POI Preview Card ── */}
        {selected && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xl">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {selected.image_url
                  ? <img src={selected.image_url} alt={selected.title} className="w-full h-full object-cover" />
                  : <Landmark className="w-6 h-6 text-amber-400/60" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">#{selected.id}</p>
                <h3 className="text-sm font-bold text-white truncate">{selected.title}</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  {t('floor_label')} {selected.floor} &nbsp;·&nbsp; ({selected.x_coord}, {selected.y_coord})
                </p>
              </div>
            </div>

            {/* Short Description */}
            {selected.short_description && (
              <p className="text-xs text-slate-300/90 leading-relaxed sm:flex-1 line-clamp-2 px-1">
                {selected.short_description}
              </p>
            )}

            {/* CTA */}
            <button onClick={() => navigate(`/poi/${selected.id}`)}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 active:scale-95 transition-transform">
              <Volume2 className="w-4 h-4" />
              <span>{t('audio_guide')}</span>
            </button>
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
                const isCur = current?.id === m.id;
                const isNxt = next?.id === m.id;
                const isSel = selected?.id === m.id;

                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelected(m); }}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                      isSel
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : isCur
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Number Badge / Image */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden ${
                        isCur ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' : isNxt ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400'}`}>
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
                        <p className={`text-sm font-bold truncate ${isCur ? 'text-amber-300' : 'text-slate-100'}`}>
                          {m.title}
                        </p>
                        {isCur && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 flex-shrink-0">{t('current_location')}</span>}
                        {isNxt && !isCur && <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30 flex-shrink-0">{t('next_location')}</span>}
                      </div>

                      {m.short_description ? (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {m.short_description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">{t('floor_label')} {m.floor} · ({m.x_coord}, {m.y_coord})</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/poi/${m.id}`); }}
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
