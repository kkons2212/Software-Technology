import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../api/sessionApi.js', () => ({
  restoreSession: vi.fn(),
}));

const mockActivateSession = vi.fn();
vi.mock('../../../contexts/VisitorSessionContext.jsx', () => ({
  useVisitorSession: () => ({
    activateSession: mockActivateSession,
    isUnlocked: false,
    sessionCode: '',
  }),
}));

import { restoreSession } from '../../../api/sessionApi.js';
import RestoreSessionModal from '../RestoreSessionModal.jsx';

describe('RestoreSessionModal (US 06.3 - TSK-06.3.2 & TSK-06.3.3)', () => {
  const mockSessionData = {
    session_id: 'SES_1234567890',
    session_code: 'CCT-894201',
    session_token: 'mock-session-token',
    status: 'ACTIVE',
    expires_at: '2026-10-30T12:00:00.000Z',
    remaining_seconds: 86400,
    preferred_language: 'vi',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <RestoreSessionModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with input and labels when isOpen is true', () => {
    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Khôi phục quyền truy cập')).toBeInTheDocument();
    expect(screen.getByLabelText(/mã phiên/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CCT-XXXXXX')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /khôi phục phiên/i })
    ).toBeInTheDocument();
  });

  it('automatically transforms entered text to uppercase and strips spaces', () => {
    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('CCT-XXXXXX');
    fireEvent.change(input, { target: { value: ' cct - 894 201 ' } });

    expect(input.value).toBe('CCT-894201');
  });

  it('submits valid session code, activates session, calls onSuccess and closes', async () => {
    restoreSession.mockResolvedValueOnce({
      success: true,
      data: mockSessionData,
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <RestoreSessionModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const input = screen.getByPlaceholderText('CCT-XXXXXX');
    fireEvent.change(input, { target: { value: 'cct-894201' } });

    const submitBtn = screen.getByRole('button', { name: /khôi phục phiên/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(restoreSession).toHaveBeenCalledWith({ sessionCode: 'CCT-894201' });
    });

    await waitFor(() => {
      expect(mockActivateSession).toHaveBeenCalledWith({
        sessionCode: 'CCT-894201',
        sessionToken: 'mock-session-token',
        expiresAt: '2026-10-30T12:00:00.000Z',
      });
      expect(onSuccess).toHaveBeenCalledWith(mockSessionData);
    });

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 1500 }
    );
  });

  it('displays user-friendly error message when session is invalid or expired', async () => {
    restoreSession.mockRejectedValueOnce({
      status: 404,
      error: { message: 'Session code is invalid or has expired.' },
    });

    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('CCT-XXXXXX');
    fireEvent.change(input, { target: { value: 'CCT-BAD000' } });

    const submitBtn = screen.getByRole('button', { name: /khôi phục phiên/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Mã phiên không hợp lệ hoặc đã hết hạn.')
      ).toBeInTheDocument();
    });

    expect(mockActivateSession).not.toHaveBeenCalled();
  });

  it('closes when close button is clicked or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <RestoreSessionModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} />
    );

    const closeBtn = screen.getByLabelText('Đóng');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

