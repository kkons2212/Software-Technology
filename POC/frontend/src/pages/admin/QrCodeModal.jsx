import React, { useState } from 'react';
import { X, Download, RefreshCw, ExternalLink, QrCode, Globe, Check } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

export default function QrCodeModal({ isOpen, onClose, poi }) {
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());

  if (!isOpen || !poi) return null;

  const currentOrigin = window.location.origin;
  const effectiveBaseUrl = customBaseUrl.trim() || currentOrigin;
  const targetMobileUrl = `${effectiveBaseUrl.replace(/\/$/, '')}/poi/${poi.id}`;
  const qrImageUrl = `${poi.qr_code_url}?t=${qrTimestamp}`;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await adminApi.regenerateQrCode(poi.id, customBaseUrl.trim() || null);
      setQrTimestamp(Date.now());
    } catch (err) {
      alert('Không thể tái tạo mã QR: ' + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetMobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Mã QR Hiện Vật (UC-05)</h3>
              <p className="text-xs text-slate-400">Dành cho khách tham quan quét bằng điện thoại</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-5">
          <div className="text-left bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400 font-medium">Hiện vật:</p>
            <h4 className="text-sm font-bold text-white mt-0.5 truncate">{poi.title_vi}</h4>
          </div>

          {/* QR Code Container */}
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xl shadow-black/40 border border-slate-200">
            <img
              src={qrImageUrl}
              alt={`QR Code cho POI #${poi.id}`}
              className="w-52 h-52 object-contain block mx-auto"
            />
          </div>

          {/* Target Link & Custom Base URL */}
          <div className="space-y-2 text-left">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              Đường Dẫn Đích Khi Quét QR
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={targetMobileUrl}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 select-all font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : 'Copy'}
              </button>
              <a
                href={`/poi/${poi.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Mở thử nghiệm trên tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Custom URL Input for Cloudflare Tunnel */}
            <div className="pt-2">
              <p className="text-[11px] text-slate-400 mb-1">
                Hoặc đổi URL công khai (Cloudflare Tunnel) để in mã QR:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: https://museum-demo.trycloudflare.com"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Cập Nhật
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <a
              href={adminApi.getQrDownloadUrl(poi.id)}
              download
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Tải Mã QR (.PNG)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
