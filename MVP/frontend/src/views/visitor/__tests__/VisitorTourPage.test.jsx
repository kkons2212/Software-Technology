import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../api/languageApi.js', () => ({
  getPublishedLanguages: vi.fn(),
}));

vi.mock('../../../api/poiApi.js', () => ({
  getMapPois: vi.fn(),
}));

vi.mock('../../../api/telemetryApi.js', () => ({
  reportPoiTrigger: vi.fn(),
}));

vi.mock('../../../api/tourApi.js', () => ({
  getWalkingRoute: vi.fn(),
}));

vi.mock('../../../hooks/useGeolocation.js', () => ({
  default: () => ({
    location: { lat: 11.1432, lng: 106.4631 },
    accuracy: null,
    errorMessage: '',
    hasLiveLocation: false,
  }),
}));

// The proximity engine itself owns its own suite (useGeofenceTrigger.test.js).
// Here it is replaced by a controllable stub so the page's dwell-window bookkeeping
// can be driven deterministically: trigger -> enter -> leave.
const geofenceMock = vi.hoisted(() => ({
  activeGeofencePois: [],
  onTrigger: null,
}));

vi.mock('../../../hooks/useGeofenceTrigger.js', () => ({
  useGeofenceTrigger: (params) => {
    geofenceMock.onTrigger = params.onTrigger;
    return {
      nearestPoi: null,
      distanceToNearest: Infinity,
      activeGeofencePois: geofenceMock.activeGeofencePois,
      checkGeofence: () => null,
    };
  },
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
import { reportPoiTrigger } from '../../../api/telemetryApi.js';
import VisitorTourPage from '../VisitorTourPage.jsx';

const FROZEN_EPOCH_MS = 1_700_000_000_000;
const MEASURED_DWELL_SECONDS = 42;

beforeEach(() => {
  window.localStorage.clear();
  getPublishedLanguages.mockResolvedValue([
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
  ]);
  getMapPois.mockResolvedValue([]);
  audioPlayerMock.play.mockClear();
  geofenceMock.activeGeofencePois = [];
  geofenceMock.onTrigger = null;
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
    expect(screen.getByRole('button', { name: 'Directions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play Narration' }));

    expect(audioPlayerMock.play).toHaveBeenCalledWith(expect.objectContaining({
      id: 'poi-1',
      text: 'Explore the underground tunnel system.',
      lang: 'vi',
    }));
  });

  it.each([
    ['vi', 'vi'],
    ['en', 'en'],
  ])(
    'reports the measured geofence dwell time stamped with the %s visitor language',
    async (selectedLanguage, expectedLanguage) => {
      let frozenNowMs = FROZEN_EPOCH_MS;
      const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => frozenNowMs);

      const { rerender } = render(<VisitorTourPage />);

      const languageSelector = await screen.findByRole('combobox', { name: 'Choose language' });
      fireEvent.change(languageSelector, { target: { value: selectedLanguage } });
      await waitFor(() =>
        expect(getMapPois).toHaveBeenLastCalledWith(
          expect.objectContaining({ language: selectedLanguage })
        )
      );

      // 1. The visitor walks into the zone and a real proximity trigger fires.
      act(() => {
        geofenceMock.onTrigger({ poi_id: 'poi-1', id: 'poi-1', title: 'Cu Chi Tunnel' });
      });
      expect(audioPlayerMock.play).toHaveBeenCalledTimes(1);

      // 2. Still inside the zone: no telemetry yet because no duration exists.
      geofenceMock.activeGeofencePois = [
        { poi: { id: 'poi-1' }, distance: 4, triggerRadius: 20 },
      ];
      rerender(<VisitorTourPage />);
      expect(reportPoiTrigger).not.toHaveBeenCalled();

      // 3. The visitor leaves the zone, closing the dwell window.
      frozenNowMs += MEASURED_DWELL_SECONDS * 1000;
      geofenceMock.activeGeofencePois = [];
      rerender(<VisitorTourPage />);

      await waitFor(() =>
        expect(reportPoiTrigger).toHaveBeenCalledWith({
          poiId: 'poi-1',
          dwellTime: MEASURED_DWELL_SECONDS,
          triggerType: 'AUTOMATIC_GEOFENCE',
          preferredLanguage: expectedLanguage,
        })
      );
      expect(reportPoiTrigger).toHaveBeenCalledTimes(1);

      nowSpy.mockRestore();
    }
  );

  it('does not report telemetry for an exhibit the visitor merely passed through', async () => {
    const { rerender } = render(<VisitorTourPage />);
    await screen.findByRole('combobox', { name: 'Choose language' });

    // No proximity trigger fired for this exhibit, so no dwell window was opened.
    geofenceMock.activeGeofencePois = [
      { poi: { poi_id: 'poi-9' }, distance: 8, triggerRadius: 20 },
    ];
    rerender(<VisitorTourPage />);
    geofenceMock.activeGeofencePois = [];
    rerender(<VisitorTourPage />);

    expect(reportPoiTrigger).not.toHaveBeenCalled();
  });

  it('dismisses the open exhibit preview', async () => {
    getMapPois.mockResolvedValue([
      {
        id: 'poi-1',
        title: 'Cu Chi Tunnel',
        short_description: 'Explore the underground tunnel system.',
        latitude: 11.14,
        longitude: 106.46,
        trigger_radius: 20,
      },
    ]);
    render(<VisitorTourPage />);

    await waitFor(() => expect(getMapPois).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: 'Select map POI' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close exhibit preview' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
