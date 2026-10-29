/**
 * AudioPlayerContext.jsx
 * Global Singleton Audio Context & 3.5s Web Speech Fallback Engine.
 * Enforces exactly 1 active audio stream across the application,
 * automatically switching to browser Web Speech API if cellular stream fails or hangs for > 3.5s.
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// Top-of-file module constants per dev_rules.md
export const STREAM_TIMEOUT_MS = 3500;
export const SUPPORTED_PLAYBACK_RATES = [0.8, 1.0, 1.2];
export const DEFAULT_PLAYBACK_RATE = 1.0;
export const DEFAULT_BCP47_LANG = 'vi-VN';

export const AudioPlayerContext = createContext(null);

export function AudioPlayerProvider({ children }) {
  const [currentPoi, setCurrentPoi] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completedPoiIds, setCompletedPoiIds] = useState([]);
  const [playbackRate, setPlaybackRateState] = useState(DEFAULT_PLAYBACK_RATE);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [error, setError] = useState(null);

  // Singleton Audio Element reference
  const audioRef = useRef(null);
  const streamTimeoutRef = useRef(null);
  const isStreamingStartedRef = useRef(false);
  const currentPoiRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  currentPoiRef.current = currentPoi;

  const markPoiCompleted = useCallback((poi) => {
    if (poi?.id === undefined || poi?.id === null) {
      return;
    }

    const completedPoiId = String(poi.id);
    setCompletedPoiIds((currentIds) => (
      currentIds.includes(completedPoiId) ? currentIds : [...currentIds, completedPoiId]
    ));
  }, []);

  // Initialize singleton audio element on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;

      const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        setCurrentTime(audioRef.current.currentTime || 0);
      };

      const handleLoadedMetadata = () => {
        if (!audioRef.current) return;
        const audioDuration = audioRef.current.duration;
        setDuration(Number.isFinite(audioDuration) ? audioDuration : 0);
        setIsBuffering(false);
      };

      const handlePlaying = () => {
        isStreamingStartedRef.current = true;
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
          streamTimeoutRef.current = null;
        }
        setIsBuffering(false);
        setIsPlaying(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleWaiting = () => {
        setIsBuffering(true);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        markPoiCompleted(currentPoiRef.current);
      };

      const handleError = (_audioEvent) => {
        setIsBuffering(false);
        // If streaming hasn't started yet, let fallback handle it
        if (!isStreamingStartedRef.current && currentPoiRef.current) {
          triggerWebSpeechFallback(currentPoiRef.current);
        } else {
          setIsPlaying(false);
          setError('Audio playback error occurred.');
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
        }
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.removeAttribute('src');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markPoiCompleted]);

  // Web Speech Fallback trigger
  const triggerWebSpeechFallback = useCallback((poi) => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        if (typeof audioRef.current.load === 'function') {
          audioRef.current.load();
        }
      } catch (loadError) {
        console.warn('Error clearing audio element:', loadError);
      }
    }

    setIsOfflineFallback(true);
    setIsBuffering(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        speechUtteranceRef.current = null;
        window.speechSynthesis.cancel();
        const textToSpeak = poi.text || poi.description || poi.title || '';
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = poi.bcp47Code || poi.lang || DEFAULT_BCP47_LANG;
        utterance.rate = playbackRate;
        speechUtteranceRef.current = utterance;

        utterance.onstart = () => {
          setIsPlaying(true);
          setError(null);
        };

        utterance.onend = () => {
          if (speechUtteranceRef.current !== utterance) {
            return;
          }
          speechUtteranceRef.current = null;
          setIsPlaying(false);
          markPoiCompleted(poi);
        };

        utterance.onerror = (event) => {
          if (speechUtteranceRef.current !== utterance) {
            return;
          }
          speechUtteranceRef.current = null;
          setIsPlaying(false);
          setError(event.error || 'Speech synthesis failed.');
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsPlaying(false);
        setError('Web Speech fallback unavailable.');
      }
    } else {
      setIsPlaying(false);
      setError('Audio stream timed out and speech synthesis is not supported.');
    }
  }, [markPoiCompleted, playbackRate]);

  // Play a specific POI narration
  const play = useCallback((poi) => {
    if (!poi) return;

    // Reset previous audio/speech states
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechUtteranceRef.current = null;
      window.speechSynthesis.cancel();
    }

    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }

    setCurrentPoi(poi);
    setError(null);
    setCurrentTime(0);
    setIsOfflineFallback(false);
    isStreamingStartedRef.current = false;

    const audioUrl = poi.audio_url || poi.audioUrl;

    if (!audioUrl || !audioRef.current) {
      // No audio URL available -> direct fallback to Web Speech API
      triggerWebSpeechFallback(poi);
      return;
    }

    const audio = audioRef.current;
    try {
      audio.pause();
      audio.src = audioUrl;
      audio.playbackRate = playbackRate;
      setIsBuffering(true);

      // Arm 3.5s buffering/streaming timeout
      streamTimeoutRef.current = setTimeout(() => {
        if (!isStreamingStartedRef.current) {
          console.warn('Audio stream timed out after 3.5s. Falling back to Web Speech API.');
          triggerWebSpeechFallback(poi);
        }
      }, STREAM_TIMEOUT_MS);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (!isStreamingStartedRef.current) {
            console.warn('Audio play() rejected. Falling back to Web Speech API:', err);
            triggerWebSpeechFallback(poi);
          }
        });
      }
    } catch (err) {
      console.warn('Synchronous audio play error, falling back:', err);
      triggerWebSpeechFallback(poi);
    }
  }, [playbackRate, triggerWebSpeechFallback]);

  // Pause playback
  const pause = useCallback(() => {
    if (isOfflineFallback) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, [isOfflineFallback]);

  // Resume playback
  const resume = useCallback(() => {
    if (isOfflineFallback) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
    } else if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Error resuming audio:', err);
      });
    }
  }, [isOfflineFallback]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentPoi) {
      resume();
    }
  }, [isPlaying, currentPoi, pause, resume]);

  // Seek to specific timestamp
  const seek = useCallback((targetTimeSeconds) => {
    if (isOfflineFallback) return; // Web Speech doesn't support seek
    if (audioRef.current && Number.isFinite(targetTimeSeconds)) {
      const maxDuration = duration > 0 ? duration : Infinity;
      const clampedTime = Math.max(0, Math.min(targetTimeSeconds, maxDuration));
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  }, [isOfflineFallback, duration]);

  // Skip relative offset (e.g. -10s or +10s)
  const skip = useCallback((offsetSeconds) => {
    if (isOfflineFallback) return;
    if (audioRef.current) {
      const maxDuration = duration > 0 ? duration : Infinity;
      const newTime = Math.max(0, Math.min((audioRef.current.currentTime || 0) + offsetSeconds, maxDuration));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [isOfflineFallback, duration]);

  // Change playback speed (0.8x, 1.0x, 1.2x)
  const setPlaybackRate = useCallback((rate) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // Stop playback completely
  const stop = useCallback(() => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechUtteranceRef.current = null;
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    setCurrentPoi(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);
    setIsOfflineFallback(false);
    setError(null);
  }, []);

  const value = {
    currentPoi,
    isPlaying,
    currentTime,
    duration,
    completedPoiIds,
    playbackRate,
    isBuffering,
    isOfflineFallback,
    error,
    play,
    pause,
    resume,
    togglePlay,
    seek,
    skip,
    setPlaybackRate,
    stop,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    return {
      currentPoi: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1.0,
      isBuffering: false,
      isOfflineFallback: false,
      error: null,
      play: () => {},
      pause: () => {},
      resume: () => {},
      togglePlay: () => {},
      seek: () => {},
      skip: () => {},
      setPlaybackRate: () => {},
      stop: () => {},
    };
  }
  return context;
}

export default AudioPlayerContext;
