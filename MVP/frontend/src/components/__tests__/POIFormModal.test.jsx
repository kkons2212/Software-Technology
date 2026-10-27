import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const leafletMocks = vi.hoisted(() => {
  const mapInstance = { remove: vi.fn() };
  const tileLayerInstance = { addTo: vi.fn() };
  const markerInstance = {
    on: vi.fn(),
    addTo: vi.fn(),
    setLatLng: vi.fn(),
    getLatLng: vi.fn(() => ({ lat: 11.1445, lng: 106.4645 })),
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

vi.mock('../../api/poiApi.js', () => ({
  updatePoi: vi.fn(),
  uploadPoiImage: vi.fn(),
}));

import POIFormModal from '../POIFormModal.jsx';
import { updatePoi, uploadPoiImage } from '../../api/poiApi.js';

const mockPoi = {
  poi_id: 'poi-test-01',
  title: 'Hầm thông tin liên lạc',
  short_description: 'Trung tâm thông tin chiến trường',
  description: 'Nơi duy trì liên lạc giữa các cánh quân qua hệ thống dây điện thoại ngầm.',
  latitude: 11.1445,
  longitude: 106.4645,
  radius: 30,
  image_url: 'https://example.com/tunnel.jpg',
};

describe('POIFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/new-preview.jpg');
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <POIFormModal isOpen={false} poi={mockPoi} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when poi is null', () => {
    const { container } = render(
      <POIFormModal isOpen={true} poi={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('pre-fills existing exhibit data and cover image preview', () => {
    render(<POIFormModal isOpen={true} poi={mockPoi} onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: /edit exhibit details & geofence/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/exhibit title/i)).toHaveValue(
      'Hầm thông tin liên lạc',
    );
    expect(screen.getByLabelText(/free teaser summary/i)).toHaveValue(
      'Trung tâm thông tin chiến trường',
    );
    expect(screen.getByLabelText(/detailed historical narration/i)).toHaveValue(
      mockPoi.description,
    );

    const imgPreview = screen.getByTestId('cover-image-preview');
    expect(imgPreview).toHaveAttribute('src', mockPoi.image_url);
  });

  it('validates required exhibit title and shows error', async () => {
    const user = userEvent.setup();
    render(<POIFormModal isOpen={true} poi={mockPoi} onClose={vi.fn()} />);

    const titleInput = screen.getByLabelText(/exhibit title/i);
    await user.clear(titleInput);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(screen.getByRole('alert')).toHaveTextContent(/exhibit title is required/i);
    expect(updatePoi).not.toHaveBeenCalled();
  });

  it('disables save button and blocks submit when coordinates are out of bounds', () => {
    const outOfBoundsPoi = { ...mockPoi, latitude: 10.0000 };
    render(<POIFormModal isOpen={true} poi={outOfBoundsPoi} onClose={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('validates image file size and rejects files > 5MB', async () => {
    render(<POIFormModal isOpen={true} poi={mockPoi} onClose={vi.fn()} />);

    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });
    const fileInput = screen.getByLabelText(/cover photo/i);

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /image size exceeds maximum limit of 5mb/i,
    );
    expect(updatePoi).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button or close icon is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<POIFormModal isOpen={true} poi={mockPoi} onClose={handleClose} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeIconButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeIconButton);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('submits updated exhibit details, shows success toast, and calls onSuccess', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    updatePoi.mockResolvedValue({ success: true });

    render(
      <POIFormModal
        isOpen={true}
        poi={mockPoi}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />,
    );

    const titleInput = screen.getByLabelText(/exhibit title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Hầm thông tin liên lạc (Nâng cấp)');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updatePoi).toHaveBeenCalledWith(
        'poi-test-01',
        expect.objectContaining({
          title: 'Hầm thông tin liên lạc (Nâng cấp)',
          short_description: 'Trung tâm thông tin chiến trường',
          description: mockPoi.description,
          latitude: mockPoi.latitude,
          longitude: mockPoi.longitude,
          radius: mockPoi.radius,
        }),
      );
    });

    expect(screen.getByTestId('success-toast')).toHaveTextContent(
      /exhibit updated successfully/i,
    );
    expect(handleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Hầm thông tin liên lạc (Nâng cấp)',
      }),
    );
  });

  it('uploads new cover image when selected and includes URL in update', async () => {
    const user = userEvent.setup();
    uploadPoiImage.mockResolvedValue('/static/images/new_cover.jpg');
    updatePoi.mockResolvedValue({ success: true });

    render(<POIFormModal isOpen={true} poi={mockPoi} onClose={vi.fn()} />);

    const newFile = new File(['valid-image-bytes'], 'tunnel_new.jpg', {
      type: 'image/jpeg',
    });
    const fileInput = screen.getByLabelText(/cover photo/i);
    fireEvent.change(fileInput, { target: { files: [newFile] } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(uploadPoiImage).toHaveBeenCalledWith(newFile);
      expect(updatePoi).toHaveBeenCalledWith(
        'poi-test-01',
        expect.objectContaining({
          image_url: '/static/images/new_cover.jpg',
        }),
      );
    });
  });

  it('displays error alert when updatePoi rejects', async () => {
    const user = userEvent.setup();
    updatePoi.mockRejectedValue(new Error('Backend error updating exhibit'));

    render(<POIFormModal isOpen={true} poi={mockPoi} onClose={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend error updating exhibit',
    );
  });
});
