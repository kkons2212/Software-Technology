import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// -----------------------------------------------------------------------------
// Leaflet is stubbed so the picker's binding logic can be asserted in jsdom
// without a real tile server. Each factory hands back a spy-able instance.
// -----------------------------------------------------------------------------
const leafletMocks = vi.hoisted(() => {
  const mapInstance = { remove: vi.fn() };
  const tileLayerInstance = { addTo: vi.fn() };
  const markerInstance = {
    on: vi.fn(),
    addTo: vi.fn(),
    setLatLng: vi.fn(),
    getLatLng: vi.fn(() => ({ lat: 11.15, lng: 106.47 })),
    remove: vi.fn(),
  };
  const circleInstance = {
    addTo: vi.fn(),
    setRadius: vi.fn(),
    setLatLng: vi.fn(),
    setStyle: vi.fn(),
    remove: vi.fn(),
  };
  markerInstance.addTo.mockReturnValue(markerInstance);
  circleInstance.addTo.mockReturnValue(circleInstance);
  tileLayerInstance.addTo.mockReturnValue(tileLayerInstance);

  return {
    mapInstance,
    markerInstance,
    circleInstance,
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => tileLayerInstance),
    marker: vi.fn(() => markerInstance),
    circle: vi.fn(() => circleInstance),
    latLngBounds: vi.fn(() => ({ bounds: true })),
  };
});

vi.mock('leaflet', () => ({
  default: {
    map: leafletMocks.map,
    tileLayer: leafletMocks.tileLayer,
    marker: leafletMocks.marker,
    circle: leafletMocks.circle,
    latLngBounds: leafletMocks.latLngBounds,
  },
}));

import AdminMapPicker from '../AdminMapPicker.jsx';

const POI_ID = 'poi-1';
const INITIAL_LATITUDE = 11.1445;
const INITIAL_LONGITUDE = 106.4645;
const INITIAL_RADIUS = 30;

function renderPicker(props = {}) {
  return render(
    <AdminMapPicker
      poiId={POI_ID}
      initialLatitude={INITIAL_LATITUDE}
      initialLongitude={INITIAL_LONGITUDE}
      initialRadius={INITIAL_RADIUS}
      {...props}
    />,
  );
}

/** Handler registered by the component for a given Leaflet marker event. */
function markerEventHandler(eventName) {
  const registration = leafletMocks.markerInstance.on.mock.calls.find(
    ([name]) => name === eventName,
  );
  return registration?.[1];
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  leafletMocks.markerInstance.getLatLng.mockReturnValue({ lat: 11.145, lng: 106.462 });
});

describe('AdminMapPicker', () => {
  it('places a draggable pin and a radius circle at the initial calibration', () => {
    renderPicker();

    expect(leafletMocks.map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        center: [INITIAL_LATITUDE, INITIAL_LONGITUDE],
        zoomControl: false,
      }),
    );
    expect(leafletMocks.marker).toHaveBeenCalledWith(
      [INITIAL_LATITUDE, INITIAL_LONGITUDE],
      expect.objectContaining({ draggable: true }),
    );
    expect(leafletMocks.circle).toHaveBeenCalledWith(
      [INITIAL_LATITUDE, INITIAL_LONGITUDE],
      expect.objectContaining({ radius: INITIAL_RADIUS, color: '#1D4ED8' }),
    );
    expect(screen.getByLabelText('Latitude')).toHaveValue(INITIAL_LATITUDE);
    expect(screen.getByLabelText('Longitude')).toHaveValue(INITIAL_LONGITUDE);
    expect(screen.getByLabelText('Trigger Radius').value).toBe(String(INITIAL_RADIUS));
  });

  it('republishes the pin coordinates into the numeric fields after a drag', () => {
    renderPicker();
    leafletMocks.markerInstance.getLatLng.mockReturnValue({ lat: 11.145, lng: 106.462 });

    act(() => markerEventHandler('dragend')());

    expect(screen.getByLabelText('Latitude')).toHaveValue(11.145);
    expect(screen.getByLabelText('Longitude')).toHaveValue(106.462);
    expect(leafletMocks.circleInstance.setLatLng).toHaveBeenCalledWith([11.145, 106.462]);
  });

  it('moves the pin and the circle when a coordinate is typed', () => {
    renderPicker();

    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '11.16' } });

    expect(leafletMocks.markerInstance.setLatLng).toHaveBeenCalledWith([11.16, INITIAL_LONGITUDE]);
    expect(leafletMocks.circleInstance.setLatLng).toHaveBeenCalledWith([11.16, INITIAL_LONGITUDE]);
  });

  it('resizes the geofence circle in real time while the slider moves', () => {
    renderPicker();

    fireEvent.change(screen.getByLabelText('Trigger Radius'), { target: { value: '45' } });

    expect(leafletMocks.circleInstance.setRadius).toHaveBeenCalledWith(45);
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('flags an out-of-bounds pin, shows the error and disables saving', () => {
    const onSave = vi.fn();
    renderPicker({ onSave });

    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '10' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Cu Chi Tunnels boundary');
    expect(screen.getByTestId('admin-map-picker-canvas')).toHaveStyle({
      borderColor: '#B91C1C',
    });
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the current calibration through the host callback', () => {
    const onSave = vi.fn();
    renderPicker({ onSave });

    fireEvent.change(screen.getByLabelText('Trigger Radius'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith({
      poiId: POI_ID,
      latitude: INITIAL_LATITUDE,
      longitude: INITIAL_LONGITUDE,
      radius: 45,
    });
  });

  it('locks the save action while the host persists the change', () => {
    renderPicker({ onSave: vi.fn(), isSaving: true });

    const saveButton = screen.getByRole('button', { name: 'Saving...' });

    expect(saveButton).toBeDisabled();
  });

  it('renders no save action when the host owns persistence', () => {
    renderPicker();

    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
  });
});
