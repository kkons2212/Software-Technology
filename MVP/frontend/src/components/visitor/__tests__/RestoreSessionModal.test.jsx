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
import RestoreSessionModal, { resolveSessionRestoreError } from '../RestoreSessionModal.jsx';

describe('RestoreSessionModal (US 06.3 - 6-Digit PIN Restore)', () => {
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

  it('renders modal dialog with 6 PIN digit boxes and prefix when isOpen is true', () => {
    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Khôi phục quyền truy cập')).toBeInTheDocument();
    expect(screen.getByText('Mã phiên (Session Code)')).toBeInTheDocument();
    expect(screen.getByText('CCT -')).toBeInTheDocument();

    // Verify all 6 digit inputs exist
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`pin-input-${i}`)).toBeInTheDocument();
    }

    expect(
      screen.getByRole('button', { name: /khôi phục phiên/i })
    ).toBeInTheDocument();
  });

  it('submits valid session code when 6 digits are typed and auto-activates', async () => {
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

    const digits = ['8', '9', '4', '2', '0', '1'];
    digits.forEach((d, idx) => {
      fireEvent.change(screen.getByTestId(`pin-input-${idx}`), {
        target: { value: d },
      });
    });

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

  it('handles paste of CCT-894201 and fills all 6 digits automatically', async () => {
    restoreSession.mockResolvedValueOnce({
      success: true,
      data: mockSessionData,
    });

    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    const firstInput = screen.getByTestId('pin-input-0');
    fireEvent.paste(firstInput, {
      clipboardData: { getData: () => 'CCT-894201' },
    });

    expect(screen.getByTestId('pin-input-0').value).toBe('8');
    expect(screen.getByTestId('pin-input-1').value).toBe('9');
    expect(screen.getByTestId('pin-input-2').value).toBe('4');
    expect(screen.getByTestId('pin-input-3').value).toBe('2');
    expect(screen.getByTestId('pin-input-4').value).toBe('0');
    expect(screen.getByTestId('pin-input-5').value).toBe('1');

    await waitFor(() => {
      expect(restoreSession).toHaveBeenCalledWith({ sessionCode: 'CCT-894201' });
    });
  });

  it('displays user-friendly error message when session code is invalid or expired', async () => {
    restoreSession.mockRejectedValueOnce({
      status: 404,
      error: { message: 'Session code is invalid or has expired.' },
    });

    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    // Type 6 digits that fail
    ['0', '0', '0', '0', '0', '0'].forEach((d, idx) => {
      fireEvent.change(screen.getByTestId(`pin-input-${idx}`), {
        target: { value: d },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Mã phiên không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.')
      ).toBeInTheDocument();
    });

    expect(mockActivateSession).not.toHaveBeenCalled();
  });

  it('supports backspace navigation across PIN inputs', () => {
    render(
      <RestoreSessionModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    const input0 = screen.getByTestId('pin-input-0');
    const input1 = screen.getByTestId('pin-input-1');

    fireEvent.change(input0, { target: { value: '8' } });
    expect(input0.value).toBe('8');

    fireEvent.change(input1, { target: { value: '9' } });
    expect(input1.value).toBe('9');

    // Press Backspace on input1 to clear it
    fireEvent.keyDown(input1, { key: 'Backspace' });
    expect(input1.value).toBe('');

    // Press Backspace again on empty input1 to clear input0 and focus it
    fireEvent.keyDown(input1, { key: 'Backspace' });
    expect(input0.value).toBe('');
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

  it('localizes all modal texts, aria labels, and errors according to selected language', async () => {
    restoreSession.mockRejectedValueOnce({
      status: 404,
      error: { message: 'Session code is invalid or has expired.' },
    });

    const { rerender } = render(
      <RestoreSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        language="en"
      />
    );

    expect(screen.getByText('Restore Access Pass')).toBeInTheDocument();
    expect(
      screen.getByText('Enter your session code to continue using the audio guide')
    ).toBeInTheDocument();
    expect(screen.getByText('Session Code')).toBeInTheDocument();
    expect(
      screen.getByText('Enter your 6-digit session code (e.g., CCT-894201).')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore Session' })).toBeInTheDocument();

    ['1', '2', '3', '4', '5', '6'].forEach((d, idx) => {
      fireEvent.change(screen.getByTestId(`pin-input-${idx}`), {
        target: { value: d },
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText('Invalid or expired session code. Please verify and try again.')
      ).toBeInTheDocument();
    });

    rerender(
      <RestoreSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        language="fr"
      />
    );

    expect(screen.getByText('Restaurer l’Accès')).toBeInTheDocument();
    expect(screen.getByText('Code de session')).toBeInTheDocument();
    expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
    expect(screen.getByLabelText('Chiffre 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restaurer la session' })).toBeInTheDocument();

    rerender(
      <RestoreSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        language="ja"
      />
    );
    expect(screen.getByText('アクセス権の復元')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();

    rerender(
      <RestoreSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        language="ko"
      />
    );
    expect(screen.getByText('이용 권한 복원')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();

    rerender(
      <RestoreSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        language="zh"
      />
    );
    expect(screen.getByText('恢复访问通行证')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('shows localized incomplete PIN error and success state in non-Vietnamese language', async () => {
    restoreSession.mockResolvedValueOnce({
      success: true,
      data: mockSessionData,
    });

    render(
      <RestoreSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        language="en"
      />
    );

    // Submit with fewer than 6 digits
    fireEvent.change(screen.getByTestId('pin-input-0'), { target: { value: '8' } });
    fireEvent.submit(screen.getByTestId('pin-input-0').closest('form'));

    expect(
      screen.getByText('Please enter all 6 digits of your session code.')
    ).toBeInTheDocument();

    // Fill remaining 5 digits -> triggers restore and shows localized success
    ['9', '4', '2', '0', '1'].forEach((d, offset) => {
      fireEvent.change(screen.getByTestId(`pin-input-${offset + 1}`), {
        target: { value: d },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Restored')).toBeInTheDocument();
      expect(
        screen.getByText('Session restored successfully! Unlocking audio guide...')
      ).toBeInTheDocument();
    });
  });

  describe('resolveSessionRestoreError & Multilingual HTTP 429 Handling', () => {
    it('returns invalidSessionCodeError for null or undefined error', () => {
      expect(resolveSessionRestoreError(null, 'vi')).toBe(
        'Mã phiên không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.'
      );
      expect(resolveSessionRestoreError(undefined, 'en')).toBe(
        'Invalid or expired session code. Please verify and try again.'
      );
    });

    it('formats SESSION_RESTORE_RATE_LIMITED with dynamic seconds across languages', () => {
      const errorEn = {
        status: 429,
        code: 'SESSION_RESTORE_RATE_LIMITED',
        details: { retry_after_seconds: 45 },
      };
      expect(resolveSessionRestoreError(errorEn, 'en')).toBe(
        'Too many failed restore attempts. Please wait 45 seconds before trying again.'
      );

      const errorJa = {
        status: 429,
        code: 'SESSION_RESTORE_RATE_LIMITED',
        details: { retry_after_seconds: 30 },
      };
      expect(resolveSessionRestoreError(errorJa, 'ja')).toBe(
        '試行回数が上限を超えました。30秒待ってから再試行してください。'
      );

      const errorVi = {
        status: 429,
        code: 'SESSION_RESTORE_RATE_LIMITED',
      };
      expect(resolveSessionRestoreError(errorVi, 'vi')).toBe(
        'Đã nhập sai quá nhiều lần liên tiếp. Vui lòng chờ 60 giây trước khi thử lại.'
      );
    });

    it('formats RATE_LIMIT_EXCEEDED with dynamic seconds', () => {
      const errorKo = {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retry_after_seconds: 25 },
      };
      expect(resolveSessionRestoreError(errorKo, 'ko')).toBe(
        '요청이 너무 많습니다. 25초 후에 다시 시도해 주세요.'
      );
    });

    it('displays localized rate limit message in modal when 429 is encountered', async () => {
      restoreSession.mockRejectedValueOnce({
        status: 429,
        code: 'SESSION_RESTORE_RATE_LIMITED',
        details: { retry_after_seconds: 45 },
      });

      render(
        <RestoreSessionModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          language="en"
        />
      );

      ['1', '2', '3', '4', '5', '6'].forEach((d, idx) => {
        fireEvent.change(screen.getByTestId(`pin-input-${idx}`), {
          target: { value: d },
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText('Too many failed restore attempts. Please wait 45 seconds before trying again.')
        ).toBeInTheDocument();
      });
    });
  });
});
