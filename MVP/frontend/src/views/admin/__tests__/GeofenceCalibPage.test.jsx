import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { getMapPois, updatePoi } = vi.hoisted(() => ({
  getMapPois: vi.fn(),
  updatePoi: vi.fn(),
}));

vi.mock('../../../api/poiApi.js', () => ({ getMapPois }));
vi.mock('../../../api/adminPoiApi.js', () => ({ updatePoi }));

// The picker has its own suite; here it is stubbed down to the contract the
// page relies on (initial calibration in, `onSave` out) so the page's data flow
// and feedback states stay the unit under test.
vi.mock('../../../components/admin/AdminMapPicker.jsx', () => ({
  default: ({ poiId, initialLatitude, initialLongitude, initialRadius, onSave }) => (
    <div data-testid="admin-map-picker">
      <span data-testid="picker-calibration">
        {`${poiId}|${initialLatitude}|${initialLongitude}|${initialRadius}`}
      </span>
      <button
        type="button"
        onClick={() => onSave({ poiId, latitude: initialLatitude, longitude: initialLongitude, radius: initialRadius })}
      >
        Save Changes
      </button>
    </div>
  ),
}));

import GeofenceCalibPage from '../GeofenceCalibPage.jsx';

const SEEDED_POIS = [
  {
    id: 'poi-1',
    title: 'Tunnel entrance',
    latitude: 11.1445,
    longitude: 106.4645,
    trigger_radius: 30,
  },
  {
    id: 'poi-2',
    title: 'Kitchen bunker',
    latitude: 11.146,
    longitude: 106.468,
    trigger_radius: 20,
  },
];

function renderPage(initialEntries = ['/admin/geofence']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/geofence" element={<GeofenceCalibPage />} />
        <Route path="/admin/pois/:id/geofence" element={<GeofenceCalibPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  getMapPois.mockResolvedValue(SEEDED_POIS);
});

describe('GeofenceCalibPage', () => {
  it('loads the exhibit catalog into the selector', async () => {
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading exhibits');

    const selector = await screen.findByLabelText('Exhibit');
    expect(selector).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Tunnel entrance' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kitchen bunker' })).toBeInTheDocument();
  });

  it('pre-selects the exhibit named by the route parameter', async () => {
    renderPage(['/admin/pois/poi-2/geofence']);

    expect(await screen.findByTestId('picker-calibration')).toHaveTextContent(
      'poi-2|11.146|106.468|20',
    );
  });

  it('mounts the picker once the administrator selects an exhibit', async () => {
    renderPage();
    const selector = await screen.findByLabelText('Exhibit');

    fireEvent.change(selector, { target: { value: 'poi-1' } });

    expect(screen.getByTestId('picker-calibration')).toHaveTextContent(
      'poi-1|11.1445|106.4645|30',
    );
  });

  it('persists the calibration through the shared admin endpoint', async () => {
    updatePoi.mockResolvedValue({ ...SEEDED_POIS[0], trigger_radius: 30 });
    renderPage(['/admin/pois/poi-1/geofence']);
    await screen.findByTestId('admin-map-picker');

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(updatePoi).toHaveBeenCalledWith('poi-1', {
      latitude: 11.1445,
      longitude: 106.4645,
      radius: 30,
    });
    expect(await screen.findByText('Geofence calibration saved.')).toBeInTheDocument();
  });

  it('surfaces an error when the calibration cannot be saved', async () => {
    updatePoi.mockRejectedValue(new Error('boom'));
    renderPage(['/admin/pois/poi-1/geofence']);
    await screen.findByTestId('admin-map-picker');

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to save changes right now.',
    );
  });

  it('shows a load error when the catalog cannot be fetched', async () => {
    getMapPois.mockRejectedValue(new Error('offline'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load exhibits right now.',
    );
  });
});
