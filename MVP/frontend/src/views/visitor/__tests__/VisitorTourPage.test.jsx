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

vi.mock('../../../api/paymentApi.js', () => ({
  capturePaypalOrder: vi.fn(),
  getOrderStatus: vi.fn(),
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

const visitorSessionMock = vi.hoisted(() => ({
  sessionCode: '',
  expiresAt: null,
  activateSession: vi.fn(),
}));

vi.mock('../../../contexts/VisitorSessionContext.jsx', () => ({
  useVisitorSession: () => visitorSessionMock,
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
import { capturePaypalOrder, getOrderStatus } from '../../../api/paymentApi.js';
import VisitorTourPage from '../VisitorTourPage.jsx';

const FROZEN_EPOCH_MS = 1_700_000_000_000;
const MEASURED_DWELL_SECONDS = 42;

beforeEach(() => {
  delete window.location;
  window.location = new URL('http://localhost:5173/');
  window.localStorage.clear();
  getPublishedLanguages.mockResolvedValue([
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
  ]);
  getMapPois.mockResolvedValue([]);
  getOrderStatus.mockReset();
  getOrderStatus.mockResolvedValue({ status: 'PENDING' });
  capturePaypalOrder.mockReset();
  capturePaypalOrder.mockResolvedValue({ status: 'PENDING' });
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

  it('opens the selected POI preview with Directions and no preview audio button when unactivated (UC-1.2)', async () => {
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
    expect(screen.queryByRole('button', { name: 'Play Narration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe thuyết minh' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe lại' })).not.toBeInTheDocument();
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

  it('resolves the session from the order instead of redirect query tokens', async () => {
    delete window.location;
    window.location = new URL('http://localhost:5173/tour?payment_success=true&order_id=ord-1&session_token=LEAKED');
    getOrderStatus.mockResolvedValueOnce({
      status: 'PAID',
      session_code: 'CODE123',
      session_token: 'TOKEN123',
      expires_at: '2026-11-02T00:00:00Z',
    });

    await act(async () => {
      render(<VisitorTourPage />);
    });

    await waitFor(() => {
      expect(getOrderStatus).toHaveBeenCalledWith('ord-1');
      expect(visitorSessionMock.activateSession).toHaveBeenCalledWith({
        sessionCode: 'CODE123',
        sessionToken: 'TOKEN123',
        expiresAt: '2026-11-02T00:00:00Z',
      });
    });
  });

  it('captures PayPal using the provider order token before resolving the session', async () => {
    delete window.location;
    window.location = new URL('http://localhost:5173/tour?payment_success=true&order_id=ord-paypal&token=paypal-order-1');
    capturePaypalOrder.mockResolvedValueOnce({
      status: 'PAID',
      session_code: 'CODE-PAYPAL',
      session_token: 'TOKEN-PAYPAL',
      session_expires_at: '2026-11-02T12:00:00Z',
    });

    await act(async () => {
      render(<VisitorTourPage />);
    });

    await waitFor(() => {
      expect(capturePaypalOrder).toHaveBeenCalledWith('ord-paypal', 'paypal-order-1');
      expect(visitorSessionMock.activateSession).toHaveBeenCalledWith({
        sessionCode: 'CODE-PAYPAL',
        sessionToken: 'TOKEN-PAYPAL',
        expiresAt: '2026-11-02T12:00:00Z',
      });
    });
  });

  it('falls back to getOrderStatus if redirect query params lack session tokens', async () => {
    delete window.location;
    window.location = new URL('http://localhost:5173/tour?payment_success=true&order_id=ord-fallback');
    getOrderStatus.mockResolvedValueOnce({
      status: 'PAID',
      session_code: 'CODE-FALLBACK',
      session_token: 'TOKEN-FALLBACK',
      session_expires_at: '2026-11-02T12:00:00Z',
    });

    await act(async () => {
      render(<VisitorTourPage />);
    });

    await waitFor(() => {
      expect(getOrderStatus).toHaveBeenCalledWith('ord-fallback');
      expect(visitorSessionMock.activateSession).toHaveBeenCalledWith({
        sessionCode: 'CODE-FALLBACK',
        sessionToken: 'TOKEN-FALLBACK',
        expiresAt: '2026-11-02T12:00:00Z',
      });
    });
  });

  it('automatically opens POI preview card when proximity trigger fires', async () => {
    getMapPois.mockResolvedValue([
      {
        id: 'poi-auto',
        title: 'Bunker Exhibit',
        short_description: 'Auto-triggered exhibit summary.',
        image_url: 'https://example.test/bunker.jpg',
        latitude: 11.14,
        longitude: 106.46,
        trigger_radius: 30,
      },
    ]);

    await act(async () => {
      render(<VisitorTourPage />);
    });

    await screen.findByRole('combobox', { name: 'Choose language' });
    await waitFor(() => expect(getMapPois).toHaveBeenCalled());

    act(() => {
      geofenceMock.onTrigger({ poi_id: 'poi-auto', id: 'poi-auto', title: 'Bunker Exhibit' });
    });

    expect(audioPlayerMock.play).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bunker Exhibit' })).toBeInTheDocument();
  });
});
