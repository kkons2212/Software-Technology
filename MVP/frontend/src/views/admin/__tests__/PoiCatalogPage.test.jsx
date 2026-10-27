import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { username: 'admin' },
    logout: vi.fn(),
  }),
}));

const mockPoisData = {
  items: [
    {
      poi_id: 1,
      title: 'Bếp Hoàng Cầm',
      short_description: 'Bếp dã chiến không khói nổi tiếng.',
      description: 'Được sáng tạo trong chiến dịch Điện Biên Phủ...',
      latitude: 11.1432,
      longitude: 106.4631,
      radius: 30,
      image_url: 'http://localhost:8000/static/images/bep_hoang_cam.jpg',
      translations: [
        { language_id: 'en', status: 'PENDING' },
        { language_id: 'ja', status: 'READY' },
      ],
    },
  ],
  total: 1,
  page: 1,
  size: 50,
};

vi.mock('../../../api/poiApi.js', () => ({
  getPois: vi.fn(),
  createPoi: vi.fn(),
}));

import PoiCatalogPage from '../PoiCatalogPage.jsx';
import { getPois, createPoi } from '../../../api/poiApi.js';

function renderPoiCatalog() {
  return render(
    <MemoryRouter initialEntries={['/admin/pois']}>
      <PoiCatalogPage />
    </MemoryRouter>
  );
}

describe('PoiCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-preview');
  });

  it('renders POI catalog table with exhibits and stats', async () => {
    getPois.mockResolvedValue(mockPoisData);
    renderPoiCatalog();

    expect(screen.getByRole('heading', { level: 1, name: /poi & geofence catalog/i })).toBeInTheDocument();
    expect(await screen.findByText('Bếp Hoàng Cầm')).toBeInTheDocument();
    expect(screen.getByText('Bếp dã chiến không khói nổi tiếng.')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('11.1432, 106.4631')).toBeInTheDocument();
    expect(screen.getByText('en: PENDING')).toBeInTheDocument();
    expect(screen.getByText('ja: READY')).toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 1 exhibit entries/i)).toBeInTheDocument();

    const img = screen.getByRole('img', { name: 'Bếp Hoàng Cầm' });
    expect(img).toHaveAttribute('src', 'http://localhost:8000/static/images/bep_hoang_cam.jpg');
  });

  it('shows empty state message when no POIs exist', async () => {
    getPois.mockResolvedValue({ items: [], total: 0, page: 1, size: 50 });
    renderPoiCatalog();

    expect(
      await screen.findByText(/no exhibits found. click "\+ new exhibit" to digitize/i)
    ).toBeInTheDocument();
  });

  it('displays error banner when loading exhibits fails', async () => {
    getPois.mockRejectedValue(new Error('Network error loading catalog'));
    renderPoiCatalog();

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error loading catalog');
  });

  it('searches exhibits by title with debounced query', async () => {
    const user = userEvent.setup();
    getPois.mockResolvedValue(mockPoisData);
    renderPoiCatalog();

    const searchInput = screen.getByPlaceholderText(/search exhibits by title/i);
    await user.type(searchInput, 'Địa đạo');

    await waitFor(() => {
      expect(getPois).toHaveBeenCalledWith(expect.objectContaining({ search: 'Địa đạo' }));
    });
  });

  it('opens and closes create exhibit modal dialog', async () => {
    const user = userEvent.setup();
    getPois.mockResolvedValue(mockPoisData);
    renderPoiCatalog();

    await user.click(screen.getByRole('button', { name: /\+ new exhibit/i }));

    expect(
      await screen.findByRole('heading', { level: 2, name: /create digitized exhibit profile/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: /create digitized exhibit profile/i })).not.toBeInTheDocument();
    });
  });

  it('validates coordinates outside Cu Chi bounds and disables save button', async () => {
    const user = userEvent.setup();
    getPois.mockResolvedValue(mockPoisData);
    renderPoiCatalog();

    await user.click(screen.getByRole('button', { name: /\+ new exhibit/i }));

    const latInput = screen.getByLabelText(/latitude \(wgs84\)/i);
    await user.clear(latInput);
    await user.type(latInput, '10.1234');

    expect(
      await screen.findByText(/warning: coordinates must reside within cu chi site boundary/i)
    ).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /save & digitize/i });
    expect(saveBtn).toBeDisabled();
  });

  it('validates and rejects cover photo larger than 5MB', async () => {
    const user = userEvent.setup();
    getPois.mockResolvedValue(mockPoisData);
    renderPoiCatalog();

    await user.click(screen.getByRole('button', { name: /\+ new exhibit/i }));

    const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    const fileInput = screen.getByLabelText(/cover photo/i);
    await user.upload(fileInput, largeFile);

    expect(await screen.findByRole('alert')).toHaveTextContent(/image size exceeds maximum limit of 5mb/i);
  });

  it('submits valid exhibit profile with uploaded cover image', async () => {
    const user = userEvent.setup();
    getPois.mockResolvedValue(mockPoisData);
    createPoi.mockResolvedValue({ poi_id: 2, title: 'Hầm Chỉ Huy' });
    renderPoiCatalog();

    await user.click(screen.getByRole('button', { name: /\+ new exhibit/i }));

    const titleInput = screen.getByLabelText(/exhibit title \(vietnamese\)/i);
    const shortDescInput = screen.getByLabelText(/free teaser summary/i);
    const fullDescInput = screen.getByLabelText(/detailed historical narration/i);
    const fileInput = screen.getByLabelText(/cover photo/i);

    await user.type(titleInput, 'Hầm Chỉ Huy');
    await user.type(shortDescInput, 'Bản đồ sa bàn tác chiến');
    await user.type(fullDescInput, 'Căn cứ trung tâm chỉ huy chiến dịch Sài Gòn Gia Định...');

    const validImage = new File(['fake-image-bytes'], 'ham_chi_huy.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, validImage);

    const saveBtn = screen.getByRole('button', { name: /save & digitize/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(createPoi).toHaveBeenCalledWith(
        {
          title: 'Hầm Chỉ Huy',
          short_description: 'Bản đồ sa bàn tác chiến',
          description: 'Căn cứ trung tâm chỉ huy chiến dịch Sài Gòn Gia Định...',
          latitude: 11.1432,
          longitude: 106.4631,
          radius: 30,
        },
        validImage
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: /create digitized exhibit profile/i })).not.toBeInTheDocument();
    });
  });
});
