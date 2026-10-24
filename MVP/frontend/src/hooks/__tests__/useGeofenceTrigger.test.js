import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGeofenceTrigger } from '../useGeofenceTrigger.js';

describe('useGeofenceTrigger (US 01.3.1 GPS Proximity Detection Engine)', () => {
  const mockPois = [
    {
      id: 1,
      title: 'Hoang Cam Stove',
      latitude: 11.1432,
      longitude: 106.4631,
      trigger_radius: 30, // 30m
      is_active: true,
    },
    {
      id: 2,
      title: 'Booby Trap Workshop',
      latitude: 11.1440,
      longitude: 106.4640,
      trigger_radius: 20, // 20m
      is_active: true,
    },
    {
      id: 3,
      title: 'Deactivated Tunnel Section',
      latitude: 11.1432,
      longitude: 106.4631,
      trigger_radius: 50,
      is_active: false, // inactive POI
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with null nearestPoi when no userLocation provided', () => {
    const { result } = renderHook(() =>
      useGeofenceTrigger({ userLocation: null, pois: mockPois })
    );

    expect(result.current.nearestPoi).toBeNull();
    expect(result.current.distanceToNearest).toBe(Infinity);
    expect(result.current.activeGeofencePois).toEqual([]);
  });

  it('does not fire trigger when visitor is far away (> radius)', () => {
    const onTrigger = vi.fn();
    const farLocation = { lat: 11.1500, lng: 106.4700 }; // ~1km away

    const { result } = renderHook(() =>
      useGeofenceTrigger({
        userLocation: farLocation,
        pois: mockPois,
        onTrigger,
      })
    );

    expect(result.current.activeGeofencePois.length).toBe(0);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('triggers callback when visitor enters within POI trigger_radius', () => {
    const onTrigger = vi.fn();
    // Exactly at Hoang Cam Stove coords (distance ~0m <= 30m)
    const exactLocation = { lat: 11.1432, lng: 106.4631 };

    const { result } = renderHook(() =>
      useGeofenceTrigger({
        userLocation: exactLocation,
        pois: mockPois,
        onTrigger,
        isUnlocked: true,
      })
    );

    expect(result.current.activeGeofencePois.length).toBe(1);
    expect(result.current.nearestPoi.id).toBe(1);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: 'Hoang Cam Stove' }),
      expect.any(Number),
      expect.objectContaining({ shouldPromptSwitch: false })
    );
  });

  it('enforces 10-minute cooldown debounce: does not repeat trigger while lingering in zone', () => {
    const onTrigger = vi.fn();
    const location = { lat: 11.1432, lng: 106.4631 };

    const { rerender } = renderHook(
      ({ userLoc }) =>
        useGeofenceTrigger({
          userLocation: userLoc,
          pois: mockPois,
          onTrigger,
          isUnlocked: true,
        }),
      { initialProps: { userLoc: location } }
    );

    expect(onTrigger).toHaveBeenCalledTimes(1);

    // Minor movement within same 30m radius
    const slightMovement = { lat: 11.14321, lng: 106.46311 };
    rerender({ userLoc: slightMovement });

    // Should NOT trigger again due to 10-minute cooldown
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not trigger auto-narration when visitor session is locked (isUnlocked: false)', () => {
    const onTrigger = vi.fn();
    const location = { lat: 11.1432, lng: 106.4631 };

    renderHook(() =>
      useGeofenceTrigger({
        userLocation: location,
        pois: mockPois,
        onTrigger,
        isUnlocked: false, // visitor has not paid / session locked
      })
    );

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('resolves overlapping geofences by prioritizing the physically closest POI', () => {
    const overlappingPois = [
      {
        id: 10,
        title: 'Exhibit Ten',
        latitude: 11.1432,
        longitude: 106.4631, // ~15m away
        trigger_radius: 50,
        is_active: true,
      },
      {
        id: 20,
        title: 'Exhibit Twenty',
        latitude: 11.14325,
        longitude: 106.46315, // ~5m away (closer!)
        trigger_radius: 50,
        is_active: true,
      },
    ];

    const onTrigger = vi.fn();
    const visitorLoc = { lat: 11.14326, lng: 106.46316 };

    const { result } = renderHook(() =>
      useGeofenceTrigger({
        userLocation: visitorLoc,
        pois: overlappingPois,
        onTrigger,
        isUnlocked: true,
      })
    );

    // In range of both, but closest is Exhibit Twenty
    expect(result.current.activeGeofencePois.length).toBe(2);
    expect(onTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ id: 20, title: 'Exhibit Twenty' }),
      expect.any(Number),
      expect.anything()
    );
  });

  it('sets shouldPromptSwitch to true if another POI is currently playing', () => {
    const onTrigger = vi.fn();
    const location = { lat: 11.1432, lng: 106.4631 };

    renderHook(() =>
      useGeofenceTrigger({
        userLocation: location,
        pois: mockPois,
        onTrigger,
        isUnlocked: true,
        currentPlayingPoiId: 999, // different POI is already playing
      })
    );

    expect(onTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.any(Number),
      expect.objectContaining({ shouldPromptSwitch: true })
    );
  });

  it('filters out inactive POIs (is_active: false)', () => {
    const onTrigger = vi.fn();
    // Coords match inactive POI 3 exactly
    const location = { lat: 11.1432, lng: 106.4631 };

    const { result } = renderHook(() =>
      useGeofenceTrigger({
        userLocation: location,
        pois: [
          {
            id: 3,
            title: 'Deactivated POI',
            latitude: 11.1432,
            longitude: 106.4631,
            trigger_radius: 50,
            is_active: false,
          },
        ],
        onTrigger,
      })
    );

    expect(result.current.activeGeofencePois.length).toBe(0);
    expect(onTrigger).not.toHaveBeenCalled();
  });
});
