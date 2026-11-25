import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_TRANSLATIONS } from '../../../locales/adminTranslations.js';

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { logout: vi.fn(), user: null },
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({ useAuth: () => mockAuthState }));

import AdminHeader from '../AdminHeader.jsx';

function renderHeader(path = '/admin/pois') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminHeader />
    </MemoryRouter>,
  );
}

describe('AdminHeader', () => {
  beforeEach(() => {
    mockAuthState.logout = vi.fn();
    mockAuthState.user = null;
  });

  it('shows the signed-in administrator greeting with full name when present', () => {
    mockAuthState.user = { user_name: 'curator', full_name: 'Nguyễn Văn A' };

    renderHeader();

    expect(
      screen.getByText(ADMIN_TRANSLATIONS.adminGreeting.replace('{name}', 'Nguyễn Văn A')),
    ).toBeInTheDocument();
  });

  it('shows the signed-in administrator greeting with user_name when full name is omitted', () => {
    mockAuthState.user = { user_name: 'curator' };

    renderHeader();

    expect(
      screen.getByText(ADMIN_TRANSLATIONS.adminGreeting.replace('{name}', 'curator')),
    ).toBeInTheDocument();
  });

  it('falls back to a generic label when the profile has no name', () => {
    mockAuthState.user = {};

    renderHeader();

    expect(
      screen.getByText(
        ADMIN_TRANSLATIONS.adminGreeting.replace('{name}', ADMIN_TRANSLATIONS.defaultAdminName),
      ),
    ).toBeInTheDocument();
  });

  it('signs the administrator out when the Sign Out button is pressed', async () => {
    const user = userEvent.setup();
    mockAuthState.user = { user_name: 'curator' };

    renderHeader();
    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signOut }));

    expect(mockAuthState.logout).toHaveBeenCalledTimes(1);
  });

  it('highlights the navigation entry matching the current route', () => {
    mockAuthState.user = { user_name: 'curator' };

    renderHeader('/admin/analytics');

    const activeLink = screen.getByRole('link', { name: ADMIN_TRANSLATIONS.navAnalytics });
    const inactiveLink = screen.getByRole('link', { name: ADMIN_TRANSLATIONS.navPois });

    expect(activeLink.className).toContain('bg-slate-100');
    expect(inactiveLink.className).not.toContain('bg-slate-100');
  });
});
