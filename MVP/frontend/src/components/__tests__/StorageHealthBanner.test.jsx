import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StorageHealthBanner, {
  formatBytes,
} from '../admin/StorageHealthBanner.jsx';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

describe('StorageHealthBanner', () => {
  afterEach(() => {
    cleanup();
  });

  it('formats bytes into human readable binary units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 20)).toBe('20.0 GB');
  });

  it('renders progress meter normally when usage is under 85% without warning alert', () => {
    render(
      <StorageHealthBanner
        diskUsedPercent={65.4}
        thresholdStatus="NORMAL"
        totalBytes={100 * 1024**3}
        usedBytes={65.4 * 1024**3}
        freeBytes={34.6 * 1024**3}
        audioCacheBytes={500 * 1024**2}
        audioCacheFiles={42}
        imageBytes={250 * 1024**2}
        imageFiles={18}
      />
    );

    expect(screen.getByTestId('storage-progress-meter')).toBeInTheDocument();
    expect(screen.getByText('65.4%')).toBeInTheDocument();
    expect(screen.getByText('250.0 MB')).toBeInTheDocument();
    expect(screen.getByText('18 file')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing in stickyOnly mode when usage is under 85%', () => {
    const { container } = render(
      <StorageHealthBanner diskUsedPercent={70.0} stickyOnly={true} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders amber warning alert banner when disk usage is 85%-94%', () => {
    const onCleanClick = vi.fn();
    render(
      <StorageHealthBanner
        diskUsedPercent={88.2}
        stickyOnly={true}
        onCleanClick={onCleanClick}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(ADMIN_TRANSLATIONS.storageWarningMsg);

    const cleanButton = screen.getByTestId('clean-orphans-btn');
    expect(cleanButton).toBeInTheDocument();
    fireEvent.click(cleanButton);
    expect(onCleanClick).toHaveBeenCalledTimes(1);
  });

  it('renders red critical alert banner when disk usage is >= 95%', () => {
    const onCleanClick = vi.fn();
    render(
      <StorageHealthBanner
        diskUsedPercent={96.5}
        stickyOnly={true}
        onCleanClick={onCleanClick}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(ADMIN_TRANSLATIONS.storageCriticalMsg);

    const cleanButton = screen.getByTestId('clean-orphans-btn');
    fireEvent.click(cleanButton);
    expect(onCleanClick).toHaveBeenCalledTimes(1);
  });
});
