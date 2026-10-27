import { useEffect, useRef, useState } from 'react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default function AudioAuditPlayer({ translationId, audioUrl }) {
  const audioRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    const audio = audioRef.current;
    const pauseOtherPlayer = (event) => {
      if (event.detail !== translationId && audio) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('audio-audit-play', pauseOtherPlayer);
    return () => {
      window.removeEventListener('audio-audit-play', pauseOtherPlayer);
      audio?.pause();
    };
  }, [translationId]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      setPlaybackError('');
      const playback = audio.play();
      playback?.catch((error) => {
        setIsPlaying(false);
        setPlaybackError(error?.message || 'Unable to play this audio.');
      });
    } else {
      audio.pause();
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Number(event.target.value);
    setCurrentTime(audio.currentTime);
  };

  if (!audioUrl) {
    return (
      <div
        data-testid={`audio-missing-${translationId}`}
        className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500"
      >
        Audio Guide not generated.
      </div>
    );
  }

  return (
    <div
      data-testid={`audio-player-${translationId}`}
      className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => {
          setIsPlaying(true);
          window.dispatchEvent(new CustomEvent('audio-audit-play', { detail: translationId }));
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError('Unable to load this audio.');
        }}
        className="hidden"
      />
      <button
        type="button"
        aria-label={isPlaying ? 'Pause audio preview' : 'Play audio preview'}
        onClick={togglePlayback}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700"
      >
        {isPlaying ? 'Ⅱ' : '▶'}
      </button>
      <span className="min-w-10 text-xs tabular-nums text-slate-600">
        {formatTime(currentTime)}
      </span>
      <input
        type="range"
        aria-label="Audio progress"
        min="0"
        max={duration || 0}
        step="0.1"
        value={Math.min(currentTime, duration || 0)}
        onChange={seek}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-slate-800"
      />
      <span className="min-w-10 text-right text-xs tabular-nums text-slate-600">
        {formatTime(duration)}
      </span>
      {playbackError && (
        <span role="alert" className="text-xs text-red-700">
          {playbackError}
        </span>
      )}
    </div>
  );
}
