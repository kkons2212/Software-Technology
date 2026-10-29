import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import NotFoundPage from '../NotFoundPage.jsx';

describe('NotFoundPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the 404 error code and user-friendly explanation', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/lỗi 404/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /không tìm thấy trang/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/đường dẫn bạn yêu cầu không tồn tại/i)
    ).toBeInTheDocument();
  });

  it('renders direct navigation links back to visitor tour map and admin login', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    const tourLink = screen.getByRole('link', { name: /về bản đồ tham quan/i });
    expect(tourLink).toBeInTheDocument();
    expect(tourLink).toHaveAttribute('href', '/visitor');

    const adminLink = screen.getByRole('link', { name: /cổng quản trị viên/i });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/login');
  });
});
