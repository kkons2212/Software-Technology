// =============================================================================
// TIER 1 - QR CODE GENERATION & GATEWAY PORTAL VIEW
// Standardized in dev_rules.md Section 1.4 & Section 2.7
// Generates scannable QR codes for mobile visitors entering Cu Chi Tunnels.
// Resolves target URL dynamically from BASE_URL or current deployment origin.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
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
  const [configuredBaseUrl, setConfiguredBaseUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const svgContainerRef = useRef(null);

  // Initialize and load public config from backend
  const loadConfig = useCallback(() => {
    setIsLoading(true);

    getPublicSystemConfig()
      .then((config) => {
        const rawBase = (config?.base_url || config?.cloudflare_tunnel_url || '').trim();
        setConfiguredBaseUrl(rawBase);

        const currentOrigin =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const base = rawBase || currentOrigin;
        const resolved = `${base.replace(/\/+$/, '')}${DEFAULT_VISITOR_SUBPATH}`;

        setTargetUrl(resolved);
      })
      .catch(() => {
        // Fallback: Use current browser origin if backend config is unreachable
        const currentOrigin =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const fallbackTarget = `${currentOrigin}${DEFAULT_VISITOR_SUBPATH}`;
        setTargetUrl(fallbackTarget);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadConfig();

    const handleWindowFocus = () => {
      loadConfig();
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadConfig]);

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

  const isLocalhostTarget =
    targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="max-w-xl mx-auto w-full text-center pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 mb-3">
          <Sparkles size={13} aria-hidden="true" />
          <span>Địa Đạo Củ Chi — Bến Dược</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Mã QR Hướng Dẫn Tham Quan
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Quét mã bằng camera điện thoại để trải nghiệm tour thuyết minh đa ngôn ngữ tự động.
        </p>
      </header>

      {/* Main QR Card */}
      <main className="max-w-sm mx-auto w-full my-6 bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur flex flex-col items-center">
        {/* QR Code Presentation Box */}
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

        {/* Target URL Badge */}
        <div className="mt-5 w-full">
          <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs">
            <span className="font-mono text-emerald-400 truncate select-all" title={targetUrl}>
              {targetUrl || 'Đang kết nối...'}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="ml-2 text-slate-400 hover:text-white transition flex-shrink-0"
              title="Sao chép đường dẫn"
              aria-label="Sao chép liên kết"
            >
              {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
          {configuredBaseUrl && (
            <p className="mt-1.5 text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <Globe size={11} className="text-emerald-400" />
              Đang dùng cấu hình BASE_URL
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-semibold text-white transition shadow"
          >
            <Download size={14} />
            <span>Tải ảnh QR (PNG)</span>
          </button>

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
        </div>

        {/* Direct Open Link */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 w-full text-center">
          <a
            href={targetUrl || '/visitor'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            <span>Thử mở trên trình duyệt này</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Localhost Warning Notice */}
        {isLocalhostTarget && !configuredBaseUrl && (
          <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 text-center leading-relaxed">
            ⚠️ Đang dùng <strong>localhost</strong>: Để điện thoại quét được, hãy cấu hình <strong>BASE_URL</strong> trong file <code>.env</code> hoặc kết nối chung mạng Wi-Fi.
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="max-w-xl mx-auto w-full pt-4 pb-2 text-center text-[11px] text-slate-600">
        Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
      </footer>
    </div>
  );
}
