import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CleanOrphansModal from '../CleanOrphansModal.jsx';
import * as systemApi from '../../../api/systemApi.js';

describe('CleanOrphansModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CleanOrphansModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders into document.body with z-[9999] backdrop when isOpen is true', () => {
    render(<CleanOrphansModal isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.className).toContain('z-[9999]');
    expect(screen.getByRole('heading', { name: /clean orphaned audio/i })).toBeInTheDocument();
  });

  it('triggers onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<CleanOrphansModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls cleanOrphanedAudio API, invokes onSuccess and closes modal on confirm', async () => {
    const mockClean = vi.spyOn(systemApi, 'cleanOrphanedAudio').mockResolvedValue({
      cleaned_files_count: 5,
      freed_bytes: 1048576,
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <CleanOrphansModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm & prune/i }));

    await waitFor(() => {
      expect(mockClean).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith({
        cleaned_files_count: 5,
        freed_bytes: 1048576,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

