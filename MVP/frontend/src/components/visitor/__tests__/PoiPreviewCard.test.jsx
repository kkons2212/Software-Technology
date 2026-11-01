import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PoiPreviewCard from '../PoiPreviewCard.jsx';
import { AudioPlayerContext } from '../../../contexts/AudioPlayerContext.jsx';

const poi = {
  id: 'poi-1',
  title: 'Cu Chi Tunnel',
  short_description: 'Explore the underground tunnel system.',
  description: 'Full unredacted historical narrative of the tunnels.',
  image_url: 'https://example.test/tunnel.jpg',
  latitude: 11.14,
  longitude: 106.46,
};

afterEach(cleanup);

describe('PoiPreviewCard', () => {
  it('shows the exhibit preview, Haversine distance, and action buttons', () => {
    const onPlayAudio = vi.fn();
    const onDirectionsClick = vi.fn();
    render(
      <PoiPreviewCard
        poi={poi}
        location={{ lat: 11.14, lng: 106.461 }}
        onPlayAudio={onPlayAudio}
        onDismiss={vi.fn()}
        onDirectionsClick={onDirectionsClick}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('img', { name: poi.title })).toHaveAttribute('src', poi.image_url);
    expect(screen.getByRole('heading', { name: poi.title })).toBeInTheDocument();
    expect(screen.getByText(poi.short_description)).toBeInTheDocument();
    expect(screen.getByText(/109 m away/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Directions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play Narration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Directions' }));
    expect(onDirectionsClick).toHaveBeenCalledOnce();
  });

  it('renders Replay button and triggers onPlayAudio when POI was already triggered', () => {
    const onPlayAudio = vi.fn();
    render(
      <PoiPreviewCard
        poi={poi}
        location={{ lat: 11.14, lng: 106.461 }}
        onPlayAudio={onPlayAudio}
        onDismiss={vi.fn()}
        isUnlocked={true}
        isActivated={true}
      />,
    );

    const replayBtn = screen.getByRole('button', { name: 'Replay' });
    expect(replayBtn).toBeInTheDocument();
    fireEvent.click(replayBtn);
    expect(onPlayAudio).toHaveBeenCalledOnce();
  });

  it('shows a useful distance fallback and closes from the backdrop', () => {
    const onDismiss = vi.fn();
    render(
      <PoiPreviewCard
        poi={{ ...poi, image_url: null }}
        location={null}
        onPlayAudio={vi.fn()}
        onDismiss={onDismiss}
        onDirectionsClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Distance unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close exhibit preview' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses on a downward swipe and Escape key', () => {
    const onDismiss = vi.fn();
    render(
      <PoiPreviewCard
        poi={poi}
        location={null}
        onPlayAudio={vi.fn()}
        onDismiss={onDismiss}
        onDirectionsClick={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientY: 160 }] });
    expect(onDismiss).toHaveBeenCalledOnce();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('renders content paywall gate and calls onUnlock when unlock button is clicked', () => {
    const onUnlock = vi.fn();
    render(
      <PoiPreviewCard
        poi={poi}
        location={null}
        onPlayAudio={vi.fn()}
        onDismiss={vi.fn()}
        onUnlock={onUnlock}
        isUnlocked={false}
      />,
    );

    expect(screen.getByTestId('content-paywall-gate')).toBeInTheDocument();
    const unlockBtn = screen.getByTestId('paywall-unlock-btn');
    fireEvent.click(unlockBtn);
    expect(onUnlock).toHaveBeenCalledOnce();
  });

  it('renders unlocked full description when visitor session is active', () => {
    render(
      <PoiPreviewCard
        poi={poi}
        location={null}
        onPlayAudio={vi.fn()}
        onDismiss={vi.fn()}
        isUnlocked={true}
      />,
    );

    expect(screen.queryByTestId('content-paywall-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('content-unlocked')).toBeInTheDocument();
    expect(screen.getByText(poi.description)).toBeInTheDocument();
  });

  it('toggles button label from Directions to Clear Route when routing is active', () => {
    render(
      <PoiPreviewCard
        poi={poi}
        location={{ lat: 11.14, lng: 106.461 }}
        onPlayAudio={vi.fn()}
        onDismiss={vi.fn()}
        onDirectionsClick={vi.fn()}
        isRoutingActive={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Clear Route' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Directions' })).not.toBeInTheDocument();
  });

  it('renders embedded MiniAudioPlayer inside dialog when audio is playing for this POI and supports controls', () => {
    const togglePlay = vi.fn();
    const skip = vi.fn();
    const seek = vi.fn();
    const setPlaybackRate = vi.fn();
    const stop = vi.fn();

    const mockAudioContext = {
      currentPoi: { id: 'poi-1', title: 'Cu Chi Tunnel' },
      isPlaying: true,
      currentTime: 25,
      duration: 100,
      playbackRate: 1.0,
      isBuffering: false,
      isOfflineFallback: false,
      isPoiPreviewOpen: true,
      error: null,
      togglePlay,
      skip,
      seek,
      setPlaybackRate,
      stop,
      setIsPoiPreviewOpen: vi.fn(),
    };

    render(
      <AudioPlayerContext.Provider value={mockAudioContext}>
        <PoiPreviewCard
          poi={poi}
          location={null}
          onPlayAudio={vi.fn()}
          onDismiss={vi.fn()}
        />
      </AudioPlayerContext.Provider>,
    );

    const inlinePlayer = screen.getByTestId('mini-audio-player');
    expect(inlinePlayer).toBeInTheDocument();
    expect(inlinePlayer).toHaveAttribute('data-inline', 'true');

    // Controls within dialog
    const playPauseBtn = screen.getByTestId('play-pause-button');
    expect(playPauseBtn).toHaveAttribute('aria-label', 'Pause');
    fireEvent.click(playPauseBtn);
    expect(togglePlay).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId('skip-backward-button'));
    expect(skip).toHaveBeenCalledWith(-10);

    fireEvent.click(screen.getByTestId('skip-forward-button'));
    expect(skip).toHaveBeenCalledWith(10);

    fireEvent.click(screen.getByTestId('speed-button-1.2'));
    expect(setPlaybackRate).toHaveBeenCalledWith(1.2);

    fireEvent.change(screen.getByTestId('progress-scrubber'), { target: { value: '50' } });
    expect(seek).toHaveBeenCalledWith(50);

    fireEvent.click(screen.getByTestId('close-player-button'));
    expect(stop).toHaveBeenCalledOnce();
  });

  it('does not render embedded MiniAudioPlayer inside dialog when active audio belongs to a different POI', () => {
    const mockAudioContext = {
      currentPoi: { id: 'poi-other', title: 'Different POI' },
      isPlaying: true,
      currentTime: 10,
      duration: 60,
      setIsPoiPreviewOpen: vi.fn(),
    };

    render(
      <AudioPlayerContext.Provider value={mockAudioContext}>
        <PoiPreviewCard
          poi={poi}
          location={null}
          onPlayAudio={vi.fn()}
          onDismiss={vi.fn()}
        />
      </AudioPlayerContext.Provider>,
    );

    expect(screen.queryByTestId('mini-audio-player')).not.toBeInTheDocument();
  });
});
