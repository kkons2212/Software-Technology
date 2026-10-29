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
      cloudflare_tunnel_url: 'https://sample-tunnel.trycloudflare.com',
      visitor_url: 'https://sample-tunnel.trycloudflare.com/visitor',
      admin_url: 'https://sample-tunnel.trycloudflare.com/admin',
    });

    render(<QRCodePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Mã QR Truy Cập Tour Hướng Dẫn Âm Thanh/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      const input = screen.getByLabelText(/Đường dẫn liên kết được mã hoá:/i);
      expect(input.value).toBe('https://sample-tunnel.trycloudflare.com/visitor');
    });

    expect(screen.getByTestId('qr-code-canvas-container')).toBeInTheDocument();
    expect(screen.getByText(/sample-tunnel.trycloudflare.com/i)).toBeInTheDocument();
  });

  it('handles custom URL apply and copy link', async () => {
    vi.spyOn(systemApi, 'getPublicSystemConfig').mockRejectedValue(new Error('Network error'));

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<QRCodePage />);

    await waitFor(() => {
      const input = screen.getByLabelText(/Đường dẫn liên kết được mã hoá:/i);
      expect(input.value).toContain('/visitor');
    });

    const input = screen.getByLabelText(/Đường dẫn liên kết được mã hoá:/i);
    fireEvent.change(input, { target: { value: 'https://custom-domain.com/visitor' } });

    const applyButton = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyButton);

    const copyButton = screen.getByRole('button', { name: /Sao chép link/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://custom-domain.com/visitor');
    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép!/i)).toBeInTheDocument();
    });
  });
});
