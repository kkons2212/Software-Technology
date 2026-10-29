import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminLayout from '../AdminLayout.jsx';

vi.mock('../AdminNavbar.jsx', () => ({
  default: () => <nav data-testid="mock-admin-navbar">Mock Admin Navbar</nav>,
}));

describe('AdminLayout', () => {
  it('renders the AdminNavbar and nested child route via Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/admin/test']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/test" element={<div>Child Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mock-admin-navbar')).toBeInTheDocument();
    expect(screen.getByText('Child Page Content')).toBeInTheDocument();
  });
});
