import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const leafletMocks = vi.hoisted(() => {
  const polylineInstance = {
    addTo: vi.fn(),
    remove: vi.fn(),
    getBounds: vi.fn(() => ({ isValid: () => true })),
  };
  polylineInstance.addTo.mockReturnValue(polylineInstance);

  return {
    polylineInstance,
    polyline: vi.fn(() => polylineInstance),
  };
});

vi.mock('leaflet', () => ({
  default: {
    polyline: leafletMocks.polyline,
  },
}));

import RouteOverlay from '../RouteOverlay.jsx';

const sampleCoordinates = [
  [106.463100, 11.143200],
  [106.462600, 11.143100],
  [106.461400, 11.144500],
];

const sampleMap = {
  fitBounds: vi.fn(),
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  leafletMocks.polylineInstance.addTo.mockReturnValue(leafletMocks.polylineInstance);
});

afterEach(cleanup);

describe('RouteOverlay', () => {
  it('renders the floating navigation banner with distance and destination title', () => {
    render(
      <RouteOverlay
        map={sampleMap}
        routeCoordinates={sampleCoordinates}
        destinationTitle="Địa đạo Bến Dược"
        userLocation={{ lat: 11.1432, lng: 106.4631 }}
        destinationLocation={{ lat: 11.1445, lng: 106.4614 }}
        onClearRoute={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Địa đạo Bến Dược/)).toBeInTheDocument();
    // Should show distance in meters
    expect(screen.getByText(/m$/)).toBeInTheDocument();
  });

  it('renders distance in km when destination is far away', () => {
    render(
      <RouteOverlay
        map={sampleMap}
        routeCoordinates={sampleCoordinates}
        destinationTitle="Distant Exhibit"
        userLocation={{ lat: 11.1432, lng: 106.4631 }}
        destinationLocation={{ lat: 11.1600, lng: 106.4800 }}
        onClearRoute={vi.fn()}
      />,
    );

    expect(screen.getByText(/km$/)).toBeInTheDocument();
  });

  it('invokes onClearRoute callback when Clear Route button is clicked', () => {
    const onClearRoute = vi.fn();
    render(
      <RouteOverlay
        map={sampleMap}
        routeCoordinates={sampleCoordinates}
        destinationTitle="Bếp Hoàng Cầm"
        userLocation={{ lat: 11.1432, lng: 106.4631 }}
        destinationLocation={{ lat: 11.1429, lng: 106.4590 }}
        onClearRoute={onClearRoute}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear navigation route' }));
    expect(onClearRoute).toHaveBeenCalledOnce();
  });

  it('renders nothing when route coordinates are insufficient', () => {
    const { container } = render(
      <RouteOverlay
        map={sampleMap}
        routeCoordinates={[]}
        destinationTitle="Empty Route"
        userLocation={null}
        destinationLocation={null}
        onClearRoute={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('creates a Leaflet polyline with correct styling', () => {
    render(
      <RouteOverlay
        map={sampleMap}
        routeCoordinates={sampleCoordinates}
        destinationTitle="Test Exhibit"
        userLocation={{ lat: 11.1432, lng: 106.4631 }}
        destinationLocation={{ lat: 11.1445, lng: 106.4614 }}
        onClearRoute={vi.fn()}
      />,
    );

    expect(leafletMocks.polyline).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        color: '#1D4ED8',
        weight: 4,
        opacity: 0.9,
      }),
    );
  });

  it('shows Calculating when user location is null', () => {
    render(
      <RouteOverlay
        map={sampleMap}
        routeCoordinates={sampleCoordinates}
        destinationTitle="Unknown Location"
        userLocation={null}
        destinationLocation={{ lat: 11.1445, lng: 106.4614 }}
        onClearRoute={vi.fn()}
      />,
    );

    expect(screen.getByText('Calculating…')).toBeInTheDocument();
  });
});
