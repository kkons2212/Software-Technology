import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegenerateAudioButton from '../admin/RegenerateAudioButton.jsx';
import { regenerateTranslationAudio } from '../../api/translationApi.js';

vi.mock('../../api/translationApi.js', () => ({
  regenerateTranslationAudio: vi.fn(),
}));

describe('RegenerateAudioButton (US 04.2)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state until regeneration completes', async () => {
    let resolveRequest;
    regenerateTranslationAudio.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const onRegenerated = vi.fn();
    render(
      <RegenerateAudioButton
        translationId="TR_01"
        status="NEEDS_UPDATE"
        hasAudio
        onRegenerated={onRegenerated}
        onError={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('regenerate-audio-TR_01'));

    expect(screen.getByText('Generating audio...')).toBeTruthy();
    expect(screen.getByTestId('regenerate-audio-TR_01').disabled).toBe(true);

    const result = {
      stran_id: 'TR_01',
      status: 'DRAFT',
      audio_url: '/static/audio/new.mp3',
      audio_status: 'READY',
    };
    resolveRequest(result);

    await waitFor(() => expect(onRegenerated).toHaveBeenCalledWith(result));
    expect(screen.getByText('Regenerate Audio Guide')).toBeTruthy();
  });

  it('remains available when an audio file is missing', () => {
    render(
      <RegenerateAudioButton
        translationId="TR_02"
        status="DRAFT"
        hasAudio={false}
        onRegenerated={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByTestId('regenerate-audio-TR_02')).toBeTruthy();
  });

  it('surfaces generation errors to the parent', async () => {
    const onError = vi.fn();
    regenerateTranslationAudio.mockRejectedValue(new Error('TTS unavailable'));
    render(
      <RegenerateAudioButton
        translationId="TR_03"
        status="NEEDS_UPDATE"
        hasAudio
        onRegenerated={vi.fn()}
        onError={onError}
      />
    );

    fireEvent.click(screen.getByTestId('regenerate-audio-TR_03'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('TTS unavailable'));
  });
});
