import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  AudioPlayerProvider,
  useAudioPlayer,
  STREAM_TIMEOUT_MS,
} from '../AudioPlayerContext.jsx';

// Test consumer component
function TestPlayerConsumer() {
  const player = useAudioPlayer();
  return (
    <div>
      <div data-testid="poi-title">{player.currentPoi?.title || 'No POI'}</div>
      <div data-testid="is-playing">{player.isPlaying ? 'PLAYING' : 'PAUSED'}</div>
      <div data-testid="is-buffering">{player.isBuffering ? 'BUFFERING' : 'IDLE'}</div>
      <div data-testid="is-offline">{player.isOfflineFallback ? 'OFFLINE' : 'ONLINE'}</div>
      <div data-testid="current-time">{player.currentTime}</div>
      <div data-testid="duration">{player.duration}</div>
      <div data-testid="playback-rate">{player.playbackRate}</div>
      <button
        onClick={() =>
          player.play({
            id: 1,
            title: 'Hoang Cam Stove',
            audioUrl: 'https://example.com/audio1.mp3',
            text: 'Historical Hoang Cam stove narrative text',
            bcp47Code: 'vi-VN',
          })
        }
      >
        Play Valid Stream
      </button>
      <button
        onClick={() =>
          player.play({
            id: 2,
            title: 'Stalled Audio POI',
            audioUrl: 'https://example.com/stalled.mp3',
            text: 'Stalled stream narration text',
            bcp47Code: 'en-US',
          })
        }
      >
        Play Stalled Stream
      </button>
      <button
        onClick={() =>
          player.play({
            id: 3,
            title: 'No Audio POI',
            text: 'Direct Web Speech text',
            bcp47Code: 'vi-VN',
          })
        }
      >
        Play Without URL
      </button>
      <button onClick={player.pause}>Pause</button>
      <button onClick={player.resume}>Resume</button>
      <button onClick={player.togglePlay}>Toggle Play</button>
      <button onClick={() => player.skip(10)}>Skip +10s</button>
      <button onClick={() => player.skip(-10)}>Skip -10s</button>
      <button onClick={() => player.seek(25)}>Seek 25s</button>
      <button onClick={() => player.setPlaybackRate(1.2)}>Set 1.2x</button>
      <button onClick={player.stop}>Stop</button>
    </div>
  );
}

describe('AudioPlayerContext (US 01.3.4 Singleton Audio & 3.5s Fallback)', () => {
  let mockAudioInstance;
  let audioEventListeners = {};

  beforeEach(() => {
    vi.useFakeTimers();
    audioEventListeners = {};

    mockAudioInstance = {
      src: '',
      currentTime: 0,
      duration: 120,
      playbackRate: 1.0,
      paused: true,
      play: vi.fn().mockImplementation(() => {
        mockAudioInstance.paused = false;
        return Promise.resolve();
      }),
      pause: vi.fn().mockImplementation(() => {
        mockAudioInstance.paused = true;
      }),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        audioEventListeners[event] = handler;
      }),
      removeEventListener: vi.fn((event) => {
        delete audioEventListeners[event];
      }),
    };

    window.Audio = vi.fn().mockImplementation(() => mockAudioInstance);

    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    };

    window.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
      text,
      lang: 'vi-VN',
      rate: 1.0,
      onstart: null,
      onend: null,
      onerror: null,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders provider and initial idle state', () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    expect(screen.getByTestId('poi-title').textContent).toBe('No POI');
    expect(screen.getByTestId('is-playing').textContent).toBe('PAUSED');
    expect(screen.getByTestId('is-buffering').textContent).toBe('IDLE');
    expect(screen.getByTestId('is-offline').textContent).toBe('ONLINE');
    expect(screen.getByTestId('playback-rate').textContent).toBe('1');
  });

  it('plays audio stream and updates state when playing event fires', async () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    await act(async () => {
      screen.getByText('Play Valid Stream').click();
    });

    expect(mockAudioInstance.src).toBe('https://example.com/audio1.mp3');
    expect(mockAudioInstance.play).toHaveBeenCalled();

    // Simulate loadedmetadata and playing event
    act(() => {
      if (audioEventListeners.loadedmetadata) {
        audioEventListeners.loadedmetadata();
      }
      if (audioEventListeners.playing) {
        audioEventListeners.playing();
      }
    });

    expect(screen.getByTestId('poi-title').textContent).toBe('Hoang Cam Stove');
    expect(screen.getByTestId('is-playing').textContent).toBe('PLAYING');
    expect(screen.getByTestId('is-buffering').textContent).toBe('IDLE');
    expect(screen.getByTestId('duration').textContent).toBe('120');
  });

  it('falls back to Web Speech API when stream hangs for > 3.5 seconds', async () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    await act(async () => {
      screen.getByText('Play Stalled Stream').click();
    });

    expect(screen.getByTestId('is-buffering').textContent).toBe('BUFFERING');
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();

    // Advance time past the 3500ms timeout threshold without playing event
    act(() => {
      vi.advanceTimersByTime(STREAM_TIMEOUT_MS + 100);
    });

    expect(screen.getByTestId('is-offline').textContent).toBe('OFFLINE');
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
    expect(mockAudioInstance.pause).toHaveBeenCalled();
    expect(mockAudioInstance.removeAttribute).toHaveBeenCalledWith('src');
  });

  it('falls back directly to Web Speech when POI has no audio URL', async () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    await act(async () => {
      screen.getByText('Play Without URL').click();
    });

    expect(screen.getByTestId('is-offline').textContent).toBe('OFFLINE');
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('supports pause, resume, and togglePlay controls', async () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    await act(async () => {
      screen.getByText('Play Valid Stream').click();
    });

    act(() => {
      if (audioEventListeners.playing) audioEventListeners.playing();
    });

    expect(screen.getByTestId('is-playing').textContent).toBe('PLAYING');

    act(() => {
      screen.getByText('Pause').click();
    });
    expect(mockAudioInstance.pause).toHaveBeenCalled();

    await act(async () => {
      screen.getByText('Resume').click();
    });
    expect(mockAudioInstance.play).toHaveBeenCalled();
  });

  it('supports seek, skip -10s / +10s, and playback rate adjustment', async () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    await act(async () => {
      screen.getByText('Play Valid Stream').click();
    });

    act(() => {
      if (audioEventListeners.loadedmetadata) audioEventListeners.loadedmetadata();
      if (audioEventListeners.playing) audioEventListeners.playing();
    });

    // Seek to 25s
    act(() => {
      screen.getByText('Seek 25s').click();
    });
    expect(mockAudioInstance.currentTime).toBe(25);

    // Skip +10s (25 + 10 = 35)
    act(() => {
      screen.getByText('Skip +10s').click();
    });
    expect(mockAudioInstance.currentTime).toBe(35);

    // Skip -10s (35 - 10 = 25)
    act(() => {
      screen.getByText('Skip -10s').click();
    });
    expect(mockAudioInstance.currentTime).toBe(25);

    // Set speed to 1.2x
    act(() => {
      screen.getByText('Set 1.2x').click();
    });
    expect(mockAudioInstance.playbackRate).toBe(1.2);
    expect(screen.getByTestId('playback-rate').textContent).toBe('1.2');
  });

  it('stops playback and resets state cleanly on stop()', async () => {
    render(
      <AudioPlayerProvider>
        <TestPlayerConsumer />
      </AudioPlayerProvider>
    );

    await act(async () => {
      screen.getByText('Play Valid Stream').click();
    });

    act(() => {
      screen.getByText('Stop').click();
    });

    expect(screen.getByTestId('poi-title').textContent).toBe('No POI');
    expect(screen.getByTestId('is-playing').textContent).toBe('PAUSED');
    expect(screen.getByTestId('is-offline').textContent).toBe('ONLINE');
  });
});
