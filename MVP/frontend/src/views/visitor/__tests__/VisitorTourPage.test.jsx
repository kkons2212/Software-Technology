import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../api/languageApi.js', () => ({
  getPublishedLanguages: vi.fn(),
}));

vi.mock('../../../api/poiApi.js', () => ({
  getMapPois: vi.fn(),
}));

vi.mock('../../../hooks/useGeolocation.js', () => ({
  default: () => ({
    location: { lat: 11.1432, lng: 106.4631 },
    accuracy: null,
    errorMessage: '',
    hasLiveLocation: false,
  }),
}));

const audioPlayerMock = vi.hoisted(() => ({
  play: vi.fn(),
  currentPoi: null,
  isPlaying: false,
  completedPoiIds: [],
}));

vi.mock('../../../contexts/AudioPlayerContext.jsx', () => ({
  useAudioPlayer: () => audioPlayerMock,
}));

vi.mock('../VisitorMapView.jsx', () => ({
  default: ({ onSelectPOI }) => (
    <div aria-label="Interactive map">
      <button type="button" onClick={() => onSelectPOI('poi-1')}>Select map POI</button>
    </div>
  ),
}));

import { getPublishedLanguages } from '../../../api/languageApi.js';
import { getMapPois } from '../../../api/poiApi.js';
import VisitorTourPage from '../VisitorTourPage.jsx';

beforeEach(() => {
  window.localStorage.clear();
  getPublishedLanguages.mockResolvedValue([
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
  ]);
  getMapPois.mockResolvedValue([]);
  audioPlayerMock.play.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VisitorTourPage', () => {
  it('restores the saved published language and persists subsequent selections', async () => {
    window.localStorage.setItem('museum_preferred_lang', 'en');
    render(<VisitorTourPage />);

    const languageSelector = await screen.findByRole('combobox', { name: 'Choose language' });
    expect(languageSelector).toHaveValue('en');
    await waitFor(() => expect(getMapPois).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en', signal: expect.any(AbortSignal) }),
    ));

    fireEvent.change(languageSelector, { target: { value: 'vi' } });
    expect(languageSelector).toHaveValue('vi');
    expect(window.localStorage.getItem('museum_preferred_lang')).toBe('vi');
    await waitFor(() => expect(getMapPois).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: 'vi', signal: expect.any(AbortSignal) }),
    ));
  });

  it('shows a non-blocking error and retry action when languages cannot be loaded', async () => {
    getPublishedLanguages.mockRejectedValue(new Error('Network error'));
    render(<VisitorTourPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load available languages.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(getPublishedLanguages).toHaveBeenCalledTimes(2));
  });

  it('shows an error and retries when map POIs cannot be loaded', async () => {
    getMapPois
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([]);
    render(<VisitorTourPage />);

    expect(await screen.findByText('Unable to load map locations. Check your connection and try again.'))
      .toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    await waitFor(() => expect(getMapPois).toHaveBeenCalledTimes(2));
  });

  it('opens the selected POI preview and plays its free summary through the audio context', async () => {
    getMapPois.mockResolvedValue([
      {
        id: 'poi-1',
        title: 'Cu Chi Tunnel',
        short_description: 'Explore the underground tunnel system.',
        image_url: 'https://example.test/tunnel.jpg',
        latitude: 11.14,
        longitude: 106.46,
        trigger_radius: 20,
      },
    ]);
    render(<VisitorTourPage />);

    await screen.findByRole('combobox', { name: 'Choose language' });
    await waitFor(() => expect(getMapPois).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: 'Select map POI' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cu Chi Tunnel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Directions' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=11.14%2C106.46',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play Narration' }));

    expect(audioPlayerMock.play).toHaveBeenCalledWith(expect.objectContaining({
      id: 'poi-1',
      text: 'Explore the underground tunnel system.',
      lang: 'vi',
    }));
  });
});
