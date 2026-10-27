import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AudioAuditPlayer from '../admin/AudioAuditPlayer.jsx';

describe('AudioAuditPlayer (US 04.2)', () => {
  it('displays the missing-audio message when no URL exists', () => {
    render(<AudioAuditPlayer translationId="TR_01" audioUrl={null} />);

    expect(screen.getByText('Audio Guide not generated.')).toBeTruthy();
  });

  it('plays one row and pauses it when another row starts playback', () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(function mockPlay() {
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
      });
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(function mockPause() {
        this.dispatchEvent(new Event('pause'));
      });
    render(
      <>
        <AudioAuditPlayer translationId="TR_01" audioUrl="/audio/one.mp3" />
        <AudioAuditPlayer translationId="TR_02" audioUrl="/audio/two.mp3" />
      </>
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Play audio preview' })[0]);
    fireEvent.click(
      screen.getByTestId('audio-player-TR_02').querySelector('button')
    );

    expect(play).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalled();
  });

  it('renders duration and progress controls for an available audio URL', () => {
    render(<AudioAuditPlayer translationId="TR_03" audioUrl="/audio/three.mp3" />);

    expect(screen.getByLabelText('Audio progress')).toBeTruthy();
    expect(screen.getByTestId('audio-player-TR_03')).toBeTruthy();
  });

  it('updates duration and the progress position from media events', () => {
    render(<AudioAuditPlayer translationId="TR_05" audioUrl="/audio/five.mp3" />);
    const audio = screen.getByTestId('audio-player-TR_05').querySelector('audio');
    Object.defineProperty(audio, 'duration', { configurable: true, value: 125 });
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      writable: true,
      value: 63,
    });

    fireEvent.loadedMetadata(audio);
    fireEvent.timeUpdate(audio);

    expect(screen.getByText('2:05')).toBeTruthy();
    expect(screen.getByText('1:03')).toBeTruthy();
  });

  it('surfaces playback failures to the administrator', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
      new Error('Playback blocked')
    );
    render(<AudioAuditPlayer translationId="TR_04" audioUrl="/audio/four.mp3" />);

    fireEvent.click(screen.getByRole('button', { name: 'Play audio preview' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Playback blocked');
    });
  });
});
