import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { logout: vi.fn(), user: null },
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({ useAuth: () => mockAuthState }));

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
});
