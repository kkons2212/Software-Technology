import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { isAuthenticated: false, isBootstrapping: false },
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({ useAuth: () => mockAuthState }));

import AdminRouteGuard from '../AdminRouteGuard.jsx';

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin/login" element={<div>Admin Login Screen</div>} />
        <Route
          path="/admin"
          element={
            <AdminRouteGuard>
              <div>Protected Admin Workspace</div>
            </AdminRouteGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminRouteGuard', () => {
  beforeEach(() => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.isBootstrapping = false;
  });

  it('shows a verification state while the session is bootstrapping', () => {
    mockAuthState.isBootstrapping = true;

    renderGuard();

    expect(screen.getByRole('status')).toHaveTextContent('Verifying administrator session');
    expect(screen.queryByText('Protected Admin Workspace')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to the admin login screen', () => {
    renderGuard();

    expect(screen.getByText('Admin Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Workspace')).not.toBeInTheDocument();
  });

  it('renders protected children for an authenticated administrator', () => {
    mockAuthState.isAuthenticated = true;

    renderGuard();

    expect(screen.getByText('Protected Admin Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Admin Login Screen')).not.toBeInTheDocument();
  });
});
