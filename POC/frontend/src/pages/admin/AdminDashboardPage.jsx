import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, MapPin, QrCode, Volume2, Globe, Trash2, Edit, 
  RefreshCw, Sparkles, ChevronDown, ChevronUp, Play, Pause, AlertCircle, CheckCircle2 
} from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import PoiFormModal from './PoiFormModal';
import QrCodeModal from './QrCodeModal';
import { adminApi } from '../../services/adminApi';

const LANGUAGE_LABELS = {
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  en: { label: 'English', flag: '🇬🇧' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ko: { label: '한국어', flag: '🇰🇷' },
  zh: { label: '中文', flag: '🇨🇳' },
};

export default function AdminDashboardPage() {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [expandedPoiId, setExpandedPoiId] = useState(null);
  const [reprocessingId, setReprocessingId] = useState(null);

  // Audio player state in admin
  const [playingAudio, setPlayingAudio] = useState(null); // url
  const [audioElement, setAudioElement] = useState(null);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedPoiForQr, setSelectedPoiForQr] = useState(null);

  const fetchPois = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllPois();
      setPois(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách POI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPois();
  }, []);

  const handleTogglePlayAudio = (url) => {
    if (playingAudio === url) {
      audioElement?.pause();
      setPlayingAudio(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingAudio(null);
      setAudioElement(audio);
      setPlayingAudio(url);
    }
  };

  const handleReprocessAi = async (poiId, e) => {
    e?.stopPropagation();
    setReprocessingId(poiId);
    try {
      await adminApi.reprocessAi(poiId);
      // Đợi 3s rồi refresh lại danh sách để thấy kết quả
      setTimeout(() => {
        fetchPois();
        setReprocessingId(null);
      }, 3000);
    } catch (err) {
      alert('Không thể chạy lại AI: ' + err.message);
      setReprocessingId(null);
    }
  };

  const handleDelete = async (poi, e) => {
    e?.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn xoá hiện vật "${poi.title_vi}" và toàn bộ tệp tin audio/QR liên quan?`)) {
      try {
        await adminApi.deletePoi(poi.id);
        fetchPois();
      } catch (err) {
        alert('Xoá thất bại: ' + err.message);
      }
    }
  };

  const handleEdit = (poi, e) => {
    e?.stopPropagation();
    setEditingPoi(poi);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingPoi(null);
    setIsFormOpen(true);
  };

  const handleOpenQr = (poi, e) => {
    e?.stopPropagation();
    setSelectedPoiForQr(poi);
    setIsQrOpen(true);
  };

  const toggleExpandRow = async (poiId) => {
    if (expandedPoiId === poiId) {
      setExpandedPoiId(null);
    } else {
      setExpandedPoiId(poiId);
      // Fetch full details for this POI to get latest translations & audios
      try {
        const fullPoi = await adminApi.getPoiById(poiId);
        setPois((prev) => prev.map((p) => (p.id === poiId ? fullPoi : p)));
      } catch (err) {
        console.error('Lỗi lấy chi tiết:', err);
      }
    }
  };

  // Filter list
  const filteredPois = pois.filter((poi) => {
    const matchSearch = poi.title_vi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        poi.description_vi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFloor = selectedFloor === 'ALL' || poi.floor === parseInt(selectedFloor);
    return matchSearch && matchFloor;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Admin Control Center (UC-04, UC-05, UC-08, UC-09)
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Quản Lý Hiện Vật & Pipeline AI</h2>
            <p className="text-sm text-slate-400">
              Tự động dịch đa ngôn ngữ và tạo giọng nói Edge-TTS chất lượng cao chạy ngầm trong CSDL SQLite WAL.
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" />
            Thêm Hiện Vật Mới
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400">Hiện Vật Đã Nhập</span>
            <div className="text-2xl font-bold text-white mt-1">{pois.length}</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400">Ngôn Ngữ Tự Động (UC-08)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">5 (VI, EN, JA, KO, ZH)</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400">Động Cơ TTS (UC-09)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">Edge-TTS (MD5 Cached)</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400">Concurrency DB</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">SQLite (WAL Mode)</div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hiện vật..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="px-2 text-slate-400 font-medium">Tầng:</span>
              <button
                onClick={() => setSelectedFloor('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedFloor === 'ALL' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedFloor('1')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedFloor === '1' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tầng 1
              </button>
              <button
                onClick={() => setSelectedFloor('2')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedFloor === '2' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tầng 2
              </button>
            </div>

            <button
              onClick={fetchPois}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* POI Table */}
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Hiện Vật</th>
                  <th className="px-6 py-4">Vị Trí</th>
                  <th className="px-6 py-4">Mã QR</th>
                  <th className="px-6 py-4">Pipeline AI (UC-08 & 09)</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                      Đang tải danh sách hiện vật...
                    </td>
                  </tr>
                ) : filteredPois.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Chưa có hiện vật nào. Bấm <strong className="text-amber-400">"Thêm Hiện Vật Mới"</strong> để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  filteredPois.map((poi) => {
                    const isExpanded = expandedPoiId === poi.id;
                    const isReprocessing = reprocessingId === poi.id;
                    const translations = poi.translations || [];
                    const audios = poi.audios || [];

                    return (
                      <React.Fragment key={poi.id}>
                        <tr 
                          onClick={() => toggleExpandRow(poi.id)}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          {/* POI Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {poi.image_url ? (
                                  <img src={poi.image_url} alt={poi.title_vi} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-amber-400">POI</span>
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                                  {poi.title_vi}
                                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                    #{poi.id}
                                  </span>
                                </div>
                                <p className="text-xs text-amber-200/80 line-clamp-1 max-w-sm">
                                  <span className="text-slate-500 font-medium">Tóm tắt: </span>
                                  {poi.short_description_vi || poi.description_vi}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Coordinates */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span>({poi.x_coord}, {poi.y_coord})</span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-400 ml-1">
                                Tầng {poi.floor}
                              </span>
                            </div>
                          </td>

                          {/* QR Code */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => handleOpenQr(poi, e)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:text-amber-400 transition-all"
                            >
                              <QrCode className="w-4 h-4 text-amber-400" />
                              <span>Xem & In QR</span>
                            </button>
                          </td>

                          {/* AI Pipeline Badges */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {Object.keys(LANGUAGE_LABELS).map((lang) => {
                                const hasTrans = translations.some((t) => t.language_code === lang && t.status === 'COMPLETED');
                                const hasAudio = audios.some((a) => a.language_code === lang && a.status === 'READY');
                                const isReady = hasTrans && hasAudio;

                                return (
                                  <span
                                    key={lang}
                                    title={`${LANGUAGE_LABELS[lang].label}: ${isReady ? 'Dịch & Audio Sẵn Sàng' : 'Đang Xử Lý'}`}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                      isReady
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    <span>{LANGUAGE_LABELS[lang].flag}</span>
                                    <span>{lang.toUpperCase()}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => handleReprocessAi(poi.id, e)}
                                disabled={isReprocessing}
                                className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors disabled:opacity-50"
                                title="Chạy lại AI (Dịch & Sinh Audio)"
                              >
                                <RefreshCw className={`w-4 h-4 ${isReprocessing ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => handleEdit(poi, e)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Chỉnh sửa POI"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(poi, e)}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Xoá POI"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-1.5 text-slate-500 group-hover:text-slate-300 transition-colors"
                                title="Xem chi tiết bản dịch & audio"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expand Row: Detailed Translations & Audio Player */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={5} className="p-6 border-b border-slate-800">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Chi Tiết 5 Bản Dịch & File Thuyết Minh AI
                                  </h4>
                                  <span className="text-xs text-slate-500 font-mono">
                                    Tự động đồng bộ với Edge-TTS Storage
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {Object.keys(LANGUAGE_LABELS).map((lang) => {
                                    const trans = translations.find((t) => t.language_code === lang);
                                    const audio = audios.find((a) => a.language_code === lang);
                                    const isAudioPlaying = playingAudio === audio?.audio_url;

                                    return (
                                      <div
                                        key={lang}
                                        className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2.5"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-base">{LANGUAGE_LABELS[lang].flag}</span>
                                            <span className="text-xs font-bold text-white">
                                              {LANGUAGE_LABELS[lang].label} ({lang.toUpperCase()})
                                            </span>
                                          </div>
                                          {audio?.status === 'READY' && (
                                            <button
                                              onClick={() => handleTogglePlayAudio(audio.audio_url)}
                                              className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${
                                                isAudioPlaying
                                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                                              }`}
                                            >
                                              {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                              <span>{isAudioPlaying ? 'Dừng' : 'Nghe Audio'}</span>
                                            </button>
                                          )}
                                        </div>

                                        <div>
                                          <p className="text-xs font-semibold text-slate-200 truncate">
                                            {trans?.title || poi.title_vi}
                                          </p>
                                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                                            {trans?.description || poi.description_vi}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      <PoiFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchPois}
        editPoi={editingPoi}
        existingPois={pois}
      />

      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        poi={selectedPoiForQr}
      />
    </div>
  );
}
