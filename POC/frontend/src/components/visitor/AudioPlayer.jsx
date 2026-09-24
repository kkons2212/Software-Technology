import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, Headphones, Loader2, WifiOff } from 'lucide-react';
import { useVisitorSession } from '../../context/VisitorSessionContext';

const LANG_BCP47 = { vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

export default function AudioPlayer({ audioUrl, fallbackText, languageCode = 'vi', onListen }) {
  const { t } = useVisitorSession();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [progress, setProgress]         = useState(0);
  const [speed, setSpeed]               = useState(1);
  const [useFallback, setUseFallback]   = useState(false);
  const [error, setError]               = useState(false);

  // Reset on language / audio change
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);
    setUseFallback(false);
    setError(false);
    setIsLoading(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [audioUrl, languageCode]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- HTML5 Audio handlers ---
  const onMetadata = () => setDuration(audioRef.current?.duration || 0);
  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    const d = audioRef.current.duration || 1;
    setCurrentTime(t);
    setProgress((t / d) * 100);
  };
  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    onListen?.();
  };
  const onCanPlay = () => setIsLoading(false);
  const onWaiting = () => setIsLoading(true);
  const onAudioError = () => {
    setIsLoading(false);
    setUseFallback(true);
  };

  const togglePlay = () => {
    if (useFallback || !audioUrl) {
      // Web Speech API fallback
      if (isPlaying) {
        window.speechSynthesis?.cancel();
        setIsPlaying(false);
        return;
      }
      if (!('speechSynthesis' in window) || !fallbackText) { setError(true); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(fallbackText);
      utt.lang  = LANG_BCP47[languageCode] || 'vi-VN';
      utt.rate  = speed;
      utt.onend = () => {
        setIsPlaying(false);
        onListen?.();
      };
      utt.onerror = () => { setIsPlaying(false); setError(true); };
      window.speechSynthesis.speak(utt);
      setIsPlaying(true);
      onListen?.();
    } else {
      const a = audioRef.current;
      if (!a) return;
      if (isPlaying) {
        a.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        a.play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
            onListen?.();
          })
          .catch(() => {
            setUseFallback(true);
            setIsLoading(false);
          });
      }
    }
  };

  const seek = (sec) => {
    if (useFallback || !audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + sec));
  };

  const handleSlider = (e) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && !useFallback) {
      audioRef.current.currentTime = (val / 100) * duration;
    }
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
    if (isPlaying && useFallback) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 rounded-3xl border border-amber-500/25 p-5 overflow-hidden shadow-xl shadow-black/30">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden native audio */}
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

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Headphones className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{t('audio_guide')}</p>
            <p className="text-[11px] text-slate-400">
              {useFallback ? t('speech_fallback') : t('neural_tts')}
            </p>
          </div>
        </div>

        {/* Equalizer animation */}
        <div className="flex items-end gap-[3px] h-6">
          {[0.4, 0.7, 1, 0.6, 0.35].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-amber-400 origin-bottom transition-all ${isPlaying ? 'eq-bar' : 'opacity-25'}`}
              style={{
                height: `${h * 100}%`,
                animationDelay: `${i * 0.12}s`,
                animationDuration: `${0.6 + i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 space-y-1.5">
        <input
          type="range" min="0" max="100" step="0.1"
          value={progress}
          onChange={handleSlider}
          className="audio-slider w-full cursor-pointer"
          disabled={useFallback}
        />
        <div className="flex justify-between text-[11px] font-mono text-slate-500">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration) || '--:--'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Speed */}
        <button onClick={cycleSpeed}
          className="min-w-[3rem] px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300 hover:border-amber-500/50 hover:text-amber-400 transition-all">
          {speed}x
        </button>

        {/* Rewind / Play / Forward */}
        <div className="flex items-center gap-4">
          <button onClick={() => seek(-10)} disabled={useFallback}
            className="p-2.5 rounded-full text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90">
            <RotateCcw className="w-5 h-5" />
          </button>

          <button onClick={togglePlay}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${
              isPlaying
                ? 'bg-amber-500 shadow-amber-500/30 hover:bg-amber-400'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400 shadow-amber-500/25 hover:from-amber-400 hover:to-amber-300'
            }`}>
            {/* Pulse ring when playing */}
            {isPlaying && (
              <span className="absolute inset-0 rounded-full bg-amber-400 pulse-ring" />
            )}
            {isLoading
              ? <Loader2 className="w-6 h-6 text-slate-950 animate-spin" />
              : isPlaying
                ? <Pause className="w-6 h-6 text-slate-950 fill-current relative z-10" />
                : <Play className="w-6 h-6 text-slate-950 fill-current ml-0.5" />
            }
          </button>

          <button onClick={() => seek(10)} disabled={useFallback}
            className="p-2.5 rounded-full text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all disabled:opacity-30 active:scale-90">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Offline indicator */}
        <div className="min-w-[3rem] flex justify-end">
          {error && <WifiOff className="w-4 h-4 text-red-400" title="Không thể phát audio" />}
          {!error && useFallback && <Volume2 className="w-4 h-4 text-amber-400 opacity-60" />}
        </div>
      </div>
    </div>
  );
}
