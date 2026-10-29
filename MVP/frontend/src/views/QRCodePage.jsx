// =============================================================================
// TIER 1 - QR CODE GENERATION & GATEWAY PORTAL VIEW
// Standardized in dev_rules.md Section 1.4 & Section 2.7
// Generates scannable QR codes for mobile visitors entering Cu Chi Tunnels.
// Integrates dynamically with Cloudflare Tunnel URL and local origin fallback.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Headphones,
  MapPin,
  QrCode,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getPublicSystemConfig } from '../api/systemApi.js';

// -----------------------------------------------------------------------------
// MODULE-LEVEL CONSTANTS (dev_rules.md Section 1.4.5)
// -----------------------------------------------------------------------------
const DEFAULT_VISITOR_SUBPATH = '/visitor';
const QR_CANVAS_SIZE_PX = 1024;
const DISPLAY_QR_SIZE_PX = 240;

export default function QRCodePage() {
  // Top-of-Scope Rule (dev_rules.md Section 1.4.5): All hooks declared at top
  const [targetUrl, setTargetUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tunnelUrl, setTunnelUrl] = useState('');

  const svgContainerRef = useRef(null);

  // Initialize and load public config from backend
  const loadConfig = useCallback(() => {
    setIsLoading(true);

    getPublicSystemConfig()
      .then((config) => {
        const cloudflareUrl = (config?.cloudflare_tunnel_url || '').trim();
        setTunnelUrl(cloudflareUrl);

        const currentOrigin =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const base = cloudflareUrl || currentOrigin;
        const initialTarget = `${base}${DEFAULT_VISITOR_SUBPATH}`;

        setTargetUrl(initialTarget);
        setInputUrl(initialTarget);
      })
      .catch(() => {
        // # FALLBACK-LOGIC: Use current browser origin if backend config is unreachable
        const currentOrigin =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const fallbackTarget = `${currentOrigin}${DEFAULT_VISITOR_SUBPATH}`;
        setTargetUrl(fallbackTarget);
        setInputUrl(fallbackTarget);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadConfig();

    // Automatically re-fetch whenever the user returns or switches to this browser tab
    const handleWindowFocus = () => {
      loadConfig();
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadConfig]);

  const handleApplyUrl = useCallback((e) => {
    e?.preventDefault();
    const trimmed = inputUrl.trim();
    if (trimmed) {
      setTargetUrl(trimmed);
    }
  }, [inputUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback for environments with strict clipboard policies
    }
  }, [targetUrl]);

  const handleDownloadPng = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgXml = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = QR_CANVAS_SIZE_PX;
    canvas.height = QR_CANVAS_SIZE_PX;
    const ctx = canvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
      if (!ctx) return;
      // White background padding
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, QR_CANVAS_SIZE_PX, QR_CANVAS_SIZE_PX);
      ctx.drawImage(image, 64, 64, QR_CANVAS_SIZE_PX - 128, QR_CANVAS_SIZE_PX - 128);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'cuchi_tour_qr_code.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    };

    image.src = blobUrl;
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Header */}
      <header className="max-w-3xl mx-auto w-full text-center pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 mb-3">
          <Sparkles size={14} aria-hidden="true" />
          <span>Địa Đạo Củ Chi — Bến Dược Digital Pass</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
          Mã QR Truy Cập Tour Hướng Dẫn Âm Thanh
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Quét mã bằng Camera điện thoại để mở ứng dụng web và tự động kích hoạt
          thuyết minh đa ngôn ngữ khi di chuyển ngoài trời.
        </p>
      </header>

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full my-6 bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        {/* QR Code Presentation Box */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={svgContainerRef}
            className="p-5 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-slate-100/10"
            data-testid="qr-code-canvas-container"
          >
            {isLoading ? (
              <div className="w-[240px] h-[240px] flex items-center justify-center text-slate-400">
                <RefreshCw size={32} className="animate-spin text-emerald-500" />
              </div>
            ) : targetUrl ? (
              <QRCodeSVG
                value={targetUrl}
                size={DISPLAY_QR_SIZE_PX}
                level="Q"
                includeMargin={false}
              />
            ) : (
              <div className="w-[240px] h-[240px] flex items-center justify-center text-slate-400">
                <QrCode size={48} />
              </div>
            )}
          </div>

          <span className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Compass size={14} className="text-emerald-400" />
            Quét mã để kích hoạt tour tương tác
          </span>
        </div>

        {/* Target URL Preview & Input */}
        <form onSubmit={handleApplyUrl} className="mt-5 space-y-2">
          <label htmlFor="target-url-input" className="block text-[11px] font-medium text-slate-400">
            Đường dẫn liên kết được mã hoá:
          </label>
          <div className="flex gap-2">
            <input
              id="target-url-input"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 select-all"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-semibold text-white transition"
              title="Cập nhật mã QR"
            >
              Áp dụng
            </button>
            <button
              type="button"
              onClick={loadConfig}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1"
              title="Tải lại link mới nhất từ file .env"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
          {tunnelUrl && (
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <Globe size={11} className="text-emerald-400" />
              Đang liên kết qua Cloudflare Tunnel: <span className="font-mono text-slate-400 truncate">{tunnelUrl}</span>
            </p>
          )}
        </form>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 py-2.5 px-3 text-xs font-semibold text-white transition shadow"
          >
            {isCopied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Sao chép link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-semibold text-white transition shadow"
          >
            <Download size={14} />
            <span>Tải ảnh QR (PNG)</span>
          </button>
        </div>

        {/* Direct Open Link */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
          <a
            href={targetUrl || '/visitor'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            <span>Thử mở trang tham quan trực tiếp</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </main>

      {/* Visitor Onboarding Instructions */}
      <footer className="max-w-2xl mx-auto w-full border-t border-slate-800 pt-4 pb-2 text-center text-xs text-slate-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 text-left">
          <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-800">
            <span className="font-bold text-slate-300 block mb-1">1. Quét mã QR</span>
            <span>Mở Camera hoặc ứng dụng Zalo trên điện thoại hướng vào mã QR.</span>
          </div>
          <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-800">
            <span className="font-bold text-slate-300 block mb-1 flex items-center gap-1">
              <MapPin size={12} className="text-emerald-400" /> 2. Bật định vị GPS
            </span>
            <span>Cho phép trình duyệt truy cập vị trí để tự động phát hiện di tích.</span>
          </div>
          <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-800">
            <span className="font-bold text-slate-300 block mb-1 flex items-center gap-1">
              <Headphones size={12} className="text-emerald-400" /> 3. Nghe thuyết minh
            </span>
            <span>Âm thanh tự động kích hoạt khi bạn bước vào vùng di tích.</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-600">
          Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
        </p>
      </footer>
    </div>
  );
}
