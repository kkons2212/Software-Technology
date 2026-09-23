import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  MapPin, Compass, ArrowLeft, Landmark, RefreshCw,
  AlertCircle, Globe, ChevronRight, Sparkles, Share2,
  Lock, Unlock, QrCode, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { visitorApi } from '../../services/visitorApi';
import { useVisitorSession } from '../../context/VisitorSessionContext';
import LanguageSwitcher from '../../components/visitor/LanguageSwitcher';
import AudioPlayer from '../../components/visitor/AudioPlayer';

const LANG_NAME = { vi:'Tiếng Việt', en:'English', ja:'日本語', ko:'한국어', zh:'中文' };

export default function PoiDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { preferredLanguage, setPreferredLanguage, setLastScannedPoiId, openLanguageModal, t } = useVisitorSession();

  const [poi, setPoi]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scrollRef = useRef(null);

  // Kiểm tra trạng thái đã quét QR từ URL hoặc localStorage
  useEffect(() => {
    const fromQr = searchParams.get('from_qr') === 'true' || searchParams.get('scanned') === '1';
    const unlockedStorage = JSON.parse(localStorage.getItem('unlocked_pois') || '{}');
    
    if (fromQr || unlockedStorage[id]) {
      setIsUnlocked(true);
      if (id) {
        setLastScannedPoiId(parseInt(id));
        unlockedStorage[id] = true;
        localStorage.setItem('unlocked_pois', JSON.stringify(unlockedStorage));
      }
    }
  }, [id, searchParams, setLastScannedPoiId]);

  const fetchDetail = async (lang, unlockedState) => {
    try {
      setLoading(true);
      setError(null);
      const data = await visitorApi.getPoiDetail(id, lang, unlockedState);
      setPoi(data);
    } catch (err) {
      setError(err.message || t('poi_not_found_desc'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail(preferredLanguage, isUnlocked);
  }, [id, preferredLanguage, isUnlocked]);

  const handleLangChange = (lang) => {
    setPreferredLanguage(lang);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsUnlocked(true);
      setIsScanning(false);
      const unlockedStorage = JSON.parse(localStorage.getItem('unlocked_pois') || '{}');
      unlockedStorage[id] = true;
      localStorage.setItem('unlocked_pois', JSON.stringify(unlockedStorage));
      if (id) setLastScannedPoiId(parseInt(id));
    }, 1200);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: poi?.title, url: window.location.href });
    } else {
      await navigator.clipboard?.writeText(window.location.href);
    }
  };

  /* ───── Loading ───── */
  if (loading && !poi) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Landmark className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">{t('loading_poi')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('loading_audio')}</p>
        </div>
      </div>
    );
  }

  /* ───── Error ───── */
  if (error || !poi) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-6 text-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{t('poi_not_found')}</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xs">
            {error || t('poi_not_found_desc')}
          </p>
        </div>
        <button onClick={() => fetchDetail(preferredLanguage, isUnlocked)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-semibold hover:bg-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> {t('retry')}
        </button>
        <Link to="/map"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-transform">
          <Compass className="w-4 h-4" /> {t('museum_map')}
        </Link>
      </div>
    );
  }

  /* ───── Main ───── */
  return (
    <div ref={scrollRef} className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col page-enter">

      {/* ── Sticky Top Nav ── */}
      <nav className="sticky top-0 z-40 glass border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        <Link to="/map"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 transition-colors active:scale-95">
          <ArrowLeft className="w-4 h-4" /> {t('back_to_map')}
        </Link>

        <button
          type="button"
          onClick={openLanguageModal}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="text-shimmer font-bold">{LANG_NAME[preferredLanguage] || preferredLanguage}</span>
        </button>

        <button onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 hover:text-white transition-colors active:scale-95"
          title={t('share')}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* ── Hero Image ── */}
      <div className="relative w-full aspect-square sm:aspect-video max-h-[48vh] overflow-hidden bg-slate-900">
        {poi.image_url ? (
          <>
            <img
              src={poi.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-30"
              aria-hidden
            />
            <img
              src={poi.image_url}
              alt={poi.title}
              onLoad={() => setImgLoaded(true)}
              className={`relative w-full h-full object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/30">
            <Landmark className="w-20 h-20 text-amber-400/40" />
          </div>
        )}

        {/* Floor badge */}
        <div className="absolute top-3 left-3 glass px-3 py-1 rounded-full border border-slate-700/60 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow">
          <MapPin className="w-3 h-3" />
          {t('floor_label')} {poi.floor} &nbsp;·&nbsp; #{poi.id}
        </div>

        {/* Scan Status Badge */}
        <div className="absolute top-3 right-3">
          {isUnlocked ? (
            <div className="glass px-3 py-1 rounded-full border border-emerald-500/40 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 shadow bg-emerald-950/40">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('scanned_badge')}
            </div>
          ) : (
            <div className="glass px-3 py-1 rounded-full border border-amber-500/40 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow bg-amber-950/40">
              <Lock className="w-3.5 h-3.5" /> {t('summary_badge')}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 pt-5 pb-16 max-w-lg w-full mx-auto space-y-5">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">{poi.title}</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            {t('current_lang')}: <span className="text-amber-400 font-semibold">{LANG_NAME[preferredLanguage] || preferredLanguage}</span>
          </p>
        </div>

        {/* Short Description (Always Available for Tourists) */}
        {poi.short_description && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> {t('highlight_summary')}
            </p>
            <p className="text-sm text-amber-100/90 leading-relaxed font-medium">
              {poi.short_description}
            </p>
          </div>
        )}

        {/* Language Switcher */}
        <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t('select_narration_lang')}</p>
            <button
              type="button"
              onClick={openLanguageModal}
              className="text-[11px] text-amber-400 font-bold hover:underline"
            >
              {t('change_lang')}
            </button>
          </div>
          <LanguageSwitcher
            activeLang={preferredLanguage}
            onSelectLang={handleLangChange}
            availableLanguages={poi.available_languages}
          />
        </div>

        {/* ── UNLOCKED: Audio Player & Full Description ── */}
        {isUnlocked ? (
          <>
            {/* Audio Player */}
            <AudioPlayer
              audioUrl={poi.audio_url}
              fallbackText={`${poi.title}. ${poi.description}`}
              languageCode={preferredLanguage}
            />

            {/* Full Detailed Description */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {t('full_narration')}
              </h2>
              <p className="text-sm leading-7 text-slate-200 whitespace-pre-line">{poi.description}</p>
            </div>
          </>
        ) : (
          /* ── LOCKED STATE: QR Scan Call to Action ── */
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{t('locked_title')}</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {t('locked_desc')}
              </p>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('authenticating_scan')}</span>
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  <span>{t('scan_to_unlock')}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Location Info */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">{t('location_on_map')}</p>
              <p className="font-bold text-white text-sm">{t('floor_label')} {poi.floor} — ({poi.x_coord}, {poi.y_coord})</p>
            </div>
          </div>
          <Link
            to={`/map?focus_poi=${poi.id}`}
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            {t('view_on_map')} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Navigate to Map CTA */}
        <button
          onClick={() => navigate(`/map?focus_poi=${poi.id}`)}
          className="w-full py-4 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 text-sm font-bold text-slate-200 flex items-center justify-center gap-2.5 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-[0.98]"
        >
          <Compass className="w-5 h-5 text-amber-400" />
          {t('next_recommendation_btn')}
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
