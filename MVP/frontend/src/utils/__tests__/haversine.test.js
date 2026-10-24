import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, EARTH_RADIUS_METERS } from '../haversine.js';

describe('haversine.js (Geodesic Proximity Distance Calculation)', () => {
  it('has valid earth radius constant', () => {
    expect(EARTH_RADIUS_METERS).toBe(6371000);
  });

  it('returns 0 for identical coordinates', () => {
    const coord = { lat: 11.1432, lng: 106.4631 };
    expect(calculateHaversineDistance(coord, coord)).toBe(0);
  });

  it('returns Infinity for missing or invalid coordinates', () => {
    expect(calculateHaversineDistance(null, { lat: 11.1, lng: 106.4 })).toBe(Infinity);
    expect(calculateHaversineDistance({ lat: 11.1, lng: 106.4 }, null)).toBe(Infinity);
    expect(calculateHaversineDistance({ lat: NaN, lng: 106.4 }, { lat: 11.1, lng: 106.4 })).toBe(Infinity);
  });

  it('calculates accurate distance between known Cu Chi landmarks', () => {
    // Main Entrance: 11.1432, 106.4631
    // Boonie Trap Exhibit: ~100m away (11.1438, 106.4637)
    const entrance = { lat: 11.1432, lng: 106.4631 };
    const exhibit = { lat: 11.1438, lng: 106.4637 };

    const distance = calculateHaversineDistance(entrance, exhibit);
    // Rough Haversine distance ~92m to ~100m
    expect(distance).toBeGreaterThan(80);
    expect(distance).toBeLessThan(120);
  });

  it('supports latitude/longitude aliases as well as lat/lng', () => {
    const point1 = { latitude: 11.1432, longitude: 106.4631 };
    const point2 = { lat: 11.1432, lon: 106.4631 };

    expect(calculateHaversineDistance(point1, point2)).toBe(0);
  });
});
