import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SystemHealthPage from '../SystemHealthPage.jsx';
import * as systemApi from '../../../api/systemApi.js';
import { ADMIN_TRANSLATIONS } from '../../../locales/adminTranslations.js';

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: { username: 'admin' },
  }),
}));

vi.mock('../../../api/systemApi.js', () => ({
  getSystemHealth: vi.fn(),
  cleanOrphanedAudio: vi.fn(),
}));

describe('SystemHealthPage', () => {
  const mockHealthData = {
    status: 'ok',
    disk_used_percent: 78.5,
    threshold_status: 'NORMAL',
    total_bytes: 500 * 1024**3,
    used_bytes: 392.5 * 1024**3,
    free_bytes: 107.5 * 1024**3,
    audio_cache_bytes: 120 * 1024**2,
    audio_cache_files: 18,
    db_status: 'connected',
    db_latency_ms: 2.15,
    external_services_ok: true,
    storage: {
      disk_used_percent: 78.5,
      threshold_status: 'NORMAL',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders system health telemetry and database status', async () => {
    systemApi.getSystemHealth.mockResolvedValue(mockHealthData);

    render(
      <MemoryRouter>
        <SystemHealthPage />
      </MemoryRouter>
    );

    expect(screen.getByText(ADMIN_TRANSLATIONS.btnRefreshingTelemetry)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('78.5%')).toBeInTheDocument();
    });

    expect(screen.getByText(ADMIN_TRANSLATIONS.healthTitle)).toBeInTheDocument();
    expect(screen.getByText(/2.15 ms/i)).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TRANSLATIONS.statusOperational)).toBeInTheDocument();
  });

  it('opens clean orphans modal and triggers pruning upon confirmation', async () => {
    systemApi.getSystemHealth.mockResolvedValue(mockHealthData);
    systemApi.cleanOrphanedAudio.mockResolvedValue({
      deleted_count: 4,
      reclaimed_mb: 8.5,
      message: 'Đã dọn dẹp thành công 4 file audio mồ côi (8.5 MB).',
    });

    render(
      <MemoryRouter>
        <SystemHealthPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('78.5%')).toBeInTheDocument();
    });

    // Click "Clean Orphaned Audio"
    const cleanButtons = screen.getAllByRole('button', { name: ADMIN_TRANSLATIONS.btnCleanOrphanedAudio });
    fireEvent.click(cleanButtons[0]);

    // Modal dialog is opened
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TRANSLATIONS.btnConfirmPrune)).toBeInTheDocument();

    // Confirm pruning
    fireEvent.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.btnConfirmPrune }));

    await waitFor(() => {
      expect(systemApi.cleanOrphanedAudio).toHaveBeenCalledTimes(1);
    });

    // Toast message is displayed
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/dọn dẹp thành công 4 file/i);
    });
  });

  it('displays error alert when retrieving system health fails', async () => {
    systemApi.getSystemHealth.mockRejectedValue(new Error('Network failure'));

    render(
      <MemoryRouter>
        <SystemHealthPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network failure/i);
    });
  });
});
