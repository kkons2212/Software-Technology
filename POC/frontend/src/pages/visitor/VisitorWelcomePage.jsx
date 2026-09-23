import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Compass, Headphones, Globe2, Sparkles, ChevronRight, ArrowRight, Globe } from 'lucide-react';
import { useVisitorSession } from '../../context/VisitorSessionContext';

const LANGS = [
  { code: 'vi', label: 'Việt Nam', flag: '🇻🇳' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ja', label: '日本語',    flag: '🇯🇵' },
  { code: 'ko', label: '한국어',    flag: '🇰🇷' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
];

export default function VisitorWelcomePage() {
  const navigate = useNavigate();
  const {
    lastScannedPoiId,
    selectLanguage,
    preferredLanguage,
    openLanguageModal,
    t,
  } = useVisitorSession();
  const canvasRef = useRef(null);

  const STEPS = [
    {
      icon: <QrCode className="w-6 h-6" />,
      title: t('step1_title'),
      desc: t('step1_desc'),
      color: 'from-violet-500 to-violet-700',
      glow: 'shadow-violet-500/25',
    },
    {
      icon: <Globe2 className="w-6 h-6" />,
      title: t('step2_title'),
      desc: t('step2_desc'),
      color: 'from-amber-500 to-amber-700',
      glow: 'shadow-amber-500/25',
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: t('step3_title'),
      desc: t('step3_desc'),
      color: 'from-emerald-500 to-emerald-700',
      glow: 'shadow-emerald-500/25',
    },
    {
      icon: <Compass className="w-6 h-6" />,
      title: t('step4_title'),
      desc: t('step4_desc'),
      color: 'from-sky-500 to-sky-700',
      glow: 'shadow-sky-500/25',
    },
  ];

  // Particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId;
    const W = () => canvas.width  = canvas.offsetWidth;
    const H = () => canvas.height = canvas.offsetHeight;
    W(); H();
    const resize = () => { W(); H(); };
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${d.a})`;
        ctx.fill();
      });
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafId); };
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col overflow-x-hidden">

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-60 w-full h-full" />

      {/* Ambient gradient blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col px-4 pt-10 pb-16 max-w-md mx-auto w-full">

        {/* ── Logo / Branding ── */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/30 text-amber-400 mb-4 shadow-2xl shadow-amber-500/10">
            <Sparkles className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">
            {t('welcome_title')}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {t('welcome_subtitle')}
          </p>
        </div>

        {/* ── Language preference selector ── */}
        <div className="mb-7 bg-slate-900/80 p-3.5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              {t('select_narration_lang')}
            </p>
            <button
              type="button"
              onClick={openLanguageModal}
              className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              {t('change_lang')}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => selectLanguage(l.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                  preferredLanguage === l.code
                    ? 'bg-amber-500 text-slate-950 border-transparent shadow-lg shadow-amber-500/25'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Quick-access shortcuts ── */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {lastScannedPoiId && (
            <Link
              to={`/poi/${lastScannedPoiId}`}
              className="col-span-2 flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">{t('continue_previous')}</p>
                <p className="text-sm font-bold text-white">{t('view_previous')} #{lastScannedPoiId}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
            </Link>
          )}

          <Link to="/map"
            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 active:scale-[0.97] transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-200">{t('museum_map')}</p>
          </Link>

          <a href="javascript:void(0)"
            onClick={() => {
              alert(t('step1_desc'));
            }}
            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 active:scale-[0.97] transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <QrCode className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-200">{t('scan_qr')}</p>
          </a>
        </div>

        {/* ── How it works ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-4">
            {t('how_it_works')}
          </p>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg ${step.glow} flex-shrink-0`}>
                  {step.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">
                    <span className="text-slate-600 mr-1.5">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-[12px] text-slate-400 leading-5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-600 mt-8">
          Powered by <span className="text-amber-500 font-semibold">Microsoft Edge Neural TTS</span> · FastAPI · React
        </p>
      </div>
    </div>
  );
}
