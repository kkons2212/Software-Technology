import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const leafletMocks = vi.hoisted(() => {
  const mapInstance = {
    panTo: vi.fn(),
    setView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    remove: vi.fn(),
  };
  const tileLayer = { addTo: vi.fn() };
  return {
    mapInstance,
    tileLayer,
    map: vi.fn(() => mapInstance),
    latLngBounds: vi.fn(() => ({ bounds: true })),
    tileLayerFactory: vi.fn(() => tileLayer),
  };
});

vi.mock('leaflet', () => ({
  default: {
    map: leafletMocks.map,
    latLngBounds: leafletMocks.latLngBounds,
    tileLayer: leafletMocks.tileLayerFactory,
  },
}));

vi.mock('../../components/visitor/VisitorLocationMarker.jsx', () => ({
  default: () => null,
}));

vi.mock('../../components/visitor/VisitorPoiMarkers.jsx', () => ({
  default: () => null,
}));

import VisitorMapView from '../visitor/VisitorMapView.jsx';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VisitorMapView', () => {
  it('initializes a bounded, touch-enabled OpenStreetMap with custom controls', () => {
    render(
      <VisitorMapView
        location={{ lat: 11.144, lng: 106.464 }}
        hasLiveLocation
        accuracy={10}
      />,
    );

    expect(leafletMocks.map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        zoomControl: false,
        touchZoom: true,
        minZoom: 15,
        maxZoom: 19,
        maxBounds: { bounds: true },
      }),
    );
    expect(leafletMocks.tileLayerFactory).toHaveBeenCalledWith(
      expect.stringContaining('tile.openstreetmap.org'),
      expect.any(Object),
    );
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Locate me' })).toBeInTheDocument();
  });

  it('wires zoom and locate controls to the map instance', () => {
    render(<VisitorMapView location={{ lat: 11.144, lng: 106.464 }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Locate me' }));

    expect(leafletMocks.mapInstance.zoomIn).toHaveBeenCalled();
    expect(leafletMocks.mapInstance.zoomOut).toHaveBeenCalled();
    expect(leafletMocks.mapInstance.setView).toHaveBeenCalledWith(
      [11.144, 106.464],
      17,
      { animate: true },
    );
  });
});
