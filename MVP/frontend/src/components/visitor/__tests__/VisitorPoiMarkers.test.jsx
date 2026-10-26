import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const leafletMocks = vi.hoisted(() => {
  const marker = {
    addTo: vi.fn(),
    bindTooltip: vi.fn(),
    remove: vi.fn(),
  };
  marker.addTo.mockReturnValue(marker);
  marker.bindTooltip.mockReturnValue(marker);

  return {
    marker,
    divIcon: vi.fn(() => ({ poiIcon: true })),
    markerFactory: vi.fn(() => marker),
  };
});

vi.mock('leaflet', () => ({
  default: {
    divIcon: leafletMocks.divIcon,
    marker: leafletMocks.markerFactory,
  },
}));

import VisitorPoiMarkers from '../VisitorPoiMarkers.jsx';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VisitorPoiMarkers', () => {
  it('creates map markers with POI titles and removes them when unmounted', () => {
    const map = { map: true };
    const pois = [{ id: 'poi-1', latitude: 11.14, longitude: 106.46, title: 'Tunnel' }];
    leafletMocks.markerFactory.mockReturnValue(leafletMocks.marker);
    leafletMocks.marker.addTo.mockReturnValue(leafletMocks.marker);
    leafletMocks.marker.bindTooltip.mockReturnValue(leafletMocks.marker);
    const { unmount } = render(<VisitorPoiMarkers map={map} pois={pois} />);

    expect(leafletMocks.markerFactory).toHaveBeenCalledWith(
      [11.14, 106.46],
      { icon: { poiIcon: true } },
    );
    expect(leafletMocks.marker.addTo).toHaveBeenCalledWith(map);
    expect(leafletMocks.marker.bindTooltip).toHaveBeenCalledWith(
      'Tunnel',
      { direction: 'top', offset: [0, -12] },
    );

    unmount();
    expect(leafletMocks.marker.remove).toHaveBeenCalled();
  });
});
