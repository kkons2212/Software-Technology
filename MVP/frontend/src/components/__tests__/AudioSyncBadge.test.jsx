import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AudioSyncBadge from '../AudioSyncBadge.jsx';

describe('AudioSyncBadge (TSK-04.1.3 & AC-04.1.3)', () => {
  it('renders green "Audio In Sync" badge when status is READY or PUBLISHED', () => {
    const { rerender } = render(<AudioSyncBadge status="READY" />);
    const readyBadge = screen.getByTestId('audio-sync-badge');
    expect(readyBadge.textContent).toContain('Audio In Sync');
    expect(readyBadge.className).toContain('text-green-700');

    rerender(<AudioSyncBadge status="PUBLISHED" />);
    const pubBadge = screen.getByTestId('audio-sync-badge');
    expect(pubBadge.textContent).toContain('Audio In Sync');
  });

  it('renders amber "Audio Needs Update" badge when status is NEEDS_UPDATE', () => {
    render(<AudioSyncBadge status="NEEDS_UPDATE" />);
    const badge = screen.getByTestId('audio-sync-badge');
    expect(badge.textContent).toContain('Audio Needs Update');
    expect(badge.className).toContain('text-amber-800');
  });

  it('renders amber "Audio Needs Update" immediately when isEdited flag is true regardless of status', () => {
    render(<AudioSyncBadge status="PUBLISHED" isEdited={true} />);
    const badge = screen.getByTestId('audio-sync-badge');
    expect(badge.textContent).toContain('Audio Needs Update');
    expect(badge.className).toContain('bg-amber-50');
  });

  it('renders "Pending" spinner badge when status is PENDING', () => {
    render(<AudioSyncBadge status="PENDING" />);
    const badge = screen.getByTestId('audio-sync-badge');
    expect(badge.textContent).toContain('Pending');
    expect(badge.className).toContain('animate-pulse');
  });

  it('renders "Audio Failed" badge when status is FAILED', () => {
    render(<AudioSyncBadge status="FAILED" />);
    const badge = screen.getByTestId('audio-sync-badge');
    expect(badge.textContent).toContain('Audio Failed');
    expect(badge.className).toContain('text-red-700');
  });

  it('renders lock indicator when showLock is true and status requires update', () => {
    render(<AudioSyncBadge status="NEEDS_UPDATE" showLock={true} />);
    const lock = screen.getByTestId('publish-lock-indicator');
    expect(lock).toBeDefined();
    expect(lock.textContent).toContain('Publish Locked');
  });

  it('does not render lock indicator when audio is in sync', () => {
    render(<AudioSyncBadge status="PUBLISHED" showLock={true} />);
    expect(screen.queryByTestId('publish-lock-indicator')).toBeNull();
  });

  it('unlocks a DRAFT translation after its audio is ready', () => {
    render(<AudioSyncBadge status="DRAFT" audioStatus="READY" showLock />);

    expect(screen.getByTestId('audio-sync-badge').textContent).toContain('Audio In Sync');
    expect(screen.queryByTestId('publish-lock-indicator')).toBeNull();
  });
});
