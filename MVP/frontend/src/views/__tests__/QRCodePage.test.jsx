import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QRCodePage from '../QRCodePage.jsx';
import * as systemApi from '../../api/systemApi.js';

describe('QRCodePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders title, loads public config, and displays visitor QR code', async () => {
    vi.spyOn(systemApi, 'getPublicSystemConfig').mockResolvedValue({
      base_url: 'https://sample-deployed-app.com',
      cloudflare_tunnel_url: 'https://sample-deployed-app.com',
      visitor_url: 'https://sample-deployed-app.com/visitor',
      admin_url: 'https://sample-deployed-app.com/admin',
    });

    render(<QRCodePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Mã QR Hướng Dẫn Tham Quan/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/sample-deployed-app.com\/visitor/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('qr-code-canvas-container')).toBeInTheDocument();
    expect(screen.getByText(/Đang dùng cấu hình BASE_URL/i)).toBeInTheDocument();
  });

  it('handles copying link to clipboard', async () => {
    vi.spyOn(systemApi, 'getPublicSystemConfig').mockRejectedValue(new Error('Network error'));

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<QRCodePage />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-code-canvas-container')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button', { name: /sao chép/i });
    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép!/i)).toBeInTheDocument();
    });
  });

  it('renders download button and direct preview link', async () => {
    vi.spyOn(systemApi, 'getPublicSystemConfig').mockResolvedValue({
      base_url: '',
      visitor_url: '/visitor',
      admin_url: '/admin',
    });

    render(<QRCodePage />);

    expect(screen.getByRole('button', { name: /Tải ảnh QR \(PNG\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Thử mở trên trình duyệt này/i)).toBeInTheDocument();
  });
});
