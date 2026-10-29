import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NotFoundPage from '../NotFoundPage.jsx';

describe('NotFoundPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the 404 error code and user-friendly explanation', () => {
    render(<NotFoundPage />);

    expect(screen.getByText(/lỗi 404/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /không tìm thấy trang/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/đường dẫn bạn yêu cầu không tồn tại/i)
    ).toBeInTheDocument();
  });
});
