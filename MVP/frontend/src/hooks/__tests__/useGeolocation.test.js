import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, act } from '@testing-library/react';
import useGeolocation from '../useGeolocation.js';
import { MAIN_ENTRANCE } from '../../utils/museumBounds.js';

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function mockGeolocation() {
  const geolocation = {
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: geolocation,
  });
  return geolocation;
}

afterEach(() => {
  cleanup();
  delete navigator.geolocation;
  vi.restoreAllMocks();
});

describe('useGeolocation', () => {
  it('tracks a live location and clears the watch on unmount', () => {
    const geolocation = mockGeolocation();
    let onPosition;
    geolocation.watchPosition.mockImplementation((success) => {
      onPosition = success;
      return 42;
    });

    const { result, unmount } = renderHook(() => useGeolocation());

    expect(geolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      GEOLOCATION_OPTIONS,
    );
    act(() => onPosition({ coords: { latitude: 11.144, longitude: 106.464, accuracy: 12 } }));
    expect(result.current.location).toEqual({ lat: 11.144, lng: 106.464 });
    expect(result.current.accuracy).toBe(12);
    expect(result.current.hasLiveLocation).toBe(true);

    unmount();
    expect(geolocation.clearWatch).toHaveBeenCalledWith(42);
  });

  it.each([
    [1, 'permission is unavailable'],
    [2, 'could not be determined'],
    [3, 'took too long'],
  ])('falls back to the Main Entrance for geolocation error %s', (code, message) => {
    const geolocation = mockGeolocation();
    let onError;
    geolocation.watchPosition.mockImplementation((success, error) => {
      onError = error;
      return 7;
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => onError({ code }));

    expect(result.current.location).toEqual(MAIN_ENTRANCE);
    expect(result.current.hasLiveLocation).toBe(false);
    expect(result.current.errorMessage).toContain(message);
  });

  it('falls back when the visitor is outside the museum boundary', () => {
    const geolocation = mockGeolocation();
    let onPosition;
    geolocation.watchPosition.mockImplementation((success) => {
      onPosition = success;
      return 7;
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => onPosition({ coords: { latitude: 10, longitude: 106, accuracy: 50 } }));

    expect(result.current.location).toEqual(MAIN_ENTRANCE);
    expect(result.current.errorMessage).toContain('outside the museum grounds');
  });

  it('uses the Main Entrance when browser geolocation is unsupported', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.location).toEqual(MAIN_ENTRANCE);
    expect(result.current.errorMessage).toContain('does not support location');
  });
});
