import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthState, mockSystemHealth } = vi.hoisted(() => ({
  mockAuthState: { logout: vi.fn(), user: null },
  mockSystemHealth: { getSystemHealth: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({ useAuth: () => mockAuthState }));
vi.mock('../../../api/systemApi.js', () => ({ getSystemHealth: () => mockSystemHealth.getSystemHealth() }));

import AdminNavbar from '../AdminNavbar.jsx';

function renderNavbar(path = '/admin/pois') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminNavbar />
    </MemoryRouter>,
  );
}

describe('AdminNavbar', () => {
  beforeEach(() => {
    mockAuthState.logout = vi.fn();
    mockAuthState.user = null;
    mockSystemHealth.getSystemHealth = vi.fn().mockResolvedValue(null);
  });

  it('shows the signed-in administrator name from the profile contract', () => {
    mockAuthState.user = { user_name: 'curator' };

    renderNavbar();

    expect(screen.getByText('curator')).toBeInTheDocument();
  });

  it('falls back to a generic label when the profile has no name', () => {
    mockAuthState.user = {};

    renderNavbar();

    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('signs the administrator out when the Sign Out button is pressed', async () => {
    const user = userEvent.setup();
    mockAuthState.user = { user_name: 'curator' };

    renderNavbar();
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(mockAuthState.logout).toHaveBeenCalledTimes(1);
  });

  it('highlights the navigation entry matching the current route', () => {
    mockAuthState.user = { user_name: 'curator' };

    renderNavbar('/admin/analytics');

    const activeLink = screen.getByRole('link', { name: 'Analytics & Heatmap' });
    const inactiveLink = screen.getByRole('link', { name: 'POI & Geofence' });

    expect(activeLink.className).toContain('bg-slate-100');
    expect(inactiveLink.className).not.toContain('bg-slate-100');
  });

  it('renders brand link directing to admin root', () => {
    renderNavbar();
    const brandLink = screen.getByRole('link', { name: /Cu Chi Tunnels/i });
    expect(brandLink).toHaveAttribute('href', '/admin');
  });

  it('renders sticky storage banner on general admin pages when capacity exceeds 85%', async () => {
    mockSystemHealth.getSystemHealth.mockResolvedValueOnce({
      disk_used_percent: 97.0,
      threshold_status: 'CRITICAL',
    });

    renderNavbar('/admin/pois');

    expect(await screen.findByRole('alert')).toHaveTextContent(/Audio cache capacity exceeds 95%/i);
  });

  it('hides sticky storage banner when navigating to the System Health page to prevent duplicate alerts', async () => {
    mockSystemHealth.getSystemHealth.mockResolvedValueOnce({
      disk_used_percent: 97.0,
      threshold_status: 'CRITICAL',
    });

    renderNavbar('/admin/health');

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

