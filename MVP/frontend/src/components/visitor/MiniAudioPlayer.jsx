/**
 * MiniAudioPlayer.jsx
 * Floating Mini Audio Player pinned to the viewport bottom (height ~68px).
 * Features: POI title, Play/Pause, Seek ±10s, playback speed selector (0.8x, 1.0x, 1.2x),
 * progress scrubber, and 'Offline TTS' weak network fallback indicator badge.
 */

import { useAudioPlayer } from '../../contexts/AudioPlayerContext.jsx';

// Top-of-file module constants per dev_rules.md
export const SEEK_OFFSET_SECONDS = 10;
export const SPEED_OPTIONS = [0.8, 1.0, 1.2];

/**
 * Formats time in seconds to mm:ss string.
 * @param {number} totalSeconds
 * @returns {string} mm:ss
 */
export function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
}

export function MiniAudioPlayer({ inline = false, poiId = null }) {
  const audioContext = useAudioPlayer();
  const {
    currentPoi,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isBuffering,
    isOfflineFallback,
    error,
    togglePlay,
    skip,
    seek,
    setPlaybackRate,
    stop,
  } = audioContext || {};

  if (!currentPoi) {
    return null;
  }

  // If in inline mode for a specific POI, only render if currentPoi matches this POI
  if (inline && poiId) {
    const activeId = String(currentPoi.id ?? currentPoi.poi_id ?? '');
    if (activeId !== String(poiId)) {
      return null;
    }
  }

  // If floating player at viewport bottom, hide if a POI preview card is currently open
  if (!inline && typeof document !== 'undefined' && document.querySelector('.poi-preview-sheet')) {
    return null;
  }

  const handleSeekChange = (event) => {
    const targetSeconds = parseFloat(event.target.value);
    seek(targetSeconds);
  };

  const handleSkipBackward = () => {
    skip(-SEEK_OFFSET_SECONDS);
  };

  const handleSkipForward = () => {
    skip(SEEK_OFFSET_SECONDS);
  };

  const handleTogglePlay = () => {
    togglePlay();
  };

  const handleSpeedSelect = (rate) => {
    setPlaybackRate(rate);
  };

  const handleClose = () => {
    stop?.();
  };

  return (
    <div
      data-testid="mini-audio-player"
      role="region"
      aria-label="Audio Guide Player"
      style={
        inline
          ? {
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '10px 12px',
              marginTop: '12px',
              marginBottom: '6px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              boxSizing: 'border-box',
              width: '100%',
            }
          : {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 40,
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #CBD5E1',
              padding: '10px 16px',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.06)',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            }
      }
    >
      {/* Row 1: Title, Status Badges & Speed Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            data-testid="player-poi-title"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F172A',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={currentPoi.title}
          >
            {currentPoi.title}
          </span>

          {isOfflineFallback && (
            <span
              data-testid="offline-tts-badge"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#B45309',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                padding: '1px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              Offline TTS
            </span>
          )}

          {isBuffering && !isOfflineFallback && (
            <span
              data-testid="buffering-badge"
              style={{
                fontSize: '11px',
                color: '#475569',
                backgroundColor: '#F1F5F9',
                padding: '1px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              Buffering...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Speed Controls (0.8x | 1.0x | 1.2x) */}
          <div
            data-testid="playback-speed-controls"
            style={{ display: 'flex', gap: '4px' }}
          >
            {SPEED_OPTIONS.map((rate) => {
              const isSelected = playbackRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedSelect(rate)}
                  data-testid={`speed-button-${rate}`}
                  aria-label={`Set playback speed ${rate}x`}
                  style={{
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: isSelected ? '1px solid #1E293B' : '1px solid #CBD5E1',
                    backgroundColor: isSelected ? '#1E293B' : '#F8FAFC',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    minHeight: '26px',
                  }}
                >
                  {rate}x
                </button>
              );
            })}
          </div>

          {/* Close/Dismiss Audio Player */}
          <button
            type="button"
            onClick={handleClose}
            data-testid="close-player-button"
            aria-label="Close audio player"
            title="Đóng audio player"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Row 2: Scrubber Bar & Audio Control Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Progress Bar & Timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            data-testid="current-time"
            style={{ fontSize: '11px', color: '#475569', minWidth: '32px' }}
          >
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.5"
            value={currentTime}
            onChange={handleSeekChange}
            disabled={isOfflineFallback || !duration}
            data-testid="progress-scrubber"
            aria-label="Audio progress"
            style={{
              flex: 1,
              height: '4px',
              cursor: isOfflineFallback || !duration ? 'not-allowed' : 'pointer',
              accentColor: '#1E293B',
            }}
          />

          <span
            data-testid="duration-time"
            style={{ fontSize: '11px', color: '#475569', minWidth: '32px', textAlign: 'right' }}
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Buttons: Skip -10s, Play/Pause, Skip +10s */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '2px',
          }}
        >
          {/* Skip Backward -10s */}
          <button
            type="button"
            onClick={handleSkipBackward}
            disabled={isOfflineFallback}
            data-testid="skip-backward-button"
            aria-label="Skip backward 10 seconds"
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isOfflineFallback ? 'not-allowed' : 'pointer',
              opacity: isOfflineFallback ? 0.4 : 1,
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            -10s
          </button>

          {/* Large Play / Pause Toggle */}
          <button
            type="button"
            onClick={handleTogglePlay}
            data-testid="play-pause-button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              minHeight: '48px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(30, 41, 59, 0.25)',
            }}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          {/* Skip Forward +10s */}
          <button
            type="button"
            onClick={handleSkipForward}
            disabled={isOfflineFallback}
            data-testid="skip-forward-button"
            aria-label="Skip forward 10 seconds"
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isOfflineFallback ? 'not-allowed' : 'pointer',
              opacity: isOfflineFallback ? 0.4 : 1,
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            +10s
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="player-error"
          style={{
            fontSize: '11px',
            color: '#B91C1C',
            textAlign: 'center',
            marginTop: '4px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default MiniAudioPlayer;
