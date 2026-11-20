import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup, act } from '@testing-library/react';
import VisitorHeader from '../VisitorHeader.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('VisitorHeader', () => {
  it('renders the available published languages and reports language changes', () => {
    const onLanguageChange = vi.fn();
    render(
      <VisitorHeader
        languages={[
          { code: 'vi', name: 'Tiếng Việt' },
          { code: 'en', name: 'English' },
        ]}
        selectedLanguage="vi"
        onLanguageChange={onLanguageChange}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Choose language' }), {
      target: { value: 'en' },
    });

    expect(screen.getByRole('option', { name: 'Tiếng Việt' })).toBeInTheDocument();
    expect(onLanguageChange).toHaveBeenCalledWith('en');
  });

  it('shows an active session countdown and hides the unlock action', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00.000Z'));
    render(
      <VisitorHeader
        languages={[{ code: 'vi', name: 'Tiếng Việt' }]}
        selectedLanguage="vi"
        sessionCode="CCT-894201"
        expiresAt="2026-10-25T10:00:00.000Z"
      />,
    );

    expect(screen.getByLabelText(/session CCT-894201, 24h 00m remaining/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlock audio/i })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByLabelText(/23h 59m remaining/i)).toBeInTheDocument();
  });

  it('triggers onRestoreSession when restore button is clicked without active session', () => {
    const onRestoreSession = vi.fn();
    render(
      <VisitorHeader
        languages={[{ code: 'vi', name: 'Tiếng Việt' }]}
        selectedLanguage="vi"
        onRestoreSession={onRestoreSession}
      />
    );

    const restoreBtn = screen.getByRole('button', { name: /khôi phục/i });
    expect(restoreBtn).toBeInTheDocument();
    fireEvent.click(restoreBtn);
    expect(onRestoreSession).toHaveBeenCalledTimes(1);
  });

  it('compacts long 36-char session codes cleanly in visible badge while preserving full title and label', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00.000Z'));
    const fullCode = 'CCT-ECF55A56BC52A31BC00ECDABA41752C9';
    render(
      <VisitorHeader
        languages={[{ code: 'vi', name: 'Tiếng Việt' }]}
        selectedLanguage="vi"
        sessionCode={fullCode}
        expiresAt="2026-10-25T10:00:00.000Z"
      />
    );

    // Visible badge is compacted to CCT-…752C9
    expect(screen.getByText('CCT-…752C9')).toBeInTheDocument();
    // Full code preserved in aria-label and title
    expect(screen.getByLabelText(new RegExp(`session ${fullCode}, 24h 00m remaining`, 'i'))).toBeInTheDocument();
    const badge = screen.getByRole('button', { name: new RegExp(`session ${fullCode}`, 'i') });
    expect(badge).toHaveAttribute('title', expect.stringContaining(fullCode));
  });

  it('copies full session code to clipboard on click', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00.000Z'));
    const fullCode = 'CCT-ECF55A56BC52A31BC00ECDABA41752C9';
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <VisitorHeader
        languages={[{ code: 'vi', name: 'Tiếng Việt' }]}
        selectedLanguage="vi"
        sessionCode={fullCode}
        expiresAt="2026-10-25T10:00:00.000Z"
      />
    );

    const badge = screen.getByRole('button', { name: new RegExp(`session ${fullCode}`, 'i') });
    await act(async () => {
      fireEvent.click(badge);
    });
    expect(writeTextMock).toHaveBeenCalledWith(fullCode);
  });
});
