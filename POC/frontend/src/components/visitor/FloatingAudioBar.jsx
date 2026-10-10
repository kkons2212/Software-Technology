import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2,
  X, ChevronUp, Headphones, Loader2, Sparkles
} from 'lucide-react';
import { useVisitorSession } from '../../context/VisitorSessionContext';

const LANG_BCP47 = { vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

export default function FloatingAudioBar({
  poi,
  languageCode = 'vi',
  onExpand,
  onClose,
  autoPlay = false
}) {
  const { markPoiAsListened, t } = useVisitorSession();
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [useFallback, setUseFallback] = useState(false);

  const audioUrl = poi?.audio_url;
  const fallbackText = poi ? `${poi.title}. ${poi.description || poi.short_description || ''}` : '';

  // Khi POI hoặc ngôn ngữ đổi, nạp audio mới và tự động phát nếu autoPlay = true
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);
    setUseFallback(false);
    setIsLoading(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }

    if (autoPlay && poi) {
      const timer = setTimeout(() => {
        playAudio();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [poi?.id, languageCode, audioUrl, autoPlay]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- HTML5 Audio Handlers ---
  const onMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setCurrentTime(cur);
    setProgress((cur / dur) * 100);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    if (poi?.id) markPoiAsListened(poi.id);
  };

  const onCanPlay = () => setIsLoading(false);
  const onWaiting = () => setIsLoading(true);
  const onAudioError = () => {
    setIsLoading(false);
    setUseFallback(true);
  };

  const playAudio = () => {
    if (useFallback || !audioUrl) {
      // Web Speech API Fallback
      if (!fallbackText) return;
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(fallbackText);
      u.lang = LANG_BCP47[languageCode] || 'vi-VN';
      u.rate = speed;
      u.onstart = () => {
        setIsPlaying(true);
        if (poi?.id) markPoiAsListened(poi.id);
      };
      u.onend = () => setIsPlaying(false);
      u.onerror = () => setIsPlaying(false);
      window.speechSynthesis?.speak(u);
    } else if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          if (poi?.id) markPoiAsListened(poi.id);
        })
        .catch(() => {
          setUseFallback(true);
        });
    }
  };

  const pauseAudio = () => {
    if (useFallback) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
    } else if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const skip = (seconds) => {
    if (audioRef.current && !useFallback) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 0.75];
    const nextSpeed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  if (!poi) return null;

  return (
    <div className="fixed bottom-[74px] left-3 right-3 max-w-lg mx-auto z-40 animate-slide-up select-none">
      {/* Hidden HTML5 Audio Element */}
      {audioUrl && !useFallback && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={onMetadata}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onCanPlay={onCanPlay}
          onWaiting={onWaiting}
          onError={onAudioError}
        />
      )}

      {/* Floating Glassmorphic Player Card */}
      <div className="relative overflow-hidden bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-amber-400/20">

        {/* Top Slim Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-3 pt-2 pb-2.5 flex items-center justify-between gap-2.5">
          {/* Left: Thumbnail & POI Title (Click to Expand Guide Tab) */}
          <div
            onClick={onExpand}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            {/* Thumbnail */}
            <div className="relative w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {poi.image_url ? (
                <img src={poi.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Headphones className="w-5 h-5 text-amber-400" />
              )}
              {/* Equalizer animation when playing */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                  <span className="w-1 bg-amber-400 rounded-full animate-pulse h-4"></span>
                  <span className="w-1 bg-amber-300 rounded-full animate-pulse h-2.5 delay-75"></span>
                  <span className="w-1 bg-amber-400 rounded-full animate-pulse h-5 delay-150"></span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                  Audio Guide
                </span>
                <span className="text-[10px] text-slate-400">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate mt-0.5">
                #{poi.id} · {poi.title}
              </h4>
            </div>
          </div>

          {/* Right: Audio Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Speed */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="text-[10px] font-bold text-amber-400 px-1.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              {speed}x
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => skip(-10)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors active:scale-90"
              title="Lùi 10s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Play/Pause Main Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 active:scale-90 transition-transform"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => skip(10)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors active:scale-90"
              title="Tua 10s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Close / Dismiss Bar */}
            <button
              type="button"
              onClick={() => {
                pauseAudio();
                onClose?.();
              }}
              className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors ml-0.5"
              title="Tắt thanh phát"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
