import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const leafletMocks = vi.hoisted(() => ({
  divIcon: vi.fn((options) => options),
  marker: vi.fn(),
  circle: vi.fn(),
  markerLayer: {
    addTo: vi.fn(),
    setLatLng: vi.fn(),
    remove: vi.fn(),
  },
  circleLayer: {
    addTo: vi.fn(),
    setLatLng: vi.fn(),
    setRadius: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: leafletMocks.divIcon,
    marker: leafletMocks.marker,
    circle: leafletMocks.circle,
  },
}));

import VisitorLocationMarker, { createVisitorLocationIcon } from '../VisitorLocationMarker.jsx';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  leafletMocks.markerLayer.addTo.mockReturnValue(leafletMocks.markerLayer);
  leafletMocks.circleLayer.addTo.mockReturnValue(leafletMocks.circleLayer);
  leafletMocks.marker.mockReturnValue(leafletMocks.markerLayer);
  leafletMocks.circle.mockReturnValue(leafletMocks.circleLayer);
});

describe('VisitorLocationMarker', () => {
  it('creates the 14px live GPS marker with a pulse ring', () => {
    createVisitorLocationIcon(true);

    expect(leafletMocks.divIcon).toHaveBeenCalledWith(expect.objectContaining({
      className: 'visitor-location-icon',
      html: expect.stringContaining('visitor-location-pulse'),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }));
    expect(leafletMocks.divIcon.mock.calls[0][0].html).toContain('visitor-location-dot');
  });

  it('moves the GPS marker and accuracy overlay without recreating them', () => {
    const map = {};
    const { rerender, unmount } = render(
      <VisitorLocationMarker
        map={map}
        location={{ lat: 11.14, lng: 106.46 }}
        accuracy={10}
        isLiveLocation
      />,
    );

    rerender(
      <VisitorLocationMarker
        map={map}
        location={{ lat: 11.141, lng: 106.461 }}
        accuracy={15}
        isLiveLocation
      />,
    );

    expect(leafletMocks.marker).toHaveBeenCalledTimes(1);
    expect(leafletMocks.markerLayer.setLatLng).toHaveBeenCalledWith([11.141, 106.461]);
    expect(leafletMocks.circleLayer.setLatLng).toHaveBeenCalledWith([11.141, 106.461]);
    expect(leafletMocks.circleLayer.setRadius).toHaveBeenCalledWith(15);

    unmount();
    expect(leafletMocks.markerLayer.remove).toHaveBeenCalled();
    expect(leafletMocks.circleLayer.remove).toHaveBeenCalled();
  });
});
