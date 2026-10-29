import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniAudioPlayer, formatTime } from '../visitor/MiniAudioPlayer.jsx';
import { AudioPlayerContext } from '../../contexts/AudioPlayerContext.jsx';

describe('MiniAudioPlayer (US 01.3.3 Floating Mini Audio Player UI)', () => {
  const baseMockContext = {
    currentPoi: {
      id: 1,
      title: 'Hoang Cam Stove',
      audioUrl: 'https://example.com/audio.mp3',
    },
    isPlaying: false,
    currentTime: 15,
    duration: 120,
    playbackRate: 1.0,
    isBuffering: false,
    isOfflineFallback: false,
    error: null,
    togglePlay: vi.fn(),
    skip: vi.fn(),
    seek: vi.fn(),
    setPlaybackRate: vi.fn(),
    stop: vi.fn(),
  };

  const renderWithContext = (contextOverrides = {}) => {
    const value = { ...baseMockContext, ...contextOverrides };
    return render(
      <AudioPlayerContext.Provider value={value}>
        <MiniAudioPlayer />
      </AudioPlayerContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders null when there is no active POI', () => {
    const { container } = renderWithContext({ currentPoi: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders POI title, timestamps, and scrubber when POI is active', () => {
    renderWithContext();

    expect(screen.getByTestId('mini-audio-player')).toBeInTheDocument();
    expect(screen.getByTestId('player-poi-title')).toHaveTextContent('Hoang Cam Stove');
    expect(screen.getByTestId('current-time')).toHaveTextContent('00:15');
    expect(screen.getByTestId('duration-time')).toHaveTextContent('02:00');
    expect(screen.getByTestId('progress-scrubber')).toBeInTheDocument();
  });

  it('displays "Offline TTS" badge when using Web Speech fallback', () => {
    renderWithContext({ isOfflineFallback: true });

    expect(screen.getByTestId('offline-tts-badge')).toBeInTheDocument();
    expect(screen.getByTestId('offline-tts-badge')).toHaveTextContent('Offline TTS');
  });

  it('displays "Buffering..." badge when stream is buffering', () => {
    renderWithContext({ isBuffering: true, isOfflineFallback: false });

    expect(screen.getByTestId('buffering-badge')).toBeInTheDocument();
    expect(screen.getByTestId('buffering-badge')).toHaveTextContent('Buffering...');
  });

  it('invokes togglePlay when Play/Pause button is clicked', () => {
    const togglePlay = vi.fn();
    renderWithContext({ togglePlay, isPlaying: false });

    const playPauseBtn = screen.getByTestId('play-pause-button');
    expect(playPauseBtn).toHaveAttribute('aria-label', 'Play');
    fireEvent.click(playPauseBtn);

    expect(togglePlay).toHaveBeenCalledTimes(1);
  });

  it('invokes onPlay callback when clicked in inline mode while not playing', () => {
    const onPlay = vi.fn();
    const value = { ...baseMockContext, isPlaying: false };
    render(
      <AudioPlayerContext.Provider value={value}>
        <MiniAudioPlayer inline poiId={1} onPlay={onPlay} />
      </AudioPlayerContext.Provider>
    );

    const playPauseBtn = screen.getByTestId('play-pause-button');
    fireEvent.click(playPauseBtn);

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('renders pause icon when playing', () => {
    renderWithContext({ isPlaying: true });

    const playPauseBtn = screen.getByTestId('play-pause-button');
    expect(playPauseBtn).toHaveAttribute('aria-label', 'Pause');
    expect(playPauseBtn.textContent).toContain('❚❚');
  });

  it('invokes skip(-10) and skip(10) when skip buttons are tapped', () => {
    const skip = vi.fn();
    renderWithContext({ skip });

    const skipBackBtn = screen.getByTestId('skip-backward-button');
    const skipFwdBtn = screen.getByTestId('skip-forward-button');

    fireEvent.click(skipBackBtn);
    expect(skip).toHaveBeenCalledWith(-10);

    fireEvent.click(skipFwdBtn);
    expect(skip).toHaveBeenCalledWith(10);
  });

  it('invokes setPlaybackRate when speed buttons are selected', () => {
    const setPlaybackRate = vi.fn();
    renderWithContext({ setPlaybackRate, playbackRate: 1.0 });

    const btn08 = screen.getByTestId('speed-button-0.8');
    const btn12 = screen.getByTestId('speed-button-1.2');

    fireEvent.click(btn08);
    expect(setPlaybackRate).toHaveBeenCalledWith(0.8);

    fireEvent.click(btn12);
    expect(setPlaybackRate).toHaveBeenCalledWith(1.2);
  });

  it('invokes seek when scrubber progress slider is moved', () => {
    const seek = vi.fn();
    renderWithContext({ seek, duration: 120, currentTime: 20 });

    const scrubber = screen.getByTestId('progress-scrubber');
    fireEvent.change(scrubber, { target: { value: '45' } });

    expect(seek).toHaveBeenCalledWith(45);
  });

  it('disables scrubber and skip buttons during Offline TTS mode', () => {
    renderWithContext({ isOfflineFallback: true });

    expect(screen.getByTestId('progress-scrubber')).toBeDisabled();
    expect(screen.getByTestId('skip-backward-button')).toBeDisabled();
    expect(screen.getByTestId('skip-forward-button')).toBeDisabled();
  });

  it('renders error message if an error occurs', () => {
    renderWithContext({ error: 'Network playback failed' });

    expect(screen.getByTestId('player-error')).toHaveTextContent('Network playback failed');
  });

  it('invokes stop when close button is clicked', () => {
    const stop = vi.fn();
    renderWithContext({ stop });

    const closeBtn = screen.getByTestId('close-player-button');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('formatTime helper properly formats edge values', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(125)).toBe('02:05');
    expect(formatTime(-10)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
    expect(formatTime(Infinity)).toBe('00:00');
  });
});
