import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  QrCode, Globe, ArrowLeft, Landmark, RefreshCw,
  AlertCircle, Sparkles, Lock, CheckCircle2,
  ShieldCheck, Headphones, List, ChevronRight,
  ChevronLeft, ChevronDown, Home
} from 'lucide-react';
import { visitorApi } from '../../services/visitorApi';
import { useVisitorSession } from '../../context/VisitorSessionContext';
import LanguageSwitcher from '../../components/visitor/LanguageSwitcher';
import AudioPlayer from '../../components/visitor/AudioPlayer';
import QrScannerModal from '../../components/visitor/QrScannerModal';

const LANG_NAME = { vi: 'Tiếng Việt', en: 'English', ja: '日本語', ko: '한국어', zh: '中文' };
const LANG_FLAG = { vi: '🇻🇳', en: '🇬🇧', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳' };

// Placeholder slides for museum showcase (will be replaced with real images later)
const MUSEUM_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=1200&q=80',
    title: {
      vi: 'Đại Sảnh Trung Tâm & Kiến Trúc',
      en: 'Grand Central Hall & Architecture',
      ja: '中央メインホールと建築美',
      ko: '중앙 대홀 및 건축',
      zh: '中央大厅与宏伟建筑'
    },
    subtitle: {
      vi: 'Không gian trưng bày nghệ thuật & di sản lịch sử',
      en: 'Exhibition space of art & historical heritage',
      ja: '芸術と歴史的遺産の展示空間',
      ko: '예술 및 역사 유산 전시 공간',
      zh: '艺术与历史文化遗产展示空间'
    },
    tag: {
      vi: 'Tầng Trệt - Sảnh Chính',
      en: 'Ground Floor - Main Hall',
      ja: '1階 - メインホール',
      ko: '1층 - 중앙 홀',
      zh: '1楼 - 中央大厅'
    }
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80',
    title: {
      vi: 'Không Gian Điêu Khắc Cổ Điển',
      en: 'Classical Sculpture Gallery',
      ja: '古典彫刻ギャラリー',
      ko: '고전 조각 갤러리',
      zh: '古典雕塑艺术展厅'
    },
    subtitle: {
      vi: 'Bộ sưu tập tượng đài và tác phẩm đá quý hiếm',
      en: 'Collection of monumental statues & rare stone works',
      ja: '歴史的な彫像と貴重な石造作品コレクション',
      ko: '역사적인 기념상과 희귀 석조 컬렉션',
      zh: '珍贵石雕与古典艺术造像精选'
    },
    tag: {
      vi: 'Tầng Trệt - Phòng Điêu Khắc',
      en: 'Ground Floor - Sculpture Gallery',
      ja: '1階 - 彫刻ギャラリー',
      ko: '1층 - 조각 갤러리',
      zh: '1楼 - 雕塑展厅'
    }
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1200&q=80',
    title: {
      vi: 'Khu Trưng Bày Cổ Vật Hoàng Gia',
      en: 'Royal Antiquities & Artifacts',
      ja: '王室の古代遺物と美術品',
      ko: '왕실 고대 유물 및 예술품',
      zh: '皇家珍宝与古代文物'
    },
    subtitle: {
      vi: 'Hiện vật hoàng gia qua các triều đại lịch sử',
      en: 'Royal relics across historical dynasties',
      ja: '各王朝にわたる皇室の歴史的遺物',
      ko: '역대 왕조를 아우르는 왕실 유물',
      zh: '历代王朝宫廷典藏文物'
    },
    tag: {
      vi: 'Lầu 1 - Phòng Di Sản',
      en: '1st Floor - Heritage Gallery',
      ja: '2階 - 歴史遺産ギャラリー',
      ko: '2층 - 유산 갤러리',
      zh: '2楼 - 历史遗产展厅'
    }
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80',
    title: {
      vi: 'Gian Trưng Bày Hội Họa & Nghệ Thuật',
      en: 'Fine Arts & Painting Pavilion',
      ja: '絵画と美術の展示パビリオン',
      ko: '미술 및 회화 전시관',
      zh: '绘画与经典艺术展厅'
    },
    subtitle: {
      vi: 'Các kiệt tác hội họa kinh điển trường tồn theo thời gian',
      en: 'Timeless classic masterpieces of visual arts',
      ja: '時代を超えて受け継がれる絵画の名作',
      ko: '시대를 초월한 불후의 회화 명작',
      zh: '传世经典绘画与视觉艺术杰作'
    },
    tag: {
      vi: 'Lầu 1 - Phòng Hội Họa',
      en: '1st Floor - Fine Arts Pavilion',
      ja: '2階 - 絵画・美術パビリオン',
      ko: '2층 - 미술 파빌리온',
      zh: '2楼 - 绘画艺术展厅'
    }
  }
];

const NAV_TEXT = {
  home: { vi: 'Trang Chủ', en: 'Home', ja: 'ホーム', ko: '홈', zh: '首页' },
  exhibits: { vi: 'Hiện Vật', en: 'Exhibits', ja: '展示品', ko: '전시품', zh: '展品' },
  scan: { vi: 'Quét QR', en: 'Scan QR', ja: 'QRスキャン', ko: 'QR 스캔', zh: '扫码' },
  guide: { vi: 'Thuyết Minh', en: 'Audio Guide', ja: '音声ガイド', ko: '오디오 가이드', zh: '语音导览' }
};

export default function VisitorMainPage() {
  const { id: routePoiId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    preferredLanguage,
    setPreferredLanguage,
    setLastScannedPoiId,
    lastScannedPoiId,
    markPoiAsListened,
    isPoiListened,
    openLanguageModal,
    t
  } = useVisitorSession();

  // Active tab: 'home' (default), 'list' (directory), or 'guide' (detail)
  const [activeTab, setActiveTab] = useState(routePoiId ? 'guide' : 'home');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scrollRef = useRef(null);

  // === SLIDER STATE ===
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimerRef = useRef(null);

  // === DETAIL STATE (UC-01) ===
  const [selectedPoiId, setSelectedPoiId] = useState(routePoiId ? parseInt(routePoiId) : lastScannedPoiId);
  const [poi, setPoi] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // === LIST STATE ===
  const [poiList, setPoiList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState({ 1: true }); // Floor 1 (tầng trệt) expanded by default

  // Auto-advance carousel on Home tab
  useEffect(() => {
    if (activeTab === 'home') {
      slideTimerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % MUSEUM_SLIDES.length);
      }, 5000);
    }
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [activeTab]);

  // Check unlock from URL params (QR scan redirect)
  useEffect(() => {
    if (routePoiId) {
      const fromQr = searchParams.get('from_qr') === 'true' || searchParams.get('scanned') === '1';
      const unlockedStorage = JSON.parse(localStorage.getItem('unlocked_pois') || '{}');

      setSelectedPoiId(parseInt(routePoiId));
      setActiveTab('guide');

      if (fromQr || unlockedStorage[routePoiId]) {
        setIsUnlocked(true);
        setLastScannedPoiId(parseInt(routePoiId));
        unlockedStorage[routePoiId] = true;
        localStorage.setItem('unlocked_pois', JSON.stringify(unlockedStorage));
      } else {
        setIsUnlocked(!!unlockedStorage[routePoiId]);
      }
    }
  }, [routePoiId, searchParams, setLastScannedPoiId]);

  // Fetch POI detail
  const fetchDetail = async (poiId, lang, unlocked) => {
    if (!poiId) return;
    try {
      setDetailLoading(true);
      setDetailError(null);
      const data = await visitorApi.getPoiDetail(poiId, lang, unlocked);
      setPoi(data);
    } catch (err) {
      setDetailError(err.message || t('poi_not_found_desc'));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPoiId && activeTab === 'guide') {
      fetchDetail(selectedPoiId, preferredLanguage, isUnlocked);
    }
  }, [selectedPoiId, preferredLanguage, isUnlocked, activeTab]);

  // Fetch POI list (all floors at once)
  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await visitorApi.getPoiList(preferredLanguage);
      setPoiList(data);
    } catch (err) {
      console.error('Failed to fetch POI list:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchList();
    }
  }, [activeTab, preferredLanguage]);

  const toggleFloor = (floor) => {
    setExpandedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));
  };

  // Handlers
  const handleLangChange = (lang) => {
    setPreferredLanguage(lang);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPoi = (poiId) => {
    const unlockedStorage = JSON.parse(localStorage.getItem('unlocked_pois') || '{}');
    setSelectedPoiId(poiId);
    setIsUnlocked(!!unlockedStorage[poiId]);
    setActiveTab('guide');
    setImgLoaded(false);
    navigate(`/poi/${poiId}`, { replace: true });
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsUnlocked(true);
      setIsScanning(false);
      const unlockedStorage = JSON.parse(localStorage.getItem('unlocked_pois') || '{}');
      unlockedStorage[selectedPoiId] = true;
      localStorage.setItem('unlocked_pois', JSON.stringify(unlockedStorage));
      if (selectedPoiId) setLastScannedPoiId(selectedPoiId);
    }, 1200);
  };

  const goToHome = () => {
    setActiveTab('home');
    navigate('/', { replace: true });
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToList = () => {
    setActiveTab('list');
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNowPlaying = () => {
    const targetId = selectedPoiId || lastScannedPoiId;
    if (targetId) {
      setSelectedPoiId(targetId);
      setActiveTab('guide');
      navigate(`/poi/${targetId}`, { replace: true });
    } else {
      setActiveTab('guide');
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ═══════════════════════════════════════
  //  RENDER: HOME VIEW (Only Carousel)
  // ═══════════════════════════════════════
  const renderHomeView = () => {
    const slide = MUSEUM_SLIDES[currentSlide];
    const slideTitle = slide.title[preferredLanguage] || slide.title['vi'];
    const slideSub = slide.subtitle[preferredLanguage] || slide.subtitle['vi'];
    const slideTag = typeof slide.tag === 'object' ? (slide.tag[preferredLanguage] || slide.tag['vi']) : slide.tag;

    return (
      <div className="flex-1 flex flex-col pb-20 page-enter h-[calc(100dvh-57px)]">
        {/* ─── FULL-HEIGHT CAROUSEL SLIDER ─── */}
        <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-900 select-none">
          {MUSEUM_SLIDES.map((s, index) => (
            <div
              key={s.id}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            >
              <img
                src={s.image}
                alt={s.title.vi}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/30 to-black/20" />
            </div>
          ))}

          {/* Tag */}
          <div className="absolute top-4 left-4 z-10">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-950/70 border border-amber-500/30 text-amber-400 backdrop-blur-md shadow-lg flex items-center gap-1.5">
              <Landmark className="w-3 h-3" /> {slideTag}
            </span>
          </div>

          {/* Caption */}
          <div className="absolute bottom-6 left-4 right-4 z-10 space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              {slideTitle}
            </h2>
            <p className="text-sm text-slate-300 line-clamp-2 drop-shadow">
              {slideSub}
            </p>
          </div>

          {/* Arrows */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + MUSEUM_SLIDES.length) % MUSEUM_SLIDES.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/60 border border-slate-700/60 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % MUSEUM_SLIDES.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/60 border border-slate-700/60 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {MUSEUM_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`transition-all rounded-full ${
                  i === currentSlide
                    ? 'w-6 h-2 bg-amber-400 shadow-sm shadow-amber-400/50'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  //  RENDER: EXHIBITS LIST TAB (Accordion)
  // ═══════════════════════════════════════
  const renderListView = () => {
    // Group POIs by floor
    const floors = [...new Set(poiList.map((p) => p.floor))].sort((a, b) => a - b);
    const poisByFloor = {};
    floors.forEach((f) => {
      poisByFloor[f] = poiList.filter((p) => p.floor === f);
    });

    const FLOOR_LABELS = {
      1: { vi: 'Tầng Trệt', en: 'Ground Floor', ja: '1階', ko: '1층', zh: '1楼' },
      2: { vi: 'Lầu 1', en: '1st Floor', ja: '2階', ko: '2층', zh: '2楼' },
      3: { vi: 'Lầu 2', en: '2nd Floor', ja: '3階', ko: '3층', zh: '3楼' },
    };

    return (
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-3 page-enter">
        {/* Header */}
        <div>
          <h2 className="text-base font-black text-white">{t('all_exhibits')}</h2>
          <p className="text-xs text-slate-400">{poiList.length} {t('items_count')}</p>
        </div>

        {/* Loading */}
        {listLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="text-sm text-slate-400">{t('loading_poi')}</p>
          </div>
        ) : poiList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Landmark className="w-12 h-12 text-slate-600" />
            <p className="text-sm text-slate-400">Chưa có hiện vật nào</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {floors.map((floor) => {
              const isExpanded = !!expandedFloors[floor];
              const floorPois = poisByFloor[floor];
              const floorLabel = FLOOR_LABELS[floor]?.[preferredLanguage] || FLOOR_LABELS[floor]?.['vi'] || `${t('floor_label')} ${floor}`;
              const listenedCount = floorPois.filter((p) => isPoiListened(p.id)).length;

              return (
                <div key={floor} className="rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-900/50">
                  {/* Floor Accordion Header */}
                  <button
                    onClick={() => toggleFloor(floor)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/80 hover:bg-slate-800/80 transition-colors active:scale-[0.99] text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isExpanded
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}>
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${
                          isExpanded ? 'text-amber-400' : 'text-white'
                        }`}>{floorLabel}</p>
                        <p className="text-[10px] text-slate-500">
                          {floorPois.length} {t('items_count')}
                          {listenedCount > 0 && (
                            <span className="text-emerald-400 ml-1.5">• {listenedCount} {t('listened_badge')}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180 text-amber-400' : ''
                    }`} />
                  </button>

                  {/* Floor POI Items (Collapsible) */}
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-3 py-2 space-y-1.5 border-t border-slate-800/60">
                      {floorPois.map((item) => {
                        const listened = isPoiListened(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectPoi(item.id)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-amber-500/30 active:scale-[0.98] transition-all text-left group"
                          >
                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.image_url ? (
                                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Landmark className="w-5 h-5 text-amber-400/50" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-bold text-white group-hover:text-amber-400 transition-colors truncate">{item.title}</p>
                                {listened && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1">{item.short_description}</p>
                              {item.has_audio && (
                                <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium items-center gap-0.5">
                                  <Headphones className="w-2.5 h-2.5" /> Audio
                                </span>
                              )}
                            </div>

                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════
  //  RENDER: GUIDE DETAIL TAB (UC-01)
  // ═══════════════════════════════════════
  const renderGuideView = () => {
    // No POI selected yet
    if (!selectedPoiId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 pb-28 page-enter">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/10">
            <QrCode className="w-10 h-10" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black text-white mb-1">{t('step1_title')}</h2>
            <p className="text-xs text-slate-400 max-w-xs">{t('step1_desc')}</p>
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
          >
            <QrCode className="w-5 h-5" /> {t('scan_qr')}
          </button>
        </div>
      );
    }

    // Loading
    if (detailLoading && !poi) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-28">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Landmark className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-slate-200">{t('loading_poi')}</p>
        </div>
      );
    }

    // Error
    if (detailError || !poi) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5 pb-28">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">{t('poi_not_found')}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">{detailError || t('poi_not_found_desc')}</p>
          </div>
          <button onClick={() => fetchDetail(selectedPoiId, preferredLanguage, isUnlocked)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-semibold hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4" /> {t('retry')}
          </button>
        </div>
      );
    }

    // Full Detail View
    return (
      <div className="flex-1 overflow-y-auto pb-28 page-enter">
        {/* Hero Image */}
        <div className="relative w-full aspect-[4/3] max-h-[40vh] overflow-hidden bg-slate-900">
          {poi.image_url ? (
            <>
              <img src={poi.image_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-30" aria-hidden />
              <img
                src={poi.image_url} alt={poi.title}
                onLoad={() => setImgLoaded(true)}
                className={`relative w-full h-full object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/30">
              <Landmark className="w-16 h-16 text-amber-400/40" />
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {isPoiListened(selectedPoiId) && (
              <div className="glass px-2.5 py-1 rounded-full border border-emerald-500/40 text-[10px] font-bold text-emerald-400 flex items-center gap-1 shadow bg-emerald-950/60">
                <CheckCircle2 className="w-3 h-3" /> {t('listened_badge')}
              </div>
            )}
            {isUnlocked ? (
              <div className="glass px-2.5 py-1 rounded-full border border-sky-500/40 text-[10px] font-bold text-sky-400 flex items-center gap-1 shadow bg-sky-950/40">
                <CheckCircle2 className="w-3 h-3" /> {t('scanned_badge')}
              </div>
            ) : (
              <div className="glass px-2.5 py-1 rounded-full border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow bg-amber-950/40">
                <Lock className="w-3 h-3" /> {t('summary_badge')}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">{poi.title}</h1>
              {isPoiListened(selectedPoiId) && (
                <span className="flex-shrink-0 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  ✓ {t('listened_badge')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-amber-400" />
              {t('current_lang')}: <span className="text-amber-400 font-semibold">{LANG_NAME[preferredLanguage]}</span>
            </p>
          </div>

          {/* Short Description */}
          {poi.short_description && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> {t('highlight_summary')}
              </p>
              <p className="text-sm text-amber-100/90 leading-relaxed font-medium">{poi.short_description}</p>
            </div>
          )}

          {/* Language Switcher */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">{t('select_narration_lang')}</p>
            <LanguageSwitcher
              activeLang={preferredLanguage}
              onSelectLang={handleLangChange}
              availableLanguages={poi.available_languages}
            />
          </div>

          {/* UNLOCKED: Audio + Full Description */}
          {isUnlocked ? (
            <>
              <AudioPlayer
                audioUrl={poi.audio_url}
                fallbackText={`${poi.title}. ${poi.description}`}
                languageCode={preferredLanguage}
                onListen={() => markPoiAsListened(poi?.id || selectedPoiId)}
              />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> {t('full_narration')}
                </h2>
                <p className="text-sm leading-7 text-slate-200 whitespace-pre-line">{poi.description}</p>
              </div>
            </>
          ) : (
            /* LOCKED STATE */
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-5 text-center space-y-3.5 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t('locked_title')}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">{t('locked_desc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" /> {t('scan_to_unlock')}
                </button>
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="w-full py-1 text-center text-xs text-slate-500 hover:text-amber-400/80 transition-colors"
                >
                  {isScanning ? (
                    <span className="flex items-center justify-center gap-1.5 text-amber-400">
                      <RefreshCw className="w-3 h-3 animate-spin" /> {t('authenticating_scan')}
                    </span>
                  ) : (
                    <span>(Mô phỏng mở khoá không cần quét)</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  //  MAIN LAYOUT
  // ═══════════════════════════════════════
  return (
    <div ref={scrollRef} className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">

      {/* ══════ UPPER NAVBAR ══════ */}
      <header className="sticky top-0 z-50 glass border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        {/* Left: Back / Home */}
        {activeTab !== 'home' ? (
          <button
            onClick={goToHome}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('back_to_home')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-sm font-black text-white tracking-tight">Smart Museum</span>
          </div>
        )}

        {/* Right: Language */}
        <button
          type="button"
          onClick={openLanguageModal}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/25 hover:bg-amber-500/20 transition-colors active:scale-95"
        >
          <span className="text-sm leading-none">{LANG_FLAG[preferredLanguage]}</span>
          <span className="text-shimmer font-bold">{LANG_NAME[preferredLanguage] || preferredLanguage}</span>
        </button>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      {activeTab === 'home' && renderHomeView()}
      {activeTab === 'list' && renderListView()}
      {activeTab === 'guide' && renderGuideView()}

      {/* ══════ LOWER NAVBAR ══════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-slate-800/80">
        <div className="max-w-lg mx-auto flex items-end justify-between px-6 pb-[env(safe-area-inset-bottom,8px)] pt-1.5">
          {/* Home */}
          <button
            onClick={goToHome}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
              activeTab === 'home'
                ? 'text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">{NAV_TEXT.home[preferredLanguage] || NAV_TEXT.home.vi}</span>
          </button>

          {/* Exhibits List */}
          <button
            onClick={goToList}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
              activeTab === 'list'
                ? 'text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="text-[10px] font-bold">{NAV_TEXT.exhibits[preferredLanguage] || NAV_TEXT.exhibits.vi}</span>
          </button>

          {/* Center: Scan QR (Floating Hero Button) */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="relative -mt-5 flex flex-col items-center"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-xl shadow-amber-500/30 flex items-center justify-center border-4 border-[#090d16] active:scale-90 transition-transform hover:shadow-amber-500/40">
              <QrCode className="w-6 h-6 text-slate-950" />
            </div>
            <span className="text-[10px] font-bold text-amber-400 mt-0.5">{NAV_TEXT.scan[preferredLanguage] || NAV_TEXT.scan.vi}</span>
          </button>

          {/* Audio Guide / Now Playing */}
          <button
            onClick={goToNowPlaying}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
              activeTab === 'guide'
                ? 'text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Headphones className="w-5 h-5" />
            <span className="text-[10px] font-bold">{NAV_TEXT.guide[preferredLanguage] || NAV_TEXT.guide.vi}</span>
          </button>
        </div>
      </nav>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}
