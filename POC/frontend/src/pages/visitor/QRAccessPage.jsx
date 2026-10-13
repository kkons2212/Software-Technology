import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Sparkles, Wifi, ArrowRight, RefreshCw, Globe, Landmark, ExternalLink } from 'lucide-react';

/**
 * Trang /qr — Hiển thị mã QR dẫn về trang chủ Smart Museum.
 * Khách tham quan quét mã QR này bằng điện thoại để truy cập website
 * thay vì phải nhập thủ công URL trên trình duyệt.
 */
export default function QRAccessPage() {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQR = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/qr/homepage');
      if (!res.ok) throw new Error('Không thể tạo mã QR');
      const data = await res.json();
      setQrData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR();
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">

      {/* ─── Ambient Background Effects ─── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/[0.06] blur-[120px]" />
        {/* Radial glow bottom */}
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full bg-sky-500/[0.04] blur-[100px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(248,250,252,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(248,250,252,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* ─── Main Card ─── */}
      <div className="relative z-10 w-full max-w-md page-enter">

        {/* Header */}
        <div className="text-center mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold mx-auto">
            <Wifi className="w-3.5 h-3.5" />
            <span>Truy Cập Nhanh • Quick Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            <span className="text-shimmer">Smart Museum</span>
            <br />
            <span className="text-slate-300 text-lg sm:text-xl font-bold">Audio Guide</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Quét mã QR bên dưới bằng camera điện thoại để truy cập website thuyết minh đa ngôn ngữ
          </p>
        </div>

        {/* QR Card */}
        <div className="glass rounded-3xl border border-slate-800/80 p-6 shadow-2xl shadow-black/40 space-y-5">

          {/* QR Code Display */}
          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72">
            {/* Decorative corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400/60 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400/60 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400/60 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400/60 rounded-br-xl" />

            {/* Animated scan line */}
            <div className="absolute left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent animate-scan-laser z-10 pointer-events-none" />

            {/* QR Image Container */}
            <div className="absolute inset-3 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">Đang tạo mã QR...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                  <QrCode className="w-10 h-10 text-red-400" />
                  <span className="text-xs text-red-500 font-medium">{error}</span>
                  <button
                    onClick={fetchQR}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              ) : qrData ? (
                <img
                  src={qrData.qr_image_url}
                  alt="QR Code - Truy cập trang chủ Smart Museum"
                  className="w-full h-full object-contain p-2"
                />
              ) : null}
            </div>
          </div>

          {/* Target URL Display */}
          {qrData && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">URL Đích</p>
                <p className="text-xs text-amber-400 font-mono truncate">{qrData.target_url}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Hướng dẫn</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>

          {/* Steps */}
          <div className="space-y-2.5">
            <StepItem
              step={1}
              icon={<Smartphone className="w-4 h-4" />}
              title="Mở Camera"
              desc="Mở ứng dụng Camera trên điện thoại"
            />
            <StepItem
              step={2}
              icon={<QrCode className="w-4 h-4" />}
              title="Quét mã QR"
              desc="Hướng camera vào mã QR phía trên"
            />
            <StepItem
              step={3}
              icon={<Sparkles className="w-4 h-4" />}
              title="Trải nghiệm"
              desc="Khám phá bộ sưu tập & nghe thuyết minh AI"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Landmark className="w-3.5 h-3.5 text-amber-400/50" />
            <span>Khu Di Tích & Công Viên Lịch Sử</span>
          </div>
          <p className="text-[10px] text-slate-600">
            Hỗ trợ: 🇻🇳 Tiếng Việt • 🇬🇧 English • 🇯🇵 日本語 • 🇰🇷 한국어 • 🇨🇳 中文
          </p>
        </div>
      </div>
    </div>
  );
}

/** Step instruction item */
function StepItem({ step, icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 group hover:border-amber-500/20 transition-colors">
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center flex-shrink-0 text-xs font-black">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white flex items-center gap-1.5">{icon} {title}</p>
        <p className="text-[11px] text-slate-400">{desc}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0" />
    </div>
  );
}
