import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const leafletMocks = vi.hoisted(() => {
  const marker = {
    addTo: vi.fn(),
    bindTooltip: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    setIcon: vi.fn(),
    remove: vi.fn(),
  };
  const radius = { addTo: vi.fn(), remove: vi.fn() };
  marker.addTo.mockReturnValue(marker);
  marker.bindTooltip.mockReturnValue(marker);
  marker.on.mockReturnValue(marker);
  marker.off.mockReturnValue(marker);
  marker.setIcon.mockReturnValue(marker);
  radius.addTo.mockReturnValue(radius);

  return {
    marker,
    radius,
    divIcon: vi.fn(() => ({ poiIcon: true })),
    markerFactory: vi.fn(() => marker),
    circleFactory: vi.fn(() => radius),
  };
});

vi.mock('leaflet', () => ({
  default: {
    divIcon: leafletMocks.divIcon,
    marker: leafletMocks.markerFactory,
    circle: leafletMocks.circleFactory,
  },
}));

import VisitorPoiMarkers from '../VisitorPoiMarkers.jsx';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  leafletMocks.markerFactory.mockReturnValue(leafletMocks.marker);
  leafletMocks.circleFactory.mockReturnValue(leafletMocks.radius);
  leafletMocks.marker.addTo.mockReturnValue(leafletMocks.marker);
  leafletMocks.marker.bindTooltip.mockReturnValue(leafletMocks.marker);
  leafletMocks.radius.addTo.mockReturnValue(leafletMocks.radius);
});

describe('VisitorPoiMarkers', () => {
  it('creates numbered markers and individual dashed geofences, then cleans them up', () => {
    const map = { map: true };
    const onSelectPOI = vi.fn();
    const pois = [
      { id: 'poi-1', latitude: 11.14, longitude: 106.46, title: 'Tunnel', trigger_radius: 20 },
      { id: 'poi-2', latitude: 11.15, longitude: 106.47, title: 'Entrance' },
    ];
    const { unmount } = render(
      <VisitorPoiMarkers map={map} pois={pois} onSelectPOI={onSelectPOI} />,
    );

    expect(leafletMocks.markerFactory).toHaveBeenCalledWith(
      [11.14, 106.46],
      expect.objectContaining({ icon: { poiIcon: true }, title: 'Tunnel' }),
    );
    expect(leafletMocks.marker.addTo).toHaveBeenCalledWith(map);
    expect(leafletMocks.marker.on).toHaveBeenCalledWith('click', expect.any(Function));
    expect(leafletMocks.marker.bindTooltip).toHaveBeenCalledWith(
      'Tunnel',
      { direction: 'top', offset: [0, -12] },
    );
    expect(leafletMocks.divIcon.mock.calls[0][0].html).toContain('>1</span>');
    expect(leafletMocks.divIcon.mock.calls[1][0].html).toContain('>2</span>');
    expect(leafletMocks.circleFactory).toHaveBeenNthCalledWith(
      1,
      [11.14, 106.46],
      expect.objectContaining({ radius: 20, dashArray: '6 6', interactive: false }),
    );
    expect(leafletMocks.circleFactory).toHaveBeenNthCalledWith(
      2,
      [11.15, 106.47],
      expect.objectContaining({ radius: 30 }),
    );

    leafletMocks.marker.on.mock.calls[0][1]();
    expect(onSelectPOI).toHaveBeenCalledWith('poi-1');

    unmount();
    expect(leafletMocks.marker.remove).toHaveBeenCalled();
    expect(leafletMocks.radius.remove).toHaveBeenCalled();
    expect(leafletMocks.marker.off).toHaveBeenCalledWith('click');
  });

  it('updates playing and listened marker styles without recreating the markers', () => {
    const map = { map: true };
    const pois = [
      { id: 'poi-1', latitude: 11.14, longitude: 106.46, title: 'Tunnel' },
      { id: 'poi-2', latitude: 11.15, longitude: 106.47, title: 'Entrance' },
    ];

    const { rerender } = render(
      <VisitorPoiMarkers map={map} pois={pois} playingPoiId="poi-1" />,
    );
    expect(leafletMocks.divIcon.mock.calls.at(-2)[0].html).toContain('marker--playing');

    rerender(
      <VisitorPoiMarkers map={map} pois={pois} visitedPoiIds={['poi-1']} />,
    );
    expect(leafletMocks.divIcon.mock.calls.at(-2)[0].html).toContain('marker--visited');
    expect(leafletMocks.markerFactory).toHaveBeenCalledTimes(2);
  });
});
